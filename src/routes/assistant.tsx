import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useState } from "react";
import { AuthModal } from "@/components/auth/AuthModal";
import { NawatTopBar } from "@/components/nawat/NawatTopBar";
import { NawatMark } from "@/components/nawat/icons";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: "نواة — مساعد التسوّق من الوادي الأخضر" },
      {
        name: "description",
        content: "دردش مع نواة واحصل على اقتراحات مشتريات حقيقية من سوبرماركت الوادي الأخضر.",
      },
      { property: "og:title", content: "نواة — مساعد التسوّق من الوادي الأخضر" },
      { property: "og:description", content: "محادثات محفوظة واقتراحات من منتجات متوفرة فعلًا." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AssistantLayout,
});

function AssistantLayout() {
  const { isAuthenticated, loading } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  return (
    <div className="nw-page" dir="rtl">
      <NawatTopBar />
      {loading ? null : isAuthenticated ? (
        <Outlet />
      ) : (
        <main className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
          <NawatMark size={64} />
          <h1 className="text-2xl font-bold text-foreground">سجّل دخولك عشان تكلم نواة</h1>
          <p className="text-muted-foreground">
            محادثاتك بتتحفظ في حسابك وتقدر ترجعلها من أي جهاز.
          </p>
          <Button onClick={() => setAuthOpen(true)}>تسجيل الدخول</Button>
        </main>
      )}
      <AuthModal isOpen={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}
