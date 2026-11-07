import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFavorites } from "@/lib/favorites";

/** زر القلب — منطقة لمس 44px، والدائرة المرئية أصغر. */
export function FavoriteButton({
  productId,
  productName,
  className,
}: {
  productId: string;
  productName: string;
  className?: string;
}) {
  const { enabled, isFavorite, toggle } = useFavorites();
  if (!enabled) return null;
  const fav = isFavorite(productId);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void toggle(productId);
      }}
      aria-pressed={fav}
      aria-label={fav ? `إزالة ${productName} من المفضلة` : `إضافة ${productName} للمفضلة`}
      className={cn("grid h-11 w-11 place-items-center", className)}
    >
      <span className="grid h-8 w-8 place-items-center rounded-full bg-card/95 shadow-card">
        <Heart
          className={cn(
            "h-4 w-4 transition-colors",
            fav ? "fill-destructive text-destructive" : "text-muted-foreground",
          )}
          aria-hidden="true"
        />
      </span>
    </button>
  );
}
