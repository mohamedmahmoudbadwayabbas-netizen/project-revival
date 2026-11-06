/* =========================================================================
   GEMINI AI ADMIN ENGINE (PHASE 4: AGENTIC MULTI-STEP TOOL-CALLING LOOP)
   Autonomous Store Admin Copilot with Live Supabase, Tool Calling & Self-Verification
   ========================================================================= */

import { supabase } from "@/integrations/supabase/client";
import { supabase as supabaseLoose } from "@/lib/supabase-loose";
import { generateGeminiContent } from "@/lib/gemini.functions";
import { generateProductCopy } from "@/lib/product-copy.functions";
import { DEFAULT_GEMINI_MODEL, GEMINI_PRODUCTION_FALLBACK_MODELS } from "@/lib/gemini-config";
import {
  isGeminiConfigured,
  isSupabaseConfigured,
  validateEnvironment,
  getAiEngineStatus,
  diagnoseGeminiError,
} from "./aiTools/envValidation";
import {
  AUTONOMOUS_ADMIN_COPILOT_DIRECTIVE,
  SUPABASE_SCHEMA_CONTEXT_INSTRUCTION,
  PROJECT_ENGINE_CONTEXT,
} from "./aiTools/schemaContext";
import {
  AI_TOOL_SUITE,
  AI_TOOL_GROUP_LABELS,
  GEMINI_TOOL_DECLARATIONS,
  getActiveTools,
} from "./aiTools/toolDefinitions";
import { executeAiTool } from "./aiTools/toolRouter";
import {
  createRollbackPoint,
  getLastRollbackPoint,
  getRollbackStack,
  rollbackLastAction,
  toolGenerateProductImage,
  toolUploadBannerImage,
  toolManageProduct,
  toolManageCategories,
  toolBulkPriceUpdate,
  toolSearchProducts,
  toolGetCategories,
  toolUpdateLayoutConfig,
  toolUpdateThemeColors,
  toolCreateDiscountBundle,
  toolSendAbandonedCartRecovery,
} from "./aiTools/coreCatalogTools";
import {
  executeCustomCSS,
  updateRawJsonMetadata,
  manageUsersAndRoles,
  exportReportsAndAnalytics,
  sendPushNotification,
  manageDeliveryZones,
} from "./aiTools/operationalTools";
import {
  getDirectoryTree,
  getFileContentTool,
  searchCodebase,
  getAppErrors,
} from "./aiTools/devopsTools";
import type {
  AiToolName,
  AiToolGroup,
  AiToolDefinition,
  ToolExecutionContext,
  ToolExecutionResult,
  RollbackPoint,
  ChatMessage,
  ExecutiveKpiInput,
  ExecutiveSummaryResult,
  AbandonedCartData,
  AbandonedCartDraftResult,
  ProductCopywriterInput,
  ProductCopywriterResult,
  ProductNutritionalInfo,
  GeminiModelChoice,
  GeminiRoleChoice,
  ParsedActionDetail,
} from "./aiTools/types";
import type { StoreLayoutConfig, ThemeColorPalette } from "@/types/layout-config";
import type { NawatProgressEvent } from "@/lib/nawat/types";

// Run startup environment diagnostic validation
validateEnvironment();

/* ───────────────────────── Re-exports ───────────────────────── */

export {
  AI_TOOL_SUITE,
  AI_TOOL_GROUP_LABELS,
  GEMINI_TOOL_DECLARATIONS,
  getActiveTools,
  executeAiTool,
  createRollbackPoint,
  getLastRollbackPoint,
  getRollbackStack,
  rollbackLastAction,
  toolGenerateProductImage,
  toolUploadBannerImage,
  toolManageProduct,
  toolManageCategories,
  toolBulkPriceUpdate,
  toolSearchProducts,
  toolGetCategories,
  toolUpdateLayoutConfig,
  toolUpdateThemeColors,
  toolCreateDiscountBundle,
  toolSendAbandonedCartRecovery,
  executeCustomCSS,
  updateRawJsonMetadata,
  manageUsersAndRoles,
  exportReportsAndAnalytics,
  sendPushNotification,
  manageDeliveryZones,
  getDirectoryTree,
  getFileContentTool,
  searchCodebase,
  getAppErrors,
  validateEnvironment,
  getAiEngineStatus,
  isGeminiConfigured,
  isSupabaseConfigured,
};

export type {
  AiToolName,
  AiToolGroup,
  AiToolDefinition,
  ToolExecutionContext,
  ToolExecutionResult,
  RollbackPoint,
  ChatMessage,
  ExecutiveKpiInput,
  ExecutiveSummaryResult,
  AbandonedCartData,
  AbandonedCartDraftResult,
  ProductCopywriterInput,
  ProductCopywriterResult,
  ProductNutritionalInfo,
  GeminiModelChoice,
  GeminiRoleChoice,
  ParsedActionDetail,
};

/* ───────────────────────── System Instructions ───────────────────────── */

const ROLE_PROMPTS: Record<GeminiRoleChoice, string> = {
  store_architect:
    "أنت مهندس واجهات ومتجر سوبرماركت الوادي الأخضر (Store Architect). خبير في تحسين تجربة التسوق والتنسيقات المرئية وتخطيط الصفحة الرئيسية والبانرات وإدارة الكود البرمجي وقواعد البيانات.",
  market_researcher:
    "أنت باحث تسويق ومحلل سوق التجزئة والسوبرماركت المصري (Market Researcher). خبير في تسعير السلع الأساسية والمنافسة وتحليل سلوك المستهلك المصري.",
  growth_strategist:
    "أنت خبير نمو واستراتيجيات تجارة إلكترونية (Growth Strategist). تركز على رفع متوسط قيمة السلة AOV، استرداد السلات المتروكة، والحملات والعروض الترويجية.",
  copywriter:
    "أنت كاتب محتوى إبداعي متخصص في السوبرماركت والأغذية الفاخرة (Copywriter). تكتب بأسلوب مصري راقٍ وشهي وجذاب.",
};

