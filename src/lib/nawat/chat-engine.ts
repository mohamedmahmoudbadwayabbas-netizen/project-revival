import type { Product } from "@/lib/cart-context";
import { DEFAULT_GEMINI_MODEL } from "@/lib/gemini-config";
import { generateGeminiContent } from "@/lib/gemini.functions";
import { normalizeProduct } from "@/lib/store-data-hooks";
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
  /** ملخص التفكير كما أعاده النموذج نفسه (إن كشفه المزود). */
  thinking?: string;
  tools?: NawatToolRun[];
  products?: NawatPick[];
  error?: boolean;
  /** معرّف التفاعل المسجّل للحوكمة (للتقييم). */
  interactionId?: string;
  rating?: 1 | -1;
  createdAt: string;
}

const SYSTEM = `أنت «نواة»، مساعد ذكي ودود من سوبرماركت الوادي الأخضر. كل تفكيرك وردّك بالعامية المصرية فقط، ممنوع أي كلمة إنجليزي.
- تقدر تدردش في أي موضوع زي أي مساعد ذكي: أسئلة عامة، وصفات، نصايح، شرح، هزار خفيف. رد بشكل طبيعي وبطول مناسب للسؤال، واستخدم Markdown عند الحاجة.
- افتكر كل اللي اتقال في المحادثة وابنِ عليه (لو العميل عدّل طلب سابق، عدّل على نفس الاقتراح).
- لما الكلام يكون عن مشتريات أو وجبة أو منتجات أو أسعار أو توفر، استخدم أداة searchProducts (كلمة بحث قصيرة لكل مكوّن، ممكن أكتر من بحث). متستخدمهاش في الدردشة العادية.
- ممنوع تخترع منتج أو سعر. اذكر بس المنتجات اللي رجعت من البحث ومخزونها أكبر من صفر.
- لو هتقترح منتجات من المتجر، اكتب ردك العادي، وفي الآخر ضيف كتلة واحدة بالشكل ده بالظبط:
\`\`\`products
[{"id":"<id من نتيجة البحث حرفيًا>","quantity":1,"reason":"سبب قصير"}]
\`\`\`
- لا تضيف للسلة بنفسك؛ العميل هيضيف من الكروت.`;

const SEARCH_DECL = AI_TOOL_SUITE.find((t) => t.name === "searchProducts")?.declaration;
const MAX_STEPS = 5;

async function callModel(contents: unknown[]) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await generateGeminiContent({
        data: {
          purpose: "chat",
          model: DEFAULT_GEMINI_MODEL,
          contents,
          config: {
            systemInstruction: SYSTEM,
            tools: [{ functionDeclarations: SEARCH_DECL ? [SEARCH_DECL] : [] }],
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

/** يحوّل المحادثة السابقة إلى سياق للنموذج (مع أسماء المنتجات المقترحة سابقًا). */
function toContents(history: NawatMessage[]) {
  const valid = history.filter((m) => !m.error && m.content.trim());
  const earlier = valid.slice(0, -40);
  const recent = valid.slice(-40);
  const contents = recent.map((m) => {
    let text = m.content;
    if (m.products?.length) {
      text += `\n[منتجات اقترحتها: ${m.products
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
): Promise<Omit<NawatMessage, "id" | "createdAt" | "role">> {
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
          ? "بيحسب الكميات والبدائل المناسبة"
          : "بيراجع نتايج المتجر ويكتب الرد",
    );
    const res: any = await callModel(contents);
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
      onActivity(`بيدوّر في المتجر على «${query || "كل المنتجات"}»`);
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
  const { text, picks } = extractProductPicks(visible);
  const mentioned = [...catalog.values()]
    .filter((product) => {
      const name = product.name_ar || product.name;
      return name.length > 1 && visible.includes(name);
    })
    .slice(0, 8)
    .map((product) => ({ id: product.id, quantity: 1, reason: "مذكور في اقتراح نواة" }));
  const resolvedPicks = picks.length ? picks : mentioned;
  const products: NawatPick[] = [];
  for (const pick of resolvedPicks) {
    const product = catalog.get(pick.id);
    if (product && Number(product.stock_quantity) > 0)
      products.push({ product, quantity: pick.quantity, reason: pick.reason });
  }

  return {
    content:
      text ||
      (products.length ? "دي اقتراحاتي من المتجر:" : "معلش، مقدرتش أكوّن رد. جرّب تكتب تاني."),
    // التفكير الحقيقي كما كشفه النموذج نفسه (إن وُجد)، يُعرض ويُحفظ مع الرد.
    thinking:
      thoughts
        .map((t) => t.trim())
        .filter(Boolean)
        .join("\n\n")
        .slice(0, 6000) || undefined,
    tools: tools.length ? tools : undefined,
    products: products.length ? products : undefined,
  };
}
