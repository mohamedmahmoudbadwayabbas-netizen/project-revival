import { Store } from "lucide-react";
import { BRAND_NAME_AR } from "@/lib/brand";

/** Swappable store logo — replace this one component when the final logo is ready. */
export function StoreLogo({
  name = BRAND_NAME_AR,
  inverted = false,
}: {
  name?: string;
  inverted?: boolean;
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2.5">
      <span
        className={
          inverted
            ? "grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-foreground text-primary-dark"
            : "grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"
        }
      >
        <Store className="h-5 w-5" aria-hidden="true" />
      </span>
      <strong className="truncate text-lg font-bold">{name}</strong>
    </span>
  );
}
