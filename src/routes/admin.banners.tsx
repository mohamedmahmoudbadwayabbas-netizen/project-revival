import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-loose";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Image as ImageIcon, Loader2, Save, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { motion } from "motion/react";

export const Route = createFileRoute("/admin/banners")({
  head: () => ({ meta: [{ title: "إدارة واجهة البانر — لوحة التحكم" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: BannersPage,
});

function BannersPage() {
  const [rowId, setRowId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [cta, setCta] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("store_settings").select("id,hero_title,hero_subtitle,hero_cta_text,hero_image_url").limit(1).maybeSingle();
    if (error) toast.error(`تعذر تحميل إعدادات الواجهة: ${error.message}`);
    if (data) {
      setRowId(data.id); setTitle(data.hero_title ?? ""); setSubtitle(data.hero_subtitle ?? ""); setCta(data.hero_cta_text ?? ""); setImageUrl(data.hero_image_url ?? "");
    }
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const upload = async (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("يرجى اختيار صورة صالحة");
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `hero/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("store-assets").upload(path, file, { contentType: file.type, upsert: true });
      if (error) throw error;
      const { data } = await supabase.storage.from("store-assets").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (!data?.signedUrl) throw new Error("تعذر إنشاء رابط الصورة");
      setImageUrl(data.signedUrl);
    } catch (error: any) { toast.error(`فشل رفع الصورة: ${error.message}`); } finally { setUploading(false); }
  };

  const save = async () => {
    if (!rowId) return toast.error("لم يتم العثور على سجل إعدادات المتجر");
    setSaving(true);
    const { error } = await supabase.from("store_settings").update({ hero_title: title || null, hero_subtitle: subtitle || null, hero_cta_text: cta || null, hero_image_url: imageUrl || null }).eq("id", rowId);
    setSaving(false);
    if (error) return toast.error(`تعذر حفظ البانر: ${error.message}`);
    toast.success("تم حفظ إعدادات واجهة البانر");
  };

  return <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 p-4 pb-24 sm:p-6" dir="rtl">
    <div className="flex items-center justify-between border-b pb-4"><div><h1 className="font-display text-2xl font-black">إدارة واجهة البانر</h1><p className="mt-1 text-xs font-bold text-muted-foreground">الواجهة الحالية تعتمد على store_settings؛ لا يوجد جدول hero_banners منفصل في قاعدة البيانات.</p></div><Button variant="outline" onClick={() => void load()} disabled={loading} className="rounded-xl"><RefreshCw className="h-4 w-4" /></Button></div>
    {loading ? <div className="py-16 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div> : <div className="mx-auto max-w-3xl space-y-5 rounded-3xl border bg-card p-5 shadow-sm">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان البانر" />
      <Textarea value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="الوصف الفرعي" />
      <Input value={cta} onChange={(e) => setCta(e.target.value)} placeholder="نص زر الدعوة للإجراء" />
      <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="رابط صورة البانر" />
      <div className="space-y-2"><div className="flex items-center justify-between"><span className="text-xs font-bold">صورة الواجهة</span><label className="inline-flex cursor-pointer items-center gap-1 rounded-xl border px-3 py-2 text-xs font-bold hover:bg-secondary"><Upload className="h-4 w-4" />{uploading ? "جاري الرفع..." : "رفع صورة"}<input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} /></label></div>{imageUrl ? <img src={imageUrl} alt="معاينة البانر" className="h-64 w-full rounded-2xl object-cover" /> : <div className="grid h-48 place-items-center rounded-2xl border border-dashed text-muted-foreground"><ImageIcon /></div>}</div>
      <div className="flex justify-end"><Button onClick={() => void save()} disabled={saving} className="rounded-xl hero-gradient font-black"><Save className="me-1 h-4 w-4" />{saving ? "جاري الحفظ..." : "حفظ"}</Button></div>
    </div>}
  </motion.div>;
}
