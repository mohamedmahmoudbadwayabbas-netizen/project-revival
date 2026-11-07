import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Gift, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase-loose";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

type Bundle = {
  id: string;
  name: string;
  description: string | null;
  buy_quantity: number;
  pay_quantity: number;
  product_ids: string[];
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
};

type Product = { id: string; name: string; name_ar: string | null; stock: number };

const emptyBundle: Omit<Bundle, "id"> = {
  name: "",
  description: "",
  buy_quantity: 3,
  pay_quantity: 2,
  product_ids: [],
  is_active: true,
  starts_at: null,
  ends_at: null,
};

export const Route = createFileRoute("/admin/bundles")({
  head: () => ({
    meta: [{ title: "الباقات والعروض المركبة — لوحة التحكم" }],
  }),
  component: BundlesPage,
});

function BundlesPage() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<(Omit<Bundle, "id"> & { id?: string }) | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: bundleRows, error: bundleError }, { data: productRows, error: productError }] =
      await Promise.all([
        supabase.from("product_bundles").select("*").order("created_at", { ascending: false }),
        supabase
          .from("products")
          .select("id,name,name_ar,stock")
          .eq("is_active", true)
          .order("name_ar"),
      ]);
    if (bundleError) toast.error(`تعذر تحميل الباقات: ${bundleError.message}`);
    if (productError) toast.error(`تعذر تحميل المنتجات: ${productError.message}`);
    setBundles((bundleRows ?? []) as Bundle[]);
    setProducts((productRows ?? []) as Product[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const visibleProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q
      ? products.filter((p) => `${p.name_ar ?? ""} ${p.name}`.toLowerCase().includes(q))
      : products;
  }, [products, search]);

  const save = async () => {
    if (!editing?.name.trim()) return toast.error("اسم الباقة مطلوب");
    if (editing.product_ids.length < 2) return toast.error("اختر منتجين على الأقل للباقة");
    if (editing.pay_quantity < 1 || editing.buy_quantity <= editing.pay_quantity)
      return toast.error("اجعل عدد المنتجات المدفوعة أقل من العدد المختار");

    const payload = {
      name: editing.name.trim(),
      description: editing.description?.trim() || null,
      buy_quantity: editing.buy_quantity,
      pay_quantity: editing.pay_quantity,
      product_ids: editing.product_ids,
      is_active: editing.is_active,
      starts_at: editing.starts_at || null,
      ends_at: editing.ends_at || null,
    };
    const result = editing.id
      ? await supabase.from("product_bundles").update(payload).eq("id", editing.id)
      : await supabase.from("product_bundles").insert(payload);
    if (result.error) return toast.error(`تعذر حفظ الباقة: ${result.error.message}`);
    toast.success("تم حفظ الباقة");
    setEditing(null);
    await load();
  };

  const remove = async (bundle: Bundle) => {
    if (!window.confirm(`حذف باقة «${bundle.name}»؟`)) return;
    const { error } = await supabase.from("product_bundles").delete().eq("id", bundle.id);
    if (error) return toast.error(`تعذر حذف الباقة: ${error.message}`);
    toast.success("تم حذف الباقة");
    await load();
  };

  return (
    <main dir="rtl" className="space-y-6 p-4 pb-24 sm:p-6">
      <header className="flex flex-col justify-between gap-4 border-b border-border pb-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <Gift className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black">الباقات والعروض المركبة</h1>
            <p className="text-sm text-muted-foreground">
              Mix & Match واشتري {3} واحصل على {2}
            </p>
          </div>
        </div>
        <Button onClick={() => setEditing({ ...emptyBundle })} className="gap-2">
          <Plus className="size-4" /> باقة جديدة
        </Button>
      </header>

      {editing && (
        <section className="space-y-4 rounded-3xl border border-primary/30 bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-black">{editing.id ? "تعديل الباقة" : "إضافة باقة"}</h2>
            <Button size="icon" variant="ghost" onClick={() => setEditing(null)} aria-label="إغلاق">
              <X className="size-4" />
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              placeholder="اسم الباقة: فطار الأسرة"
            />
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={2}
                value={editing.buy_quantity}
                onChange={(e) =>
                  setEditing({ ...editing, buy_quantity: Number(e.target.value) || 0 })
                }
                aria-label="عدد المنتجات المختارة"
              />
              <span className="text-sm font-bold">منتجات، ادفع</span>
              <Input
                type="number"
                min={1}
                value={editing.pay_quantity}
                onChange={(e) =>
                  setEditing({ ...editing, pay_quantity: Number(e.target.value) || 0 })
                }
                aria-label="عدد المنتجات المدفوعة"
              />
            </div>
          </div>
          <Textarea
            value={editing.description ?? ""}
            onChange={(e) => setEditing({ ...editing, description: e.target.value })}
            placeholder="وصف مختصر للعرض"
            rows={2}
          />
          <div className="flex items-center justify-between rounded-xl bg-secondary/40 p-3">
            <span className="text-sm font-bold">الباقة مفعلة</span>
            <Switch
              checked={editing.is_active}
              onCheckedChange={(is_active) => setEditing({ ...editing, is_active })}
            />
          </div>
          <div className="space-y-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن المنتجات لإضافتها"
            />
            <div className="grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
              {visibleProducts.map((product) => {
                const checked = editing.product_ids.includes(product.id);
                return (
                  <label
                    key={product.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm ${
                      checked ? "border-primary bg-primary/10" : "border-border"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setEditing({
                          ...editing,
                          product_ids: checked
                            ? editing.product_ids.filter((id) => id !== product.id)
                            : [...editing.product_ids, product.id],
                        })
                      }
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {product.name_ar || product.name}
                    </span>
                    <small className="text-muted-foreground">{product.stock}</small>
                  </label>
                );
              })}
            </div>
          </div>
          <Button onClick={() => void save()} className="gap-2">
            <Save className="size-4" /> حفظ الباقة
          </Button>
        </section>
      )}

      {loading ? (
        <p className="text-muted-foreground">جارٍ تحميل الباقات…</p>
      ) : bundles.length === 0 ? (
        <div className="rounded-3xl border border-dashed p-10 text-center text-muted-foreground">
          لا توجد باقات بعد. أنشئ أول عرض مركب من المنتجات.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {bundles.map((bundle) => (
            <article key={bundle.id} className="space-y-4 rounded-3xl border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-black">{bundle.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{bundle.description}</p>
                </div>
                <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
                  {bundle.is_active ? "نشطة" : "متوقفة"}
                </span>
              </div>
              <p className="rounded-xl bg-secondary/40 p-3 text-sm font-bold">
                اختر {bundle.buy_quantity} منتجات وادفع ثمن {bundle.pay_quantity}
              </p>
              <p className="text-xs text-muted-foreground">
                {bundle.product_ids.length} منتجات متاحة للاختيار
              </p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setEditing(bundle)}>
                  تعديل
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => void remove(bundle)}
                  aria-label="حذف"
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
