import { findPreset } from "@/lib/ai-providers";

export type AiSettings = {
  provider: string;
  api_key: string | null;
  base_url: string | null;
  model: string | null;
};

export type AdapterResponse = {
  text: string;
  candidates: Array<{
    content: { role: string; parts: Array<Record<string, unknown>> };
    finishReason?: string;
  }>;
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

/** يدعم عدة مفاتيح في نفس الحقل مفصولة بسطر جديد أو فاصلة أو مسافة. */
export function splitKeys(raw: string | null | undefined): string[] {
  return [
    ...new Set(
      String(raw ?? "")
        .split(/[\s,;]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ];
}

export async function loadAiSettings(): Promise<AiSettings | null> {
  try {
    const db = await admin();
    const { data } = await db
      .from("ai_provider_settings")
      .select("provider, api_key, base_url, model")
      .eq("id", 1)
      .maybeSingle();
    return (data as AiSettings) ?? null;
  } catch (error) {
    console.error("[ai] could not load provider settings", String(error).slice(0, 200));
    return null;
  }
}

export async function saveAiSettings(next: AiSettings) {
  const db = await admin();
  const { error } = await db
    .from("ai_provider_settings")
    .upsert({ id: 1, ...next, updated_at: new Date().toISOString() });
  if (error) throw new Error("تعذر حفظ إعدادات الذكاء الاصطناعي.");
}

/** يصنف أخطاء المزود: نفاذ الحصة/الرصيد أو مفتاح غير صالح. */
export function classifyProviderError(
  status: number | null,
  message: string,
): "quota" | "auth" | null {
  if (
    status === 429 ||
    status === 402 ||
    /RESOURCE_EXHAUSTED|quota|insufficient|credit|billing|rate.?limit/i.test(message)
  )
    return "quota";
  if (
    status === 401 ||
    status === 403 ||
    /API key not valid|invalid.*key|PERMISSION_DENIED|unauthorized|authentication/i.test(message)
  )
    return "auth";
  return null;
}

/** يسجل تنبيهًا للمسؤول (مرة واحدة كل ساعة لكل نوع لتجنب التكرار). */
export async function recordAiAlert(kind: "quota" | "auth", provider: string) {
  try {
    const db = await admin();
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: existing } = await db
      .from("ai_alerts")
      .select("id")
      .eq("kind", kind)
      .eq("resolved", false)
      .gte("created_at", since)
      .limit(1);
    if (existing?.length) return;
    const name = findPreset(provider)?.label ?? provider;
    const message =
      kind === "quota"
        ? `نفدت حصة أو رصيد مفتاح الذكاء الاصطناعي (${name}). اشحن الرصيد أو ضع مفتاحًا جديدًا من الإعدادات ← الذكاء الاصطناعي.`
        : `مفتاح الذكاء الاصطناعي (${name}) مرفوض أو غير صالح. ضع مفتاحًا صحيحًا من الإعدادات ← الذكاء الاصطناعي.`;
    await db.from("ai_alerts").insert({ kind, provider, message });
  } catch (error) {
    console.error("[ai] could not record alert", String(error).slice(0, 200));
  }
}

/* ───────────── Gemini format → OpenAI-compatible chat/completions ───────────── */

function normalizeSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(normalizeSchema);
  if (!schema || typeof schema !== "object") return schema;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema as Record<string, unknown>)) {
    if (key === "type" && typeof value === "string") out[key] = value.toLowerCase();
    else if (key === "nullable" || key === "propertyOrdering") continue;
    else out[key] = normalizeSchema(value);
  }
  return out;
}

function partsText(parts: any[]): string {
  return parts
    .filter((p) => typeof p?.text === "string" && !p?.thought)
    .map((p) => p.text)
    .join("\n");
}

