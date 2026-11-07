import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Activity, CalendarDays, Package, RefreshCw, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { fetchOrdersWithItems, type OrderView } from "@/services/orderDataService";
import { supabase } from "@/lib/supabase-loose";

export const Route = createFileRoute("/admin/forecasting")({
  head: () => ({
    meta: [
      { title: "التنبؤ بالطلب والمخزون — لوحة التحكم" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ForecastingPage,
});

type StockRow = {
  id: string;
  name: string | null;
  name_ar: string | null;
  stock: number | null;
};

type ForecastRow = {
  id: string;
  name: string;
  stock: number;
  sold: number;
  dailyAverage: number;
  projectedWeek: number;
  coverageDays: number | null;
};

function ForecastingPage() {
  const [orders, setOrders] = useState<OrderView[]>([]);
  const [stock, setStock] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [orderData, stockResult] = await Promise.all([
        fetchOrdersWithItems({ limit: 500 }),
        supabase.from("products").select("id,name,name_ar,stock").eq("is_active", true),
      ]);
      if (stockResult.error) throw stockResult.error;
      setOrders(orderData);
      setStock((stockResult.data ?? []) as StockRow[]);
    } catch (error) {
      toast.error(
        `تعذر تحميل بيانات التنبؤ: ${error instanceof Error ? error.message : "خطأ غير معروف"}`,
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const rows = useMemo(() => buildForecastRows(orders, stock), [orders, stock]);
  const activeDemand = rows.filter((row) => row.sold > 0);
  const projectedUnits = activeDemand.reduce((sum, row) => sum + row.projectedWeek, 0);
  const atRisk = activeDemand.filter(
    (row) => row.coverageDays !== null && row.coverageDays < 7,
  ).length;

  return (
    <main className="admin-lux min-h-screen bg-slate-100 p-4 sm:p-6 lg:p-8" dir="rtl">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold text-emerald-600">الذكاء التشغيلي</p>
            <h1 className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">
              التنبؤ بالطلب والمخزون
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              تقدير مبني على مبيعات آخر 30 يومًا لمساعدة فريق التشغيل في التخطيط.
            </p>
          </div>
          <Button variant="outline" className="min-h-11 gap-2" onClick={() => void load()}>
            <RefreshCw className="size-4" /> تحديث البيانات
          </Button>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          <SummaryCard
            icon={TrendingUp}
            label="المتوقع خلال 7 أيام"
            value={projectedUnits}
            suffix="وحدة"
            tone="emerald"
          />
          <SummaryCard
            icon={Activity}
            label="أصناف ذات طلب"
            value={activeDemand.length}
            suffix="صنف"
            tone="blue"
          />
          <SummaryCard
            icon={CalendarDays}
            label="معرضة للنقص خلال أسبوع"
            value={atRisk}
            suffix="صنف"
            tone="amber"
          />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900">توقعات الأصناف</h2>
              <p className="mt-1 text-xs text-slate-500">
                المتوسط اليومي = الكمية المباعة ÷ 30 يومًا.
              </p>
            </div>
            <Package className="size-5 text-emerald-600" />
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-slate-500">جارٍ تحليل الطلبات…</div>
          ) : activeDemand.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
              لا توجد مبيعات كافية لإنشاء تقدير بعد.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {activeDemand.map((row) => (
                <article key={row.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-bold text-slate-900">{row.name}</h3>
                    <span
                      className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold ${
                        row.coverageDays !== null && row.coverageDays < 7
                          ? "bg-amber-50 text-amber-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {row.coverageDays === null
                        ? "غير محدد"
                        : `${formatDays(row.coverageDays)} يوم تغطية`}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <Metric label="المباع" value={`${formatNumber(row.sold)}`} />
                    <Metric label="يوميًا" value={`${formatNumber(row.dailyAverage)}`} />
                    <Metric label="7 أيام" value={`${formatNumber(row.projectedWeek)}`} />
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    المخزون الحالي:{" "}
                    <strong className="text-slate-700">{formatNumber(row.stock)}</strong>
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>

        <p className="text-xs leading-relaxed text-slate-500">
          هذا تقدير وصفي وليس نموذجًا تنبؤيًا آليًا؛ لا يغيّر المخزون أو ينشئ أوامر شراء تلقائيًا.
          يمكن ربطه لاحقًا بتاريخ التوريد والموسمية بعد تفعيل Schema الموردين وأوامر الشراء.
        </p>
      </div>
    </main>
  );
}

function buildForecastRows(orders: OrderView[], stock: StockRow[]): ForecastRow[] {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const soldByProduct = new Map<string, number>();
  for (const order of orders) {
    if (new Date(order.created_at).getTime() < cutoff || order.status === "cancelled") continue;
    for (const item of order.items) {
      if (!item.product_id) continue;
      soldByProduct.set(item.product_id, (soldByProduct.get(item.product_id) ?? 0) + item.quantity);
    }
  }

  return stock
    .map((product) => {
      const sold = soldByProduct.get(product.id) ?? 0;
      const dailyAverage = sold / 30;
      return {
        id: product.id,
        name: product.name_ar || product.name || "منتج",
        stock: Number(product.stock ?? 0),
        sold,
        dailyAverage,
        projectedWeek: dailyAverage * 7,
        coverageDays: dailyAverage > 0 ? Number(product.stock ?? 0) / dailyAverage : null,
      };
    })
    .sort((a, b) => b.sold - a.sold);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 1 }).format(value);
}

function formatDays(value: number) {
  return new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 1 }).format(value);
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-2">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="mt-1 font-black text-slate-800">{value}</p>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  suffix,
  tone,
}: {
  icon: typeof Package;
  label: string;
  value: number;
  suffix: string;
  tone: "emerald" | "blue" | "amber";
}) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-700",
    blue: "bg-sky-50 text-sky-700",
    amber: "bg-amber-50 text-amber-700",
  };
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`grid size-11 place-items-center rounded-xl ${tones[tone]}`}>
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-xs font-bold text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-black text-slate-900">
          {formatNumber(value)} <span className="text-xs font-bold text-slate-500">{suffix}</span>
        </p>
      </div>
    </div>
  );
}
