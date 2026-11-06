import { SITE_URL } from "@/lib/brand";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { Leaf, LayoutGrid, Search, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { EmptyState } from "@/components/storefront/EmptyState";
import { SkeletonBox } from "@/components/storefront/Skeletons";
import { cn } from "@/lib/utils";
import { useStoreCategories } from "@/lib/store-data-hooks";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "دليل الأقسام — سوبرماركت الوادي الأخضر" },
      { name: "description", content: "تصفّح أقسام متجر سوبرماركت الوادي الأخضر." },
      { property: "og:title", content: "دليل الأقسام — سوبرماركت الوادي الأخضر" },
      { property: "og:url", content: `${SITE_URL}/categories` },
      { name: "twitter:title", content: "دليل الأقسام — سوبرماركت الوادي الأخضر" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/categories` }],
  }),
  component: CategoriesPage,
});

export function CategoriesPage() {
  const navigate = useNavigate();
  const { data: categories = [], isLoading } = useStoreCategories();
  const [searchFilter, setSearchFilter] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const tabScrollRef = useRef<HTMLDivElement>(null);

  const filteredCategories = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();
    return categories.filter((cat) => {
      if (activeTab !== "all" && cat.id !== activeTab) return false;
      if (!q) return true;
      return [cat.name, cat.name_ar, cat.slug].some((value) => value?.toLowerCase().includes(q));
    });
  }, [categories, searchFilter, activeTab]);

  const scrollTabs = (direction: "left" | "right") => {
    tabScrollRef.current?.scrollBy({
      left: direction === "left" ? -250 : 250,
      behavior: "smooth",
    });
  };

  return (
    <div dir="rtl" className="min-h-screen bg-background pb-28 text-right">
      <h1 className="sr-only">دليل أقسام متجر الوادي الأخضر</h1>
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-white shadow-sm">
              <Leaf className="h-4.5 w-4.5" />
            </div>
            <div>
              <span className="block font-display text-base font-black leading-tight">سوبرماركت الوادي الأخضر</span>
              <span className="text-[10px] font-bold text-primary dark:text-emerald-400">الأقسام</span>
            </div>
          </Link>
          <Link to="/" className="flex items-center gap-1 rounded-full bg-primary px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-primary/90">
            <span>الرئيسية</span><ChevronLeft className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="relative border-t border-border/60 bg-card/60">
          <div className="mx-auto flex max-w-7xl items-center px-2">
            <button onClick={() => scrollTabs("right")} className="z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border bg-card" aria-label="التمرير لليمين"><ChevronRight className="h-4 w-4" /></button>
            <div ref={tabScrollRef} className="flex w-full items-center gap-2 overflow-x-auto px-2 py-2.5 scrollbar-none">
              <button onClick={() => setActiveTab("all")} className={cn("flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold", activeTab === "all" ? "bg-primary text-white" : "bg-secondary text-foreground")}>
                <Sparkles className="h-3.5 w-3.5" /><span>كل الأقسام ({categories.length})</span>
              </button>
              {categories.map((cat) => (
                <button key={cat.id} onClick={() => setActiveTab(cat.id)} className={cn("flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-bold", activeTab === cat.id ? "border-primary bg-primary text-white" : "border-border/70 bg-card text-foreground")}>
                  {cat.image_url ? <img src={cat.image_url} alt="" className="h-5 w-5 shrink-0 rounded-full object-cover" /> : <span>🌿</span>}
                  <span>{cat.name_ar || cat.name}</span>
                </button>
              ))}
            </div>
            <button onClick={() => scrollTabs("left")} className="z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border bg-card" aria-label="التمرير لليسار"><ChevronLeft className="h-4 w-4" /></button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6">
        <div className="flex flex-col items-center justify-between gap-4 rounded-3xl border border-border/80 bg-card p-4 shadow-xs sm:flex-row">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute start-3.5 top-3 h-4 w-4 text-primary" />
            <input value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)} placeholder="ابحث في الأقسام..." className="h-10 w-full rounded-2xl border border-border/80 bg-background pe-4 ps-10 text-xs font-medium focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
            <span className="text-xs font-bold text-muted-foreground">عرض {filteredCategories.length} قسم</span>
            {activeTab !== "all" && <button onClick={() => setActiveTab("all")} className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-primary">عرض الكل</button>}
          </div>
        </div>

        {isLoading && categories.length === 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <SkeletonBox key={i} className="h-64 rounded-3xl" />)}</div>
        ) : filteredCategories.length === 0 ? (
          <EmptyState icon={<LayoutGrid className="h-8 w-8 text-primary" />} title="لم نجد أقسامًا مطابقة" description="جرّب البحث بكلمة أخرى أو اعرض جميع الأقسام." action={<button onClick={() => { setSearchFilter(""); setActiveTab("all"); }} className="rounded-full bg-primary px-5 py-2 text-xs font-bold text-white">عرض جميع الأقسام</button>} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filteredCategories.map((cat) => (
              <div key={cat.id} className="group relative flex flex-col overflow-hidden rounded-3xl border border-border/80 bg-card shadow-xs transition-all hover:-translate-y-1 hover:border-primary/60 hover:shadow-xl">
                <div className="relative h-44 w-full overflow-hidden bg-secondary">
                  {cat.image_url ? <img src={cat.image_url} alt={cat.name_ar || cat.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <div className="grid h-full w-full place-items-center text-5xl">🌿</div>}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <button onClick={() => navigate({ to: "/", search: { category: cat.id } as never })} className="absolute end-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-white/20 text-white backdrop-blur-md hover:bg-white/40" title={`تصفح قسم ${cat.name_ar || cat.name}`}><ChevronLeft className="h-4 w-4" /></button>
                  <div className="absolute bottom-3 start-3 end-3 z-10 text-white">
                    <h3 className="font-display text-base font-black">{cat.name_ar || cat.name}</h3>
                    {cat.name_ar && cat.name_ar !== cat.name && <p className="text-[10px] font-medium text-white/80">{cat.name}</p>}
                  </div>
                </div>
                <div className="flex flex-1 items-end p-3.5">
                  <button onClick={() => navigate({ to: "/", search: { category: cat.id } as never })} className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-primary/20 bg-primary/10 py-2 text-xs font-black text-primary transition-all hover:bg-primary hover:text-white dark:text-emerald-300">
                    تصفّح منتجات القسم <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

