import { supabase } from "@/integrations/supabase/client";

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
 * Fetches real supermarket branches directly from Supabase delivery_zones & store_settings
 */
export async function fetchLiveBranches(): Promise<LiveBranch[]> {
  try {
    const [
      { data: zonesData },
      { data: settingsData },
      { data: ordersData },
      { data: productsData },
    ] = await Promise.all([
      supabase.from("delivery_zones").select("*").order("sort_order", { ascending: true }),
      supabase.from("store_settings").select("site_name,store_address,whatsapp_number").limit(1),
      supabase.from("orders").select("id,delivery_zone_id,total_price,status,created_at,address"),
      supabase.from("products").select("id,stock"),
    ]);

    const orders = ordersData || [];
    const products = productsData || [];
    const mainStoreAddress = settingsData?.[0]?.store_address || "الفرع الرئيسي";
    const mainStorePhone = settingsData?.[0]?.whatsapp_number || "+201000000000";

    const zones = zonesData || [];

    if (zones.length > 0) {
      return zones.map((z: any, idx: number) => {
        const branchStats = calculateLiveStats(orders, products, z.id);
        const areaList = [z.area, z.city, z.governorate].filter(Boolean) as string[];

        return {
          id: z.id,
          name: z.name || `فرع ${z.city || z.governorate || idx + 1}`,
          city: z.city || z.governorate || "القاهرة الكبرى",
          governorate: z.governorate || "القاهرة",
          address: z.area ? `${z.area}، ${z.city || ""}` : mainStoreAddress,
          phone: mainStorePhone,
          status: z.is_active !== false ? "open" : "closed",
          isMain: idx === 0 || z.sort_order === 1,
          deliveryZones: areaList.length > 0 ? areaList : [z.name],
          estimatedMinutes: z.estimated_minutes || 35,
          fee: z.fee || 0,
          minOrderAmount: z.min_order_amount || 0,
          stats: branchStats,
        };
      });
    }

    return [];
  } catch (err) {
    console.error("Error fetching live branches from Supabase:", err);
    return [];
  }
}
