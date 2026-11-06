import { useEffect, useState } from "react";
import { Building2, Package, Clock, MapPin } from "lucide-react";
import { AnimatedCounter } from "@/components/admin/AnimatedCounter";
import { supabase } from "@/integrations/supabase/client";
import {
  LiveBranch,
  fetchLiveBranches,
  UNIFIED_ALL_BRANCHES_ID,
} from "@/lib/branches-data";

interface BranchCardsOverviewProps {
  onSelectBranch?: (branchId: string) => void;
  selectedBranchId?: string;
  branches?: LiveBranch[];
}

export function BranchCardsOverview({
  onSelectBranch,
  selectedBranchId = UNIFIED_ALL_BRANCHES_ID,
  branches: propBranches,
}: BranchCardsOverviewProps) {
  const [internalSelected, setInternalSelected] = useState<string>(selectedBranchId);
  const [branches, setBranches] = useState<LiveBranch[]>(propBranches || []);
  const [loading, setLoading] = useState(!propBranches || propBranches.length === 0);

  const activeId = selectedBranchId || internalSelected;

  const loadData = async () => {
    try {
      const list = await fetchLiveBranches();
      setBranches(list);
    } catch (err) {
      console.error("Error loading branch cards:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (propBranches && propBranches.length > 0) {
      setBranches(propBranches);
      setLoading(false);
    } else {
      loadData();
    }

    const channel = supabase
      .channel("branch-cards-overview-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        loadData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
        loadData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_zones" }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [propBranches]);

  const handleCardClick = (branchId: string) => {
    const newId = activeId === branchId ? UNIFIED_ALL_BRANCHES_ID : branchId;
    setInternalSelected(newId);
    if (onSelectBranch) {
      onSelectBranch(newId);
    }
  };

  if (loading && branches.length === 0) {
    return (
      <div className="grid gap-3 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-36 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse border border-zinc-200/60 dark:border-zinc-800" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-emerald-600" strokeWidth={1.5} />
          <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
            فروع السوبرماركت ({branches.length})
          </h3>
        </div>

        {activeId !== UNIFIED_ALL_BRANCHES_ID && (
          <button
            onClick={() => handleCardClick(UNIFIED_ALL_BRANCHES_ID)}
            className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
          >
            عرض كافة الفروع
          </button>
        )}
      </div>

      {/* Modern SaaS Cards */}
      <div className="grid gap-3 md:grid-cols-3">
        {branches.map((branch) => {
          const isMain = branch.isMain;
          const isSelected = activeId === branch.id;

          return (
            <div
              key={branch.id}
              onClick={() => handleCardClick(branch.id)}
              className={`rounded-xl border p-4 transition-colors cursor-pointer bg-white dark:bg-zinc-900 shadow-xs ${
                isSelected
                  ? "border-emerald-600 ring-1 ring-emerald-600"
                  : "border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                      {branch.name}
                    </span>
                    {isMain && (
                      <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                        الرئيسي
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5 truncate">
                    <MapPin className="h-3 w-3 text-zinc-400 shrink-0" strokeWidth={1.5} />
                    <span className="truncate">{branch.address}</span>
                  </div>
                </div>

                <span
                  className={`h-2 w-2 rounded-full shrink-0 mt-1 ${
                    branch.status === "open" ? "bg-emerald-600" : "bg-zinc-400"
                  }`}
                />
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-2 my-3 p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                <div>
                  <span className="text-[10px] text-zinc-500 block">المبيعات</span>
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    <AnimatedCounter value={branch.stats.todayRevenue} suffix="ج.م" />
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block">الطلبات</span>
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    {branch.stats.activeOrders}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block">الجاهزية</span>
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    %{branch.stats.stockHealth}
                  </span>
                </div>
              </div>

              {/* Footer info */}
              <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
                <span>{branch.stats.totalProducts} صنف</span>
                {branch.stats.lowStockItems > 0 && (
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    {branch.stats.lowStockItems} نقص مخزون
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
