// Skeleton loaders — pulsing rectangles matching real content dimensions.
// Uses only design tokens (bg-secondary / bg-muted) — no hardcoded colors.
import { cn } from "@/lib/utils";

export function SkeletonBox({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-2xl bg-secondary/70", className)} />;
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card p-0">
      <SkeletonBox className="aspect-square w-full rounded-none" />
      <div className="space-y-2 p-3">
        <SkeletonBox className="h-3 w-3/4" />
        <SkeletonBox className="h-3 w-1/2" />
        <div className="flex items-center justify-between pt-1">
          <SkeletonBox className="h-4 w-14" />
          <SkeletonBox className="h-9 w-9 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function CategoryChipSkeleton() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-border/60 bg-card p-3 min-w-[80px]">
      <SkeletonBox className="h-11 w-11 rounded-xl" />
      <SkeletonBox className="h-3 w-10" />
    </div>
  );
}

export function HomePageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pt-4 space-y-8" dir="rtl">
      <SkeletonBox className="h-40 w-full rounded-3xl" />
      <SkeletonBox className="h-10 w-full rounded-2xl" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <CategoryChipSkeleton key={i} />
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function ProductShelvesSkeleton() {
  return (
    <div className="space-y-8" aria-label="جارٍ تحميل المنتجات">
      {Array.from({ length: 2 }).map((_, shelfIndex) => (
        <div key={shelfIndex} className="space-y-4">
          <div className="flex items-center gap-3 border-b border-border pb-3">
            <SkeletonBox className="h-9 w-9 rounded-lg" />
            <div className="flex-1 space-y-2"><SkeletonBox className="h-4 w-40" /><SkeletonBox className="h-3 w-56 max-w-full" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => <ProductCardSkeleton key={index} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProductPageSkeleton() {
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="mx-auto max-w-2xl px-4 py-5 space-y-5">
        <SkeletonBox className="h-5 w-32" />
        <SkeletonBox className="aspect-square w-full rounded-3xl" />
        <div className="rounded-2xl border bg-card p-5 space-y-3">
          <SkeletonBox className="h-6 w-2/3" />
          <SkeletonBox className="h-10 w-40" />
          <SkeletonBox className="h-3 w-full" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonBox key={i} className="h-20" />
          ))}
        </div>
        <SkeletonBox className="h-14 w-full rounded-2xl" />
      </div>
    </div>
  );
}

export function CartItemSkeleton() {
  return (
    <div className="flex gap-3 rounded-2xl border border-border bg-card p-3">
      <SkeletonBox className="h-20 w-20 shrink-0 rounded-xl" />
      <div className="flex-1 space-y-2">
        <SkeletonBox className="h-4 w-3/4" />
        <SkeletonBox className="h-3 w-1/3" />
        <div className="flex items-center justify-between pt-2">
          <SkeletonBox className="h-8 w-24 rounded-full" />
          <SkeletonBox className="h-4 w-16" />
        </div>
      </div>
    </div>
  );
}
