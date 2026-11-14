import { describe, it, expect } from "vitest";
import { gateProposal, consolidateRules, countDistinctSessions, isTechnicalBug } from "./reflection";

describe("governance reflection gate", () => {
  it("rejects confidence below 85%", () => {
    expect(gateProposal({ category: "hallucination", action_type: "inject_prompt_rule", confidence_score: 84 }, 5).accept).toBe(false);
  });
  it("hallucination needs only 1 session", () => {
    expect(gateProposal({ category: "hallucination", action_type: "inject_prompt_rule", confidence_score: 0.9 }, 1).accept).toBe(true);
  });
  it("synonym from 2 sessions is monitored, not accepted", () => {
    const d = gateProposal({ category: "synonym_gap", action_type: "add_search_synonym", confidence_score: 0.95 }, 2);
    expect(d).toEqual({ accept: false, monitor: true, reason: "insufficient_sessions" });
  });
  it("synonym from 3 sessions is accepted", () => {
    expect(gateProposal({ category: "synonym_gap", action_type: "add_search_synonym", confidence_score: 0.95 }, 3).accept).toBe(true);
  });
  it("rejects individual preference and conversion-harming fixes", () => {
    expect(gateProposal({ is_individual_preference: true, confidence_score: 1 }, 9).accept).toBe(false);
    expect(gateProposal({ harms_conversions: true, confidence_score: 1 }, 9).accept).toBe(false);
  });
  it("counts distinct users, not interactions", () => {
    const m = new Map([["a", { id: "a", actor_id: "u1" }], ["b", { id: "b", actor_id: "u1" }], ["c", { id: "c", actor_id: "u2" }]]);
    expect(countDistinctSessions(["a", "b", "c"], m)).toBe(2);
  });
  it("more than 6 tool calls is a technical bug", () => {
    expect(isTechnicalBug({ tools_called: new Array(7).fill({}) })).toBe(true);
    expect(isTechnicalBug({ tools_called: new Array(6).fill({}) })).toBe(false);
  });
  it("caps rules at 15 and merges overlapping", () => {
    const prev = Array.from({ length: 15 }, (_, i) => `rule number ${i} unique${i}`);
    expect(consolidateRules(prev, "brand new instruction here")).toHaveLength(15);
    expect(consolidateRules(["never invent product prices ever"], "never invent product prices")).toEqual(["never invent product prices"]);
  });
});
