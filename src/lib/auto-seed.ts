import { createServerFn } from "@tanstack/react-start";

const CATEGORIES = [
  { name: "الألبان والجبن الطازج", slug: "dairy-cheese", image_url: "https://images.unsplash.com/photo-1628088062854-d1870b4553da?q=80&w=600&auto=format&fit=crop" },
  { name: "الخضروات والفواكه", slug: "vegetables-fruits", image_url: "https://images.unsplash.com/photo-1596568289467-34c9c1b332b7?q=80&w=600&auto=format&fit=crop" },
  { name: "اللحوم والدواجن", slug: "meat-poultry", image_url: "https://images.unsplash.com/photo-1607623814075-e51df1bd6b51?q=80&w=600&auto=format&fit=crop" },
  { name: "المخبوزات والحلويات", slug: "bakery-sweets", image_url: "https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=600&auto=format&fit=crop" },
  { name: "المعلبات والبقالة", slug: "grocery-canned", image_url: "https://images.unsplash.com/photo-1588964895597-cfccd6e2dbf9?q=80&w=600&auto=format&fit=crop" },
];

const PRODUCTS = [
  ["جبنة بيضاء براميلي فلاحي", "dairy-cheese", 140, 50, "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?q=80&w=600&auto=format&fit=crop"],
  ["لبن جاموسي طازج", "dairy-cheese", 45, 100, "https://images.unsplash.com/photo-1563636619-e9143da7973b?q=80&w=600&auto=format&fit=crop"],
  ["طماطم بلدي طازجة", "vegetables-fruits", 20, 200, "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?q=80&w=600&auto=format&fit=crop"],
  ["موز مستورد", "vegetables-fruits", 35, 150, "https://images.unsplash.com/photo-1603833665858-e61d17a86224?q=80&w=600&auto=format&fit=crop"],
  ["لحم بقري مكعبات صافي", "meat-poultry", 450, 30, "https://images.unsplash.com/photo-1603048297172-c92544798d5e?q=80&w=600&auto=format&fit=crop"],
  ["دجاجة كاملة مبردة", "meat-poultry", 180, 80, "https://images.unsplash.com/photo-1598514982205-f36b96d1e8d4?q=80&w=600&auto=format&fit=crop"],
  ["عيش فينو طازج (5 حبات)", "bakery-sweets", 15, 60, "https://images.unsplash.com/photo-1598373182133-52452f7691ef?q=80&w=600&auto=format&fit=crop"],
  ["زيت عباد الشمس 1 لتر", "grocery-canned", 85, 120, "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?q=80&w=600&auto=format&fit=crop"],
] as const;

export const forceSyncAllToSupabase = createServerFn({ method: "POST" }).handler(async () => {
  try {
    const { supabaseAdmin: typedAdmin } = await import("@/integrations/supabase/client.server");
    const supabaseAdmin = typedAdmin as any;
    const { data: existingCats } = await supabaseAdmin.from("categories").select("id").limit(1);
    if (existingCats && existingCats.length > 0) return { success: true, message: "Database already seeded." };

    const { data: insertedCats, error: catError } = await supabaseAdmin
      .from("categories")
      .insert(CATEGORIES.map((c) => ({ ...c, name_ar: c.name })))
      .select("id,slug");
    if (catError) {
      console.warn("Auto-seed categories notice:", catError.message);
      return { success: false, error: catError.message };
    }
    const catMap = new Map((insertedCats ?? []).map((c: any) => [c.slug, c.id]));
    const products = PRODUCTS.map(([name, slug, price, stock, image_url]) => ({
      name,
      name_ar: name,
      category_id: catMap.get(slug) ?? null,
      price,
      stock,
      image_url,
      is_featured: false,
      is_active: true,
    }));
    const { error: productError } = await supabaseAdmin.from("products").insert(products);
    if (productError) {
      console.warn("Auto-seed products notice:", productError.message);
      return { success: false, error: productError.message };
    }
    return { success: true, categoriesCount: insertedCats?.length ?? 0, productsCount: products.length };
  } catch (error: any) {
    console.warn("Seeding notice (bypassed):", error?.message || error);
    return { success: false, error: error?.message || String(error) };
  }
});

export const autoSeedDatabaseIfNeeded = createServerFn({ method: "POST" }).handler(async () => {
  try {
    const { supabaseAdmin: typedAdmin } = await import("@/integrations/supabase/client.server");
    const supabaseAdmin = typedAdmin as any;
    const { data: products, error } = await supabaseAdmin.from("products").select("id").limit(1);
    if (!error && (!products || products.length === 0)) {
      await forceSyncAllToSupabase();
    }
  } catch {
    // Non-blocking background check
  }
});
