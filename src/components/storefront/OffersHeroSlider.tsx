import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ArrowLeft, Sparkles, Tag, Truck } from "lucide-react";
import type { OffersSlide, OffersSlideAction } from "@/lib/storefront-home";
import { cn } from "@/lib/utils";

interface OffersHeroSliderProps {
  slides: OffersSlide[];
  onAction: (action: OffersSlideAction) => void;
}

export function OffersHeroSlider({ slides, onAction }: OffersHeroSliderProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (slides.length <= 1 || isPaused) return;
    const intervalMs = reducedMotion ? 10000 : 5200;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [slides.length, isPaused, reducedMotion]);

  if (slides.length === 0) return null;

  const safeIdx = activeIndex % slides.length;
  const current = slides[safeIdx];

  const goTo = (next: number) => {
    setActiveIndex(((next % slides.length) + slides.length) % slides.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current != null) {
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      if (Math.abs(dx) >= 40) {
        // RTL swipe direction: swipe right -> next, swipe left -> previous
        goTo(dx > 0 ? safeIdx + 1 : safeIdx - 1);
      }
      touchStartX.current = null;
    }
    window.setTimeout(() => setIsPaused(false), 1800);
  };

  const SlideBadgeIcon =
    current.accentTone === "amber"
      ? Tag
      : current.id === "slide-nawat-assistant"
        ? Sparkles
        : Truck;

  return (
    <section
      aria-label="عروض ومميزات المتجر"
      aria-roledescription="carousel"
      className="relative mx-auto max-w-[1320px] overflow-hidden rounded-2xl border border-border/60 bg-primary-dark text-white shadow-elegant sm:rounded-3xl"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      dir="rtl"
    >
      <div className="relative min-h-[215px] w-full sm:min-h-[300px] lg:min-h-[340px]">
        {/* Background Slide Images with smooth crossfade */}
        {slides.map((slide, i) => {
          const isCurrent = i === safeIdx;
          return (
            <div
              key={slide.id}
              aria-hidden={!isCurrent}
              className={cn(
                "absolute inset-0",
                reducedMotion ? "transition-none" : "transition-opacity duration-500 ease-out",
                isCurrent ? "opacity-100" : "pointer-events-none opacity-0",
              )}
            >
              <img
                src={slide.imageUrl}
                alt={slide.title}
                loading={i === 0 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : "auto"}
                decoding="async"
                className="h-full w-full object-cover object-center"
              />
              {/* Strong RTL high-contrast directional scrim for guaranteed WCAG AA legibility */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(270deg, rgba(6, 52, 36, 0.94) 0%, rgba(6, 52, 36, 0.82) 44%, rgba(6, 52, 36, 0.36) 78%, rgba(6, 52, 36, 0.16) 100%)",
                }}
              />
            </div>
          );
        })}

        {/* Slide Content */}
        <div className="relative z-10 flex min-h-[225px] max-w-[88%] flex-col justify-center gap-2.5 px-5 pb-10 pt-5 sm:min-h-[300px] sm:max-w-[65%] sm:gap-4 sm:px-16 sm:py-12 lg:min-h-[340px] lg:max-w-[58%]">
          <span
            className={cn(
              "inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-extrabold shadow-xs sm:text-xs",
              current.accentTone === "amber"
                ? "bg-amber-400 text-slate-950"
                : "bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-xs",
            )}
          >
            <SlideBadgeIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{current.badge}</span>
          </span>

          <h1
            id="home-hero-title"
            className="font-display text-xl font-black leading-snug tracking-tight text-white sm:text-3xl lg:text-4xl"
          >
            {current.title}
          </h1>

          <p className="line-clamp-2 max-w-lg text-xs leading-6 text-emerald-50/90 sm:text-sm sm:leading-7 lg:text-base">
            {current.subtitle}
          </p>

          <div className="pt-0.5 sm:pt-1">
            <button
              type="button"
              onClick={() => onAction(current.action)}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-black text-emerald-950 shadow-card transition-transform hover:bg-emerald-50 active:scale-95 sm:min-h-11 sm:px-6 sm:text-sm"
            >
              <span>{current.ctaText}</span>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Navigation Arrows (Desktop & Tablet) */}
        {slides.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => goTo(safeIdx - 1)}
              aria-label="العرض السابق"
              className="absolute start-3 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/25 bg-emerald-950/60 text-white backdrop-blur-xs transition hover:bg-emerald-900 sm:grid"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => goTo(safeIdx + 1)}
              aria-label="العرض التالي"
              className="absolute end-3 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/25 bg-emerald-950/60 text-white backdrop-blur-xs transition hover:bg-emerald-900 sm:grid"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>

            {/* Pagination Indicators */}
            <div
              className="absolute inset-x-0 bottom-3 z-20 flex items-center justify-center gap-1.5 sm:bottom-4"
              role="tablist"
              aria-label="شرائح العروض"
            >
              {slides.map((slide, i) => (
                <button
                  key={slide.id}
                  type="button"
                  role="tab"
                  aria-selected={i === safeIdx}
                  aria-label={`الانتقال إلى ${slide.title}`}
                  onClick={() => goTo(i)}
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    i === safeIdx ? "w-7 bg-white" : "w-2 bg-white/45 hover:bg-white/75",
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
