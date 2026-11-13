/* =========================================================================
   GEMINI AI ADMIN ENGINE — 11 CORE LOVABLE TOOLS (SUPABASE ALIGNED)
   Strict database mutations, live Supabase queries, hybrid synonym/keyword
   catalog search, and instant rollback protection.
   ========================================================================= */

import { supabase } from "@/lib/supabase-loose";
import { isSupabaseConfigured } from "./envValidation";
import type { ToolExecutionContext, ToolExecutionResult, RollbackPoint, AiToolName } from "./types";
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
    localStorage.setItem(ROLLBACK_STACK_KEY, JSON.stringify(stack.slice(-MAX_ROLLBACK_DEPTH)));
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

export function attachDbUndo(pointId: string, dbUndo: NonNullable<RollbackPoint["db"]>): void {
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

export async function rollbackLastAction(ctx?: ToolExecutionContext): Promise<ToolExecutionResult> {
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
        const { error } = await supabase
          .from(table as any)
          .delete()
          .eq("id", id);
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
      return {
        tool: "generateProductImage",
        ok: false,
        messageAr: "لم أتحقق من المنتج لأن Supabase غير متصل؛ لم أبدأ التوليد.",
      };
    }
    const { data: product, error } = await supabase
      .from("products")
      .select("id,name,name_ar,image_url,is_active")
      .eq("id", args.productId)
      .eq("is_active", true)
      .maybeSingle();
    if (error)
      return {
        tool: "generateProductImage",
        ok: false,
        messageAr: `تعذر التحقق من المنتج في Supabase: ${error.message}`,
      };
    if (!product)
      return {
        tool: "generateProductImage",
        ok: false,
        messageAr: "المنتج غير موجود أو غير نشط في Supabase؛ لم أبدأ التوليد.",
      };
    name = product.name_ar || product.name;
  }
  if (!name) {
    return {
      tool: "generateProductImage",
      ok: false,
      messageAr: "اسم المنتج مطلوب لتوليد الصورة.",
    };
  }

  const prompt = `Professional commercial supermarket studio photography of ${name}, fresh Egyptian gourmet grocery, clean studio lighting, 8k resolution, appetizing presentation on neutral background`;
  const pointId = createRollbackPoint(
    "generateProductImage",
    `توليد صورة منتج: ${name}`,
    ctx?.layout || null,
  );

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
  const pointId = createRollbackPoint(
    "uploadBannerImage",
    `توليد بانر: ${headline}`,
    ctx?.layout || null,
  );

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
  const pointId = createRollbackPoint(
    "manageProduct",
    `إدارة منتج (${action})`,
    ctx?.layout || null,
  );

  try {
    if (!isSupabaseConfigured()) {
      throw new Error("قاعدة بيانات Supabase غير متصلة؛ أوقفت العملية دون تغيير أي بيانات.");
    }

    if (action === "create") {
      const name = String(data.name_ar || data.name || "").trim();
      const price = Number(data.price ?? data.price_per_unit);
      if (!name) throw new Error("اسم المنتج مطلوب.");
      if (!Number.isFinite(price) || price <= 0)
        throw new Error("سعر المنتج يجب أن يكون أكبر من صفر.");
      const { data: existingProducts, error: lookupError } = await supabase
        .from("products")
        .select("id,name,name_ar")
        .eq("is_active", true)
        .limit(500);
      if (lookupError) throw lookupError;
      const normalizeName = (value: unknown) =>
        String(value || "")
          .trim()
          .toLocaleLowerCase("ar");
      const duplicate = (existingProducts || []).find(
        (product: any) =>
          normalizeName(product.name) === normalizeName(name) ||
          normalizeName(product.name_ar) === normalizeName(name),
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
        search_keywords: Array.isArray(data.search_keywords) ? data.search_keywords : [],
        dietary_tags: Array.isArray(data.dietary_tags) ? data.dietary_tags : [],
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
      return {
        tool: "manageProduct",
        ok: false,
        messageAr: "معرّف المنتج (id) مطلوب للتعديل أو الحذف.",
      };
    }

    const { data: prev, error: readError } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (readError) throw readError;
    if (!prev) throw new Error("لم أعثر على المنتج بهذا المعرّف في Supabase؛ لم أعدل شيئاً.");

    attachDbUndo(pointId, {
      table: "products",
      kind: "restore-rows",
      rows: [prev as Record<string, unknown>],
    });

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
    const copy = (from: string, to = from) => {
      if (patchInput[from] !== undefined) patch[to] = patchInput[from];
    };
    copy("name");
    copy("name_ar");
    copy("description");
    copy("description_ar");
    copy("search_keywords");
    copy("dietary_tags");
    copy("image_url");
    copy("images");
    copy("category_id");
    copy("rating");
    copy("reviews_count");
    copy("is_featured");
    copy("is_active");
    if (patchInput.price !== undefined || patchInput.price_per_unit !== undefined)
      patch.price = Number(patchInput.price ?? patchInput.price_per_unit);
    if (patchInput.original_price !== undefined || patchInput.old_price !== undefined)
      patch.original_price = patchInput.original_price ?? patchInput.old_price;
    if (patchInput.stock !== undefined || patchInput.stock_quantity !== undefined)
      patch.stock = Number(patchInput.stock ?? patchInput.stock_quantity);
    if (Object.keys(patch).length === 0)
      throw new Error("لا توجد حقول صالحة للتحديث في مخطط المنتجات الحالي.");
    const { error } = await supabase
      .from("products")
      .update(patch as never)
      .eq("id", id);

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
  const pointId = createRollbackPoint(
    "manageCategories",
    `إدارة قسم (${action})`,
    ctx?.layout || null,
  );

  try {
    if (!isSupabaseConfigured()) {
      throw new Error("قاعدة بيانات Supabase غير متصلة؛ أوقفت العملية دون تغيير أي بيانات.");
    }

    if (action === "create") {
      const name = String(data.name || "قسم جديد");
      const slug = String(
        data.slug || `cat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      );
      const { data: existingCategories, error: lookupError } = await supabase
        .from("categories")
        .select("id,name,name_ar")
        .limit(500);
      if (lookupError) throw lookupError;
      const normalizeName = (value: unknown) =>
        String(value || "")
          .trim()
          .toLocaleLowerCase("ar");
      const duplicate = (existingCategories || []).find(
        (category: any) =>
          normalizeName(category.name) === normalizeName(name) ||
          normalizeName(category.name_ar) === normalizeName(name),
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
        data: {
          id: inserted.id,
          name,
          name_ar: payload.name_ar,
          slug,
          image_url: payload.image_url,
          categoryPreflight: true,
        },
      };
    }

    const id = String(data.id || "");
    if (!id) {
      return { tool: "manageCategories", ok: false, messageAr: "معرّف القسم (id) مطلوب." };
    }

    const { data: prev, error: readError } = await supabase
      .from("categories")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (readError) throw readError;
    if (!prev) throw new Error("لم أعثر على القسم بهذا المعرّف في Supabase؛ لم أعدل شيئاً.");

    attachDbUndo(pointId, {
      table: "categories",
      kind: "restore-rows",
      rows: [prev as Record<string, unknown>],
    });

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
    for (const key of ["name", "name_ar", "slug", "image_url"])
      if (patchInput[key] !== undefined) patch[key] = patchInput[key];
    if (Object.keys(patch).length === 0) throw new Error("لا توجد حقول صالحة للتحديث.");
    const { error } = await supabase
      .from("categories")
      .update(patch as never)
      .eq("id", id);

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
    return {
      tool: "bulkPriceUpdate",
      ok: false,
      messageAr: "حدد نسبة التغيير المطلوبة للأسعار (مثلاً: -15 لخصم 15%).",
    };
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
        if (failedUpdate)
          throw failedUpdate.error || new Error("لم يتم تأكيد تحديث جميع الأسعار من Supabase.");
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
    return {
      tool: "updateLayoutConfig",
      ok: false,
      messageAr: "بيانات التخطيط layoutJson مطلوبة.",
    };
  }

  const pointId = createRollbackPoint(
    "updateLayoutConfig",
    "تعديل تخطيط الواجهة",
    ctx?.layout || null,
  );

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
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) /
