import { supabase } from "@/lib/supabase-loose";

export type OrderItemView = {
  id: string;
  product_id: string;
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
  unit_label: string;
  is_by_weight?: boolean;
};

export type OrderView = {
  id: string;
  user_id: string | null;
  status: string;
  total_amount: number;
  shipping_address: Record<string, unknown> | null;
  created_at: string;
  customer_name: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  delivery_zone_id: string | null;
  delivery_method: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  coupon_code: string | null;
  ref_source: string | null;
  delivery_fee: number;
  discount_amount: number;
  items: OrderItemView[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

const ORDER_COLUMNS =
  "id,user_id,status,total_amount,shipping_address,created_at,customer_name,phone,address,notes,delivery_zone_id,delivery_method,payment_method,payment_reference,coupon_code,ref_source,delivery_fee,discount_amount";

export async function fetchOrdersWithItems(options?: {
  userId?: string;
  statuses?: string[];
  limit?: number;
}): Promise<OrderView[]> {
  let query = supabase
    .from("orders")
    .select(ORDER_COLUMNS)
    .order("created_at", { ascending: false });
  if (options?.userId) query = query.eq("user_id", options.userId);
  if (options?.statuses?.length) query = query.in("status", options.statuses);
  if (options?.limit) query = query.limit(options.limit);

  const { data: orders, error: ordersError } = await query;
  if (ordersError) throw ordersError;
  if (!orders?.length) return [];

  const orderIds = orders.map((o) => o.id);
  const { data: rows, error: itemsError } = await supabase
    .from("order_items")
    .select("id,order_id,product_id,quantity,price")
    .in("order_id", orderIds);
  if (itemsError) throw itemsError;

  const productIds = [
    ...new Set(
      (rows ?? [])
        .map((r) => r.product_id)
        .filter((productId): productId is string => Boolean(productId)),
    ),
  ];
  const productMap = new Map<string, { name: string; name_ar: string | null }>();
  if (productIds.length) {
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id,name,name_ar")
      .in("id", productIds);
    if (productsError) throw productsError;
    for (const p of products ?? []) productMap.set(p.id, { name: p.name, name_ar: p.name_ar });
  }

  const itemsByOrder = new Map<string, OrderItemView[]>();
  for (const row of rows ?? []) {
    const product = row.product_id ? productMap.get(row.product_id) : undefined;
    const item: OrderItemView = {
      id: row.id,
      product_id: row.product_id ?? "",
      name: product?.name_ar || product?.name || "صنف",
      quantity: Number(row.quantity ?? 1),
      price: Number(row.price ?? 0),
      subtotal: Number(row.price ?? 0) * Number(row.quantity ?? 1),
      unit_label: "قطعة",
    };
    const list = itemsByOrder.get(row.order_id ?? "") ?? [];
    list.push(item);
    itemsByOrder.set(row.order_id ?? "", list);
  }

  return orders.map((o: any) => ({
    id: o.id,
    user_id: o.user_id ?? null,
    status: o.status ?? "pending",
    created_at: o.created_at ?? "",
    shipping_address: asRecord(o.shipping_address),
    total_amount: Number(o.total_amount ?? 0),
    customer_name: o.customer_name ?? null,
    phone: o.phone ?? null,
    address: o.address ?? null,
    notes: o.notes ?? null,
    delivery_zone_id: o.delivery_zone_id ?? null,
    delivery_method: o.delivery_method ?? null,
    payment_method: o.payment_method ?? null,
    payment_reference: o.payment_reference ?? null,
    coupon_code: o.coupon_code ?? null,
    ref_source: o.ref_source ?? null,
    delivery_fee: Number(o.delivery_fee ?? 0),
    discount_amount: Number(o.discount_amount ?? 0),
    items: itemsByOrder.get(o.id) ?? [],
  }));
}
