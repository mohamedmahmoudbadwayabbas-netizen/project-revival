import { useEffect, useRef, useState } from "react";
import { Truck, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useTheme } from "@/lib/theme-context";

type Banner = {
  id: string;
  image_url: string | null;
  title: string | null;
  subtitle: string | null;
  cta_text: string | null;
  link_url: string | null;
};

export function HeroCarousel() {
  const theme = useTheme();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [idx, setIdx] = useState(0);

  // Hero banners are no longer a standalone table in the live schema.
  // The storefront therefore uses the theme/store-settings fallback below.

  const fallbackImages = theme.hero_grid_images.length > 0 ? theme.hero_grid_images : [""];
  const slides: Banner[] =
    banners.length > 0
      ? banners
      : fallbackImages.map((url, i) => ({
          id: `fb-${i}`,
          image_url: url || null,
          title: theme.hero_title || "الوادي الأخضر — سوبرماركت عائلتك 🛒",
          subtitle:
            theme.hero_subtitle ||
            "أجود السلع التموينية والبقالة واللحوم والألبان بأفضل الأسعار وتوصيل فوري ⚡",
          cta_text: theme.hero_cta_text || "تسوّق الآن 🛒",
          link_url: "#all-products",
        }));

  // Respect prefers-reduced-motion
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Auto-advance with pause on user interaction, resume 2s after last interaction
  const pauseUntilRef = useRef<number>(0);
  const pauseNow = () => {
    pauseUntilRef.current = Date.now() + 2000;
  };
  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = reducedMotion ? 12000 : 6000;
    const t = setInterval(() => {
      if (Date.now() < pauseUntilRef.current) return;
      setIdx((i) => (i + 1) % slides.length);
    }, interval);
    return () => clearInterval(t);
  }, [slides.length, reducedMotion]);

  // Preload the next slide image once the first has loaded
  useEffect(() => {
    if (slides.length < 2) return;
    const next = slides[(idx + 1) % slides.length];
    if (!next?.image_url) return;
    const img = new Image();
    img.src = `${next.image_url}${next.image_url.includes("?") ? "&" : "?"}w=1400&q=80&fm=webp`;
  }, [idx, slides]);

  // Touch swipe support
  const touchStartX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    pauseNow();
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 40) return;
    // RTL: swipe right → previous, swipe left → next
    setIdx((i) => {
      const delta = dx > 0 ? -1 : 1;
      return (((i + delta) % slides.length) + slides.length) % slides.length;
    });
  };

  if (slides.length === 0) return null;
  const current = slides[idx];
  const goTo = (i: number) => setIdx(((i % slides.length) + slides.length) % slides.length);

  const title = current.title ?? "الوادي الأخضر";
  const subtitle = current.subtitle ?? "طازج يومياً.. جودة استثنائية وتوصيل فوري";
  const ctaText = current.cta_text ?? "تسوّق الآن";

  return (
    <div className="relative px-3 pt-6 sm:px-6">
      <div
        className="relative mx-auto max-w-6xl overflow-hidden shadow-[0_25px_60px_-15px_rgba(4,120,87,0.35)] transition-all duration-500"
        style={{ borderRadius: (theme.card_radius_px || 16) + 12 }}
      >
        <div
          className="relative aspect-[4/5] w-full overflow-hidden bg-[#032414] sm:aspect-[16/9] md:aspect-[21/9]"
          dir="rtl"
          onMouseEnter={pauseNow}
          onMouseMove={pauseNow}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {/* SVG background: flowing emerald valley waves (matches reference) */}
          <svg
            viewBox="0 0 1440 800"
            preserveAspectRatio="xMidYMid slice"
            className="absolute inset-0 h-full w-full"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="hc-bg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0b3b26" />
                <stop offset="55%" stopColor="#0d5233" />
                <stop offset="100%" stopColor="#08331f" />
              </linearGradient>
              <linearGradient id="hc-w1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0f5a37" />
                <stop offset="100%" stopColor="#1a7a4a" />
              </linearGradient>
              <linearGradient id="hc-w2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0a4a2c" />
                <stop offset="100%" stopColor="#166b3f" />
              </linearGradient>
              <linearGradient id="hc-w3" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#083a22" />
                <stop offset="60%" stopColor="#0d5030" />
                <stop offset="100%" stopColor="#2a7d3d" />
              </linearGradient>
              <linearGradient id="hc-w4" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#052818" />
                <stop offset="100%" stopColor="#0e4a2c" />
              </linearGradient>
              <radialGradient id="hc-glow" cx="50%" cy="45%" r="55%">
                <stop offset="0%" stopColor="#34d399" stopOpacity="0.22" />
                <stop offset="70%" stopColor="#10b981" stopOpacity="0" />
              </radialGradient>
            </defs>

            <rect width="1440" height="800" fill="url(#hc-bg)" />
            <rect width="1440" height="800" fill="url(#hc-glow)" />

            <path
              d="M0,360 C240,300 420,430 720,410 C1020,390 1220,290 1440,320 L1440,800 L0,800 Z"
              fill="url(#hc-w1)"
              opacity="0.55"
            />
            <path
              d="M0,470 C260,410 460,560 760,520 C1060,480 1240,400 1440,430 L1440,800 L0,800 Z"
              fill="url(#hc-w2)"
              opacity="0.75"
            />
            <path
              d="M0,580 C260,510 500,660 800,610 C1100,560 1260,520 1440,540 L1440,800 L0,800 Z"
              fill="url(#hc-w3)"
              opacity="0.9"
            />
            <path
              d="M0,690 C260,620 520,760 820,700 C1120,640 1280,660 1440,670 L1440,800 L0,800 Z"
              fill="url(#hc-w4)"
            />
          </svg>

          {/* Optional overlay image (very soft) */}
          {slides.map((s, i) =>
            s.image_url ? (
              <img
                key={s.id}
                src={`${s.image_url}${s.image_url.includes("?") ? "&" : "?"}w=1400&q=80&fm=webp`}
                alt={s.title ?? "سوبرماركت الوادي الأخضر"}
                loading={i === 0 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : "auto"}
                decoding="async"
                className={`absolute inset-0 h-full w-full object-cover mix-blend-overlay ${reducedMotion ? "transition-none" : "transition-opacity duration-1000"} ${
                  i === idx ? "opacity-25" : "opacity-0"
                }`}
              />
            ) : null,
          )}

          {/* Center content */}
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 p-5 text-center sm:gap-4 sm:p-10 md:p-16">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-bold text-white/95 shadow-sm backdrop-blur-md sm:text-xs">
              <Sparkles className="h-3.5 w-3.5 text-[#FFD27A]" />
              جودة أصيلة وتوصيل سريع
              <Truck className="h-3.5 w-3.5" />
            </div>

            <h2 className="font-display text-3xl font-black leading-tight tracking-tight text-white drop-shadow-[0_4px_14px_rgba(0,0,0,0.45)] sm:text-5xl md:text-7xl">
              {title}
            </h2>

            <p className="max-w-md text-sm font-medium leading-relaxed tracking-wide text-emerald-50/90 drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)] sm:max-w-xl sm:text-lg md:text-xl">
              {subtitle}
            </p>

            <button
              onClick={() =>
                document.getElementById("all-products")?.scrollIntoView({ behavior: "smooth" })
              }
              className="mt-3 rounded-full bg-primary px-8 py-3 text-sm font-black tracking-wide text-primary-foreground shadow-lg transition-all duration-300 hover:opacity-90 hover:scale-105 active:scale-95 sm:mt-4 sm:px-10 sm:py-3.5 sm:text-base border border-white/20"
            >
              {ctaText}
            </button>
          </div>

          {/* Nav */}
          {slides.length > 1 && (
            <>
              <button
                aria-label="السابق"
                onClick={() => goTo(idx - 1)}
                className="absolute end-3 top-1/2 z-20 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-border bg-card text-foreground shadow-lg transition hover:bg-primary hover:text-primary-foreground sm:end-4"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <button
                aria-label="التالي"
                onClick={() => goTo(idx + 1)}
                className="absolute start-3 top-1/2 z-20 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-border bg-card text-foreground shadow-lg transition hover:bg-primary hover:text-primary-foreground sm:start-4"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <div className="absolute inset-x-0 bottom-4 z-20 flex justify-center gap-1.5">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    aria-label={`الشريحة ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === idx ? "w-6 bg-white" : "w-1.5 bg-white/40"
                    }`}
                  />
                ))}
              </div>
            </>
          )}

          <div className="pointer-events-none absolute bottom-4 left-4 select-none text-xl text-white/10">
            ✦
          </div>
        </div>
      </div>
    </div>
  );
}
