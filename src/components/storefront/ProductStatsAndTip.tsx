import { Eye, Users, Star, UtensilsCrossed, Sparkles, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ProductStatsAndTipProps {
  /** عدد المشاهدات (افتراضياً 0 إذا كان غير معرف) */
  viewsCount?: number | null;
  /** عدد المشترين (افتراضياً 0 إذا كان غير معرف) */
  purchaseCount?: number | null;
  /** متوسط التقييم */
  avgRating?: number | null;
  /** عدد المراجعات */
  reviewsCount?: number | null;
  /** نص نصيحة الطبخ والتحضير الاختيارية (يتم إخفاء المربع تماماً إذا كان فارغاً) */
  cookingTip?: string | null;
  /** شارة الأكثر مبيعاً */
  isTopSeller?: boolean | null;
  /** فئات CSS إضافية */
  className?: string;
}

export function ProductStatsAndTip({
  viewsCount = 0,
  purchaseCount = 0,
  avgRating,
  reviewsCount = 0,
  cookingTip,
  isTopSeller,
  className,
}: ProductStatsAndTipProps) {
  // معالجة القيم الافتراضية والتأكد من أنها أرقام صحيحة
  const safeViews = typeof viewsCount === "number" ? viewsCount : 0;
  const safePurchases = typeof purchaseCount === "number" ? purchaseCount : 0;
  const safeReviews = typeof reviewsCount === "number" ? reviewsCount : 0;
  const safeRating = typeof avgRating === "number" && avgRating > 0 ? avgRating : 0;

  const hasReviews = safeReviews > 0 && safeRating > 0;
  const hasTip = Boolean(cookingTip && cookingTip.trim().length > 0);

  return (
    <div className={cn("space-y-4", className)} dir="rtl">
      {/* ─── شريط الإحصاءات السريعة (المشاهدات، المشترون، التقييم) ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {/* 1. عدد المشاهدات */}
        <div
          id="product-stat-views"
          className="flex items-center gap-2.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-emerald-800 dark:text-emerald-300 transition-all shadow-2xs"
        >
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <Eye className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-muted-foreground">عدد المشاهدات</div>
            <div className="truncate text-xs font-black text-foreground">
              {safeViews > 0 ? (
                <span>
                  {safeViews.toLocaleString("ar-EG")}{" "}
                  <span className="text-[10px] font-normal text-muted-foreground">مشاهدة</span>
                </span>
              ) : (
                <span className="text-muted-foreground font-semibold">0 مشاهدة</span>
              )}
            </div>
          </div>
        </div>

        {/* 2. عدد المشترين */}
        <div
          id="product-stat-purchases"
          className="flex items-center gap-2.5 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-3 text-blue-800 dark:text-blue-300 transition-all shadow-2xs"
        >
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400">
            <Users className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-muted-foreground">عدد المشترين</div>
            <div className="truncate text-xs font-black text-foreground">
              {safePurchases > 0 ? (
                <span>
                  {safePurchases.toLocaleString("ar-EG")}{" "}
                  <span className="text-[10px] font-normal text-muted-foreground">مشترٍ</span>
                </span>
              ) : (
                <span className="text-muted-foreground font-semibold">0 مشترٍ</span>
              )}
            </div>
          </div>
        </div>

        {/* 3. متوسط التقييم وعدد المراجعات */}
        <div
          id="product-stat-rating"
          className="col-span-2 sm:col-span-1 flex items-center gap-2.5 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3 text-amber-800 dark:text-amber-300 transition-all shadow-2xs"
        >
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-500">
            <Star
              className={cn(
                "h-4 w-4",
                hasReviews ? "fill-amber-400 text-amber-500" : "text-muted-foreground/40",
              )}
            />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-muted-foreground">التقييم والمراجعات</div>
            <div className="truncate text-xs font-black text-foreground flex items-center gap-1">
              {hasReviews ? (
                <>
                  <span className="text-amber-600 dark:text-amber-400 font-black">
                    {safeRating.toFixed(1)}
                  </span>
                  <div className="flex items-center text-amber-400">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={cn(
                          "h-2.5 w-2.5",
                          star <= Math.round(safeRating)
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground/30",
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] font-normal text-muted-foreground">
                    ({safeReviews})
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground font-semibold text-[11px]">
                  لا توجد تقييمات بعد
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* شارة الأكثر مبيعاً إذا كانت مفعلة للمنتج */}
      {isTopSeller && (
        <div
          id="product-top-seller-banner"
          className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border border-amber-500/30 p-3 text-amber-800 dark:text-amber-200 shadow-2xs"
        >
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-xl bg-amber-500 text-white shrink-0 shadow-xs">
              <Flame className="h-4 w-4 animate-pulse" />
            </div>
            <div>
              <span className="text-xs font-black text-foreground">منتج ضمن الأكثر مبيعاً 🔥</span>
              <p className="text-[10px] text-muted-foreground font-medium">
                ينال هذا المنتج إقبالاً واسعاً من زوار وعملاء متجرنا
              </p>
            </div>
          </div>
          <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-black text-amber-700 dark:text-amber-300">
            Top Seller
          </span>
        </div>
      )}

      {/* ─── 4. قسم نصيحة الطبخ والتحضير (يظهر فقط إذا كان النص موجوداً وغير فارغ) ─── */}
      {hasTip && (
        <div
          id="product-cooking-tip-card"
          className="rounded-2xl border border-amber-500/25 bg-gradient-to-br from-card via-card to-amber-500/10 p-4 transition-all shadow-xs"
        >
          <div className="flex items-center justify-between gap-2 border-b border-amber-500/20 pb-2.5 mb-2.5">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
                <UtensilsCrossed className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-foreground flex items-center gap-1.5">
                  <span>نصيحة الطبخ والتحضير</span>
                  <span className="text-[10px] text-muted-foreground font-normal">👨‍🍳</span>
                </h4>
                <p className="text-[10px] text-muted-foreground font-medium">
                  اقتراحات الشيف لتحضير هذا المنتج بأفضل مذاق وجودة
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 border border-amber-500/20">
              <Sparkles className="h-3 w-3 text-amber-500" /> نصيحة الشيف
            </span>
          </div>

          <p className="text-xs leading-relaxed text-foreground/90 whitespace-pre-wrap break-words bg-secondary/40 p-3.5 rounded-xl border border-border/50 font-medium">
            💡 {cookingTip}
          </p>
        </div>
      )}
    </div>
  );
}
