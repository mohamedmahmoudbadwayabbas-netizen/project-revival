import { useAuth as useBaseAuth, type AuthCtx, type AppUser } from "@/lib/auth-context";
import * as authService from "@/services/authService";

export type { AppUser, AuthCtx };
export type { UserRole, UserProfile } from "@/services/authService";

export function useAuth() {
  const baseAuth = useBaseAuth();
  return {
    ...baseAuth,
    isAuthenticated: Boolean(baseAuth.user && baseAuth.session),
    sendPhoneOtp: authService.sendPhoneOtp,
    verifyPhoneOtp: authService.verifyPhoneOtp,
    sendMagicLink: authService.sendMagicLink,
    sendPasswordResetEmail: authService.sendPasswordResetEmail,
    updateUserPassword: authService.updateUserPassword,
    formatPhoneNumber: authService.formatPhoneNumber,
    getArabicErrorMessage: authService.getArabicAuthErrorMessage,
  };
}

export default useAuth;
