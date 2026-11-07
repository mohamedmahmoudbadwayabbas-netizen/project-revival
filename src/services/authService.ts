/* =========================================================================
   AUTHENTICATION SERVICE — SUPABASE & RBAC ENGINE
   Complete authentication provider with Arabic error translations,
   Phone SMS OTP verification, Email/Password, Google OAuth, and RBAC.
   ========================================================================= */

import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type UserRole = "customer" | "staff" | "admin" | "super_admin";

export interface UserProfile {
  id: string;
  email?: string | null;
  phone?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  role: UserRole;
  created_at?: string;
  updated_at?: string;
}

export interface AuthResponse<T = unknown> {
  data?: T;
  error?: string | null;
  errorCode?: string | null;
}

/**
 * Translates raw Supabase / GoTrue auth error codes into friendly Arabic messages.
 */
export function getArabicAuthErrorMessage(error: unknown): string {
  if (!error) return "حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى";

  const errObj = error as Record<string, unknown>;
  const rawMessage =
    typeof error === "string" ? error : String(errObj.message || errObj.error_description || "");
  const code = String(errObj.code || errObj.error || "").toLowerCase();
  const lowerMsg = rawMessage.toLowerCase();

  // Code or Message pattern matches
  if (
    lowerMsg.includes("invalid login credentials") ||
    code === "invalid_credentials" ||
    lowerMsg.includes("invalid_grant")
  ) {
    return "البريد الإلكتروني أو كلمة المرور غير صحيحة، يرجى التحقق وإعادة المحاولة.";
  }
  if (
    lowerMsg.includes("user already registered") ||
    code === "user_already_exists" ||
    lowerMsg.includes("already registered")
  ) {
    return "هذا الحساب مسجل بالفعل مسبقاً. يمكنك تسجيل الدخول مباشرة.";
  }
  if (lowerMsg.includes("email not confirmed") || code === "email_not_confirmed") {
    return "يرجى تأكيد بريدك الإلكتروني عبر الرابط المرسل إلى صندوق الوارد الخاص بك.";
  }
  if (lowerMsg.includes("password should be at least") || lowerMsg.includes("weak_password")) {
    return "كلمة المرور ضعيفة. يجب أن تتكون من 6 أحرف أو أرقام على الأقل.";
  }
  if (
    lowerMsg.includes("rate limit") ||
    lowerMsg.includes("over_email_send_rate_limit") ||
    lowerMsg.includes("over_sms_send_rate_limit")
  ) {
    return "تم تجاوز الحد المسموح من المحاولات. يرجى الانتظار دقيقة واحدة ثم المحاولة مجدداً.";
  }
  if (
    lowerMsg.includes("token has expired") ||
    lowerMsg.includes("otp_expired") ||
    lowerMsg.includes("token is invalid")
  ) {
    return "رمز التحقق (OTP) غير صحيح أو انتهت صلاحيته. يرجى طلب رمز جديد.";
  }
  if (lowerMsg.includes("invalid phone") || lowerMsg.includes("phone number is invalid")) {
    return "رقم الهاتف غير صالح. يرجى كتابة رقم هاتف مصري صحيح (مثال: 01012345678).";
  }
  if (lowerMsg.includes("network") || lowerMsg.includes("failed to fetch")) {
    return "تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت.";
  }
  if (lowerMsg.includes("captcha") || lowerMsg.includes("security verification")) {
    return "يرجى إكمال التحقق الأمني لإتمام العملية.";
  }

  return rawMessage || "حدث خطأ أثناء تنفيذ العملية، يرجى المحاولة لاحقاً.";
}

/**
 * Normalizes phone numbers for Egyptian & International standards (+20xxxxxxxxxx).
 */
