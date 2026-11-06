import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Minus, Plus, ShoppingBag, PackageX, SearchX, ChevronRight, Check, AlertTriangle, Sparkles, Truck, CreditCard, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase-loose";
import { useCart, type Product } from "@/lib/cart-context";
import { PRODUCT_COLUMNS, normalizeProduct, useStoreCategories } from "@/lib/store-data-hooks";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { flyToCart } from "@/lib/fly-to-cart";
import { useAuth } from "@/lib/auth-context";
import { getProductAdvice } from "@/lib/product-advice.functions";

type PageProduct = Product & { unit?: string | null };

const UNIT_AR: Record<string, string> = { kg: "كجم", liter: "لتر", piece: "قطعة", g: "جم" };

// Plain Western digits, always.
const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);

function unitText(p: PageProduct) {
  if (p.unit) return UNIT_AR[p.unit] ?? p.unit;
  return p.is_by_weight ? "كجم" : p.unit_label || "قطعة";
}

async function fetchProduct(id: string): Promise<PageProduct | null> {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return normalizeProduct(data) as PageProduct;
}

async function fetchSimilar(categoryId: string, excludeId: string): Promise<PageProduct[]> {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("category_id", categoryId)
    .eq("is_active", true)
    .neq("id", excludeId)
    .gt("stock", 0)
    .order("created_at", { ascending: false })
    .limit(6);
  if (error) throw error;
  return (data ?? []).map((row) => normalizeProduct(row) as PageProduct);
}

