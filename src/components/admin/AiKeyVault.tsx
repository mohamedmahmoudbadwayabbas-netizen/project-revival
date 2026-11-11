import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { KeyRound, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AI_PROVIDER_PRESETS, findPreset } from "@/lib/ai-providers";
import { addVaultKeys, checkVaultKeys, listVault, updateVaultKey } from "@/lib/ai-vault.functions";

type Row = Awaited<ReturnType<typeof listVault>>[number];

const STATUS: Record<string, { label: string; cls: string }> = {
  active: { label: "يعمل", cls: "bg-primary/10 text-primary" },
  cooling_down: { label: "تبريد مؤقت", cls: "bg-accent/15 text-accent-foreground" },
  exhausted: { label: "نفد الرصيد", cls: "bg-destructive/10 text-destructive" },
  invalid: { label: "مرفوض", cls: "bg-destructive/10 text-destructive" },
  disabled: { label: "موقوف", cls: "bg-muted text-muted-foreground" },
};

export function AiKeyVault() {
  const list = useServerFn(listVault);
  const add = useServerFn(addVaultKeys);
  const update = useServerFn(updateVaultKey);
  const check = useServerFn(checkVaultKeys);
  const [rows, setRows] = useState<Row[]>([]);
  const [provider, setProvider] = useState("dahl");
  const [keys, setKeys] = useState("");
  const [model, setModel] = useState("");
  const [priority, setPriority] = useState("100");
  const [busy, setBusy] = useState<string | null>("load");

  const refresh = useCallback(() => list().then(setRows).catch(() => {}), [list]);
  useEffect(() => { refresh().finally(() => setBusy(null)); }, [refresh]);

  const onAdd = async () => {
    setBusy("add");
    try {
      const r = await add({ data: { provider, keys, model: model || undefined, priority: Number(priority) || 100 } });
      toast.success(`أُضيف ${r.added} مفتاح جديد (من ${r.total})`);
      setKeys("");
      await refresh();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  };
  const onCheck = async () => {
    setBusy("check");
    try { const r = await check(); toast.success(`${r.ok} من ${r.total} مفاتيح تعمل الآن`); await refresh(); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  };
  const toggle = async (r: Row) => {
    await update({ data: { id: r.id, status: r.status === "disabled" ? "active" : "disabled" } });
    await refresh();
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 space-y-4" dir="rtl">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-bold text-foreground">خزانة المفاتيح ({rows.length})</h3>
            <p className="text-sm text-muted-foreground">
              ضع أي عدد من المفاتيح. لو مفتاح خلص أو اتقفل ينتقل المتجر للي بعده فورًا. المفاتيح لا تُحذف أبدًا.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onCheck} disabled={busy !== null} className="gap-1">
          {busy === "check" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} فحص الكل
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={provider}
          onChange={(e) => setProvider(e.target.value)}>
          {AI_PROVIDER_PRESETS.filter((p) => p.id !== "gemini").map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        <Input value={model} onChange={(e) => setModel(e.target.value)} dir="ltr"
          placeholder={`النموذج: ${findPreset(provider)?.modelHint ?? ""}`} />
        <Input value={priority} onChange={(e) => setPriority(e.target.value)} inputMode="numeric"
          placeholder="الأولوية (الأصغر أولًا)" />
      </div>
      <Textarea value={keys} onChange={(e) => setKeys(e.target.value)} dir="ltr" rows={4}
        placeholder="الصق مفتاحًا أو مئة مفتاح — كل مفتاح في سطر" autoComplete="off" />
      <Button onClick={onAdd} disabled={busy !== null || !keys.trim()} className="gap-2">
        {busy === "add" && <Loader2 className="h-4 w-4 animate-spin" />} حفظ في الخزانة
      </Button>

      <div className="divide-y divide-border rounded-xl border border-border">
        {rows.length === 0 && <p className="p-4 text-sm text-muted-foreground">لا توجد مفاتيح بعد.</p>}
        {rows.map((r) => {
          const st = STATUS[r.status] ?? STATUS.active;
          return (
            <div key={r.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
              <span className="font-semibold">{findPreset(r.provider)?.label.split(" (")[0] ?? r.provider}</span>
              <code dir="ltr" className="text-muted-foreground">{r.masked}</code>
              <span dir="ltr" className="text-muted-foreground">{r.model || findPreset(r.provider)?.modelHint}</span>
              <span className="text-muted-foreground">أولوية {r.priority}</span>
              <span className={`rounded-full px-2 py-0.5 text-[13px] font-medium ${st.cls}`}>{st.label}</span>
              <Button size="sm" variant="ghost" className="ms-auto" onClick={() => toggle(r)}>
                {r.status === "disabled" ? "تشغيل" : "إيقاف"}
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
