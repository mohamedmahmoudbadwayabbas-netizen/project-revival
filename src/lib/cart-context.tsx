import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { playClickSound } from "@/lib/sounds";
import { supabase } from "@/lib/supabase-loose";
import { toast } from "sonner";
import { isEnabled } from "@/lib/feature-flags";
import { track } from "@/lib/analytics";
import {
  clearGuestCart,
  computeMergeUpserts,
  readGuestCart,
  writeGuestCart,
  type GuestCartLine,
} from "@/lib/guest-cart-storage";

export type Product = {
  id: string;
  name: string;
  name_ar?: string | null;
  category_id: string | null;
  description: string | null;
  description_ar?: string | null;
  price_per_unit: number;
  old_price: number | null;
  image_url: string | null;
  images?: string[] | null;
  is_by_weight: boolean;
  unit_label: string;
  is_popular: boolean;
  is_on_sale: boolean;
  is_featured?: boolean;
  is_active?: boolean | null;
  stock_quantity?: number;
  low_stock_threshold?: number;
  views_count?: number | null;
  purchase_count?: number | null;
  avg_rating?: number | null;
  reviews_count?: number | null;
  cooking_tip?: string | null;
  is_top_seller?: boolean | null;
  characteristics?: string[] | string | null;
  storage_instructions?: string | null;
  storageInstructions?: string | null;
  origin_source?: string | null;
  originSource?: string | null;
  nutritional_info?: Record<string, string> | string | null;
  nutritionalInfo?: Record<string, string> | string | null;
};

export type SubstitutionPreference = "call_me" | "auto_best" | "do_not_substitute";
export type CartItem = { product: Product; quantity: number; selected_weight?: number; selected_weight_label?: string; substitution_preference?: SubstitutionPreference; estimated_price?: number };

export const WEIGHT_OPTIONS = [
  { value: 0.25, label: "250 جم", grams: 250 }, { value: 0.5, label: "500 جم", grams: 500 },
  { value: 0.75, label: "750 جم", grams: 750 }, { value: 1, label: "1 كجم", grams: 1000 }, { value: 1.5, label: "1.5 كجم", grams: 1500 },
] as const;
export function formatWeightLabel(weightInKg: number) { return weightInKg >= 1 ? `${Number.isInteger(weightInKg) ? weightInKg : weightInKg.toFixed(2)} كجم` : `${Math.round(weightInKg * 1000)} جم`; }
export function calculateEstimatedPrice(product: Product, quantity: number) { return +(product.price_per_unit * quantity).toFixed(2); }
export function lineSubtotal(product: Product, quantity: number) { return calculateEstimatedPrice(product, quantity); }

type AddItemMeta = { selected_weight?: number; selected_weight_label?: string; substitution_preference?: SubstitutionPreference };
type CartContextValue = {
  items: CartItem[]; addItem: (product: Product, quantity?: number, meta?: AddItemMeta) => void; updateQuantity: (productId: string, quantity: number) => void;
  updateItemPreference: (productId: string, preference: SubstitutionPreference) => void; updateItemWeight: (productId: string, weightInKg: number) => void;
  removeItem: (productId: string) => void; clear: () => void; totalPrice: number; totalCount: number; isOpen: boolean; setOpen: (v: boolean) => void;
  isMerging: boolean;
};
const CartContext = createContext<CartContextValue | null>(null);

