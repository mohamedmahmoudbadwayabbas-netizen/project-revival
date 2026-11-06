/** Pure signal analysis: turns Nawat interactions + feedback into proposal drafts. No side effects. */
export type InteractionRow = { id: string; outcome: string; tools_called: unknown };
export type FeedbackRow = { interaction_id: string | null; rating: number | null; comment: string | null };
export type ProposalDraft = {
  agent_type: "analysis";
  title: string;
  root_cause: string;
  risk_tier: "low" | "medium" | "high";
  raw_operation: Record<string, unknown>;
  source_interaction_ids: string[];
  dedupe_key: string;
};

export const MIN_REPEATS = 2;

function norm(q: string) {
  return q.trim().toLowerCase().replace(/\s+/g, " ");
}

export function analyzeSignals(interactions: InteractionRow[], feedback: FeedbackRow[]): ProposalDraft[] {
  const drafts: ProposalDraft[] = [];

  // 1) Searches that repeatedly returned nothing → propose adding a search synonym / stocking.
  const missing = new Map<string, { label: string; ids: Set<string> }>();
  for (const it of interactions) {
    const tools = Array.isArray(it.tools_called) ? (it.tools_called as { query?: string; count?: number; ok?: boolean }[]) : [];
    for (const t of tools) {
      if (!t?.query || t.ok === false || (t.count ?? 0) > 0) continue;
      const key = norm(t.query);
      if (!key) continue;
      const e = missing.get(key) ?? { label: t.query.trim(), ids: new Set() };
      e.ids.add(it.id);
      missing.set(key, e);
    }
  }
  for (const [key, e] of missing) {
    if (e.ids.size < MIN_REPEATS) continue;
    drafts.push({
      agent_type: "analysis",
      title: `بحث متكرر بلا نتائج: «${e.label}»`,
      root_cause: `العملاء بحثوا عن «${e.label}» ${e.ids.size} مرات ولم يجدوا منتجاً. إما المنتج غير متوفر أو اسمه في المتجر مختلف.`,
      risk_tier: "low",
      raw_operation: { op: "review_missing_search", query: e.label, occurrences: e.ids.size, suggestion: "أضف المنتج أو أضف هذه الكلمة لوصف/اسم منتج مطابق" },
      source_interaction_ids: [...e.ids],
      dedupe_key: `missing:${key}`,
    });
  }

  // 2) Repeated negative-feedback reasons → propose an answer-quality review.
  const reasons = new Map<string, Set<string>>();
  for (const f of feedback) {
    if (f.rating !== -1 || !f.interaction_id) continue;
    const m = /\[(.+?)\]/.exec(f.comment ?? "");
    const list = m ? m[1].split(/[،,]/).map((s) => s.trim()).filter(Boolean) : ["بدون سبب محدد"];
    for (const r of list) {
      const s = reasons.get(r) ?? new Set();
      s.add(f.interaction_id);
      reasons.set(r, s);
    }
  }
  for (const [reason, ids] of reasons) {
    if (ids.size < MIN_REPEATS) continue;
    drafts.push({
      agent_type: "analysis",
      title: `تقييم سلبي متكرر لنواة: «${reason}»`,
      root_cause: `${ids.size} ردود من نواة قُيّمت سلبياً بسبب «${reason}».`,
      risk_tier: "medium",
      raw_operation: { op: "review_nawat_answers", reason, occurrences: ids.size, suggestion: "راجع هذه المحادثات وعدّل تعليمات نواة يدوياً إن لزم" },
      source_interaction_ids: [...ids],
      dedupe_key: `neg:${reason}`,
    });
  }
  return drafts;
}
