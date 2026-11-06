import { cn } from "@/lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  shimmer?: boolean;
}

export function Skeleton({ className, shimmer = true, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-muted/70",
        shimmer ? "skeleton-shimmer" : "animate-pulse",
        className,
      )}
      {...props}
    />
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3 w-full animate-pulse">
      <div className="h-10 w-full rounded-2xl bg-muted/80" />
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div
          key={rIdx}
          className="flex items-center gap-3 p-3 rounded-2xl border border-border/40 bg-card/60"
        >
          {Array.from({ length: cols }).map((_, cIdx) => (
            <Skeleton key={cIdx} className="h-6 flex-1 rounded-xl" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="rounded-3xl border border-border/50 bg-card p-4 space-y-3">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-5 w-3/4 rounded-xl" />
          <Skeleton className="h-4 w-1/2 rounded-xl" />
          <div className="flex justify-between items-center pt-2">
            <Skeleton className="h-6 w-20 rounded-xl" />
            <Skeleton className="h-8 w-24 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}
