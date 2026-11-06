import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, Package, Receipt, User, LayoutDashboard, ShieldCheck, Database, History, Settings, Ticket } from "lucide-react";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";

const PAGES = [
  { label: "لوحة المؤشرات", to: "/admin", icon: LayoutDashboard },
  { label: "المستخدمون والصلاحيات", to: "/admin/users", icon: ShieldCheck },
  { label: "استوديو البيانات", to: "/admin/database", icon: Database },
  { label: "سجل العمليات", to: "/admin/activity", icon: History },
  { label: "المنتجات", to: "/admin/products", icon: Package },
  { label: "الطلبات", to: "/admin/orders", icon: Receipt },
  { label: "الكوبونات", to: "/admin/coupons", icon: Ticket },
  { label: "الإعدادات", to: "/admin/settings", icon: Settings },
];

type Hit = { id: string; label: string; sub: string; to: string; kind: "product" | "order" | "customer" };

export function AdminCommandSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setHits([]); return; }
    const t = setTimeout(async () => {
      const like = `%${term.replace(/[%,()]/g, "")}%`;
      const [p, o, c] = await Promise.all([
        supabase.from("products").select("id,name").ilike("name", like).limit(5),
        supabase.from("orders").select("id,customer_name,phone,total_price").or(`customer_name.ilike.${like},phone.ilike.${like}`).limit(5),
        supabase.from("profiles").select("id,full_name,phone").or(`full_name.ilike.${like},phone.ilike.${like}`).limit(5),
      ]);
      setHits([
        ...(p.data ?? []).map((x) => ({ id: x.id, label: x.name, sub: "منتج", to: "/admin/products", kind: "product" as const })),
        ...(o.data ?? []).map((x) => ({ id: x.id, label: `${x.customer_name} — ${x.phone}`, sub: `طلب بقيمة ${x.total_price} ج.م`, to: "/admin/orders", kind: "order" as const })),
        ...(c.data ?? []).map((x) => ({ id: x.id, label: x.full_name || x.phone || "عميل", sub: x.phone || "عميل", to: "/admin/users", kind: "customer" as const })),
      ]);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const go = (to: string) => { setOpen(false); setQ(""); navigate({ to }); };
  const icon = { product: Package, order: Receipt, customer: User };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-10 w-full max-w-md min-w-0 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm text-muted-foreground shadow-sm transition hover:border-primary/40 sm:w-80"
      >
        <Search className="h-4 w-4 shrink-0" strokeWidth={1.5} />
        <span className="truncate">ابحث عن عميل، طلب، منتج…</span>
        <kbd className="ms-auto hidden rounded-md border border-border bg-muted px-1.5 text-[10px] font-mono sm:inline" dir="ltr">Ctrl K</kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <div dir="rtl">
          <CommandInput placeholder="اكتب اسمًا أو رقم هاتف أو منتجًا…" value={q} onValueChange={setQ} />
          <CommandList>
            <CommandEmpty>لا توجد نتائج</CommandEmpty>
            {hits.length > 0 && (
              <CommandGroup heading="نتائج البيانات">
                {hits.map((h) => {
                  const I = icon[h.kind];
                  return (
                    <CommandItem key={h.kind + h.id} value={h.kind + h.id + h.label} onSelect={() => go(h.to)}>
                      <I className="h-4 w-4 text-primary" />
                      <span className="truncate">{h.label}</span>
                      <span className="ms-auto text-xs text-muted-foreground">{h.sub}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
            <CommandGroup heading="انتقال سريع">
              {PAGES.map((p) => (
                <CommandItem key={p.to} value={p.label} onSelect={() => go(p.to)}>
                  <p.icon className="h-4 w-4 text-primary" /> {p.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </div>
      </CommandDialog>
    </>
  );
}
