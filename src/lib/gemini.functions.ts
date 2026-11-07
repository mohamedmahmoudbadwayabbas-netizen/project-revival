import { createServerFn } from "@tanstack/react-start";
import { GoogleGenAI } from "@google/genai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AI_TOOL_SUITE } from "@/services/aiTools/toolDefinitions";
import {
  DEFAULT_GEMINI_MODEL,
  DEFAULT_GEMINI_MAPS_MODEL,
  ALLOWED_IMAGE_MODELS,
} from "@/lib/gemini-config";

type GeminiPurpose = "chat" | "image" | "maps";
export type GeminiJsonValue =
  string | number | boolean | null | GeminiJsonValue[] | { [key: string]: GeminiJsonValue };
export interface GeminiClientResponse {
  text: string;
  candidates: Array<{
    content?: {
      parts?: Array<{
        text?: string;
        functionCall?: { name?: string; args?: { [key: string]: GeminiJsonValue } };
        inlineData?: { mimeType?: string; data?: string };
      }>;
    };
    groundingMetadata?: {
      groundingChunks?: Array<{
        web?: { uri?: string; title?: string };
        maps?: { [key: string]: GeminiJsonValue };
      }>;
    };
    finishReason?: string;
    safetyRatings?: GeminiJsonValue[];
  }>;
}
type GeminiRequest = {
  purpose: GeminiPurpose;
  model: string;
  contents: unknown;
  config?: Record<string, unknown>;
};

const IMAGE_MODELS = ALLOWED_IMAGE_MODELS;
const CUSTOMER_TOOLS = new Set(["searchProducts", "getCategories"]);
const ADMIN_ROLES = new Set(["admin", "super_admin"]);
const MODERATOR_GROUPS = new Set([
  "catalog",
  "media",
  "ui",
  "operations",
  "marketing",
  "universal",
]);

function getRequestedTools(config: Record<string, unknown> | undefined): string[] {
  const tools = Array.isArray(config?.tools) ? config.tools : [];
  const names: string[] = [];
  for (const tool of tools) {
    if (!tool || typeof tool !== "object") throw new Error("Invalid Gemini tool configuration.");
    const item = tool as Record<string, unknown>;
    if (item.googleSearch && Object.keys(item).every((key) => key === "googleSearch")) {
      names.push("googleSearch");
      continue;
    }
    if (
      Array.isArray(item.functionDeclarations) &&
      Object.keys(item).every((key) => key === "functionDeclarations")
    ) {
      for (const declaration of item.functionDeclarations) {
        if (
          !declaration ||
          typeof declaration !== "object" ||
          typeof (declaration as Record<string, unknown>).name !== "string"
        ) {
          throw new Error("Invalid Gemini function declaration.");
        }
        names.push((declaration as Record<string, unknown>).name as string);
      }
      continue;
    }
    if (item.googleMaps && Object.keys(item).every((key) => key === "googleMaps")) {
      names.push("googleMaps");
      continue;
    }
    throw new Error("Unsupported Gemini tool configuration.");
  }
  return names;
}

function assertValidRequest(data: GeminiRequest): GeminiRequest {
  if (!data || !["chat", "image", "maps"].includes(data.purpose))
    throw new Error("Invalid Gemini request purpose.");
  if (typeof data.model !== "string" || !data.model.trim())
    throw new Error("A Gemini model is required.");
  if (!data.contents || (!Array.isArray(data.contents) && typeof data.contents !== "string"))
    throw new Error("Gemini contents are required.");
  const serialized = JSON.stringify({ contents: data.contents, config: data.config ?? {} });
  const maxBytes = data.purpose === "image" ? 8_000_000 : data.purpose === "maps" ? 8_000 : 64_000;
  if (serialized.length > maxBytes) throw new Error("Gemini request is too large.");
  return data;
}

