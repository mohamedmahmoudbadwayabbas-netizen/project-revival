import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type ColorMode = "light" | "dark";

const ColorModeContext = createContext<{
  mode: ColorMode;
  toggle: () => void;
  setMode: (m: ColorMode) => void;
}>({
  mode: "light",
  toggle: () => {},
  setMode: () => {},
});

export function ColorModeProvider({
  children,
  storageKey = "color-mode",
  defaultMode = "light",
}: {
  children: ReactNode;
  /** مفتاح localStorage — استخدم مفتاح مختلف للأدمن عن المتجر عشان يفضلوا مستقلين */
  storageKey?: string;
  defaultMode?: ColorMode;
}) {
  // نبدأ دايماً بالقيمة الافتراضية على السيرفر والعميل لتفادي عدم تطابق الـ hydration،
  // وبعد الترطيب نقرأ التخزين المحلي.
  const [mode, setModeState] = useState<ColorMode>(defaultMode);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (saved === "light" || saved === "dark") setModeState(saved);
  }, [storageKey]);

  useEffect(() => {
    const root = document.documentElement;
    if (mode === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [mode]);

  const setMode = (m: ColorMode) => {
    setModeState(m);
    window.localStorage.setItem(storageKey, m);
  };

  const toggle = () => setMode(mode === "dark" ? "light" : "dark");

  return (
    <ColorModeContext.Provider value={{ mode, toggle, setMode }}>
      {children}
    </ColorModeContext.Provider>
  );
}

export function useColorMode() {
  return useContext(ColorModeContext);
}
