import { useState, useRef } from "react";
import { Upload, X, Image as ImageIcon, Loader2, Link2, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminAiImageGeneratorModal } from "@/components/admin/AdminAiImageGeneratorModal";

interface ImageUploaderProps {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  label?: string;
  placeholder?: string;
  folder?: string;
  compact?: boolean;
  promptHint?: string;
  categoryHint?: string;
}

export function ImageUploader({
  value,
  onChange,
  label,
  placeholder = "اختر صورة من جهازك...",
  folder = "uploads",
  compact = false,
  promptHint,
  categoryHint,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("يرجى اختيار ملف صورة صالح (PNG, JPG, WEBP, GIF, SVG)");
      return;
    }

    // Limit file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 5 ميجابايت");
      return;
    }

    setUploading(true);

    try {
      // 1. Convert to Data URL (base64) for instant guaranteed display without network dependency
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;

        // Try uploading to Supabase Storage if configured
        try {
          const ext = file.name.split(".").pop() || "png";
          const filePath = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;

          const { error: uploadError } = await supabase.storage
            .from("store-assets")
            .upload(filePath, file, { upsert: true });

          if (!uploadError) {
            const { data: signedData } = await supabase.storage
              .from("store-assets")
              .createSignedUrl(filePath, 60 * 60 * 24 * 365 * 10);

            if (signedData?.signedUrl) {
              onChange(signedData.signedUrl);
              toast.success("تم رفع الصورة بنجاح على الخادم ✨");
              setUploading(false);
              return;
            }
          }
        } catch {
          // Fallback to dataUrl silently if storage bucket is not available
        }

        // If storage wasn't available or errored, use dataUrl (base64)
        onChange(dataUrl);
        toast.success("تم اختيار الصورة بنجاح ✨");
        setUploading(false);
      };

      reader.onerror = () => {
        toast.error("حدث خطأ أثناء قراءة ملف الصورة");
        setUploading(false);
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      toast.error(`خطأ أثناء معالجة الصورة: ${err.message || err}`);
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  if (compact) {
    return (
      <div className="space-y-1.5">
        {label && <span className="block text-xs font-extrabold text-foreground">{label}</span>}
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
            }}
          />

          {value ? (
            <div className="relative group shrink-0">
              <img
                src={value}
                alt=""
                className="h-10 w-10 rounded-xl object-cover border border-border/80 shadow-xs"
              />
              <button
                type="button"
                onClick={() => onChange(null)}
                className="absolute -top-1.5 -end-1.5 bg-rose-500 text-white rounded-full p-0.5 shadow-md hover:scale-110 transition-transform"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="h-10 w-10 rounded-xl bg-secondary border border-dashed border-border flex items-center justify-center shrink-0">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="h-10 text-xs font-bold rounded-xl gap-1.5 flex-1 border-border/80 hover:bg-secondary"
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            ) : (
              <Upload className="h-3.5 w-3.5 text-emerald-500" />
            )}
            <span>{value ? "تغيير الصورة" : "رفع من الجهاز"}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => setShowAiModal(true)}
            className="h-10 px-3 rounded-xl text-xs font-black bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1.5 shrink-0"
            title="توليد صورة بالذكاء الاصطناعي (النموذج المضبوط في الإعدادات)"
          >
            <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>AI صورة</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="h-10 w-10 rounded-xl text-muted-foreground shrink-0"
            title="إدخال رابط بدلاً من الرفع"
          >
            <Link2 className="h-4 w-4" />
          </Button>
        </div>

        {showUrlInput && (
          <Input
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://..."
            className="h-9 text-xs rounded-xl font-mono mt-1"
          />
        )}

        {/* AI Image Generation Modal */}
        <AdminAiImageGeneratorModal
          open={showAiModal}
          onOpenChange={setShowAiModal}
          onImageSelected={(url) => onChange(url)}
          initialImageUrl={value}
          initialPrompt={promptHint}
          categoryHint={categoryHint}
          title={label ? `توليد ${label} بالذكاء الاصطناعي` : "توليد صورة بالذكاء الاصطناعي"}
        />
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {label && <span className="block text-xs font-extrabold text-foreground">{label}</span>}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
        }}
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-dashed transition-all ${
          isDragging
            ? "border-emerald-500 bg-emerald-500/10 scale-[1.01]"
            : "border-border/70 hover:border-emerald-500/50 bg-card/60"
        }`}
      >
        {value ? (
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
            <div className="relative group shrink-0">
              <img
                src={value}
                alt="Uploaded"
                className="h-20 w-28 sm:h-24 sm:w-32 rounded-xl object-cover border border-border shadow-md"
              />
              <button
                type="button"
                onClick={() => onChange(null)}
                className="absolute -top-2 -end-2 bg-rose-600 text-white rounded-full p-1 shadow-lg hover:scale-110 transition-transform"
                title="حذف الصورة"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex-1 text-center sm:text-start space-y-2 w-full">
              <div className="flex items-center gap-1.5 justify-center sm:justify-start text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <Check className="h-4 w-4 text-emerald-500" />
                <span>تم تحديد الصورة بنجاح</span>
              </div>
              <p className="text-[11px] text-muted-foreground truncate max-w-[200px] sm:max-w-[300px] dir-ltr text-center sm:text-right">
                {value.startsWith("data:") ? "صورة مخصصة من الجهاز" : value}
              </p>
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8 rounded-xl text-xs font-bold gap-1.5"
                >
                  {uploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5 text-emerald-500" />
                  )}
                  <span>اختيار صورة أخرى من ملفاتك 📁</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAiModal(true)}
                  className="h-8 rounded-xl text-xs font-black bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>تعديل/توليد بالذكاء الاصطناعي ✨</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className="h-8 rounded-xl text-[11px] text-muted-foreground"
                >
                  <Link2 className="h-3 w-3 me-1" />
                  <span>رابط خارجية</span>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-2 py-1">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              {uploading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Upload className="h-6 w-6" />
              )}
            </div>

            <div>
              <p className="text-xs font-bold text-foreground">
                {uploading ? "جاري معالجة الصورة..." : "اسحب ملف الصورة هنا أو انقر للاختيار"}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                يدعم صيغ PNG, JPG, WEBP, SVG حتى 5 ميجابايت
              </p>
            </div>

            <div className="pt-1 flex flex-wrap justify-center gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="h-9 px-4 rounded-xl text-xs font-black hero-gradient text-primary-foreground shadow-xs gap-2"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>اختيار صورة من جهازك 📁</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAiModal(true)}
                className="h-9 px-3 rounded-xl text-xs font-black bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>توليد بالـ AI (Gemini) ✨</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowUrlInput(!showUrlInput)}
                className="h-9 px-3 rounded-xl text-xs font-bold text-muted-foreground border-border/80"
              >
                <Link2 className="h-3.5 w-3.5 me-1" />
                <span>رابط</span>
              </Button>
            </div>
          </div>
        )}

        {showUrlInput && (
          <div className="w-full pt-2 border-t border-border/50 mt-2">
            <Input
              value={value || ""}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder || "أو الصق رابط الصورة مباشرة..."}
              className="h-9 text-xs rounded-xl font-mono dir-ltr text-right"
            />
          </div>
        )}

        {/* AI Image Generation Modal for Full View */}
        <AdminAiImageGeneratorModal
          open={showAiModal}
          onOpenChange={setShowAiModal}
          onImageSelected={(url) => onChange(url)}
          initialImageUrl={value}
          initialPrompt={promptHint}
          categoryHint={categoryHint}
          title={label ? `توليد ${label} بالذكاء الاصطناعي` : "توليد صورة بالذكاء الاصطناعي"}
        />
      </div>
    </div>
  );
}
