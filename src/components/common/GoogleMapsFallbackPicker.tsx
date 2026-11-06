/* =========================================================================
   GOOGLE MAPS GRACEFUL FALLBACK PICKER
   Clean static address selector & district picker when API keys are missing.
   ========================================================================= */

import { useState } from "react";
import {
  MapPin,
  Navigation,
  Check,
  Building2,
  Compass,
  Search,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  POPULAR_EGYPT_DISTRICTS,
  type QuickLocationPreset,
} from "@/lib/mapsConfig";

interface GoogleMapsFallbackPickerProps {
  currentLat?: number;
  currentLng?: number;
  currentAddress?: string;
  onLocationSelect?: (lat: number, lng: number, address?: string) => void;
  className?: string;
  showPresets?: boolean;
}

export function GoogleMapsFallbackPicker({
  currentLat = 30.0444,
  currentLng = 31.2357,
  currentAddress = "فرع الدقي والمهندسين الرئيسي",
  onLocationSelect,
  className = "",
  showPresets = true,
}: GoogleMapsFallbackPickerProps) {
  const [selectedPresetId, setSelectedPresetId] = useState<string>("loc-dokki");
  const [customAddress, setCustomAddress] = useState<string>(currentAddress);
  const [lat, setLat] = useState<number>(currentLat);
  const [lng, setLng] = useState<number>(currentLng);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  const handleSelectPreset = (preset: QuickLocationPreset) => {
    setSelectedPresetId(preset.id);
    setLat(preset.lat);
    setLng(preset.lng);
    const fullAddr = `${preset.name} — ${preset.district}، ${preset.city}`;
    setCustomAddress(fullAddr);
    if (onLocationSelect) {
      onLocationSelect(preset.lat, preset.lng, fullAddr);
    }
    toast.success(`تم اختيار منطقة: ${preset.district} (${preset.estimatedDeliveryTime})`);
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error("المتصفح لا يدعم تحديد الموقع التلقائي");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLat = Number(pos.coords.latitude.toFixed(6));
        const userLng = Number(pos.coords.longitude.toFixed(6));
        setLat(userLat);
        setLng(userLng);
        const resolvedAddr = `موقعي الحالي المحدد (GPS: ${userLat}, ${userLng})`;
        setCustomAddress(resolvedAddr);
        setSelectedPresetId("");
        if (onLocationSelect) {
          onLocationSelect(userLat, userLng, resolvedAddr);
        }
        setIsLocating(false);
        toast.success("تم تحديد إحداثيات موقعك الحالي بنجاح 📍");
      },
      () => {
        setIsLocating(false);
        toast.error("تعذر جلب موقعك. يرجى تفعيل إذن الوصول للموقع أو اختيار المنطقة من القائمة.");
      },
    );
  };

  const handleCustomAddressChange = (val: string) => {
    setCustomAddress(val);
    if (onLocationSelect) {
      onLocationSelect(lat, lng, val);
    }
  };

  return (
    <div
      className={`rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-4 ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <MapPin className="h-4 w-4" />
          </div>
          <div>
            <h4 className="font-display text-sm font-black text-foreground">
              تحديد العنوان ومنطقة التوصيل السريع
            </h4>
            <p className="text-[11px] font-semibold text-muted-foreground">
              حدد حيك السكني أو استخدم موقعك المباشر لتقدير زمن التوصيل الدقيق
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleUseMyLocation}
          disabled={isLocating}
          className="h-8 rounded-xl text-xs font-bold gap-1.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 self-start sm:self-auto"
        >
          <Navigation className={`h-3.5 w-3.5 ${isLocating ? "animate-spin" : ""}`} />
          <span>{isLocating ? "جاري التحديد..." : "موقعي الحالي"}</span>
        </Button>
      </div>

      {/* Manual Address Input */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5 text-emerald-500" />
          <span>العنوان التفصيلي / الشارع ورقم العقار:</span>
        </label>
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={customAddress}
            onChange={(e) => handleCustomAddressChange(e.target.value)}
            placeholder="مثال: شارع مصدق، عمارة 12، الدور 4، الدقي..."
            className="ps-9 h-10 rounded-xl text-xs font-bold bg-background/90"
          />
        </div>
      </div>

      {/* Quick District Presets */}
      {showPresets && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-emerald-500" />
              <span>المناطق الشائعة للتوصيل الفوري:</span>
            </span>
            <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">
              {lat.toFixed(4)}, {lng.toFixed(4)}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {POPULAR_EGYPT_DISTRICTS.map((preset) => {
              const isSelected = selectedPresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`flex flex-col text-start p-2.5 rounded-xl border transition-all ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-500/10 text-foreground ring-1 ring-emerald-500/30"
                      : "border-border/70 bg-secondary/30 hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-black truncate">{preset.district}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                    {preset.estimatedDeliveryTime}
                  </span>
                  <span className="text-[9px] text-muted-foreground truncate">
                    توصيل {preset.deliveryFee} ج.م
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Location Confirmation Bar */}
      <div className="flex items-center justify-between bg-secondary/40 rounded-xl px-3 py-2 text-[11px] font-bold text-foreground">
        <div className="flex items-center gap-1.5 truncate">
          <Compass className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
          <span className="truncate">{customAddress || "تم تحديد الموقع"}</span>
        </div>
        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold shrink-0 ps-2">
          جاهز للتوصيل ⚡
        </span>
      </div>
    </div>
  );
}
