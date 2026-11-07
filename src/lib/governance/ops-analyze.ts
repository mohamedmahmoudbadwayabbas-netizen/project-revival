/** Pure Operations + Delivery agent analysis (Blueprint Phase 3). Suggestions only — no side effects. */
import type { ProposalDraft } from "./analyze";

export type OpsProduct = {
  id: string;
  name: string;
  name_ar: string | null;
  stock_quantity: number;
  low_stock_threshold: number;
  is_active: boolean;
};
export type OpsOrder = { id: string; status: string; created_at: string; updated_at: string };
export type OpsDraft = Omit<ProposalDraft, "agent_type"> & {
  agent_type: "operations" | "delivery";
};

export const STALE_PENDING_HOURS = 24;
export const STALE_SHIPPED_HOURS = 6;
/** Ops that the server may execute automatically AFTER admin approval. Everything else is advisory. */
export const EXECUTABLE_OPS = ["deactivate_product"] as const;

const hoursSince = (iso: string, now: number) => (now - new Date(iso).getTime()) / 36e5;

export function analyzeOperations(
  products: OpsProduct[],
  orders: OpsOrder[],
  now = Date.now(),
): OpsDraft[] {
  const out: OpsDraft[] = [];
  for (const p of products) {
    if (!p.is_active) continue;
    const label = p.name_ar || p.name;
    if (p.stock_quantity <= 0) {
      out.push({
        agent_type: "operations",
        title: `منتج نافد ومازال معروضاً: «${label}»`,
        root_cause: `المخزون صفر، والعملاء يرونه في المتجر. الموافقة تخفي المنتج تلقائياً حتى إعادة التخزين.`,
        risk_tier: "medium",
        raw_operation: { op: "deactivate_product", product_id: p.id, product_name: label },
        source_interaction_ids: [],
        dedupe_key: `oos:${p.id}`,
      });
    } else if (p.stock_quantity <= p.low_stock_threshold) {
      out.push({
        agent_type: "operations",
        title: `مخزون منخفض: «${label}» (${p.stock_quantity} متبقي)`,
        root_cause: `الكمية أقل من حد التنبيه (${p.low_stock_threshold}). يُنصح بطلب كمية جديدة من المورد.`,
        risk_tier: "low",
        raw_operation: {
          op: "restock_alert",
          product_id: p.id,
          product_name: label,
          stock: p.stock_quantity,
        },
        source_interaction_ids: [],
        dedupe_key: `low:${p.id}`,
      });
    }
  }
  const stalePending = orders.filter(
    (o) => o.status === "pending" && hoursSince(o.created_at, now) >= STALE_PENDING_HOURS,
  );
  if (stalePending.length) {
    out.push({
      agent_type: "operations",
      title: `${stalePending.length} طلب معلق منذ أكثر من ${STALE_PENDING_HOURS} ساعة`,
      root_cause: "طلبات لم يتم تأكيدها بعد؛ تأخيرها يقلل ثقة العملاء.",
      risk_tier: "medium",
      raw_operation: { op: "review_stale_orders", order_ids: stalePending.map((o) => o.id) },
      source_interaction_ids: [],
      dedupe_key: `stale:${stalePending
        .map((o) => o.id)
        .sort()
        .join(",")}`,
    });
  }
  const lateShipped = orders.filter(
    (o) => o.status === "shipped" && hoursSince(o.updated_at, now) >= STALE_SHIPPED_HOURS,
  );
  if (lateShipped.length) {
    out.push({
      agent_type: "delivery",
      title: `${lateShipped.length} طلب خرج للتوصيل منذ أكثر من ${STALE_SHIPPED_HOURS} ساعات`,
      root_cause: "قد يكون السائق متأخراً أو نسي تحديث الحالة. تواصل مع السائق أو العميل.",
      risk_tier: "medium",
      raw_operation: { op: "follow_up_delivery", order_ids: lateShipped.map((o) => o.id) },
      source_interaction_ids: [],
      dedupe_key: `late:${lateShipped
        .map((o) => o.id)
        .sort()
        .join(",")}`,
    });
  }
  return out;
}
