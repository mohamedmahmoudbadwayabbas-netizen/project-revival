import { describe, expect, it } from "vitest";
import {
  buildLowStockAlertItems,
  buildSalesChartData,
  computeBestSellers,
  computeDashboardKpis,
  filterOrdersByBranch,
  getArabicTimeGreeting,
  getOrderStatusMeta,
  type AdminOrderRow,
  type AdminProductRow,
} from "./admin-dashboard";

describe("admin-dashboard helpers", () => {
  it("returns time-appropriate Arabic greetings", () => {
    expect(getArabicTimeGreeting(8)).toBe("صباح الخير");
    expect(getArabicTimeGreeting(14)).toBe("مساء الخير");
    expect(getArabicTimeGreeting(23)).toBe("مساء الخير");
  });

  it("maps canonical and legacy order statuses to Arabic labels", () => {
    expect(getOrderStatusMeta("pending").label).toBe("جديد");
    expect(getOrderStatusMeta("new").label).toBe("جديد");
    expect(getOrderStatusMeta("preparing").label).toBe("قيد التجهيز");
    expect(getOrderStatusMeta("ready_for_delivery").label).toBe("جاهز للتوصيل");
    expect(getOrderStatusMeta("shipped").label).toBe("في الطريق");
    expect(getOrderStatusMeta("delivered").label).toBe("تم التسليم");
    expect(getOrderStatusMeta("cancelled").label).toBe("ملغي");
  });

  it("filters inactive products and sorts out-of-stock items first in alerts", () => {
    const products: AdminProductRow[] = [
      { id: "p1", name: "لبن طازج", stock: 3, low_stock_threshold: 5, is_active: true },
      { id: "p2", name: "منتج متوقف", stock: 0, low_stock_threshold: 5, is_active: false },
      { id: "p3", name: "طماطم", stock: 0, low_stock_threshold: 0, is_active: true },
      { id: "p4", name: "أرز", stock: 25, low_stock_threshold: 5, is_active: true },
    ];

    const alerts = buildLowStockAlertItems(products, "الفرع الرئيسي");
    expect(alerts.map((a) => a.id)).toEqual(["p3", "p1"]);
    expect(alerts[0].threshold).toBe(1);
    expect(alerts[0].branchName).toBe("الفرع الرئيسي");
  });

  it("excludes cancelled orders from revenue and AOV calculations", () => {
    const now = new Date("2026-11-10T14:00:00Z");
    const orders: AdminOrderRow[] = [
      {
        id: "o1",
        total_amount: 300,
        status: "delivered",
        created_at: "2026-11-10T10:00:00Z",
        delivery_zone_id: "b1",
      },
      {
        id: "o2",
        total_amount: 100,
        status: "pending",
        created_at: "2026-11-10T11:00:00Z",
        delivery_zone_id: "b1",
      },
      {
        id: "o3",
        total_amount: 1000,
        status: "cancelled",
        created_at: "2026-11-10T12:00:00Z",
        delivery_zone_id: "b2",
      },
    ];

    const kpis = computeDashboardKpis(orders, [], now);
    expect(kpis.salesToday).toBe(400);
    expect(kpis.ordersTodayCount).toBe(3);
    expect(kpis.confirmedOrdersCount).toBe(2);
    expect(kpis.avgOrderValue).toBe(200);
    expect(kpis.completionRate).toBe(33);

    const branch1Orders = filterOrdersByBranch(orders, "b1");
    expect(branch1Orders).toHaveLength(2);
  });

  it("includes day 31 in monthly chart and supports count metric", () => {
    const now = new Date("2026-10-31T15:00:00");
    const orders: AdminOrderRow[] = [
      {
        id: "o1",
        total_amount: 250,
        status: "confirmed",
        created_at: "2026-10-31T12:00:00",
      },
      {
        id: "o2",
        total_amount: 150,
        status: "delivered",
        created_at: "2026-10-31T13:00:00",
      },
      {
        id: "o3",
        total_amount: 500,
        status: "cancelled",
        created_at: "2026-10-31T14:00:00",
      },
    ];

    const monthSales = buildSalesChartData(orders, "month", "sales", now);
    expect(monthSales[5]).toEqual({ label: "26-31", value: 400 });

    const monthCount = buildSalesChartData(orders, "month", "count", now);
    expect(monthCount[5]).toEqual({ label: "26-31", value: 2 });
  });

  it("computes best sellers excluding cancelled orders", () => {
    const orders: AdminOrderRow[] = [
      {
        id: "o1",
        total_amount: 100,
        status: "delivered",
        created_at: "2026-11-10T10:00:00Z",
        items: [
          { name: "أرز", quantity: 3, subtotal: 90 },
          { name: "زيت", quantity: 1, subtotal: 60 },
        ],
      },
      {
        id: "o2",
        total_amount: 200,
        status: "cancelled",
        created_at: "2026-11-10T11:00:00Z",
        items: [{ name: "زيت", quantity: 10, subtotal: 600 }],
      },
    ];

    const best = computeBestSellers(orders);
    expect(best).toEqual([
      { name: "أرز", qty: 3, revenue: 90 },
      { name: "زيت", qty: 1, revenue: 60 },
    ]);
  });
});
