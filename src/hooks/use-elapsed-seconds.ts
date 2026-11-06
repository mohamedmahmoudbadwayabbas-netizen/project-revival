import { useEffect, useState } from "react";

/** عداد ثوانٍ يبدأ من صفر كلما أصبح active=true (لإظهار أن العملية لم تتجمد). */
export function useElapsedSeconds(active: boolean): number {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    setSeconds(0);
    if (!active) return;
    const started = Date.now();
    const id = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(id);
  }, [active]);
  return seconds;
}

/** رسالة حالة قصيرة حسب الوقت المنقضي. */
export function aiWaitLabel(seconds: number): string {
  if (seconds < 12) return `جاري الصياغة بالذكاء الاصطناعي… (${seconds} ثانية)`;
  if (seconds < 35) return `النموذج بيكتب التفاصيل… (${seconds} ثانية)`;
  return `الخوادم المجانية مزدحمة، بنجرب نموذج تاني… (${seconds} ثانية)`;
}
