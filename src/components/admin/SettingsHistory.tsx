import { useEffect, useState } from "react";
import { History, RotateCcw } from "lucide-react";
import { supabase } from "@/lib/supabase-loose";
import { Button } from "@/components/ui/button";

type Entry = { id: string; snapshot: Record<string, unknown>; note: string | null; actor_email: string | null; created_at: string };

/** Lists earlier saved versions of the store settings; restoring loads it into the draft only. */
export function SettingsHistory({ refreshKey, onRestore }: { refreshKey: number; onRestore: (snap: Record<string, unknown>) => void }) {
  const [rows, setRows] = useState<Entry[]>([]);
  useEffect(() => {
    void supabase
      .from("store_settings_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data }) => setRows((data as Entry[]) ?? []));
  }, [refreshKey]);

  return (
    <section className="space-y-3 rounded-3xl border border-border bg-card p-5 shadow-xs">
      <h3 className="flex items-center gap-2 font-display text-base font-black text-foreground border-b border-border/50 pb-2.5">
        <History className="h-4 w-4 text-primary" />
        <span>سجل التعديلات السابقة</span>
      </h3>
      {rows.length === 0 ? (
        <p className="text-xs font-bold text-muted-foreground">لا توجد نسخ سابقة بعد. كل مرة تضغط حفظ، تُحفظ النسخة القديمة هنا.</p>
      ) : (
        <ul className="divide-y divide-border/60 max-h-80 overflow-y-auto">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <div className="text-xs font-black text-foreground">
                  {new Date(r.created_at).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" })}
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {r.note ?? "نسخة قبل الحفظ"} {r.actor_email ? `— ${r.actor_email}` : ""}
                </div>
              </div>
              <Button type="button" variant="outline" size="sm" className="rounded-xl text-xs font-bold gap-1 shrink-0" onClick={() => onRestore(r.snapshot)}>
                <RotateCcw className="h-3.5 w-3.5" /> استرجاع للمعاينة
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
