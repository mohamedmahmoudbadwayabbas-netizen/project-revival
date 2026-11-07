/**
 * منطق نقي لشات نواة: فصل تفكير النموذج الحقيقي عن الرد، واستخراج كتلة
 * المنتجات المقترحة (إن وُجدت) والتحقق منها مقابل نتائج بحث الكتالوج الفعلية.
 */

export interface ProductPick {
  id: string;
  quantity: number;
  reason: string;
}

/** يفصل وسوم <think>…</think> التي تكتبها بعض النماذج داخل الرد. */
export function splitThinking(raw: string): { thinking: string; text: string } {
  if (!raw) return { thinking: "", text: "" };
  const thoughts: string[] = [];
  let text = raw.replace(/<think(?:ing)?>([\s\S]*?)<\/think(?:ing)?>/gi, (_m, inner: string) => {
    thoughts.push(inner.trim());
    return "";
  });
  // وسم مفتوح بلا إغلاق: كل ما بعده تفكير لم يكتمل.
  const open = /<think(?:ing)?>([\s\S]*)$/i.exec(text);
  if (open) {
    thoughts.push(open[1].trim());
    text = text.slice(0, open.index);
  }
  // بعض النماذج تُسقط الوسم الافتتاحي وتترك الإغلاق فقط.
  const closeOnly = /^([\s\S]*?)<\/think(?:ing)?>/i.exec(text);
  if (closeOnly) {
    thoughts.push(closeOnly[1].trim());
    text = text.slice(closeOnly[0].length);
  }
  return { thinking: thoughts.filter(Boolean).join("\n\n"), text: text.trim() };
}

/**
 * لو النموذج حط الرد كله جوه التفكير (وسم <think> مفتوح بلا إغلاق مثلاً)،
 * نسترجع الإجابة: من أول عنوان/فقرة Markdown، وإلا آخر فقرة طويلة.
 */
export function recoverAnswerFromThinking(thinking: string): { thinking: string; text: string } {
  const src = thinking.trim();
  if (!src) return { thinking: "", text: "" };
  const lines = src.split("\n");
  const idx = lines.findIndex((l) => /^\s*(#{1,6}\s|\*\*[^*]+\*\*|[-*]\s|\d+[.)]\s)/.test(l));
  if (idx > 0)
    return {
      thinking: lines.slice(0, idx).join("\n").trim(),
      text: lines.slice(idx).join("\n").trim(),
    };
  const paras = src.split(/\n\s*\n/);
  if (paras.length > 1)
    return { thinking: paras.slice(0, -1).join("\n\n").trim(), text: paras.at(-1)!.trim() };
  return { thinking: "", text: src };
}

const PLANNING_RE =
  /(المستخدم\s+(سأل|بيسأل|يسأل|عايز)|^سأ[^\s]*|^هرد|^هقارن|^هكتب|أتكلم\s+بالعامية|زي\s+ما\s+مطلوب|أداة\s+(البحث|searchProducts)|^let me|^i will|^i'll|^the user)/im;

/**
 * بعض النماذج تقفل التفكير بدري وتكتب مسودة تخطيط قبل الإجابة الفعلية.
 * لو قبل أول عنوان Markdown فيه سطور تخطيط، ننقل الجزء ده للتفكير.
 */
export function stripLeakedPlanning(text: string): { leaked: string; text: string } {
  const lines = text.split("\n");
  const idx = lines.findIndex((l) => /^\s*#{1,6}\s/.test(l));
  if (idx <= 0) return { leaked: "", text };
  const pre = lines.slice(0, idx).join("\n").trim();
  if (!pre || !PLANNING_RE.test(pre)) return { leaked: "", text };
  return { leaked: pre, text: lines.slice(idx).join("\n").trim() };
}

/** يستخرج كتلة ```products [...]``` من الرد ويعيد النص بدونها. */
export function extractProductPicks(text: string): { text: string; picks: ProductPick[] } {
  const re = /```(?:products|json)\s*([\s\S]*?)```/i;
  const match = re.exec(text);
  if (!match) return { text: text.trim(), picks: [] };
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(match[1].trim());
  } catch {
    return { text: text.replace(match[0], "").trim(), picks: [] };
  }
  const list = Array.isArray(parsed)
    ? parsed
    : parsed &&
        typeof parsed === "object" &&
        Array.isArray((parsed as { products?: unknown }).products)
      ? (parsed as { products: unknown[] }).products
      : [];
  const picks: ProductPick[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const id = String(rec.id ?? rec.productId ?? "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const quantity = Math.min(20, Math.max(1, Math.round(Number(rec.quantity ?? rec.qty) || 1)));
    const reason = typeof rec.reason === "string" ? rec.reason.trim().slice(0, 160) : "";
    picks.push({ id, quantity, reason });
    if (picks.length >= 12) break;
  }
  return { text: text.replace(match[0], "").trim(), picks };
}
