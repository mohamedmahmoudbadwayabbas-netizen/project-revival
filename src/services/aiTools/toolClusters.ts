/**
 * src/services/aiTools/intentRouter.ts
 * ---------------------------------------------------------------------------
 * Egyptian-Colloquial Intent Router & Token-Budget Optimizer (Max 5 Tools/Turn)
 * Routes user prompts to either:
 *  - Nawat (Customer Storefront Concierge — 9 Consolidated Clusters)
 *  - Nebras (Admin Operations CoPilot — 10 Consolidated Manager Clusters)
 */

import {
  NEBRAS_MANAGER_TOOL_SCHEMAS,
  type NebrasToolDefinition,
  type NebrasToolName,
} from './nebrasManagerTools';

export type AgentPersona = 'nawat' | 'nebras';

export type ClusterMaturityStatus = 'live' | 'partial';

export type ToolRiskCategory = 'READ_ONLY' | 'LOW_WRITE' | 'HIGH_WRITE' | 'DESTRUCTIVE';

export interface ToolClusterMetadata {
  name: string;
  agent: AgentPersona;
  status: ClusterMaturityStatus;
  risk: ToolRiskCategory;
  keywordsAr: string[];
  descriptionAr: string;
}

// ============================================================================
// 1. Nawat Customer Concierge Schemas (9 Consolidated Clusters)
// ============================================================================

export const NAWAT_TOOL_SCHEMAS: NebrasToolDefinition[] = [
  {
    name: 'productExplorer' as any,
    description: 'البحث عن المنتجات، الأصناف، الأسعار، والبدائل المتاحة في المتجر.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['search', 'details', 'alternatives', 'categories'] },
        query: { type: 'string' },
        categoryId: { type: 'string' },
        productId: { type: 'string' },
      },
      required: ['action'],
    },
  },
  {
    name: 'smartCartManager' as any,
    description: 'إدارة سلة التسوق: إضافة، تعديل كمية، حذف، أو استعراض محتويات السلة.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['add', 'update_qty', 'remove', 'view', 'clear'] },
        productId: { type: 'string' },
        quantity: { type: 'number' },
      },
      required: ['action'],
    },
  },
  {
    name: 'orderTracker' as any,
    description: 'متابعة حالة طلبات العميل الحالية والسابقة وتفاصيل التوصيل.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list_my_orders', 'track_latest', 'order_details'] },
        orderId: { type: 'string' },
      },
      required: ['action'],
    },
  },
  {
    name: 'dealsAndCoupons' as any,
    description: 'عرض العروض المتاحة والتحقق من صلاحية أكواد الخصم والكوبونات.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['active_offers', 'validate_coupon'] },
        code: { type: 'string' },
        cartTotal: { type: 'number' },
      },
      required: ['action'],
    },
  },
  {
    name: 'recipeAndMealPlanner' as any,
    description: 'اقتراح وصفات طبخ مصرية ومكوناتها من منتجات الوادي الأخضر المتوفرة.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['suggest_meal', 'ingredients_to_cart'] },
        dishName: { type: 'string' },
        servings: { type: 'number' },
      },
      required: ['action'],
    },
  },
  {
    name: 'deliveryZoneChecker' as any,
    description: 'التحقق من نطاق التوصيل، رسوم الشحن، ومواعيد عمل فروع العاشر من رمضان.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['check_area', 'branch_hours'] },
        areaName: { type: 'string' },
      },
      required: ['action'],
    },
  },
  {
    name: 'reorderAssistant' as any,
    description: 'إعادة طلب المشتريات المعتادة أو السابقة للعميل بضغطة واحدة.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['buy_again_list', 'repeat_last_order'] },
      },
      required: ['action'],
    },
  },
  {
    name: 'accountAndFavorites' as any,
    description: 'عرض المفضلة، العناوين المحفوظة، وملخص نقاط الولاء للعميل.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list_favorites', 'profile_summary', 'loyalty_points'] },
      },
      required: ['action'],
    },
  },
  {
    name: 'customerSupportConcierge' as any,
    description: 'المساعدة في الاسترجاع، الشكاوى، وسياسات المتجر وخدمة العملاء.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['policy_info', 'create_ticket'] },
        topic: { type: 'string' },
        orderId: { type: 'string' },
      },
      required: ['action'],
    },
  },
];

