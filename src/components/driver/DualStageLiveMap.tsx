import { useState, useEffect } from "react";
import {
  Navigation,
  MapPin,
  Store,
  Home,
  Compass,
  ArrowRight,
  ExternalLink,
  Clock,
  Car,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Layers,
  Radio,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export type DeliveryStage = "to_store" | "to_customer";

interface DualStageLiveMapProps {
  currentDriverCoords: { lat: number; lng: number };
  storeCoords?: { lat: number; lng: number; name?: string; address?: string };
  customerCoords?: { lat: number; lng: number; name?: string; address?: string };
  initialStage?: DeliveryStage;
  onStageChange?: (stage: DeliveryStage) => void;
  orderId: string;
}

// Calculate distance between two coordinates in kilometers (Haversine Formula)
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Estimate driving time in minutes assuming average speed in city (30 km/h) + traffic buffer
function estimateEtaMinutes(distKm: number): number {
  const avgSpeedKmH = 28;
  const rawMinutes = (distKm / avgSpeedKmH) * 60;
  return Math.max(3, Math.ceil(rawMinutes + 2)); // Minimum 3 mins + 2 mins buffer
}

export function DualStageLiveMap({
  currentDriverCoords,
  storeCoords = {
    lat: 30.0444,
    lng: 31.2357,
    name: "المركز الرئيسي — سوبرماركت الوادي الأخضر",
    address: "القاهرة، وسط البلد",
  },
  customerCoords = {
    lat: 30.0626,
    lng: 31.2497,
    name: "موقع العميل",
    address: "شارع التحرير، الدقي، الجيزة",
  },
  initialStage = "to_store",
  onStageChange,
  orderId,
}: DualStageLiveMapProps) {
  const [stage, setStage] = useState<DeliveryStage>(initialStage);
  const [mapType, setMapType] = useState<"standard" | "satellite">("standard");

  useEffect(() => {
    setStage(initialStage);
  }, [initialStage]);

  const handleSetStage = (newStage: DeliveryStage) => {
    setStage(newStage);
    if (onStageChange) onStageChange(newStage);
  };

  // Target coordinates based on current active stage
  const targetDestination = stage === "to_store" ? storeCoords : customerCoords;

  const distanceToStore = calculateDistanceKm(
    currentDriverCoords.lat,
    currentDriverCoords.lng,
    storeCoords.lat,
    storeCoords.lng,
  );
  const etaToStore = estimateEtaMinutes(distanceToStore);

  const distanceToCustomer = calculateDistanceKm(
    stage === "to_store" ? storeCoords.lat : currentDriverCoords.lat,
    stage === "to_store" ? storeCoords.lng : currentDriverCoords.lng,
    customerCoords.lat,
    customerCoords.lng,
  );
  const etaToCustomer = estimateEtaMinutes(distanceToCustomer);

  const currentActiveDistance = stage === "to_store" ? distanceToStore : distanceToCustomer;
  const currentActiveEta = stage === "to_store" ? etaToStore : etaToCustomer;

  // Google Maps Direct Navigation URLs
  const directNavigationUrl = `https://www.google.com/maps/dir/?api=1&origin=${currentDriverCoords.lat},${currentDriverCoords.lng}&destination=${targetDestination.lat},${targetDestination.lng}&travelmode=driving`;

  const mapEmbedUrl = `https://maps.google.com/maps?q=${targetDestination.lat},${targetDestination.lng}&hl=ar&z=15&output=embed`;

  return (
    <div
      className="rounded-3xl border border-border bg-card p-4 sm:p-5 shadow-xs space-y-4"
      dir="rtl"
    >
      {/* رأس وتحديد المرحلة الثنائية */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Navigation className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-sm font-black text-foreground">
                التوجيه الحي ثنائي المراحل (Live Map)
              </h3>
              <p className="text-[11px] font-semibold text-muted-foreground">
                تتبع GPS والتوجيه للمتجر ثم للعميل
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              GPS متصل
            </span>
          </div>
        </div>

        {/* أزرار التبديل بين المرحلتين */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-secondary/60">
          <button
            type="button"
            onClick={() => handleSetStage("to_store")}
            className={`flex flex-col items-center justify-center p-2 rounded-xl text-xs font-black transition-all ${
              stage === "to_store"
                ? "bg-card text-foreground shadow-xs border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Store className="h-4 w-4 text-amber-500" />
              <span>المرحلة 1: المتجر</span>
            </div>
            <span className="text-[10px] font-normal opacity-80 mt-0.5">
              {distanceToStore.toFixed(1)} كم • ~{etaToStore} دقيقة
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSetStage("to_customer")}
            className={`flex flex-col items-center justify-center p-2 rounded-xl text-xs font-black transition-all ${
              stage === "to_customer"
                ? "bg-card text-foreground shadow-xs border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Home className="h-4 w-4 text-emerald-500" />
              <span>المرحلة 2: العميل</span>
            </div>
            <span className="text-[10px] font-normal opacity-80 mt-0.5">
              {distanceToCustomer.toFixed(1)} كم • ~{etaToCustomer} دقيقة
            </span>
          </button>
        </div>
      </div>

      {/* بطاقة معلومات المسار والوقت المتوقع ETA */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <div className="p-3 rounded-2xl bg-secondary/40 border border-border space-y-0.5">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
            <Car className="h-3.5 w-3.5 text-primary" />
            <span>المسافة المتبقية</span>
          </div>
          <div className="text-base font-black font-display text-foreground">
            {currentActiveDistance.toFixed(1)} <span className="text-xs font-normal">كم</span>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-secondary/40 border border-border space-y-0.5">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
            <Clock className="h-3.5 w-3.5 text-amber-500" />
            <span>الوقت المقدر (ETA)</span>
          </div>
          <div className="text-base font-black font-display text-emerald-600 dark:text-emerald-400">
            ~{currentActiveEta} <span className="text-xs font-normal">دقيقة</span>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 p-3 rounded-2xl bg-secondary/40 border border-border space-y-0.5">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 text-rose-500" />
            <span>الوجهة المستهدفة</span>
          </div>
          <div className="text-xs font-black text-foreground truncate">
            {targetDestination.name || targetDestination.address}
          </div>
        </div>
      </div>

      {/* الخريطة التفاعلية */}
      <div className="relative h-60 sm:h-72 w-full overflow-hidden rounded-2xl border border-border shadow-inner bg-secondary/30">
        <iframe
          title="Dual Stage Delivery Map"
          src={mapEmbedUrl}
          className="h-full w-full border-0"
          loading="lazy"
          allowFullScreen
        />

        {/* مؤشر المرحلة الحالية على الخريطة */}
        <div className="absolute top-2.5 start-2.5 bg-background/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-border/80 text-xs font-black text-foreground shadow-sm flex items-center gap-2">
          {stage === "to_store" ? (
            <>
              <Store className="h-3.5 w-3.5 text-amber-500" />
              <span>التوجه للمتجر لاستلام الطلب</span>
            </>
          ) : (
            <>
              <Home className="h-3.5 w-3.5 text-emerald-500" />
              <span>التوجه لعنوان العميل للتسليم</span>
            </>
          )}
        </div>

        {/* إحداثيات GPS المباشرة للمندوب */}
        <div className="absolute bottom-2 start-2 end-2 bg-background/95 backdrop-blur-md px-3 py-2 rounded-xl border border-border text-xs font-bold text-foreground flex items-center justify-between z-10 shadow-sm">
          <div className="flex items-center gap-1.5 truncate">
            <Compass className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="truncate">
              موقعك: {currentDriverCoords.lat.toFixed(4)}, {currentDriverCoords.lng.toFixed(4)}
            </span>
          </div>
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full shrink-0">
            تحديث حي
          </span>
        </div>
      </div>

      {/* زر إطلاق الملاحة في Google Maps */}
      <div className="flex flex-col sm:flex-row gap-2 pt-1">
        <a
          href={directNavigationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 inline-flex items-center justify-center gap-2 h-11 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-all"
        >
          <Navigation className="h-4 w-4" />
          <span>بدء التوجيه الصوتي في خرائط Google (Turn-by-Turn) 🧭</span>
          <ExternalLink className="h-3.5 w-3.5 opacity-80" />
        </a>

        {stage === "to_store" ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => handleSetStage("to_customer")}
            className="h-11 rounded-2xl text-xs font-black gap-2 border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
          >
            <span>استلمت من المتجر، التوجه للعميل</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => handleSetStage("to_store")}
            className="h-11 rounded-2xl text-xs font-black gap-2"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>العودة للمرحلة 1 (المتجر)</span>
          </Button>
        )}
      </div>
    </div>
  );
}
