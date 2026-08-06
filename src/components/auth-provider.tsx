import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { setSessionToken, clearSessionToken, roleHomePath, type AuthUser, type UserRole } from "@/lib/api";
import { getCurrentUser, signOut, verifyOtp, updateProfile, signIn } from "@/services/auth";
import { recordDeviceSession, getDeviceSessions, terminateSession, terminateOtherSessions, type DeviceSession } from "@/services/session";
import { getSecurityLogs, type SecurityLog } from "@/services/security";

// Re-export for convenience
export { roleHomePath };
export type { DeviceSession, SecurityLog };

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  verifySession: (phone: string, code: string, profileMeta?: { name?: string; role?: UserRole }) => Promise<AuthUser>;
  signInWithPassword: (identifier: string, password: string) => Promise<AuthUser>;
  updateRole: (role: UserRole) => Promise<AuthUser>;
  logout: () => Promise<void>;
  deviceSessions: DeviceSession[];
  securityLogs: SecurityLog[];
  loadDeviceSessions: () => Promise<void>;
  loadSecurityLogs: () => Promise<void>;
  terminateDeviceSession: (sessionId: string) => Promise<void>;
  terminateOtherDeviceSessions: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [deviceSessions, setDeviceSessions] = useState<DeviceSession[]>([]);
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);

  const refreshUser = useCallback(async () => {
    try {
      const nextUser = await getCurrentUser();
      setUser(nextUser);
      if (nextUser) {
        // Record device session on app load
        const { data } = await import("@/lib/supabase").then(m => m.supabase?.auth.getUser());
        if (data?.user) {
          await recordDeviceSession(nextUser.id, data.user.id);
        }
      }
    } catch {
      clearSessionToken();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const loadDeviceSessions = useCallback(async () => {
    if (!user) return;
    const sessions = await getDeviceSessions(user.id);
    setDeviceSessions(sessions);
  }, [user]);

  const loadSecurityLogs = useCallback(async () => {
    if (!user) return;
    const logs = await getSecurityLogs(user.id);
    setSecurityLogs(logs);
  }, [user]);

  const terminateDeviceSession = useCallback(async (sessionId: string) => {
    await terminateSession(sessionId);
    await loadDeviceSessions();
  }, [loadDeviceSessions]);

  const terminateOtherDeviceSessions = useCallback(async () => {
    if (!user) return;
    await terminateOtherSessions(user.id);
    await loadDeviceSessions();
  }, [user, loadDeviceSessions]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      refreshUser,
      verifySession: async (phone: string, code: string, profileMeta) => {
        const { user: nextUser, token } = await verifyOtp(phone, code, profileMeta);
        if (token) setSessionToken(token);
        setUser(nextUser);
        return nextUser;
      },
      signInWithPassword: async (identifier: string, password: string) => {
        const result = await signIn({ identifier, password });
        setUser(result.user);
        return result.user;
      },
      updateRole: async (role) => {
        if (!user) throw new Error("Not authenticated");
        const nextUser = await updateProfile(user.id, { role });
        setUser(nextUser);
        return nextUser;
      },
      logout: async () => {
        await signOut();
        clearSessionToken();
        setUser(null);
        setDeviceSessions([]);
        setSecurityLogs([]);
      },
      deviceSessions,
      securityLogs,
      loadDeviceSessions,
      loadSecurityLogs,
      terminateDeviceSession,
      terminateOtherDeviceSessions,
    }),
    [user, loading, refreshUser, deviceSessions, securityLogs, loadDeviceSessions, loadSecurityLogs, terminateDeviceSession, terminateOtherDeviceSessions],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}
