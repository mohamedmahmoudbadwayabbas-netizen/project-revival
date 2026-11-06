import React, { useState } from "react";
import {
  Smartphone,
  Tablet,
  Monitor,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Tag,
  ChevronLeft,
  ChevronRight,
  Flame,
  ArrowLeft,
  ShoppingBag,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StoreLayoutConfig } from "@/types/layout-config";
import { DynamicAnnouncementBar } from "@/components/storefront/DynamicAnnouncementBar";
import { DynamicMiniAdsGrid } from "@/components/storefront/DynamicMiniAdsGrid";
import { DynamicFlashSaleTimer } from "@/components/storefront/DynamicFlashSaleTimer";
import { motion, AnimatePresence } from "motion/react";

interface ShopLivePreviewProps {
  layout: StoreLayoutConfig;
}

const PALETTE_META: Record<
  string,
  { name: string; primary: string; gradient: string; text: string; bgSoft: string }
> = {
  emerald: {
    name: "الأخضر الزمردي",
    primary: "rgb(16, 185, 129)",
    gradient: "linear-gradient(135deg, rgb(16, 185, 129) 0%, rgb(4, 120, 87) 100%)",
    text: "text-emerald-600",
    bgSoft: "bg-emerald-500/10",
  },
  dark_green: {
    name: "الأخضر الداكن الفاخر",
    primary: "rgb(6, 95, 70)",
    gradient: "linear-gradient(135deg, rgb(6, 95, 70) 0%, rgb(2, 44, 34) 100%)",
    text: "text-emerald-800 dark:text-emerald-400",
    bgSoft: "bg-emerald-950/20",
  },
  forest_dark: {
    name: "الأخضر الداكن الفاخر",
    primary: "rgb(6, 95, 70)",
    gradient: "linear-gradient(135deg, rgb(6, 95, 70) 0%, rgb(2, 44, 34) 100%)",
    text: "text-emerald-800 dark:text-emerald-400",
    bgSoft: "bg-emerald-950/20",
  },
  amber_warm: {
    name: "الذهبي والعسلي الدافئ",
    primary: "rgb(245, 158, 11)",
    gradient: "linear-gradient(135deg, rgb(245, 158, 11) 0%, rgb(217, 119, 6) 100%)",
    text: "text-amber-600",
    bgSoft: "bg-amber-500/10",
  },
  blue_modern: {
    name: "الأزرق العصري",
    primary: "rgb(59, 130, 246)",
    gradient: "linear-gradient(135deg, rgb(59, 130, 246) 0%, rgb(29, 78, 216) 100%)",
    text: "text-blue-600",
    bgSoft: "bg-blue-500/10",
  },
  rose_delight: {
    name: "الزهري والأحمر الجذاب",
    primary: "rgb(244, 63, 94)",
    gradient: "linear-gradient(135deg, rgb(244, 63, 94) 0%, rgb(190, 18, 60) 100%)",
    text: "text-rose-600",
    bgSoft: "bg-rose-500/10",
  },
  violet_luxury: {
    name: "البنفسجي الملكي الفاخر",
    primary: "rgb(139, 92, 246)",
    gradient: "linear-gradient(135deg, rgb(139, 92, 246) 0%, rgb(109, 40, 217) 100%)",
    text: "text-purple-600",
    bgSoft: "bg-purple-500/10",
  },
  slate_minimal: {
    name: "الرمادي المينيمال الهادئ",
    primary: "rgb(100, 116, 139)",
    gradient: "linear-gradient(135deg, rgb(100, 116, 139) 0%, rgb(51, 65, 85) 100%)",
    text: "text-slate-600",
    bgSoft: "bg-slate-500/10",
  },
};

const RADIUS_MAP: Record<string, string> = {
  none: "0px",
  sm: "6px",
  md: "10px",
  lg: "16px",
  xl: "22px",
  full: "32px",
};

