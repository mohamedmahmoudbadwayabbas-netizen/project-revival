import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef, useTransition, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchOrdersWithItems } from "@/services/orderDataService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Navigation,
  Phone,
  MapPin,
  CheckCircle2,
  Play,
  Pause,
  Truck,
  ShieldCheck,
  Clock,
  RefreshCw,
  AlertCircle,
  User,
  Radio,
  Store,
  Home,
  MessageSquare,
  LifeBuoy,
  Layers,
  Banknote,
  CreditCard,
  Wifi,
  WifiOff,
  PackageCheck,
  ChevronDown,
  ChevronUp,
  Compass,
  Sparkles,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Skeleton } from "@/components/ui/universal-skeleton";
import { DualStageLiveMap, DeliveryStage } from "@/components/driver/DualStageLiveMap";
import {
  ProofOfDeliveryModal,
  ProofOfDeliveryData,
} from "@/components/driver/ProofOfDeliveryModal";
import { DriverChatSupportModal } from "@/components/driver/DriverChatSupportModal";

export type OrderDeliveryStep =
  "assigned" | "at_store" | "picked_up" | "on_the_way" | "arrived" | "delivered";

export interface DriverOrderItem {
  name: string;
  quantity: number;
  price?: number;
  unit_label?: string;
}

export interface DriverOrder {
  id: string;
  customer_name: string;
  phone: string;
  address: string;
  total_amount: number;
  status: string;
  created_at: string;
  notes?: string | null;
  items?: DriverOrderItem[];
  payment_method?: string;
  payment_status?: string;
  delivery_lat?: number;
  delivery_lng?: number;
  delivery_step?: OrderDeliveryStep;
  pod?: ProofOfDeliveryData | null;
}

export const Route = createFileRoute("/driver")({
  head: () => ({
    meta: [
      { title: "بوابة كابتن التوصيل الذكية — سمارت ستور" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
      },
    ],
  }),
  component: DriverPortalPage,
});

