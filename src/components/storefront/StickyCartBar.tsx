import { ShoppingBag, ChevronLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useCart } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";

export function StickyCartBar() {
  const { items, totalPrice, totalCount } = useCart();
  if (items.length === 0) return null;
  return (
    <div className="fixed bottom-20 inset-x-4 z-40 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[420px]" dir="rtl">
      <Button asChild className="h-auto w-full justify-between gap-3 rounded-2xl px-4 py-3.5 text-primary-foreground shadow-lg">
        <Link to="/cart" aria-label="عرض سلة المشتريات">
          <span className="flex items-center gap-2.5">
            <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-primary-foreground/20">
              <ShoppingBag className="h-4 w-4" />
              <span dir="ltr" className="absolute -end-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-accent text-[10px] font-black tabular-nums text-accent-foreground">{totalCount}</span>
            </span>
            <span className="text-sm font-bold"><bdi dir="ltr">{items.length}</bdi> {items.length === 1 ? "منتج" : "منتجات"}</span>
          </span>
          <span className="flex items-center gap-2">
            <span dir="ltr" className="font-display text-lg font-black tabular-nums">{totalPrice.toFixed(2)} EGP</span>
            <ChevronLeft className="h-4 w-4" />
          </span>
        </Link>
      </Button>
    </div>
  );
}