// ============================================================================
// 2. Registry of All 19 Clusters (9 Nawat + 10 Nebras) — Status: live | partial
// ============================================================================

export const TOOL_CLUSTERS_REGISTRY: ToolClusterMetadata[] = [
  // --- Nawat Clusters (9) ---
  {
    name: 'productExplorer',
    agent: 'nawat',
    status: 'live',
    risk: 'READ_ONLY',
    keywordsAr: ['منتج', 'سعر', 'بكام', 'عندكم', 'عايز', 'ابحث', 'دور', 'فواكه', 'خضار', 'لحوم', 'البان', 'بديل', 'قسم', 'اصناف'],
    descriptionAr: 'البحث عن المنتجات والأسعار والأقسام في الكتالوج',
  },
  {
    name: 'smartCartManager',
    agent: 'nawat',
    status: 'live',
    risk: 'LOW_WRITE',
    keywordsAr: ['سلة', 'عربية', 'ضيف', 'حط', 'زود', 'نقص', 'شيل', 'امسح', 'احذف', 'كمية', 'كيلو', 'علبة'],
    descriptionAr: 'إضافة وتعديل وحذف المنتجات من سلة العميل',
  },
  {
    name: 'orderTracker',
    agent: 'nawat',
    status: 'live',
    risk: 'READ_ONLY',
    keywordsAr: ['طلبي', 'اوردر', 'فين', 'وصل', 'تتبع', 'حالة', 'متى', 'امتى', 'مندوب', 'طلبات'],
    descriptionAr: 'متابعة حالة الطلبات والتوصيل للعميل',
  },
  {
    name: 'dealsAndCoupons',
    agent: 'nawat',
    status: 'live',
    risk: 'READ_ONLY',
    keywordsAr: ['خصم', 'كوبون', 'برومو', 'كود', 'عرض', 'عروض', 'تخفيض', 'اوفر'],
    descriptionAr: 'التحقق من الكوبونات والعروض النشطة',
  },
  {
    name: 'recipeAndMealPlanner',
    agent: 'nawat',
    status: 'live',
    risk: 'READ_ONLY',
    keywordsAr: ['وصفة', 'اكلة', 'طبخ', 'غدا', 'فطار', 'عشا', 'مكونات', 'مقادير', 'اعمل', 'طريقة'],
    descriptionAr: 'اقتراح وصفات ومكوناتها من منتجات المتجر',
  },
  {
    name: 'deliveryZoneChecker',
    agent: 'nawat',
    status: 'live',
    risk: 'READ_ONLY',
    keywordsAr: ['توصيل', 'شحن', 'مجاورة', 'حي', 'منطقة', 'العاشر', 'مواعيد', 'فاتح', 'قافل', 'فرع', 'عنوان'],
    descriptionAr: 'فحص مناطق التوصيل ومواعيد عمل الفروع',
  },
  {
    name: 'reorderAssistant',
    agent: 'nawat',
    status: 'live',
    risk: 'LOW_WRITE',
    keywordsAr: ['تاني', 'مرة تانية', 'المعتاد', 'اللي فات', 'كرر', 'نفس الطلب', 'اشتريته'],
    descriptionAr: 'إعادة طلب المشتريات السابقة للعميل',
  },
  {
    name: 'accountAndFavorites',
    agent: 'nawat',
    status: 'partial',
    risk: 'READ_ONLY',
    keywordsAr: ['مفضلة', 'حسابي', 'نقاط', 'ولاء', 'محفظة', 'رصيدي', 'بياناتي'],
    descriptionAr: 'عرض المفضلة ونقاط الولاء وملف العميل',
  },
  {
    name: 'customerSupportConcierge',
    agent: 'nawat',
    status: 'partial',
    risk: 'LOW_WRITE',
    keywordsAr: ['شكوى', 'مشكلة', 'استرجاع', 'تبديل', 'بايظ', 'ناقص', 'خدمة', 'مساعدة', 'تواصل'],
    descriptionAr: 'دعم العملاء وسياسات الاستبدال والاسترجاع',
  },

  // --- Nebras Admin CoPilot Clusters (10) ---
  {
    name: 'manageCatalog',
    agent: 'nebras',
    status: 'live',
    risk: 'HIGH_WRITE',
    keywordsAr: ['كتالوج', 'منتج', 'صنف', 'قسم', 'اضف منتج', 'ضيف منتج', 'عدل منتج', 'ارشفة', 'اخفي', 'فعل', 'المنتجات'],
    descriptionAr: 'إدارة الكتالوج والمنتجات والأقسام',
  },
  {
    name: 'pricingManager',
    agent: 'nebras',
    status: 'live',
    risk: 'DESTRUCTIVE',
    keywordsAr: ['سعر', 'اسعار', 'تسعير', 'زود السعر', 'ارفع', 'نزل', 'خصم جماعي', 'نسبة', 'تراجع', 'السعر القديم', 'غلي'],
    descriptionAr: 'تعديل الأسعار الفردية والجماعية والتراجع للسعر السابق',
  },
  {
    name: 'inventoryManager',
    agent: 'nebras',
    status: 'partial',
    risk: 'HIGH_WRITE',
    keywordsAr: ['مخزون', 'نواقص', 'خلص', 'نفد', 'رصيد', 'جرد', 'كمية', 'تحويل', 'فرع', 'ستوك'],
    descriptionAr: 'فحص نواقص المخزون وتعديل الأرصدة ومحاكاة التحويلات',
  },
  {
    name: 'supplierManager',
    agent: 'nebras',
    status: 'partial',
    risk: 'LOW_WRITE',
    keywordsAr: ['مورد', 'موردين', 'امر شراء', 'توريد', 'بضاعة', 'استلام', 'فواتير شراء', 'po'],
    descriptionAr: 'محاكاة أوامر الشراء وإدارة الموردين',
  },
  {
    name: 'fulfillmentManager',
    agent: 'nebras',
    status: 'partial',
    risk: 'LOW_WRITE',
    keywordsAr: ['طلبات', 'معلقة', 'تجهيز', 'توصيل', 'سائق', 'مندوب', 'طيار', 'شحنة', 'اسناد', 'اوردر'],
    descriptionAr: 'متابعة الطلبات قيد التنفيذ ومحاكاة إسناد السائقين',
  },
  {
    name: 'promotionsManager',
    agent: 'nebras',
    status: 'live',
    risk: 'HIGH_WRITE',
    keywordsAr: ['كوبون', 'كوبونات', 'خصم', 'برومو', 'سلة متروكة', 'سلال', 'استرداد', 'حملة', 'ترويج'],
    descriptionAr: 'إنشاء الكوبونات وحملات استرداد السلال المتروكة',
  },
  {
    name: 'customerManager',
    agent: 'nebras',
    status: 'partial',
    risk: 'HIGH_WRITE',
    keywordsAr: ['عميل', 'عملاء', 'زبون', 'بروفايل', 'محفظة', 'تعويض', 'نقاط', 'ولاء', 'تليفون'],
    descriptionAr: 'إدارة ملفات العملاء والمحفظة ونقاط الولاء',
  },
  {
    name: 'businessIntelligence',
    agent: 'nebras',
    status: 'live',
    risk: 'READ_ONLY',
    keywordsAr: ['تقرير', 'مبيعات', 'ايرادات', 'ارباح', 'اكثر مبيعا', 'راكد', 'تحليل', 'احصائيات', 'اداء', 'فلوس'],
    descriptionAr: 'تقارير الإيرادات والأكثر مبيعاً والمخزون الراكد',
  },
  {
    name: 'systemManager',
    agent: 'nebras',
    status: 'live',
    risk: 'DESTRUCTIVE',
    keywordsAr: ['اعدادات', 'بنر', 'بانر', 'الوان', 'ثيم', 'حالة المتجر', 'اقفل المتجر', 'افتح المتجر', 'صيانة', 'شريط'],
    descriptionAr: 'تعديل إعدادات المتجر والبنرات والألوان وحالة التشغيل',
  },
  {
    name: 'mediaManager',
    agent: 'nebras',
    status: 'live',
    risk: 'LOW_WRITE',
    keywordsAr: ['صورة', 'صور', 'توليد', 'ارسم', 'صمم', 'بنر', 'جرافيك', 'لوجو', 'رفع صورة'],
    descriptionAr: 'توليد صور المنتجات بالذكاء الاصطناعي ورفع البنرات',
  },
];

