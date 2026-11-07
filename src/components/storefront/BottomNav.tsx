import { Link, useRouterState } from "@tanstack/react-router";
import { Home, LayoutGrid, ShoppingBag, Sparkles, User } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { totalCount } = useCart();
  const { user } = useAuth();

  if (pathname.startsWith("/admin") || pathname.startsWith("/auth") || pathname.startsWith("/assistant")) return null;

  const accountTo = user ? "/account" : "/auth";
  const isCart = pathname.startsWith("/cart");

  return (
    <nav
      dir="rtl"
      className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5 items-end rounded-3xl border border-border/70 bg-card/95 px-1.5 py-1.5 shadow-elegant backdrop-blur-xl">
        <NavItem to="/" icon={Home} label="الرئيسية" active={pathname === "/"} />
        <NavItem to="/categories" icon={LayoutGrid} label="الأقسام" active={pathname.startsWith("/categories")} />
        <li className="flex justify-center">
          <Link
            to="/cart"
            aria-label="السلة"
            className={cn(
              "relative -mt-7 grid h-16 w-16 place-items-center rounded-full border-4 border-background text-primary-foreground shadow-elegant transition-transform active:scale-95",
              isCart ? "bg-accent" : "bg-fresh",
            )}
          >
            <ShoppingBag className="h-6 w-6" />
            {totalCount > 0 && (
              <span className="absolute -top-1 -end-1 grid h-6 min-w-6 place-items-center rounded-full border-2 border-background bg-accent px-1 text-[11px] font-black text-accent-foreground">
                <bdi dir="ltr" className="tabular-nums">{totalCount}</bdi>
              </span>
            )}
          </Link>
        </li>
        <NavItem to="/assistant" icon={Sparkles} label="نواة" active={false} />
        <NavItem to={accountTo} icon={User} label="حسابي" active={pathname.startsWith("/account")} />
      </ul>
    </nav>
  );
}

function NavItem({ to, icon: Icon, label, active }: { to: string; icon: typeof Home; label: string; active: boolean }) {
  return (
    <li>
      <Link
        to={to}
        className={cn(
          "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 transition-colors active:scale-95",
          active ? "bg-secondary text-primary" : "text-muted-foreground hover:text-primary",
        )}
      >
        <Icon className={cn("h-5 w-5", active && "stroke-[2.4]")} />
        <span className="text-[11px] font-bold">{label}</span>
      </Link>
    </li>
  );
}
