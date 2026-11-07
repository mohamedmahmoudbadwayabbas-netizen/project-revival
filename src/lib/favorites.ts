import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase-loose";
import { useAuth } from "@/lib/auth-context";
import { isEnabled } from "@/lib/feature-flags";
import { fetchAvailableProducts } from "@/lib/buy-again";
import type { Product } from "@/lib/cart-context";

/** المفضلة (جدول wishlists، مرتبط بالحساب). الضيف يُطلب منه تسجيل الدخول. */
export function useFavorites() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const qc = useQueryClient();
  const enabled = isEnabled("ENABLE_FAVORITES");
  const key = ["favorites", userId] as const;

  const { data } = useQuery({
    queryKey: key,
    enabled: enabled && Boolean(userId),
    staleTime: 60_000,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase.from("wishlists").select("product_id").eq("user_id", userId as string);
      if (error) throw error;
      return (data ?? []).map((r: any) => r.product_id as string).filter(Boolean);
    },
  });

  const ids = useMemo(() => new Set(data ?? []), [data]);

  const toggle = useCallback(
    async (productId: string) => {
      if (!userId) {
        toast.info("سجّل الدخول لحفظ المنتجات في المفضلة", {
          action: { label: "تسجيل الدخول", onClick: () => window.location.assign("/auth") },
        });
        return;
      }
      const wasFav = ids.has(productId);
      const previous = qc.getQueryData<string[]>(key) ?? [];
      // تحديث فوري (optimistic) ثم تراجع عند الفشل
      qc.setQueryData<string[]>(key, wasFav ? previous.filter((id) => id !== productId) : [...previous, productId]);
      const { error } = wasFav
        ? await supabase.from("wishlists").delete().eq("user_id", userId).eq("product_id", productId)
        : await supabase.from("wishlists").upsert({ user_id: userId, product_id: productId }, { onConflict: "user_id,product_id" });
      if (error) {
        qc.setQueryData<string[]>(key, previous);
        toast.error("تعذر تحديث المفضلة، حاول مرة أخرى");
        return;
      }
      void qc.invalidateQueries({ queryKey: ["favorite-products", userId] });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userId, ids, qc],
  );

  return { enabled, isFavorite: (productId: string) => ids.has(productId), toggle, ids, signedIn: Boolean(userId) };
}

export function useFavoriteProducts() {
  const { user } = useAuth();
  const { ids, enabled } = useFavorites();
  const list = [...ids].sort();
  return useQuery({
    queryKey: ["favorite-products", user?.id ?? null, list.join(",")],
    enabled: enabled && Boolean(user?.id) && list.length > 0,
    queryFn: (): Promise<Product[]> => fetchAvailableProducts(list),
  });
}