export function ShopLivePreview({ layout }: ShopLivePreviewProps) {
  const [device, setDevice] = useState<"mobile" | "tablet" | "desktop">("desktop");
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);

  const containerWidthClass =
    device === "mobile" ? "max-w-[390px]" : device === "tablet" ? "max-w-[768px]" : "max-w-full";

  const heroSlides = layout.heroBanner?.slides || [];
  const currentHero = heroSlides[currentHeroIndex] || heroSlides[0];

  const paletteMeta = PALETTE_META[layout.theme?.palette] || PALETTE_META.emerald;
  const currentRadius = RADIUS_MAP[layout.theme?.cardRadius || "lg"] || "16px";

  // Count active sections dynamically
  const activeSectionsCount = [
    layout.announcementBar?.enabled,
    layout.heroBanner?.enabled,
    layout.flashSaleTimer?.enabled,
    layout.miniAdsGrid?.enabled,
    layout.featuredCategories?.enabled,
    layout.bestSellersSection?.enabled,
    layout.cookingTipsBanner?.enabled,
  ].filter(Boolean).length;

  return (
    <div
      className="flex flex-col h-full rounded-3xl border border-border/80 bg-card overflow-hidden shadow-lg"
      style={{
        // @ts-ignore
        "--preview-primary": paletteMeta.primary,
        "--preview-radius": currentRadius,
      }}
    >
      {/* Top Preview Control Bar */}
      <div className="flex items-center justify-between p-3 px-4 border-b border-border/60 bg-secondary/30">
        <div className="flex items-center gap-2 flex-wrap">
          <div
            className="h-3 w-3 rounded-full animate-pulse"
            style={{ backgroundColor: paletteMeta.primary }}
          />
          <span className="text-xs font-black text-foreground">
            المعاينة الحية للمتجر (Live Store Preview)
          </span>
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-lg border border-border/50 transition-colors"
            style={{
              backgroundColor: paletteMeta.primary + "18",
              color: paletteMeta.primary,
            }}
          >
            {paletteMeta.name}
          </span>
          <span className="text-[10px] font-bold text-muted-foreground bg-card px-2 py-0.5 rounded-lg border border-border/50">
            الحواف: {layout.theme?.cardRadius || "lg"} ({currentRadius})
          </span>
          <span className="text-[10px] font-bold text-muted-foreground bg-card px-2 py-0.5 rounded-lg border border-border/50">
            الأقسام المفعلة: {activeSectionsCount}
          </span>
        </div>

        {/* Viewport Toggles */}
        <div className="flex items-center gap-1 bg-card rounded-xl p-1 border border-border/60">
          <button
            type="button"
            onClick={() => setDevice("desktop")}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              device === "desktop"
                ? "bg-secondary text-foreground font-bold shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="شاشة كمبيوتر"
          >
            <Monitor className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setDevice("tablet")}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              device === "tablet"
                ? "bg-secondary text-foreground font-bold shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="شاشة لوحية"
          >
            <Tablet className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setDevice("mobile")}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              device === "mobile"
                ? "bg-secondary text-foreground font-bold shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="شاشة جوال"
          >
            <Smartphone className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Frame Container */}
      <div className="flex-1 bg-secondary/20 p-2 sm:p-4 overflow-y-auto flex justify-center">
        <div
          className={`w-full ${containerWidthClass} transition-all duration-300 bg-background rounded-2xl border border-border shadow-sm overflow-hidden text-right flex flex-col`}
          dir="rtl"
        >
          {/* 1. Dynamic Announcement Bar */}
          {layout.announcementBar?.enabled && (
            <DynamicAnnouncementBar config={layout.announcementBar} />
          )}

          {/* Fake Storefront Mini Nav Header */}
          <div className="p-3 sm:p-4 border-b border-border/60 flex items-center justify-between bg-card">
            <div className="flex items-center gap-2">
              <div
                className="h-7 w-7 rounded-xl grid place-items-center text-white text-xs font-black shadow-xs"
                style={{ background: paletteMeta.gradient }}
              >
                🌿
              </div>
              <div>
                <div className="font-display font-bold text-xs text-foreground">سوبرماركت الوادي الأخضر</div>
                <div className="text-[9px] text-muted-foreground">أونلاين هايبر ماركت</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-secondary px-2 py-1 rounded-lg text-muted-foreground font-bold">
                توصيل خلال 30 دقيقة ⚡
              </span>
              <div
                className="h-7 w-7 rounded-xl grid place-items-center"
                style={{
                  backgroundColor: paletteMeta.primary + "18",
                  color: paletteMeta.primary,
                }}
              >
                <ShoppingBag className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>

          {/* Render Sections dynamically according to layout.sectionsOrder */}
          <div className="p-3 sm:p-4 space-y-5">
            {layout.sectionsOrder.map((sectionKey) => {
              if (sectionKey === "announcementBar") return null; // Already on top

              if (sectionKey === "heroBanner" && layout.heroBanner?.enabled && currentHero) {
                return (
                  <div
                    key="heroBanner"
                    className="relative overflow-hidden border border-border bg-card shadow-sm min-h-[170px] sm:min-h-[220px] flex flex-col justify-end p-4 text-white transition-all duration-300"
                    style={{ borderRadius: currentRadius }}
                  >
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-all duration-700"
                      style={{ backgroundImage: `url(${currentHero.image_url})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />

                    <div className="relative z-10 space-y-1.5">
                      {currentHero.badge && (
                        <span
                          className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black"
                          style={{ backgroundColor: paletteMeta.primary }}
                        >
                          {currentHero.badge}
                        </span>
                      )}
                      <h3 className="text-sm sm:text-base font-black font-display leading-tight">
                        {currentHero.title}
                      </h3>
                      <p className="text-[10px] sm:text-xs text-white/80 line-clamp-2">
                        {currentHero.subtitle}
                      </p>

                      <div className="pt-1 flex items-center justify-between">
                        <button
                          type="button"
                          className="px-3 py-1 text-[11px] font-black text-white shadow-sm transition-all"
                          style={{
                            background: paletteMeta.gradient,
                            borderRadius: currentRadius,
                          }}
                        >
                          {currentHero.button_text || "تسوق الآن 🛒"}
                        </button>

                        {heroSlides.length > 1 && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                setCurrentHeroIndex((prev) =>
                                  prev === 0 ? heroSlides.length - 1 : prev - 1,
                                )
                              }
                              className="h-6 w-6 rounded-full bg-black/40 grid place-items-center text-white"
                            >
                              <ChevronRight className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setCurrentHeroIndex((prev) =>
                                  prev === heroSlides.length - 1 ? 0 : prev + 1,
                                )
                              }
                              className="h-6 w-6 rounded-full bg-black/40 grid place-items-center text-white"
                            >
                              <ChevronLeft className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              if (sectionKey === "flashSaleTimer" && layout.flashSaleTimer?.enabled) {
                return (
                  <DynamicFlashSaleTimer key="flashSaleTimer" config={layout.flashSaleTimer} />
                );
              }

              if (sectionKey === "miniAdsGrid" && layout.miniAdsGrid?.enabled) {
                return <DynamicMiniAdsGrid key="miniAdsGrid" config={layout.miniAdsGrid} />;
              }

              if (sectionKey === "featuredCategories" && layout.featuredCategories?.enabled) {
                return (
                  <div key="featuredCategories" className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-foreground">
                        {layout.featuredCategories.title}
                      </span>
                      <span
                        className="text-[10px] font-bold"
                        style={{ color: paletteMeta.primary }}
                      >
                        عرض الكل
                      </span>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {[
                        {
                          name: "ألبان وأجبان 🧀",
                          img: "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=300&q=80",
                        },
                        {
                          name: "لحوم ودواجن 🥩",
                          img: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=300&q=80",
                        },
                        {
                          name: "بقالة وتموين 🥫",
                          img: "https://images.unsplash.com/photo-1588964895597-cfccd6e2dbf9?auto=format&fit=crop&w=300&q=80",
                        },
                        {
                          name: "مشروبات وبقالة 🧃",
                          img: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=300&q=80",
                        },
                      ]
                        .slice(0, layout.featuredCategories.maxItems || 4)
                        .map((c, i) => (
                          <div
                            key={i}
                            className="border border-border/80 bg-card p-2 text-center space-y-1.5 shadow-2xs transition-all hover:scale-[1.02]"
                            style={{ borderRadius: currentRadius }}
                          >
                            <div
                              className="h-14 w-full overflow-hidden bg-secondary"
                              style={{ borderRadius: `calc(${currentRadius} - 4px)` }}
                            >
                              <img src={c.img} alt="" className="h-full w-full object-cover" />
                            </div>
                            <span className="text-[10px] font-bold text-foreground block truncate">
                              {c.name}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                );
              }

              if (sectionKey === "bestSellersSection" && layout.bestSellersSection?.enabled) {
                return (
                  <div key="bestSellersSection" className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-foreground flex items-center gap-1">
                        <Flame className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                        <span>{layout.bestSellersSection.title}</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { title: "لحم مفروم بلدي طازج", price: "320 ج.م", tag: "بلدي 100%" },
                        { title: "جبن أبيض براميلي فاخر", price: "95 ج.م", tag: "طازج" },
                        { title: "أرز مصري درجة أولى 5ك", price: "185 ج.م", tag: "عرض خاص" },
                      ].map((item, idx) => (
                        <div
                          key={idx}
                          className="border border-border/80 bg-card p-2.5 space-y-1 text-right shadow-2xs transition-all"
                          style={{ borderRadius: currentRadius }}
                        >
                          <span className="text-[9px] bg-amber-500/15 text-amber-700 px-1.5 py-0.5 rounded-md font-extrabold">
                            {item.tag}
                          </span>
                          <div className="text-[11px] font-black text-foreground truncate">
                            {item.title}
                          </div>
                          <div
                            className="text-xs font-black"
                            style={{ color: paletteMeta.primary }}
                          >
                            {item.price}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }

              if (sectionKey === "cookingTipsBanner" && layout.cookingTipsBanner?.enabled) {
                return (
                  <div
                    key="cookingTipsBanner"
                    className="bg-amber-500/10 border border-amber-500/20 p-3 space-y-1 text-amber-950 dark:text-amber-200 transition-all"
                    style={{ borderRadius: currentRadius }}
                  >
                    <div className="text-xs font-extrabold flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      <span>{layout.cookingTipsBanner.title}</span>
                    </div>
                    <p className="text-[11px] font-medium leading-relaxed">
                      "{layout.cookingTipsBanner.quote}"
                    </p>
                  </div>
                );
              }

              return null;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
