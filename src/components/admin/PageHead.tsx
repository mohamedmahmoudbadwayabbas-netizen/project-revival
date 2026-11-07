import type { ComponentType, ReactNode } from "react";

export function PageHead({
  icon: Icon,
  eyebrow,
  title,
  desc,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  eyebrow: string;
  title: string;
  desc: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-start gap-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-sidebar text-sidebar-primary shadow-lg">
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <div className="text-xs font-semibold lux-gold-text">{eyebrow}</div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
        </div>
      </div>
      {children && <div className="flex gap-2">{children}</div>}
    </div>
  );
}
