/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const STUDIO_TABLES = [
  "products",
  "categories",
  "orders",
  "order_items",
  "profiles",
  "coupons",
  "delivery_zones",
  "delivery_slots",
  "reviews",
  "hero_banners",
  "flash_offers",
  "returns",
  "addresses",
  "wishlists",
  "abandoned_carts",
  "notifications",
  "user_roles",
] as const;
type StudioTable = (typeof STUDIO_TABLES)[number];
const ROLES = ["admin", "staff", "user"] as const;
type Role = (typeof ROLES)[number];

async function requireAdmin(context: any) {
  const { data: ok } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!ok) throw new Error("غير مصرح");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const admin = supabaseAdmin as any;
  const log = async (action: string, target?: string, details?: unknown) => {
    await admin.from("admin_activity").insert({
      actor_id: context.userId,
      actor_email: context.claims?.email ?? null,
      action,
      target: target ?? null,
      details: details ?? null,
    });
  };
  return { admin, log };
}

function assertTable(t: string): StudioTable {
  if (!(STUDIO_TABLES as readonly string[]).includes(t)) throw new Error("جدول غير مسموح");
  return t as StudioTable;
}

export const listUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { admin } = await requireAdmin(context);
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) throw new Error(error.message);
    const [{ data: roles }, { data: profiles }, { data: orders }, { data: settings }] =
      await Promise.all([
        admin.from("user_roles").select("user_id, role"),
        admin.from("profiles").select("id, full_name, phone"),
        admin.from("orders").select("user_id, total_price"),
        admin.from("store_settings").select("allow_signups").order("created_at").limit(1),
      ]);
    type U = {
      id: string;
      email: string;
      name: string;
      phone: string;
      role: Role;
      createdAt: string;
      lastSignIn: string | null;
      confirmed: boolean;
      banned: boolean;
      ordersCount: number;
      spent: number;
    };
    const users: U[] = data.users.map((u: any) => {
      const r = (roles ?? []).filter((x: any) => x.user_id === u.id).map((x: any) => x.role);
      const p = (profiles ?? []).find((x: any) => x.id === u.id);
      const os = (orders ?? []).filter((o: any) => o.user_id === u.id);
      return {
        id: u.id as string,
        email: (u.email ?? u.phone ?? "") as string,
        name: (p?.full_name ?? "") as string,
        phone: (p?.phone ?? "") as string,
        role: (r.includes("admin") ? "admin" : r.includes("staff") ? "staff" : "user") as Role,
        createdAt: u.created_at as string,
        lastSignIn: (u.last_sign_in_at ?? null) as string | null,
        confirmed: !!u.email_confirmed_at,
        banned: !!u.banned_until && new Date(u.banned_until) > new Date(),
        ordersCount: os.length,
        spent: os.reduce((s: number, o: any) => s + Number(o.total_price || 0), 0),
      };
    });
    return { users, allowSignups: Boolean(settings?.[0]?.allow_signups ?? true) };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; role: Role }) => {
    if (!ROLES.includes(d.role)) throw new Error("رتبة غير صحيحة");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { admin, log } = await requireAdmin(context);
    if (data.userId === context.userId && data.role !== "admin")
      throw new Error("لا يمكنك إزالة صلاحيتك بنفسك");
    await admin.from("user_roles").delete().eq("user_id", data.userId);
    const { error } = await admin
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.role });
    if (error) throw new Error(error.message);
    await log("تغيير رتبة", data.userId, { role: data.role });
    return { ok: true };
  });

export const setUserBanned = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; banned: boolean }) => d)
  .handler(async ({ data, context }) => {
    const { admin, log } = await requireAdmin(context);
    if (data.userId === context.userId) throw new Error("لا يمكنك إيقاف حسابك");
    const { error } = await admin.auth.admin.updateUserById(data.userId, {
      ban_duration: data.banned ? "876000h" : "none",
    });
    if (error) throw new Error(error.message);
    await admin.from("profiles").update({ is_blocked: data.banned }).eq("id", data.userId);
    await log(data.banned ? "إيقاف حساب" : "تفعيل حساب", data.userId);
    return { ok: true };
  });

export const createUserAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { email: string; password: string; fullName: string; role: Role }) => {
    if (!/^\S+@\S+\.\S+$/.test(d.email)) throw new Error("بريد غير صحيح");
    if ((d.password ?? "").length < 8) throw new Error("كلمة المرور ٨ أحرف على الأقل");
    if (!ROLES.includes(d.role)) throw new Error("رتبة غير صحيحة");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { admin, log } = await requireAdmin(context);
    const { data: created, error } = await admin.auth.admin.createUser({
      email: data.email.trim(),
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
      app_metadata: { created_by_admin: true },
    });
    if (error) throw new Error(error.message);
    const id = created.user.id;
    if (data.role !== "user") {
      await admin.from("user_roles").delete().eq("user_id", id);
      await admin.from("user_roles").insert({ user_id: id, role: data.role });
    }
    await log("إنشاء حساب", data.email, { role: data.role });
    return { ok: true };
  });

