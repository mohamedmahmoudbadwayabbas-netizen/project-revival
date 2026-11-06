import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchOrdersWithItems } from "@/services/orderDataService";
import {
  Receipt,
  DollarSign,
  ShoppingCart,
  AlertTriangle,
  TrendingUp,
  Layers,
  Tag,
  Truck,
  Ticket,
  Image,
  ArrowUpRight,
  Activity,
  Clock,
  CheckCircle2,
  Sparkles,
  PackageCheck,
  Zap,
  Eye,
  Store,
  ChevronLeft,
  Package,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SmartInsights } from "@/components/admin/SmartInsights";
import { BranchSelector } from "@/components/admin/BranchSelector";
import { StockAndExpiryAlertsModal } from "@/components/admin/StockAndExpiryAlertsModal";
import { ExecutiveSummaryWidget } from "@/components/admin/ExecutiveSummaryWidget";
import { BranchCardsOverview } from "@/components/admin/BranchCardsOverview";
import {
  LiveBranch,
  fetchLiveBranches,
  UNIFIED_ALL_BRANCHES_ID,
} from "@/lib/branches-data";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [{ title: "نظرة عامة — لوحة التحكم" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: OverviewPage,
});

type OrderRow = {
  id: string;
  customer_name?: string;
  phone?: string;
  address?: string;
  delivery_zone_id?: string;
  total_amount: number;
  status: string;
  created_at: string;
  notes?: string | null;
  items?: { id?: string; name: string; quantity: number; subtotal: number }[];
};

type ChartFilter = "today" | "7days" | "month";
type ChartMetric = "sales" | "count";

function AnimatedCounter({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    let frameId: number;
    const startTime = performance.now();
    const duration = 1000;
    const startVal = 0;
    const endVal = value;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCurrent(startVal + (endVal - startVal) * ease);

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      }
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [value]);

  return (
    <span>
      {prefix}
      {current.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix ? ` ${suffix}` : ""}
    </span>
  );
}

function getRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 15) return "الآن";
  if (diffSec < 60) return `منذ ${diffSec} ثانية`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `منذ ${diffHour} ساعة`;
  const diffDay = Math.floor(diffHour / 24);
  return `منذ ${diffDay} يوم`;
}

function OverviewPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [lowStock, setLowStock] = useState<
    { id: string; name: string; stock: number }[]
  >([]);
  const [branches, setBranches] = useState<LiveBranch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all");
  const [alertsModalOpen, setAlertsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [chartFilter, setChartFilter] = useState<ChartFilter>("7days");
  const [chartMetric, setChartMetric] = useState<ChartMetric>("sales");
  const [previewOrder, setPreviewOrder] = useState<OrderRow | null>(null);

  const loadData = async () => {
    try {
      const [ords, { data: prods }, liveBranches] = await Promise.all([
        fetchOrdersWithItems({ limit: 500 }),
        supabase.from("products").select("id,name,stock"),
        fetchLiveBranches(),
      ]);
      setOrders((ords ?? []) as unknown as OrderRow[]);
      const low = (prods ?? []).filter(
        (p: any) => (p.stock ?? 0) <= 5,
      );
      setLowStock(low as any);
      setBranches(liveBranches);
    } catch (err) {
      console.error("Error loading admin overview data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel("admin-overview-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => {
        const newOrd = payload.new as OrderRow;
        setOrders((prev) => [newOrd, ...prev.filter((o) => o.id !== newOrd.id)]);
        toast.success(`طلب جديد بقيمة ${newOrd.total_amount} ج.م`);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, (payload) => {
        const updated = payload.new as OrderRow;
        setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "orders" }, (payload) => {
        const delId = payload.old.id;
        setOrders((prev) => prev.filter((o) => o.id !== delId));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, async () => {
        const { data: prods } = await supabase
          .from("products")
          .select("id,name,stock");
        const low = (prods ?? []).filter(
          (p: any) => (p.stock ?? 0) <= 5,
        );
        setLowStock(low as any);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_zones" }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredOrders = useMemo(() => {
    if (selectedBranchId === "all" || !selectedBranchId) return orders;
    return orders.filter(
      (o) =>
        o.delivery_zone_id === selectedBranchId ||
        (o.address && o.address.toLowerCase().includes(selectedBranchId.toLowerCase())),
    );
  }, [orders, selectedBranchId]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const monthStart = useMemo(() => new Date(today.getFullYear(), today.getMonth(), 1), [today]);

  const revenueOrders = useMemo(
    () => filteredOrders.filter((o) => o.status !== "cancelled"),
    [filteredOrders],
  );

  const salesToday = useMemo(() => {
    return revenueOrders
      .filter((o) => new Date(o.created_at) >= today)
      .reduce((s, o) => s + Number(o.total_amount || 0), 0);
  }, [revenueOrders, today]);

  const salesMonth = useMemo(() => {
    return revenueOrders
      .filter((o) => new Date(o.created_at) >= monthStart)
      .reduce((s, o) => s + Number(o.total_amount || 0), 0);
  }, [revenueOrders, monthStart]);

  const ordersTodayList = useMemo(() => {
    return filteredOrders.filter((o) => new Date(o.created_at) >= today);
  }, [filteredOrders, today]);

  const newOrdersToday = useMemo(() => {
    return ordersTodayList.length;
  }, [ordersTodayList]);

  const avgOrderValue = useMemo(() => {
    if (ordersTodayList.length > 0) {
      const sum = ordersTodayList.reduce((acc, o) => acc + Number(o.total_amount || 0), 0);
      return sum / ordersTodayList.length;
    }
    return filteredOrders.length > 0
      ? filteredOrders.reduce((acc, o) => acc + Number(o.total_amount || 0), 0) / filteredOrders.length
      : 0;
  }, [ordersTodayList, filteredOrders]);

  const weeklyGrowth = useMemo(() => {
    const now = new Date();
    const past7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const prev14To7Days = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const last7Revenue = filteredOrders
      .filter((o) => o.status !== "cancelled" && new Date(o.created_at) >= past7Days)
      .reduce((s, o) => s + Number(o.total_amount || 0), 0);

    const prev7Revenue = filteredOrders
      .filter(
        (o) =>
          o.status !== "cancelled" &&
          new Date(o.created_at) >= prev14To7Days &&
          new Date(o.created_at) < past7Days,
      )
      .reduce((s, o) => s + Number(o.total_amount || 0), 0);

    if (prev7Revenue > 0) {
      const diff = ((last7Revenue - prev7Revenue) / prev7Revenue) * 100;
      return diff >= 0 ? `+${diff.toFixed(1)}%` : `${diff.toFixed(1)}%`;
    }
    return last7Revenue > 0 ? "+100%" : "0%";
  }, [filteredOrders]);

  const ordersPipeline = useMemo(() => {
    const done = ordersTodayList.filter(
      (o) => o.status === "delivered",
    ).length;
    const total = ordersTodayList.length || 1;
    const completionRate = Math.round((done / total) * 100);
    return { done, completionRate };
  }, [ordersTodayList]);

  const chartData = useMemo(() => {
    if (chartFilter === "today") {
      const todayStr = new Date().toDateString();
      const todayOrds = revenueOrders.filter(
        (o) => new Date(o.created_at).toDateString() === todayStr,
      );

      const hours = [
        { label: "12ص-3ص", value: 0 },
        { label: "3ص-6ص", value: 0 },
        { label: "6ص-9ص", value: 0 },
        { label: "9ص-12ظ", value: 0 },
        { label: "12ظ-3ع", value: 0 },
        { label: "3ع-6م", value: 0 },
        { label: "6م-9م", value: 0 },
        { label: "9م-12ص", value: 0 },
      ];

      todayOrds.forEach((ord) => {
        const h = new Date(ord.created_at).getHours();
        const slot = Math.min(Math.floor(h / 3), 7);
        hours[slot].value += chartMetric === "sales" ? Number(ord.total_amount) : 1;
      });

      return hours;
    }

    if (chartFilter === "7days") {
      const dayNames = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
      const result: { label: string; value: number }[] = [];

      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toDateString();
        const dayLabel = i === 0 ? "اليوم" : dayNames[d.getDay()];

        const dayOrds = revenueOrders.filter(
          (o) => new Date(o.created_at).toDateString() === dateStr,
        );
        const val = dayOrds.reduce(
          (acc, o) => acc + (chartMetric === "sales" ? Number(o.total_amount) : 1),
          0,
        );

        result.push({ label: dayLabel, value: Number(val.toFixed(2)) });
      }
      return result;
    }

    const result: { label: string; value: number }[] = [];
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    for (let step = 1; step <= 6; step++) {
      const start = (step - 1) * 5 + 1;
      const end = step * 5;
      const periodOrds = revenueOrders.filter((o) => {
        const d = new Date(o.created_at);
        return (
          d.getMonth() === currentMonth &&
          d.getFullYear() === currentYear &&
          d.getDate() >= start &&
          d.getDate() <= end
        );
      });

      const val = periodOrds.reduce(
        (acc, o) => acc + (chartMetric === "sales" ? Number(o.total_amount) : 1),
        0,
      );
      result.push({ label: `${start}-${end}`, value: Number(val.toFixed(2)) });
    }
    return result;
  }, [revenueOrders, chartFilter, chartMetric]);

  const bestSellers = useMemo(() => {
    const tally = new Map<string, number>();
    for (const o of revenueOrders) {
      for (const it of o.items ?? []) {
        if (it.name) {
          tally.set(it.name, (tally.get(it.name) ?? 0) + Number(it.quantity || 0));
        }
      }
    }
    return Array.from(tally.entries())
      .map(([name, qty]) => ({ name, qty: +qty.toFixed(0) }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [revenueOrders]);

  const liveOrdersFeed = useMemo(() => orders.slice(0, 6), [orders]);

  if (loading) {
    return <OverviewSkeleton />;
  }

  return (
    <div className="admin-dashboard space-y-6 p-4 sm:p-6 font-sans">
      <section className="admin-dashboard__hero">
        <div>
          <span className="admin-dashboard__eyebrow"><Activity size={14} /> لوحة المتجر اليوم</span>
          <h2>صباح الخير، مدير المتجر</h2>
          <p>هذه نظرة سريعة على نشاط متجرك اليوم ومؤشرات التشغيل.</p>
        </div>
        <div className="admin-dashboard__hero-meta">
          <span><i /> البيانات متصلة مباشرة</span>
          <small>{new Intl.DateTimeFormat("ar-EG", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}</small>
        </div>
      </section>
      <SmartInsights />
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200/80 dark:border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              الرئيسية
            </h1>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 text-[10px] font-medium rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
              مزامنة فورية
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            متابعة المبيعات ومسار الطلبات والمخزون
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <BranchSelector
            selectedBranchId={selectedBranchId}
            branches={branches}
            onBranchChange={(b) => {
              setSelectedBranchId(b.id);
            }}
          />

          <StockAndExpiryAlertsModal open={alertsModalOpen} onOpenChange={setAlertsModalOpen} />

          <Link to="/admin/products">
            <Button
              size="sm"
              variant="outline"
              className="h-9 rounded-xl text-xs font-bold gap-1.5"
            >
              <Package className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>إضافة منتج</span>
            </Button>
          </Link>
          <Link to="/admin/orders"><Button size="sm" className="h-9 rounded-xl hero-gradient text-primary-foreground text-xs font-bold gap-1.5"><Receipt className="h-3.5 w-3.5" />طلب جديد</Button></Link>
        </div>
      </div>

      {/* 2. Branch Cards Overview */}
      {/* 3. STRICT KPI CARDS (3 Elements Only: Label, Value, Delta Badge) */}
      <div className="admin-dashboard__kpis grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {/* Card 1: Revenue */}
        <Card className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">
              مبيعات اليوم
            </span>
            <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-200/60 dark:border-emerald-800">
              {weeklyGrowth}
            </span>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            <AnimatedCounter value={salesToday} decimals={2} suffix="ج.م" />
          </div>
        </Card>

        {/* Card 2: Orders */}
        <Card className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">
              طلبات اليوم
            </span>
            <span className="text-[11px] font-medium text-zinc-700 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-300 px-1.5 py-0.2 rounded">
              %{ordersPipeline.completionRate} إنجاز
            </span>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            <AnimatedCounter value={newOrdersToday} decimals={0} suffix="طلب" />
          </div>
        </Card>

        {/* Card 3: Stock Alert */}
        <Card
          onClick={() => setAlertsModalOpen(true)}
          className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-xs cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">
              أصناف تحت حد الأمان
            </span>
            <span
              className={`text-[11px] font-medium px-1.5 py-0.2 rounded ${
                lowStock.length > 0
                  ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800"
                  : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
              }`}
            >
              {lowStock.length > 0 ? "تنبيه" : "مستقر"}
            </span>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            <AnimatedCounter value={lowStock.length} decimals={0} suffix="صنف" />
          </div>
        </Card>

        {/* Card 4: Average order value */}
        <Card className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">متوسط قيمة الطلب</span>
            <span className="admin-dashboard__metric-icon"><ShoppingCart className="h-4 w-4" /></span>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            <AnimatedCounter value={avgOrderValue} decimals={0} suffix="ج.م" />
          </div>
          <small className="admin-dashboard__metric-note">من إجمالي {filteredOrders.length.toLocaleString("ar-EG")} طلب</small>
        </Card>
      </div>

      {/* 4. AI Advisory Widget */}
      <ExecutiveSummaryWidget
        kpis={{
          totalRevenue: salesMonth || salesToday || 0,
          totalOrders: filteredOrders.length,
          averageOrderValue: Math.round(avgOrderValue),
          lowStockCount: lowStock.filter((p) => (p.stock ?? 0) > 0).length,
          outOfStockCount: lowStock.filter((p) => (p.stock ?? 0) <= 0).length,
          topSellingCategory: "كافة الأقسام",
          abandonedCartsCount: 0,
        }}
      />

      {/* 5. Charts & Live Orders */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Sales Chart */}
        <Card className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                تحليل المبيعات
              </h3>
              <p className="text-[11px] text-zinc-400">
                تتبع النشاط المالي وعدد الطلبات
              </p>
            </div>

            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg text-xs">
              <button
                onClick={() => setChartFilter("today")}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  chartFilter === "today"
                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                    : "text-zinc-500"
                }`}
              >
                اليوم
              </button>
              <button
                onClick={() => setChartFilter("7days")}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  chartFilter === "7days"
                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                    : "text-zinc-500"
                }`}
              >
                7 أيام
              </button>
              <button
                onClick={() => setChartFilter("month")}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  chartFilter === "month"
                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                    : "text-zinc-500"
                }`}
              >
                الشهر
              </button>
            </div>
          </div>

          <div className="h-64 w-full pt-3" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" opacity={0.5} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#71717a" }} axisLine={{ stroke: "#e4e4e7" }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#71717a" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #e4e4e7",
                    background: "#ffffff",
                    fontSize: 11,
                    padding: "6px 10px",
                  }}
                  formatter={(val: any) => [`${val} ج.م`, "المبيعات"]}
                />
                <Bar dataKey="value" fill="#315f4c" radius={[8, 8, 0, 0]} maxBarSize={42} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Live Orders Feed */}
        <Card className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                أحدث الطلبات
              </h3>
              <span className="text-[10px] text-zinc-400">مباشر</span>
            </div>

            <div className="space-y-2 pt-3">
              {liveOrdersFeed.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-400">
                  لا توجد طلبات مسجلة
                </div>
              ) : (
                liveOrdersFeed.map((ord) => (
                  <div
                    key={ord.id}
                    onClick={() => setPreviewOrder(ord)}
                    className="flex items-center justify-between p-2 rounded-lg border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                        {ord.customer_name || "عميل"}
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        {getRelativeTime(ord.created_at)}
                      </div>
                    </div>
                    <div className="text-end">
                      <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        {Number(ord.total_amount).toFixed(2)} ج.م
                      </div>
                      <span className="text-[10px] text-zinc-400">
                        {ord.status === "pending" ? "جديد" : ord.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <Link to="/admin/orders" className="pt-3 block">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs font-medium text-zinc-500 hover:text-zinc-900 h-7"
            >
              عرض كافة الطلبات ←
            </Button>
          </Link>
        </Card>
      </div>

      {/* 6. Top Selling Products */}
      <Card className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-xs">
        <div className="pb-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
            المنتجات الأكثر طلباً
          </h3>
          <Link to="/admin/products" className="text-[11px] text-emerald-700 dark:text-emerald-400 hover:underline">
            إدارة المنتجات
          </Link>
        </div>

        <div className="pt-3 space-y-2">
          {bestSellers.length === 0 ? (
            <div className="p-6 text-center text-xs text-zinc-400">
              لا توجد بيانات مبيعات بعد
            </div>
          ) : (
            bestSellers.map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between text-xs py-1">
                <span className="text-zinc-800 dark:text-zinc-200 font-medium truncate">
                  {idx + 1}. {item.name}
                </span>
                <span className="text-zinc-500 font-mono text-[11px]">
                  {item.qty} وحدة
                </span>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Order Preview Dialog */}
      <Dialog open={!!previewOrder} onOpenChange={() => setPreviewOrder(null)}>
        <DialogContent className="max-w-sm rounded-xl p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800" dir="rtl">
          <DialogHeader className="pb-2 border-b border-zinc-100 dark:border-zinc-800">
            <DialogTitle className="text-sm font-bold flex items-center justify-between">
              <span>تفاصيل الطلب</span>
              <span className="text-xs font-normal text-zinc-500">
                {previewOrder?.status}
              </span>
            </DialogTitle>
          </DialogHeader>

          {previewOrder && (
            <div className="space-y-3 pt-2 text-xs">
              <div className="space-y-1">
                <div className="text-zinc-500">العميل:</div>
                <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {previewOrder.customer_name || "بدون اسم"} • {previewOrder.phone || ""}
                </div>
                <div className="text-zinc-400 text-[11px]">
                  {previewOrder.address || "استلام من الفرع"}
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between font-bold">
                <span>الإجمالي:</span>
                <span className="text-emerald-700 dark:text-emerald-400 text-sm">
                  {Number(previewOrder.total_amount).toFixed(2)} ج.م
                </span>
              </div>

              <Link to="/admin/orders" className="block pt-2">
                <Button className="w-full h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                  الانتقال لصفحة الطلبات
                </Button>
              </Link>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-4 p-4 sm:p-6 animate-pulse">
      <div className="h-8 w-48 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="h-24 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
        <div className="h-24 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
        <div className="h-24 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
      </div>
      <div className="h-48 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
    </div>
  );
}
