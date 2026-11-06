import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, X } from "lucide-react";
import { dismissAiAlert, listAiAlerts } from "@/lib/ai-settings.functions";

export function AiAlertBanner() {
  const list = useServerFn(listAiAlerts);
  const dismiss = useServerFn(dismissAiAlert);
  const [alerts, setAlerts] = useState<Array<{ id: string; message: string }>>([]);

  useEffect(() => {
    let alive = true;
    const tick = () => list().then((a) => alive && setAlerts(a)).catch(() => {});
    tick();
    const t = setInterval(tick, 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [list]);

  if (!alerts.length) return null;
  return (
    <div className="space-y-2 px-4 pt-4 sm:px-8" dir="rtl">
      {alerts.map((a) => (
        <div key={a.id} role="alert" className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">تنبيه الذكاء الاصطناعي</p>
            <p>{a.message}</p>
            <Link to="/admin/settings" className="underline font-medium">افتح الإعدادات</Link>
          </div>
          <button
            aria-label="إخفاء التنبيه"
            onClick={() => {
              setAlerts((x) => x.filter((y) => y.id !== a.id));
              dismiss({ data: { id: a.id } }).catch(() => {});
            }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
