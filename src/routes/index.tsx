import { SITE_URL, BRAND_NAME_AR } from "@/lib/brand";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { type Product } from "@/lib/cart-context";
import { useSettings } from "@/lib/settings-context";
import { useSearch } from "@/lib/search-context";
import {
  ArrowLeft,
  Banknote,
  PackageOpen,
  RotateCcw,
  SearchX,
  Sparkles,
  Truck,
} from "lucide-react";
import heroLuxe from "@/assets/hero-luxe.jpg";
import { StoreLogo } from "@/components/storefront/StoreLogo";
import { formatNumberAr } from "@/lib/format-ar";
import { HomePageSkeleton } from "@/components/storefront/Skeletons";
import { EmptyState } from "@/components/storefront/EmptyState";
import { SmartSearchBar } from "@/components/storefront/SmartSearchBar";
import { searchProductsFuzzy } from "@/lib/fuzzy-search";
import {
  useStoreProducts,
  useStoreCategories,
  useHeroBanners,
} from "@/lib/store-data-hooks";
import { ProductCard } from "@/components/storefront/ProductCard";
import { ProductModal } from "@/components/storefront/ProductModal";
import { CategoryGrid } from "@/components/storefront/CategoryGrid";
import { StickyCartBar } from "@/components/storefront/StickyCartBar";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "سوبرماركت الوادي الأخضر — سلة البيت الكاملة تبدأ بفكرة" },
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

