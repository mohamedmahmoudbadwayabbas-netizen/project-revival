/* =========================================================================
   GEMINI AI ADMIN ENGINE — STRICT ENVIRONMENT & API KEY VALIDATION
   Runtime Diagnostics, Live Client Instantiation & Key Validation
   ========================================================================= */

export const getSupabaseUrl = (): string | undefined => {
  let metaUrl: string | undefined;
  try {
    metaUrl = import.meta.env.VITE_SUPABASE_URL;
  } catch {
    metaUrl = undefined;
  }

  let procUrl: string | undefined;
  try {
    if (typeof process !== "undefined" && process?.env) {
      procUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    }
  } catch {
    procUrl = undefined;
  }

  const resolved = metaUrl || procUrl;

  if (typeof resolved === "string" && resolved.trim().length > 0) {
    return resolved.trim();
  }
  return undefined;
};

export const getSupabaseAnonKey = (): string | undefined => {
  let metaKey: string | undefined;
  try {
    metaKey =
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      import.meta.env.VITE_SUPABASE_ANON_KEY;
  } catch {
    metaKey = undefined;
  }

  let procKey: string | undefined;
  try {
    if (typeof process !== "undefined" && process?.env) {
      procKey =
        process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
        process.env.VITE_SUPABASE_ANON_KEY ||
        process.env.SUPABASE_PUBLISHABLE_KEY ||
        process.env.SUPABASE_ANON_KEY;
    }
  } catch {
    procKey = undefined;
  }

  const resolved = metaKey || procKey;

  if (typeof resolved === "string" && resolved.trim().length > 0) {
    return resolved.trim();
  }
  return undefined;
};

// Gemini credentials are server-only. The browser can confirm connectivity
// only by making an authenticated request through the Gemini server function.
export const isGeminiConfigured = (): boolean => false;

export const isSupabaseConfigured = (): boolean => {
  const url = getSupabaseUrl() || "";
  const key = getSupabaseAnonKey() || "";
  return Boolean(url && key && !url.includes("placeholder.supabase.co"));
};

export interface DiagnosticEnvironmentStatus {
  geminiReady: boolean;
  supabaseReady: boolean;
  mode: "full_live" | "gemini_only" | "supabase_only" | "local_mock";
  supabaseUrlConfigured: boolean;
  warnings: string[];
}

export function validateEnvironment(): DiagnosticEnvironmentStatus {
  const geminiReady = isGeminiConfigured();
  const supabaseReady = isSupabaseConfigured();
  const supabaseUrlConfigured = Boolean(getSupabaseUrl());
  const warnings: string[] = [];

  if (!geminiReady) {
    const warn = "[AI Engine Diagnostics] No Gemini key is exposed to the browser. Server-side GEMINI_API_KEY availability is checked per request.";
    console.info(warn);
    warnings.push(warn);
  }

  if (!supabaseReady) {
    const warn = "[AI Engine Diagnostics] Supabase configuration is missing or a placeholder. Store-data reads and database mutations fail closed; no mock catalog is used.";
    console.warn(warn);
    warnings.push(warn);
  } else {
    console.info("[AI Engine Diagnostics] Supabase configuration is present; each database-backed tool must still confirm its own read or write result.");
  }

  let mode: "full_live" | "gemini_only" | "supabase_only" | "local_mock" = "local_mock";
  if (geminiReady && supabaseReady) mode = "full_live";
  else if (geminiReady && !supabaseReady) mode = "gemini_only";
  else if (!geminiReady && supabaseReady) mode = "supabase_only";

  return {
    geminiReady,
    supabaseReady,
    mode,
    supabaseUrlConfigured,
    warnings,
  };
}

export function getAiEngineStatus(): {
  geminiReady: boolean;
  supabaseReady: boolean;
  mode: "full_live" | "gemini_only" | "supabase_only" | "local_mock";
} {
  const status = validateEnvironment();
  return {
    geminiReady: status.geminiReady,
    supabaseReady: status.supabaseReady,
    mode: status.mode,
  };
}

export interface GeminiApiErrorInfo {
  statusCode: number | null;
  code: string;
  isAuthError: boolean;
  isNotFoundError: boolean;
  isRateLimitError: boolean;
  messageAr: string;
  safeDetail: string;
}

