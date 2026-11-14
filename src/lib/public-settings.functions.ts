import { createServerFn } from "@tanstack/react-start";
import { normalizeStoreIdentity } from "@/lib/store-identity";

export type PublicStoreSettings = {
  id?: string;
  site_name?: string | null;
  logo_url?: string | null;
  favicon_url?: string | null;
  primary_color?: string | null;
  accent_color?: string | null;
  background_color?: string | null;
  foreground_color?: string | null;
  font_family?: string | null;
  announcement_text?: string | null;
  announcement_enabled?: boolean | null;
  announcement_bg_color?: string | null;
  whatsapp_number?: string | null;
  hero_title?: string | null;
  hero_subtitle?: string | null;
  hero_image_url?: string | null;
  hero_cta_text?: string | null;
  hero_bg_image?: string | null;
  login_bg_pattern?: string | null;
  cart_empty_bg?: string | null;
  floating_element_image?: string | null;
  store_address?: string | null;
  store_lat?: number | null;
  store_lng?: number | null;
  ga4_id?: string | null;
  meta_pixel_id?: string | null;
  min_order_amount?: number | null;
  default_delivery_fee?: number | null;
  free_shipping_threshold?: number | null;
  first_order_coupon_enabled?: boolean | null;
  first_order_coupon_code?: string | null;
  first_order_discount_percent?: number | null;
  categories_style?: "grid" | "scroll" | "cards" | "pills" | null;
  products_style?: "modern" | "compact" | "bordered" | "glass" | null;
  card_radius?: "rounded-xl" | "rounded-2xl" | "rounded-3xl" | null;
  hero_style?: "gradient" | "image" | "split" | null;
};

const PUBLIC_KEYS = [
  "id",
  "site_name",
  "logo_url",
  "favicon_url",
  "primary_color",
  "accent_color",
  "background_color",
  "foreground_color",
  "font_family",
  "announcement_text",
  "announcement_enabled",
  "announcement_bg_color",
  "whatsapp_number",
  "hero_title",
  "hero_subtitle",
  "hero_image_url",
  "hero_cta_text",
  "hero_bg_image",
  "login_bg_pattern",
  "cart_empty_bg",
  "floating_element_image",
  "store_address",
  "store_lat",
  "store_lng",
  "ga4_id",
  "meta_pixel_id",
  "min_order_amount",
  "default_delivery_fee",
  "free_shipping_threshold",
  "first_order_coupon_enabled",
  "first_order_coupon_code",
  "first_order_discount_percent",
  "categories_style",
  "products_style",
  "card_radius",
  "hero_style",
] as const;

export function pickPublicStoreSettings(raw: Record<string, unknown> | null): PublicStoreSettings {
  if (!raw) return {};
  const result: Record<string, unknown> = {};
  for (const key of PUBLIC_KEYS) {
    if (key in raw && raw[key] !== undefined) {
      result[key] = raw[key];
    }
  }
  if (typeof result.hero_image_url === "string" && result.hero_image_url.includes("unsplash.com")) {
    result.hero_image_url = "/images/hero/fresh-produce.jpg";
  }
  if (typeof result.hero_bg_image === "string" && result.hero_bg_image.includes("unsplash.com")) {
    result.hero_bg_image = "/images/hero/fresh-produce.jpg";
  }
  return normalizeStoreIdentity(result) as PublicStoreSettings;
}

/**
 * Public read-only storefront settings endpoint using server privileges
 * so anonymous browsers receive brand name, announcement bar, and delivery rules
 * without hitting RLS 401 errors or reading sensitive configuration fields.
 */
export const getPublicStoreSettings = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await (supabaseAdmin as any)
    .from("store_settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("[PublicSettings] Failed to read store_settings:", error.message);
    return {} as PublicStoreSettings;
  }

  return pickPublicStoreSettings((data as Record<string, unknown> | null) ?? null);
});