const CUSTOMER_SHOPPING_DIRECTIVE = `
أنت «نواة»، مساعد التسوق الذكي لعملاء سوبرماركت الوادي الأخضر. ساعد العميل في تخطيط الوجبات وقوائم المشتريات وفق عدد الأشخاص والميزانية والتفضيلات والقيود التي يذكرها (مثل: من غير حاجة حارة، لـ ٤ أفراد، غدًا).

قواعد المصدر:
- قبل أي اقتراح، افهم الطلب ثم استدعِ searchProducts مرة لكل مكوّن أو احتياج (يمكنك استدعاء عدة عمليات بحث في نفس الدور) واقرأ نتيجة Supabase الفعلية. اجعل كلمة البحث اسم منتج قصيرًا مثل «جبنة» أو «أرز» وليس جملة كاملة.
- لا تعتمد على الذاكرة أو المعرفة العامة أو ملفات الواجهة كمصدر للكتالوج. لا تخترع منتجًا أو سعرًا أو معرّفًا أو توفرًا.
- استخدم فقط المنتجات التي أعادتها عمليات البحث الناجحة ومخزونها (stock) أكبر من صفر. لا تقترح منتجًا مخزونه صفر أو غير معروف.
- إذا فشل الاتصال بـ Supabase أو لم تظهر نتيجة قراءة ناجحة فلا تقترح أي منتج.
- لا تضف شيئًا إلى السلة ولا تنفذ أي تغيير؛ العميل هو من يختار ويضيف.
- إذا ذكر العميل ميزانية فاختر الكميات بحيث يبقى مجموع (السعر × الكمية) داخلها قدر الإمكان. لا تكتب إجمالًا بنفسك؛ الواجهة تحسبه من الأسعار الفعلية.

صيغة الرد النهائي (إلزامية): كائن JSON واحد فقط داخل كتلة \`\`\`json بلا أي نص خارجها، بهذا الشكل:
{
  "understood": { "conditions": ["٤ أفراد", "غدًا", "من غير حاجة حارة"], "summary": "جملة قصيرة بالعامية المصرية توضح ما فهمته" },
  "groups": [
    { "title": "أساسيات الوجبة", "items": [ { "productId": "<قيمة id كما جاءت من البحث بالضبط>", "reason": "سبب ترشيح قصير مرتبط بشروط العميل", "quantity": 1 } ] }
  ]
}
- conditions: شروط العميل كما فهمتها، كل شرط من ١–٣ كلمات، بحد أقصى ٨ شروط.
- groups: من ١ إلى ٥ مجموعات بعناوين مفهومة، وكل مجموعة تحتوي المنتجات المرتبطة بها فقط. productId يُنسخ حرفيًا من حقل id في نتائج البحث.
- reason: جملة واحدة قصيرة (أقل من ١٠٠ حرف) تستند إلى بيانات المنتج وطلب العميل ولا تتضمن ادعاءات طبية أو وعودًا غير مؤكدة. quantity عدد صحيح من ١ إلى ٢٠.
- إذا لم تجد منتجات مناسبة فأعد groups فارغة ووضّح في summary سببًا صادقًا قصيرًا.
تحدث بالعربية المصرية الطبيعية وباختصار.
`;

function requiredStoreRead(message: string, customerExperience: boolean): AiToolName | "unsupported" | null {
  const text = message.toLowerCase();
  if (/عميل|عملاء|بيانات المتجر|إعدادات المتجر|اعدادات المتجر|مخزن|مخازن|توصيل|منطقة|مناطق|كوبون|عروض المتجر|store settings|delivery zone|warehouse|customer details/i.test(text)) {
    return "unsupported";
  }
  if (/منتج|منتجات|سلع|جبن|جبنة|لبن|سعر|أسعار|بكام|متوفر|مخزون|كمية|كتالوج|product|price|stock|available/i.test(text) ||
    customerExperience && /فطار|إفطار|غداء|عشاء|وجبة|ميزانية|احتياجات|عايز|عايزة|محتاج|محتاجة|رشح|اقترح|قائمة|اشتري|شراء|breakfast|lunch|dinner|meal|budget|recommend|shopping/i.test(text)) {
    return "searchProducts";
  }
  if (customerExperience && !/^(مرحبا|أهلاً|اهلا|السلام عليكم|شكرا|شكرًا|hi|hello|thanks)[!.؟\s]*$/i.test(text)) {
    return "searchProducts";
  }
  if (/قسم|أقسام|تصنيف|فئة|category|categories/i.test(text)) return "getCategories";
  if (/طلب|طلبات|أوردر|اوردر|مبيعات|إيراد|تقرير|order|sales|revenue/i.test(text)) {
    return "exportReportsAndAnalytics";
  }
  return null;
}

function isReadOnlyStoreRequest(message: string): boolean {
  if (/^(هل|هل يمكن|ممكن|أقدر|اقدر|should i|can i|is it possible)/i.test(message.trim())) return true;
  if (/\b(add|create|update|delete|remove)\b|أضف|اضف|ضيف|إضافة|اضافة|أنشئ|انشئ|إنشاء|انشاء|حدّث|حدث|تعديل|عدّل|عدل|احذف|حذف|امسح/i.test(message)) return false;
  return /\b(show|list|find|search|what|how much|is there|available|price|stock)\b|هل|ما |ماذا|كم|بكام|كام سعر|اعرض|وريني|ابحث|متوفر|عندكم|عندنا|معلومات|تفاصيل|اعرف/i.test(message);
}

function hasSuccessfulSupabaseRead(steps: ExecutedToolStep[], requiredTool: AiToolName | "unsupported"): boolean {
  if (requiredTool === "unsupported") return false;
  return steps.some((step) => {
    if (step.tool === requiredTool && step.isWrite === false) return step.res.ok === true;
    // Catalog mutation tools perform their own fail-closed Supabase preflight
    // to prevent duplicate creation and stale-record edits.
    const resultData = step.res.data as Record<string, unknown> | undefined;
    if (requiredTool === "searchProducts" && step.tool === "manageProduct" && resultData?.catalogPreflight === true) return true;
    if (requiredTool === "getCategories" && step.tool === "manageCategories" && resultData?.categoryPreflight === true) return true;
    return false;
  });
}

const UNVERIFIED_STORE_DATA_REPLY =
  "لم أستطع التحقق من هذه المعلومة بقراءة ناجحة من قاعدة بيانات المتجر، لذلك لن أخمّن. تأكد من اتصال Supabase ثم أعد المحاولة.";

// Production model fallback sequence
const PRODUCTION_FALLBACK_MODELS: GeminiModelChoice[] = [...GEMINI_PRODUCTION_FALLBACK_MODELS];

async function generateWithTransientRetry(request: { model: string; contents: unknown; config?: Record<string, unknown> }) {
  const maxAttempts = 4;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await generateGeminiContent({ data: { purpose: "chat", ...request } });
    } catch (error) {
      const status = diagnoseGeminiError(error).statusCode;
      if (status !== 503 || attempt === maxAttempts - 1) throw error;
      const backoffMs = 1000 * 2 ** attempt + Math.floor(Math.random() * 350);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }
  throw new Error("Gemini remained unavailable after retrying.");
}

