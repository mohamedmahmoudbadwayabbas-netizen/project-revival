import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Building2, MapPin, Package, Pencil, Plus, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase-loose";

export const Route = createFileRoute("/admin/branches")({
  head: () => ({
    meta: [
      { title: "الفروع والمخزون الجغرافي — لوحة التحكم" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: BranchesPage,
});

type Branch = {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  phone: string | null;
  is_active: boolean;
};
type Product = { id: string; name: string | null; name_ar: string | null; stock: number | null };

function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ name: "", city: "", address: "", phone: "" });

  const load = async () => {
    setLoading(true);
    const [{ data: zones, error: zonesError }, { data: productRows, error: productsError }] =
      await Promise.all([
        supabase.from("branches").select("id,name,city,address,phone,is_active").order("name"),
        supabase.from("products").select("id,name,name_ar,stock").eq("is_active", true).limit(500),
      ]);
    if (zonesError || productsError) {
      toast.error(`تعذر تحميل بيانات الفروع: ${(zonesError ?? productsError)?.message}`);
    }
    const nextBranches = (zones ?? []) as Branch[];
    setBranches(nextBranches);
    setProducts((productRows ?? []) as Product[]);
    setSelectedId((current) => current || nextBranches[0]?.id || "");
    setLoading(false);
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
    setForm({ name: "", city: "", address: "", phone: "" });
  };

  const openEdit = (branch: Branch) => {
    setEditing(branch);
    setFormOpen(true);
    setForm({
      name: branch.name,
      city: branch.city ?? "",
      address: branch.address ?? "",
      phone: branch.phone ?? "",
    });
  };

  const saveBranch = async () => {
    if (!form.name.trim()) {
      toast.error("اسم الفرع مطلوب");
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      city: form.city.trim() || null,
      address: form.address.trim() || null,
      phone: form.phone.trim() || null,
      is_active: true,
    };
    const result = editing
      ? await supabase.from("branches").update(payload).eq("id", editing.id)
      : await supabase.from("branches").insert(payload);
    setSaving(false);
    if (result.error) {
      toast.error(`تعذر حفظ الفرع: ${result.error.message}`);
      return;
    }
    toast.success(editing ? "تم تحديث الفرع" : "تمت إضافة الفرع");
    setEditing(null);
    setFormOpen(false);
    setForm({ name: "", city: "", address: "", phone: "" });
    await load();
  };

  useEffect(() => {
    void load();
  }, []);

  const currentBranch = branches.find((branch) => branch.id === selectedId);
  const filteredProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return products.filter(
      (product) =>
        !query || (product.name_ar || product.name || "").toLocaleLowerCase().includes(query),
    );
  }, [products, search]);

  return (
    <main className="admin-lux min-h-screen bg-slate-100 p-4 sm:p-6 lg:p-8" dir="rtl">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold text-emerald-600">التوسع المؤسسي</p>
            <h1 className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">
              الفروع والمخزون الجغرافي
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              معاينة الفروع الحالية والكتالوج العام قبل تفعيل مخزون مستقل لكل فرع.
            </p>
          </div>
          <Button variant="outline" className="min-h-11 gap-2" onClick={() => void load()}>
            <RefreshCw className="size-4" /> تحديث البيانات
          </Button>
          <Button
            className="min-h-11 gap-2 bg-emerald-600 hover:bg-emerald-700"
            onClick={openCreate}
          >
            <Plus className="size-4" /> إضافة فرع
          </Button>
        </header>

        {formOpen && (
          <section className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="mb-4 font-black text-slate-900">
              {editing ? "تعديل الفرع" : "فرع جديد"}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(["name", "city", "address", "phone"] as const).map((field) => (
                <Input
                  key={field}
                  value={form[field]}
                  onChange={(event) => setForm({ ...form, [field]: event.target.value })}
                  placeholder={
                    field === "name"
                      ? "اسم الفرع *"
                      : field === "city"
                        ? "المدينة"
                        : field === "address"
                          ? "العنوان"
                          : "الهاتف"
                  }
                  className="min-h-11 rounded-xl"
                />
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <Button disabled={saving} onClick={() => void saveBranch()}>
                {saving ? "جارٍ الحفظ…" : "حفظ الفرع"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(false);
                  setForm({ name: "", city: "", address: "", phone: "" });
                }}
              >
                إلغاء
              </Button>
            </div>
          </section>
        )}

        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="mb-3 flex items-center gap-2 px-2">
              <Building2 className="size-4 text-emerald-600" />
              <h2 className="font-black text-slate-900">الفروع</h2>
            </div>
            {branches.length === 0 && !loading ? (
              <p className="p-4 text-sm text-slate-500">لا توجد فروع معرفة بعد.</p>
            ) : (
              <div className="space-y-2">
                {branches.map((branch) => (
                  <button
                    key={branch.id}
                    type="button"
                    onClick={() => setSelectedId(branch.id)}
                    className={`w-full rounded-xl p-3 text-start ${
                      selectedId === branch.id
                        ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <strong className="block truncate text-sm">{branch.name}</strong>
                    <span className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                      <MapPin className="size-3" /> {branch.city || "الموقع غير محدد"}
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(event) => {
                        event.stopPropagation();
                        openEdit(branch);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          event.stopPropagation();
                          openEdit(branch);
                        }
                      }}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-700"
                    >
                      <Pencil className="size-3" /> تعديل
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold text-emerald-600">الفرع المحدد</p>
                <h2 className="mt-1 text-xl font-black text-slate-900">
                  {currentBranch?.name || "اختر فرعًا"}
                </h2>
              </div>
              <div className="relative w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="ابحث في الكتالوج"
                  className="min-h-11 rounded-xl ps-9"
                />
              </div>
            </div>
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-800">
              <Package className="size-4 shrink-0" />
              المخزون المعروض حاليًا موحد؛ لم يتم إنشاء مخزون مستقل للفروع بعد.
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 p-3"
                >
                  <span className="truncate text-sm font-bold text-slate-800">
                    {product.name_ar || product.name || "منتج"}
                  </span>
                  <span className="ms-3 shrink-0 text-xs font-bold text-slate-500">
                    المخزون العام: {Number(product.stock ?? 0)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
        <p className="text-xs leading-relaxed text-slate-500">
          تفعيل Geo Inventory يتطلب جدول branch_inventory مع branch_id وproduct_id وstock
          وsafety_stock وreorder_point وaisle وbin، إضافة إلى سياسات RLS وربط اختيار العميل بأقرب
          فرع.
        </p>
      </div>
    </main>
  );
}
