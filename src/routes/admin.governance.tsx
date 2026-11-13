import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ShieldCheck,
  Loader2,
  Check,
  X,
  Sparkles,
  BrainCircuit,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";
import {
  generateProposals,
  generateOpsProposals,
  reviewProposal,
} from "@/lib/governance/proposals.functions";
import { toast } from "sonner";
import { PageHead } from "@/components/admin/PageHead";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/governance")({
  head: () => ({
    meta: [{ title: "حوكمة الوكلاء — لوحة التحكم" }, { name: "robots", content: "noindex" }],
  }),
  component: GovernancePage,
});

const ACTION_LABELS: Record<string, string> = {
  inject_prompt_rule: "حقن قاعدة سلوكية في ذاكرة الوكيل",
  update_tool_hints: "تحديث تلميحات أداة البحث",
  add_search_synonym: "ربط مرادف عامي في محرك البحث",
  enrich_product_keywords: "إثراء الكلمات المفتاحية لمنتج",
  create_draft_product: "إنشاء مسودة منتج جديد",
};

const CATEGORY_LABELS: Record<string, string> = {
  hallucination: "هلوسة / اختراع بيانات",
  synonym_gap: "فجوة مرادفات عامية",
  language_leak: "تسرب لغة إنجليزية",
  catalog_gap: "نقص في الكتالوج",
  tool_tuning: "ضبط أداء الأدوات",
  ux_failure: "تجربة المحادثة",
};

