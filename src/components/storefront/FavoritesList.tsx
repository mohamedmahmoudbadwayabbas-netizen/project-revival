import { Heart } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { ProductCard } from "@/components/storefront/ProductCard";
import { useFavoriteProducts, useFavorites } from "@/lib/favorites";

export function FavoritesList() {
  const { enabled, ids } = useFavorites();
  const { data: products, isLoading } = useFavoriteProducts();
  if (!enabled) return null;
  if (ids.size === 0)
    return (
      <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
        <Heart className="mx-auto mb-3 h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <p className="font-semibold text-foreground">مفيش منتجات في المفضلة لسه</p>
        <p className="mt-1 text-sm text-muted-foreground">اضغط على القلب في أي منتج علشان تلاقيه هنا بسرعة.</p>
        <Link to="/" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground">ابدأ التسوق</Link>
      </div>
    );
  if (isLoading) return <p className="py-8 text-center text-sm text-muted-foreground">جارٍ التحميل…</p>;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
      {(products ?? []).map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
