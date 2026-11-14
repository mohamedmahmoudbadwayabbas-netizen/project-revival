import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { Route } from "./admin.index";

const { mockOrders, mockProducts, mockBranches } = vi.hoisted(() => ({
  mockOrders: [
    {
      id: "ord-1",
      user_id: null,
      status: "preparing",
      total_amount: 320,
      shipping_address: null,
      created_at: new Date().toISOString(),
      customer_name: "أحمد علي",
      phone: "01012345678",
      address: "المعادي",
      notes: null,
      delivery_zone_id: "branch-1",
      delivery_method: "delivery",
      payment_method: "cod",
      payment_reference: null,
      coupon_code: null,
      ref_source: null,
      delivery_fee: 15,
      discount_amount: 0,
      items: [
        {
          id: "item-1",
          product_id: "prod-1",
          name: "جبنة بيضاء",
          quantity: 2,
          price: 160,
          subtotal: 320,
          unit_label: "كيلو",
        },
      ],
    },
    {
      id: "ord-2",
      user_id: null,
      status: "delivered",
      total_amount: 180,
      shipping_address: null,
      created_at: new Date().toISOString(),
      customer_name: "سارة حسن",
      phone: "01099887766",
      address: "مدينة نصر",
      notes: null,
      delivery_zone_id: "branch-2",
      delivery_method: "delivery",
      payment_method: "cod",
      payment_reference: null,
      coupon_code: null,
      ref_source: null,
      delivery_fee: 15,
      discount_amount: 0,
      items: [],
    },
  ],
  mockProducts: [
    {
      id: "prod-low",
      name: "لبن كامل الدسم",
      name_ar: "لبن كامل الدسم",
      stock: 2,
      stock_quantity: 2,
      low_stock_threshold: 5,
      unit_label: "لتر",
      unit: "لتر",
      is_active: true,
      categories: { name: "Dairy", name_ar: "ألبان" },
    },
  ],
  mockBranches: [
    {
      id: "branch-1",
      name: "فرع المعادي",
      city: "القاهرة",
      address: "شارع 9 المعادي",
      phone: "0100000001",
      status: "open" as const,
      isMain: true,
      deliveryZones: ["المعادي"],
      stats: {
        todayRevenue: 320,
        todayOrders: 1,
        activeOrders: 1,
        totalProducts: 1,
        stockHealth: 80,
        lowStockItems: 1,
      },
    },
    {
      id: "branch-2",
      name: "فرع مدينة نصر",
      city: "القاهرة",
      address: "عباس العقاد",
      phone: "0100000002",
      status: "open" as const,
      isMain: false,
      deliveryZones: ["مدينة نصر"],
      stats: {
        todayRevenue: 180,
        todayOrders: 1,
        activeOrders: 0,
        totalProducts: 1,
        stockHealth: 80,
        lowStockItems: 1,
      },
    },
  ],
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opts: any) => opts,
  Link: ({ children, to, ...rest }: any) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/services/orderDataService", () => ({
  fetchOrdersWithItems: vi.fn().mockResolvedValue(mockOrders),
}));

vi.mock("@/lib/branches-data", async () => {
  const actual = await vi.importActual<typeof import("@/lib/branches-data")>("@/lib/branches-data");
  return {
    ...actual,
    fetchLiveBranches: vi.fn().mockResolvedValue(mockBranches),
  };
});

vi.mock("@/integrations/supabase/client", () => {
  const channel = {
    on: () => channel,
    subscribe: () => channel,
  };
  return {
    supabase: {
      channel: () => channel,
      removeChannel: vi.fn(),
      from: (table: string) => {
        const result =
          table === "products" ? { data: mockProducts, error: null } : { data: [], error: null };
        const builder: any = new Proxy(
          {},
          {
            get(_t, prop) {
              if (prop === "then") {
                return (resolve: (val: any) => void) => Promise.resolve(result).then(resolve);
              }
              return () => builder;
            },
          },
        );
        return builder;
      },
    },
  };
});

vi.mock("@/services/gemini36Service", () => ({
  generateExecutiveSummary: vi.fn().mockResolvedValue({
    headline: "ملخص تنفيذي تجريبي",
    overallHealthScore: 92,
    insights: ["مؤشر مستقر"],
    actionableTips: [],
  }),
}));

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="recharts">{children}</div>,
  BarChart: ({ children }: any) => <div>{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
}));

describe("Admin OverviewPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders dashboard, passes real low-stock items to alerts modal, translates order status, and filters orders by branch", async () => {
    const OverviewPage = (Route as any).component;
    render(<OverviewPage />);

    await waitFor(() => {
      expect(screen.getByText(/مدير المتجر/)).toBeInTheDocument();
    });

    // Live feed shows both customers and translated Arabic statuses
    expect(screen.getByText("أحمد علي")).toBeInTheDocument();
    expect(screen.getByText("سارة حسن")).toBeInTheDocument();
    expect(screen.getByText("قيد التجهيز")).toBeInTheDocument();
    expect(screen.getByText("تم التسليم")).toBeInTheDocument();

    // Opening alerts modal via Stock KPI shows real low-stock product ("لبن كامل الدسم") instead of 0
    fireEvent.click(screen.getByText("أصناف تحت حد الأمان"));
    const alertsDialog = await screen.findByRole("dialog");
    expect(within(alertsDialog).getByText("لبن كامل الدسم")).toBeInTheDocument();
    expect(alertsDialog).toHaveTextContent("1 تنبيهات عاجلة");

    // Dismiss alerts modal before clicking branch card underneath
    fireEvent.keyDown(alertsDialog, { key: "Escape", code: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    // Clicking a branch card filters the live orders feed as well
    fireEvent.click(screen.getByText("فرع المعادي"));
    await waitFor(() => {
      expect(screen.getByText("أحمد علي")).toBeInTheDocument();
      expect(screen.queryByText("سارة حسن")).not.toBeInTheDocument();
    });

    // Clicking an order opens quick preview dialog with items breakdown
    fireEvent.click(screen.getByText("أحمد علي"));
    const orderDialog = await screen.findByRole("dialog");
    expect(within(orderDialog).getByText("تفاصيل الطلب السريع")).toBeInTheDocument();
    expect(orderDialog).toHaveTextContent("جبنة بيضاء × 2");
  });
});
