import React, { useState } from "react";
import {
  Check,
  Copy,
  FileCode,
  Sparkles,
  ArrowRight,
  Split,
  Eye,
  CheckCircle2,
  Undo2,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { applyApprovedChanges, requestChangeApproval } from "@/services/aiTools/projectEngineService";

interface GeminiCodeDiffViewerProps {
  filePath: string;
  originalCode: string;
  modifiedCode: string;
  summary: string;
  explanation: string;
  diffSummary?: {
    addedLinesCount: number;
    removedLinesCount: number;
  };
  onApplied?: () => void;
}

export function GeminiCodeDiffViewer({
  filePath,
  originalCode,
  modifiedCode,
  summary,
  explanation,
  diffSummary,
  onApplied,
}: GeminiCodeDiffViewerProps) {
  const [viewMode, setViewMode] = useState<"modified" | "split" | "original">("modified");
  const [copied, setCopied] = useState(false);
  const [isApplied, setIsApplied] = useState(false);
  const [engineState, setEngineState] = useState<"Draft" | "Validating" | "Approval Required" | "Applying" | "Applied" | "Validation Failed" | "Apply Failed" | "Not Configured">("Draft");

  const handleCopy = () => {
    navigator.clipboard.writeText(modifiedCode);
    setCopied(true);
    toast.success("تم نسخ الكود المعدل إلى الحافظة");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = async () => {
    setEngineState("Validating");
    try {
      const approval = await requestChangeApproval({
        kind: "file_update",
        files: [{ filePath, content: modifiedCode }],
      });
      if (approval.status === "NOT_CONFIGURED") {
        setEngineState("Not Configured");
        toast.error(approval.messageAr || "محرك المشروع غير مهيأ");
        return;
      }
      if (approval.status !== "APPROVAL_REQUIRED" || !approval.data?.approvalToken) {
        setEngineState("Validation Failed");
        toast.error(approval.messageAr || "تعذر تجهيز موافقة التغيير الحقيقي");
        return;
      }
      setEngineState("Approval Required");
      setEngineState("Applying");

      const applied = await applyApprovedChanges(
        { kind: "file_update", files: [{ filePath, content: modifiedCode }] },
        approval.data.approvalToken,
      );
      if (!applied.ok) {
        setEngineState("Apply Failed");
        toast.error(applied.messageAr || applied.error || "فشل تطبيق التعديل الحقيقي");
        return;
      }
      setEngineState("Applied");
      setIsApplied(true);
      toast.success(`تم تأكيد تطبيق التعديل الحقيقي على ${filePath}`);
      onApplied?.();
    } catch (error) {
      setEngineState("Apply Failed");
      toast.error(error instanceof Error ? error.message : "فشل تطبيق التعديل");
    }
  };

  const handleDownload = () => {
    const blob = new Blob([modifiedCode], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filePath.split("/").pop() || "modified_file.tsx";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("تم تحميل الملف المعدل");
  };

  return (
    <div
      className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs text-right font-sans my-3"
      dir="rtl"
    >
      {/* Header Info */}
      <div className="p-3.5 bg-secondary/40 border-b border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-emerald-500/15 text-emerald-600 grid place-items-center shrink-0">
            <FileCode className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black font-mono text-foreground">{filePath}</span>
              {diffSummary && (
                <span className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-extrabold px-2 py-0.5 rounded-md border border-emerald-500/20">
                  +{diffSummary.addedLinesCount} / -{diffSummary.removedLinesCount} سطر
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground font-medium truncate max-w-md">
              {summary}
            </p>
          </div>
        </div>

        {/* View mode toggle & action buttons */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <div className="bg-secondary p-1 rounded-xl flex items-center gap-1 border border-border">
            <button
              type="button"
              onClick={() => setViewMode("modified")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                viewMode === "modified"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              الكود المعدل
            </button>
            <button
              type="button"
              onClick={() => setViewMode("split")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                viewMode === "split"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              مقارنة (Diff)
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="h-8 px-2.5 rounded-xl text-[11px] font-bold gap-1 cursor-pointer"
            title="نسخ الكود"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">نسخ</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="h-8 px-2.5 rounded-xl text-[11px] font-bold gap-1 cursor-pointer"
            title="تحميل الملف"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>

          <span className="text-[10px] bg-secondary text-muted-foreground font-bold px-2.5 py-1.5 rounded-xl border border-border/70">{engineState}</span>
          <Button
            size="sm"
            onClick={handleApply}
            disabled={isApplied}
            className={`h-8 px-3.5 rounded-xl text-[11px] font-black gap-1.5 shadow-xs cursor-pointer ${
              isApplied
                ? "bg-emerald-600 text-white"
                : "hero-gradient text-primary-foreground hover:opacity-95"
            }`}
          >
            {isApplied ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>تم التطبيق الحقيقي ✅</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                <span>موافقة وتطبيق التعديل الحقيقي</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Explanation Banner */}
      {explanation && (
        <div className="px-4 py-2 bg-secondary/20 border-b border-border/40 text-xs text-foreground/90 font-medium leading-relaxed">
          💡 <span className="font-bold">التفاصيل:</span> {explanation}
        </div>
      )}

      {/* Code Editor Window */}
      <div
        className="bg-slate-950 text-slate-100 p-4 font-mono text-xs overflow-x-auto max-h-96"
        dir="ltr"
      >
        {viewMode === "split" ? (
          <div className="grid grid-cols-2 gap-4 divide-x divide-slate-800">
            <div>
              <div className="text-[10px] text-slate-400 font-bold mb-2 pb-1 border-b border-slate-800 flex items-center justify-between">
                <span>BEFORE (الأصل)</span>
                <span>{originalCode.split("\n").length} سطر</span>
              </div>
              <pre className="text-slate-400 opacity-80 whitespace-pre-wrap leading-relaxed text-[11px]">
                {originalCode}
              </pre>
            </div>
            <div className="pl-4">
              <div className="text-[10px] text-emerald-400 font-bold mb-2 pb-1 border-b border-slate-800 flex items-center justify-between">
                <span>AFTER (بعد تعديل Gemini ✨)</span>
                <span>{modifiedCode.split("\n").length} سطر</span>
              </div>
              <pre className="text-emerald-300 whitespace-pre-wrap leading-relaxed text-[11px]">
                {modifiedCode}
              </pre>
            </div>
          </div>
        ) : (
          <pre className="whitespace-pre-wrap leading-relaxed text-[11px] text-slate-200">
            {viewMode === "original" ? originalCode : modifiedCode}
          </pre>
        )}
      </div>
    </div>
  );
}
