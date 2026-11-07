/**
 * ترتيب "اشتريتها سابقاً" — منطق خالص بدون أي اعتماديات (قابل للاختبار).
 * الأولوية: الأكثر تكراراً في طلبات العميل، ثم الأحدث شراءً.
 * الطلبات الملغية لا تُحتسب.
 */
export type PurchaseRow = {
  productId: string | null;
  quantity: number;
  orderedAt: string; // ISO
  status?: string | null;
};

export type RankedPurchase = { productId: string; timesBought: number; lastQuantity: number; lastAt: string };

const EXCLUDED = new Set(["cancelled", "canceled", "rejected", "failed"]);

export function rankPurchases(rows: readonly PurchaseRow[], limit = 12): RankedPurchase[] {
  const byProduct = new Map<string, RankedPurchase>();
  for (const r of rows) {
    if (!r.productId) continue;
    if (r.status && EXCLUDED.has(r.status.toLowerCase())) continue;
    const qty = Number(r.quantity);
    if (!Number.isFinite(qty) || qty <= 0) continue;
    const t = Date.parse(r.orderedAt);
    if (!Number.isFinite(t)) continue;
    const prev = byProduct.get(r.productId);
    if (!prev) {
      byProduct.set(r.productId, { productId: r.productId, timesBought: 1, lastQuantity: qty, lastAt: r.orderedAt });
    } else {
      prev.timesBought += 1;
      if (t > Date.parse(prev.lastAt)) { prev.lastAt = r.orderedAt; prev.lastQuantity = qty; }
    }
  }
  return [...byProduct.values()]
    .sort((a, b) => b.timesBought - a.timesBought || Date.parse(b.lastAt) - Date.parse(a.lastAt))
    .slice(0, Math.max(0, limit));
}