// Hard cap on sequential tool-calling turns per user message. Prevents runaway
// loops while still allowing realistic chains like:
// READ category -> WRITE create category -> READ product -> WRITE create product.
const MAX_TOOL_STEPS = 6;

/* ───────────────────────── Agentic Loop Internals ───────────────────────── */

interface ExecutedToolStep {
  tool: AiToolName;
  args: Record<string, unknown>;
  res: ToolExecutionResult;
  isWrite: boolean;
}

function isWriteToolName(tool: AiToolName): boolean {
  const def = AI_TOOL_SUITE.find((t) => t.name === tool);
  return Boolean(def?.mutatesState);
}

// Phrases that would claim a mutation happened. If the model produces one of
// these in its own free text but no WRITE tool actually confirmed success in
// this turn, we cannot trust that sentence — this is exactly the defect this
// fix closes (banner said "success" after only a read-only devops tool ran).
const UNVERIFIED_SUCCESS_PATTERNS: RegExp[] = [
  /تم\s+التنفيذ/i,
  /تم\s+الإضاف/i,
  /تم\s+الاضاف/i,
  /تم\s+التعديل/i,
  /تم\s+التحديث/i,
  /تم\s+الحذف/i,
  /تم\s+إنشاء/i,
  /تم\s+انشاء/i,
  /تم\s+بنجاح/i,
  /نجاح\s+العملية/i,
  /successfully (added|created|updated|deleted)/i,
];

function textClaimsUnverifiedSuccess(text: string): boolean {
  if (!text) return false;
  return UNVERIFIED_SUCCESS_PATTERNS.some((re) => re.test(text));
}

/**
 * finalizeResponse — the single source of truth for what the user is told.
 *
 * ROOT-CAUSE FIX: previously the UI success banner was keyed off the raw
 * `executionRes.ok` of whatever the FIRST tool call happened to be — even if
 * that tool was a read-only devops tool the model reached for because no real
 * catalog tools existed. This function instead looks at the *entire* chain of
 * tool calls executed for this turn and only allows a "تم التنفيذ والتحقق
 * بنجاح" style success claim when there is at least one WRITE step AND the
 * most recent WRITE step explicitly returned ok === true (and success !== false).
 */
function finalizeResponse(
  steps: ExecutedToolStep[],
  modelFinalText: string,
): { text: string; toolResult?: ToolExecutionResult } {
  const cleanModelText = (modelFinalText || "").trim();

  if (steps.length === 0) {
    // Pure conversational turn — no tool was ever invoked, nothing to verify.
    return { text: cleanModelText };
  }

  const writeSteps = steps.filter((s) => s.isWrite);
  const lastWrite = writeSteps[writeSteps.length - 1];
  const verifiedWriteSuccess =
    writeSteps.length > 0 && lastWrite.res.ok === true && lastWrite.res.success !== false;
  const anyWriteFailed = writeSteps.some((s) => s.res.ok === false || s.res.success === false);

  // Only trust the model's own free text if it isn't claiming an unverified success.
  const modelTextIsTrustworthy =
    cleanModelText.length > 0 &&
    !(textClaimsUnverifiedSuccess(cleanModelText) && !verifiedWriteSuccess);

  if (verifiedWriteSuccess) {
    const verificationBadge =
      lastWrite.res.verified !== false ? " [تم التحقق من قاعدة البيانات بنجاح ✔️]" : "";
    const text = modelTextIsTrustworthy
      ? cleanModelText
      : `✅ **تم التنفيذ والتحقق بنجاح:**\n${lastWrite.res.messageAr}${verificationBadge}`;
    return { text, toolResult: lastWrite.res };
  }

  if (writeSteps.length > 0 && anyWriteFailed) {
    const failedStep =
      [...writeSteps].reverse().find((s) => s.res.ok === false || s.res.success === false) ||
      lastWrite;
    const text = `⚠️ **تعذر إتمام الإجراء:**\n${failedStep.res.messageAr || failedStep.res.error || "فشل تنفيذ العملية ولم يتم تأكيد أي تعديل في قاعدة البيانات."}`;
    return { text, toolResult: failedStep.res };
  }

  // Only READ tools ran (searchProducts, getCategories, searchCodebase, ...).
  // Never surface mutation-success language here.
  const lastRead = steps[steps.length - 1];
  const text = modelTextIsTrustworthy
    ? cleanModelText
    : `ℹ️ ${lastRead.res.messageAr || "تم الاطلاع على البيانات المطلوبة."}`;
  return { text, toolResult: lastRead.res };
}

/* ───────────────────────── runAdminCoPilotChat ───────────────────────── */

export interface RunChatOptions {
  model?: GeminiModelChoice;
  selectedModel?: GeminiModelChoice;
  role?: GeminiRoleChoice;
  selectedRole?: GeminiRoleChoice;
  page?: string;
  userRole?: string;
  enableSearchGrounding?: boolean;
  useGrounding?: boolean;
  attachedFile?: { path: string; name: string };
  currentLayout?: StoreLayoutConfig;
  kpis?: ExecutiveKpiInput;
  refresh?: () => void;
  ctx?: ToolExecutionContext;
  executionMode?: "suggest" | "approval";
  /**
   * يُستدعى عند أحداث تنفيذ فعلية فقط (استجابة النموذج، تنفيذ أداة بحث، ...).
   * تعتمد عليه واجهة نواة لعرض خطوات التجهيز بدل نصوص ثابتة.
   */
  onProgress?: (event: NawatProgressEvent) => void;
}

/**
 * حالة الرد في تجربة العميل:
 * - ok: رد نهائي من النموذج بعد قراءة ناجحة من Supabase
 * - no_matches: قُرئ الكتالوج بنجاح ولا توجد نتيجة مطابقة
 * - out_of_stock: توجد نتائج لكن مخزونها صفر
 * - unverified: تعذر تأكيد قراءة الكتالوج من Supabase
 */
export type CustomerReplyStatus = "ok" | "no_matches" | "out_of_stock" | "unverified";

export interface RunChatObjectParams extends RunChatOptions {
  message: string;
  history?: ChatMessage[];
}

