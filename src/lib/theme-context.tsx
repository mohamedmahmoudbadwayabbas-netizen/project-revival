import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { normalizeStoreIdentity, STORE_IDENTITY } from "@/lib/store-identity";

export type ThemeSettings = {
  id?: string;
  marble_bg_url: string | null;
  dark_marble_bg_url: string | null;
  primary_hex: string;
  accent_hex: string;
  card_radius_px: number;
  hero_grid_images: string[];
  hero_title: string;
  hero_subtitle: string;
  hero_cta_text: string;
  auth_bg_url: string | null;
  cart_empty_bg_url: string | null;
};

const DEFAULTS: ThemeSettings = {
  marble_bg_url: null,
  dark_marble_bg_url: null,
  primary_hex: STORE_IDENTITY.green,
  accent_hex: STORE_IDENTITY.rust,
  card_radius_px: 12,
  hero_grid_images: [],
  hero_title: "كل احتياجات البيت في مكان واحد",
  hero_subtitle: "تصفّح المنتجات المتاحة واختر ما يناسب قائمتك.",
  hero_cta_text: "تسوّق الآن 🛒",
  auth_bg_url: null,
  cart_empty_bg_url: null,
};

function hexToHsl(hex: string | null | undefined): string | null {
  if (!hex || typeof hex !== "string") return null;
  const m = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(m)) return null;

  const r = parseInt(m.substring(0, 2), 16) / 255;
  const g = parseInt(m.substring(2, 4), 16) / 255;
  const b = parseInt(m.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function applyTokens(t: ThemeSettings) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const set = (name: string, value: string | null) => {
    if (value) root.style.setProperty(name, value);
  };
  const primary = hexToHsl(t.primary_hex);
  const accent = hexToHsl(t.accent_hex);
  // Brand colors are fixed in src/styles.css; only non-color tokens apply here.
  void set;
  void primary;
  void accent;
  if (t.card_radius_px) root.style.setProperty("--radius", `${t.card_radius_px}px`);
  if (t.marble_bg_url) {
    document.body.style.backgroundImage = `url(${t.marble_bg_url})`;
    document.body.style.backgroundAttachment = "fixed";
    document.body.style.backgroundSize = "cover";
  }
}

const ThemeContext = createContext<ThemeSettings>(DEFAULTS);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeSettings>(DEFAULTS);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data } = await supabase
        .from("store_settings_public")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (!mounted) return;
      if (!data) {
        applyTokens(DEFAULTS);
        return;
      }
      const d = normalizeStoreIdentity(data as Record<string, unknown>) as any;
      const merged = normalizeStoreIdentity({
        ...DEFAULTS,
        id: d.id ?? DEFAULTS.id,
        primary_hex: d.primary_color ?? DEFAULTS.primary_hex,
        accent_hex: d.accent_color ?? DEFAULTS.accent_hex,
        card_radius_px: 12,
        hero_title: d.hero_title ?? DEFAULTS.hero_title,
        hero_subtitle: d.hero_subtitle ?? DEFAULTS.hero_subtitle,
        hero_cta_text: d.hero_cta_text ?? DEFAULTS.hero_cta_text,
        hero_grid_images: d.hero_image_url ? [d.hero_image_url] : [],
        auth_bg_url: d.login_bg_pattern ?? DEFAULTS.auth_bg_url,
        cart_empty_bg_url: d.cart_empty_bg ?? DEFAULTS.cart_empty_bg_url,
      }) as ThemeSettings;
      setTheme(merged);
      applyTokens(merged);
    };

    void load();

    const channel = supabase
      .channel("theme_settings_live")
      .on("postgres_changes", { event: "*", schema: "public", table: "store_settings" }, () => {
        void load();
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const value = useMemo(() => theme, [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
