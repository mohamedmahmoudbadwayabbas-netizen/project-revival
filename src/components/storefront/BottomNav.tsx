import { Link, useRouterState } from "@tanstack/react-router";
import { Home, LayoutGrid, ShoppingBag, Sparkles, User } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { totalCount } = useCart();
  const { user } = useAuth();

  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/assistant") ||
    pathname.startsWith("/products/")
  )
    return null;

  const accountTo = user ? "/account" : "/auth";
  const isCart = pathname.startsWith("/cart");

  return (
    <nav
      dir="rtl"
      className="fixed inset-x-0 bottom-0 z-50 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto grid h-[60px] max-w-md grid-cols-5 items-center rounded-t-2xl border-t border-slate-100 bg-card px-1 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] dark:border-border">
        <NavItem to="/" icon={Home} label="الرئيسية" active={pathname === "/"} />
        <NavItem
          to="/categories"
          icon={LayoutGrid}
          label="الأقسام"
          active={pathname.startsWith("/categories")}
        />
        <li className="flex justify-center">
          <Link
            to="/cart"
            aria-label="السلة"
            className={cn(
              "relative -mt-6 grid h-14 w-14 place-items-center rounded-full border-4 border-background text-primary-foreground shadow-float transition-transform active:scale-95",
              isCart ? "bg-primary-dark" : "bg-primary",
            )}
          >
            <ShoppingBag className="h-6 w-6" />
            {totalCount > 0 && (
              <span className="absolute -top-1 -end-1 grid h-6 min-w-6 place-items-center rounded-full border-2 border-background bg-accent px-1 text-xs font-black text-accent-foreground">
                <bdi dir="ltr" className="tabular-nums">
                  {totalCount}
                </bdi>
              </span>
            )}
          </Link>
        </li>
        <NavItem
          to="/assistant"
          icon={Sparkles}
          label="نواة"
          active={pathname.startsWith("/assistant")}
          glow
        />
        <NavItem
          to={accountTo}
          icon={User}
          label="حسابي"
          active={pathname.startsWith("/account")}
        />
      </ul>
    </nav>
  );
}

function NavItem({
  to,
  icon: Icon,
  label,
  active,
  glow,
}: {
  to: string;
  icon: typeof Home;
  label: string;
  active: boolean;
  glow?: boolean;
}) {
  return (
    <li>
      <Link
        to={to}
        className={cn(
          "flex min-h-11 flex-col items-center justify-center gap-0.5 px-1 transition-colors active:scale-95",
          active ? "text-primary" : "text-muted-foreground hover:text-primary",
        )}
      >
        <Icon
          className={cn(
            "h-5 w-5",
            active && "stroke-[2.4]",
            glow && !active && "animate-pulse text-primary",
          )}
        />
        <span className="text-xs font-semibold">{label}</span>
      </Link>
    </li>
  );
}
