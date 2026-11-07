import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { History, Loader2 } from "lucide-react";
import { PageHead } from "@/components/admin/PageHead";
import { activityLog } from "@/lib/admin-console.functions";

export const Route = createFileRoute("/admin/activity")({
  head: () => ({
    meta: [{ title: "سجل العمليات — لوحة التحكم" }, { name: "robots", content: "noindex" }],
  }),
  component: ActivityPage,
});

function ActivityPage() {
  const fn = useServerFn(activityLog);
  const { data, isLoading } = useQuery({ queryKey: ["admin-activity"], queryFn: () => fn() });
  return (
    <div className="space-y-6">
      <PageHead
        icon={History}
        eyebrow="مركز التحكم"
        title="سجل العمليات"
        desc="كل تعديل حساس في متجرك: من قام به ومتى."
      />
      <div className="lux-card p-2">
        {isLoading ? (
          <div className="grid place-items-center p-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !data?.length ? (
          <div className="p-16 text-center text-muted-foreground">لا توجد عمليات مسجلة بعد</div>
        ) : (
          <ol className="relative">
            {data.map((a) => (
              <li key={a.id} className="flex gap-4 rounded-2xl p-4 hover:bg-accent/40">
                <div className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-gold ring-4 ring-gold/15" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{a.action}</span>
                    {a.target && (
                      <span
                        className="truncate rounded-md bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
                        dir="ltr"
                      >
                        {a.target}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    <span dir="ltr">{a.actor_email ?? "—"}</span> ·{" "}
                    {new Date(a.created_at).toLocaleString("ar-EG")}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