export function DriverPortalPage() {
  const [driverName, setDriverName] = useState("الكابتن أحمد علي");
  const [driverPhone, setDriverPhone] = useState("01012345678");
  const [isOnline, setIsOnline] = useState(true);
  const [orders, setOrders] = useState<DriverOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [networkOnline, setNetworkOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  // Active Selected Order for Live Tracking
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [activeStage, setActiveStage] = useState<DeliveryStage>("to_store");

  // Live GPS Tracking Coordinates
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>({
    lat: 30.0444,
    lng: 31.2357,
  });
  const [isGpsActive, setIsGpsActive] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<any>(null);

  // Modals state
  const [podModalOpen, setPodModalOpen] = useState(false);
  const [selectedOrderForPod, setSelectedOrderForPod] = useState<DriverOrder | null>(null);

  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [selectedOrderForChat, setSelectedOrderForChat] = useState<DriverOrder | null>(null);

  // Store information
  const storeInfo = {
    name: "المركز اللوجستي — سمارت ستور",
    address: "القاهرة، وسط البلد، شارع قصر النيل",
    lat: 30.0444,
    lng: 31.2357,
    phone: "01099998888",
  };

  // Fetch assigned orders
  const fetchAssignedOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchOrdersWithItems({
        statuses: ["shipped", "confirmed", "pending"],
      });
      const parsedOrders = data.map((o) => ({
        ...o,
        customer_name: o.customer_name ?? "عميل",
        phone: o.phone ?? "",
        address: o.address ?? "",
        payment_method: o.payment_method ?? undefined,
        items: o.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          unit_label: item.unit_label,
        })),
        delivery_step: (
          o.status === "shipped"
            ? "on_the_way"
            : o.status === "delivered"
              ? "delivered"
              : "assigned"
        ) as OrderDeliveryStep,
      }));

      setOrders(parsedOrders);
      if (parsedOrders.length > 0 && !activeOrderId) {
        setActiveOrderId(parsedOrders[0].id);
        setExpandedOrderId(parsedOrders[0].id);
      }
    } catch (err: any) {
      toast.error(`تعذر جلب قائمة التوصيلات: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [activeOrderId]);

  // Offline Sync Queue Handler
  const syncOfflineQueue = useCallback(async () => {
    try {
      const queueRaw = localStorage.getItem("driver_offline_queue");
      if (!queueRaw) return;
      const queue: Array<{ orderId: string; status: string; pod?: any; timestamp: string }> =
        JSON.parse(queueRaw);
      if (!queue.length) return;

      toast.info(`جاري مزامنة ${queue.length} تحديثات توصيل تمت دون اتصال...`);

      for (const item of queue) {
        await supabase
          .from("orders")
          .update({
            status: item.status,
            notes: item.pod
              ? `[إثبات تسليم POD]: المستلم: ${item.pod.receiverName || "العميل"} (${item.timestamp})`
              : undefined,
          })
          .eq("id", item.orderId);
      }

      localStorage.removeItem("driver_offline_queue");
      toast.success("✅ تمت مزامنة جميع عمليات التوصيل مع الخادم بنجاح!");
      fetchAssignedOrders();
    } catch (err: any) {
      console.warn("Offline queue sync error:", err);
    }
  }, [fetchAssignedOrders]);

  // Online / Offline listener
  useEffect(() => {
    const handleOnline = () => {
      setNetworkOnline(true);
      toast.success("عادت شبكة الإنترنت! جاري المزامنة التلقائية 🌐");
      syncOfflineQueue();
    };
    const handleOffline = () => {
      setNetworkOnline(false);
      toast.warning(
        "أنت تعمل الآن في وضع عدم الاتصال (Offline). سيتم حفظ العمليات محلياً ومزامنتها فور عودة الشبكة 📡",
      );
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncOfflineQueue]);

  useEffect(() => {
    fetchAssignedOrders();

    // Supabase Realtime subscription
    const channel = supabase
      .channel("driver-portal-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        fetchAssignedOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      stopGpsTracking();
    };
  }, [fetchAssignedOrders]);

  // Live GPS Tracking management
  const startGpsTracking = () => {
    setIsGpsActive(true);
    toast.success("🚀 تم تفعيل الـ GPS والتتبع المباشر لحساب السحابي");

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCurrentCoords({
            lat: Number(pos.coords.latitude.toFixed(6)),
            lng: Number(pos.coords.longitude.toFixed(6)),
          });
        },
        () => {},
      );

      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          setCurrentCoords({
            lat: Number(pos.coords.latitude.toFixed(6)),
            lng: Number(pos.coords.longitude.toFixed(6)),
          });
        },
        (err) => console.warn("GPS watch position warning:", err),
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
      );
    }

    // Interval to broadcast coordinates to active order
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(async () => {
      if (!activeOrderId) return;
      try {
        if (navigator.onLine) {
          await supabase
            .from("orders")
            .update({
              notes: `كابتن التوصيل: ${driverName} [GPS: ${currentCoords.lat.toFixed(4)}, ${currentCoords.lng.toFixed(4)}]`,
            })
            .eq("id", activeOrderId);
        }
      } catch (_) {}
    }, 8000);
  };

  const stopGpsTracking = () => {
    setIsGpsActive(false);
    if (watchIdRef.current !== null && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Stepwise State Progression
  const handleUpdateStep = async (order: DriverOrder, nextStep: OrderDeliveryStep) => {
    const nextStatus =
      nextStep === "on_the_way" || nextStep === "arrived"
        ? "shipped"
        : nextStep === "delivered"
          ? "delivered"
          : "confirmed";

    // Update local state instantly for optimal UX
    setOrders((prev) =>
      prev.map((o) =>
        o.id === order.id ? { ...o, delivery_step: nextStep, status: nextStatus } : o,
      ),
    );

    if (nextStep === "picked_up" || nextStep === "on_the_way") {
      setActiveStage("to_customer");
    } else if (nextStep === "assigned" || nextStep === "at_store") {
      setActiveStage("to_store");
    }

    if (!navigator.onLine) {
      // Save offline
      const queueRaw = localStorage.getItem("driver_offline_queue");
      const queue = queueRaw ? JSON.parse(queueRaw) : [];
      queue.push({
        orderId: order.id,
        status: nextStatus,
        step: nextStep,
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem("driver_offline_queue", JSON.stringify(queue));
      toast.warning("تم حفظ تحديث المرحلة محلياً في وضع عدم الاتصال (Offline) 📦");
      return;
    }

    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: nextStatus })
        .eq("id", order.id);

      if (error) throw error;

      if (nextStep === "picked_up") {
        toast.success("📦 تم تأكيد استلام الطرود من المتجر! جاري التوجه للعميل 🛵");
      } else if (nextStep === "arrived") {
        toast.info("📍 تم تسجيل وصولك أمام موقع العميل! يرجى الاتصال به للاستلام.");
      } else {
        toast.success("تم تحديث حالة الطلب بنجاح");
      }
    } catch (err: any) {
      toast.error(`تعذر تحديث الحالة: ${err.message}`);
    }
  };

  // Handle Proof of Delivery Confirmation
  const handleConfirmPod = async (podData: ProofOfDeliveryData) => {
    if (!selectedOrderForPod) return;
    const orderId = selectedOrderForPod.id;

    if (!navigator.onLine) {
      // Save offline POD
      const queueRaw = localStorage.getItem("driver_offline_queue");
      const queue = queueRaw ? JSON.parse(queueRaw) : [];
      queue.push({
        orderId,
        status: "delivered",
        pod: podData,
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem("driver_offline_queue", JSON.stringify(queue));

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, status: "delivered", delivery_step: "delivered", pod: podData }
            : o,
        ),
      );
      toast.warning(
        "تم حفظ إثبات التسليم والتوقيع محلياً (Offline) وسيتم الرفع فور استعادة الشبكة ✍️",
      );
      return;
    }

    try {
      const { error } = await supabase
        .from("orders")
        .update({
          status: "delivered",
          notes: `[إثبات تسليم POD]: المستلم: ${podData.receiverName} | الوقت: ${new Date().toLocaleTimeString("ar-EG")} | كابتن: ${driverName}`,
        })
        .eq("id", orderId);

      if (error) throw error;

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, status: "delivered", delivery_step: "delivered", pod: podData }
            : o,
        ),
      );
      toast.success("✅ تم توثيق إثبات التسليم وإكمال الطلب بنجاح!");
      fetchAssignedOrders();
    } catch (err: any) {
      toast.error(`تعذر توثيق التسليم: ${err.message}`);
    }
  };

  const activeOrder = orders.find((o) => o.id === activeOrderId) || orders[0];

  // Stats calculation
  const totalOrdersCount = orders.length;
  const cashOrders = orders.filter((o) => o.payment_method === "cod" || !o.payment_method);
  const totalCashToCollect = cashOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

  return (
    <div
      className="min-h-screen bg-background text-foreground p-3.5 sm:p-5 max-w-xl mx-auto space-y-4 pb-28"
      dir="rtl"
    >
      {/* شبكة الاتصال وتنبيه وضع الأوفلاين */}
      {!networkOnline && (
        <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-900 dark:text-rose-200 text-xs font-bold flex items-center justify-between shadow-sm animate-pulse">
          <div className="flex items-center gap-2">
            <WifiOff className="h-4 w-4 text-rose-600" />
            <span>وضع عدم الاتصال بالإنترنت (Offline Caching Active)</span>
          </div>
          <span className="text-[10px] bg-rose-500 text-white px-2 py-0.5 rounded-full font-black">
            محفوظ محلياً
          </span>
        </div>
      )}

      {/* الرأس الرئيسي ومفتاح الجاهزية للعمل (Online / Offline) */}
      <div className="flex items-center justify-between bg-card border border-border/80 p-4 rounded-3xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl font-black shadow-2xs">
            🛵
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-black text-base">{driverName}</h1>
              <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded-md font-bold">
                كابتن معتمد
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-bold flex items-center gap-1.5 mt-0.5">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isOnline ? "bg-emerald-500 animate-ping" : "bg-muted-foreground"
                }`}
              />
              <span
                className={isOnline ? "text-emerald-600 dark:text-emerald-400 font-extrabold" : ""}
              >
                {isOnline ? "متصل وجاهز للعمل (Online)" : "غير متاح حالياً (Offline)"}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex flex-col items-center">
            <Switch
              checked={isOnline}
              onCheckedChange={(val) => {
                setIsOnline(val);
                if (val) {
                  startGpsTracking();
                  toast.success("أنت الآن متصل ومتاح لاستقبال طلبات التوصيل 🟢");
                } else {
                  stopGpsTracking();
                  toast.info("تم تحويل حالتك إلى غير متاح ⚪");
                }
              }}
            />
            <span className="text-[9px] font-bold text-muted-foreground mt-1">
              {isOnline ? "متاح" : "استراحة"}
            </span>
          </div>

          <Button
            size="icon"
            variant="outline"
            onClick={fetchAssignedOrders}
            className="rounded-2xl h-10 w-10 border-border"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* ملخص رحلات الكابتن والتحصيل النقدي */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
            <Truck className="h-3.5 w-3.5 text-primary" />
            <span>الطلبات النشطة</span>
          </div>
          <div className="text-lg font-black font-display text-foreground">
            {totalOrdersCount} <span className="text-xs font-normal">رحلة</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-black text-amber-900 dark:text-amber-300">
            <Banknote className="h-3.5 w-3.5 text-amber-600" />
            <span>نقدية للتحصيل</span>
          </div>
          <div className="text-lg font-black font-display text-amber-600 dark:text-amber-400">
            {totalCashToCollect.toFixed(2)} <span className="text-xs font-normal">ج.م</span>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-black text-emerald-900 dark:text-emerald-300">
            <Radio className="h-3.5 w-3.5 text-emerald-600" />
            <span>بث الـ GPS الحي</span>
          </div>
          <div className="text-xs font-black text-emerald-700 dark:text-emerald-400 truncate">
            {isGpsActive ? "يعمل بالدقة العالية 📡" : "متوقف (انقر لتشغيل)"}
          </div>
        </div>
      </div>

      {/* الخريطة والتوجيه ثنائي المراحل للطلب النشط */}
      {activeOrder && (
        <DualStageLiveMap
          orderId={activeOrder.id}
          currentDriverCoords={currentCoords}
          storeCoords={storeInfo}
          customerCoords={{
            lat: activeOrder.delivery_lat || 30.0626,
            lng: activeOrder.delivery_lng || 31.2497,
            name: activeOrder.customer_name,
            address: activeOrder.address,
          }}
          initialStage={activeStage}
          onStageChange={(st) => setActiveStage(st)}
        />
      )}

      {/* قائمة وتفاصيل طلبات التوصيل المسندة للكابتن */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-black text-sm flex items-center gap-2 text-foreground">
            <Layers className="h-4 w-4 text-primary" />
            <span>جدول رحلات التوصيل المسندة إليك ({orders.length})</span>
          </h2>
          <span className="text-[11px] font-bold text-muted-foreground">
            اضغط على الطلب لعرض المسار
          </span>
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-44 w-full rounded-3xl" />
            <Skeleton className="h-44 w-full rounded-3xl" />
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-border p-8 text-center space-y-2 bg-card/40">
            <div className="mx-auto h-12 w-12 rounded-full bg-secondary flex items-center justify-center text-xl">
              🎉
            </div>
            <h3 className="font-display text-sm font-bold text-foreground">
              لا توجد رحلات معلقة حالياً
            </h3>
            <p className="text-xs text-muted-foreground">
              لقد أنجزت جميع التوصيلات بنجاح! سيصلك تنبيه فور إسناد أي طلب جديد.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => {
              const isSelected = activeOrderId === o.id;
              const isExpanded = expandedOrderId === o.id;
              const isCash = o.payment_method === "cod" || !o.payment_method;
              const currentStep = o.delivery_step || "assigned";

              return (
                <div
                  key={o.id}
                  className={`rounded-3xl border transition-all bg-card overflow-hidden shadow-xs ${
                    isSelected
                      ? "border-emerald-500 ring-2 ring-emerald-500/20 shadow-md"
                      : "border-border hover:border-border/90"
                  }`}
                >
                  {/* شريط البطاقة العلوي */}
                  <div
                    onClick={() => {
                      setActiveOrderId(o.id);
                      setExpandedOrderId(isExpanded ? null : o.id);
                    }}
                    className="p-4 cursor-pointer hover:bg-secondary/20 transition-colors flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl font-black text-lg ${
                          isSelected
                            ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                            : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {isCash ? "💵" : "💳"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-lg">
                            #{o.id.slice(0, 8)}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-semibold">
                            {new Date(o.created_at).toLocaleTimeString("ar-EG", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <h3 className="font-display text-base font-black text-foreground mt-1">
                          {o.customer_name}
                        </h3>
                        <div className="text-xs text-muted-foreground font-bold flex items-center gap-1.5 mt-0.5">
                          <MapPin className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          <span className="line-clamp-1">{o.address}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-end shrink-0">
                      <span className="font-display text-base font-black text-emerald-600 dark:text-emerald-400 block">
                        {Number(o.total_amount).toFixed(2)} ج.م
                      </span>
                      <Badge
                        variant="outline"
                        className={`mt-1 text-[10px] font-extrabold border-0 rounded-full px-2 py-0.5 ${
                          isCash
                            ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                            : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        }`}
                      >
                        {isCash ? "تحصيل نقدي عند الاستلام" : "مدفوع مسبقاً إلكترونياً"}
                      </Badge>
                    </div>
                  </div>

                  {/* التفاصيل المنسدلة والخطوات التدرجية للطلب */}
                  <div className="px-4 pb-4 space-y-4 border-t border-border/50 pt-3">
                    {/* شريط التقدم التدرجي للطلب (Order Delivery Stepper) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                        <span>مرحلة التوصيل الحالية:</span>
                        <span className="font-black text-emerald-600 dark:text-emerald-400">
                          {currentStep === "assigned"
                            ? "تم إسناد الطلب إليك"
                            : currentStep === "at_store"
                              ? "وصلت المتجر"
                              : currentStep === "picked_up"
                                ? "تم استلام الشحنة من المتجر"
                                : currentStep === "on_the_way"
                                  ? "جاري التوصيل للعميل 🛵"
                                  : currentStep === "arrived"
                                    ? "وصلت أمام موقع العميل 🚪"
                                    : "تم التسليم بنجاح ✅"}
                        </span>
                      </div>

                      {/* شريط خطوات الأيقونات التفاعلي */}
                      <div className="grid grid-cols-4 gap-1 p-1 bg-secondary/40 rounded-2xl">
                        {[
                          { key: "at_store", label: "1. المتجر", icon: Store },
                          { key: "picked_up", label: "2. استلام", icon: PackageCheck },
                          { key: "on_the_way", label: "3. في الطريق", icon: Truck },
                          { key: "arrived", label: "4. وصول", icon: MapPin },
                        ].map((st) => {
                          const IconComp = st.icon;
                          const isDone =
                            (st.key === "at_store" && currentStep !== "assigned") ||
                            (st.key === "picked_up" &&
                              ["picked_up", "on_the_way", "arrived", "delivered"].includes(
                                currentStep,
                              )) ||
                            (st.key === "on_the_way" &&
                              ["on_the_way", "arrived", "delivered"].includes(currentStep)) ||
                            (st.key === "arrived" &&
                              ["arrived", "delivered"].includes(currentStep));

                          return (
                            <div
                              key={st.key}
                              className={`flex flex-col items-center py-1.5 px-1 rounded-xl text-center text-[10px] font-black transition-all ${
                                isDone
                                  ? "bg-emerald-600 text-white shadow-xs"
                                  : "text-muted-foreground opacity-60"
                              }`}
                            >
                              <IconComp className="h-3.5 w-3.5 mb-0.5" />
                              <span>{st.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* قائمة المنتجات في الطلب */}
                    {o.items && o.items.length > 0 && (
                      <div className="p-3 rounded-2xl bg-secondary/30 border border-border space-y-1.5">
                        <div className="text-xs font-bold text-muted-foreground">
                          محتويات الطلب ({o.items.length} صنف):
                        </div>
                        <div className="space-y-1">
                          {o.items.map((it, idx) => (
                            <div key={idx} className="flex justify-between text-xs font-medium">
                              <span className="text-foreground">
                                • {it.name}{" "}
                                <span className="text-muted-foreground font-bold">
                                  × {it.quantity} {it.unit_label || ""}
                                </span>
                              </span>
                              {it.price != null && (
                                <span className="font-bold text-muted-foreground">
                                  {(it.price * it.quantity).toFixed(2)} ج.م
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* أزرار الاتصال والدردشة السريعة */}
                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href={`tel:${o.phone}`}
                        className="inline-flex items-center justify-center gap-2 h-10 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-xs transition-colors"
                      >
                        <Phone className="h-4 w-4" />
                        <span>اتصال بالعميل 📞</span>
                      </a>

                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setSelectedOrderForChat(o);
                          setChatModalOpen(true);
                        }}
                        className="rounded-2xl h-10 text-xs font-black gap-2 border border-border"
                      >
                        <MessageSquare className="h-4 w-4 text-emerald-600" />
                        <span>دردشة وواتساب 💬</span>
                      </Button>
                    </div>

                    {/* أزرار الإجراءات التدرجية وإثبات التسليم */}
                    <div className="space-y-2 pt-1 border-t border-border/40">
                      {currentStep === "assigned" && (
                        <Button
                          onClick={() => handleUpdateStep(o, "at_store")}
                          className="w-full h-11 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs gap-2 shadow-sm"
                        >
                          <Store className="h-4 w-4" />
                          <span>وصلت إلى المتجر لاستلام الطلب 🏬</span>
                        </Button>
                      )}

                      {currentStep === "at_store" && (
                        <Button
                          onClick={() => handleUpdateStep(o, "picked_up")}
                          className="w-full h-11 rounded-2xl hero-gradient text-primary-foreground font-black text-xs gap-2 shadow-md"
                        >
                          <PackageCheck className="h-4 w-4" />
                          <span>تأكيد استلام الطرود وبدء الرحلة نحو العميل 🛵</span>
                        </Button>
                      )}

                      {currentStep === "picked_up" && (
                        <Button
                          onClick={() => handleUpdateStep(o, "on_the_way")}
                          className="w-full h-11 rounded-2xl hero-gradient text-primary-foreground font-black text-xs gap-2 shadow-md"
                        >
                          <Truck className="h-4 w-4" />
                          <span>في الطريق إلى عنوان العميل 🚀</span>
                        </Button>
                      )}

                      {currentStep === "on_the_way" && (
                        <Button
                          onClick={() => handleUpdateStep(o, "arrived")}
                          className="w-full h-11 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs gap-2 shadow-md"
                        >
                          <MapPin className="h-4 w-4" />
                          <span>وصلت أمام موقع العميل (تنبيه بالوصول) 🚪</span>
                        </Button>
                      )}

                      {(currentStep === "arrived" || currentStep === "on_the_way") && (
                        <Button
                          onClick={() => {
                            setSelectedOrderForPod(o);
                            setPodModalOpen(true);
                          }}
                          className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs gap-2 shadow-lg"
                        >
                          <ShieldCheck className="h-5 w-5" />
                          <span>إثبات وتأكيد التسليم (توقيع العميل / صورة) ✅</span>
                        </Button>
                      )}

                      {currentStep === "delivered" && (
                        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-black text-center flex items-center justify-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <span>تم تسليم وتوثيق هذا الطلب بنجاح ✅</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* نوافذ الحوار المنبثقة */}
      {selectedOrderForPod && (
        <ProofOfDeliveryModal
          open={podModalOpen}
          onOpenChange={setPodModalOpen}
          orderId={selectedOrderForPod.id}
          customerName={selectedOrderForPod.customer_name}
          currentCoords={currentCoords}
          totalAmount={Number(selectedOrderForPod.total_amount) || 0}
          paymentMethod={selectedOrderForPod.payment_method || "cod"}
          onConfirmDelivery={handleConfirmPod}
        />
      )}

      {selectedOrderForChat && (
        <DriverChatSupportModal
          open={chatModalOpen}
          onOpenChange={setChatModalOpen}
          customerName={selectedOrderForChat.customer_name}
          customerPhone={selectedOrderForChat.phone}
          orderId={selectedOrderForChat.id}
          storePhone={storeInfo.phone}
        />
      )}
    </div>
  );
}
