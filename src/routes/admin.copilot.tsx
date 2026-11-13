import { createFileRoute, Link } from "@tanstack/react-router";
import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Send,
  RotateCcw,
  Layout,
  TrendingUp,
  Eye,
  Package,
  Paperclip,
  Globe,
  Search,
  Bot,
  X,
  ChevronDown,
  ShieldCheck,
  Wrench,
  Plus,
  Layers,
  CircleAlert,
  BarChart3,
  Check,
  Loader2,
  ClipboardList,
  PanelLeft,
} from "lucide-react";
import type { AiToolName, ToolExecutionResult } from "@/services/aiTools/types";
import { Button } from "@/components/ui/button";
import { useLayoutConfig } from "@/lib/layout-config-context";
import {
  runAdminCoPilotChat,
  ChatMessage,
  ExecutiveKpiInput,
  GeminiModelChoice,
  GeminiRoleChoice,
} from "@/services/gemini36Service";
import { ProjectFileMeta } from "@/services/projectFilesService";
import { GeminiFileAttachmentPicker } from "@/components/admin/GeminiFileAttachmentPicker";
import { StoreEngineBuilder } from "@/components/admin/StoreEngineBuilder";
import { ExecutiveSummaryWidget } from "@/components/admin/ExecutiveSummaryWidget";
import { LiveStorefrontPreview } from "@/components/admin/LiveStorefrontPreview";
import { SmartProductCopywriterModal } from "@/components/admin/SmartProductCopywriterModal";
import {
  AI_TOOL_SUITE,
  AI_TOOL_GROUP_LABELS,
  executeAiTool,
  getLastRollbackPoint,
  rollbackLastAction,
  type AiToolGroup,
  type RollbackPoint,
} from "@/services/geminiToolsEngine";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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
    meta: [{ title: "نبراس — ذكاء تشغيل المتجر" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: AdminCoPilotPage,
});

const THINKING_STEPS = [
  "يتصل بقاعدة بيانات الوادي الأخضر...",
  "يحلل الأرقام والمخزون والطلبات...",
  "يتحقق من قواعد الأمان والأثر المالي...",
  "يصيغ التوصية التنفيذية...",
];

const STARTER_PROMPTS = [
  {
    title: "ابحث عن منتج",
    desc: "السعر والمخزون والحالة الحالية",
    prompt: "ابحث عن منتج في الكتالوج الحالي",
    icon: Package,
  },
  {
    title: "أنشئ عرضًا",
    desc: "اقترح حملة كوبون قابلة للمراجعة",
    prompt: "أنشئ حملة كوبون خصم جديدة بعد مراجعة البيانات",
    icon: BarChart3,
  },
  {
    title: "عدّل الأسعار",
    desc: "غيّر أسعار قسم بعد موافقتي",
    prompt: "عدّل أسعار قسم الألبان بنسبة 10% واعرض بطاقة الموافقة",
    icon: ClipboardList,
  },
  {
    title: "راجع المبيعات والمخزون",
    desc: "ملخص تنفيذي مبني على بيانات المتجر",
    prompt: "حلل المبيعات والمخزون وحدد النواقص والمنتجات الراكدة",
    icon: Search,
  },
  {
    title: "إدارة الأقسام",
    desc: "راجع الأقسام وأنشئ قسمًا بعد التأكيد",
    prompt: "راجع أقسام المتجر الحالية واقترح ما يحتاج تحديثًا",
    icon: Layers,
  },
  {
    title: "توقع النواقص",
    desc: "حدد المنتجات التي تحتاج إعادة طلب",
    prompt: "حلل المخزون الحالي وحدد المنتجات القريبة من النفاد",
    icon: TrendingUp,
  },
];

type ExecutionMode = "suggest" | "approval";
type WorkspaceMode = "review" | "live-preview" | "store-engine" | "advisory";

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

/**
 * Gemini / Claude Style Aurora Thinking Indicator
 */
