import type { StockAlertItem } from "@/components/admin/StockAndExpiryAlertsModal";

export type AdminOrderRow = {
  id: string;
  customer_name?: string | null;
  phone?: string | null;
  address?: string | null;
  delivery_zone_id?: string | null;
  total_amount: number;
  status: string;
  created_at: string;
  notes?: string | null;
  items?: { id?: string; name: string; quantity: number; subtotal: number }[];
};

export type AdminProductRow = {
  id: string;
  name: string;
  name_ar?: string | null;
  stock?: number | null;
  stock_quantity?: number | null;
  low_stock_threshold?: number | null;
  unit_label?: string | null;
  unit?: string | null;
  is_active?: boolean | null;
  categories?: { name?: string | null; name_ar?: string | null } | null;
};

export type ChartFilter = "today" | "7days" | "month";
export type ChartMetric = "sales" | "count";

export type OrderStatusMeta = {
  key: string;
  label: string;
  badgeClass: string;
};

const LEGACY_STATUS_MAP: Record<string, string> = {
  new: "pending",
  preparing: "confirmed",
  processing: "confirmed",
  ready: "ready_for_delivery",
  delivering: "shipped",
  partially_delivered: "shipped",
};

const STATUS_META: Record<string, { label: string; badgeClass: string }> = {
  pending: {
    label: "جديد",
    badgeClass:
      "bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/70",
  },
  confirmed: {
    label: "قيد التجهيز",
    badgeClass:
      "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/70",
  },
  ready_for_delivery: {
    label: "جاهز للتوصيل",
    badgeClass:
      "bg-cyan-50 text-cyan-700 border-cyan-200/80 dark:bg-cyan-950/50 dark:text-cyan-300 dark:border-cyan-800/70",
  },
  shipped: {
    label: "في الطريق",
    badgeClass:
      "bg-indigo-50 text-indigo-700 border-indigo-200/80 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800/70",
  },
  delivered: {
    label: "تم التسليم",
    badgeClass:
      "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/70",
  },
  cancelled: {
    label: "ملغي",
    badgeClass:
      "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/70",
  },
};

export function getArabicTimeGreeting(hour = new Date().getHours()): string {
  return hour >= 5 && hour < 12 ? "صباح الخير" : "مساء الخير";
}

export function canonicalOrderStatus(status: string | null | undefined): string {
  const normalized = String(status || "")
    .trim()
    .toLowerCase();
  return LEGACY_STATUS_MAP[normalized] ?? (normalized || "pending");
}

export function getOrderStatusMeta(status: string | null | undefined): OrderStatusMeta {
  const key = canonicalOrderStatus(status);
  const found = STATUS_META[key];
  if (found) {
    return { key, ...found };
  }
  return {
    key,
    label: status?.trim() || "غير محدد",
    badgeClass:
      "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
  };
}

export function filterOrdersByBranch(
  orders: AdminOrderRow[],
  selectedBranchId: string,
): AdminOrderRow[] {
  if (!selectedBranchId || selectedBranchId === "all") return orders;
  const normalized = selectedBranchId.toLowerCase();
  return orders.filter(
    (o) =>
      o.delivery_zone_id === selectedBranchId ||
      (o.address && o.address.toLowerCase().includes(normalized)),
  );
}

export function buildLowStockAlertItems(
  products: AdminProductRow[],
  branchName = "المخزون الموحد",
): StockAlertItem[] {
  const items: StockAlertItem[] = [];

  for (const product of products) {
    if (product.is_active === false) continue;

    const currentStock = Number(product.stock ?? product.stock_quantity ?? 0);
    const threshold = Math.max(Number(product.low_stock_threshold ?? 5), 1);

    if (currentStock <= threshold) {
      const unit = product.unit_label || product.unit || "قطعة";
      const category = product.categories?.name_ar || product.categories?.name || "غير مصنف";
      const reorderQuantity = Math.max(threshold * 3 - Math.max(currentStock, 0), 10);

      items.push({
        id: product.id,
        name: product.name_ar || product.name,
        category,
        branchName,
        currentStock: Math.max(currentStock, 0),
        threshold,
        unit,
        reorderQuantity,
      });
    }
  }

  return items.sort((a, b) => a.currentStock - b.currentStock);
}

export type DashboardKpis = {
  salesToday: number;
  salesMonth: number;
  ordersTodayCount: number;
  revenueOrdersTodayCount: number;
  deliveredTodayCount: number;
  completionRate: number;
  avgOrderValue: number;
  confirmedOrdersCount: number;
  weeklyGrowth: string;
  weeklyGrowthPositive: boolean;
  lowStockCount: number;
  outOfStockCount: number;
};

