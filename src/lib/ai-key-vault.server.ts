// خزانة مفاتيح الذكاء الاصطناعي (جدول ai_key_vault). تُقرأ على الخادم فقط بصلاحية الخدمة.
// المفاتيح لا تُحذف تلقائيًا أبدًا: الفشل يغير الحالة/التبريد فقط.
import { findPreset } from "@/lib/ai-providers";

export type VaultKey = {
  id: string;
  provider: string;
  label: string | null;
  api_key: string;
  base_url: string | null;
  model: string | null;
  priority: number;
  status: string;
  cooldown_until: string | null;
  last_error: string | null;
  last_used_at: string | null;
  total_requests: number;
  created_at: string;
};

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

export async function listVaultKeys(): Promise<VaultKey[]> {
  try {
    const { data } = await (await db())
      .from("ai_key_vault")
      .select("*")
      .order("priority")
      .order("created_at");
    return (data ?? []) as VaultKey[];
  } catch {
    return [];
  }
}

/** المفاتيح الصالحة للاستخدام الآن (نشطة أو انتهى تبريدها). */
export function usableKeys(keys: VaultKey[], now = Date.now()): VaultKey[] {
  return keys.filter((k) => {
    if (k.status === "disabled" || k.status === "invalid") return false;
    if (k.cooldown_until && new Date(k.cooldown_until).getTime() > now) return false;
    return true;
  });
}

export type ProviderGroup = { provider: string; baseUrl: string; model: string; keys: string[] };

/** يجمع المفاتيح حسب المزود بترتيب الأولوية: Dahl ← xKiro ← … كل مجموعة تُجرب مفاتيحها بالتتابع. */
export function groupByProvider(keys: VaultKey[]): ProviderGroup[] {
  const groups = new Map<string, ProviderGroup>();
  for (const k of keys) {
    const preset = findPreset(k.provider);
    const baseUrl = (k.base_url || preset?.baseUrl || "").replace(/\/+$/, "");
    const model = k.model || preset?.modelHint || "";
    if (!baseUrl || !model) continue;
    const id = `${baseUrl}|${model}`;
    const g = groups.get(id) ?? { provider: k.provider, baseUrl, model, keys: [] };
    g.keys.push(k.api_key);
    groups.set(id, g);
  }
  return [...groups.values()];
}

export async function markVaultKey(apiKey: string, patch: Record<string, unknown>) {
  try {
    await (await db())
      .from("ai_key_vault")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("api_key", apiKey);
  } catch {
    /* لا نوقف الرد بسبب تحديث إحصائي */
  }
}