export function HomePage() {
  const settings = useSettings();
  const { query: searchQuery, setQuery: setSearchQuery } = useSearch();
  const { data: productsData, isLoading: isProductsLoading } = useStoreProducts();
  const { data: categoriesData } = useStoreCategories();
  const { data: bannersData } = useHeroBanners();

  const products = useMemo(() => productsData ?? [], [productsData]);
  const categories = useMemo(() => categoriesData ?? [], [categoriesData]);
  const heroBanners = useMemo(() => bannersData ?? [], [bannersData]);
  const loading =
    isProductsLoading && (!productsData || (productsData as Product[]).length === 0);

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedProductForModal, setSelectedProductForModal] = useState<Product | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<"all" | "offers" | "featured">(
    "all",
  );

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
    const heroSubtitle =
    "اكتب اسم منتج أو جزءًا من قائمتك، أو ابدأ من أحد أقسام الهايبر ماركت.";

  const handleSelectCategory = (categoryId: string | null) => {
    const target = categoryId ?? "all";
    setSelectedCategory(target);
    setSelectedCollection("all");
    setSearchQuery("");

    const url = new URL(window.location.href);
    if (target !== "all") url.searchParams.set("category", target);
    else url.searchParams.delete("category");
    window.history.pushState({}, "", url.toString());

    if (target !== "all") {
      document.getElementById("supermarket-shelves")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const productsCountByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const product of products) {
      if (product.category_id) {
        counts[product.category_id] = (counts[product.category_id] || 0) + 1;
      }
    }
    return counts;
  }, [products]);

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
    () =>
      filteredProducts.some(
        (product) =>
          product.old_price != null && product.old_price > product.price_per_unit,
      ),
    [filteredProducts],
  );
  const hasFeatured = useMemo(
    () => filteredProducts.some((product) => product.is_featured),
    [filteredProducts],
  );

  const homeProducts = useMemo(() => {
    if (selectedCategory !== "all" || searchQuery.trim()) return filteredProducts;
    if (selectedCollection === "offers") {
      return filteredProducts.filter(
        (product) =>
          product.old_price != null && product.old_price > product.price_per_unit,
      );
    }
    if (selectedCollection === "featured") {
      return filteredProducts.filter((product) => product.is_featured);
    }
    return filteredProducts;
  }, [filteredProducts, selectedCollection, selectedCategory, searchQuery]);

  if (loading) return <HomePageSkeleton />;

  const contentLabel = searchQuery.trim()
    ? "نتائج البحث"
    : selectedCategory !== "all"
      ? "منتجات القسم"
      : selectedCollection === "offers"
        ? "منتجات عليها سعر سابق مسجل"
        : selectedCollection === "featured"
          ? "اختيارات المتجر"
          : "تصفّح منتجات المتجر";

  const isBrowsing = !searchQuery.trim() && selectedCategory === "all";
  const bestSellers = products.filter((p) => p.is_top_seller || p.is_popular || p.is_featured).slice(0, 12);
  const weeklyOffers = products
    .filter((p) => p.old_price != null && p.old_price > p.price_per_unit)
    .slice(0, 12);

  const chip = (active: boolean) =>
    `min-h-11 rounded-full px-5 text-sm font-bold transition-colors ${
      active
        ? "bg-primary text-primary-foreground"
        : "bg-card text-muted-foreground border border-border hover:border-primary/40 hover:text-primary"
    }`;

  const Row = ({ id, eyebrow, title, items }: { id: string; eyebrow: string; title: string; items: Product[] }) =>
    items.length === 0 ? null : (
      <section className="mt-12" aria-labelledby={id}>
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <span className="text-sm font-bold text-primary">{eyebrow}</span>
            <h2 id={id} className="mt-1 text-2xl font-bold text-primary-dark sm:text-3xl">{title}</h2>
          </div>
        </div>
        <div className="no-scrollbar -mx-3 flex snap-x gap-3 overflow-x-auto px-3 pb-2 sm:gap-4">
          {items.map((product) => (
            <div key={product.id} className="w-[46%] shrink-0 snap-start sm:w-[230px]">
              <ProductCard product={product} onOpen={setSelectedProductForModal} />
            </div>
          ))}
        </div>
      </section>
    );

  return (
    <main className="min-h-screen overflow-x-hidden bg-background pb-28 text-right text-foreground md:pb-0" dir="rtl">
      {/* PROMO HERO — compact on phones, products show early */}
      <section className="px-3 pt-3 sm:px-6 sm:pt-6" aria-labelledby="home-hero-title">
        <div className="mx-auto max-w-[1320px] md:hidden">
          <SmartSearchBar placeholder="ابحث عن منتج أو اكتب قائمة مشترياتك…" />
        </div>
        <div className="relative mx-auto mt-3 max-w-[1320px] overflow-hidden rounded-3xl bg-fresh text-primary-foreground shadow-elegant md:mt-0">
          <img
            src={heroBanner?.image_url || settings.hero_image_url || heroLuxe}
            alt="تشكيلة من البقالة والمنتجات الطازجة"
            width={1600}
            height={1008}
            fetchPriority="high"
            decoding="async"
            className="absolute inset-y-0 left-0 h-full w-[55%] object-cover md:w-1/2"
            style={{ maskImage: "linear-gradient(to left, transparent, black 45%)", WebkitMaskImage: "linear-gradient(to left, transparent, black 45%)" }}
          />
          <div className="relative flex min-h-[190px] max-w-[62%] flex-col justify-center gap-2 p-5 sm:min-h-[320px] sm:gap-4 sm:p-10 md:max-w-[50%]">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-[11px] font-black text-accent-foreground sm:text-sm">
              <Truck className="h-3.5 w-3.5" aria-hidden="true" /> توصيل في ٤٥ دقيقة
            </span>
            <h1 id="home-hero-title" className="text-xl font-black leading-snug sm:text-4xl lg:text-5xl">
              {heroBanner?.title || "طازج كل يوم.. لباب بيتك"}
            </h1>
            <p className="hidden text-base leading-8 opacity-90 sm:block">{heroSubtitle}</p>
            <div className="hidden max-w-md md:block">
              <SmartSearchBar placeholder="ابحث عن منتج أو اكتب قائمة مشترياتك…" />
            </div>
            <button
              type="button"
              onClick={() => document.getElementById("supermarket-shelves")?.scrollIntoView({ behavior: "smooth" })}
              className="mt-1 inline-flex min-h-11 w-fit items-center gap-2 rounded-xl bg-background px-5 text-sm font-black text-primary shadow-card transition-transform active:scale-95 sm:text-base"
            >
              {heroBanner?.cta_text || settings.hero_cta_text || "تسوّق الآن"}
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      {/* TRUST PILLS — one compact row */}
      <section className="mx-auto mt-3 max-w-[1320px] px-3 sm:px-6" aria-label="مميزات التسوق">
        <ul className="no-scrollbar flex gap-2 overflow-x-auto">
          {[
            { icon: Truck, t: "توصيل سريع" },
            { icon: Banknote, t: "الدفع عند الاستلام" },
            { icon: RotateCcw, t: "استبدال سهل" },
          ].map(({ icon: Icon, t }) => (
            <li key={t} className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-xs font-bold text-primary-dark">
              <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
              {t}
            </li>
          ))}
        </ul>
      </section>

      <div className="mx-auto max-w-[1320px] px-3 sm:px-6">
        <section id="home-departments" className="mt-6 sm:mt-10">
          <CategoryGrid
            categories={categories}
            active={selectedCategory}
            onSelect={handleSelectCategory}
            productsCountByCategory={productsCountByCategory}
          />
        </section>

        {isBrowsing && <Row id="best-sellers" eyebrow="يحبها عملاؤنا" title="الأكثر طلبًا" items={bestSellers} />}
        {isBrowsing && <Row id="weekly-offers" eyebrow="وفّر أكثر" title="عروض الأسبوع" items={weeklyOffers} />}

        {searchQuery.trim() && (
          <div className="mt-8 flex items-center justify-between rounded-xl border border-border bg-secondary px-5 py-3 text-sm" role="status">
            <span>
              نتائج البحث عن: <strong>«{searchQuery}»</strong> ({formatNumberAr(filteredProducts.length)} منتج)
            </span>
            <button type="button" onClick={() => setSearchQuery("")} className="min-h-11 px-2 font-bold text-primary">
              مسح البحث
            </button>
          </div>
        )}

        <section id="supermarket-shelves" className="mt-12 scroll-mt-24">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="text-sm font-bold text-primary">كل التشكيلة</span>
              <h2 className="mt-1 text-2xl font-bold text-primary-dark sm:text-3xl">{contentLabel}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{formatNumberAr(homeProducts.length)} منتج</p>
            </div>
            {isBrowsing && (
              <div className="flex flex-wrap gap-2" role="group" aria-label="تصفية المنتجات">
                <button type="button" onClick={() => setSelectedCollection("all")} aria-pressed={selectedCollection === "all"} className={chip(selectedCollection === "all")}>الكل</button>
                {hasOffers && (
                  <button type="button" onClick={() => setSelectedCollection("offers")} aria-pressed={selectedCollection === "offers"} className={chip(selectedCollection === "offers")}>العروض</button>
                )}
                {hasFeatured && (
                  <button type="button" onClick={() => setSelectedCollection("featured")} aria-pressed={selectedCollection === "featured"} className={chip(selectedCollection === "featured")}>اختيارات المتجر</button>
                )}
              </div>
            )}
          </div>

          {homeProducts.length === 0 ? (
            <EmptyState
              icon={searchQuery ? <SearchX className="h-8 w-8 text-offer" /> : <PackageOpen className="h-8 w-8 text-primary" />}
              title={searchQuery ? "لم نجد نتائج مطابقة" : selectedCollection === "offers" ? "لا توجد عروض حاليًا" : selectedCollection === "featured" ? "لا توجد اختيارات مميزة حاليًا" : "لا توجد منتجات في هذا القسم"}
              description={searchQuery ? `لم نجد منتجات تطابق «${searchQuery}». جرّب اسمًا آخر أو اختر قسمًا.` : "ستظهر المنتجات هنا عند إضافتها إلى المتجر."}
              action={
                searchQuery || selectedCollection !== "all" || selectedCategory !== "all" ? (
                  <button
                    type="button"
                    onClick={() => { setSelectedCategory("all"); setSelectedCollection("all"); setSearchQuery(""); }}
                    className="min-h-11 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground"
                  >
                    عرض كل المنتجات
                  </button>
                ) : undefined
              }
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
              {homeProducts.map((product) => (
                <ProductCard key={product.id} product={product} onOpen={setSelectedProductForModal} />
              ))}
            </div>
          )}
        </section>

        {/* ASSISTANT CTA — light */}
        <section className="mt-14 flex flex-col items-start justify-between gap-5 rounded-3xl border border-border bg-secondary px-6 py-8 sm:flex-row sm:items-center sm:px-10">
          <div>
            <h2 className="text-2xl font-bold text-primary-dark">عندك قائمة مشتريات؟</h2>
            <p className="mt-2 max-w-lg text-sm leading-7 text-muted-foreground">اكتبها لنواة بكلماتك، وهي تقترح لك المنتجات المناسبة من المتجر.</p>
          </div>
          <Link to="/assistant" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-primary bg-card px-6 text-base font-bold text-primary hover:bg-background">
            <Sparkles className="h-4 w-4" aria-hidden="true" /> جرّب نواة
          </Link>
        </section>
      </div>

      <footer className="mt-14 bg-primary-dark text-primary-foreground">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <StoreLogo name={settings.site_name || BRAND_NAME_AR} inverted />
            <p className="mt-2 text-sm text-primary-foreground/75">كل احتياجات بيتك في مكان واحد.</p>
          </div>
          <nav className="flex flex-wrap gap-5 text-sm font-bold" aria-label="روابط الموقع">
            <a href="#home-departments" className="hover:underline">الأقسام</a>
            <Link to="/assistant" className="hover:underline">نواة</Link>
          </nav>
          <span className="text-xs text-primary-foreground/70">© ٢٠٢٦ {settings.site_name || BRAND_NAME_AR}</span>
        </div>
      </footer>

      <StickyCartBar />
      <ProductModal product={selectedProductForModal} onClose={() => setSelectedProductForModal(null)} />
    </main>
  );
}
