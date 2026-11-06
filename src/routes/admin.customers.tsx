import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Eye, LoaderCircle, Phone, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchOrdersWithItems, type OrderView } from "@/services/orderDataService";

export const Route = createFileRoute("/admin/customers")({
  head: () => ({
    meta: [
      { title: "العملاء — لوحة التحكم" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: CustomersPage,
});

type Customer = {
  key: string;
  name: string;
  phone: string;
  userId: string | null;
  address: string;
  orders: OrderView[];
  totalSpent: number;
  latestOrderAt: string;
};

function valueFromAddress(order: OrderView, key: string) {
  const address = order.shipping_address;
  const value = address?.[key];
  return typeof value === "string" ? value.trim() : "";
}

function customerKey(order: OrderView) {
  const phone = (order.phone || valueFromAddress(order, "phone")).replace(/\D/g, "");
  return phone ? `phone:${phone}` : order.user_id ? `user:${order.user_id}` : `order:${order.id}`;
}

function statusName(status: string) {
  const labels: Record<string, string> = {
    pending: "جديد",
    confirmed: "قيد التجهيز",
    preparing: "قيد التجهيز",
    shipped: "جاري التوصيل",
    delivered: "مكتمل",
    partially_delivered: "تسليم جزئي",
    delivery_failed: "تعذر التوصيل",
    cancelled: "ملغي",
  };
  return labels[status] || status;
}

function money(value: number) {
  return `${new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 2 }).format(value)} ج.م`;
}

function CustomersPage() {
  const [orders, setOrders] = useState<OrderView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchOrdersWithItems()
      .then((data) => {
        if (!active) return;
        setOrders(data);
        const requestedPhone = new URLSearchParams(window.location.search).get("phone")?.replace(/\D/g, "");
        if (requestedPhone) {
          const matchingOrder = data.find((order) =>
            (order.phone || valueFromAddress(order, "phone")).replace(/\D/g, "").endsWith(requestedPhone),
          );
          if (matchingOrder) setSelectedKey(customerKey(matchingOrder));
        }
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "تعذر تحميل بيانات العملاء.");
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const customers = useMemo(() => {
    const grouped = new Map<string, Customer>();
    for (const order of orders) {
      const key = customerKey(order);
      const address = order.address || valueFromAddress(order, "address") || valueFromAddress(order, "full_address");
      const phone = order.phone || valueFromAddress(order, "phone");
      const name = order.customer_name || valueFromAddress(order, "customer_name") || valueFromAddress(order, "name");
      const customer = grouped.get(key) ?? {
        key,
        name: name || "عميل بدون اسم مسجل",
        phone,
        userId: order.user_id,
        address,
        orders: [],
        totalSpent: 0,
        latestOrderAt: order.created_at,
      };
      customer.orders.push(order);
      customer.totalSpent += Number(order.total_amount || 0);
      if (!customer.phone && phone) customer.phone = phone;
      if (!customer.address && address) customer.address = address;
      if (name && customer.name === "عميل بدون اسم مسجل") customer.name = name;
      if (new Date(order.created_at).getTime() > new Date(customer.latestOrderAt).getTime()) {
        customer.latestOrderAt = order.created_at;
      }
      grouped.set(key, customer);
    }
    return [...grouped.values()].sort(
      (a, b) => new Date(b.latestOrderAt).getTime() - new Date(a.latestOrderAt).getTime(),
    );
  }, [orders]);

  const filteredCustomers = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("ar");
    if (!term) return customers;
    return customers.filter((customer) =>
      `${customer.name} ${customer.phone} ${customer.address}`.toLocaleLowerCase("ar").includes(term),
    );
  }, [customers, search]);
  const selectedCustomer = customers.find((customer) => customer.key === selectedKey) ?? null;

  return (
    <section className="admin-customers" dir="rtl">
      {selectedCustomer ? (
        <CustomerDetails customer={selectedCustomer} onBack={() => setSelectedKey(null)} />
      ) : (
        <>
          <header className="admin-customers__heading">
            <div>
              <span className="admin-customers__eyebrow"><Users size={15} /> قاعدة العملاء</span>
              <h1>العملاء</h1>
              <p>بيانات العملاء وسجل مشترياتهم كما وردت في الطلبات المسجلة.</p>
            </div>
            <strong>{customers.length} عميل</strong>
          </header>

          <div className="admin-customers__toolbar">
            <Search size={17} aria-hidden="true" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث باسم العميل أو رقم الهاتف أو العنوان" aria-label="بحث العملاء" />
          </div>

          {loading ? (
            <div className="admin-customers__message"><LoaderCircle className="animate-spin" size={23} /> جارٍ تحميل بيانات العملاء…</div>
          ) : error ? (
            <div className="admin-customers__message is-error">تعذر تحميل العملاء: {error}</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="admin-customers__empty">
              <span><Users size={23} /></span>
              <h2>{customers.length ? "لا توجد نتائج مطابقة" : "لا يوجد عملاء مسجلون حتى الآن"}</h2>
              <p>{customers.length ? "جرّب البحث باسم أو رقم مختلف." : "ستظهر بيانات العميل هنا بعد تسجيل أول طلب حقيقي في المتجر."}</p>
            </div>
          ) : (
            <div className="admin-customers__table-wrap">
              <table className="admin-customers__table">
                <thead><tr><th>العميل</th><th>رقم الهاتف</th><th>عدد الطلبات</th><th>إجمالي المشتريات</th><th>آخر طلب</th><th>العنوان</th><th>التفاصيل</th></tr></thead>
                <tbody>
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.key}>
                      <td><strong>{customer.name}</strong>{customer.userId && <small>حساب مسجل</small>}</td>
                      <td>{customer.phone || "غير مسجل"}</td>
                      <td>{customer.orders.length}</td>
                      <td className="admin-customers__amount">{money(customer.totalSpent)}</td>
                      <td>{new Date(customer.latestOrderAt).toLocaleDateString("ar-EG")}</td>
                      <td className="admin-customers__address">{customer.address || "غير مسجل"}</td>
                      <td><Button size="sm" variant="outline" onClick={() => setSelectedKey(customer.key)}><Eye size={15} /> عرض التفاصيل</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function CustomerDetails({ customer, onBack }: { customer: Customer; onBack: () => void }) {
  return (
    <section className="admin-customer-details">
      <header className="admin-customers__heading">
        <div>
          <button className="admin-customer-details__back" type="button" onClick={onBack}><ArrowRight size={16} /> العملاء</button>
          <h1>{customer.name}</h1>
          <p>ملف العميل وسجل طلباته.</p>
        </div>
        <div className="admin-customer-details__contact">
          {customer.phone ? <a href={`tel:${customer.phone}`}><Phone size={15} /> {customer.phone}</a> : <span>رقم الهاتف غير مسجل</span>}
        </div>
      </header>

      <div className="admin-customer-details__stats">
        <article><span>عدد الطلبات</span><strong>{customer.orders.length}</strong></article>
        <article><span>إجمالي المشتريات</span><strong>{money(customer.totalSpent)}</strong></article>
        <article><span>آخر طلب</span><strong>{new Date(customer.latestOrderAt).toLocaleDateString("ar-EG")}</strong></article>
      </div>

      <article className="admin-customer-details__address"><span>عنوان التوصيل المسجل</span><strong>{customer.address || "لا يوجد عنوان مسجل في الطلبات."}</strong></article>

      <section className="admin-customer-details__history">
        <div className="admin-customer-details__history-title"><h2>سجل الطلبات</h2><span>{customer.orders.length} طلب</span></div>
        <div className="admin-customers__table-wrap">
          <table className="admin-customers__table">
            <thead><tr><th>رقم الطلب</th><th>التاريخ</th><th>الحالة</th><th>عدد الأصناف</th><th>طريقة الدفع</th><th>الإجمالي</th></tr></thead>
            <tbody>{customer.orders.map((order) => (
              <tr key={order.id}>
                <td><bdi>#{order.id.slice(0, 8)}</bdi></td>
                <td>{new Date(order.created_at).toLocaleString("ar-EG")}</td>
                <td><span className={`admin-customers__status status-${order.status}`}>{statusName(order.status)}</span></td>
                <td>{order.items.length}</td>
                <td>{order.payment_method || "غير مسجل"}</td>
                <td className="admin-customers__amount">{money(Number(order.total_amount || 0))}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
