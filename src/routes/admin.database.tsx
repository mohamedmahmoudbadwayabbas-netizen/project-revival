import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Database, Table2, Search, Download, Upload, Trash2, RefreshCw, ChevronRight, ChevronLeft, Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHead } from "@/components/admin/PageHead";
import { STUDIO_TABLES, studioRows, studioUpdate, studioDelete, studioInsert, studioCounts } from "@/lib/admin-console.functions";
import { formatNumberAr } from "@/lib/format-ar";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/database")({
  head: () => ({ meta: [{ title: "استوديو البيانات — لوحة التحكم" }, { name: "robots", content: "noindex" }] }),
  component: DatabaseStudio,
});

const LABELS: Record<string, string> = {
  products: "المنتجات", categories: "التصنيفات", orders: "الطلبات", order_items: "عناصر الطلبات", profiles: "الملفات الشخصية",
  coupons: "الكوبونات", delivery_zones: "مناطق التوصيل", delivery_slots: "مواعيد التوصيل", reviews: "التقييمات",
  hero_banners: "البانرات", flash_offers: "العروض السريعة", returns: "المرتجعات", addresses: "العناوين",
  wishlists: "المفضلة", abandoned_carts: "السلات المتروكة", notifications: "الإشعارات", user_roles: "الرتب",
};
const PAGE = 50;

const show = (v: unknown) => (v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v));
function parse(raw: string, original: unknown): unknown {
  if (raw === "") return null;
  if (typeof original === "number") return Number(raw);
  if (typeof original === "boolean") return raw === "true";
  if (original !== null && typeof original === "object") return JSON.parse(raw);
  return raw;
}