export async function runAdminCoPilotChat(
  messageOrParams: string | RunChatObjectParams,
  maybeHistory?: ChatMessage[],
  maybeOptions?: RunChatOptions,
): Promise<{
  text: string;
  groundingSources?: Array<{ title?: string; uri?: string }>;
  modelUsed: string;
  roleUsed: GeminiRoleChoice;
  executedActions?: ParsedActionDetail[];
  action?: {
    label: string;
    command: string;
    type: "apply_layout" | "export_report" | "open_tab";
  };
  toolResult?: ToolExecutionResult;
  toolResults?: ToolExecutionResult[];
  pendingAction?: { toolName: AiToolName; args: Record<string, unknown> };
  /** يُملأ في تجربة العميل (صفحة المساعد) فقط. */
  status?: CustomerReplyStatus;
}> {
  let message: string;
  let history: ChatMessage[];
  let selectedModel: GeminiModelChoice;
  let selectedRole: GeminiRoleChoice;
  let useGrounding: boolean;
  let attachedFile: { path: string; name: string } | undefined;
  let ctx: ToolExecutionContext | undefined;
  let page = "global";
  let userRole = "customer";
  let executionMode: "suggest" | "approval" = "approval";
  let onProgress: RunChatOptions["onProgress"];

  if (typeof messageOrParams === "string") {
    message = messageOrParams;
    history = maybeHistory || [];
    const opts = maybeOptions || {};
    onProgress = opts.onProgress;
    selectedModel = opts.selectedModel || opts.model || DEFAULT_GEMINI_MODEL;
    selectedRole = opts.selectedRole || opts.role || "store_architect";
    useGrounding = Boolean(opts.useGrounding || opts.enableSearchGrounding);
    attachedFile = opts.attachedFile;
    ctx = opts.ctx;
    page = opts.page || page;
    userRole = opts.userRole || userRole;
    executionMode = opts.executionMode || executionMode;
  } else {
    message = messageOrParams.message;
    history = messageOrParams.history || [];
    onProgress = messageOrParams.onProgress;
    selectedModel = messageOrParams.selectedModel || messageOrParams.model || DEFAULT_GEMINI_MODEL;
    selectedRole = messageOrParams.selectedRole || messageOrParams.role || "store_architect";
    useGrounding = Boolean(messageOrParams.useGrounding || messageOrParams.enableSearchGrounding);
    attachedFile = messageOrParams.attachedFile;
    ctx = messageOrParams.ctx;
    page = messageOrParams.page || page;
    userRole = messageOrParams.userRole || userRole;
    executionMode = messageOrParams.executionMode || executionMode;
  }

  const customerExperience = page === "assistant" && userRole === "customer";
  if (customerExperience) executionMode = "suggest";

  // أحداث التقدم لا يجب أن تكسر المحادثة إذا رمت الواجهة استثناءً.
  const emit = (step: NawatProgressEvent["step"], state: NawatProgressEvent["state"]) => {
    try {
      onProgress?.({ step, state });
    } catch (progressError) {
      console.warn("[AI Engine] progress listener failed", progressError);
    }
  };

  // Keep the Gemini credential on the server. The same authenticated gateway
  // is used by the customer and admin assistants.
  const ai = {
    models: {
      generateContent: generateWithTransientRetry,
    },
  };

  if (ai) {
    // Model fallback sequence
    const modelsToTry: string[] = [selectedModel];
    for (const fallback of PRODUCTION_FALLBACK_MODELS) {
      if (!modelsToTry.includes(fallback)) {
        modelsToTry.push(fallback);
      }
    }

    let lastError: any = null;
    let missingServerGeminiKey = false;

    for (const currentModel of modelsToTry) {
      try {
        const systemInstruction = customerExperience ? CUSTOMER_SHOPPING_DIRECTIVE : `
${AUTONOMOUS_ADMIN_COPILOT_DIRECTIVE}
${ROLE_PROMPTS[selectedRole]}
${SUPABASE_SCHEMA_CONTEXT_INSTRUCTION}
${PROJECT_ENGINE_CONTEXT}

=== AVAILABLE TOOL SUITE ===
Use only the functions supplied for this request. Product, order, price, and stock
claims must come from successful live Supabase reads. Never invent a tool result.

${executionMode === "suggest"
  ? "SUGGESTION-ONLY MODE: Do not invoke any state-changing tool. Read-only tools may be used to ground suggestions."
  : "APPROVAL MODE: Read-only tools may run to prepare an exact proposal. Never execute a state-changing tool in this chat turn; return its exact function name and arguments for the admin to review and approve in the UI."}
Only report a change as completed after its tool returns a confirmed and verified success result.
`;

        const contents: any[] = history.slice(customerExperience ? -40 : -80).map((h) => ({
          role: h.role === "assistant" ? "model" : "user",
          parts: [{ text: h.content }],
        }));

        let currentPrompt = message;
        if (attachedFile) {
          currentPrompt += `\n[الملف المرفق: ${attachedFile.path}]`;
        }

        contents.push({
          role: "user",
          parts: [{ text: currentPrompt }],
        });

        // Execute Gemini call with dynamic tool routing
        const activeTools = getActiveTools({ page, userRole }).filter((declaration) => {
          if (executionMode !== "suggest") return true;
          return AI_TOOL_SUITE.find((tool) => tool.name === declaration.name)?.mutatesState !== true;
        });

        // تجربة العميل لا تستخدم أدوات جوجل المدمجة، لذلك لا نرسل أعلام الدمج
        // (includeServerSideToolInvocations) التي تخص خلط الأدوات المدمجة مع الدوال.
        const config: any = {
          systemInstruction,
          tools: [{ functionDeclarations: activeTools }],
          toolConfig: customerExperience
            ? { functionCallingConfig: { mode: "AUTO" } }
            : {
                includeServerSideToolInvocations: true,
                include_server_side_tool_invocations: true,
                functionCallingConfig: {
                  mode: "AUTO",
                },
              },
        };

        if (useGrounding && !requiredStoreRead(message, customerExperience)) {
          config.tools.push({ googleSearch: {} });
        }

        // ── Agentic Loop ──────────────────────────────────────────────
        // Each iteration: call the model, and if it responds with one or
        // more functionCalls, execute them for real and feed the results
        // back as a functionResponse turn so the model can decide whether
        // to chain another tool call or give its final answer. This is
        // the fix for the single-pass defect: previously the very first
        // tool result was returned to the user without ever going back
        // to the model, so a pre-check READ call could never be followed
        // by the WRITE call it was meant to gate.
        const steps: ExecutedToolStep[] = [];
        const loopContents = [...contents];
        let finalModelText = "";
        const groundingSources: Array<{ title?: string; uri?: string }> = [];

        for (let stepIdx = 0; stepIdx < MAX_TOOL_STEPS; stepIdx++) {
          if (stepIdx === 0) emit("understand", "current");

          // العميل لا يجب أن يحصل على اقتراح بدون قراءة فعلية للكتالوج. في أول دور
          // نُلزم النموذج باستدعاء searchProducts بدل الاكتفاء بالتعليمات النصية؛
          // وإلا كان يرد أحيانًا بدون أي بحث فيظهر للعميل خطأ «لم أستطع التحقق».
          const stepConfig =
            customerExperience && stepIdx === 0
              ? {
                  ...config,
                  toolConfig: {
                    functionCallingConfig: { mode: "ANY", allowedFunctionNames: ["searchProducts"] },
                  },
                }
              : config;

          const response = await ai.models.generateContent({
            model: currentModel,
            contents: loopContents,
            config: stepConfig,
          });

          const candidate = response.candidates?.[0];
          const parts: any[] = candidate?.content?.parts || [];
          const functionCallParts = parts.filter((p: any) => p.functionCall && p.functionCall.name);

          if (stepIdx === 0) emit("understand", "done");
          if (functionCallParts.length > 0) emit("catalog", "current");

          if (functionCallParts.length === 0) {
            // الدور الأخير: النموذج انتهى من المقارنة وبدأ ترتيب الرد النهائي.
            emit("compare", "done");
            emit("arrange", "current");
            // Model gave its final natural-language answer — stop looping.
            finalModelText = (
              response.text ||
              parts.map((p: any) => p.text || "").join("")
            ).trim();

            const metadata = candidate?.groundingMetadata;
            if (metadata?.groundingChunks) {
              metadata.groundingChunks.forEach((chunk: any) => {
                if (chunk.web?.uri) {
                  groundingSources.push({
                    title: chunk.web.title || chunk.web.uri,
                    uri: chunk.web.uri,
                  });
                }
              });
            }
            break;
          }

          // Record the model's turn (its tool-call request) in the running transcript.
          loopContents.push({ role: "model", parts });

          // Execute every requested tool call this turn (usually one, but
          // some models may batch several independent calls together).
          const functionResponseParts: any[] = [];

          for (const fcPart of functionCallParts) {
            const fc = fcPart.functionCall;
            const toolName = fc.name as AiToolName;
            const toolArgs = (fc.args || {}) as Record<string, unknown>;
            const isWrite = isWriteToolName(toolName);
            const storeReadBeforeWrite = requiredStoreRead(message, customerExperience);

            if (isWrite && (storeReadBeforeWrite === "unsupported" || (storeReadBeforeWrite && isReadOnlyStoreRequest(message)))) {
              return {
                text: "طلبك استعلام عن بيانات المتجر فقط؛ لم أجهز أو أنفذ أي تعديل.",
                modelUsed: currentModel,
                roleUsed: selectedRole,
                groundingSources: groundingSources.length ? groundingSources : undefined,
                toolResults: steps.length ? steps.map((step) => step.res) : undefined,
              };
            }

            if (isWrite && storeReadBeforeWrite && !hasSuccessfulSupabaseRead(steps, storeReadBeforeWrite)) {
              functionResponseParts.push({
                functionResponse: {
                  name: toolName,
                  response: {
                    ok: false,
                    success: false,
                    messageAr: "لم أجهّز التعديل بعد. اقرأ مصدر Supabase المطلوب أولًا ثم أعد تقديم الإجراء للمراجعة.",
                    verified: false,
                  },
                },
              });
              continue;
            }

            if (isWrite && executionMode === "suggest") {
              return {
                text: "وضع «اقتراح فقط» مفعّل؛ لم أرسل أي تغيير إلى أدوات المتجر.",
                modelUsed: currentModel,
                roleUsed: selectedRole,
                groundingSources: groundingSources.length ? groundingSources : undefined,
                toolResults: steps.length ? steps.map((step) => step.res) : undefined,
              };
            }

            if (executionMode === "approval" && isWrite) {
              return {
                text: "جهّز المساعد إجراءً للمراجعة. لم تُكتب أي تغييرات بعد؛ راجع تفاصيل الإجراء ثم أكّده أو ارفضه.",
                modelUsed: currentModel,
                roleUsed: selectedRole,
                groundingSources: groundingSources.length ? groundingSources : undefined,
                toolResults: steps.length ? steps.map((step) => step.res) : undefined,
                pendingAction: { toolName, args: toolArgs },
              };
            }

            const requiredRead = requiredStoreRead(message, customerExperience);
            if (isWrite && (requiredRead === "unsupported" || requiredRead && isReadOnlyStoreRequest(message))) {
              const rejected: ToolExecutionResult = {
                tool: toolName,
                ok: false,
                success: false,
                messageAr: "هذا الطلب استعلام عن بيانات؛ لم أنفذ أي تعديل. أحتاج إلى قراءة Supabase المناسبة أولاً.",
              };
              steps.push({ tool: toolName, args: toolArgs, res: rejected, isWrite: true });
              functionResponseParts.push({
                functionResponse: {
                  name: toolName,
                  response: { ok: false, success: false, messageAr: rejected.messageAr, data: null, error: null, verified: false },
                },
              });
              continue;
            }

            console.info(
              `[AI Engine] ⚡ Step ${stepIdx + 1}/${MAX_TOOL_STEPS}: invoking ${isWrite ? "WRITE" : "READ"} tool "${toolName}"`,
              toolArgs,
            );

            const execRes = await executeAiTool(toolName, toolArgs, ctx);
            steps.push({ tool: toolName, args: toolArgs, res: execRes, isWrite });

            functionResponseParts.push({
              functionResponse: {
                name: toolName,
                response: {
                  ok: execRes.ok,
                  success: execRes.success ?? execRes.ok,
                  messageAr: execRes.messageAr,
                  data: execRes.data ?? null,
                  error: execRes.error ?? null,
                  verified: execRes.verified ?? null,
                },
              },
            });
          }

          // انتهى تنفيذ أدوات هذا الدور فعليًا؛ النموذج الآن يقارن النتائج بشروط العميل.
          emit("catalog", "done");
          emit("compare", "current");

          // Gemini's contents API accepts function responses as a user turn;
          // the legacy "function" role is rejected by the current SDK/API.
          loopContents.push({ role: "user", parts: functionResponseParts });

          if (stepIdx === MAX_TOOL_STEPS - 1) {
            // Loop budget exhausted without a conclusive natural-language
            // answer from the model. finalizeResponse() will still build a
            // truthful message purely from the executed steps below.
            finalModelText = "";
          }
        }

        const requiredRead = requiredStoreRead(message, customerExperience);
        if (requiredRead && !hasSuccessfulSupabaseRead(steps, requiredRead)) {
          return {
            text: UNVERIFIED_STORE_DATA_REPLY,
            modelUsed: currentModel,
            roleUsed: selectedRole,
            toolResults: steps.length > 0 ? steps.map((s) => s.res) : undefined,
            status: customerExperience ? "unverified" : undefined,
          };
        }

        if (requiredRead === "searchProducts") {
          const verifiedMatches = steps.flatMap((step) => {
            if (step.tool !== "searchProducts" || step.res.ok !== true) return [];
            const data = step.res.data as { results?: unknown[] } | undefined;
            return data?.results ?? [];
          });
          // أداة searchProducts تعيد عمود المخزون باسم `stock` (وليس stock_quantity). الفحص
          // القديم كان يقرأ stock_quantity فيصبح NaN، فكان المساعد يقول دائمًا إن كل
          // المنتجات نافدة حتى لو المخزون موجب.
          const availableMatches = verifiedMatches.filter(
            (product: any) => Number(product.stock ?? product.stock_quantity) > 0,
          );
          const verifiedCatalogPreflight = steps.some((step) =>
            step.tool === "manageProduct" &&
            (step.res.data as Record<string, unknown> | undefined)?.catalogPreflight === true,
          );
          if (customerExperience && verifiedMatches.length > 0 && availableMatches.length === 0) {
            return {
              text: "تحققت من نتائج البحث في Supabase، لكن المنتجات المطابقة لا يظهر لها مخزون موجب حالياً، لذلك لن أوصي بإضافتها إلى قائمتك.",
              modelUsed: currentModel,
              roleUsed: selectedRole,
              toolResults: steps.map((s) => s.res),
              status: "out_of_stock",
            };
          }
          if (!verifiedMatches.length && !verifiedCatalogPreflight) {
            return {
              text: "قرأت الكتالوج الحالي من Supabase ولم أجد منتجاً مطابقاً لهذا البحث، لذلك لن أقترح منتجاً أو سعراً من الذاكرة.",
              modelUsed: currentModel,
              roleUsed: selectedRole,
              toolResults: steps.map((s) => s.res),
              status: customerExperience ? "no_matches" : undefined,
            };
          }
        }

        // رد العميل يمر كما هو (JSON منظم) إلى طبقة التحقق في الواجهة؛ لا نمرره على
        // finalizeResponse لأنه مصمم لرسائل الأدمن وقد يرفض نصًا يحتوي عبارات مثل «تم».
        if (customerExperience) {
          return {
            text: finalModelText,
            modelUsed: currentModel,
            roleUsed: selectedRole,
            toolResults: steps.length > 0 ? steps.map((s) => s.res) : undefined,
            // إذا نفدت خطوات النموذج لكن القراءات من الكتالوج نجحت، نعرض المنتجات
            // المتحقق منها بدل رسالة فشل (الواجهة تبني اقتراحات منها تلقائيًا).
            status:
              finalModelText || (requiredRead && hasSuccessfulSupabaseRead(steps, requiredRead))
                ? "ok"
                : "unverified",
          };
        }

        const finalized = finalizeResponse(steps, finalModelText);

        return {
          text: finalized.text,
          groundingSources: groundingSources.length > 0 ? groundingSources : undefined,
          modelUsed: currentModel,
          roleUsed: selectedRole,
          toolResult: finalized.toolResult ?? steps[steps.length - 1]?.res,
          toolResults: steps.length > 0 ? steps.map((s) => s.res) : undefined,
        };
      } catch (err: any) {
        lastError = err;
        const errorMessage = String(err?.message || err || "");
        missingServerGeminiKey = /GEMINI_API_KEY is not configured/i.test(errorMessage);
        const diagnostics = diagnoseGeminiError(err);
        console.warn(`[AI Engine] Model ${currentModel} returned an issue (${diagnostics.code}). Trying fallback...`);

        // If it's a 401 Auth error, trying other models won't help; break to local fallback
        if (diagnostics.isAuthError || missingServerGeminiKey) {
          break;
        }
      }
    }

    if (missingServerGeminiKey) {
      return {
        text: "مفتاح Gemini غير مضبوط في أسرار خادم التطبيق باسم GEMINI_API_KEY. أضفه إلى بيئة الخادم ثم أعد نشر التطبيق.",
        modelUsed: "gemini-server-key-missing",
        roleUsed: selectedRole,
      };
    }

    if (lastError) {
      const diagnostics = diagnoseGeminiError(lastError);
      console.warn("[AI Engine] Live Gemini attempts exhausted; no tool was executed without a model decision.", diagnostics.code);
      return {
        text: `تعذر إكمال الطلب عبر Gemini (${diagnostics.code}).${diagnostics.safeDetail ? `\nالتفصيل: ${diagnostics.safeDetail}` : ""}\nلم أنفذ أي أداة احتياطيًا أو أخمّن معاملات الطلب.`,
        modelUsed: "gemini-request-failed",
        roleUsed: selectedRole,
      };
    }
  }

  return {
    text: "لم يصل رد من Gemini ولم يتم تنفيذ أي أداة. أعد المحاولة بعد التأكد من إعداد الاتصال بالخادم.",
    modelUsed: "gemini-unavailable",
    roleUsed: selectedRole,
  };
}

