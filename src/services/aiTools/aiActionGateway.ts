import { supabase } from "@/lib/supabase-loose";
import { isSupabaseConfigured } from "./envValidation";
import type { AiToolName, ToolExecutionContext, ToolExecutionResult } from "./types";

export type AiRiskLevel = "READ" | "LOW_WRITE" | "HIGH_WRITE" | "DESTRUCTIVE";
export type AiActionStatus = "completed" | "failed" | "approval_required" | "rejected";

export interface AiAction {
  actionId: string;
  toolName: AiToolName;
  actor: { userId: string; role: string };
  input: Record<string, unknown>;
  risk: AiRiskLevel;
  context?: ToolExecutionContext;
}

export interface AiActionResult {
  success: boolean;
  actionId: string;
  toolName: AiToolName;
  status: AiActionStatus;
  data?: Record<string, unknown>;
  error?: string;
  verification?: { verified: boolean; details: string };
  auditId: string;
}

type ToolExecutor = () => Promise<ToolExecutionResult>;

const DESTRUCTIVE_TOOLS = new Set<AiToolName>(["rollbackLastAction", "deleteFile", "gitRollbackCommit"]);
const DISABLED_PROJECT_MUTATION_TOOLS = new Set<string>([
  "writeNewFile", "updateFileAST", "deleteFile", "gitCommitAndPush", "gitRollbackCommit",
]);
const HIGH_WRITE_TOOLS = new Set<AiToolName>([
  // Keep bulk price changes, access-control changes, arbitrary metadata, and
  // repository mutations behind an explicit approval path. Routine, directly
  // requested store edits are allowed for a verified admin and still must
  // report a confirmed database result.
  "bulkPriceUpdate", "manageUsersAndRoles", "updateRawJsonMetadata",
  "writeNewFile", "updateFileAST", "deleteFile", "gitCommitAndPush", "gitRollbackCommit",
]);
const READ_TOOLS = new Set<AiToolName>([
  "searchProducts", "getCategories", "exportReportsAndAnalytics", "getDirectoryTree", "getFileContent", "searchCodebase", "getAppErrors",
]);

export function classifyAiRisk(toolName: AiToolName, input: Record<string, unknown>): AiRiskLevel {
  if (DESTRUCTIVE_TOOLS.has(toolName) || input.action === "delete") return "DESTRUCTIVE";
  if (READ_TOOLS.has(toolName)) return "READ";
  // Direct admin store configuration and catalog actions are routine writes.
  // Deletion is still destructive regardless of tool name.
  if (HIGH_WRITE_TOOLS.has(toolName)) return "HIGH_WRITE";
  return "LOW_WRITE";
}

async function resolveActor(): Promise<{ userId: string; role: string } | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const { data: role, error: roleError } = await supabase.rpc("get_my_role");
  if (!roleError && role) {
    return { userId: data.user.id, role: String(role).toLowerCase() };
  }

  // Keep deployed schemas without get_my_role working using the existing
  // caller-owned RLS policy on user_roles. Do not trust the UI's claimed role.
  const { data: roles, error: rolesError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id);
  if (rolesError) return { userId: data.user.id, role: "customer" };
  const grantedRoles = new Set((roles ?? []).map((row) => String(row.role).toLowerCase()));
  const resolvedRole = ["super_admin", "admin", "moderator", "staff", "driver", "customer"]
    .find((candidate) => grantedRoles.has(candidate));
  return { userId: data.user.id, role: resolvedRole ?? "customer" };
}

