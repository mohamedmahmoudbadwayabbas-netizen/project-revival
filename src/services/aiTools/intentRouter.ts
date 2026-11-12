/* =========================================================================
   INTENT ROUTER + TOOL CLUSTER ROUTER  (دستور الـ 19 أداة)
   -------------------------------------------------------------------------
   الفكرة: النموذج لا يرى كل الأدوات أبداً. نحدد نية الرسالة محلياً (بدون أي
   استدعاء ذكاء اصطناعي = صفر توكنز)، ثم نختار عنقوداً أو اثنين فقط، ونمرر
   أدواتهما الفعلية (حد أقصى MAX_ROUTED_TOOLS).

   نواة  = 9 عناقيد للعميل.  نبراس = 10 عناقيد للإدارة.
   كل عنقود يربط "الأداة الجامعة" بالأدوات المنفذة فعلياً اليوم في
   AI_TOOL_SUITE. العنقود الذي لا يملك أداة منفذة بعد (status: "planned")
   لا يُرسل للنموذج إطلاقاً — حتى لا يستدعي النموذج أداة وهمية.
   ========================================================================= */

export type AgentKind = "nawat" | "nebras";

export interface ToolCluster {
  /** اسم الأداة الجامعة في الدستور */
  id: string;
  agent: AgentKind;
  labelAr: string;
  /** كلمات النية (بعد التطبيع) */
  keywords: string[];
  /** أسماء الأدوات المنفذة فعلياً في AI_TOOL_SUITE */
  tools: string[];
  status: "live" | "partial" | "planned";
}

export const MAX_ROUTED_TOOLS = 5;
export const MAX_CLUSTERS = 2;

/** تطبيع عربي: إزالة التشكيل، توحيد أ/إ/آ، ة→ه، ى→ي. */
export function normalizeArabic(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0640]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي");
}

export const TOOL_CLUSTERS: ToolCluster[] = [
  // ───────────── نواة (العميل) — 9 ─────────────
  { id: "searchProducts", agent: "nawat", labelAr: "البحث عن المنتجات", status: "live",
    keywords: ["فيه", "عندكم", "متوفر", "سعر", "بكام", "عايز", "محتاج", "ابحث", "منتج", "لبن", "جبن", "زيت", "رز", "سكر"],
    tools: ["searchProducts", "getCategories"] },
  { id: "manageCart", agent: "nawat", labelAr: "السلة", status: "planned",
    keywords: ["سله", "السله", "ضيف", "اضف", "شيل", "احذف", "الكميه", "عدل"], tools: [] },
  { id: "mealAndRecipePlanner", agent: "nawat", labelAr: "الوصفات والوجبات", status: "partial",
    keywords: ["وصفه", "اعمل", "اطبخ", "اكله", "طبخه", "فطار", "غدا", "عشا", "عزومه", "وجبه", "مكونات"],
    tools: ["searchProducts"] },
  { id: "smartReorder", agent: "nawat", labelAr: "إعادة الطلب", status: "planned",
    keywords: ["اعد", "تاني", "زي المره", "طلبي الاخير", "المعتاد", "كل مره"], tools: [] },
  { id: "smartListManager", agent: "nawat", labelAr: "قوائم التسوق", status: "planned",
    keywords: ["قائمه", "ليسته", "تموين", "شهري", "ناقص البيت"], tools: [] },
  { id: "dealsAndAlternatives", agent: "nawat", labelAr: "العروض والبدائل", status: "partial",
    keywords: ["عرض", "عروض", "خصم", "ارخص", "بديل", "قارن", "مقارنه", "توفير"], tools: ["searchProducts"] },
  { id: "deliveryAndTracking", agent: "nawat", labelAr: "التوصيل والتتبع", status: "planned",
    keywords: ["طلبي", "اوردر", "يوصل", "توصيل", "تتبع", "امتي", "الطيار", "موعد"], tools: [] },
  { id: "walletAndLoyalty", agent: "nawat", labelAr: "المحفظة والولاء", status: "planned",
    keywords: ["محفظه", "رصيد", "نقاط", "ولاء", "كاش باك", "مكافا", "كوبون"], tools: [] },
  { id: "budgetShopper", agent: "nawat", labelAr: "التسوق بميزانية", status: "partial",
    keywords: ["ميزانيه", "جنيه", "بحدود", "في حدود", "سكر قليل", "دايت", "صحي", "سعرات"],
    tools: ["searchProducts"] },

  // ───────────── نبراس (الإدارة) — 10 ─────────────
  { id: "manageCatalog", agent: "nebras", labelAr: "الكتالوج", status: "live",
    keywords: ["منتج", "صنف", "قسم", "اقسام", "تصنيف", "اضف", "عدل", "احذف", "كتالوج"],
    tools: ["searchProducts", "getCategories", "manageProduct", "manageCategories"] },
  { id: "pricingManager", agent: "nebras", labelAr: "التسعير", status: "live",
    keywords: ["سعر", "اسعار", "ارفع", "خفض", "نسبه", "%", "تسعير"],
    tools: ["searchProducts", "getCategories", "bulkPriceUpdate", "rollbackLastAction"] },
  { id: "inventoryManager", agent: "nebras", labelAr: "المخزون", status: "partial",
    keywords: ["مخزون", "جرد", "نفاد", "ينفد", "نواقص", "راكد", "كميه", "نقل"],
    tools: ["searchProducts", "exportReportsAndAnalytics"] },
  { id: "supplierManager", agent: "nebras", labelAr: "الموردون والمشتريات", status: "planned",
    keywords: ["مورد", "موردين", "امر شراء", "شحنه", "استلام", "توريد"], tools: [] },
  { id: "fulfillmentManager", agent: "nebras", labelAr: "التجهيز والتوصيل", status: "partial",
    keywords: ["سائق", "مندوب", "توصيل", "منطقه", "مناطق", "تجهيز", "تجميع", "picker"],
    tools: ["manageDeliveryZones"] },
  { id: "promotionsManager", agent: "nebras", labelAr: "العروض والكوبونات", status: "partial",
    keywords: ["كوبون", "عرض", "عروض", "خصم", "باقه", "حمله", "اعلان"],
    tools: ["createCouponCampaign", "updateStoreAnnouncement", "sendAbandonedCartRecovery"] },
  { id: "customerManager", agent: "nebras", labelAr: "العملاء والولاء", status: "planned",
    keywords: ["عميل", "عملاء", "محفظه", "نقاط", "ولاء", "رصيد"], tools: [] },
  { id: "businessIntelligence", agent: "nebras", labelAr: "التحليلات", status: "live",
    keywords: ["تقرير", "مبيعات", "تحليل", "ارباح", "ربح", "توقع", "اداء", "ملخص", "kpi"],
    tools: ["exportReportsAndAnalytics"] },
  { id: "systemManager", agent: "nebras", labelAr: "النظام والصلاحيات", status: "partial",
    keywords: ["صلاحيه", "صلاحيات", "مدير", "ادمن", "دور", "تراجع", "الغي", "الوان", "تصميم", "اعدادات"],
    tools: ["rollbackLastAction", "manageUsersAndRoles", "updateThemeColors", "updateRawJsonMetadata", "updateLayoutConfig"] },
  { id: "mediaManager", agent: "nebras", labelAr: "الصور والوسائط", status: "partial",
    keywords: ["صوره", "صور", "بانر", "تصميم صوره", "ولد"], tools: ["generateProductImage", "uploadBannerImage"] },
];

