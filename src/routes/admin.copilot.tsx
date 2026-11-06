import { createFileRoute } from "@tanstack/react-router";
import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Send,
  RotateCcw,
  Code,
  Layout,
  ShoppingBag,
  TrendingUp,
  MessageSquare,
  Eye,
  Package,
  Zap,
  CheckCircle2,
  Paperclip,
  Globe,
  Search,
  Bot,
  Trash2,
  Wand2,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  Undo2,
  Wrench,
  Plus,
  FolderTree,
  
  SlidersHorizontal,
  Layers,
  ArrowRight,
  Building2,
  Cpu,
  Sliders,
  Database,
  CircleAlert,
  BarChart3,
  Check,
  Loader2,
  ClipboardList,
  History,
} from "lucide-react";
import type { AiToolDefinition, AiToolName, ToolExecutionResult } from "@/services/aiTools/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useLayoutConfig } from "@/lib/layout-config-context";
import {
  runAdminCoPilotChat,
  ChatMessage,
  ExecutiveKpiInput,
  GeminiModelChoice,
  GeminiRoleChoice,
} from "@/services/gemini36Service";
import {
  ProjectFileMeta,
  PROJECT_FILES_REGISTRY,
} from "@/services/projectFilesService";
import { GeminiFileAttachmentPicker } from "@/components/admin/GeminiFileAttachmentPicker";
import { DEFAULT_LAYOUT_CONFIG, StoreLayoutConfig } from "@/types/layout-config";
import { StoreEngineBuilder } from "@/components/admin/StoreEngineBuilder";
import { ExecutiveSummaryWidget } from "@/components/admin/ExecutiveSummaryWidget";
import { LiveStorefrontPreview } from "@/components/admin/LiveStorefrontPreview";
import { AbandonedCartAgent } from "@/components/admin/AbandonedCartAgent";
import { SmartProductCopywriterModal } from "@/components/admin/SmartProductCopywriterModal";
import { ShopLivePreview } from "@/components/admin/ShopLivePreview";
import {
  AI_TOOL_SUITE,
  AI_TOOL_GROUP_LABELS,
  executeAiTool,
  createRollbackPoint,
  getLastRollbackPoint,
  rollbackLastAction,
  type AiToolGroup,
  type RollbackPoint,
} from "@/services/geminiToolsEngine";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/lib/settings-context";
import { BRAND_NAME_AR } from "@/lib/brand";
import { useAuth } from "@/lib/auth-context";
import { DEFAULT_GEMINI_MODEL } from "@/lib/gemini-config";

