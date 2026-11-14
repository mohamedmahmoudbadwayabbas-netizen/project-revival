import { describe, it, expect } from "vitest";
import { groqKeys, dahlKeys, xkiroKeys, orderKeys, markKeyCooldown } from "./ai-provider.server";

describe("ai provider env key pools", () => {
  it("collects GROQ_API_KEY, DAHL_API_KEY, XKIRO_API_KEY and numbered keys", () => {
    expect(groqKeys({ GROQ_API_KEY: "a", GROQ_API_KEY_2: "b", GROQ_API_KEY_3: "c,d" })).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
    expect(dahlKeys({ DAHL_API_KEY: "d1,d2", DAHL_API_KEY_2: "d3" })).toEqual(["d1", "d2", "d3"]);
    expect(xkiroKeys({ XKIRO_API_KEY: "x1" })).toEqual(["x1"]);
  });
  it("skips a key in cooldown", () => {
    markKeyCooldown("k1", 60000);
    expect(orderKeys(["k1", "k2", "k3"])).toEqual(["k2", "k3", "k1"]);
  });
});
