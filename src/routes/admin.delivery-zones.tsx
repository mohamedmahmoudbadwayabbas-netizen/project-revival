import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase-loose";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, MapPin, Pencil, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

type Zone = {
  id: string;
  name: string;
  country: string;
  governorate: string | null;
  city: string | null;
  area: string | null;
  fee: number;
  min_order_amount: number | null;
  estimated_minutes: number | null;
  is_active: boolean;
  sort_order: number | null;
};

const empty = {
  country: "مصر",
  governorate: "",
  city: "",
  area: "",
  fee: 0,
  min_order_amount: null as number | null,
  estimated_minutes: null as number | null,
  is_active: true,
  sort_order: 0,
};

export const Route = createFileRoute("/admin/delivery-zones")({
  head: () => ({
    meta: [
      { title: "مناطق التوصيل — لوحة التحكم" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ZonesPage,
});

function ZonesPage() {
  const [rows, setRows] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Zone | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("delivery_zones")
        .select("*")
        .order("country", { ascending: true })
        .order("governorate", { ascending: true })
        .order("city", { ascending: true })
        .order("area", { ascending: true });

      if (error) {
        console.warn("[Delivery Zones] Supabase error:", error.message);
      }

      const result = (data as Zone[]) || [];
      setRows(result);
    } catch (err) {
      console.error("[Delivery Zones] Error loading zones:", err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();

    const channel = supabase
      .channel("admin-delivery-zones-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_zones" }, () => {
        load();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...empty });
    setOpen(true);
  };

  const openEdit = (z: Zone) => {
    setEditing(z);
    setForm({
      country: z.country ?? "مصر",
      governorate: z.governorate ?? "",
      city: z.city ?? "",
      area: z.area ?? "",
      fee: Number(z.fee) || 0,
      min_order_amount: z.min_order_amount,
      estimated_minutes: z.estimated_minutes,
      is_active: z.is_active,
      sort_order: z.sort_order ?? 0,
    });
    setOpen(true);
  };

  const save = async () => {
    const country = form.country.trim();
    const governorate = form.governorate.trim();
    const city = form.city.trim();
    const area = form.area.trim();
    if (!country || !governorate) {
      toast.error("البلد والمحافظة مطلوبان");
      return;
    }
    const displayName = [governorate, city, area].filter(Boolean).join(" — ");
    const payload = {
      id: editing ? editing.id : `zone-${Date.now()}`,
      name: displayName || governorate,
      country,
      governorate: governorate || null,
      city: city || null,
      area: area || null,
      fee: Number(form.fee) || 0,
      min_order_amount: form.min_order_amount,
      estimated_minutes: form.estimated_minutes,
      is_active: form.is_active,
      sort_order: form.sort_order,
    };

    setSaving(true);
    const result = editing
      ? await supabase.from("delivery_zones").update(payload).eq("id", editing.id)
      : await supabase.from("delivery_zones").insert(payload);
    setSaving(false);
    if (result.error) return toast.error(`تعذر حفظ منطقة التوصيل: ${result.error.message}`);
    toast.success(editing ? "تم تحديث منطقة التوصيل بنجاح ✨" : "تمت إضافة منطقة التوصيل بنجاح ✨");
    setOpen(false);
    await load();
  };

  const remove = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف منطقة التوصيل هذه؟")) return;
    const { error } = await supabase.from("delivery_zones").delete().eq("id", id);
    if (error) return toast.error(`تعذر حذف منطقة التوصيل: ${error.message}`);
    toast.success("تم حذف منطقة التوصيل بنجاح");
    await load();
  };

  const toggle = async (z: Zone) => {
    const updated = { ...z, is_active: !z.is_active };
    const { error } = await supabase.from("delivery_zones").update({ is_active: updated.is_active }).eq("id", z.id);
    if (error) return toast.error(`تعذر تحديث المنطقة: ${error.message}`);
    toast.success(updated.is_active ? "تم تفعيل المنطقة" : "تم تعطيل المنطقة");
    await load();
  };

  const filtered = useMemo(() => {
    const s = q.trim();
    if (!s) return rows;
    return rows.filter((z) =>
      [z.country, z.governorate, z.city, z.area]
        .filter(Boolean)
        .some((v) => (v as string).includes(s)),
    );
  }, [rows, q]);

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black">مناطق التوصيل</h1>
          <p className="text-xs text-muted-foreground">
            أضف البلد، المحافظة، المدينة والمنطقة مع سعر التوصيل لكل منطقة.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={openCreate}
              className="rounded-xl hero-gradient text-primary-foreground"
            >
              <Plus className="me-1.5 h-4 w-4" /> إضافة منطقة
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl" className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "تعديل منطقة" : "منطقة توصيل جديدة"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <Field label="البلد *">
                  <Input
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                    placeholder="مصر"
                  />
                </Field>
                <Field label="المحافظة *">
                  <Input
                    value={form.governorate}
                    onChange={(e) => setForm({ ...form, governorate: e.target.value })}
                    placeholder="القاهرة"
                  />
                </Field>
                <Field label="المدينة">
                  <Input
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="مدينة نصر"
                  />
                </Field>
                <Field label="المنطقة / الحي">
                  <Input
                    value={form.area}
                    onChange={(e) => setForm({ ...form, area: e.target.value })}
                    placeholder="المنطقة العاشرة"
                  />
                </Field>
                <Field label="رسوم التوصيل (ج.م) *">
                  <Input
                    type="number"
                    min={0}
                    step="0.5"
                    value={form.fee}
                    onChange={(e) => setForm({ ...form, fee: Number(e.target.value) })}
                  />
                </Field>
                <Field label="وقت التوصيل التقريبي (دقيقة)">
                  <Input
                    type="number"
                    min={0}
                    value={form.estimated_minutes ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        estimated_minutes: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  />
                </Field>
                <Field label="الحد الأدنى للطلب (ج.م)">
                  <Input
                    type="number"
                    min={0}
                    step="0.5"
                    value={form.min_order_amount ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        min_order_amount: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  />
                </Field>
                <Field label="ترتيب العرض">
                  <Input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                  />
                </Field>
              </div>
              <label className="mt-1 flex items-center justify-between rounded-xl border border-border bg-secondary/40 p-3">
                <span className="text-sm font-bold">مفعّلة للعملاء</span>
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                />
              </label>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                إلغاء
              </Button>
              <Button
                onClick={save}
                disabled={saving}
                className="hero-gradient text-primary-foreground"
              >
                {saving ? <Loader2 className="me-1.5 h-4 w-4 animate-spin" /> : null}
                {editing ? "حفظ التعديلات" : "إضافة"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ابحث بالمحافظة أو المدينة..."
          className="pe-10"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> جارٍ التحميل...
          </div>
        ) : filtered.length === 0 ? (
          <div className="grid place-items-center gap-2 p-10 text-center text-muted-foreground">
            <MapPin className="h-8 w-8 opacity-40" />
            <p className="text-sm">لا توجد مناطق بعد — ابدأ بإضافة المحافظات ومناطقها.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-xs">
                <tr className="text-right">
                  <th className="p-3 font-bold">البلد</th>
                  <th className="p-3 font-bold">المحافظة</th>
                  <th className="p-3 font-bold">المدينة</th>
                  <th className="p-3 font-bold">المنطقة</th>
                  <th className="p-3 font-bold">الرسوم</th>
                  <th className="p-3 font-bold">حد أدنى</th>
                  <th className="p-3 font-bold">وقت تقريبي</th>
                  <th className="p-3 font-bold">مفعّلة</th>
                  <th className="p-3 font-bold">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((z) => (
                  <tr key={z.id} className="border-t border-border">
                    <td className="p-3">{z.country}</td>
                    <td className="p-3 font-bold">{z.governorate ?? "—"}</td>
                    <td className="p-3">{z.city ?? "—"}</td>
                    <td className="p-3">{z.area ?? "—"}</td>
                    <td className="p-3 font-black text-primary">{Number(z.fee).toFixed(2)} ج.م</td>
                    <td className="p-3 text-muted-foreground">
                      {z.min_order_amount ? `${z.min_order_amount} ج.م` : "—"}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {z.estimated_minutes ? `${z.estimated_minutes} د` : "—"}
                    </td>
                    <td className="p-3">
                      <Switch checked={z.is_active} onCheckedChange={() => toggle(z)} />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEdit(z)}
                          aria-label="تعديل"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => remove(z.id)}
                          aria-label="حذف"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold">{label}</span>
      {children}
    </label>
  );
}
