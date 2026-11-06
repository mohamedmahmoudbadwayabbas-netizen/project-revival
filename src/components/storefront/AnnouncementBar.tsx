import { useSettings } from "@/lib/settings-context";
import { STORE_IDENTITY } from "@/lib/store-identity";
import { useState, useEffect } from "react";

export function AnnouncementBar() {
  const s = useSettings();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!s.announcement_enabled || !s.announcement_text) return null;

  const bgStyle = s.announcement_bg_color
    ? s.announcement_bg_color.startsWith("#") || s.announcement_bg_color.startsWith("rgb")
      ? s.announcement_bg_color
      : `hsl(${s.announcement_bg_color})`
    : STORE_IDENTITY.green;

  return (
    <div
      className="w-full overflow-hidden text-center text-[11px] font-bold text-white sm:text-xs"
      style={{ backgroundColor: bgStyle }}
      dir="rtl"
    >
      <div className="mx-auto max-w-6xl px-3 py-2 leading-relaxed">{s.announcement_text}</div>
    </div>
  );
}
