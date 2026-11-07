import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck, Loader2, Check, X, Sparkles } from "lucide-react";
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

function GovernancePage() {
  const qc = useQueryClient();
  const proposals = useQuery({
    queryKey: ["ai-proposals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_proposals")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });
  const stats = useQuery({
    queryKey: ["agent-stats"],
    queryFn: async () => {
      const [i, f] = await Promise.all([
        supabase.from("agent_interactions").select("id", { count: "exact", head: true }),
        supabase.from("agent_feedback").select("rating").not("rating", "is", null).limit(1000),
      ]);
      const ratings = (f.data ?? []).map((r) => r.rating ?? 0);
      const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
      return { interactions: i.count ?? 0, ratings: ratings.length, avg };
    },
  });

  const runGenerate = useServerFn(generateProposals);
  const [busy, setBusy] = useState(false);
  async function analyze() {
    setBusy(true);
    try {
      const r = await runGenerate();
      toast.success(
        r.created ? `تم إنشاء ${r.created} مقترح جديد` : "لا توجد أنماط جديدة كافية بعد",
      );
      qc.invalidateQueries({ queryKey: ["ai-proposals"] });
    } catch {
      toast.error("تعذر التحليل");
    } finally {
      setBusy(false);
    }
  }

  const runReview = useServerFn(reviewProposal);
  const runOps = useServerFn(generateOpsProposals);
  async function analyzeOps() {
    setBusy(true);
    try {
      const r = await runOps();
      toast.success(
        r.created ? `وكيل العمليات أنشأ ${r.created} مقترح` : "لا توجد مشاكل تشغيلية جديدة",
      );
      qc.invalidateQueries({ queryKey: ["ai-proposals"] });
    } catch {
      toast.error("تعذر فحص العمليات");
    } finally {
      setBusy(false);
    }
  }
  async function review(id: string, status: "approved" | "rejected") {
    try {
      const r = await runReview({ data: { id, decision: status } });
      toast.success(
        r.status === "executed"
          ? "تمت الموافقة والتنفيذ"
          : r.status === "failed"
            ? "تمت الموافقة لكن فشل التنفيذ"
            : status === "approved"
              ? "تمت الموافقة"
              : "تم الرفض",
      );
    } catch {
      toast.error("تعذر الحفظ");
    }
    qc.invalidateQueries({ queryKey: ["ai-proposals"] });
  }

  return (
    <div className="space-y-6">
      <PageHead
        icon={ShieldCheck}
        eyebrow="الذكاء الاصطناعي"
        title="حوكمة الوكلاء"
        desc="مقترحات التحسين لا تُطبق إلا بعد موافقتك على العملية الفعلية."
      />
      <div className="flex flex-wrap justify-end gap-2">
        <Button size="sm" variant="outline" disabled={busy} onClick={analyzeOps}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{" "}
          فحص المخزون والتوصيل
        </Button>
        <Button size="sm" disabled={busy} onClick={analyze}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{" "}
          تحليل الإشارات وتوليد مقترحات
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="تفاعلات مسجلة" value={stats.data?.interactions ?? "—"} />
        <Stat label="تقييمات" value={stats.data?.ratings ?? "—"} />
        <Stat
          label="متوسط التقييم"
          value={stats.data?.avg != null ? stats.data.avg.toFixed(1) : "—"}
        />
      </div>
      <div className="lux-card p-2">
        {proposals.isLoading ? (
          <div className="grid place-items-center p-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !proposals.data?.length ? (
          <div className="p-16 text-center text-muted-foreground">لا توجد مقترحات بعد</div>
        ) : (
          <ul className="divide-y divide-border">
            {proposals.data.map((p) => (
              <li key={p.id} className="space-y-2 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{p.title}</span>
                  <span className="rounded-md bg-muted px-2 py-0.5 text-xs">{p.agent_type}</span>
                  <span className="rounded-md bg-muted px-2 py-0.5 text-xs">
                    خطورة: {p.risk_tier}
                  </span>
                  <span className="rounded-md bg-accent px-2 py-0.5 text-xs">{p.status}</span>
                </div>
                {p.root_cause && (
                  <p className="text-sm text-muted-foreground">السبب: {p.root_cause}</p>
                )}
                <pre dir="ltr" className="max-h-60 overflow-auto rounded-xl bg-muted p-3 text-xs">
                  {JSON.stringify(p.raw_operation, null, 2)}
                </pre>
                {p.status === "pending" && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => review(p.id, "approved")}>
                      <Check className="h-4 w-4" /> موافقة
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => review(p.id, "rejected")}>
                      <X className="h-4 w-4" /> رفض
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

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="lux-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}
