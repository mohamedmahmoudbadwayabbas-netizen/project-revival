/**
 * Feature Flags — كل ميزة جديدة في خارطة الطريق تتحكم فيها من هنا.
 *
 * التفعيل/التعطيل من متغيرات البيئة (Vite) بدون تعديل كود:
 *   VITE_ENABLE_GUEST_CART=false
 *   VITE_ENABLE_BUY_AGAIN=true
 * القيم المقبولة: true / false / 1 / 0 (غير حساسة لحالة الأحرف).
 * لو المتغير غير موجود تُستخدم القيمة الافتراضية أدناه (من الخارطة).
 */

export const FEATURE_DEFAULTS = {
  ENABLE_GUEST_CART: true,
  ENABLE_GUEST_ASSISTANT: true,
  ENABLE_BUY_AGAIN: true,
  ENABLE_FAVORITES: true,
  ENABLE_DELIVERY_SLOTS: false,
  ENABLE_WALLET: false,
  ENABLE_PICKER_VIEW: false,
  ENABLE_MULTI_BRANCH: false,
} as const;

export type FeatureFlag = keyof typeof FEATURE_DEFAULTS;

export function parseFlag(raw: unknown, fallback: boolean): boolean {
  if (typeof raw === "boolean") return raw;
  if (typeof raw !== "string") return fallback;
  const v = raw.trim().toLowerCase();
  if (v === "true" || v === "1") return true;
  if (v === "false" || v === "0") return false;
  return fallback;
}

/**
 * ملحوظة: Vite بيستبدل `import.meta.env.VITE_*` وقت البناء، فكل flag لازم
 * يتكتب بالاسم الصريح هنا (مش بمفتاح ديناميكي) علشان يشتغل في الإنتاج.
 */
const ENV_VALUES: Record<FeatureFlag, unknown> = {
  ENABLE_GUEST_CART: import.meta.env?.VITE_ENABLE_GUEST_CART,
  ENABLE_GUEST_ASSISTANT: import.meta.env?.VITE_ENABLE_GUEST_ASSISTANT,
  ENABLE_BUY_AGAIN: import.meta.env?.VITE_ENABLE_BUY_AGAIN,
  ENABLE_FAVORITES: import.meta.env?.VITE_ENABLE_FAVORITES,
  ENABLE_DELIVERY_SLOTS: import.meta.env?.VITE_ENABLE_DELIVERY_SLOTS,
  ENABLE_WALLET: import.meta.env?.VITE_ENABLE_WALLET,
  ENABLE_PICKER_VIEW: import.meta.env?.VITE_ENABLE_PICKER_VIEW,
  ENABLE_MULTI_BRANCH: import.meta.env?.VITE_ENABLE_MULTI_BRANCH,
};

export function isEnabled(flag: FeatureFlag): boolean {
  return parseFlag(ENV_VALUES[flag], FEATURE_DEFAULTS[flag]);
}
