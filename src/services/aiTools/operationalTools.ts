/* =========================================================================
   GEMINI AI ADMIN ENGINE — OPERATIONAL & ADVANCED TOOLS (PHASES 1 & 2)
   Custom CSS, Metadata, RBAC, Reports/Analytics, Push Alerts, Delivery Zones
   ========================================================================= */

import { supabase } from "@/lib/supabase-loose";
import { isSupabaseConfigured } from "./envValidation";
import { createRollbackPoint, attachDbUndo } from "./coreCatalogTools";
import type { ToolExecutionContext, ToolExecutionResult } from "./types";
import type { StoreLayoutConfig } from "@/types/layout-config";

/* ───────────────────────── 1. executeCustomCSS ───────────────────────── */

export async function executeCustomCSS(
  cssRules: string,
  ctx?: ToolExecutionContext,
): Promise<ToolExecutionResult> {
  const rules = (cssRules || "").trim();
  if (!rules) {
    return { tool: "executeCustomCSS", ok: false, messageAr: "قواعد الـ CSS فارغة." };
  }

  const pointId = createRollbackPoint("executeCustomCSS", "تطبيق قواعد CSS مخصصة", ctx?.layout || null);

  if (typeof document !== "undefined") {
    let styleTag = document.getElementById("smartstore-custom-css") as HTMLStyleElement | null;
    if (!styleTag) {
      styleTag = document.createElement("style");
      styleTag.id = "smartstore-custom-css";
      document.head.appendChild(styleTag);
    }
    styleTag.textContent = rules;
  }

  if (typeof localStorage !== "undefined") {
    localStorage.setItem("smartstore_custom_css", rules);
  }

  return {
    tool: "executeCustomCSS",
    ok: true,
    rollbackPointId: pointId,
    messageAr: "تم حقن وتطبيق قواعد الـ CSS والتنسيقات المرئية المخصصة في المتجر فوراً.",
    data: { cssRulesPreview: rules.slice(0, 120) },
  };
}

/* ───────────────────────── 2. updateRawJsonMetadata ───────────────────────── */

export async function updateRawJsonMetadata(
  key: string,
  value: unknown,
  ctx?: ToolExecutionContext,
): Promise<ToolExecutionResult> {
  const k = (key || "").trim();
  if (!k) {
    return { tool: "updateRawJsonMetadata", ok: false, messageAr: "اسم مفتاح الإعداد (key) مطلوب." };
  }

  const ALLOWED_KEYS = ["site_name", "hero_title", "hero_subtitle", "whatsapp_number", "announcement_text"];
  const jsonVal = value !== undefined ? value : {};

  if (typeof jsonVal !== "string" || !ALLOWED_KEYS.includes(k)) {
    return {
      tool: "updateRawJsonMetadata",
      ok: false,
      messageAr: `المفتاح «${k}» غير مدعوم حاليًا بهذه الأداة (والقيمة يجب أن تكون نصية). المفاتيح المسموحة: ${ALLOWED_KEYS.join("، ")}.`,
    };
  }

  const pointId = createRollbackPoint("updateRawJsonMetadata", `تحديث إعداد: ${k}`, ctx?.layout || null);

  try {
    if (!isSupabaseConfigured()) {
      throw new Error("الاتصال بقاعدة البيانات (Supabase) غير مهيأ حاليًا.");
    }

    const { data: existing } = await supabase.from("store_settings").select("id").limit(1).maybeSingle();
    if (!existing?.id) {
      throw new Error("لم يتم العثور على صف إعدادات المتجر (store_settings) لتحديثه.");
    }

    const { error } = await supabase.from("store_settings").update({ [k]: jsonVal } as never).eq("id", existing.id);
    if (error) throw error;

    ctx?.refresh?.();

    return {
      tool: "updateRawJsonMetadata",
      ok: true,
      rollbackPointId: pointId,
      messageAr: `تم تحديث وحفظ بيانات الإعداد «${k}» بنجاح في store_settings.`,
      data: { key: k, value: jsonVal },
    };
  } catch (e) {
    return {
      tool: "updateRawJsonMetadata",
      ok: false,
      messageAr: `تعذر تحديث «${k}» في store_settings: ${(e as Error).message}`,
    };
  }
}