function NebrasThinkingIndicator() {
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setStepIdx((prev) => (prev + 1) % THINKING_STEPS.length);
    }, 1700);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.25 }}
      className="flex items-start gap-3"
    >
      {/* Glowing Aurora Avatar */}
      <div className="relative mt-0.5 grid h-8 w-8 shrink-0 place-items-center">
        <motion.span
          animate={{ scale: [1, 1.35, 1], opacity: [0.45, 0.15, 0.45] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 rounded-full bg-emerald-400 blur-xs"
        />
        <motion.div
          animate={{ rotate: [0, 8, -8, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          className="relative grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 text-white shadow-sm"
        >
          <Sparkles className="h-4 w-4" />
        </motion.div>
      </div>

      {/* Thinking Bubble with Animated Dots & Rotating Status */}
      <div className="flex flex-col gap-1.5 rounded-3xl rounded-tr-md border border-emerald-200/60 bg-gradient-to-l from-emerald-50/60 via-white to-slate-50/70 px-4 py-3 shadow-2xs dark:border-emerald-500/20 dark:from-emerald-950/30 dark:via-[#111621] dark:to-[#111621]">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1" aria-hidden="true">
            {[0, 1, 2].map((dot) => (
              <motion.span
                key={dot}
                animate={{ y: [0, -4, 0], opacity: [0.35, 1, 0.35] }}
                transition={{
                  duration: 0.9,
                  repeat: Infinity,
                  delay: dot * 0.18,
                  ease: "easeInOut",
                }}
                className="h-1.5 w-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400"
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.span
              key={stepIdx}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22 }}
              className="text-xs font-semibold text-emerald-900 dark:text-emerald-200"
            >
              {THINKING_STEPS[stepIdx]}
            </motion.span>
          </AnimatePresence>
        </div>

        {/* Subtle Shimmer Skeleton Bar */}
        <div className="h-1.5 w-44 overflow-hidden rounded-full bg-emerald-100/80 dark:bg-white/5">
          <motion.div
            animate={{ x: ["100%", "-100%"] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="h-full w-1/2 rounded-full bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent"
          />
        </div>
      </div>
    </motion.div>
  );
}

function AdminCoPilotPage() {
  const { role } = useAuth();
  const settings = useSettings();
  const storeName = settings.site_name || BRAND_NAME_AR;
  const aiAssistantName = "نبراس";
  const aiAssistantSubtitle = "ذكاء تشغيل المتجر";
  const { config: layoutConfig, updateConfig } = useLayoutConfig();

  // Workspace & Responsive Panel States
  const [activeMode, setActiveMode] = useState<WorkspaceMode>("review");
  const [reviewTab, setReviewTab] = useState<"review" | "history" | "rollback">("review");
  const [isDesktopPanelOpen, setIsDesktopPanelOpen] = useState(true);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [showStatusPopover, setShowStatusPopover] = useState(false);

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

  // Prompt & File Attachment
  const [chatInput, setChatInput] = useState("");
  const [attachedFile, setAttachedFile] = useState<ProjectFileMeta | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Model & Role Config
  const [selectedModel] = useState<GeminiModelChoice>(DEFAULT_GEMINI_MODEL);
  const [selectedRole] = useState<GeminiRoleChoice>("store_architect");
  const [enableGoogleSearch] = useState(true);

  // Modals & Sheets
  const [copywriterModalOpen, setCopywriterModalOpen] = useState(false);
  const [toolsSheetOpen, setToolsSheetOpen] = useState(false);

  const queryClient = useQueryClient();
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isProcessing, pendingAction]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [chatInput]);

  const handleDeployLayout = async () => {
    setIsDeploying(true);
    try {
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
      const [products, lowStock, outOfStock, orders, missingImages, recentOrders] =
        await Promise.all([
          supabase.from("products").select("id", { count: "exact", head: true }),
          supabase.from("products").select("id", { count: "exact", head: true }).lte("stock", 5),
          supabase.from("products").select("id", { count: "exact", head: true }).lte("stock", 0),
          supabase.from("orders").select("id", { count: "exact", head: true }),
          supabase.from("products").select("id", { count: "exact", head: true }).is("image_url", null),
          supabase
            .from("orders")
            .select("total_amount,status,created_at")
            .order("created_at", { ascending: false })
            .limit(2000),
        ]);
      if (cancelled) return;
      setStoreDataStatus({
        state:
          products.error || orders.error || lowStock.error || missingImages.error
            ? "offline"
            : "connected",
        products: products.error ? null : (products.count ?? 0),
        lowStock: lowStock.error ? null : (lowStock.count ?? 0),
        orders: orders.error ? null : (orders.count ?? 0),
        missingImages: missingImages.error ? null : (missingImages.count ?? 0),
      });
      if (!recentOrders.error) {
        const rows = recentOrders.data ?? [];
        const validOrders = rows.filter((order) => order.status !== "cancelled");
        const revenue = validOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
        setKpis({
          totalRevenue: revenue,
          totalOrders: validOrders.length,
          averageOrderValue: validOrders.length ? revenue / validOrders.length : 0,
          outOfStockCount: outOfStock.count ?? 0,
          lowStockCount: lowStock.count ?? 0,
          topSellingCategory: "بيانات المتجر الحالية",
        });
      }
    };
    void loadStoreHealth();
    const timer = window.setInterval(() => void loadStoreHealth(), 45_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
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
        setActiveMode("review");
        setReviewTab("review");
        setIsDesktopPanelOpen(true);
      }
      const completedToolWrites = (response.toolResults || []).filter(
        (result) => AI_TOOL_SUITE.find((tool) => tool.name === result.tool)?.mutatesState
      );
      if (completedToolWrites.length) {
        setReviewActivity((previous) => [
          ...completedToolWrites.map((result, index) => ({
            id: `${Date.now()}-${index}`,
            toolName: result.tool,
            title: AI_TOOL_SUITE.find((tool) => tool.name === result.tool)?.labelAr || result.tool,
            status: result.ok ? ("completed" as const) : ("failed" as const),
            message: result.messageAr,
            createdAt: new Date().toLocaleTimeString("ar-EG", {
              hour: "2-digit",
              minute: "2-digit",
            }),
          })),
          ...previous,
        ]);
      }
    } catch {
      setChatHistory((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "حدث خطأ أثناء معالجة الطلب. يرجى المحاولة مرة أخرى.",
          timestamp: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartNewChat = () => {
    setChatHistory([]);
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
      approvalGranted: true,
    });

    setReviewActivity((previous) => [
      {
        id: `activity-${Date.now()}`,
        toolName: proposal.toolName,
        title:
          AI_TOOL_SUITE.find((tool) => tool.name === proposal.toolName)?.labelAr ||
          proposal.toolName,
        status: result.ok ? "completed" : "failed",
        message: result.messageAr,
        createdAt: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
      },
      ...previous,
    ]);
    setPendingAction(null);
    if (result.ok) {
      setHealthRevision((revision) => revision + 1);
      queryClient.invalidateQueries();
    }
    setChatHistory((previous) => [
      ...previous,
      {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: result.ok
          ? `✅ تم تنفيذ الإجراء والتحقق من نتيجته: ${result.messageAr}`
          : `⚠️ لم يكتمل الإجراء: ${result.messageAr}`,
        timestamp: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  const handleRejectPendingAction = () => {
    if (!pendingAction) return;
    const rejected = pendingAction;
    setReviewActivity((previous) => [
      {
        id: `activity-${Date.now()}`,
        toolName: rejected.toolName,
        title:
          AI_TOOL_SUITE.find((tool) => tool.name === rejected.toolName)?.labelAr ||
          rejected.toolName,
        status: "rejected",
        message: "رفض المسؤول المقترح؛ لم تُرسل أي كتابة إلى المتجر.",
        createdAt: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
      },
      ...previous,
    ]);
    setPendingAction(null);
    setChatHistory((previous) => [
      ...previous,
      {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "تم رفض الإجراء. لم أغيّر أي بيانات في المتجر.",
        timestamp: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  const openWorkspaceMode = (mode: WorkspaceMode) => {
    setActiveMode(mode);
    if (window.innerWidth >= 1280) {
      setIsDesktopPanelOpen(true);
    } else {
      setIsMobileDrawerOpen(true);
    }
  };

  const renderWorkspacePanelContent = () => (
    <div className="flex h-full flex-col bg-slate-50/70 dark:bg-[#11151c]">
      <div className="flex-none border-b border-slate-200/80 bg-white px-3 py-2.5 dark:border-white/10 dark:bg-[#151b23]">
        <div className="grid grid-cols-4 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-white/5">
          {(
            [
              { id: "review", label: "المراجعة", icon: ClipboardList },
              { id: "live-preview", label: "المعاينة", icon: Eye },
              { id: "store-engine", label: "الواجهة", icon: Layout },
              { id: "advisory", label: "التقارير", icon: TrendingUp },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeMode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveMode(tab.id)}
                className={`flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-bold transition ${
                  isActive
                    ? "bg-white text-primary shadow-xs dark:bg-white/10 dark:text-white"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {activeMode === "review" ? (
        <>
          <div className="flex-none border-b border-slate-200/70 bg-white/60 px-4 py-2.5 dark:border-white/10 dark:bg-white/[0.02]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-foreground">
                {pendingAction ? "قرار ينتظر الاعتماد" : "مركز المراجعة والسجل"}
              </span>
              <div className="inline-flex rounded-lg bg-secondary p-0.5">
                {(
                  [
                    ["review", "المراجعة"],
                    ["history", "السجل"],
                    ["rollback", "التراجع"],
                  ] as const
                ).map(([tab, label]) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setReviewTab(tab)}
                    className={`rounded-md px-2 py-1 text-[11px] transition ${
                      reviewTab === tab
                        ? "bg-card font-bold text-primary shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
            {reviewTab === "review" &&
              (pendingAction ? (
                <section className="rounded-2xl border border-primary/30 bg-white p-4 shadow-sm dark:bg-[#151b23]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                      بانتظار موافقتك
                    </span>
                    <ShieldCheck className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="mt-2.5 text-base font-black text-foreground">
                    {AI_TOOL_SUITE.find((t) => t.name === pendingAction.toolName)?.labelAr ||
                      "إجراء متجر"}
                  </h3>
                  <dl className="mt-3 space-y-1.5 rounded-xl bg-slate-100 p-3 dark:bg-zinc-800/80">
                    {Object.entries(pendingAction.args)
                      .filter(([k]) => !/(token|secret|password|api.?key)/i.test(k))
                      .slice(0, 8)
                      .map(([k, v]) => (
                        <div
                          key={k}
                          className="flex justify-between gap-2 border-b border-border/60 pb-1 last:border-0 text-[11px]"
                        >
                          <dt className="font-semibold text-muted-foreground">{k}</dt>
                          <dd className="truncate font-mono text-foreground">
                            {typeof v === "object" ? JSON.stringify(v) : String(v ?? "—")}
                          </dd>
                        </div>
                      ))}
                  </dl>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pendingAction.status === "executing"}
                      onClick={handleRejectPendingAction}
                      className="rounded-xl"
                    >
                      رفض
                    </Button>
                    <Button
                      size="sm"
                      disabled={pendingAction.status !== "pending"}
                      onClick={handleApprovePendingAction}
                      className="rounded-xl font-bold"
                    >
                      {pendingAction.status === "executing" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "اعتماد وتنفيذ"
                      )}
                    </Button>
                  </div>
                </section>
              ) : (
                <>
                  <div className="rounded-2xl border border-dashed border-border bg-card/80 p-6 text-center">
                    <div className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40">
                      <Check className="h-5 w-5" />
                    </div>
                    <h3 className="mt-3 text-sm font-bold text-foreground">
                      لا توجد تغييرات معلقة
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      أي تعديل يقترحه نبراس سيظهر هنا مع تفاصيل الأثر قبل تنفيذه على قاعدة البيانات.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border bg-card p-3.5">
                    <div className="text-xs font-bold text-foreground mb-2.5">وصول سريع للإدارة</div>
                    <div className="grid grid-cols-3 gap-2">
                      <Link
                        to="/admin/orders"
                        className="rounded-xl border border-border py-2 text-center text-xs font-bold text-muted-foreground hover:border-primary hover:text-primary transition"
                      >
                        الطلبات
                      </Link>
                      <Link
                        to="/admin/products"
                        className="rounded-xl border border-border py-2 text-center text-xs font-bold text-muted-foreground hover:border-primary hover:text-primary transition"
                      >
                        المنتجات
                      </Link>
                      <Link
                        to="/admin/forecasting"
                        className="rounded-xl border border-border py-2 text-center text-xs font-bold text-muted-foreground hover:border-primary hover:text-primary transition"
                      >
                        التوقعات
                      </Link>
                    </div>
                  </div>
                </>
              ))}

            {reviewTab === "history" &&
              (reviewActivity.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">
                  لا يوجد سجل عمليات في هذه الجلسة بعد.
                </div>
              ) : (
                reviewActivity.map((item) => (
                  <article key={item.id} className="rounded-2xl border border-border bg-card p-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-xs font-bold text-foreground">{item.title}</h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          item.status === "completed"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {item.status === "completed" ? "مُنفذ" : "مرفوض/فشل"}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">{item.message}</p>
                    <span className="mt-1.5 block text-[10px] text-muted-foreground">
                      {item.createdAt}
                    </span>
                  </article>
                ))
              ))}

            {reviewTab === "rollback" &&
              (lastRollback ? (
                <section className="rounded-2xl border border-border bg-card p-4">
                  <h3 className="text-sm font-bold text-foreground">{lastRollback.labelAr}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    يمكنك التراجع عن آخر تعديل مسجل في هذه الجلسة.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRollback}
                    className="mt-3 w-full rounded-xl"
                  >
                    <RotateCcw className="me-2 h-3.5 w-3.5" />
                    تراجع عن التغيير
                  </Button>
                </section>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">
                  لا توجد نقطة تراجع متاحة حالياً.
                </div>
              ))}
          </div>
        </>
      ) : activeMode === "live-preview" ? (
        <div className="flex-1 overflow-y-auto p-3">
          <LiveStorefrontPreview s={settings} />
        </div>
      ) : activeMode === "store-engine" ? (
        <div className="flex-1 overflow-y-auto p-3">
          <StoreEngineBuilder
            layoutConfig={layoutConfig}
            onLayoutChange={updateConfig}
            onDeploy={handleDeployLayout}
            isDeploying={isDeploying}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-3">
          <ExecutiveSummaryWidget kpis={kpis} />
        </div>
      )}
    </div>
  );

  return (
    <div
      className="relative flex h-[calc(100dvh-3.5rem)] w-full flex-col overflow-hidden bg-white dark:bg-[#0b0f17] font-sans"
      dir="rtl"
    >
      {/* ─── 1. SINGLE UNIFIED SLIM HEADER (Gemini / Claude Style) ─── */}
      <header className="relative z-30 flex h-14 flex-none items-center justify-between gap-2 border-b border-slate-200/80 bg-white/90 px-3 backdrop-blur-md sm:px-5 dark:border-white/10 dark:bg-[#11151c]/90">
        {/* Gemini Top Shimmer Line when Thinking */}
        <AnimatePresence>
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] overflow-hidden bg-emerald-500/15"
            >
              <motion.div
                animate={{ x: ["100%", "-100%"] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                className="h-full w-1/3 bg-gradient-to-r from-transparent via-emerald-500 to-transparent"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Right: Brand Identity + Live Store Pill */}
        <div className="flex min-w-0 items-center gap-2.5">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white shadow-xs"
          >
            <Sparkles className="h-4 w-4" />
          </motion.div>

          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-sm font-black text-slate-900 sm:text-base dark:text-white">
              {aiAssistantName}
            </h1>

            <button
              type="button"
              onClick={() => setShowStatusPopover((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  storeDataStatus.state === "connected"
                    ? "bg-emerald-500"
                    : storeDataStatus.state === "offline"
                      ? "bg-rose-500"
                      : "bg-amber-500 animate-pulse"
                }`}
              />
              <span className="hidden sm:inline">{storeName}</span>
              <ChevronDown
                className={`h-3 w-3 text-slate-400 transition-transform ${showStatusPopover ? "rotate-180" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* Left: Compact Action Controls */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleStartNewChat}
            title="محادثة جديدة"
            className="h-8 rounded-full px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
          >
            <Plus className="h-4 w-4 sm:me-1" />
            <span className="hidden sm:inline">جديد</span>
          </Button>

          <Sheet open={toolsSheetOpen} onOpenChange={setToolsSheetOpen}>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-full border-slate-200 px-2.5 text-xs font-semibold dark:border-white/10"
              >
                <Wrench className="h-3.5 w-3.5 text-emerald-600 sm:me-1.5" />
                <span className="hidden md:inline">الأدوات</span>
                <span className="ms-1 font-mono text-[10px] text-muted-foreground">
                  {AI_TOOL_SUITE.length}
                </span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-[88vw] max-w-sm p-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col"
              dir="rtl"
            >
              <SheetHeader className="p-4 border-b border-zinc-100 dark:border-zinc-800">
                <SheetTitle className="text-sm font-bold flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-emerald-600" />
                  <span>أدوات نبراس التنفيذية ({AI_TOOL_SUITE.length})</span>
                </SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {(Object.keys(AI_TOOL_GROUP_LABELS) as AiToolGroup[]).map((group) => {
                  const tools = AI_TOOL_SUITE.filter((t) => t.group === group);
                  if (!tools.length) return null;
                  return (
                    <div key={group} className="space-y-1.5">
                      <div className="text-[11px] font-bold text-zinc-400">
                        {AI_TOOL_GROUP_LABELS[group].labelAr}
                      </div>
                      <div className="space-y-1.5">
                        {tools.map((tool) => (
                          <div
                            key={tool.name}
                            className="rounded-xl border border-zinc-200/70 dark:border-zinc-800 p-2.5 bg-zinc-50/60 dark:bg-zinc-800/30"
                          >
                            <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                              {tool.labelAr || tool.name}
                            </div>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
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

          <Button
            type="button"
            size="sm"
            variant={
              (isDesktopPanelOpen && typeof window !== "undefined" && window.innerWidth >= 1280) ||
              pendingAction
                ? "default"
                : "outline"
            }
            onClick={() => {
              if (window.innerWidth >= 1280) {
                setIsDesktopPanelOpen((prev) => !prev);
              } else {
                setIsMobileDrawerOpen(true);
              }
            }}
            className="relative h-8 rounded-full px-3 text-xs font-bold"
          >
            <PanelLeft className="h-3.5 w-3.5 sm:me-1.5" />
            <span className="hidden sm:inline">مساحة العمل</span>
            {pendingAction && (
              <span className="absolute -top-0.5 -start-0.5 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-white" />
            )}
          </Button>
        </div>

        {/* Animated Store Health & Execution Mode Popover */}
        <AnimatePresence>
          {showStatusPopover && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-x-3 top-15 z-40 mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xl sm:inset-x-6 dark:border-white/10 dark:bg-[#151b23]"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold">
                  <span className="rounded-full bg-secondary px-2.5 py-1">
                    المنتجات: {storeDataStatus.products ?? "—"}
                  </span>
                  <span className="rounded-full bg-amber-50 text-amber-800 px-2.5 py-1">
                    نواقص: {storeDataStatus.lowStock ?? "—"}
                  </span>
                  <span className="rounded-full bg-secondary px-2.5 py-1">
                    الطلبات: {storeDataStatus.orders ?? "—"}
                  </span>
                  <span className="rounded-full bg-secondary px-2.5 py-1">
                    بلا صورة: {storeDataStatus.missingImages ?? "—"}
                  </span>
                </div>

                <div className="inline-flex self-start rounded-xl bg-secondary p-1 sm:self-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setExecutionMode("suggest");
                      setPendingAction(null);
                    }}
                    className={`rounded-lg px-2.5 py-1 text-xs transition ${
                      executionMode === "suggest"
                        ? "bg-card font-bold text-primary shadow-2xs"
                        : "text-muted-foreground"
                    }`}
                  >
                    اقتراح فقط
                  </button>
                  <button
                    type="button"
                    onClick={() => setExecutionMode("approval")}
                    className={`rounded-lg px-2.5 py-1 text-xs transition ${
                      executionMode === "approval"
                        ? "bg-card font-bold text-primary shadow-2xs"
                        : "text-muted-foreground"
                    }`}
                  >
                    بموافقتك
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ─── 2. MAIN WORKSPACE ─── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <main className="flex flex-1 min-w-0 flex-col bg-white dark:bg-[#0b0f17]">
          <div className="flex-1 min-h-0 overflow-y-auto px-3 py-5 sm:px-6 md:py-8">
            <div className="mx-auto max-w-3xl space-y-6">
              {/* Animated Welcome Hero State */}
              {chatHistory.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="flex flex-col items-center pt-4 pb-6 text-center sm:pt-8"
                >
                  <motion.div
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                    className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white shadow-lg shadow-emerald-600/20"
                  >
                    <Sparkles className="h-7 w-7" />
                  </motion.div>
                  <span className="text-[11px] font-bold tracking-wider text-emerald-700 dark:text-emerald-400">
                    {aiAssistantSubtitle}
                  </span>
                  <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                    أهلاً بك في {aiAssistantName}
                  </h2>
                  <p className="mt-2 max-w-lg text-xs leading-6 text-slate-500 sm:text-sm dark:text-slate-400">
                    مساعدك التنفيذي لإدارة {storeName}. اسأل عن المبيعات والمخزون أو اطلب تعديل
                    الأسعار والعروض — ولن يُنفذ أي تغيير قبل مراجعتك.
                  </p>

                  <div className="mt-7 grid w-full grid-cols-1 gap-2.5 text-right sm:grid-cols-2">
                    {STARTER_PROMPTS.map((starter, i) => {
                      const Icon = starter.icon;
                      return (
                        <motion.button
                          key={i}
                          type="button"
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: i * 0.05 }}
                          whileHover={{ y: -2 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => handleSendMessage(starter.prompt)}
                          disabled={Boolean(pendingAction)}
                          className="group flex items-start gap-3 rounded-2xl border border-slate-200/90 bg-slate-50/60 p-3.5 text-right transition-colors hover:border-emerald-400/60 hover:bg-emerald-50/40 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
                        >
                          <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white text-emerald-600 shadow-2xs border border-slate-100 group-hover:bg-emerald-600 group-hover:text-white transition dark:bg-white/10 dark:border-white/10">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-xs font-bold text-slate-800 sm:text-sm dark:text-slate-100">
                              {starter.title}
                            </div>
                            <div className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
                              {starter.desc}
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Animated Messages Thread */}
              <AnimatePresence initial={false}>
                {chatHistory.map((msg) => {
                  const isUser = msg.role === "user";
                  const isError = msg.id.startsWith("err-");
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 12, scale: 0.99 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.28, ease: "easeOut" }}
                      className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                    >
                      <div
                        className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${
                          isUser
                            ? "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-200"
                            : isError
                              ? "bg-rose-100 text-rose-700"
                              : "bg-emerald-600 text-white shadow-xs"
                        }`}
                      >
                        {isUser ? (
                          <Bot className="h-4 w-4" />
                        ) : isError ? (
                          <CircleAlert className="h-4 w-4" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                      </div>

                      <div
                        className={`min-w-0 max-w-[88%] sm:max-w-[82%] space-y-1 ${
                          isUser ? "items-end" : "items-start"
                        }`}
                      >
                        <div
                          className={`flex items-center gap-1.5 px-1 text-[10px] text-muted-foreground ${
                            isUser ? "justify-end" : "justify-start"
                          }`}
                        >
                          <span>{isUser ? "أنت" : aiAssistantName}</span>
                          <span>•</span>
                          <span>{msg.timestamp}</span>
                        </div>

                        <div
                          className={`rounded-3xl px-4 py-3 text-sm leading-7 ${
                            isUser
                              ? "rounded-tl-md bg-slate-100 text-slate-900 font-medium dark:bg-white/10 dark:text-white"
                              : isError
                                ? "rounded-tr-md border border-rose-200 bg-rose-50/60 text-rose-900"
                                : "rounded-tr-md bg-transparent px-1 py-1 text-slate-800 dark:text-slate-100"
                          }`}
                        >
                          {msg.attachedFile && (
                            <div className="mb-2 inline-flex items-center gap-1.5 rounded-lg bg-black/5 px-2.5 py-1 text-xs font-mono dark:bg-white/10">
                              <Paperclip className="h-3 w-3" />
                              <span className="truncate max-w-[200px]">{msg.attachedFile.name}</span>
                            </div>
                          )}
                          <div className="whitespace-pre-line">{msg.content}</div>

                          {msg.groundingSources && msg.groundingSources.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5 pt-2 border-t border-slate-100 dark:border-white/10">
                              {msg.groundingSources.map((src, sIdx) => (
                                <a
                                  key={sIdx}
                                  href={src.uri}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-medium text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300"
                                >
                                  <Globe className="h-3 w-3" />
                                  <span>{src.title || "مصدر"}</span>
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Animated Approval Artifact Card */}
              <AnimatePresence>
                {pendingAction && (
                  <motion.div
                    initial={{ opacity: 0, y: 14, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/50 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/20"
                    aria-live="polite"
                  >
                    <div className="flex items-center justify-between border-b border-amber-200/70 bg-amber-100/50 px-4 py-2.5 dark:border-amber-900/50 dark:bg-amber-900/20">
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
                        <ShieldCheck className="h-4 w-4 text-amber-600" />
                        <span>
                          {AI_TOOL_SUITE.find((t) => t.name === pendingAction.toolName)?.labelAr ||
                            "مراجعة تعديل المتجر"}
                        </span>
                      </div>
                      <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                        بانتظار موافقتك
                      </span>
                    </div>

                    <div className="p-4 space-y-3">
                      <dl className="grid grid-cols-1 gap-1.5 rounded-xl bg-white/90 p-3 text-xs sm:grid-cols-2 dark:bg-black/20">
                        {Object.entries(pendingAction.args)
                          .filter(([k]) => !/(token|secret|password|api.?key)/i.test(k))
                          .slice(0, 6)
                          .map(([k, v]) => (
                            <div key={k} className="flex items-center justify-between gap-2 truncate">
                              <span className="font-semibold text-muted-foreground">{k}:</span>
                              <span className="truncate font-mono text-foreground">
                                {typeof v === "object" ? JSON.stringify(v) : String(v)}
                              </span>
                            </div>
                          ))}
                      </dl>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          disabled={pendingAction.status !== "pending"}
                          onClick={handleApprovePendingAction}
                          className="rounded-xl bg-emerald-600 px-4 font-bold text-white hover:bg-emerald-700"
                        >
                          {pendingAction.status === "executing" ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="me-1.5 h-3.5 w-3.5" />
                              موافق وتنفيذ
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pendingAction.status === "executing"}
                          onClick={handleRejectPendingAction}
                          className="rounded-xl"
                        >
                          إلغاء
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openWorkspaceMode("review")}
                          className="rounded-xl text-xs text-muted-foreground"
                        >
                          تفاصيل كاملة
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Gemini / Claude Aurora Thinking Animation */}
              <AnimatePresence>{isProcessing && <NebrasThinkingIndicator />}</AnimatePresence>

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* ─── 3. UNIFIED FLOATING PROMPT COMPOSER ─── */}
          <div className="flex-none bg-gradient-to-t from-white via-white to-transparent px-3 pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] sm:px-6 dark:from-[#0b0f17] dark:via-[#0b0f17]">
            <form onSubmit={handleFormSubmit} className="mx-auto max-w-3xl">
              <div className="rounded-3xl border border-slate-200/90 bg-slate-50/90 p-2 shadow-sm transition-all focus-within:border-emerald-500/60 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-500/10 dark:border-white/10 dark:bg-white/[0.04] dark:focus-within:bg-[#131822]">
                {attachedFile && (
                  <div className="mx-2 mb-2 flex items-center justify-between rounded-xl border border-emerald-200/70 bg-emerald-50/80 px-3 py-1.5 text-xs dark:border-emerald-900/50 dark:bg-emerald-950/30">
                    <div className="flex min-w-0 items-center gap-2">
                      <Paperclip className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      <span className="truncate font-semibold text-emerald-900 dark:text-emerald-200">
                        {attachedFile.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachedFile(null)}
                      className="rounded-lg p-1 text-emerald-700 hover:bg-emerald-200/50"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                <div className="flex items-end gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPickerOpen(true)}
                    disabled={isProcessing || Boolean(pendingAction)}
                    title="إرفاق ملف"
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-500 transition hover:bg-slate-200/70 hover:text-slate-900 disabled:opacity-40 dark:hover:bg-white/10"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>

                  <textarea
                    ref={textareaRef}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      isProcessing
                        ? "نبراس يفكر الآن..."
                        : "اكتب أمرك هنا... (مثال: أضف منتج جبنة بيضاء بـ 140 جنيه)"
                    }
                    rows={1}
                    disabled={isProcessing || Boolean(pendingAction)}
                    dir="auto"
                    className="max-h-[140px] min-h-[40px] flex-1 resize-none border-0 bg-transparent py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 dark:text-slate-100"
                  />

                  <motion.button
                    type="submit"
                    whileTap={{ scale: 0.92 }}
                    disabled={
                      isProcessing || Boolean(pendingAction) || (!chatInput.trim() && !attachedFile)
                    }
                    aria-label="إرسال"
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-600 text-white shadow-xs transition hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-white/10"
                  >
                    <Send className="h-4 w-4 rtl:-scale-x-100" />
                  </motion.button>
                </div>
              </div>

              <div className="mt-1.5 flex items-center justify-between px-3 text-[10px] sm:text-[11px] text-muted-foreground">
                <span className="truncate">
                  {executionMode === "approval"
                    ? "لن يُنفذ أي تعديل قبل موافقتك"
                    : "وضع الاقتراح فقط"}
                </span>
                <span className="shrink-0 font-mono">{selectedModel}</span>
              </div>
            </form>
          </div>
        </main>

        {/* ─── 4. DESKTOP SIDE WORKSPACE PANE (xl: 1280px+) ─── */}
        <AnimatePresence>
          {isDesktopPanelOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 420, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="hidden xl:flex shrink-0 flex-col overflow-hidden border-s border-slate-200/80 dark:border-white/10"
            >
              {renderWorkspacePanelContent()}
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* ─── 5. MOBILE & TABLET WORKSPACE DRAWER (< 1280px) ─── */}
      <Sheet open={isMobileDrawerOpen} onOpenChange={setIsMobileDrawerOpen}>
        <SheetContent
          side="left"
          className="w-[92vw] sm:w-[440px] max-w-full p-0 border-r border-slate-200 dark:border-white/10 flex flex-col"
          dir="rtl"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>مساحة عمل نبراس</SheetTitle>
          </SheetHeader>
          {renderWorkspacePanelContent()}
        </SheetContent>
      </Sheet>

      {/* ─── MODALS ─── */}
      <GeminiFileAttachmentPicker
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelectFile={(file) => {
          setAttachedFile(file);
          toast.success(`تم إرفاق ملف ${file.name}`);
        }}
        selectedFilePath={attachedFile?.path}
      />
      <SmartProductCopywriterModal
        open={copywriterModalOpen}
        onOpenChange={setCopywriterModalOpen}
        onApplyCopywriting={(result) => {
          toast.success(`تم توليد الوصف الإعلاني للمنتج: ${result.name ?? ""}`);
        }}
      />
    </div>
  );
}
