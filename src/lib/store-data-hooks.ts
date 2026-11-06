import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-loose";
import type { Product } from "@/lib/cart-context";

export type Category = {
  id: string;
  name: string;
  name_ar?: string | null;
  slug: string;
  icon?: string | null;
  image_url: string | null;
  parent_id?: string | null;
  sort_order?: number | null;
  created_at: string | null;
};

export type HeroBanner = {
  id: string;
  image_url: string;
  title: string | null;
  subtitle: string | null;
  cta_text: string | null;
  link_url: string | null;
  sort_order: number;
  is_active: boolean;
};

// Use the live Supabase schema as the source of truth. normalizeProduct maps
// these database names to the storefront's stable Product model.
export const PRODUCT_COLUMNS =
  "id,name,name_ar,description,description_ar,price,original_price,image_url,images,category_id,stock,rating,reviews_count,is_featured,is_active,created_at";
export function normalizeProduct(row: any): Product {
  const price = Number(row.price ?? row.price_per_unit ?? 0);
  const oldPrice = row.original_price != null ? Number(row.original_price) : (row.old_price != null ? Number(row.old_price) : null);
  const stock = Number(row.stock ?? row.stock_quantity ?? 0);
  const isFeatured = Boolean(row.is_featured);

  return {
    ...row,
    name: row.name_ar || row.name || "منتج",
    name_ar: row.name_ar ?? row.name ?? null,
    description: row.description_ar || row.description || null,
    description_ar: row.description_ar ?? row.description ?? null,
    price_per_unit: price,
    old_price: oldPrice,
    stock_quantity: stock,
    low_stock_threshold: Number(row.low_stock_threshold ?? 10),
    unit_label: row.unit_label ?? "قطعة",
    is_by_weight: Boolean(row.is_by_weight),
    // Featured placement is not a sales signal. Keep popularity separate until
    // the live schema exposes verified order metrics.
    is_popular: Boolean(row.is_popular),
    is_on_sale: Boolean(row.is_on_sale ?? (oldPrice != null && oldPrice > price)),
    is_featured: isFeatured,
    is_top_seller: Boolean(row.is_top_seller),
    avg_rating: row.rating != null ? Number(row.rating) : (row.avg_rating != null ? Number(row.avg_rating) : null),
    reviews_count: Number(row.reviews_count ?? 0),
  } as Product;
}

// ── 1. Fetch & Cache All Store Products (real Supabase data only) ──
export async function fetchStoreProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    console.warn("Error fetching products:", error.message);
    throw error;
  }
  return (data ?? []).map(normalizeProduct);
}

export function useStoreProducts() {
  return useQuery({
    queryKey: ["store-products"],
    queryFn: fetchStoreProducts,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  });
}

// ── 2. Fetch & Cache All Store Categories (real Supabase data only) ──
export async function fetchStoreCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id,name,name_ar,slug,image_url,created_at")
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("Failed to fetch categories:", error.message);
    return [];
  }
  return (data ?? []).map((c: any) => ({
    ...c,
    name: c.name_ar || c.name,
    name_ar: c.name_ar ?? c.name,
    image_url: c.image_url ?? null,
    icon: null,
    parent_id: null,
    sort_order: null,
  })) as Category[];
}

export function useStoreCategories() {
  return useQuery({
    queryKey: ["store-categories"],
    queryFn: fetchStoreCategories,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
  });
}

// ── 3. Fetch & Cache Hero Banners (real Supabase data only) ──
export async function fetchHeroBanners(): Promise<HeroBanner[]> {
  const { data, error } = await supabase
    .from("store_settings_public")
    .select("id,hero_image_url,hero_bg_image,hero_title,hero_subtitle,hero_cta_text")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("Failed to fetch hero banners:", error.message);
    return [];
  }
  if (!data || (!data.hero_image_url && !data.hero_bg_image)) return [];
  return [{
    id: data.id,
    image_url: data.hero_image_url || data.hero_bg_image,
    title: data.hero_title,
    subtitle: data.hero_subtitle,
    cta_text: data.hero_cta_text,
    link_url: null,
    sort_order: 0,
    is_active: true,
  }];
}

export function useHeroBanners() {
  return useQuery({
    queryKey: ["hero-banners"],
    queryFn: fetchHeroBanners,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
  });
}

// ── 4. Fetch & Cache Single Product ──
export function useStoreProduct(productId: string) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["store-product", productId],
    queryFn: async (): Promise<Product | null> => {
      if (!productId) return null;

      const cachedProducts = queryClient.getQueryData<Product[]>(["store-products"]);
      if (cachedProducts) {
        const found = cachedProducts.find((p) => p.id === productId);
        if (found) return found;
      }

      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_COLUMNS)
        .eq("is_active", true)
        .eq("id", productId)
        .maybeSingle();

      if (error) {
        console.warn(`[Store Data] Error fetching product ${productId}:`, error.message);
        return null;
      }
      if (!data) return null;
      return normalizeProduct(data);
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  });
}
