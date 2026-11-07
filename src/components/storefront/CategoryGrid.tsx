import {
  Grid2X2,
  Layers,
  Drumstick,
  Beef,
  Leaf,
  Wheat,
  Milk,
  SprayCan,
  Croissant,
  Apple,
  Baby,
  Sparkles,
  Coffee,
  Candy,
  Fish,
  Snowflake,
  CupSoda,
  type LucideIcon,
} from "lucide-react";
import { formatNumberAr } from "@/lib/format-ar";

const ICON_RULES: [RegExp, LucideIcon][] = [
  [/دواجن|فراخ|دجاج|poultry|chicken/i, Drumstick],
  [/لحوم|لحم|meat/i, Beef],
  [/عطار|توابل|بهار|spice/i, Leaf],
  [/بقال|أرز|rice|grocer/i, Wheat],
  [/ألبان|البان|لبن|جبن|dairy/i, Milk],
  [/منظف|تنظيف|منزل|clean/i, SprayCan],
  [/مخبوز|خبز|bakery/i, Croissant],
  [/خضر|فاكه|produce|fruit/i, Apple],
  [/أطفال|طفل|baby/i, Baby],
  [/عناية|شخصي|care/i, Sparkles],
  [/قهوة|شاي|coffee|tea/i, Coffee],
  [/حلو|شوكولا|snack|candy/i, Candy],
  [/سمك|أسماك|بحري|fish/i, Fish],
  [/مجمد|frozen/i, Snowflake],
  [/مشروب|عصير|drink/i, CupSoda],
];
const FALLBACK_ICONS: LucideIcon[] = [Layers, Wheat, Leaf, Apple, Coffee, Candy];
const TILE_TONES = [
  "tile-green",
  "tile-red",
  "tile-blue",
  "tile-orange",
  "tile-lime",
  "tile-teal",
  "tile-purple",
];
function categoryIcon(name: string, index: number): LucideIcon {
  return (
    ICON_RULES.find(([re]) => re.test(name))?.[1] ?? FALLBACK_ICONS[index % FALLBACK_ICONS.length]
  );
}
import { cn } from "@/lib/utils";
import { SkeletonBox } from "@/components/storefront/Skeletons";

export type Category = {
  id: string;
  name: string;
  name_ar?: string | null;
  slug: string;
  image_url?: string | null;
};

interface CategoryGridProps {
  categories: Category[];
  active: string | null;
  onSelect: (id: string | null) => void;
  productsCountByCategory?: Record<string, number>;
  isLoading?: boolean;
}

export function CategoryGrid({
  categories,
  active,
  onSelect,
  productsCountByCategory = {},
  isLoading = false,
}: CategoryGridProps) {
  const isAllSelected = !active || active === "all";

  return (
    <section aria-labelledby="category-grid-title">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <span className="text-sm font-bold text-primary">تسوّق حسب القسم</span>
          <h2
            id="category-grid-title"
            className="mt-1 text-2xl font-bold text-primary-dark sm:text-3xl"
          >
            أقسام المتجر
          </h2>
        </div>
        {!isAllSelected && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-primary hover:border-primary/40"
          >
            كل الأقسام
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex gap-4 overflow-hidden" aria-label="تحميل الأقسام">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonBox key={i} className="h-28 w-24 shrink-0 rounded-full" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="flex items-center gap-4 rounded-2xl border border-dashed border-border bg-card p-6">
          <Grid2X2 className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
          <div>
            <h3 className="text-base">الأقسام قيد التجهيز</h3>
            <p className="text-xs text-muted-foreground">
              ستظهر الأقسام هنا بعد إضافتها إلى المتجر.
            </p>
          </div>
        </div>
      ) : (
        <div className="no-scrollbar -mx-3 flex snap-x gap-4 overflow-x-auto px-3 pb-2 sm:gap-6">
          {categories.map((category, index) => {
            const isActive = active === category.id || active === category.slug;
            const count =
              productsCountByCategory[category.id] ?? productsCountByCategory[category.slug] ?? 0;
            const name = category.name_ar || category.name;
            const Icon = categoryIcon(`${name} ${category.slug}`, index);
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => onSelect(isActive ? null : category.id)}
                aria-pressed={isActive}
                aria-label={`تصفّح قسم ${name}`}
                className="group flex w-24 shrink-0 snap-start flex-col items-center gap-2 sm:w-28"
              >
                <span
                  className={cn(
                    "grid h-24 w-24 place-items-center overflow-hidden rounded-full border-2 bg-card p-1 shadow-card transition-all duration-300 group-hover:-translate-y-1 sm:h-28 sm:w-28",
                    isActive
                      ? "border-primary"
                      : "border-transparent group-hover:border-primary/30",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-full w-full place-items-center overflow-hidden rounded-full",
                      TILE_TONES[index % TILE_TONES.length],
                    )}
                  >
                    {category.image_url ? (
                      <img
                        src={category.image_url}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <Icon
                        className="h-9 w-9 transition-transform duration-300 group-hover:scale-110"
                        aria-hidden="true"
                      />
                    )}
                  </span>
                </span>
                <span className="text-center">
                  <strong
                    className={cn(
                      "block text-xs font-bold sm:text-sm",
                      isActive ? "text-primary" : "text-foreground",
                    )}
                  >
                    {name}
                  </strong>
                  <small className="text-[11px] text-muted-foreground">
                    {count > 0 ? `${formatNumberAr(count)} صنف` : "تصفّح"}
                  </small>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
