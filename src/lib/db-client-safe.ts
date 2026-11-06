/* =========================================================================
   DATABASE CLIENT RESILIENCE & SAFE QUERY WRAPPERS
   Guarantees zero UI crashes on network drops, missing columns, or RLS denials.
   ========================================================================= */

import { toast } from "sonner";

export interface SafeQueryResult<T> {
  data: T | null;
  error: string | null;
  rawError?: any;
  isFallback: boolean;
}

/**
 * Translates PostgreSQL and Supabase PostgREST error codes to Arabic.
 */
export function getArabicDbErrorMessage(error: any): string {
  if (!error) return "حدث خطأ غير متوقع في قاعدة البيانات";

  const message = (typeof error === "string" ? error : error.message || "").toLowerCase();
  const code = (error.code || "").toUpperCase();

  if (code === "42501" || message.includes("permission denied") || message.includes("row-level security")) {
    return "ليس لديك الصلاحيات الكافية لتنفيذ هذا الإجراء (RLS).";
  }
  if (code === "23505" || message.includes("duplicate key") || message.includes("unique constraint")) {
    return "هذا السجل مسجل بالفعل في النظام.";
  }
  if (code === "23503" || message.includes("foreign key") || message.includes("violates foreign key")) {
    return "تعذر إتمام العملية بسبب ارتباط هذا السجل بعناصر أخرى.";
  }
  if (code === "42P01" || message.includes("does not exist") || message.includes("relation")) {
    return "الجدول المطلوب غير متوفر حالياً، يرجى تشغيل سكربت إعداد قاعدة البيانات.";
  }
  if (message.includes("failed to fetch") || message.includes("network")) {
    return "تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت.";
  }

  return error.message || "حدث خطأ أثناء معالجة البيانات، يرجى المحاولة لاحقاً.";
}

/**
 * Safely executes a Supabase select query with automatic fallback data.
 */
export async function safeDbQuery<T>(
  queryPromise: Promise<{ data: T | null; error: any }>,
  fallbackData: T | null = null,
  options?: { silent?: boolean; errorMessage?: string }
): Promise<SafeQueryResult<T>> {
  try {
    const res = await queryPromise;

    if (res.error) {
      const arabicMsg = options?.errorMessage || getArabicDbErrorMessage(res.error);
      if (!options?.silent) {
        console.warn("[SafeDbQuery Warning]:", res.error);
      }
      return {
        data: fallbackData,
        error: arabicMsg,
        rawError: res.error,
        isFallback: true,
      };
    }

    return {
      data: res.data ?? fallbackData,
      error: null,
      isFallback: false,
    };
  } catch (err: any) {
    const arabicMsg = options?.errorMessage || getArabicDbErrorMessage(err);
    if (!options?.silent) {
      console.warn("[SafeDbQuery Catch]:", err);
    }
    return {
      data: fallbackData,
      error: arabicMsg,
      rawError: err,
      isFallback: true,
    };
  }
}

/**
 * Safely executes a Supabase insert/update/delete mutation with toast feedback.
 */
export async function safeDbMutation<T>(
  mutationPromise: Promise<{ data: T | null; error: any }>,
  options?: {
    successMessage?: string;
    errorMessage?: string;
    showToast?: boolean;
  }
): Promise<SafeQueryResult<T>> {
  const showToast = options?.showToast ?? true;

  try {
    const res = await mutationPromise;

    if (res.error) {
      const arabicMsg = options?.errorMessage || getArabicDbErrorMessage(res.error);
      if (showToast) {
        toast.error(arabicMsg);
      }
      return {
        data: null,
        error: arabicMsg,
        rawError: res.error,
        isFallback: true,
      };
    }

    if (options?.successMessage && showToast) {
      toast.success(options.successMessage);
    }

    return {
      data: res.data,
      error: null,
      isFallback: false,
    };
  } catch (err: any) {
    const arabicMsg = options?.errorMessage || getArabicDbErrorMessage(err);
    if (showToast) {
      toast.error(arabicMsg);
    }
    return {
      data: null,
      error: arabicMsg,
      rawError: err,
      isFallback: true,
    };
  }
}
