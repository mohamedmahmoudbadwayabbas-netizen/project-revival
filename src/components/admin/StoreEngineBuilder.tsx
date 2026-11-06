import React from "react";
import { StoreLayoutConfig } from "@/types/layout-config";

export interface StoreEngineBuilderProps {
  layoutConfig: StoreLayoutConfig;
  onLayoutChange: (cfg: StoreLayoutConfig) => void;
  onDeploy: () => void;
  isDeploying: boolean;
}

export function StoreEngineBuilder({ layoutConfig, onLayoutChange, onDeploy, isDeploying }: StoreEngineBuilderProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
      <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4">محرك الواجهة والألوان</h2>
      <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">تُحفظ هذه التغييرات كمعاينة محلية في هذا المتصفح. النشر إلى واجهة المتجر غير موصول بعد.</p>
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">لون الأساس (Primary)</label>
          <div className="flex gap-2 mt-1">
            {["emerald", "dark_green", "rose", "blue", "amber", "zinc"].map(color => (
              <button
                key={color}
                onClick={() => onLayoutChange({ ...layoutConfig, theme: { ...layoutConfig.theme, palette: color as any } })}
                className={`px-3 py-1.5 rounded border ${layoutConfig.theme.palette === color ? "border-emerald-500 bg-emerald-50" : "border-zinc-200"}`}
              >
                {color}
              </button>
            ))}
          </div>
        </div>
        
        <button
          onClick={onDeploy}
          disabled={isDeploying}
          className="mt-6 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold disabled:opacity-50"
        >
          {isDeploying ? "جارٍ الحفظ..." : "حفظ إعدادات المعاينة محليًا"}
        </button>
      </div>
    </div>
  );
}
