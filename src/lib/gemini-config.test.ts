import { describe, expect, it } from "vitest";
import {
  buildGeminiModelChain,
  DEFAULT_GEMINI_IMAGE_MODEL,
  DEFAULT_GEMINI_MODEL,
} from "./gemini-config";

describe("buildGeminiModelChain", () => {
  it("appends gemini-3-flash-preview as fallback for chat and maps without duplicates", () => {
    expect(buildGeminiModelChain("chat", DEFAULT_GEMINI_MODEL)).toEqual([
      "gemini-2.5-flash",
      "gemini-3-flash-preview",
    ]);
    expect(buildGeminiModelChain("chat", "gemini-3-flash-preview")).toEqual([
      "gemini-3-flash-preview",
    ]);
    expect(buildGeminiModelChain("maps", DEFAULT_GEMINI_MODEL)).toEqual([
      "gemini-2.5-flash",
      "gemini-3-flash-preview",
    ]);
  });

  it("prioritizes active Gemini image models when legacy default image model is passed", () => {
    expect(buildGeminiModelChain("image", DEFAULT_GEMINI_IMAGE_MODEL)).toEqual([
      "gemini-2.5-flash-image",
      "gemini-3.1-flash-image-preview",
      "gemini-2.0-flash-exp",
    ]);
  });
});
