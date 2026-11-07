import { NumberInput } from "@/components/ui/number-input";
import { createFileRoute } from "@tanstack/react-router";
import { normalizeStoreIdentity, STORE_IDENTITY } from "@/lib/store-identity";
import { lazy, Suspense, useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase-loose";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import {
  Save,
  Loader2,
  MapPin,
  Palette,
  Megaphone,
  BarChart3,
  Store,
  ShoppingCart,
  Search,
  User,
  Leaf,
  CheckCircle2,
  Sparkles,
  Smartphone,
  Truck,
  Tag,
  Image as ImageIcon,
  Sliders,
  RotateCcw,
  Download,
  Upload,
  PhoneCall,
  Activity,
  Globe,
  Database,
} from "lucide-react";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { RealStorePreview } from "@/components/admin/RealStorePreview";
import { AiProviderSettings } from "@/components/admin/AiProviderSettings";
import { SettingsHistory } from "@/components/admin/SettingsHistory";

// Lazy Load Map Component
const StoreMapPicker = lazy(() =>
  import("@/components/admin/StoreMapPicker").then((m) => ({ default: m.StoreMapPicker })),
);

type Settings = {
  id?: string;
  whatsapp_number: string | null;
  hero_title: string;
  hero_subtitle: string;
  hero_image_url: string | null;
  hero_cta_text: string;
  store_address: string | null;
  store_lat: number | null;
  store_lng: number | null;
  site_name: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string | null;
  accent_color: string | null;
  background_color: string | null;
  foreground_color: string | null;
  announcement_text: string | null;
  announcement_enabled: boolean | null;
  announcement_bg_color: string | null;
  ga4_id: string | null;
  meta_pixel_id: string | null;
  min_order_amount: number | null;
  default_delivery_fee: number | null;
  free_shipping_threshold?: number | null;
  first_order_coupon_enabled: boolean | null;
  first_order_coupon_code: string | null;
  first_order_discount_percent: number | null;
  hero_bg_image: string | null;
  login_bg_pattern: string | null;
  cart_empty_bg: string | null;
  floating_element_image: string | null;
  font_family?: string | null;

  // Customizer Fields
  categories_style?: "grid" | "scroll" | "cards" | "pills";
  products_style?: "modern" | "compact" | "bordered" | "glass";
  card_radius?: "rounded-xl" | "rounded-2xl" | "rounded-3xl";
  hero_style?: "gradient" | "image" | "split";
};

const DEFAULT_SETTINGS: Settings = {
  whatsapp_number: null,
  hero_title: "",
  hero_subtitle: "",
  hero_image_url: null,
  hero_cta_text: "",
  store_address: null,
  store_lat: null,
  store_lng: null,
  site_name: null,
  logo_url: null,
  favicon_url: null,
  primary_color: STORE_IDENTITY.greenHsl,
  accent_color: STORE_IDENTITY.rustHsl,
  background_color: STORE_IDENTITY.creamHsl,
  foreground_color: STORE_IDENTITY.inkHsl,
  announcement_text: null,
  announcement_enabled: false,
  announcement_bg_color: STORE_IDENTITY.greenHsl,
  ga4_id: null,
  meta_pixel_id: null,
  min_order_amount: 100,
  default_delivery_fee: 35,
  free_shipping_threshold: 500,
  first_order_coupon_enabled: false,
  first_order_coupon_code: "WELCOME10",
  first_order_discount_percent: 10,
  hero_bg_image:
    "https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=1600&q=85",
  login_bg_pattern: null,
  cart_empty_bg: null,
  floating_element_image:
    "https://images.unsplash.com/photo-1588964895597-cfccd6e2dbf9?auto=format&fit=crop&w=500&q=80",

  categories_style: "grid",
  products_style: "modern",
  card_radius: "rounded-2xl",
  hero_style: "image",
};

