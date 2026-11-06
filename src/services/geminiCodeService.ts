import { readProjectFile } from "./aiTools/projectEngineService";
import { generateFileModification } from "@/lib/ai-code.functions";
import { DEFAULT_GEMINI_MODEL } from "@/lib/gemini-config";

export interface CodeModificationResult {
  filePath: string;
  originalCode: string;
  modifiedCode: string;
  explanation: string;
  summary: string;
  diffSummary: {
    addedLinesCount: number;
    removedLinesCount: number;
  };
  modelUsed: string;
  status: "success" | "warning" | "error";
}

export function computeDiff(original: string, modified: string) {
  const origLines = original.split("\n");
  const modLines = modified.split("\n");
  let added = 0;
  let removed = 0;
  const maxLen = Math.max(origLines.length, modLines.length);
  for (let i = 0; i < maxLen; i++) {
    if (i >= origLines.length) added++;
    else if (i >= modLines.length) removed++;
    else if (origLines[i] !== modLines[i]) {
      added++;
      removed++;
    }
  }
  return { addedLinesCount: added, removedLinesCount: removed };
}

/**
 * Generate a DRAFT only. The current file is fetched from the real Project
 * Engine and the generated code is never persisted by this function.
 */
export async function modifyProjectFileWithGemini(
  userPrompt: string,
  filePath: string,
  modelName = DEFAULT_GEMINI_MODEL,
): Promise<CodeModificationResult> {
  const path = filePath.trim();
  if (!path || !userPrompt.trim()) throw new Error("مسار الملف وطلب التعديل مطلوبان.");

  const current = await readProjectFile(path);
  if (!current.ok || !current.data?.content) {
    throw new Error(current.error || current.messageAr || "تعذر قراءة الملف الحقيقي من Project Engine.");
  }

  const response = await generateFileModification({
    data: {
      filePath: path,
      currentCode: current.data.content,
      prompt: userPrompt.trim(),
    },
  });

  if (!response.ok || !response.modifiedCode) {
    throw new Error(response.error || "تعذر توليد مسودة كود صالحة.");
  }

  return {
    filePath: path,
    originalCode: current.data.content,
    modifiedCode: response.modifiedCode,
    explanation: response.explanation,
    summary: response.summary,
    diffSummary: computeDiff(current.data.content, response.modifiedCode),
    modelUsed: modelName,
    status: "success",
  };
}
