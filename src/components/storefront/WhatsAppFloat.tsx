import { MessageCircle } from "lucide-react";
import { useSettings } from "@/lib/settings-context";

export function WhatsAppFloat() {
  const { whatsapp_number: num } = useSettings();
  if (!num) return null;
  const clean = num.replace(/[^0-9]/g, "");
  return (
    <a
      href={`https://wa.me/${clean}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="واتساب"
      className="fixed bottom-5 start-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-elegant transition-transform hover:scale-110 active:scale-95"
    >
      <MessageCircle className="h-6 w-6" />
    </a>
  );
}