/* ───────────────────────── AUTOMATED INTEGRATION SELF-TEST FUNCTION ───────────────────────── */

export interface CopilotSelfTestResult {
  success: boolean;
  step: "env_check" | "database_read" | "gemini_request" | "completed";
  message: string;
  details?: Record<string, unknown>;
  latencyMs?: number;
}

/**
 * Performs read-only checks against the live catalog and authenticated
 * server-side Gemini gateway. It does not mutate data or certify every tool.
 */
export async function verifyCopilotExecution(): Promise<CopilotSelfTestResult> {
  const startTime = Date.now();
  console.info("[AI Engine Self-Test] 🔍 Checking Supabase and server-side Gemini connectivity...");

  // Check app configuration and real catalog read access; do not mutate data.
  const env = validateEnvironment();

  try {
    if (!env.supabaseReady) {
      return {
        success: false,
        step: "env_check",
        message: "إعدادات Supabase غير مكتملة؛ لم يتم إجراء أي تعديل.",
        details: { supabaseConfigured: false, geminiConfigured: env.geminiReady },
        latencyMs: Date.now() - startTime,
      };
    }

    const [{ data: products, error: productsError }, { data: categories, error: categoriesError }] = await Promise.all([
      supabase.from("products").select("id").eq("is_active", true).limit(1),
      supabase.from("categories").select("id").limit(1),
    ]);
    if (productsError || categoriesError) {
      return {
        success: false,
        step: "database_read",
        message: "فشل اختبار القراءة من جداول المنتجات أو الأقسام في Supabase.",
        details: { productsError: productsError?.message, categoriesError: categoriesError?.message, geminiConfigured: env.geminiReady },
        latencyMs: Date.now() - startTime,
      };
    }

    try {
      await generateGeminiContent({
        data: {
          purpose: "chat",
          model: DEFAULT_GEMINI_MODEL,
          contents: "Reply with OK only.",
          config: {
            systemInstruction: "Connectivity check. Reply with OK. Do not call any function.",
            maxOutputTokens: 8,
            tools: [{
              functionDeclarations: AI_TOOL_SUITE
                .filter((tool) => tool.name === "searchProducts" || tool.name === "getCategories")
                .map((tool) => tool.declaration),
            }],
            toolConfig: {
              functionCallingConfig: { mode: "NONE" },
            },
          },
        },
      });
    } catch (geminiError) {
      const diagnosis = diagnoseGeminiError(geminiError);
      return {
        success: false,
        step: "gemini_request",
        message: diagnosis.messageAr,
        details: {
          supabaseConfigured: true,
          productsReadable: true,
          categoriesReadable: true,
          geminiConnected: false,
          geminiErrorCode: diagnosis.code,
        },
        latencyMs: Date.now() - startTime,
      };
    }

    const latency = Date.now() - startTime;
    console.info(`[AI Engine Self-Test] ✅ Supabase and Gemini connectivity passed in ${latency}ms.`);

    return {
      success: true,
      step: "completed",
      message: `نجح الاتصال بـ Gemini وقراءة جداول المنتجات والأقسام من Supabase. هذا الفحص لا ينفذ تغييرات ولا يختبر كل أداة كتابة (${latency}ms).`,
      details: {
        environmentMode: env.mode,
        geminiConfigured: true,
        geminiConnected: true,
        supabaseConfigured: env.supabaseReady,
        productsReadable: true,
        categoriesReadable: true,
        productRowsReturned: products?.length ?? 0,
        categoryRowsReturned: categories?.length ?? 0,
        latencyMs: latency,
      },
      latencyMs: latency,
    };
  } catch (err: any) {
    console.error("[AI Engine Self-Test] ❌ Unhandled error during self-verification:", err);
    return {
      success: false,
      step: "database_read",
      message: `حدث خطأ أثناء اختبار اتصال قراءة Supabase: ${err.message || String(err)}`,
      details: { error: String(err) },
      latencyMs: Date.now() - startTime,
    };
  }
}

