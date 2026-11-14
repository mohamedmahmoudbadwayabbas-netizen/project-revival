import type { Product } from "@/lib/cart-context";
import { formatNumberAr, toArabicDigits } from "@/lib/format-ar";

export type OffersSlideAction =
  | { type: "scroll"; targetId: string }
  | { type: "filter"; collection: "offers" | "all" }
  | { type: "route"; to: "/assistant" | "/categories" };

export type OffersSlide = {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  ctaText: string;
  imageUrl: string;
  accentTone: "emerald" | "amber" | "teal";
  action: OffersSlideAction;
};

export type CatalogPartition = {
  weeklyOffers: Product[];
  remainingCatalog: Product[];
};

/** Returns rounded discount percentage when `old_price > price_per_unit`, else 0. */
export function getDiscountPercent(product: Pick<Product, "price_per_unit" | "old_price">): number {
  if (!product.old_price || product.old_price <= product.price_per_unit || product.old_price <= 0) {
    return 0;
  }
  return Math.round(((product.old_price - product.price_per_unit) / product.old_price) * 100);
}

/** Filters out broken/external Unsplash URLs in favor of local storefront assets. */
export function resolveSafeImageUrl(
  url: string | null | undefined,
  fallbackLocalPath: string,
): string {
  if (!url) return fallbackLocalPath;
  const trimmed = url.trim();
  if (!trimmed || trimmed.includes("images.unsplash.com")) {
    return fallbackLocalPath;
  }
  return trimmed;
}

const PACK_REGEX_AR =
  /([\d٠-٩]+(?:[.,٫][\d٠-٩]+)?)\s*(كجم|كيلو|جم|جرام|لتر|مل|قطع|قطعة|علبة|عبوة|باكت|أكياس|كيس)/i;
const PACK_REGEX_EN = /(\d+(?:\.\d+)?)\s*(kg|g|l|ml|pcs?)\b/i;

const EN_UNIT_MAP: Record<string, string> = {
  kg: "كجم",
  g: "جم",
  l: "لتر",
  ml: "مل",
  pc: "قطعة",
  pcs: "قطع",
};

/**
 * Infers an accurate Arabic unit label from explicit DB metadata or product title.
 * Avoids showing generic "قطعة" on rice sacks, fresh meat, produce, cartons, or 1L bottles.
 */
export function inferUnitLabel(
  product: Pick<Product, "name" | "name_ar" | "is_by_weight" | "unit_label">,
): string {
  if (product.is_by_weight) return "كجم";

  const explicit = product.unit_label?.trim();
  if (explicit && explicit !== "قطعة") {
    return toArabicDigits(explicit);
  }

  const labelSource = `${product.name_ar || ""} ${product.name || ""}`.trim();

  const arMatch = labelSource.match(PACK_REGEX_AR);
  if (arMatch) {
    return toArabicDigits(`${arMatch[1]} ${arMatch[2]}`);
  }

  const enMatch = labelSource.match(PACK_REGEX_EN);
  if (enMatch) {
    const unit = EN_UNIT_MAP[enMatch[2].toLowerCase()] || enMatch[2];
    return toArabicDigits(`${enMatch[1]} ${unit}`);
  }

  if (/(?:^|\s)كرتونة(?=\s|$)/i.test(labelSource)) {
    return "كرتونة";
  }
  if (/(?:^|\s)علبة(?=\s|$)/i.test(labelSource)) {
    return "علبة";
  }
  if (/(?:^|\s)برطمان(?=\s|$)/i.test(labelSource)) {
    return "برطمان";
  }

  if (
    /(?:^|\s)(?:ال)?(?:لحم|لحوم|شيش|طماطم|تفاح|خضروات|فواكه|فراخ|دجاج|براميلي|بصل|بطاطس|برتقال|رمان|عنب|سماق|قرنفل|حبهان|حلبة|مغات|شطة|ليمون|كزبرة)(?=\s|$)/i.test(
      labelSource,
    )
  ) {
    return toArabicDigits("١ كجم");
  }
  if (/(?:^|\s)(?:ال)?(?:زيت|حليب|لبن|عصير)(?=\s|$)/i.test(labelSource)) {
    return toArabicDigits("١ لتر");
  }
  if (
    /(?:^|\s)(?:ال)?(?:بهار|بهارات|كمون|بن|قهوة|مكسرات|توابل|خلطة|منظف)(?=\s|$)/i.test(labelSource)
  ) {
    return "عبوة";
  }

  return explicit || "قطعة";
}

/**
 * Splits active products into non-overlapping `weeklyOffers` (top discounted/featured items)
 * and `remainingCatalog` so the homepage never duplicates the exact same items back-to-back.
 */
