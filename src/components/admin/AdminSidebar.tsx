import { Link, useRouterState, useRouter } from "@tanstack/react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Package,
  ListTree,
  Receipt,
  Settings,
  LogOut,
  Store,
  ExternalLink,
  Ticket,
  MessageSquare,
  Image as ImageIcon,
  MapPin,
  Sparkles,
  ShieldCheck,
  Database,
  Users,
  History,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { BRAND_NAME_AR } from "@/lib/brand";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface NavSection {
  label: string;
  items: {
    title: string;
    url: string;
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
    exact?: boolean;
    badge?: string;
    badgeVariant?: "emerald" | "amber" | "zinc";
  }[];
}

const navSections: NavSection[] = [
  {
    label: "الرئيسية والذكاء الاصطناعي",
    items: [
      {
        title: "لوحة المؤشرات",
        url: "/admin",
        icon: LayoutDashboard,
        exact: true,
      },
      {
        title: "المساعد الذكي",
        url: "/admin/copilot",
        icon: Sparkles,
        badge: "AI",
        badgeVariant: "emerald",
      },
    ],
  },
  {
    label: "العمليات والمخزون",
    items: [
      {
        title: "المنتجات والمخزون",
        url: "/admin/products",
        icon: Package,
      },
      {
        title: "التصنيفات",
        url: "/admin/categories",
        icon: ListTree,
      },
      {
        title: "الطلبات والمبيعات",
        url: "/admin/orders",
        icon: Receipt,
      },
      {
        title: "العملاء",
        url: "/admin/customers",
        icon: Users,
      },
    ],
  },
  {
    label: "التسويق والخدمات",
    items: [
      {
        title: "العروض والبانرات",
        url: "/admin/banners",
        icon: ImageIcon,
      },
      {
        title: "الكوبونات والخصومات",
        url: "/admin/coupons",
        icon: Ticket,
      },
      {
        title: "مناطق التوصيل",
        url: "/admin/delivery-zones",
        icon: MapPin,
      },
      {
        title: "تقييمات العملاء",
        url: "/admin/reviews",
        icon: MessageSquare,
      },
    ],
  },
  {
    label: "مركز التحكم",
    items: [
      { title: "المستخدمون والصلاحيات", url: "/admin/users", icon: ShieldCheck },
      { title: "استوديو البيانات", url: "/admin/database", icon: Database },
      { title: "سجل العمليات", url: "/admin/activity", icon: History },
      { title: "حوكمة الوكلاء", url: "/admin/governance", icon: History },
    ],
  },
  {
    label: "النظام",
    items: [
      {
        title: "الإعدادات العامة",
        url: "/admin/settings",
        icon: Settings,
      },
    ],
  },
];

export function AdminSidebar() {
  const router = useRouter();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { user, signOut } = useAuth();

  const isActive = (url: string, exact?: boolean) =>
    exact ? pathname === url : pathname === url || pathname.startsWith(url + "/");

  const handleSignOut = async () => {
    await signOut();
    toast.info("تم تسجيل الخروج بنجاح");
    router.history.push("/admin/login");
  };

  return (
    <Sidebar
      collapsible="icon"
      side="right"
      className="border-l border-sidebar-border"
    >
      {/* Sidebar Header */}
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-sidebar-primary text-sidebar-primary-foreground shadow-lg">
            <Store className="h-4 w-4" strokeWidth={1.5} />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold text-sidebar-accent-foreground">
                {BRAND_NAME_AR}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-sidebar-foreground/60 font-medium">
                <Database className="h-3 w-3 shrink-0 text-sidebar-primary" strokeWidth={1.5} />
                <span className="truncate">مركز القيادة التنفيذي</span>
              </div>
            </div>
          )}
        </div>
      </SidebarHeader>

      {/* Sidebar Navigation */}
      <SidebarContent className="px-3 py-3 space-y-4">
        {navSections.map((section, idx) => (
          <SidebarGroup key={idx} className="p-0">
            {!collapsed && (
              <SidebarGroupLabel className="text-[11px] font-bold text-sidebar-primary px-2 mb-1">
                {section.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5">
                {section.items.map((item) => {
                  const active = isActive(item.url, item.exact);
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        className={cn(
                          "h-10 px-3 rounded-xl text-[13px] font-medium transition-all cursor-pointer",
                          active
                            ? "!bg-sidebar-primary !text-sidebar-primary-foreground font-bold shadow-md"
                            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        )}
                      >
                        <Link
                          to={item.url}
                          className="flex items-center justify-between gap-2.5 w-full"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Icon
                              className={cn(
                                "h-4 w-4 shrink-0 transition-colors",
                                active ? "text-sidebar-primary-foreground" : "text-sidebar-primary",
                              )}
                              strokeWidth={1.5}
                            />
                            {!collapsed && (
                              <span className="truncate">{item.title}</span>
                            )}
                          </div>
                          {!collapsed && item.badge && (
                            <span
                              className={cn(
                                "text-[9px] font-semibold px-1.5 py-0.2 rounded-md shrink-0",
                                "bg-sidebar-primary text-sidebar-primary-foreground",
                              )}
                            >
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* Sidebar Footer */}
      <SidebarFooter className="border-t border-sidebar-border p-3 space-y-1.5">
        {!collapsed && (
          <div className="px-2 py-1.5 rounded-xl bg-sidebar-accent border border-sidebar-border text-[11px] flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <ShieldCheck className="h-3.5 w-3.5 text-sidebar-primary shrink-0" strokeWidth={1.5} />
              <span className="truncate text-sidebar-foreground font-mono text-[10px]" dir="ltr">
                {user?.email || "admin@store.com"}
              </span>
            </div>
            <span className="text-[9px] font-semibold text-sidebar-primary-foreground bg-sidebar-primary px-1.5 py-0.2 rounded">
              مسؤول
            </span>
          </div>
        )}

        <Link to="/" className="block">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-xs font-medium text-sidebar-foreground/75 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent rounded-lg cursor-pointer h-8 px-2"
          >
            <ExternalLink className="h-3.5 w-3.5 " strokeWidth={1.5} />
            {!collapsed && <span>عرض المتجر</span>}
          </Button>
        </Link>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="w-full justify-start gap-2 text-xs font-medium text-sidebar-foreground/75 hover:text-destructive hover:bg-sidebar-accent rounded-lg cursor-pointer h-8 px-2"
        >
          <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
          {!collapsed && <span>تسجيل الخروج</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

