import { ShoppingBag, ChevronLeft } from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useCart } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";

/** صفحات لا يظهر فيها الشريط: السلة نفسها، الإدارة، الدخول، المساعد، وصفحة المنتج (لها شريط شراء خاص). */
const HIDDEN_PREFIXES = [
  "/cart",
  "/admin",
  "/auth",
  "/login",
  "/assistant",
  "/driver",
  "/products/",
];

/** شريط متابعة الشراء الثابت — للموبايل فقط، فوق الشريط السفلي، ويظهر في كل صفحات المتجر. */
export function StickyCartBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { items, totalPrice, totalCount } = useCart();
  if (items.length === 0) return null;
  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;
  return (
    <div
      className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] z-40 md:hidden"
      dir="rtl"
    >
      <Button
        asChild
        className="h-auto w-full justify-between gap-3 rounded-2xl px-4 py-3.5 text-primary-foreground shadow-lg"
      >
        <Link to="/cart" aria-label="متابعة الشراء">
          <span className="flex items-center gap-2.5">
            <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-primary-foreground/20">
              <ShoppingBag className="h-4 w-4" />
              <span
                dir="ltr"
                className="absolute -end-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] font-black tabular-nums text-accent-foreground"
              >
                {totalCount}
              </span>
            </span>
            <span className="text-sm font-bold">
              <bdi dir="ltr">{items.length}</bdi> {items.length === 1 ? "منتج" : "منتجات"}
            </span>
          </span>
          <span className="flex items-center gap-2">
            <span dir="ltr" className="font-display text-lg font-black tabular-nums">
              {totalPrice.toFixed(2)} EGP
            </span>
            <span className="text-sm font-bold">متابعة الشراء</span>
            <ChevronLeft className="h-4 w-4" />
          </span>
        </Link>
      </Button>
    </div>
  );
}
