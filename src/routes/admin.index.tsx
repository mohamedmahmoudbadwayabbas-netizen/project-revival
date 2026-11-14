import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchOrdersWithItems } from "@/services/orderDataService";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  DollarSign,
  Package,
  Receipt,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AnimatedCounter } from "@/components/admin/AnimatedCounter";
import { SmartInsights } from "@/components/admin/SmartInsights";
import { BranchSelector } from "@/components/admin/BranchSelector";
import { StockAndExpiryAlertsModal } from "@/components/admin/StockAndExpiryAlertsModal";
import { ExecutiveSummaryWidget } from "@/components/admin/ExecutiveSummaryWidget";
import { BranchCardsOverview } from "@/components/admin/BranchCardsOverview";
import { LiveBranch, fetchLiveBranches, UNIFIED_ALL_BRANCHES_ID } from "@/lib/branches-data";
import {
  buildLowStockAlertItems,
  buildSalesChartData,
  computeBestSellers,
  computeDashboardKpis,
  filterOrdersByBranch,
  getArabicTimeGreeting,
  getOrderStatusMeta,
  getRelativeTimeAr,
  type AdminOrderRow,
  type AdminProductRow,
  type ChartFilter,
  type ChartMetric,
} from "@/lib/admin-dashboard";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [{ title: "نظرة عامة — لوحة التحكم" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: OverviewPage,
});