export function formatPhoneNumber(phone: string): string {
  let cleaned = phone.trim().replace(/[\s\-()]/g, "");
  if (!cleaned.startsWith("+")) {
    if (cleaned.startsWith("00")) {
      cleaned = "+" + cleaned.slice(2);
    } else if (cleaned.startsWith("0")) {
      cleaned = "+20" + cleaned.slice(1);
    } else if (cleaned.startsWith("20")) {
      cleaned = "+" + cleaned;
    } else {
      cleaned = "+20" + cleaned;
    }
  }
  return cleaned;
}

/**
 * Generate synthetic email representation for phone-only logins.
 */
export function getPhoneSyntheticEmail(phone: string): string {
  const norm = formatPhoneNumber(phone).replace("+", "");
  return `${norm}@phone.elwadi.local`;
}

/**
 * Extract a display role for legacy callers. Security-sensitive authorization must
 * use the database-backed get_my_role() RPC/RLS and must never trust metadata.
 */
export function resolveUserRole(user?: User | null, profile?: UserProfile | null): UserRole {
  if (!user && !profile) return "customer";

  const rawRole = (profile?.role || "customer").toLowerCase();
  if (rawRole === "super_admin" || rawRole === "superadmin") return "super_admin";
  if (rawRole === "admin") return "admin";
  if (rawRole === "staff" || rawRole === "manager" || rawRole === "cashier") return "staff";
  return "customer";
}

// ---------------------------------------------------------------------------
// AUTH API METHODS
// ---------------------------------------------------------------------------

export async function signInWithEmail(
  emailInput: string,
  passwordInput: string,
): Promise<AuthResponse<Session>> {
  try {
    const email = emailInput.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: passwordInput,
    });

    if (error) {
      return { error: getArabicAuthErrorMessage(error), errorCode: error.code || error.name };
    }

    return { data: data.session };
  } catch (err: unknown) {
    return { error: getArabicAuthErrorMessage(err) };
  }
}

export async function signUpWithEmail(
  emailInput: string,
  passwordInput: string,
  metadata?: { fullName?: string; phone?: string; role?: UserRole },
): Promise<
  AuthResponse<{ user: User | null; session: Session | null; needsEmailConfirmation?: boolean }>
> {
  try {
    const email = emailInput.trim().toLowerCase();
    const cleanPhone = metadata?.phone ? formatPhoneNumber(metadata.phone) : undefined;
    const cleanName = metadata?.fullName?.trim() || email.split("@")[0];
    const role: UserRole = metadata?.role || "customer";

    const { data, error } = await supabase.auth.signUp({
      email,
      password: passwordInput,
      options: {
        data: {
          full_name: cleanName,
          phone: cleanPhone,
          role,
        },
      },
    });

    if (error) {
      return { error: getArabicAuthErrorMessage(error), errorCode: error.code };
    }

    const needsEmailConfirmation = !data.session && Boolean(data.user);

    // Also attempt profile record upsert if session exists
    if (data.user) {
      try {
        await supabase.from("profiles").upsert(
          {
            id: data.user.id,
            full_name: cleanName,
            phone: cleanPhone,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" },
        );
      } catch (err) {
        console.warn("Failed to synchronize the user profile.", err);
      }
    }

    return {
      data: {
        user: data.user,
        session: data.session,
        needsEmailConfirmation,
      },
    };
  } catch (err: unknown) {
    return { error: getArabicAuthErrorMessage(err) };
  }
}

export async function signInWithGoogle(
  customRedirectUri?: string,
): Promise<AuthResponse<{ url?: string }>> {
  try {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const { lovable } = await import("@/integrations/lovable/index");
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: customRedirectUri || `${origin}/auth`,
    });
    if (result.error) {
      return { error: getArabicAuthErrorMessage(result.error) };
    }
    return { data: {} };
  } catch (err: unknown) {
    return { error: getArabicAuthErrorMessage(err) };
  }
}

export async function sendPhoneOtp(phoneInput: string): Promise<AuthResponse<boolean>> {
  try {
    const phone = formatPhoneNumber(phoneInput);
    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: {
        channel: "sms",
      },
    });

    if (error) {
      return { error: getArabicAuthErrorMessage(error), errorCode: error.code };
    }

    return { data: true };
  } catch (err: unknown) {
    return { error: getArabicAuthErrorMessage(err) };
  }
}

