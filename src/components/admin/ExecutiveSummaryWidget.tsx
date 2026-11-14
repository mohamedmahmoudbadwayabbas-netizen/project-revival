import { useState, useEffect, useCallback, useRef } from "react";
import { Sparkles, RefreshCw, CheckCircle2, ChevronLeft, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  generateExecutiveSummary,
  ExecutiveKpiInput,
  ExecutiveSummaryResult,
} from "@/services/gemini36Service";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

interface ExecutiveSummaryWidgetProps {
  kpis: ExecutiveKpiInput;
  onExecuteCommand?: (command: string) => void;
}

export function ExecutiveSummaryWidget({ kpis, onExecuteCommand }: ExecutiveSummaryWidgetProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [summary, setSummary] = useState<ExecutiveSummaryResult | null>(null);
  const lastFetchedSignature = useRef<string | null>(null);
  const kpisRef = useRef(kpis);
  kpisRef.current = kpis;

  const kpisSignature = JSON.stringify({
    totalRevenue: kpis.totalRevenue,
    totalOrders: kpis.totalOrders,
    averageOrderValue: kpis.averageOrderValue,
    lowStockCount: kpis.lowStockCount,
    outOfStockCount: kpis.outOfStockCount,
    topSellingCategory: kpis.topSellingCategory,
    abandonedCartsCount: kpis.abandonedCartsCount,
  });

  const fetchSummary = useCallback(async (manual = false) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const result = await generateExecutiveSummary(kpisRef.current);
      setSummary(result);
    } catch (e: any) {
      const msg = e?.message || "تعذر تحميل التقرير الاستشاري";
      setErrorMsg(msg);
      if (manual) {
        toast.error("تعذر تحميل التقرير الاستشاري");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (lastFetchedSignature.current === kpisSignature) return;
    lastFetchedSignature.current = kpisSignature;
    void fetchSummary(false);
  }, [kpisSignature, fetchSummary]);

  return (
    <Card className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
      <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border/70">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="h-4 w-4" strokeWidth={1.5} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-sm font-bold text-foreground">
                  التقرير الاستشاري والتحليلي
                </CardTitle>
                <span className="rounded-md px-2 py-0.5 text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  تحليل مؤشرات التشغيل
                </span>
              </div>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                قراءة تنفيذية لمؤشرات المبيعات والمخزون خلال آخر 30 يوماً
              </CardDescription>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => void fetchSummary(true)}
            className="h-8 rounded-xl text-xs font-medium gap-1.5 border-border hover:bg-accent cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin text-emerald-600" : "text-muted-foreground"}`}
              strokeWidth={1.5}
            />
            <span>تحديث التحليل</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 pt-4 space-y-4">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 py-2 animate-pulse">
            <div className="h-14 rounded-xl bg-muted col-span-full" />
            <div className="h-20 rounded-xl bg-muted md:col-span-2" />
            <div className="h-20 rounded-xl bg-muted" />
          </div>
        ) : errorMsg && !summary ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 p-5 text-center space-y-2">
            <AlertCircle className="h-5 w-5 text-muted-foreground mx-auto" />
            <p className="text-xs font-semibold text-foreground">{errorMsg}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void fetchSummary(true)}
              className="h-7 rounded-lg text-xs"
            >
              إعادة المحاولة
            </Button>
          </div>
        ) : summary ? (
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="space-y-3.5"
            >
              {/* Executive Headline */}
              <div className="rounded-lg border border-border bg-background/60 p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-600 shrink-0" />
                  <span className="text-xs font-semibold text-foreground">{summary.headline}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">مؤشر الكفاءة:</span>
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                    %{summary.overallHealthScore}
                  </span>
                </div>
              </div>

              {/* Insights */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {summary.insights.map((insight, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-border bg-background/60 text-xs text-foreground/90 flex items-start gap-2"
                  >
                    <CheckCircle2
                      className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5"
                      strokeWidth={1.5}
                    />
                    <span>{insight}</span>
                  </div>
                ))}
              </div>

              {/* Actionable Tips */}
              {summary.actionableTips && summary.actionableTips.length > 0 && (
                <div className="space-y-2 pt-1">
                  <span className="text-xs font-semibold text-muted-foreground block">
                    توصيات تشغيلية:
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {summary.actionableTips.map((tip, idx) => {
                      const isUrgent = tip.impact === "Urgent";
                      const categoryLabel =
                        tip.category === "Inventory"
                          ? "المخزون"
                          : tip.category === "Marketing"
                            ? "التسويق"
                            : tip.category === "Operations"
                              ? "العمليات"
                              : tip.category === "Pricing"
                                ? "التسعير"
                                : "عام";
                      return (
                        <div
                          key={idx}
                          className="rounded-lg border border-border p-3 bg-background/60 flex flex-col justify-between"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                  isUrgent
                                    ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                                    : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                                }`}
                              >
                                {tip.impact === "Urgent" ? "عاجل" : "أولوية"}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {categoryLabel}
                              </span>
                            </div>

                            <h4 className="text-xs font-bold text-foreground">{tip.title}</h4>
                            <p className="text-xs text-muted-foreground leading-normal">
                              {tip.description}
                            </p>
                          </div>

                          {tip.quickActionLabel && (
                            <div className="pt-2 mt-2 border-t border-border/60 flex items-center justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (tip.quickActionCommand && onExecuteCommand) {
                                    onExecuteCommand(tip.quickActionCommand);
                                  } else {
                                    toast.info(`تم تفعيل: ${tip.title}`);
                                  }
                                }}
                                className="h-6 px-2 text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:bg-emerald-500/10 dark:text-emerald-400 cursor-pointer gap-1"
                              >
                                <span>{tip.quickActionLabel}</span>
                                <ChevronLeft className="h-3 w-3" strokeWidth={1.5} />
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        ) : null}
      </CardContent>
    </Card>
  );
}