// ============================================================================
// 3. Egyptian Colloquial Text Normalizer & Intent Scorer
// ============================================================================

function normalizeEgyptianArabic(text: string): string {
  return text
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[\u064B-\u065F]/g, '') // Strip diacritics
    .replace(/[^\w\s\u0600-\u06FF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface RoutedIntentResult {
  agent: AgentPersona;
  selectedClusters: ToolClusterMetadata[];
  schemas: NebrasToolDefinition[];
  estimatedTokenSavingsPercent: number;
}

/**
 * Filters the 19 consolidated clusters down to at most 5 relevant tools
 * based on Egyptian-colloquial keyword matching, saving ~75–85% of prompt tokens.
 */
export function routeIntent(message: string, agent: AgentPersona): RoutedIntentResult {
  const normalizedMsg = normalizeEgyptianArabic(message);
  const agentClusters = TOOL_CLUSTERS_REGISTRY.filter((c) => c.agent === agent);
  const allSchemas = agent === 'nebras' ? NEBRAS_MANAGER_TOOL_SCHEMAS : NAWAT_TOOL_SCHEMAS;

  const scored = agentClusters.map((cluster) => {
    let score = 0;
    for (const rawKw of cluster.keywordsAr) {
      const kw = normalizeEgyptianArabic(rawKw);
      if (!kw) continue;
      if (normalizedMsg.includes(kw)) {
        // Longer multi-word phrases get higher precision weight
        score += kw.includes(' ') ? 5 : 2;
      }
    }
    return { cluster, score };
  });

  // Sort descending by match score
  scored.sort((a, b) => b.score - a.score);

  // Pick top matches (max 5). If no strong keyword match, provide top 3 core fallback tools
  const matched = scored.filter((s) => s.score > 0).slice(0, 5).map((s) => s.cluster);

  const fallbackNames =
    agent === 'nebras'
      ? ['businessIntelligence', 'manageCatalog', 'inventoryManager']
      : ['productExplorer', 'smartCartManager', 'dealsAndCoupons'];

  const selectedClusters =
    matched.length > 0
      ? matched
      : agentClusters.filter((c) => fallbackNames.includes(c.name)).slice(0, 3);

  const selectedNames = new Set(selectedClusters.map((c) => c.name));
  const schemas = allSchemas.filter((schema) => selectedNames.has(schema.name));

  const totalAvailable = TOOL_CLUSTERS_REGISTRY.length; // 19
  const savings = Math.round(((totalAvailable - schemas.length) / totalAvailable) * 100);

  return {
    agent,
    selectedClusters,
    schemas,
    estimatedTokenSavingsPercent: savings,
  };
}

export function getClusterRisk(toolName: string): ToolRiskCategory {
  const found = TOOL_CLUSTERS_REGISTRY.find((c) => c.name === toolName);
  return found?.risk ?? 'HIGH_WRITE';
}