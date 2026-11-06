import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Friendly empty state — centered icon on primary/20 surface, Tajawal display font.
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      dir="rtl"
      className={cn(
        "mx-auto flex max-w-md flex-col items-center gap-4 rounded-3xl border border-border/60 bg-card px-6 py-12 text-center shadow-sm",
        className,
      )}
    >
      <div className="grid h-20 w-20 place-items-center rounded-3xl bg-primary/15 text-primary">
        {icon}
      </div>
      <div className="space-y-1.5">
        <h3 className="font-display text-xl font-black text-foreground">{title}</h3>
        {description && (
          <p className="font-display text-sm font-medium text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}
