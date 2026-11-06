import { SITE_URL } from "@/lib/brand";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useCart, lineSubtotal, formatWeightLabel } from "@/lib/cart-context";
import { supabase } from "@/lib/supabase-loose";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  ShoppingBag,
  Minus,
  Plus,
  Trash2,
  ArrowRight,
  Banknote,
  Smartphone,
  Building2,
  Copy,
  Truck,
  Store,
  MapPin,
  Leaf,
  TicketPercent,
  X,
  BookmarkPlus,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { z } from "zod";
import { useTheme } from "@/lib/theme-context";
import { useSettings } from "@/lib/settings-context";
import { useAuth } from "@/lib/auth-context";
import { playSuccessSound } from "@/lib/sounds";
import { Truck as TruckIcon } from "lucide-react";
import {
  SubstitutionPreferencePicker,
  SubstitutionPreference,
} from "@/components/storefront/SubstitutionPreferencePicker";
import { ItemSubstitutionSelector } from "@/components/storefront/ItemSubstitutionSelector";
import { StoreGoogleMapsWidget } from "@/components/storefront/StoreGoogleMapsWidget";
import { useStoreProducts } from "@/lib/store-data-hooks";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "سلة المشتريات — سوبرماركت الوادي الأخضر" },
      { name: "description", content: "أتمم طلبك من متجر سوبرماركت الوادي الأخضر مع توصيل سريع لمنطقتك" },
      { property: "og:title", content: "سلة المشتريات — سوبرماركت الوادي الأخضر" },
      {
        property: "og:description",
        content: "راجع منتجاتك وأكمل الطلب مع توصيل سريع لمنطقتك.",
      },
      { property: "og:url", content: `${SITE_URL}/cart` },
      { name: "twitter:title", content: "سلة المشتريات — سوبرماركت الوادي الأخضر" },
      { name: "robots", content: "noindex,follow" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/cart` }],
  }),

  component: CartPage,
});

type PaymentMethod = "cod" | "instapay" | "bank";
type DeliveryMethod = "delivery" | "pickup";

type Zone = {
  id: string;
  name: string;
  country: string;
  governorate: string | null;
  city: string | null;
  area: string | null;
  fee: number;
  min_order_amount: number | null;
  estimated_minutes: number | null;
};

const checkoutSchema = z.object({
  customer_name: z.string().trim().min(2, "الاسم قصير جداً").max(80),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{8,20}$/, "رقم هاتف غير صحيح"),
  address: z.string().trim().max(300),
  notes: z.string().trim().max(500).optional(),
  payment_method: z.enum(["cod", "instapay", "bank"]),
  payment_reference: z.string().trim().max(120).optional(),
});

const ORDER_ERROR_MESSAGES: Record<string, string> = {
  EMPTY_CART: "سلتك فارغة.",
  CUSTOMER_DATA_REQUIRED: "يرجى إدخال الاسم ورقم الهاتف.",
  INSUFFICIENT_STOCK: "عذراً، إحدى المنتجات في سلتك نفدت للتو. يرجى مراجعة السلة.",
  INVALID_DELIVERY_ZONE: "منطقة التوصيل المختارة غير متاحة حالياً.",
  MIN_DELIVERY_ORDER: "قيمة الطلب أقل من الحد الأدنى لهذه المنطقة.",
  INVALID_CODE: "كود الخصم غير صحيح.",
  EXPIRED: "انتهت صلاحية كود الخصم.",
  EXHAUSTED: "تم استهلاك الحد الأقصى لاستخدام هذا الكود.",
  MIN_ORDER: "قيمة الطلب أقل من الحد الأدنى لتطبيق كود الخصم.",
};

function mapOrderErrorMessage(message?: string | null) {
  const raw = (message ?? "").trim();
  for (const [code, text] of Object.entries(ORDER_ERROR_MESSAGES)) {
    if (raw === code || raw.includes(code)) return text;
  }
  return "حدث خطأ أثناء إتمام الطلب. يرجى المحاولة مرة أخرى.";
}

function CartPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const settings = useSettings();
  const { user } = useAuth();
  const { data: catalogProducts = [] } = useStoreProducts();
  const {
    items,
    addItem,
    updateQuantity,
    removeItem,
    totalPrice,
    clear,
    updateItemPreference,
  } = useCart();

  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("delivery");
  const [zones, setZones] = useState<Zone[]>([]);
  const [zoneId, setZoneId] = useState<string>("");
  const [userAddresses, setUserAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [pay, setPay] = useState<{
    instapay_handle: string | null;
    bank_account_info: string | null;
    store_address: string | null;
  }>({
    instapay_handle: null,
    bank_account_info: null,
    store_address: null,
  });
  const [bg, setBg] = useState<{ empty: string | null; floating: string | null }>({
    empty: null,
    floating: null,
  });
  const [form, setForm] = useState({
    customer_name: "",
    phone: "",
    address: "",
    notes: "",
    payment_method: "cod" as PaymentMethod,
    payment_reference: "",
  });
  const [substitutionPreference, setSubstitutionPreference] =
    useState<SubstitutionPreference>("call_me");
  const [submitting, setSubmitting] = useState(false);
  // مفتاح idempotency يبقى ثابتاً لكل محاولة دفع (بما فيها إعادة المحاولة)
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);

  const recommendedProducts = useMemo(
    () => catalogProducts
      .filter((product) => (product.stock_quantity ?? 0) > 0 && !items.some((item) => item.product.id === product.id))
      .slice(0, 4),
    [catalogProducts, items],
  );

  // كوبون الخصم
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<{
    id: string;
    code: string;
    discount_type: string;
    discount_value: number;
  } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      toast.error("أدخل كود الخصم");
      return;
    }
    setCouponLoading(true);
    const { data, error } = await (supabase as any).rpc("validate_coupon", {
      p_code: code,
      p_subtotal: totalPrice,
    });
    setCouponLoading(false);
    if (error || !data || (Array.isArray(data) && data.length === 0)) {
      const msg = error?.message || "";
      if (msg.includes("EXPIRED")) toast.error("انتهت صلاحية الكود");
      else if (msg.includes("EXHAUSTED")) toast.error("تم استنفاد عدد مرات استخدام الكود");
      else if (msg.includes("MIN_ORDER"))
        toast.error("لم يتم الوصول للحد الأدنى المطلوب لهذا الكود");
      else toast.error("كود الخصم غير صحيح");
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    setCoupon({
      id: row.code,
      code: row.code,
      discount_type: row.discount_type,
      discount_value: Number(row.discount_value),
    });
    toast.success(`تم تطبيق الخصم: ${row.code}`);
  };

  const removeCoupon = () => {
    setCoupon(null);
    setCouponInput("");
  };

  const [country, setCountry] = useState<string>("");
  const [governorate, setGovernorate] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [area, setArea] = useState<string>("");

  useEffect(() => {
    (supabase as any)
      .from("delivery_zones")
      .select(
        "id,name,fee,min_order_amount,estimated_minutes,is_active,sort_order,country,governorate,city,area",
      )
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .then(({ data }: any) => {
        const z = (data ?? []) as Zone[];
        setZones(z);
      });
    (async () => {
      const [{ data: rpc }, { data: pub }] = await Promise.all([
        (supabase as any).rpc("get_payment_config"),
        supabase
          .from("store_settings_public" as any)
          .select("cart_empty_bg,floating_element_image")
          .limit(1)
          .maybeSingle(),
      ]);
      const pay0 = Array.isArray(rpc) ? rpc[0] : rpc;
      if (pay0)
        setPay({
          instapay_handle: pay0.instapay_handle ?? null,
          bank_account_info: pay0.bank_account_info ?? null,
          store_address: pay0.store_address ?? null,
        });
      if (pub)
        setBg({
          empty: (pub as any).cart_empty_bg ?? null,
          floating: (pub as any).floating_element_image ?? null,
        });
    })();

    // The live database has no `addresses` table. Use the authoritative profile
    // for signed-in customers and keep guest address state local-only.
    if (user?.id) {
      supabase
        .from("profiles")
        .select("full_name, phone, address")
        .eq("id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (!data) return;
          setForm((prev) => ({
            ...prev,
            customer_name: prev.customer_name || data.full_name || user.user_metadata?.full_name || "",
            phone: prev.phone || data.phone || user.user_metadata?.phone || "",
            address: prev.address || data.address || "",
          }));
        });
    }
  }, [user]);

  // Cascading options
  const countries = useMemo(
    () => Array.from(new Set(zones.map((z) => z.country))).filter(Boolean),
    [zones],
  );
  const governorates = useMemo(
    () =>
      Array.from(
        new Set(zones.filter((z) => z.country === country).map((z) => z.governorate ?? "")),
      ).filter(Boolean),
    [zones, country],
  );
  const cities = useMemo(
    () =>
      Array.from(
        new Set(
          zones
            .filter((z) => z.country === country && (z.governorate ?? "") === governorate)
            .map((z) => z.city ?? ""),
        ),
      ).filter(Boolean),
    [zones, country, governorate],
  );
  const areas = useMemo(
    () =>
      Array.from(
        new Set(
          zones
            .filter(
              (z) =>
                z.country === country &&
                (z.governorate ?? "") === governorate &&
                (z.city ?? "") === city,
            )
            .map((z) => z.area ?? ""),
        ),
      ).filter(Boolean),
    [zones, country, governorate, city],
  );

  // Default country to first available (usually مصر) once zones load
  useEffect(() => {
    if (!country && countries.length > 0) setCountry(countries[0]);
  }, [countries, country]);

  // Auto-resolve zoneId when all required cascading levels are chosen
  useEffect(() => {
    if (!country) {
      setZoneId("");
      return;
    }
    const match = zones.find(
      (z) =>
        z.country === country &&
        (z.governorate ?? "") === governorate &&
        (z.city ?? "") === city &&
        (z.area ?? "") === area,
    );
    // Fallback: if area is not applicable at this level, allow matching without area
    const partial =
      match ??
      zones.find(
        (z) =>
          z.country === country &&
          (z.governorate ?? "") === governorate &&
          (z.city ?? "") === city &&
          !z.area,
      );
    setZoneId(partial?.id ?? "");
  }, [zones, country, governorate, city, area]);

  const zone = useMemo(() => zones.find((z) => z.id === zoneId) ?? null, [zones, zoneId]);
  const deliveryFee = deliveryMethod === "delivery" ? (zone?.fee ?? 0) : 0;
  const minOrder = deliveryMethod === "delivery" ? (zone?.min_order_amount ?? 0) : 0;
  const storeMin = Number(settings.min_order_amount || 0);
  const freeShipAt = Number(settings.free_shipping_threshold || 0);
  const effectiveMin = Math.max(minOrder, storeMin);
  const belowMin = effectiveMin > 0 && totalPrice < effectiveMin;
  const missingToFreeShip = freeShipAt > 0 ? Math.max(0, freeShipAt - totalPrice) : 0;
  const freeShipReached = freeShipAt > 0 && totalPrice >= freeShipAt;
  const progressPct =
    effectiveMin > 0 || freeShipAt > 0
      ? Math.min(
          100,
          (totalPrice / Math.max(freeShipAt || effectiveMin, effectiveMin || freeShipAt, 1)) * 100,
        )
      : 0;
  const discountAmount = useMemo(() => {
    if (!coupon) return 0;
    const raw =
      coupon.discount_type === "percentage"
        ? totalPrice * (coupon.discount_value / 100)
        : coupon.discount_value;
    return +Math.min(raw, totalPrice).toFixed(2);
  }, [coupon, totalPrice]);
  const grandTotal = +Math.max(0, totalPrice - discountAmount + Number(deliveryFee || 0)).toFixed(
    2,
  );

  const handleSubmit = async () => {
    if (items.length === 0) return;
    if (deliveryMethod === "delivery" && zones.length > 0 && !zoneId) {
      toast.error("اختر منطقة التوصيل");
      return;
    }
    if (belowMin) {
      toast.error(`الحد الأدنى للطلب هو ${effectiveMin} ج.م`);
      return;
    }

    const addressToValidate =
      deliveryMethod === "pickup" ? pay.store_address || "استلام من الفرع" : form.address;

    const parsed = checkoutSchema.safeParse({ ...form, address: addressToValidate });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة");
      return;
    }
    if (deliveryMethod === "delivery" && addressToValidate.trim().length < 5) {
      toast.error("أدخل عنوان واضح للتوصيل");
      return;
    }
    if (
      (parsed.data.payment_method === "instapay" || parsed.data.payment_method === "bank") &&
      !parsed.data.payment_reference?.trim()
    ) {
      toast.error("أدخل رقم/مرجع التحويل بعد إتمام الدفع");
      return;
    }

    setSubmitting(true);
    const ref = (() => {
      try {
        return sessionStorage.getItem("store_ref");
      } catch {
        return null;
      }
    })();

    const substitutionLabel =
      substitutionPreference === "call_me"
        ? "[تفضيل البديل: الاتصال هاتفياً بالعميل]"
        : substitutionPreference === "auto_best"
          ? "[تفضيل البديل: اختيار أفضل بديل تلقائياً]"
          : "[تفضيل البديل: عدم الاستبدال وحذف الصنف]";

    const combinedNotes = [substitutionLabel, parsed.data.notes?.trim()].filter(Boolean).join("\n");

    let createdOrderId: string | null = null;

    // مفتاح idempotency ثابت لكل محاولة دفع: لا يُعاد توليده عند إعادة المحاولة
    let attemptKey = idempotencyKey;
    if (!attemptKey) {
      attemptKey = crypto.randomUUID();
      setIdempotencyKey(attemptKey);
    }

    try {
      const baseArgs = {
        p_customer_name: parsed.data.customer_name,
        p_phone: parsed.data.phone,
        p_address:
          deliveryMethod === "pickup"
            ? `[استلام من الفرع] ${pay.store_address ?? ""}`.trim()
            : parsed.data.address,
        p_notes: combinedNotes || null,
        p_items: items.map((i) => ({ id: i.product.id, quantity: i.quantity })),
        p_delivery_zone_id: deliveryMethod === "delivery" ? zoneId || null : null,
        p_delivery_method: deliveryMethod,
        p_payment_method: parsed.data.payment_method,
        p_payment_reference: parsed.data.payment_reference?.trim() || null,
        p_coupon_code: coupon?.code ?? null,
        p_ref_source: ref,
      };

      const { data: rpcData, error: rpcError } = await supabase.rpc("create_order", {
        ...baseArgs,
        p_idempotency_key: attemptKey,
      } as any);

      if (rpcError) {
        console.error("create_order failed:", rpcError);
        throw new Error(mapOrderErrorMessage(rpcError.message));
      }

      // The live RPC returns the authoritative order UUID directly.
      if (typeof rpcData !== "string" || !rpcData) {
        throw new Error("لم يُرجع الخادم رقم طلب صالحاً");
      }
      createdOrderId = rpcData;
    } catch (e: any) {
      console.error("Order submission failed:", e);
      setSubmitting(false);
      toast.error("تعذر إرسال الطلب", {
        description: e?.message || "حدث خطأ أثناء إنشاء الطلب. لم يتم اعتماد الطلب، ويمكنك المحاولة مرة أخرى.",
      });
      return;
    }



    setSubmitting(false);
    setIdempotencyKey(null); // محاولة الدفع انتهت: أي طلب جديد يبدأ بمفتاح جديد
    playSuccessSound();
    toast.success("تم استلام طلبك بنجاح ✨", {
      description: `رقم الطلب #${createdOrderId} — سيتواصل معك فريق سوبرماركت الوادي الأخضر لتأكيد التوصيل.`,
    });
    clear();
    navigate({ to: "/" });
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success("تم النسخ"));
  };

  return (
    <div
      className="elwadi-cart min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background"
      dir="rtl"
    >
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl hero-gradient text-primary-foreground">
              <Leaf className="h-4 w-4" />
            </div>
            <span className="hidden font-display text-base font-bold sm:inline">سوبرماركت الوادي الأخضر</span>
          </Link>
          <h1 className="flex items-center gap-2 font-display text-base font-bold">
            <ShoppingBag className="h-4 w-4 text-primary" />
            سلة المشتريات
          </h1>
          <Link to="/" className="text-xs font-bold text-primary hover:underline">
            <ArrowRight className="me-1 inline h-3.5 w-3.5" />
            متابعة التسوق
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-6">
        {items.length === 0 ? (
          <div className="relative mx-auto max-w-lg overflow-visible">
            {bg.floating && (
              <img
                src={bg.floating}
                alt=""
                aria-hidden
                className="pointer-events-none absolute -top-12 -left-10 z-10 h-32 w-32 select-none object-contain drop-shadow-2xl -rotate-12"
              />
            )}
            <Card
              className={`relative flex flex-col items-center gap-3 overflow-hidden p-10 text-center ${theme.cart_empty_bg_url || bg.empty ? "border-white/10 bg-cover bg-center text-white" : ""}`}
              style={{
                borderRadius: theme.card_radius_px,
                ...(theme.cart_empty_bg_url || bg.empty
                  ? { backgroundImage: `url(${theme.cart_empty_bg_url ?? bg.empty})` }
                  : {}),
              }}
            >
              {(theme.cart_empty_bg_url || bg.empty) && (
                <div className="absolute inset-0 bg-gradient-to-br from-black/75 via-black/55 to-black/75" />
              )}
              <div
                className={`relative z-10 grid h-24 w-24 place-items-center rounded-3xl text-5xl ${theme.cart_empty_bg_url || bg.empty ? "bg-white/10 backdrop-blur" : "bg-primary/15 text-primary"}`}
              >
                🛒
              </div>
              <p className="relative z-10 font-display text-xl font-black">سلتك فارغة الآن</p>
              <p
                className={`relative z-10 font-display text-sm font-medium ${bg.empty ? "text-white/80" : "text-muted-foreground"}`}
              >
                ابدأ رحلة تسوّقك من "سوبرماركت الوادي الأخضر" — منتجات طازجة تصلك سريعاً 🌿
              </p>
              <Link to="/" className="relative z-10">
                <Button className="mt-2 rounded-full hero-gradient text-primary-foreground">
                  تصفح المنتجات
                </Button>
              </Link>
            </Card>
          </div>
        ) : (
          <>
          <section className="cart-page-intro" aria-label="خطوات إتمام الطلب">
            <div className="cart-page-intro__copy">
              <span className="cart-page-intro__eyebrow"><ShoppingBag size={14} /> طلبك في طريقه للتجهيز</span>
              <h2>سلة المشتريات</h2>
              <p>راجع اختياراتك، ثم حدّد طريقة الاستلام والدفع المناسبة.</p>
            </div>
            <ol className="cart-checkout-steps">
              <li className="is-complete"><span>١</span><b>السلة</b></li>
              <i aria-hidden="true" />
              <li className={form.customer_name && form.phone ? "is-complete" : "is-current"}><span>٢</span><b>بيانات التوصيل</b></li>
              <i aria-hidden="true" />
              <li><span>٣</span><b>تأكيد الطلب</b></li>
            </ol>
          </section>
          <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
            {/* العمود الأيمن: العناصر + بيانات الطلب */}
            <div className="space-y-5">
              <Card className="rounded-3xl border-border p-4 sm:p-5">
                <h2 className="mb-3 font-display text-base font-bold">المنتجات ({items.length})</h2>
                {(effectiveMin > 0 || freeShipAt > 0) && (
                  <div className="mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs font-black">
                      <span className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                        <TruckIcon className="h-4 w-4 text-emerald-600 animate-bounce" />
                        {freeShipReached ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-black">
                            تهانينا! لقد حصلت على شحن مجاني 🥳🎉
                          </span>
                        ) : belowMin ? (
                          <span>
                            أضف بـ{" "}
                            <strong className="text-amber-600 font-black">
                              {(effectiveMin - totalPrice).toFixed(2)} ج.م
                            </strong>{" "}
                            للوصول للحد الأدنى للطلب ({effectiveMin} ج.م)
                          </span>
                        ) : missingToFreeShip > 0 ? (
                          <span>
                            باقي{" "}
                            <strong className="text-amber-600 font-black">
                              {missingToFreeShip.toFixed(2)} ج.م
                            </strong>{" "}
                            للحصول على شحن مجاني! 🚚
                          </span>
                        ) : (
                          "طلبك مكتمل وجاهز للتوصيل!"
                        )}
                      </span>
                      <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        {totalPrice.toFixed(2)} / {(freeShipAt || effectiveMin).toFixed(2)} ج.م
                      </span>
                    </div>

                    <div className="relative h-3 overflow-hidden rounded-full bg-emerald-950/20">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ease-out ${
                          freeShipReached
                            ? "bg-gradient-to-r from-emerald-500 via-emerald-400 to-amber-400"
                            : "bg-gradient-to-r from-emerald-600 to-emerald-400"
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                      {effectiveMin > 0 && freeShipAt > effectiveMin && (
                        <div
                          className="absolute inset-y-0 w-1 bg-amber-400 shadow-xs"
                          style={{
                            insetInlineStart: `${Math.min(100, (effectiveMin / freeShipAt) * 100)}%`,
                          }}
                          title={`الحد الأدنى للطلب: ${effectiveMin} ج.م`}
                        />
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground pt-0.5">
                      {effectiveMin > 0 ? <span>الحد الأدنى: {effectiveMin} ج.م</span> : <span />}
                      {freeShipAt > 0 && <span>حد الشحن المجاني: {freeShipAt} ج.م</span>}
                    </div>
                  </div>
                )}
                <ul className="space-y-2.5">
                  {items.map((it) => (
                    <li
                      key={it.product.id}
                      className="flex gap-3 rounded-2xl border border-border bg-card p-3"
                    >
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-secondary">
                        {it.product.image_url ? (
                          <img
                            src={it.product.image_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-2xl">🌿</div>
                        )}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <h5 className="line-clamp-2 text-sm font-bold leading-snug">
                            {it.product.name_ar || it.product.name}
                          </h5>
                          <button
                            aria-label="حذف"
                            onClick={() => removeItem(it.product.id)}
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {it.product.price_per_unit.toFixed(2)} ج.م{" "}
                          {it.product.is_by_weight ? "/ كجم" : `/ ${it.product.unit_label}`}
                        </div>
                        {(it.product.stock_quantity ?? 0) <= 0 ? (
                          <p className="text-[11px] font-bold text-destructive">نفد هذا المنتج. أزله من السلة للمتابعة.</p>
                        ) : it.quantity > (it.product.stock_quantity ?? 0) ? (
                          <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300">
                            الكمية في السلة أكبر من المخزون الحالي ({it.product.stock_quantity}). قلل الكمية للمتابعة.
                          </p>
                        ) : null}
                        <div className="mt-auto flex items-center justify-between">
                          <div className="flex items-center gap-0.5 rounded-full border border-border bg-secondary/40 p-0.5">
                            <button
                              aria-label="تقليل"
                              onClick={() =>
                                updateQuantity(
                                  it.product.id,
                                  +(it.quantity - (it.product.is_by_weight ? 0.25 : 1)).toFixed(3),
                                )
                              }
                              className="grid h-8 w-8 place-items-center rounded-full hover:bg-background"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span dir="ltr" className="min-w-14 text-center text-xs font-black tabular-nums">
                              {it.product.is_by_weight
                                ? it.quantity >= 1
                                  ? <>{it.quantity} <bdi dir="rtl">كجم</bdi></>
                                  : <>{Math.round(it.quantity * 1000)} <bdi dir="rtl">جم</bdi></>
                                : it.quantity}
                            </span>
                            <button
                              aria-label="زيادة"
                              disabled={it.quantity >= (it.product.stock_quantity ?? 0)}
                              onClick={() =>
                                updateQuantity(
                                  it.product.id,
                                  +(it.quantity + (it.product.is_by_weight ? 0.25 : 1)).toFixed(3),
                                )
                              }
                              className="grid h-8 w-8 place-items-center rounded-full hover:bg-background"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="font-display text-sm font-black text-primary">
                            {lineSubtotal(it.product, it.quantity).toFixed(2)} ج.م
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>

              <Card className="rounded-3xl border-border p-4 sm:p-5">
                <h2 className="mb-3 font-display text-base font-bold">طريقة الاستلام</h2>
                <div className="grid grid-cols-2 gap-2">
                  <MethodOption
                    icon={<Truck className="h-4 w-4" />}
                    label="توصيل للمنزل"
                    active={deliveryMethod === "delivery"}
                    onClick={() => setDeliveryMethod("delivery")}
                  />
                  <MethodOption
                    icon={<Store className="h-4 w-4" />}
                    label="استلام من الفرع"
                    active={deliveryMethod === "pickup"}
                    onClick={() => setDeliveryMethod("pickup")}
                  />
                </div>

                {deliveryMethod === "delivery" && zones.length > 0 && (
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      حدّد موقع التوصيل
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <CascadeSelect
                        label="البلد"
                        value={country}
                        options={countries}
                        placeholder="اختر البلد"
                        onChange={(v) => {
                          setCountry(v);
                          setGovernorate("");
                          setCity("");
                          setArea("");
                        }}
                      />
                      <CascadeSelect
                        label="المحافظة"
                        value={governorate}
                        options={governorates}
                        placeholder="اختر المحافظة"
                        disabled={!country || governorates.length === 0}
                        onChange={(v) => {
                          setGovernorate(v);
                          setCity("");
                          setArea("");
                        }}
                      />
                      <CascadeSelect
                        label="المدينة"
                        value={city}
                        options={cities}
                        placeholder={cities.length === 0 ? "لا يتطلب" : "اختر المدينة"}
                        disabled={!governorate || cities.length === 0}
                        onChange={(v) => {
                          setCity(v);
                          setArea("");
                        }}
                      />
                      <CascadeSelect
                        label="المنطقة / الحي"
                        value={area}
                        options={areas}
                        placeholder={areas.length === 0 ? "لا يتطلب" : "اختر المنطقة"}
                        disabled={!city || areas.length === 0}
                        onChange={setArea}
                      />
                    </div>

                    {zone ? (
                      <div className="flex items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-3 text-xs">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 font-bold text-primary">
                            <MapPin className="h-3.5 w-3.5" />
                            <span className="truncate">{zone.name}</span>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-x-3 text-[10px] text-muted-foreground">
                            {zone.estimated_minutes ? (
                              <span>⏱️ حوالي {zone.estimated_minutes} دقيقة</span>
                            ) : null}
                            {zone.min_order_amount ? (
                              <span>حد أدنى {zone.min_order_amount} ج.م</span>
                            ) : null}
                          </div>
                        </div>
                        <div className="shrink-0 font-display text-sm font-black text-primary">
                          {Number(zone.fee).toFixed(2)} ج.م
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-3 text-center text-[11px] text-muted-foreground">
                        اختر منطقتك لعرض رسوم التوصيل تلقائياً
                      </div>
                    )}
                  </div>
                )}

                {deliveryMethod === "delivery" && zones.length === 0 && (
                  <div className="mt-4 rounded-2xl border border-dashed border-border bg-secondary/40 p-3 text-center text-[11px] text-muted-foreground">
                    لم يتم إضافة مناطق توصيل بعد — تواصل مع المتجر لتأكيد التغطية.
                  </div>
                )}

                {deliveryMethod === "pickup" && (
                  <div className="mt-4 rounded-2xl border border-accent/30 bg-accent/5 p-3 text-xs">
                    <div className="flex items-center gap-1.5 font-bold">
                      <Store className="h-4 w-4 text-primary" />
                      عنوان الفرع
                    </div>
                    <p className="mt-1 text-foreground">
                      {pay.store_address || "سيتم التواصل معك لتأكيد موعد الاستلام"}
                    </p>
                  </div>
                )}
              </Card>

              <Card className="rounded-3xl border-border p-4 sm:p-5">
                <h2 className="mb-3 font-display text-base font-bold">بيانات التواصل</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="الاسم بالكامل">
                    <Input
                      value={form.customer_name}
                      onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                      placeholder="اكتب اسمك"
                    />
                  </Field>
                  <Field label="رقم الهاتف">
                    <Input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="01xxxxxxxxx"
                      inputMode="tel"
                    />
                  </Field>
                  {deliveryMethod === "delivery" && (
                    <div className="sm:col-span-2 space-y-3">
                      {/* اختيار سريع من العناوين المحفوظة بحساب العميل */}
                      {userAddresses.length > 0 && (
                        <div className="p-3 rounded-2xl bg-secondary/40 border border-border space-y-2">
                          <div className="flex items-center justify-between text-xs font-bold text-foreground">
                            <span>عناوينك المحفوظة (اختر للتعبئة التلقائية):</span>
                            <span className="text-[10px] text-muted-foreground">
                              ({userAddresses.length} عنوان)
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {userAddresses.map((addr) => {
                              const isSel = selectedAddressId === addr.id;
                              return (
                                <button
                                  key={addr.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedAddressId(addr.id);
                                    setForm((prev) => ({
                                      ...prev,
                                      customer_name: addr.full_name || prev.customer_name,
                                      phone: addr.phone || prev.phone,
                                      address:
                                        `${addr.area ? addr.area + "، " : ""}${addr.street || ""}${addr.building ? "، عمارة " + addr.building : ""}${addr.apartment ? "، شقة " + addr.apartment : ""}`.trim(),
                                    }));
                                    toast.success(`تم اختيار عنوان: ${addr.label || "المحفوظ"}`);
                                  }}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 border ${
                                    isSel
                                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                                      : "bg-background text-foreground border-border hover:border-primary/50"
                                  }`}
                                >
                                  <MapPin className="h-3.5 w-3.5" />
                                  <span>{addr.label || "عنوان"}</span>
                                  {addr.is_default && (
                                    <span className="text-[9px] bg-amber-400/20 text-amber-600 dark:text-amber-300 px-1.5 py-0.2 rounded font-bold">
                                      افتراضي
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <Field label="عنوان التوصيل">
                        <Textarea
                          rows={2}
                          value={form.address}
                          onChange={(e) => setForm({ ...form, address: e.target.value })}
                          placeholder="المنطقة، الشارع، رقم العقار، الدور، الشقة"
                        />
                      </Field>

                      {/* ويدجت خرائط Google الذكية للتوصيل */}
                      <StoreGoogleMapsWidget
                        title="خريطة التوصيل المباشرة (Google Maps)"
                        subtitle="تأكيد نطاق التغطية وتتبع المسار وموقع التسليم بدقة"
                        storeAddress={
                          form.address ||
                          (zone?.name ? `${zone.name}، مصر` : pay.store_address || "القاهرة، مصر")
                        }
                        storeName="موقع تسليم طلبك — سوبرماركت الوادي الأخضر"
                        isInteractivePicker={true}
                        showAiGrounding={true}
                        allowSaveAsDefault={true}
                        customerFullName={form.customer_name}
                        customerPhone={form.phone}
                        onLocationSelect={(lat, lng) => {
                          // Update address note or form
                        }}
                      />
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <Field label="ملاحظات (اختياري)">
                      <Textarea
                        rows={2}
                        value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                        placeholder="أي ملاحظات للطلب"
                      />
                    </Field>
                  </div>
                </div>
              </Card>

              {/* خيارات ونظام البدائل في حال نفاد الأصناف */}
              <SubstitutionPreferencePicker
                value={substitutionPreference}
                onChange={setSubstitutionPreference}
              />

              <Card className="rounded-3xl border-border p-4 sm:p-5">
                <h2 className="mb-3 font-display text-base font-bold">طريقة الدفع</h2>
                <div className="grid grid-cols-3 gap-2">
                  <PayOption
                    icon={<Banknote className="h-4 w-4" />}
                    label="عند الاستلام"
                    active={form.payment_method === "cod"}
                    onClick={() =>
                      setForm({ ...form, payment_method: "cod", payment_reference: "" })
                    }
                  />
                  <PayOption
                    icon={<Smartphone className="h-4 w-4" />}
                    label="إنستاباي"
                    active={form.payment_method === "instapay"}
                    onClick={() => setForm({ ...form, payment_method: "instapay" })}
                    disabled={!pay.instapay_handle}
                  />
                  <PayOption
                    icon={<Building2 className="h-4 w-4" />}
                    label="تحويل بنكي"
                    active={form.payment_method === "bank"}
                    onClick={() => setForm({ ...form, payment_method: "bank" })}
                    disabled={!pay.bank_account_info}
                  />
                </div>

                {form.payment_method === "instapay" && pay.instapay_handle && (
                  <div className="mt-3 space-y-2 rounded-2xl border border-accent/30 bg-accent/5 p-3 text-xs">
                    <div className="font-bold">
                      حوّل المبلغ <span className="text-primary">{grandTotal.toFixed(2)} ج.م</span>{" "}
                      على إنستاباي:
                    </div>
                    <button
                      type="button"
                      onClick={() => copy(pay.instapay_handle!)}
                      className="flex w-full items-center justify-between rounded-xl bg-background px-3 py-2 font-mono font-bold hover:bg-secondary"
                    >
                      <span>{pay.instapay_handle}</span>
                      <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <Input
                      value={form.payment_reference}
                      onChange={(e) => setForm({ ...form, payment_reference: e.target.value })}
                      placeholder="رقم/مرجع التحويل"
                    />
                  </div>
                )}

                {form.payment_method === "bank" && pay.bank_account_info && (
                  <div className="mt-3 space-y-2 rounded-2xl border border-accent/30 bg-accent/5 p-3 text-xs">
                    <div className="font-bold">
                      حوّل المبلغ <span className="text-primary">{grandTotal.toFixed(2)} ج.م</span>{" "}
                      إلى الحساب التالي:
                    </div>
                    <pre className="whitespace-pre-wrap rounded-xl bg-background p-3 font-sans leading-relaxed">
                      {pay.bank_account_info}
                    </pre>
                    <Input
                      value={form.payment_reference}
                      onChange={(e) => setForm({ ...form, payment_reference: e.target.value })}
                      placeholder="رقم/مرجع التحويل"
                    />
                  </div>
                )}

                {form.payment_method === "cod" && (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {deliveryMethod === "delivery"
                      ? "ستدفع نقداً عند استلام الطلب من المندوب."
                      : "ستدفع نقداً عند استلام الطلب من الفرع."}
                  </p>
                )}
              </Card>
            </div>

            {/* الملخص الجانبي */}
            <aside className="lg:sticky lg:top-20 lg:self-start">
              <Card className="rounded-3xl border-border p-5">
                <h3 className="mb-3 font-display text-base font-bold">ملخص الطلب</h3>

                {/* كوبون الخصم */}
                <div className="mb-4 rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-3">
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-primary">
                    <TicketPercent className="h-4 w-4" />
                    كود الخصم
                  </div>
                  {coupon ? (
                    <div className="flex items-center justify-between gap-2 rounded-xl bg-background p-2">
                      <div className="text-xs">
                        <div className="font-black text-primary">{coupon.code}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {coupon.discount_type === "percentage"
                            ? `خصم ${coupon.discount_value}%`
                            : `خصم ${coupon.discount_value} ج.م`}
                        </div>
                      </div>
                      <button
                        onClick={removeCoupon}
                        className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label="إزالة الكوبون"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value)}
                        placeholder="أدخل كود الخصم"
                        dir="ltr"
                        className="h-9 text-xs"
                      />
                      <Button
                        onClick={applyCoupon}
                        disabled={couponLoading}
                        variant="outline"
                        className="h-9 rounded-xl px-3 text-xs font-bold"
                      >
                        {couponLoading ? "..." : "تطبيق"}
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  <Row label="الإجمالي الفرعي" value={`${totalPrice.toFixed(2)} ج.م`} />
                  {discountAmount > 0 && (
                    <Row
                      label={`الخصم (${coupon?.code})`}
                      value={`- ${discountAmount.toFixed(2)} ج.م`}
                    />
                  )}
                  <Row
                    label={deliveryMethod === "pickup" ? "رسوم الاستلام" : "رسوم التوصيل"}
                    value={`${Number(deliveryFee).toFixed(2)} ج.م`}
                  />
                  <div className="my-2 h-px bg-border" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">المبلغ المستحق</span>
                    <span className="font-display text-2xl font-black text-primary">
                      {grandTotal.toFixed(2)} ج.م
                    </span>
                  </div>
                  {belowMin && (
                    <p className="mt-2 rounded-xl bg-destructive/10 px-3 py-2 text-[11px] font-bold text-destructive">
                      ⚠️ الحد الأدنى للطلب هو {effectiveMin} ج.م — أضف بقيمة{" "}
                      {(effectiveMin - totalPrice).toFixed(2)} ج.م على الأقل.
                    </p>
                  )}
                </div>
                <Button
                  disabled={submitting || belowMin}
                  onClick={handleSubmit}
                  className="mt-4 h-12 w-full rounded-2xl hero-gradient text-base font-black text-primary-foreground shadow-card disabled:opacity-50 transition-all active:scale-[0.98]"
                >
                  {submitting ? "جارٍ الإرسال..." : "تأكيد وإرسال الطلب"}
                </Button>
                <Button
                  variant="outline"
                  onClick={clear}
                  className="mt-2 h-10 w-full rounded-2xl text-xs text-muted-foreground hover:text-destructive hover:border-destructive/30"
                >
                  إفراغ السلة
                </Button>

                {/* شارات الأمان والضمانات */}
                <div className="mt-5 space-y-2 border-t border-border/60 pt-4 text-[11px] font-semibold text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-100 font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      ✓
                    </span>
                    <span>السعر والمخزون يخضعان للتحقق عند إرسال الطلب.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-100 font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      ✓
                    </span>
                    <span>اختر طريقة الاستلام والدفع المتاحة لهذا الطلب.</span>
                  </div>
                </div>
              </Card>
            </aside>
          </div>
          </>
        )}

        {items.length > 0 && recommendedProducts.length > 0 && (
          <section className="cart-recommendations" aria-labelledby="cart-recommendations-title">
            <div className="cart-recommendations__heading">
              <div><span>اختيارات تناسب قائمتك</span><h2 id="cart-recommendations-title">قد تحتاج هذه المنتجات أيضًا</h2></div>
              <BookmarkPlus aria-hidden="true" />
            </div>
            <div className="cart-recommendations__grid">
              {recommendedProducts.map((product) => (
                <article className="cart-recommendation" key={product.id}>
                  <div className="cart-recommendation__image">
                    {product.image_url ? <img src={product.image_url} alt="" loading="lazy" /> : <ShoppingBag aria-hidden="true" />}
                  </div>
                  <div className="cart-recommendation__copy">
                    <b>{product.name_ar || product.name}</b>
                    <strong dir="ltr">{product.price_per_unit.toFixed(2)} <small>ج.م</small></strong>
                  </div>
                  <Button type="button" variant="outline" onClick={() => addItem(product)} className="cart-recommendation__add">
                    <Plus className="h-4 w-4" /> أضف للسلة
                  </Button>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
      <footer className="elwadi-cart-footer" dir="rtl">
        <div><span className="elwadi-cart-footer__mark"><Leaf size={19} /></span><b>سوبرماركت الوادي الأخضر</b><p>احتياجات البيت اليومية، في مكان واحد.</p></div>
        <Link to="/">تابع التسوق <ArrowRight size={15} /></Link>
        <small>© {new Date().getFullYear()} الوادي الأخضر</small>
      </footer>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="font-bold text-foreground">{value}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold">{label}</span>
      {children}
    </label>
  );
}

function MethodOption({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-2xl border p-3 text-sm font-bold transition ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-background hover:bg-secondary"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function PayOption({
  icon,
  label,
  active,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center justify-center gap-1 rounded-2xl border p-3 text-xs font-bold transition ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-background hover:bg-secondary"
      } disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function CascadeSelect({
  label,
  value,
  options,
  placeholder,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: string[];
  placeholder: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-foreground">{label}</span>
      <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="h-10 rounded-xl">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}
