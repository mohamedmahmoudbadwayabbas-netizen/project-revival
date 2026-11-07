/**
 * Central brand configuration for Al-Wadi Al-Akhdar (Green Valley Supermarket Chain).
 * 3 Distinct Branches:
 * 1. Main Branch: فرع الدقي والمهندسين (الرئيسي)
 * 2. East Branch: فرع مدينة نصر والتجمع
 * 3. South Branch: فرع المعادي والشيخ زايد
 */
export const BRAND_NAME_AR = "سوبرماركت الوادي الأخضر";
export const BRAND_NAME_EN = "Al-Wadi Al-Akhdar Supermarket";
export const BRAND_NAME = `${BRAND_NAME_AR} — ${BRAND_NAME_EN}`;

export const BRAND_TAGLINE_AR =
  "هايبر ماركت وسوبرماركت الوادي الأخضر — أقوى العروض، أسعار الجملة، وتوصيل فوري";
export const BRAND_DESCRIPTION_AR =
  "سوبرماركت وهايبرماركت الوادي الأخضر: تسوق جميع سلع البقالة، التموين، الألبان والأجبان، المعلبات، اللحوم، المنظفات والمستلزمات المنزلية بأسعار تنافسية وتوصيل سريع لباب البيت.";

export const SITE_URL =
  (typeof process !== "undefined" && process.env?.VITE_SITE_URL) ||
  import.meta.env.VITE_SITE_URL ||
  "https://elwadi-alakhdar.lovable.app";
