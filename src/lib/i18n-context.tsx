import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "ar" | "en";
export type Theme = "light" | "dark";

type Dict = Record<string, { ar: string; en: string }>;

const DICT: Dict = {
  "nav.home": { ar: "الرئيسية", en: "Home" },
  "nav.cart": { ar: "السلة", en: "Cart" },
  "nav.account": { ar: "حسابي", en: "My Account" },
  "nav.admin": { ar: "لوحة التحكم", en: "Dashboard" },
  "menu.account": { ar: "حسابي", en: "My Account" },
  "menu.language": { ar: "اللغة", en: "Language" },
  "menu.theme": { ar: "المظهر", en: "Theme" },
  "menu.logout": { ar: "تسجيل الخروج", en: "Logout" },
  "menu.login": { ar: "تسجيل الدخول", en: "Login" },
  "theme.light": { ar: "فاتح", en: "Light" },
  "theme.dark": { ar: "داكن", en: "Dark" },
  "lang.ar": { ar: "العربية", en: "Arabic" },
  "lang.en": { ar: "الإنجليزية", en: "English" },
  "search.placeholder": { ar: "ابحث عن منتج، عطارة، توابل...", en: "Search products, spices..." },
  "site.tagline": { ar: "سوبر ماركت وعطارة", en: "Supermarket & Spices" },
};

type I18nCtx = {
  lang: Lang;
  theme: Theme;
  setLang: (l: Lang) => void;
  setTheme: (t: Theme) => void;
  toggleLang: () => void;
  toggleTheme: () => void;
  t: (key: string) => string;
  dir: "rtl" | "ltr";
};

const I18nContext = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ar");
  const [theme, setThemeState] = useState<Theme>("light");

  const dir: "rtl" | "ltr" = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    try {
      const savedLang = localStorage.getItem("lang") as Lang;
      if (savedLang === "ar" || savedLang === "en") setLangState(savedLang);
      const savedTheme = localStorage.getItem("theme") as Theme;
      if (savedTheme === "light" || savedTheme === "dark") setThemeState(savedTheme);
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    try {
      localStorage.setItem("lang", lang);
    } catch {}
  }, [lang, dir]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem("theme", theme);
    } catch {}
  }, [theme]);

  const value = useMemo<I18nCtx>(
    () => ({
      lang,
      theme,
      dir,
      setLang: setLangState,
      setTheme: setThemeState,
      toggleLang: () => setLangState((l) => (l === "ar" ? "en" : "ar")),
      toggleTheme: () => setThemeState((t) => (t === "light" ? "dark" : "light")),
      t: (key) => DICT[key]?.[lang] ?? key,
    }),
    [lang, theme, dir],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

/** Convert Arabic/Persian digits to ASCII digits. */
export function normalizeDigits(input: string): string {
  return input
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}
