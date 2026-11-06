import React, { useState, useEffect, useCallback } from "react";
import {
  ShoppingBag,
  MessageSquare,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Send,
  RefreshCw,
  Clock,
  User,
  Phone,
  Tag,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  generateAbandonedCartRecovery,
  AbandonedCartData,
  AbandonedCartDraftResult,
} from "@/services/gemini36Service";
import { supabase } from "@/lib/supabase-loose";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";

export function AbandonedCartAgent() {
  const [carts, setCarts] = useState<AbandonedCartData[]>([]);
  const [selectedCart, setSelectedCart] = useState<AbandonedCartData | null>(null);
  const [draftResult, setDraftResult] = useState<AbandonedCartDraftResult | null>(null);
  const [customDraft, setCustomDraft] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [cartStatuses, setCartStatuses] = useState<
    Record<string, "pending" | "contacted" | "recovered">
  >({});

  // An abandoned cart is derived from the real cart_items table, not from pending orders.
  // We only surface carts whose last cart activity is older than 24 hours and
  // for which the user has not created an order since that activity.
  const scanAbandonedCarts = async () => {
    try {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: cartRows, error: cartError } = await supabase
        .from("cart_items")
        .select("id,user_id,product_id,quantity,created_at")
        .not("user_id", "is", null)
        .lt("created_at", cutoff);
      if (cartError) throw cartError;
      if (!cartRows?.length) { setCarts([]); setSelectedCart(null); return; }

      const userIds = [...new Set(cartRows.map((r) => r.user_id).filter(Boolean))] as string[];
      const productIds = [...new Set(cartRows.map((r) => r.product_id).filter(Boolean))] as string[];
      const [profilesResult, productsResult, ordersResult] = await Promise.all([
        supabase.from("profiles").select("id,full_name,phone").in("id", userIds),
        supabase.from("products").select("id,name,name_ar,price,is_active").in("id", productIds).eq("is_active", true),
        supabase.from("orders").select("id,user_id,created_at").in("user_id", userIds).gte("created_at", cutoff),
      ]);
      if (profilesResult.error) throw profilesResult.error;
      if (productsResult.error) throw productsResult.error;
      if (ordersResult.error) throw ordersResult.error;

      const profileMap = new Map((profilesResult.data ?? []).map((p) => [p.id, p]));
      const productMap = new Map((productsResult.data ?? []).map((p) => [p.id, p]));
      const recentOrders = ordersResult.data;
      const latestByUser = new Map<string, typeof cartRows>();
      for (const row of cartRows) {
        if (!row.user_id) continue;
        const list = latestByUser.get(row.user_id) ?? [];
        list.push(row);
        latestByUser.set(row.user_id, list);
      }

      const mapped: AbandonedCartData[] = [];
      for (const [userId, items] of latestByUser) {
        const lastActivity = Math.max(...items.map((i) => new Date(i.created_at ?? 0).getTime()));
        const hasOrderAfterCart = (recentOrders ?? []).some((o) => o.user_id === userId && new Date(o.created_at ?? 0).getTime() >= lastActivity);
        if (hasOrderAfterCart) continue;
        const profile = profileMap.get(userId);
        if (!profile?.phone) continue;
        // Never compose a recovery message with mock names or zero prices when
        // a cart references a product that could not be verified in Supabase.
        if (items.some((item) => !item.product_id || !productMap.has(item.product_id))) continue;
        const totalPrice = items.reduce((sum, item) => sum + Number(productMap.get(item.product_id ?? "")?.price ?? 0) * Number(item.quantity ?? 0), 0);
        mapped.push({
          id: `cart-${userId}`,
          customerName: profile.full_name || "عميل المتجر",
          phone: profile.phone,
          itemsCount: items.length,
          itemsList: items.map((i) => productMap.get(i.product_id ?? "")?.name_ar || productMap.get(i.product_id ?? "")?.name || "صنف"),
          totalPrice,
          lastUpdated: new Date(lastActivity).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" }),
        });
      }
      setCarts(mapped);
      setSelectedCart(mapped[0] || null);
    } catch (e: any) {
      setCarts([]);
      setSelectedCart(null);
      toast.error(`تعذر فحص السلات المتروكة: ${e.message || "خطأ غير معروف"}`);
    }
  };

  useEffect(() => {
    scanAbandonedCarts();
  }, []);

  const handleGenerateDraft = useCallback(async (cart: AbandonedCartData) => {
    setGenerating(true);
    try {
      const res = await generateAbandonedCartRecovery({
        ...cart,
        couponSuggested: couponCode,
      });
      setDraftResult(res);
      setCustomDraft(res.messageText);
    } catch (e) {
      toast.error("حدث خطأ أثناء صياغة رسالة الاسترداد");
    } finally {
      setGenerating(false);
    }
  }, [couponCode]);

  useEffect(() => {
    if (selectedCart) {
      handleGenerateDraft(selectedCart);
    }
  }, [selectedCart, handleGenerateDraft]);

  const copyToClipboard = () => {
    if (!customDraft) return;
    navigator.clipboard.writeText(customDraft);
    setCopied(true);
    toast.success("تم نسخ رسالة الواتساب بنجاح!");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleMarkContacted = (cartId: string) => {
    setCartStatuses((prev) => ({ ...prev, [cartId]: "contacted" }));
    toast.success("تم تحديث حالة السلة إلى: تم التواصل 📱");
  };

  const handleMarkRecovered = (cartId: string) => {
    setCartStatuses((prev) => ({ ...prev, [cartId]: "recovered" }));
    toast.success("مبروك! تم استرداد الطلب بنجاح 💰🎉");
  };

  return (
    <Card className="rounded-3xl border border-border/80 bg-card shadow-md overflow-hidden">
      <CardHeader className="p-4 sm:p-6 pb-3 border-b border-border/50 bg-secondary/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base sm:text-lg font-black font-display text-foreground">
                  وكيل استرداد السلات المتروكة (Abandoned Cart Agent)
                </CardTitle>
                <span className="rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold px-2.5 py-0.5 border border-emerald-500/20">
                  توليد ذكي لواتساب 💬
                </span>
              </div>
              <CardDescription className="text-xs font-medium text-muted-foreground mt-0.5">
                توليد رسائل مخصصة للعملاء الذين تركوا سلاتهم مع حوافز وكوبونات لزيادة معدل إتمام
                الشراء
              </CardDescription>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={scanAbandonedCarts}
            className="h-8 rounded-xl text-xs font-bold gap-1.5 border-border hover:bg-secondary cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>فحص السلات الجديدة</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Abandoned Carts List (5 Cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-foreground flex items-center gap-1.5">
              <ShoppingBag className="h-3.5 w-3.5 text-emerald-600" />
              <span>السلات غير المكتملة المرصودة ({carts.length})</span>
            </span>
            <span className="text-[11px] text-muted-foreground font-bold">
              إجمالي القيمة: {carts.reduce((acc, c) => acc + c.totalPrice, 0).toLocaleString()} ج.م
            </span>
          </div>

          <div className="space-y-2 max-h-[460px] overflow-y-auto pe-1">
            {carts.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-border/80 text-muted-foreground">
                <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs font-bold text-foreground">لا توجد سلات متروكة حالياً</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  جميع الطلبات مكتملة أو لا توجد سلات معلقة في قاعدة البيانات
                </p>
              </div>
            ) : (
              carts.map((cart) => {
                const isSelected = selectedCart?.id === cart.id;
                const status = cartStatuses[cart.id] || "pending";

                return (
                  <div
                    key={cart.id}
                    onClick={() => setSelectedCart(cart)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-right ${
                      isSelected
                        ? "border-emerald-600 bg-emerald-500/10 shadow-sm ring-1 ring-emerald-600/30"
                        : "border-border/70 bg-card hover:border-emerald-500/40 hover:bg-secondary/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-secondary grid place-items-center text-xs font-black text-foreground">
                          <User className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-xs font-black text-foreground">
                          {cart.customerName}
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                          status === "recovered"
                            ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
                            : status === "contacted"
                              ? "bg-blue-500/15 text-blue-700 border-blue-500/30"
                              : "bg-amber-500/15 text-amber-700 border-amber-500/30"
                        }`}
                      >
                        {status === "recovered"
                          ? "تم الاسترداد ✅"
                          : status === "contacted"
                            ? "تم التواصل 💬"
                            : "بانتظار الإرسال ⏳"}
                      </span>
                    </div>

                    <div className="mt-2 text-[11px] text-muted-foreground line-clamp-1">
                      🛒 {cart.itemsList?.join("، ") || "أصناف مشتريات"}
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-xs pt-2 border-t border-border/40">
                      <span className="font-extrabold text-foreground">
                        {cart.totalPrice.toFixed(2)} ج.م
                      </span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
                        <Clock className="h-3 w-3" />
                        <span>{cart.lastUpdated}</span>
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: AI Generated WhatsApp Recovery Composer (7 Cols) */}
        <div className="lg:col-span-7 space-y-4 rounded-2xl border border-border/80 bg-secondary/15 p-4 sm:p-5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-600 animate-pulse" />
                <span className="text-xs font-black text-foreground">
                  مسودة رسالة الواتساب المولدة بالذكاء الاصطناعي
                </span>
              </div>
              {selectedCart && (
                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-bold">كوبون للتحقق:</span>
                  <Input
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="اختياري"
                    className="h-7 w-28 text-center font-mono font-black text-xs uppercase rounded-lg border-emerald-500"
                  />
                </div>
              )}
            </div>

            {selectedCart ? (
              <div className="space-y-3">
                {/* Textarea for editable message */}
                <div className="relative">
                  <Textarea
                    rows={8}
                    value={customDraft}
                    onChange={(e) => setCustomDraft(e.target.value)}
                    placeholder="جاري توليد رسالة الاسترداد..."
                    className="rounded-2xl font-bold text-xs leading-relaxed bg-card border-border/80 focus-visible:ring-emerald-500"
                  />
                  {generating && (
                    <div className="absolute inset-0 bg-background/60 backdrop-blur-xs rounded-2xl grid place-items-center text-xs font-black text-emerald-600">
                      جاري صياغة الرسالة بأسلوب تسويقي جذاب...
                    </div>
                  )}
                </div>

                {/* Strategy Insight */}
                {draftResult?.strategy && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span>الاستراتيجية: {draftResult.strategy}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-muted-foreground font-bold">
                اختر سلة من القائمة لبدء صياغة رسالة الاسترداد
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {selectedCart && (
            <div className="pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyToClipboard}
                  className="h-9 rounded-xl text-xs font-bold gap-1.5 cursor-pointer"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span>{copied ? "تم النسخ!" : "نسخ الرسالة"}</span>
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleMarkContacted(selectedCart.id)}
                  className="h-9 rounded-xl text-xs font-bold gap-1 cursor-pointer"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                  <span>تحديد كـ "تم التواصل"</span>
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleMarkRecovered(selectedCart.id)}
                  className="h-9 rounded-xl text-xs font-bold gap-1 text-emerald-700 bg-emerald-500/10 hover:bg-emerald-500/20 cursor-pointer"
                >
                  <span>تم استرداد الطلب 💰</span>
                </Button>

                <a
                  href={
                    draftResult?.whatsappUrl ||
                    `https://wa.me/${selectedCart.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(customDraft)}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => handleMarkContacted(selectedCart.id)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-4 h-9 shadow-md transition-colors"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>إرسال عبر واتساب 💬</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
