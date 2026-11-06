import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase-loose";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Upload, Image as ImageIcon, Search, FolderTree, Loader2, RefreshCw, Grid, List } from "lucide-react";
import { toast } from "sonner";
import { motion } from "motion/react";

type Category = {
  id: string;
  name: string;
  name_ar: string | null;
  slug: string;
  image_url: string | null;
  created_at: string | null;
};

const PRESET_GALLERY = [
  ["خضروات وفواكه", "https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=800&q=80"],
  ["البقالة والتموين", "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80"],
  ["الألبان والأجبان", "https://images.unsplash.com/photo-1628088062854-d1870b4553da?auto=format&fit=crop&w=800&q=80"],
  ["لحوم ودواجن", "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=800&q=80"],
  ["المخبوزات والحلويات", "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80"],
];

export const Route = createFileRoute("/admin/categories")({
  head: () => ({ meta: [{ title: "إدارة الأقسام — لوحة التحكم" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const [rows, setRows] = useState<Category[]>([]);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});
  const [editing, setEditing] = useState<Partial<Category> | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const fileRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [{ data: cats, error: catError }, { data: products, error: productError }] = await Promise.all([
        supabase.from("categories").select("id,name,name_ar,slug,image_url,created_at").order("created_at", { ascending: true }),
        supabase.from("products").select("id,category_id"),
      ]);
      if (catError) throw catError;
      if (productError) throw productError;
      const counts: Record<string, number> = {};
      for (const p of products ?? []) if (p.category_id) counts[p.category_id] = (counts[p.category_id] ?? 0) + 1;
      setRows((cats ?? []) as Category[]);
      setProductCounts(counts);
    } catch (error: any) {
      toast.error(`تعذر جلب الأقسام: ${error.message || "خطأ في الشبكة"}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleUploadFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("يرجى اختيار ملف صورة صالح");
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `categories/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("store-assets").upload(path, file, { contentType: file.type, upsert: true });
      if (error) throw error;
      const { data } = await supabase.storage.from("store-assets").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (!data?.signedUrl) throw new Error("تعذر إنشاء رابط الصورة");
      setEditing((prev) => ({ ...(prev ?? {}), image_url: data.signedUrl }));
      toast.success("تم رفع الصورة بنجاح");
    } catch (error: any) {
      toast.error(`فشل رفع الصورة: ${error.message}`);
    } finally { setUploading(false); }
  };

  const saveCategory = async () => {
    const current = editing;
    if (!current) return toast.error("اختر قسمًا أو أنشئ قسمًا جديدًا");
    const name = current.name?.trim() ?? "";
    if (!name) return toast.error("اسم القسم مطلوب");
    const slug = (current.slug || name).toLowerCase().replace(/[^\w\u0621-\u064A]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || `cat-${Date.now()}`;
    const payload = { name, name_ar: current.name_ar?.trim() || null, slug, image_url: current.image_url || null };
    try {
      const result = current.id ? await supabase.from("categories").update(payload).eq("id", current.id) : await supabase.from("categories").insert(payload);
      if (result.error) throw result.error;
      toast.success(current.id ? "تم تحديث القسم" : "تم إضافة القسم");
      setEditing(null);
      await loadData();
    } catch (error: any) { toast.error(`تعذر حفظ القسم: ${error.message}`); }
  };

  const removeCategory = async (cat: Category) => {
    const count = productCounts[cat.id] ?? 0;
    if (count > 0) return toast.error(`لا يمكن حذف القسم لأنه مرتبط بـ ${count} منتجًا`);
    if (!confirm(`هل أنت متأكد من حذف القسم "${cat.name}"؟`)) return;
    const { error } = await supabase.from("categories").delete().eq("id", cat.id);
    if (error) return toast.error(`تعذر الحذف: ${error.message}`);
    toast.success("تم حذف القسم");
    await loadData();
  };

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((c) => [c.name, c.name_ar, c.slug].some((v) => v?.toLowerCase().includes(q)));
  }, [rows, searchQuery]);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 p-4 pb-24 sm:p-6" dir="rtl">
      <div className="flex flex-col justify-between gap-4 border-b border-border/60 pb-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-2xl hero-gradient text-primary-foreground"><FolderTree className="h-5 w-5" /></div><div><h1 className="font-display text-2xl font-black">إدارة الأقسام</h1><p className="mt-0.5 text-xs font-bold text-muted-foreground">الأقسام في قاعدة البيانات الحالية مسطّحة بدون hierarchy أو reordering.</p></div></div>
        <div className="flex gap-2"><Button variant="outline" onClick={loadData} disabled={loading} className="rounded-2xl"><RefreshCw className="h-4 w-4" /></Button><Button onClick={() => setEditing({ name: "", name_ar: "", slug: "", image_url: null })} className="rounded-2xl hero-gradient font-black"><Plus className="h-4 w-4" /> إضافة قسم</Button></div>
      </div>

      <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card p-3 sm:flex-row">
        <div className="relative w-full sm:w-80"><Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="البحث باسم القسم أو المعرّف..." className="ps-9" /></div>
        <div className="flex items-center gap-2"><span className="text-xs font-bold text-muted-foreground">{filteredRows.length} قسم</span><Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="icon" onClick={() => setViewMode("grid")}><Grid className="h-4 w-4" /></Button><Button variant={viewMode === "list" ? "secondary" : "ghost"} size="icon" onClick={() => setViewMode("list")}><List className="h-4 w-4" /></Button></div>
      </div>

      {loading ? <div className="py-16 text-center text-sm font-bold text-muted-foreground"><Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" />جاري تحميل الأقسام...</div> : filteredRows.length === 0 ? <div className="rounded-3xl border border-dashed p-12 text-center text-sm font-bold text-muted-foreground">لا توجد أقسام مطابقة.</div> : <div className={viewMode === "grid" ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" : "space-y-2"}>{filteredRows.map((cat) => <div key={cat.id} className={viewMode === "grid" ? "overflow-hidden rounded-3xl border bg-card" : "flex items-center gap-3 rounded-2xl border bg-card p-3"}>
        <div className={viewMode === "grid" ? "relative h-40 bg-secondary" : "h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-secondary"}>{cat.image_url ? <img src={cat.image_url} alt={cat.name_ar || cat.name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-3xl">🌿</div>}</div>
        <div className={viewMode === "grid" ? "p-3.5" : "min-w-0 flex-1"}><div className="flex items-start justify-between gap-2"><div><h3 className="font-display font-black">{cat.name_ar || cat.name}</h3>{cat.name_ar && cat.name_ar !== cat.name && <p className="text-xs text-muted-foreground">{cat.name}</p>}<p className="mt-1 text-[11px] text-muted-foreground">{productCounts[cat.id] ?? 0} منتج</p></div><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => setEditing(cat)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => removeCategory(cat)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></div></div>
      </div>)}</div>}

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}><DialogContent dir="rtl" className="max-w-xl"><DialogHeader><DialogTitle>{editing?.id ? "تعديل القسم" : "إضافة قسم"}</DialogTitle></DialogHeader><div className="space-y-4 py-2"><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><Input placeholder="الاسم" value={editing?.name ?? ""} onChange={(e) => setEditing((p) => ({ ...(p ?? {}), name: e.target.value }))} /><Input placeholder="الاسم بالعربية" value={editing?.name_ar ?? ""} onChange={(e) => setEditing((p) => ({ ...(p ?? {}), name_ar: e.target.value }))} /></div><Input placeholder="Slug" value={editing?.slug ?? ""} onChange={(e) => setEditing((p) => ({ ...(p ?? {}), slug: e.target.value }))} /><div className="space-y-2"><div className="flex items-center justify-between"><span className="text-xs font-bold">صورة القسم</span><Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}><Upload className="me-1 h-4 w-4" />{uploading ? "جاري الرفع..." : "رفع صورة"}</Button><input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUploadFile(f); }} /></div>{editing?.image_url ? <img src={editing.image_url} alt="" className="h-40 w-full rounded-2xl object-cover" /> : <div className="grid h-32 place-items-center rounded-2xl border border-dashed text-muted-foreground"><ImageIcon className="h-8 w-8" /></div>}<div className="flex flex-wrap gap-2">{PRESET_GALLERY.map(([label, url]) => <button key={url} type="button" onClick={() => setEditing((p) => ({ ...(p ?? {}), image_url: url }))} className="rounded-xl border px-2.5 py-1 text-[11px] font-bold hover:border-emerald-500">{label}</button>)}</div></div></div><DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>إلغاء</Button><Button onClick={saveCategory} className="hero-gradient font-black">حفظ</Button></DialogFooter></DialogContent></Dialog>
    </motion.div>
  );
}
