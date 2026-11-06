import { useEffect, useRef, useState } from "react";
import { Monitor, Smartphone, Tablet, RefreshCw } from "lucide-react";

type Device = "mobile" | "tablet" | "desktop";
const WIDTHS: Record<Device, number> = { mobile: 390, tablet: 768, desktop: 1280 };

/** Embeds the real storefront and pushes unsaved settings into it (nothing is saved). */
export function RealStorePreview({ draft, dirty }: { draft: Record<string, unknown>; dirty: boolean }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [device, setDevice] = useState<Device>("mobile");
  const [boxW, setBoxW] = useState(400);
  const [key, setKey] = useState(0);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const push = () =>
    frame.current?.contentWindow?.postMessage(
      { type: "settings_preview", settings: draftRef.current },
      window.location.origin,
    );

  useEffect(() => {
    push();
  }, [draft]);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin === window.location.origin && e.data?.type === "settings_preview_ready") push();
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  useEffect(() => {
    if (!box.current) return;
    const ro = new ResizeObserver(([e]) => setBoxW(e.contentRect.width));
    ro.observe(box.current);
    return () => ro.disconnect();
  }, []);

  const w = WIDTHS[device];
  const scale = Math.min(1, boxW / w);
  const h = 720;

  return (
    <div className="rounded-3xl border border-border bg-card p-3 shadow-xs space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-black text-foreground">المعاينة الحقيقية للمتجر</div>
          <div className={`text-[11px] font-bold ${dirty ? "text-offer" : "text-muted-foreground"}`}>
            {dirty ? "تعديلات غير محفوظة — تظهر هنا فقط" : "مطابقة للمتجر الحالي"}
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-xl bg-secondary p-1">
          {([
            ["mobile", Smartphone, "هاتف"],
            ["tablet", Tablet, "تابلت"],
            ["desktop", Monitor, "كمبيوتر"],
          ] as const).map(([d, Icon, label]) => (
            <button
              key={d}
              type="button"
              title={label}
              onClick={() => setDevice(d)}
              className={`grid h-8 w-8 place-items-center rounded-lg ${device === d ? "bg-card shadow-xs text-primary" : "text-muted-foreground"}`}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
          <button type="button" title="إعادة تحميل" onClick={() => setKey((k) => k + 1)} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div ref={box} className="w-full overflow-hidden rounded-2xl border border-border bg-background" style={{ height: h * scale }}>
        <iframe
          key={key}
          ref={frame}
          src="/"
          title="معاينة المتجر"
          onLoad={push}
          style={{ width: w, height: h, transform: `scale(${scale})`, transformOrigin: "top right", border: 0 }}
          className="block ms-auto"
        />
      </div>
    </div>
  );
}
