import type { Product } from "@/lib/cart-context";
import type { CatalogRow, NawatGroup, NawatResult, NawatSuggestion, ToolResultLike } from "./types";

/**
 * منطق نقي (بدون واجهة أو شبكة) لتحويل رد النموذج إلى نتيجة قابلة للعرض.
 *
 * القاعدة الأساسية: لا يظهر أي منتج للعميل إلا إذا كان معرّفه موجودًا في نتائج
 * بحث Supabase الفعلية ومخزونه موجب. ما يكتبه النموذج من أسماء أو أسعار لا يُعتمد.
 */

const MAX_GROUPS = 6;
const MAX_ITEMS_PER_GROUP = 8;
const MAX_CONDITIONS = 8;
const MAX_QUANTITY = 20;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function tryParse(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** يستخرج أول كائن JSON من رد النموذج (داخل ```json أو مكتوب مباشرة). */
export function extractJsonObject(text: string): Record<string, unknown> | null {
  if (!text) return null;

  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  if (fenced) {
    const parsed = tryParse(fenced[1].trim());
    if (isRecord(parsed)) return parsed;
  }

  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < text.length; index++) {
    const char = text[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "{") depth++;
    else if (char === "}") {
      depth--;
      if (depth === 0) {
        const parsed = tryParse(text.slice(start, index + 1));
        return isRecord(parsed) ? parsed : null;
      }
    }
  }
  return null;
}

/** صفوف المنتجات التي أعادتها أدوات searchProducts الناجحة فقط. */
export function collectSearchRows(
  toolResults: readonly ToolResultLike[] | undefined,
): CatalogRow[] {
  if (!toolResults) return [];
  const rows: CatalogRow[] = [];
  for (const result of toolResults) {
    if (result.tool !== "searchProducts" || result.ok !== true) continue;
    const data = result.data;
    if (!isRecord(data) || !Array.isArray(data.results)) continue;
    for (const row of data.results) {
      if (isRecord(row) && typeof row.id === "string") rows.push(row);
    }
  }
  return rows;
}

export function isInStock(product: Pick<Product, "stock_quantity">): boolean {
  return Number(product.stock_quantity) > 0;
}

/** يحوّل رد النموذج إلى نتيجة موثقة، أو null إذا لم يبق أي منتج صالح. */
export function buildNawatResult(
  modelText: string,
  catalog: ReadonlyMap<string, Product>,
): NawatResult | null {
  const root = extractJsonObject(modelText);
  if (!root) return null;

  const understood = isRecord(root.understood) ? root.understood : {};
  const conditions = (Array.isArray(understood.conditions) ? understood.conditions : [])
    .map((condition) => cleanText(condition, 48))
    .filter(Boolean)
    .slice(0, MAX_CONDITIONS);
  const summary = cleanText(understood.summary ?? root.summary, 240);

  const seen = new Set<string>();
  const groups: NawatGroup[] = [];

  for (const rawGroup of Array.isArray(root.groups) ? root.groups.slice(0, MAX_GROUPS) : []) {
    if (!isRecord(rawGroup)) continue;
    const items: NawatSuggestion[] = [];

    for (const rawItem of Array.isArray(rawGroup.items) ? rawGroup.items : []) {
      if (items.length >= MAX_ITEMS_PER_GROUP) break;
      if (!isRecord(rawItem) || typeof rawItem.productId !== "string") continue;

      const productId = rawItem.productId.trim();
      const product = catalog.get(productId);
      if (!product || !isInStock(product) || seen.has(productId)) continue;

      seen.add(productId);
      const quantity = Math.min(
        MAX_QUANTITY,
        Math.max(1, Math.round(Number(rawItem.quantity) || 1)),
      );
      items.push({ product, reason: cleanText(rawItem.reason, 160), quantity });
    }

    if (items.length) {
      groups.push({ title: cleanText(rawGroup.title, 60) || "اقتراحات", items });
    }
  }

  if (!groups.length) return null;
  return { conditions, summary, groups };
}

/**
 * بديل آمن عندما لا يلتزم النموذج بصيغة JSON: نعرض فقط ما قرأناه فعلًا من الكتالوج
 * مع سبب عام صادق، بدل أن نُظهر خطأ للعميل أو نخترع تفسيرًا.
 */
export function fallbackResult(
  catalog: ReadonlyMap<string, Product>,
  limit = 8,
): NawatResult | null {
  const items: NawatSuggestion[] = [];
  for (const product of catalog.values()) {
    if (items.length >= limit) break;
    if (!isInStock(product)) continue;
    items.push({ product, reason: "ظهر في نتائج بحث الكتالوج لطلبك", quantity: 1 });
  }
  if (!items.length) return null;
  return { conditions: [], summary: "", groups: [{ title: "اختيارات من الكتالوج", items }] };
}
