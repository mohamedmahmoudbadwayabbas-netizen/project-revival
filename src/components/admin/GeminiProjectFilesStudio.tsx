import React, { useState } from "react";
import {
  FileCode,
  FolderTree,
  Search,
  Sparkles,
  Play,
  Check,
  Copy,
  Edit3,
  Layers,
  Settings,
  Palette,
  Eye,
  RefreshCw,
  Plus,
  FilePlus,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  PROJECT_FILES_REGISTRY,
  ProjectFileMeta,
  searchProjectFiles,
} from "@/services/projectFilesService";
import { applyApprovedChanges, readProjectFile, requestChangeApproval } from "@/services/aiTools/projectEngineService";
import { modifyProjectFileWithGemini, CodeModificationResult } from "@/services/geminiCodeService";
import { DEFAULT_GEMINI_MODEL } from "@/lib/gemini-config";
import { GeminiCodeDiffViewer } from "./GeminiCodeDiffViewer";

export function GeminiProjectFilesStudio() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedFile, setSelectedFile] = useState<ProjectFileMeta>(PROJECT_FILES_REGISTRY[0]);
  const [fileContent, setFileContent] = useState<string>("");
  const [engineStatus, setEngineStatus] = useState<string>("Draft");
  const [aiPrompt, setAiPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [modificationResult, setModificationResult] = useState<CodeModificationResult | null>(null);

  const categories = [
    { id: "all", label: "الكل", icon: FolderTree },
    { id: "routes", label: "الصفحات (Routes)", icon: Layers },
    { id: "components", label: "المكونات (Components)", icon: FileCode },
    { id: "services", label: "الخدمات والـ AI", icon: Sparkles },
    { id: "lib", label: "الحالة والمكتبات (Lib)", icon: Settings },
    { id: "styles", label: "التنسيق (Styles)", icon: Palette },
  ];

  const filteredFiles = searchProjectFiles(searchQuery, selectedCategory);

  const loadFile = async (file: ProjectFileMeta) => {
    setSelectedFile(file);
    setModificationResult(null);
    const result = await readProjectFile(file.path);
    if (result.ok && result.data?.content) {
      setFileContent(result.data.content);
      setEngineStatus("Project Engine: متصل بمصدر ملفات حقيقي");
    } else {
      setFileContent("");
      setEngineStatus(result.messageAr || result.error || "Project Engine غير مهيأ");
    }
  };

  const handleSelectFile = (file: ProjectFileMeta) => {
    void loadFile(file);
  };

  React.useEffect(() => {
    void loadFile(PROJECT_FILES_REGISTRY[0]);
  }, []);

  const handleRunAiModification = async () => {
    if (!aiPrompt.trim()) {
      toast.error("يرجى كتابة طلب التعديل الذي تريده على الملف");
      return;
    }

    setIsProcessing(true);
    try {
      const result = await modifyProjectFileWithGemini(
        aiPrompt,
        selectedFile.path,
        DEFAULT_GEMINI_MODEL,
      );
      setModificationResult(result);
      toast.success("قام Gemini بتوليد الكود المعدل وجاهز للمراجعة والتطبيق! ✨");
    } catch (e) {
      toast.error("حدث خطأ أثناء تعديل الملف");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveDirectEdit = async () => {
    setEngineStatus("Validating");
    try {
      const changeSet = { kind: "file_update", files: [{ filePath: selectedFile.path, content: fileContent }] };
      const approval = await requestChangeApproval(changeSet);
      if (approval.status === "NOT_CONFIGURED") {
        setEngineStatus("Not Configured");
        toast.error(approval.messageAr || approval.error || "محرك المشروع غير مهيأ");
        return;
      }
      if (approval.status !== "APPROVAL_REQUIRED" || !approval.data?.approvalToken) {
        setEngineStatus("Validation Failed");
        toast.error(approval.messageAr || approval.error || "تعذر تجهيز الموافقة");
        return;
      }
      setEngineStatus("Approval Required");
      setEngineStatus("Applying");
      const applied = await applyApprovedChanges(changeSet, approval.data.approvalToken);
      if (!applied.ok) {
        setEngineStatus("Apply Failed");
        toast.error(applied.messageAr || applied.error || "فشل التطبيق الحقيقي");
        return;
      }
      setEngineStatus("Applied");
      toast.success(`تمت موافقتك وتطبيق التعديل الحقيقي على ${selectedFile.name}`);
    } catch (error) {
      setEngineStatus("Apply Failed");
      toast.error(error instanceof Error ? error.message : "فشل حفظ التعديل");
    }
  };

  return (
    <div className="space-y-6 text-right font-sans" dir="rtl">
      {/* Top Banner */}
      <div className="rounded-3xl border border-border/80 bg-gradient-to-l from-emerald-600/10 via-card to-card p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl hero-gradient text-primary-foreground grid place-items-center shadow-xs">
            <FileCode className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-black font-display text-foreground">
              محرر ومعدل كود المشروع الذكي مع Gemini 💻
            </h2>
            <p className="text-xs text-muted-foreground font-medium">
              اختر ملفًا من فهرس الواجهة، ثم يقرأ Project Engine المحتوى الحقيقي قبل إنشاء مسودة تعديل.
              لا يتم تطبيق أي تغيير إلا بموافقة صريحة وتأكيد من مزود المشروع.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] bg-secondary text-muted-foreground font-bold px-3 py-1.5 rounded-xl border border-border/70">{engineStatus}</span>
          <span className="text-xs bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-black px-3 py-1.5 rounded-xl border border-emerald-500/30 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Real Project Engine Boundary</span>
          </span>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Sidebar: File Tree & Search (4 Cols) */}
        <div className="lg:col-span-4 space-y-3">
          <Card className="rounded-3xl border border-border/80 bg-card p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-foreground flex items-center gap-1.5">
                <FolderTree className="h-4 w-4 text-emerald-600" />
                <span>فهرس ملفات الواجهة ({filteredFiles.length})</span>
              </span>
            </div>

            {/* Search input */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن ملف..."
                className="h-9 pr-9 rounded-xl text-xs bg-secondary/50 border-border/80"
              />
            </div>

            {/* Category tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-all cursor-pointer ${
                    selectedCategory === cat.id
                      ? "hero-gradient text-primary-foreground shadow-2xs"
                      : "bg-secondary/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Files List */}
            <div className="max-h-[520px] overflow-y-auto space-y-1.5 pr-1">
              {filteredFiles.map((file) => {
                const isSelected = selectedFile.path === file.path;
                return (
                  <div
                    key={file.path}
                    onClick={() => handleSelectFile(file)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-black shadow-2xs"
                        : "border-border/60 bg-card/60 hover:bg-secondary/50 text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileCode className="h-4 w-4 text-emerald-600 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs truncate font-mono">{file.name}</div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {file.path}
                        </div>
                      </div>
                    </div>

                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-mono shrink-0">
                      {file.extension}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right Editor & AI Assistant (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* AI Prompt Box for Selected File */}
          <Card className="rounded-3xl border border-border/80 bg-card p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-black text-foreground">
                  طلب تعديل ذكي لملف:{" "}
                  <span className="font-mono text-emerald-600">{selectedFile.path}</span>
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground">{selectedFile.description}</span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Input
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="اكتب طلبك لجيميناي (مثال: أضف ميزة التوصيل السريع وإشعار صوتي عند تأكيد الطلب)..."
                disabled={isProcessing}
                className="h-11 rounded-2xl text-xs font-bold bg-secondary/50 border-border/80 flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRunAiModification();
                }}
              />
              <Button
                onClick={handleRunAiModification}
                disabled={isProcessing || !aiPrompt.trim()}
                className="h-11 px-5 rounded-2xl hero-gradient text-primary-foreground font-black text-xs gap-1.5 shadow-xs shrink-0 cursor-pointer"
              >
                <Sparkles className="h-4 w-4 text-amber-300" />
                <span>{isProcessing ? "جاري التعديل..." : "تعديل عبر Gemini"}</span>
              </Button>
            </div>

            {/* Quick Prompt Ideas */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
              <span className="text-[10px] text-muted-foreground font-bold shrink-0">
                أفكار مقترحة:
              </span>
              {[
                "أضف خيار التوصيل السريع وإشعار صوتي",
                "حسن التصميم والتجاوب مع الهواتف",
                "أضف ميزة حفظ الموقع الافتراضي",
                "أضف زر نسخ الكود وتصدير التقرير",
              ].map((idea, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setAiPrompt(idea)}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-secondary/70 text-muted-foreground hover:text-foreground hover:bg-secondary shrink-0 transition-colors cursor-pointer"
                >
                  {idea}
                </button>
              ))}
            </div>
          </Card>

          {/* AI Modification Diff Result if Available */}
          {modificationResult && (
            <GeminiCodeDiffViewer
              filePath={modificationResult.filePath}
              originalCode={modificationResult.originalCode}
              modifiedCode={modificationResult.modifiedCode}
              summary={modificationResult.summary}
              explanation={modificationResult.explanation}
              diffSummary={modificationResult.diffSummary}
              onApplied={() => {
                setFileContent(modificationResult.modifiedCode);
              }}
            />
          )}

          {/* Current Source Code Inspector & Manual Editor */}
          <Card className="rounded-3xl border border-border/80 bg-card overflow-hidden shadow-xs">
            <div className="p-3.5 bg-secondary/40 border-b border-border/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-black font-mono text-foreground">
                  {selectedFile.path}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(fileContent);
                    toast.success("تم نسخ الكود");
                  }}
                  className="h-8 px-3 text-xs font-bold rounded-xl gap-1.5"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>نسخ الكود</span>
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveDirectEdit}
                  className="h-8 px-3.5 text-xs font-black rounded-xl hero-gradient text-primary-foreground"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>حفظ التعديلات اليدوية</span>
                </Button>
              </div>
            </div>

            <Textarea
              rows={16}
              value={fileContent}
              onChange={(e) => setFileContent(e.target.value)}
              className="w-full font-mono text-xs text-left bg-slate-950 text-slate-100 p-4 border-none rounded-none focus-visible:ring-0 leading-relaxed"
              dir="ltr"
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