/* ───────────────────────── 3. manageUsersAndRoles ───────────────────────── */

export async function manageUsersAndRoles(
  args: { userId?: string; role?: string; fullName?: string; phone?: string },
  ctx?: ToolExecutionContext,
): Promise<ToolExecutionResult> {
  const targetId = (args.userId || "").trim();
  const targetRole = (args.role || "customer").toLowerCase() as "admin" | "moderator" | "driver" | "customer";

  if (!targetId) {
    return { tool: "manageUsersAndRoles", ok: false, messageAr: "معرّف المستخدم (userId) مطلوب لتحديث الصلاحيات." };
  }

  // Supabase is authoritative for account roles/profile data.
  // Do not fall back to LocalStorage for identity or RBAC state.
  if (!isSupabaseConfigured()) {
    return { tool: "manageUsersAndRoles", ok: false, messageAr: "الاتصال بقاعدة البيانات (Supabase) غير مهيأ حاليًا، لا يمكن تحديث الصلاحيات." };
  }

  const pointId = createRollbackPoint("manageUsersAndRoles", `تعديل رتبة المستخدم: ${targetId} -> ${targetRole}`, ctx?.layout || null);

  try {
    let resolvedUserId = targetId;

    // Find user if phone number or search string provided
    if (targetId.match(/^01\d{9}$/) || !targetId.includes("-")) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, phone")
        .or(`phone.eq.${targetId},full_name.ilike.%${targetId}%`)
        .limit(1)
        .maybeSingle();

      if (profile?.id) {
        resolvedUserId = profile.id;
      }
    }

    // 1. Fetch previous roles for rollback
    const { data: prevRoles } = await supabase
      .from("user_roles")
      .select("*")
      .eq("user_id", resolvedUserId);

    if (prevRoles && prevRoles.length > 0) {
      attachDbUndo(pointId, {
        table: "user_roles",
        kind: "restore-rows",
        rows: prevRoles as Record<string, unknown>[],
      });
    }

    // 2. Upsert role — this is the core action of the tool, so a failure here must fail the tool.
    const { error: roleErr } = await supabase
      .from("user_roles")
      .upsert(
        {
          user_id: resolvedUserId,
          role: targetRole,
        } as never,
        { onConflict: "user_id,role" } as any,
      );

    if (roleErr) throw roleErr;

    // 3. Update profile fields if provided (secondary — failure here is reported but doesn't undo the role change)
    let profileUpdateFailed = false;
    if (args.fullName || args.phone) {
      const { data: prevProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", resolvedUserId)
        .maybeSingle();

      if (prevProfile) {
        attachDbUndo(pointId, {
          table: "profiles",
          kind: "restore-rows",
          rows: [prevProfile as Record<string, unknown>],
        });
      }

      const profilePatch: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (args.fullName) profilePatch.full_name = args.fullName;
      if (args.phone) profilePatch.phone = args.phone;

      const { error: profileErr } = await supabase
        .from("profiles")
        .update(profilePatch as never)
        .eq("id", resolvedUserId);

      if (profileErr) {
        profileUpdateFailed = true;
        console.warn("profiles update error (role was still updated successfully):", profileErr);
      }
    }

    ctx?.refresh?.();

    const roleNamesAr: Record<string, string> = {
      admin: "مدير نظام (Admin)",
      moderator: "مشرف متجر (Moderator)",
      driver: "مندوب توصيل (Driver)",
      customer: "عميل متجر (Customer)",
    };

    return {
      tool: "manageUsersAndRoles",
      ok: true,
      rollbackPointId: pointId,
      messageAr: profileUpdateFailed
        ? `تم تحديث صلاحية الحساب (${targetId}) لتصبح «${roleNamesAr[targetRole] || targetRole}» بنجاح، لكن تعذر حفظ تعديلات الاسم/الهاتف في الملف الشخصي.`
        : `تم تحديث صلاحيات الحساب «${args.fullName || targetId}» لتصبح «${roleNamesAr[targetRole] || targetRole}» بنجاح.`,
      data: { userId: targetId, role: targetRole, fullName: args.fullName },
    };
  } catch (e) {
    return {
      tool: "manageUsersAndRoles",
      ok: false,
      messageAr: `تعذر تحديث صلاحيات المستخدم «${targetId}»: ${(e as Error).message}`,
    };
  }
}

