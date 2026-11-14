import { useEffect, useRef, useState } from "react";

export function AnimatedCounter({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const safeValue = Number.isFinite(value) ? value : 0;
  const [current, setCurrent] = useState(safeValue);
  const currentRef = useRef(safeValue);

  useEffect(() => {
    const startVal = currentRef.current;
    const endVal = safeValue;
    if (startVal === endVal) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      currentRef.current = endVal;
      setCurrent(endVal);
      return;
    }

    let frameId: number;
    const startTime = performance.now();
    const duration = 550;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const next = startVal + (endVal - startVal) * ease;
      currentRef.current = next;
      setCurrent(next);

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      } else {
        currentRef.current = endVal;
      }
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [safeValue]);

  return (
    <span>
      {prefix}
      {current.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix ? ` ${suffix}` : ""}
    </span>
  );
}