export const Route = createFileRoute("/products/$productId")({
  head: () => ({
    meta: [
      { title: "تفاصيل المنتج | سوبرماركت الوادي الأخضر" },
      { name: "description", content: "السعر والتوفر وتفاصيل المنتج في سوبرماركت الوادي الأخضر." },
      { property: "og:title", content: "تفاصيل المنتج | سوبرماركت الوادي الأخضر" },
      { property: "og:description", content: "السعر والتوفر وتفاصيل المنتج." },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProductPage,
});

/* ───────── LTR islands ───────── */

function PriceBlock({ product, qty }: { product: PageProduct; qty: number }) {
  const hasDiscount = product.old_price != null && product.old_price > product.price_per_unit;
  const pct = hasDiscount
    ? Math.round((1 - product.price_per_unit / (product.old_price as number)) * 100)
    : 0;
  return (
    <div dir="ltr" className="flex flex-wrap items-baseline gap-2 text-left tabular-nums">
      <span className="font-display text-3xl font-black text-accent">
        {fmt(product.price_per_unit)}
      </span>
      <span className="text-sm font-bold text-muted-foreground">
        <bdi dir="rtl">ج.م</bdi> / <bdi dir="rtl">{unitText(product)}</bdi>
      </span>
      {hasDiscount && (
        <>
          <span className="text-sm text-muted-foreground line-through">
            {fmt(product.old_price as number)}
          </span>
          <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-black text-destructive">
            -{pct}%
          </span>
        </>
      )}
      {qty !== 1 && (
        <span className="w-full text-xs font-semibold text-muted-foreground">
          {fmt(qty)} × {fmt(product.price_per_unit)} = {fmt(product.price_per_unit * qty)} <bdi dir="rtl">ج.م</bdi>
        </span>
      )}
    </div>
  );
}

function QuantityStepper({
  value,
  onChange,
  step,
  min,
  max,
  unit,
}: {
  value: number;
  onChange: (v: number) => void;
  step: number;
  min: number;
  max: number;
  unit: string;
}) {
  return (
    <div
      dir="ltr"
      className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/40 p-1 tabular-nums"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="تقليل الكمية"
        className="h-9 w-9 rounded-full"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, +(value - step).toFixed(3)))}
      >
        <Minus className="h-4 w-4" />
      </Button>
      <span className="min-w-16 text-center text-sm font-black" aria-live="polite">
        {fmt(value)} <bdi dir="rtl" className="text-xs text-muted-foreground">{unit}</bdi>
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="زيادة الكمية"
        className="h-9 w-9 rounded-full"
        disabled={value + step > max}
        onClick={() => onChange(Math.min(max, +(value + step).toFixed(3)))}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

/* ───────── Page ───────── */

function ProductPage() {
  const { productId } = Route.useParams();
  const { data: categories = [] } = useStoreCategories();
  const { data: product, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["product-page", productId],
    queryFn: () => fetchProduct(productId),
  });

  if (isLoading) return <LoadingState />;
  if (isError) return <ProductLoadError retry={() => void refetch()} isRetrying={isFetching} />;
  if (!product) return <NotFoundState />;
  const unavailable = (product.stock_quantity ?? 0) <= 0;
  const category = categories.find((candidate) => candidate.id === product.category_id);
  return (
    <ReadyState
      key={product.id}
      product={product}
      unavailable={unavailable}
      categoryName={category?.name_ar || category?.name}
    />
  );
}

function LoadingState() {
  return (
    <main dir="rtl" className="mx-auto grid max-w-6xl gap-6 p-4 lg:grid-cols-2" aria-busy="true">
      <Skeleton className="aspect-square w-full rounded-[2rem]" />
      <div className="space-y-4 rounded-[2rem] border border-border p-6">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-8 w-4/5" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </main>
  );
}

function NotFoundState() {
  return (
    <main dir="rtl" className="mx-auto grid max-w-md place-items-center gap-4 p-10 text-center">
      <SearchX className="h-12 w-12 text-muted-foreground" />
      <h1 className="font-display text-xl font-bold">المنتج غير موجود</h1>
      <p className="text-sm text-muted-foreground">ربما تم حذفه أو أن الرابط غير صحيح.</p>
      <Button asChild className="rounded-2xl">
        <Link to="/">العودة للمتجر</Link>
      </Button>
    </main>
  );
}

function ProductLoadError({ retry, isRetrying }: { retry: () => void; isRetrying: boolean }) {
  return (
    <main dir="rtl" className="mx-auto grid max-w-md place-items-center gap-4 p-10 text-center">
      <SearchX className="h-12 w-12 text-destructive" />
      <h1 className="font-display text-xl font-bold">تعذر تحميل بيانات المنتج</h1>
      <p className="text-sm text-muted-foreground">تحقق من اتصالك بالإنترنت ثم أعد المحاولة.</p>
      <Button className="rounded-2xl" onClick={retry} disabled={isRetrying}>
        {isRetrying ? "جارٍ إعادة المحاولة…" : "حاول مرة أخرى"}
      </Button>
    </main>
  );
}

function ReadyState({ product, unavailable, categoryName }: { product: PageProduct; unavailable: boolean; categoryName?: string }) {
  const { addItem, items } = useCart();
  const queryClient = useQueryClient();
  const weighted = product.is_by_weight;
  const step = weighted ? 0.25 : 1;
  const min = weighted ? 0.25 : 1;
  const cartQty = items.find((item) => item.product.id === product.id)?.quantity ?? 0;
  const remainingStock = Math.max(0, (product.stock_quantity ?? 0) - cartQty);
  const max = Math.max(min, remainingStock);
  const limitReached = remainingStock < min;
  const [qty, setQty] = useState(weighted ? 0.5 : 1);
  const [isAdding, setIsAdding] = useState(false);
  const { user } = useAuth();
  const [advice, setAdvice] = useState<string | null>(null);
  const [isLoadingAdvice, setIsLoadingAdvice] = useState(false);
  const [adviceError, setAdviceError] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const images = [...new Set([product.image_url, ...(product.images ?? [])].filter((url): url is string => Boolean(url)))];
  const visibleImages = images.filter((url) => !failedImages.includes(url));
  const [selectedImage, setSelectedImage] = useState<string | null>(visibleImages[0] ?? null);
  const currentImage = selectedImage && visibleImages.includes(selectedImage) ? selectedImage : visibleImages[0];
  const isLowStock = !unavailable && product.stock_quantity != null && product.stock_quantity <= (product.low_stock_threshold ?? 5);
  const unit = unitText(product);

  const add = async (el: HTMLElement) => {
    if (isAdding || unavailable || limitReached) return;
    setIsAdding(true);
    try {
      const latest = await queryClient.fetchQuery({
        queryKey: ["product-page", product.id],
        queryFn: () => fetchProduct(product.id),
        staleTime: 0,
      });
      if (!latest) {
        toast.error("لم يعد هذا المنتج متاحًا للشراء.");
        await queryClient.invalidateQueries({ queryKey: ["product-page", product.id] });
        return;
      }
      queryClient.setQueryData(["product-page", product.id], latest);
      if (latest.price_per_unit !== product.price_per_unit) {
        toast.info("تم تحديث السعر. راجعه ثم أضف المنتج مرة أخرى.");
        return;
      }
      const latestRemainingStock = Math.max(0, (latest.stock_quantity ?? 0) - cartQty);
      if (latestRemainingStock < qty) {
        setQty(Math.max(min, latestRemainingStock));
        toast.error("الكمية المتاحة تغيرت. حدّثنا المخزون؛ راجع الكمية الجديدة.");
        return;
      }
      addItem(latest, qty, weighted ? { selected_weight: qty, selected_weight_label: `${fmt(qty)} ${unit}` } : undefined);
      flyToCart(el);
      toast.success("تمت الإضافة للسلة", { description: `${latest.name_ar || latest.name} (${fmt(qty)} ${unit})` });
    } catch {
      toast.error("تعذر التحقق من السعر والمخزون. لم تتم الإضافة.");
    } finally {
      setIsAdding(false);
    }
  };

  const askProductAssistant = async () => {
    if (isLoadingAdvice || advice) return;
    setIsLoadingAdvice(true);
    setAdviceError(null);
    try {
      setAdvice(await getProductAdvice({ data: product.id }));
    } catch (error) {
      setAdviceError(error instanceof Error ? error.message : "تعذر الحصول على نصيحة الآن.");
    } finally {
      setIsLoadingAdvice(false);
    }
  };

  return (
    <main dir="rtl" className="mx-auto max-w-7xl px-4 pb-44 sm:px-6 md:pb-12 lg:px-8">
      <nav aria-label="مسار الصفحة" className="flex items-center gap-1 py-4 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-foreground">الرئيسية</Link>
        <ChevronRight className="h-3 w-3 rotate-180" />
        {categoryName && <><span className="truncate">{categoryName}</span><ChevronRight className="h-3 w-3 rotate-180" /></>}
        <span className="truncate text-foreground">{product.name_ar || product.name}</span>
      </nav>

      <div className="grid items-start gap-5 lg:grid-cols-2 lg:gap-8">
      <div className="lg:col-start-2">
      <div className="relative aspect-square overflow-hidden rounded-[1.5rem] border border-border/80 bg-secondary shadow-sm lg:aspect-[1.25/1] lg:rounded-[2rem]">
        {currentImage ? (
          <img
            src={currentImage}
            alt={product.name_ar || product.name}
            className={`h-full w-full object-cover ${unavailable ? "opacity-50 grayscale" : ""}`}
            onError={() => setFailedImages((previous) => [...previous, currentImage])}
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-6xl">🌿</div>
        )}
        {visibleImages.length > 1 && (
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2" aria-label="صور المنتج">
            {visibleImages.map((url, index) => (
              <button key={url} type="button" onClick={() => setSelectedImage(url)} aria-label={`عرض الصورة ${index + 1}`} aria-pressed={currentImage === url} className={`h-14 w-14 overflow-hidden rounded-xl border-2 bg-card shadow ${currentImage === url ? "border-primary" : "border-white/70"}`}>
                <img src={url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
        {product.old_price != null && product.old_price > product.price_per_unit && (
          <span className="absolute top-4 end-4 rounded-full bg-accent px-3.5 py-2 text-xs font-black text-accent-foreground shadow-lg">
            وفر {Math.round((1 - product.price_per_unit / product.old_price) * 100)}٪
          </span>
        )}
        {unavailable ? (
          <span className="absolute top-4 start-4 inline-flex items-center gap-1.5 rounded-full bg-destructive px-3.5 py-2 text-xs font-black text-destructive-foreground shadow-lg">
            <PackageX className="h-4 w-4" /> نفدت الكمية
          </span>
        ) : isLowStock ? (
          <span className="absolute top-4 start-4 inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-3.5 py-2 text-xs font-black text-white shadow-lg">
              <AlertTriangle className="h-4 w-4" /> متبقي <bdi dir="ltr">{product.stock_quantity}</bdi> فقط
          </span>
        ) : (
          <span className="absolute top-4 start-4 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-background/90 px-3.5 py-2 text-xs font-bold text-emerald-700 shadow-sm backdrop-blur">
            <Check className="h-4 w-4" /> متوفر
          </span>
        )}
      </div>
      </div>

      <section className="space-y-5 lg:col-start-1 lg:row-start-1 lg:self-center lg:px-1">
        <div className="space-y-2">
          {categoryName && <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{categoryName}</span>}
          <h1 className="font-display text-2xl font-black leading-snug sm:text-3xl">{product.name_ar || product.name}</h1>
          {product.name_ar && product.name_ar !== product.name && <p dir="auto" className="text-sm text-muted-foreground">{product.name}</p>}
        </div>
        <div className="rounded-2xl bg-secondary/35 p-4 sm:p-5">
          <PriceBlock product={product} qty={unavailable ? 1 : qty} />
        </div>
        {product.avg_rating != null && product.avg_rating > 0 && (
          <p className="text-sm font-semibold text-muted-foreground" aria-label={`التقييم ${fmt(product.avg_rating)} من 5`}>
            <span className="text-amber-500">★ {fmt(product.avg_rating)}</span>{product.reviews_count ? ` (${product.reviews_count} تقييم)` : ""}
          </p>
        )}
        {!unavailable && (
          <div className="hidden items-center gap-3 pt-1 sm:flex">
            <QuantityStepper value={qty} onChange={setQty} step={step} min={min} max={max} unit={unit} />
            <Button className="h-11 flex-1 rounded-2xl text-base font-black" onClick={(e) => void add(e.currentTarget)} disabled={isAdding || limitReached} aria-busy={isAdding}>
              <ShoppingBag className="me-2 h-5 w-5" /> {isAdding ? "جارٍ التحقق…" : "أضف إلى السلة"}
            </Button>
          </div>
        )}
        {unavailable && <p className="rounded-2xl border border-destructive/20 bg-destructive/5 p-3 text-sm font-semibold text-destructive">هذا المنتج غير متاح حاليًا. ستجد بدائل من القسم نفسه أسفل الصفحة.</p>}
        {limitReached && !unavailable && <p className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3 text-sm font-semibold text-amber-800 dark:text-amber-200">أضفت بالفعل كامل الكمية المتاحة لهذا المنتج إلى سلتك.</p>}
        <div className="flex flex-wrap gap-2 border-t border-border pt-4 text-xs font-semibold text-muted-foreground">
          <div className="flex items-center gap-2 rounded-xl bg-secondary/40 p-3"><Truck className="h-4 w-4 shrink-0 text-primary" /><span>حدد عنوانك لمعرفة خيارات التوصيل</span></div>
          <div className="flex items-center gap-2 rounded-xl bg-secondary/40 p-3"><CreditCard className="h-4 w-4 shrink-0 text-primary" /><span>الدفع عند الاستلام</span></div>
        </div>
      </section>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-black text-primary">معلومات الاستخدام والتخزين</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">لا تتوفر حاليًا تعليمات موثقة لهذا المنتج.</p>
        </section>
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-black text-primary">تفاصيل البيع</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-3"><dt className="font-bold">القسم</dt><dd className="text-muted-foreground">{categoryName || "—"}</dd></div>
            <div className="flex justify-between gap-3"><dt className="font-bold">وحدة البيع</dt><dd className="text-muted-foreground">{unit}</dd></div>
            <div className="flex justify-between gap-3"><dt className="font-bold">السعر لكل وحدة</dt><dd className="text-muted-foreground">{fmt(product.price_per_unit)} ج.م / {unit}</dd></div>
          </dl>
        </section>
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-black text-primary">الوصف</h2>
          <p className="leading-relaxed text-muted-foreground">{product.description_ar || product.description || "لا يتوفر وصف لهذا المنتج حاليًا."}</p>
        </section>
      </div>

      <section className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="mb-2 text-lg font-black text-primary">نصيحة من مساعد الوادي</h2>
            {advice ? <p className="leading-relaxed text-muted-foreground" aria-live="polite">{advice}</p> : (
              <>
                <p className="text-sm leading-relaxed text-muted-foreground">يولّد Gemini نصيحة خاصة بهذا المنتج اعتمادًا على اسمه ووصفه المسجلين في المتجر.</p>
                {adviceError && <p role="alert" className="mt-3 text-sm text-destructive">{adviceError}<button type="button" className="ms-2 underline" onClick={() => void askProductAssistant()}>أعد المحاولة</button></p>}
              </>
            )}
          </div>
          {!advice && (user ? <Button type="button" variant="outline" className="shrink-0 rounded-xl" onClick={() => void askProductAssistant()} disabled={isLoadingAdvice}>
            {isLoadingAdvice ? <><LoaderCircle className="me-2 h-4 w-4 animate-spin" /> يفكر المساعد…</> : <><Sparkles className="me-2 h-4 w-4" /> احصل على نصيحة</>}
          </Button> : <Button asChild variant="outline" className="shrink-0 rounded-xl"><Link to="/auth" search={{ next: `/products/${product.id}` }}><Sparkles className="me-2 h-4 w-4" /> سجل الدخول للنصيحة الذكية</Link></Button>)}
        </div>
      </section>

      {product.category_id && (
        <SimilarProducts categoryId={product.category_id} excludeId={product.id} isSubstitute={unavailable} />
      )}

      {!unavailable && (
        <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-40 border-t border-border bg-background/95 p-3 shadow-[0_-8px_32px_-20px_rgba(0,0,0,0.35)] backdrop-blur sm:hidden">
          <div className="flex items-center gap-3">
            <QuantityStepper value={qty} onChange={setQty} step={step} min={min} max={max} unit={unit} />
            <Button className="h-11 flex-1 rounded-2xl font-black" onClick={(e) => void add(e.currentTarget)} disabled={isAdding || limitReached}>
              <ShoppingBag className="me-1 h-5 w-5" />
            <span>{isAdding ? "جارٍ التحقق…" : "أضف"}</span>
              <span dir="ltr" className="tabular-nums">{fmt(product.price_per_unit * qty)} <bdi dir="rtl">ج.م</bdi></span>
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}

function SimilarProducts({ categoryId, excludeId, isSubstitute }: { categoryId: string; excludeId: string; isSubstitute: boolean }) {
  const { addItem } = useCart();
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ["similar", categoryId, excludeId],
    queryFn: () => fetchSimilar(categoryId, excludeId),
  });

  return (
    <section className="mx-4 mt-6 rounded-3xl border border-border bg-card p-4" aria-labelledby="similar-h">
      <div className="mb-3 flex items-center gap-2">
        <PackageX className="h-5 w-5 text-destructive" />
        <h2 id="similar-h" className="font-bold">{isSubstitute ? "بدائل متاحة من نفس القسم" : "منتجات قد تناسبك من نفس القسم"}</h2>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="aspect-square rounded-2xl" />)}
        </div>
      ) : isError ? (
        <p className="text-sm text-muted-foreground">تعذر تحميل المنتجات المشابهة الآن.</p>
      ) : data.length === 0 ? (
        <p className="text-sm text-muted-foreground">لا توجد بدائل متوفرة في هذا القسم حالياً.</p>
      ) : (
        <ul className="grid auto-cols-[82%] grid-flow-col gap-3 overflow-x-auto pb-2 sm:auto-cols-auto sm:grid-flow-row sm:grid-cols-3 sm:overflow-visible lg:grid-cols-4">
          {data.map((p) => (
            <li key={p.id}>
              <div className="overflow-hidden rounded-2xl border border-border bg-background hover:border-primary">
                <Link to="/products/$productId" params={{ productId: p.id }} className="block">
                  <div className="aspect-square bg-secondary">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name_ar || p.name} loading="lazy" className="h-full w-full object-cover" />
                    ) : <div className="grid h-full place-items-center text-4xl">🌿</div>}
                  </div>
                </Link>
                <div className="p-2">
                  <Link to="/products/$productId" params={{ productId: p.id }} className="block min-h-12">
                    <p className="line-clamp-2 text-xs font-bold">{p.name_ar || p.name}</p>
                    <p dir="ltr" className="text-left text-sm font-black text-primary tabular-nums">{fmt(Number(p.price_per_unit))} ج.م</p>
                  </Link>
                  <Button type="button" size="sm" className="mt-2 w-full rounded-xl" onClick={(event) => {
                    event.preventDefault(); event.stopPropagation(); addItem(p, 1); flyToCart(event.currentTarget);
                    toast.success("تمت الإضافة للسلة", { description: p.name_ar || p.name });
                  }}><ShoppingBag className="me-1 h-4 w-4" /> أضف للسلة</Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