export const Route = createFileRoute("/admin/settings")({
  head: () => ({
    meta: [
      { title: "إعدادات المتجر — لوحة التحكم" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const [s, setS] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [saved, setSaved] = useState<Settings | null>(null);
  const [historyKey, setHistoryKey] = useState(0);
  const [showMap, setShowMap] = useState(false);

  // Load authoritative store settings from Supabase.
  useEffect(() => {
    let mounted = true;
    void supabase
      .from("store_settings")
      .select("*")
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!mounted) return;
        const initial = error
          ? DEFAULT_SETTINGS
          : (normalizeStoreIdentity({ ...DEFAULT_SETTINGS, ...(data ?? {}) }) as Settings);
        if (error) toast.error(`تعذر تحميل إعدادات المتجر: ${error.message}`);
        setS(initial);
        setSaved(initial);
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const dirty = !!s && !!saved && JSON.stringify(s) !== JSON.stringify(saved);

  // Explicit Save is the only persistence point; the previous version goes to the history log first.
  const handleSaveAll = async () => {
    if (!s || !dirty) {
      toast.info("لا توجد تعديلات جديدة للحفظ");
      return;
    }
    setSaving(true);
    setProgress(40);
    const { data: auth } = await supabase.auth.getUser();
    if (saved) {
      await supabase.from("store_settings_history").insert({
        snapshot: saved,
        note: "النسخة قبل الحفظ",
        actor_email: auth.user?.email ?? null,
      });
    }
    const payload = {
      ...(s.id ? { id: s.id } : {}),
      site_name: s.site_name ?? null,
      hero_title: s.hero_title,
      hero_subtitle: s.hero_subtitle,
      hero_cta_text: s.hero_cta_text,
      hero_image_url: s.hero_image_url,
      hero_bg_image: s.hero_bg_image,
      logo_url: s.logo_url,
      favicon_url: s.favicon_url,
      announcement_text: s.announcement_text ?? "",
      announcement_enabled: s.announcement_enabled ?? false,
      store_address: s.store_address,
      store_lat: s.store_lat,
      store_lng: s.store_lng,
      whatsapp_number: s.whatsapp_number,
      min_order_amount: s.min_order_amount ?? 0,
      default_delivery_fee: s.default_delivery_fee ?? 0,
      free_shipping_threshold: s.free_shipping_threshold ?? null,
      floating_element_image: s.floating_element_image,
      login_bg_pattern: s.login_bg_pattern,
      cart_empty_bg: s.cart_empty_bg,
      ga4_id: s.ga4_id,
      meta_pixel_id: s.meta_pixel_id,
      updated_at: new Date().toISOString(),
    };
    const { data: row, error: dbError } = await supabase
      .from("store_settings")
      .upsert(payload)
      .select("*")
      .maybeSingle();
    if (dbError) {
      setSaving(false);
      setProgress(null);
      toast.error(`تعذر الحفظ: ${dbError.message}`);
      return;
    }
    const next = { ...s, ...(row ?? {}) } as Settings;
    setS(next);
    setSaved(next);
    setHistoryKey((k) => k + 1);
    window.dispatchEvent(new CustomEvent("store_settings_updated", { detail: next }));
    setProgress(100);
    toast.success("تم حفظ التعديلات وظهرت في المتجر");
    setTimeout(() => {
      setProgress(null);
      setSaving(false);
    }, 300);
  };

  const updateSetting = <K extends keyof Settings>(k: K, v: Settings[K]) => {
    setS((prev) => (prev ? { ...prev, [k]: v } : prev));
  };

  const handleDiscard = () => {
    if (saved) setS(saved);
    toast.success("تم إلغاء التعديلات غير المحفوظة");
  };

  const restoreSnapshot = (snap: Record<string, unknown>) => {
    if (!s) return;
    setS({ ...s, ...(snap as Partial<Settings>), id: s.id });
    toast.success("تم تحميل النسخة في المعاينة — اضغط حفظ لاعتمادها");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Export settings as JSON file
  const handleExportJSON = () => {
    if (!s) return;
    try {
      const dataStr =
        "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(s, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `store_settings_backup_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast.success("تم تصدير ملف الإعدادات الاحتياطي بنجاح 💾");
    } catch (err: any) {
      toast.error("فشل تصدير الإعدادات: " + (err.message || err));
    }
  };

  // Test WhatsApp Link
  const handleTestWhatsApp = () => {
    if (!s?.whatsapp_number) {
      toast.error("يرجى إدخال رقم واتساب صالح أولاً");
      return;
    }
    const cleanNum = s.whatsapp_number.replace(/[^\d+]/g, "").replace(/^00/, "+");
    const numOnly = cleanNum.replace("+", "");
    window.open(
      `https://wa.me/${numOnly}?text=${encodeURIComponent("مرحباً، هذه رسالة تجربة من إعدادات المتجر 🛒")}`,
      "_blank",
    );
    toast.success("تم فتح رابط واتساب المحفوظ.");
  };

  if (loading) return <SettingsPageSkeleton />;
  if (!s) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 p-4 sm:p-6 pb-24 relative"
    >
      {/* Top Animated Progress Bar */}
      <AnimatePresence>
        {progress !== null && (
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: progress / 100 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed top-0 start-0 end-0 h-1 bg-gradient-to-r from-emerald-500 via-amber-500 to-primary z-50 origin-start"
          />
        )}
      </AnimatePresence>

      <div id="ai-settings">
        <AiProviderSettings />
      </div>

      {/* Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-black text-foreground">
              الإعدادات العامة للمتجر
            </h1>
            {dirty && (
              <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-offer bg-offer-soft px-2.5 py-0.5 rounded-full">
                تعديلات غير محفوظة
              </span>
            )}
          </div>
          <p className="text-xs font-bold text-muted-foreground mt-1">
            عدّل ما تريد وشاهده في المعاينة الحقيقية. لن يتغير المتجر إلا عند الضغط على حفظ.
          </p>
        </div>

        {/* Quick Action Header Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Export Settings */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportJSON}
            className="rounded-xl font-bold text-xs gap-1.5 h-9 border-border/80 hover:bg-secondary"
            title="تصدير نسخة احتياطية من الإعدادات"
          >
            <Download className="h-3.5 w-3.5 text-blue-500" />
            <span className="hidden sm:inline">تصدير</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDiscard}
            disabled={!dirty}
            className="rounded-xl font-bold text-xs gap-1.5 h-9"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>إلغاء التعديلات</span>
          </Button>

          {/* Save Button */}
          <Button
            onClick={handleSaveAll}
            disabled={saving || !dirty}
            className="rounded-xl hero-gradient text-primary-foreground font-black text-xs gap-2 h-9 shadow-md transition-transform hover:scale-[1.02] active:scale-95 shrink-0 px-4"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>حفظ ونشر في المتجر</span>
          </Button>
        </div>
      </div>

      {/* Main Grid: Form Controls on Right, Live Simulator on Left */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Live Storefront Sticky Preview (5 Cols on LG) */}
        <div className="lg:col-span-5 lg:order-2 lg:sticky lg:top-4 z-20 space-y-3">
          <RealStorePreview draft={s as any} dirty={dirty} />
        </div>

        {/* Form Controls (7 Cols on LG) */}
        <div className="lg:col-span-7 lg:order-1 space-y-5">
          {/* 1. هوية وبيانات المتجر واللوجو والموقع */}
          <Section icon={Store} title="هوية وبيانات المتجر والشعار والموقع">
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="اسم المتجر الرئيسي">
                  <Input
                    value={s.site_name ?? ""}
                    onChange={(e) => updateSetting("site_name", e.target.value)}
                    placeholder="اسم المتجر من إعدادات النظام"
                    className="h-10 rounded-xl font-bold text-xs"
                  />
                </Field>
                <div className="space-y-1.5">
                  <span className="block text-xs font-extrabold text-foreground">
                    رقم واتساب للتواصل والطلبات
                  </span>
                  <div className="flex gap-2">
                    <Input
                      value={s.whatsapp_number ?? ""}
                      onChange={(e) => updateSetting("whatsapp_number", e.target.value)}
                      placeholder="+20..."
                      className="h-10 rounded-xl font-bold text-xs dir-ltr text-right flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleTestWhatsApp}
                      className="h-10 rounded-xl text-xs font-bold gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 shrink-0"
                      title="تجربة فتح محادثة واتساب بالرقم الحالي"
                    >
                      <PhoneCall className="h-3.5 w-3.5" />
                      <span>تجربة</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Store Address & Map Location */}
              <div className="pt-2 border-t border-border/50 space-y-3">
                <div className="flex items-center justify-between">
                  <Field label="عنوان مقر الفرع الرئيسي أو المتجر">
                    <Input
                      value={s.store_address ?? ""}
                      onChange={(e) => updateSetting("store_address", e.target.value)}
                      placeholder="عنوان المتجر"
                      className="h-10 rounded-xl font-bold text-xs"
                    />
                  </Field>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-secondary/20 p-3">
                  <div className="space-y-0.5">
                    <div className="text-xs font-black text-foreground flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-emerald-500" />
                      <span>إحداثيات الموقع الجغرافي للمتجر (GPS):</span>
                    </div>
                    <span className="text-[11px] font-mono text-muted-foreground block dir-ltr text-start">
                      Lat: {s.store_lat ?? 30.0444} | Lng: {s.store_lng ?? 31.2357}
                    </span>
                  </div>

                  <Button
                    type="button"
                    variant={showMap ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => setShowMap(!showMap)}
                    className="h-8 rounded-xl text-xs font-bold gap-1.5 border-border/80"
                  >
                    <MapPin className="h-3.5 w-3.5 text-emerald-500" />
                    <span>{showMap ? "إخفاء الخريطة" : "تحديد على الخريطة 🗺️"}</span>
                  </Button>
                </div>

                <AnimatePresence>
                  {showMap && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden rounded-2xl border border-border"
                    >
                      <Suspense
                        fallback={
                          <div className="p-8 text-center text-xs font-bold text-muted-foreground">
                            جاري تحميل الخريطة التفاعلية...
                          </div>
                        }
                      >
                        <StoreMapPicker
                          lat={s.store_lat}
                          lng={s.store_lng}
                          address={s.store_address}
                          onChange={(lat, lng) => {
                            updateSetting("store_lat", lat);
                            updateSetting("store_lng", lng);
                            toast.success("تم تحديث إحداثيات موقع المتجر بنجاح 📍");
                          }}
                        />
                      </Suspense>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-border/50">
                <ImageUploader
                  value={s.logo_url}
                  onChange={(v) => updateSetting("logo_url", v)}
                  label="شعار المتجر (Logo)"
                  folder="logos"
                  compact
                />
                <ImageUploader
                  value={s.favicon_url}
                  onChange={(v) => updateSetting("favicon_url", v)}
                  label="أيقونة المتجر للمتصفح (Favicon)"
                  folder="favicons"
                  compact
                />
              </div>
            </div>
          </Section>

          {/* 2. قسم الواجهة الرئيسية والبقالة (Hero Banner & Upload) */}
          <Section icon={Sparkles} title="قسم البانر والواجهة الرئيسية (Hero Banner)">
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="العنوان الرئيسي لبانر الهيرو">
                  <Input
                    value={s.hero_title ?? ""}
                    onChange={(e) => updateSetting("hero_title", e.target.value)}
                    placeholder="نص العنوان الرئيسي"
                    className="h-10 rounded-xl font-bold text-xs"
                  />
                </Field>

                <Field label="نص الزر التفاعلي (CTA)">
                  <Input
                    value={s.hero_cta_text ?? ""}
                    onChange={(e) => updateSetting("hero_cta_text", e.target.value)}
                    placeholder="تصفح العروض والمنتجات 🛒"
                    className="h-10 rounded-xl font-bold text-xs"
                  />
                </Field>
              </div>

              <Field label="الوصف التوضيحي للهيرو" full>
                <Textarea
                  rows={2}
                  value={s.hero_subtitle ?? ""}
                  onChange={(e) => updateSetting("hero_subtitle", e.target.value)}
                  placeholder="تسوّق جميع سلع البقالة، اللحوم البلدية الطازجة..."
                  className="rounded-xl font-bold text-xs"
                />
              </Field>

              {/* Upload Hero Image from File */}
              <div className="pt-2 border-t border-border/50">
                <ImageUploader
                  value={s.hero_bg_image || s.hero_image_url}
                  onChange={(v) => {
                    updateSetting("hero_bg_image", v);
                    updateSetting("hero_image_url", v);
                  }}
                  label="خلفية البانر الرئيسي (رفع أو توليد بالذكاء الاصطناعي)"
                  promptHint={`خلفية بانر تسويقية لمتجر سوبرماركت حديث باسم "${s.site_name || "المتجر"}" تعرض أرفف سوبرماركت منظمة، سلع تموينية، ألبان ولحوم مع إضاءة سينمائية`}
                  folder="hero"
                />
              </div>
            </div>
          </Section>

          {/* 5. شريط الإعلانات العلوي */}
          <Section icon={Megaphone} title="الشريط العلوي الترويجي (Announcement Bar)">
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-2xl border border-border/80 bg-secondary/30 p-3.5">
                <div className="space-y-0.5">
                  <span className="text-xs font-black text-foreground block">
                    تفعيل الشريط العلوي
                  </span>
                  <span className="text-[11px] text-muted-foreground block">
                    إظهار شريط إعلانات متحرك في أعلى المتجر
                  </span>
                </div>
                <Switch
                  checked={!!s.announcement_enabled}
                  onCheckedChange={(v) => updateSetting("announcement_enabled", v)}
                  className="data-[state=checked]:bg-emerald-500"
                />
              </div>

              <AnimatePresence>
                {s.announcement_enabled && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-3 pt-1 overflow-hidden"
                  >
                    <Field label="نص الإعلان أو العرض">
                      <Textarea
                        rows={2}
                        value={s.announcement_text ?? ""}
                        onChange={(e) => updateSetting("announcement_text", e.target.value)}
                        placeholder="نص الإعلان من إعدادات المتجر..."
                        className="rounded-xl font-bold text-xs"
                      />
                    </Field>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Section>

          {/* 6. كود الخصم والشحن والطلبات */}
          <Section icon={Truck} title="إعدادات الشحن والكوبونات والطلبات">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/40">
                <Field label="الحد الأدنى للطلب (ج.م)">
                  <NumberInput
                    value={s.min_order_amount ?? 0}
                    onValueChange={(v) => updateSetting("min_order_amount", v ? parseFloat(v) : 0)}
                  />
                </Field>
                <Field label="رسوم التوصيل الافتراضية">
                  <NumberInput
                    value={s.default_delivery_fee ?? 0}
                    onValueChange={(v) =>
                      updateSetting("default_delivery_fee", v ? parseFloat(v) : 0)
                    }
                  />
                </Field>
                <Field label="حد الشحن المجاني (ج.م)">
                  <NumberInput
                    value={s.free_shipping_threshold ?? 0}
                    onValueChange={(v) =>
                      updateSetting("free_shipping_threshold", v ? parseFloat(v) : 0)
                    }
                  />
                </Field>
              </div>
            </div>
          </Section>

          {/* 7. رفع باقي صور وخلفيات الهوية */}
          <Section icon={ImageIcon} title="رفع الصور وخلفيات العناصر الثانوية">
            <div className="space-y-4">
              <ImageUploader
                value={s.floating_element_image}
                onChange={(v) => updateSetting("floating_element_image", v)}
                label="الصورة الترويجية العائمة (Floating Element)"
                folder="floating"
                compact
              />
              <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-border/40">
                <ImageUploader
                  value={s.login_bg_pattern}
                  onChange={(v) => updateSetting("login_bg_pattern", v)}
                  label="خلفية صفحة تسجيل الدخول"
                  folder="backgrounds"
                  compact
                />
                <ImageUploader
                  value={s.cart_empty_bg}
                  onChange={(v) => updateSetting("cart_empty_bg", v)}
                  label="صورة السلة الفارغة"
                  folder="backgrounds"
                  compact
                />
              </div>
            </div>
          </Section>

          {/* 8. أدوات التحليل والتتبع الإعلاني */}
          <Section icon={BarChart3} title="أدوات التحليل والتتبع الإعلاني (Analytics & Pixels)">
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="معرف جوجل أناليتكس (Google Analytics 4 ID)">
                  <Input
                    value={s.ga4_id ?? ""}
                    onChange={(e) => updateSetting("ga4_id", e.target.value)}
                    placeholder="G-XXXXXXXXXX"
                    className="h-10 rounded-xl font-mono text-xs uppercase dir-ltr text-right"
                  />
                </Field>
                <Field label="معرف بكسل فيسبوك / ميتا (Meta Pixel ID)">
                  <Input
                    value={s.meta_pixel_id ?? ""}
                    onChange={(e) => updateSetting("meta_pixel_id", e.target.value)}
                    placeholder="123456789012345"
                    className="h-10 rounded-xl font-mono text-xs dir-ltr text-right"
                  />
                </Field>
              </div>
              <p className="text-[11px] text-muted-foreground font-bold leading-relaxed">
                💡 تُستخدم هذه الأكواد لربط الحملات الإعلانية على فيسبوك وتيك توك وجوجل وتتبع الزوار
                والطلبات ومعدل التحويل تلقائياً.
              </p>
            </div>
          </Section>

          <SettingsHistory refreshKey={historyKey} onRestore={restoreSnapshot} />
        </div>
      </div>

      {/* Floating Save Bar on Mobile */}
      <div className="fixed bottom-4 start-4 end-4 lg:hidden z-40">
        <Button
          onClick={handleSaveAll}
          disabled={saving || !dirty}
          size="lg"
          className="w-full h-12 rounded-2xl hero-gradient text-primary-foreground font-black text-sm shadow-2xl gap-2"
        >
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          <span>حفظ ونشر في المتجر</span>
        </Button>
      </div>
    </motion.div>
  );
}

// ─── Helper UI Components ──────────────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3.5 rounded-3xl border border-border bg-card p-5 shadow-xs transition-all hover:border-border/80">
      <h3 className="flex items-center gap-2 font-display text-base font-black text-foreground border-b border-border/50 pb-2.5">
        <Icon className="h-4 w-4 text-emerald-500" />
        <span>{title}</span>
      </h3>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <label className={`block space-y-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <span className="block text-xs font-extrabold text-foreground">{label}</span>
      {children}
    </label>
  );
}

function SettingsPageSkeleton() {
  return (
    <div className="space-y-6 p-4 sm:p-6 animate-pulse">
      <div className="h-8 w-64 bg-secondary rounded-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 h-[500px] bg-secondary/60 rounded-3xl" />
        <div className="lg:col-span-7 space-y-4">
          <div className="h-40 bg-secondary/60 rounded-3xl" />
          <div className="h-40 bg-secondary/60 rounded-3xl" />
          <div className="h-40 bg-secondary/60 rounded-3xl" />
        </div>
      </div>
    </div>
  );
}
