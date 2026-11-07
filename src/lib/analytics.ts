/**
 * Analytics — تتبع أحداث المتجر من اليوم الأول (الخارطة: المرحلة صفر).
 *
 * الإصدار الحالي خفيف عمداً: مفيش جداول ولا طلبات شبكة جديدة.
 * كل حدث بيتبعت لقائمة "sinks" مسجّلة. لما نقرر نخزّن الأحداث (جدول
 * Supabase أو أداة خارجية) نضيف sink جديد من غير ما نلمس أماكن الاستدعاء.
 * أي خطأ داخل sink لا يؤثر أبداً على تجربة العميل.
 */

export type AnalyticsEventName =
  | "product_view"
  | "product_search"
  | "add_to_cart"
  | "remove_from_cart"
  | "checkout_started"
  | "checkout_completed"
  | "assistant_used"
  | "buy_again_clicked"
  | "coupon_applied"
  | "wallet_used";

export type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

export type AnalyticsEvent = {
  name: AnalyticsEventName;
  props: AnalyticsProps;
  ts: number;
};

export type AnalyticsSink = (event: AnalyticsEvent) => void;

const sinks: AnalyticsSink[] = [];

export function registerAnalyticsSink(sink: AnalyticsSink): () => void {
  sinks.push(sink);
  return () => {
    const i = sinks.indexOf(sink);
    if (i >= 0) sinks.splice(i, 1);
  };
}

export function track(name: AnalyticsEventName, props: AnalyticsProps = {}): void {
  const event: AnalyticsEvent = { name, props, ts: Date.now() };
  for (const sink of [...sinks]) {
    try {
      sink(event);
    } catch {
      /* التتبع لا يجب أن يكسر المتجر */
    }
  }
}

// في بيئة التطوير فقط: اطبع الأحداث في الكونسول للتأكد إنها بتتسجل.
if (import.meta.env?.DEV) {
  registerAnalyticsSink((e) => console.debug("[analytics]", e.name, e.props));
}
