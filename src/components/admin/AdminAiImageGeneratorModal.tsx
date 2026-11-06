import { useState } from "react";
import {
  Sparkles,
  Loader2,
  Wand2,
  Image as ImageIcon,
  Check,
  RefreshCw,
  Sliders,
  X,
  Layers,
  ArrowRight,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { generateAdminImage, ImageAspectRatio, ImageSize } from "@/services/geminiImageService";

interface AdminAiImageGeneratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImageSelected: (imageUrl: string) => void;
  initialPrompt?: string;
  initialImageUrl?: string | null;
  title?: string;
  categoryHint?: string;
}

const PRESET_PROMPTS = [
  "صورة احترافية استوديو لجبن قريش طازج مع زيت زيتون وزعتر في طبق سيراميك فاخر",
  "عبوة حليب بلدي طازج مع قطرات ندى باردة وإضاءة استوديو تصوير إعلاني",
  "لحم بقري بلدي فاخر مقطع ستيك طازج مع أعشاب الروزماري على لوح خشبي ريفي",
  "خضروات وفواكه طازجة منوعة مشعة بالنضارة في سلة خوص إعلانية فائقة الدقة",
  "بانر خلفية تسويقي لعروض الهايبر ماركت مع خصومات ذهبية ولمسات إضاءة نيون",
  "زجاجة زيت زيتون بكر ممتاز نقي مع حبات الزيتون الأخضر والأسود الفاخر",
];

