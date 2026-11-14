import { useState, useEffect, useRef } from "react";
import { Search, X, Plus, Sparkles, Loader2, Check, ImageIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-context";
import { useSearch } from "@/lib/search-context";
import { searchProductsFuzzy } from "@/lib/fuzzy-search";
import { useStoreProducts } from "@/lib/store-data-hooks";
import type { Product } from "@/lib/cart-context";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { flyToCart } from "@/lib/fly-to-cart";
import { motion, AnimatePresence } from "motion/react";
import { formatPriceAr } from "@/lib/format-ar";
import { inferUnitLabel } from "@/lib/storefront-home";

type SearchProduct = Product;
const EMPTY_PRODUCTS: SearchProduct[] = [];

interface SmartSearchBarProps {
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
  onSelectProduct?: () => void;
}

export function SmartSearchBar({
  className = "",
  placeholder = "ابحث عن منتج.. مثل: طماطم، أرز، لحم بلدي، لبن طازج",
  autoFocus = false,
  onSelectProduct,
}: SmartSearchBarProps) {
  const { query, setQuery } = useSearch();
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const { data: allProducts = EMPTY_PRODUCTS } = useStoreProducts();
  const [results, setResults] = useState<SearchProduct[]>(EMPTY_PRODUCTS);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const { addItem } = useCart();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Filter products whenever debouncedQuery changes
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults((prev) => (prev.length === 0 ? prev : EMPTY_PRODUCTS));
      setIsOpen((prev) => (prev ? false : prev));
      return;
    }

    setIsLoading(true);
    const matched = searchProductsFuzzy(allProducts, debouncedQuery, 0.4);
    setResults(matched.slice(0, 8)); // Top 8 suggestions
    setIsOpen(true);
    setIsLoading(false);
  }, [debouncedQuery, allProducts]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDirectAddToCart = (e: React.MouseEvent, product: SearchProduct) => {
    e.stopPropagation();
    if ((product.stock_quantity ?? 0) <= 0) return;
    const targetQty = product.is_by_weight ? 0.5 : 1;

    addItem(product, targetQty);

    setAddedIds((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedIds((prev) => ({ ...prev, [product.id]: false }));
    }, 1500);

    const targetImg =
      (e.currentTarget.parentElement?.querySelector("img") as HTMLImageElement) || null;
    flyToCart(targetImg);
    toast.success(`تمت إضافة "${product.name_ar || product.name}" للسلة بنجاح`);
  };

  const handleProductClick = (productId: string) => {
    setIsOpen(false);
    if (onSelectProduct) onSelectProduct();
    navigate({ to: "/products/$productId", params: { productId } });
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`} dir="rtl">
      <div className="relative flex items-center">
        <Input
          autoFocus={autoFocus}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen && e.target.value.trim()) setIsOpen(true);
          }}
          onFocus={() => {
            if (query.trim()) setIsOpen(true);
          }}
          placeholder={placeholder}
          className="h-10 w-full rounded-xl border border-border bg-card ps-10 pe-9 text-xs font-semibold shadow-xs transition-all focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 sm:h-11 sm:text-sm"
        />

        <div className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </div>

        {query && (
          <button
            type="button"
            aria-label="مسح البحث"
            onClick={() => {
              setQuery("");
              setIsOpen(false);
            }}
            className="absolute end-2.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Instant Autocomplete Suggestions Dropdown */}
      <AnimatePresence>
        {isOpen && query.trim().length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute start-0 end-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-border bg-card p-2 shadow-2xl"
          >
            {results.length > 0 ? (
              <div className="max-h-80 space-y-1 overflow-y-auto divide-y divide-border/40">
                <div className="flex items-center justify-between px-3 py-1.5 text-[11px] font-bold text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-primary" /> نتائج البحث السريع (
                    <bdi dir="ltr" className="tabular-nums">
                      {results.length}
                    </bdi>
                    )
                  </span>
                </div>

                {results.map((product) => {
                  const isAdded = addedIds[product.id];
                  const unavailable = (product.stock_quantity ?? 0) <= 0;
                  const showImg = Boolean(product.image_url) && !failedImages[product.id];
                  const unitLabel = product.is_by_weight ? "بالوزن" : inferUnitLabel(product);

                  return (
                    <div
                      key={product.id}
                      onClick={() => handleProductClick(product.id)}
                      className="group flex cursor-pointer items-center justify-between gap-3 rounded-xl p-2 transition-colors hover:bg-secondary/70"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl border border-border/50 bg-white">
                          {showImg ? (
                            <img
                              src={product.image_url!}
                              alt={product.name_ar || product.name}
                              onError={() =>
                                setFailedImages((prev) => ({ ...prev, [product.id]: true }))
                              }
                              className={`h-full w-full object-contain p-1 ${unavailable ? "opacity-50 grayscale" : ""}`}
                            />
                          ) : (
                            <ImageIcon className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <h4 className="truncate text-xs font-bold text-foreground transition-colors group-hover:text-primary">
                            {product.name_ar || product.name}
                          </h4>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] font-bold tabular-nums text-muted-foreground">
                            <span className="font-black text-primary">
                              {formatPriceAr(product.price_per_unit)}
                            </span>
                            {product.old_price && product.old_price > product.price_per_unit && (
                              <span className="text-[10px] line-through opacity-70">
                                {formatPriceAr(product.old_price)}
                              </span>
                            )}
                            <span className="text-[10px] text-muted-foreground">{unitLabel}</span>
                          </div>
                          {unavailable && (
                            <span className="text-[10px] font-bold text-destructive">
                              نفدت الكمية
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Direct Add-To-Cart Action Button */}
                      <Button
                        size="sm"
                        disabled={unavailable}
                        type="button"
                        onClick={(e) => handleDirectAddToCart(e, product)}
                        className={`h-9 px-3 rounded-xl font-black text-xs gap-1 shrink-0 transition-all ${
                          isAdded
                            ? "bg-emerald-500 text-white"
                            : "hero-gradient text-primary-foreground hover:opacity-90 active:scale-95 shadow-sm"
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check className="h-3.5 w-3.5" /> تم!
                          </>
                        ) : (
                          <>
                            <Plus className="h-3.5 w-3.5" /> أضف للسلة
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center space-y-2">
                <div className="mx-auto h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-lg">
                  🔍
                </div>
                <h4 className="text-xs font-bold text-foreground">لم نجد منتجات تطابق "{query}"</h4>
                <p className="text-[11px] text-muted-foreground">
                  جرب البحث بكلمة عامة مثل (أرز، زيت، لحم، جبن، مسحوق)
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
