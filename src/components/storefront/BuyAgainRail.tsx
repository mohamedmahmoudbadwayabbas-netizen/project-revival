import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { ProductCard } from "@/components/storefront/ProductCard";
import { useAuth } from "@/lib/auth-context";
import { useCart, type Product } from "@/lib/cart-context";
import { useBuyAgain } from "@/lib/buy-again";
import { isEnabled } from "@/lib/feature-flags";
import { track } from "@/lib/analytics";

/** "اشتريتها سابقاً" — الصفحة الرئيسية، للعميل المسجّل اللي عنده طلبات سابقة فقط. */
export function BuyAgainRail({ onOpenProduct }: { onOpenProduct?: (p: Product) => void }) {
  const { user } = useAuth();
  const { addItem } = useCart();
  const { data } = useBuyAgain(user?.id);
  if (!isEnabled("ENABLE_BUY_AGAIN") || !user || !data || data.length === 0) return null;

  const addAll = () => {
    for (const e of data) addItem(e.product, e.quantity);
    track("buy_again_clicked", { source: "home_rail_add_all", count: data.length });
    toast.success(`تمت إضافة ${data.length} منتجات لسلتك`);
  };

  return (
    <section className="mx-auto mt-6 max-w-[1320px] px-3 sm:px-6" aria-labelledby="buy-again-title">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="buy-again-title" className="text-lg font-bold text-primary-dark sm:text-2xl">
          اشتريتها سابقاً
        </h2>
        <button
          type="button"
          onClick={addAll}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground active:scale-95"
        >
          <ShoppingCart className="h-4 w-4" aria-hidden="true" /> أضف الكل للسلة
        </button>
      </div>
      <div className="no-scrollbar -mx-3 flex snap-x gap-3 overflow-x-auto px-3 pb-2 sm:gap-4">
        {data.map((e) => (
          <div key={e.product.id} className="w-[46%] shrink-0 snap-start sm:w-[230px]">
            <ProductCard product={e.product} onOpen={onOpenProduct} />
          </div>
        ))}
      </div>
    </section>
  );
}
