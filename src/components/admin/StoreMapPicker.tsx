import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Search, Navigation, Building2, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  getGoogleMapsBrowserKey,
  getGoogleMapsTrackingId,
  isGoogleMapsKeyConfigured,
  POPULAR_EGYPT_DISTRICTS,
  type QuickLocationPreset,
} from "@/lib/mapsConfig";

type Props = {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
  address?: string | null;
};

declare global {
  interface Window {
    google?: any;
    L?: any;
    gm_authFailure?: () => void;
    __initStoreMap?: () => void;
  }
}

let googleScriptPromise: Promise<void> | null = null;
function loadGoogleMapsScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.google?.maps) return Promise.resolve();
  if (googleScriptPromise) return googleScriptPromise;

  const browserKey = getGoogleMapsBrowserKey();
  const channel = getGoogleMapsTrackingId();

  if (!isGoogleMapsKeyConfigured()) {
    return Promise.reject(new Error("Google Maps key not configured, using Leaflet fallback"));
  }

  googleScriptPromise = new Promise((resolve, reject) => {
    window.__initStoreMap = () => resolve();
    const s = document.createElement("script");
    const channelParam = channel ? `&channel=${encodeURIComponent(channel)}` : "";
    s.src = `https://maps.googleapis.com/maps/api/js?key=${browserKey}&loading=async&callback=__initStoreMap${channelParam}`;
    s.async = true;
    s.defer = true;
    s.onerror = () => reject(new Error("failed to load Google Maps"));
    document.head.appendChild(s);
  });
  return googleScriptPromise;
}

let leafletScriptPromise: Promise<void> | null = null;
function loadLeafletScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.L) return Promise.resolve();
  if (leafletScriptPromise) return leafletScriptPromise;

  leafletScriptPromise = new Promise((resolve, reject) => {
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const s = document.createElement("script");
    s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("failed to load Leaflet"));
    document.head.appendChild(s);
  });
  return leafletScriptPromise;
}

