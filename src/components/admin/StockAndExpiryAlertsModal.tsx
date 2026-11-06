import { useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  PackageX,
  Sparkles,
  ArrowRight,
  TrendingDown,
  RefreshCw,
  Tag,
  Clock,
  CheckCircle2,
  Bell,
  Check,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface StockAlertItem {
  id: string;
  name: string;
  category: string;
  branchName: string;
  currentStock: number;
  threshold: number;
  unit: string;
  reorderQuantity: number;
}

export interface ExpiryAlertItem {
  id: string;
  name: string;
  category: string;
  batchNumber: string;
  branchName: string;
  stockCount: number;
  expiryDate: string;
  daysRemaining: number;
  originalPrice: number;
  discountPrice?: number;
}

interface StockAndExpiryAlertsModalProps {
  lowStockItems?: StockAlertItem[];
  expiryAlertItems?: ExpiryAlertItem[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  triggerButton?: React.ReactNode;
}

export function StockAndExpiryAlertsModal({
  lowStockItems = [],
  expiryAlertItems = [],
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  triggerButton,
}: StockAndExpiryAlertsModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setIsOpen = isControlled ? setControlledOpen! : setInternalOpen;

  const [requestedSupplies, setRequestedSupplies] = useState<Record<string, boolean>>({});
  const [appliedDiscounts, setAppliedDiscounts] = useState<Record<string, boolean>>({});

  const totalAlertsCount = lowStockItems.length + expiryAlertItems.length;

  const handleRequestSupply = (item: StockAlertItem) => {
    setRequestedSupplies((prev) => ({ ...prev, [item.id]: true }));
    toast.success(`تم إنشاء أمر توريد عاجل لـ (${item.name})`, {
      description: `الكمية المطلوبة: ${item.reorderQuantity} ${item.unit} لصالح ${item.branchName}`,
    });
  };

  const handleApplyDiscount = (item: ExpiryAlertItem) => {
    setAppliedDiscounts((prev) => ({ ...prev, [item.id]: true }));
    toast.success(`تم تطبيق خصم ترويجي فوري على (${item.name}) 🔥`, {
      description: `السعر الجديد: ${item.discountPrice} ج.م بدلاً من ${item.originalPrice} ج.م لتسريع البيع قبل انتهاء الصلاحية`,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {triggerButton ? (
        <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="h-10 px-3.5 rounded-2xl border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-extrabold text-xs gap-2 transition-all shadow-xs relative"
          >
            <div className="relative">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              {totalAlertsCount > 0 && (
                <span className="absolute -top-1.5 -end-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-black text-white ring-2 ring-background">
                  {totalAlertsCount}
                </span>
              )}
            </div>
            <span className="hidden sm:inline">تنبيهات المخزون والصلاحية</span>
          </Button>
        </DialogTrigger>
      )}

      <DialogContent
        className="max-w-2xl rounded-3xl p-6 bg-card border-border shadow-2xl"
        dir="rtl"
      >
        <DialogHeader className="text-start space-y-1.5 border-b border-border/60 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="font-display text-lg font-black text-foreground">
                  مركز تنبيهات المخزون والصلاحية ⚡
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  مراقبة فورية للسلع تحت حد الأمان والمنتجات القريبة من انتهاء الصلاحية
                </DialogDescription>
              </div>
            </div>

            <Badge
              variant="outline"
              className="rounded-full border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 font-black text-xs px-3 py-1"
            >
              {totalAlertsCount} تنبيهات عاجلة
            </Badge>
          </div>
        </DialogHeader>

        <Tabs defaultValue="low-stock" className="mt-2 space-y-4">
          <TabsList className="grid grid-cols-2 rounded-2xl p-1 bg-secondary/60 h-11">
            <TabsTrigger
              value="low-stock"
              className="rounded-xl font-black text-xs gap-2 data-[state=active]:bg-background data-[state=active]:shadow-xs"
            >
              <PackageX className="h-4 w-4 text-amber-500" />
              <span>أقل من حد الأمان ({lowStockItems.length})</span>
            </TabsTrigger>
            <TabsTrigger
              value="expiry"
              className="rounded-xl font-black text-xs gap-2 data-[state=active]:bg-background data-[state=active]:shadow-xs"
            >
              <CalendarClock className="h-4 w-4 text-rose-500" />
              <span>قرب انتهاء الصلاحية ({expiryAlertItems.length})</span>
            </TabsTrigger>
          </TabsList>

          {/* تبويب انخفاض المخزون */}
          <TabsContent value="low-stock" className="space-y-3 focus:outline-hidden">
            <div className="max-h-[380px] overflow-y-auto space-y-2.5 pe-1">
              {lowStockItems.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-border bg-secondary/20 text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500 opacity-70" />
                  <p className="text-xs font-bold text-foreground">المخزون متوازن ومستقر بالكامل</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    لا توجد منتجات وصلت إلى حد الأمان الأدنى في المخازن حالياً
                  </p>
                </div>
              ) : (
                lowStockItems.map((item) => {
                  const isOrdered = requestedSupplies[item.id];
                  const percentage = Math.min(
                    Math.round((item.currentStock / item.threshold) * 100),
                    100,
                  );

                  return (
                    <div
                      key={item.id}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl border border-border bg-secondary/30 hover:bg-secondary/50 transition-colors"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-foreground truncate">
                            {item.name}
                          </span>
                          <span className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-md font-semibold shrink-0">
                            {item.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                          <span>
                            الفرع: <strong className="text-foreground">{item.branchName}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            المخزون الحالي:{" "}
                            <strong className="text-rose-600 dark:text-rose-400">
                              {item.currentStock} {item.unit}
                            </strong>{" "}
                            / حد الأمان: {item.threshold} {item.unit}
                          </span>
                        </div>

                        {/* شريط نسبة المخزون */}
                        <div className="w-48 max-w-full h-1.5 rounded-full bg-secondary overflow-hidden mt-1">
                          <div
                            className="h-full bg-amber-500 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>

                      <Button
                        size="sm"
                        disabled={isOrdered}
                        onClick={() => handleRequestSupply(item)}
                        className={cn(
                          "h-8 px-3 rounded-xl text-xs font-black gap-1.5 shrink-0 transition-all",
                          isOrdered
                            ? "bg-emerald-600 text-white"
                            : "bg-primary text-primary-foreground hover:bg-primary/90",
                        )}
                      >
                        {isOrdered ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span>تم طلب التوريد</span>
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-3.5 w-3.5" />
                            <span>
                              طلب توريد ({item.reorderQuantity} {item.unit})
                            </span>
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </TabsContent>

          {/* تبويب قرب انتهاء الصلاحية */}
          <TabsContent value="expiry" className="space-y-3 focus:outline-hidden">
            <div className="max-h-[380px] overflow-y-auto space-y-2.5 pe-1">
              {expiryAlertItems.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-border bg-secondary/20 text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500 opacity-70" />
                  <p className="text-xs font-bold text-foreground">جميع تواريخ الصلاحية سليمة</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    لا توجد منتجات وشيكة الانتهاء أو دفعات حرجة في قاعدة البيانات
                  </p>
                </div>
              ) : (
                expiryAlertItems.map((item) => {
                  const isDiscounted = appliedDiscounts[item.id];

                  return (
                    <div
                      key={item.id}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 transition-colors"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-foreground truncate">
                            {item.name}
                          </span>
                          <span className="text-[10px] bg-rose-500/15 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-full font-black">
                            متبقي {item.daysRemaining} أيام فقط ⏳
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                          <span>
                            الفرع: <strong className="text-foreground">{item.branchName}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            الكمية:{" "}
                            <strong className="text-foreground">{item.stockCount} عبوة</strong>
                          </span>
                          <span>•</span>
                          <span>
                            تاريخ الانتهاء:{" "}
                            <strong className="text-foreground">{item.expiryDate}</strong>
                          </span>
                        </div>

                        <div className="text-[11px] font-bold text-foreground flex items-center gap-2 pt-0.5">
                          <span>السعر الحالي: {item.originalPrice} ج.م</span>
                          {item.discountPrice && (
                            <span className="text-emerald-600 dark:text-emerald-400">
                              → السعر المقترح للترويج: {item.discountPrice} ج.م
                            </span>
                          )}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        disabled={isDiscounted}
                        onClick={() => handleApplyDiscount(item)}
                        className={cn(
                          "h-8 px-3 rounded-xl text-xs font-black gap-1.5 shrink-0 transition-all",
                          isDiscounted
                            ? "bg-emerald-600 text-white"
                            : "bg-rose-600 hover:bg-rose-700 text-white shadow-xs",
                        )}
                      >
                        {isDiscounted ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>الخصم نشط في المتجر</span>
                          </>
                        ) : (
                          <>
                            <Tag className="h-3.5 w-3.5" />
                            <span>تطبيق خصم سريع 🔥</span>
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
