import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchOrdersWithItems } from "@/services/orderDataService";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Printer,
  Download,
  Eye,
  X,
  Truck,
  Phone,
  Search,
  RefreshCw,
  ShoppingBag,
  MessageCircle,
  Navigation,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import * as XLSX from "xlsx";
import { Skeleton } from "@/components/ui/universal-skeleton";

type OrderItem = {
  name: string;
  quantity: number;
  unit_label: string;
  subtotal: number;
  price_per_unit?: number;
  is_by_weight?: boolean;
};

type Order = {
  id: string;
  user_id?: string | null;
  customer_name: string;
  phone: string;
  address: string;
  total_amount: number;
  delivery_fee?: number;
  payment_method?: string;
  status: string;
  created_at: string;
  items: OrderItem[];
  notes: string | null;
  ref_source: string | null;
  driver_name?: string | null;
  driver_phone?: string | null;
  driver_lat?: number | null;
  driver_lng?: number | null;
};

type StoreSettings = {
  site_name: string | null;
  logo_url: string | null;
};

type CustomerSummary = {
  orderCount: number;
  totalSpend: number;
  lastOrderAt: string | null;
  loyaltyTier: string;
};

function deliverySlotFromNotes(notes: string | null) {
  const match = notes?.match(/\[موعد التوصيل:\s*([^\]]+)\]/);
  return match?.[1] ?? null;
}

const STATUSES = [
  {
    key: "pending",
    label: "جديد",
    next: "confirmed",
    color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
  {
    key: "confirmed",
    label: "قيد التجهيز",
    next: "ready_for_delivery",
    color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  },
  {
    key: "ready_for_delivery",
    label: "جاهز للتوصيل",
    next: "shipped",
    color: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  },
  {
    key: "shipped",
    label: "في الطريق",
    next: "delivered",
    color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  },
  {
    key: "delivered",
    label: "تم التسليم",
    next: null,
    color: "bg-green-500/10 text-green-500 border-green-500/20",
  },
  {
    key: "cancelled",
    label: "ملغي ❌",
    next: null,
    color: "bg-red-500/10 text-red-500 border-red-500/20",
  },
] as const;

const LEGACY_STATUS_MAP: Record<string, string> = {
  new: "pending",
  preparing: "confirmed",
  ready: "ready_for_delivery",
  partially_delivered: "shipped",
};

function canonicalStatus(status: string | null | undefined) {
  return LEGACY_STATUS_MAP[status ?? ""] ?? status ?? "pending";
}

function normalizeOrder(order: Order): Order {
  return { ...order, status: canonicalStatus(order.status) };
}

function statusLabel(status: string) {
  return STATUSES.find((item) => item.key === canonicalStatus(status))?.label ?? status;
}

function customerKey(order: Order) {
  return (
    order.user_id || order.phone?.replace(/\D/g, "") || order.customer_name?.trim() || order.id
  );
}

function loyaltyTier(orderCount: number) {
  if (orderCount >= 15) return "Platinum";
  if (orderCount >= 7) return "Gold";
  if (orderCount >= 3) return "Silver";
  return "Bronze";
}

const PAYMENT_LABELS: Record<string, string> = {
  cod: "الدفع عند الاستلام",
  instapay: "إنستا باي",
  bank: "تحويل بنكي",
};

// تشغيل نغمة تنبيه صوتية خفيفة للطلبات الجديدة
function playNewOrderSound() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
  } catch (_) {
    // Audio cleanup is best effort when the browser context is closing.
  }
}