export function StoreMapPicker({ lat, lng, onChange, address }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);
  const engineRef = useRef<"google" | "leaflet" | null>(null);

  const [ready, setReady] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState(address || "");
  const [currentLat, setCurrentLat] = useState<number>(lat ?? 30.0444);
  const [currentLng, setCurrentLng] = useState<number>(lng ?? 31.2357);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const initialLatRef = useRef(lat ?? 30.0444);
  const initialLngRef = useRef(lng ?? 31.2357);

  // Initialize Map with Google Maps attempt & instantaneous Leaflet Fallback
  useEffect(() => {
    let active = true;

    const initLeaflet = async (targetLat: number, targetLng: number) => {
      try {
        await loadLeafletScript();
        if (!active || !containerRef.current) return;

        // Clean up any existing map or container content
        if (engineRef.current === "leaflet" && mapInstanceRef.current) {
          try {
            mapInstanceRef.current.remove();
          } catch (_) {}
        }
        if (containerRef.current) {
          containerRef.current.innerHTML = "";
        }

        engineRef.current = "leaflet";
        const L = window.L;

        const map = L.map(containerRef.current, {
          center: [targetLat, targetLng],
          zoom: 14,
          zoomControl: false,
        });

        // Add Dark Mode Tiles (CartoDB Dark Matter)
        L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
          attribution: "&copy; OpenStreetMap &copy; CARTO",
          subdomains: "abcd",
          maxZoom: 19,
        }).addTo(map);

        // Custom green pin icon
        const greenIcon = L.divIcon({
          className: "custom-map-pin",
          html: `<div style="background-color: #10b981; width: 22px; height: 22px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 12px rgba(16,185,129,0.8);"></div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });

        const marker = L.marker([targetLat, targetLng], {
          draggable: true,
          icon: greenIcon,
        }).addTo(map);

        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          const newLat = Number(pos.lat.toFixed(6));
          const newLng = Number(pos.lng.toFixed(6));
          setCurrentLat(newLat);
          setCurrentLng(newLng);
          onChangeRef.current(newLat, newLng);
        });

        map.on("click", (e: any) => {
          marker.setLatLng(e.latlng);
          const newLat = Number(e.latlng.lat.toFixed(6));
          const newLng = Number(e.latlng.lng.toFixed(6));
          setCurrentLat(newLat);
          setCurrentLng(newLng);
          onChangeRef.current(newLat, newLng);
        });

        mapInstanceRef.current = map;
        markerInstanceRef.current = marker;
        setReady(true);
      } catch (err) {
        console.error("Failed to load Leaflet map engine:", err);
      }
    };

    const initMap = async () => {
      const initialLat = initialLatRef.current;
      const initialLng = initialLngRef.current;
      setCurrentLat(initialLat);
      setCurrentLng(initialLng);

      // Catch Google Maps Auth / Referer Failure and switch immediately to Leaflet
      window.gm_authFailure = () => {
        console.warn(
          "Google Maps auth/referer restricted on this domain. Switching to Leaflet map engine.",
        );
        if (active) {
          initLeaflet(initialLat, initialLng);
        }
      };

      if (isGoogleMapsKeyConfigured()) {
        try {
          await loadGoogleMapsScript();
          if (!active || !containerRef.current) return;

          engineRef.current = "google";
          const center = { lat: initialLat, lng: initialLng };
          const map = new window.google.maps.Map(containerRef.current, {
            center,
            zoom: 14,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            styles: [
              { elementType: "geometry", stylers: [{ color: "#212121" }] },
              { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
              { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
              { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
              {
                featureType: "administrative",
                elementType: "geometry",
                stylers: [{ color: "#757575" }],
              },
              {
                featureType: "poi",
                elementType: "labels.text.fill",
                stylers: [{ color: "#757575" }],
              },
              {
                featureType: "road",
                elementType: "geometry.fill",
                stylers: [{ color: "#2c2c2c" }],
              },
              { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] },
            ],
          });

          const marker = new window.google.maps.Marker({
            map,
            position: center,
            draggable: true,
            title: "موقع المتجر",
          });

          marker.addListener("dragend", () => {
            const pos = marker.getPosition();
            const newLat = Number(pos.lat().toFixed(6));
            const newLng = Number(pos.lng().toFixed(6));
            setCurrentLat(newLat);
            setCurrentLng(newLng);
            onChangeRef.current(newLat, newLng);
          });

          map.addListener("click", (e: any) => {
            marker.setPosition(e.latLng);
            const newLat = Number(e.latLng.lat().toFixed(6));
            const newLng = Number(e.latLng.lng().toFixed(6));
            setCurrentLat(newLat);
            setCurrentLng(newLng);
            onChangeRef.current(newLat, newLng);
          });

          mapInstanceRef.current = map;
          markerInstanceRef.current = marker;
          setReady(true);
          return;
        } catch (e) {
          console.warn("Google Maps failed to initialize, falling back to Leaflet:", e);
        }
      }

      // If Google Maps is unavailable or no browser key, load Leaflet
      await initLeaflet(initialLat, initialLng);
    };

    initMap();

    return () => {
      active = false;
      if (engineRef.current === "leaflet" && mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (_) {}
      }
    };
  }, []);

  // Sync external changes (when lat/lng prop updates)
  useEffect(() => {
    if (!ready || lat == null || lng == null) return;
    if (lat === currentLat && lng === currentLng) return;

    setCurrentLat(lat);
    setCurrentLng(lng);

    if (engineRef.current === "google" && mapInstanceRef.current && markerInstanceRef.current) {
      const pos = { lat, lng };
      markerInstanceRef.current.setPosition(pos);
      mapInstanceRef.current.panTo(pos);
    } else if (
      engineRef.current === "leaflet" &&
      mapInstanceRef.current &&
      markerInstanceRef.current
    ) {
      markerInstanceRef.current.setLatLng([lat, lng]);
      mapInstanceRef.current.panTo([lat, lng]);
    }
  }, [lat, lng, ready, currentLat, currentLng]);

  // Search address geocoding using Nominatim
  const handleSearchAddress = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`,
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const resultLat = parseFloat(data[0].lat);
        const resultLng = parseFloat(data[0].lon);
        onChange(resultLat, resultLng);
        toast.success(`تم تحديد العنوان: ${data[0].display_name.split(",")[0]}`);
      } else {
        toast.error("لم نتمكن من إيجاد العنوان المحدد، يرجى تحريك الدبوس على الخريطة");
      }
    } catch (e) {
      toast.error("تعذر البحث عن العنوان الآن");
    } finally {
      setSearching(false);
    }
  };

  // Get current browser location
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error("متصفحك لا يدعم الخدمة المكانية");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const myLat = Number(pos.coords.latitude.toFixed(6));
        const myLng = Number(pos.coords.longitude.toFixed(6));
        onChange(myLat, myLng);
        toast.success("تم تحديد موقعك الحالي على الخريطة 📍");
      },
      () => {
        toast.error("تعذر الوصول لموقعك الحالي. تأكد من تفعيل إذن الموقع.");
      },
    );
  };

  return (
    <div className="space-y-2 mt-2">
      {/* شريط البحث وزر الموقع الحالي */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearchAddress()}
            placeholder="ابحث عن المدينة، الشارع أو المنطقة..."
            className="ps-9 h-9 rounded-xl text-xs font-bold bg-background/90"
          />
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={handleSearchAddress}
            disabled={searching}
            variant="secondary"
            className="h-9 rounded-xl text-xs font-bold gap-1 px-3"
          >
            {searching ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Search className="h-3.5 w-3.5" />
            )}
            بحث
          </Button>
          <Button
            type="button"
            onClick={handleUseMyLocation}
            variant="outline"
            className="h-9 rounded-xl text-xs font-bold gap-1 px-3 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
          >
            <Navigation className="h-3.5 w-3.5" /> موقعي الحالي
          </Button>
        </div>
      </div>

      {/* حاوية الخريطة */}
      <div className="relative h-72 w-full overflow-hidden rounded-2xl border border-border shadow-inner bg-secondary/50">
        <div ref={containerRef} className="h-full w-full z-0" />

        {!ready && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-xs gap-2 z-10">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
            <span className="text-xs font-bold text-muted-foreground">
              جاري تحميل الخريطة التفاعلية...
            </span>
          </div>
        )}

        {/* شريط الإحداثيات السفلية */}
        <div className="absolute bottom-2 start-2 end-2 bg-background/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-border/60 text-[11px] font-mono font-bold text-foreground flex justify-between items-center z-10 shadow-sm">
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-emerald-500" />
            <span>
              Lat: {currentLat} | Lng: {currentLng}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground font-sans">
            اسحب الدبوس أو انقر لتغيير الموقع
          </span>
        </div>
      </div>

      {/* اختصارات سريعة لفروع ومناطق القاهرة والجيزة */}
      <div className="flex items-center gap-1.5 flex-wrap pt-1">
        <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-emerald-500" />
          <span>اختيار فرع/منطقة سريعة:</span>
        </span>
        {POPULAR_EGYPT_DISTRICTS.slice(0, 5).map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => {
              onChange(preset.lat, preset.lng);
              setSearchQuery(preset.name);
              toast.success(`تم التحديد: ${preset.district}`);
            }}
            className="text-[10px] font-bold px-2 py-0.5 rounded-lg border border-border/70 bg-secondary/40 hover:bg-emerald-500/10 hover:border-emerald-500/30 text-foreground transition-colors"
          >
            {preset.district}
          </button>
        ))}
      </div>
    </div>
  );
}
