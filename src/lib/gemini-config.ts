/**
 * =========================================================================
 * GEMINI MODEL CENTRAL CONFIGURATION
 * Single source of truth for Gemini model identifiers across the application.
 * =========================================================================
 */

export const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash" as const;
export const DEFAULT_LOVABLE_GATEWAY_GEMINI_MODEL = "google/gemini-3.8-flash" as const;
export const DEFAULT_GEMINI_MAPS_MODEL = "gemini-3.8-flash" as const;

export const DEFAULT_GEMINI_IMAGE_MODEL = "gemini-3.1-flash-image" as const;
export const DEFAULT_GEMINI_IMAGE_LITE_MODEL = "gemini-3.1-flash-lite-image" as const;

export const GEMINI_PRODUCTION_FALLBACK_MODELS = [
  DEFAULT_GEMINI_MODEL,
] as const;

export const ALLOWED_CHAT_MODELS = new Set<string>([DEFAULT_GEMINI_MODEL]);

export const ALLOWED_IMAGE_MODELS = new Set<string>([
  DEFAULT_GEMINI_IMAGE_LITE_MODEL,
  DEFAULT_GEMINI_IMAGE_MODEL,
]);