export function AdminAiImageGeneratorModal({
  open,
  onOpenChange,
  onImageSelected,
  initialPrompt = "",
  initialImageUrl,
  title = "توليد صورة بالذكاء الاصطناعي (Google Gemini 3.1 Flash Image)",
  categoryHint,
}: AdminAiImageGeneratorModalProps) {
  const [prompt, setPrompt] = useState(
    initialPrompt || (categoryHint ? `صورة استوديو احترافية لمنتج ${categoryHint}` : ""),
  );
  const [aspectRatio, setAspectRatio] = useState<ImageAspectRatio>("1:1");
  const [imageSize, setImageSize] = useState<ImageSize>("1K");
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [modelUsed, setModelUsed] = useState<string>("");

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("يرجى كتابة وصف الصورة أولاً");
      return;
    }

    setLoading(true);
    setGeneratedImage(null);

    try {
      const result = await generateAdminImage({
        prompt: prompt.trim(),
        aspectRatio,
        imageSize,
        sourceImageBase64: isEditingExisting && initialImageUrl ? initialImageUrl : undefined,
        model: "gemini-3.1-flash-image",
      });

      if (result.success && result.imageUrl) {
        setGeneratedImage(result.imageUrl);
        setModelUsed(result.modelUsed || "gemini-3.1-flash-image");
        toast.success("تم توليد الصورة بنجاح بواسطة Google Gemini AI ✨");
      } else {
        toast.error(result.error || "تعذر توليد الصورة، يرجى المحاولة بوصف آخر");
      }
    } catch (err: any) {
      toast.error(`حدث خطأ أثناء التوليد: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (generatedImage) {
      onImageSelected(generatedImage);
      onOpenChange(false);
      toast.success("تم تطبيق الصورة وتعيينها بنجاح 🎯");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl p-6 border-border bg-card">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black text-foreground">{title}</DialogTitle>
              <DialogDescription className="text-xs font-semibold text-muted-foreground">
                توليد وتعديل صور المنتجات والخلفيات عبر أحدث نماذج Google Gemini (Nano Banana / 3.1
                Flash Image)
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* خيار تعديل الصورة الحالية إن وجدت */}
          {initialImageUrl && (
            <div className="flex items-center justify-between p-3 rounded-2xl bg-secondary/40 border border-border">
              <div className="flex items-center gap-2.5">
                <img
                  src={initialImageUrl}
                  alt="Original"
                  className="h-12 w-12 rounded-xl object-cover border border-border"
                />
                <div>
                  <div className="text-xs font-bold text-foreground">
                    تعديل الصورة الحالية للمنتج
                  </div>
                  <div className="text-[11px] text-muted-foreground font-semibold">
                    يمكنك إدخال تعديلات إضافية مثل (إضافة ظل، تغيير الإضاءة، إزالة الخلفية)
                  </div>
                </div>
              </div>
              <Button
                type="button"
                variant={isEditingExisting ? "default" : "outline"}
                size="sm"
                onClick={() => setIsEditingExisting(!isEditingExisting)}
                className="h-8 rounded-xl text-xs font-bold gap-1.5"
              >
                <Wand2 className="h-3.5 w-3.5" />
                {isEditingExisting ? "نمط التعديل مفعل ✓" : "تعديل هذه الصورة"}
              </Button>
            </div>
          )}

          {/* حقل وصف الصورة Prompt */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-black text-foreground flex items-center gap-1.5">
                <span>وصف الصورة المراد إنشاؤها بالذكاء الاصطناعي</span>
                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  Gemini Prompt
                </span>
              </Label>
              <span className="text-[10px] text-muted-foreground font-semibold">
                اكتب بالعربية أو الإنجليزية
              </span>
            </div>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder="مثال: جبن رومي بلدي معتق مقطع شرائح فاخرة على لوح خشب مع عنب أسود وإضاءة استوديو ناعمة..."
              className="rounded-2xl bg-background border-border text-xs font-bold resize-none"
            />
          </div>

          {/* اقتراحات سريعة للاختيار السريع */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-extrabold text-muted-foreground">
              💡 نماذج وأفكار جاهزة سريعة:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_PROMPTS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPrompt(p)}
                  className="text-[10px] font-bold bg-secondary/80 hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-300 text-foreground/80 px-2.5 py-1.5 rounded-xl border border-border/70 transition-all text-start"
                >
                  {p.slice(0, 48)}...
                </button>
              ))}
            </div>
          </div>

          {/* خيارات أبعاد وجودة الصورة */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-muted-foreground">
                أبعاد الصورة (Aspect Ratio)
              </Label>
              <Select
                value={aspectRatio}
                onValueChange={(v) => setAspectRatio(v as ImageAspectRatio)}
              >
                <SelectTrigger className="h-9 rounded-xl text-xs font-bold bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1:1" className="font-bold text-xs">
                    1:1 (مربع — مثالي للمنتجات)
                  </SelectItem>
                  <SelectItem value="16:9" className="font-bold text-xs">
                    16:9 (عريض — مثالي للبانرات)
                  </SelectItem>
                  <SelectItem value="4:3" className="font-bold text-xs">
                    4:3 (شاشة قياسية)
                  </SelectItem>
                  <SelectItem value="9:16" className="font-bold text-xs">
                    9:16 (طولي — ستوري وموبايل)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-muted-foreground">
                دقة وجودة الصورة (Resolution)
              </Label>
              <Select value={imageSize} onValueChange={(v) => setImageSize(v as ImageSize)}>
                <SelectTrigger className="h-9 rounded-xl text-xs font-bold bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1K" className="font-bold text-xs">
                    1K (عالية الدقة — HD)
                  </SelectItem>
                  <SelectItem value="2K" className="font-bold text-xs">
                    2K (فائقة الوضوح — Ultra)
                  </SelectItem>
                  <SelectItem value="512px" className="font-bold text-xs">
                    512px (سريعة وخفيفة)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* معاينة الصورة المولدة */}
          {loading ? (
            <div className="flex flex-col items-center justify-center p-8 rounded-3xl border-2 border-dashed border-emerald-500/40 bg-emerald-500/5 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600 dark:text-emerald-400" />
              <div className="text-center">
                <div className="text-xs font-black text-foreground">
                  جاري توليد الصورة الفائقة عبر Google Gemini 3.1 Flash Image...
                </div>
                <div className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                  معالجة الإضاءة، العمق والظلال الاستوديو الاحترافية
                </div>
              </div>
            </div>
          ) : generatedImage ? (
            <div className="space-y-2 p-3 rounded-3xl border border-emerald-500/40 bg-emerald-500/5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                  <Check className="h-4 w-4" />
                  معاينة الصورة المنشأة بنجاح ({modelUsed})
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerate}
                  className="h-7 text-[11px] font-bold rounded-lg text-muted-foreground gap-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  إعادة التوليد
                </Button>
              </div>
              <div className="relative rounded-2xl overflow-hidden border border-border shadow-md max-h-72 flex items-center justify-center bg-black/5">
                <img
                  src={generatedImage}
                  alt="Generated Result"
                  className="max-h-72 w-full object-contain rounded-2xl"
                />
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 pt-3 border-t border-border mt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="rounded-xl font-bold text-xs"
          >
            إلغاء
          </Button>

          {!generatedImage ? (
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
              className="rounded-xl hero-gradient text-primary-foreground font-black text-xs gap-2 min-w-36"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري التوليد...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  توليد الصورة الآن ✨
                </>
              )}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleApply}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs gap-2 min-w-36"
            >
              <Check className="h-4 w-4" />
              تطبيق واستخدام الصورة للمنتج
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