export function partitionCatalogSections(products: Product[], maxOffers = 5): CatalogPartition {
  if (products.length === 0) {
    return { weeklyOffers: [], remainingCatalog: [] };
  }

  const scoredOffers = products
    .filter((p) => getDiscountPercent(p) > 0 || Boolean(p.is_featured))
    .map((p, idx) => ({
      product: p,
      discount: getDiscountPercent(p),
      featuredBonus: p.is_featured ? 1 : 0,
      idx,
    }))
    .sort((a, b) => {
      if (b.discount !== a.discount) return b.discount - a.discount;
      if (b.featuredBonus !== a.featuredBonus) return b.featuredBonus - a.featuredBonus;
      return a.idx - b.idx;
    });

  // Only reserve items in the top offers strip when there are enough remaining items
  // to keep the main catalog grid meaningful, OR cap offers at maxOffers when catalog allows.
  const maxAllowedInStrip =
    products.length <= 4 ? 0 : Math.min(maxOffers, Math.max(1, products.length - 4));

  const weeklyOffers = scoredOffers.slice(0, maxAllowedInStrip).map((entry) => entry.product);
  const offerIds = new Set(weeklyOffers.map((p) => p.id));
  const remainingCatalog = products.filter((p) => !offerIds.has(p.id));

  return { weeklyOffers, remainingCatalog };
}

export function buildOffersSlides(params: {
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  heroImageUrl?: string | null;
  heroBgImage?: string | null;
  pantryImageUrl?: string | null;
  heroCtaText?: string | null;
  freeShippingThreshold?: number | null;
  products: Product[];
}): OffersSlide[] {
  const {
    heroTitle,
    heroSubtitle,
    heroImageUrl,
    heroBgImage,
    pantryImageUrl,
    heroCtaText,
    freeShippingThreshold,
    products,
  } = params;

  const maxDiscount = products.reduce(
    (best, product) => Math.max(best, getDiscountPercent(product)),
    0,
  );
  const shippingLimit =
    typeof freeShippingThreshold === "number" && freeShippingThreshold > 0
      ? freeShippingThreshold
      : 300;

  const firstImage = resolveSafeImageUrl(heroImageUrl, "/images/hero/fresh-produce.jpg");
  const dealsImage = resolveSafeImageUrl(heroBgImage, "/images/hero/weekly-deals.jpg");
  const pantryImage = resolveSafeImageUrl(pantryImageUrl, "/images/hero/pantry-bundle.jpg");

  return [
    {
      id: "slide-fresh-delivery",
      badge: "توصيل سريع خلال ٤٥ دقيقة",
      title: heroTitle?.trim() || "طازج كل يوم.. لباب بيتك",
      subtitle:
        heroSubtitle?.trim() ||
        "خضروات وفواكه طازجة، لحوم بلدي، وكل مستلزمات البيت بأعلى جودة في الوادي الأخضر.",
      ctaText: heroCtaText?.trim() || "تسوّق الآن",
      imageUrl: firstImage,
      accentTone: "emerald",
      action: { type: "scroll", targetId: "home-departments" },
    },
    {
      id: "slide-weekly-deals",
      badge: maxDiscount > 0 ? `خصومات حقيقية حتى ${formatNumberAr(maxDiscount)}٪` : "عروض الأسبوع",
      title: "وفّر على سلتك مع عروض الأسبوع",
      subtitle: "تخفيضات مباشرة على الأرز، الزيوت، الألبان، والمكسرات طوال الأسبوع.",
      ctaText: "استعرض العروض",
      imageUrl: dealsImage,
      accentTone: "amber",
      action: { type: "filter", collection: "offers" },
    },
    {
      id: "slide-free-shipping",
      badge: `شحن مجاني فوق ${formatNumberAr(shippingLimit)} ج.م`,
      title: "مقاضي الشهر كاملة في طلب واحد",
      subtitle: "اطلب احتياجات العائلة بضغطة واحدة مع الدفع عند الاستلام أو أونلاين بسهولة.",
      ctaText: "تصفّح التشكيلة",
      imageUrl: pantryImage,
      accentTone: "teal",
      action: { type: "scroll", targetId: "supermarket-shelves" },
    },
    {
      id: "slide-nawat-assistant",
      badge: "تجربة تسوّق أسرع",
      title: "عندك قائمة مشتريات؟ دع نواة تجهزها لك",
      subtitle: "اكتب طلباتك بالعامية أو بأي ترتيب، وسيقوم مساعد التسوق بجمع السلة فورًا.",
      ctaText: "جرّب نواة الآن",
      imageUrl: firstImage,
      accentTone: "emerald",
      action: { type: "route", to: "/assistant" },
    },
  ];
}
