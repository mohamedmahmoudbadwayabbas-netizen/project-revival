import { useEffect, useState } from "react";
import { Building2, ChevronDown, MapPin, Check, Store, Clock } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  LiveBranch,
  BranchStats,
  fetchLiveBranches,
  calculateLiveStats,
  UNIFIED_ALL_BRANCHES_ID,
} from "@/lib/branches-data";

export type Branch = LiveBranch;
export type { BranchStats };

interface BranchSelectorProps {
  selectedBranchId: string;
  onBranchChange: (branch: LiveBranch) => void;
  className?: string;
  branches?: LiveBranch[];
}

export function BranchSelector({
  selectedBranchId,
  onBranchChange,
  className = "",
  branches: initialBranches,
}: BranchSelectorProps) {
  const [branches, setBranches] = useState<LiveBranch[]>(initialBranches || []);
  const [allStats, setAllStats] = useState<BranchStats>({
    todayRevenue: 0,
    todayOrders: 0,
    activeOrders: 0,
    totalProducts: 0,
    stockHealth: 100,
    lowStockItems: 0,
  });

  const loadData = async () => {
    const list = await fetchLiveBranches();
    setBranches(list);

    // Fetch unified stats across all branches from real database
    const [{ data: ordersData }, { data: productsData }] = await Promise.all([
      supabase.from("orders").select("id,delivery_zone_id,total_amount,status,created_at,address"),
      supabase.from("products").select("id,stock"),
    ]);
    const unified = calculateLiveStats(ordersData || [], productsData || []);
    setAllStats(unified);
  };

  useEffect(() => {
    if (initialBranches && initialBranches.length > 0) {
      setBranches(initialBranches);
    } else {
      loadData();
    }

    // Subscribe to live changes in orders, products, and delivery_zones
    const channel = supabase
      .channel("branch-selector-live")
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
  }, [initialBranches]);

  const unifiedBranch: LiveBranch = {
    id: UNIFIED_ALL_BRANCHES_ID,
    name: `جميع الفروع (${branches.length || 3} فروع - نظرة موحدة)`,
    nameEn: "All Branches (Unified View)",
    city: "كافة الفروع",
    address: "تغطية مركزية موحدة لكافة فروع السوبرماركت",
    phone: "",
    status: "open",
    isMain: true,
    deliveryZones: ["كافة مناطق التوصيل التابعة للفروع"],
    stats: allStats,
  };

  const currentBranch =
    selectedBranchId === UNIFIED_ALL_BRANCHES_ID
      ? unifiedBranch
      : branches.find((b) => b.id === selectedBranchId) || unifiedBranch;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-10 px-3.5 rounded-2xl border-border/80 bg-card/90 backdrop-blur-xl hover:bg-secondary/70 text-foreground font-bold text-xs gap-2.5 transition-all shadow-xs cursor-pointer",
            className,
          )}
        >
          <div className="grid h-6 w-6 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Store className="h-3.5 w-3.5" />
          </div>

          <div className="flex flex-col items-start text-start leading-tight">
            <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
              <span>الفرع المختار</span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </span>
            <span className="truncate max-w-[160px] text-foreground font-extrabold">
              {currentBranch.name}
            </span>
          </div>

          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground me-auto" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 rounded-2xl p-2 bg-popover/95 backdrop-blur-2xl border border-border shadow-2xl space-y-1 text-right"
      >
        <DropdownMenuLabel className="text-xs font-bold text-muted-foreground px-2 py-1.5 flex items-center justify-between">
          <span>اختيار الفرع للتحكم والمتابعة:</span>
          <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/30 text-emerald-600">
            {branches.length} فروع متصلة
          </Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* All Branches Option */}
        <DropdownMenuItem
          onClick={() => onBranchChange(unifiedBranch)}
          className={cn(
            "flex items-start gap-2.5 p-2.5 rounded-xl cursor-pointer transition-all",
            selectedBranchId === UNIFIED_ALL_BRANCHES_ID
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold"
              : "hover:bg-secondary/70 text-foreground",
          )}
        >
          <div
            className={cn(
              "grid h-7 w-7 shrink-0 place-items-center rounded-lg mt-0.5",
              selectedBranchId === UNIFIED_ALL_BRANCHES_ID
                ? "bg-emerald-500 text-white"
                : "bg-secondary text-muted-foreground",
            )}
          >
            <Building2 className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0 space-y-0.5">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-black truncate">كافة الفروع (نظرة شاملة)</span>
              <Badge className="text-[9px] px-1.5 py-0 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-0">
                مجمع
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground truncate">
              {unifiedBranch.address}
            </p>
            <div className="flex items-center gap-2 pt-0.5 text-[10px]">
              <span className="text-emerald-600 font-medium">● {branches.length} فروع نشطة</span>
              <span className="text-muted-foreground">• {allStats.activeOrders} طلب جاري</span>
            </div>
          </div>
          {selectedBranchId === UNIFIED_ALL_BRANCHES_ID && (
            <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-1" />
          )}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Real Branches List */}
        {branches.map((branch) => {
          const isSelected = branch.id === currentBranch.id;
          return (
            <DropdownMenuItem
              key={branch.id}
              onClick={() => onBranchChange(branch)}
              className={cn(
                "flex items-start gap-2.5 p-2.5 rounded-xl cursor-pointer transition-all",
                isSelected
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold"
                  : "hover:bg-secondary/70 text-foreground",
              )}
            >
              <div
                className={cn(
                  "grid h-7 w-7 shrink-0 place-items-center rounded-lg mt-0.5",
                  isSelected
                    ? "bg-emerald-500 text-white"
                    : "bg-secondary text-muted-foreground",
                )}
              >
                <MapPin className="h-4 w-4" />
              </div>

              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-black truncate">{branch.name}</span>
                  {branch.isMain && (
                    <Badge className="text-[9px] px-1.5 py-0 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 border-0">
                      الرئيسي
                    </Badge>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground truncate">{branch.address}</p>
                <div className="flex items-center gap-2 pt-0.5 text-[10px]">
                  <span className="text-emerald-600 font-medium">● متاح للتوصيل</span>
                  <span className="text-muted-foreground">• {branch.stats.activeOrders} طلب جاري</span>
                </div>
              </div>

              {isSelected && <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-1" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