function OverviewPage() {
  const [orders, setOrders] = useState<AdminOrderRow[]>([]);
  const [products, setProducts] = useState<AdminProductRow[]>([]);
  const [branches, setBranches] = useState<LiveBranch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(UNIFIED_ALL_BRANCHES_ID);
  const [alertsModalOpen, setAlertsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [chartFilter, setChartFilter] = useState<ChartFilter>("7days");
  const [chartMetric, setChartMetric] = useState<ChartMetric>("sales");
  const [previewOrder, setPreviewOrder] = useState<AdminOrderRow | null>(null);

  const loadProducts = useCallback(async () => {
    const { data, error } = await supabase
      .from("products")
      .select(
        "id,name,name_ar,stock,stock_quantity,low_stock_threshold,unit_label,unit,is_active,categories(name,name_ar)",
      )
      .eq("is_active", true);
    if (!error) {
      setProducts((data ?? []) as AdminProductRow[]);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [ords, liveBranches] = await Promise.all([
        fetchOrdersWithItems({ limit: 500 }),
        fetchLiveBranches(),
        loadProducts(),
      ]);
      setOrders((ords ?? []) as unknown as AdminOrderRow[]);
      setBranches(liveBranches);
    } catch (err) {
      console.error("Error loading admin overview data:", err);
    } finally {
      setLoading(false);
    }
  }, [loadProducts]);

  useEffect(() => {
    void loadData();

    const channel = supabase
      .channel("admin-overview-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => {
        const newOrd = payload.new as AdminOrderRow;
        setOrders((prev) => [newOrd, ...prev.filter((o) => o.id !== newOrd.id)]);
        toast.success(
          `طلب جديد بقيمة ${Number(newOrd.total_amount ?? (newOrd as any).total_price ?? 0).toFixed(2)} ج.م`,
        );
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, (payload) => {
        const updated = payload.new as AdminOrderRow;
        setOrders((prev) => prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "orders" }, (payload) => {
        const delId = payload.old?.id;
        if (delId) {
          setOrders((prev) => prev.filter((o) => o.id !== delId));
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
        void loadProducts();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_zones" }, () => {
        void loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData, loadProducts]);

  const selectedBranchName = useMemo(() => {
    if (selectedBranchId === UNIFIED_ALL_BRANCHES_ID) return "المخزون الموحد";
    return branches.find((b) => b.id === selectedBranchId)?.name || "المخزون الموحد";
  }, [branches, selectedBranchId]);

  const filteredOrders = useMemo(
    () => filterOrdersByBranch(orders, selectedBranchId),
    [orders, selectedBranchId],
  );

  const lowStockItems = useMemo(
    () => buildLowStockAlertItems(products, selectedBranchName),
    [products, selectedBranchName],
  );

  const kpis = useMemo(
    () => computeDashboardKpis(filteredOrders, lowStockItems),
    [filteredOrders, lowStockItems],
  );

  const chartData = useMemo(
    () => buildSalesChartData(filteredOrders, chartFilter, chartMetric),
    [filteredOrders, chartFilter, chartMetric],
  );

  const bestSellers = useMemo(() => computeBestSellers(filteredOrders, 5), [filteredOrders]);

  const liveOrdersFeed = useMemo(() => filteredOrders.slice(0, 6), [filteredOrders]);

  const executiveKpis = useMemo(
    () => ({
      totalRevenue: kpis.salesMonth || kpis.salesToday || 0,
      totalOrders: kpis.confirmedOrdersCount,
      averageOrderValue: Math.round(kpis.avgOrderValue),
      lowStockCount: kpis.lowStockCount,
      outOfStockCount: kpis.outOfStockCount,
      topSellingCategory: "كافة الأقسام",
      abandonedCartsCount: 0,
    }),
    [
      kpis.salesMonth,
      kpis.salesToday,
      kpis.confirmedOrdersCount,
      kpis.avgOrderValue,
      kpis.lowStockCount,
      kpis.outOfStockCount,
    ],
  );

  const greeting = getArabicTimeGreeting();
  const formattedToday = useMemo(
    () =>
      new Intl.DateTimeFormat("ar-EG", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(new Date()),
    [],
  );

  if (loading) {
    return <OverviewSkeleton />;
  }

  const maxBestSellerQty = Math.max(bestSellers[0]?.qty || 1, 1);

  return (
    <div className="admin-dashboard space-y-6 font-sans">
      {/* 1. Unified Command Header */}
      <section className="admin-dashboard__hero">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="admin-dashboard__eyebrow">
              <Activity size={14} /> لوحة المتجر اليوم
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              مزامنة فورية
            </span>
            <span className="text-[11px] text-muted-foreground">{formattedToday}</span>
          </div>
          <h1>{greeting}، مدير المتجر</h1>
          <p>ملخص تشغيلي مباشر للمبيعات ومسار الطلبات وحالة المخزون.</p>
        </div>

        <div className="grid grid-cols-2 gap-2 w-full lg:w-auto sm:flex sm:items-center sm:flex-wrap">
          <BranchSelector
            selectedBranchId={selectedBranchId}
            branches={branches}
            onBranchChange={(b) => setSelectedBranchId(b.id)}
            className="col-span-2 w-full sm:w-auto justify-between sm:justify-start"
          />

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAlertsModalOpen(true)}
            className={`h-10 px-3 rounded-2xl text-xs font-bold gap-2 cursor-pointer w-full sm:w-auto justify-center ${
              lowStockItems.length > 0
                ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
                : "border-border bg-card text-foreground hover:bg-accent"
            }`}
          >
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>التنبيهات</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                lowStockItems.length > 0
                  ? "bg-amber-600 text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {lowStockItems.length}
            </span>
          </Button>

          <Link to="/admin/products" className="w-full sm:w-auto">
            <Button
              size="sm"
              variant="outline"
              className="h-10 w-full sm:w-auto rounded-2xl text-xs font-bold gap-1.5 cursor-pointer"
            >
              <Package className="h-4 w-4" strokeWidth={1.5} />
              <span>إضافة منتج</span>
            </Button>
          </Link>

          <Link to="/admin/orders" className="col-span-2 w-full sm:w-auto">
            <Button
              size="sm"
              className="h-10 w-full sm:w-auto rounded-2xl hero-gradient text-primary-foreground text-xs font-bold gap-1.5 cursor-pointer shadow-xs"
            >
              <Receipt className="h-4 w-4" />
              <span>إدارة الطلبات</span>
            </Button>
          </Link>
        </div>
      </section>

      {/* Alerts Dialog (controlled via header button & Stock KPI card) */}
      <StockAndExpiryAlertsModal
        hideTrigger
        open={alertsModalOpen}
        onOpenChange={setAlertsModalOpen}
        lowStockItems={lowStockItems}
      />

      {/* 2. Balanced 4-Card KPI Strip */}
      <div className="admin-dashboard__kpis grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {/* Card 1: Today's Revenue */}
        <Card className="border border-border bg-card p-4 sm:p-5 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <DollarSign className="h-4 w-4" />
              </span>
              <span className="text-xs font-bold text-muted-foreground">مبيعات اليوم</span>
            </div>
            <span
              title="نسبة التغير مقارنة بالأسبوع الماضي"
              className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                kpis.weeklyGrowthPositive
                  ? "text-emerald-700 bg-emerald-50 border-emerald-200/70 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"
                  : "text-rose-700 bg-rose-50 border-rose-200/70 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800"
              }`}
            >
              أسبوعياً {kpis.weeklyGrowth}
            </span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              <AnimatedCounter value={kpis.salesToday} decimals={2} suffix="ج.م" />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              إجمالي الشهر: {kpis.salesMonth.toLocaleString("en-US", { maximumFractionDigits: 0 })}{" "}
              ج.م
            </p>
          </div>
        </Card>

        {/* Card 2: Today's Orders */}
        <Card className="border border-border bg-card p-4 sm:p-5 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Receipt className="h-4 w-4" />
              </span>
              <span className="text-xs font-bold text-muted-foreground">طلبات اليوم</span>
            </div>
            <span className="text-[11px] font-bold text-foreground bg-muted px-2 py-0.5 rounded-md">
              %{kpis.completionRate} مكتمل
            </span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              <AnimatedCounter value={kpis.ordersTodayCount} decimals={0} suffix="طلب" />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              تم تسليم {kpis.deliveredTodayCount.toLocaleString("en-US")} من طلبات اليوم
            </p>
          </div>
        </Card>

        {/* Card 3: Low Stock Alerts (Accessible interactive button card) */}
        <button
          type="button"
          onClick={() => setAlertsModalOpen(true)}
          className="text-start border border-border bg-card p-4 sm:p-5 flex flex-col justify-between gap-3 cursor-pointer hover:border-amber-500/50 transition-colors"
        >
          <div className="flex items-center justify-between gap-2 w-full">
            <div className="flex items-center gap-2">
              <span
                className={`grid h-8 w-8 place-items-center rounded-xl ${
                  lowStockItems.length > 0
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                }`}
              >
                <AlertTriangle className="h-4 w-4" />
              </span>
              <span className="text-xs font-bold text-muted-foreground">أصناف تحت حد الأمان</span>
            </div>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                lowStockItems.length > 0
                  ? "bg-amber-50 text-amber-700 border-amber-200/70 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
              }`}
            >
              {lowStockItems.length > 0 ? "يحتاج مراجعة" : "مستقر"}
            </span>
          </div>
          <div className="w-full">
            <div className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              <AnimatedCounter value={lowStockItems.length} decimals={0} suffix="صنف" />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {lowStockItems.length > 0
                ? `${kpis.outOfStockCount} منتهي · ${kpis.lowStockCount} منخفض (اضغط للعرض)`
                : "جميع الأصناف النشطة فوق حد الأمان"}
            </p>
          </div>
        </button>

        {/* Card 4: Average Order Value (excludes cancelled orders) */}
        <Card className="border border-border bg-card p-4 sm:p-5 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
                <ShoppingCart className="h-4 w-4" />
              </span>
              <span className="text-xs font-bold text-muted-foreground">متوسط قيمة الطلب</span>
            </div>
            <span className="text-[11px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
              AOV
            </span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              <AnimatedCounter value={kpis.avgOrderValue} decimals={0} suffix="ج.م" />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              من إجمالي {kpis.confirmedOrdersCount.toLocaleString("en-US")} طلب مؤكد
            </p>
          </div>
        </Card>
      </div>

      {/* 3. Smart Insights */}
      <SmartInsights />

      {/* 4. Branch Cards Overview (shown when real branches exist) */}
      {branches.length > 0 && (
        <BranchCardsOverview
          branches={branches}
          selectedBranchId={selectedBranchId}
          onSelectBranch={setSelectedBranchId}
        />
      )}

      {/* 5. Charts & Live Orders Feed */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Sales & Orders Chart */}
        <Card className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs lg:col-span-2 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-border/70">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
                <TrendingUp className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-foreground">تحليل المبيعات والطلبات</h2>
                <p className="text-[11px] text-muted-foreground">
                  {chartMetric === "sales"
                    ? "إجمالي الإيرادات للطلبات غير الملغاة (ج.م)"
                    : "إجمالي عدد الطلبات النشطة والمكتملة"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Metric Switch */}
              <div
                className="flex items-center gap-0.5 bg-muted p-0.5 rounded-lg text-[11px]"
                role="group"
                aria-label="نوع المقياس"
              >
                <button
                  type="button"
                  onClick={() => setChartMetric("sales")}
                  className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                    chartMetric === "sales"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  المبيعات
                </button>
                <button
                  type="button"
                  onClick={() => setChartMetric("count")}
                  className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                    chartMetric === "count"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  الطلبات
                </button>
              </div>

              {/* Date Range Switch */}
              <div
                className="flex items-center gap-0.5 bg-muted p-0.5 rounded-lg text-[11px]"
                role="group"
                aria-label="الفترة الزمنية"
              >
                <button
                  type="button"
                  onClick={() => setChartFilter("today")}
                  className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                    chartFilter === "today"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  اليوم
                </button>
                <button
                  type="button"
                  onClick={() => setChartFilter("7days")}
                  className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                    chartFilter === "7days"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  7 أيام
                </button>
                <button
                  type="button"
                  onClick={() => setChartFilter("month")}
                  className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                    chartFilter === "month"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  الشهر
                </button>
              </div>
            </div>
          </div>

          <div className="relative h-64 w-full pt-4" dir="ltr">
            {chartData.every((d) => d.value === 0) && (
              <div
                dir="rtl"
                className="pointer-events-none absolute inset-0 flex items-center justify-center z-10"
              >
                <span className="rounded-xl border border-border bg-card/95 px-3.5 py-1.5 text-xs font-semibold text-muted-foreground shadow-xs">
                  لا توجد بيانات مسجلة لهذه الفترة حتى الآن
                </span>
              </div>
            )}
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.45} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={chartMetric === "sales"}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                  contentStyle={{
                    borderRadius: 10,
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--popover))",
                    color: "hsl(var(--popover-foreground))",
                    fontSize: 12,
                    padding: "8px 12px",
                  }}
                  formatter={(val: any) =>
                    chartMetric === "sales"
                      ? [`${Number(val).toLocaleString("en-US")} ج.م`, "المبيعات"]
                      : [`${Number(val).toLocaleString("en-US")} طلب`, "عدد الطلبات"]
                  }
                />
                <Bar
                  dataKey="value"
                  fill="hsl(var(--primary))"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={42}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Live Orders Feed (filtered by branch!) */}
        <Card className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border/70">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                <h2 className="text-sm font-bold text-foreground">أحدث الطلبات</h2>
              </div>
              <span className="text-[11px] font-medium text-muted-foreground">
                {selectedBranchId === UNIFIED_ALL_BRANCHES_ID ? "جميع الفروع" : selectedBranchName}
              </span>
            </div>

            <div className="space-y-2 pt-3">
              {liveOrdersFeed.length === 0 ? (
                <div className="py-10 text-center space-y-1.5">
                  <ShoppingBag className="h-7 w-7 text-muted-foreground/50 mx-auto" />
                  <p className="text-xs font-medium text-muted-foreground">
                    لا توجد طلبات مسجلة لهذا النطاق بعد
                  </p>
                </div>
              ) : (
                liveOrdersFeed.map((ord) => {
                  const statusMeta = getOrderStatusMeta(ord.status);
                  return (
                    <button
                      key={ord.id}
                      type="button"
                      onClick={() => setPreviewOrder(ord)}
                      className="w-full text-start flex items-center justify-between gap-2 p-2.5 rounded-xl border border-border/70 bg-background/50 hover:bg-accent/60 hover:border-primary/30 cursor-pointer transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-foreground truncate">
                          {ord.customer_name || "عميل المتجر"}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {getRelativeTimeAr(ord.created_at)}
                        </div>
                      </div>
                      <div className="text-end shrink-0 space-y-1">
                        <div className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                          {Number(ord.total_amount || 0).toFixed(2)} ج.م
                        </div>
                        <span
                          className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-md border ${statusMeta.badgeClass}`}
                        >
                          {statusMeta.label}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <Link to="/admin/orders" className="pt-3 block">
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 rounded-xl text-xs font-bold gap-1.5 cursor-pointer"
            >
              <span>عرض كافة الطلبات</span>
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </Card>
      </div>

      {/* 6. Top Selling Products & AI Advisory Summary */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Top Selling Products */}
        <Card className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-border/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground">الأصناف الأكثر طلبًا</h2>
              </div>
              <Link
                to="/admin/products"
                className="text-[11px] font-bold text-primary hover:underline"
              >
                إدارة المنتجات
              </Link>
            </div>

            <div className="pt-3 space-y-3">
              {bestSellers.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  لا توجد بيانات مبيعات مسجلة بعد
                </div>
              ) : (
                bestSellers.map((item, idx) => {
                  const widthPct = Math.max(Math.round((item.qty / maxBestSellerQty) * 100), 8);
                  return (
                    <div key={item.name} className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-foreground font-semibold truncate">
                          {idx + 1}. {item.name}
                        </span>
                        <span className="text-muted-foreground font-mono text-[11px] shrink-0">
                          {item.qty} وحدة
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary/80 transition-all"
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </Card>

        {/* Executive Advisory Widget (stabilized props) */}
        <div className="lg:col-span-2">
          <ExecutiveSummaryWidget kpis={executiveKpis} />
        </div>
      </div>

      {/* Order Preview Dialog */}
      <Dialog open={!!previewOrder} onOpenChange={() => setPreviewOrder(null)}>
        <DialogContent className="max-w-md rounded-2xl p-5 bg-card border border-border" dir="rtl">
          <DialogHeader className="pb-3 border-b border-border/70">
            <DialogTitle className="text-sm font-bold flex items-center justify-between gap-2">
              <span>تفاصيل الطلب السريع</span>
              {previewOrder && (
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                    getOrderStatusMeta(previewOrder.status).badgeClass
                  }`}
                >
                  {getOrderStatusMeta(previewOrder.status).label}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {previewOrder && (
            <div className="space-y-3.5 pt-2 text-xs">
              <div className="rounded-xl bg-muted/50 p-3 space-y-1">
                <div className="text-muted-foreground">بيانات العميل والتوصيل:</div>
                <div className="font-bold text-foreground">
                  {previewOrder.customer_name || "بدون اسم"}
                  {previewOrder.phone ? ` • ${previewOrder.phone}` : ""}
                </div>
                <div className="text-muted-foreground text-[11px]">
                  {previewOrder.address || "استلام من الفرع"}
                </div>
              </div>

              {previewOrder.items && previewOrder.items.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-muted-foreground font-semibold">
                    الأصناف ({previewOrder.items.length}):
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1 pe-1">
                    {previewOrder.items.map((item, idx) => (
                      <div
                        key={item.id || `${item.name}-${idx}`}
                        className="flex items-center justify-between py-1 border-b border-border/40 last:border-b-0"
                      >
                        <span className="truncate text-foreground">
                          {item.name} × {item.quantity}
                        </span>
                        <span className="font-semibold text-muted-foreground shrink-0">
                          {Number(item.subtotal || 0).toFixed(2)} ج.م
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-border/70 flex items-center justify-between font-bold">
                <span>الإجمالي:</span>
                <span className="text-emerald-700 dark:text-emerald-400 text-sm">
                  {Number(previewOrder.total_amount || 0).toFixed(2)} ج.م
                </span>
              </div>

              <Link to="/admin/orders" className="block pt-1">
                <Button className="w-full h-9 rounded-xl hero-gradient text-primary-foreground text-xs font-bold cursor-pointer">
                  الانتقال لإدارة الطلبات
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
    <div className="admin-dashboard space-y-6 animate-pulse">
      <div className="h-28 w-full bg-muted rounded-2xl" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="h-28 bg-muted rounded-2xl" />
        <div className="h-28 bg-muted rounded-2xl" />
        <div className="h-28 bg-muted rounded-2xl" />
        <div className="h-28 bg-muted rounded-2xl" />
      </div>
      <div className="h-44 bg-muted rounded-2xl" />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-72 bg-muted rounded-2xl lg:col-span-2" />
        <div className="h-72 bg-muted rounded-2xl" />
      </div>
    </div>
  );
}
