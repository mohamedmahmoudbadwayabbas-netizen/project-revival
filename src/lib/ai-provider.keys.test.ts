import { describe, it, expect } from "vitest";
import { groqKeys, orderKeys, markKeyCooldown } from "./ai-provider.server";

describe("groq key pool", () => {
  it("collects GROQ_API_KEY and numbered keys", () => {
    expect(groqKeys({ GROQ_API_KEY: "a", GROQ_API_KEY_2: "b", GROQ_API_KEY_3: "c,d" })).toEqual(["a", "b", "c", "d"]);
  });
  it("skips a key in cooldown", () => {
    markKeyCooldown("k1", 60000);
    expect(orderKeys(["k1", "k2", "k3"])).toEqual(["k2", "k3", "k1"]);
  });
});
