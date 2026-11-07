import { Plus, Minus, Eye, ImageIcon } from "lucide-react";
import type { Product } from "@/lib/cart-context";
import {
  useCart,
  WEIGHT_OPTIONS,
  formatWeightLabel,
  calculateEstimatedPrice,
} from "@/lib/cart-context";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { flyToCart } from "@/lib/fly-to-cart";
import { useState } from "react";
import { formatNumberAr, formatPriceAr, toArabicDigits } from "@/lib/format-ar";
import { FavoriteButton } from "@/components/storefront/FavoriteButton";

/**
 * Product Card v2 — بطاقة هايبرماركت مدمجة:
 * صورة 1:1 · اسم (سطران) · وحدة البيع · السعر الكبير · زر (+) يتحول لعداد في مكانه بدون نوافذ.
 * نصوص المساعدة لا تقل عن 12px.
 */
export function ProductCard({
  product,
  onOpen,
  isTopSeller,
}: {
  product: Product;
  onOpen?: (p: Product) => void;
  isTopSeller?: boolean;
}) {
  const { addItem, updateQuantity, updateItemWeight, removeItem, items } = useCart();
  const inCart = items.find((i) => i.product.id === product.id);
  const qty = inCart?.quantity ?? 0;
  const [imgFailed, setImgFailed] = useState(false);
  const [selectedWeight, setSelectedWeight] = useState<number>(
    inCart?.selected_weight ?? (product.is_by_weight ? 0.5 : 1),
  );

  const isTopSellerActive = Boolean(isTopSeller ?? (product.is_top_seller || product.is_popular));
  const hasDiscount = Boolean(product.old_price && product.old_price > product.price_per_unit);
  const discount = hasDiscount
    ? Math.round(((product.old_price! - product.price_per_unit) / product.old_price!) * 100)
    : 0;

  const stock = product.stock_quantity ?? 0;
  const lowThreshold = product.low_stock_threshold ?? 5;
  const outOfStock = stock <= 0;
  const lowStock = !outOfStock && stock <= lowThreshold;
  const step = product.is_by_weight ? 0.25 : 1;

  const displayedPrice = product.is_by_weight
    ? calculateEstimatedPrice(product, selectedWeight)
    : product.price_per_unit;
  const unitText = product.is_by_weight
    ? `${formatPriceAr(product.price_per_unit)} / كجم`
    : (product.unit_label ?? "قطعة");

  const handleAdd = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (outOfStock) return;
    const amount = product.is_by_weight ? selectedWeight : 1;
    addItem(product, amount, {
      selected_weight: product.is_by_weight ? selectedWeight : undefined,
      selected_weight_label: product.is_by_weight ? formatWeightLabel(selectedWeight) : undefined,
    });
    flyToCart(e.currentTarget);
  };

  const handleQuickWeightSelect = (e: React.MouseEvent, weight: number) => {
    e.stopPropagation();
    if (outOfStock) return;
    setSelectedWeight(weight);
    if (qty > 0) updateItemWeight(product.id, weight);
  };

  const handleInc = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (outOfStock) return;
    if (!product.is_by_weight && qty >= stock) {
      toast.info("وصلت للكمية المتاحة في المخزون");
      return;
    }
    if (product.is_by_weight) {
      const next = +(qty + 0.25).toFixed(3);
      updateItemWeight(product.id, next);
      setSelectedWeight(next);
    } else {
      addItem(product, 1);
    }
    flyToCart(e.currentTarget);
  };

  const handleDec = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = +(qty - step).toFixed(3);
    if (next <= 0) removeItem(product.id);
    else if (product.is_by_weight) {
      updateItemWeight(product.id, next);
      setSelectedWeight(next);
    } else updateQuantity(product.id, next);
  };

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-slate-100 bg-card text-card-foreground shadow-card transition-colors duration-200 hover:border-primary/30 dark:border-border">
      {/* الصورة 1:1 */}
      <div className="relative aspect-square overflow-hidden bg-white">
        <Link
          to="/products/$productId"
          params={{ productId: product.id }}
          className="block h-full w-full focus-visible:outline-2 focus-visible:outline-ring"
        >
          {product.image_url && !imgFailed ? (
            <img
              onError={() => setImgFailed(true)}
              src={product.image_url}
              alt={`${product.name} — ${product.unit_label ?? "قطعة"}`}
              loading="lazy"
              decoding="async"
              className={cn(
                "h-full w-full object-contain p-2",
                outOfStock && "opacity-50 grayscale",
              )}
            />
          ) : (
            <div
              className="grid h-full w-full place-items-center bg-muted text-muted-foreground"
              aria-hidden="true"
            >
              <ImageIcon className="h-8 w-8 opacity-50" />
            </div>
          )}
        </Link>

        {/* شارة زاوية أعلى اليسار */}
        {discount > 0 ? (
          <span
            dir="ltr"
            className="absolute left-2 top-2 z-10 rounded-md bg-destructive px-1.5 py-0.5 text-xs font-bold tabular-nums text-destructive-foreground"
          >
            -{formatNumberAr(discount)}%
          </span>
        ) : isTopSellerActive ? (
          <span className="absolute left-2 top-2 z-10 rounded-md bg-accent px-1.5 py-0.5 text-xs font-bold text-accent-foreground">
            الأكثر طلباً
          </span>
        ) : null}

        <FavoriteButton
          productId={product.id}
          productName={product.name_ar || product.name}
          className="absolute right-0 top-0 z-10"
        />

        {/* نظرة سريعة: على الشاشات الكبيرة فقط */}
        {onOpen && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpen(product);
            }}
            aria-label={`نظرة سريعة على ${product.name}`}
            className="absolute right-1.5 top-11 z-10 hidden h-9 w-9 place-items-center rounded-full bg-card/95 text-muted-foreground opacity-0 shadow-card transition-opacity hover:text-primary group-hover:opacity-100 md:grid"
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
          </button>
        )}

        {/* زر (+) يتحول لعداد في نفس الموضع فوق الصورة */}
        <div dir="ltr" className="absolute bottom-2 right-2 z-10">
          {outOfStock ? (
            <span className="rounded-full bg-muted px-2.5 py-1.5 text-xs font-bold text-muted-foreground">
              نفدت الكمية
            </span>
          ) : qty > 0 ? (
            <div className="flex h-11 items-center gap-0.5 rounded-full bg-primary/10 p-0.5 shadow-card ring-1 ring-primary/20 backdrop-blur-sm">
              <button
                type="button"
                onClick={handleDec}
                aria-label="تقليل الكمية"
                className="grid h-10 w-10 place-items-center rounded-full bg-card text-primary active:scale-90"
              >
                <Minus className="h-4 w-4" aria-hidden="true" />
              </button>
              <span className="min-w-8 text-center text-sm font-bold tabular-nums text-primary-dark">
                {product.is_by_weight
                  ? toArabicDigits(formatWeightLabel(qty))
                  : formatNumberAr(qty)}
              </span>
              <button
                type="button"
                onClick={handleInc}
                disabled={!product.is_by_weight && qty >= stock}
                aria-label="زيادة الكمية"
                className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground active:scale-90 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleAdd}
              aria-label={`أضف ${product.name} للسلة`}
              className="grid h-11 w-11 place-items-center rounded-full bg-primary text-primary-foreground shadow-float transition-transform active:scale-90"
            >
              <Plus className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* التفاصيل */}
      <div className="flex flex-1 flex-col gap-1 px-3 pb-3 pt-2 text-right">
        <Link
          to="/products/$productId"
          params={{ productId: product.id }}
          className="focus-visible:outline-2 focus-visible:outline-ring"
        >
          <h4 className="line-clamp-2 min-h-[2.5rem] font-sans text-xs font-medium leading-snug text-slate-800 md:text-sm dark:text-foreground">
            {product.name_ar || product.name}
          </h4>
        </Link>

        <p className="text-xs text-muted-foreground">{toArabicDigits(unitText)}</p>

        <div className="mt-auto flex flex-wrap items-baseline gap-x-2 pt-1">
          <span className="text-base font-extrabold text-slate-900 md:text-lg dark:text-foreground">
            {formatPriceAr(displayedPrice)}
          </span>
          {hasDiscount && (
            <span className="text-xs text-muted-foreground line-through">
              {formatPriceAr(product.old_price! * (product.is_by_weight ? selectedWeight : 1))}
            </span>
          )}
        </div>

        {lowStock && <span className="text-xs font-medium text-destructive">كمية محدودة</span>}

        {product.is_by_weight && !outOfStock && (
          <div dir="ltr" className="mt-1 grid grid-cols-4 gap-1 tabular-nums">
            {WEIGHT_OPTIONS.slice(0, 4).map((w) => {
              const isSelected = Math.abs(selectedWeight - w.value) < 0.01;
              return (
                <button
                  key={w.value}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={(e) => handleQuickWeightSelect(e, w.value)}
                  className={cn(
                    "rounded-md border py-1.5 text-center text-xs font-semibold transition-colors active:scale-95",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-muted text-muted-foreground hover:text-primary",
                  )}
                >
                  {toArabicDigits(w.label)}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