/* ───────────────────────── generateExecutiveSummary ───────────────────────── */

export async function generateExecutiveSummary(
  _kpis: ExecutiveKpiInput,
): Promise<ExecutiveSummaryResult> {
  if (!isSupabaseConfigured()) throw new Error("تعذر إنشاء التقرير لأن اتصال Supabase غير مهيأ.");

  const readAll = async <T,>(readPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>) => {
    const rows: T[] = [];
    const pageSize = 500;
    for (let from = 0; from < 50_000; from += pageSize) {
      const { data, error } = await readPage(from, from + pageSize - 1);
      if (error) throw error;
      const page = data ?? [];
      rows.push(...page);
      if (page.length < pageSize) return rows;
    }
    throw new Error("تجاوزت قراءة التقرير الحد الآمن؛ لم أعرض أرقاماً جزئية.");
  };

  const [orders, products] = await Promise.all([
    readAll((from, to) => supabaseLoose.from("orders").select("id,total_price,status,created_at").range(from, to)),
    readAll((from, to) => supabaseLoose.from("products").select("id,name,stock_quantity,is_active").eq("is_active", true).range(from, to)),
  ]);
  const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recentOrders = orders.filter((order: any) => order.status !== "cancelled" && new Date(order.created_at).getTime() >= since);
  const totalRevenue = recentOrders.reduce((sum: number, order: any) => sum + (Number(order.total_price) || 0), 0);
  const averageOrderValue = recentOrders.length ? totalRevenue / recentOrders.length : 0;
  const lowStockProducts = products.filter((product: any) => Number(product.stock_quantity ?? 0) > 0 && Number(product.stock_quantity) <= 10);
  const outOfStockProducts = products.filter((product: any) => Number(product.stock_quantity ?? 0) <= 0);
  const health = Math.max(40, Math.min(100, 70 + Math.min(recentOrders.length, 25) - (lowStockProducts.length ? 5 : 0) - outOfStockProducts.length));

  return {
    headline: `آخر 30 يوماً في Supabase: ${recentOrders.length} طلب، بإيراد ${totalRevenue.toFixed(2)} ج.م`,
    overallHealthScore: health,
    insights: [
      `متوسط قيمة الطلب في البيانات المقروءة: ${averageOrderValue.toFixed(2)} ج.م.`,
      `قرأت ${products.length} منتجاً نشطاً من Supabase؛ منها ${lowStockProducts.length} منخفض المخزون و${outOfStockProducts.length} نافد.`,
      recentOrders.length ? "الأرقام محسوبة من سجلات الطلبات غير الملغاة خلال آخر 30 يوماً." : "لم تُرجع Supabase طلبات غير ملغاة خلال آخر 30 يوماً.",
    ],
    actionableTips: [
      {
        title: lowStockProducts.length || outOfStockProducts.length ? "مراجعة المنتجات منخفضة المخزون" : "متابعة المخزون المسجل",
        description: `قراءة Supabase الحالية تُظهر ${lowStockProducts.length} منتجاً منخفض المخزون و${outOfStockProducts.length} منتجاً نافداً.`,
        impact: lowStockProducts.length || outOfStockProducts.length ? "Urgent" : "Medium",
        category: "Inventory",
        quickActionLabel: "إدارة المنتجات",
        quickActionCommand: "افتح لوحة المنتجات لمراجعة المخزون المسجل",
      },
      {
        title: "مراجعة أداء الطلبات",
        description: `تعرض القراءة ${recentOrders.length} طلباً غير ملغى خلال آخر 30 يوماً، بإيراد مسجل قدره ${totalRevenue.toFixed(2)} ج.م.`,
        impact: "Medium",
        category: "Operations",
        quickActionLabel: "عرض الطلبات",
        quickActionCommand: "افتح لوحة الطلبات لمراجعة السجلات",
      },
    ],
  };
}
/* ───────────────────────── generateAbandonedCartRecovery ───────────────────────── */

