import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Package, RefreshCw, Search, Truck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase-loose";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/admin/replenishment")({
  head: () => ({
    meta: [
      { title: "اقتراحات إعادة الشراء — لوحة التحكم" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ReplenishmentPage,
});

type ProductStock = {
  id: string;
  name: string;
  stock: number;
  threshold: number;
  price: number;
  is_active: boolean;
};

type ProductStockRow = {
  id: string;
  name: string | null;
  name_ar: string | null;
  stock: number | null;
  low_stock_threshold?: number | null;
  price: number | null;
  is_active: boolean | null;
};

function ReplenishmentPage() {
  const [products, setProducts] = useState<ProductStock[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("id,name,name_ar,stock,price,is_active")
      .eq("is_active", true)
      .order("stock", { ascending: true })
      .limit(500);

    if (error) {
      toast.error(`تعذر تحميل اقتراحات إعادة الشراء: ${error.message}`);
      setLoading(false);
      return;
    }

    setProducts(
      (data ?? []).map((product: ProductStockRow) => ({
        id: product.id,
        name: product.name_ar || product.name || "منتج",
        stock: Number(product.stock ?? 0),
        threshold: Number(product.low_stock_threshold ?? 10),
        price: Number(product.price ?? 0),
        is_active: Boolean(product.is_active),
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const suggestions = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return products
      .filter((product) => product.stock <= product.threshold)
      .filter((product) => !query || product.name.toLocaleLowerCase().includes(query))
      .sort((a, b) => a.stock / Math.max(a.threshold, 1) - b.stock / Math.max(b.threshold, 1));
  }, [products, search]);

  const criticalCount = suggestions.filter((product) => product.stock <= 0).length;
  const suggestedUnits = suggestions.reduce(
    (total, product) => total + Math.max(product.threshold * 2 - product.stock, 1),
    0,
  );

  return (
    <main className="admin-lux min-h-screen bg-slate-100 p-4 sm:p-6 lg:p-8" dir="rtl">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold text-emerald-600">العمليات والمخزون</p>
            <h1 className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">
              اقتراحات إعادة الشراء
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              قائمة تشغيلية بالأصناف التي وصلت إلى حد التنبيه أو أقل.
            </p>
          </div>
          <Button variant="outline" className="min-h-11 gap-2" onClick={() => void load()}>
            <RefreshCw className="size-4" /> تحديث البيانات
          </Button>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          <SummaryCard
            icon={Package}
            label="أصناف تحتاج مراجعة"
            value={suggestions.length}
            tone="emerald"
          />
          <SummaryCard icon={AlertTriangle} label="نفدت بالكامل" value={criticalCount} tone="red" />
          <SummaryCard
            icon={Truck}
            label="وحدات مقترحة للطلب"
            value={suggestedUnits}
            tone="amber"
          />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-black text-slate-900">قائمة الأولويات</h2>
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ابحث عن منتج"
                className="min-h-11 rounded-xl ps-9"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-slate-500">جارٍ تحميل المخزون…</div>
          ) : suggestions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50 p-8 text-center text-sm font-bold text-emerald-700">
              لا توجد أصناف تحت حد التنبيه حاليًا.
            </div>
          ) : (
            <div className="space-y-3">
              {suggestions.map((product) => {
                const recommended = Math.max(product.threshold * 2 - product.stock, 1);
                const isCritical = product.stock <= 0;
                return (
                  <article
                    key={product.id}
                    className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate font-bold text-slate-900">{product.name}</h3>
                        {isCritical && (
                          <span className="shrink-0 rounded-full bg-red-50 px-2 py-1 text-xs font-bold text-red-600">
                            نافد
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        المتاح:{" "}
                        <strong className={isCritical ? "text-red-600" : "text-amber-600"}>
                          {product.stock}
                        </strong>{" "}
                        · حد التنبيه: {product.threshold}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-5 sm:justify-end">
                      <div className="text-start">
                        <p className="text-xs text-slate-500">الكمية المقترحة</p>
                        <p className="text-lg font-black text-emerald-700">{recommended} وحدة</p>
                      </div>
                      <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-500">
                        لا يوجد مورد مرتبط
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <p className="text-xs leading-relaxed text-slate-500">
          هذه الاقتراحات مبنية على المخزون الحالي وحد التنبيه. إنشاء أمر شراء وربطه بمورد يتطلب
          تفعيل جداول الموردين وأوامر الشراء وRPC الخادمي.
        </p>
      </div>
    </main>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Package;
  label: string;
  value: number;
  tone: "emerald" | "red" | "amber";
}) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-600",
    amber: "bg-amber-50 text-amber-700",
  };
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`grid size-11 place-items-center rounded-xl ${tones[tone]}`}>
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-xs font-bold text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
      </div>
    </div>
  );
}
