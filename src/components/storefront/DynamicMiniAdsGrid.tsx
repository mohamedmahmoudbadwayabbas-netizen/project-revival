import React from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles, ArrowLeft, Tag } from "lucide-react";
import { MiniAdsSectionConfig } from "@/types/layout-config";
import { motion } from "motion/react";

export function DynamicMiniAdsGrid({ config }: { config?: MiniAdsSectionConfig }) {
  if (!config || !config.enabled || !config.items || config.items.length === 0) {
    return null;
  }

  const gridColsClass =
    config.columns === 2
      ? "grid-cols-1 sm:grid-cols-2"
      : config.columns === 4
        ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <section className="space-y-4 pt-2">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="h-6 w-1.5 rounded-full hero-gradient" />
          <div>
            <h2 className="text-lg sm:text-xl font-black text-foreground font-display tracking-tight flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
              <span>{config.title}</span>
            </h2>
            {config.subtitle && (
              <p className="text-xs text-muted-foreground font-medium mt-0.5">{config.subtitle}</p>
            )}
          </div>
        </div>

        <Link
          to="/categories"
          className="text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1 hover:gap-1.5 transition-all"
        >
          <span>مشاهدة الكل</span>
          <ArrowLeft className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Grid of Mini Ad Cards */}
      <div className={`grid ${gridColsClass} gap-3 sm:gap-4`}>
        {config.items.map((item, index) => (
          <motion.div
            key={item.id || index}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08, duration: 0.3 }}
            className="group relative overflow-hidden rounded-3xl border border-border/80 bg-card p-4 shadow-sm hover:shadow-xl hover:border-emerald-500/50 transition-all duration-300 flex flex-col justify-between"
          >
            {/* Background Image / Ambient glow */}
            <div className="absolute inset-0 z-0 overflow-hidden opacity-90 group-hover:opacity-100 transition-opacity">
              <div
                className="h-full w-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                style={{ backgroundImage: `url(${item.imageUrl})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/70 to-black/30 backdrop-blur-[0.5px]" />
            </div>

            {/* Top Badges */}
            <div className="relative z-10 flex items-center justify-between gap-2">
              {item.tag && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-[10px] font-black text-white shadow-md">
                  <Tag className="h-2.5 w-2.5" />
                  <span>{item.tag}</span>
                </span>
              )}
              {item.badge && (
                <span className="inline-block rounded-full bg-white/20 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-extrabold text-white border border-white/30">
                  {item.badge}
                </span>
              )}
            </div>

            {/* Content & Action */}
            <div className="relative z-10 mt-14 space-y-2 text-white">
              <h3 className="text-base sm:text-lg font-black font-display tracking-tight leading-snug drop-shadow-sm group-hover:text-emerald-300 transition-colors">
                {item.title}
              </h3>
              <p className="text-xs text-white/80 line-clamp-2 leading-relaxed">{item.subtitle}</p>

              <div className="pt-2">
                <Link
                  to={item.linkUrl?.startsWith("/") ? (item.linkUrl as any) : "/categories"}
                  className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600/90 hover:bg-emerald-600 px-4 py-2 text-xs font-black text-white shadow-md backdrop-blur-sm transition-all group-hover:gap-2"
                >
                  <span>تسوق العرض</span>
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
