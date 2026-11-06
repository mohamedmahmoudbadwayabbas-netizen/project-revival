import React, { useState, useEffect, useCallback } from "react";
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Zap,
  RefreshCw,
  CheckCircle2,
  ChevronLeft,
} from "lucide-react";
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
  const [summary, setSummary] = useState<ExecutiveSummaryResult | null>(null);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const result = await generateExecutiveSummary(kpis);
      setSummary(result);
    } catch (e) {
      toast.error("تعذر تحميل التقرير الاستشاري");
    } finally {
      setLoading(false);
    }
  }, [kpis]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return (
    <Card className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs overflow-hidden">
      <CardHeader className="p-4 sm:p-5 pb-3 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
              <Sparkles className="h-4 w-4 text-emerald-600" strokeWidth={1.5} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  التقرير الاستشاري والتحليلي
                </CardTitle>
                <span className="rounded px-1.5 py-0.2 text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Gemini 3.6 Flash
                </span>
              </div>
              <CardDescription className="text-xs text-zinc-500 mt-0.5">
                تحليل فوري لمؤشرات أداء المبيعات والمخزون
              </CardDescription>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={fetchSummary}
            className="h-7 rounded-lg text-xs font-medium gap-1.5 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
          >
            <RefreshCw
              className={`h-3 w-3 ${loading ? "animate-spin text-emerald-600" : "text-zinc-400"}`}
              strokeWidth={1.5}
            />
            <span>تحديث التحليل</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 pt-4 space-y-4">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 py-4 animate-pulse">
            <div className="h-16 rounded-lg bg-zinc-100 dark:bg-zinc-800 col-span-full" />
            <div className="h-20 rounded-lg bg-zinc-100 dark:bg-zinc-800 md:col-span-2" />
            <div className="h-20 rounded-lg bg-zinc-100 dark:bg-zinc-800" />
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
              <div className="rounded-lg border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-600 shrink-0" />
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    {summary.headline}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">
                    مؤشر الكفاءة:
                  </span>
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200/60 dark:border-emerald-800">
                    %{summary.overallHealthScore}
                  </span>
                </div>
              </div>

              {/* Insights */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {summary.insights.map((insight, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-zinc-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-700 dark:text-zinc-300 flex items-start gap-2"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" strokeWidth={1.5} />
                    <span>{insight}</span>
                  </div>
                ))}
              </div>

              {/* Actionable Tips */}
              {summary.actionableTips && summary.actionableTips.length > 0 && (
                <div className="space-y-2 pt-1">
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block">
                    توصيات تشغيلية:
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {summary.actionableTips.map((tip, idx) => {
                      const isUrgent = tip.impact === "Urgent";
                      return (
                        <div
                          key={idx}
                          className="rounded-lg border border-zinc-200/80 dark:border-zinc-800 p-3 bg-white dark:bg-zinc-900 flex flex-col justify-between"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                  isUrgent
                                    ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                                    : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                                }`}
                              >
                                {tip.impact === "Urgent" ? "عاجل" : "أولوية"}
                              </span>
                              <span className="text-[10px] text-zinc-400">
                                {tip.category === "Inventory"
                                  ? "المخزون"
                                  : tip.category === "Marketing"
                                    ? "التسويق"
                                    : "التسعير"}
                              </span>
                            </div>

                            <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                              {tip.title}
                            </h4>
                            <p className="text-xs text-zinc-500 leading-normal">
                              {tip.description}
                            </p>
                          </div>

                          {tip.quickActionLabel && (
                            <div className="pt-2 mt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end">
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
                                className="h-6 px-2 text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30 cursor-pointer gap-1"
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
