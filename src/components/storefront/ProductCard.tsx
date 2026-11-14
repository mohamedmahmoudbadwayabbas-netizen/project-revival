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
import { getDiscountPercent, inferUnitLabel } from "@/lib/storefront-home";

/**
 * Product Card — بطاقة هايبرماركت نظيفة ومتوازنة:
 * صورة 1:1 مع خلفية نقية · شارة خصم واحدة على الأكثر · وحدة قياس دقيقة · سعر واضح · زر (+) يتحول لعداد.
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
  const discount = getDiscountPercent(product);
  const hasDiscount = discount > 0;

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
    : inferUnitLabel(product);

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
    <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/80 bg-card text-card-foreground shadow-card transition-all duration-200 hover:border-primary/40">
      {/* الصورة 1:1 */}
      <div className="relative aspect-square overflow-hidden bg-white dark:bg-white/95">
        <Link
          to="/products/$productId"
          params={{ productId: product.id }}
          className="block h-full w-full focus-visible:outline-2 focus-visible:outline-ring"
        >
          {product.image_url && !imgFailed ? (
            <img
              onError={() => setImgFailed(true)}
              src={product.image_url}
              alt={`${product.name_ar || product.name} — ${unitText}`}
              loading="eager"
              decoding="sync"
              className={cn(
                "h-full w-full object-contain p-2.5 transition-transform duration-300 group-hover:scale-[1.03]",
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

        {/* شارة زاوية واحدة فقط منعًا للتزاحم البصري */}
        {discount > 0 ? (
          <span className="absolute left-2.5 top-2.5 z-10 rounded-md bg-destructive px-2 py-0.5 text-xs font-extrabold tabular-nums text-destructive-foreground shadow-xs">
            خصم {formatNumberAr(discount)}٪
          </span>
        ) : isTopSellerActive ? (
          <span className="absolute left-2.5 top-2.5 z-10 rounded-md bg-accent px-2 py-0.5 text-xs font-bold text-accent-foreground shadow-xs">
            الأكثر طلباً
          </span>
        ) : null}

        <FavoriteButton
          productId={product.id}
          productName={product.name_ar || product.name}
          className="absolute right-1 top-1 z-10"
        />

        {/* نظرة سريعة: على الشاشات الكبيرة فقط */}
        {onOpen && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpen(product);
            }}
            aria-label={`نظرة سريعة على ${product.name_ar || product.name}`}
            className="absolute right-2 top-11 z-10 hidden h-9 w-9 place-items-center rounded-full border border-border/60 bg-white/95 text-slate-700 opacity-0 shadow-card transition-opacity hover:text-primary group-hover:opacity-100 md:grid"
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
          </button>
        )}

        {/* زر (+) يتحول لعداد في نفس الموضع */}
        <div dir="ltr" className="absolute bottom-2.5 right-2.5 z-10">
          {outOfStock ? (
            <span className="rounded-lg bg-muted px-2.5 py-1.5 text-xs font-bold text-muted-foreground">
              نفدت الكمية
            </span>
          ) : qty > 0 ? (
            <div className="flex h-10 items-center gap-0.5 rounded-full bg-white/95 p-0.5 shadow-float ring-1 ring-primary/25">
              <button
                type="button"
                onClick={handleDec}
                aria-label="تقليل الكمية"
                className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-primary active:scale-90"
              >
                <Minus className="h-4 w-4" aria-hidden="true" />
              </button>
              <span className="min-w-7 text-center text-sm font-black tabular-nums text-emerald-950">
                {product.is_by_weight
                  ? toArabicDigits(formatWeightLabel(qty))
                  : formatNumberAr(qty)}
              </span>
              <button
                type="button"
                onClick={handleInc}
                disabled={!product.is_by_weight && qty >= stock}
                aria-label="زيادة الكمية"
                className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground active:scale-90 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleAdd}
              aria-label={`أضف ${product.name_ar || product.name} للسلة`}
              className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground shadow-float transition-transform hover:scale-105 active:scale-90"
            >
              <Plus className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* التفاصيل */}
      <div className="flex flex-1 flex-col gap-1 px-3 pb-3 pt-2.5 text-right">
        <Link
          to="/products/$productId"
          params={{ productId: product.id }}
          className="focus-visible:outline-2 focus-visible:outline-ring"
        >
          <h4 className="line-clamp-2 min-h-[2.5rem] font-sans text-xs font-bold leading-snug text-foreground md:text-sm">
            {product.name_ar || product.name}
          </h4>
        </Link>

        <p className="text-xs font-medium text-muted-foreground">{unitText}</p>

        <div className="mt-auto flex flex-wrap items-baseline gap-x-2 pt-1.5">
          <span className="text-base font-black tabular-nums text-foreground md:text-lg">
            {formatPriceAr(displayedPrice)}
          </span>
          {hasDiscount && (
            <span className="text-xs tabular-nums text-muted-foreground line-through">
              {formatPriceAr(product.old_price! * (product.is_by_weight ? selectedWeight : 1))}
            </span>
          )}
        </div>

        {lowStock && <span className="text-xs font-semibold text-destructive">كمية محدودة</span>}

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
