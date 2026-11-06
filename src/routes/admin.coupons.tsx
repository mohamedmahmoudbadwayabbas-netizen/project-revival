import { NumberInput } from "@/components/ui/number-input";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase-loose";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/universal-skeleton";
import {
  Plus,
  Trash2,
  Loader2,
  Ticket,
  Percent,
  DollarSign,
  Copy,
  Check,
  Sparkles,
  Search,
  Calendar,
  ShieldCheck,
  Tag,
  RefreshCw,
  X,
  TrendingUp,
  Clock,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from "motion/react";

type Coupon = {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_amount: number | null;
  usage_limit: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
    created_at?: string;
};

export const Route = createFileRoute("/admin/coupons")({
  head: () => ({
    meta: [
      { title: "إدارة الكوبونات والخصومات — لوحة التحكم" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: CouponsPage,
});

function CouponsPage() {
  const [rows, setRows] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Coupon> | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("[Coupons] Supabase error:", error.message);
      }

      const result = (data as Coupon[]) || [];
      setRows(result);
    } catch (err) {
      console.error("[Coupons] Error loading coupons:", err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const removeCoupon = async (id: string, code: string) => {
    if (!confirm(`هل أنت متأكد من حذف كوبون الخصم "${code}"؟`)) return;
    const { error } = await supabase.from("coupons").delete().eq("id", id);
    if (error) return toast.error(`تعذر حذف الكوبون: ${error.message}`);
    toast.success("تم حذف الكوبون بنجاح 🗑️");
    await loadData();
  };

  const toggleActive = async (c: Coupon) => {
    const updated = { ...c, is_active: !c.is_active };
    const { error } = await supabase.from("coupons").update({ is_active: updated.is_active }).eq("id", c.id);
    if (error) return toast.error(`تعذر تحديث الكوبون: ${error.message}`);
    toast.success(updated.is_active ? "تم تفعيل الكوبون بنجاح ✨" : "تم إيقاف الكوبون");
    await loadData();
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`تم نسخ كود الخصم "${code}" إلى الحافظة 📋`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // حفظ كوبون جديد أو تعديل كوبون حالي
  const saveCoupon = async () => {
    if (!editing?.code?.trim()) {
      toast.error("كود الخصم مطلوب");
      return;
    }

    if (!editing.discount_value || editing.discount_value <= 0) {
      toast.error("قيمة الخصم يجب أن تكون أكبر من صفر");
      return;
    }

    const payload = {
            code: editing.code.trim().toUpperCase(),
      discount_type: editing.discount_type || "percentage",
      discount_value: Number(editing.discount_value),
      min_order_amount: editing.min_order_amount ? Number(editing.min_order_amount) : null,
      usage_limit: editing.usage_limit ? Number(editing.usage_limit) : null,
      used_count: editing.used_count ?? 0,
      expires_at: editing.expires_at || null,
      is_active: editing.is_active ?? true,
    };

    try {
      const result = editing.id
        ? await supabase.from("coupons").update(payload).eq("id", editing.id)
        : await supabase.from("coupons").insert(payload);
      if (result.error) throw result.error;
    } catch (error: any) {
      toast.error(`تعذر حفظ الكوبون: ${error.message || "خطأ غير معروف"}`);
      return;
    }

    toast.success(editing.id ? "تم تحديث الكوبون بنجاح ✏️" : "تم إنشاء الكوبون الجديد بنجاح 🎉");
    setEditing(null);
    await loadData();
  };

  // توليد كود عشوائي
  const generateRandomCode = () => {
    const prefixes = ["SUPER", "SAVE", "WELCOME", "DEAL", "SUMMER", "PROMO"];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(10 + Math.random() * 40);
    setEditing((prev) => ({ ...prev, code: `${prefix}${num}` }));
  };

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    return rows.filter((c) => c.code.toLowerCase().includes(searchQuery.toLowerCase().trim()));
  }, [rows, searchQuery]);

  // إحصائيات سريعة
  const activeCount = useMemo(() => rows.filter((c) => c.is_active).length, [rows]);
  const totalUses = useMemo(() => rows.reduce((acc, c) => acc + (c.used_count || 0), 0), [rows]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 p-4 sm:p-6 pb-24"
      dir="rtl"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl hero-gradient text-primary-foreground shadow-sm">
            <Ticket className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-black text-foreground">
              إدارة كروت وكوبونات الخصم 🎟️
            </h1>
            <p className="text-xs font-bold text-muted-foreground mt-0.5">
              إنشاء أكواد التخفيض، تحديد النسبة أو المبلغ، الحد الأدنى للشراء، ومتابعة معدل
              الاستخدام
            </p>
          </div>
        </div>

        <Button
          onClick={() =>
            setEditing({
              code: "",
              discount_type: "percentage",
              discount_value: 15,
              min_order_amount: 100,
              is_active: true,
                          })
          }
          className="rounded-2xl hero-gradient text-primary-foreground font-black text-xs gap-2 h-10 px-4 shadow-md"
        >
          <Plus className="h-4 w-4" />
          <span>إضافة كوبون جديد</span>
        </Button>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-3xl border border-border/70 bg-card flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
            <Ticket className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground font-bold block">الكوبونات النشطة</span>
            <strong className="text-xl font-black text-foreground">
              {activeCount} / {rows.length}
            </strong>
          </div>
        </div>

        <div className="p-4 rounded-3xl border border-border/70 bg-card flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground font-bold block">
              إجمالي المرات المستفادة
            </span>
            <strong className="text-xl font-black text-foreground">{totalUses} استخدام</strong>
          </div>
        </div>

        <div className="p-4 rounded-3xl border border-border/70 bg-card flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground font-bold block">أعلى خصم نشط</span>
            <strong className="text-xl font-black text-foreground">
              {Math.max(
                0,
                ...rows
                  .filter((c) => c.is_active && c.discount_type === "percentage")
                  .map((c) => c.discount_value),
              )}
              %
            </strong>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex items-center justify-between gap-3 bg-card border border-border/70 p-3 rounded-2xl shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بكود الخصم..."
            className="ps-9 h-10 rounded-xl font-bold text-xs bg-background"
          />
        </div>

        <Button onClick={loadData} variant="secondary" size="icon" className="rounded-xl h-10 w-10">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Main Grid List */}
      {loading ? (
        <CouponSkeletonGrid />
      ) : filteredRows.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-border p-12 text-center space-y-3 bg-card/40">
          <div className="mx-auto h-14 w-14 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
            <Ticket className="h-7 w-7" />
          </div>
          <h3 className="font-display text-base font-bold text-foreground">
            لا توجد كوبونات خصم مضافة حتى الآن
          </h3>
          <p className="text-xs text-muted-foreground">
            قم بإنشاء أول كوبون لزيادة مبيعات وجذب عملاء المتجر
          </p>
        </div>
      ) : (
        <motion.div
          variants={{
            hidden: { opacity: 0 },
            show: { opacity: 1, transition: { staggerChildren: 0.06 } },
          }}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {filteredRows.map((c) => (
            <motion.div
              key={c.id}
              variants={{
                hidden: { opacity: 0, y: 12 },
                show: { opacity: 1, y: 0 },
              }}
              className={`rounded-3xl border p-5 bg-card shadow-xs hover:border-primary/50 transition-all space-y-4 relative overflow-hidden ${
                c.is_active ? "border-border" : "border-border/50 opacity-60"
              }`}
            >
              {/* Top Banner */}
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg font-black text-foreground tracking-wider bg-secondary/80 px-3 py-1 rounded-xl border border-border/60">
                      {c.code}
                    </span>
                    <button
                      onClick={() => handleCopy(c.code)}
                      className="p-1.5 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                      title="نسخ الكود"
                    >
                      {copiedCode === c.code ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <div className="text-xs font-black text-primary flex items-center gap-1 pt-1">
                    {c.discount_type === "percentage" ? (
                      <Percent className="h-3.5 w-3.5" />
                    ) : (
                      <DollarSign className="h-3.5 w-3.5" />
                    )}
                    <span>
                      خصم {c.discount_value} {c.discount_type === "percentage" ? "%" : "ج.م"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch checked={c.is_active} onCheckedChange={() => toggleActive(c)} />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeCoupon(c.id, c.code)}
                    className="h-8 w-8 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Details & Limits */}
              <div className="grid grid-cols-2 gap-2 text-[11px] font-bold text-muted-foreground bg-secondary/30 p-3 rounded-2xl border border-border/40">
                <div>
                  الحد الأدنى:{" "}
                  <strong className="text-foreground">{c.min_order_amount ?? "لا يوجد"} ج.م</strong>
                </div>
                <div>
                  الاستخدامات:{" "}
                  <strong className="text-foreground">
                    {c.used_count ?? 0} / {c.usage_limit ?? "∞"}
                  </strong>
                </div>
                <div>
                  الانتهاء:{" "}
                  <strong className="text-foreground">
                    {c.expires_at ? new Date(c.expires_at).toLocaleDateString("ar-EG") : "غير محدد"}
                  </strong>
                </div>
              </div>

              {/* Edit button */}
              <Button
                variant="outline"
                onClick={() => setEditing(c)}
                className="w-full rounded-xl text-xs font-bold h-9 border-border hover:bg-secondary"
              >
                تعديل خيارات الكوبون
              </Button>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Modal Dialog for Add / Edit Coupon */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent
          dir="rtl"
          className="max-w-md rounded-3xl p-6 bg-card border-border shadow-2xl"
        >
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-black flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-500" />
              <span>{editing?.id ? `تعديل الكوبون ${editing.code}` : "إضافة كوبون خصم جديد"}</span>
            </DialogTitle>
          </DialogHeader>

          {editing && (
            <div className="space-y-4 pt-2">
              {/* Code Input */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-extrabold text-foreground">
                    كود الخصم (رمز التخفيض)
                  </span>
                  <button
                    type="button"
                    onClick={generateRandomCode}
                    className="text-[11px] font-bold text-emerald-500 hover:underline"
                  >
                    ولّد كود عشوائي ⚡
                  </button>
                </div>
                <Input
                  value={editing.code ?? ""}
                  onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase() })}
                  placeholder="مثال: SAVE20"
                  className="h-10 rounded-xl font-mono text-sm uppercase font-black"
                />
              </div>

              {/* Discount Type & Value */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <span className="text-xs font-extrabold text-foreground">نوع الخصم</span>
                  <select
                    value={editing.discount_type ?? "percentage"}
                    onChange={(e) =>
                      setEditing({ ...editing, discount_type: e.target.value as any })
                    }
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs font-bold text-foreground"
                  >
                    <option value="percent">نسبة مئوية (%)</option>
                    <option value="fixed">مبلغ ثابت (ج.م)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-extrabold text-foreground">قيمة الخصم</span>
                  <NumberInput
                    value={editing.discount_value ?? 0}
                    onValueChange={(v) =>
                      setEditing({ ...editing, discount_value: parseFloat(v || "0") || 0 })
                    }
                  />
                </div>
              </div>

              {/* Minimum order & Expiry */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <span className="text-xs font-extrabold text-foreground">
                    الحد الأدنى للطلب (ج.م)
                  </span>
                  <NumberInput
                    value={editing.min_order_amount ?? 0}
                    onValueChange={(v) =>
                      setEditing({ ...editing, min_order_amount: parseFloat(v || "0") || 0 })
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-extrabold text-foreground">تاريخ الانتهاء</span>
                  <Input
                    type="date"
                    value={
                      editing.expires_at
                        ? new Date(editing.expires_at).toISOString().slice(0, 10)
                        : ""
                    }
                    onChange={(e) => setEditing({ ...editing, expires_at: e.target.value })}
                    className="h-10 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              {/* Switches */}
              <div className="space-y-3 border-t border-border/60 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-foreground">الكوبون مفعّل ونشط</span>
                  <Switch
                    checked={editing.is_active ?? true}
                    onCheckedChange={(v) => setEditing({ ...editing, is_active: v })}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              variant="ghost"
              onClick={() => setEditing(null)}
              className="rounded-xl text-xs font-bold"
            >
              إلغاء
            </Button>
            <Button
              onClick={saveCoupon}
              className="rounded-xl hero-gradient text-primary-foreground font-black text-xs px-5"
            >
              حفظ الكوبون
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

function CouponSkeletonGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-44 w-full rounded-3xl" />
      ))}
    </div>
  );
}
