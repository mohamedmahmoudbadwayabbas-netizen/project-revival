import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!data) throw new Error("هذه الإعدادات متاحة لمسؤول المتجر فقط.");
}

const settingsSchema = z.object({
  provider: z.string().trim().min(1).max(40),
  apiKey: z.string().trim().max(2000).optional(),
  baseUrl: z.string().trim().max(500).optional(),
  model: z.string().trim().max(200).optional(),
});

export const getAiSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { loadAiSettings } = await import("@/lib/ai-provider.server");
    const s = await loadAiSettings();
    return {
      provider: s?.provider ?? "gemini",
      baseUrl: s?.base_url ?? "",
      model: s?.model ?? "",
      hasKey: Boolean(s?.api_key),
      usingServerKey: !s?.api_key && Boolean(process.env["GEMINI_API_KEY"]),
    };
  });

export const updateAiSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => settingsSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { loadAiSettings, saveAiSettings } = await import("@/lib/ai-provider.server");
    const current = await loadAiSettings();
    // حقل المفتاح الفارغ يعني «احتفظ بالمفتاح الحالي» ما لم يتغير المزود.
    const keepKey = !data.apiKey && current?.provider === data.provider;
    await saveAiSettings({
      provider: data.provider,
      api_key: data.apiKey || (keepKey ? (current?.api_key ?? null) : null),
      base_url: data.baseUrl || null,
      model: data.model || null,
    });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await (supabaseAdmin as any).from("ai_alerts").update({ resolved: true }).eq("resolved", false);
    return { ok: true };
  });

export const testAiConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const mod = await import("@/lib/ai-provider.server");
    const s = await mod.loadAiSettings();
    const contents = [{ role: "user", parts: [{ text: "Reply with the single word OK." }] }];
    try {
      if (s && s.provider !== "gemini") {
        const r = await mod.callOpenAICompatible(s, contents, { maxOutputTokens: 20 });
        return {
          ok: true,
          message: `تم الاتصال بنجاح. رد النموذج: ${r.text.slice(0, 40) || "OK"}`,
        };
      }
      const { GoogleGenAI } = await import("@google/genai");
      const keys = mod.splitKeys(s?.api_key || process.env["GEMINI_API_KEY"]);
      if (!keys.length) return { ok: false, message: "لم يتم وضع أي مفتاح بعد." };
      const results: string[] = [];
      let okCount = 0;
      for (let i = 0; i < keys.length; i++) {
        try {
          const ai = new GoogleGenAI({
            apiKey: keys[i],
            httpOptions: { retryOptions: { attempts: 1 } },
          });
          await ai.models.generateContent({
            model: s?.model || "gemini-2.5-flash",
            contents: contents as any,
          });
          okCount++;
          results.push(`#${i + 1} ✓`);
        } catch (e) {
          const k = mod.classifyProviderError(null, String((e as Error)?.message ?? e));
          results.push(
            `#${i + 1} ${k === "quota" ? "نفدت الحصة" : k === "auth" ? "غير صالح" : "مشغول"}`,
          );
        }
      }
      return {
        ok: okCount > 0,
        message: `${okCount} من ${keys.length} مفاتيح تعمل الآن: ${results.join(" · ")}`,
      };
    } catch (error) {
      const msg = String((error as Error)?.message ?? error);
      const status = error instanceof mod.ProviderError ? error.status : null;
      const kind = mod.classifyProviderError(status, msg);
      if (kind === "quota")
        return {
          ok: false,
          message: "المفتاح صحيح لكن الحصة أو الرصيد نفد. اشحن الرصيد أو استخدم مفتاحًا آخر.",
        };
      if (kind === "auth") return { ok: false, message: "المفتاح غير صالح أو مرفوض من المزود." };
      if (/404|not.?found/i.test(msg))
        return {
          ok: false,
          message: "اسم النموذج غير موجود لدى هذا المزود. تأكد من كتابته بشكل صحيح.",
        };
      return { ok: false, message: `تعذر الاتصال: ${msg.slice(0, 160)}` };
    }
  });

export const listAiAlerts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("ai_alerts")
      .select("id, kind, message, created_at")
      .eq("resolved", false)
      .order("created_at", { ascending: false })
      .limit(3);
    return (data ?? []) as Array<{ id: string; kind: string; message: string; created_at: string }>;
  });

export const dismissAiAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await context.supabase.from("ai_alerts").update({ resolved: true }).eq("id", data.id);
    return { ok: true };
  });
