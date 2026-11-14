/**
 * Self-Reflection & Critique governance gate (pure, testable).
 * Prevents single-feedback overfitting and rule bloat.
 */
export const MIN_CONFIDENCE = 0.85;
export const MAX_DYNAMIC_RULES = 15;
export const MAX_TOOL_CALLS_PER_TURN = 6;
/** Categories treated as zero-tolerance technical bugs (1 session is enough). */
export const ZERO_TOLERANCE_CATEGORIES = new Set(["hallucination", "language_leak", "empty_response", "tool_loop"]);
/** Actions that change behavior for everyone → need ≥3 distinct sessions unless zero-tolerance. */
export const GLOBAL_ACTIONS = new Set(["inject_prompt_rule", "add_search_synonym", "create_draft_product"]);
export const MIN_DISTINCT_SESSIONS_GLOBAL = 3;

export type InteractionLite = { id: string; thread_id?: string | null; actor_id?: string | null };

/** Count distinct sessions (thread → actor → interaction id) behind the sample ids. */
export function countDistinctSessions(ids: string[], byId: Map<string, InteractionLite>): number {
  const keys = new Set<string>();
  for (const id of ids ?? []) {
    const it = byId.get(id);
    if (!it) continue;
    keys.add(it.actor_id ? `u:${it.actor_id}` : it.thread_id ? `t:${it.thread_id}` : `i:${it.id}`);
  }
  return keys.size;
}

export function normalizeConfidence(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return n > 1 ? n / 100 : n;
}

export type GateDecision = { accept: boolean; monitor: boolean; reason: string };

export function gateProposal(
  p: { category?: string; action_type?: string; confidence_score?: unknown; harms_conversions?: unknown; is_individual_preference?: unknown },
  distinctSessions: number,
): GateDecision {
  if (p.is_individual_preference === true) return { accept: false, monitor: false, reason: "individual_preference" };
  if (p.harms_conversions === true) return { accept: false, monitor: false, reason: "negative_side_effects" };
  if (normalizeConfidence(p.confidence_score) < MIN_CONFIDENCE) return { accept: false, monitor: false, reason: "low_confidence" };
  const zeroTol = ZERO_TOLERANCE_CATEGORIES.has(String(p.category));
  const needed = zeroTol ? 1 : GLOBAL_ACTIONS.has(String(p.action_type)) ? MIN_DISTINCT_SESSIONS_GLOBAL : 1;
  if (distinctSessions < needed) return { accept: false, monitor: true, reason: "insufficient_sessions" };
  return { accept: true, monitor: false, reason: "ok" };
}

/** Is an interaction a zero-tolerance technical bug by itself? */
export function isTechnicalBug(it: { outcome?: string | null; implicit_signal?: string | null; guardrail_triggered?: boolean | null; tools_called?: unknown }): boolean {
  const calls = Array.isArray(it.tools_called) ? it.tools_called.length : 0;
  return (
    it.guardrail_triggered === true ||
    it.implicit_signal === "hallucination_blocked" ||
    it.outcome === "error" || it.outcome === "empty" ||
    calls > MAX_TOOL_CALLS_PER_TURN
  );
}

const norm = (s: string) => s.replace(/[\s\p{P}]+/gu, " ").trim().toLowerCase();
function similar(a: string, b: string): boolean {
  const A = new Set(norm(a).split(" ").filter((w) => w.length > 2));
  const B = new Set(norm(b).split(" ").filter((w) => w.length > 2));
  if (!A.size || !B.size) return norm(a) === norm(b);
  let inter = 0;
  for (const w of A) if (B.has(w)) inter++;
  return inter / Math.min(A.size, B.size) >= 0.6;
}

/** Add a rule: replace an overlapping one (newer wins), then cap to MAX_DYNAMIC_RULES (drop oldest). */
export function consolidateRules(prev: string[], incoming: string, cap = MAX_DYNAMIC_RULES): string[] {
  const rule = incoming.trim();
  if (!rule) return prev.slice(-cap);
  const kept = prev.filter((r) => r && !similar(r, rule));
  kept.push(rule);
  return kept.slice(-cap);
}
