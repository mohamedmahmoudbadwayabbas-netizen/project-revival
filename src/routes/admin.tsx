import { AiAlertBanner } from "@/components/admin/AiAlertBanner";
import { createFileRoute, Outlet, useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { ColorModeProvider } from "@/lib/color-mode-context";
import { ColorModeToggle } from "@/components/ColorModeToggle";
import { useAuth } from "@/lib/auth-context";
import {
  ShieldCheck,
  Store,
  Database,
  Building2,
  Loader2,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { BRAND_NAME_AR } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { AdminCommandSearch } from "@/components/admin/AdminCommandSearch";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: `لوحة التحكم — ${BRAND_NAME_AR}` },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminLayout,
});

export function AdminLayout() {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isLoginRoute = pathname === "/admin/login";
  const { isAdmin, loading } = useAuth();

  // Strict Route Guard: Protect all /admin endpoints except /admin/login
  useEffect(() => {
    if (!loading && !isAdmin && !isLoginRoute) {
      router.history.push("/admin/login");
    }
  }, [isAdmin, loading, isLoginRoute, router]);

  if (isLoginRoute) {
    return <Outlet />;
  }

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background" dir="rtl">
        <div className="text-center space-y-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" strokeWidth={1.5} />
          <p className="text-xs font-medium text-zinc-500">جاري التحقق من صلاحيات المسؤول...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const isCopilotRoute = pathname.startsWith("/admin/copilot");

  return (
    <ColorModeProvider storageKey="admin-color-mode" defaultMode="light">
      <SidebarProvider>
        <div className="admin-lux flex min-h-screen w-full bg-background text-foreground" dir="rtl">
          <AdminSidebar />
          <SidebarInset className="flex-1 min-w-0 bg-background">
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-background/80 px-4 sm:px-6 backdrop-blur-xl">
              <div className="flex items-center gap-3 min-w-0">
                <SidebarTrigger className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-accent" />
                <AdminCommandSearch />
              </div>
              <div className="flex items-center gap-2">
                <Link to="/admin/copilot">
                  <Button variant="outline" size="sm" className="h-9 rounded-xl gap-1.5">
                    <Sparkles className="h-4 w-4 text-gold" strokeWidth={1.5} />
                    <span className="hidden sm:inline">المساعد الذكي</span>
                  </Button>
                </Link>
                <ColorModeToggle />
                <Link to="/" target="_blank" rel="noopener noreferrer">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 rounded-xl gap-1 text-muted-foreground"
                  >
                    <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
                    <span className="hidden md:inline">المتجر</span>
                  </Button>
                </Link>
              </div>
            </header>
            <AiAlertBanner />
            <main
              className={
                isCopilotRoute
                  ? "flex-1 w-full h-[calc(100dvh-4rem)] overflow-hidden"
                  : "flex-1 p-4 sm:p-8 max-w-[1400px] mx-auto w-full"
              }
            >
              <Outlet />
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </ColorModeProvider>
  );
}
