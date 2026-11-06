import React from "react";
import { Link } from "@tanstack/react-router";
import { AnnouncementBarConfig } from "@/types/layout-config";
import { Sparkles, ArrowLeft } from "lucide-react";

export function DynamicAnnouncementBar({ config }: { config?: AnnouncementBarConfig }) {
  if (!config || !config.enabled || !config.text) return null;

  return (
    <div
      className={`relative w-full overflow-hidden bg-gradient-to-r ${
        config.bgColor || "from-emerald-600 to-teal-700"
      } ${config.textColor || "text-white"} py-2 px-3 sm:px-4 text-xs font-bold shadow-sm transition-all`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-hidden truncate">
          {config.badge && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-black text-white backdrop-blur-md border border-white/30 shrink-0">
              <Sparkles className="h-2.5 w-2.5 text-amber-300" />
              {config.badge}
            </span>
          )}
          <span className="truncate">{config.text}</span>
        </div>

        {config.linkText && config.linkUrl && (
          <Link
            to={config.linkUrl.startsWith("/") ? (config.linkUrl as any) : "/categories"}
            className="inline-flex items-center gap-1 rounded-full bg-white/25 hover:bg-white/35 px-2.5 py-0.5 text-[11px] font-extrabold text-white shrink-0 transition-colors"
          >
            <span>{config.linkText}</span>
            <ArrowLeft className="h-3 w-3" />
          </Link>
        )}
      </div>
    </div>
  );
}
