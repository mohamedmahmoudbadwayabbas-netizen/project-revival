import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Mail, KeyRound, Save, Loader2, UserCircle2 } from "lucide-react";

export const Route = createFileRoute("/admin/profile")({
  head: () => ({
    meta: [{ title: "ملف المدير — لوحة التحكم" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email ?? "");
  const [savingEmail, setSavingEmail] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const updateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || email === user?.email) return;
    setSavingEmail(true);
    const { error } = await supabase.auth.updateUser({ email });
    setSavingEmail(false);
    if (error) return toast.error(error.message);
    toast.success("تم إرسال رابط التأكيد إلى بريدك الجديد");
  };

  const updatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) return toast.error("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
    if (newPassword !== confirmPassword) return toast.error("كلمتا المرور غير متطابقتين");
    if (!user?.email) return toast.error("لا يوجد بريد للحساب");

    setSavingPassword(true);
    // Re-verify current password before changing
    const { error: verifyErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (verifyErr) {
      setSavingPassword(false);
      return toast.error("كلمة المرور الحالية غير صحيحة");
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) return toast.error(error.message);
    toast.success("تم تحديث كلمة المرور بنجاح");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-8" dir="rtl">
      <header className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl hero-gradient text-primary-foreground shadow-elegant">
          <UserCircle2 className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold">الملف الشخصي</h1>
          <p className="text-xs text-muted-foreground">إدارة بيانات حساب المدير</p>
        </div>
      </header>

      <section className="rounded-3xl border border-border bg-card p-6 shadow-elegant">
        <div className="mb-4 flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" />
          <h2 className="font-display text-base font-bold">البريد الإلكتروني</h2>
        </div>
        <form onSubmit={updateEmail} className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold">البريد الحالي</span>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <p className="text-[11px] text-muted-foreground">
            سيتم إرسال رابط تأكيد للبريد الجديد. لن يتغيّر البريد حتى يتم التأكيد.
          </p>
          <Button
            type="submit"
            disabled={savingEmail || email === user?.email}
            className="h-11 rounded-xl hero-gradient text-primary-foreground"
          >
            {savingEmail ? (
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="me-2 h-4 w-4" />
            )}
            تحديث البريد
          </Button>
        </form>
      </section>

      <section className="rounded-3xl border border-border bg-card p-6 shadow-elegant">
        <div className="mb-4 flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" />
          <h2 className="font-display text-base font-bold">كلمة المرور</h2>
        </div>
        <form onSubmit={updatePassword} className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold">كلمة المرور الحالية</span>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="current-password"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold">كلمة المرور الجديدة</span>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold">تأكيد كلمة المرور الجديدة</span>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>
          <p className="text-[11px] text-muted-foreground">
            8 أحرف على الأقل. استخدم مزيج من الحروف والأرقام.
          </p>
          <Button
            type="submit"
            disabled={savingPassword}
            className="h-11 rounded-xl hero-gradient text-primary-foreground"
          >
            {savingPassword ? (
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="me-2 h-4 w-4" />
            )}
            تحديث كلمة المرور
          </Button>
        </form>
      </section>
    </div>
  );
}
