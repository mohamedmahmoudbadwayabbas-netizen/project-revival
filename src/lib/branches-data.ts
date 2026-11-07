import { supabase } from "@/lib/supabase-loose";

export interface BranchStats {
  todayRevenue: number;
  todayOrders: number;
  activeOrders: number;
  totalProducts: number;
  stockHealth: number;
  lowStockItems: number;
}

export interface LiveBranch {
  id: string;
  name: string;
  nameEn?: string;
  city: string;
  governorate?: string;
  address: string;
  phone: string;
  status: "open" | "busy" | "closed";
  isMain?: boolean;
  deliveryZones: string[];
  estimatedMinutes?: number;
  fee?: number;
  minOrderAmount?: number;
  stats: BranchStats;
}

export const UNIFIED_ALL_BRANCHES_ID = "all";

/**
 * Calculates live branch stats from real Supabase orders & products
 */
export function calculateLiveStats(orders: any[], products: any[], branchId?: string): BranchStats {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  // Filter orders for branch if branchId is not 'all' or undefined
  const relevantOrders =
    branchId && branchId !== UNIFIED_ALL_BRANCHES_ID
      ? orders.filter(
          (o) =>
            o.delivery_zone_id === branchId ||
            o.deliveryZoneId === branchId ||
            (o.address && o.address.toLowerCase().includes(branchId.toLowerCase())),
        )
      : orders;

  const validRevenueOrders = relevantOrders.filter((o) => o.status !== "cancelled");

  // Today's orders
  const todayOrdersList = validRevenueOrders.filter((o) => {
    const orderTime = new Date(o.created_at || o.createdAt).getTime();
    return orderTime >= todayStart;
  });

  const todayRevenue = todayOrdersList.reduce(
    (sum, o) => sum + Number(o.total_price || o.total_amount || o.totalPrice || 0),
    0,
  );

  // Active orders (pending, processing, delivering, confirmed)
  const activeOrders = relevantOrders.filter((o) => {
    const s = (o.status || "").toLowerCase();
    return (
      s === "new" ||
      s === "pending" ||
      s === "processing" ||
      s === "confirmed" ||
      s === "delivering" ||
      s === "shipped" ||
      s === "ready"
    );
  }).length;

  const totalProducts = products.length;
  const lowStockCount = products.filter((p) => {
    const stock = Number(p.stock_quantity ?? p.stock ?? 0);
    const threshold = 5;
    return stock <= threshold;
  }).length;

  const stockHealth =
    totalProducts > 0
      ? Math.max(
          0,
          Math.min(100, Math.round(((totalProducts - lowStockCount) / totalProducts) * 100)),
        )
      : 100;

  return {
    todayRevenue: Number(todayRevenue.toFixed(2)),
    todayOrders: todayOrdersList.length,
    activeOrders,
    totalProducts,
    stockHealth,
    lowStockItems: lowStockCount,
  };
}

/**
 * Fetches only persisted branches. Delivery zones describe coverage and must
 * not be presented as physical stores.
 */
export async function fetchLiveBranches(): Promise<LiveBranch[]> {
  try {
    const [
      { data: branchesData, error: branchesError },
      { data: ordersData },
      { data: productsData },
    ] = await Promise.all([
      supabase
        .from("branches")
        .select(
          "id,name,name_en,city,governorate,address,phone,status,is_main,delivery_zones,estimated_minutes,fee,min_order_amount,is_active",
        )
        .eq("is_active", true)
        .order("name", { ascending: true }),
      supabase.from("orders").select("id,delivery_zone_id,total_price,status,created_at,address"),
      supabase.from("products").select("id,stock"),
    ]);

    if (branchesError) {
      console.error("[Branches] Failed to load persisted branches:", branchesError.message);
      return [];
    }

    const orders = ordersData || [];
    const products = productsData || [];
    return (branchesData ?? []).map((branch) => ({
      id: branch.id,
      name: branch.name,
      nameEn: branch.name_en ?? undefined,
      city: branch.city ?? "",
      governorate: branch.governorate ?? undefined,
      address: branch.address ?? "",
      phone: branch.phone ?? "",
      status: branch.status ?? "closed",
      isMain: Boolean(branch.is_main),
      deliveryZones: Array.isArray(branch.delivery_zones) ? branch.delivery_zones : [],
      estimatedMinutes: branch.estimated_minutes ?? undefined,
      fee: branch.fee ?? undefined,
      minOrderAmount: branch.min_order_amount ?? undefined,
      stats: calculateLiveStats(orders, products, branch.id),
    }));
  } catch (err) {
    console.error("Error fetching live branches from Supabase:", err);
    return [];
  }
}
