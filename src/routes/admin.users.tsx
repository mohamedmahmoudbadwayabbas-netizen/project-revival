import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, UserPlus, Search, Ban, CheckCircle2, Trash2, KeyRound, Users, Crown, Lock, Unlock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { listUsers, setUserRole, setUserBanned, createUserAccount, deleteUserAccount, sendPasswordReset, setAllowSignups } from "@/lib/admin-console.functions";
import { formatNumberAr, formatPriceAr } from "@/lib/format-ar";
import { cn } from "@/lib/utils";
import { PageHead } from "@/components/admin/PageHead";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "المستخدمون والصلاحيات — لوحة التحكم" }, { name: "robots", content: "noindex" }] }),
  component: UsersPage,
});

type Role = "admin" | "staff" | "user";
const ROLE_LABEL: Record<Role, string> = { admin: "مسؤول", staff: "موظف", user: "عميل" };
const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("ar-EG", { day: "numeric", month: "short", year: "numeric" }) : "—");

function UsersPage() {
  const qc = useQueryClient();
  const fetchUsers = useServerFn(listUsers);
  const roleFn = useServerFn(setUserRole);
  const banFn = useServerFn(setUserBanned);
  const createFn = useServerFn(createUserAccount);
  const deleteFn = useServerFn(deleteUserAccount);
  const resetFn = useServerFn(sendPasswordReset);
  const signupFn = useServerFn(setAllowSignups);

  const { data, isLoading, error } = useQuery({ queryKey: ["admin-users"], queryFn: () => fetchUsers() });
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | Role | "banned">("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [toDelete, setToDelete] = useState<{ id: string; email: string } | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-users"] });
  const run = (p: Promise<unknown>, ok: string) => p.then(() => { toast.success(ok); refresh(); }).catch((e) => toast.error(e.message));

  const users = useMemo(() => {
    const t = search.trim().toLowerCase();
    return (data?.users ?? []).filter((u) =>
      (roleFilter === "all" || (roleFilter === "banned" ? u.banned : u.role === roleFilter)) &&
      (!t || [u.email, u.name, u.phone].some((v) => v?.toLowerCase().includes(t))),
    );
  }, [data, search, roleFilter]);

  const all = data?.users ?? [];
  const stats = [
    { label: "إجمالي الحسابات", value: all.length, icon: Users },
    { label: "المسؤولون والموظفون", value: all.filter((u) => u.role !== "user").length, icon: Crown },
    { label: "حسابات موقوفة", value: all.filter((u) => u.banned).length, icon: Ban },
    { label: "نشطون آخر ٣٠ يومًا", value: all.filter((u) => u.lastSignIn && Date.now() - +new Date(u.lastSignIn) < 2592e6).length, icon: CheckCircle2 },
  ];

  const toggleSignups = useMutation({
    mutationFn: (allow: boolean) => signupFn({ data: { allow } }),
    onSuccess: (_d, allow) => { toast.success(allow ? "التسجيل مفتوح للجميع" : "تم إغلاق التسجيل الجديد"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-8">
      <PageHead icon={ShieldCheck} eyebrow="مركز التحكم" title="المستخدمون والصلاحيات" desc="تحكم كامل في الحسابات والرتب والوصول إلى متجرك.">
        <Button onClick={() => setCreateOpen(true)} className="h-11 rounded-xl gap-2 shadow-md"><UserPlus className="h-4 w-4" /> حساب جديد</Button>
      </PageHead>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="lux-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
              <s.icon className="h-4 w-4 text-gold" strokeWidth={1.5} />
            </div>
            <div className="mt-3 text-3xl font-bold tracking-tight">{formatNumberAr(s.value)}</div>
          </div>
        ))}
      </div>

      <div className="lux-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className={cn("grid h-12 w-12 place-items-center rounded-2xl", data?.allowSignups ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive")}>
            {data?.allowSignups ? <Unlock className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
          </div>
          <div>
            <div className="font-bold">التسجيل الجديد في المتجر</div>
            <div className="text-sm text-muted-foreground">
              {data?.allowSignups ? "أي زائر يستطيع إنشاء حساب الآن." : "مغلق — فقط أنت تستطيع إضافة حسابات من هنا."}
            </div>
          </div>
        </div>
        <Switch checked={!!data?.allowSignups} disabled={!data || toggleSignups.isPending} onCheckedChange={(v) => toggleSignups.mutate(v)} />
      </div>

      <div className="lux-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالاسم أو البريد أو الهاتف" className="h-11 rounded-xl pr-9" />
          </div>
          <div className="flex gap-1 rounded-xl bg-muted p-1">
            {(["all", "admin", "staff", "user", "banned"] as const).map((r) => (
              <button key={r} onClick={() => setRoleFilter(r)} className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold transition", roleFilter === r ? "bg-card shadow-sm text-foreground" : "text-muted-foreground")}>
                {r === "all" ? "الكل" : r === "banned" ? "موقوف" : ROLE_LABEL[r]}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid place-items-center p-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : error ? (
          <div className="p-10 text-center text-destructive">{(error as Error).message}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>{["المستخدم", "الرتبة", "الطلبات", "إجمالي الإنفاق", "تاريخ التسجيل", "آخر دخول", "الحالة", ""].map((h) => <th key={h} className="px-4 py-3 text-right font-semibold whitespace-nowrap">{h}</th>)}</tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-border transition hover:bg-accent/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{(u.name || u.email || "؟").charAt(0).toUpperCase()}</div>
                        <div className="min-w-0">
                          <div className="truncate font-semibold">{u.name || "بدون اسم"}</div>
                          <div className="truncate text-xs text-muted-foreground" dir="ltr">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Select value={u.role} onValueChange={(v) => run(roleFn({ data: { userId: u.id, role: v as Role } }), "تم تحديث الرتبة")}>
                        <SelectTrigger className="h-9 w-28 rounded-lg"><SelectValue /></SelectTrigger>
                        <SelectContent>{(Object.keys(ROLE_LABEL) as Role[]).map((r) => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}</SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{formatNumberAr(u.ordersCount)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatPriceAr(u.spent)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{fmtDate(u.createdAt)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{fmtDate(u.lastSignIn)}</td>
                    <td className="px-4 py-3">
                      <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap", u.banned ? "bg-destructive/10 text-destructive" : u.confirmed ? "bg-primary/10 text-primary" : "bg-gold/15 text-foreground")}>
                        {u.banned ? "موقوف" : u.confirmed ? "نشط" : "بانتظار التأكيد"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" title="إرسال رابط تعيين كلمة المرور" disabled={!u.email.includes("@")}
                          onClick={() => run(resetFn({ data: { email: u.email, redirectTo: `${window.location.origin}/auth` } }), "أُرسل رابط تعيين كلمة المرور")}>
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" title={u.banned ? "تفعيل" : "إيقاف"} onClick={() => run(banFn({ data: { userId: u.id, banned: !u.banned } }), u.banned ? "تم تفعيل الحساب" : "تم إيقاف الحساب")}>
                          {u.banned ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Ban className="h-4 w-4" />}
                        </Button>
                        <Button size="icon" variant="ghost" title="حذف" onClick={() => setToDelete({ id: u.id, email: u.email })}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && <tr><td colSpan={8} className="p-12 text-center text-muted-foreground">لا يوجد مستخدمون مطابقون</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen}
        onSubmit={(v) => createFn({ data: v }).then(() => { toast.success("تم إنشاء الحساب"); setCreateOpen(false); refresh(); }).catch((e) => toast.error(e.message))} />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الحساب نهائيًا؟</AlertDialogTitle>
            <AlertDialogDescription>سيتم حذف <span dir="ltr">{toDelete?.email}</span> ولا يمكن التراجع.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => toDelete && run(deleteFn({ data: { userId: toDelete.id } }), "تم حذف الحساب")}>حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CreateUserDialog({ open, onOpenChange, onSubmit }: { open: boolean; onOpenChange: (o: boolean) => void; onSubmit: (v: { email: string; password: string; fullName: string; role: Role }) => Promise<unknown> }) {
  const [v, setV] = useState({ email: "", password: "", fullName: "", role: "user" as Role });
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="admin-lux rounded-3xl">
        <DialogHeader><DialogTitle>إنشاء حساب جديد</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>الاسم</Label><Input value={v.fullName} onChange={(e) => setV({ ...v, fullName: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>البريد الإلكتروني</Label><Input dir="ltr" type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>كلمة المرور (٨ أحرف على الأقل)</Label><Input dir="ltr" type="password" value={v.password} onChange={(e) => setV({ ...v, password: e.target.value })} /></div>
          <div className="space-y-1.5">
            <Label>الرتبة</Label>
            <Select value={v.role} onValueChange={(r) => setV({ ...v, role: r as Role })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{(Object.keys(ROLE_LABEL) as Role[]).map((r) => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button disabled={busy} className="rounded-xl" onClick={async () => { setBusy(true); await onSubmit(v); setBusy(false); setV({ email: "", password: "", fullName: "", role: "user" }); }}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} إنشاء الحساب
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