export async function verifyPhoneOtp(
  phoneInput: string,
  tokenInput: string,
  type: "sms" | "phone_change" = "sms",
): Promise<AuthResponse<Session>> {
  try {
    const phone = formatPhoneNumber(phoneInput);
    const token = tokenInput.trim();

    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type,
    });

    if (error) {
      return { error: getArabicAuthErrorMessage(error), errorCode: error.code };
    }

    return { data: data.session || undefined };
  } catch (err: unknown) {
    return { error: getArabicAuthErrorMessage(err) };
  }
}

export async function sendMagicLink(
  emailInput: string,
  customRedirectUri?: string,
): Promise<AuthResponse<boolean>> {
  try {
    const email = emailInput.trim().toLowerCase();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const emailRedirectTo = customRedirectUri || `${origin}/auth`;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo,
      },
    });

    if (error) {
      return { error: getArabicAuthErrorMessage(error) };
    }

    return { data: true };
  } catch (err: unknown) {
    return { error: getArabicAuthErrorMessage(err) };
  }
}

export async function sendPasswordResetEmail(
  emailInput: string,
  customRedirectUri?: string,
): Promise<AuthResponse<boolean>> {
  try {
    const email = emailInput.trim().toLowerCase();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const redirectTo = customRedirectUri || `${origin}/auth?mode=update-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      return { error: getArabicAuthErrorMessage(error) };
    }

    return { data: true };
  } catch (err: unknown) {
    return { error: getArabicAuthErrorMessage(err) };
  }
}

export async function updateUserPassword(newPassword: string): Promise<AuthResponse<User>> {
  try {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { error: getArabicAuthErrorMessage(error) };
    }

    return { data: data.user };
  } catch (err: unknown) {
    return { error: getArabicAuthErrorMessage(err) };
  }
}

export async function updateUserProfile(
  userId: string,
  profileUpdates: Partial<UserProfile>,
): Promise<AuthResponse<UserProfile>> {
  try {
    // 1. Update auth user metadata
    if (
      profileUpdates.full_name ||
      profileUpdates.phone ||
      profileUpdates.role ||
      profileUpdates.avatar_url
    ) {
      await supabase.auth
        .updateUser({
          data: {
            full_name: profileUpdates.full_name,
            phone: profileUpdates.phone,
            role: profileUpdates.role,
            avatar_url: profileUpdates.avatar_url,
          },
        })
        .catch(() => {});
    }

    // 2. Update profiles table record
    const { data, error } = await supabase
      .from("profiles")
      .upsert({
        id: userId,
        full_name: profileUpdates.full_name,
        phone: profileUpdates.phone,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.warn("Notice updating profiles table:", error.message);
    }

    return {
      data: {
        id: userId,
        full_name: profileUpdates.full_name,
        phone: profileUpdates.phone,
        role: profileUpdates.role || "customer",
        avatar_url: profileUpdates.avatar_url,
      },
    };
  } catch (err: unknown) {
    return { error: getArabicAuthErrorMessage(err) };
  }
}

export async function fetchUserProfile(userId: string): Promise<AuthResponse<UserProfile>> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      return { error: getArabicAuthErrorMessage(error) };
    }

    if (!data) {
      return { data: undefined };
    }

    return {
      data: {
        id: data.id,
        full_name: data.full_name,
        phone: data.phone,
        role: "customer",
        updated_at: data.updated_at ?? undefined,
      },
    };
  } catch (err: unknown) {
    return { error: getArabicAuthErrorMessage(err) };
  }
}

export async function signOutUser(): Promise<AuthResponse<void>> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { error: getArabicAuthErrorMessage(error) };
    }
    return { data: undefined };
  } catch (err: unknown) {
    return { error: getArabicAuthErrorMessage(err) };
  }
}
