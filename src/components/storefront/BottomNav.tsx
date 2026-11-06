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

  const isHome = pathname === "/";
  const isCats = pathname.startsWith("/categories");
  const isAccount = pathname.startsWith("/account");
  const accountTo = user ? "/account" : "/auth";

  return (
    <nav
      dir="rtl"
      className="fixed inset-x-0 md:hidden bottom-0 z-50 border-t border-border/60 bg-background pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_-6px_rgba(0,0,0,0.08)]"
    >
      <ul className="mx-auto grid max-w-xl grid-cols-5 gap-1 px-2 py-1.5">
        <NavItem to="/" icon={Home} label="الرئيسية" active={isHome} />
        <NavItem to="/categories" icon={LayoutGrid} label="الفئات" active={isCats} />
        <NavItem to="/assistant" icon={Sparkles} label="مساعد التسوق" active={pathname.startsWith("/assistant")} />

        <li>
          <Link
            to="/cart"
            className="relative flex w-full flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-muted-foreground transition-colors hover:text-primary"
            aria-label="السلة"
          >
            <span className="relative">
              <ShoppingBag className="h-5 w-5" />
              {totalCount > 0 && (
                <span className="absolute -end-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[9px] font-black text-accent-foreground">
                  <bdi dir="ltr" className="tabular-nums">{totalCount}</bdi>
                </span>
              )}
            </span>
            <span className="text-[10px] font-bold">السلة</span>
          </Link>
        </li>

        <NavItem to={accountTo} icon={User} label="حسابي" active={isAccount} />
      </ul>
    </nav>
  );
}

function NavItem({
  to,
  icon: Icon,
  label,
  active,
}: {
  to: string;
  icon: typeof Home;
  label: string;
  active: boolean;
}) {
  return (
    <li>
      <Link
        to={to}
        className={cn(
          "flex flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 transition-colors",
          active ? "text-primary" : "text-muted-foreground hover:text-primary",
        )}
      >
        <Icon className={cn("h-5 w-5", active && "stroke-[2.4]")} />
        <span className="text-[10px] font-bold">{label}</span>
      </Link>
    </li>
  );
}
