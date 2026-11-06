/* =========================================================================
   UNIVERSAL AUTH MODAL — SUPABASE & RBAC AUTHENTICATION DIALOG
   Comprehensive multi-channel auth modal supporting:
   1. Email & Password (Login, Register, Magic Link, Password Reset)
   2. Phone Number & SMS OTP (+20 Auto-Formatter, 60s Resend Timer)
   3. Google OAuth 1-Click Login
   ========================================================================= */

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Mail,
  Phone,
  Lock,
  User,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import * as authService from "@/services/authService";

interface AuthModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "email" | "phone";
  defaultMode?: "signin" | "signup";
  onSuccess?: () => void;
  redirectUrl?: string;
}

export function AuthModal({
  isOpen,
  onOpenChange,
  defaultTab = "email",
  defaultMode = "signin",
  onSuccess,
  redirectUrl,
}: AuthModalProps) {
  const { signIn, signUp, signInWithPhone, signUpWithPhone, signInWithGoogle } = useAuth();

  // Tab & Sub-mode states
  const [activeTab, setActiveTab] = useState<"email" | "phone">(defaultTab);
  const [emailMode, setEmailMode] = useState<"signin" | "signup" | "forgot" | "magic">(defaultMode);
  const [phoneStep, setPhoneStep] = useState<"phone_input" | "otp_verify">("phone_input");

  // Form Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // OTP Countdown Timer
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
      setEmailMode(defaultMode);
      setPhoneStep("phone_input");
      setOtpCode("");
    }
  }, [isOpen, defaultTab, defaultMode]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleClose = () => {
    onOpenChange(false);
  };

  // -------------------------------------------------------------------------
  // EMAIL SUBMISSIONS
  // -------------------------------------------------------------------------
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return toast.error("يرجى إدخال البريد الإلكتروني");

    setIsSubmitting(true);

    if (emailMode === "signin") {
      if (!password) {
        setIsSubmitting(false);
        return toast.error("يرجى إدخال كلمة المرور");
      }
      const res = await signIn(email, password);
      setIsSubmitting(false);
      if (res.error) return toast.error(res.error);

      toast.success("مرحباً بعودتك! تم تسجيل الدخول بنجاح 👋");
      handleClose();
      onSuccess?.();
    } else if (emailMode === "signup") {
      if (!fullName.trim()) {
        setIsSubmitting(false);
        return toast.error("يرجى إدخال الاسم بالكامل");
      }
      if (password.length < 6) {
        setIsSubmitting(false);
        return toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      }

      const res = await signUp(email, password, fullName, phone);
      setIsSubmitting(false);
      if (res.error) return toast.error(res.error);

      if (res.needsConfirmation) {
        toast.success("تم إنشاء الحساب! يرجى التحقق من بريدك الإلكتروني لتأكيد التسجيل.");
      } else {
        toast.success("تم إنشاء الحساب وتسجيل الدخول بنجاح 🎉");
      }
      handleClose();
      onSuccess?.();
    } else if (emailMode === "forgot") {
      const res = await authService.sendPasswordResetEmail(email, redirectUrl);
      setIsSubmitting(false);
      if (res.error) return toast.error(res.error);

      toast.success("تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني 📩");
      setEmailMode("signin");
    } else if (emailMode === "magic") {
      const res = await authService.sendMagicLink(email, redirectUrl);
      setIsSubmitting(false);
      if (res.error) return toast.error(res.error);

      toast.success("تم إرسال رابط الدخول السريع إلى بريدك الإلكتروني ✨");
      handleClose();
    }
  };

  // -------------------------------------------------------------------------
  // PHONE & OTP SUBMISSIONS
  // -------------------------------------------------------------------------
  const handlePhoneSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return toast.error("يرجى إدخال رقم الهاتف");

    setIsSubmitting(true);
    const formatted = authService.formatPhoneNumber(phone);
    const res = await authService.sendPhoneOtp(formatted);
    setIsSubmitting(false);

    if (res.error) {
      // In case SMS gateway is in sandbox or fallback mode, fallback to phone credentials
      if (password && password.length >= 6) {
        setIsSubmitting(true);
        const loginRes = await signInWithPhone(phone, password);
        setIsSubmitting(false);
        if (!loginRes.error) {
          toast.success("تم تسجيل الدخول برقم الهاتف بنجاح 📱");
          handleClose();
          onSuccess?.();
          return;
        }
      }
      return toast.error(res.error);
    }

    toast.success(`تم إرسال رمز التحقق (OTP) إلى الرقم: ${formatted} 📲`);
    setPhoneStep("otp_verify");
    setResendTimer(60);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.trim().length < 4) {
      return toast.error("يرجى إدخال رمز التحقق المكون من 6 أرقام");
    }

    setIsSubmitting(true);
    const formatted = authService.formatPhoneNumber(phone);
    const res = await authService.verifyPhoneOtp(formatted, otpCode);
    setIsSubmitting(false);

    if (res.error) {
      return toast.error(res.error);
    }

    toast.success("تم التحقق من رقم الهاتف وتسجيل الدخول بنجاح ✅");
    handleClose();
    onSuccess?.();
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setIsSubmitting(true);
    const formatted = authService.formatPhoneNumber(phone);
    const res = await authService.sendPhoneOtp(formatted);
    setIsSubmitting(false);

    if (res.error) return toast.error(res.error);
    toast.success("تمت إعادة إرسال رمز التحقق بنجاح 📲");
    setResendTimer(60);
  };

  // -------------------------------------------------------------------------
  // GOOGLE OAUTH
  // -------------------------------------------------------------------------
  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    const res = await signInWithGoogle(redirectUrl);
    setIsSubmitting(false);
    if (res.error) toast.error(res.error);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] p-0 overflow-hidden border-border/80 bg-card rounded-3xl" dir="rtl">
        {/* Modal Header */}
        <div className="bg-gradient-to-b from-emerald-500/10 to-transparent p-6 pb-4 border-b border-border/40 text-center relative">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20 mb-3">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <DialogTitle className="text-xl font-display font-black text-foreground">
            {emailMode === "signup"
              ? "إنشاء حساب جديد في الوادي الأخضر"
              : emailMode === "forgot"
              ? "استعادة كلمة المرور"
              : "تسجيل الدخول إلى حسابك"}
          </DialogTitle>
          <DialogDescription className="text-xs font-semibold text-muted-foreground mt-1">
            استمتع بتجربة تسوق سريعة، تتبع طلباتك، وعروض حصرية لأعضاء المتجر
          </DialogDescription>
        </div>

        <div className="p-6 pt-4 space-y-4">
          {/* Main Channel Tabs */}
          {emailMode !== "forgot" && (
            <Tabs
              value={activeTab}
              onValueChange={(val) => {
                setActiveTab(val as "email" | "phone");
                setPhoneStep("phone_input");
              }}
              className="w-full"
            >
              <TabsList className="grid grid-cols-2 w-full h-11 p-1 bg-secondary/80 rounded-2xl">
                <TabsTrigger
                  value="email"
                  className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span>البريد الإلكتروني</span>
                </TabsTrigger>
                <TabsTrigger
                  value="phone"
                  className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
                >
                  <Phone className="h-3.5 w-3.5" />
                  <span>رقم الهاتف (SMS OTP)</span>
                </TabsTrigger>
              </TabsList>

              {/* ========================================================= */}
              {/* TAB 1: EMAIL & PASSWORD / MAGIC LINK                      */}
              {/* ========================================================= */}
              <TabsContent value="email" className="mt-4 space-y-3.5">
                <form onSubmit={handleEmailSubmit} className="space-y-3.5">
                  {emailMode === "signup" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-emerald-500" />
                        <span>الاسم بالكامل</span>
                      </Label>
                      <Input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="مثال: أحمد محمد محمود"
                        className="h-10 rounded-xl text-xs font-semibold bg-background"
                        required
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-emerald-500" />
                      <span>البريد الإلكتروني</span>
                    </Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="yourname@example.com"
                      className="h-10 rounded-xl text-xs font-semibold bg-background"
                      dir="ltr"
                      required
                    />
                  </div>

                  {emailMode === "signup" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-emerald-500" />
                        <span>رقم الهاتف (اختياري)</span>
                      </Label>
                      <Input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="01012345678"
                        className="h-10 rounded-xl text-xs font-semibold bg-background"
                        dir="ltr"
                      />
                    </div>
                  )}

                  {emailMode !== "magic" && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Lock className="h-3.5 w-3.5 text-emerald-500" />
                          <span>كلمة المرور</span>
                        </Label>
                        {emailMode === "signin" && (
                          <button
                            type="button"
                            onClick={() => setEmailMode("forgot")}
                            className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                          >
                            نسيت كلمة المرور؟
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="h-10 pe-10 rounded-xl text-xs font-semibold bg-background"
                          dir="ltr"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-11 rounded-xl font-black text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
                  >
                    {isSubmitting ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : emailMode === "signup" ? (
                      "إنشاء حساب جديد"
                    ) : (
                      "تسجيل الدخول"
                    )}
                  </Button>

                  {/* Mode Switcher */}
                  <div className="flex items-center justify-center gap-1 text-xs font-semibold text-muted-foreground pt-1">
                    {emailMode === "signin" ? (
                      <>
                        <span>ليس لديك حساب بعد؟</span>
                        <button
                          type="button"
                          onClick={() => setEmailMode("signup")}
                          className="font-black text-emerald-600 dark:text-emerald-400 hover:underline"
                        >
                          سجل حساباً جديداً
                        </button>
                      </>
                    ) : (
                      <>
                        <span>لديك حساب بالفعل؟</span>
                        <button
                          type="button"
                          onClick={() => setEmailMode("signin")}
                          className="font-black text-emerald-600 dark:text-emerald-400 hover:underline"
                        >
                          تسجيل الدخول
                        </button>
                      </>
                    )}
                  </div>
                </form>
              </TabsContent>

              {/* ========================================================= */}
              {/* TAB 2: PHONE & SMS OTP                                    */}
              {/* ========================================================= */}
              <TabsContent value="phone" className="mt-4 space-y-3.5">
                {phoneStep === "phone_input" ? (
                  <form onSubmit={handlePhoneSendOtp} className="space-y-3.5">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-emerald-500" />
                        <span>رقم الهاتف المحمول</span>
                      </Label>
                      <div className="flex items-center gap-2" dir="ltr">
                        <span className="h-10 px-3 flex items-center justify-center rounded-xl bg-secondary text-xs font-mono font-bold text-foreground border border-border">
                          🇪🇬 +20
                        </span>
                        <Input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="01012345678"
                          className="h-10 rounded-xl text-xs font-semibold bg-background"
                          required
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        سنرسل رمز تحقق من 6 أرقام عبر رسالة نصية قصيرة (SMS).
                      </p>
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-11 rounded-xl font-black text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
                    >
                      {isSubmitting ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        "إرسال رمز التحقق (OTP)"
                      )}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-3.5">
                    <div className="bg-secondary/40 p-3 rounded-2xl flex items-center justify-between text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[10px]">الرمز مُرسل إلى:</span>
                        <span className="font-mono font-bold text-foreground">{phone}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPhoneStep("phone_input")}
                        className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        تغيير الرقم
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground">
                        أدخل رمز التحقق (OTP)
                      </Label>
                      <Input
                        type="text"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                        placeholder="123456"
                        className="h-12 text-center text-lg tracking-widest font-mono font-black rounded-xl bg-background"
                        dir="ltr"
                        required
                        autoFocus
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmitting || otpCode.length < 4}
                      className="w-full h-11 rounded-xl font-black text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
                    >
                      {isSubmitting ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        "تأكيد الدخول"
                      )}
                    </Button>

                    <div className="text-center pt-1">
                      {resendTimer > 0 ? (
                        <span className="text-xs font-semibold text-muted-foreground">
                          إعادة الإرسال متاحة خلال: <strong className="text-foreground">{resendTimer}s</strong>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleResendOtp}
                          disabled={isSubmitting}
                          className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                        >
                          إعادة إرسال رمز التحقق
                        </button>
                      )}
                    </div>
                  </form>
                )}
              </TabsContent>
            </Tabs>
          )}

          {/* Forgot Password Mode */}
          {emailMode === "forgot" && (
            <form onSubmit={handleEmailSubmit} className="space-y-3.5">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-emerald-500" />
                  <span>البريد الإلكتروني المسجل</span>
                </Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@example.com"
                  className="h-10 rounded-xl text-xs font-semibold bg-background"
                  dir="ltr"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 rounded-xl font-black text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
              >
                {isSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : "إرسال رابط الاستعادة"}
              </Button>

              <button
                type="button"
                onClick={() => setEmailMode("signin")}
                className="w-full text-center text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                العودة لتسجيل الدخول
              </button>
            </form>
          )}

          {/* ========================================================= */}
          {/* GOOGLE OAUTH BUTTON                                       */}
          {/* ========================================================= */}
          {emailMode !== "forgot" && (
            <div className="pt-2">
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-border"></div>
                <span className="flex-shrink mx-3 text-[11px] font-bold text-muted-foreground">أو من خلال</span>
                <div className="flex-grow border-t border-border"></div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleLogin}
                disabled={isSubmitting}
                className="w-full h-11 rounded-xl border-border bg-background hover:bg-secondary text-xs font-bold flex items-center justify-center gap-2.5 shadow-2xs"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
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
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>المتابعة باستخدام حساب Google</span>
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AuthModal;