export const generateGeminiContent = createServerFn({ method: "POST" })
  .validator(assertValidRequest)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<GeminiClientResponse> => {
    let roleValue: unknown = null;
    const { data: rpcRole, error: roleError } = await context.supabase.rpc("get_my_role");
    if (!roleError && rpcRole) {
      roleValue = rpcRole;
    } else {
      // Some deployed schemas expose an own-row RLS policy for user_roles but
      // do not have the optional convenience RPC. Fall back to that same
      // caller-scoped table read; never trust a role supplied by the browser.
      const { data: roles, error: rolesError } = await context.supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", context.userId);
      if (rolesError) throw new Error("Could not verify the signed-in user's store role.");
      roleValue = roles?.some((row) => String(row.role) === "super_admin")
        ? "super_admin"
        : roles?.some((row) => String(row.role) === "admin")
          ? "admin"
          : roles?.some((row) => String(row.role) === "moderator")
            ? "moderator"
            : roles?.some((row) => String(row.role) === "staff")
              ? "staff"
              : roles?.some((row) => String(row.role) === "driver")
                ? "driver"
                : roles?.some((row) => String(row.role) === "customer")
                  ? "customer"
                  : null;
    }
    const role = String(roleValue ?? "").toLowerCase();
    const isAdmin = ADMIN_ROLES.has(role);
    const isModerator = role === "moderator";

    if (data.purpose === "image" && !isAdmin)
      throw new Error("Image generation is available to store admins only.");
    if (
      data.purpose === "chat" &&
      !isAdmin &&
      !isModerator &&
      role !== "customer" &&
      role !== "user"
    ) {
      throw new Error("The customer assistant is available to customer accounts only.");
    }
    if (
      data.purpose === "maps" &&
      !["customer", "user", "staff", "moderator", "admin", "super_admin", "driver"].includes(role)
    ) {
      throw new Error("Map grounding is not available for this account role.");
    }

    if (data.purpose === "image" && !IMAGE_MODELS.has(data.model))
      throw new Error("That image model is not allowed.");
    if (data.purpose === "maps" && data.model !== DEFAULT_GEMINI_MAPS_MODEL)
      throw new Error("That maps model is not allowed.");

    const requestedTools = getRequestedTools(data.config);
    if (data.purpose === "image" && requestedTools.length)
      throw new Error("Tools are not supported for image generation.");
    if (data.purpose === "maps" && requestedTools.some((name) => name !== "googleMaps")) {
      throw new Error("Only Google Maps grounding is allowed for map requests.");
    }
    if (data.purpose === "maps" && requestedTools.length !== 1) {
      throw new Error("Map requests must include the Google Maps grounding tool.");
    }
    if (data.purpose === "chat") {
      const allowed = isAdmin
        ? new Set([...AI_TOOL_SUITE.map((tool) => tool.name), "googleSearch"])
        : isModerator
          ? new Set([
              ...AI_TOOL_SUITE.filter((tool) => MODERATOR_GROUPS.has(tool.group)).map(
                (tool) => tool.name,
              ),
              "googleSearch",
            ])
          : new Set(CUSTOMER_TOOLS);
      if (requestedTools.some((name) => !allowed.has(name)))
        throw new Error("This account cannot use one or more requested Gemini tools.");
      if (!isAdmin && !isModerator && requestedTools.length === 0) {
        throw new Error("Customer assistant requests must include the catalog read tools.");
      }
    }

    const {
      loadAiSettings,
      callOpenAICompatible,
      classifyProviderError,
      recordAiAlert,
      ProviderError,
    } = await import("@/lib/ai-provider.server");
    const settings = await loadAiSettings();
    const provider = settings?.provider || "gemini";

    // أي مزود غير Gemini يُستدعى عبر المعيار الموحد المتوافق مع OpenAI.
    const groqAvailable = !!process.env.GROQ_API_KEY;
    if (data.purpose === "chat" && ((provider !== "gemini" && settings) || groqAvailable)) {
      try {
        const res = await callOpenAICompatible(
          settings ?? { provider: "groq", api_key: null, base_url: null, model: null },
          data.contents,
          { ...(data.config ?? {}), chatModel: "llama-3.3-70b-versatile" },
        );
        return JSON.parse(JSON.stringify(res)) as GeminiClientResponse;
      } catch (error) {
        const status = error instanceof ProviderError ? error.status : null;
        const kind = classifyProviderError(status, String((error as Error)?.message ?? error));
        if (kind) await recordAiAlert(kind, provider);
        if (kind === "quota")
          throw new Error(
            "429 RESOURCE_EXHAUSTED: نفدت حصة مفتاح الذكاء الاصطناعي. تم تنبيه مسؤول المتجر.",
          );
        if (kind === "auth")
          throw new Error("401: مفتاح الذكاء الاصطناعي غير صالح. تم تنبيه مسؤول المتجر.");
        throw error;
      }
    }

    const { splitKeys } = await import("@/lib/ai-provider.server");
    const savedKeys = provider === "gemini" ? splitKeys(settings?.api_key) : [];
    const keys = savedKeys.length ? savedKeys : splitKeys(process.env["GEMINI_API_KEY"]);
    if (!keys.length)
      throw new Error(
        "لم يتم وضع مفتاح الذكاء الاصطناعي بعد. يمكن للمسؤول إضافته من الإعدادات ← الذكاء الاصطناعي.",
      );
    const config = { ...data.config };
    if (data.purpose === "chat" || data.purpose === "maps") {
      const requestedMax = Number(config.maxOutputTokens);
      const maxOutputTokens = data.purpose === "chat" ? 4096 : 512;
      config.maxOutputTokens =
        Number.isFinite(requestedMax) && requestedMax > 0
          ? Math.min(requestedMax, maxOutputTokens)
          : maxOutputTokens;
    }
    const savedModel = provider === "gemini" ? settings?.model?.trim() : "";
    const chatModelOverride = savedModel || process.env["GEMINI_CHAT_MODEL"]?.trim();
    const model = data.purpose === "chat" && chatModelOverride ? chatModelOverride : data.model;
    let response: Awaited<ReturnType<GoogleGenAI["models"]["generateContent"]>> | undefined;
    let lastError: unknown;
    const chain = data.purpose === "image" ? [model, model] : [model];
    // تدوير المفاتيح: إذا نفدت حصة مفتاح أو كان غير صالح ننتقل للمفتاح التالي تلقائيًا.
    keyLoop: for (let k = 0; k < keys.length; k++) {
      const ai = new GoogleGenAI({
        apiKey: keys[k],
        httpOptions: { timeout: 45000, retryOptions: { attempts: 1 } },
      });
      for (let attempt = 0; attempt < chain.length; attempt++) {
        try {
          response = await ai.models.generateContent({
            model: chain[attempt],
            contents: data.contents as any,
            config: config as any,
          });
          break keyLoop;
        } catch (error) {
          lastError = error;
          const msg = String((error as Error)?.message ?? error);
          console.error(`[gemini] key#${k + 1} ${chain[attempt]} failed:`, msg.slice(0, 300));
          const kind = classifyProviderError(null, msg);
          if (kind === "auth") continue keyLoop;
          // الحصة اليومية تُحسب لكل نموذج، لذلك ننتقل فورًا للنموذج البديل التالي بنفس المفتاح.
          if (kind === "quota" && /per.?day|PerDay|daily/i.test(msg)) continue;
          // نموذج غير متاح لهذا المفتاح → جرّب البديل التالي.
          if (/\b404\b|NOT_FOUND|no longer available|not found/i.test(msg)) continue;
          if (
            !/503|UNAVAILABLE|429|RESOURCE_EXHAUSTED|high demand|timed? ?out|aborted|deadline/i.test(
              msg,
            )
          )
            throw error;
          await new Promise((r) => setTimeout(r, 400));
        }
      }
    }
    if (
      !response &&
      classifyProviderError(null, String((lastError as Error)?.message ?? lastError)) === "auth"
    ) {
      await recordAiAlert("auth", "gemini");
      throw lastError;
    }
    if (!response) {
      const msg = String((lastError as Error)?.message ?? lastError);
      if (classifyProviderError(null, msg) === "quota") {
        await recordAiAlert("quota", "gemini");
        throw new Error(
          "429 RESOURCE_EXHAUSTED: نفدت حصة مفتاح الذكاء الاصطناعي. تم تنبيه مسؤول المتجر.",
          { cause: lastError },
        );
      }
      throw new Error("خدمة الذكاء الاصطناعي مزدحمة حاليًا، يرجى المحاولة بعد لحظات.", {
        cause: lastError,
      });
    }

    const serializable = JSON.parse(
      JSON.stringify({
        text: response.text || "",
        candidates: response.candidates ?? [],
      }),
    ) as GeminiClientResponse;
    return serializable;
  });