/** العنقود الافتراضي عند عدم وضوح النية (قراءة فقط). */
const DEFAULT_CLUSTER: Record<AgentKind, string> = {
  nawat: "searchProducts",
  nebras: "businessIntelligence",
};

export interface RouteResult {
  clusters: string[];
  tools: string[];
}

/** يحدد العناقيد الأنسب للرسالة محلياً (صفر توكنز). */
export function routeIntent(message: string, agent: AgentKind): RouteResult {
  const text = normalizeArabic(message);
  const scored = TOOL_CLUSTERS.filter((c) => c.agent === agent && c.status !== "planned")
    .map((c) => ({ c, score: c.keywords.reduce((s, k) => s + (text.includes(normalizeArabic(k)) ? 1 : 0), 0) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_CLUSTERS)
    .map((x) => x.c);

  const chosen = scored.length ? scored : TOOL_CLUSTERS.filter((c) => c.id === DEFAULT_CLUSTER[agent]);
  const tools: string[] = [];
  for (const c of chosen) for (const t of c.tools) if (!tools.includes(t)) tools.push(t);
  return { clusters: chosen.map((c) => c.id), tools: tools.slice(0, MAX_ROUTED_TOOLS) };
}

/** يقلّص قائمة تعريفات الأدوات المسموحة إلى أدوات العناقيد المختارة فقط. */
export function filterDeclarationsByIntent<T extends { name?: string }>(
  declarations: T[],
  message: string,
  agent: AgentKind,
): T[] {
  const { tools } = routeIntent(message, agent);
  const picked = declarations.filter((d) => d.name && tools.includes(d.name));
  // أمان: لو الصلاحيات حجبت كل المختار، نرجع أدوات القراءة المتاحة الأصلية بحد أقصى.
  return picked.length ? picked : declarations.slice(0, MAX_ROUTED_TOOLS);
}