async function verifyAction(action: AiAction, result: ToolExecutionResult): Promise<{ verified: boolean; details: string }> {
  if (!result.ok) {
    return { verified: false, details: "execution-failed" };
  }
  if (!["manageProduct", "manageCategories", "generateProductImage", "uploadBannerImage"].includes(action.toolName)) {
    return { verified: result.ok, details: result.ok ? "tool-result" : "execution-failed" };
  }
  const data = action.input.data as Record<string, unknown> | undefined;
  const resultData = result.data || {};
  const id = typeof resultData.id === "string" ? resultData.id : typeof data?.id === "string" ? data.id : undefined;
  if (!isSupabaseConfigured()) return { verified: false, details: "read-back-unavailable" };
  if (action.toolName === "uploadBannerImage") {
    const imageUrl = typeof resultData.imageUrl === "string" ? resultData.imageUrl : undefined;
    if (!imageUrl) return { verified: false, details: "banner-image-url-missing" };
    const { data: current, error } = await supabase
      .from("store_settings")
      .select("hero_title, hero_image_url")
      .limit(1)
      .maybeSingle();
    if (error) return { verified: false, details: error.message };
    if (!current) return { verified: false, details: "store-settings-row-not-found" };
    return {
      verified: current.hero_image_url === imageUrl && current.hero_title === resultData.headline,
      details: current.hero_image_url === imageUrl && current.hero_title === resultData.headline ? "read-back-match" : "banner-read-back-mismatch",
    };
  }
  if (action.toolName === "generateProductImage") {
    if (!action.input.productId) return { verified: true, details: "generated-without-database-attach" };
    if (!id) return { verified: false, details: "product-id-missing" };
    const imageUrl = typeof resultData.imageUrl === "string" ? resultData.imageUrl : undefined;
    if (!imageUrl) return { verified: false, details: "product-image-url-missing" };
    const { data: current, error } = await supabase.from("products").select("image_url").eq("id", id).maybeSingle();
    if (error) return { verified: false, details: error.message };
    return { verified: current?.image_url === imageUrl, details: current?.image_url === imageUrl ? "read-back-match" : "product-image-read-back-mismatch" };
  }
  if (!id) return { verified: false, details: "record-id-missing" };
  const table = action.toolName === "manageProduct" ? "products" : "categories";
  const { data: current, error } = await supabase.from(table as never).select("*").eq("id", id).maybeSingle();
  if (error) return { verified: false, details: error.message };
  if (action.input.action === "delete") return { verified: !current, details: current ? "row-still-exists" : "deleted-row-absent" };
  if (!current) return { verified: false, details: "row-not-found-after-write" };
  const fields = action.toolName === "manageProduct"
    ? ["name", "name_ar", "description", "description_ar", "price", "original_price", "stock", "category_id", "image_url", "is_featured", "is_active"]
    : ["name", "name_ar", "slug", "image_url"];
  const mismatches = fields.filter((field) => data?.[field] !== undefined && String(current[field]) !== String(data[field]));
  return { verified: mismatches.length === 0, details: mismatches.length ? `mismatch:${mismatches.join(",")}` : "read-back-match" };
}

export async function executeAIAction(
  toolName: AiToolName,
  input: Record<string, unknown>,
  context: ToolExecutionContext | undefined,
  executor: ToolExecutor,
): Promise<AiActionResult> {
  const actionId = `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const actor = await resolveActor();
  const risk = classifyAiRisk(toolName, input);
  const auditId = `audit-${actionId}`;
  const base = { actionId, toolName, auditId };
  if (DISABLED_PROJECT_MUTATION_TOOLS.has(toolName)) {
    return { ...base, success: false, status: "rejected", error: "تم تعطيل أدوات تعديل ملفات المشروع وعمليات Git." };
  }
  if (!actor && risk !== "READ") return { ...base, success: false, status: "rejected", error: "لا يوجد مستخدم موثق في Supabase Auth." };
  const actionActor = actor ?? { userId: "anonymous", role: "customer" };
  const action: AiAction = { ...base, actor: actionActor, input, risk, context };
  if (risk !== "READ" && !["admin", "super_admin"].includes(actionActor.role)) {
    return { ...base, success: false, status: "rejected", error: "هذا الإجراء يتطلب صلاحية تشغيل موثقة من قاعدة البيانات." };
  }
  if (risk === "HIGH_WRITE" || risk === "DESTRUCTIVE") {
    return { ...base, success: false, status: "approval_required", error: "يتطلب هذا الإجراء موافقة صريحة عبر محول موافقات قاعدة البيانات. المحول غير متاح لهذا النوع من الإجراءات حاليًا." };
  }
  try {
    const result = await executor();
    const verification = await verifyAction(action, result);
    const success = result.ok && verification.verified;
    console.info("[AI_ACTION_AUDIT]", { ...base, actor: actionActor.userId, role: actionActor.role, risk, status: success ? "completed" : "failed", verification });
    return { ...base, success, status: success ? "completed" : "failed", data: result.data, error: success ? undefined : result.error || result.messageAr || verification.details, verification };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[AI_ACTION_AUDIT]", { ...base, actor: actionActor.userId, role: actionActor.role, risk, status: "failed", error: message });
    return { ...base, success: false, status: "failed", error: message, verification: { verified: false, details: "executor-threw" } };
  }
}
