import React from "react";
import { Button } from "@/components/ui/button";
import { Scale, Sparkles, Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/cart-context";
import { WEIGHT_OPTIONS, formatWeightLabel, calculateEstimatedPrice } from "@/lib/cart-context";

interface WeightSelectorProps {
  product: Product;
  selectedWeight: number; // in KG (e.g. 0.25, 0.5, 0.75, 1, 1.5)
  onWeightChange: (weight: number, label: string, estimatedPrice: number) => void;
  compact?: boolean;
  showEstimatedPrice?: boolean;
  className?: string;
}

export function WeightSelector({
  product,
  selectedWeight,
  onWeightChange,
  compact = false,
  showEstimatedPrice = true,
  className = "",
}: WeightSelectorProps) {
  const currentEstimatedPrice = calculateEstimatedPrice(product, selectedWeight);

  const handleSelect = (val: number, label: string) => {
    const est = calculateEstimatedPrice(product, val);
    onWeightChange(val, label, est);
  };

  const handleStep = (delta: number) => {
    const next = Math.max(0.1, +(selectedWeight + delta).toFixed(3));
    const label = formatWeightLabel(next);
    const est = calculateEstimatedPrice(product, next);
    onWeightChange(next, label, est);
  };

  if (compact) {
    return (
      <div className={cn("flex flex-col gap-1.5", className)}>
        <div className="flex items-center justify-between gap-1">
          <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
            <Scale className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            اختر الوزن:
          </span>
          {showEstimatedPrice && (
            <span dir="ltr" className="text-[11px] font-black text-primary tabular-nums">
              ≈ {currentEstimatedPrice.toFixed(2)} ج.م
            </span>
          )}
        </div>
        <div dir="ltr" className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar tabular-nums">
          {WEIGHT_OPTIONS.map((opt) => {
            const isSelected = Math.abs(selectedWeight - opt.value) < 0.01;
            return (
              <Button
                key={opt.value}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(opt.value, opt.label);
                }}
                className={cn(
                  "px-2 py-1 rounded-lg text-[10px] font-bold border transition-all shrink-0 active:scale-95",
                  isSelected
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                    : "bg-secondary/70 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 text-foreground border-border/60 dark:hover:bg-emerald-950/40",
                )}
              >
                {opt.label}
              </Button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/80 bg-card p-4 space-y-3 shadow-xs",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Scale className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground">
              تحديد وزن الصنف (بالجرام / الكيلو)
            </h4>
            <p className="text-[10px] text-muted-foreground font-medium">
              سعر الكيلو: <bdi dir="ltr" className="tabular-nums">{product.price_per_unit.toFixed(2)} EGP</bdi>
            </p>
          </div>
        </div>

        {showEstimatedPrice && (
          <div className="text-end">
            <div className="text-[10px] font-bold text-muted-foreground">السعر التقديري:</div>
            <div dir="ltr" className="font-display text-base font-black text-primary tabular-nums">
              {currentEstimatedPrice.toFixed(2)}{" "}
              <span className="text-[10px] font-bold text-muted-foreground">ج.م</span>
            </div>
          </div>
        )}
      </div>

      {/* أزرار خيارات الوزن المسبقة */}
      <div dir="ltr" className="grid grid-cols-5 gap-1.5 sm:gap-2 tabular-nums">
        {WEIGHT_OPTIONS.map((opt) => {
          const isSelected = Math.abs(selectedWeight - opt.value) < 0.01;
          const optPrice = calculateEstimatedPrice(product, opt.value);
          return (
            <Button
              key={opt.value}
              type="button"
              onClick={() => handleSelect(opt.value, opt.label)}
              className={cn(
                "flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all active:scale-95",
                isSelected
                  ? "border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20 dark:bg-emerald-950/60 dark:text-emerald-100 dark:border-emerald-500 shadow-xs"
                  : "border-border/70 bg-secondary/30 hover:border-emerald-400/50 hover:bg-secondary text-foreground",
              )}
            >
              <span className="text-xs font-black">{opt.label}</span>
              <span className="text-[9px] font-bold text-muted-foreground mt-0.5">
                {optPrice.toFixed(1)} ج
              </span>
            </Button>
          );
        })}
      </div>

      {/* محدد دقيق بالأزرار والجرام */}
      <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/50">
        <span className="text-[11px] font-bold text-muted-foreground">
          الوزن المحدد:{" "}
          <strong dir="ltr" className="inline-block text-foreground tabular-nums">{formatWeightLabel(selectedWeight)}</strong>
        </span>

        <div dir="ltr" className="flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 p-1 tabular-nums">
          <Button
            type="button"
            aria-label="تقليل 250 جم"
            onClick={() => handleStep(-0.25)}
            className="grid h-7 w-7 place-items-center rounded-full hover:bg-background text-foreground transition-all active:scale-90"
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="min-w-16 text-center text-xs font-black text-foreground">
            {formatWeightLabel(selectedWeight)}
          </span>
          <Button
            type="button"
            aria-label="زيادة 250 جم"
            onClick={() => handleStep(0.25)}
            className="grid h-7 w-7 place-items-center rounded-full hover:bg-background text-foreground transition-all active:scale-90"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