export const Route = createFileRoute("/admin/orders")({
  head: () => ({
    meta: [
      { title: "إدارة الطلبات والتوصيل اللحظي — لوحة التحكم" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: OrdersPage,
});

function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeOrderTab, setActiveOrderTab] = useState<"list" | "details">("list");
  const [dateFilter, setDateFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [driverFilter, setDriverFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const [preview, setPreview] = useState<Order | null>(null);

  // حوار تعيين السائق
  const [assigningOrder, setAssigningOrder] = useState<Order | null>(null);

  // لا نعرض تتبعاً حياً قبل ربط مصدر GPS حقيقي.
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const combined = await fetchOrdersWithItems();
      setOrders((combined as unknown as Order[]).map(normalizeOrder));
    } catch (err: any) {
      toast.error(`تعذر جلب الطلبات: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadStoreSettings = async () => {
    const { data, error } = await supabase
      .from("store_settings")
      .select("site_name,logo_url")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) {
      toast.error(`تعذر جلب إعدادات المتجر: ${error.message}`);
      return;
    }
    setStoreSettings(data);
  };

  useEffect(() => {
    load();
    loadStoreSettings();

    // الاشتراك اللحظي الفوري لجدول الطلبات (Supabase Realtime)
    const channel = supabase
      .channel("admin-orders-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => {
        const newOrder = payload.new as Order;
        // Re-fetch so the new order includes its order_items/products; realtime payload only contains orders columns.
        load();
        playNewOrderSound();
        toast.success(
          `🎉 وصل طلب جديد الآن من ${newOrder.customer_name || "عميل"} بقيمة ${newOrder.total_amount} ج.م!`,
          {
            duration: 6000,
          },
        );
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, (payload) => {
        const updated = normalizeOrder(payload.new as Order);
        setOrders((prev) => prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // تحديث حالة الطلب
  const setStatus = async (
    id: string,
    newStatus: string,
    driverInfo?: { driver_name: string; driver_phone: string },
  ) => {
    const prev = orders;
    const canonicalNewStatus = canonicalStatus(newStatus);
    setOrders((p) =>
      p.map((o) => (o.id === id ? { ...o, status: canonicalNewStatus, ...(driverInfo || {}) } : o)),
    );
    setPreview((current) =>
      current?.id === id
        ? { ...current, status: canonicalNewStatus, ...(driverInfo || {}) }
        : current,
    );

    try {
      const payload: { status: string; notes?: string } = { status: canonicalNewStatus };
      if (driverInfo) {
        payload.notes = `الموصل: ${driverInfo.driver_name} (${driverInfo.driver_phone})`;
      }

      const { error } = await supabase.from("orders").update(payload).eq("id", id);
      if (error) throw error;

      toast.success(`تم تحديث حالة الطلب إلى: ${statusLabel(canonicalNewStatus)}`);
    } catch (err: any) {
      toast.error(`فشل تحديث الحالة: ${err.message}`);
      setOrders(prev);
    }
  };

  // فتح حوار التوصيل وإسناد الموصل
  const handleStartDelivery = (order: Order) => {
    setAssigningOrder(order);
  };

  const confirmDeliveryAssignment = () => {
    toast.error("لا يوجد مصدر سائقين متاح. أضف دور driver وتعييناته في قاعدة البيانات أولًا.");
  };

  // طباعة الفاتورة الفورية
  const printReceipt = (o: Order) => {
    const w = window.open("", "_blank");
    if (!w) return;
    const storeName = storeSettings?.site_name?.trim() || "نظام إدارة المتجر";
    const logo = storeSettings?.logo_url
      ? `<img src="${storeSettings.logo_url}" alt="${storeName}" style="display:block;max-width:120px;max-height:60px;margin:0 auto 8px;object-fit:contain;" />`
      : "";
    w.document.write(`
      <html dir="rtl">
        <head>
          <title>إيصال طلب #${o.id.slice(0, 8)}</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 20px; max-width: 380px; margin: 0 auto; color: #000; }
            h2 { text-align: center; margin-bottom: 4px; }
            p { margin: 2px 0; font-size: 12px; }
            .line { border-bottom: 1px dashed #000; margin: 10px 0; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { text-align: right; padding: 4px 0; }
            .total { font-weight: bold; font-size: 14px; text-align: left; }
          </style>
        </head>
        <body>
          ${logo}
          <h2>${storeName}</h2>
          <p style="text-align: center;">إيصال تجميع وتوصيل الطلب</p>
          <div class="line"></div>
          <p><b>رقم الطلب:</b> #${o.id.slice(0, 8)}</p>
          <p><b>التاريخ:</b> ${new Date(o.created_at).toLocaleString("ar-EG")}</p>
          <p><b>العميل:</b> ${o.customer_name}</p>
          <p><b>الهاتف:</b> ${o.phone}</p>
          <p><b>العنوان:</b> ${o.address}</p>
          <div class="line"></div>
          <table>
            <thead>
              <tr><th>الصنف</th><th>الكمية</th><th>السعر</th></tr>
            </thead>
            <tbody>
              ${(o.items || [])
                .map(
                  (it) => `
                <tr>
                  <td>${it.name}</td>
                  <td>${it.quantity} ${it.unit_label || ""}</td>
                  <td>${it.subtotal} ج.م</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
          <div class="line"></div>
          <p class="total">الإجمالي المستحق: ${o.total_amount} ج.م</p>
          <div class="line"></div>
          <p style="text-align: center; font-size: 10px; margin-top: 15px;">شكراً لتسوقكم معنا!</p>
        </body>
      </html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  // تصدير الطلبات كملف Excel
  const exportXlsx = (rows: Order[]) => {
    const data = rows.map((o) => ({
      "رقم الطلب": o.id.slice(0, 8),
      التاريخ: new Date(o.created_at).toLocaleString("ar-EG"),
      "اسم العميل": o.customer_name,
      الهاتف: o.phone,
      العنوان: o.address,
      "إجمالي المبلغ (ج.م)": o.total_amount,
      الحالة: STATUSES.find((s) => s.key === o.status)?.label ?? o.status,
      "عدد الأصناف": o.items?.length ?? 0,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = Object.keys(data[0] ?? {}).map(() => ({ wch: 20 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    XLSX.writeFile(wb, `orders-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // التصفية والفلترة
  const filteredOrders = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return orders.filter((o) => {
      const matchesSearch =
        !q ||
        o.customer_name?.toLowerCase().includes(q) ||
        o.phone?.includes(q) ||
        o.id.toLowerCase().includes(q) ||
        o.address?.toLowerCase().includes(q);
      const paymentMethod = o.payment_method || "cod";
      const matchesPayment = paymentFilter === "all" || paymentMethod === paymentFilter;
      const matchesDriver =
        driverFilter === "all" || (o.driver_name || "unassigned") === driverFilter;
      const orderDate = new Date(o.created_at);
      const now = new Date();
      const matchesDate =
        dateFilter === "all" ||
        (dateFilter === "today" && orderDate.toDateString() === now.toDateString()) ||
        (dateFilter === "7days" && orderDate >= new Date(now.getTime() - 7 * 86400000));
      return Boolean(matchesSearch && matchesPayment && matchesDriver && matchesDate);
    });
  }, [orders, searchQuery, dateFilter, paymentFilter, driverFilter]);

  const grouped = useMemo(() => {
    const m: Record<string, Order[]> = {};
    for (const s of STATUSES) m[s.key] = [];
    for (const o of filteredOrders) {
      const key = canonicalStatus(o.status);
      (m[key] ?? (m[key] = [])).push(o);
    }
    return m;
  }, [filteredOrders]);

  const visibleOrders = tab === "all" ? filteredOrders : (grouped[tab] ?? []);
  const pageCount = Math.max(1, Math.ceil(visibleOrders.length / pageSize));
  const pagedOrders = visibleOrders.slice((page - 1) * pageSize, page * pageSize);
  const operationalKpis = useMemo(() => {
    const today = new Date();
    return {
      pending: orders.filter((o) => canonicalStatus(o.status) === "pending").length,
      confirmed: orders.filter((o) => canonicalStatus(o.status) === "confirmed").length,
      ready: orders.filter((o) => canonicalStatus(o.status) === "ready_for_delivery").length,
      shipped: orders.filter((o) => canonicalStatus(o.status) === "shipped").length,
      deliveredToday: orders.filter(
        (o) =>
          canonicalStatus(o.status) === "delivered" &&
          new Date(o.created_at).toDateString() === today.toDateString(),
      ).length,
    };
  }, [orders]);
  const customerSummary = useMemo(() => {
    if (!preview) return null;
    const key = customerKey(preview);
    const customerOrders = orders.filter((order) => customerKey(order) === key);
    const completedOrders = customerOrders.filter(
      (order) => canonicalStatus(order.status) === "delivered",
    );
    const latest = customerOrders.reduce<string | null>(
      (latestDate, order) =>
        !latestDate || order.created_at > latestDate ? order.created_at : latestDate,
      null,
    );
    return {
      orderCount: customerOrders.length,
      totalSpend: completedOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0),
      lastOrderAt: latest,
      loyaltyTier: loyaltyTier(completedOrders.length),
    } satisfies CustomerSummary;
  }, [orders, preview]);
  useEffect(() => setPage(1), [tab, searchQuery, dateFilter, paymentFilter, driverFilter]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="admin-orders space-y-6 p-4 sm:p-6 pb-24"
      dir="rtl"
    >
      <div className="admin-orders__page-title">
        <div>
          <h1>الطلبات</h1>
          <p>تابع كل طلبات متجرك من وصوله حتى تسليمه.</p>
        </div>
        <span>
          <i /> تحديث مباشر
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          ["الطلبات الجديدة", operationalKpis.pending, "text-blue-600"],
          ["قيد التجهيز", operationalKpis.confirmed, "text-amber-600"],
          ["جاهزة للتوصيل", operationalKpis.ready, "text-cyan-600"],
          ["في الطريق", operationalKpis.shipped, "text-emerald-600"],
          ["المكتملة اليوم", operationalKpis.deliveredToday, "text-violet-600"],
        ].map(([label, value, color]) => (
          <div key={label} className="rounded-2xl border bg-card p-4 shadow-sm">
            <p className="text-[13px] font-bold text-muted-foreground">{label}</p>
            <strong className={`mt-1 block text-2xl font-black ${color}`}>{value}</strong>
          </div>
        ))}
      </div>

      {/* Control Bar: Search & Stats */}
      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        {activeOrderTab === "list" && (
          <div className="admin-orders__list-heading">
            <div className="admin-orders__list-actions">
              <Button onClick={() => exportXlsx(visibleOrders)} variant="outline">
                <Download className="h-4 w-4" /> تصدير
              </Button>
              <Button
                onClick={() =>
                  toast.info(
                    "إنشاء الطلب يبدأ من سلة المتجر لضمان تسجيل الأصناف وعنوان العميل بشكل صحيح.",
                  )
                }
                className="hero-gradient text-primary-foreground"
              >
                <ShoppingBag className="h-4 w-4" /> طلب جديد
              </Button>
            </div>
          </div>
        )}
        {activeOrderTab === "list" && (
          <>
            <TabsList className="admin-orders__status-tabs">
              <TabsTrigger value="all">
                الكل <span>{orders.length}</span>
              </TabsTrigger>
              {STATUSES.map((s) => (
                <TabsTrigger key={s.key} value={s.key}>
                  {
                    (
                      {
                        pending: "جديد",
                        confirmed: "قيد التجهيز",
                        ready_for_delivery: "جاهز للتوصيل",
                        shipped: "في الطريق",
                        delivered: "تم التسليم",
                        cancelled: "ملغي",
                      } as Record<string, string>
                    )[s.key]
                  }{" "}
                  <span>{grouped[s.key]?.length ?? 0}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="admin-orders__filters">
              <button
                type="button"
                className="admin-orders__clear-filters"
                onClick={() => {
                  setSearchQuery("");
                  setDateFilter("all");
                  setPaymentFilter("all");
                  setDriverFilter("all");
                }}
              >
                مسح الفلاتر
              </button>
              <select
                aria-label="تصفية حسب الموصل"
                value={driverFilter}
                onChange={(e) => setDriverFilter(e.target.value)}
              >
                <option value="all">كل الموصلين</option>
                <option value="unassigned">بدون موصل</option>
                {Array.from(new Set(orders.map((o) => o.driver_name).filter(Boolean))).map(
                  (name) => (
                    <option key={name} value={name!}>
                      {name}
                    </option>
                  ),
                )}
              </select>
              <select
                aria-label="تصفية حسب طريقة الدفع"
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
              >
                <option value="all">طريقة الدفع</option>
                <option value="cod">الدفع عند الاستلام</option>
                <option value="instapay">إنستا باي</option>
                <option value="bank">تحويل بنكي</option>
              </select>
              <select
                aria-label="تصفية حسب التاريخ"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              >
                <option value="all">كل التواريخ</option>
                <option value="today">اليوم</option>
                <option value="7days">آخر ٧ أيام</option>
              </select>
              <div className="admin-orders__search">
                <Search className="h-4 w-4" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث برقم الطلب أو اسم العميل أو رقم الموبايل"
                  className="h-10 rounded-xl bg-background text-sm font-bold"
                />
              </div>
            </div>

            {/* Tabs list */}
            {["all", ...STATUSES.map((s) => s.key)].map((statusKey) => {
              const s = STATUSES.find((item) => item.key === statusKey) ?? {
                key: "all",
                label: "الكل",
                next: null,
                color: "",
              };
              return (
                <TabsContent key={statusKey} value={statusKey}>
                  {loading ? (
                    <OrderSkeletonList />
                  ) : (
                    <motion.div
                      variants={{
                        hidden: { opacity: 0 },
                        show: { opacity: 1, transition: { staggerChildren: 0.06 } },
                      }}
                      initial="hidden"
                      animate="show"
                      className="space-y-3"
                    >
                      <div className="admin-orders-table-wrap hidden md:block">
                        <table className="admin-orders-table">
                          <thead>
                            <tr>
                              <th>□</th>
                              <th>رقم الطلب</th>
                              <th>العميل</th>
                              <th>الحالة</th>
                              <th>الدفع</th>
                              <th>المنطقة</th>
                              <th>موعد التوصيل</th>
                              <th>الموصل</th>
                              <th>الإجمالي</th>
                              <th>الوقت</th>
                              <th>الإجراءات</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pagedOrders
                              .filter(
                                (order) =>
                                  statusKey === "all" ||
                                  canonicalStatus(order.status) === statusKey,
                              )
                              .map((order) => (
                                <tr key={order.id}>
                                  <td>□</td>
                                  <td>
                                    <bdi className="admin-orders-table__id">
                                      #{order.id.slice(0, 8)}
                                    </bdi>
                                  </td>
                                  <td>
                                    <strong>{order.customer_name || "عميل"}</strong>
                                    <small>{order.phone}</small>
                                  </td>
                                  <td>
                                    <span
                                      className={`admin-orders__status-pill status-${canonicalStatus(order.status)}`}
                                    >
                                      {statusLabel(order.status)}
                                    </span>
                                  </td>
                                  <td>
                                    {PAYMENT_LABELS[order.payment_method || "cod"] ||
                                      order.payment_method}
                                  </td>
                                  <td>{order.address || "—"}</td>
                                  <td>{deliverySlotFromNotes(order.notes) || "أقرب وقت"}</td>
                                  <td>{order.driver_name || "بدون موصل"}</td>
                                  <td className="admin-orders-table__total">
                                    {Number(order.total_amount || 0).toFixed(2)} ج.م
                                  </td>
                                  <td>
                                    {new Date(order.created_at).toLocaleTimeString("ar-EG", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                    <small>
                                      {new Date(order.created_at).toLocaleDateString("ar-EG")}
                                    </small>
                                  </td>
                                  <td>
                                    <div className="admin-orders-table__actions">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setPreview(order);
                                          setActiveOrderTab("details");
                                        }}
                                        title="تفاصيل الطلب"
                                      >
                                        <Eye className="h-4 w-4" />
                                        تفاصيل الطلب
                                      </Button>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => printReceipt(order)}
                                        title="طباعة"
                                      >
                                        <Printer className="h-4 w-4" />
                                      </Button>
                                      {canonicalStatus(order.status) === "confirmed" && (
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          onClick={() => handleStartDelivery(order)}
                                          title="إسناد موصل"
                                        >
                                          <Truck className="h-4 w-4" />
                                        </Button>
                                      )}
                                      {canonicalStatus(order.status) === "shipped" && (
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          onClick={() => setTrackingOrder(order)}
                                          title="تتبع التوصيل"
                                        >
                                          <Navigation className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            {visibleOrders.length === 0 && (
                              <tr className="admin-orders-table__empty">
                                <td colSpan={10}>
                                  <ShoppingBag size={20} />
                                  <b>لا توجد طلبات مسجلة حتى الآن</b>
                                  <span>ستظهر الطلبات هنا فور تسجيل أول طلب في المتجر.</span>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      <div className="grid gap-3 md:hidden">
                        {pagedOrders
                          .filter(
                            (order) =>
                              statusKey === "all" || canonicalStatus(order.status) === statusKey,
                          )
                          .map((order) => (
                            <article
                              key={order.id}
                              className="rounded-2xl border bg-card p-4 shadow-sm"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <bdi className="text-base font-black">
                                    #{order.id.slice(0, 8)}
                                  </bdi>
                                  <p className="mt-1 text-sm font-bold">
                                    {order.customer_name || "عميل"}
                                  </p>
                                  <p className="text-[13px] text-muted-foreground">
                                    {new Date(order.created_at).toLocaleString("ar-EG")}
                                  </p>
                                </div>
                                <span
                                  className={`admin-orders__status-pill status-${canonicalStatus(order.status)}`}
                                >
                                  {statusLabel(order.status)}
                                </span>
                              </div>
                              <div className="mt-3 flex items-center justify-between border-y py-3">
                                <span className="text-sm font-bold text-muted-foreground">
                                  الإجمالي
                                </span>
                                <strong className="text-base">
                                  {Number(order.total_amount || 0).toFixed(2)} ج.م
                                </strong>
                              </div>
                              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                                <Button
                                  variant="outline"
                                  className="h-11 text-sm font-bold"
                                  onClick={() => {
                                    setPreview(order);
                                    setActiveOrderTab("details");
                                  }}
                                >
                                  <Eye className="h-4 w-4" /> تفاصيل
                                </Button>
                                <Button
                                  variant="outline"
                                  className="h-11 text-sm font-bold"
                                  disabled={!order.phone}
                                  asChild
                                >
                                  <a href={order.phone ? `tel:${order.phone}` : undefined}>
                                    <Phone className="h-4 w-4" /> اتصال
                                  </a>
                                </Button>
                                <Button
                                  variant="outline"
                                  className="h-11 text-sm font-bold"
                                  disabled={!order.phone}
                                  asChild
                                >
                                  <a
                                    href={
                                      order.phone
                                        ? `https://wa.me/${order.phone.replace(/\D/g, "")}`
                                        : undefined
                                    }
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    <MessageCircle className="h-4 w-4" /> واتساب
                                  </a>
                                </Button>
                                <Button
                                  variant="outline"
                                  className="h-11 text-sm font-bold"
                                  disabled={canonicalStatus(order.status) !== "confirmed"}
                                  onClick={() => handleStartDelivery(order)}
                                >
                                  <Truck className="h-4 w-4" /> إسناد
                                </Button>
                                <Button
                                  variant="outline"
                                  className="h-11 text-sm font-bold"
                                  onClick={() => printReceipt(order)}
                                >
                                  <Printer className="h-4 w-4" /> طباعة
                                </Button>
                              </div>
                            </article>
                          ))}
                      </div>
                      <div className="admin-orders__pagination">
                        <span>
                          عرض {visibleOrders.length ? (page - 1) * pageSize + 1 : 0}–
                          {Math.min(page * pageSize, visibleOrders.length)} من{" "}
                          {visibleOrders.length} طلب
                        </span>
                        <div>
                          <Button
                            variant="outline"
                            disabled={page <= 1}
                            onClick={() => setPage((current) => Math.max(1, current - 1))}
                          >
                            السابق
                          </Button>
                          <b>
                            {page} / {pageCount}
                          </b>
                          <Button
                            variant="outline"
                            disabled={page >= pageCount}
                            onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                          >
                            التالي
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </TabsContent>
              );
            })}
          </>
        )}
      </Tabs>

      {activeOrderTab === "details" && (
        <OrderDetailsTab
          order={preview}
          customerSummary={customerSummary}
          onBack={() => setActiveOrderTab("list")}
          onPrint={() => preview && printReceipt(preview)}
          onCancel={() => preview && setStatus(preview.id, "cancelled")}
          onStartDelivery={() => preview && handleStartDelivery(preview)}
        />
      )}
      {/* Modal 2: Assign Driver Modal */}
      <Dialog open={!!assigningOrder} onOpenChange={(o) => !o && setAssigningOrder(null)}>
        <DialogContent
          dir="rtl"
          className="max-w-md rounded-3xl p-6 bg-card border-border shadow-2xl"
        >
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-black flex items-center gap-2">
              <Truck className="h-5 w-5 text-emerald-500" />
              <span>إسناد موصل الطلب #{assigningOrder?.id.slice(0, 8)}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-4 text-center">
              <p className="text-sm font-black text-amber-800">لا يوجد سائقون متاحون</p>
              <p className="mt-1 text-[13px] leading-relaxed text-amber-700">
                ستظهر قائمة السائقين بعد إنشاء مصدر السائقين وربط الإسناد بقاعدة البيانات.
              </p>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              variant="ghost"
              onClick={() => setAssigningOrder(null)}
              className="rounded-xl text-sm font-bold"
            >
              إلغاء
            </Button>
            <Button
              onClick={confirmDeliveryAssignment}
              disabled
              className="rounded-xl bg-emerald-500 px-5 text-sm font-black text-white hover:bg-emerald-600"
            >
              تأكيد وإرسال الموصل 🚚
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 3: Live tracking availability */}
      {trackingOrder && (
        <TrackingUnavailableModal order={trackingOrder} onClose={() => setTrackingOrder(null)} />
      )}
    </motion.div>
  );
}

function OrderDetailsTab({
  order,
  customerSummary,
  onBack,
  onPrint,
  onCancel,
  onStartDelivery,
}: {
  order: Order | null;
  customerSummary: CustomerSummary | null;
  onBack: () => void;
  onPrint: () => void;
  onCancel: () => void;
  onStartDelivery: () => void;
}) {
  const currentStatusLabel = order ? statusLabel(order.status) : "جديد";
  const steps = ["جديد", "قيد التجهيز", "جاهز للتوصيل", "في الطريق", "تم التسليم"];
  const statusIndex = !order
    ? -1
    : canonicalStatus(order.status) === "pending"
      ? 0
      : canonicalStatus(order.status) === "confirmed"
        ? 1
        : canonicalStatus(order.status) === "ready_for_delivery"
          ? 2
          : canonicalStatus(order.status) === "shipped"
            ? 3
            : canonicalStatus(order.status) === "delivered"
              ? 4
              : -1;
  const itemSubtotal =
    order?.items?.reduce((sum, item) => sum + Number(item.subtotal || 0), 0) ?? 0;
  const deliveryFee = Number(order?.delivery_fee ?? 0);
  const discount = Math.max(0, itemSubtotal + deliveryFee - Number(order?.total_amount ?? 0));
  const paymentLabel = PAYMENT_LABELS[order?.payment_method || "cod"] || "الدفع عند الاستلام";

  return (
    <section className="admin-order-details-page" dir="rtl">
      <div className="admin-order-details-page__heading">
        <div>
          <button type="button" onClick={onBack}>
            ‹ الطلبات
          </button>
          <h2>تفاصيل الطلب {order ? `#${order.id.slice(0, 8)}` : ""}</h2>
        </div>
        <span className="admin-orders__status-pill">{currentStatusLabel}</span>
      </div>
      <div className="admin-order-details-layout">
        <aside className="admin-order-details-sidebar">
          <section>
            <h3>العميل</h3>
            <b>{order?.customer_name || "بيانات العميل تظهر هنا"}</b>
            <small>{order?.phone || "رقم الهاتف يظهر هنا"}</small>
            <div className="admin-order-detail-pair">
              <span>عدد الطلبات</span>
              <strong>{customerSummary?.orderCount ?? "—"}</strong>
            </div>
            <div className="admin-order-detail-pair">
              <span>إجمالي الإنفاق</span>
              <strong>
                {customerSummary ? `${customerSummary.totalSpend.toFixed(2)} ج.م` : "— ج.م"}
              </strong>
            </div>
            <div className="admin-order-detail-pair">
              <span>آخر طلب</span>
              <strong>
                {customerSummary?.lastOrderAt
                  ? new Date(customerSummary.lastOrderAt).toLocaleDateString("ar-EG")
                  : "—"}
              </strong>
            </div>
            <div className="admin-order-detail-pair">
              <span>مستوى الولاء</span>
              <strong>{customerSummary?.loyaltyTier ?? "—"}</strong>
            </div>
            <div className="admin-order-detail-actions">
              <a href={order?.phone ? `tel:${order.phone}` : undefined}>اتصال</a>
              <a
                href={order?.phone ? `https://wa.me/${order.phone.replace(/\D/g, "")}` : undefined}
                target="_blank"
                rel="noreferrer"
              >
                واتساب
              </a>
              {order?.phone && (
                <a href={`/admin/customers?phone=${encodeURIComponent(order.phone)}`}>ملف العميل</a>
              )}
            </div>
          </section>
          <section>
            <h3>التوصيل</h3>
            <small>العنوان</small>
            <b>{order?.address || "عنوان العميل يظهر هنا"}</b>
            <small>المنطقة</small>
            <b>{order?.address ? "منطقة التوصيل" : "—"}</b>
            <small>وقت التوصيل المتوقع</small>
            <b>—</b>
            <hr />
            <small>المندوب</small>
            <b>{order?.driver_name || "لم يتم تعيين مندوب"}</b>
            {order && canonicalStatus(order.status) === "confirmed" && (
              <Button className="w-full mt-3" variant="outline" onClick={onStartDelivery}>
                تغيير المندوب
              </Button>
            )}
          </section>
          <section>
            <h3>الدفع</h3>
            <div className="admin-order-detail-pair">
              <span>طريقة الدفع</span>
              <strong>{order ? paymentLabel : "الدفع عند الاستلام"}</strong>
            </div>
            <div className="admin-order-detail-pair">
              <span>حالة التحصيل</span>
              <strong>{order ? "بانتظار التأكيد" : "غير مدفوع"}</strong>
            </div>
            <div className="admin-order-detail-pair">
              <span>المبلغ المطلوب</span>
              <strong>{order ? `${Number(order.total_amount).toFixed(2)} ج.م` : "— ج.م"}</strong>
            </div>
            <Button className="w-full mt-3" disabled>
              تأكيد التحصيل
            </Button>
          </section>
        </aside>
        <div className="admin-order-details-main">
          <section className="admin-order-detail-summary">
            <div>
              <bdi>#{order?.id.slice(0, 8) ?? "—"}</bdi>
              <span
                className={`admin-orders__status-pill ${
                  order ? `status-${canonicalStatus(order.status)}` : ""
                }`}
              >
                {currentStatusLabel}
              </span>
              <small>
                وقت الإنشاء:{" "}
                {order?.created_at ? new Date(order.created_at).toLocaleString("ar-EG") : "—"} ·
                طريقة الدفع: {paymentLabel}
              </small>
            </div>
            <div className="admin-order-detail-actions">
              {order && canonicalStatus(order.status) === "confirmed" && (
                <Button onClick={onStartDelivery}>جاهز للتوصيل</Button>
              )}
              <Button variant="outline" onClick={onPrint} disabled={!order}>
                <Printer size={15} /> طباعة
              </Button>
              <Button
                variant="outline"
                onClick={onCancel}
                disabled={
                  !order || ["cancelled", "delivered"].includes(canonicalStatus(order.status))
                }
              >
                إلغاء الطلب
              </Button>
            </div>
          </section>
          <section
            className={`admin-order-progress ${canonicalStatus(order?.status) === "cancelled" ? "is-cancelled" : ""}`}
          >
            <div className="admin-order-progress__heading">
              <b>مسار الطلب</b>
            </div>
            <ol>
              {steps.map((label, index) => {
                const done = statusIndex >= index;
                return (
                  <li className={done ? "is-done" : ""} key={label}>
                    <i>{done ? "✓" : index + 1}</i>
                    <span>{label}</span>
                    <small>
                      {index === 0 && order
                        ? new Date(order.created_at).toLocaleTimeString("ar-EG", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </small>
                  </li>
                );
              })}
            </ol>
          </section>
          <section className="admin-orders__template-items admin-order-detail-products">
            <div>
              <b>المنتجات</b>
              <span>
                {order
                  ? `${order.items?.length ?? 0} من ${order.items?.length ?? 0} منتج`
                  : "— من — منتج"}
              </span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>المنتج</th>
                  <th>السعر</th>
                  <th>الكمية</th>
                  <th>الإجمالي</th>
                  <th>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {order?.items?.length ? (
                  order.items.map((item, index) => (
                    <tr key={`${item.name}-${index}`}>
                      <td>{item.name}</td>
                      <td>
                        {Number(
                          item.price_per_unit ?? item.subtotal / Math.max(1, item.quantity),
                        ).toFixed(2)}{" "}
                        ج.م
                      </td>
                      <td>
                        {item.quantity} {item.unit_label || "قطعة"}
                      </td>
                      <td>{Number(item.subtotal).toFixed(2)} ج.م</td>
                      <td>—</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5}>
                      {order
                        ? "لا توجد أصناف مسجلة لهذا الطلب."
                        : "ستظهر أصناف الطلب هنا بعد اختيار طلب مسجل."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <footer>
              <b>المجموع الفرعي</b>
              <strong>{order ? `${itemSubtotal.toFixed(2)} ج.م` : "— ج.م"}</strong>
            </footer>
            <footer>
              <b>رسوم التوصيل</b>
              <strong>{order ? `${deliveryFee.toFixed(2)} ج.م` : "— ج.م"}</strong>
            </footer>
            <footer>
              <b>الخصم</b>
              <strong>{order ? `${discount.toFixed(2)} ج.م` : "— ج.م"}</strong>
            </footer>
            <footer>
              <b>الإجمالي النهائي</b>
              <strong>{order ? `${Number(order.total_amount).toFixed(2)} ج.م` : "— ج.م"}</strong>
            </footer>
          </section>
          <section className="admin-order-detail-notes">
            <h3>الملاحظات</h3>
            <b>ملاحظات العميل</b>
            <p>{order?.notes || "لا توجد ملاحظات من العميل."}</p>
            <b>ملاحظات الإدارة</b>
            <textarea placeholder="أضف ملاحظة داخلية للفريق..." disabled />
            <Button variant="outline" disabled>
              حفظ
            </Button>
          </section>
          <section className="admin-order-detail-activity">
            <h3>سجل النشاط</h3>
            {order ? (
              <ol>
                <li>
                  <i />
                  <span>تم إنشاء الطلب</span>
                  <small>{new Date(order.created_at).toLocaleString("ar-EG")}</small>
                </li>
              </ol>
            ) : (
              <p>سيظهر سجل تغييرات حالة الطلب هنا بعد تسجيل الطلب.</p>
            )}
          </section>
          {!order && (
            <p className="admin-orders__template-note">
              اختر «التفاصيل» من أي صف في قائمة الطلبات لعرض بياناته هنا. لا توجد طلبات حقيقية في
              قاعدة البيانات حاليًا.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
function TrackingUnavailableModal({ order, onClose }: { order: Order; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        dir="rtl"
        className="max-w-md rounded-3xl border-border bg-card p-6 shadow-2xl"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-black">
            <Truck className="h-5 w-5 text-amber-500" />
            تتبع الطلب #{order.id.slice(0, 8)}
          </DialogTitle>
        </DialogHeader>
        <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-5 text-center">
          <p className="text-base font-black text-amber-900">
            ميزة التتبع الحي ستُفعّل بعد ربط تطبيق السائق
          </p>
          <p className="mt-2 text-sm leading-6 text-amber-800">
            لا توجد حالياً بيانات موقع موثوقة لهذا الطلب، لذلك لن يتم عرض خريطة أو موقع تقديري.
          </p>
        </div>
        <DialogFooter>
          <Button onClick={onClose} className="rounded-xl text-sm font-bold">
            إغلاق
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OrderSkeletonList() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-32 w-full rounded-3xl" />
      ))}
    </div>
  );
}
