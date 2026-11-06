import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase-loose";
import {
  getArabicAuthErrorMessage,
  formatPhoneNumber,
  getPhoneSyntheticEmail,
  type UserRole,
} from "@/services/authService";

export interface AppUser {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
    phone?: string;
    avatar_url?: string;
    provider?: string;
  };
}

export interface AuthCtx {
  user: AppUser | null;
  session: Session | null;
  role: UserRole;
  isAdmin: boolean;
  isStaff: boolean;
  isCustomer: boolean;
  /** Kept for backwards compatibility; super_admin is now database-controlled. */
  isRootAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (
    email: string,
    password: string,
    fullName?: string,
    phone?: string,
  ) => Promise<{ error?: string; needsConfirmation?: boolean }>;
  signInWithPhone: (phone: string, password?: string) => Promise<{ error?: string }>;
  signUpWithPhone: (
    phone: string,
    password: string,
    fullName?: string,
  ) => Promise<{ error?: string; needsConfirmation?: boolean }>;
  signInWithGoogle: (redirectUri?: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  claimAdmin: () => Promise<boolean>;
  refreshRole: () => Promise<void>;
}

export const normalizePhone = formatPhoneNumber;
export const phoneEmail = getPhoneSyntheticEmail;

const AuthContext = createContext<AuthCtx | null>(null);

function toAppUser(user: User | null): AppUser | null {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email || "",
    user_metadata: {
      full_name: user.user_metadata?.full_name,
      phone: user.user_metadata?.phone,
      avatar_url: user.user_metadata?.avatar_url,
      provider: user.app_metadata?.provider,
    },
  };
}

async function fetchRole(): Promise<UserRole> {
  const { data, error } = await supabase.rpc("get_my_role");
  if (error) {
    console.warn("Unable to resolve database role:", error.message);
    return "customer";
  }

  const role = String(data || "customer").toLowerCase();
  if (role === "super_admin") return "super_admin";
  if (role === "admin") return "admin";
  if (role === "staff") return "staff";
  return "customer";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>("customer");
  const [loading, setLoading] = useState(true);

  const refreshRole = async () => {
    if (!currentSession?.user) {
      setRole("customer");
      return;
    }
    setRole(await fetchRole());
  };

  useEffect(() => {
    let mounted = true;

    const applySession = async (session: Session | null) => {
      if (!mounted) return;
      setCurrentSession(session);
      setCurrentUser(toAppUser(session?.user || null));
      setRole(session?.user ? await fetchRole() : "customer");
    };

    const initialize = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        await applySession(data.session);
      } catch (error) {
        if (mounted) {
          setCurrentSession(null);
          setCurrentUser(null);
          setRole("customer");
          console.warn("Auth initialization error:", getArabicAuthErrorMessage(error));
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      // Do not await Supabase calls inside the auth callback. Schedule role lookup
      // after the auth event has been processed to avoid deadlocks.
      setCurrentSession(session);
      setCurrentUser(toAppUser(session?.user || null));
      if (!session?.user) {
        setRole("customer");
      } else {
        setTimeout(() => {
          if (mounted) void fetchRole().then((nextRole) => mounted && setRole(nextRole));
        }, 0);
      }
      if (event === "SIGNED_OUT") setRole("customer");
    });

    void initialize();

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const isAdmin = role === "admin" || role === "super_admin";
  const isStaff = isAdmin || role === "staff";
  const isCustomer = !isStaff;
  // There is no special email/password root-admin bypass anymore.
  const isRootAdmin = role === "super_admin";

  const signIn = async (emailInput: string, password: string) => {
    setLoading(true);
    try {
      const email = emailInput.trim().toLowerCase();
      if (!email || !password) return { error: "البريد الإلكتروني وكلمة المرور مطلوبان" };

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: getArabicAuthErrorMessage(error) };

      setCurrentSession(data.session);
      setCurrentUser(toAppUser(data.user));
      setRole(await fetchRole());
      return {};
    } catch (error) {
      return { error: getArabicAuthErrorMessage(error) };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (emailInput: string, password: string, fullName?: string, phone?: string) => {
    setLoading(true);
    try {
      const email = emailInput.trim().toLowerCase();
      const cleanName = fullName?.trim() || email.split("@")[0] || "عميل الوادي الأخضر";
      const cleanPhone = phone ? formatPhoneNumber(phone) : undefined;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: cleanName, phone: cleanPhone },
        },
      });
      if (error) return { error: getArabicAuthErrorMessage(error) };

      if (data.user && data.session) {
        setCurrentSession(data.session);
        setCurrentUser(toAppUser(data.user));
        setRole(await fetchRole());
      }

      return {
        needsConfirmation: Boolean(data.user && !data.session),
      };
    } catch (error) {
      return { error: getArabicAuthErrorMessage(error) };
    } finally {
      setLoading(false);
    }
  };

  const signInWithPhone = async (phoneInput: string, password?: string) => {
    if (!password) return { error: "كلمة المرور مطلوبة" };
    return signIn(getPhoneSyntheticEmail(formatPhoneNumber(phoneInput)), password);
  };

  const signUpWithPhone = async (phoneInput: string, password: string, fullName?: string) => {
    if (!password || password.length < 6) {
      return { error: "اختر كلمة مرور قوية (6 أحرف على الأقل)" };
    }
    const formattedPhone = formatPhoneNumber(phoneInput);
    return signUp(getPhoneSyntheticEmail(formattedPhone), password, fullName, formattedPhone);
  };

  const signInWithGoogle = async (redirectUri?: string) => {
    setLoading(true);
    try {
      const { lovable } = await import("@/integrations/lovable/index");
      const targetRedirect = redirectUri || `${window.location.origin}/auth`;
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: targetRedirect });
      if (result.error) return { error: getArabicAuthErrorMessage(result.error) };
      return {};
    } catch (error) {
      return { error: getArabicAuthErrorMessage(error) };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setCurrentUser(null);
      setCurrentSession(null);
      setRole("customer");
    } finally {
      setLoading(false);
    }
  };

  const value = useMemo<AuthCtx>(() => ({
    user: currentUser,
    session: currentSession,
    role,
    isAdmin,
    isStaff,
    isCustomer,
    isRootAdmin,
    loading,
    signIn,
    signUp,
    signInWithPhone,
    signUpWithPhone,
    signInWithGoogle,
    signOut,
    claimAdmin: async () => false,
    refreshRole,
  }), [currentUser, currentSession, role, isAdmin, isStaff, isCustomer, isRootAdmin, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
