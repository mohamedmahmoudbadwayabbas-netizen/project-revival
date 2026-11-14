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
  danger: "bg-rose-500/15 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400",
  warn: "bg-amber-500/15 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400",
  info: "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
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
        supabase
          .from("products")
          .select("id,name,stock,stock_quantity,low_stock_threshold,is_active")
          .eq("is_active", true)
          .limit(1000),
        supabase
          .from("orders")
          .select("delivery_slot,status,created_at")
          .gte("created_at", since.toISOString())
          .limit(1000),
        supabase
          .from("cart_items")
          .select("user_id,quantity,products(price,price_per_unit)")
          .gte("updated_at", weekAgo)
          .limit(1000),
      ]);

      const low = (prods.data ?? []).filter((p) => {
        const qty = Number(p.stock ?? p.stock_quantity ?? 0);
        const threshold = Number(p.low_stock_threshold ?? 5);
        return qty <= threshold;
      });
      const slotCount: Record<string, number> = {};
      (orders.data ?? []).forEach((o) => {
        if (o.delivery_slot) slotCount[o.delivery_slot] = (slotCount[o.delivery_slot] ?? 0) + 1;
      });
      const busiest = Object.entries(slotCount).sort((a, b) => b[1] - a[1])[0];
      const pending = (orders.data ?? []).filter(
        (o) => o.status === "pending" || o.status === "new",
      ).length;
      const cartUsers = new Set((carts.data ?? []).map((c) => c.user_id));
      const cartValue = (carts.data ?? []).reduce(
        (s, c: any) =>
          s + (Number(c.products?.price_per_unit ?? c.products?.price) || 0) * c.quantity,
        0,
      );

      const list: Insight[] = [];
      list.push(
        prods.error
          ? {
              key: "stock",
              icon: PackageX,
              tone: "warn",
              title: "تعذر قراءة حالة المخزون",
              detail: "تحقق من الاتصال أو راجع صفحة المنتجات مباشرة",
              action: "فتح المنتجات",
              to: "/admin/products",
            }
          : low.length
            ? {
                key: "stock",
                icon: PackageX,
                tone: "danger",
                title: `${low.length} منتج تحت حد الأمان`,
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
                detail: "لا توجد منتجات نشطة تحت حد الأمان الآن",
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
              tone: pending ? "warn" : "info",
              title: pending ? `${pending} طلب ينتظر التأكيد` : "وتيرة الطلبات مستقرة",
              detail: pending
                ? "راجع الطلبات الجديدة وابدأ التجهيز سريعًا"
                : "لا توجد طلبات معلقة بانتظار التأكيد حاليًا",
              action: "إدارة الطلبات",
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
              detail: `قيمة السلال المتروكة حوالي ${Math.round(cartValue).toLocaleString("en-US")} ج.م`,
              action: "إنشاء كوبون تشجيعي",
              to: "/admin/coupons",
            }
          : {
              key: "cart",
              icon: Sparkles,
              tone: "info",
              title: "اسأل مساعد الوادي",
              detail: "اطلب تحليل مبيعاتك أو اقتراح عرض ترويجي جديد",
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
      className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs"
    >
      <div className="mb-3.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-foreground">قرارات ذكية لليوم</h2>
            <p className="text-[11px] text-muted-foreground">
              مستخرجة تلقائيًا من بيانات متجرك الحالية
            </p>
          </div>
        </div>
      </div>
      {items === null ? (
        <div className="grid gap-3 md:grid-cols-3">
          {[1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="h-36 rounded-xl border border-border bg-muted/40 animate-pulse"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4" /> تعذر تحميل المؤشرات الفورية حاليًا
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {items.map((i) => (
            <div
              key={i.key}
              className="flex flex-col rounded-xl border border-border bg-background/60 p-4 transition-all hover:border-primary/30 hover:shadow-xs"
            >
              <div className="flex items-center gap-2.5 mb-2.5">
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${toneCls[i.tone]}`}
                >
                  <i.icon className="h-4 w-4" />
                </span>
                <h3 className="text-xs sm:text-sm font-bold text-foreground leading-snug">
                  {i.title}
                </h3>
              </div>
              <p className="line-clamp-2 flex-1 text-xs leading-5 text-muted-foreground">
                {i.detail}
              </p>
              <Link
                to={i.to}
                className="mt-3 inline-flex items-center justify-between gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground transition hover:border-primary/40 hover:text-primary"
              >
                <span>{i.action}</span>
                <ArrowLeft className="h-3.5 w-3.5" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
