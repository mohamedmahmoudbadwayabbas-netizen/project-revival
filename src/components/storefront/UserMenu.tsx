import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  User,
  LogOut,
  Languages,
  Sun,
  Moon,
  UserCircle2,
  LogIn,
  LayoutDashboard,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { AuthModal } from "@/components/auth/AuthModal";

export function UserMenu() {
  const { user, isAdmin, isStaff, signOut } = useAuth();
  const { t, lang, theme, toggleLang, toggleTheme, dir } = useI18n();
  const navigate = useNavigate();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    toast.success(lang === "ar" ? "تم تسجيل الخروج بنجاح" : "Signed out successfully");
    navigate({ to: "/" });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative h-10 w-10 shrink-0 rounded-2xl bg-secondary/60 hover:bg-secondary cursor-pointer"
            aria-label={t("menu.account")}
          >
            <User className="h-5 w-5" />
            {isAdmin && (
              <span
                className="absolute -top-0.5 -end-0.5 grid h-4 w-4 place-items-center rounded-full bg-amber-500 text-[9px] text-white font-black shadow-xs"
                title="مسؤول المتجر"
              >
                👑
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align={dir === "rtl" ? "start" : "end"}
          className="w-64 rounded-2xl bg-popover p-2 shadow-2xl border border-border text-right"
        >
          {user ? (
            <>
              <DropdownMenuLabel className="p-2 text-xs">
                <div className="truncate font-bold text-foreground">
                  {user.user_metadata?.full_name || user.email}
                </div>
                {isAdmin ? (
                  <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-extrabold text-amber-800 dark:text-amber-300 border border-amber-500/30">
                    <ShieldCheck className="h-3 w-3" /> مسئول النظام (Admin)
                  </span>
                ) : isStaff ? (
                  <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-blue-500/15 px-2 py-0.5 text-[10px] font-extrabold text-blue-800 dark:text-blue-300 border border-blue-500/30">
                    <ShieldCheck className="h-3 w-3" /> موظف المتجر (Staff)
                  </span>
                ) : (
                  <span className="text-[11px] text-muted-foreground font-normal">عميل مسجّل</span>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {/* رابط لوحة الإدارة يظهر للمسؤولين وموظفي المتجر */}
              {(isAdmin || isStaff) && (
                <>
                  <DropdownMenuItem
                    asChild
                    className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 my-1 font-bold rounded-xl cursor-pointer"
                  >
                    <Link to="/admin" className="flex w-full items-center gap-2">
                      <LayoutDashboard className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <span>لوحة تحكم الإدارة</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}

              <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                <Link to="/account" className="flex w-full items-center gap-2">
                  <UserCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>حسابي وطلباتي</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={toggleLang} className="cursor-pointer rounded-xl">
                <Languages className="h-4 w-4" />
                <span className="flex-1">{t("menu.language")}</span>
                <span className="text-xs text-muted-foreground font-bold">
                  {lang === "ar" ? "EN" : "AR"}
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer rounded-xl">
                {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                <span className="flex-1">{t("menu.theme")}</span>
                <span className="text-xs text-muted-foreground font-bold">
                  {theme === "light" ? t("theme.dark") : t("theme.light")}
                </span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer text-destructive focus:text-destructive rounded-xl font-bold"
              >
                <LogOut className="h-4 w-4" />
                <span>{t("menu.logout")}</span>
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuItem
                onClick={() => setAuthModalOpen(true)}
                className="rounded-xl cursor-pointer font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 mb-1"
              >
                <Zap className="h-4 w-4 text-emerald-600" />
                <span>دخول سريع (نافذة منبثقة)</span>
              </DropdownMenuItem>

              <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                <Link
                  to="/auth"
                  search={{ next: undefined }}
                  className="flex w-full items-center gap-2 font-bold"
                >
                  <LogIn className="h-4 w-4 text-emerald-600" />
                  <span>صفحة تسجيل الدخول</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                <Link
                  to="/admin"
                  className="flex w-full items-center gap-2 font-bold text-amber-800 dark:text-amber-300"
                >
                  <ShieldCheck className="h-4 w-4 text-amber-600" />
                  <span>لوحة تحكم الإدارة</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={toggleLang} className="cursor-pointer rounded-xl">
                <Languages className="h-4 w-4" />
                <span className="flex-1">{t("menu.language")}</span>
                <span className="text-xs text-muted-foreground font-bold">
                  {lang === "ar" ? "EN" : "AR"}
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer rounded-xl">
                {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                <span className="flex-1">{t("menu.theme")}</span>
                <span className="text-xs text-muted-foreground font-bold">
                  {theme === "light" ? t("theme.dark") : t("theme.light")}
                </span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AuthModal
        isOpen={authModalOpen}
        onOpenChange={setAuthModalOpen}
        onSuccess={() => setAuthModalOpen(false)}
      />
    </>
  );
}

export default UserMenu;
