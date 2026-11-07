import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { analyzeSignals, type FeedbackRow, type InteractionRow } from "./analyze";

/** Admin-only: analyze last 30 days of Nawat signals and insert new pending proposals (never applies them). */
export const generateProposals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const since = new Date(Date.now() - 30 * 864e5).toISOString();
    const [i, f, p] = await Promise.all([
      context.supabase
        .from("agent_interactions")
        .select("id, outcome, tools_called")
        .eq("agent_type", "nawat")
        .gte("created_at", since)
        .limit(2000),
      context.supabase
        .from("agent_feedback")
        .select("interaction_id, rating, comment")
        .gte("created_at", since)
        .limit(2000),
      context.supabase
        .from("ai_proposals")
        .select("raw_operation")
        .eq("status", "pending")
        .limit(500),
    ]);
    if (i.error || f.error || p.error) throw new Error("تعذر قراءة البيانات");
    const existing = new Set(
      (p.data ?? [])
        .map((r) => (r.raw_operation as { dedupe_key?: string } | null)?.dedupe_key)
        .filter(Boolean),
    );
    const drafts = analyzeSignals(
      (i.data ?? []) as InteractionRow[],
      (f.data ?? []) as FeedbackRow[],
    ).filter((d) => !existing.has(d.dedupe_key));
    if (!drafts.length) return { created: 0 };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("ai_proposals").insert(
      drafts.map(({ dedupe_key, ...d }) => ({
        ...d,
        raw_operation: { ...d.raw_operation, dedupe_key },
        status: "pending",
      })) as never,
    );
    if (error) {
      console.error("[governance] insert", error.message);
      throw new Error("تعذر حفظ المقترحات");
    }
    return { created: drafts.length };
  });

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!data) throw new Error("Forbidden");
}

/** Admin-only: Operations + Delivery agents scan stock and orders, insert pending proposals (never applies them). */
export const generateOpsProposals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { analyzeOperations } = await import("./ops-analyze");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [pr, or, ex] = await Promise.all([
      supabaseAdmin
        .from("products")
        .select("id, name, name_ar, stock_quantity, low_stock_threshold, is_active")
        .eq("is_active", true)
        .limit(2000),
      supabaseAdmin
        .from("orders")
        .select("id, status, created_at, updated_at")
        .in("status", ["pending", "shipped"])
        .limit(1000),
      supabaseAdmin
        .from("ai_proposals")
        .select("raw_operation")
        .in("status", ["pending"])
        .limit(1000),
    ]);
    if (pr.error || or.error || ex.error) throw new Error("تعذر قراءة البيانات");
    const existing = new Set(
      (ex.data ?? [])
        .map((r) => (r.raw_operation as { dedupe_key?: string } | null)?.dedupe_key)
        .filter(Boolean),
    );
    const drafts = analyzeOperations(pr.data ?? [], or.data ?? []).filter(
      (d) => !existing.has(d.dedupe_key),
    );
    if (!drafts.length) return { created: 0 };
    const { error } = await supabaseAdmin.from("ai_proposals").insert(
      drafts.map(({ dedupe_key, ...d }) => ({
        ...d,
        raw_operation: { ...d.raw_operation, dedupe_key },
        status: "pending",
      })) as never,
    );
    if (error) throw new Error("تعذر حفظ المقترحات");
    return { created: drafts.length };
  });

/** Admin-only review. On approval, whitelisted ops are executed server-side and the result is recorded (audit). */
export const reviewProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; decision: "approved" | "rejected" }) => {
    if (typeof d?.id !== "string" || !["approved", "rejected"].includes(d.decision))
      throw new Error("Invalid");
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { EXECUTABLE_OPS } = await import("./ops-analyze");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: p, error } = await supabaseAdmin
      .from("ai_proposals")
      .select("*")
      .eq("id", data.id)
      .eq("status", "pending")
      .maybeSingle();
    if (error || !p) throw new Error("المقترح غير موجود أو تمت مراجعته");
    const op = (p.raw_operation ?? {}) as Record<string, unknown>;
    let status: string = data.decision;
    let execution: Record<string, unknown> | null = null;
    if (
      data.decision === "approved" &&
      (EXECUTABLE_OPS as readonly string[]).includes(String(op.op))
    ) {
      if (op.op === "deactivate_product" && typeof op.product_id === "string") {
        const r = await supabaseAdmin
          .from("products")
          .update({ is_active: false })
          .eq("id", op.product_id);
        execution = { ok: !r.error, at: new Date().toISOString(), error: r.error?.message ?? null };
        status = r.error ? "failed" : "executed";
      }
    }
    const { error: uErr } = await supabaseAdmin
      .from("ai_proposals")
      .update({
        status,
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
        raw_operation: execution ? { ...op, execution } : op,
      } as never)
      .eq("id", data.id);
    if (uErr) throw new Error("تعذر الحفظ");
    return { status };
  });
