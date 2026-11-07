import { describe, it, expect } from "vitest";
import { analyzeSignals } from "./analyze";

const miss = (id: string, q: string) => ({
  id,
  outcome: "no_results",
  tools_called: [{ query: q, ok: true, count: 0 }],
});

describe("analyzeSignals", () => {
  it("proposes when the same empty search repeats 2+ times", () => {
    const d = analyzeSignals([miss("a", "مانجو"), miss("b", " مانجو ")], []);
    expect(d).toHaveLength(1);
    expect(d[0].source_interaction_ids).toEqual(["a", "b"]);
    expect(d[0].risk_tier).toBe("low");
  });
  it("ignores a single empty search", () => {
    expect(analyzeSignals([miss("a", "مانجو")], [])).toHaveLength(0);
  });
  it("groups repeated negative reasons", () => {
    const fb = [
      { interaction_id: "x", rating: -1, comment: "[سعر غلط]" },
      { interaction_id: "y", rating: -1, comment: "[سعر غلط، بطيء] تعليق" },
      { interaction_id: "z", rating: 1, comment: "[سعر غلط]" },
    ];
    const d = analyzeSignals([], fb);
    expect(d.map((x) => x.dedupe_key)).toEqual(["neg:سعر غلط"]);
  });
});
