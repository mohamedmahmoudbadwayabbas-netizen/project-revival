import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-loose";
import { fetchOrdersWithItems } from "@/services/orderDataService";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  User,
  MapPin,
  Package,
  LogOut,
  Plus,
  Trash2,
  Leaf,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Clock,
  Truck,
  ShoppingBag,
  RotateCcw,
  ChevronLeft,
  AlertCircle,
  LayoutDashboard,
  ShieldCheck,
  PhoneCall,
  Sparkles,
  Ban,
  Pencil,
  Check,
  ListOrdered,
} from "lucide-react";
import { formatWeightLabel } from "@/lib/cart-context";
import { toast } from "sonner";
import { StoreGoogleMapsWidget } from "@/components/storefront/StoreGoogleMapsWidget";
import { EmptyState } from "@/components/storefront/EmptyState";

export const Route = createFileRoute("/_authenticated/account")({
  ssr: false,
  head: () => ({
    meta: [{ title: "حسابي — سوبرماركت الوادي الأخضر" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { user: ctxUser } = Route.useRouteContext();
  const { user: authUser, isAdmin, signOut } = useAuth();
  const user = authUser ?? ctxUser;
  const router = useRouter();
  if (!user) return null;

  const handleSignOut = async () => {
    await signOut();
    router.history.push("/");
    toast.success("تم تسجيل الخروج");
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-background via-emerald-50/20 dark:via-emerald-950/10 to-background"
      dir="rtl"
    >
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3.5">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-2xl hero-gradient text-primary-foreground shadow-sm">
              <Leaf className="h-4 w-4" />
            </div>
            <span className="hidden font-display text-base font-extrabold sm:inline">
              سوبرماركت الوادي الأخضر
            </span>
          </Link>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Link to="/admin">
                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl gap-1.5 shadow-xs"
                >
                  <LayoutDashboard className="h-3.5 w-3.5" /> لوحة الإدارة
                </Button>
              </Link>
            )}
            <Link
              to="/"
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
            >
              <ArrowRight className="h-3.5 w-3.5" />
              متابعة التسوق
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {/* تنبيه مسؤول المتجر إن وجد */}
        {isAdmin && (
          <div className="mb-6 rounded-3xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-500 text-white font-black text-2xl shadow-sm">
                👑
              </div>
              <div>
                <h3 className="font-black text-base text-amber-900 dark:text-amber-200 flex items-center gap-2">
                  <span>حساب مسؤول المتجر (الأدمن)</span>
                  <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                    Admin Active
                  </span>
                </h3>
                <p className="mt-0.5 text-xs text-amber-800/90 dark:text-amber-300/90 font-semibold leading-relaxed">
                  أنت تسجّل دخولك بحساب مسؤول النظام. يمكنك التحكم بالكامل في الطلبات، المنتجات،
                  العروض، والإعدادات.
                </p>
              </div>
            </div>
            <Link to="/admin" className="w-full sm:w-auto shrink-0">
              <Button className="w-full sm:w-auto rounded-2xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black gap-2 shadow-sm py-2.5">
                <LayoutDashboard className="h-4 w-4" /> لوحة تحكم المتجر ⚡
              </Button>
            </Link>
          </div>
        )}
        {/* رأس ملف المستخدم */}
        <div className="mb-8 rounded-3xl border border-emerald-100 dark:border-emerald-900/40 bg-card p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-black text-2xl shadow-md">
              {(user.email?.[0] ?? "U").toUpperCase()}
            </div>
            <div>
              <h1 className="font-display text-xl sm:text-2xl font-black text-foreground">
                {user.user_metadata?.full_name || "مرحباً بك 🌿"}
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            className="gap-2 rounded-2xl border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-900/40 dark:hover:bg-rose-950/30 text-xs font-bold"
          >
            <LogOut className="h-4 w-4" /> تسجيل الخروج
          </Button>
        </div>

        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="grid h-auto w-full grid-cols-3 rounded-2xl bg-secondary/60 p-1.5 shadow-inner">
            <TabsTrigger
              value="orders"
              className="flex items-center justify-center gap-1.5 rounded-xl py-3 text-xs font-bold data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <Package className="h-4 w-4 text-emerald-600" />
              <span>طلباتي</span>
            </TabsTrigger>

            <TabsTrigger
              value="addresses"
              className="flex items-center justify-center gap-1.5 rounded-xl py-3 text-xs font-bold data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <MapPin className="h-4 w-4 text-emerald-600" />
              <span>العناوين</span>
            </TabsTrigger>

            <TabsTrigger
              value="profile"
              className="flex items-center justify-center gap-1.5 rounded-xl py-3 text-xs font-bold data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <User className="h-4 w-4 text-emerald-600" />
              <span>الملف الشخصي</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="mt-6">
            <OrdersTab userId={user.id} />
          </TabsContent>

          <TabsContent value="addresses" className="mt-6">
            <AddressesTab userId={user.id} />
          </TabsContent>

          <TabsContent value="profile" className="mt-6">
            <ProfileTab userId={user.id} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

/* ---------- Orders ---------- */
function OrdersTab({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const router = useRouter();
  const { addItem } = useCart();
  const { data, isLoading } = useQuery({
    queryKey: ["my-orders", userId],
    queryFn: async () => {
      return fetchOrdersWithItems({ userId });
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`orders-user-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `user_id=eq.${userId}` },
        () => qc.invalidateQueries({ queryKey: ["my-orders", userId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, qc]);

  const cancelOrder = async (id: string) => {
    if (!confirm("هل تريد بالتأكيد إلغاء هذا الطلب؟")) return;
    const { error } = await supabase
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", id)
      .eq("user_id", userId);
    if (error) return toast.error(error.message || "تعذّر إلغاء الطلب");
    toast.success("تم إلغاء الطلب");
    qc.invalidateQueries({ queryKey: ["my-orders", userId] });
  };

  const reorder = async (
    items: Array<{
      id?: string;
      name: string;
      price: number;
      quantity: number;
      is_by_weight?: boolean;
      unit_label?: string;
    }>,
  ) => {
    let count = 0;
    for (const item of items) {
      const prodId = item.id || `reorder-${item.name.replace(/\s+/g, "-")}`;
      addItem(
        {
          id: prodId,
          name: item.name,
          price_per_unit: item.price ?? 0,
          is_by_weight: item.is_by_weight ?? false,
          unit_label: item.unit_label ?? (item.is_by_weight ? "كجم" : "قطعة"),
          category_id: "",
          description: null,
          old_price: null,
          image_url: null,
          stock_quantity: 100,
        } as any,
        item.quantity || 1,
      );
      count++;
    }
    if (count > 0) {
      toast.success(`تمت إضافة ${count} منتجات من هذا الطلب إلى سلة المشتريات 🛒`, {
        action: {
          label: "فتح السلة والطلب 🛍️",
          onClick: () => router.history.push("/cart"),
        },
      });
    } else {
      toast.error("لا توجد منتجات صالحة في هذا الطلب");
    }
  };

  if (isLoading) return <Loader />;
  if (!data?.length)
    return (
      <Empty
        icon={Package}
        text="لم تقم بأي طلب بعد"
        cta={{ label: "ابدأ التسوق من هنا", to: "/" }}
      />
    );

  const CANCELLABLE = new Set(["pending", "confirmed"]);

  return (
    <div className="space-y-5">
      {data.map((o) => {
        const items = Array.isArray(o.items)
          ? (o.items as Array<{
              id?: string;
              name: string;
              quantity: number;
              price: number;
              unit_label?: string;
              is_by_weight?: boolean;
            }>)
          : [];
        const canCancel = CANCELLABLE.has(o.status);

        return (
          <Card
            key={o.id}
            className="overflow-hidden rounded-3xl border border-emerald-100 dark:border-emerald-900/30 bg-card p-5 shadow-xs transition-hover hover:shadow-md"
          >
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-sm font-black text-foreground">
                    رقم الطلب #{o.id.slice(0, 8)}
                  </span>
                  <StatusBadge status={o.status} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-emerald-600" />
                  {new Date(o.created_at).toLocaleString("ar-EG", {
                    dateStyle: "long",
                    timeStyle: "short",
                  })}
                </p>
              </div>
              <div className="text-end">
                <div className="font-display text-xl font-black text-emerald-700 dark:text-emerald-400">
                  {Number(o.total_amount).toFixed(2)} ج.م
                </div>
                <div className="mt-0.5 text-[11px] font-semibold text-muted-foreground">
                  طريقة الدفع:{" "}
                  {o.payment_method === "cod"
                    ? "دفع عند الاستلام"
                    : o.payment_method === "instapay"
                      ? "إنستاباي"
                      : "تحويل بنكي"}
                </div>
              </div>
            </div>

            {/* خط الزمني للطلب */}
            <OrderStepper status={o.status} />

            {/* تفضيل استبدال المنتجات والملاحظات */}
            {o.notes && (
              <div className="mt-3.5 space-y-1.5">
                {o.notes.includes("الاتصال هاتفياً") ? (
                  <div className="flex items-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800/60 p-3 text-xs text-amber-900 dark:text-amber-200">
                    <PhoneCall className="h-4 w-4 text-amber-600 shrink-0" />
                    <div>
                      <span className="font-black">تفضيل الاستبدال:</span>{" "}
                      <span>الاتصال هاتفياً بك قبل استبدال أي صنف غير متوفر 📞</span>
                    </div>
                  </div>
                ) : o.notes.includes("أفضل بديل") ? (
                  <div className="flex items-center gap-2 rounded-2xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-800/60 p-3 text-xs text-emerald-900 dark:text-emerald-200">
                    <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-black">تفضيل الاستبدال:</span>{" "}
                      <span>اختيار أفضل بديل تلقائياً بنفس الجودة والسعر ⚡</span>
                    </div>
                  </div>
                ) : o.notes.includes("عدم الاستبدال") ? (
                  <div className="flex items-center gap-2 rounded-2xl border border-rose-300 bg-rose-50 dark:bg-rose-950/40 dark:border-rose-800/60 p-3 text-xs text-rose-900 dark:text-rose-200">
                    <Ban className="h-4 w-4 text-rose-600 shrink-0" />
                    <div>
                      <span className="font-black">تفضيل الاستبدال:</span>{" "}
                      <span>عدم الاستبدال وحذف الصنف الناقص من الفاتورة 🚫</span>
                    </div>
                  </div>
                ) : null}

                {/* الملاحظات الإضافية للعميل إن وجدت بدون علامة التفضيل */}
                {o.notes
                  .split("\n")
                  .filter((line: string) => !line.startsWith("[تفضيل البديل:"))
                  .join("\n")
                  .trim() && (
                  <div className="rounded-xl bg-secondary/50 p-2.5 text-xs text-muted-foreground font-semibold">
                    <span className="font-bold text-foreground">ملاحظاتك: </span>
                    {o.notes
                      .split("\n")
                      .filter((line: string) => !line.startsWith("[تفضيل البديل:"))
                      .join("\n")
                      .trim()}
                  </div>
                )}
              </div>
            )}

            {/* قائمة المنتجات في الطلب */}
            {items.length > 0 && (
              <div className="mt-4 space-y-2 rounded-2xl bg-secondary/40 p-4">
                <div className="mb-2 text-xs font-bold text-muted-foreground">
                  المنتجات المطلوبين ({items.length})
                </div>
                {items.map((i, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 text-xs font-medium"
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="font-bold text-foreground">{i.name ?? "منتج"}</span>
                      <span className="text-muted-foreground font-semibold">
                        × {i.quantity ?? 1} {i.unit_label ?? ""}
                      </span>
                    </div>
                    {i.price != null && (
                      <span className="font-bold text-primary">
                        {Number(i.price * (i.quantity || 1)).toFixed(2)} ج.م
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40">
              <Button
                size="sm"
                onClick={() => reorder(items)}
                className="gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs py-2 px-3.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>إعادة طلب هذه المنتجات بنقرة واحدة 🛒</span>
              </Button>

              {canCancel && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => cancelOrder(o.id)}
                  className="gap-1.5 rounded-2xl border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold"
                >
                  <Trash2 className="h-3.5 w-3.5" /> إلغاء الطلب
                </Button>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function OrderStepper({ status }: { status: string }) {
  if (status === "cancelled") {
    return (
      <div className="my-4 flex items-center gap-2 rounded-2xl bg-rose-50 dark:bg-rose-950/30 p-3 text-xs font-bold text-rose-700 dark:text-rose-400">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>تم إلغاء هذا الطلب</span>
      </div>
    );
  }

  const steps = [
    { key: "pending", label: "تم الاستلام" },
    { key: "confirmed", label: "مؤكد" },
    { key: "shipped", label: "جاري التوصيل" },
    { key: "delivered", label: "تم التسليم" },
  ];

  const getStepIndex = (st: string) => {
    switch (st) {
      case "pending":
        return 0;
      case "confirmed":
        return 1;
      case "shipped":
        return 2;
      case "delivered":
        return 3;
      default:
        return 0;
    }
  };

  const currentIdx = getStepIndex(status);

  return (
    <div className="my-4 px-2">
      <div className="relative flex items-center justify-between">
        {/* الخط بين النقاط */}
        <div className="absolute top-1/2 inset-x-4 h-1 -translate-y-1/2 bg-secondary -z-0" />
        <div
          className="absolute top-1/2 start-4 h-1 -translate-y-1/2 bg-emerald-500 transition-all duration-500 -z-0"
          style={{ width: `${(currentIdx / (steps.length - 1)) * 90}%` }}
        />

        {steps.map((st, idx) => {
          const isDone = idx <= currentIdx;
          const isCurrent = idx === currentIdx;
          return (
            <div
              key={st.key}
              className="relative z-10 flex flex-col items-center gap-1.5 bg-card px-1"
            >
              <div
                className={`grid h-8 w-8 place-items-center rounded-full text-xs font-black transition-all ${
                  isDone
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30 scale-105"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {isDone ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
              </div>
              <span
                className={`text-[11px] font-bold ${isCurrent ? "text-emerald-700 dark:text-emerald-400 font-extrabold" : "text-muted-foreground"}`}
              >
                {st.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    new: {
      label: "طلب جديد",
      cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
    },
    pending: {
      label: "قيد المراجعة",
      cls: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
    },
    confirmed: {
      label: "مؤكد",
      cls: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300",
    },
    delivering: {
      label: "جاري التوصيل",
      cls: "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300",
    },
    preparing: {
      label: "قيد التجهيز",
      cls: "bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300",
    },
    partially_delivered: {
      label: "تم التسليم جزئيًا",
      cls: "bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300",
    },
    delivery_failed: {
      label: "فشل التسليم",
      cls: "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300",
    },
    delivered: {
      label: "تم التسليم",
      cls: "bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300",
    },
    cancelled: {
      label: "ملغي",
      cls: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300",
    },
  };
  const m = map[status] ?? { label: status, cls: "bg-muted text-foreground" };
  return (
    <Badge className={`${m.cls} rounded-full px-2.5 py-0.5 text-[10px] font-extrabold border-0`}>
      {m.label}
    </Badge>
  );
}

/* ---------- Address / Profile Location ---------- */
type Address = {
  full_name: string;
  phone: string;
  address: string;
  city: string;
};

function AddressesTab({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["my-profile-address", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name,phone,address,city")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? { full_name: "", phone: "", address: "", city: "" }) as Address;
    },
  });
  const [form, setForm] = useState<Address>({ full_name: "", phone: "", address: "", city: "" });

  useEffect(() => { if (data) setForm(data); }, [data]);

  const save = async () => {
    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      full_name: form.full_name.trim() || null,
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      updated_at: new Date().toISOString(),
    });
    if (error) return toast.error(`تعذر حفظ بيانات العنوان: ${error.message}`);
    await qc.invalidateQueries({ queryKey: ["my-profile-address", userId] });
    toast.success("تم حفظ بيانات العنوان بنجاح");
  };

  if (isLoading) return <Loader />;
  return (
    <Card className="rounded-3xl border border-emerald-100 dark:border-emerald-900/30 bg-card p-6 shadow-sm">
      <h3 className="mb-2 font-display text-lg font-black text-foreground">عنوان التوصيل الافتراضي 📍</h3>
      <p className="mb-5 text-sm text-muted-foreground">قاعدة البيانات الحالية تدعم عنوانًا افتراضيًا واحدًا مرتبطًا بملفك الشخصي.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="الاسم الكامل" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} />
        <Field label="رقم الهاتف" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        <div className="sm:col-span-2"><Field label="العنوان" value={form.address} onChange={(v) => setForm({ ...form, address: v })} /></div>
        <Field label="المدينة" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
      </div>
      <div className="mt-6 flex justify-end"><Button onClick={save} className="rounded-xl">حفظ العنوان</Button></div>
    </Card>
  );
}

/* ---------- Profile ---------- */
function ProfileTab({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["my-profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState({ full_name: "", phone: "" });
  useEffect(() => {
    if (data)
      setForm({
        full_name: data.full_name ?? "",
        phone: data.phone ?? "",
      });
  }, [data]);

  const save = async () => {
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name,
        phone: form.phone,
      })
      .eq("id", userId);
    if (error) return toast.error(error.message);
    toast.success("تم تحديث معلوماتك بنجاح");
    qc.invalidateQueries({ queryKey: ["my-profile", userId] });
  };

  if (isLoading) return <Loader />;

  return (
    <Card className="rounded-3xl border border-emerald-100 dark:border-emerald-900/30 bg-card p-6 shadow-sm">
      <h3 className="mb-5 font-display text-lg font-black">بيانات الملف الشخصي</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="الاسم بالكامل"
          value={form.full_name}
          onChange={(v) => setForm({ ...form, full_name: v })}
        />
        <Field
          label="رقم الهاتف"
          value={form.phone}
          onChange={(v) => setForm({ ...form, phone: v })}
        />
      </div>
      <Button
        onClick={save}
        className="mt-6 w-full h-11 rounded-2xl hero-gradient text-primary-foreground font-black shadow-md"
      >
        حفظ التغييرات
      </Button>

      <PasswordSection />
    </Card>
  );
}

function Loader() {
  return (
    <div className="grid min-h-48 place-items-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function Empty({
  icon: Icon,
  text,
  cta,
}: {
  icon: typeof Package;
  text: string;
  cta: { label: string; to: string };
}) {
  return (
    <EmptyState
      icon={<Icon className="h-9 w-9" />}
      title={text}
      action={<Link to={cta.to}>{cta.label}</Link>}
    />
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-foreground">{label}</span>
      <Input value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-xl" />
    </label>
  );
}

/* ---------- تغيير كلمة المرور ---------- */
function PasswordSection() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < 8) return toast.error("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
    if (next !== confirm) return toast.error("كلمتا المرور غير متطابقتين");
    if (!user?.email) return toast.error("لا يوجد بريد مرتبط بالحساب");

    setSaving(true);
    const { error: verifyErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: current,
    });
    if (verifyErr) {
      setSaving(false);
      return toast.error("كلمة المرور الحالية غير صحيحة");
    }
    const { error } = await supabase.auth.updateUser({ password: next });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("تم تحديث كلمة المرور بنجاح");
    setCurrent("");
    setNext("");
    setConfirm("");
    setOpen(false);
  };

  return (
    <div className="mt-6 border-t border-border pt-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="font-display text-sm font-black">كلمة المرور</h4>
          <p className="text-[11px] text-muted-foreground">
            الحد الأدنى 8 أحرف — استخدم مزيجاً من الحروف والأرقام
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen((v) => !v)}
          className="h-10 shrink-0 rounded-2xl font-extrabold"
        >
          {open ? "إلغاء" : "تغيير كلمة المرور"}
        </Button>
      </div>

      {open && (
        <form onSubmit={submit} className="mt-4 grid gap-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold">كلمة المرور الحالية</span>
            <Input
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
              autoComplete="current-password"
              className="h-10 rounded-xl"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold">كلمة المرور الجديدة</span>
            <Input
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="h-10 rounded-xl"
            />
            <span className="mt-1 block text-[11px] text-muted-foreground">8 أحرف على الأقل</span>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold">تأكيد كلمة المرور الجديدة</span>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="h-10 rounded-xl"
            />
          </label>
          <Button
            type="submit"
            disabled={saving}
            className="h-11 rounded-2xl hero-gradient text-primary-foreground font-black"
          >
            {saving ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
            حفظ كلمة المرور
          </Button>
        </form>
      )}
    </div>
  );
}

