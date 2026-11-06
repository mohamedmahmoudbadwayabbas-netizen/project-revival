import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import * as authService from "@/services/authService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Leaf, Phone, Mail, User, ShieldCheck, RefreshCw, Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "@/lib/theme-context";

function safeRelative(path: string) {
  return path.startsWith("/") && !path.startsWith("//") ? path : "/account";
}

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول / حساب جديد — سوبرماركت الوادي الأخضر" },
      { name: "description", content: "سجّل دخولك أو أنشئ حساباً جديداً في متجر سوبرماركت الوادي الأخضر" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s.next === "string" ? s.next : undefined,
  }),
  component: AuthPage,
});

export function AuthPage() {
  const { user, signIn, signUp, signInWithPhone, signUpWithPhone, signInWithGoogle, loading } =
    useAuth();
  const theme = useTheme();
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const dest = safeRelative(next ?? "/account");

  const [method, setMethod] = useState<"email" | "phone">("email");
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [phoneStep, setPhoneStep] = useState<"input" | "otp">("input");

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (!loading && user) {
      if (dest === "/account") navigate({ to: "/account" });
      else window.location.href = dest;
    }
  }, [user, loading, navigate, dest]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendTimer > 0) {
      timer = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [resendTimer]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return toast.error("يرجى إدخال البريد الإلكتروني");

    setBusy(true);

    if (mode === "forgot") {
      const res = await authService.sendPasswordResetEmail(email);
      setBusy(false);
      if (res.error) return toast.error(res.error);
      toast.success("تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك 📩");
      setMode("signin");
      return;
    }

    if (mode === "signin") {
      const res = await signIn(email, password);
      setBusy(false);
      if (res.error) return toast.error(res.error);
      toast.success("مرحباً بعودتك! 👋");
    } else {
      if (!fullName.trim()) {
        setBusy(false);
        return toast.error("يرجى كتابة الاسم بالكامل");
      }
      const res = await signUp(email, password, fullName, phone);
      setBusy(false);
      if (res.error) return toast.error(res.error);

      if (res.needsConfirmation) {
        toast.success(
          "تم إنشاء الحساب بنجاح! يرجى فحص بريدك الإلكتروني لتأكيد التسجيل.",
        );
      } else {
        toast.success("تم إنشاء الحساب وتسجيل الدخول بنجاح 🎉");
      }
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return toast.error("يرجى إدخال رقم الهاتف");

    if (phoneStep === "input") {
      setBusy(true);
      const formatted = authService.formatPhoneNumber(phone);
      const res = await authService.sendPhoneOtp(formatted);
      setBusy(false);

      if (res.error) {
        // Fallback to password check if SMS gateway is in test mode
        if (password && password.length >= 6) {
          setBusy(true);
          const loginRes = mode === "signin" 
            ? await signInWithPhone(phone, password)
            : await signUpWithPhone(phone, password, fullName);
          setBusy(false);
          if (!loginRes.error) {
            toast.success("تم تسجيل الدخول برقم الهاتف بنجاح 📱");
            return;
          }
        }
        return toast.error(res.error);
      }

      toast.success(`تم إرسال رمز التحقق إلى الرقم ${formatted} 📲`);
      setPhoneStep("otp");
      setResendTimer(60);
    } else {
      if (otpCode.length < 4) return toast.error("يرجى إدخال رمز التحقق المكون من 6 أرقام");
      setBusy(true);
      const formatted = authService.formatPhoneNumber(phone);
      const res = await authService.verifyPhoneOtp(formatted, otpCode);
      setBusy(false);

      if (res.error) return toast.error(res.error);
      toast.success("تم التحقق من رقم الهاتف وتسجيل الدخول بنجاح ✅");
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    const redirectUri =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth${next ? `?next=${encodeURIComponent(next)}` : ""}`
        : undefined;
    const res = await signInWithGoogle(redirectUri);
    setBusy(false);
    if (res.error && res.error !== "__CANCELLED__") toast.error(res.error);
  };

  const authBg = theme.auth_bg_url ?? theme.marble_bg_url;

  return (
    <div
      className="grid min-h-screen place-items-center px-4 py-8"
      style={{
        backgroundColor: "#FAF9F6",
        backgroundImage: authBg
          ? `url(${authBg})`
          : "radial-gradient(at 20% 0%, rgba(3,98,51,0.07) 0px, transparent 50%), radial-gradient(at 80% 100%, rgba(229,83,0,0.06) 0px, transparent 50%)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
      dir="rtl"
    >
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2.5">
          <div
            className="grid h-12 w-12 place-items-center rounded-2xl text-white shadow-lg shadow-emerald-900/10"
            style={{ background: "var(--gradient-hero)" }}
          >
            <Leaf className="h-6 w-6" />
          </div>
          <div>
            <div className="font-display text-xl font-extrabold" style={{ color: "var(--brand-green)" }}>
              سوبرماركت الوادي الأخضر
            </div>
            <div className="text-[11px] font-semibold text-muted-foreground">
              الريادة في المنتجات الطازجة والتوصيل الذكي
            </div>
          </div>
        </Link>

        <div
          className="rounded-3xl p-6 sm:p-8"
          style={{
            background: "linear-gradient(180deg, #FFFFFF 0%, #FAF9F6 100%)",
            border: "2px solid #C9A86B",
            boxShadow:
              "0 18px 50px -18px rgba(3,98,51,0.25), inset 0 0 0 1px rgba(201,168,107,0.25)",
          }}
        >
          {/* تبويب تسجيل الدخول / حساب جديد */}
          {mode !== "forgot" && (
            <div className="flex bg-secondary/80 rounded-2xl p-1 mb-5">
              <button
                type="button"
                onClick={() => setMode("signin")}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${
                  mode === "signin"
                    ? "bg-white text-emerald-800 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                تسجيل الدخول 🔑
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${
                  mode === "signup"
                    ? "bg-white text-emerald-800 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                حساب جديد ✨
              </button>
            </div>
          )}

          <h1 className="text-center font-display text-xl font-black text-foreground">
            {mode === "forgot"
              ? "استعادة كلمة المرور"
              : mode === "signin"
              ? "مرحباً بعودتك إلى متجرك 🌿"
              : "انضم لعائلة الوادي الأخضر 🎉"}
          </h1>
          <p className="mt-1 text-center text-xs text-muted-foreground font-semibold">
            {mode === "forgot"
              ? "أدخل بريدك الإلكتروني لإرسال تعليمات إعادة التعيين"
              : mode === "signin"
              ? "أدخل بياناتك للمتابعة والتسوق"
              : "سجّل الآن واطلب منتجاتك الطازجة بكل سهولة"}
          </p>

          {/* زر جوجل */}
          {mode !== "forgot" && (
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogle}
              disabled={busy}
              className="mt-5 h-11 w-full rounded-2xl text-xs font-black border-emerald-200 hover:bg-emerald-50/50 shadow-xs gap-2"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>المتابعة بحساب Google</span>
            </Button>
          )}

          {mode !== "forgot" && (
            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-border/80" />
              <span className="text-[11px] font-bold text-muted-foreground">أو ببياناتك</span>
              <div className="h-px flex-1 bg-border/80" />
            </div>
          )}

          {/* تبويب طريقة التسجيل: بريد أم هاتف */}
          {mode !== "forgot" && (
            <div className="flex justify-center gap-2 mb-4">
              <button
                type="button"
                onClick={() => setMethod("email")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  method === "email"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 font-black shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Mail className="h-3.5 w-3.5" /> البريد الإلكتروني
              </button>
              <button
                type="button"
                onClick={() => {
                  setMethod("phone");
                  setPhoneStep("input");
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  method === "phone"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 font-black shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Phone className="h-3.5 w-3.5" /> رقم الهاتف (SMS OTP)
              </button>
            </div>
          )}

          {method === "email" || mode === "forgot" ? (
            <form onSubmit={handleEmailSubmit} className="space-y-3">
              {mode === "signup" && (
                <>
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold text-foreground">
                      الاسم بالكامل
                    </span>
                    <Input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="محمد أحمد"
                      className="h-10 rounded-xl bg-background"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold text-foreground">
                      رقم الهاتف (اختياري)
                    </span>
                    <Input
                      type="tel"
                      dir="ltr"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="01012345678"
                      className="h-10 rounded-xl text-end bg-background"
                    />
                  </label>
                </>
              )}

              <label className="block">
                <span className="mb-1 block text-xs font-bold text-foreground">
                  البريد الإلكتروني
                </span>
                <Input
                  type="email"
                  required
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-10 rounded-xl text-start bg-background"
                />
              </label>

              {mode !== "forgot" && (
                <label className="block">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-foreground">كلمة المرور</span>
                    {mode === "signin" && (
                      <button
                        type="button"
                        onClick={() => setMode("forgot")}
                        className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        نسيت كلمة المرور؟
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      required
                      dir="ltr"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-10 pe-10 rounded-xl text-start bg-background"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </label>
              )}

              <Button
                type="submit"
                disabled={busy}
                className="mt-4 h-11 w-full rounded-2xl text-sm font-black text-white shadow-md shadow-emerald-700/20"
                style={{ background: "var(--gradient-hero)" }}
              >
                {busy ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : mode === "forgot" ? (
                  "إرسال رابط الاستعادة"
                ) : mode === "signin" ? (
                  "تسجيل الدخول"
                ) : (
                  "إنشاء الحساب"
                )}
              </Button>

              {mode === "forgot" && (
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="w-full text-center text-xs font-bold text-muted-foreground hover:text-foreground pt-2"
                >
                  العودة لتسجيل الدخول
                </button>
              )}
            </form>
          ) : (
            <form onSubmit={handlePhoneSubmit} className="space-y-3">
              {phoneStep === "input" ? (
                <>
                  {mode === "signup" && (
                    <label className="block">
                      <span className="mb-1 block text-xs font-bold text-foreground">
                        الاسم بالكامل
                      </span>
                      <Input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="محمد أحمد"
                        className="h-10 rounded-xl bg-background"
                      />
                    </label>
                  )}

                  <label className="block">
                    <span className="mb-1 block text-xs font-bold text-foreground">رقم الهاتف المحمول</span>
                    <div className="flex items-center gap-2" dir="ltr">
                      <span className="h-10 px-3 flex items-center justify-center rounded-xl bg-secondary text-xs font-mono font-bold text-foreground border border-border">
                        🇪🇬 +20
                      </span>
                      <Input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="01012345678"
                        className="h-10 rounded-xl bg-background"
                      />
                    </div>
                  </label>

                  <Button
                    type="submit"
                    disabled={busy}
                    className="mt-4 h-11 w-full rounded-2xl text-sm font-black text-white shadow-md shadow-emerald-700/20"
                    style={{ background: "var(--gradient-hero)" }}
                  >
                    {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : "إرسال رمز التحقق (OTP)"}
                  </Button>
                </>
              ) : (
                <>
                  <div className="bg-secondary/50 p-3 rounded-2xl flex items-center justify-between text-xs mb-2">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">الرمز مُرسل إلى:</span>
                      <span className="font-mono font-bold text-foreground">{phone}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPhoneStep("input")}
                      className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      تغيير الرقم
                    </button>
                  </div>

                  <label className="block">
                    <span className="mb-1 block text-xs font-bold text-foreground">
                      رمز التحقق (OTP)
                    </span>
                    <Input
                      type="text"
                      maxLength={6}
                      required
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="123456"
                      className="h-12 text-center text-lg tracking-widest font-mono font-black rounded-xl bg-background"
                      dir="ltr"
                      autoFocus
                    />
                  </label>

                  <Button
                    type="submit"
                    disabled={busy || otpCode.length < 4}
                    className="mt-4 h-11 w-full rounded-2xl text-sm font-black text-white shadow-md shadow-emerald-700/20"
                    style={{ background: "var(--gradient-hero)" }}
                  >
                    {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : "تأكيد الدخول"}
                  </Button>

                  <div className="text-center pt-2">
                    {resendTimer > 0 ? (
                      <span className="text-xs font-semibold text-muted-foreground">
                        إعادة الإرسال متاحة خلال: <strong>{resendTimer}s</strong>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={async () => {
                          setBusy(true);
                          const formatted = authService.formatPhoneNumber(phone);
                          await authService.sendPhoneOtp(formatted);
                          setBusy(false);
                          setResendTimer(60);
                          toast.success("تمت إعادة إرسال الرمز 📲");
                        }}
                        disabled={busy}
                        className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        إعادة إرسال رمز التحقق
                      </button>
                    )}
                  </div>
                </>
              )}
            </form>
          )}

          {/* تذييل المساعدة وبيانات المسؤول */}
          <div className="mt-6 pt-4 border-t border-border/60 text-center">
            <p className="text-[11px] text-muted-foreground">
              سوبرماركت الوادي الأخضر — خدمة التوصيل السريع لجميع أحياء القاهرة والجيزة
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;

