import { SITE_URL, BRAND_NAME_AR } from "@/lib/brand";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { type Product } from "@/lib/cart-context";
import { useSettings } from "@/lib/settings-context";
import { useSearch } from "@/lib/search-context";
import { Banknote, PackageOpen, RotateCcw, SearchX, Sparkles, Truck } from "lucide-react";
import { StoreLogo } from "@/components/storefront/StoreLogo";
import { formatNumberAr } from "@/lib/format-ar";
import { HomePageSkeleton } from "@/components/storefront/Skeletons";
import { EmptyState } from "@/components/storefront/EmptyState";
import { SmartSearchBar } from "@/components/storefront/SmartSearchBar";
import { searchProductsFuzzy } from "@/lib/fuzzy-search";
import { useStoreProducts, useStoreCategories, useHeroBanners } from "@/lib/store-data-hooks";
import { ProductCard } from "@/components/storefront/ProductCard";
import { ProductModal } from "@/components/storefront/ProductModal";
import { CategoryGrid } from "@/components/storefront/CategoryGrid";
import { BuyAgainRail } from "@/components/storefront/BuyAgainRail";
import { OffersHeroSlider } from "@/components/storefront/OffersHeroSlider";
import {
  buildOffersSlides,
  getDiscountPercent,
  partitionCatalogSections,
  type OffersSlideAction,
} from "@/lib/storefront-home";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "سوبرماركت الوادي الأخضر — سلة البيت الكاملة" },
      {
        name: "description",
        content:
          "تصفّح أقسام سوبرماركت الوادي الأخضر وابحث في المنتجات المسجلة بالمتجر لتجهّز احتياجات البيت.",
      },
      { property: "og:title", content: "سوبرماركت الوادي الأخضر — احتياجات البيت" },
      {
        property: "og:description",
        content: "ابحث عن المنتجات المسجلة وتصفّح الأقسام المتاحة في المتجر.",
      },
      { property: "og:url", content: `${SITE_URL}/` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/` }],
  }),
  component: HomePage,
});

type CollectionMode = "remaining" | "all" | "offers";

export function HomePage() {
  const settings = useSettings();
  const navigate = useNavigate();
  const { query: searchQuery, setQuery: setSearchQuery } = useSearch();
  const { data: productsData, isLoading: isProductsLoading } = useStoreProducts();
  const { data: categoriesData } = useStoreCategories();
  const { data: bannersData } = useHeroBanners();

  const products = useMemo(() => productsData ?? [], [productsData]);
  const categories = useMemo(() => categoriesData ?? [], [categoriesData]);
  const heroBanners = useMemo(() => bannersData ?? [], [bannersData]);
  const loading = isProductsLoading && (!productsData || (productsData as Product[]).length === 0);

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedProductForModal, setSelectedProductForModal] = useState<Product | null>(null);
  const [collectionMode, setCollectionMode] = useState<CollectionMode>("remaining");

  useEffect(() => {
    const syncCategoryFromUrl = () => {
      const category = new URLSearchParams(window.location.search).get("category");
      if (category) setSelectedCategory(category);
    };
    syncCategoryFromUrl();
    window.addEventListener("popstate", syncCategoryFromUrl);
    return () => window.removeEventListener("popstate", syncCategoryFromUrl);
  }, []);

  const heroBanner = heroBanners[0];

  const handleSelectCategory = (categoryId: string | null) => {
    const target = categoryId ?? "all";
    setSelectedCategory(target);
    setCollectionMode("remaining");
    setSearchQuery("");

    const url = new URL(window.location.href);
    if (target !== "all") url.searchParams.set("category", target);
    else url.searchParams.delete("category");
    window.history.pushState({}, "", url.toString());

    if (target !== "all") {
      document.getElementById("supermarket-shelves")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSlideAction = (action: OffersSlideAction) => {
    if (action.type === "scroll") {
      document.getElementById(action.targetId)?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (action.type === "filter") {
      setSelectedCategory("all");
      setSearchQuery("");
      setCollectionMode(action.collection === "offers" ? "offers" : "all");
      document.getElementById("supermarket-shelves")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    navigate({ to: action.to });
  };

  const slides = useMemo(
    () =>
      buildOffersSlides({
        heroTitle: heroBanner?.title || settings.hero_title,
        heroSubtitle: heroBanner?.subtitle || settings.hero_subtitle,
        heroImageUrl: heroBanner?.image_url || settings.hero_image_url,
        heroBgImage: settings.hero_bg_image,
        pantryImageUrl: settings.cart_empty_bg,
        heroCtaText: heroBanner?.cta_text || settings.hero_cta_text,
        freeShippingThreshold: settings.free_shipping_threshold,
        products,
      }),
    [heroBanner, settings, products],
  );

  const productsCountByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const product of products) {
      if (product.category_id) {
        counts[product.category_id] = (counts[product.category_id] || 0) + 1;
      }
    }
    return counts;
  }, [products]);

  const { weeklyOffers, remainingCatalog } = useMemo(
    () => partitionCatalogSections(products, 5),
    [products],
  );

  const isBrowsing = !searchQuery.trim() && selectedCategory === "all";
  const showOffersStrip = isBrowsing && collectionMode === "remaining" && weeklyOffers.length > 0;

  const filteredProducts = useMemo(() => {
    let list = products;

    if (selectedCategory !== "all") {
      const category = categories.find(
        (item) => item.id === selectedCategory || item.slug === selectedCategory,
      );
      const targetId = category ? category.id : selectedCategory;
      const targetSlug = category ? category.slug : selectedCategory;
      list = list.filter(
        (product) =>
          product.category_id === targetId ||
          product.category_id === targetSlug ||
          product.category_id === selectedCategory,
      );
    }

    if (searchQuery.trim()) list = searchProductsFuzzy(list, searchQuery, 0.35);
    return list;
  }, [products, selectedCategory, searchQuery, categories]);

  const hasOffers = useMemo(
    () => products.some((product) => getDiscountPercent(product) > 0),
    [products],
  );

  const displayedGridProducts = useMemo(() => {
    if (!isBrowsing) return filteredProducts;
    if (collectionMode === "offers") {
      return products.filter((product) => getDiscountPercent(product) > 0);
    }
    if (collectionMode === "all") {
      return products;
    }
    // Default view: exclude items already highlighted in the weeklyOffers strip -> zero duplication
    return remainingCatalog;
  }, [isBrowsing, filteredProducts, collectionMode, products, remainingCatalog]);

  const activeCategoryName = useMemo(() => {
    if (selectedCategory === "all") return null;
    const cat = categories.find((c) => c.id === selectedCategory || c.slug === selectedCategory);
    return cat ? cat.name_ar || cat.name : null;
  }, [selectedCategory, categories]);

  if (loading) return <HomePageSkeleton />;

  const contentEyebrow = searchQuery.trim()
    ? "بحث المتجر"
    : activeCategoryName
      ? "منتجات القسم"
      : collectionMode === "offers"
        ? "تخفيضات المتجر"
        : showOffersStrip
          ? "باقي التشكيلة"
          : "كل التشكيلة";

  const contentLabel = searchQuery.trim()
    ? "نتائج البحث"
    : activeCategoryName
      ? activeCategoryName
      : collectionMode === "offers"
        ? "جميع العروض المتوفرة"
        : showOffersStrip
          ? "تصفّح بقية منتجات المتجر"
          : "جميع منتجات المتجر";

  const filterBtnClass = (active: boolean) =>
    `min-h-10 rounded-xl px-4 text-xs font-bold transition-colors sm:text-sm ${
      active
        ? "bg-primary text-primary-foreground shadow-xs"
        : "border border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary"
    }`;

  return (
    <main
      className="min-h-screen overflow-x-hidden bg-background text-right text-foreground"
      dir="rtl"
    >
      {/* ١. البحث الموحد على الجوال + سلايدر العروض المتحرك */}
      <section className="px-3 pt-3 sm:px-6 sm:pt-5">
        <div id="mobile-unified-search" className="mx-auto mb-3 max-w-[1320px] md:hidden">
          <SmartSearchBar placeholder="ابحث عن منتج أو اكتب طلبك…" />
        </div>

        <OffersHeroSlider slides={slides} onAction={handleSlideAction} />

        {/* شريط المزايا المدمج النظيف (بدون تكديس كبسولات) */}
        <div
          aria-label="مميزات التسوق"
          className="mx-auto mt-3 flex max-w-[1320px] flex-wrap items-center justify-center gap-x-6 gap-y-2 border-b border-border/60 pb-3 text-xs font-semibold text-muted-foreground sm:justify-start sm:text-sm"
        >
          <span className="inline-flex items-center gap-1.5 text-foreground">
            <Truck className="h-4 w-4 text-primary" aria-hidden="true" />
            توصيل سريع خلال ٤٥ دقيقة
          </span>
          <span className="inline-flex items-center gap-1.5 text-foreground">
            <Banknote className="h-4 w-4 text-primary" aria-hidden="true" />
            الدفع عند الاستلام أو أونلاين
          </span>
          <span className="inline-flex items-center gap-1.5 text-foreground">
            <RotateCcw className="h-4 w-4 text-primary" aria-hidden="true" />
            استبدال واسترجاع فوري
          </span>
        </div>
      </section>

      <BuyAgainRail onOpenProduct={setSelectedProductForModal} />

      <div className="mx-auto max-w-[1320px] px-3 sm:px-6">
        {/* ٢. أقسام المتجر */}
        <section id="home-departments" className="mt-6 sm:mt-8">
          <CategoryGrid
            categories={categories}
            active={selectedCategory}
            onSelect={handleSelectCategory}
            productsCountByCategory={productsCountByCategory}
          />
        </section>

        {/* ٣. عروض الأسبوع المميزة (تظهر فقط في التصفح العام بدون تكرار في الشبكة أدناه) */}
        {showOffersStrip && (
          <section
            id="weekly-offers"
            className="mt-9 sm:mt-11"
            aria-labelledby="weekly-offers-title"
          >
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-primary sm:text-sm">وفّر أكثر اليوم</span>
                <h2
                  id="weekly-offers-title"
                  className="mt-1 text-xl font-bold text-foreground sm:text-3xl"
                >
                  عروض الأسبوع المميزة
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setCollectionMode("offers")}
                className="text-xs font-bold text-primary hover:underline sm:text-sm"
              >
                عرض كل التخفيضات ←
              </button>
            </div>
            <div className="no-scrollbar -mx-3 flex snap-x gap-3 overflow-x-auto px-3 pb-2 sm:gap-4">
              {weeklyOffers.map((product) => (
                <div key={product.id} className="w-[46%] shrink-0 snap-start sm:w-[225px]">
                  <ProductCard product={product} onOpen={setSelectedProductForModal} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* شريط حالة البحث */}
        {searchQuery.trim() && (
          <div
            className="mt-7 flex items-center justify-between rounded-xl border border-border bg-secondary px-4 py-3 text-xs sm:text-sm"
            role="status"
          >
            <span>
              نتائج البحث عن: <strong>«{searchQuery}»</strong> (
              {formatNumberAr(filteredProducts.length)} منتج)
            </span>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="px-2 font-bold text-primary hover:underline"
            >
              مسح البحث
            </button>
          </div>
        )}

        {/* ٤. شبكة المنتجات الرئيسية (بدون تكرار العناصر المعروضة في العروض المميزة) */}
        <section id="supermarket-shelves" className="mt-9 scroll-mt-20 sm:mt-11">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="text-xs font-bold text-primary sm:text-sm">{contentEyebrow}</span>
              <h2 className="mt-1 text-xl font-bold text-foreground sm:text-3xl">{contentLabel}</h2>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                {formatNumberAr(displayedGridProducts.length)} منتج
              </p>
            </div>

            {isBrowsing && (
              <div className="flex flex-wrap gap-2" role="group" aria-label="تصفية التشكيلة">
                <button
                  type="button"
                  onClick={() => setCollectionMode("remaining")}
                  aria-pressed={collectionMode === "remaining"}
                  className={filterBtnClass(collectionMode === "remaining")}
                >
                  الموصى بها ({formatNumberAr(remainingCatalog.length)})
                </button>
                <button
                  type="button"
                  onClick={() => setCollectionMode("all")}
                  aria-pressed={collectionMode === "all"}
                  className={filterBtnClass(collectionMode === "all")}
                >
                  كل المنتجات ({formatNumberAr(products.length)})
                </button>
                {hasOffers && (
                  <button
                    type="button"
                    onClick={() => setCollectionMode("offers")}
                    aria-pressed={collectionMode === "offers"}
                    className={filterBtnClass(collectionMode === "offers")}
                  >
                    كل العروض
                  </button>
                )}
              </div>
            )}
          </div>

          {displayedGridProducts.length === 0 ? (
            <EmptyState
              icon={
                searchQuery ? (
                  <SearchX className="h-8 w-8 text-offer" />
                ) : (
                  <PackageOpen className="h-8 w-8 text-primary" />
                )
              }
              title={
                searchQuery
                  ? "لم نجد نتائج مطابقة"
                  : collectionMode === "offers"
                    ? "لا توجد عروض حاليًا"
                    : "لا توجد منتجات في هذا القسم"
              }
              description={
                searchQuery
                  ? `لم نجد منتجات تطابق «${searchQuery}». جرّب اسمًا آخر أو اختر قسمًا.`
                  : "ستظهر المنتجات هنا عند إضافتها إلى المتجر."
              }
              action={
                searchQuery || collectionMode !== "remaining" || selectedCategory !== "all" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory("all");
                      setCollectionMode("remaining");
                      setSearchQuery("");
                    }}
                    className="min-h-11 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground"
                  >
                    عرض كل المنتجات
                  </button>
                ) : undefined
              }
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
              {displayedGridProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onOpen={setSelectedProductForModal}
                />
              ))}
            </div>
          )}
        </section>

        {/* دعوة مساعد التسوّق نواة */}
        <section className="mt-12 flex flex-col items-start justify-between gap-5 rounded-3xl border border-border bg-secondary/70 px-6 py-7 sm:flex-row sm:items-center sm:px-9">
          <div>
            <h2 className="text-xl font-bold text-foreground sm:text-2xl">عندك قائمة مشتريات؟</h2>
            <p className="mt-1.5 max-w-lg text-xs leading-6 text-muted-foreground sm:text-sm">
              اكتب طلبات البيت بكلماتك لنواة، وستجهز لك السلة بأفضل الأصناف المتوفرة فورًا.
            </p>
          </div>
          <Link
            to="/assistant"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-primary bg-card px-5 text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            <span>جرّب نواة الآن</span>
          </Link>
        </section>
      </div>

      <footer className="mt-12 bg-emerald-950 text-emerald-50">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-5 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <StoreLogo
              name={settings.site_name || BRAND_NAME_AR}
              logoUrl={settings.logo_url}
              inverted
            />
            <p className="mt-2 text-xs text-emerald-100/80 sm:text-sm">
              كل احتياجات بيتك الطازجة واليومية في مكان واحد.
            </p>
          </div>
          <nav
            className="flex flex-wrap gap-5 text-xs font-bold sm:text-sm"
            aria-label="روابط الموقع"
          >
            <a href="#home-departments" className="hover:underline">
              الأقسام
            </a>
            <Link to="/categories" className="hover:underline">
              كل الأقسام
            </Link>
            <Link to="/assistant" className="hover:underline">
              نواة
            </Link>
          </nav>
          <span className="text-xs text-emerald-100/75">
            © ٢٠٢٦ {settings.site_name || BRAND_NAME_AR}
          </span>
        </div>
      </footer>

      <ProductModal
        product={selectedProductForModal}
        onClose={() => setSelectedProductForModal(null)}
      />
    </main>
  );
}