/* ───────────────────────── 4. exportReportsAndAnalytics ───────────────────────── */

export async function exportReportsAndAnalytics(
  args: { timeframe?: string; format?: string; includeTopProducts?: boolean },
  ctx?: ToolExecutionContext,
): Promise<ToolExecutionResult> {
  const timeframe = args.timeframe || "last_30_days";
  const format = args.format || "json";
  const includeTop = args.includeTopProducts ?? true;

  let totalRevenue = 0;
  let totalOrders = 0;
  let averageOrderValue = 0;
  let ordersList: any[] = [];
  let topProducts: Array<{ name: string; salesCount: number; revenue: number }> = [];
  let queryFailed = false;
  let queryError = "";

  if (!isSupabaseConfigured()) {
    return {
      tool: "exportReportsAndAnalytics",
      ok: false,
      messageAr: "الاتصال بقاعدة البيانات (Supabase) غير مهيأ حاليًا، لا يمكن استخراج التقرير.",
    };
  }

  try {
    const { data: orders, error: ordersErr } = await supabase
      .from("orders")
      .select("id, total_amount, status, created_at, customer_name")
      .order("created_at", { ascending: false })
      .limit(100);

    if (ordersErr) throw ordersErr;

    if (orders && orders.length > 0) {
      ordersList = orders;
      totalOrders = orders.length;
      totalRevenue = orders.reduce((acc, o) => acc + (Number(o.total_amount) || 0), 0);
      averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    }

    const validOrderIds = (orders ?? []).filter((o) => o.status !== "cancelled").map((o) => o.id);
    if (validOrderIds.length) {
      const { data: orderItems, error: itemsErr } = await supabase.from("order_items").select("product_id,quantity,price").in("order_id", validOrderIds);
      if (itemsErr) throw itemsErr;
      const totals = new Map<string, { salesCount: number; revenue: number }>();
      for (const item of orderItems ?? []) {
        if (!item.product_id) continue;
        const current = totals.get(item.product_id) ?? { salesCount: 0, revenue: 0 };
        current.salesCount += Number(item.quantity || 0);
        current.revenue += Number(item.price || 0) * Number(item.quantity || 0);
        totals.set(item.product_id, current);
      }
      const ids = [...totals.keys()];
      const { data: prods, error: prodsErr } = ids.length
        ? await supabase.from("products").select("id,name,name_ar").in("id", ids)
        : { data: [], error: null };
      if (prodsErr) throw prodsErr;
      topProducts = (prods ?? []).map((p) => ({ name: p.name_ar || p.name, ...totals.get(p.id)! })).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    }
  } catch (e) {
    // A failed query must not be silently reported as "0 orders" — that's indistinguishable
    // from a genuinely empty store and would mislead whoever reads the report.
    queryFailed = true;
    queryError = (e as Error).message;
    console.warn("Analytics export query error:", e);
  }

  if (queryFailed) {
    return {
      tool: "exportReportsAndAnalytics",
      ok: false,
      messageAr: `تعذر استخراج تقرير المبيعات: ${queryError}`,
    };
  }

  const reportData = {
    reportTitle: `تقرير مبيعات وأداء المتجر (${timeframe})`,
    generatedAt: new Date().toISOString(),
    timeframe,
    summary: {
      totalRevenue: +totalRevenue.toFixed(2),
      totalOrders,
      averageOrderValue: +averageOrderValue.toFixed(2),
      currency: "EGP",
    },
    topProducts: includeTop ? topProducts : undefined,
    recentOrdersCount: ordersList.length,
  };

  let csvContent = "";
  if (format === "csv") {
    csvContent = `ID,Customer,Total Price,Status,Created At\n` +
      ordersList.map((o) => `"${o.id}","${o.customer_name || "عميل"}","${o.total_amount}","${o.status}","${o.created_at}"`).join("\n");
  }

  return {
    tool: "exportReportsAndAnalytics",
    ok: true,
    messageAr: `تم استخراج وتصدير تقرير أداء المتجر للفترة (${timeframe}) بإجمالي مبيعات ${totalRevenue.toLocaleString()} ج.م و${totalOrders} طلب.`,
    data: {
      timeframe,
      format,
      reportData,
      csvContent: format === "csv" ? csvContent : undefined,
    },
  };
}

