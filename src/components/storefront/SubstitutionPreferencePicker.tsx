import { useState } from "react";
import { PhoneCall, Sparkles, Ban, Check, ShieldCheck, HelpCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type SubstitutionPreference = "call_me" | "auto_best" | "do_not_substitute";

interface SubstitutionOption {
  id: SubstitutionPreference;
  title: string;
  badge?: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  iconBg: string;
}

const SUBSTITUTION_OPTIONS: SubstitutionOption[] = [
  {
    id: "call_me",
    title: "تواصل معي هاتفياً لاختيار البديل",
    badge: "الأكثر طلباً 📞",
    description: "يقوم مسؤول التجهيز بالاتصال بك قبل إغلاق الطلب لاقتراح أفضل المنتجات المتوفرة.",
    icon: PhoneCall,
    iconColor: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-500/10 dark:bg-emerald-500/20",
  },
  {
    id: "auto_best",
    title: "اختر أفضل بديل تلقائياً بنفس الجودة والسعر",
    badge: "توفير للوقت ⚡",
    description: "نختار لك بديلاً مطابقاً لأعلى معايير الجودة وبنفس السعر أو أقل مع ضمان الرضا.",
    icon: Sparkles,
    iconColor: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-500/10 dark:bg-amber-500/20",
  },
  {
    id: "do_not_substitute",
    title: "لا تقم بالتبديل واحذف المنتج من الفاتورة",
    description: "في حال عدم توفر أي صنف، يتم حذفه مباشرة وخصم قيمته تلقائياً من الإجمالي.",
    icon: Ban,
    iconColor: "text-rose-600 dark:text-rose-400",
    iconBg: "bg-rose-500/10 dark:bg-rose-500/20",
  },
];

interface SubstitutionPreferencePickerProps {
  value?: SubstitutionPreference;
  onChange?: (preference: SubstitutionPreference) => void;
  className?: string;
}

export function SubstitutionPreferencePicker({
  value = "call_me",
  onChange,
  className = "",
}: SubstitutionPreferencePickerProps) {
  const [selected, setSelected] = useState<SubstitutionPreference>(value);

  const handleSelect = (id: SubstitutionPreference) => {
    setSelected(id);
    onChange?.(id);
  };

  return (
    <Card className={cn("rounded-3xl border-border p-4 sm:p-5 shadow-xs space-y-3.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-display text-sm sm:text-base font-black text-foreground">
              تفضيلات استبدال المنتجات (في حال نفاد أي صنف)
            </h3>
            <p className="text-[11px] text-muted-foreground font-semibold">
              اختر كيف تفضل أن يتعامل فريق التجهيز مع أي منتج قد ينفد أثناء تحضير طلبك
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-3">
        {SUBSTITUTION_OPTIONS.map((opt) => {
          const isSelected = selected === opt.id;
          const Icon = opt.icon;

          return (
            <div
              key={opt.id}
              onClick={() => handleSelect(opt.id)}
              className={cn(
                "relative flex flex-col justify-between p-3.5 rounded-2xl border-2 transition-all cursor-pointer select-none",
                isSelected
                  ? "border-primary bg-primary/5 shadow-xs"
                  : "border-border/80 bg-card hover:border-primary/40 hover:bg-secondary/40",
              )}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div
                    className={cn(
                      "grid h-8 w-8 place-items-center rounded-xl",
                      opt.iconBg,
                      opt.iconColor,
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  <div
                    className={cn(
                      "grid h-5 w-5 place-items-center rounded-full border transition-all",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/30 bg-background",
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-black text-foreground leading-snug">
                      {opt.title}
                    </span>
                  </div>
                  {opt.badge && (
                    <span className="inline-block mt-1 text-[9px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-md">
                      {opt.badge}
                    </span>
                  )}
                </div>

                <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">
                  {opt.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
