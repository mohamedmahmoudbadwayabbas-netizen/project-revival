import React, { useState } from "react";
import {
  Sparkles,
  Loader2,
  Check,
  Copy,
  Tag,
  BookOpen,
  Zap,
  ArrowLeft,
  X,
  Layers,
  UtensilsCrossed,
  ShieldCheck,
  Thermometer,
  MapPin,
  Activity,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  generateProductCopywriting,
  ProductCopywriterResult,
  ProductNutritionalInfo,
} from "@/services/gemini36Service";
import { toast } from "sonner";
import { aiWaitLabel, useElapsedSeconds } from "@/hooks/use-elapsed-seconds";

interface SmartProductCopywriterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialProductName?: string;
  initialProductId?: string;
  initialCategoryName?: string;
  isByWeight?: boolean;
  onApplyCopywriting?: (data: {
    name?: string;
    description: string;
    tags: string[];
    cookingTip: string;
    characteristics?: string[];
    storageInstructions?: string;
    originSource?: string;
    nutritionalInfo?: ProductNutritionalInfo;
  }) => void;
}

export function SmartProductCopywriterModal({
  open,
  onOpenChange,
  initialProductName = "",
  initialProductId,
  initialCategoryName = "",
  isByWeight = false,
  onApplyCopywriting,
}: SmartProductCopywriterModalProps) {
  const [productName, setProductName] = useState(initialProductName);
  const [categoryName, setCategoryName] = useState(initialCategoryName);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProductCopywriterResult | null>(null);
  const elapsed = useElapsedSeconds(loading);

  const handleGenerate = React.useCallback(
    async (nameToUse = productName, catToUse = categoryName) => {
      if (!nameToUse.trim()) {
        toast.error("يرجى إدخال اسم المنتج أولاً");
        return;
      }
      setLoading(true);
      try {
        const res = await generateProductCopywriting({
          productName: nameToUse,
          productId: initialProductId,
          categoryName: catToUse,
          isByWeight,
        });
        setResult(res);
      } catch (e) {
        toast.error((e as Error)?.message || "حدث خطأ أثناء صياغة تفاصيل المنتج");
      } finally {
        setLoading(false);
      }
    },
    [productName, initialProductId, categoryName, isByWeight],
  );

  // Sync props when modal opens
  React.useEffect(() => {
    if (open) {
      setProductName(initialProductName);
      setCategoryName(initialCategoryName);
      setResult(null);
    }
    // مهم: لا نعتمد على handleGenerate هنا، وإلا كل حرف يُكتب يُعيد ضبط الحقول.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleApply = () => {
    if (!result) return;
    if (onApplyCopywriting) {
      onApplyCopywriting({
        name: result.enhancedTitle,
        description: result.seoDescription,
        tags: result.tags,
        cookingTip: result.cookingTip,
        characteristics: result.characteristics,
        storageInstructions: result.storageInstructions,
        originSource: result.originSource,
        nutritionalInfo: result.nutritionalInfo,
      });
      toast.success(
        "تم إدراج كافة بيانات الذكاء الاصطناعي (الوصف، نصيحة الشيف، الخصائص، التخزين، المنشأ، القيمة الغذائية) بنجاح! ✨",
      );
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl rounded-3xl p-0 overflow-hidden text-right border-border/80 shadow-2xl"
        dir="rtl"
      >
        <DialogHeader className="p-5 pb-3 border-b border-border/60 bg-gradient-to-l from-emerald-500/10 via-card to-card text-right">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              <Sparkles className="h-5 w-5 animate-pulse text-amber-500" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-black font-display text-foreground">
                كاتب تفاصيل المنتجات والذكاء الاصطناعي الشامل
              </DialogTitle>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">
                توليد نصيحة الشيف، الوصف التسويقي، الخصائص، طريقة التخزين، المصدر، والقيمة الغذائية
                بنقرة واحدة
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Inputs Row */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-7 space-y-1">
              <label className="text-xs font-bold text-foreground">اسم المنتج الأساسي:</label>
              <Input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="مثال: لحم مفروم بلدي / جبن قريش / طماطم بلدي"
                className="h-9 rounded-xl font-bold text-xs"
              />
            </div>
            <div className="sm:col-span-5 space-y-1">
              <label className="text-xs font-bold text-foreground">القسم (اختياري):</label>
              <Input
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="مثال: اللحوم / الألبان"
                className="h-9 rounded-xl font-bold text-xs"
              />
            </div>
          </div>

          <Button
            type="button"
            disabled={loading || !productName.trim()}
            onClick={() => handleGenerate()}
            className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs gap-2 shadow-xs cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{aiWaitLabel(elapsed)}</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 text-amber-300" />
                <span>توليد كل التفاصيل بالذكاء الاصطناعي ✨</span>
              </>
            )}
          </Button>

          {/* Results Preview */}
          {result && (
            <div className="space-y-3.5 pt-2">
              {/* Enhanced Title */}
              <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/70 space-y-1">
                <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                  <Tag className="h-3 w-3 text-emerald-600" />
                  <span>العنوان التجاري المحسّن:</span>
                </span>
                <p className="text-sm font-black text-foreground font-display">
                  {result.enhancedTitle}
                </p>
              </div>

              {/* 1. Description */}
              <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/70 space-y-1">
                <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                  <BookOpen className="h-3 w-3 text-emerald-600" />
                  <span>1. الوصف والتعريف بالمنتج:</span>
                </span>
                <p className="text-xs font-medium text-foreground leading-relaxed">
                  {result.seoDescription}
                </p>
              </div>

              {/* 2. Chef Tip */}
              {result.cookingTip && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-1 text-amber-900 dark:text-amber-200">
                  <span className="text-[11px] font-extrabold flex items-center gap-1">
                    <UtensilsCrossed className="h-3.5 w-3.5 text-amber-600" />
                    <span>2. نصيحة الشيف والتحضير:</span>
                  </span>
                  <p className="text-xs font-bold leading-relaxed">{result.cookingTip}</p>
                </div>
              )}

              {/* 3. Characteristics & Highlights */}
              {result.characteristics?.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
                  <span className="text-[11px] font-extrabold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    <span>3. الخصائص والمميزات الفنية:</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {result.characteristics.map((ch, idx) => (
                      <span
                        key={idx}
                        className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-black text-emerald-800 dark:text-emerald-200"
                      >
                        ✓ {ch}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Storage Instructions */}
              {result.storageInstructions && (
                <div className="p-3.5 rounded-2xl bg-blue-500/5 border border-blue-500/20 space-y-1 text-blue-900 dark:text-blue-200">
                  <span className="text-[11px] font-extrabold flex items-center gap-1">
                    <Thermometer className="h-3.5 w-3.5 text-blue-600" />
                    <span>4. طريقة الحفظ والتخزين:</span>
                  </span>
                  <p className="text-xs font-medium leading-relaxed">
                    {result.storageInstructions}
                  </p>
                </div>
              )}

              {/* 5. Origin & Source */}
              {result.originSource && (
                <div className="p-3.5 rounded-2xl bg-purple-500/5 border border-purple-500/20 space-y-1 text-purple-900 dark:text-purple-200">
                  <span className="text-[11px] font-extrabold flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-purple-600" />
                    <span>5. المصدر والمنشأ:</span>
                  </span>
                  <p className="text-xs font-medium leading-relaxed">{result.originSource}</p>
                </div>
              )}

              {/* 6. Nutritional Values */}
              {result.nutritionalInfo && (
                <div className="p-3.5 rounded-2xl bg-secondary/60 border border-border/80 space-y-2">
                  <span className="text-[11px] font-extrabold text-foreground flex items-center gap-1">
                    <Activity className="h-3.5 w-3.5 text-emerald-600" />
                    <span>6. الحقائق والقيمة الغذائية (لكل 100 جم):</span>
                  </span>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="rounded-xl border bg-amber-500/10 border-amber-500/20 p-2">
                      <div className="text-[10px] text-muted-foreground font-bold">السعرات</div>
                      <div className="font-black text-amber-600">
                        {result.nutritionalInfo.calories}
                      </div>
                    </div>
                    <div className="rounded-xl border bg-emerald-500/10 border-emerald-500/20 p-2">
                      <div className="text-[10px] text-muted-foreground font-bold">البروتين</div>
                      <div className="font-black text-emerald-600">
                        {result.nutritionalInfo.protein}
                      </div>
                    </div>
                    <div className="rounded-xl border bg-blue-500/10 border-blue-500/20 p-2">
                      <div className="text-[10px] text-muted-foreground font-bold">كاربوهيدرات</div>
                      <div className="font-black text-blue-600">{result.nutritionalInfo.carbs}</div>
                    </div>
                    <div className="rounded-xl border bg-purple-500/10 border-purple-500/20 p-2">
                      <div className="text-[10px] text-muted-foreground font-bold">الألياف</div>
                      <div className="font-black text-purple-600">
                        {result.nutritionalInfo.fiber}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tags & Keywords */}
              {result.tags?.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-muted-foreground">
                    الوسوم المقترحة:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {result.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[11px] font-black text-emerald-700 dark:text-emerald-300"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t border-border/60 bg-card flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl text-xs font-bold h-9"
          >
            إلغاء
          </Button>

          {result && (
            <Button
              type="button"
              onClick={handleApply}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs h-9 gap-1.5 shadow-xs cursor-pointer"
            >
              <Check className="h-4 w-4" />
              <span>إدراج في بيانات المنتج</span>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
