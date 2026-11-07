import { SITE_URL } from "@/lib/brand";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, useMemo, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { CartProvider } from "@/lib/cart-context";
import { AuthProvider } from "@/lib/auth-context";
import { SettingsProvider } from "@/lib/settings-context";
import { ThemeProvider } from "@/lib/theme-context";
import { ColorModeProvider } from "@/lib/color-mode-context";
import { I18nProvider } from "@/lib/i18n-context";
import { SearchProvider } from "@/lib/search-context";
import { AnnouncementBar } from "@/components/storefront/AnnouncementBar";
import { BottomNav } from "@/components/storefront/BottomNav";
import { StickyCartBar } from "@/components/storefront/StickyCartBar";
import { Header } from "@/components/storefront/Header";
import { useRouterState } from "@tanstack/react-router";

import { LayoutConfigProvider } from "@/lib/layout-config-context";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">الصفحة غير موجودة</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          الصفحة التي تبحث عنها غير موجودة أو تم نقلها.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            العودة للرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  const reportedError = useMemo(
    () => (error instanceof Error ? error : new Error(String(error))),
    [error],
  );
  console.error(reportedError);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(reportedError, { boundary: "tanstack_root_error_component" });
  }, [reportedError]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">حدث خطأ ما</h1>
        <p className="mt-2 text-sm text-muted-foreground">نعتذر، حدث خلل أثناء تحميل الصفحة.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            إعادة المحاولة
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            الرئيسية
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { property: "og:site_name", content: "متجر إلكتروني" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "متجر إلكتروني" },
      { property: "og:title", content: "متجر إلكتروني" },
      { name: "twitter:title", content: "متجر إلكتروني" },
      {
        name: "description",
        content: "تسوّق من المتجر الإلكتروني واختر المنتجات المتاحة للتوصيل.",
      },
      {
        property: "og:description",
        content: "تسوّق من المتجر الإلكتروني واختر المنتجات المتاحة للتوصيل.",
      },
      {
        name: "twitter:description",
        content: "تسوّق من المتجر الإلكتروني واختر المنتجات المتاحة للتوصيل.",
      },
      {
        property: "og:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/7FGpG204P8ZoMaDVUrQDzFmMxBS2/social-images/social-1785331350061-1785331017982.webp",
      },
      {
        name: "twitter:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/7FGpG204P8ZoMaDVUrQDzFmMxBS2/social-images/social-1785331350061-1785331017982.webp",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&family=Tajawal:wght@400;500;700;800;900&family=Readex+Pro:wght@300;400;500;600;700&display=swap",
      },
      { rel: "stylesheet", href: appCss },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "المتجر الإلكتروني",
          url: `${SITE_URL}/`,
          logo: `${SITE_URL}/favicon.svg`,
          description: "متجر إلكتروني للمنتجات المتاحة للتوصيل.",
        }),
      },
    ],
  }),

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {}, []);

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <SettingsProvider>
          <ThemeProvider>
            <ColorModeProvider storageKey="store-color-mode" defaultMode="light">
              <LayoutConfigProvider>
                <AuthProvider>
                  <CartProvider>
                    <SearchProvider>
                      <StorefrontAnnouncement />
                      <StorefrontHeader />
                      <RouteFade>
                        <div className="pb-36 md:pb-0">
                          <Outlet />
                        </div>
                      </RouteFade>
                      <StickyCartBar />
                      <BottomNav />
                      <Toaster position="top-center" dir="rtl" richColors />
                    </SearchProvider>
                  </CartProvider>
                </AuthProvider>
              </LayoutConfigProvider>
            </ColorModeProvider>
          </ThemeProvider>
        </SettingsProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

// صفحات لها شريطها الخاص: الأدمن، الدخول، وصفحة نواة (/assistant).
function hasOwnChrome(pathname: string) {
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/assistant")
  );
}

function StorefrontAnnouncement() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (hasOwnChrome(pathname)) return null;
  return <AnnouncementBar />;
}

function StorefrontHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (hasOwnChrome(pathname)) return null;
  return <Header />;
}

// Smooth route layout container without forced unmount
function RouteFade({ children }: { children: ReactNode }) {
  return <div className="transition-opacity duration-150">{children}</div>;
}
