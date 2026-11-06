import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Smartphone,
  Tablet,
  Monitor,
  Search,
  ShoppingCart,
  Heart,
  Store,
  Layers,
  User,
  Leaf,
  Tag,
  MapPin,
  Sparkles,
  Flame,
  ShieldCheck,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Check,
} from "lucide-react";
import { useStoreProducts, useStoreCategories } from "@/lib/store-data-hooks";
import { STORE_IDENTITY } from "@/lib/store-identity";

export interface PreviewSettings {
  site_name?: string | null;
  logo_url?: string | null;
  favicon_url?: string | null;
  primary_color?: string | null;
  accent_color?: string | null;
  background_color?: string | null;
  foreground_color?: string | null;
  announcement_text?: string | null;
  announcement_enabled?: boolean | null;
  announcement_bg_color?: string | null;
  hero_title?: string | null;
  hero_subtitle?: string | null;
  hero_image_url?: string | null;
  hero_bg_image?: string | null;
  hero_cta_text?: string | null;
  floating_element_image?: string | null;
  first_order_coupon_enabled?: boolean | null;
  first_order_coupon_code?: string | null;
  first_order_discount_percent?: number | null;

  // Customizer options
  categories_style?: "grid" | "scroll" | "cards" | "pills";
  products_style?: "modern" | "compact" | "bordered" | "glass";
  card_radius?: "rounded-xl" | "rounded-2xl" | "rounded-3xl";
  hero_style?: "gradient" | "image" | "split";
}

interface LiveStorefrontPreviewProps {
  s: PreviewSettings;
  className?: string;
}

