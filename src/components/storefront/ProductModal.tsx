import { NumberInput } from "@/components/ui/number-input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import type { Product } from "@/lib/cart-context";
import {
  useCart,
  lineSubtotal,
  formatWeightLabel,
  calculateEstimatedPrice,
} from "@/lib/cart-context";
import { WeightSelector } from "./WeightSelector";
import { toast } from "sonner";
import { flyToCart } from "@/lib/fly-to-cart";

export function ProductModal({
  product,
  onClose,
}: {
  product: Product | null;
  onClose: () => void;
}) {
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (product) setQty(product.is_by_weight ? 0.5 : 1);
  }, [product]);

  if (!product) return null;
  const step = product.is_by_weight ? 0.25 : 1;
  const min = product.is_by_weight ? 0.25 : 1;
  const outOfStock = (product.stock_quantity ?? 0) <= 0;
  const hasDiscount = product.old_price != null && product.old_price > product.price_per_unit;

  return (
    <Dialog open={!!product} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden p-0 sm:rounded-3xl" dir="rtl">
        <div className="relative aspect-[5/3] w-full overflow-hidden bg-secondary">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className={`h-full w-full object-cover ${outOfStock ? "opacity-50 grayscale" : ""}`}
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-6xl">🌿</div>
          )}
          {Boolean(
            product.is_popular || product.is_top_seller,
          ) && (
            <span className="absolute top-3 end-3 rounded-full bg-primary px-3 py-1 text-xs font-black text-primary-foreground">
              الأكثر مبيعاً 🔥
            </span>
          )}
          {hasDiscount && (
            <span className="absolute top-3 start-3 rounded-full sale-gradient px-3 py-1 text-xs font-black text-sale-foreground shadow">
              عرض خاص
            </span>
          )}
          {outOfStock && <span className="absolute bottom-3 start-3 rounded-full bg-destructive px-3 py-1 text-xs font-bold text-destructive-foreground">نفدت الكمية</span>}
        </div>
        <div className="p-5">
          <DialogHeader className="space-y-1 text-start">
            <DialogTitle className="font-display text-xl font-bold">{product.name}</DialogTitle>
            <p className="text-xs text-muted-foreground">
              {product.is_by_weight
                ? <>السعر: <bdi dir="ltr" className="tabular-nums">{product.price_per_unit.toFixed(2)} EGP / كجم</bdi></>
                : product.unit_label}
            </p>
          </DialogHeader>

          {product.description && (
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          )}

          {product.is_by_weight && !outOfStock && (
            <div className="mt-4">
              <WeightSelector
                product={product}
                selectedWeight={qty}
                onWeightChange={(w) => setQty(w)}
                showEstimatedPrice={false}
              />
            </div>
          )}

          <div className="mt-4 flex items-center justify-between">
            <div>
              <div dir="ltr" className="font-display text-2xl font-bold text-primary text-left tabular-nums">
                {calculateEstimatedPrice(product, qty).toFixed(2)}
                <span className="ms-1 text-xs font-bold text-muted-foreground">ج.م</span>
              </div>
              <div className="text-[11px] text-muted-foreground font-semibold">
                {product.is_by_weight
                  ? <>الوزن المحدد: <bdi dir="ltr">{formatWeightLabel(qty)}</bdi></>
                  : <bdi dir="ltr">{qty} {product.unit_label}</bdi>}
              </div>
            </div>

            {!product.is_by_weight && !outOfStock && (
              <div dir="ltr" className="flex items-center gap-1 rounded-full border border-border bg-secondary/40 p-1 tabular-nums">
                <Button
                  aria-label="تقليل الكمية"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => setQty((q) => Math.max(min, +(q - step).toFixed(3)))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="min-w-14 text-center text-sm font-black">{qty}</span>
                <Button
                  aria-label="زيادة الكمية"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => setQty((q) => +(q + step).toFixed(3))}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <Button
            disabled={outOfStock}
            className="mt-5 h-12 w-full rounded-2xl hero-gradient text-base font-black text-primary-foreground shadow-card hover:opacity-95"
            onClick={(e) => {
              if (outOfStock) return;
              const label = product.is_by_weight
                ? formatWeightLabel(qty)
                : `${qty} ${product.unit_label}`;
              addItem(product, qty, {
                selected_weight: product.is_by_weight ? qty : undefined,
                selected_weight_label: product.is_by_weight ? label : undefined,
              });
              flyToCart(e.currentTarget);
              toast.success("تمت الإضافة للسلة 🛒", {
                description: `${product.name} (${label})`,
              });
              onClose();
            }}
          >
            <ShoppingBag className="me-2 h-5 w-5" />
            {outOfStock ? "نفدت الكمية" : "أضف إلى السلة"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