export function geminiToOpenAI(contents: unknown, config: Record<string, any> = {}) {
  const messages: any[] = [];
  const sys = config.systemInstruction;
  const sysText =
    typeof sys === "string" ? sys : Array.isArray(sys?.parts) ? partsText(sys.parts) : "";
  if (sysText) messages.push({ role: "system", content: sysText });

  const list =
    typeof contents === "string"
      ? [{ role: "user", parts: [{ text: contents }] }]
      : (contents as any[]);
  const pending: Array<{ id: string; name: string }> = [];
  let counter = 0;
  for (const turn of list) {
    const parts: any[] = Array.isArray(turn?.parts) ? turn.parts : [];
    const calls = parts.filter((p) => p?.functionCall?.name);
    const responses = parts.filter((p) => p?.functionResponse?.name);
    const text = partsText(parts);
    if (turn?.role === "model") {
      const msg: any = { role: "assistant", content: text || null };
      if (calls.length) {
        msg.tool_calls = calls.map((p) => {
          const id = `call_${++counter}`;
          pending.push({ id, name: p.functionCall.name });
          const call: any = {
            id,
            type: "function",
            function: {
              name: p.functionCall.name,
              arguments: JSON.stringify(p.functionCall.args ?? {}),
            },
          };
          // بعض البوابات (مثل Gemini) تشترط إعادة توقيع التفكير مع استدعاء الأداة.
          if (p.thoughtSignature)
            call.extra_content = { google: { thought_signature: p.thoughtSignature } };
          return call;
        });
      }
      messages.push(msg);
    } else {
      for (const p of responses) {
        const idx = pending.findIndex((c) => c.name === p.functionResponse.name);
        const id = idx >= 0 ? pending.splice(idx, 1)[0].id : `call_${++counter}`;
        messages.push({
          role: "tool",
          tool_call_id: id,
          content: JSON.stringify(p.functionResponse.response ?? {}),
        });
      }
      if (text) messages.push({ role: "user", content: text });
    }
  }

  const tools: any[] = [];
  for (const t of Array.isArray(config.tools) ? config.tools : []) {
    for (const d of t?.functionDeclarations ?? []) {
      tools.push({
        type: "function",
        function: {
          name: d.name,
          description: d.description ?? "",
          parameters: normalizeSchema(d.parameters ?? { type: "object", properties: {} }),
        },
      });
    }
  }

  const body: Record<string, unknown> = { messages };
  if (tools.length) {
    body.tools = tools;
    const fcc = config.toolConfig?.functionCallingConfig;
    const mode = String(fcc?.mode ?? "AUTO").toUpperCase();
    if (mode === "NONE") body.tool_choice = "none";
    else if (mode === "ANY") {
      const names: string[] = fcc?.allowedFunctionNames ?? [];
      body.tool_choice =
        names.length === 1 ? { type: "function", function: { name: names[0] } } : "required";
    } else body.tool_choice = "auto";
  }
  if (typeof config.temperature === "number") body.temperature = config.temperature;
  if (typeof config.maxOutputTokens === "number") body.max_tokens = config.maxOutputTokens;
  return body;
}

export function openAIToGemini(json: any): AdapterResponse {
  const choice = json?.choices?.[0];
  const msg = choice?.message ?? {};
  const parts: Array<Record<string, unknown>> = [];
  const text =
    typeof msg.content === "string"
      ? msg.content
      : Array.isArray(msg.content)
        ? msg.content.map((c: any) => c?.text ?? "").join("")
        : "";
  // ملخص التفكير الذي يكشفه المزود نفسه (DeepSeek/GLM/…)، يُعلَّم كـ thought مثل Gemini.
  const reasoning =
    typeof msg.reasoning_content === "string"
      ? msg.reasoning_content
      : typeof msg.reasoning === "string"
        ? msg.reasoning
        : "";
  if (reasoning.trim()) parts.push({ text: reasoning.trim(), thought: true });
  // بعض النماذج (MiniMax…) تكتب تفكيرها داخل <think> في نص الرد نفسه.
  let visible = text;
  const open = /<think(?:ing)?>/i.exec(visible);
  if (open) {
    const afterOpen = visible.slice(open.index + open[0].length);
    const close = /<\/think(?:ing)?>/i.exec(afterOpen);
    if (close) {
      const inner = afterOpen.slice(0, close.index);
      if (inner.trim()) parts.push({ text: inner.trim(), thought: true });
      visible = `${visible.slice(0, open.index)}${afterOpen.slice(close.index + close[0].length)}`;
    } else {
      // لا نعتبر الرد كله تفكيرًا إذا سقط وسم الإغلاق؛ أول فقرة/جملة عربية
      // هي أقرب حد موثوق لبداية الإجابة التي يجب أن يراها العميل.
      const blankLine = /\n\s*\n/.exec(afterOpen);
      const sentence = /[؟!]|\.(?=\s)|[،؛](?=\s)/.exec(afterOpen);
      const boundary = blankLine
        ? blankLine.index
        : sentence
          ? sentence.index + sentence[0].length
          : afterOpen.length;
      const inner = afterOpen.slice(0, boundary);
      const answer = afterOpen.slice(blankLine ? boundary + blankLine[0].length : boundary);
      if (inner.trim()) parts.push({ text: inner.trim(), thought: true });
      visible = `${visible.slice(0, open.index)}${answer}`;
    }
  }
  const closeOnly = /^([\s\S]*?)<\/think(?:ing)?>/i.exec(visible);
  if (closeOnly) {
    if (closeOnly[1].trim()) parts.push({ text: closeOnly[1].trim(), thought: true });
    visible = visible.slice(closeOnly[0].length);
  }
  visible = visible.trim();
  if (visible) parts.push({ text: visible });
  for (const call of msg.tool_calls ?? []) {
    let args: unknown = {};
    try {
      args = call?.function?.arguments ? JSON.parse(call.function.arguments) : {};
    } catch {
      args = {};
    }
    const sig = call?.extra_content?.google?.thought_signature;
    parts.push({
      functionCall: { name: call?.function?.name, args },
      ...(sig ? { thoughtSignature: sig } : {}),
    });
  }
  return {
    text: visible,
    candidates: [
      {
        content: { role: "model", parts },
        finishReason: String(choice?.finish_reason ?? "STOP").toUpperCase(),
      },
    ],
  };
}

