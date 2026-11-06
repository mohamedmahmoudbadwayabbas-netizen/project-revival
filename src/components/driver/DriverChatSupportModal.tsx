import { useState } from "react";
import {
  Phone,
  MessageSquare,
  LifeBuoy,
  Send,
  User,
  Store,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  MessageCircle,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface DriverChatSupportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName: string;
  customerPhone: string;
  orderId: string;
  storePhone?: string;
}

export function DriverChatSupportModal({
  open,
  onOpenChange,
  customerName,
  customerPhone,
  orderId,
  storePhone = "01099998888",
}: DriverChatSupportModalProps) {
  const [activeTab, setActiveTab] = useState<"customer" | "support">("customer");
  const [customMsg, setCustomMsg] = useState("");

  const cleanCustomerPhone = customerPhone.replace(/\D/g, "");
  // Ensure Egyptian country code for WhatsApp if needed
  const formattedWhatsAppPhone = cleanCustomerPhone.startsWith("0")
    ? `2${cleanCustomerPhone}`
    : cleanCustomerPhone.startsWith("2")
      ? cleanCustomerPhone
      : `20${cleanCustomerPhone}`;

  const PRESET_MESSAGES = [
    `مرحباً ${customerName}، أنا كابتن التوصيل لطلبك رقم #${orderId.slice(0, 8)} من سوبرماركت الوادي الأخضر. أنا في طريقي إليك الآن وسأصل خلال دقائق بإذن الله 🛵`,
    `مرحباً، لقد وصلت الآن أمام العقار/الموقع المحدد لتسليم طلبك #${orderId.slice(0, 8)}. في انتظارك للاستلام 🚪`,
    `السلام عليكم، أرجو التكرم بتأكيد رقم الدور والشقة أو علامة مميزة بالقرب من موقعك لتسليم الطلب بدقة 📍`,
    `مرحباً، لقد حاولت الاتصال بكم هاتفياً لتسليم الطلب. أرجو معاودة الاتصال بي أو الرد على هذه الرسالة 📱`,
  ];

  const handleOpenWhatsApp = (message: string) => {
    if (!customerPhone) {
      toast.error("رقم هاتف العميل غير متوفر");
      return;
    }
    const encoded = encodeURIComponent(message);
    const url = `https://wa.me/${formattedWhatsAppPhone}?text=${encoded}`;
    window.open(url, "_blank");
  };

  const handleOpenSupportWhatsApp = () => {
    const msg = encodeURIComponent(
      `مرحباً فريق الدعم الفني لسوبرماركت الوادي الأخضر، أنا كابتن التوصيل وأحتاج لمساعدة بخصوص الطلب رقم #${orderId.slice(0, 8)} للعميل (${customerName}).`,
    );
    window.open(`https://wa.me/201099998888?text=${msg}`, "_blank");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("تم نسخ النص إلى الحافظة 📋");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md max-h-[92vh] overflow-y-auto rounded-3xl p-5 border-border bg-card"
        dir="rtl"
      >
        <DialogHeader className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black text-foreground">
                التواصل والدردشة السريعة
              </DialogTitle>
              <DialogDescription className="text-xs font-semibold text-muted-foreground">
                طلب #{orderId.slice(0, 8)} — {customerName}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* التبديل بين محادثة العميل ومكتب الدعم الفني */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-secondary/60">
            <button
              type="button"
              onClick={() => setActiveTab("customer")}
              className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === "customer"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <User className="h-3.5 w-3.5" />
              <span>محادثة العميل</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("support")}
              className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === "support"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LifeBuoy className="h-3.5 w-3.5 text-amber-500" />
              <span>الدعم الفني والعمليات</span>
            </button>
          </div>

          {activeTab === "customer" ? (
            <div className="space-y-3">
              {/* أزرار الاتصال السريع المباشر */}
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`tel:${customerPhone}`}
                  className="inline-flex items-center justify-center gap-2 h-11 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-xs transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  <span>اتصال هاتفي 📞</span>
                </a>

                <button
                  type="button"
                  onClick={() => handleOpenWhatsApp(PRESET_MESSAGES[0])}
                  className="inline-flex items-center justify-center gap-2 h-11 px-3 rounded-2xl bg-[#25D366] hover:bg-[#1EBE5D] text-white font-black text-xs shadow-xs transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>واتساب WhatsApp 💬</span>
                </button>
              </div>

              {/* قوالب رسائل سريعة جاهزة بنقرة واحدة */}
              <div className="space-y-2 pt-1">
                <div className="text-xs font-black text-foreground">
                  قوالب رسائل جاهزة للإرسال السريع بنقرة واحدة:
                </div>
                <div className="space-y-2">
                  {PRESET_MESSAGES.map((msg, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-secondary/40 border border-border space-y-2 hover:border-emerald-500/40 transition-colors"
                    >
                      <p className="text-xs font-medium text-foreground leading-relaxed">{msg}</p>
                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/40">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(msg)}
                          className="h-7 text-[11px] font-bold rounded-lg text-muted-foreground gap-1"
                        >
                          <Copy className="h-3 w-3" />
                          نسخ
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleOpenWhatsApp(msg)}
                          className="h-7 rounded-lg text-[11px] font-black bg-[#25D366] hover:bg-[#1EBE5D] text-white gap-1"
                        >
                          <Send className="h-3 w-3" />
                          إرسال واتساب
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* كتابة رسالة مخصصة */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-black text-foreground">
                  أو كتابة رسالة مخصصة للعميل:
                </label>
                <div className="flex gap-2">
                  <Textarea
                    value={customMsg}
                    onChange={(e) => setCustomMsg(e.target.value)}
                    rows={2}
                    placeholder="اكتب رسالتك هنا للعميل..."
                    className="rounded-2xl text-xs font-bold resize-none"
                  />
                </div>
                <Button
                  type="button"
                  onClick={() => {
                    if (!customMsg.trim()) return toast.error("يرجى كتابة نص الرسالة أولاً");
                    handleOpenWhatsApp(customMsg.trim());
                  }}
                  disabled={!customMsg.trim()}
                  className="w-full rounded-2xl bg-[#25D366] hover:bg-[#1EBE5D] text-white font-black text-xs h-10 gap-2 mt-1"
                >
                  <Send className="h-3.5 w-3.5" />
                  إرسال الرسالة عبر WhatsApp
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs font-bold space-y-1">
                <div className="flex items-center gap-2 font-black">
                  <LifeBuoy className="h-4 w-4 text-amber-600" />
                  <span>خط الدعم الفني وإدارة الحركة المباشر</span>
                </div>
                <p className="text-[11px] font-normal leading-relaxed opacity-90">
                  إذا واجهت أي عائق في الوصول، مشكلة في المنتجات، أو رفض العميل للاستلام، تواصل مع
                  فريق العمليات فوراً.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`tel:${storePhone}`}
                  className="inline-flex items-center justify-center gap-2 h-11 px-3 rounded-2xl bg-primary text-primary-foreground font-black text-xs shadow-xs transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  <span>اتصال بالعمليات 📞</span>
                </a>

                <button
                  type="button"
                  onClick={handleOpenSupportWhatsApp}
                  className="inline-flex items-center justify-center gap-2 h-11 px-3 rounded-2xl bg-[#25D366] text-white font-black text-xs shadow-xs transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>واتساب العمليات 💬</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