/* ───────────────────────── 5. sendPushNotification ───────────────────────── */

export async function sendPushNotification(
  args: { title?: string; message?: string; targetAudience?: string; actionUrl?: string },
  ctx?: ToolExecutionContext,
): Promise<ToolExecutionResult> {
  const title = (args.title || "تنبيه هام من المتجر 🔔").trim();
  const message = (args.message || "عرض خاص متاح الآن في المتجر!").trim();
  const audience = args.targetAudience || "all";
  const actionUrl = args.actionUrl || "/categories";

  const pointId = createRollbackPoint("sendPushNotification", `إرسال إشعار فوري: ${title}`, ctx?.layout || null);

  // Update announcement bar in layout (in-memory, immediately visible in the current session)
  const layoutUpdated = !!ctx;
  if (ctx) {
    const next: StoreLayoutConfig = JSON.parse(JSON.stringify(ctx.layout));
    next.announcementBar.enabled = true;
    next.announcementBar.text = `${title} — ${message}`;
    next.announcementBar.link = actionUrl;
    ctx.updateLayout(next);
  }

  // Persist to store_settings so the banner survives a page reload
  let dbSynced = false;
  let dbError: string | null = null;
  if (isSupabaseConfigured()) {
    try {
      const { data: existing } = await supabase.from("store_settings").select("id").limit(1).maybeSingle();
      if (existing?.id) {
        const { error } = await supabase
          .from("store_settings")
          .update({
            announcement_text: `${title}: ${message}`,
            announcement_enabled: true,
            updated_at: new Date().toISOString(),
          } as never)
          .eq("id", existing.id);
        if (error) throw error;
        dbSynced = true;
      } else {
        dbError = "لم يتم العثور على صف إعدادات المتجر (store_settings).";
      }
    } catch (e) {
      dbError = (e as Error).message;
      console.warn("store_settings announcement sync failed:", e);
    }
  }

  // Note: this tool only updates the on-site announcement bar (store_settings.announcement_text) —
  // there is no real push-notification channel (FCM/OneSignal/etc.) wired up. "sendPushNotification"
  // is a legacy name from an earlier design; it does not push anything to visitors' devices.
  if (!layoutUpdated && !dbSynced) {
    return {
      tool: "sendPushNotification",
      ok: false,
      messageAr: `تعذر تحديث شريط الإعلانات: لا يوجد سياق واجهة نشط ${dbError ? `والخطأ من قاعدة البيانات: ${dbError}` : "ولا اتصال بقاعدة البيانات"}.`,
    };
  }

  return {
    tool: "sendPushNotification",
    ok: true,
    rollbackPointId: pointId,
    messageAr: dbSynced
      ? `تم تحديث شريط الإعلانات «${title}» بنجاح وحفظه في قاعدة البيانات (store_settings).`
      : `تم تحديث شريط الإعلانات «${title}» في الواجهة الحالية فقط — تعذر حفظه بشكل دائم في قاعدة البيانات (${dbError}), فقد يختفي بعد تحديث الصفحة.`,
    data: { title, message, audience, actionUrl, dbSynced },
  };
}