export const LIVE_PRODUCT_COLUMNS = "id,name,name_ar,description,description_ar,price,original_price,image_url,images,category_id,stock,rating,reviews_count,is_featured,is_active,created_at";
export function mapDbProduct(row: any): Product {
  const price = Number(row.price ?? row.price_per_unit ?? 0);
  const oldPrice = row.original_price == null ? null : Number(row.original_price);
  return {
    ...row,
    name: row.name_ar || row.name || "منتج",
    name_ar: row.name_ar ?? row.name ?? null,
    price_per_unit: price,
    old_price: oldPrice,
    stock_quantity: Number(row.stock ?? row.stock_quantity ?? 0),
    low_stock_threshold: 5,
    unit_label: row.unit_label ?? "قطعة",
    is_by_weight: Boolean(row.is_by_weight),
    is_popular: Boolean(row.is_featured),
    is_on_sale: oldPrice != null && oldPrice > price,
    avg_rating: row.rating ?? null,
    reviews_count: row.reviews_count ?? null,
    is_top_seller: false,
  };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isMerging, setIsMerging] = useState(false);
  // true فقط بعد ما سلة الضيف اتسترجعت بنجاح — يمنع الكتابة فوق التخزين بسلة فاضية بالغلط.
  const guestReady = useRef(false);

  /** سلة الضيف: استرجاع الأسطر المخزّنة + جلب الأسعار والمخزون الحالية من قاعدة البيانات. */
  const loadGuestCart = async () => {
    if (!isEnabled("ENABLE_GUEST_CART")) { guestReady.current = true; setHydrated(true); return; }
    const lines = readGuestCart();
    if (lines.length === 0) { guestReady.current = true; setItems([]); setHydrated(true); return; }
    try {
      const ids = lines.map((l) => l.productId);
      const { data: products, error } = await supabase.from("products").select(LIVE_PRODUCT_COLUMNS).eq("is_active", true).in("id", ids);
      if (error) throw error;
      const map = new Map((products ?? []).map((p) => [p.id, mapDbProduct(p)]));
      let dropped = 0;
      const restored: CartItem[] = [];
      for (const line of lines) {
        const base = map.get(line.productId);
        if (!base) { dropped++; continue; }
        const product: Product = { ...base, is_by_weight: line.byWeight ?? base.is_by_weight, unit_label: line.unitLabel ?? base.unit_label };
        if (!product.is_by_weight && (product.stock_quantity ?? 0) <= 0) { dropped++; continue; }
        const quantity = !product.is_by_weight && Number.isFinite(product.stock_quantity) ? Math.min(line.quantity, product.stock_quantity ?? line.quantity) : line.quantity;
        restored.push({
          product, quantity,
          selected_weight: line.selectedWeight ?? (product.is_by_weight ? quantity : undefined),
          selected_weight_label: product.is_by_weight ? formatWeightLabel(line.selectedWeight ?? quantity) : undefined,
          substitution_preference: line.substitution ?? "call_me",
          estimated_price: calculateEstimatedPrice(product, quantity),
        });
      }
      guestReady.current = true;
      setItems(restored);
      if (dropped > 0) toast.info("بعض المنتجات في سلتك السابقة لم تعد متوفرة وتم حذفها");
    } catch (error: any) {
      // لا نكتب فوق التخزين: السلة المحفوظة تفضل سليمة لحد ما الاتصال يرجع.
      toast.error("تعذر استرجاع سلتك المحفوظة، حدّث الصفحة وحاول مرة أخرى");
    } finally { setHydrated(true); }
  };

  /** عند تسجيل الدخول: ندمج سلة الضيف في سلة الحساب (الأكبر لكل منتج، بدون تكرار) ثم نمسح التخزين المحلي. */
  const mergeGuestIntoAccount = async (uid: string): Promise<GuestCartLine[]> => {
    if (!isEnabled("ENABLE_GUEST_CART")) return [];
    const guest = readGuestCart();
    if (guest.length === 0) return [];
    const { data: existing, error } = await supabase.from("cart_items").select("product_id,quantity").eq("user_id", uid);
    if (error) throw error;
    const remote = new Map((existing ?? []).filter((r) => r.product_id).map((r) => [r.product_id as string, Number(r.quantity ?? 0)]));
    const upserts = computeMergeUpserts(remote, guest);
    if (upserts.length > 0) {
      const { error: upsertError } = await supabase.from("cart_items").upsert(upserts.map((u) => ({ user_id: uid, product_id: u.productId, quantity: u.quantity })), { onConflict: "user_id,product_id" });
      if (upsertError) throw upsertError;
    }
    clearGuestCart(); // نمسح فقط بعد نجاح الدمج: لا فقدان للسلة في أي حالة
    return guest;
  };

  const loadUserCart = async (uid: string) => {
    setIsMerging(true);
    try {
      let mergedGuest: GuestCartLine[] = [];
      try { mergedGuest = await mergeGuestIntoAccount(uid); }
      catch { toast.error("تعذر دمج سلتك السابقة مع حسابك، لم تُحذف وسنحاول عند الدخول التالي"); }
      const guestMeta = new Map(mergedGuest.map((l) => [l.productId, l]));
      const { data, error } = await supabase.from("cart_items").select("id,user_id,product_id,quantity,created_at").eq("user_id", uid).order("created_at", { ascending: true });
      if (error) throw error;
      const productIds = [...new Set((data ?? []).map((r) => r.product_id).filter(Boolean))] as string[];
      const { data: products, error: productError } = productIds.length ? await supabase.from("products").select(LIVE_PRODUCT_COLUMNS).eq("is_active", true).in("id", productIds) : { data: [], error: null };
      if (productError) throw productError;
      const map = new Map((products ?? []).map((p) => [p.id, mapDbProduct(p)]));
      setItems((data ?? []).filter((r) => r.product_id && map.has(r.product_id)).map((r) => {
        const meta = guestMeta.get(r.product_id!);
        const base = map.get(r.product_id!)!; const quantity = Number(r.quantity ?? 0);
        const product: Product = meta ? { ...base, is_by_weight: meta.byWeight ?? base.is_by_weight, unit_label: meta.unitLabel ?? base.unit_label } : base;
        return { product, quantity, estimated_price: calculateEstimatedPrice(product, quantity), substitution_preference: meta?.substitution ?? ("call_me" as const) };
      }));
    } catch (error: any) {
      setItems([]); toast.error(`تعذر تحميل سلة حسابك: ${error.message}`);
    } finally { setHydrated(true); setIsMerging(false); }
  };

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => { if (!active) return; const uid = data.session?.user.id ?? null; setUserId(uid); if (uid) void loadUserCart(uid); else void loadGuestCart(); });
    const { data: authSub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      const uid = session?.user.id ?? null; setUserId(uid);
      if (event === "SIGNED_IN" && uid) void loadUserCart(uid);
      if (event === "SIGNED_OUT") { guestReady.current = true; setItems([]); setHydrated(true); }
    });
    return () => { active = false; authSub.subscription.unsubscribe(); };
  }, []);

  // حفظ تلقائي لسلة الضيف عند أي تغيير (Zero Cart Loss).
  useEffect(() => {
    if (!hydrated || userId || !guestReady.current || !isEnabled("ENABLE_GUEST_CART")) return;
    writeGuestCart(items.map((i): GuestCartLine => ({
      productId: i.product.id,
      quantity: i.quantity,
      selectedWeight: i.selected_weight,
      substitution: i.substitution_preference,
      byWeight: i.product.is_by_weight,
      unitLabel: i.product.unit_label,
    })));
  }, [items, hydrated, userId]);

  const syncUserItem = (productId: string, quantity: number) => {
    if (!userId) return;
    void (async () => {
      if (quantity <= 0) {
        const { error } = await supabase.from("cart_items").delete().eq("user_id", userId).eq("product_id", productId);
        if (error) toast.error(`تعذر حذف الصنف من السلة: ${error.message}`);
        return;
      }
      const { error } = await supabase.from("cart_items").upsert({ user_id: userId, product_id: productId, quantity }, { onConflict: "user_id,product_id" });
      if (error) toast.error(`تعذر حفظ السلة: ${error.message}`);
    })();
  };

  const value = useMemo<CartContextValue>(() => {
    const addItem = (product: Product, quantity = 1, meta?: AddItemMeta) => {
      if (!product.is_by_weight && (product.stock_quantity ?? 0) <= 0) {
        toast.info("هذا المنتج غير متوفر حالياً");
        return;
      }
      playClickSound();
      track("add_to_cart", { product_id: product.id, quantity, price: product.price_per_unit });
      setItems((prev) => {
        const existing = prev.find((i) => i.product.id === product.id);
        const requestedQty = existing ? existing.quantity + quantity : quantity;
        const nextQty = +(!product.is_by_weight && Number.isFinite(product.stock_quantity)
          ? Math.min(requestedQty, product.stock_quantity ?? requestedQty)
          : requestedQty).toFixed(3);
        const item: CartItem = { product, quantity: nextQty, selected_weight: meta?.selected_weight ?? (product.is_by_weight ? nextQty : undefined), selected_weight_label: meta?.selected_weight_label ?? (product.is_by_weight ? formatWeightLabel(nextQty) : undefined), substitution_preference: meta?.substitution_preference ?? existing?.substitution_preference ?? "call_me", estimated_price: calculateEstimatedPrice(product, nextQty) };
        return existing ? prev.map((i) => i.product.id === product.id ? item : i) : [...prev, item];
      });
      const currentQty = items.find((i) => i.product.id === product.id)?.quantity ?? 0;
      const requestedQty = currentQty + quantity;
      syncUserItem(product.id, +(!product.is_by_weight && Number.isFinite(product.stock_quantity)
        ? Math.min(requestedQty, product.stock_quantity ?? requestedQty)
        : requestedQty).toFixed(3));
    };
    const updateQuantity = (productId: string, quantity: number) => {
      const item = items.find((i) => i.product.id === productId);
      const next = item && !item.product.is_by_weight && Number.isFinite(item.product.stock_quantity)
        ? Math.min(quantity, item.product.stock_quantity ?? quantity)
        : quantity;
      if (next <= 0) track("remove_from_cart", { product_id: productId });
      setItems((prev) => prev.map((i) => i.product.id === productId ? { ...i, quantity: next, estimated_price: calculateEstimatedPrice(i.product, next) } : i).filter((i) => i.quantity > 0));
      syncUserItem(productId, next);
    };
    const updateItemPreference = (productId: string, preference: SubstitutionPreference) => setItems((prev) => prev.map((i) => i.product.id === productId ? { ...i, substitution_preference: preference } : i));
    const updateItemWeight = (productId: string, weightInKg: number) => { setItems((prev) => prev.map((i) => i.product.id === productId ? { ...i, quantity: weightInKg, selected_weight: weightInKg, selected_weight_label: formatWeightLabel(weightInKg), estimated_price: calculateEstimatedPrice(i.product, weightInKg) } : i)); syncUserItem(productId, weightInKg); };
    const removeItem = (productId: string) => { track("remove_from_cart", { product_id: productId }); setItems((prev) => prev.filter((i) => i.product.id !== productId)); syncUserItem(productId, 0); };
    const clear = () => { const ids = items.map((i) => i.product.id); setItems([]); for (const id of ids) syncUserItem(id, 0); };
    const totalPrice = items.reduce((sum, i) => sum + lineSubtotal(i.product, i.quantity), 0);
    const totalCount = items.reduce((sum, i) => sum + (i.product.is_by_weight ? 1 : i.quantity), 0);
    return { items, addItem, updateQuantity, updateItemPreference, updateItemWeight, removeItem, clear, totalPrice, totalCount, isOpen, setOpen, isMerging };
  }, [items, isOpen, isMerging, userId]);

  if (!hydrated) return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
export function useCart() { const ctx = useContext(CartContext); if (!ctx) throw new Error("useCart must be used within CartProvider"); return ctx; }
