/* =========================================================================
   GEMINI AI ADMIN ENGINE — UNIFIED TOOL ROUTER & NLP DISPATCHER
   Routes the enabled tool suite and provides local NLP fallback routing
   ========================================================================= */

import type {
  AiToolName,
  ToolExecutionContext,
  ToolExecutionResult,
} from "./types";
import {
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
  rollbackLastAction,
} from "./coreCatalogTools";
import {
  executeCustomCSS,
  updateRawJsonMetadata,
  manageUsersAndRoles,
  exportReportsAndAnalytics,
  sendPushNotification,
  manageDeliveryZones,
} from "./operationalTools";
import {
  getDirectoryTree,
  getFileContentTool,
  searchCodebase,
  getAppErrors,
} from "./devopsTools";
import { AI_TOOL_SUITE } from "./toolDefinitions";
import { executeAIAction } from "./aiActionGateway";

async function _executeAiToolInner(
  tool: AiToolName,
  args: Record<string, unknown> = {},
  ctx?: ToolExecutionContext,
): Promise<ToolExecutionResult> {
  console.info(`[AI Engine] 🚀 Executing tool "${tool}" with args:`, args);

  const toolDef = AI_TOOL_SUITE.find((t) => t.name === tool);

  if (toolDef?.mutatesState) {
    const supabaseUrl =
      import.meta.env.VITE_SUPABASE_URL ||
      (typeof process !== "undefined" && process.env?.VITE_SUPABASE_URL) ||
      "";

    if (supabaseUrl && !supabaseUrl.includes("gpoqacclpjadzbhevgal")) {
      return {
        tool,
        ok: false,
        success: false,
        updatedFields: [],
        error: "Target project-ref mismatch. Expected gpoqacclpjadzbhevgal.",
        messageAr: "فشل التحقق: تم إيقاف العملية لأن بيئة Supabase لا تتطابق مع المشروع المطلوب (gpoqacclpjadzbhevgal).",
      };
    }
  }

  let result: ToolExecutionResult;

  switch (tool) {
    // ── Media ──
    case "generateProductImage":
      result = await toolGenerateProductImage(args as any, ctx);
      break;
    case "uploadBannerImage":
      result = await toolUploadBannerImage(args as any, ctx);
      break;

    // ── Catalog ──
    case "manageProduct":
      result = await toolManageProduct(args as any, ctx);
      break;
    case "manageCategories":
      result = await toolManageCategories(args as any, ctx);
      break;
    case "bulkPriceUpdate":
      result = await toolBulkPriceUpdate(args as any, ctx);
      break;
    case "searchProducts":
      result = await toolSearchProducts(args as any, ctx);
      break;
    case "getCategories":
      result = await toolGetCategories(args as any);
      break;

    // ── UI ──
    case "updateLayoutConfig":
      result = await toolUpdateLayoutConfig(args as any, ctx);
      break;
    case "updateThemeColors":
      result = await toolUpdateThemeColors(args as any, ctx);
      break;

    // ── Marketing ──
    case "createDiscountBundle":
      result = await toolCreateDiscountBundle(args as any, ctx);
      break;
    case "sendAbandonedCartRecovery":
      result = await toolSendAbandonedCartRecovery(args as any);
      break;

    // ── Safety ──
    case "rollbackLastAction":
      result = await rollbackLastAction(ctx);
      break;

    // ── Phase 1 ──
    case "executeCustomCSS":
      result = await executeCustomCSS(String(args.cssRules || args.rules || ""), ctx);
      break;
    case "updateRawJsonMetadata":
      result = await updateRawJsonMetadata(String(args.key || ""), args.value, ctx);
      break;

    // ── Phase 2 ──
    case "manageUsersAndRoles":
      result = await manageUsersAndRoles(args as any, ctx);
      break;
    case "exportReportsAndAnalytics":
      result = await exportReportsAndAnalytics(args as any, ctx);
      break;
    case "sendPushNotification":
      result = await sendPushNotification(args as any, ctx);
      break;
    case "manageDeliveryZones":
      result = await manageDeliveryZones(args as any, ctx);
      break;

    // ── Phase 3 ──
    case "getDirectoryTree":
      result = await getDirectoryTree(args as any);
      break;
    case "getFileContent":
      result = await getFileContentTool(args as any);
      break;
    case "searchCodebase":
      result = await searchCodebase(args as any);
      break;
    case "getAppErrors":
      result = await getAppErrors(args as any);
      break;
    default:
      result = {
        tool,
        ok: false,
        messageAr: `الأداة «${tool}» غير معروفة أو غير مدعومة في الإصدار الحالي.`,
      };
      break;
  }

  // Real-Time UI State Sync: Dispatch global browser events on success
  if (typeof window !== "undefined" && result.ok) {
    try {
      window.dispatchEvent(
        new CustomEvent("smartstore:sync", {
          detail: {
            tool,
            data: result.data,
            timestamp: Date.now(),
            verified: result.verified ?? true,
          },
        }),
      );

      if (tool === "updateLayoutConfig" || tool === "updateThemeColors") {
        window.dispatchEvent(
          new CustomEvent("smartstore:layout_updated", {
            detail: result.data,
          }),
        );
      }

      if (
        tool === "manageProduct" ||
        tool === "manageCategories" ||
        tool === "bulkPriceUpdate"
      ) {
        window.dispatchEvent(
          new CustomEvent("smartstore:catalog_updated", {
            detail: { tool, data: result.data },
          }),
        );
      }

      if (tool === "manageDeliveryZones") {
        window.dispatchEvent(
          new CustomEvent("smartstore:delivery_zones_updated", {
            detail: result.data,
          }),
        );
      }

      if (tool === "manageUsersAndRoles") {
        window.dispatchEvent(
          new CustomEvent("smartstore:auth_roles_updated", {
            detail: result.data,
          }),
        );
      }

      if (tool === "executeCustomCSS") {
        window.dispatchEvent(
          new CustomEvent("smartstore:custom_css_updated", {
            detail: result.data,
          }),
        );
      }

      if (ctx?.refresh) {
        ctx.refresh();
      }
    } catch (evtErr) {
      console.warn("[AI Engine] Could not dispatch sync event:", evtErr);
    }
  }

  return result;
}

