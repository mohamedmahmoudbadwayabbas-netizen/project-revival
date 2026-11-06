export type ThemeColorPalette =
  | "emerald"
  | "dark_green"
  | "forest_dark"
  | "amber_warm"
  | "blue_modern"
  | "rose_delight"
  | "violet_luxury"
  | "slate_minimal";

export interface MiniAdItem {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  imageUrl: string;
  linkUrl: string;
  badge?: string;
  accentColor?: string;
}

export interface MiniAdsSectionConfig {
  enabled: boolean;
  title: string;
  subtitle?: string;
  columns: 2 | 3 | 4;
  items: MiniAdItem[];
}

export interface AnnouncementBarConfig {
  enabled: boolean;
  text: string;
  linkText?: string;
  linkUrl?: string;
  badge?: string;
  bgColor?: string;
  textColor?: string;
  /** Optional alias used by AI tools when setting a raw link. */
  link?: string;
}

export interface FlashSaleTimerConfig {
  enabled: boolean;
  title: string;
  subtitle?: string;
  endTime: string; // ISO string or relative time
  discountBadge: string;
  categorySlug?: string;
  /** Optional promo code surfaced by AI marketing tools. */
  couponCode?: string;
  /** Optional short discount tag label. */
  discountTag?: string;
}

export interface HeroSlideConfig {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  image_url?: string;
  button_text?: string;
  link_url?: string;
  /** Aliases used by AI tools / newer editors. */
  imageUrl?: string;
  ctaText?: string;
  ctaLink?: string;
  align?: "right" | "left" | "center";
}

export interface HeroSectionConfig {
  enabled: boolean;
  autoSlideIntervalSeconds: number;
  slides: HeroSlideConfig[];
}

export interface FeaturedCategoriesConfig {
  enabled: boolean;
  title: string;
  maxItems: number;
  selectedCategoryIds?: string[];
  layoutMode: "grid" | "carousel" | "pills";
}

export interface BestSellersConfig {
  enabled: boolean;
  title: string;
  limit: number;
  badge: string;
}

export interface CookingTipsBannerConfig {
  enabled: boolean;
  title: string;
  quote: string;
  author: string;
  buttonText: string;
}

export type LayoutSectionKey =
  | "announcementBar"
  | "heroBanner"
  | "flashSaleTimer"
  | "miniAdsGrid"
  | "featuredCategories"
  | "bestSellersSection"
  | "cookingTipsBanner"
  | "latestProducts";

export interface StoreLayoutConfig {
  version: number;
  lastUpdated: string;
  theme: {
    palette: ThemeColorPalette;
    headerStyle: "floating" | "solid" | "bordered";
    cardRadius: "none" | "sm" | "md" | "lg" | "xl" | "full";
    darkModeDefault: boolean;
    /** Optional overrides written by AI theme tools. */
    primaryColor?: string;
    accentColor?: string;
    mode?: "light" | "dark";
  };
  sectionsOrder: LayoutSectionKey[];
  announcementBar: AnnouncementBarConfig;
  heroBanner: HeroSectionConfig;
  flashSaleTimer: FlashSaleTimerConfig;
  miniAdsGrid: MiniAdsSectionConfig;
  featuredCategories: FeaturedCategoriesConfig;
  bestSellersSection: BestSellersConfig;
  cookingTipsBanner: CookingTipsBannerConfig;
}

