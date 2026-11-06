import { Plus, Minus, ShoppingCart, Flame, Scale, Eye } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { ImageIcon } from "lucide-react";
import { formatNumberAr, formatPriceAr, toArabicDigits } from "@/lib/format-ar";

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

  const discount =
    product.old_price && product.old_price > product.price_per_unit
      ? Math.round(((product.old_price - product.price_per_unit) / product.old_price) * 100)
      : 0;

  const stock = product.stock_quantity ?? 0;
  const lowThreshold = product.low_stock_threshold ?? 5;
  const outOfStock = stock <= 0;
  const lowStock = !outOfStock && stock <= lowThreshold;
  const step = product.is_by_weight ? 0.25 : 1;

  const currentEstPrice = product.is_by_weight
    ? calculateEstimatedPrice(product, selectedWeight)
    : product.price_per_unit;

  const unitLabel = product.is_by_weight
    ? formatWeightLabel(selectedWeight)
    : (product.unit_label ?? "قطعة");

  const handleAdd = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (outOfStock) return;
    const amount = product.is_by_weight ? selectedWeight : 1;
    const label = product.is_by_weight
      ? formatWeightLabel(selectedWeight)
      : `${amount} ${product.unit_label ?? "قطعة"}`;

    addItem(product, amount, {
      selected_weight: product.is_by_weight ? selectedWeight : undefined,
      selected_weight_label: product.is_by_weight ? label : undefined,
    });
    flyToCart(e.currentTarget);
    toast.success("تمت الإضافة للسلة", {
      description: `${product.name} (${label} — ${formatPriceAr(calculateEstimatedPrice(product, amount))})`,
    });
  };

  const handleQuickWeightSelect = (e: React.MouseEvent, weight: number, label: string) => {
    e.stopPropagation();
    if (outOfStock) return;
    setSelectedWeight(weight);
    if (qty > 0) {
      updateItemWeight(product.id, weight);
      toast.success("تم تحديث الوزن في السلة", {
        description: `${product.name}: ${label} (≈ ${formatPriceAr(calculateEstimatedPrice(product, weight))})`,
      });
    }
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
    if (next <= 0) {
      removeItem(product.id);
      toast.info("تمت إزالة المنتج من السلة");
    } else if (product.is_by_weight) {
      updateItemWeight(product.id, next);
      setSelectedWeight(next);
    } else {
      updateQuantity(product.id, next);
    }
  };

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elegant">
      {/* صورة المنتج */}
      <div className="relative m-2 aspect-square overflow-hidden rounded-xl bg-secondary">
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
                "h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.07] duration-500",
                outOfStock && "opacity-60 grayscale",
              )}
            />
          ) : (
            <div className="grid h-full w-full place-items-center bg-secondary text-muted-foreground" aria-hidden="true">
              <ImageIcon className="h-8 w-8 opacity-50" />
            </div>
          )}
        </Link>

        {/* شارات الخصم والأكثر مبيعاً */}
        <div className="absolute top-2 start-2 z-10 flex flex-col items-start gap-1.5">
          {discount > 0 && (
            <span className="rounded-full bg-offer px-2.5 py-1 text-[11px] font-bold text-accent-foreground shadow-card">
              خصم ٪{formatNumberAr(discount)}
            </span>
          )}
          {isTopSellerActive && discount === 0 && (
            <span className="flex items-center gap-1 rounded-full bg-highlight px-2.5 py-1 text-[11px] font-bold text-primary-dark shadow-card">
              <Flame className="h-3 w-3" aria-hidden="true" /> الأكثر طلباً
            </span>
          )}
        </div>

        {/* النظرة السريعة */}
        <div className="absolute top-2 end-2 z-10 flex flex-col gap-1">
          {onOpen && (
            <Button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpen(product);
              }}
              aria-label={`نظرة سريعة على ${product.name}`}
              className="grid h-8 w-8 place-items-center rounded-full bg-card/90 p-0 text-muted-foreground opacity-0 shadow-card backdrop-blur-sm transition-all group-hover:opacity-100 hover:bg-card hover:text-primary max-sm:opacity-100"
            >
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          )}
        </div>

        {product.is_by_weight && (
          <span title={`سعر الكيلو ${formatPriceAr(product.price_per_unit)}`} className="absolute bottom-2 start-2 z-10 flex items-center gap-1 rounded-full border border-border bg-card/90 px-2 py-0.5 text-[10px] font-bold text-foreground backdrop-blur-sm">
            <Scale className="h-2.5 w-2.5" aria-hidden="true" /> {formatPriceAr(product.price_per_unit)} / كجم
          </span>
        )}
      </div>

      {/* التفاصيل */}
      <div className="flex flex-1 flex-col gap-2 px-3.5 pb-3.5 pt-1 text-right">
        <Link
          to="/products/$productId"
          params={{ productId: product.id }}
          className="transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
        >
          <h4 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-foreground">
            {product.name_ar || product.name}
          </h4>
        </Link>

        {/* حالة التوفر */}
        <div>
          <span
            className={cn(
              "inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold",
              outOfStock
                ? "bg-destructive/10 text-destructive"
                : lowStock
                  ? "bg-offer-soft text-offer"
                  : "bg-success-soft text-success",
            )}
          >
            {outOfStock ? "نفدت الكمية" : lowStock ? "كمية محدودة" : "متوفر"}
          </span>
        </div>

        {/* السعر */}
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 pt-1">
          <span className="text-lg font-bold text-primary-dark">{formatPriceAr(currentEstPrice)}</span>
          <span className="text-[11px] font-bold text-muted-foreground">/ {toArabicDigits(unitLabel)}</span>
          {product.old_price && product.old_price > product.price_per_unit && (
            <span
              className="text-xs text-offer line-through"
            >
              {formatPriceAr(product.old_price * (product.is_by_weight ? selectedWeight : 1))}
            </span>
          )}
        </div>

        {/* اختيار الوزن */}
        {product.is_by_weight && !outOfStock && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
              <span>اختر الوزن:</span>
              <span className="text-foreground">{toArabicDigits(formatWeightLabel(selectedWeight))}</span>
            </div>
            <div dir="ltr" className="grid grid-cols-4 gap-1 tabular-nums">
              {WEIGHT_OPTIONS.slice(0, 4).map((w) => {
                const isSelected = Math.abs(selectedWeight - w.value) < 0.01;
                return (
                  <Button
                    key={w.value}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={(e) => handleQuickWeightSelect(e, w.value, w.label)}
                    className={cn(
                      "rounded-md border px-1 py-0.5 text-center text-[10px] font-bold transition-colors active:scale-95",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-secondary text-muted-foreground hover:text-primary",
                    )}
                  >
                    {toArabicDigits(w.label)}
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {/* الإضافة للسلة */}
        <div className="mt-auto pt-1">
          {qty > 0 ? (
            <div dir="ltr" className="flex h-11 items-center justify-between rounded-xl border border-primary/30 bg-primary/5 px-1.5 tabular-nums">
              <Button
                type="button"
                onClick={handleDec}
                aria-label="تقليل الكمية"
                className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-card p-0 text-primary transition-colors hover:bg-primary hover:text-primary-foreground active:scale-90"
              >
                <Minus className="h-3 w-3" aria-hidden="true" />
              </Button>
              <span className="text-xs font-bold tabular-nums text-primary" dir="ltr">
                {product.is_by_weight ? toArabicDigits(formatWeightLabel(qty)) : formatNumberAr(qty)}
              </span>
              <Button
                type="button"
                onClick={handleInc}
                disabled={outOfStock || (!product.is_by_weight && qty >= stock)}
                aria-label="زيادة الكمية"
                className="grid h-9 w-9 place-items-center rounded-lg bg-primary p-0 text-primary-foreground transition-opacity hover:opacity-90 active:scale-90"
              >
                <Plus className="h-3 w-3" aria-hidden="true" />
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              disabled={outOfStock}
              onClick={handleAdd}
              className="flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-bold text-primary-foreground transition-all hover:bg-primary-dark active:scale-95 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100"
            >
              {!outOfStock && <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" />}
              <span>
                {outOfStock
                  ? "غير متوفر حالياً"
                  : product.is_by_weight
                    ? <>أضف ({toArabicDigits(formatWeightLabel(selectedWeight))})</>
                    : "أضف للسلة"}
              </span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
