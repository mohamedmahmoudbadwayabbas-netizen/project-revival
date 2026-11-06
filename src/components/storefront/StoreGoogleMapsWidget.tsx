import { useState, useEffect } from "react";
import {
  MapPin,
  Navigation,
  ExternalLink,
  Sparkles,
  Loader2,
  CheckCircle2,
  Search,
  Compass,
  BookmarkPlus,
  Home,
  Briefcase,
  Star,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase-loose";
import { useAuth } from "@/lib/auth-context";
import { queryGoogleMapsGrounding, PlaceGroundingResult } from "@/services/geminiMapsService";
import { GoogleMapsFallbackPicker } from "@/components/common/GoogleMapsFallbackPicker";
import { POPULAR_EGYPT_DISTRICTS } from "@/lib/mapsConfig";

interface StoreGoogleMapsWidgetProps {
  initialLat?: number | null;
  initialLng?: number | null;
  storeAddress?: string | null;
  storeName?: string;
  isInteractivePicker?: boolean;
  onLocationSelect?: (lat: number, lng: number, address?: string) => void;
  title?: string;
  subtitle?: string;
  showAiGrounding?: boolean;
  allowSaveAsDefault?: boolean;
  customerFullName?: string;
  customerPhone?: string;
}

export function StoreGoogleMapsWidget({
  initialLat = 30.0444,
  initialLng = 31.2357,
  storeAddress = "القاهرة، مصر",
  storeName = "سوبرماركت الوادي الأخضر — المركز الرئيسي",
  isInteractivePicker = false,
  onLocationSelect,
  title = "موقع المتجر وخرائط Google الذكية",
  subtitle = "استعراض الموقع المباشر ونطاق التغطية مع بيانات Google Maps الحية",
  showAiGrounding = true,
  allowSaveAsDefault = false,
  customerFullName = "",
  customerPhone = "",
}: StoreGoogleMapsWidgetProps) {
  const { user } = useAuth();
  const [lat, setLat] = useState<number>(initialLat || 30.0444);
  const [lng, setLng] = useState<number>(initialLng || 31.2357);
  const [loadingAi, setLoadingAi] = useState(false);
  const [savingDefault, setSavingDefault] = useState(false);
  const [groundingPlaces, setGroundingPlaces] = useState<PlaceGroundingResult[]>([]);
  const [groundingAnswer, setGroundingAnswer] = useState<string | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<string>("المنزل");
  const [customLabel, setCustomLabel] = useState<string>("");
  const [activeView, setActiveView] = useState<"map" | "selector">("map");

  useEffect(() => {
    if (initialLat) setLat(initialLat);
    if (initialLng) setLng(initialLng);
  }, [initialLat, initialLng]);

  const fetchMapsGrounding = async (queryText?: string) => {
    setLoadingAi(true);
    try {
      const q =
        queryText ||
        `أين يقع ${storeName} في ${storeAddress || "القاهرة"}؟ وما هي أقرب المعالم والطرق ومسارات التوصيل السريع إليه؟`;
      const res = await queryGoogleMapsGrounding(q, {
        latitude: lat,
        longitude: lng,
      });

      setGroundingAnswer(res.answer);
      setGroundingPlaces(res.places);
      toast.success("تم جلب بيانات الخريطة الذكية عبر Google Maps Grounding 📍");
    } catch (e) {
      console.warn("Maps grounding query error:", e);
    } finally {
      setLoadingAi(false);
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error("المتصفح لا يدعم تحديد الموقع الجغرافي");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLat = Number(pos.coords.latitude.toFixed(6));
        const userLng = Number(pos.coords.longitude.toFixed(6));
        setLat(userLat);
        setLng(userLng);
        if (onLocationSelect) {
          onLocationSelect(userLat, userLng);
        }
        toast.success("تم تحديث موقعك الحالي بنجاح 📍");
      },
      () => {
        toast.error("تعذر جلب موقعك، يرجى التحقق من إذن الموقع في المتصفح");
      },
    );
  };

  const handleSaveAsDefaultLocation = async () => {
    setSavingDefault(true);
    try {
      if (!user?.id) throw new Error("يجب تسجيل الدخول لحفظ الموقع");
      const finalLabel = selectedLabel === "أخرى" ? customLabel.trim() || "موقعي" : selectedLabel;
      const gpsAddress = `${storeAddress || "موقع محدد عبر الخريطة"} — ${finalLabel} (GPS: ${lat.toFixed(6)}, ${lng.toFixed(6)})`;
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        full_name: customerFullName || user.user_metadata?.full_name || null,
        phone: customerPhone || user.user_metadata?.phone || null,
        address: gpsAddress,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success("تم حفظ موقع التوصيل الافتراضي في حسابك ⭐");
    } catch (error: any) {
      toast.error(`تعذر حفظ الموقع: ${error.message || "خطأ غير معروف"}`);
    } finally {
      setSavingDefault(false);
    }
  };

  const mapEmbedUrl = `https://maps.google.com/maps?q=${lat},${lng}&hl=ar&z=14&output=embed`;
  const directMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

  return (
    <div className="rounded-3xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-4">
      {/* رأس الخريطة */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-sm font-black text-foreground">{title}</h3>
            <p className="text-[11px] font-semibold text-muted-foreground">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {showAiGrounding && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fetchMapsGrounding()}
              disabled={loadingAi}
              className="h-8 rounded-xl text-xs font-black bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1.5"
            >
              {loadingAi ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              )}
              <span>Maps AI الذكي</span>
            </Button>
          )}

          {isInteractivePicker && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleUseMyLocation}
              className="h-8 rounded-xl text-xs font-bold gap-1.5"
            >
              <Navigation className="h-3.5 w-3.5 text-emerald-600" />
              <span>موقعي</span>
            </Button>
          )}

          <a
            href={directMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 h-8 px-3 rounded-xl text-xs font-bold bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-colors"
          >
            <span>فتح في Google Maps</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* أزرار التبديل بين الخريطة وقائمة المناطق */}
      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
        <div className="flex items-center gap-1.5 bg-secondary/50 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveView("map")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              activeView === "map"
                ? "bg-background text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            خريطة تفاعلية 🗺️
          </button>
          <button
            type="button"
            onClick={() => setActiveView("selector")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              activeView === "selector"
                ? "bg-background text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            اختيار المنطقة والموقع 📍
          </button>
        </div>

        <span className="text-[10px] font-bold text-muted-foreground hidden sm:inline">
          {activeView === "map" ? "تحديد مباشر عبر الأقمار الصناعية" : "اختيار سريع للمناطق المصرية"}
        </span>
      </div>

      {activeView === "selector" ? (
        <GoogleMapsFallbackPicker
          currentLat={lat}
          currentLng={lng}
          currentAddress={storeAddress || "القاهرة، مصر"}
          onLocationSelect={(newLat, newLng, newAddr) => {
            setLat(newLat);
            setLng(newLng);
            if (onLocationSelect) {
              onLocationSelect(newLat, newLng, newAddr);
            }
          }}
          showPresets={true}
        />
      ) : (
        /* خريطة Google Maps التفاعلية */
        <div className="relative h-64 sm:h-72 w-full overflow-hidden rounded-2xl border border-border shadow-inner bg-secondary/30">
          <iframe
            title="Google Map Live"
            src={mapEmbedUrl}
            className="h-full w-full border-0"
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
          />

          {/* شريط معلومات الموقع */}
          <div className="absolute bottom-2 start-2 end-2 bg-background/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-border/60 text-[11px] font-bold text-foreground flex justify-between items-center z-10 shadow-xs">
            <div className="flex items-center gap-1.5 truncate">
              <Compass className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="truncate">{storeAddress || "نطاق التوصيل السريع للمتجر"}</span>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground shrink-0 ps-2">
              {lat.toFixed(4)}, {lng.toFixed(4)}
            </span>
          </div>
        </div>
      )}

      {/* حفظ الموقع كافتراضي لحساب العميل (Customer Default Location) */}
      {allowSaveAsDefault && (
        <div className="rounded-2xl border border-border bg-secondary/30 p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-black text-foreground">
              <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
              <span>حفظ هذا الموقع كموقع افتراضي أساسي للطلبات القادمة</span>
            </div>
            <span className="text-[10px] font-bold text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
              Default Address
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground">تسمية الموقع:</span>
            {(["المنزل", "العمل", "أخرى"] as const).map((lbl) => (
              <button
                key={lbl}
                type="button"
                onClick={() => setSelectedLabel(lbl)}
                className={`px-3 py-1 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                  selectedLabel === lbl
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-background text-muted-foreground border border-border hover:text-foreground"
                }`}
              >
                {lbl === "المنزل" ? (
                  <Home className="h-3 w-3" />
                ) : lbl === "العمل" ? (
                  <Briefcase className="h-3 w-3" />
                ) : (
                  <MapPin className="h-3 w-3" />
                )}
                <span>{lbl}</span>
              </button>
            ))}

            {selectedLabel === "أخرى" && (
              <Input
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="اكتب التسمية (مثل: شاليه، المزرعة)"
                className="h-8 text-xs font-bold max-w-44 rounded-xl"
              />
            )}
          </div>

          <Button
            type="button"
            onClick={handleSaveAsDefaultLocation}
            disabled={savingDefault}
            className="w-full h-9 rounded-xl hero-gradient text-primary-foreground font-black text-xs gap-2 shadow-xs"
          >
            {savingDefault ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <BookmarkPlus className="h-3.5 w-3.5" />
            )}
            <span>حفظ الموقع المحدد كعنوان أساسي افتراضي في حسابي ⭐</span>
          </Button>
        </div>
      )}

      {/* نتائج Maps Grounding عند طلب التحليل الذكي */}
      {groundingAnswer && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-black text-emerald-800 dark:text-emerald-300">
            <Sparkles className="h-4 w-4" />
            <span>بيانات ومعالم خرائط Google الذكية (Gemini Maps Grounding):</span>
          </div>
          <div className="text-xs font-medium text-foreground leading-relaxed whitespace-pre-line">
            {groundingAnswer}
          </div>

          {groundingPlaces.length > 0 && (
            <div className="pt-2 border-t border-emerald-500/20 space-y-1.5">
              <div className="text-[11px] font-bold text-muted-foreground">
                روابط الأماكن المعتمدة على الخريطة:
              </div>
              <div className="flex flex-wrap gap-2">
                {groundingPlaces.map((pl, idx) => (
                  <a
                    key={idx}
                    href={pl.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-xl bg-background border border-border hover:border-emerald-500/60 text-emerald-700 dark:text-emerald-300 shadow-2xs transition-all"
                  >
                    <MapPin className="h-3 w-3" />
                    <span>{pl.title || "عرض في خرائط Google"}</span>
                    <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
