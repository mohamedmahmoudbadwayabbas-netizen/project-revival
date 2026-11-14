import { DEEP_ANALYSIS_MODEL } from "@/lib/gemini-config";

/** نماذج نبراس: خفيف للأسئلة اليومية، وعميق للتحليل والتشخيص فقط (توفيرًا للاستهلاك). */
export const NEBRAS_LIGHT_MODEL = "gemini-3.1-flash-lite";
export const NEBRAS_DEEP_MODEL = DEEP_ANALYSIS_MODEL;

const DEEP_PATTERNS = [
  /حلل|تحليل|شخص|تشخيص|ليه|لماذا|السبب|مشكل|خطأ|اخطاء|أخطاء|غلط|استراتيج|خطة|قارن|مقارنة|توقع|تقرير|حوكمة|اقترح|تحسين|راجع/,
  /analy[sz]|diagnos|why|root cause|strategy|compare|forecast|report|governance|improve|debug|error/i,
];

export function pickNebrasModel(message: string): string {
  const text = (message || "").trim();
  if (text.length > 400) return NEBRAS_DEEP_MODEL;
  return DEEP_PATTERNS.some((p) => p.test(text)) ? NEBRAS_DEEP_MODEL : NEBRAS_LIGHT_MODEL;
}