export class ProviderError extends Error {
  status: number | null;
  constructor(message: string, status: number | null) {
    super(message);
    this.status = status;
  }
}

/**
 * Groq (مفتاح GROQ_API_KEY في أسرار المشروع) هو المحرك الأساسي السريع؛
 * لو فشل أو غير موجود نرجع لإعدادات المسؤول (Dahl) كاحتياطي.
 */
/** كل مفاتيح Groq: GROQ_API_KEY (يقبل عدة مفاتيح مفصولة) + GROQ_API_KEY_2 / _3 / ... */
export function groqKeys(env: Record<string, string | undefined> = process.env): string[] {
  const names = Object.keys(env)
    .filter((k) => /^GROQ_API_KEY(_\d+)?$/.test(k))
    .sort();
  return [...new Set(names.flatMap((k) => splitKeys(env[k])))];
}

/** مفاتيح انتهت حصتها مؤقتًا: نتخطاها فورًا حتى ينتهي التبريد. */
const keyCooldown = new Map<string, number>();
export function orderKeys(keys: string[], now = Date.now()): string[] {
  const ready = keys.filter((k) => (keyCooldown.get(k) ?? 0) <= now);
  const cooling = keys
    .filter((k) => (keyCooldown.get(k) ?? 0) > now)
    .sort((a, b) => keyCooldown.get(a)! - keyCooldown.get(b)!);
  return [...ready, ...cooling];
}
export function markKeyCooldown(key: string, ms = 60000) {
  keyCooldown.set(key, Date.now() + ms);
}

export async function callOpenAICompatible(
  settings: AiSettings,
  contents: unknown,
  config: Record<string, any>,
): Promise<AdapterResponse> {
  const groqKey = groqKeys().join(",") || undefined;
  // إعدادات Groq بلا مفتاح محفوظ (أو بلا إعدادات أصلًا): نستخدم مفتاح المشروع.
  if (
    groqKey &&
    (settings.provider === "groq" || /groq\.com/i.test(settings.base_url || "")) &&
    !splitKeys(settings.api_key).length
  ) {
    settings = {
      ...settings,
      api_key: groqKey,
      base_url: settings.base_url || "https://api.groq.com/openai/v1",
      model: settings.model || "openai/gpt-oss-120b",
    };
  }
  if (
    config.chatModel &&
    (settings.provider === "groq" || /groq\.com/i.test(settings.base_url || ""))
  ) {
    settings = { ...settings, model: String(config.chatModel) };
  }
  if (groqKey && !/groq\.com/i.test(settings.base_url || "") && settings.provider !== "groq") {
    let groqError: unknown;
    try {
      const res = await callProviderChain(
        {
          provider: "groq",
          api_key: groqKey,
          base_url: "https://api.groq.com/openai/v1",
          model: "llama-3.3-70b-versatile",
        },
        contents,
        { ...config, deadlineMs: 20000, hedgeMs: 0 },
      );
      if (res.text.trim() || res.candidates[0]?.content.parts.some((p) => p.functionCall))
        return res;
    } catch (error) {
      groqError = error;
      console.warn(
        "[ai] Groq failed, falling back:",
        String((error as Error)?.message ?? error).slice(0, 160),
      );
    }
    // لا يوجد مزود احتياطي مضبوط: نُظهر خطأ Groq الحقيقي بدل رسالة "المفتاح غير موجود".
    if (!splitKeys(settings.api_key).length) {
      throw groqError instanceof ProviderError
        ? groqError
        : new ProviderError(String((groqError as Error)?.message ?? "لم يصل رد من Groq."), null);
    }
  }
  return callProviderChain(settings, contents, config);
}