export const deleteUserAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => d)
  .handler(async ({ data, context }) => {
    const { admin, log } = await requireAdmin(context);
    if (data.userId === context.userId) throw new Error("لا يمكنك حذف حسابك");
    const { error } = await admin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    await log("حذف حساب", data.userId);
    return { ok: true };
  });

export const sendPasswordReset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { email: string; redirectTo: string }) => d)
  .handler(async ({ data, context }) => {
    const { admin, log } = await requireAdmin(context);
    const { error } = await admin.auth.resetPasswordForEmail(data.email, {
      redirectTo: data.redirectTo,
    });
    if (error) throw new Error(error.message);
    await log("إرسال رابط كلمة مرور", data.email);
    return { ok: true };
  });

export const setAllowSignups = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { allow: boolean }) => d)
  .handler(async ({ data, context }) => {
    const { admin, log } = await requireAdmin(context);
    const { data: row } = await admin
      .from("store_settings")
      .select("id")
      .order("created_at")
      .limit(1)
      .maybeSingle();
    if (!row) throw new Error("لا توجد إعدادات للمتجر");
    const { error } = await admin
      .from("store_settings")
      .update({ allow_signups: data.allow })
      .eq("id", row.id);
    if (error) throw new Error(error.message);
    await log(data.allow ? "فتح التسجيل" : "إغلاق التسجيل");
    return { ok: true };
  });

export const studioRows = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      table: string;
      page: number;
      pageSize: number;
      search?: string;
      sort?: string;
      asc?: boolean;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    const { admin } = await requireAdmin(context);
    const table = assertTable(data.table);
    const size = Math.min(Math.max(data.pageSize, 1), 500);
    const from = Math.max(data.page, 0) * size;
    let q = admin.from(table).select("*", { count: "exact" });
    if (data.sort && /^[a-z_]+$/.test(data.sort)) q = q.order(data.sort, { ascending: !!data.asc });
    else q = q.order("created_at", { ascending: false, nullsFirst: false });
    const { data: rows, count, error } = await q.range(from, from + size - 1);
    if (error) {
      const retry = await admin
        .from(table)
        .select("*", { count: "exact" })
        .range(from, from + size - 1);
      if (retry.error) throw new Error(retry.error.message);
      return { json: JSON.stringify(retry.data ?? []), count: (retry.count ?? 0) as number };
    }
    return { json: JSON.stringify(rows ?? []), count: (count ?? 0) as number };
  });

export const studioUpdate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { table: string; id: string; patch: Record<string, unknown> }) => d)
  .handler(async ({ data, context }) => {
    const { admin, log } = await requireAdmin(context);
    const table = assertTable(data.table);
    if (table === "user_roles") throw new Error("غيّر الرتب من صفحة المستخدمين");
    const { error } = await admin.from(table).update(data.patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    await log("تعديل سجل", `${table}/${data.id}`, data.patch);
    return { ok: true };
  });

export const studioDelete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { table: string; id: string }) => d)
  .handler(async ({ data, context }) => {
    const { admin, log } = await requireAdmin(context);
    const table = assertTable(data.table);
    if (table === "user_roles") throw new Error("غيّر الرتب من صفحة المستخدمين");
    const { error } = await admin.from(table).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await log("حذف سجل", `${table}/${data.id}`);
    return { ok: true };
  });

export const studioInsert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { table: string; rows: Record<string, unknown>[] }) => d)
  .handler(async ({ data, context }) => {
    const { admin, log } = await requireAdmin(context);
    const table = assertTable(data.table);
    if (table === "user_roles") throw new Error("غيّر الرتب من صفحة المستخدمين");
    const { error } = await admin.from(table).insert(data.rows);
    if (error) throw new Error(error.message);
    await log("استيراد سجلات", table, { count: data.rows.length });
    return { ok: true };
  });

export const studioCounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { admin } = await requireAdmin(context);
    const out: Record<string, number> = {};
    await Promise.all(
      STUDIO_TABLES.map(async (t) => {
        const { count } = await admin.from(t).select("*", { count: "exact", head: true });
        out[t] = count ?? 0;
      }),
    );
    return out;
  });

export const activityLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { admin } = await requireAdmin(context);
    const { data } = await admin
      .from("admin_activity")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    return ((data ?? []) as any[]).map((a) => ({
      id: a.id as string,
      actor_email: (a.actor_email ?? null) as string | null,
      action: a.action as string,
      target: (a.target ?? null) as string | null,
      created_at: a.created_at as string,
    }));
  });
