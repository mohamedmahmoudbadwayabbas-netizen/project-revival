import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-loose";
import { LIVE_PRODUCT_COLUMNS, mapDbProduct, type Product } from "@/lib/cart-context";
import { isEnabled } from "@/lib/feature-flags";
import { rankPurchases, type PurchaseRow } from "@/lib/buy-again-rank";

export type BuyAgainEntry = { product: Product; quantity: number; timesBought: number };

/** يجلب المنتجات الحالية (سعر ومخزون حاليين) المتاحة للشراء فقط، بنفس ترتيب المعرّفات. */
export async function fetchAvailableProducts(ids: string[]): Promise<Product[]> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return [];
  const { data, error } = await supabase
    .from("products")
    .select(LIVE_PRODUCT_COLUMNS)
    .eq("is_active", true)
    .in("id", unique);
  if (error) throw error;
  const map = new Map((data ?? []).map((p: any) => [p.id as string, mapDbProduct(p)]));
  return unique
    .map((id) => map.get(id))
    .filter((p): p is Product => Boolean(p) && ((p!.stock_quantity ?? 0) > 0 || p!.is_by_weight));
}

async function fetchBuyAgain(userId: string): Promise<BuyAgainEntry[]> {
  const { data, error } = await supabase
    .from("order_items")
    .select("product_id,quantity,created_at,orders!inner(user_id,status,created_at)")
    .eq("orders.user_id", userId)
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw error;
  const rows: PurchaseRow[] = (data ?? []).map((r: any) => {
    const order = Array.isArray(r.orders) ? r.orders[0] : r.orders;
    return {
      productId: r.product_id ?? null,
      quantity: Number(r.quantity ?? 0),
      orderedAt: order?.created_at ?? r.created_at,
      status: order?.status ?? null,
    };
  });
  const ranked = rankPurchases(rows, 12);
  const products = await fetchAvailableProducts(ranked.map((r) => r.productId));
  const byId = new Map(products.map((p) => [p.id, p]));
  return ranked
    .map((r) => ({
      product: byId.get(r.productId)!,
      quantity: r.lastQuantity,
      timesBought: r.timesBought,
    }))
    .filter((e) => Boolean(e.product));
}

export function useBuyAgain(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["buy-again", userId],
    enabled: Boolean(userId) && isEnabled("ENABLE_BUY_AGAIN"),
    queryFn: () => fetchBuyAgain(userId as string),
    staleTime: 5 * 60 * 1000,
  });
}

type OrderLine = { id?: string; name?: string; quantity?: number };
type AddItemFn = (product: Product, quantity?: number, meta?: any) => void;

/**
 * إعادة طلب سابق: نجلب المنتجات الحقيقية الحالية (بدل بناء منتج مزيف من بيانات الطلب القديمة)
 * فتكون الأسعار والمخزون محدثين، والمنتج غير المتاح يُتخطى ويُبلَّغ عنه.
 */
export async function reorderFromLines(
  lines: OrderLine[],
  addItem: AddItemFn,
): Promise<{ added: number; skipped: number }> {
  const wanted = lines.filter((l) => l.id && Number(l.quantity ?? 1) > 0);
  const products = await fetchAvailableProducts(wanted.map((l) => l.id as string));
  const byId = new Map(products.map((p) => [p.id, p]));
  let added = 0;
  for (const l of wanted) {
    const product = byId.get(l.id as string);
    if (!product) continue;
    addItem(product, Number(l.quantity ?? 1));
    added++;
  }
  return { added, skipped: lines.length - added };
}
