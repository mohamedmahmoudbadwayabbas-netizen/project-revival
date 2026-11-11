import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("خزانة المفاتيح متاحة لمسؤول المتجر فقط.");
}
async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}
const mask = (k: string) => (k.length > 10 ? `${k.slice(0, 5)}••••${k.slice(-4)}` : "••••");

export const listVault = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { listVaultKeys } = await import("@/lib/ai-key-vault.server");
    return (await listVaultKeys()).map((k) => ({
      id: k.id, provider: k.provider, label: k.label, masked: mask(k.api_key), model: k.model,
      base_url: k.base_url, priority: k.priority, status: k.status, cooldown_until: k.cooldown_until,
      last_error: k.last_error, last_used_at: k.last_used_at,
    }));
  });

export const addVaultKeys = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      provider: z.string().trim().min(1).max(40),
      keys: z.string().max(200000),
      model: z.string().trim().max(200).optional(),
      baseUrl: z.string().trim().max(500).optional(),
      priority: z.number().int().min(0).max(10000).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { splitKeys } = await import("@/lib/ai-provider.server");
    const keys = splitKeys(data.keys).filter((k) => k.length >= 8 && k.length <= 2000);
    if (!keys.length) throw new Error("لم أجد أي مفتاح صالح في النص.");
    const rows = keys.map((api_key) => ({
      provider: data.provider, api_key, model: data.model || null,
      base_url: data.baseUrl || null, priority: data.priority ?? 100,
    }));
    const { error, data: inserted } = await (await db())
      .from("ai_key_vault")
      .upsert(rows, { onConflict: "provider,api_key", ignoreDuplicates: true })
      .select("id");
    if (error) throw new Error("تعذر حفظ المفاتيح.");
    return { added: inserted?.length ?? 0, total: keys.length };
  });

export const updateVaultKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["active", "disabled"]).optional(),
      priority: z.number().int().min(0).max(10000).optional(),
      model: z.string().trim().max(200).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { id, ...patch } = data;
    const extra = patch.status === "active" ? { cooldown_until: null, last_error: null } : {};
    await (await db()).from("ai_key_vault").update({ ...patch, ...extra, updated_at: new Date().toISOString() }).eq("id", id);
    return { ok: true };
  });

/** فحص صحة كل المفاتيح وتحديث حالتها (لا يحذف أي مفتاح). */
export const checkVaultKeys = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { listVaultKeys, markVaultKey } = await import("@/lib/ai-key-vault.server");
    const { findPreset } = await import("@/lib/ai-providers");
    const keys = (await listVaultKeys()).filter((k) => k.status !== "disabled");
    let ok = 0;
    await Promise.all(
      keys.map(async (k) => {
        const base = (k.base_url || findPreset(k.provider)?.baseUrl || "").replace(/\/+$/, "");
        const model = k.model || findPreset(k.provider)?.modelHint;
        if (!base || !model) return;
        try {
          const r = await fetch(`${base}/chat/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${k.api_key}` },
            body: JSON.stringify({ model, messages: [{ role: "user", content: "OK" }], max_tokens: 5 }),
            signal: AbortSignal.timeout(20000),
          });
          await r.text();
          if (r.ok) { ok++; await markVaultKey(k.api_key, { status: "active", cooldown_until: null, last_error: null }); }
          else await markVaultKey(k.api_key, {
            status: r.status === 401 || r.status === 403 ? "invalid" : r.status === 402 ? "exhausted" : r.status === 429 ? "cooling_down" : "active",
            cooldown_until: r.status === 429 ? new Date(Date.now() + 60000).toISOString() : null,
            last_error: String(r.status),
          });
        } catch {
          await markVaultKey(k.api_key, { last_error: "network" });
        }
      }),
    );
    return { ok, total: keys.length };
  });