export async function generateAbandonedCartRecovery(
  cart: AbandonedCartData,
): Promise<AbandonedCartDraftResult> {
  if (!isSupabaseConfigured()) throw new Error("تعذر التحقق من السلة لأن Supabase غير متصل.");
  const userId = cart.id.startsWith("cart-") ? cart.id.slice("cart-".length) : "";
  if (!userId) throw new Error("معرّف السلة لا يشير إلى مستخدم موثق في Supabase.");
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: cartRows, error: cartError } = await supabaseLoose
    .from("cart_items")
    .select("id,user_id,product_id,quantity,created_at")
    .eq("user_id", userId)
    .lt("created_at", cutoff);
  if (cartError) throw new Error(`تعذر إعادة قراءة السلة من Supabase: ${cartError.message}`);
  if (!cartRows?.length) throw new Error("لم تعد هناك سلة متروكة مطابقة في Supabase.");

  const productIds = [...new Set(cartRows.map((row: any) => row.product_id).filter(Boolean))];
  const lastActivity = Math.max(...cartRows.map((row: any) => new Date(row.created_at ?? 0).getTime()));
  const [profileResult, productsResult, ordersResult] = await Promise.all([
    supabaseLoose.from("profiles").select("id,full_name,phone").eq("id", userId).maybeSingle(),
    supabaseLoose.from("products").select("id,name,price_per_unit,is_active").in("id", productIds).eq("is_active", true),
    supabaseLoose.from("orders").select("id").eq("user_id", userId).gte("created_at", new Date(lastActivity).toISOString()).limit(1),
  ]);
  if (profileResult.error) throw new Error(`تعذر قراءة ملف العميل من Supabase: ${profileResult.error.message}`);
  if (productsResult.error) throw new Error(`تعذر قراءة منتجات السلة من Supabase: ${productsResult.error.message}`);
  if (ordersResult.error) throw new Error(`تعذر التحقق من الطلبات الحديثة في Supabase: ${ordersResult.error.message}`);
  if (ordersResult.data?.length) throw new Error("أُنشئ طلب بعد آخر نشاط للسلة؛ لم أجهز رسالة استرداد.");
  if (!profileResult.data?.phone) throw new Error("لا يوجد رقم هاتف موثق لهذا العميل في Supabase.");

  const productMap = new Map((productsResult.data ?? []).map((product: any) => [product.id, product]));
  if (cartRows.some((row: any) => !row.product_id || !productMap.has(row.product_id))) {
    throw new Error("بعض منتجات السلة لم تعد نشطة أو لم يمكن التحقق منها في Supabase.");
  }
  const items = cartRows.map((row: any) => {
    const product = productMap.get(row.product_id)!;
    return { name: product.name, lineTotal: Number(product.price_per_unit || 0) * Number(row.quantity || 0) };
  });
  const total = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const name = profileResult.data.full_name || "عميل المتجر";
  let verifiedCoupon: { code: string; discount_type: string; discount_value: number } | null = null;
  const requestedCode = cart.couponSuggested?.trim().toUpperCase();
  if (requestedCode) {
    const { data: couponRow, error } = await supabaseLoose
      .from("coupons")
      .select("code,discount_type,discount_value,expires_at,is_active,first_order_only,max_uses,uses_count,min_order_amount")
      .eq("code", requestedCode)
      .maybeSingle();
    if (error) throw new Error(`تعذر التحقق من كوبون الخصم في Supabase: ${error.message}`);
    const isLive = couponRow?.is_active && (!couponRow.expires_at || new Date(couponRow.expires_at).getTime() > Date.now());
    const underUseLimit = couponRow?.max_uses == null || Number(couponRow.uses_count) < Number(couponRow.max_uses);
    const meetsMinimum = couponRow?.min_order_amount == null || total >= Number(couponRow.min_order_amount);
    let firstOrderEligible = true;
    if (couponRow?.first_order_only && userId) {
      const { data: previousOrders, error: ordersError } = await supabaseLoose.from("orders").select("id").eq("user_id", userId).limit(1);
      if (ordersError) throw new Error(`تعذر التحقق من أهلية الكوبون في Supabase: ${ordersError.message}`);
      firstOrderEligible = !previousOrders?.length;
    } else if (couponRow?.first_order_only) {
      firstOrderEligible = false;
    }
    if (couponRow && isLive && underUseLimit && meetsMinimum && firstOrderEligible) verifiedCoupon = couponRow;
  }

  const couponLine = verifiedCoupon
    ? `كود خصم متاح حسب بيانات المتجر: *${verifiedCoupon.code}* (${verifiedCoupon.discount_type === "percentage" ? `خصم ${verifiedCoupon.discount_value}%` : `خصم ${verifiedCoupon.discount_value} ج.م`}).`
    : "";
  const cartSummary = `سلتك تحتوي على (${items.slice(0, 2).map((item) => item.name).join("، ")}) بقيمة ${total.toFixed(2)} ج.م.`;
  const message = `أهلاً بك يا ${name} 👋 من سوبرماركت الوادي الأخضر 🌿

${cartSummary}

${couponLine}

راجع سلتك وأكمل طلبك من صفحة المتجر: ${typeof window !== "undefined" ? `${window.location.origin}/cart` : "صفحة السلة"}`;

  const cleanPhone = profileResult.data.phone.replace(/[^0-9]/g, "");
  const formattedPhone = cleanPhone.startsWith("0") ? "2" + cleanPhone : cleanPhone;
  const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;

  return {
    messageText: message,
    whatsappUrl,
    suggestedDiscountCode: verifiedCoupon?.code || "",
    strategy: verifiedCoupon ? "مسودة تتضمن كوبوناً تم التحقق من صلاحيته من Supabase" : "تذكير محايد بلا خصم أو موعد تسليم غير مؤكد",
  };
}

/* ───────────────────────── generateProductCopywriting ───────────────────────── */

export async function generateProductCopywriting(
  input: ProductCopywriterInput,
): Promise<ProductCopywriterResult> {
  // يعمل حتى لمنتج جديد لم يُحفظ بعد؛ التوليد يتم على الخادم عبر المزود النشط (Dahl افتراضيًا).
  const res = await generateProductCopy({
    data: {
      productName: input.productName,
      categoryName: input.categoryName ?? null,
      categoryNames: input.categoryNames,
      isByWeight: !!input.isByWeight,
    },
  });
  return res as unknown as ProductCopywriterResult;
}