function GovernancePage() {
  const qc = useQueryClient();
  const proposals = useQuery({
    queryKey: ["ai-governance-proposals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_governance_proposals" as never)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const stats = useQuery({
    queryKey: ["agent-stats"],
    queryFn: async () => {
      const [i, f, g] = await Promise.all([
        supabase.from("agent_interactions").select("id", { count: "exact", head: true }),
        supabase.from("agent_feedback").select("rating").not("rating", "is", null).limit(1000),
        supabase
          .from("agent_interactions")
          .select("id", { count: "exact", head: true })
          .eq("guardrail_triggered", true),
      ]);
      const ratings = (f.data ?? []).map((r) => r.rating ?? 0);
      const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
      return {
        interactions: i.count ?? 0,
        ratings: ratings.length,
        avg,
        guardrailsBlocked: g.count ?? 0,
      };
    },
  });

  const runGenerate = useServerFn(generateProposals);
  const runOps = useServerFn(generateOpsProposals);
  const runReview = useServerFn(reviewProposal);
  const [busy, setBusy] = useState(false);

  async function analyze() {
    setBusy(true);
    try {
      const r = await runGenerate();
      toast.success(
        r.created
          ? `اكتشف المحلل الذكي ${r.created} تحسين تنفيذي جديد`
          : "لا توجد أخطاء سلوكية جديدة في السجلات",
      );
      qc.invalidateQueries({ queryKey: ["ai-governance-proposals"] });
    } catch (e: any) {
      toast.error(e?.message || "تعذر التحليل الذكي");
    } finally {
      setBusy(false);
    }
  }

  async function analyzeOps() {
    setBusy(true);
    try {
      const r = await runOps();
      toast.success(
        r.created
          ? `تم توليد ${r.created} تنبيه مخزون تلقائي لنواة`
          : "حالة المخزون والتوصيل مستقرة",
      );
      qc.invalidateQueries({ queryKey: ["ai-governance-proposals"] });
    } catch {
      toast.error("تعذر فحص العمليات");
    } finally {
      setBusy(false);
    }
  }

  async function review(id: string, status: "approved" | "rejected") {
    try {
      const r: any = await runReview({ data: { id, decision: status } });
      if (r.status === "executed") {
        toast.success(r.message || "تمت الموافقة وتنفيذ الإصلاح على قاعدة البيانات بنجاح");
      } else if (r.status === "failed") {
        toast.error(r.message || "فشل تنفيذ الإصلاح");
      } else {
        toast.success("تم رفض المقترح");
      }
    } catch (e: any) {
      toast.error(e?.message || "تعذر حفظ القرار");
    }
    qc.invalidateQueries({ queryKey: ["ai-governance-proposals"] });
  }

  return (
    <div className="space-y-6" dir="rtl">
      <PageHead
        icon={ShieldCheck}
        eyebrow="الذكاء الاصطناعي التكيفي"
        title="حوكمة الوكلاء"
        desc="يحلل سلوك نواة ونبراس ويكتشف الهلوسة وفجوات البحث، ويطبق الإصلاح الفعلي على القاعدة فور موافقتك."
      />

      <div className="flex flex-wrap justify-end gap-2">
        <Button size="sm" variant="outline" disabled={busy} onClick={analyzeOps}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{" "}
          فحص المخزون والتوصيل
        </Button>
        <Button size="sm" disabled={busy} onClick={analyze}>
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <BrainCircuit className="h-4 w-4" />
          )}{" "}
          تشخيص أخطاء الذكاء الاصطناعي وتوليد حلول
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="تفاعلات مسجلة" value={stats.data?.interactions ?? "—"} />
        <Stat label="تقييمات العملاء" value={stats.data?.ratings ?? "—"} />
        <Stat
          label="متوسط التقييم"
          value={stats.data?.avg != null ? stats.data.avg.toFixed(1) : "—"}
        />
        <Stat
          label="هلوسة منعها الحارس"
          value={stats.data?.guardrailsBlocked ?? "—"}
          highlight={Boolean(stats.data?.guardrailsBlocked)}
        />
      </div>

      <div className="lux-card p-2">
        {proposals.isLoading ? (
          <div className="grid place-items-center p-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !proposals.data?.length ? (
          <div className="p-16 text-center text-muted-foreground">
            لا توجد مقترحات حالياً. اضغط على «تشخيص أخطاء الذكاء الاصطناعي» لفحص آخر المحادثات.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {proposals.data.map((p) => (
              <li key={p.id} className="space-y-3 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-bold text-foreground">{p.title_ar}</span>
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                      {CATEGORY_LABELS[p.category] ?? p.category}
                    </span>
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs">
                      الخطورة: {p.severity}
                    </span>
                  </div>
                  <StatusBadge status={p.status} />
                </div>

                {/* التشخيص الجذري */}
                <div className="rounded-xl bg-muted/40 p-3 text-sm leading-relaxed">
                  <span className="font-bold text-foreground">التشخيص الجذري: </span>
                  <span className="text-muted-foreground">{p.root_cause_ar}</span>
                </div>

                {/* الإجراء التنفيذي الفعلي */}
                <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-3 text-sm">
                  <div className="flex items-center gap-1.5 font-bold text-primary">
                    <Wrench className="h-4 w-4" />
                    <span>
                      الإجراء التنفيذي عند الموافقة:{" "}
                      {ACTION_LABELS[p.action_type] ?? p.action_type}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{p.expected_impact_ar}</p>
                  <div className="mt-2 rounded-lg bg-background/80 px-3 py-2 text-xs font-medium text-foreground">
                    {formatHumanPayload(p.action_type, p.action_payload)}
                  </div>
                </div>

                {p.execution_result && (
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    نتيجة التنفيذ: {p.execution_result}
                  </p>
                )}

                {p.status === "pending" && (
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" onClick={() => review(p.id, "approved")}>
                      <Check className="me-1 h-4 w-4" /> موافقة وتطبيق الإصلاح
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => review(p.id, "rejected")}>
                      <X className="me-1 h-4 w-4" /> رفض
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function formatHumanPayload(actionType: string, payload: Record<string, any> = {}): string {
  switch (actionType) {
    case "inject_prompt_rule":
      return `القاعدة التي ستُحقن في برومبت الوكيل: «${payload.rule_text || payload.forbidden_pattern || ""}»`;
    case "update_tool_hints":
      return `تحديث أداة (${payload.tool_name || "searchProducts"}): «${payload.runtime_hints || ""}»`;
    case "add_search_synonym":
      return `ربط كلمة «${payload.term}» لتبحث تلقائياً عن: ${(payload.mapped_terms ?? []).join("، ")}`;
    case "enrich_product_keywords":
      return `إضافة كلمات بحث (${(payload.keywords ?? []).join("، ")}) لمنتج «${payload.product_name || payload.product_id}»`;
    case "create_draft_product":
      return `إنشاء مسودة منتج باسم «${payload.name_ar}» بسعر مقترح ${payload.suggested_price ?? 0} ج.م`;
    default:
      return JSON.stringify(payload);
  }
}

function StatusBadge({ status }: { status: string }) {
  if (status === "executed" || status === "approved") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="h-3.5 w-3.5" /> تم التطبيق
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2.5 py-0.5 text-xs font-bold text-destructive">
        <AlertTriangle className="h-3.5 w-3.5" /> فشل التنفيذ
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">مرفوض</span>
    );
  }
  return (
    <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-400">
      بانتظار موافقتك
    </span>
  );
}

function Stat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className="lux-card p-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        {highlight && <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />}
      </div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}
