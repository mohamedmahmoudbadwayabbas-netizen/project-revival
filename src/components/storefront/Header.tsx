import { BRAND_NAME_AR, BRAND_NAME_EN } from "@/lib/brand";
import { useState } from "react";
import {
  Search,
  ShoppingBag,
  Menu,
  X,
  Store,
  Sparkles,
  ShieldCheck,
  Layers,
  MapPin,
  ChevronLeft,
  User,
} from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n-context";
import { useSettings } from "@/lib/settings-context";
import { Link, useRouterState } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { UserMenu } from "./UserMenu";
import { ColorModeToggle } from "@/components/ColorModeToggle";
import { SmartSearchBar } from "./SmartSearchBar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function Header() {
  const { totalCount } = useCart();
  const { isAdmin, user, signOut } = useAuth();
  const { t, lang } = useI18n();
  const settings = useSettings();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isHomePage = pathname === "/";

  const logoUrl = settings.logo_url;
  const siteName = settings.site_name || (lang === "ar" ? BRAND_NAME_AR : BRAND_NAME_EN);
  const [searchOpen, setSearchOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleMobileSearchClick = () => {
    if (isHomePage) {
      const mobileInput = document.querySelector<HTMLInputElement>("#mobile-unified-search input");
      if (mobileInput) {
        mobileInput.scrollIntoView({ behavior: "smooth", block: "center" });
        mobileInput.focus();
        return;
      }
    }
    setSearchOpen((v) => !v);
  };

  return (
    <header className="elwadi-main-header sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-14 max-w-[1320px] items-center justify-between gap-3 px-3 sm:h-16 sm:px-6">
        {/* المنطقة ١: القائمة + الشعار النظيف */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="القائمة الرئيسية"
                className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-xl bg-secondary/70 text-foreground transition-colors hover:bg-secondary active:scale-95"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="flex w-80 flex-col justify-between border-l border-border/80 bg-background p-0 text-foreground sm:w-96"
              dir="rtl"
            >
              {/* Header section of Drawer */}
              <div className="space-y-3 border-b border-border/70 p-5">
                <div className="flex items-center gap-3">
                  <div className="hero-gradient grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white shadow-sm">
                    <Store className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-black leading-tight text-foreground">
                      {siteName}
                    </h3>
                    <span className="mt-0.5 block text-[11px] font-semibold text-muted-foreground">
                      سوبرماركت لاحتياجات البيت
                    </span>
                  </div>
                </div>

                {settings.store_address && (
                  <div className="flex items-start gap-2 rounded-xl border border-border/60 bg-secondary/50 p-2.5 text-xs">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <span className="font-semibold leading-5 text-foreground">
                      {settings.store_address}
                    </span>
                  </div>
                )}
              </div>

              {/* Navigation Links inside Drawer */}
              <div className="flex-1 space-y-1.5 overflow-y-auto p-4">
                <div className="px-2 py-1 text-[10px] font-black uppercase text-muted-foreground">
                  تصفح المتجر
                </div>

                <Link
                  to="/"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center justify-between rounded-xl p-3 text-xs font-bold transition-colors hover:bg-secondary"
                >
                  <div className="flex items-center gap-3">
                    <Store className="h-4 w-4 text-primary" />
                    <span>الرئيسية وعروض اليوم</span>
                  </div>
                  <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                </Link>

                <Link
                  to="/categories"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center justify-between rounded-xl p-3 text-xs font-bold transition-colors hover:bg-secondary"
                >
                  <div className="flex items-center gap-3">
                    <Layers className="h-4 w-4 text-primary" />
                    <span>أقسام وسلع السوبرماركت</span>
                  </div>
                  <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                </Link>

                <Link
                  to="/cart"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center justify-between rounded-xl p-3 text-xs font-bold transition-colors hover:bg-secondary"
                >
                  <div className="flex items-center gap-3">
                    <ShoppingBag className="h-4 w-4 text-primary" />
                    <span>سلة المشتريات</span>
                  </div>
                  {totalCount > 0 && (
                    <Badge className="bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">
                      <bdi dir="ltr" className="tabular-nums">
                        {totalCount}
                      </bdi>
                    </Badge>
                  )}
                </Link>

                <Link
                  to="/assistant"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/10 p-3 text-xs font-bold transition-colors hover:bg-primary/15"
                >
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span>نواة — مساعد التسوّق</span>
                  </div>
                  <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                </Link>

                <Link
                  to="/account"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center justify-between rounded-xl p-3 text-xs font-bold transition-colors hover:bg-secondary"
                >
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-primary" />
                    <span>حسابي وطلباتي السابقة</span>
                  </div>
                  <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                </Link>

                {isAdmin ? (
                  <>
                    <div className="mt-2 flex items-center gap-1 border-t border-border/50 px-2 pt-3 text-[10px] font-black uppercase text-amber-600 dark:text-amber-400">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>الإدارة</span>
                    </div>

                    <Link
                      to="/admin"
                      onClick={() => setDrawerOpen(false)}
                      className="flex items-center justify-between rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs font-bold text-amber-900 transition-all hover:bg-amber-500/15 dark:text-amber-200"
                    >
                      <div className="flex items-center gap-3">
                        <ShieldCheck className="h-4 w-4 text-amber-600" />
                        <span>لوحة الإدارة المركزية</span>
                      </div>
                      <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                    </Link>

                    <Link
                      to="/admin/copilot"
                      onClick={() => setDrawerOpen(false)}
                      className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/10 p-3 text-xs font-black text-primary transition-all hover:bg-primary/15 dark:text-emerald-300"
                    >
                      <div className="flex items-center gap-3">
                        <Sparkles className="h-4 w-4 text-amber-500" />
                        <span>{siteName} AI</span>
                      </div>
                      <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  </>
                ) : (
                  <Link
                    to="/admin"
                    onClick={() => setDrawerOpen(false)}
                    className="flex items-center justify-between rounded-xl p-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="h-4 w-4 text-amber-600" />
                      <span>دخول لوحة الإدارة</span>
                    </div>
                    <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                  </Link>
                )}
              </div>

              {/* Drawer Footer */}
              <div className="space-y-2 border-t border-border/60 bg-secondary/30 p-4">
                {user ? (
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <User className="h-4 w-4 text-primary" />
                      <span className="truncate text-[11px] font-bold">{user.email}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => signOut()}
                      className="cursor-pointer text-[11px] font-bold text-rose-600 hover:underline"
                    >
                      خروج
                    </button>
                  </div>
                ) : (
                  <Link
                    to="/auth"
                    search={{ next: undefined }}
                    onClick={() => setDrawerOpen(false)}
                    className="hero-gradient block rounded-xl py-2.5 text-center text-xs font-bold text-white shadow-xs"
                  >
                    تسجيل الدخول / حساب جديد
                  </Link>
                )}
              </div>
            </SheetContent>
          </Sheet>

          <Link to="/" className="group flex min-w-0 items-center gap-2">
            {logoUrl ? (
              <img src={logoUrl} alt={siteName} className="h-8 w-auto object-contain" />
            ) : (
              <div className="hero-gradient grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white shadow-xs transition-transform group-hover:scale-105">
                <Store className="h-4 w-4" />
              </div>
            )}
            <span className="truncate font-display text-base font-black tracking-tight text-foreground sm:text-lg">
              {siteName}
            </span>
          </Link>
        </div>

        {/* المنطقة ٢: البحث الذكي الموحّد (مدمج في الهيدر للشاشات المتوسطة والكبيرة) */}
        <div className="hidden max-w-md flex-1 md:block lg:max-w-lg">
          <SmartSearchBar placeholder="ابحث عن منتج.. طماطم، أرز، لحم، حليب" />
        </div>

        {/* المنطقة ٣: أدوات العميل الأساسية */}
        <div className="flex items-center gap-1.5">
          {!isHomePage && (
            <button
              type="button"
              onClick={handleMobileSearchClick}
              aria-label={t("search.placeholder") || "بحث"}
              className="grid h-10 w-10 cursor-pointer place-items-center rounded-xl bg-secondary/70 text-foreground transition-colors hover:bg-secondary md:hidden"
            >
              {searchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
            </button>
          )}

          {isAdmin && (
            <Link
              to="/admin"
              aria-label="لوحة الإدارة"
              className="hidden h-10 items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/15 px-3 text-xs font-black text-amber-900 transition-colors hover:bg-amber-500/25 sm:flex dark:text-amber-200"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
              <span className="hidden lg:inline">الإدارة</span>
            </Link>
          )}

          <Link
            to="/assistant"
            aria-label="نواة — مساعد التسوّق"
            className="hidden h-10 items-center gap-1.5 rounded-xl border border-primary/25 bg-primary/10 px-3 text-xs font-black text-primary transition-colors hover:bg-primary/15 sm:inline-flex"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>نواة</span>
          </Link>

          <ColorModeToggle className="h-10 w-10 rounded-xl bg-secondary/70 hover:bg-secondary" />

          <div className="hidden md:block">
            <UserMenu />
          </div>

          <Link
            id="cart-icon-target"
            to="/cart"
            aria-label={t("nav.cart")}
            className="relative hidden h-10 w-10 place-items-center rounded-xl bg-secondary/70 text-foreground transition-colors hover:bg-secondary md:grid"
          >
            <ShoppingBag className="h-5 w-5" />
            {totalCount > 0 && (
              <Badge className="absolute -end-1 -top-1 h-5 min-w-5 justify-center rounded-full border-2 border-background bg-primary px-1 text-[10px] font-black text-primary-foreground">
                <bdi dir="ltr" className="tabular-nums">
                  {totalCount}
                </bdi>
              </Badge>
            )}
          </Link>
        </div>
      </div>

      {/* شريط بحث منسدل فقط في الصفحات الداخلية على الجوال عند الضغط على أيقونة البحث */}
      {searchOpen && !isHomePage && (
        <div className="border-t border-border/50 bg-card px-3 pb-3 pt-2.5 shadow-md md:hidden">
          <SmartSearchBar autoFocus onSelectProduct={() => setSearchOpen(false)} />
        </div>
      )}
    </header>
  );
}
