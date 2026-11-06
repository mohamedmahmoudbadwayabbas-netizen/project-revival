import { createFileRoute, useRouter } from "@tanstack/react-router";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import {
  ShieldCheck,
  Lock,
  Mail,
  Store,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Database,
} from "lucide-react";
import { toast } from "sonner";
import { BRAND_NAME_AR } from "@/lib/brand";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [
      { title: `تسجيل دخول الإدارة — ${BRAND_NAME_AR}` },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const router = useRouter();
  const { signIn } = useAuth();

  // Clean empty initial state - no credentials exposed
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!email.trim()) {
      setErrorMsg("يرجى إدخال البريد الإلكتروني الخاص بالإدارة");
      return;
    }
    if (!password) {
      setErrorMsg("يرجى إدخال كلمة المرور");
      return;
    }

    setLoading(true);
    try {
      const res = await signIn(email.trim(), password);
      if (res.error) {
        setErrorMsg("بيانات الدخول غير صحيحة أو ليس لديك صلاحية الوصول");
        toast.error("فشل تسجيل الدخول: يرجى التحقق من البيانات");
      } else {
        toast.success("تم التحقق بنجاح! مرحباً بك في لوحة تحكم سوبرماركت الوادي الأخضر ✨");
        router.history.push("/admin");
      }
    } catch (err: any) {
      setErrorMsg("حدث خطأ أثناء الاتصال بالخادم");
      toast.error("فشل الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen grid place-items-center px-4 bg-background selection:bg-emerald-500 selection:text-white"
      dir="rtl"
    >
      {/* Background Decorative Gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 right-1/4 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -bottom-40 left-1/4 h-96 w-96 rounded-full bg-teal-500/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Security Shield Card */}
        <Card className="rounded-3xl border border-border/80 bg-card/90 backdrop-blur-xl p-6 sm:p-8 shadow-elegant space-y-6">
          {/* Brand Header */}
          <div className="text-center space-y-2">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl hero-gradient text-primary-foreground shadow-lg">
              <Store className="h-8 w-8 text-white" />
            </div>
            <div className="flex items-center justify-center gap-1.5 pt-1">
              <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <Database className="h-3 w-3" />
                سلسلة 3 فروع • Supabase Auth
              </span>
            </div>
            <h1 className="font-display text-2xl font-black text-foreground">
              {BRAND_NAME_AR}
            </h1>
            <p className="text-xs text-muted-foreground font-medium">
              بوابة الدخول المشفرة والمؤمنة للوحة التحكم المركزية
            </p>
          </div>

          {/* Error Alert if any */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Secure Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-emerald-600" />
                <span>البريد الإلكتروني للإدارة</span>
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="h-11 rounded-2xl text-xs font-bold bg-secondary/50 border-border/80 pr-3 pl-3 text-left font-mono"
                dir="ltr"
                autoComplete="email"
                disabled={loading}
                required
              />
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-emerald-600" />
                <span>كلمة المرور</span>
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 rounded-2xl text-xs font-bold bg-secondary/50 border-border/80 pr-3 pl-10 font-mono text-left"
                  dir="ltr"
                  autoComplete="current-password"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-1"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-2xl hero-gradient text-primary-foreground font-black text-sm shadow-md gap-2 cursor-pointer hover:opacity-95 transition-all mt-2"
            >
              {loading ? (
                <>
                  <Sparkles className="h-4 w-4 animate-spin text-amber-300" />
                  <span>جاري التحقق من الصلاحيات المشفرة...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  <span>تسجيل الدخول الآمن</span>
                </>
              )}
            </Button>
          </form>

          {/* Back to store link */}
          <div className="text-center pt-2 border-t border-border/50">
            <a
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-bold transition-colors"
            >
              <ArrowRight className="h-3.5 w-3.5" />
              <span>العودة إلى واجهة المتجر</span>
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
}
