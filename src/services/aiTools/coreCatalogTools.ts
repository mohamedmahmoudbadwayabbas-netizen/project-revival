/* =========================================================================
   GEMINI AI ADMIN ENGINE — 12 CORE LOVABLE TOOLS (SUPABASE ALIGNED)
   Strict database mutations, live Supabase queries, and instant rollback protection
   ========================================================================= */

import { supabase } from "@/lib/supabase-loose";
import { isSupabaseConfigured } from "./envValidation";
import type {
  ToolExecutionContext,
  ToolExecutionResult,
  RollbackPoint,
  AiToolName,
} from "./types";
import type { StoreLayoutConfig, ThemeColorPalette } from "@/types/layout-config";
import { generateAdminImage } from "@/services/geminiImageService";
import { normalizeArabic } from "@/lib/fuzzy-search";

/* ───────────────────────── Rollback Engine ───────────────────────── */

const ROLLBACK_STACK_KEY = "smartstore_ai_rollback_stack";
const MAX_ROLLBACK_DEPTH = 30;

export function getRollbackStack(): RollbackPoint[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(ROLLBACK_STACK_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveRollbackStack(stack: RollbackPoint[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(
      ROLLBACK_STACK_KEY,
      JSON.stringify(stack.slice(-MAX_ROLLBACK_DEPTH)),
    );
  } catch {
    /* ignore storage quota */
  }
}

export function createRollbackPoint(
  tool: AiToolName,
  labelAr: string,
  layout: StoreLayoutConfig | null,
): string {
  const id = `rb-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const point: RollbackPoint = {
    id,
    tool,
    labelAr,
    createdAt: new Date().toISOString(),
    layout: layout ? JSON.parse(JSON.stringify(layout)) : null,
  };
  const stack = getRollbackStack();
  stack.push(point);
  saveRollbackStack(stack);
  return id;
}

export function attachDbUndo(
  pointId: string,
  dbUndo: NonNullable<RollbackPoint["db"]>,
): void {
  const stack = getRollbackStack();
  const target = stack.find((p) => p.id === pointId);
  if (target) {
    target.db = dbUndo;
    saveRollbackStack(stack);
  }
}

export function getLastRollbackPoint(): RollbackPoint | null {
  const stack = getRollbackStack();
  return stack.length > 0 ? stack[stack.length - 1] : null;
}

export async function rollbackLastAction(
  ctx?: ToolExecutionContext,
): Promise<ToolExecutionResult> {
  const stack = getRollbackStack();
  const last = stack.pop();

  if (!last) {
    return {
      tool: "rollbackLastAction",
      ok: false,
      messageAr: "لا توجد إجراءات سابقة للتراجع عنها في الذاكرة.",
    };
  }

  saveRollbackStack(stack);

  // 1. Revert UI layout if saved
  if (last.layout && ctx) {
    ctx.updateLayout(last.layout);
  }

  // 2. Revert DB changes in Supabase
  if (last.db && isSupabaseConfigured()) {
    try {
      const { table, kind, rows, id } = last.db;
      if (kind === "restore-rows" && rows && rows.length > 0) {
        const { error } = await supabase.from(table as any).upsert(rows as any);
        if (error) throw error;
      } else if (kind === "delete-row" && id) {
        const { error } = await supabase.from(table as any).delete().eq("id", id);
        if (error) throw error;
      }
    } catch (err) {
      return {
        tool: "rollbackLastAction",
        ok: false,
        messageAr: `تعذر استعادة بيانات قاعدة البيانات: ${(err as Error).message}`,
      };
    }
  }

  ctx?.refresh?.();

  return {
    tool: "rollbackLastAction",
    ok: true,
    messageAr: `تم التراجع بنجاح عن «${last.labelAr}» واستعادة الحالة السابقة.`,
    data: { revertedTool: last.tool, revertedAt: last.createdAt },
  };
}

/* ───────────────────────── 1. generateProductImage ───────────────────────── */

export async function toolGenerateProductImage(
  args: { productName?: string; category?: string; productId?: string },
  ctx?: ToolExecutionContext,
): Promise<ToolExecutionResult> {
  let name = (args.productName || "").trim();
  if (args.productId) {
    if (!isSupabaseConfigured()) {
      return { tool: "generateProductImage", ok: false, messageAr: "لم أتحقق من المنتج لأن Supabase غير متصل؛ لم أبدأ التوليد." };
    }
    const { data: product, error } = await supabase
      .from("products")
      .select("id,name,name_ar,image_url,is_active")
      .eq("id", args.productId)
      .eq("is_active", true)
      .maybeSingle();
    if (error) return { tool: "generateProductImage", ok: false, messageAr: `تعذر التحقق من المنتج في Supabase: ${error.message}` };
    if (!product) return { tool: "generateProductImage", ok: false, messageAr: "المنتج غير موجود أو غير نشط في Supabase؛ لم أبدأ التوليد." };
    name = product.name_ar || product.name;
  }
  if (!name) {
    return { tool: "generateProductImage", ok: false, messageAr: "اسم المنتج مطلوب لتوليد الصورة." };
  }

  const prompt = `Professional commercial supermarket studio photography of ${name}, fresh Egyptian gourmet grocery, clean studio lighting, 8k resolution, appetizing presentation on neutral background`;
  const pointId = createRollbackPoint("generateProductImage", `توليد صورة منتج: ${name}`, ctx?.layout || null);

  const res = await generateAdminImage({
    prompt,
    aspectRatio: "1:1",
  });

  if (!res.success || !res.imageUrl) {
    return {
      tool: "generateProductImage",
      ok: false,
      messageAr: res.error || "تعذر توليد الصورة بالذكاء الاصطناعي حالياً.",
    };
  }

  // Attach image to Supabase product if productId provided
  if (args.productId && isSupabaseConfigured()) {
    try {
      const { data: prev, error: previousError } = await supabase
        .from("products")
        .select("id, image_url")
        .eq("id", args.productId)
        .maybeSingle();
      if (previousError) throw previousError;

      if (prev) {
        attachDbUndo(pointId, {
          table: "products",
          kind: "restore-rows",
          rows: [prev as Record<string, unknown>],
        });
      }

      const { error } = await supabase
        .from("products")
        .update({ image_url: res.imageUrl })
        .eq("id", args.productId);
      if (error) throw error;
    } catch (e) {
      return {
        tool: "generateProductImage",
        ok: false,
        messageAr: `تم توليد الصورة لكن تعذر ربطها بالمنتج: ${(e as Error).message}`,
      };
    }
  }

  ctx?.refresh?.();

  return {
    tool: "generateProductImage",
    ok: true,
    rollbackPointId: pointId,
    messageAr: `تم توليد صورة استوديو احترافية لمنتج «${name}» بنجاح.`,
    data: { imageUrl: res.imageUrl, productName: name, productId: args.productId },
  };
}

/* ───────────────────────── 2. uploadBannerImage ───────────────────────── */

export async function toolUploadBannerImage(
  args: { bannerText?: string; subtitle?: string },
  ctx?: ToolExecutionContext,
): Promise<ToolExecutionResult> {
  const headline = (args.bannerText || "").trim();
  if (!headline) {
    return { tool: "uploadBannerImage", ok: false, messageAr: "عنوان البانر مطلوب." };
  }

  const prompt = `Modern vibrant Egyptian supermarket promotional banner for "${headline}", fresh grocery products, luxury appetizing background, 16:9 widescreen layout`;
  const pointId = createRollbackPoint("uploadBannerImage", `توليد بانر: ${headline}`, ctx?.layout || null);

  const res = await generateAdminImage({
    prompt,
    aspectRatio: "16:9",
  });

  if (!res.success || !res.imageUrl) {
    return {
      tool: "uploadBannerImage",
      ok: false,
      messageAr: res.error || "تعذر توليد صورة البانر حالياً.",
    };
  }

  if (ctx) {
    const nextLayout: StoreLayoutConfig = JSON.parse(JSON.stringify(ctx.layout));
    nextLayout.heroBanner.enabled = true;
    nextLayout.heroBanner.slides = [
      {
        id: `slide-${Date.now()}`,
        title: headline,
        subtitle: args.subtitle || "عروض حصرية طازجة بأعلى جودة",
        imageUrl: res.imageUrl,
        ctaText: "تسوق الآن",
        ctaLink: "/categories",
        badge: "عرض خاص",
        align: "right",
      },
      ...(nextLayout.heroBanner.slides || []).slice(0, 4),
    ];
    ctx.updateLayout(nextLayout);
  }

  if (isSupabaseConfigured()) {
    try {
      const { data: existing, error: settingsError } = await supabase
        .from("store_settings")
        .select("id, hero_title, hero_subtitle, hero_image_url")
        .limit(1)
        .maybeSingle();
      if (settingsError) throw settingsError;
      if (!existing?.id) throw new Error("لم يتم العثور على سجل إعدادات المتجر لتحديث البانر.");

      attachDbUndo(pointId, {
        table: "store_settings",
        kind: "restore-rows",
        rows: [existing as Record<string, unknown>],
      });

      const { error } = await supabase
        .from("store_settings")
        .update({
          hero_title: headline,
          hero_subtitle: args.subtitle || null,
          hero_image_url: res.imageUrl,
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", existing.id);
      if (error) throw error;
    } catch (e) {
      return {
        tool: "uploadBannerImage",
        ok: false,
        messageAr: `تم توليد البانر لكن تعذر حفظه في إعدادات المتجر: ${(e as Error).message}`,
      };
    }
  }

  return {
    tool: "uploadBannerImage",
    ok: true,
    rollbackPointId: pointId,
    messageAr: `تم توليد البانر الترويجي «${headline}» وإضافته لواجهة المتجر بنجاح.`,
    data: { imageUrl: res.imageUrl, headline },
  };
}

/* ───────────────────────── 3. manageProduct ───────────────────────── */

export async function toolManageProduct(
  args: { action?: string; data?: Record<string, unknown> },
  ctx?: ToolExecutionContext,
): Promise<ToolExecutionResult> {
  const action = (args.action || "create").toLowerCase();
  const data = args.data || {};
  const pointId = createRollbackPoint("manageProduct", `إدارة منتج (${action})`, ctx?.layout || null);

  try {
    if (!isSupabaseConfigured()) {
      throw new Error("قاعدة بيانات Supabase غير متصلة؛ أوقفت العملية دون تغيير أي بيانات.");
    }

    if (action === "create") {
      const name = String(data.name_ar || data.name || "").trim();
      const price = Number(data.price ?? data.price_per_unit);
      if (!name) throw new Error("اسم المنتج مطلوب.");
      if (!Number.isFinite(price) || price <= 0) throw new Error("سعر المنتج يجب أن يكون أكبر من صفر.");
      const { data: existingProducts, error: lookupError } = await supabase
        .from("products")
        .select("id,name,name_ar")
        .eq("is_active", true)
        .limit(500);
      if (lookupError) throw lookupError;
      const normalizeName = (value: unknown) => String(value || "").trim().toLocaleLowerCase("ar");
      const duplicate = (existingProducts || []).find((product: any) =>
        normalizeName(product.name) === normalizeName(name) || normalizeName(product.name_ar) === normalizeName(name),
      );
      if (duplicate) {
        return {
          tool: "manageProduct",
          ok: false,
          messageAr: `يوجد منتج مسجل بالفعل بهذا الاسم في Supabase (المعرّف: ${duplicate.id}). لم أضف نسخة مكررة.`,
          data: { id: duplicate.id, catalogPreflight: true },
        };
      }
      const originalPrice = data.original_price ?? data.old_price;
      const payload = {
        name,
        name_ar: (data.name_ar as string) || null,
        description: (data.description as string) || null,
        description_ar: (data.description_ar as string) || null,
        price,
        original_price: originalPrice != null ? Number(originalPrice) : null,
        image_url: (data.image_url as string) || null,
        images: Array.isArray(data.images) ? (data.images as string[]) : null,
        category_id: (data.category_id as string) || null,
        stock: Number(data.stock ?? data.stock_quantity ?? 50),
        rating: data.rating != null ? Number(data.rating) : null,
        reviews_count: data.reviews_count != null ? Number(data.reviews_count) : null,
        is_featured: Boolean(data.is_featured ?? data.is_popular),
        is_active: data.is_active !== false,
      };

      const { data: inserted, error } = await supabase
        .from("products")
        .insert(payload as never)
        .select("id")
        .maybeSingle();

      if (error) throw error;

      if (inserted?.id) {
        attachDbUndo(pointId, { table: "products", kind: "delete-row", id: inserted.id });
      } else {
        throw new Error("لم تُرجع قاعدة البيانات معرّف المنتج بعد الإنشاء.");
      }

      ctx?.refresh?.();

      return {
        tool: "manageProduct",
        ok: true,
        rollbackPointId: pointId,
        messageAr: `تمت إضافة المنتج «${payload.name}» بسعر ${payload.price} ج.م في الكتالوج بنجاح.`,
        data: { id: inserted.id, name: payload.name, price: payload.price, catalogPreflight: true },
      };
    }

    const id = String(data.id || "");
    if (!id) {
      return { tool: "manageProduct", ok: false, messageAr: "معرّف المنتج (id) مطلوب للتعديل أو الحذف." };
    }

    const { data: prev, error: readError } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
    if (readError) throw readError;
    if (!prev) throw new Error("لم أعثر على المنتج بهذا المعرّف في Supabase؛ لم أعدل شيئاً.");

    attachDbUndo(pointId, { table: "products", kind: "restore-rows", rows: [prev as Record<string, unknown>] });

    if (action === "delete") {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;

      ctx?.refresh?.();

      return {
        tool: "manageProduct",
        ok: true,
        rollbackPointId: pointId,
        messageAr: `تم حذف المنتج (id: ${id}) بنجاح مع إمكانية التراجع الفوري.`,
        data: { id, catalogPreflight: true },
      };
    }

    const patchInput = data as Record<string, unknown>;
    const patch: Record<string, unknown> = {};
    const copy = (from: string, to = from) => { if (patchInput[from] !== undefined) patch[to] = patchInput[from]; };
    copy("name"); copy("name_ar"); copy("description"); copy("description_ar"); copy("image_url"); copy("images");
    copy("category_id"); copy("rating"); copy("reviews_count"); copy("is_featured"); copy("is_active");
    if (patchInput.price !== undefined || patchInput.price_per_unit !== undefined) patch.price = Number(patchInput.price ?? patchInput.price_per_unit);
    if (patchInput.original_price !== undefined || patchInput.old_price !== undefined) patch.original_price = patchInput.original_price ?? patchInput.old_price;
    if (patchInput.stock !== undefined || patchInput.stock_quantity !== undefined) patch.stock = Number(patchInput.stock ?? patchInput.stock_quantity);
    if (Object.keys(patch).length === 0) throw new Error("لا توجد حقول صالحة للتحديث في مخطط المنتجات الحالي.");
    const { error } = await supabase.from("products").update(patch as never).eq("id", id);

    if (error) throw error;

    ctx?.refresh?.();

    return {
      tool: "manageProduct",
      ok: true,
      rollbackPointId: pointId,
      messageAr: `تم تحديث بيانات المنتج «${data.name || id}» في Supabase بنجاح.`,
      data: { id, ...data, updatedFields: Object.keys(data), catalogPreflight: true },
    };
  } catch (e) {
    return {
      tool: "manageProduct",
      ok: false,
      messageAr: `تعذر تنفيذ عملية إدارة المنتج: ${(e as Error).message}`,
    };
  }
}

/* ───────────────────────── 4. manageCategories ───────────────────────── */

export async function toolManageCategories(
  args: { action?: string; data?: Record<string, unknown> },
  ctx?: ToolExecutionContext,
): Promise<ToolExecutionResult> {
  const action = (args.action || "create").toLowerCase();
  const data = args.data || {};
  const pointId = createRollbackPoint("manageCategories", `إدارة قسم (${action})`, ctx?.layout || null);

  try {
    if (!isSupabaseConfigured()) {
      throw new Error("قاعدة بيانات Supabase غير متصلة؛ أوقفت العملية دون تغيير أي بيانات.");
    }

    if (action === "create") {
      const name = String(data.name || "قسم جديد");
      const slug = String(data.slug || `cat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`);
      const { data: existingCategories, error: lookupError } = await supabase
        .from("categories")
        .select("id,name,name_ar")
        .limit(500);
      if (lookupError) throw lookupError;
      const normalizeName = (value: unknown) => String(value || "").trim().toLocaleLowerCase("ar");
      const duplicate = (existingCategories || []).find((category: any) =>
        normalizeName(category.name) === normalizeName(name) || normalizeName(category.name_ar) === normalizeName(name),
      );
      if (duplicate) {
        return {
          tool: "manageCategories",
          ok: false,
          messageAr: `يوجد قسم مسجل بالفعل بهذا الاسم في Supabase (المعرّف: ${duplicate.id}). لم أضف نسخة مكررة.`,
          data: { id: duplicate.id, categoryPreflight: true },
        };
      }

      const payload = {
        name,
        name_ar: (data.name_ar as string) || null,
        slug,
        image_url: (data.image_url as string) || null,
      };

      const { data: inserted, error } = await supabase
        .from("categories")
        .insert(payload as never)
        .select("id")
        .maybeSingle();

      if (error) throw error;

      if (inserted?.id) {
        attachDbUndo(pointId, { table: "categories", kind: "delete-row", id: inserted.id });
      } else {
        throw new Error("لم تُرجع قاعدة البيانات معرّف القسم بعد الإنشاء.");
      }

      ctx?.refresh?.();

      return {
        tool: "manageCategories",
        ok: true,
        rollbackPointId: pointId,
        messageAr: `تمت إضافة القسم «${name}» لقاعدة البيانات بنجاح.`,
        data: { id: inserted.id, name, name_ar: payload.name_ar, slug, image_url: payload.image_url, categoryPreflight: true },
      };
    }

    const id = String(data.id || "");
    if (!id) {
      return { tool: "manageCategories", ok: false, messageAr: "معرّف القسم (id) مطلوب." };
    }

    const { data: prev, error: readError } = await supabase.from("categories").select("*").eq("id", id).maybeSingle();
    if (readError) throw readError;
    if (!prev) throw new Error("لم أعثر على القسم بهذا المعرّف في Supabase؛ لم أعدل شيئاً.");

    attachDbUndo(pointId, { table: "categories", kind: "restore-rows", rows: [prev as Record<string, unknown>] });

    if (action === "delete") {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;

      ctx?.refresh?.();

      return {
        tool: "manageCategories",
        ok: true,
        rollbackPointId: pointId,
        messageAr: `تم حذف القسم بنجاح.`,
        data: { id },
      };
    }

    const patchInput = data as Record<string, unknown>;
    const patch: Record<string, unknown> = {};
    for (const key of ["name", "name_ar", "slug", "image_url"]) if (patchInput[key] !== undefined) patch[key] = patchInput[key];
    if (Object.keys(patch).length === 0) throw new Error("لا توجد حقول صالحة للتحديث.");
    const { error } = await supabase.from("categories").update(patch as never).eq("id", id);

    if (error) throw error;

    ctx?.refresh?.();

    return {
      tool: "manageCategories",
      ok: true,
      rollbackPointId: pointId,
      messageAr: `تم تحديث بيانات القسم بنجاح.`,
      data: { id, ...data, categoryPreflight: true },
    };
  } catch (e) {
    return {
      tool: "manageCategories",
      ok: false,
      messageAr: `تعذر تنفيذ العملية على القسم: ${(e as Error).message}`,
    };
  }
}

/* ───────────────────────── 5. bulkPriceUpdate ───────────────────────── */

export async function toolBulkPriceUpdate(
  args: { categoryId?: string; percentage?: number },
  ctx?: ToolExecutionContext,
): Promise<ToolExecutionResult> {
  const pct = Number(args.percentage ?? 0);
  if (!pct) {
    return { tool: "bulkPriceUpdate", ok: false, messageAr: "حدد نسبة التغيير المطلوبة للأسعار (مثلاً: -15 لخصم 15%)." };
  }

  const categoryId = args.categoryId || "all";
  const pointId = createRollbackPoint(
    "bulkPriceUpdate",
    `تحديث أسعار ${categoryId === "all" ? "كل المنتجات" : "قسم محدد"} بنسبة ${pct}%`,
    ctx?.layout || null,
  );

  try {
    if (!isSupabaseConfigured()) {
      throw new Error("قاعدة بيانات Supabase غير متصلة؛ أوقفت العملية دون تغيير أي بيانات.");
    }

    {
      let query = supabase.from("products").select("id, price, original_price");
      if (categoryId !== "all") {
        query = query.eq("category_id", categoryId);
      }

      const { data: rows, error } = await query;
      if (error) throw error;
      if (!rows?.length) throw new Error("لم أجد منتجات في Supabase لتطبيق تغيير الأسعار عليها.");

      {
        attachDbUndo(pointId, {
          table: "products",
          kind: "restore-rows",
          rows: rows as Record<string, unknown>[],
        });

        const factor = 1 + pct / 100;
        const updates = await Promise.all(
          rows.map((r) =>
            supabase
              .from("products")
              .update({
                price: Math.max(0.5, +(Number(r.price || 0) * factor).toFixed(2)),
                original_price: pct < 0 ? Number(r.price || 0) : r.original_price,
              } as never)
              .eq("id", r.id)
              .select("id,price"),
          ),
        );
        const failedUpdate = updates.find((result) => result.error || !result.data?.length);
        if (failedUpdate) throw failedUpdate.error || new Error("لم يتم تأكيد تحديث جميع الأسعار من Supabase.");
      }
    }

    ctx?.refresh?.();

    return {
      tool: "bulkPriceUpdate",
      ok: true,
      rollbackPointId: pointId,
      messageAr: `تم ${pct < 0 ? "تخفيض" : "زيادة"} أسعار المنتجات بنسبة ${Math.abs(pct)}% بنجاح.`,
      data: { percentage: pct, categoryId },
    };
  } catch (e) {
    return {
      tool: "bulkPriceUpdate",
      ok: false,
      messageAr: `تعذر تحديث الأسعار: ${(e as Error).message}`,
    };
  }
}

/* ───────────────────────── 6. updateLayoutConfig ───────────────────────── */

export async function toolUpdateLayoutConfig(
  args: { layoutJson?: Record<string, unknown> },
  ctx?: ToolExecutionContext,
): Promise<ToolExecutionResult> {
  const json = args.layoutJson;
  if (!json || typeof json !== "object") {
    return { tool: "updateLayoutConfig", ok: false, messageAr: "بيانات التخطيط layoutJson مطلوبة." };
  }

  const pointId = createRollbackPoint("updateLayoutConfig", "تعديل تخطيط الواجهة", ctx?.layout || null);

  if (ctx) {
    const merged: StoreLayoutConfig = {
      ...ctx.layout,
      ...(json as Partial<StoreLayoutConfig>),
      lastUpdated: new Date().toISOString(),
    };
    ctx.updateLayout(merged);
  }

  return {
    tool: "updateLayoutConfig",
    ok: true,
    rollbackPointId: pointId,
    messageAr: "تم دمج وتطبيق تعديلات تخطيط الواجهة بنجاح.",
    data: { updatedKeys: Object.keys(json) },
  };
}

/* ───────────────────────── 7. updateThemeColors ───────────────────────── */

export function hexToHslString(hex: string): string | null {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return null;

  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export async function toolUpdateThemeColors(
  args: { primary?: string; accent?: string; mode?: string; palette?: string },
  ctx?: ToolExecutionContext,
): Promise<ToolExecutionResult> {
  const primary = args.primary || "#2F5D4B";
  const accent = args.accent || "#B6502E";
  const mode = args.mode === "dark" ? "dark" : args.mode === "light" ? "light" : undefined;
  const pointId = createRollbackPoint("updateThemeColors", `تحديث الألوان: ${primary}`, ctx?.layout || null);

  // Apply to document DOM
  if (typeof document !== "undefined") {
    const root = document.documentElement;
    const primHsl = hexToHslString(primary);
    const accHsl = hexToHslString(accent);

    if (primHsl) {
      root.style.setProperty("--primary", primHsl);
      root.style.setProperty("--ring", primHsl);
    }
    if (accHsl) {
      root.style.setProperty("--accent", accHsl);
      root.style.setProperty("--sale", accHsl);
    }
    if (mode === "dark") root.classList.add("dark");
    else if (mode === "light") root.classList.remove("dark");
  }

  // Update layout theme
  if (ctx) {
    const next: StoreLayoutConfig = JSON.parse(JSON.stringify(ctx.layout));
    next.theme.primaryColor = primary;
    next.theme.accentColor = accent;
    if (mode) next.theme.mode = mode;
    if (args.palette) next.theme.palette = args.palette as ThemeColorPalette;
    ctx.updateLayout(next);
  }

  // Sync theme values to the live store_settings table
  if (isSupabaseConfigured()) {
    try {
      const { data: storeRow, error: selectError } = await supabase.from("store_settings").select("id").limit(1).maybeSingle();
      if (selectError) throw selectError;
      if (!storeRow?.id) throw new Error("لم يتم العثور على سجل إعدادات المتجر لتحديث الألوان.");
      const { error } = await supabase
        .from("store_settings")
        .update({
          primary_color: primary,
          accent_color: accent,
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", storeRow.id);
      if (error) throw error;
    } catch (e) {
      return {
        tool: "updateThemeColors",
        ok: false,
        messageAr: `تم تطبيق اللون محليًا لكن تعذر حفظه في إعدادات المتجر: ${(e as Error).message}`,
      };
    }
  }

  return {
    tool: "updateThemeColors",
    ok: true,
    rollbackPointId: pointId,
    messageAr: `تم تحديث هوية وألوان المتجر (الأساسي: ${primary}، الثانوي: ${accent}) بنجاح.`,
    data: { primary, accent, mode, palette: args.palette },
  };
}

/* ───────────────────────── 8. createDiscountBundle ───────────────────────── */

export async function toolCreateDiscountBundle(
  args: {
    code?: string;
    discountValue?: number;
    discountType?: string;
    title?: string;
    hours?: number;
    minOrderAmount?: number;
  },
  ctx?: ToolExecutionContext,
): Promise<ToolExecutionResult> {
  const code = (args.code || `SAVE${Math.floor(Math.random() * 90 + 10)}`).toUpperCase();
  const value = Number(args.discountValue ?? 15);
  const type = args.discountType === "fixed" ? "fixed" : "percentage";
  const hours = Number(args.hours ?? 6);
  const expiresAt = new Date(Date.now() + hours * 3600 * 1000).toISOString();
  const pointId = createRollbackPoint("createDiscountBundle", `إنشاء كوبون: ${code}`, ctx?.layout || null);

  if (isSupabaseConfigured()) {
    try {
      const { data: inserted, error } = await supabase
        .from("coupons")
        .insert({
          code,
          discount_type: type,
          discount_value: value,
          expires_at: expiresAt,
          is_active: true,
          min_order_amount: args.minOrderAmount ? Number(args.minOrderAmount) : null,
        } as never)
        .select("id")
        .maybeSingle();

      if (error) throw error;
      if (!inserted?.id) throw new Error("لم تُرجع قاعدة البيانات معرّف الكوبون بعد الإنشاء.");

      const { data: confirmed, error: readBackError } = await supabase
        .from("coupons")
        .select("id, code, discount_type, discount_value, expires_at, is_active")
        .eq("id", inserted.id)
        .maybeSingle();
      if (readBackError) throw readBackError;
      if (!confirmed) throw new Error("تعذر التحقق من وجود الكوبون بعد الإنشاء.");

      attachDbUndo(pointId, { table: "coupons", kind: "delete-row", id: inserted.id });
    } catch (e) {
      return {
        tool: "createDiscountBundle",
        ok: false,
        messageAr: `تعذر إنشاء الكوبون في قاعدة البيانات: ${(e as Error).message}`,
      };
    }
  } else {
    return {
      tool: "createDiscountBundle",
      ok: false,
      messageAr: "تعذر إنشاء الكوبون لأن اتصال قاعدة البيانات غير مهيأ.",
    };
  }

  // Surface in flash sale timer
  if (ctx) {
    const next: StoreLayoutConfig = JSON.parse(JSON.stringify(ctx.layout));
    next.flashSaleTimer.enabled = true;
    next.flashSaleTimer.title = args.title || `عروض الساعات الذهبية — استخدم كود ${code}`;
    next.flashSaleTimer.couponCode = code;
    next.flashSaleTimer.discountTag = type === "percentage" ? `خصم ${value}%` : `خصم ${value} ج.م`;
    next.flashSaleTimer.endTime = expiresAt;
    ctx.updateLayout(next);
  }

  return {
    tool: "createDiscountBundle",
    ok: true,
    rollbackPointId: pointId,
    messageAr: `تم إنشاء باقة الخصم وتفعيل كود «${code}» (${type === "percentage" ? `${value}%` : `${value} ج.م`}) لمدة ${hours} ساعات.`,
    data: { code, discountValue: value, discountType: type, expiresAt },
  };
}

/* ───────────────────────── 9. sendAbandonedCartRecovery ───────────────────────── */

export async function toolSendAbandonedCartRecovery(
  args: { cartId?: string; customerName?: string; phone?: string; totalPrice?: number },
): Promise<ToolExecutionResult> {
  try {
    if (!isSupabaseConfigured()) throw new Error("Supabase غير متصل؛ لم أستخدم بيانات محلية أو تجريبية.");
    if (!args.cartId) throw new Error("معرّف السلة مطلوب للتحقق منها في Supabase.");

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const cartId = args.cartId;
    const userId = cartId.startsWith("cart-") ? cartId.slice("cart-".length) : "";
    let cartQuery = supabase.from("cart_items").select("id,user_id,product_id,quantity,created_at").lt("created_at", cutoff);
    cartQuery = userId ? cartQuery.eq("user_id", userId) : cartQuery.eq("id", cartId);
    const { data: cartRows, error: cartError } = await cartQuery;
    if (cartError) throw cartError;
    if (!cartRows?.length) throw new Error("لم أجد سلة متروكة مطابقة في Supabase.");

    const verifiedUserId = cartRows[0].user_id;
    if (!verifiedUserId || cartRows.some((row) => row.user_id !== verifiedUserId)) throw new Error("تعذر التحقق من مالك السلة.");
    const lastActivity = Math.max(...cartRows.map((row) => new Date(row.created_at ?? 0).getTime()));
    const [{ data: profile, error: profileError }, { data: products, error: productsError }, { data: orders, error: ordersError }] = await Promise.all([
      supabase.from("profiles").select("id,full_name,phone").eq("id", verifiedUserId).maybeSingle(),
      supabase.from("products").select("id,name,name_ar,price,is_active").in("id", cartRows.map((row) => row.product_id).filter(Boolean)).eq("is_active", true),
      supabase.from("orders").select("id,created_at").eq("user_id", verifiedUserId).gte("created_at", new Date(lastActivity).toISOString()).limit(1),
    ]);
    if (profileError) throw profileError;
    if (productsError) throw productsError;
    if (ordersError) throw ordersError;
    if (orders?.length) throw new Error("السلة مرتبطة بطلب أحدث؛ لم أفتح رسالة استرداد.");
    if (!profile?.phone) throw new Error("لا يوجد رقم هاتف موثق للعميل في Supabase.");

    const productMap = new Map((products ?? []).map((product) => [product.id, product]));
    if (cartRows.some((row) => !row.product_id || !productMap.has(row.product_id))) throw new Error("بعض منتجات السلة لم تُتحقق في Supabase.");
    const items = cartRows.map((row) => {
      const product = productMap.get(row.product_id!)!;
      return { name: product.name_ar || product.name, lineTotal: Number(product.price || 0) * Number(row.quantity || 0) };
    });
    const total = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const name = profile.full_name || "عميل المتجر";
    const message = `أهلاً بك يا ${name} من سوبرماركت الوادي الأخضر.\n\nوجدنا في قاعدة المتجر أن سلتك ما زالت تحتوي على: ${items.map((item) => item.name).join("، ")}، بإجمالي حالي ${total.toFixed(2)} ج.م.\n\nيمكنك مراجعة السلة وإكمال طلبك من صفحة المتجر: ${typeof window !== "undefined" ? `${window.location.origin}/cart` : "صفحة السلة"}`;
    const cleanPhone = profile.phone.replace(/[^0-9]/g, "");
    const formattedPhone = cleanPhone.startsWith("0") ? `2${cleanPhone}` : cleanPhone;
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;

    if (typeof window !== "undefined") window.open(whatsappUrl, "_blank");

    return {
      tool: "sendAbandonedCartRecovery",
      ok: true,
      messageAr: `تم إعداد مسودة استرداد مبنية على السلة والعميل والمنتجات التي تحققت منها Supabase، دون ادعاء وجود خصم غير متحقق.`,
      data: { whatsappUrl, messageText: message, total },
    };
  } catch (error) {
    return { tool: "sendAbandonedCartRecovery", ok: false, messageAr: `لم أفتح الرسالة لأن بيانات السلة لم تُتحقق في Supabase: ${(error as Error).message}` };
  }
}

/* ───────────────────────── 10. searchProducts (READ-ONLY) ─────────────────────────
   Root-cause fix: previously there was no real catalog read tool, so the model
   would call an unrelated mutatesState:false devops tool (e.g. searchCodebase)
   which returned ok:true and tripped the old success-banner logic even though
   nothing in the catalog was ever touched. This tool gives the model a real,
   safe way to check existence/price/stock BEFORE issuing a manageProduct
   create/update call — which also prevents duplicate-insert bugs. */

export async function toolSearchProducts(
  args: { query?: string; categoryId?: string; limit?: number },
  ctx?: ToolExecutionContext,
): Promise<ToolExecutionResult> {
  const query = (args.query || "").trim();
  // أسئلة عامة مثل «كم عدد المنتجات» أو «اعرض المنتجات» تعني عرض الكتالوج كله
  // وليس البحث عن منتج اسمه «منتجات».
  const GENERIC = /^(\*|all|any|products?|catalog|items?|كل|الكل|جميع|منتج|منتجات|المنتجات|كل المنتجات|جميع المنتجات|السلع|الكتالوج|متوفر|المتوفر|المتاح|عدد المنتجات)$/i;
  const listAll = !query || GENERIC.test(query) ||
    query.split(/[\s،,]+/).every((w) => GENERIC.test(w) || w.length <= 1);

  const limit = Math.max(1, Math.min(20, Number(args.limit ?? 8) || 8));

  if (!isSupabaseConfigured()) {
    return {
      tool: "searchProducts",
      ok: false,
      messageAr: "قاعدة بيانات Supabase غير متصلة حالياً، تعذر البحث في المنتجات.",
    };
  }

  try {
    let dbQuery = supabase
      .from("products")
      .select("id, name, name_ar, price, original_price, stock, image_url, category_id, is_featured, is_active")
      .eq("is_active", true)
      .limit(500);

    if (args.categoryId) {
      dbQuery = dbQuery.eq("category_id", args.categoryId);
    }

    const { data, error } = await dbQuery;
    if (error) throw error;

    // Read authoritative rows from Supabase first, then match both Arabic and
    // English names locally. Searching only `name` missed Arabic catalog rows
    // whose display name lives in `name_ar`.
    // التطبيع العربي (ة/ه، أ/إ/آ/ا، ى/ي، التشكيل) يجعل «جبنه» تطابق «جبنة»؛ بدونه كان
    // البحث يخسر نتائج صحيحة بسبب اختلاف كتابة الحرف فقط.
    const fold = (text: string) => normalizeArabic(text.normalize("NFKC"));
    const terms = fold(query).split(/[\s،,]+/).filter((term) => term.length > 1);
    const total = (data || []).length;
    const rows = (listAll ? data || [] : (data || []).filter((row: any) => {
      const searchable = fold(`${row.name || ""} ${row.name_ar || ""}`);
      return terms.some((term) => searchable.includes(term));
    })).slice(0, listAll ? Math.max(limit, 20) : limit);
    if (listAll) {
      const summary = rows.map((r: any) => `«${r.name_ar || r.name}» — ${r.price} ج.م (المخزون: ${r.stock ?? "؟"})`).join("، ");
      return {
        tool: "searchProducts",
        ok: true,
        messageAr: `عدد المنتجات النشطة في المتجر: ${total}. ${summary}`,
        data: { query: query || "*", total, results: rows },
      };
    }

    if (rows.length === 0) {
      return {
        tool: "searchProducts",
        ok: true,
        messageAr: `لا توجد نتائج مطابقة لـ «${query}» في الكتالوج الحالي.`,
        data: { query, results: [] },
      };
    }

    const summary = rows
      .map(
        (r: any) =>
          `«${r.name_ar || r.name}» — ${r.price} ج.م${r.stock !== null && r.stock !== undefined ? ` (المخزون: ${r.stock})` : ""}`,
      )
      .join("، ");

    return {
      tool: "searchProducts",
      ok: true,
      messageAr: `تم العثور على ${rows.length} نتيجة مطابقة لـ «${query}»: ${summary}.`,
      data: { query, results: rows },
    };
  } catch (e) {
    return {
      tool: "searchProducts",
      ok: false,
      messageAr: `تعذر البحث في المنتجات: ${(e as Error).message}`,
    };
  }
}

/* ───────────────────────── 11. getCategories (READ-ONLY) ─────────────────────────
   Companion read tool to searchProducts — lets the model verify a category
   exists (and fetch its id) before calling manageCategories to create one,
   avoiding duplicate/near-duplicate categories. */

export async function toolGetCategories(
  args: { nameQuery?: string },
): Promise<ToolExecutionResult> {
  if (!isSupabaseConfigured()) {
    return {
      tool: "getCategories",
      ok: false,
      messageAr: "قاعدة بيانات Supabase غير متصلة حالياً، تعذر جلب قائمة الأقسام.",
    };
  }

  try {
    const dbQuery = supabase
      .from("categories")
      .select("id, name, name_ar, slug, image_url, created_at")
      .order("created_at", { ascending: true })
      .limit(500);

    const nameQuery = (args.nameQuery || "").trim();

    const { data, error } = await dbQuery;
    if (error) throw error;

    const terms = nameQuery.normalize("NFKC").toLocaleLowerCase("ar").split(/[\s،,]+/).filter((term) => term.length > 1);
    const rows = (data || []).filter((row: any) => {
      if (terms.length === 0) return true;
      const searchable = `${row.name || ""} ${row.name_ar || ""}`.normalize("NFKC").toLocaleLowerCase("ar");
      return terms.some((term) => searchable.includes(term));
    });

    if (rows.length === 0) {
      return {
        tool: "getCategories",
        ok: true,
        messageAr: nameQuery
          ? `لا يوجد قسم مطابق لـ «${nameQuery}» حالياً.`
          : "لا توجد أقسام مسجلة في المتجر حالياً.",
        data: { nameQuery: nameQuery || null, results: [] },
      };
    }

    const summary = rows.map((r: any) => `${r.name_ar || r.name}`).join("، ");

    return {
      tool: "getCategories",
      ok: true,
      messageAr: `يوجد ${rows.length} قسم مطابق: ${summary}.`,
      data: { nameQuery: nameQuery || null, results: rows },
    };
  } catch (e) {
    return {
      tool: "getCategories",
      ok: false,
      messageAr: `تعذر جلب قائمة الأقسام: ${(e as Error).message}`,
    };
  }
}
