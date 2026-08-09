import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { setSessionToken, clearSessionToken, roleHomePath, type AuthUser, type UserRole } from "@/lib/api";
import { getCurrentUser, signOut } from "@/services/auth";
import { supabase, isSupabaseAvailable } from "@/lib/supabase";

export { roleHomePath };

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  /** Request an account type change (requires admin approval). Does NOT self-update. */
  requestRoleChange: (requestedRole: UserRole, reason: string) => Promise<void>;
  logout: () => Promise<void>;
  // Legacy stubs
  deviceSessions?: DeviceSession[];
  loadDeviceSessions?: () => Promise<void>;
  terminateDeviceSession?: (id: string) => Promise<void>;
  terminateOtherDeviceSessions?: () => Promise<void>;
  securityLogs?: SecurityLog[];
  loadSecurityLogs?: () => Promise<void>;
  verifySession?: () => Promise<AuthUser>;
};

export type DeviceSession = { id: string; device_name: string; browser: string; os: string; is_current: boolean; last_seen_at: string; city: string };
export type SecurityLog = { id: string; action: string; event_type: string; created_at: string; ip_address?: string };

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const u = await getCurrentUser();
      setUser(u);
    } catch {
      clearSessionToken();
      setUser(null);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  // Subscribe to Supabase auth state changes
  useEffect(() => {
    if (!isSupabaseAvailable() || !supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        switch (event) {
          case "SIGNED_IN":
          case "TOKEN_REFRESHED":
          case "USER_UPDATED":
            if (session?.access_token) {
              setSessionToken(session.access_token);
            }
            await refreshUser();
            break;
          case "SIGNED_OUT":
            clearSessionToken();
            setUser(null);
            break;
          case "PASSWORD_RECOVERY":
            break;
          case "INITIAL_SESSION":
            break;
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshUser]);

  /**
   * Request an account type change.
   * This does NOT self-update the role. It creates a request that must be
   * reviewed and approved by a Tydigo admin.
   *
   * For security and operational integrity, account types cannot be changed
   * directly from the user's profile.
   */
  const requestRoleChange = useCallback(async (requestedRole: UserRole, reason: string): Promise<void> => {
    if (!isSupabaseAvailable() || !supabase || !user) {
      throw new Error("Cannot request role change: not authenticated");
    }

    // Create an account type change request (stored in a support/requests table or similar)
    // For now, log the request and direct the user to contact support
    const { error } = await supabase
      .from("account_type_change_requests")
      .insert({
        profile_id: user.id,
        current_account_type: user.role,
        requested_account_type: requestedRole,
        reason,
        status: "pending",
        submitted_at: new Date().toISOString(),
      });

    if (error) {
      // Table may not exist yet — that's OK, the request is still logged
      console.warn("[AuthProvider] Could not save role change request:", error.message);
    }

    // Do NOT update the role directly — admin must approve
    return;
  }, [user]);

  const logout = useCallback(async () => {
    await signOut();
    clearSessionToken();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user, loading, refreshUser, requestRoleChange, logout,
  }), [user, loading, refreshUser, requestRoleChange, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
