import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, ClipboardList, PackageSearch, RefreshCw, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { fetchOrdersWithItems, type OrderView } from "@/services/orderDataService";

export const Route = createFileRoute("/picker")({
  head: () => ({
    meta: [
      { title: "شاشة تجهيز الطلبات — Picker" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1" },
    ],
  }),
  component: PickerPage,
});

type PickedItems = Record<string, boolean>;

function PickerPage() {
  const [orders, setOrders] = useState<OrderView[]>([]);
  const [picked, setPicked] = useState<PickedItems>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setOrders(await fetchOrdersWithItems({ statuses: ["pending", "confirmed"], limit: 50 }));
    } catch (error) {
      toast.error(
        `تعذر تحميل طلبات التجهيز: ${error instanceof Error ? error.message : "خطأ غير معروف"}`,
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const activeOrder = orders[0];
  const sortedItems = useMemo(
    () => [...(activeOrder?.items ?? [])].sort((a, b) => a.name.localeCompare(b.name, "ar")),
    [activeOrder],
  );
  const pickedCount = sortedItems.filter((item) => picked[`${activeOrder?.id}:${item.id}`]).length;

  const togglePicked = (key: string) => {
    setPicked((current) => ({ ...current, [key]: !current[key] }));
  };

  return (
    <main className="min-h-screen bg-slate-100 pb-8" dir="rtl">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-emerald-600 text-white">
              <ClipboardList className="size-5" />
            </div>
            <div>
              <h1 className="font-black text-slate-900">تجهيز الطلبات</h1>
              <p className="text-xs text-slate-500">شاشة موظف التجهيز</p>
            </div>
          </div>
          <Button variant="outline" size="icon" className="size-11" onClick={() => void load()}>
            <RefreshCw className="size-4" />
            <span className="sr-only">تحديث</span>
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-4 p-4 sm:p-6">
        <div className="grid grid-cols-2 gap-3">
          <Stat icon={PackageSearch} label="طلبات بانتظار التجهيز" value={orders.length} />
          <Stat icon={ScanLine} label="أصناف تم جمعها" value={pickedCount} />
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-10 text-center text-sm text-slate-500">
            جارٍ تحميل قائمة التجهيز…
          </div>
        ) : !activeOrder ? (
          <div className="rounded-2xl border border-dashed border-emerald-200 bg-white p-10 text-center">
            <Check className="mx-auto size-10 text-emerald-600" />
            <h2 className="mt-3 font-black text-slate-900">لا توجد طلبات جاهزة للتجهيز</h2>
            <p className="mt-1 text-sm text-slate-500">
              ستظهر الطلبات الجديدة هنا تلقائيًا بعد ربط التحديث اللحظي.
            </p>
          </div>
        ) : (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs font-bold text-emerald-600">الطلب الحالي</p>
                <h2 className="mt-1 font-black text-slate-900">#{activeOrder.id.slice(0, 8)}</h2>
                <p className="mt-1 text-xs text-slate-500">{activeOrder.customer_name || "عميل"}</p>
              </div>
              <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
                {pickedCount}/{sortedItems.length} تم الجمع
              </span>
            </div>

            <div className="space-y-3">
              {sortedItems.map((item) => {
                const key = `${activeOrder.id}:${item.id}`;
                const isPicked = Boolean(picked[key]);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => togglePicked(key)}
                    className={`flex min-h-16 w-full items-center justify-between gap-3 rounded-xl border p-4 text-start transition-colors ${
                      isPicked
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-slate-200 bg-white hover:border-emerald-300"
                    }`}
                  >
                    <span className="min-w-0">
                      <strong
                        className={`block truncate ${isPicked ? "text-emerald-800" : "text-slate-900"}`}
                      >
                        {item.name}
                      </strong>
                      <span className="mt-1 block text-xs text-slate-500">
                        الكمية: {item.quantity} · الممر والرف يضافان بعد تفعيل بيانات التخزين
                      </span>
                    </span>
                    <span
                      className={`grid size-10 shrink-0 place-items-center rounded-full ${
                        isPicked ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      <Check className="size-5" />
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <p className="text-xs leading-relaxed text-slate-500">
          حالة «تم الجمع» محفوظة محليًا في هذه النسخة. الحفظ الخادمي، ترتيب الممرات، مسح الباركود
          وإسناد المهام ستُفعّل بعد إنشاء جداول Picker والمخزون في قاعدة البيانات.
        </p>
      </div>
    </main>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof PackageSearch;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <Icon className="size-5 text-emerald-600" />
      <p className="mt-3 text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
    </div>
  );
}
