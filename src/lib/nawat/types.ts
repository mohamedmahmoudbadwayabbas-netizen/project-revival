import type { Product } from "@/lib/cart-context";

/** الشاشات الخمس في تصميم نواة (البداية، التجهيز، النتيجة، الخطأ، لا نتائج). */
export type NawatPhase = "start" | "processing" | "result" | "error" | "empty";

/** خطوات التجهيز الأربع المعروضة للعميل. تتغير حالتها فقط عند أحداث تنفيذ فعلية. */
export type NawatStepId = "understand" | "catalog" | "compare" | "arrange";
export type NawatStepState = "waiting" | "current" | "done";

export interface NawatProgressEvent {
  step: NawatStepId;
  state: "current" | "done";
}

export const NAWAT_STEP_ORDER: readonly NawatStepId[] = [
  "understand",
  "catalog",
  "compare",
  "arrange",
] as const;

/** سبب ظهور شاشة الخطأ. */
export type NawatErrorKind =
  /** مفتاح Gemini غير مضبوط على الخادم بعد. */
  | "not_configured"
  /** تعذر قراءة الكتالوج من Supabase، فلا نقترح شيئًا غير موثق. */
  | "unverified"
  /** أي فشل آخر في الاتصال بالنموذج. */
  | "failed";

export interface NawatSuggestion {
  /** منتج حقيقي قُرئ من Supabase في هذه الجلسة؛ لا تُقبل منتجات من ذاكرة النموذج. */
  product: Product;
  /** سبب الترشيح كما كتبه النموذج حسب طلب العميل. */
  reason: string;
  quantity: number;
}

export interface NawatGroup {
  title: string;
  items: NawatSuggestion[];
}

export interface NawatResult {
  /** شروط الطلب كما فهمها النموذج (٤ أفراد، غدا، ...). */
  conditions: string[];
  /** جملة قصيرة من النموذج توضح ما فهمه. */
  summary: string;
  groups: NawatGroup[];
}

/** شكل الصف الذي تعيده أداة searchProducts. */
export type CatalogRow = Record<string, unknown>;

export interface ToolResultLike {
  tool?: string;
  ok?: boolean;
  data?: unknown;
}
