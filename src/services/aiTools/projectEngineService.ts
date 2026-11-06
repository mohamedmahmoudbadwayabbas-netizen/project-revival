import { supabase } from "@/integrations/supabase/client";

export type ProjectEngineStatus =
  | "SUCCESS"
  | "NOT_CONFIGURED"
  | "APPROVAL_REQUIRED"
  | "NOT_IMPLEMENTED"
  | "FAILED";

export interface ProjectEngineResponse<T = Record<string, unknown>> {
  ok: boolean;
  status: ProjectEngineStatus;
  messageAr: string;
  data?: T;
  error?: string;
  requestId?: string;
}

async function invokeProjectEngine<T = Record<string, unknown>>(
  operation: string,
  args: Record<string, unknown> = {},
): Promise<ProjectEngineResponse<T>> {
  const { data, error } = await supabase.functions.invoke("project-engine", {
    body: { operation, args },
  });

  if (error) {
    return {
      ok: false,
      status: "FAILED",
      messageAr: "تعذر الاتصال ببوابة محرك المشروع الحقيقية.",
      error: error.message,
    };
  }

  return (data ?? {
    ok: false,
    status: "FAILED",
    messageAr: "استجابة غير صالحة من محرك المشروع.",
  }) as ProjectEngineResponse<T>;
}

export function getProjectEngineStatus() {
  return invokeProjectEngine<{ configured: boolean; sourceOfTruth: string }>("status");
}

export function readProjectFile(filePath: string) {
  return invokeProjectEngine<{ filePath: string; content: string; lineCount: number }>(
    "getFileContent",
    { filePath },
  );
}

export function getProjectDirectoryTree(rootDir = "/src", maxDepth = 8) {
  return invokeProjectEngine<{
    rootDir: string;
    maxDepth: number;
    totalFiles: number;
    treeFormatted: string;
  }>("getDirectoryTree", { rootDir, maxDepth });
}

export function searchProjectCode(query: string, category?: string) {
  return invokeProjectEngine<{
    query: string;
    category: string;
    resultsCount: number;
    results: Array<Record<string, unknown>>;
  }>("searchCodebase", { query, category });
}


export function validateChangeSet(changeSet: Record<string, unknown>) {
  return invokeProjectEngine("validateChanges", { changeSet });
}

export function requestChangeApproval(changeSet: Record<string, unknown>) {
  return invokeProjectEngine<{
    approvalToken: string;
    expiresAt: string;
    changeSetHash: string;
  }>("prepareChangeSet", { changeSet });
}

export function applyApprovedChanges(
  changeSet: Record<string, unknown>,
  approvalToken: string,
) {
  return invokeProjectEngine("applyChanges", { changeSet, approvalToken });
}

export function createFileChange(filePath: string, content: string, description?: string) {
  return invokeProjectEngine("createFile", { filePath, content, description });
}

export function updateFileChange(
  filePath: string,
  changes: { searchPattern?: string; replacement?: string; newCode?: string },
) {
  return invokeProjectEngine("updateFile", { filePath, changes });
}

export function deleteFileChange(filePath: string) {
  return invokeProjectEngine("deleteFile", { filePath });
}

export function rollbackProjectChange(changeId?: string) {
  return invokeProjectEngine("rollback", { changeId });
}

export function gitCommitAndPushReal(commitMessage: string) {
  return invokeProjectEngine("gitCommitAndPush", { commitMessage });
}

export function gitRollbackReal(commitHash?: string) {
  return invokeProjectEngine("gitRollback", { commitHash });
}

export function getRealAppErrors(limit = 20) {
  return invokeProjectEngine("getAppErrors", { limit });
}