export const DEFAULT_LAYOUT_CONFIG: StoreLayoutConfig = {
  version: 1,
  lastUpdated: new Date().toISOString(),
  theme: {
    palette: "emerald",
    headerStyle: "floating",
    cardRadius: "lg",
    darkModeDefault: false,
  },
  sectionsOrder: [
    "announcementBar",
    "heroBanner",
    "flashSaleTimer",
    "miniAdsGrid",
    "featuredCategories",
    "bestSellersSection",
    "cookingTipsBanner",
    "latestProducts",
  ],
  announcementBar: {
    enabled: true,
    text: "🚀 توصيل مجاني للطلبات فوق 300 ج.م في نفس اليوم!",
    badge: "عرض خاص",
    linkText: "تسوّق الآن",
    linkUrl: "/categories",
    bgColor: "from-emerald-600 to-teal-700",
    textColor: "text-white",
  },
  heroBanner: {
    enabled: true,
    autoSlideIntervalSeconds: 6,
    slides: [
      {
        id: "hero-1",
        title: "سمارت ستور — هايبر ماركت أونلاين",
        subtitle:
          "تسوّق جميع سلع البقالة، اللحوم البلدية الطازجة، الأجبان والمنظفات بأسعار الجملة التنافسية وتوصيل فوري لباب منزلك.",
        badge: "طازج يومياً 🌿",
        image_url:
          "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1400&q=80",
        button_text: "تصفّح العروض الآن 🛒",
        link_url: "/categories",
      },
      {
        id: "hero-2",
        title: "قسم اللحوم والدواجن الطازجة 🥩",
        subtitle: "لحوم بلدية مذبوحة ومجهزة يومياً بأعلى معايير النظافة والرقابة البيطرية الصارمة.",
        badge: "ذبح يومي مضمون ✨",
        image_url:
          "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=1400&q=80",
        button_text: "تسوّق اللحوم البلدي 🥩",
        link_url: "/categories",
      },
    ],
  },
  flashSaleTimer: {
    enabled: true,
    title: "⚡ عروض الساعات الذهبية — وفر حتى 40%",
    subtitle: "تخفيضات محدودة تنتهي في منتصف الليل على منتجات مختارة",
    endTime: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
    discountBadge: "وفر 40%",
    categorySlug: "dairy",
  },
  miniAdsGrid: {
    enabled: true,
    title: "عروض وإعلانات سريعة 🛍️",
    subtitle: "عروض حصرية مختارة لأجلك اليوم",
    columns: 3,
    items: [
      {
        id: "ad-dairy",
        title: "منتجات الألبان والأجبان 🧀",
        subtitle: "جبن بلدي، قشطة، ولبن طازج بخصم 20%",
        tag: "خصم 20%",
        badge: "طازج يومياً",
        imageUrl:
          "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80",
        linkUrl: "/categories",
        accentColor: "from-amber-500/20 to-orange-500/20",
      },
      {
        id: "ad-staples",
        title: "عروض التموين وتوفير الشهر 🥫🍚",
        subtitle: "أفضل أسعار الزيوت، الأرز، المكرونات والمعلبات",
        tag: "توفير حتى 30%",
        badge: "عروض السوبرماركت",
        imageUrl:
          "https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=600&q=80",
        linkUrl: "/categories",
        accentColor: "from-emerald-500/20 to-teal-500/20",
      },
      {
        id: "ad-meat",
        title: "لحوم مفرومة وكفتة بلدي 🥩",
        subtitle: "مجهزة طازجة حسب رغبتك بتتبيلة خاصة",
        tag: "بلدي 100%",
        badge: "عرض الشواء",
        imageUrl:
          "https://images.unsplash.com/photo-1588168333986-5078d3ae3976?auto=format&fit=crop&w=600&q=80",
        linkUrl: "/categories",
        accentColor: "from-rose-500/20 to-red-500/20",
      },
    ],
  },
  featuredCategories: {
    enabled: true,
    title: "التصنيفات الأساسية الكبرى 🏷️",
    maxItems: 6,
    layoutMode: "grid",
  },
  bestSellersSection: {
    enabled: true,
    title: "المنتجات الأكثر مبيعاً وعروضاً 🔥",
    limit: 5,
    badge: "الأكثر طلباً",
  },
  cookingTipsBanner: {
    enabled: true,
    title: "نصيحة الشيف لتحضير الوجبة المثالية 👨‍🍳",
    quote: "للحصول على لحم بلدي طري ومميز، اتركه يصل لدرجة حرارة الغرفة قبل الطهي لمدة 15 دقيقة!",
    author: "شيف سمارت ستور",
    buttonText: "تصفّح منتجات الطهي 🍳",
  },
};