async function callProviderChain(
  settings: AiSettings,
  contents: unknown,
  config: Record<string, any>,
): Promise<AdapterResponse> {
  const baseUrl = (settings.base_url || findPreset(settings.provider)?.baseUrl || "").replace(
    /\/+$/,
    "",
  );
  if (!baseUrl)
    throw new ProviderError("لم يتم تحديد رابط بوابة مزود الذكاء الاصطناعي في الإعدادات.", null);
  const keys = splitKeys(settings.api_key);
  if (!keys.length) throw new ProviderError("لم يتم وضع مفتاح الذكاء الاصطناعي في الإعدادات.", 401);
  if (!settings.model)
    throw new ProviderError("لم يتم تحديد اسم النموذج في إعدادات الذكاء الاصطناعي.", null);

  const baseBody = geminiToOpenAI(contents, config);
  const startedAt = Date.now();
  const deadlineMs = typeof config.deadlineMs === "number" ? config.deadlineMs : 75000;
  // لو النموذج الأول بطيء، نبدأ نموذجًا ثانيًا بالتوازي بعد هذه المدة ونأخذ أسرع رد.
  const hedgeMs = typeof config.hedgeMs === "number" ? config.hedgeMs : 15000;
  const initialQueue = () => modelQueue(settings.model!, baseUrl);
  const tried = new Set<string>();
  const queue = initialQueue();
  const stop = new AbortController();
  let lastError: ProviderError | null = null;
  let refilled = false;

  const lane = async (): Promise<AdapterResponse> => {
    while (!stop.signal.aborted) {
      if (!queue.length) {
        // كل النماذج المجانية مزدحمة: ننتظر قليلًا ونعيد جولة كاملة مرة واحدة فقط.
        if (refilled || Date.now() - startedAt > deadlineMs - 10000) break;
        refilled = true;
        await new Promise((r) => setTimeout(r, 2500));
        tried.clear();
        queue.push(...initialQueue());
      }
      const model = queue.shift()!;
      if (tried.has(model)) continue;
      tried.add(model);
      const remaining = deadlineMs - (Date.now() - startedAt);
      if (remaining < 5000) break;
      try {
        const res = await callOneModel(
          baseUrl,
          keys,
          settings.provider,
          { model, ...baseBody },
          Math.min(45000, remaining),
          stop.signal,
        );
        lastGoodModel.set(baseUrl, model);
        return res;
      } catch (error) {
        if (stop.signal.aborted) break;
        if (!(error instanceof ProviderError) || !isSwitchable(error)) throw error;
        lastError = error;
        if (lastGoodModel.get(baseUrl) === model) lastGoodModel.delete(baseUrl);
        // البوابة أحيانًا تقترح نماذج متاحة الآن داخل رسالة الخطأ.
        queue.unshift(...suggestedModels(error.message).filter((m) => !tried.has(m)));
        console.warn(`[ai] model ${model} busy/unavailable, switching…`);
      }
    }
    throw lastError ?? new ProviderError("تعذر الاتصال بمزود الذكاء الاصطناعي.", null);
  };

  const canHedge = fallbackModelsFor(baseUrl).length > 1 && hedgeMs > 0;
  try {
    return await new Promise<AdapterResponse>((resolve, reject) => {
      let running = 0;
      let settled = false;
      let hedgeTimer: ReturnType<typeof setTimeout> | undefined;
      const start = () => {
        running++;
        lane().then(
          (res) => {
            if (settled) return;
            settled = true;
            clearTimeout(hedgeTimer);
            resolve(res);
          },
          (err) => {
            running--;
            if (settled) return;
            // نرفض فقط عندما تفشل كل المسارات الجارية (المسار لا يفشل إلا بعد تجربة كل النماذج أو خطأ نهائي).
            if (running === 0) {
              settled = true;
              clearTimeout(hedgeTimer);
              reject(err);
            }
          },
        );
      };
      start();
      if (canHedge) {
        hedgeTimer = setTimeout(() => {
          if (!settled && queue.length) {
            console.warn(`[ai] slow reply, starting a parallel model…`);
            start();
          }
        }, hedgeMs);
      }
    });
  } finally {
    stop.abort();
  }
}

