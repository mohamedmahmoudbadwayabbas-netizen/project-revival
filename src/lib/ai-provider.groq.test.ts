import { describe, it, expect } from "vitest";
import { groqTune, fallbackModelsFor } from "./ai-provider.server";

describe("Groq tuning", () => {
  it("caps qwen output at 800 tokens (Groq limit 1000/min)", () => {
    expect(groqTune({ model: "qwen/qwen3.8-27b", max_tokens: 4096 }).max_tokens).toBe(800);
  });
  it("uses low reasoning for gpt-oss so replies are not empty", () => {
    expect(groqTune({ model: "openai/gpt-oss-120b" }).reasoning_effort).toBe("low");
  });
  it("uses the Arabic chat fallback on Groq", () => {
    expect(fallbackModelsFor("https://api.groq.com/openai/v1")[0]).toBe("openai/gpt-oss-20b");
  });
});