function getSafeErrorDetail(err: any): string {
  const candidates = [
    err?.message,
    err?.statusText,
    err?.cause?.message,
    err?.data?.message,
    err?.data,
    err?.response?.statusText,
    err?.response?.data?.message,
    err?.response?.data,
    typeof err === "string" ? err : "",
  ];
  const raw = candidates
    .map((value) => typeof value === "string" ? value : value ? JSON.stringify(value) : "")
    .find((value) => value.trim())?.trim() || "";
  if (!raw) return "";
  return raw
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "[مفتاح محجوب]")
    .replace(/sb_(?:secret|publishable)_[0-9A-Za-z_-]+/g, "[مفتاح Supabase محجوب]")
    .replace(/Bearer\s+\S+/gi, "Bearer [محجوب]")
    .replace(/([?&](?:key|api_key)=)[^&\s]+/gi, "$1[محجوب]")
    .slice(0, 240);
}

export function diagnoseGeminiError(err: any): GeminiApiErrorInfo {
  const candidates = [
    err?.message,
    err?.statusText,
    err?.cause?.message,
    err?.data?.message,
    err?.data,
    err?.response?.statusText,
    err?.response?.data?.message,
    err?.response?.data,
    typeof err === "string" ? err : "",
  ];
  const errorStr = candidates
    .map((value) => typeof value === "string" ? value : value ? JSON.stringify(value) : "")
    .filter(Boolean)
    .join(" ");
  const explicitStatus = [
    err?.status,
    err?.statusCode,
    err?.response?.status,
    err?.data?.status,
    err?.data?.code,
    err?.data?.error?.code,
    err?.response?.data?.status,
    err?.response?.data?.code,
    err?.response?.data?.error?.code,
  ].find((value) => Number.isInteger(Number(value)) && Number(value) >= 400 && Number(value) < 600);
  const status = Number(explicitStatus || errorStr.match(/\b(401|403|404|429|500|502|503)\b/)?.[1] || 0) || null;

  const isAuthError = status === 401 || errorStr.includes("API_KEY_INVALID") || errorStr.includes("unauthenticated") || errorStr.includes("401");
  const isNotFoundError = status === 404 || errorStr.includes("models/") || errorStr.includes("not found") || errorStr.includes("404");
  const isRateLimitError = status === 429 || errorStr.includes("RESOURCE_EXHAUSTED") || errorStr.includes("quota") || errorStr.includes("rate limit") || errorStr.includes("429");
  const isServiceUnavailable = status === 503 || errorStr.includes("UNAVAILABLE") || errorStr.includes("high demand");

  let messageAr = "حدث خطأ غير متوقع أثناء استدعاء نموذج Gemini.";
  if (isAuthError) {
    messageAr = "مفتاح Gemini API غير صالح أو منتهي الصلاحية (HTTP 401). يرجى التحقق من متغير البية GEMINI_API_KEY.";
    console.error("[AI Engine Diagnostics] Gemini authentication failed (HTTP 401).");
  } else if (isNotFoundError) {
    messageAr = "النموذج المطلوب غير متاح أو قديم (HTTP 404). سيتم تجربة النماذج البديلة المهيأة؛ إذا فشلت فلن تُنفذ أي أداة.";
    console.error("[AI Engine Diagnostics] Requested Gemini model was not found (HTTP 404).");
  } else if (isRateLimitError) {
    messageAr = "تم تجاوز حد الطلبات المسموح به لـ Gemini API مؤقتاً (HTTP 429). لم يتم تشغيل محرك ردود محلي أو تنفيذ أدوات بدونه.";
    console.warn("[AI Engine Diagnostics] Gemini quota or rate limit reached (HTTP 429).");
  } else if (isServiceUnavailable) {
    messageAr = "خدمة Gemini مزدحمة مؤقتًا (HTTP 503). أُعيدت المحاولة تلقائيًا؛ لم تُنفذ أي أداة. انتظر قليلًا ثم أعد المحاولة.";
    console.warn("[AI Engine Diagnostics] Gemini service unavailable (HTTP 503).");
  } else {
    console.error("[AI Engine Diagnostics] Gemini request failed.");
  }

  return {
    statusCode: status,
    code: isAuthError ? "AUTH_401" : status === 403 ? "PERMISSION_403" : isNotFoundError ? "MODEL_404" : isRateLimitError ? "RATE_429" : isServiceUnavailable ? "SERVICE_503" : "GENERIC_ERROR",
    isAuthError,
    isNotFoundError,
    isRateLimitError,
    messageAr,
    safeDetail: getSafeErrorDetail(err),
  };
}


