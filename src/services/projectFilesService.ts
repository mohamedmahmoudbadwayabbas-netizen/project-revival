// Service to index, read, modify, and manage all files in the project workspace

export interface ProjectFileMeta {
  path: string;
  name: string;
  category: "routes" | "components" | "services" | "lib" | "types" | "styles" | "config";
  extension: "tsx" | "ts" | "css" | "json" | "md";
  description: string;
  lineCount?: number;
  lastModified?: string;
  content?: string;
}

// Built-in registry of key project files with their descriptions and default source representations
export const PROJECT_FILES_REGISTRY: ProjectFileMeta[] = [
  // ─── ROUTES ───
  {
    path: "/src/routes/index.tsx",
    name: "index.tsx",
    category: "routes",
    extension: "tsx",
    description:
      "الصفحة الرئيسية للمتجر (Storefront Homepage) — تضم البانرات، الفلاش سيل، شبكة الإعلانات، والأقسام الديناميكية",
    lineCount: 380,
  },
  {
    path: "/src/routes/cart.tsx",
    name: "cart.tsx",
    category: "routes",
    extension: "tsx",
    description:
      "صفحة سلة التسوق وإتمام الطلب (Cart & Checkout) — ملخص السلة، عناوين العميل الافتراضية، كوبونات الخصم، وتحديد الموقع على الخريطة",
    lineCount: 450,
  },
  {
    path: "/src/routes/driver.tsx",
    name: "driver.tsx",
    category: "routes",
    extension: "tsx",
    description:
      "بوابة وتطبيق مندوب التوصيل (Driver Portal) — الخريطة التفاعلية، التوجيه ثنائي المراحل، تتبع GPS، إثبات التسليم والتخزين دون إنترنت",
    lineCount: 520,
  },
  {
    path: "/src/routes/categories.tsx",
    name: "categories.tsx",
    category: "routes",
    extension: "tsx",
    description:
      "صفحة استعراض كافة تصنيفات المتجر (Categories Browsing) — تصفية متقدمة وتصنيف المنتجات",
    lineCount: 260,
  },
  {
    path: "/src/routes/products.$productId.tsx",
    name: "products.$productId.tsx",
    category: "routes",
    extension: "tsx",
    description:
      "صفحة تفاصيل المنتج (Product Detail Page) — معرض الصور، اختيار الوزن/الكمية، التقييمات، وبدائل المنتجات",
    lineCount: 340,
  },
  {
    path: "/src/routes/admin.copilot.tsx",
    name: "admin.copilot.tsx",
    category: "routes",
    extension: "tsx",
    description:
      "لوحة تحكم الذكاء الاصطناعي وجيميناي (Al-Wadi AI & Code Studio) — محادثة، تعديل ملفات، وبحث السوق",
    lineCount: 650,
  },
  {
    path: "/src/routes/admin.orders.tsx",
    name: "admin.orders.tsx",
    category: "routes",
    extension: "tsx",
    description:
      "لوحة إدارة الطلبات (Admin Orders Dashboard) — تتبع حالات الطلبات، الفواتير، وتعيين المندوبين",
    lineCount: 410,
  },
  {
    path: "/src/routes/admin.products.tsx",
    name: "admin.products.tsx",
    category: "routes",
    extension: "tsx",
    description:
      "لوحة إدارة المنتجات والمخزون (Products & Inventory) — إضافة وتعديل المنتجات، الأسعار، وتنبيهات نفاد المخزون",
    lineCount: 480,
  },
  {
    path: "/src/routes/admin.delivery-zones.tsx",
    name: "admin.delivery-zones.tsx",
    category: "routes",
    extension: "tsx",
    description:
      "إدارة مناطق ورسوم التوصيل (Delivery Zones & Pricing) — رسم النطاقات الجغرافية وتحديد أسعار التوصيل",
    lineCount: 310,
  },
  {
    path: "/src/routes/admin.settings.tsx",
    name: "admin.settings.tsx",
    category: "routes",
    extension: "tsx",
    description:
      "إعدادات المتجر العامة والفرع (Store Settings) — بيانات الاتصال، أوقات العمل، وخيارات الدفع",
    lineCount: 290,
  },

  // ─── STOREFRONT COMPONENTS ───
  {
    path: "/src/components/storefront/Header.tsx",
    name: "Header.tsx",
    category: "components",
    extension: "tsx",
    description:
      "شريط التنقل العلوي للمتجر (Store Header) — الشعار، البحث الذكي، زر السلة التفاعلي، وقائمة الحساب",
    lineCount: 230,
  },
  {
    path: "/src/components/storefront/StoreGoogleMapsWidget.tsx",
    name: "StoreGoogleMapsWidget.tsx",
    category: "components",
    extension: "tsx",
    description:
      "ويدجت خرائط جوجل التفاعلي (Google Maps Location Picker) — تحديد العنوان بدقة، التثبيت، والحفظ كموقع افتراضي",
    lineCount: 390,
  },
  {
    path: "/src/components/storefront/HeroCarousel.tsx",
    name: "HeroCarousel.tsx",
    category: "components",
    extension: "tsx",
    description: "سلايدر البانرات الإعلانية التفاعلي في الهيدر (Hero Banner Slider)",
    lineCount: 180,
  },
  {
    path: "/src/components/storefront/ProductCard.tsx",
    name: "ProductCard.tsx",
    category: "components",
    extension: "tsx",
    description:
      "كارت المنتج في شبكة العرض (Storefront Product Card) — إضافة سريعة للسلة، شارات الخصم، وتحديد الأوزان",
    lineCount: 210,
  },
  {
    path: "/src/components/storefront/CartDrawer.tsx",
    name: "CartDrawer.tsx",
    category: "components",
    extension: "tsx",
    description:
      "درج السلة الجانبي السريع (Side Cart Drawer) — مراجعة الأصناف فورياً وحساب التكلفة",
    lineCount: 220,
  },
  {
    path: "/src/components/storefront/DynamicAnnouncementBar.tsx",
    name: "DynamicAnnouncementBar.tsx",
    category: "components",
    extension: "tsx",
    description: "شريط التنبيهات والعروض الترويجية في أعلى المتجر (Announcement Top Bar)",
    lineCount: 140,
  },
  {
    path: "/src/components/storefront/DynamicMiniAdsGrid.tsx",
    name: "DynamicMiniAdsGrid.tsx",
    category: "components",
    extension: "tsx",
    description: "شبكة الإعلانات المصغرة الترويجية (Mini Ads & Banners Grid)",
    lineCount: 170,
  },
  {
    path: "/src/components/storefront/DynamicFlashSaleTimer.tsx",
    name: "DynamicFlashSaleTimer.tsx",
    category: "components",
    extension: "tsx",
    description: "قسم عداد الفلاش سيل التنازلي التفاعلي (Flash Sale Countdown Section)",
    lineCount: 160,
  },
  {
    path: "/src/components/storefront/BottomNav.tsx",
    name: "BottomNav.tsx",
    category: "components",
    extension: "tsx",
    description: "شريط التنقل السفلي للأجهزة المحمولة (Mobile Bottom Navigation Bar)",
    lineCount: 120,
  },

  // ─── ADMIN COMPONENTS ───
  {
    path: "/src/components/admin/ShopLivePreview.tsx",
    name: "ShopLivePreview.tsx",
    category: "components",
    extension: "tsx",
    description: "المعاينة الحية التفاعلية للمتجر في لوحة التحكم (Storefront Live Preview Iframe)",
    lineCount: 260,
  },
  {
    path: "/src/components/admin/AbandonedCartAgent.tsx",
    name: "AbandonedCartAgent.tsx",
    category: "components",
    extension: "tsx",
    description: "وكيل استرداد السلات المتروكة الذكي عبر واتساب (WhatsApp Cart Recovery Agent)",
    lineCount: 240,
  },
  {
    path: "/src/components/admin/ExecutiveSummaryWidget.tsx",
    name: "ExecutiveSummaryWidget.tsx",
    category: "components",
    extension: "tsx",
    description: "ويدجت الموجز التنفيذي والرؤى الذكية للمتجر (Executive AI Insights Widget)",
    lineCount: 190,
  },
  {
    path: "/src/components/admin/SmartProductCopywriterModal.tsx",
    name: "SmartProductCopywriterModal.tsx",
    category: "components",
    extension: "tsx",
    description:
      "نافذة كاتب المحتوى الإعلاني والأوصاف الذكية للمنتجات (AI Product Copywriter Modal)",
    lineCount: 230,
  },

  // ─── SERVICES & LIBS ───
  {
    path: "/src/services/gemini36Service.ts",
    name: "gemini36Service.ts",
    category: "services",
    extension: "ts",
    description:
      "محرك الذكاء الاصطناعي وجيميناي المتكامل (Gemini AI Engine & Search Grounding Service)",
    lineCount: 1720,
  },
  {
    path: "/src/lib/cart-context.tsx",
    name: "cart-context.tsx",
    category: "lib",
    extension: "tsx",
    description: "إدارة حالة سلة المشتريات والطلبات (Cart State Context & Storage Management)",
    lineCount: 210,
  },
  {
    path: "/src/lib/layout-config-context.tsx",
    name: "layout-config-context.tsx",
    category: "lib",
    extension: "tsx",
    description:
      "إدارة حالة وتخطيط المتجر وثيم الألوان الديناميكي (Store Layout & Theme Palette Context)",
    lineCount: 180,
  },
  {
    path: "/src/types/layout-config.ts",
    name: "layout-config.ts",
    category: "types",
    extension: "ts",
    description:
      "تعريفات الأنواع لتخطيط المتجر والألوان والأقسام (Store Layout TypeScript Interfaces & Types)",
    lineCount: 160,
  },
  {
    path: "/src/styles.css",
    name: "styles.css",
    category: "styles",
    extension: "css",
    description: "ملف التنسيقات والأنماط العامة للمشروع وقواعد Tailwind CSS ومصفوفات الألوان",
    lineCount: 280,
  },
];

// Storage key for user-applied file modifications in the workspace

/**
 * The registry is metadata/navigation only. It is NOT a project filesystem.
 * Real file reads/writes must go through the server-side Project Engine.
 */
export function searchProjectFiles(query = "", category?: string): ProjectFileMeta[] {
  const cleanQ = query.trim().toLowerCase();
  return PROJECT_FILES_REGISTRY.filter((file) => {
    const matchesCategory = !category || category === "all" || file.category === category;
    if (!matchesCategory) return false;
    if (!cleanQ) return true;
    return (
      file.name.toLowerCase().includes(cleanQ) ||
      file.path.toLowerCase().includes(cleanQ) ||
      file.description.toLowerCase().includes(cleanQ)
    );
  });
}
