import React, { useState } from "react";
import {
  FileCode,
  Search,
  FolderTree,
  Check,
  ChevronRight,
  Sparkles,
  Layers,
  FileText,
  Palette,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  PROJECT_FILES_REGISTRY,
  ProjectFileMeta,
  searchProjectFiles,
} from "@/services/projectFilesService";

interface GeminiFileAttachmentPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFile: (file: ProjectFileMeta) => void;
  selectedFilePath?: string;
}

export function GeminiFileAttachmentPicker({
  isOpen,
  onClose,
  onSelectFile,
  selectedFilePath,
}: GeminiFileAttachmentPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const categories = [
    { id: "all", label: "جميع الملفات", icon: FolderTree },
    { id: "routes", label: "الصفحات والمسارات (Routes)", icon: Layers },
    { id: "components", label: "المكونات (Components)", icon: FileCode },
    { id: "services", label: "الخدمات والذكاء الاصطناعي", icon: Sparkles },
    { id: "lib", label: "المكتبات والحالة (Lib/State)", icon: Settings },
    { id: "styles", label: "التنسيقات والتصميم", icon: Palette },
  ];

  const filteredFiles = searchProjectFiles(searchQuery, activeCategory);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl rounded-3xl p-6 font-sans text-right" dir="rtl">
        <DialogHeader className="space-y-1.5 text-right">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-2xl bg-emerald-500/15 text-emerald-600 grid place-items-center">
              <FileCode className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black font-display text-foreground">
                اختر ملف من المشروع لتعديله مع Gemini 📁
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                الفهرس هنا للتنقل فقط؛ محتوى الملف الحقيقي يجب أن يأتي من Project Engine قبل أي اقتراح تعديل.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Search Bar */}
        <div className="relative mt-2">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن ملف (مثال: cart.tsx، driver.tsx، Header.tsx)..."
            className="h-11 pr-10 rounded-2xl text-xs font-bold bg-secondary/50 border-border/80"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                  isActive
                    ? "hero-gradient text-primary-foreground shadow-xs"
                    : "bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Files List */}
        <div className="max-h-72 overflow-y-auto space-y-2 mt-2 pr-1">
          {filteredFiles.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-xs font-medium">
              لم يتم العثور على ملفات مطابقة للبحث.
            </div>
          ) : (
            filteredFiles.map((file) => {
              const isSelected = selectedFilePath === file.path;
              return (
                <div
                  key={file.path}
                  onClick={() => {
                    onSelectFile(file);
                    onClose();
                  }}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "border-border/70 bg-card hover:bg-secondary/50 hover:border-border"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-xl bg-secondary grid place-items-center shrink-0">
                      <FileCode className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black font-mono text-foreground">
                          {file.name}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-secondary text-muted-foreground font-mono">
                          {file.path}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate font-medium mt-0.5">
                        {file.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {file.lineCount && (
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {file.lineCount} سطر
                      </span>
                    )}
                    {isSelected ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