export const Route = createFileRoute("/admin/copilot")({
  head: () => ({
    meta: [
      { title: "المساعد الذكي — إدارة المتجر" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminCoPilotPage,
});

const STARTER_PROMPTS = [
  {
    title: "أضف منتجًا جديدًا",
    desc: "أدخل البيانات المطلوبة ثم راجع الإضافة قبل تنفيذها",
    prompt: "أضف منتجًا جديدًا إلى المتجر",
    icon: Package,
  },
  {
    title: "حلل المبيعات والمخزون",
    desc: "اعرض نتيجة مبنية على سجلات المتجر الحالية",
    prompt: "حلل المبيعات والمخزون من بيانات المتجر الحالية وحدد ما يحتاج متابعة",
    icon: BarChart3,
  },
  {
    title: "اعرض الطلبات التي تحتاج إجراء",
    desc: "راجع الطلبات من قاعدة البيانات قبل اقتراح خطوة",
    prompt: "اعرض الطلبات التي تحتاج إجراءً من بيانات المتجر الحالية",
    icon: ClipboardList,
  },
  {
    title: "ابحث عن منتج",
    desc: "تحقق من وجوده وسعره ومخزونه في Supabase",
    prompt: "ابحث في قاعدة البيانات عن منتج",
    icon: Search,
  },
];

type ExecutionMode = "suggest" | "approval";
type ReviewActivity = {
  id: string;
  toolName: string;
  title: string;
  status: "completed" | "failed" | "rejected";
  message: string;
  createdAt: string;
};
type PendingAdminAction = {
  id: string;
  toolName: AiToolName;
  args: Record<string, unknown>;
  status: "pending" | "executing" | "blocked";
  error?: string;
};

function needsServerApproval(action: PendingAdminAction): boolean {
  return (
    ["bulkPriceUpdate", "manageUsersAndRoles", "updateRawJsonMetadata", "rollbackLastAction"].includes(action.toolName) ||
    action.args.action === "delete" ||
    ["writeNewFile", "updateFileAST", "deleteFile", "gitCommitAndPush", "gitRollbackCommit"].includes(action.toolName)
  );
}

function AdminCoPilotPage() {
  const { role } = useAuth();
  const settings = useSettings();
  const storeName = settings.site_name || BRAND_NAME_AR;
  const aiAssistantName = "مساعد الوادي";
  const { config: layoutConfig, updateConfig, resetConfig, setThemePalette } = useLayoutConfig();

  // Active workspace mode
  const [activeMode, setActiveMode] = useState<
    "review" | "store-engine" | "advisory" | "live-preview"
  >("review");
  const [reviewTab, setReviewTab] = useState<"review" | "history" | "rollback">("review");
  const [mobilePane, setMobilePane] = useState<"chat" | "panel">("chat");
  const [executionMode, setExecutionMode] = useState<ExecutionMode>("approval");
  const [pendingAction, setPendingAction] = useState<PendingAdminAction | null>(null);
  const [reviewActivity, setReviewActivity] = useState<ReviewActivity[]>([]);
  const [storeDataStatus, setStoreDataStatus] = useState<{
    state: "checking" | "connected" | "offline";
    products: number | null;
    lowStock: number | null;
    orders: number | null;
    missingImages: number | null;
  }>({ state: "checking", products: null, lowStock: null, orders: null, missingImages: null });
  const [healthRevision, setHealthRevision] = useState(0);

  // Prompt input and attached file
  const [chatInput, setChatInput] = useState("");
  const [attachedFile, setAttachedFile] = useState<ProjectFileMeta | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Gemini Model & Role Configuration
  const [selectedModel, setSelectedModel] = useState<GeminiModelChoice>(DEFAULT_GEMINI_MODEL);
  const [selectedRole, setSelectedRole] = useState<GeminiRoleChoice>("store_architect");
  const [enableGoogleSearch, setEnableGoogleSearch] = useState(true);

  // Modals & Tools
  const [copywriterModalOpen, setCopywriterModalOpen] = useState(false);
  const [toolsSheetOpen, setToolsSheetOpen] = useState(false);

  const queryClient = useQueryClient();
  const [activeToolName, setActiveToolName] = useState<string | null>(null);
  
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [kpis, setKpis] = useState<ExecutiveKpiInput>({
    totalRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    outOfStockCount: 0,
    lowStockCount: 0,
    topSellingCategory: "غير محدد",
      });
  

  const [lastRollback, setLastRollback] = useState<RollbackPoint | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);

  const handleDeployLayout = async () => {
    setIsDeploying(true);
    try {
      // Layout settings currently persist in this browser's localStorage only.
      // Do not claim they were published to the live storefront.
      await new Promise((resolve) => window.setTimeout(resolve, 150));
      toast.info("حُفظت إعدادات المعاينة على هذا الجهاز. النشر إلى المتجر غير مفعّل بعد.");
    } finally {
      setIsDeploying(false);
    }
  };


  useEffect(() => {
    const sync = () => setLastRollback(getLastRollbackPoint());
    sync();
    window.addEventListener("ai_rollback_stack_changed", sync);
    return () => window.removeEventListener("ai_rollback_stack_changed", sync);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadStoreHealth = async () => {
      const [products, lowStock, orders, missingImages] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("products").select("id", { count: "exact", head: true }).lte("stock", 5),
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("products").select("id", { count: "exact", head: true }).is("image_url", null),
      ]);
      if (cancelled) return;
      setStoreDataStatus({
        state: products.error || orders.error || lowStock.error || missingImages.error ? "offline" : "connected",
        products: products.error ? null : products.count ?? 0,
        lowStock: lowStock.error ? null : lowStock.count ?? 0,
        orders: orders.error ? null : orders.count ?? 0,
        missingImages: missingImages.error ? null : missingImages.count ?? 0,
      });
    };
    void loadStoreHealth();
    const timer = window.setInterval(() => void loadStoreHealth(), 45_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [healthRevision]);

  const handleRollback = async () => {
    if (!lastRollback) return;
    try {
      const res = await rollbackLastAction();
      if (res?.ok) {
        toast.success(res.messageAr || "تم التراجع بنجاح");
        queryClient.invalidateQueries();
      } else {
        toast.error(res.messageAr || "فشل التراجع");
      }
    } catch (e: unknown) {
      toast.error((e as Error).message);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() && !attachedFile) return;
    handleSendMessage(chatInput, attachedFile);
    setChatInput("");
    setAttachedFile(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!chatInput.trim() && !attachedFile) return;
      handleSendMessage(chatInput, attachedFile);
      setChatInput("");
      setAttachedFile(null);
    }
  };

  const handleSendMessage = async (prompt: string, file: ProjectFileMeta | null = null) => {
    if ((!prompt.trim() && !file) || pendingAction) return;

    const newMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: prompt,
      attachedFile: file || undefined,
      timestamp: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
    };

    setChatHistory((prev) => [...prev, newMsg]);
    setIsProcessing(true);

    try {
      const response = await runAdminCoPilotChat(prompt, chatHistory, {
        model: selectedModel,
        role: selectedRole,
        page: "admin.copilot",
        userRole: role,
        enableSearchGrounding: enableGoogleSearch || selectedRole === "market_researcher",
        currentLayout: layoutConfig,
        kpis,
        executionMode,
        refresh: () => queryClient.invalidateQueries(),
      });

      const aiMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        modelUsed: response.modelUsed,
        roleUsed: response.roleUsed,
        content: response.text,
        groundingSources: response.groundingSources,
        executedActions: response.executedActions,
        suggestedAction: response.action,
        timestamp: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
      };

      setChatHistory((prev) => [...prev, aiMsg]);
      if (response.pendingAction) {
        setPendingAction({
          id: `pending-${Date.now()}`,
          toolName: response.pendingAction.toolName,
          args: response.pendingAction.args,
          status: "pending",
        });
      }
      const completedToolWrites = (response.toolResults || []).filter((result) =>
        AI_TOOL_SUITE.find((tool) => tool.name === result.tool)?.mutatesState,
      );
      if (completedToolWrites.length) {
        setReviewActivity((previous) => [
          ...completedToolWrites.map((result, index) => ({
            id: `${Date.now()}-${index}`,
            toolName: result.tool,
            title: AI_TOOL_SUITE.find((tool) => tool.name === result.tool)?.labelAr || result.tool,
            status: result.ok ? "completed" as const : "failed" as const,
            message: result.messageAr,
            createdAt: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
          })),
          ...previous,
        ]);
      }
    } catch (e) {
      setChatHistory((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "حدث خطأ أثناء معالجة الطلب. يرجى المحاولة مرة أخرى.",
          timestamp: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
        }
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartNewChat = () => {
    setChatHistory([
      {
        id: `msg-${Date.now()}`,
        role: "assistant",
        modelUsed: selectedModel,
        roleUsed: selectedRole,
        content: `تم بدء جلسة محادثة جديدة مع **${aiAssistantName}**.\n\nكيف يمكنني مساعدتك الآن؟`,
        timestamp: "الآن",
      },
    ]);
    setAttachedFile(null);
    setChatInput("");
    setPendingAction(null);
    toast.info("تم بدء محادثة جديدة");
  };

  const handleApprovePendingAction = async () => {
    if (!pendingAction || pendingAction.status !== "pending") return;
    const proposal = pendingAction;
    setPendingAction({ ...proposal, status: "executing" });
    const result: ToolExecutionResult = await executeAiTool(proposal.toolName, proposal.args, {
      layout: layoutConfig,
      updateLayout: updateConfig,
      refresh: () => queryClient.invalidateQueries(),
    });

    if (result.gatewayStatus === "approval_required") {
      const error = result.error || "تتطلب هذه العملية مسار موافقة إضافيًا غير متاح حاليًا.";
      setPendingAction({ ...proposal, status: "blocked", error });
      setChatHistory((previous) => [...previous, {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: `لم أنفّذ الإجراء. هذه الأداة تتطلب مسار موافقة إضافيًا: ${error}`,
        timestamp: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
      }]);
      return;
    }

    setReviewActivity((previous) => [{
      id: `activity-${Date.now()}`,
      toolName: proposal.toolName,
      title: AI_TOOL_SUITE.find((tool) => tool.name === proposal.toolName)?.labelAr || proposal.toolName,
      status: result.ok ? "completed" : "failed",
      message: result.messageAr,
      createdAt: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
    }, ...previous]);
    setPendingAction(null);
    if (result.ok) {
      setHealthRevision((revision) => revision + 1);
      queryClient.invalidateQueries();
    }
    setChatHistory((previous) => [...previous, {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: result.ok
        ? `تم تنفيذ الإجراء والتحقق من نتيجته: ${result.messageAr}`
        : `لم يكتمل الإجراء: ${result.messageAr}`,
      timestamp: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
    }]);
  };

  const handleRejectPendingAction = () => {
    if (!pendingAction) return;
    const rejected = pendingAction;
    setReviewActivity((previous) => [{
      id: `activity-${Date.now()}`,
      toolName: rejected.toolName,
      title: AI_TOOL_SUITE.find((tool) => tool.name === rejected.toolName)?.labelAr || rejected.toolName,
      status: "rejected",
      message: "رفض المسؤول المقترح؛ لم تُرسل أي كتابة إلى المتجر.",
      createdAt: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
    }, ...previous]);
    setPendingAction(null);
    setChatHistory((previous) => [...previous, {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: "تم رفض الإجراء. لم أغيّر أي بيانات في المتجر.",
      timestamp: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
    }]);
  };

  return (
    <div
      className="relative h-[calc(100dvh-3.5rem)] flex flex-col overflow-hidden bg-[#F8F5EB] dark:bg-zinc-950 font-sans"
      dir="rtl"
    >
      {/* ─── 1. TOP HEADER & NAVIGATION ─── */}
      <div className="flex-none border-b border-white/20 dark:border-white/10 bg-card px-4 py-3 z-20 shadow-[0_4px_30px_rgba(0,0,0,0.03)] relative">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Identity & Status */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-xs shrink-0">
              <Sparkles className="h-4 w-4" strokeWidth={1.5} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                  {aiAssistantName}
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-medium bg-secondary text-primary border border-border">
                  <Sparkles className="h-3 w-3" />
                  {selectedModel}
                </span>
              </div>
            </div>
          </div>

          {/* Mode Switcher & Actions */}
          <div className="flex items-center gap-1.5 flex-wrap justify-end w-full sm:w-auto">
            <div className="flex items-center gap-0.5 bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg border border-zinc-200/60 dark:border-zinc-700">
              {(
                [
                  { id: "review", label: "المراجعة", icon: ClipboardList },
                  { id: "live-preview", label: "المعاينة الحية", icon: Eye },
                  { id: "store-engine", label: "محرك الواجهة", icon: Layout },
                  { id: "advisory", label: "التقارير", icon: TrendingUp },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                const isActive = activeMode === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveMode(tab.id); setMobilePane("panel"); }}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                  isActive
                        ? "bg-card text-primary shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* AI Tools Sheet Trigger */}
            <Sheet open={toolsSheetOpen} onOpenChange={setToolsSheetOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 rounded-lg text-xs font-medium border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer gap-1"
                >
                  <Wrench className="h-3.5 w-3.5 text-zinc-500" strokeWidth={1.5} />
                  <span>الأدوات</span>
                  <span className="text-[10px] text-zinc-400 font-mono">({AI_TOOL_SUITE.length})</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 sm:w-96 p-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col" dir="rtl">
                <SheetHeader className="p-4 border-b border-zinc-100 dark:border-zinc-800">
                  <SheetTitle className="text-sm font-bold flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-emerald-600" strokeWidth={1.5} />
                    <span>أدوات الذكاء الاصطناعي التنفيذية</span>
                  </SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {(Object.keys(AI_TOOL_GROUP_LABELS) as AiToolGroup[]).map((group) => {
                    const tools = AI_TOOL_SUITE.filter((t) => t.group === group);
                    if (!tools.length) return null;
                    return (
                      <div key={group} className="space-y-1.5">
                        <div className="text-[11px] font-semibold text-zinc-400">
                          {AI_TOOL_GROUP_LABELS[group].labelAr}
                        </div>
                        <div className="space-y-1.5">
                          {tools.map((tool) => (
                            <div
                              key={tool.name}
                              className="rounded-lg border border-zinc-200/70 dark:border-zinc-800 p-2.5 bg-zinc-50/50 dark:bg-zinc-800/30"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                                  {tool.name}
                                </span>
                              </div>
                              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                                {tool.descriptionAr}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </SheetContent>
            </Sheet>

          </div>
        </div>
      </div>

      <section className="mx-3 mt-2 shrink-0 rounded-xl border border-border bg-card px-3 py-2 shadow-sm sm:mx-4" aria-label="حالة بيانات المتجر ووضع التنفيذ">
        <div className="flex flex-row flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-foreground">
              <span>{storeName}</span>
              <span className="text-muted-foreground">·</span>
              <span className="inline-flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${storeDataStatus.state === "connected" ? "bg-emerald-600" : storeDataStatus.state === "offline" ? "bg-[#B6502E]" : "bg-amber-500 animate-pulse"}`} />
                {storeDataStatus.state === "connected" ? "بيانات المتجر متصلة" : storeDataStatus.state === "offline" ? "تعذر الاتصال ببيانات المتجر" : "يتحقق من بيانات المتجر"}
              </span>
            </div>
            <div className="mt-1.5 hidden flex-wrap gap-1.5 text-[11px] text-muted-foreground md:flex">
              <span className="rounded-full bg-secondary px-3 py-1">المنتجات · {storeDataStatus.products ?? "—"}</span>
              <span className="rounded-full bg-secondary px-3 py-1">تحت حد الأمان · {storeDataStatus.lowStock ?? "—"}</span>
              <span className="rounded-full bg-secondary px-3 py-1">الطلبات · {storeDataStatus.orders ?? "—"}</span>
              <span className="rounded-full bg-secondary px-3 py-1">منتجات بلا صورة · {storeDataStatus.missingImages ?? "—"}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            <span className="hidden text-[10px] font-semibold text-muted-foreground xl:inline">وضع عمل المساعد</span>
            <div className="inline-flex rounded-xl bg-secondary p-1" role="group" aria-label="وضع تنفيذ إجراءات المساعد">
              <button type="button" onClick={() => { setExecutionMode("suggest"); setPendingAction(null); }} aria-pressed={executionMode === "suggest"} className={`rounded-lg px-3 py-1.5 text-xs transition ${executionMode === "suggest" ? "bg-card font-bold text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                اقتراح فقط
              </button>
              <button type="button" onClick={() => setExecutionMode("approval")} aria-pressed={executionMode === "approval"} className={`rounded-lg px-3 py-1.5 text-xs transition ${executionMode === "approval" ? "bg-card font-bold text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                بموافقتك
              </button>
              <button type="button" disabled title="سيُتاح بعد تعريف إجراءات منخفضة المخاطر قابلة للعكس في سياسة الأدوات" className="cursor-not-allowed rounded-lg px-3 py-1.5 text-xs text-muted-foreground/60">
                تلقائي البسيط · لاحقًا
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile pane switcher */}
      <div className="mx-3 mt-2 flex shrink-0 items-center gap-1 rounded-xl border border-border bg-card p-1 lg:hidden" role="tablist">
        {([["chat","المحادثة"],["panel","المراجعة والأدوات"]] as const).map(([k,l]) => (
          <button key={k} type="button" role="tab" aria-selected={mobilePane===k} onClick={() => setMobilePane(k)} className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${mobilePane===k ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-secondary"}`}>{l}{k==="panel" && pendingAction ? " •" : ""}</button>
        ))}
        <button type="button" onClick={() => { setReviewTab("history"); setActiveMode("review"); setMobilePane("panel"); }} aria-label="السجل" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-secondary"><History className="h-4 w-4" /></button>
        <button type="button" onClick={handleStartNewChat} aria-label="محادثة جديدة" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-secondary text-foreground hover:bg-accent"><Plus className="h-4 w-4" /></button>
      </div>

      {/* ─── 2. MAIN SPLIT WORKSPACE ─── */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row relative">
        {/* RIGHT PANE: CHAT (First in RTL) */}
        <div className={`${mobilePane === "chat" ? "flex" : "hidden"} lg:flex w-full flex-1 min-h-0 lg:min-w-0 mt-2 lg:mt-0 border-t lg:border-t-0 lg:border-l border-border bg-card flex-col z-10 relative shadow-sm`}>
          <div className="hidden lg:block flex-none border-b border-border px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"><Sparkles className="h-5 w-5" /></div>
                <div className="min-w-0">
                  <h1 className="truncate text-sm font-bold text-foreground">{aiAssistantName}</h1>
                  <p className="truncate text-[11px] text-muted-foreground">يقرأ بيانات المتجر الحية، ولا ينفذ تعديلًا دون موافقتك</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Button variant="outline" size="sm" onClick={() => { setReviewTab("history"); setActiveMode("review"); setMobilePane("panel"); }} className="h-8 rounded-xl px-2.5 text-xs"><History className="me-1 h-3.5 w-3.5" />السجل</Button>
                <Button variant="outline" size="sm" onClick={handleStartNewChat} className="h-8 rounded-xl px-2.5 text-xs"><Plus className="me-1 h-3.5 w-3.5" />محادثة جديدة</Button>
              </div>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-5 space-y-4">
            <div className="max-w-2xl mx-auto space-y-4">
              {chatHistory.length === 0 && (
                <div className="mx-auto max-w-xl py-3 text-center sm:py-10">
                  <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm"><Sparkles className="h-8 w-8" /></div>
                  <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">أهلًا، أنا {aiAssistantName}</h2>
                  <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-muted-foreground">اسألني عن منتجاتك ومبيعاتك ومخزونك. أبحث في بيانات المتجر أولًا، وأعرض أي تعديل للمراجعة قبل تنفيذه.</p>
                  <div className="mt-6 grid gap-2 sm:grid-cols-2 text-start">
                    {["حلل لي مبيعات هذا الأسبوع","ما المنتجات التي أوشكت على النفاد؟","اقترح عرضًا مميزًا ليوم الجمعة","لخص لي مشاكل التوصيل الأخيرة"].map((q) => (
                      <button key={q} type="button" onClick={() => setChatInput(q)} className="rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground shadow-sm transition hover:border-primary hover:bg-secondary">
                        <Sparkles className="me-1.5 inline h-3.5 w-3.5 text-primary" />{q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {chatHistory.map((msg) => {
                const isUser = msg.role === "user";
                const isError = msg.id.startsWith("err-");
                return (
                  <div key={msg.id} className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                    {/* Avatar */}
                    <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full shadow-sm border border-white/20 ${isUser ? "bg-secondary text-foreground" : "bg-primary text-white"}`}>
                      {isUser ? <Bot className="h-4 w-4" strokeWidth={1.5} /> : isError ? <CircleAlert className="h-4 w-4" strokeWidth={1.5} /> : <Sparkles className="h-4 w-4" strokeWidth={1.5} />}
                    </div>

                    {/* Bubble */}
                    <div className={`space-y-1 max-w-[85%] ${isUser ? "text-right" : "text-right"}`}>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium px-1">
                        <span>{isUser ? "المسؤول" : aiAssistantName}</span>
                        <span>•</span>
                        <span>{msg.timestamp}</span>
                      </div>

                      <div className={`rounded-3xl p-4 text-xs sm:text-sm leading-relaxed shadow-sm ${isUser ? "bg-primary text-primary-foreground rounded-tr-sm font-medium" : isError ? "border border-[#B6502E]/50 bg-[#B6502E]/5 text-[#8d3b24] rounded-tl-sm" : "bg-card text-foreground border border-border rounded-tl-sm"}`}>
                        {msg.attachedFile && (
                          <div className="mb-2.5 inline-flex items-center gap-1.5 bg-black/10 dark:bg-white/10 px-2.5 py-1 rounded-md text-xs font-mono">
                            <Paperclip className="h-3 w-3" strokeWidth={1.5} />
                            <span>{msg.attachedFile.path}</span>
                          </div>
                        )}
                        <div className="whitespace-pre-line leading-relaxed">{msg.content}</div>
                        {msg.groundingSources && msg.groundingSources.length > 0 && (
                          <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800 space-y-1.5">
                            <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1">
                              <Globe className="h-3 w-3" strokeWidth={1.5} />
                              <span>مصادر البحث ({msg.groundingSources.length}):</span>
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {msg.groundingSources.map((src, sIdx) => (
                                <a key={sIdx} href={src.uri} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded border border-blue-200/60 dark:border-blue-800">
                                  <span>{src.title || "مصدر خارجي"}</span>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                        {msg.executedActions && msg.executedActions.length > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap gap-1.5">
                            {msg.executedActions.map((act, actIdx) => (
                              <span key={actIdx} className="inline-flex items-center gap-1 text-[10px] font-medium bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
                                <span className="text-emerald-600">{act.field ? String(act.field) : 'Field'}:</span>
                                <span>{act.label ? String(act.label) : 'Action'}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {isProcessing && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 shadow-xs">
                  <Sparkles className="h-4 w-4 animate-spin text-emerald-600" strokeWidth={1.5} />
                      <span>يعالج المساعد طلبك...</span>
                </div>
              )}
              {chatHistory.length <= 1 && (
                <div className="pt-2 space-y-2">
                  <span className="text-[11px] font-medium text-zinc-400 block px-1">إجراءات سريعة مقترحة:</span>
                  <div className="grid grid-cols-1 gap-2">
                    {STARTER_PROMPTS.map((starter, i) => {
                      const Icon = starter.icon;
                      return (
                      <button
                          key={i}
                          type="button"
                          onClick={() => handleSendMessage(starter.prompt)}
                          disabled={Boolean(pendingAction)}
                          className="p-3 rounded-3xl border border-white/20 dark:border-white/10 bg-card hover:border-primary/50 transition-colors text-right cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.03)] group flex items-start justify-between gap-2"
                        >
                          <div className="space-y-0.5 min-w-0">
                            <span className="block text-xs font-bold text-zinc-700 dark:text-zinc-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors truncate">{starter.title}</span>
                            <span className="block text-[10px] text-zinc-500 truncate">{starter.prompt}</span>
                          </div>
                          <div className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/30 group-hover:text-emerald-600 transition-colors">
                            <Icon className="h-3 w-3" strokeWidth={1.5} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Input Area */}
          <div className="flex-none border-t border-border bg-card px-3 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+.5rem)]">
            <form onSubmit={handleFormSubmit} className="max-w-2xl mx-auto relative group">
              <div className="absolute inset-0 bg-background rounded-2xl shadow-sm border-2 border-border pointer-events-none transition-colors group-focus-within:border-primary/50 dark:group-focus-within:border-primary/50 group-focus-within:ring-2 group-focus-within:ring-primary/20" />
              <div className="relative flex flex-col p-2">
                {attachedFile && (
                  <div className="mx-2 mt-1 mb-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl flex items-center justify-between border border-emerald-100 dark:border-emerald-900/50">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="grid h-6 w-6 shrink-0 place-items-center rounded bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600">
                        <Paperclip className="h-3 w-3" strokeWidth={1.5} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-200 truncate">{attachedFile.name}</span>
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-mono truncate">{attachedFile.path}</span>
                      </div>
                    </div>
                    <button type="button" onClick={() => setAttachedFile(null)} className="p-1 hover:bg-emerald-200/50 dark:hover:bg-emerald-800/50 rounded-lg text-emerald-600 transition-colors shrink-0">
                      <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                )}
                <div className="flex items-end gap-2 px-1">
                  <div className="flex-1 min-w-0 flex items-center gap-2 relative">
                    <button type="button" onClick={() => setIsPickerOpen(true)} className="p-2 shrink-0 rounded-xl text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors" title="إرفاق ملف للتحليل">
                      <Paperclip className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                    <textarea
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={isProcessing ? "جاري المعالجة..." : "اكتب أمرك هنا... (مثال: أضف منتج جبنة بيضاء بـ 140 جنيه)"}
                      className="w-full bg-transparent border-0 focus:ring-0 resize-none text-sm py-1.5 px-0 min-h-[38px] max-h-[96px] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 font-medium"
                      rows={1}
                      disabled={isProcessing || Boolean(pendingAction)}
                      dir="auto"
                    />
                  </div>
                  <button type="submit" disabled={isProcessing || Boolean(pendingAction) || (!chatInput.trim() && !attachedFile)} className="mb-1 shrink-0 grid h-10 w-10 place-items-center rounded-full bg-primary text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors shadow-[0_4px_16px_rgba(47,93,75,0.3)]">
                    <Send className="h-4 w-4 rtl:-scale-x-100" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            </form>
            <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground font-medium max-w-2xl mx-auto px-1">
              <span className="flex items-center gap-1"><Sparkles className="h-3 w-3 text-emerald-500" strokeWidth={1.5} /> <span>{selectedModel}</span></span>
              <span>{executionMode === "approval" ? "لن يُنفذ أي تعديل قبل مراجعتك" : "وضع الاقتراح فقط — لا تغييرات على المتجر"}</span>
            </div>
          </div>
        </div>

        {/* LEFT PANE: review queue and supporting workspace */}
        <aside className={`${mobilePane === "panel" ? "flex" : "hidden"} lg:flex w-full lg:w-[370px] xl:w-[420px] flex-1 lg:flex-none mt-2 lg:mt-0 lg:h-full shrink-0 border-t lg:border-t-0 lg:border-r border-border bg-secondary flex-col min-h-0`}>
          {activeMode === "review" ? (
            <>
              <div className="flex-none border-b border-border bg-card px-3 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-bold text-foreground">مراجعة عمل المساعد</h2>
                  <div className="inline-flex rounded-xl bg-secondary p-1" role="tablist" aria-label="لوحة المساعد">
                    {([
                      ["review", "المراجعة"],
                      ["history", "سجل الجلسة"],
                      ["rollback", "التراجع"],
                    ] as const).map(([tab, label]) => (
                      <button key={tab} type="button" role="tab" aria-selected={reviewTab === tab} onClick={() => setReviewTab(tab)} className={`rounded-lg px-2.5 py-1.5 text-[11px] transition ${reviewTab === tab ? "bg-card font-bold text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
                {reviewTab === "review" && (
                  pendingAction ? (
                    <section className={`rounded-2xl border bg-card p-4 shadow-sm ${pendingAction.status === "blocked" ? "border-[#B6502E]" : "border-primary/30"}`} aria-live="polite">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${pendingAction.status === "blocked" ? "bg-[#B6502E]/10 text-[#B6502E]" : "bg-secondary text-primary"}`}>
                            {pendingAction.status === "blocked" ? "لم يُنفذ" : pendingAction.status === "executing" ? "جارٍ التحقق والتنفيذ" : "بانتظار موافقتك"}
                          </span>
                          <h3 className="mt-3 text-base font-bold text-foreground">{AI_TOOL_SUITE.find((tool) => tool.name === pendingAction.toolName)?.labelAr || "إجراء متجر"}</h3>
                        </div>
                        {pendingAction.status === "blocked" ? <CircleAlert className="h-5 w-5 shrink-0 text-[#B6502E]" /> : pendingAction.status === "executing" ? <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" /> : <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />}
                      </div>
                      <p className="mt-2 text-xs leading-6 text-muted-foreground">
                        {needsServerApproval(pendingAction)
                          ? "راجع الحقول. لن يُرسل هذا الإجراء من الواجهة حتى يتوفر مسار الموافقة الخادمي."
                          : "راجع الحقول أدناه. لن تُكتب أي بيانات حتى تضغط «اعتماد وتنفيذ»."}
                      </p>
                      {needsServerApproval(pendingAction) && (
                        <p role="status" className="mt-3 rounded-xl border border-[#B6502E]/30 bg-[#B6502E]/5 p-3 text-xs leading-5 text-[#8d3b24]">
                          هذا الإجراء يحتاج موافقة خادمية مسجلة غير متاحة حاليًا؛ سيبقى مقفولًا ولن يُرسل إلى قاعدة البيانات.
                        </p>
                      )}
                      <dl className="mt-3 space-y-2 rounded-xl bg-[#F8F5EB] p-3 dark:bg-zinc-800">
                        {Object.entries(pendingAction.args)
                          .filter(([key]) => !/(token|secret|password|api.?key)/i.test(key))
                          .slice(0, 10)
                          .map(([key, value]) => (
                            <div key={key} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-2 border-b border-border/70 pb-1.5 last:border-0 last:pb-0">
                              <dt className="break-words text-[11px] font-semibold text-muted-foreground">{key}</dt>
                              <dd className="break-words text-[11px] text-foreground">{(typeof value === "object" ? JSON.stringify(value) : String(value ?? "—")).slice(0, 260)}</dd>
                            </div>
                          ))}
                      </dl>
                      {pendingAction.error && <p role="alert" className="mt-3 rounded-xl bg-[#B6502E]/10 p-3 text-xs leading-5 text-[#9d3f24]">{pendingAction.error}</p>}
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <Button variant="outline" disabled={pendingAction.status === "executing"} onClick={handleRejectPendingAction} className="rounded-xl">رفض</Button>
                        <Button disabled={pendingAction.status !== "pending" || needsServerApproval(pendingAction)} onClick={handleApprovePendingAction} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
                          {pendingAction.status === "executing" ? <><Loader2 className="me-2 h-4 w-4 animate-spin" />جارٍ التنفيذ</> : needsServerApproval(pendingAction) ? "الموافقة الخادمية غير متاحة" : "اعتماد وتنفيذ"}
                        </Button>
                      </div>
                    </section>
                  ) : (
                    <>
                      <section className="grid min-h-[210px] place-items-center rounded-2xl border border-dashed border-border bg-card/70 p-5 text-center">
                        <div>
                          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-primary"><Check className="h-7 w-7" /></div>
                          <h3 className="mt-4 text-sm font-bold text-foreground">لا توجد تغييرات للمراجعة</h3>
                          <p className="mx-auto mt-2 max-w-xs text-xs leading-6 text-muted-foreground">أي تعديل يقترحه المساعد سيظهر هنا مع بياناته قبل التنفيذ. يمكنك قبوله أو رفضه.</p>
                        </div>
                      </section>
                      <section className="rounded-2xl border border-border bg-card p-4">
                        <h3 className="text-xs font-bold text-foreground">حدود المساعد</h3>
                        <p className="mt-2 text-xs leading-6 text-muted-foreground">يقرأ معلومات المتجر من قاعدة البيانات. لا يغيّر صلاحيات أو ملفات المشروع، ولا ينفّذ تعديلًا في وضع «اقتراح فقط».</p>
                      </section>
                    </>
                  )
                )}

                {reviewTab === "history" && (
                  <section className="space-y-3">
                    {reviewActivity.length === 0 ? (
                      <div className="grid min-h-[210px] place-items-center rounded-2xl border border-dashed border-border bg-card p-5 text-center">
                        <div><History className="mx-auto h-8 w-8 text-muted-foreground" /><h3 className="mt-3 text-sm font-bold text-foreground">لا يوجد نشاط في هذه الجلسة</h3><p className="mt-1 text-xs text-muted-foreground">ستظهر هنا نتائج الأدوات التي نُفذت أو رُفضت في المحادثة الحالية.</p></div>
                      </div>
                    ) : reviewActivity.map((item) => (
                      <article key={item.id} className="rounded-2xl border border-border bg-card p-3">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-xs font-bold text-foreground">{item.title}</h3>
                          <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${item.status === "completed" ? "bg-emerald-100 text-emerald-800" : "bg-[#B6502E]/10 text-[#B6502E]"}`}>{item.status === "completed" ? "تم التحقق" : item.status === "failed" ? "لم يكتمل" : "مرفوض"}</span>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.message}</p>
                        <p className="mt-2 text-[10px] text-muted-foreground">{item.createdAt}</p>
                      </article>
                    ))}
                  </section>
                )}

                {reviewTab === "rollback" && (
                  lastRollback ? (
                    <section className="rounded-2xl border border-border bg-card p-4">
                      <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold text-primary">متاح للتراجع</span>
                      <h3 className="mt-3 text-sm font-bold text-foreground">{lastRollback.labelAr}</h3>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">سيحاول النظام عكس آخر تغيير مسجل في هذه الجلسة، ثم يعيد تحديث بيانات العرض.</p>
                      <Button variant="outline" onClick={handleRollback} className="mt-4 w-full rounded-xl"><RotateCcw className="me-2 h-4 w-4" />تراجع عن التغيير</Button>
                    </section>
                  ) : (
                    <div className="grid min-h-[210px] place-items-center rounded-2xl border border-dashed border-border bg-card p-5 text-center"><div><RotateCcw className="mx-auto h-8 w-8 text-muted-foreground" /><h3 className="mt-3 text-sm font-bold text-foreground">لا يوجد تغيير قابل للتراجع</h3><p className="mt-1 text-xs text-muted-foreground">ستظهر هنا نقطة التراجع إذا سجّل النظام تغييرًا قابلًا للعكس.</p></div></div>
                  )
                )}
              </div>
            </>
          ) : activeMode === "live-preview" ? (
            <div className="h-full overflow-y-auto p-3"><LiveStorefrontPreview s={settings} /></div>
          ) : activeMode === "store-engine" ? (
            <div className="h-full overflow-y-auto p-4"><StoreEngineBuilder layoutConfig={layoutConfig} onLayoutChange={updateConfig} onDeploy={handleDeployLayout} isDeploying={isDeploying} /></div>
          ) : (
            <div className="h-full overflow-y-auto p-4"><ExecutiveSummaryWidget kpis={kpis} /></div>
          )}
        </aside>
      </div>

      {/* ─── MODALS ─── */}
      <GeminiFileAttachmentPicker isOpen={isPickerOpen} onClose={() => setIsPickerOpen(false)} onSelectFile={(file) => { setAttachedFile(file); toast.success(`تم إرفاق ملف ${file.name}`); }} selectedFilePath={attachedFile?.path} />
      <SmartProductCopywriterModal open={copywriterModalOpen} onOpenChange={setCopywriterModalOpen} onApplyCopywriting={(result) => { toast.success(`تم توليد الوصف الإعلاني للمنتج: ${result.name ?? ""}`); }} />
    </div>
  );
}

