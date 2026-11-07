/* =========================================================================
   GEMINI AI ADMIN ENGINE — TYPE DEFINITIONS
   Unified AI Tool Suite Types, Execution Contexts & Payload Interfaces
   ========================================================================= */

import type {
  StoreLayoutConfig,
  ThemeColorPalette,
  LayoutSectionKey,
  MiniAdItem,
  HeroSlideConfig,
} from "@/types/layout-config";

export type AiToolName =
  | "generateProductImage"
  | "uploadBannerImage"
  | "manageProduct"
  | "manageCategories"
  | "bulkPriceUpdate"
  | "searchProducts"
  | "getCategories"
  | "updateLayoutConfig"
  | "updateThemeColors"
  | "createCouponCampaign"
  | "sendAbandonedCartRecovery"
  | "rollbackLastAction"
  | "executeCustomCSS"
  | "updateRawJsonMetadata"
  | "manageUsersAndRoles"
  | "exportReportsAndAnalytics"
  | "updateStoreAnnouncement"
  | "manageDeliveryZones"
  | "getDirectoryTree"
  | "getFileContent"
  | "searchCodebase"
  | "getAppErrors"
  | "writeNewFile"
  | "updateFileAST"
  | "deleteFile"
  | "gitCommitAndPush"
  | "gitRollbackCommit";

export type AiToolGroup =
  "media" | "catalog" | "ui" | "marketing" | "safety" | "universal" | "operations" | "devops";

export interface AiToolDefinition {
  name: AiToolName;
  group: AiToolGroup;
  labelAr: string;
  descriptionAr: string;
  declaration: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required: string[];
    };
  };
  mutatesState: boolean;
}

export interface ToolExecutionContext {
  layout: StoreLayoutConfig;
  updateLayout: (next: StoreLayoutConfig) => void;
  refresh?: () => void;
  approvalGranted?: boolean;
}

export interface ToolExecutionResult {
  tool: AiToolName;
  ok: boolean; // legacy flag
  messageAr: string; // legacy string
  success?: boolean; // new Mega-Tool structured success
  updatedFields?: string[]; // new Mega-Tool structured updated fields
  error?: string; // new Mega-Tool structured error
  data?: Record<string, unknown>;
  rollbackPointId?: string;
  verified?: boolean;
  source?: "lovable" | "ai-studio";
  gatewayStatus?: "completed" | "failed" | "approval_required" | "rejected";
  verificationDetails?: string;
}

export interface RollbackPoint {
  id: string;
  tool: AiToolName | "manual";
  labelAr: string;
  createdAt: string;
  layout: StoreLayoutConfig | null;
  db?: {
    table: string;
    kind: "restore-rows" | "delete-row";
    rows?: Record<string, unknown>[];
    id?: string;
  };
}

export interface ParsedActionDetail {
  target: string;
  field: string;
  action: "updated" | "created" | "toggled" | "reordered" | "reset";
  label: string;
  oldValue?: string;
  newValue?: string;
}

export interface ParseCommandResult {
  updatedLayout: StoreLayoutConfig;
  explanation: string;
  actionSummary: string;
  changedKeys: string[];
  executedActions?: ParsedActionDetail[];
  suggestedPromptFollowups?: string[];
  intelligenceScore?: number;
}

export interface ExecutiveKpiInput {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  topSellingCategory: string;
  abandonedCartsCount?: number;
  periodLabel?: string;
}

export interface ExecutiveSummaryResult {
  headline: string;
  overallHealthScore: number;
  insights: string[];
  actionableTips: [
    {
      title: string;
      description: string;
      impact: "High" | "Medium" | "Urgent";
      category: "Inventory" | "Marketing" | "Pricing" | "Operations";
      quickActionLabel?: string;
      quickActionCommand?: string;
    },
    {
      title: string;
      description: string;
      impact: "High" | "Medium" | "Urgent";
      category: "Inventory" | "Marketing" | "Pricing" | "Operations";
      quickActionLabel?: string;
      quickActionCommand?: string;
    },
  ];
}

export interface AbandonedCartData {
  id: string;
  customerName: string;
  phone: string;
  itemsCount: number;
  itemsList: string[];
  totalPrice: number;
  lastUpdated: string;
  couponSuggested?: string;
}

export interface AbandonedCartDraftResult {
  messageText: string;
  whatsappUrl: string;
  suggestedDiscountCode: string;
  strategy: string;
}

export interface ProductCopywriterInput {
  productName: string;
  productId?: string;
  categoryName?: string;
  categoryNames?: string[];
  targetAudience?: string;
  rawPrice?: number;
  isByWeight?: boolean;
}

export interface ProductNutritionalInfo {
  calories: string;
  protein: string;
  carbs: string;
  fiber: string;
  fats?: string;
}

export interface ProductCopywriterResult {
  enhancedTitle: string;
  shortDescription: string;
  seoDescription: string;
  tags: string[];
  cookingTip: string;
  characteristics: string[];
  storageInstructions: string;
  originSource: string;
  nutritionalInfo: ProductNutritionalInfo;
  keySellingPoints: string[];
  suggestedBadge?: string;
  suggestedCategory?: string;
  isByWeight?: boolean;
  unitLabel?: string;
}

export interface GroundingSource {
  title?: string;
  uri?: string;
}

export type GeminiModelChoice = "gemini-2.5-flash";

export type GeminiRoleChoice =
  "store_architect" | "market_researcher" | "growth_strategist" | "copywriter";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  modelUsed?: string;
  roleUsed?: GeminiRoleChoice;
  groundingSources?: GroundingSource[];
  executedActions?: ParsedActionDetail[];
  codeModification?: {
    filePath: string;
    originalCode: string;
    modifiedCode: string;
    summary: string;
    explanation: string;
    diffSummary?: {
      addedLinesCount: number;
      removedLinesCount: number;
    };
  };
  attachedFile?: {
    path: string;
    name: string;
  };
  suggestedAction?: {
    label: string;
    command: string;
    type: "apply_layout" | "export_report" | "open_tab";
  };
}
