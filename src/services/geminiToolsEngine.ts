/* =========================================================================
   GEMINI AI ADMIN ENGINE — UNIFIED TOOL ENGINE BRIDGE
   Re-exports from the unified tool suite for backwards compatibility
   ========================================================================= */

export {
  AI_TOOL_SUITE,
  AI_TOOL_GROUP_LABELS,
  GEMINI_TOOL_DECLARATIONS,
  getActiveTools,
  executeAiTool,  createRollbackPoint,
  getLastRollbackPoint,
  getRollbackStack,
  rollbackLastAction,
  toolGenerateProductImage,
  toolUploadBannerImage,
  toolManageProduct,
  toolManageCategories,
  toolBulkPriceUpdate,
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
  verifyCopilotExecution,
} from "./gemini36Service";

export type {
  AiToolName,
  AiToolGroup,
  AiToolDefinition,
  ToolExecutionContext,
  ToolExecutionResult,
  RollbackPoint,
  CopilotSelfTestResult,
} from "./gemini36Service";
