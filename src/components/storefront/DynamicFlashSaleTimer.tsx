import React, { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { FlashSaleTimerConfig } from "@/types/layout-config";
import { Zap, Clock, ArrowLeft } from "lucide-react";

export function DynamicFlashSaleTimer({ config }: { config?: FlashSaleTimerConfig }) {
  const isEnabled = Boolean(config?.enabled);
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>({
    hours: 5,
    minutes: 42,
    seconds: 19,
  });

  useEffect(() => {
    if (!isEnabled || !config) return;
    const target = config.endTime
      ? new Date(config.endTime).getTime()
      : Date.now() + 5 * 3600 * 1000;

    const interval = setInterval(() => {
      const diff = Math.max(0, target - Date.now());
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ hours, minutes, seconds });
    }, 1000);

    return () => clearInterval(interval);
  }, [isEnabled, config]);

  if (!isEnabled || !config) return null;

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <section className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-l from-amber-500/10 via-card to-card p-4 sm:p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Title and Badge */}
        <div className="flex items-center gap-3 text-right">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <Zap className="h-5 w-5 fill-amber-500 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-foreground font-display">
                {config.title}
              </h3>
              {config.discountBadge && (
                <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black text-white shadow-xs">
                  {config.discountBadge}
                </span>
              )}
            </div>
            {config.subtitle && (
              <p className="text-xs text-muted-foreground font-medium mt-0.5">{config.subtitle}</p>
            )}
          </div>
        </div>

        {/* Countdown timer blocks and CTA */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5" dir="ltr">
            <div className="flex flex-col items-center bg-foreground text-background px-2.5 py-1.5 rounded-xl min-w-[38px] text-center shadow-xs">
              <span className="text-sm font-black font-mono">{pad(timeLeft.hours)}</span>
              <span className="text-[9px] opacity-70">ساعة</span>
            </div>
            <span className="font-bold text-foreground">:</span>
            <div className="flex flex-col items-center bg-foreground text-background px-2.5 py-1.5 rounded-xl min-w-[38px] text-center shadow-xs">
              <span className="text-sm font-black font-mono">{pad(timeLeft.minutes)}</span>
              <span className="text-[9px] opacity-70">دقيقة</span>
            </div>
            <span className="font-bold text-foreground">:</span>
            <div className="flex flex-col items-center bg-amber-500 text-white px-2.5 py-1.5 rounded-xl min-w-[38px] text-center shadow-xs">
              <span className="text-sm font-black font-mono">{pad(timeLeft.seconds)}</span>
              <span className="text-[9px] opacity-90">ثانية</span>
            </div>
          </div>

          <Link
            to="/categories"
            className="rounded-2xl bg-amber-500 hover:bg-amber-600 px-4 py-2 text-xs font-black text-white shadow-xs transition-colors flex items-center gap-1 shrink-0"
          >
            <span>اغتنم الخصم</span>
            <ArrowLeft className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
