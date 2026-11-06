import { useState, useRef, useEffect } from "react";
import {
  Camera,
  PenTool,
  CheckCircle2,
  Trash2,
  Upload,
  MapPin,
  Clock,
  ShieldCheck,
  Loader2,
  WifiOff,
  X,
  FileCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export interface ProofOfDeliveryData {
  orderId: string;
  signatureBase64?: string;
  photoUrl?: string;
  receiverName?: string;
  deliveredAt: string;
  driverCoords?: { lat: number; lng: number };
  notes?: string;
  isOfflineQueued?: boolean;
}

interface ProofOfDeliveryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  customerName: string;
  currentCoords?: { lat: number; lng: number };
  totalAmount: number;
  paymentMethod: string;
  onConfirmDelivery: (podData: ProofOfDeliveryData) => Promise<void>;
}

export function ProofOfDeliveryModal({
  open,
  onOpenChange,
  orderId,
  customerName,
  currentCoords,
  totalAmount,
  paymentMethod,
  onConfirmDelivery,
}: ProofOfDeliveryModalProps) {
  const [activeTab, setActiveTab] = useState<"signature" | "photo">("signature");
  const [receiverName, setReceiverName] = useState(customerName || "");
  const [notes, setNotes] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Canvas Signature references
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize canvas
  useEffect(() => {
    if (open && activeTab === "signature" && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }
    }
  }, [open, activeTab]);

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoPreview(reader.result as string);
      toast.success("تم التقاط صورة إثبات التسليم بنجاح 📸");
    };
    reader.readAsDataURL(file);
  };

  const handleConfirm = async () => {
    let signatureBase64: string | undefined = undefined;

    if (canvasRef.current && hasSignature) {
      signatureBase64 = canvasRef.current.toDataURL("image/png");
    }

    if (!hasSignature && !photoPreview) {
      toast.error("يرجى الحصول على توقيع العميل أو التقاط صورة للطرود لإثبات التسليم");
      return;
    }

    setSubmitting(true);
    try {
      const podData: ProofOfDeliveryData = {
        orderId,
        signatureBase64,
        photoUrl: photoPreview || undefined,
        receiverName: receiverName.trim() || customerName,
        deliveredAt: new Date().toISOString(),
        driverCoords: currentCoords,
        notes: notes.trim(),
        isOfflineQueued: !navigator.onLine,
      };

      await onConfirmDelivery(podData);
      toast.success("تم توثيق إثبات التسليم وإنهاء الطلب بنجاح! 🎉");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(`حدث خطأ أثناء حفظ التسليم: ${err.message || err}`);
    } finally {
      setSubmitting(false);
    }
  };

  const isCash = paymentMethod === "cod";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg max-h-[94vh] overflow-y-auto rounded-3xl p-5 sm:p-6 border-border bg-card"
        dir="rtl"
      >
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black text-foreground">
                إثبات وتأكيد التسليم (POD)
              </DialogTitle>
              <DialogDescription className="text-xs font-semibold text-muted-foreground">
                طلب #{orderId.slice(0, 8)} — العميل: {customerName}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* تنبيه حالة الدفع والتحصيل */}
          <div
            className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-between gap-3 ${
              isCash
                ? "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{isCash ? "💵" : "💳"}</span>
              <div>
                <div className="font-black">
                  {isCash ? "المبلغ المطلوب تحصيله نقداً:" : "تم الدفع مسبقاً إلكترونياً (مدفوع)"}
                </div>
                <div className="text-[11px] font-semibold opacity-90">
                  {isCash
                    ? "تأكد من استلام كامل المبلغ قبل تسليم الطلب"
                    : "لا تقم بتحصيل أي مبالغ إضافية من العميل"}
                </div>
              </div>
            </div>
            {isCash && (
              <div className="font-display text-base font-black text-amber-600 dark:text-amber-400 shrink-0">
                {totalAmount.toFixed(2)} ج.م
              </div>
            )}
          </div>

          {/* تبديل طريقة الإثبات: توقيع العميل أو صورة */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-secondary/60">
            <button
              type="button"
              onClick={() => setActiveTab("signature")}
              className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === "signature"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <PenTool className="h-3.5 w-3.5" />
              <span>توقيع العميل الإلكتروني ✍️</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("photo")}
              className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === "photo"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Camera className="h-3.5 w-3.5" />
              <span>صورة الطرد / الباب 📸</span>
            </button>
          </div>

          {/* 1. مساحة التوقيع الرقمي */}
          {activeTab === "signature" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                <span>وقّع بإصبعك أو القلم داخل الإطار:</span>
                {hasSignature && (
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="text-[11px] text-rose-500 font-extrabold flex items-center gap-1 hover:underline"
                  >
                    <Trash2 className="h-3 w-3" />
                    مسح التوقيع
                  </button>
                )}
              </div>
              <div className="relative rounded-2xl border-2 border-dashed border-emerald-500/40 bg-background overflow-hidden shadow-inner">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={150}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-36 touch-none cursor-crosshair"
                />
                {!hasSignature && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-xs font-bold text-muted-foreground/50">
                    ضع توقيع المستلم هنا ✍️
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. التقاط صورة إثبات التسليم */}
          {activeTab === "photo" && (
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoCapture}
                className="hidden"
              />

              {photoPreview ? (
                <div className="relative rounded-2xl border border-border overflow-hidden group">
                  <img
                    src={photoPreview}
                    alt="Proof Preview"
                    className="w-full h-44 object-cover rounded-2xl"
                  />
                  <div className="absolute top-2 end-2 flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => setPhotoPreview(null)}
                      className="h-8 rounded-xl text-xs font-bold gap-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      إلغاء
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-8 rounded-xl text-xs font-bold gap-1"
                    >
                      <Camera className="h-3.5 w-3.5" />
                      إعادة الالتقاط
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-2xl border-2 border-dashed border-border bg-secondary/30 p-6 text-center cursor-pointer hover:bg-secondary/50 transition-colors space-y-2"
                >
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600 mx-auto">
                    <Camera className="h-6 w-6" />
                  </div>
                  <div className="text-xs font-black text-foreground">
                    التقط صورة للطلب أمام باب العميل 📸
                  </div>
                  <div className="text-[10px] text-muted-foreground font-semibold">
                    انقر لفتح الكاميرا والتقاط صورة مباشرة للتوثيق
                  </div>
                </div>
              )}
            </div>
          )}

          {/* اسم المستلم الفعلي */}
          <div className="space-y-1.5">
            <Label className="text-xs font-black text-foreground">اسم الشخص المستلم للطلب</Label>
            <Input
              value={receiverName}
              onChange={(e) => setReceiverName(e.target.value)}
              placeholder="الاسم الكامل للشخص المستلم"
              className="rounded-xl text-xs font-bold"
            />
          </div>

          {/* ملاحظات التسليم */}
          <div className="space-y-1.5">
            <Label className="text-xs font-black text-foreground">ملاحظات الكابتن (اختياري)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="مثال: تم الاستلام باليد من العميل مباشرة / تم التسليم لحارس العقار بناء على طلبه..."
              className="rounded-xl text-xs font-bold resize-none"
            />
          </div>

          {/* طابع الـ GPS والوقت */}
          <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground bg-secondary/40 p-2.5 rounded-xl border border-border">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-emerald-600" />
              <span>
                {currentCoords
                  ? `GPS: ${currentCoords.lat.toFixed(4)}, ${currentCoords.lng.toFixed(4)}`
                  : "جاري ربط إحداثيات الموقع"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              <span>{new Date().toLocaleTimeString("ar-EG")}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2 border-t border-border mt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="rounded-xl font-bold text-xs"
          >
            رجوع
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={submitting || (!hasSignature && !photoPreview)}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs gap-2 min-w-36 shadow-md"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري التوثيق...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                تأكيد التسليم الرسمي ✅
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
