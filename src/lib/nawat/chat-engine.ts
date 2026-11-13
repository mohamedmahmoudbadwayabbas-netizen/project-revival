import type { Product } from "@/lib/cart-context";
import { DEFAULT_GEMINI_MODEL } from "@/lib/gemini-config";
import { generateGeminiContent } from "@/lib/gemini.functions";
import { normalizeProduct } from "@/lib/store-data-hooks";
import { supabase } from "@/integrations/supabase/client";
import { toolSearchProducts } from "@/services/aiTools/coreCatalogTools";
import { AI_TOOL_SUITE } from "@/services/aiTools/toolDefinitions";
import {
  extractProductPicks,
  recoverAnswerFromThinking,
  splitThinking,
  stripLeakedPlanning,
} from "./chat-parse";

export interface NawatToolRun {
  query: string;
  ok: boolean;
  count: number;
}

export interface NawatPick {
  product: Product;
  quantity: number;
  reason: string;
}

export interface NawatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  thinking?: string;
  tools?: NawatToolRun[];
  products?: NawatPick[];
  error?: boolean;
  interactionId?: string;
  rating?: 1 | -1;
  createdAt: string;
}

const FALLBACK_SYSTEM = `أنت «نواة»، مساعد التسوق الذكي من سوبرماركت الوادي الأخضر.
قواعد صارمة لا يجوز مخالفتها أبداً:
1. اللغة: كل تفكيرك الداخلي وردك النهائي يجب أن يكون باللغة العربية (العامية المصرية الودودة) فقط. ممنوع تماماً كتابة أي كلمة إنجليزية أو ذكر أسماء الأدوات البرمجية للعميل.
2. منع الهلوسة تماماً: ممنوع منعاً باتاً ذكر اسم أي منتج أو سعر أو كمية مخزون لم يرجع صراحة في نتيجة أداة البحث في هذه المحادثة. إذا لم تجد منتجاً في القاعدة، قل بصراحة إنه غير متوفر حالياً ولا تخترع بدائل وهمية.
3. الأسئلة العامة (مثل: إيه للعشا؟ أو في إيه للغدا؟ أو عايز حاجة للدايت): استدعِ أداة البحث بكلمة فارغة "" أو "*" أولاً لتعرف كل المنتجات المتاحة في المتجر، ثم رشّح من الموجود فعلاً فقط.
4. لو هتقترح منتجات متوفرة من نتائج البحث، اكتب ردك العادي، وفي الآخر ضيف كتلة واحدة بالشكل ده بالظبط:
\`\`\`products
[{"id":"<id من نتيجة البحث حرفيًا>","quantity":1,"reason":"سبب قصير"}]
\`\`\`
5. لا تُنهِ أي رد بدون رسالة نصية عربية واضحة ومفيدة للعميل.`;

const BASE_SEARCH_DECL = AI_TOOL_SUITE.find((t) => t.name === "searchProducts")?.declaration;
const MAX_STEPS = 5;

/** يكتشف الإشارات الضمنية من رسالة العميل (تصحيح، غضب، شكوى لغة) */
export function detectUserImplicitSignal(userText: string): "user_correction" | "neutral" {
  const frustrationRegex =
    /(بتألف|من دماغك|مش موجود|كذب|غلط|كلمني عربي|بالعربي|مش فاهم|انت متاكد|بختبرك|مش صح)/i;
  return frustrationRegex.test(userText) ? "user_correction" : "neutral";
}

/**
 * حارس منع الهلوسة الفوري (Real-Time Price & Fact Guardrail):
 * يتحقق أن كل سعر مذكور بجانب "جنيه" أو "ج.م" في الرد يطابق فعلاً أسعار المنتجات التي عادت من القاعدة.
 */
function enforceRealTimePriceGuardrail(
  replyText: string,
  catalog: Map<string, Product>,
): { safeText: string; triggered: boolean } {
  const validPrices = new Set<number>();
  for (const p of catalog.values()) {
    validPrices.add(Math.round(Number(p.price_per_unit)));
    validPrices.add(Number(p.price_per_unit));
  }

  let triggered = false;
  const priceMentionRegex = /(\d+(?:\.\d+)?)\s*(?:جنيه|جنية|ج\.م)/g;
  const matches = [...replyText.matchAll(priceMentionRegex)];

  for (const m of matches) {
    const mentionedPrice = Number(m[1]);
    if (!validPrices.has(mentionedPrice) && !validPrices.has(Math.round(mentionedPrice))) {
      triggered = true;
      break;
    }
  }

  if (!triggered) {
    return { safeText: replyText, triggered: false };
  }

  const availableItems = [...catalog.values()].filter((p) => Number(p.stock_quantity) > 0);
  if (availableItems.length === 0) {
    return {
      safeText:
        "معلش، دورت في المتجر حالياً ومالقيتش منتجات مطابقة متوفرة في المخزون دلوقتي. تحب أدورلك على حاجة تانية؟",
      triggered: true,
    };
  }

  const verifiedList = availableItems
    .slice(0, 6)
    .map((p) => `• **${p.name_ar || p.name}** — بسعر **${p.price_per_unit} ج.م**`)
    .join("\n");

  return {
    safeText: `دي المنتجات المتوفرة حالياً في قاعدة بيانات المتجر بأسعارها الفعلية:\n\n${verifiedList}\n\nتقدر تضيف اللي يناسبك للسلة مباشرة من الكروت تحت.`,
    triggered: true,
  };
}

