import { describe, expect, it } from "vitest";
import { callOpenAICompatible, modelQueue, openAIToGemini, suggestedModels } from "./ai-provider.server";
delete process.env.GROQ_API_KEY; // Dahl fallback tests must not hit the real Groq key

describe("provider fallback & thinking", () => {
  it("reads the models the gateway says are available now", () => {
    const msg = '429 {"error":{"message":"busy. Other models available now: MiniMaxAI/MiniMax-M2.7, deepseek-ai/DeepSeek-V4-Flash-0731. You can switch to one of them."}}';
    expect(suggestedModels(msg)).toEqual(["MiniMaxAI/MiniMax-M2.7", "deepseek-ai/DeepSeek-V4-Flash-0731"]);
  });
  it("moves <think> text into a thought part, keeping the reply clean", () => {
    const r = openAIToGemini({ choices: [{ message: { content: "<think>العميل بيسلم</think>أهلاً!" } }] });
    expect(r.text).toBe("أهلاً!");
    expect(r.candidates[0].content.parts).toEqual([{ text: "العميل بيسلم", thought: true }, { text: "أهلاً!" }]);
  });
  it("uses the backup key when the first key is busy (429)", async () => {
    const used: string[] = [];
    const orig = globalThis.fetch;
    globalThis.fetch = (async (_url: string, init: RequestInit) => {
      const key = String((init.headers as Record<string, string>).Authorization).replace("Bearer ", "");
      used.push(key);
      if (key === "key-one") return new Response('{"error":{"message":"rate limit"}}', { status: 429 });
      return new Response(JSON.stringify({ choices: [{ message: { content: "تمام" } }] }), { status: 200 });
    }) as typeof fetch;
    try {
      const r = await callOpenAICompatible(
        { provider: "dahl", api_key: "key-one,key-two", base_url: "https://inference.dahl.global/v1", model: "zai-org/GLM-5.3-Flash" },
        [{ role: "user", parts: [{ text: "أهلاً" }] }],
        {},
      );
      expect(r.text).toBe("تمام");
      expect(used).toEqual(["key-one", "key-two"]);
    } finally {
      globalThis.fetch = orig;
    }
  });
  it("skips the backup key and switches model when the model itself is at concurrency capacity", async () => {
    const calls: string[] = [];
    const orig = globalThis.fetch;
    globalThis.fetch = (async (_url: string, init: RequestInit) => {
      const key = String((init.headers as Record<string, string>).Authorization).replace("Bearer ", "");
      const model = JSON.parse(String(init.body)).model;
      calls.push(`${model}|${key}`);
      if (model === "zai-org/GLM-5.3-Flash") {
        return new Response('{"error":{"code":"model_concurrency","message":"This model is at concurrency capacity."}}', { status: 429 });
      }
      return new Response(JSON.stringify({ choices: [{ message: { content: "تمام" } }] }), { status: 200 });
    }) as typeof fetch;
    try {
      const r = await callOpenAICompatible(
        { provider: "dahl", api_key: "key-one,key-two", base_url: "https://other-dahl.dahl.global/v1", model: "zai-org/GLM-5.3-Flash" },
        "أهلاً",
        {},
      );
      expect(r.text).toBe("تمام");
      expect(calls).toEqual(["zai-org/GLM-5.3-Flash|key-one", "MiniMaxAI/MiniMax-M2.7|key-one"]);
    } finally {
      globalThis.fetch = orig;
    }
  });
  it("starts a second model in parallel when the first one is slow, and returns the faster reply", async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = (async (_url: string, init: RequestInit) => {
      const model = JSON.parse(String(init.body)).model;
      if (model === "MiniMaxAI/MiniMax-M2.7") {
        // نموذج بطيء: لا يرد إلا عند الإلغاء.
        return new Promise<Response>((_res, rej) => init.signal?.addEventListener("abort", () => rej(new Error("aborted"))));
      }
      return new Response(JSON.stringify({ choices: [{ message: { content: `من ${model}` } }] }), { status: 200 });
    }) as typeof fetch;
    try {
      const t = Date.now();
      const r = await callOpenAICompatible(
        { provider: "dahl", api_key: "k", base_url: "https://hedge.dahl.global/v1", model: "MiniMaxAI/MiniMax-M2.7" },
        "أهلاً",
        { hedgeMs: 50 },
      );
      expect(r.text).toBe("من zai-org/GLM-5.3-Flash");
      expect(Date.now() - t).toBeLessThan(2000);
    } finally {
      globalThis.fetch = orig;
    }
  });
  it("tries MiniMax before the other Dahl models, and the last working model first", () => {
    expect(modelQueue("zai-org/GLM-5.3-Flash", "https://x.dahl.global/v1", undefined)[1]).toBe("MiniMaxAI/MiniMax-M2.7");
    expect(modelQueue("zai-org/GLM-5.3-Flash", "https://x.dahl.global/v1", "deepseek-ai/DeepSeek-V4-Flash-0731")[0]).toBe("deepseek-ai/DeepSeek-V4-Flash-0731");
  });
});
