import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Beta namespace — narrow local typing so TS accepts these calls.
type OAuthDetails = {
  client?: { name?: string; redirect_uris?: string[] } | null;
  redirect_url?: string;
  redirect_to?: string;
  scopes?: string[];
};
type OAuthApi = {
  getAuthorizationDetails: (
    id: string,
  ) => Promise<{ data: OAuthDetails | null; error: { message: string } | null }>;
  approveAuthorization: (
    id: string,
  ) => Promise<{ data: OAuthDetails | null; error: { message: string } | null }>;
  denyAuthorization: (
    id: string,
  ) => Promise<{ data: OAuthDetails | null; error: { message: string } | null }>;
};
const oauthApi = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

function safeRelative(path: string) {
  return path.startsWith("/") && !path.startsWith("//") ? path : "/";
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  head: () => ({
    meta: [{ title: "منح الوصول — سوبرماركت الوادي الأخضر" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = safeRelative(location.pathname + location.searchStr);
      throw redirect({ to: "/auth", search: { next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauthApi().getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main dir="rtl" className="grid min-h-screen place-items-center p-6 text-center">
      <div className="max-w-md">
        <h1 className="mb-2 text-xl font-bold">تعذر تحميل طلب الوصول</h1>
        <p className="text-sm text-muted-foreground">
          {String((error as Error)?.message ?? error)}
        </p>
      </div>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const api = oauthApi();
    const { data, error } = approve
      ? await api.approveAuthorization(authorization_id)
      : await api.denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  const clientName = details?.client?.name ?? "تطبيق خارجي";

  return (
    <main dir="rtl" className="grid min-h-screen place-items-center bg-background px-4">
      <div className="w-full max-w-md rounded-3xl border-2 border-[#C9A86B] bg-card p-7 shadow-elegant">
        <h1 className="text-center font-display text-xl font-bold">
          ربط <span className="text-primary">{clientName}</span> بحسابك
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          سيتمكن <b>{clientName}</b> من استخدام هذا التطبيق بالنيابة عنك واستدعاء أدواته المفعّلة
          أثناء تسجيل دخولك.
        </p>
        <ul className="mt-4 space-y-1.5 text-sm">
          <li>• الوصول لأدوات المتجر (البحث، التصنيفات، تفاصيل المنتجات).</li>
          <li>• قراءة طلباتك وقائمة أمنياتك الخاصة بك فقط (وفق صلاحيات RLS).</li>
          <li>• لا يتم كشف كلمة المرور أو صلاحيات المسؤول.</li>
        </ul>
        {error && (
          <p
            role="alert"
            className="mt-3 rounded-lg bg-destructive/10 p-2 text-center text-xs text-destructive"
          >
            {error}
          </p>
        )}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            disabled={busy}
            onClick={() => decide(false)}
            className="h-11 rounded-xl border-2 border-border bg-background text-sm font-bold hover:bg-accent disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            disabled={busy}
            onClick={() => decide(true)}
            className="h-11 rounded-xl bg-primary text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "جارٍ..." : "الموافقة والربط"}
          </button>
        </div>
      </div>
    </main>
  );
}
