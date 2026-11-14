import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { PackageX, Clock, ShoppingCart, Sparkles, ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase-loose";

type Insight = {
  key: string;
  icon: typeof PackageX;
  tone: "danger" | "warn" | "info";
  title: string;
  detail: string;
  action: string;
  to: "/admin/products" | "/admin/orders" | "/admin/coupons" | "/admin/copilot";
};

const toneCls = {
  danger: "bg-destructive text-destructive-foreground",
  warn: "bg-accent text-accent-foreground",
  info: "bg-primary text-primary-foreground",
};

export function SmartInsights() {
  const [items, setItems] = useState<Insight[] | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const since = new Date();
      since.setHours(0, 0, 0, 0);
      const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
      const [prods, orders, carts] = await Promise.all([
        supabase.from("products").select("id,name,stock_quantity,low_stock_threshold").limit(1000),
        supabase
          .from("orders")
          .select("delivery_slot,status,created_at")
          .gte("created_at", since.toISOString())
          .limit(1000),
        supabase
          .from("cart_items")
          .select("user_id,quantity,products(price)")
          .gte("updated_at", weekAgo)
          .limit(1000),
      ]);
      const low = (prods.data ?? []).filter(
        (p) => (p.stock_quantity ?? 0) <= (p.low_stock_threshold ?? 5),
      );
      const slotCount: Record<string, number> = {};
      (orders.data ?? []).forEach((o) => {
        if (o.delivery_slot) slotCount[o.delivery_slot] = (slotCount[o.delivery_slot] ?? 0) + 1;
      });
      const busiest = Object.entries(slotCount).sort((a, b) => b[1] - a[1])[0];
      const pending = (orders.data ?? []).filter((o) => o.status === "pending").length;
      const cartUsers = new Set((carts.data ?? []).map((c) => c.user_id));
      const cartValue = (carts.data ?? []).reduce(
        (s, c: any) => s + (Number(c.products?.price) || 0) * c.quantity,
        0,
      );

      const list: Insight[] = [];
      list.push(
        low.length
          ? {
              key: "stock",
              icon: PackageX,
              tone: "danger",
              title: `${low.length} منتج أوشك على النفاد`,
              detail: low
                .slice(0, 3)
                .map((p) => p.name)
                .join("، "),
              action: "تعديل المخزون",
              to: "/admin/products",
            }
          : {
              key: "stock",
              icon: PackageX,
              tone: "info",
              title: "المخزون في أمان",
              detail: "لا توجد منتجات تحت حد الأمان الآن",
              action: "عرض المنتجات",
              to: "/admin/products",
            },
      );
      list.push(
        busiest
          ? {
              key: "slot",
              icon: Clock,
              tone: "warn",
              title: `أكثر فترة ازدحامًا: ${busiest[0]}`,
              detail: `${busiest[1]} طلب اليوم في هذه الفترة · ${pending} طلب ينتظر التأكيد`,
              action: "إدارة الطلبات",
              to: "/admin/orders",
            }
          : {
              key: "slot",
              icon: Clock,
              tone: "info",
              title: pending ? `${pending} طلب ينتظر التأكيد` : "لا طلبات جديدة اليوم بعد",
              detail: "تابع الطلبات أولًا بأول",
              action: "الطلبات",
              to: "/admin/orders",
            },
      );
      list.push(
        cartUsers.size
          ? {
              key: "cart",
              icon: ShoppingCart,
              tone: "warn",
              title: `${cartUsers.size} عميل ترك سلته`,
              detail: `قيمة السلال المتروكة حوالي ${Math.round(cartValue).toLocaleString("ar-EG")} ج.م`,
              action: "إنشاء كوبون تشجيعي",
              to: "/admin/coupons",
            }
          : {
              key: "cart",
              icon: Sparkles,
              tone: "info",
              title: "اسأل مساعد الوادي",
              detail: "اطلب تحليل مبيعاتك أو اقتراح عرض جديد",
              action: "فتح المساعد",
              to: "/admin/copilot",
            },
      );
      if (alive) setItems(list);
    })().catch(() => alive && setItems([]));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section
      aria-label="الرؤى والقرارات الذكية"
      className="rounded-2xl border border-border bg-card p-4 shadow-sm"
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-sm font-bold text-foreground">قرارات ذكية لليوم</h2>
          <p className="text-[11px] text-muted-foreground">مستخرجة تلقائيًا من بيانات متجرك الآن</p>
        </div>
      </div>
      {items === null ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> جارٍ تحليل المتجر…
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {items.map((i) => (
            <div
              key={i.key}
              className="flex flex-col rounded-xl border border-border bg-background p-4 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span
                className={`mb-3 grid h-9 w-9 place-items-center rounded-lg ${toneCls[i.tone]}`}
              >
                <i.icon className="h-4 w-4" />
              </span>
              <h3 className="text-sm font-bold text-foreground">{i.title}</h3>
              <p className="mt-1 line-clamp-2 flex-1 text-xs leading-5 text-muted-foreground">
                {i.detail}
              </p>
              <Link
                to={i.to}
                className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground transition hover:opacity-90"
              >
                {i.action} <ArrowLeft className="h-3.5 w-3.5" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
