/* =========================================================================
   GEMINI AI ADMIN ENGINE — REAL PROJECT ENGINE TOOLS
   Server-side gateway only. No browser filesystem, fake registry, fake git,
   fabricated source, or fabricated success states.
   ========================================================================= */

import {
  applyApprovedChanges,
  createFileChange,
  deleteFileChange,
  getProjectDirectoryTree,
  getRealAppErrors,
  gitCommitAndPushReal,
  gitRollbackReal,
  readProjectFile,
  rollbackProjectChange,
  searchProjectCode,
  updateFileChange,
} from "./projectEngineService";
import type { ProjectEngineResponse } from "./projectEngineService";
import type { ToolExecutionContext, ToolExecutionResult } from "./types";

function mapResponse(tool: ToolExecutionResult["tool"], response: ProjectEngineResponse): ToolExecutionResult {
  return {
    tool,
    ok: response.ok,
    success: response.ok,
    messageAr: response.messageAr,
    error: response.error,
    verified: response.ok,
    verificationDetails: response.status,
    data: response.data,
  };
}

export async function getDirectoryTree(
  args: { rootDir?: string; maxDepth?: number } = {},
): Promise<ToolExecutionResult> {
  return mapResponse("getDirectoryTree", await getProjectDirectoryTree(args.rootDir || "/src", args.maxDepth || 8));
}

export async function getFileContentTool(args: { filePath?: string }): Promise<ToolExecutionResult> {
  const path = (args.filePath || "").trim();
  if (!path) return { tool: "getFileContent", ok: false, success: false, messageAr: "مسار الملف (filePath) مطلوب." };
  return mapResponse("getFileContent", await readProjectFile(path));
}

export async function searchCodebase(
  args: { query?: string; category?: string },
): Promise<ToolExecutionResult> {
  const query = (args.query || "").trim();
  if (!query) return { tool: "searchCodebase", ok: false, success: false, messageAr: "نص البحث (query) مطلوب." };
  return mapResponse("searchCodebase", await searchProjectCode(query, args.category));
}

export async function getAppErrors(args: { limit?: number } = {}): Promise<ToolExecutionResult> {
  return mapResponse("getAppErrors", await getRealAppErrors(Number(args.limit || 20)));
}

/**
 * Mutation tools intentionally stop at an approval-gated change set.
 * They never write to localStorage and never claim that a real file changed.
 */
export async function writeNewFile(
  args: { filePath?: string; content?: string; description?: string },
  _ctx?: ToolExecutionContext,
): Promise<ToolExecutionResult> {
  const path = (args.filePath || "").trim();
  if (!path) return { tool: "writeNewFile", ok: false, success: false, messageAr: "مسار الملف (filePath) مطلوب." };
  const response = await createFileChange(path, args.content ?? "", args.description);
  return mapResponse("writeNewFile", response);
}

export async function updateFileAST(
  args: { filePath?: string; changes?: { searchPattern?: string; replacement?: string; newCode?: string } },
  _ctx?: ToolExecutionContext,
): Promise<ToolExecutionResult> {
  const path = (args.filePath || "").trim();
  if (!path) return { tool: "updateFileAST", ok: false, success: false, messageAr: "مسار الملف (filePath) مطلوب." };
  const response = await updateFileChange(path, args.changes || {});
  return mapResponse("updateFileAST", response);
}

export async function deleteFileTool(
  args: { filePath?: string },
  _ctx?: ToolExecutionContext,
): Promise<ToolExecutionResult> {
  const path = (args.filePath || "").trim();
  if (!path) return { tool: "deleteFile", ok: false, success: false, messageAr: "مسار الملف مطلوب لحذفه." };
  return mapResponse("deleteFile", await deleteFileChange(path));
}

export interface GitCommitRecord {
  hash: string;
  message: string;
  timestamp: string;
  author: string;
  filesModified: string[];
}

/** Legacy API retained only for compatibility; it never fabricates a commit log. */
export function getGitCommits(): GitCommitRecord[] {
  return [];
}

export async function gitCommitAndPush(
  args: { commitMessage?: string },
  _ctx?: ToolExecutionContext,
): Promise<ToolExecutionResult> {
  const msg = (args.commitMessage || "chore: AI project change").trim();
  return mapResponse("gitCommitAndPush", await gitCommitAndPushReal(msg));
}

export async function gitRollbackCommit(
  args: { commitHash?: string } = {},
  _ctx?: ToolExecutionContext,
): Promise<ToolExecutionResult> {
  return mapResponse("gitRollbackCommit", await gitRollbackReal(args.commitHash));
}

export async function applyChangeSet(
  changeSet: Record<string, unknown>,
  approvalToken: string,
): Promise<ToolExecutionResult> {
  return mapResponse("writeNewFile", await applyApprovedChanges(changeSet, approvalToken));
}

export async function rollbackChange(changeId?: string): Promise<ToolExecutionResult> {
  return mapResponse("gitRollbackCommit", await rollbackProjectChange(changeId));
}