/* ───────────────────────── 6. manageDeliveryZones ───────────────────────── */

export async function manageDeliveryZones(
  args: {
    zoneName?: string;
    deliveryFee?: number;
    minOrderAmount?: number;
    estimatedMinutes?: number;
    action?: string;
    zoneId?: string;
  },
  ctx?: ToolExecutionContext,
): Promise<ToolExecutionResult> {
  const name = (args.zoneName || "").trim();
  const fee = Number(args.deliveryFee ?? 20);
  const minOrder = Number(args.minOrderAmount ?? 100);
  const sla = Number(args.estimatedMinutes ?? 45);
  const action = (args.action || "update").toLowerCase();

  if (!name) {
    return { tool: "manageDeliveryZones", ok: false, messageAr: "اسم منطقة التوصيل مطلوب." };
  }

  if (!isSupabaseConfigured()) {
    return { tool: "manageDeliveryZones", ok: false, messageAr: "الاتصال بقاعدة البيانات (Supabase) غير مهيأ حاليًا، لا يمكن تحديث مناطق التوصيل." };
  }

  const pointId = createRollbackPoint("manageDeliveryZones", `تعديل منطقة التوصيل: ${name}`, ctx?.layout || null);

  try {
    if (args.zoneId) {
      const { data: prev } = await supabase
        .from("delivery_zones")
        .select("*")
        .eq("id", args.zoneId)
        .maybeSingle();

      if (prev) {
        attachDbUndo(pointId, { table: "delivery_zones", kind: "restore-rows", rows: [prev as Record<string, unknown>] });
      }

      const { error } = await supabase
        .from("delivery_zones")
        .update({
          name,
          fee,
          min_order_amount: minOrder,
          estimated_minutes: sla,
          is_active: action !== "toggle_active" ? true : undefined,
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", args.zoneId);

      if (error) throw error;
    } else {
      const { data: existingZone } = await supabase
        .from("delivery_zones")
        .select("*")
        .ilike("name", `%${name}%`)
        .limit(1)
        .maybeSingle();

      if (existingZone?.id) {
        attachDbUndo(pointId, { table: "delivery_zones", kind: "restore-rows", rows: [existingZone as Record<string, unknown>] });

        const { error } = await supabase
          .from("delivery_zones")
          .update({
            fee,
            min_order_amount: minOrder,
            estimated_minutes: sla,
            updated_at: new Date().toISOString(),
          } as never)
          .eq("id", existingZone.id);

        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase
          .from("delivery_zones")
          .insert({
            name,
            fee,
            min_order_amount: minOrder,
            estimated_minutes: sla,
            country: "Egypt",
            city: "Cairo",
            is_active: true,
          } as never)
          .select("id")
          .maybeSingle();

        if (error) throw error;

        if (inserted?.id) {
          attachDbUndo(pointId, { table: "delivery_zones", kind: "delete-row", id: inserted.id });
        }
      }
    }

    ctx?.refresh?.();

    return {
      tool: "manageDeliveryZones",
      ok: true,
      rollbackPointId: pointId,
      messageAr: `تم تحديث رسوم التوصيل لمنطقة «${name}» لتكون ${fee} ج.م (حد أدنى للطلب: ${minOrder} ج.م، التوصيل خلال ${sla} دقيقة).`,
      data: { zoneName: name, deliveryFee: fee, minOrderAmount: minOrder, estimatedMinutes: sla },
    };
  } catch (e) {
    return {
      tool: "manageDeliveryZones",
      ok: false,
      messageAr: `تعذر تحديث منطقة التوصيل «${name}»: ${(e as Error).message}`,
    };
  }
}