/** آخر نموذج نجح لكل بوابة؛ نبدأ به في الطلب التالي لتفادي إضاعة الوقت مع نموذج مزدحم. */
const lastGoodModel = new Map<string, string>();

/** ترتيب المحاولة: آخر نموذج نجح، ثم النموذج المحدد في الإعدادات، ثم النماذج الاحتياطية. */
export function modelQueue(
  configured: string,
  baseUrl: string,
  lastGood = lastGoodModel.get(baseUrl),
): string[] {
  return [
    ...new Set(
      [lastGood, configured, ...fallbackModelsFor(baseUrl)].filter((m): m is string => !!m),
    ),
  ];
}

/** ازدحام النموذج نفسه (وليس نفاذ رصيد المفتاح): لا فائدة من تجربة مفتاح آخر على نفس النموذج. */
export function isModelConcurrency(status: number | null, raw: string): boolean {
  return status === 429 && /model_concurrency|concurrency capacity/i.test(raw);
}

/** نماذج احتياطية معروفة لكل بوابة. */
export function fallbackModelsFor(baseUrl: string): string[] {
  if (/groq\.com/i.test(baseUrl)) return ["llama-3.1-8b-instant"];
  if (/dahl\.global/i.test(baseUrl))
    return [
      "MiniMaxAI/MiniMax-M2.7",
      "zai-org/GLM-5.3-Flash",
      "deepseek-ai/DeepSeek-V4-Flash-0731",
    ];
  return [];
}

