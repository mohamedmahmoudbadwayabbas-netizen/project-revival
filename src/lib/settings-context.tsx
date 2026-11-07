import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { normalizeStoreIdentity, STORE_IDENTITY } from "@/lib/store-identity";

export type StoreSettings = {
  id?: string;
  site_name: string;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string;
  accent_color: string;
  background_color: string;
  foreground_color: string;
  font_family: string;
  announcement_text: string;
  announcement_enabled: boolean;
  announcement_bg_color: string;
  whatsapp_number: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  hero_image_url: string | null;
  hero_cta_text: string | null;
  hero_bg_image: string | null;
  login_bg_pattern: string | null;
  cart_empty_bg: string | null;
  floating_element_image: string | null;
  store_address: string | null;
  store_lat: number | null;
  store_lng: number | null;
  ga4_id: string | null;
  meta_pixel_id: string | null;
  min_order_amount: number;
  default_delivery_fee: number;
  free_shipping_threshold: number;
  first_order_coupon_enabled: boolean;
  first_order_coupon_code: string | null;
  first_order_discount_percent: number;

  // Visual Customizer Styles
  categories_style?: "grid" | "scroll" | "cards" | "pills";
  products_style?: "modern" | "compact" | "bordered" | "glass";
  card_radius?: "rounded-xl" | "rounded-2xl" | "rounded-3xl";
  hero_style?: "gradient" | "image" | "split";
};

// Store brand defaults use the approved Figma palette in HSL tokens.
const DEFAULTS: StoreSettings = {
  site_name: "متجر إلكتروني",
  logo_url: null,
  favicon_url: null,
  primary_color: STORE_IDENTITY.greenHsl,
  accent_color: STORE_IDENTITY.rustHsl,
  background_color: STORE_IDENTITY.creamHsl,
  foreground_color: STORE_IDENTITY.inkHsl,
  font_family: "Tajawal",
  announcement_text: "",
  announcement_enabled: false,
  announcement_bg_color: STORE_IDENTITY.greenHsl,
  whatsapp_number: null,
  hero_title: "",
  hero_subtitle: "",
  hero_image_url: null,
  hero_cta_text: "تسوّق الآن 🛒",
  hero_bg_image:
    "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1600&q=85",
  login_bg_pattern: null,
  cart_empty_bg: null,
  floating_element_image:
    "https://images.unsplash.com/photo-1588964895597-cfccd6e2dbf9?auto=format&fit=crop&w=500&q=80",
  store_address: null,
  store_lat: null,
  store_lng: null,
  ga4_id: null,
  meta_pixel_id: null,
  min_order_amount: 100,
  default_delivery_fee: 35,
  free_shipping_threshold: 500,
  first_order_coupon_enabled: false,
  first_order_coupon_code: null,
  first_order_discount_percent: 10,

  categories_style: "grid",
  products_style: "modern",
  card_radius: "rounded-2xl",
  hero_style: "image",
};

const SettingsContext = createContext<{
  settings: StoreSettings;
  updateLocalSettings: (newSettings: Partial<StoreSettings>) => void;
}>({
  settings: DEFAULTS,
  updateLocalSettings: () => {},
});

// ── القيم جايه من الداتابيز HSL زي ما هي، مفيش تحويل هنا خالص ──
function applyTheme(s: StoreSettings) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  // Theme tokens are raw HSL triplets ("h s% l%"), so convert hex / hsl() inputs.
  const toTriplet = (raw: string) => {
    const v = raw.trim();
    const hex = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (hex) {
      let h = hex[1];
      if (h.length === 3)
        h = h
          .split("")
          .map((c) => c + c)
          .join("");
      const r = parseInt(h.slice(0, 2), 16) / 255;
      const g = parseInt(h.slice(2, 4), 16) / 255;
      const b = parseInt(h.slice(4, 6), 16) / 255;
      const max = Math.max(r, g, b),
        min = Math.min(r, g, b);
      const l = (max + min) / 2;
      let hue = 0,
        sat = 0;
      if (max !== min) {
        const d = max - min;
        sat = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        hue =
          max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
        hue *= 60;
      }
      return `${Math.round(hue)} ${Math.round(sat * 100)}% ${Math.round(l * 100)}%`;
    }
    return v.replace(/^hsla?\(|\)$/g, "").replace(/,/g, " ");
  };
  const setColor = (name: string, value: string | null | undefined) => {
    if (!value) return;
    root.style.setProperty(name, toTriplet(value));
  };
  // Brand colors are fixed in src/styles.css (brand system); saved colors are no longer applied.
  void setColor;
  if (s.card_radius) {
    const radMap: Record<string, string> = {
      "rounded-xl": "0.75rem",
      "rounded-2xl": "1rem",
      "rounded-3xl": "1.5rem",
    };
    if (radMap[s.card_radius]) {
      root.style.setProperty("--radius", radMap[s.card_radius]);
    }
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  // Start with DEFAULTS on both server and initial client render to guarantee 100% hydration match
  const [settings, setSettings] = useState<StoreSettings>(DEFAULTS);

  const updateLocalSettings = (updated: Partial<StoreSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updated };
      applyTheme(next);
      return next;
    });
  };

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data, error } = await supabase
        .from("store_settings_public")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (!mounted) return;
      if (error) console.warn("[Settings] Supabase error:", error.message);
      const merged = normalizeStoreIdentity({
        ...DEFAULTS,
        ...((data as any) ?? {}),
      }) as StoreSettings;
      for (const key of Object.keys(merged) as (keyof StoreSettings)[]) {
        if (merged[key] === null && DEFAULTS[key] !== null && DEFAULTS[key] !== undefined)
          (merged as any)[key] = DEFAULTS[key];
      }
      setSettings(merged);
      applyTheme(merged);
      if (window.parent !== window) {
        window.parent.postMessage({ type: "settings_preview_ready" }, window.location.origin);
      }
    };

    void load();

    // Listen to custom event for real-time live preview update across admin & storefront
    const handleCustomUpdate = (e: CustomEvent<Partial<StoreSettings>>) => {
      if (e.detail && mounted) {
        updateLocalSettings(e.detail);
      }
    };

    window.addEventListener("store_settings_updated" as any, handleCustomUpdate);

    // Admin live preview: the settings page embeds the real store in an iframe and posts unsaved drafts.
    const handleMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === "settings_preview" && e.data.settings && mounted) {
        updateLocalSettings(e.data.settings);
      }
    };
    window.addEventListener("message", handleMessage);

    return () => {
      mounted = false;
      window.removeEventListener("store_settings_updated" as any, handleCustomUpdate);
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  const value = useMemo(() => ({ settings, updateLocalSettings }), [settings]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  return ctx.settings;
}

export function useSettingsController() {
  return useContext(SettingsContext);
}
