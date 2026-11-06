import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { StoreLayoutConfig, DEFAULT_LAYOUT_CONFIG, ThemeColorPalette } from "@/types/layout-config";

const STORAGE_KEY = "smartstore_layout_config_v1";

interface LayoutConfigContextType {
  config: StoreLayoutConfig;
  updateConfig: (
    updater: Partial<StoreLayoutConfig> | ((prev: StoreLayoutConfig) => StoreLayoutConfig),
  ) => void;
  resetConfig: () => void;
  setThemePalette: (palette: ThemeColorPalette) => void;
  toggleSection: (sectionKey: keyof StoreLayoutConfig, enabled: boolean) => void;
}

const LayoutConfigContext = createContext<LayoutConfigContextType | undefined>(undefined);

export function LayoutConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<StoreLayoutConfig>(() => {
    if (typeof window === "undefined") return DEFAULT_LAYOUT_CONFIG;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_LAYOUT_CONFIG, ...parsed };
      }
    } catch (e) {
      console.warn("Failed to load layout config from localStorage:", e);
    }
    return DEFAULT_LAYOUT_CONFIG;
  });

  const saveAndBroadcast = useCallback((newConfig: StoreLayoutConfig) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
      window.dispatchEvent(new CustomEvent("layout_config_changed", { detail: newConfig }));
    } catch (e) {
      console.error("Failed to persist layout config:", e);
    }
  }, []);

  const updateConfig = useCallback(
    (updater: Partial<StoreLayoutConfig> | ((prev: StoreLayoutConfig) => StoreLayoutConfig)) => {
      setConfig((prev) => {
        const next =
          typeof updater === "function"
            ? updater(prev)
            : { ...prev, ...updater, lastUpdated: new Date().toISOString() };
        saveAndBroadcast(next);
        return next;
      });
    },
    [saveAndBroadcast],
  );

  const resetConfig = useCallback(() => {
    setConfig(DEFAULT_LAYOUT_CONFIG);
    saveAndBroadcast(DEFAULT_LAYOUT_CONFIG);
  }, [saveAndBroadcast]);

  const setThemePalette = useCallback(
    (palette: ThemeColorPalette) => {
      updateConfig((prev) => ({
        ...prev,
        theme: {
          ...prev.theme,
          palette,
        },
      }));
    },
    [updateConfig],
  );

  const toggleSection = useCallback(
    (sectionKey: keyof StoreLayoutConfig, enabled: boolean) => {
      updateConfig((prev) => {
        const target = prev[sectionKey];
        if (target && typeof target === "object" && "enabled" in target) {
          return {
            ...prev,
            [sectionKey]: {
              ...(target as any),
              enabled,
            },
          };
        }
        return prev;
      });
    },
    [updateConfig],
  );

  // Listen to external layout config changes across components/tabs
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setConfig(JSON.parse(e.newValue));
        } catch {}
      }
    };
    const handleCustom = (e: Event) => {
      const customEvent = e as CustomEvent<StoreLayoutConfig>;
      if (customEvent.detail) {
        setConfig(customEvent.detail);
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("layout_config_changed", handleCustom);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("layout_config_changed", handleCustom);
    };
  }, []);

  // Apply theme palette and card radius attributes to html / body element
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute(
        "data-theme-palette",
        config.theme?.palette || "emerald",
      );
      document.documentElement.setAttribute("data-card-radius", config.theme?.cardRadius || "lg");
    }
  }, [config.theme?.palette, config.theme?.cardRadius]);

  return (
    <LayoutConfigContext.Provider
      value={{
        config,
        updateConfig,
        resetConfig,
        setThemePalette,
        toggleSection,
      }}
    >
      {children}
    </LayoutConfigContext.Provider>
  );
}

export function useLayoutConfig() {
  const ctx = useContext(LayoutConfigContext);
  if (!ctx) {
    throw new Error("useLayoutConfig must be used within a LayoutConfigProvider");
  }
  return ctx;
}