/** يستخرج أسماء النماذج المقترحة من رسالة خطأ مثل "Other models available now: A, B." */
export function suggestedModels(message: string): string[] {
  const m = /available now:\s*([^"]+?)(?:\.\s|\.?"|\.$|$)/i.exec(message);
  if (!m) return [];
  return m[1]
    .split(/,\s*/)
    .map((s) => s.trim().replace(/\.$/, ""))
    .filter((s) => /^[\w.-]+\/[\w.-]+$/.test(s));
}

function isSwitchable(error: ProviderError) {
  if (error.status === null) return true; // timeout / network
  if (error.status === 401 || error.status === 403) return false;
  return [404, 408, 429, 500, 502, 503, 504, 529].includes(error.status);
}

/** دمج إشارة الإلغاء مع مهلة؛ بدون AbortSignal.any لأنه غير متوفر في كل بيئات التشغيل. */
function combineSignals(cancel: AbortSignal | undefined, timeoutMs: number): AbortSignal {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  if (cancel) {
    if (cancel.aborted) ctrl.abort();
    else cancel.addEventListener("abort", () => ctrl.abort(), { once: true });
  }
  ctrl.signal.addEventListener("abort", () => clearTimeout(timer), { once: true });
  return ctrl.signal;
}

/** حدود Groq المجانية: تفكير قصير لنماذج gpt-oss، وسقف مخرجات صغير لـ qwen (حد 1000 توكن/دقيقة). */
export function groqTune(body: Record<string, unknown>): Record<string, unknown> {
  const model = String(body.model ?? "");
  const out: Record<string, unknown> = { ...body };
  if (/gpt-oss/i.test(model)) out.reasoning_effort = "low";
  if (/qwen/i.test(model)) out.max_tokens = Math.min(Number(out.max_tokens) || 800, 800);
  return out;
}

async function callOneModel(
  baseUrl: string,
  keys: string[],
  provider: string,
  body: Record<string, unknown>,
  timeoutMs = 45000,
  cancel?: AbortSignal,
): Promise<AdapterResponse> {
  let res: Response | undefined;
  let raw = "";
  if (/groq\.com/i.test(baseUrl)) body = groqTune(body);
  for (const key of /groq\.com/i.test(baseUrl) ? orderKeys(keys) : keys) {
    // إعادة محاولة قصيرة عند ازدحام خوادم المزود المؤقت فقط.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        res = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify(body),
          signal: combineSignals(cancel, timeoutMs),
        });
        raw = await res.text();
      } catch (error) {
        throw new ProviderError(`network ${String(error).slice(0, 120)}`, null);
      }
      if (![500, 502, 503, 529].includes(res.status)) break;
      await new Promise((r) => setTimeout(r, 1000));
    }
    // ازدحام النموذج نفسه: ننتقل فورًا للنموذج التالي بدل تجربة مفتاح آخر على نفس النموذج.
    if (res && isModelConcurrency(res.status, raw)) break;
    // حد المفتاح خلص: نبرّده ونقفز للمفتاح التالي فورًا بلا انتظار.
    if (res && res.status === 429 && keys.length > 1 && /groq\.com/i.test(baseUrl)) {
      const after = Number(res.headers.get("retry-after"));
      markKeyCooldown(key, after > 0 ? Math.min(after * 1000, 600000) : 60000);
      continue;
    }
    // عند نفاذ الحصة أو رفض المفتاح ننتقل للمفتاح التالي.
    if (!res || res.ok || !classifyProviderError(res.status, raw)) break;
  }
  if (!res) throw new ProviderError("تعذر الاتصال بمزود الذكاء الاصطناعي.", null);
  if (!res.ok) {
    console.error(`[ai] ${provider} ${body.model} ${res.status}:`, raw.slice(0, 300));
    throw new ProviderError(`${res.status} ${raw.slice(0, 600)}`, res.status);
  }
  return openAIToGemini(JSON.parse(raw));
}

/**
 * توليد نص بسيط من المزود النشط في الإعدادات (Dahl/OpenAI-compatible أو Gemini).
 * كل أدوات المتجر النصية البسيطة تمر من هنا بدل استدعاء Gemini مباشرة.
 */
export async function generatePlainText(
  prompt: string,
  opts: { system?: string; maxTokens?: number; temperature?: number; deadlineMs?: number } = {},
): Promise<string> {
  const settings = await loadAiSettings();
  const provider = settings?.provider || "gemini";
  const config: Record<string, any> = {
    maxOutputTokens: opts.maxTokens ?? 800,
    temperature: opts.temperature ?? 0.6,
  };
  if (opts.system) config.systemInstruction = opts.system;
  try {
    if ((provider !== "gemini" && settings) || process.env.GROQ_API_KEY) {
      const res = await callOpenAICompatible(
        settings ?? { provider: "groq", api_key: null, base_url: null, model: null },
        prompt,
        { ...config, deadlineMs: opts.deadlineMs },
      );
      if (!res.text.trim()) throw new ProviderError("لم يصل رد من المزود.", null);
      return res.text.trim();
    }
    const key = splitKeys(settings?.api_key)[0] || process.env.GEMINI_API_KEY;
    if (!key) throw new ProviderError("لم يتم وضع مفتاح الذكاء الاصطناعي في الإعدادات.", 401);
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: key });
    const r = await ai.models.generateContent({
      model: settings?.model || "gemini-2.5-flash",
      contents: prompt,
      config,
    });
    const text = r.text?.trim();
    if (!text) throw new ProviderError("لم يصل رد من المزود.", null);
    return text;
  } catch (error) {
    const status = error instanceof ProviderError ? error.status : null;
    const kind = classifyProviderError(status, String((error as Error)?.message ?? ""));
    if (kind) await recordAiAlert(kind, provider);
    throw error;
  }
}

/** يستخرج أول كائن JSON من رد نموذج (حتى لو أحاطه بنص أو ```json). */
export function extractJsonObject(text: string): Record<string, unknown> | null {
  const cleaned = text.replace(/```(?:json)?/gi, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}