export function LiveStorefrontPreview({ s, className = "" }: LiveStorefrontPreviewProps) {
  const [deviceMode, setDeviceMode] = useState<"mobile" | "tablet" | "desktop">("mobile");
  const [activeTab, setActiveTab] = useState<"home" | "categories" | "cart" | "account">("home");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [cartCount, setCartCount] = useState<number>(2);
  const [addedItemName, setAddedItemName] = useState<string | null>(null);

  const primary = s.primary_color || STORE_IDENTITY.greenHsl;
  const accent = s.accent_color || STORE_IDENTITY.rustHsl;
  const bg = s.background_color || STORE_IDENTITY.creamHsl;
  const fg = s.foreground_color || STORE_IDENTITY.inkHsl;
  const annBg = s.announcement_bg_color || primary;

  const catStyle = s.categories_style || "grid";
  const prodStyle = s.products_style || "modern";
  const cardRadius = s.card_radius || "rounded-2xl";

  const handleSimulatedAddToCart = (productName: string) => {
    setCartCount((prev) => prev + 1);
    setAddedItemName(productName);
    setTimeout(() => setAddedItemName(null), 2000);
  };

  const { data: dynamicProducts } = useStoreProducts();
  const { data: dynamicCategories } = useStoreCategories();

  // Dynamic preview products & categories
  const previewProducts = (dynamicProducts ?? []).slice(0, 6);
  const previewCategories = (dynamicCategories ?? []).slice(0, 6);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-card/90 backdrop-blur-md p-2.5 rounded-2xl border border-border/80 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-xs font-black text-foreground flex items-center gap-1.5">
            <span>المعاينة التفاعلية للمتجر</span>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold px-2 py-0.5 rounded-full border border-emerald-500/20">
              مباشر لحظياً ⚡
            </span>
          </span>
        </div>

        {/* Device Switcher */}
        <div className="flex items-center gap-1 bg-secondary/80 p-1 rounded-xl border border-border/60">
          <button
            type="button"
            onClick={() => setDeviceMode("mobile")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              deviceMode === "mobile"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="معاينة شاشة الهاتف (Mobile)"
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">هاتف</span>
          </button>

          <button
            type="button"
            onClick={() => setDeviceMode("tablet")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              deviceMode === "tablet"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="معاينة شاشة التابلت (Tablet)"
          >
            <Tablet className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">تابلت</span>
          </button>

          <button
            type="button"
            onClick={() => setDeviceMode("desktop")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              deviceMode === "desktop"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="معاينة شاشة سطح المكتب (Desktop)"
          >
            <Monitor className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">كمبيوتر</span>
          </button>
        </div>
      </div>

      {/* Frame Container */}
      <div className="flex justify-center transition-all duration-300">
        <div
          className={`relative transition-all duration-300 w-full ${
            deviceMode === "mobile"
              ? "max-w-[360px] rounded-[42px] border-[10px] border-slate-900 dark:border-slate-800 bg-slate-950 p-2 shadow-2xl"
              : deviceMode === "tablet"
                ? "max-w-[580px] rounded-[36px] border-[10px] border-slate-900 dark:border-slate-800 bg-slate-950 p-2 shadow-2xl"
                : "max-w-full rounded-2xl border-2 border-border bg-card p-1 shadow-xl"
          }`}
        >
          {/* Mobile/Tablet Notch */}
          {deviceMode !== "desktop" && (
            <div className="absolute top-0 start-1/2 -translate-x-1/2 h-4 w-28 bg-slate-900 rounded-b-xl z-40 flex items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-slate-950" />
            </div>
          )}

          {/* Toast Notification Simulation */}
          <AnimatePresence>
            {addedItemName && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                className="absolute top-12 start-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white px-3.5 py-1.5 rounded-full shadow-2xl text-[11px] font-black flex items-center gap-1.5 border border-white/20 whitespace-nowrap"
              >
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span>تمت إضافة {addedItemName} للسلة 🛒</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Screen Content */}
          <div
            className={`relative flex flex-col overflow-hidden text-xs font-sans transition-colors duration-300 ${
              deviceMode !== "desktop" ? "rounded-[30px] h-[580px]" : "rounded-xl h-[620px]"
            }`}
            style={{
              background: `hsl(${bg})`,
              color: `hsl(${fg})`,
            }}
            dir="rtl"
          >
            {/* Top Device Status Bar (For Mobile/Tablet) */}
            {deviceMode !== "desktop" && (
              <div className="pt-2 px-4 pb-1 flex justify-between items-center text-[10px] font-bold opacity-75 z-30 select-none">
                <span>9:41</span>
                <div className="flex items-center gap-1.5">
                  <span>5G</span>
                  <div className="w-3.5 h-2 rounded-xs border border-current p-0.5">
                    <div className="h-full w-2 bg-current rounded-2xs" />
                  </div>
                </div>
              </div>
            )}

            {/* 1. Announcement Bar */}
            <AnimatePresence>
              {s.announcement_enabled && s.announcement_text && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-3 py-1.5 text-center text-[10px] sm:text-[11px] font-bold text-white shadow-xs z-20 flex items-center justify-center gap-2"
                  style={{ background: `hsl(${annBg})` }}
                >
                  <span className="truncate">{s.announcement_text}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 2. Store Header */}
            <div
              className="px-3.5 py-2.5 flex items-center justify-between border-b sticky top-0 z-30 backdrop-blur-md"
              style={{
                backgroundColor: `hsl(${bg} / 0.85)`,
                borderColor: `hsl(${fg} / 0.08)`,
              }}
            >
              {/* Logo & Store Name */}
              <div className="flex items-center gap-2 min-w-0">
                {s.logo_url ? (
                  <img
                    src={s.logo_url}
                    alt={s.site_name || "Logo"}
                    className="h-8 w-8 rounded-xl object-cover shadow-xs border border-white/20"
                  />
                ) : (
                  <div
                    className="h-8 w-8 rounded-xl flex items-center justify-center text-white shadow-xs"
                    style={{ background: `hsl(${primary})` }}
                  >
                    <Leaf className="h-4 w-4" />
                  </div>
                )}

                <div className="min-w-0">
                  <span className="font-extrabold text-xs sm:text-sm truncate block leading-tight">
                    {s.site_name || "سوبرماركت الوادي الأخضر"}
                  </span>
                  <span className="text-[9px] text-muted-foreground flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>مفتوح للتوصيل الآن</span>
                  </span>
                </div>
              </div>

              {/* Action Icons */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  className="h-7 w-7 rounded-xl flex items-center justify-center transition-colors"
                  style={{ background: `hsl(${fg} / 0.08)` }}
                >
                  <Search className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("cart")}
                  className="h-7 px-2.5 rounded-xl flex items-center gap-1 text-white relative shadow-sm transition-transform active:scale-95"
                  style={{ background: `hsl(${accent})` }}
                >
                  <ShoppingCart className="h-3.5 w-3.5" />
                  <span className="font-black text-[10px]">{cartCount}</span>
                </button>
              </div>
            </div>

            {/* Main Scrollable View */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3.5 no-scrollbar">
              {activeTab === "home" && (
                <>
                  {/* Hero Banner Section */}
                  <div
                    className={`relative ${cardRadius} p-4 text-white overflow-hidden shadow-md flex flex-col justify-between min-h-[140px] sm:min-h-[160px] transition-all duration-300`}
                    style={{
                      background:
                        s.hero_bg_image || s.hero_image_url
                          ? `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.7)), url(${s.hero_bg_image || s.hero_image_url}) center/cover`
                          : `linear-gradient(135deg, hsl(${primary}), hsl(${accent}))`,
                    }}
                  >
                    <div className="relative z-10 space-y-1.5 max-w-[80%]">
                      <span className="inline-flex items-center gap-1 text-[9px] bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full font-extrabold shadow-xs">
                        <Sparkles className="h-3 w-3 text-amber-300" />
                        <span>طازج يومياً وبأعلى جودة ✨</span>
                      </span>

                      <h2 className="font-black text-sm sm:text-base leading-tight">
                        {s.hero_title || "سوبرماركت الوادي الأخضر — هايبر ماركت أونلاين"}
                      </h2>

                      <p className="text-[10px] sm:text-[11px] opacity-90 line-clamp-2 leading-relaxed font-bold">
                        {s.hero_subtitle ||
                          "تسوّق جميع سلع البقالة، اللحوم البلدية الطازجة، الأجبان والمنظفات بأفضل الأسعار وتوصيل سريع."}
                      </p>
                    </div>

                    {/* Floating Visual Accent */}
                    {s.floating_element_image && (
                      <div className="absolute end-3 bottom-3 h-16 w-16 sm:h-20 sm:w-20 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl hidden sm:block">
                        <img
                          src={s.floating_element_image}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}

                    <div className="pt-3 relative z-10 flex items-center justify-between">
                      <button
                        type="button"
                        className="px-3.5 py-1.5 rounded-xl text-[10px] sm:text-[11px] font-black text-white shadow-lg flex items-center gap-1 hover:scale-105 active:scale-95 transition-all"
                        style={{ background: `hsl(${accent})` }}
                      >
                        <span>{s.hero_cta_text || "تصفح العروض والمنتجات"}</span>
                        <ArrowLeft className="h-3 w-3" />
                      </button>

                      <div className="flex items-center gap-1 opacity-80 text-[9px]">
                        <ShieldCheck className="h-3 w-3 text-emerald-300" />
                        <span>ضمان الاسترجاع</span>
                      </div>
                    </div>
                  </div>

                  {/* Delivery Estimate Bar */}
                  <div
                    className={`p-2.5 ${cardRadius} flex items-center justify-between text-[10px] sm:text-[11px] font-bold border`}
                    style={{
                      background: `hsl(${primary} / 0.08)`,
                      borderColor: `hsl(${primary} / 0.2)`,
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" style={{ color: `hsl(${primary})` }} />
                      <span>وقت التوصيل التقديري لمنطقتك:</span>
                    </div>
                    <span
                      className="px-2 py-0.5 rounded-lg text-white font-black text-[9px]"
                      style={{ background: `hsl(${primary})` }}
                    >
                      30 - 45 دقيقة ⚡
                    </span>
                  </div>

                  {/* Categories Section with Selected Style */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black flex items-center gap-1.5">
                        <span
                          className="h-3 w-1 rounded-full"
                          style={{ background: `hsl(${primary})` }}
                        />
                        <span>الأقسام الرئيسية (نمط: {catStyle})</span>
                      </span>
                      {selectedCategory !== "all" && (
                        <button
                          type="button"
                          onClick={() => setSelectedCategory("all")}
                          className="text-[10px] text-muted-foreground hover:text-foreground font-bold"
                        >
                          عرض الكل
                        </button>
                      )}
                    </div>

                    {catStyle === "scroll" ? (
                      /* Scroll Horizontal Layout */
                      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                        {previewCategories.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setSelectedCategory(c.id)}
                            className={`px-3 py-1.5 ${cardRadius} text-[10px] font-extrabold whitespace-nowrap border shrink-0 transition-all flex items-center gap-1.5`}
                            style={{
                              background:
                                selectedCategory === c.id
                                  ? `hsl(${primary})`
                                  : `hsl(${primary} / 0.08)`,
                              color: selectedCategory === c.id ? "#ffffff" : `hsl(${fg})`,
                              borderColor: `hsl(${primary} / 0.3)`,
                            }}
                          >
                            <span>🌿</span>
                            <span>{c.name}</span>
                          </button>
                        ))}
                      </div>
                    ) : catStyle === "pills" ? (
                      /* Pills Chips Layout */
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedCategory("all")}
                          className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
                            selectedCategory === "all" ? "text-white shadow-xs" : ""
                          }`}
                          style={{
                            background:
                              selectedCategory === "all" ? `hsl(${primary})` : `hsl(${fg} / 0.06)`,
                          }}
                        >
                          الكل
                        </button>
                        {previewCategories.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setSelectedCategory(c.id)}
                            className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
                              selectedCategory === c.id ? "text-white shadow-xs" : ""
                            }`}
                            style={{
                              background:
                                selectedCategory === c.id ? `hsl(${primary})` : `hsl(${fg} / 0.06)`,
                            }}
                          >
                            {c.name}
                          </button>
                        ))}
                      </div>
                    ) : catStyle === "cards" ? (
                      /* Large Visual Cards Layout */
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {previewCategories.slice(0, 4).map((c) => (
                          <div
                            key={c.id}
                            className={`relative h-20 ${cardRadius} overflow-hidden border shadow-xs group cursor-pointer`}
                            style={{ borderColor: `hsl(${fg} / 0.1)` }}
                          >
                            {c.image_url ? (
                              <img
                                src={c.image_url}
                                alt={c.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full bg-secondary flex items-center justify-center text-2xl">
                                🌿
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex items-end p-2 text-white">
                              <span className="text-[10px] font-black">{c.name}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      /* Grid Circular Layout */
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {previewCategories.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setSelectedCategory(c.id)}
                            className={`flex flex-col items-center text-center p-1.5 ${cardRadius} border transition-all ${
                              selectedCategory === c.id
                                ? "ring-2 ring-emerald-500/40 bg-emerald-500/10"
                                : "hover:bg-secondary/40"
                            }`}
                            style={{ borderColor: `hsl(${fg} / 0.08)` }}
                          >
                            <div
                              className="h-10 w-10 rounded-full flex items-center justify-center text-base mb-1 shadow-xs"
                              style={{ background: `hsl(${primary} / 0.1)` }}
                            >
                              🌿
                            </div>
                            <span className="text-[9px] font-extrabold truncate w-full">
                              {c.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* First-order promotion preview intentionally disabled until server-side/RPC enforcement exists. */}

                  {/* Products Grid with Selected Product Style & Radius */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-black flex items-center gap-1">
                        <Flame className="h-4 w-4 text-amber-500 fill-amber-500" />
                        <span>المنتجات المميزة والعروض (نمط: {prodStyle})</span>
                      </h3>
                      <span className="text-[10px] text-muted-foreground font-bold">
                        {previewProducts.length} منتجات
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {previewProducts.map((p) => {
                        const hasDiscount = p.old_price && p.old_price > p.price_per_unit;
                        return (
                          <div
                            key={p.id}
                            className={`p-2 ${cardRadius} border ${
                              prodStyle === "glass"
                                ? "bg-white/40 dark:bg-black/40 backdrop-blur-md"
                                : prodStyle === "bordered"
                                  ? "bg-card border-2 shadow-sm"
                                  : prodStyle === "compact"
                                    ? "bg-card shadow-2xs p-1.5"
                                    : "bg-card shadow-xs hover:shadow-md"
                            } flex flex-col justify-between space-y-2 transition-all`}
                            style={{ borderColor: `hsl(${fg} / 0.1)` }}
                          >
                            {/* Product Top Visual */}
                            <div className="relative aspect-square w-full rounded-xl bg-secondary/80 overflow-hidden">
                              {p.image_url ? (
                                <img
                                  src={p.image_url}
                                  alt={p.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center text-3xl">
                                  🛒
                                </div>
                              )}

                              {hasDiscount && (
                                <span className="absolute top-1.5 start-1.5 bg-red-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md shadow-xs">
                                  خصم
                                </span>
                              )}

                              <div className="absolute top-1.5 end-1.5 h-6 w-6 rounded-full bg-card/80 backdrop-blur-xs flex items-center justify-center shadow-xs">
                                <Heart className="h-3 w-3 text-muted-foreground" />
                              </div>
                            </div>

                            {/* Info */}
                            <div className="space-y-0.5">
                              <div className="font-extrabold text-[10px] sm:text-[11px] truncate">
                                {p.name}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="font-black text-[11px] sm:text-xs"
                                  style={{ color: `hsl(${primary})` }}
                                >
                                  {p.price_per_unit} ج.م
                                </span>
                                {hasDiscount && (
                                  <span className="line-through text-[9px] text-muted-foreground">
                                    {p.old_price} ج.م
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Add to Cart Button */}
                            <button
                              type="button"
                              onClick={() => handleSimulatedAddToCart(p.name)}
                              className={`w-full py-1.5 ${cardRadius} font-black text-[9px] sm:text-[10px] text-white shadow-xs hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-1`}
                              style={{ background: `hsl(${primary})` }}
                            >
                              <ShoppingCart className="h-3 w-3" />
                              <span>إضافة للسلة +</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {activeTab === "categories" && (
                <div className="space-y-3 p-1">
                  <h3 className="font-black text-xs">كافة أقسام الهايبر</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {previewCategories.map((cat) => (
                      <div
                        key={cat.id}
                        className={`p-2.5 ${cardRadius} border bg-card flex items-center gap-2.5 shadow-xs`}
                        style={{ borderColor: `hsl(${fg} / 0.1)` }}
                      >
                        <div
                          className="h-8 w-8 rounded-full flex items-center justify-center text-sm"
                          style={{ background: `hsl(${primary} / 0.1)` }}
                        >
                          🌿
                        </div>
                        <span className="font-bold text-[11px]">{cat.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "cart" && (
                <div className="space-y-3 p-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-xs">سلة المشتريات ({cartCount} عناصر)</h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab("home")}
                      className="text-[10px] text-muted-foreground hover:text-foreground font-bold"
                    >
                      العودة للمتجر
                    </button>
                  </div>

                  <div className="space-y-2">
                    {previewProducts.slice(0, Math.min(cartCount, 3)).map((item) => (
                      <div
                        key={item.id}
                        className={`p-2 ${cardRadius} border bg-card flex items-center justify-between shadow-xs`}
                        style={{ borderColor: `hsl(${fg} / 0.1)` }}
                      >
                        <div className="flex items-center gap-2">
                          <img
                            src={item.image_url || ""}
                            alt=""
                            className="h-10 w-10 rounded-lg object-cover bg-secondary"
                          />
                          <div>
                            <div className="font-bold text-[10px]">{item.name}</div>
                            <div
                              className="font-black text-[10px]"
                              style={{ color: `hsl(${primary})` }}
                            >
                              {item.price_per_unit} ج.م
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold bg-secondary px-2 py-0.5 rounded-md">
                          1 قطعة
                        </span>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    className={`w-full py-2.5 ${cardRadius} text-white font-black text-xs shadow-md mt-4`}
                    style={{ background: `hsl(${accent})` }}
                  >
                    متابعة الشراء والدفع ←
                  </button>
                </div>
              )}

              {activeTab === "account" && (
                <div className="space-y-3 p-2 text-center">
                  <div
                    className="h-14 w-14 rounded-full mx-auto flex items-center justify-center text-white text-xl shadow-md"
                    style={{ background: `hsl(${primary})` }}
                  >
                    <User className="h-7 w-7" />
                  </div>
                  <h3 className="font-black text-xs">حساب العميل</h3>
                  <p className="text-[10px] text-muted-foreground">
                    تتبع الطلبات السابقة وإعادة الطلب بنقرة واحدة
                  </p>
                </div>
              )}
            </div>

            {/* Bottom App Navigation Bar */}
            <div
              className="p-2 border-t flex justify-around items-center text-[9px] font-bold z-30 select-none"
              style={{
                borderColor: `hsl(${fg} / 0.08)`,
                backgroundColor: `hsl(${bg})`,
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab("home")}
                className="flex flex-col items-center gap-0.5 transition-colors"
                style={{ color: activeTab === "home" ? `hsl(${primary})` : `hsl(${fg} / 0.6)` }}
              >
                <Store className="h-4 w-4" />
                <span>الرئيسية</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("categories")}
                className="flex flex-col items-center gap-0.5 transition-colors"
                style={{
                  color: activeTab === "categories" ? `hsl(${primary})` : `hsl(${fg} / 0.6)`,
                }}
              >
                <Layers className="h-4 w-4" />
                <span>الأقسام</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("cart")}
                className="flex flex-col items-center gap-0.5 transition-colors relative"
                style={{ color: activeTab === "cart" ? `hsl(${primary})` : `hsl(${fg} / 0.6)` }}
              >
                <ShoppingCart className="h-4 w-4" />
                <span>السلة</span>
                {cartCount > 0 && (
                  <span
                    className="absolute -top-1 -end-1 text-white text-[7px] font-black h-3 w-3 rounded-full flex items-center justify-center"
                    style={{ background: `hsl(${accent})` }}
                  >
                    {cartCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("account")}
                className="flex flex-col items-center gap-0.5 transition-colors"
                style={{
                  color: activeTab === "account" ? `hsl(${primary})` : `hsl(${fg} / 0.6)`,
                }}
              >
                <User className="h-4 w-4" />
                <span>حسابي</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