/** يجلب إعدادات نواة الحية والقواعد السلوكية المعتمدة من حوكمة الوكلاء */
async function loadDynamicNawatRuntime() {
  try {
    const [{ data: config }, { data: tools }] = await Promise.all([
      supabase
        .from("ai_agent_configs" as never)
        .select("system_prompt_base, dynamic_rules, forbidden_patterns, strict_price_guard")
        .eq("agent_name", "nawat")
        .maybeSingle(),
      supabase
        .from("ai_tool_registry" as never)
        .select("tool_name, description_ar, runtime_hints, is_enabled")
        .eq("agent_name", "nawat"),
    ]);

    const cfg = config as {
      system_prompt_base?: string;
      dynamic_rules?: string[];
      forbidden_patterns?: string[];
      strict_price_guard?: boolean;
    } | null;

    const basePrompt = cfg?.system_prompt_base?.trim() || FALLBACK_SYSTEM;
    const rulesList = Array.isArray(cfg?.dynamic_rules) ? cfg!.dynamic_rules.filter(Boolean) : [];
    const forbiddenList = Array.isArray(cfg?.forbidden_patterns)
      ? cfg!.forbidden_patterns.filter(Boolean)
      : [];

    let fullPrompt = basePrompt;
    if (rulesList.length > 0) {
      fullPrompt += `\n\n### قواعد سلوكية إضافية معتمدة من إدارة المتجر (إلزامية التنفيذ):\n${rulesList
        .map((r) => `- ${r}`)
        .join("\n")}`;
    }
    if (forbiddenList.length > 0) {
      fullPrompt += `\n\n### أخطاء سابقة ممنوع تكرارها نهائياً:\n${forbiddenList
        .map((f) => `- ${f}`)
        .join("\n")}`;
    }

    const searchToolMeta = ((tools as any[]) ?? []).find((t) => t.tool_name === "searchProducts");
    const dynamicSearchDecl = BASE_SEARCH_DECL
      ? {
          ...BASE_SEARCH_DECL,
          description: [
            searchToolMeta?.description_ar || BASE_SEARCH_DECL.description,
            searchToolMeta?.runtime_hints ? `تلميحات بحث مهمة: ${searchToolMeta.runtime_hints}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
        }
      : undefined;

    return {
      systemInstruction: fullPrompt,
      searchDeclaration: dynamicSearchDecl,
      strictPriceGuard: cfg?.strict_price_guard !== false,
    };
  } catch {
    return {
      systemInstruction: FALLBACK_SYSTEM,
      searchDeclaration: BASE_SEARCH_DECL,
      strictPriceGuard: true,
    };
  }
}

async function callModel(
  contents: unknown[],
  runtime: { systemInstruction: string; searchDeclaration?: unknown },
) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await generateGeminiContent({
        data: {
          purpose: "chat",
          model: DEFAULT_GEMINI_MODEL,
          contents,
          config: {
            systemInstruction: runtime.systemInstruction,
            tools: [{ functionDeclarations: runtime.searchDeclaration ? [runtime.searchDeclaration] : [] }],
            toolConfig: { functionCallingConfig: { mode: "AUTO" } },
            thinkingConfig: { includeThoughts: true },
          },
        } as never,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (!/503|overload|high demand|unavailable/i.test(msg) || attempt === 2) throw error;
      await new Promise((r) => setTimeout(r, 1200 * 2 ** attempt));
    }
  }
  throw new Error("unavailable");
}

function toContents(history: NawatMessage[]) {
  const valid = history.filter((m) => !m.error && m.content.trim());
  const earlier = valid.slice(0, -40);
  const recent = valid.slice(-40);
  const contents = recent.map((m) => {
    let text = m.content;
    if (m.products?.length) {
      text += `\n[منتجات حقيقية اقترحتها: ${m.products
        .map((p) => `${p.product.name_ar || p.product.name} ×${p.quantity} (id: ${p.product.id})`)
        .join("، ")}]`;
    }
    return { role: m.role === "assistant" ? "model" : "user", parts: [{ text }] };
  });
  if (earlier.length) {
    const summary = earlier
      .slice(-12)
      .map((m) => `${m.role === "user" ? "العميل" : "نواة"}: ${m.content.slice(0, 180)}`)
      .join(" | ");
    contents.unshift({
      role: "user",
      parts: [{ text: `[ملخص بداية المحادثة للحفاظ على السياق]: ${summary}` }],
    });
  }
  return contents;
}

export async function runNawatTurn(
  history: NawatMessage[],
  onActivity: (label: string) => void,
  onThought?: (thinking: string) => void,
): Promise<
  Omit<NawatMessage, "id" | "createdAt" | "role"> & {
    guardrailTriggered?: boolean;
    implicitSignal?: string;
  }
> {
  const runtime = await loadDynamicNawatRuntime();
  const lastUserText = history.at(-1)?.content ?? "";
  const implicitSignal = detectUserImplicitSignal(lastUserText);

  const contents: any[] = toContents(history);
  const catalog = new Map<string, Product>();
  const tools: NawatToolRun[] = [];
  const thoughts: string[] = [];
  let finalText = "";

  for (let step = 0; step < MAX_STEPS; step++) {
    onActivity(
      step === 0
        ? "بيقرأ طلبك ويفهم احتياجك"
        : step === 1
          ? "بيراجع المنتجات المتوفرة في المتجر"
          : "بيجهزلك الرد والترشيحات المناسبة",
    );
    const res: any = await callModel(contents, runtime);
    const parts: any[] = res?.candidates?.[0]?.content?.parts ?? [];
    for (const p of parts) if (p?.thought && typeof p.text === "string") thoughts.push(p.text);
    if (thoughts.length) onThought?.(thoughts.join("\n\n"));

    const calls = parts.filter((p) => p?.functionCall?.name);
    if (!calls.length) {
      finalText = parts
        .filter((p) => typeof p?.text === "string" && !p.thought)
        .map((p) => p.text)
        .join("");
      if (!finalText && typeof res?.text === "string") finalText = res.text;
      break;
    }

    contents.push({ role: "model", parts });
    const responses: any[] = [];
    for (const call of calls) {
      const args = (call.functionCall.args ?? {}) as { query?: string; limit?: number };
      const query = String(args.query ?? "").slice(0, 60);
      onActivity(`بيدوّر في المتجر على «${query || "كل المنتجات المتاحة"}»`);
      const out =
        call.functionCall.name === "searchProducts"
          ? await toolSearchProducts(args)
          : { tool: call.functionCall.name, ok: false, messageAr: "أداة غير متاحة", data: null };
      const rows: any[] = (out.data as { results?: any[] } | null)?.results ?? [];
      for (const row of rows) {
        const product = normalizeProduct(row);
        catalog.set(product.id, product);
      }
      tools.push({ query, ok: out.ok === true, count: rows.length });
      responses.push({
        functionResponse: {
          name: call.functionCall.name,
          response: { ok: out.ok, messageAr: out.messageAr, data: out.data ?? null },
        },
      });
    }
    contents.push({ role: "user", parts: responses });
  }

  const split = splitThinking(finalText);
  if (split.thinking) thoughts.push(split.thinking);
  let visible = split.text;
  if (!visible && thoughts.length) {
    const rec = recoverAnswerFromThinking(thoughts.pop()!);
    if (rec.thinking) thoughts.push(rec.thinking);
    visible = rec.text;
  }
  const cleaned = stripLeakedPlanning(visible);
  if (cleaned.leaked) thoughts.push(cleaned.leaked);
  visible = cleaned.text;
  onThought?.(thoughts.join("\n\n"));

  const { text: rawExtractedText, picks } = extractProductPicks(visible);

  // تطبيق حارس منع الهلوسة الفوري قبل عرض الرد للعميل
  let safeReplyText = rawExtractedText;
  let guardrailTriggered = false;
  if (runtime.strictPriceGuard && safeReplyText) {
    const guard = enforceRealTimePriceGuardrail(safeReplyText, catalog);
    safeReplyText = guard.safeText;
    guardrailTriggered = guard.triggered;
  }

  const mentioned = [...catalog.values()]
    .filter((product) => {
      const name = product.name_ar || product.name;
      return name.length > 1 && safeReplyText.includes(name);
    })
    .slice(0, 8)
    .map((product) => ({ id: product.id, quantity: 1, reason: "متوفر في المتجر" }));

  const resolvedPicks = picks.length ? picks : mentioned;
  const products: NawatPick[] = [];
  for (const pick of resolvedPicks) {
    const product = catalog.get(pick.id);
    if (product && Number(product.stock_quantity) > 0) {
      products.push({ product, quantity: pick.quantity, reason: pick.reason });
    }
  }

  return {
    content:
      safeReplyText ||
      (products.length
        ? "دي المنتجات المتوفرة حالياً في المتجر وتناسب طلبك:"
        : "أهلاً بيك! قولّي بتدور على إيه تحديداً وهشوفلك المتوفر في المتجر حالياً."),
    thinking:
      thoughts
        .map((t) => t.trim())
        .filter(Boolean)
        .join("\n\n")
        .slice(0, 6000) || undefined,
    tools: tools.length ? tools : undefined,
    products: products.length ? products : undefined,
    guardrailTriggered,
    implicitSignal: guardrailTriggered ? "hallucination_blocked" : implicitSignal,
  };
}