function DatabaseStudio() {
  const qc = useQueryClient();
  const rowsFn = useServerFn(studioRows);
  const updateFn = useServerFn(studioUpdate);
  const deleteFn = useServerFn(studioDelete);
  const insertFn = useServerFn(studioInsert);
  const countsFn = useServerFn(studioCounts);
  const [table, setTable] = useState<string>("products");
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState<{ col?: string; asc: boolean }>({ asc: false });
  const [edit, setEdit] = useState<{ id: string; col: string; value: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const counts = useQuery({ queryKey: ["studio-counts"], queryFn: () => countsFn() });
  const q = useQuery({
    queryKey: ["studio", table, page, sort],
    queryFn: async () => {
      const r = await rowsFn({ data: { table, page, pageSize: PAGE, sort: sort.col, asc: sort.asc } });
      return { rows: JSON.parse(r.json) as Record<string, unknown>[], count: r.count };
    },
  });

  const rows = useMemo(() => {
    const t = filter.trim().toLowerCase();
    const all = q.data?.rows ?? [];
    return t ? all.filter((r) => Object.values(r).some((v) => show(v).toLowerCase().includes(t))) : all;
  }, [q.data, filter]);
  const cols = useMemo(() => Object.keys(q.data?.rows?.[0] ?? {}), [q.data]);
  const total = q.data?.count ?? 0;

  const refresh = () => { qc.invalidateQueries({ queryKey: ["studio", table] }); qc.invalidateQueries({ queryKey: ["studio-counts"] }); };

  const saveEdit = async (row: Record<string, unknown>) => {
    if (!edit) return;
    try {
      const value = parse(edit.value, row[edit.col]);
      await updateFn({ data: { table, id: String(row.id), patch: { [edit.col]: value } } });
      toast.success("تم الحفظ");
      setEdit(null);
      refresh();
    } catch (e) { toast.error((e as Error).message); }
  };

  const exportFile = (kind: "csv" | "xlsx") => {
    const ws = XLSX.utils.json_to_sheet((q.data?.rows ?? []).map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, show(v)]))));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, table);
    XLSX.writeFile(wb, `${table}.${kind}`, { bookType: kind });
  };

  const importFile = async (f: File) => {
    try {
      const wb = XLSX.read(await f.arrayBuffer());
      const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { defval: null });
      const cleaned = data.map((r) => Object.fromEntries(Object.entries(r).filter(([, v]) => v !== null && v !== "")));
      if (!cleaned.length) throw new Error("الملف فارغ");
      await insertFn({ data: { table, rows: cleaned } });
      toast.success(`تم استيراد ${formatNumberAr(cleaned.length)} سجل`);
      refresh();
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="space-y-6">
      <PageHead icon={Database} eyebrow="مركز التحكم" title="استوديو البيانات" desc="تصفح وعدّل كل جداول متجرك مباشرة — بدون أي لوحة خارجية.">
        <Button variant="outline" className="rounded-xl gap-2" onClick={refresh}><RefreshCw className="h-4 w-4" /> تحديث</Button>
      </PageHead>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="lux-card h-fit p-2 lg:sticky lg:top-24">
          <div className="px-3 py-2 text-[11px] font-semibold text-muted-foreground">الجداول</div>
          <div className="flex gap-1 overflow-x-auto lg:flex-col">
            {STUDIO_TABLES.map((t) => (
              <button key={t} onClick={() => { setTable(t); setPage(0); setSort({ asc: false }); setEdit(null); }}
                className={cn("flex shrink-0 items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm transition", table === t ? "bg-sidebar text-sidebar-accent-foreground" : "hover:bg-accent")}>
                <span className="flex items-center gap-2"><Table2 className={cn("h-4 w-4", table === t ? "text-sidebar-primary" : "text-muted-foreground")} />{LABELS[t]}</span>
                <span className="text-[11px] opacity-60 tabular-nums">{counts.data ? formatNumberAr(counts.data[t] ?? 0) : ""}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="lux-card min-w-0 overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center">
            <div className="min-w-0">
              <div className="font-bold">{LABELS[table]}</div>
              <div className="text-xs text-muted-foreground" dir="ltr">public.{table} · {formatNumberAr(total)} rows</div>
            </div>
            <div className="relative md:ms-auto md:w-64">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="بحث في الصفحة الحالية" className="h-10 rounded-xl pr-9" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="rounded-lg gap-1" onClick={() => exportFile("csv")}><Download className="h-4 w-4" /> CSV</Button>
              <Button variant="outline" size="sm" className="rounded-lg gap-1" onClick={() => exportFile("xlsx")}><Download className="h-4 w-4" /> Excel</Button>
              <Button size="sm" className="rounded-lg gap-1" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> استيراد</Button>
              <input ref={fileRef} type="file" accept=".csv,.xlsx" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importFile(f); e.target.value = ""; }} />
            </div>
          </div>

          {q.isLoading ? (
            <div className="grid place-items-center p-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : q.error ? (
            <div className="p-10 text-center text-destructive">{(q.error as Error).message}</div>
          ) : (
            <div className="max-h-[65vh] overflow-auto">
              <table className="w-full border-collapse text-xs" dir="ltr">
                <thead className="sticky top-0 z-10 bg-muted">
                  <tr>
                    <th className="w-10 border-b border-border px-2" />
                    {cols.map((c) => (
                      <th key={c} onClick={() => setSort((s) => ({ col: c, asc: s.col === c ? !s.asc : true }))}
                        className="cursor-pointer whitespace-nowrap border-b border-l border-border px-3 py-2.5 text-left font-mono font-semibold text-muted-foreground hover:text-foreground">
                        {c}{sort.col === c ? (sort.asc ? " ↑" : " ↓") : ""}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={String(r.id ?? i)} className="group hover:bg-accent/40">
                      <td className="border-b border-border px-2 text-center">
                        {r.id != null && table !== "user_roles" && (
                          <button className="opacity-0 transition group-hover:opacity-100" title="حذف"
                            onClick={async () => { if (!confirm("حذف هذا السجل؟")) return; try { await deleteFn({ data: { table, id: String(r.id) } }); toast.success("تم الحذف"); refresh(); } catch (e) { toast.error((e as Error).message); } }}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </button>
                        )}
                      </td>
                      {cols.map((c) => {
                        const editing = edit && edit.id === String(r.id) && edit.col === c;
                        return (
                          <td key={c} onDoubleClick={() => c !== "id" && r.id != null && setEdit({ id: String(r.id), col: c, value: show(r[c]) })}
                            className={cn("max-w-[280px] border-b border-l border-border px-3 py-2 font-mono", editing ? "p-1" : "truncate cursor-cell")}>
                            {editing ? (
                              <div className="flex items-center gap-1">
                                <input autoFocus value={edit.value} onChange={(e) => setEdit({ ...edit, value: e.target.value })}
                                  onKeyDown={(e) => { if (e.key === "Enter") saveEdit(r); if (e.key === "Escape") setEdit(null); }}
                                  className="h-7 min-w-[160px] flex-1 rounded-md border border-ring bg-card px-2 outline-none" />
                                <button onClick={() => saveEdit(r)}><Check className="h-4 w-4 text-primary" /></button>
                                <button onClick={() => setEdit(null)}><X className="h-4 w-4 text-muted-foreground" /></button>
                              </div>
                            ) : r[c] === null ? <span className="text-muted-foreground/50">NULL</span>
                              : typeof r[c] === "boolean" ? <span className={r[c] ? "text-primary" : "text-muted-foreground"}>{String(r[c])}</span>
                              : show(r[c])}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {rows.length === 0 && <tr><td colSpan={cols.length + 1} className="p-12 text-center text-muted-foreground">لا توجد سجلات</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
            <span>انقر مرتين على أي خانة لتعديلها</span>
            <div className="flex items-center gap-2">
              <Button size="icon" variant="ghost" disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronRight className="h-4 w-4" /></Button>
              <span>صفحة {formatNumberAr(page + 1)} من {formatNumberAr(Math.max(1, Math.ceil(total / PAGE)))}</span>
              <Button size="icon" variant="ghost" disabled={(page + 1) * PAGE >= total} onClick={() => setPage(page + 1)}><ChevronLeft className="h-4 w-4" /></Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
