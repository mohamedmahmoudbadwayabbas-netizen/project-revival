/**
 * تخزين سلة الضيف في localStorage (الخارطة: Guest Cart Persistence).
 *
 * - بنخزّن "أسطر" خفيفة (معرّف المنتج + الكمية + تفضيلات) مش بيانات المنتج كاملة،
 *   والسعر والمخزون بيتجابوا من قاعدة البيانات وقت الاسترجاع، فمفيش سعر قديم.
 * - كل قراءة/كتابة محمية بـ try/catch (الوضع الخاص أو امتلاء التخزين لا يكسر المتجر).
 * - مفيش تكرار: المنتج الواحد له سطر واحد دايماً.
 */

export const GUEST_CART_KEY = "elwadi:guest-cart:v1";
const MAX_LINES = 200;
const MAX_QTY = 999;

export type GuestSubstitution = "call_me" | "auto_best" | "do_not_substitute";

export type GuestCartLine = {
  productId: string;
  quantity: number;
  selectedWeight?: number;
  substitution?: GuestSubstitution;
  byWeight?: boolean;
  unitLabel?: string;
};

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function getStorage(storage?: StorageLike): StorageLike | null {
  if (storage) return storage;
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

const SUBS: readonly GuestSubstitution[] = ["call_me", "auto_best", "do_not_substitute"];

/** ينظّف أي قيمة قادمة من التخزين: يتجاهل التالف، يدمج المكرر (أكبر كمية)، ويحدّ العدد. */
export function sanitizeLines(raw: unknown): GuestCartLine[] {
  if (!Array.isArray(raw)) return [];
  const byId = new Map<string, GuestCartLine>();
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const productId = typeof o.productId === "string" ? o.productId.trim() : "";
    const qty = Number(o.quantity);
    if (!productId || productId.length > 64 || !Number.isFinite(qty) || qty <= 0) continue;
    const quantity = +Math.min(qty, MAX_QTY).toFixed(3);
    const line: GuestCartLine = { productId, quantity };
    const w = Number(o.selectedWeight);
    if (Number.isFinite(w) && w > 0) line.selectedWeight = +Math.min(w, MAX_QTY).toFixed(3);
    if (SUBS.includes(o.substitution as GuestSubstitution))
      line.substitution = o.substitution as GuestSubstitution;
    if (typeof o.byWeight === "boolean") line.byWeight = o.byWeight;
    if (typeof o.unitLabel === "string" && o.unitLabel.length <= 30) line.unitLabel = o.unitLabel;
    const prev = byId.get(productId);
    if (!prev) byId.set(productId, line);
    else
      byId.set(productId, { ...prev, ...line, quantity: Math.max(prev.quantity, line.quantity) });
  }
  return [...byId.values()].slice(0, MAX_LINES);
}

export function readGuestCart(storage?: StorageLike): GuestCartLine[] {
  const s = getStorage(storage);
  if (!s) return [];
  try {
    const text = s.getItem(GUEST_CART_KEY);
    if (!text) return [];
    return sanitizeLines(JSON.parse(text));
  } catch {
    return [];
  }
}

/** يرجع true لو الكتابة نجحت. سلة فاضية = مسح المفتاح. */
export function writeGuestCart(lines: GuestCartLine[], storage?: StorageLike): boolean {
  const s = getStorage(storage);
  if (!s) return false;
  try {
    const clean = sanitizeLines(lines);
    if (clean.length === 0) s.removeItem(GUEST_CART_KEY);
    else s.setItem(GUEST_CART_KEY, JSON.stringify(clean));
    return true;
  } catch {
    return false;
  }
}

export function clearGuestCart(storage?: StorageLike): void {
  const s = getStorage(storage);
  try {
    s?.removeItem(GUEST_CART_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * دمج سلة الضيف مع سلة الحساب بعد تسجيل الدخول.
 * القاعدة: لكل منتج نأخذ الأكبر من الكميتين (مش الجمع) علشان تكرار الدمج
 * أو تسجيل الدخول من نفس الجهاز ما يضاعفش الكميات.
 * بيرجع بس الصفوف اللي لازم تتكتب في قاعدة البيانات (جديدة أو كميتها زادت).
 */
export function computeMergeUpserts(
  remote: ReadonlyMap<string, number>,
  guest: readonly GuestCartLine[],
): Array<{ productId: string; quantity: number }> {
  const out: Array<{ productId: string; quantity: number }> = [];
  for (const g of guest) {
    const existing = remote.get(g.productId);
    if (existing === undefined) out.push({ productId: g.productId, quantity: g.quantity });
    else if (g.quantity > existing) out.push({ productId: g.productId, quantity: g.quantity });
  }
  return out;
}