export async function executeAiTool(
  tool: AiToolName,
  args: Record<string, unknown> = {},
  ctx?: any,
): Promise<ToolExecutionResult> {
  try {
    const gatewayResult = await executeAIAction(tool, args, ctx, () => _executeAiToolInner(tool, args, ctx));
    const result: ToolExecutionResult = {
      tool,
      ok: gatewayResult.success,
      success: gatewayResult.success,
      messageAr: gatewayResult.error || (gatewayResult.status === "approval_required" ? "هذا الإجراء يتطلب موافقة." : "تم تنفيذ الإجراء والتحقق منه."),
      error: gatewayResult.error,
      data: gatewayResult.data,
      verified: gatewayResult.verification?.verified,
      verificationDetails: gatewayResult.verification?.details,
      gatewayStatus: gatewayResult.status,
    };
    const source = typeof window !== "undefined" && window.location.hostname.includes("lovable") ? "lovable" : "ai-studio";
    result.source = source;

    // Check if result is explicitly missing success
    if (result.error || result.ok === false) {
      result.success = false;
      result.ok = false;
    }

    console.info(`[STRICT_VERIFICATION_LOG] ENV: ${source} | Tool: ${tool} | Args:`, args, `| Raw Response:`, result);

    return result;
  } catch (error: any) {
    const source = typeof window !== "undefined" && window.location.hostname.includes("lovable") ? "lovable" : "ai-studio";
    const errRes = { tool, ok: false, success: false, error: error.message, messageAr: `خطأ تنفيذي: ${error.message}`, source };
    console.error(`[STRICT_VERIFICATION_LOG_ERROR] ENV: ${source} | Tool: ${tool} | Error:`, error);
    return errRes as ToolExecutionResult;
  }
}
