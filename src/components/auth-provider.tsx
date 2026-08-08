import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { setSessionToken, clearSessionToken, roleHomePath, type AuthUser, type UserRole } from "@/lib/api";
import { getCurrentUser, signOut } from "@/services/auth";
import { supabase, isSupabaseAvailable } from "@/lib/supabase";

export { roleHomePath };

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  updateRole: (role: UserRole) => Promise<{ role: UserRole }>;
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
            // Refresh the user profile when auth state changes
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
            // Password recovery event — no action needed here
            break;
          case "INITIAL_SESSION":
            // Already handled by the initial load
            break;
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshUser]);

  const updateRole = useCallback(async (role: UserRole): Promise<{ role: UserRole }> => {
    if (!isSupabaseAvailable() || !supabase || !user) {
      throw new Error("Cannot update role: not authenticated");
    }

    // Update role in profiles table
    const { error } = await supabase
      .from("profiles")
      .update({ role, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    if (error) throw new Error(error.message);

    // Refresh the user to get updated role
    await refreshUser();

    return { role };
  }, [user, refreshUser]);

  const logout = useCallback(async () => {
    await signOut();
    clearSessionToken();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user, loading, refreshUser, updateRole, logout,
  }), [user, loading, refreshUser, updateRole, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
