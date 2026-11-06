import React from "react";
import { PhoneCall, Zap, Ban, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SubstitutionPreference } from "@/lib/cart-context";
import { cn } from "@/lib/utils";

interface ItemSubstitutionSelectorProps {
  value?: SubstitutionPreference;
  onChange: (pref: SubstitutionPreference) => void;
  compact?: boolean;
}

export function ItemSubstitutionSelector({
  value = "call_me",
  onChange,
  compact = true,
}: ItemSubstitutionSelectorProps) {
  const options: {
    id: SubstitutionPreference;
    label: string;
    shortLabel: string;
    icon: React.ReactNode;
    colorClass: string;
    activeBg: string;
  }[] = [
    {
      id: "call_me",
      label: "اتصال هاتفي لاختيار البديل",
      shortLabel: "اتصال عند النفاد",
      icon: <PhoneCall className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />,
      colorClass:
        "text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40",
      activeBg: "bg-emerald-500/15",
    },
    {
      id: "auto_best",
      label: "اختيار أفضل بديل تلقائياً",
      shortLabel: "بديل تلقائي",
      icon: <Zap className="h-3 w-3 text-amber-600 dark:text-amber-400" />,
      colorClass:
        "text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40",
      activeBg: "bg-amber-500/15",
    },
    {
      id: "do_not_substitute",
      label: "حذف الصنف إذا لم يتوفر",
      shortLabel: "عدم الاستبدال",
      icon: <Ban className="h-3 w-3 text-rose-600 dark:text-rose-400" />,
      colorClass:
        "text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40",
      activeBg: "bg-rose-500/15",
    },
  ];

  const current = options.find((o) => o.id === value) || options[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="تغيير تفضيل الاستبدال لهذا الصنف"
          className={cn(
            "flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-bold transition-all hover:opacity-90 active:scale-95",
            current.colorClass,
          )}
        >
          {current.icon}
          <span>{compact ? current.shortLabel : current.label}</span>
          <ChevronDown className="h-2.5 w-2.5 opacity-60 ms-0.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 p-1 text-xs text-right">
        <div className="px-2 py-1 text-[10px] font-extrabold text-muted-foreground border-b border-border/50 mb-1">
          تفضيل الاستبدال في حال نفاد الصنف:
        </div>
        {options.map((opt) => (
          <DropdownMenuItem
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={cn(
              "flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 cursor-pointer font-bold",
              value === opt.id && opt.activeBg,
            )}
          >
            <div className="flex items-center gap-1.5">
              {opt.icon}
              <span className="text-xs">{opt.label}</span>
            </div>
            {value === opt.id && <span className="text-[10px] text-primary font-black">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