export function computeDashboardKpis(
  filteredOrders: AdminOrderRow[],
  lowStockItems: StockAlertItem[],
  now = new Date(),
): DashboardKpis {
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
  const past7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const prev14To7Days = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const revenueOrders = filteredOrders.filter(
    (o) => canonicalOrderStatus(o.status) !== "cancelled",
  );

  const ordersTodayList = filteredOrders.filter((o) => new Date(o.created_at) >= todayStart);
  const revenueOrdersToday = revenueOrders.filter((o) => new Date(o.created_at) >= todayStart);

  const salesToday = revenueOrdersToday.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  const salesMonth = revenueOrders
    .filter((o) => new Date(o.created_at) >= monthStart)
    .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  const avgSource = revenueOrdersToday.length > 0 ? revenueOrdersToday : revenueOrders;
  const avgOrderValue =
    avgSource.length > 0
      ? avgSource.reduce((acc, o) => acc + Number(o.total_amount || 0), 0) / avgSource.length
      : 0;

  const last7Revenue = revenueOrders
    .filter((o) => new Date(o.created_at) >= past7Days)
    .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  const prev7Revenue = revenueOrders
    .filter((o) => {
      const created = new Date(o.created_at);
      return created >= prev14To7Days && created < past7Days;
    })
    .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  let weeklyGrowth = "0%";
  let weeklyGrowthPositive = true;
  if (prev7Revenue > 0) {
    const diff = ((last7Revenue - prev7Revenue) / prev7Revenue) * 100;
    weeklyGrowthPositive = diff >= 0;
    weeklyGrowth = diff >= 0 ? `+${diff.toFixed(1)}%` : `${diff.toFixed(1)}%`;
  } else if (last7Revenue > 0) {
    weeklyGrowth = "+100%";
    weeklyGrowthPositive = true;
  }

  const deliveredTodayCount = ordersTodayList.filter(
    (o) => canonicalOrderStatus(o.status) === "delivered",
  ).length;
  const completionRate =
    ordersTodayList.length > 0
      ? Math.round((deliveredTodayCount / ordersTodayList.length) * 100)
      : 0;

  const outOfStockCount = lowStockItems.filter((item) => item.currentStock <= 0).length;
  const lowStockCount = lowStockItems.filter((item) => item.currentStock > 0).length;

  return {
    salesToday,
    salesMonth,
    ordersTodayCount: ordersTodayList.length,
    revenueOrdersTodayCount: revenueOrdersToday.length,
    deliveredTodayCount,
    completionRate,
    avgOrderValue,
    confirmedOrdersCount: revenueOrders.length,
    weeklyGrowth,
    weeklyGrowthPositive,
    lowStockCount,
    outOfStockCount,
  };
}

export function buildSalesChartData(
  filteredOrders: AdminOrderRow[],
  filter: ChartFilter,
  metric: ChartMetric,
  now = new Date(),
): { label: string; value: number }[] {
  const revenueOrders = filteredOrders.filter(
    (o) => canonicalOrderStatus(o.status) !== "cancelled",
  );

  if (filter === "today") {
    const todayStr = now.toDateString();
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

    for (const ord of todayOrds) {
      const h = new Date(ord.created_at).getHours();
      const slot = Math.min(Math.floor(h / 3), 7);
      hours[slot].value += metric === "sales" ? Number(ord.total_amount || 0) : 1;
    }

    return hours.map((item) => ({
      ...item,
      value: Number(item.value.toFixed(2)),
    }));
  }

  if (filter === "7days") {
    const dayNames = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    const result: { label: string; value: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toDateString();
      const dayLabel = i === 0 ? "اليوم" : dayNames[d.getDay()];

      const dayOrds = revenueOrders.filter(
        (o) => new Date(o.created_at).toDateString() === dateStr,
      );
      const val = dayOrds.reduce(
        (acc, o) => acc + (metric === "sales" ? Number(o.total_amount || 0) : 1),
        0,
      );

      result.push({ label: dayLabel, value: Number(val.toFixed(2)) });
    }
    return result;
  }

  const result: { label: string; value: number }[] = [];
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  for (let step = 1; step <= 6; step++) {
    const start = (step - 1) * 5 + 1;
    const end = step === 6 ? 31 : step * 5;
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
      (acc, o) => acc + (metric === "sales" ? Number(o.total_amount || 0) : 1),
      0,
    );
    result.push({ label: `${start}-${end}`, value: Number(val.toFixed(2)) });
  }
  return result;
}

export function computeBestSellers(
  filteredOrders: AdminOrderRow[],
  limit = 5,
): { name: string; qty: number; revenue: number }[] {
  const revenueOrders = filteredOrders.filter(
    (o) => canonicalOrderStatus(o.status) !== "cancelled",
  );
  const tally = new Map<string, { qty: number; revenue: number }>();

  for (const order of revenueOrders) {
    for (const item of order.items ?? []) {
      if (!item.name) continue;
      const existing = tally.get(item.name) ?? { qty: 0, revenue: 0 };
      tally.set(item.name, {
        qty: existing.qty + Number(item.quantity || 0),
        revenue: existing.revenue + Number(item.subtotal || 0),
      });
    }
  }

  return Array.from(tally.entries())
    .map(([name, stats]) => ({
      name,
      qty: Number(stats.qty.toFixed(0)),
      revenue: Number(stats.revenue.toFixed(2)),
    }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, limit);
}

export function getRelativeTimeAr(dateString: string, now = new Date()): string {
  const date = new Date(dateString);
  const diffSec = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

  if (diffSec < 15) return "الآن";
  if (diffSec < 60) return `منذ ${diffSec} ثانية`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `منذ ${diffHour} ساعة`;
  const diffDay = Math.floor(diffHour / 24);
  return `منذ ${diffDay} يوم`;
}
