import { useState, useMemo } from "react";
import {
  SlidersHorizontal,
  Search,
  X,
  Sparkles,
  Flame,
  Star,
  Scale,
  Package,
  RotateCcw,
  ChevronDown,
  Check,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface FilterState {
  searchQuery: string;
  categoryId: string;
  selectedBrand: string;
  priceRange: [number, number];
  onlyOnSale: boolean;
  onlyTopSellers: boolean;
  onlyByWeight: boolean;
  sortBy: "popular" | "rating" | "price_asc" | "price_desc" | "newest";
}

const POPULAR_BRANDS = [
  "جميع الماركات",
  "مزارع الوادي 🌿",
  "المراعي",
  "جهينة",
  "حلواني إخوان",
  "الضحى",
  "دومتي",
  "كارفور",
  "إيزيس",
];

interface AdvancedProductFilterProps {
  categories?: { id: string; name: string; icon?: string | null }[];
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  maxPriceLimit?: number;
  totalResultsCount?: number;
  className?: string;
}

export function AdvancedProductFilter({
  categories = [],
  filters,
  onFilterChange,
  maxPriceLimit = 1000,
  totalResultsCount,
  className = "",
}: AdvancedProductFilterProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.searchQuery.trim()) count++;
    if (filters.categoryId && filters.categoryId !== "all") count++;
    if (filters.selectedBrand && filters.selectedBrand !== "جميع الماركات") count++;
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < maxPriceLimit) count++;
    if (filters.onlyOnSale) count++;
    if (filters.onlyTopSellers) count++;
    if (filters.onlyByWeight) count++;
    return count;
  }, [filters, maxPriceLimit]);

  const handleReset = () => {
    onFilterChange({
      searchQuery: "",
      categoryId: "all",
      selectedBrand: "جميع الماركات",
      priceRange: [0, maxPriceLimit],
      onlyOnSale: false,
      onlyTopSellers: false,
      onlyByWeight: false,
      sortBy: "popular",
    });
  };

  const update = (partial: Partial<FilterState>) => {
    onFilterChange({ ...filters, ...partial });
  };

  const FilterBody = () => (
    <div className="space-y-5 text-start" dir="rtl">
      {/* البحث السريع */}
      <div className="space-y-1.5">
        <label className="text-xs font-black text-foreground">بحث بالاسم أو الكلمة المفتاحية</label>
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={filters.searchQuery}
            onChange={(e) => update({ searchQuery: e.target.value })}
            placeholder="مثال: لحم بلدي، أرز، زيت زيتون..."
            className="h-10 ps-9 pe-8 rounded-xl text-xs font-bold bg-background"
          />
          {filters.searchQuery && (
            <button
              onClick={() => update({ searchQuery: "" })}
              className="absolute end-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* اختيار القسم */}
      {categories.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-xs font-black text-foreground">القسم الرئيسي</label>
          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
            <button
              type="button"
              onClick={() => update({ categoryId: "all" })}
              className={cn(
                "px-2.5 py-1 rounded-xl text-[11px] font-black transition-all cursor-pointer",
                filters.categoryId === "all" || !filters.categoryId
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-secondary/70 hover:bg-secondary text-foreground",
              )}
            >
              الكل
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => update({ categoryId: cat.id })}
                className={cn(
                  "px-2.5 py-1 rounded-xl text-[11px] font-black transition-all cursor-pointer flex items-center gap-1",
                  filters.categoryId === cat.id
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-secondary/70 hover:bg-secondary text-foreground",
                )}
              >
                {cat.icon && <span>{cat.icon}</span>}
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* الماركة والبراند */}
      <div className="space-y-1.5">
        <label className="text-xs font-black text-foreground">الماركة أو المورد</label>
        <div className="flex flex-wrap gap-1.5">
          {POPULAR_BRANDS.map((brand) => (
            <button
              key={brand}
              type="button"
              onClick={() => update({ selectedBrand: brand })}
              className={cn(
                "px-2.5 py-1 rounded-xl text-[11px] font-black transition-all cursor-pointer",
                filters.selectedBrand === brand ||
                  (!filters.selectedBrand && brand === "جميع الماركات")
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-secondary/70 hover:bg-secondary text-foreground",
              )}
            >
              {brand}
            </button>
          ))}
        </div>
      </div>

      {/* نطاق السعر */}
      <div className="space-y-2 rounded-2xl border border-border bg-secondary/30 p-3.5">
        <div className="flex items-center justify-between text-xs font-black">
          <span>نطاق السعر (ج.م)</span>
          <span className="text-primary font-black">
            {filters.priceRange[0]} ج.م — {filters.priceRange[1]} ج.م
          </span>
        </div>
        <Slider
          defaultValue={[filters.priceRange[0], filters.priceRange[1]]}
          value={[filters.priceRange[0], filters.priceRange[1]]}
          min={0}
          max={maxPriceLimit}
          step={5}
          onValueChange={(val) => update({ priceRange: [val[0], val[1]] })}
          className="my-3"
        />
        <div className="flex items-center justify-between text-[10px] text-muted-foreground font-bold">
          <span>0 ج.م</span>
          <span>{maxPriceLimit} ج.م</span>
        </div>
      </div>

      {/* فلاتر سريعة بنقرة واحدة */}
      <div className="space-y-2">
        <label className="text-xs font-black text-foreground">خصائص وعروض إضافية</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => update({ onlyOnSale: !filters.onlyOnSale })}
            className={cn(
              "flex items-center justify-between p-2.5 rounded-xl border text-xs font-black transition-all cursor-pointer",
              filters.onlyOnSale
                ? "border-accent bg-accent/10 text-accent"
                : "border-border bg-card hover:bg-secondary/50 text-foreground",
            )}
          >
            <span className="flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5 text-accent" />
              <span>عروض خاصة</span>
            </span>
            {filters.onlyOnSale && <Check className="h-3.5 w-3.5 text-accent" />}
          </button>

          <button
            type="button"
            onClick={() => update({ onlyTopSellers: !filters.onlyTopSellers })}
            className={cn(
              "flex items-center justify-between p-2.5 rounded-xl border text-xs font-black transition-all cursor-pointer",
              filters.onlyTopSellers
                ? "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                : "border-border bg-card hover:bg-secondary/50 text-foreground",
            )}
          >
            <span className="flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
              <span>الأكثر مبيعاً</span>
            </span>
            {filters.onlyTopSellers && <Check className="h-3.5 w-3.5 text-amber-600" />}
          </button>

          <button
            type="button"
            onClick={() => update({ onlyByWeight: !filters.onlyByWeight })}
            className={cn(
              "flex items-center justify-between p-2.5 rounded-xl border text-xs font-black transition-all cursor-pointer col-span-2",
              filters.onlyByWeight
                ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-border bg-card hover:bg-secondary/50 text-foreground",
            )}
          >
            <span className="flex items-center gap-1.5">
              <Scale className="h-3.5 w-3.5 text-emerald-600" />
              <span>أصناف طازجة تباع بالوزن (كجم / جرام)</span>
            </span>
            {filters.onlyByWeight && <Check className="h-3.5 w-3.5 text-emerald-600" />}
          </button>
        </div>
      </div>

      {/* الترتيب حسب */}
      <div className="space-y-1.5">
        <label className="text-xs font-black text-foreground">ترتيب المنتجات حسب</label>
        <Select value={filters.sortBy} onValueChange={(val: any) => update({ sortBy: val })}>
          <SelectTrigger className="h-10 rounded-xl font-bold text-xs bg-background">
            <SelectValue placeholder="اختر الترتيب" />
          </SelectTrigger>
          <SelectContent className="rounded-xl" dir="rtl">
            <SelectItem value="popular" className="text-xs font-bold">
              الأكثر شعبية وإقبالاً
            </SelectItem>
            <SelectItem value="rating" className="text-xs font-bold">
              الأعلى تقييماً ⭐
            </SelectItem>
            <SelectItem value="price_asc" className="text-xs font-bold">
              السعر: من الأقل إلى الأعلى
            </SelectItem>
            <SelectItem value="price_desc" className="text-xs font-bold">
              السعر: من الأعلى إلى الأقل
            </SelectItem>
            <SelectItem value="newest" className="text-xs font-bold">
              الأحدث وصولاً
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {activeFiltersCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="w-full text-xs font-black text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1.5 rounded-xl h-9"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          إعادة ضبط جميع الفلاتر ({activeFiltersCount})
        </Button>
      )}
    </div>
  );

  return (
    <div className={cn("w-full space-y-3", className)}>
      {/* شريط الفلترة الأفقي السريع لسطح المكتب والموبايل */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-border bg-card p-3 shadow-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          {/* زر الفلتر في الموبايل */}
          <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-xl border-border font-black text-xs gap-1.5 relative shrink-0"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                <span>الفلاتر المتقدمة</span>
                {activeFiltersCount > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-[9px] font-black text-primary-foreground">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[320px] sm:w-[380px] overflow-y-auto p-5">
              <SheetHeader className="text-start border-b border-border/60 pb-3 mb-4">
                <SheetTitle className="font-display text-base font-black flex items-center justify-between">
                  <span>الفلاتر المتقدمة للمنتجات</span>
                  {activeFiltersCount > 0 && (
                    <Badge variant="secondary" className="text-[10px] font-bold">
                      {activeFiltersCount} نشط
                    </Badge>
                  )}
                </SheetTitle>
              </SheetHeader>
              <FilterBody />
              <SheetFooter className="mt-6">
                <Button
                  onClick={() => setIsMobileOpen(false)}
                  className="w-full rounded-xl font-black text-xs h-10"
                >
                  تطبيق الفلاتر وعرض النتائج{" "}
                  {totalResultsCount !== undefined ? `(${totalResultsCount})` : ""}
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>

          {/* خانة بحث سريعة */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={filters.searchQuery}
              onChange={(e) => update({ searchQuery: e.target.value })}
              placeholder="ابحث بالاسم أو الصنف..."
              className="h-9 ps-8 pe-7 rounded-xl text-xs font-bold bg-secondary/40 border-border"
            />
            {filters.searchQuery && (
              <button
                onClick={() => update({ searchQuery: "" })}
                className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* فلاتر سريعة أفقية */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => update({ onlyOnSale: !filters.onlyOnSale })}
            className={cn(
              "h-8 px-2.5 rounded-lg text-[11px] font-black transition-all shrink-0 flex items-center gap-1 cursor-pointer border",
              filters.onlyOnSale
                ? "border-accent bg-accent/10 text-accent"
                : "border-border bg-secondary/50 text-muted-foreground hover:text-foreground",
            )}
          >
            <Flame className="h-3 w-3 text-accent" />
            <span>عروض خاصة</span>
          </button>

          <button
            type="button"
            onClick={() => update({ onlyTopSellers: !filters.onlyTopSellers })}
            className={cn(
              "h-8 px-2.5 rounded-lg text-[11px] font-black transition-all shrink-0 flex items-center gap-1 cursor-pointer border",
              filters.onlyTopSellers
                ? "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                : "border-border bg-secondary/50 text-muted-foreground hover:text-foreground",
            )}
          >
            <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
            <span>الأكثر مبيعاً</span>
          </button>

          <Select value={filters.sortBy} onValueChange={(val: any) => update({ sortBy: val })}>
            <SelectTrigger className="h-8 w-[140px] rounded-lg text-[11px] font-bold border-border bg-secondary/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end" dir="rtl" className="rounded-xl">
              <SelectItem value="popular" className="text-xs font-bold">
                الأكثر شعبية
              </SelectItem>
              <SelectItem value="rating" className="text-xs font-bold">
                الأعلى تقييماً ⭐
              </SelectItem>
              <SelectItem value="price_asc" className="text-xs font-bold">
                الأقل سعراً
              </SelectItem>
              <SelectItem value="price_desc" className="text-xs font-bold">
                الأعلى سعراً
              </SelectItem>
              <SelectItem value="newest" className="text-xs font-bold">
                الأحدث
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
