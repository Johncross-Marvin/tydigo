import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { setSessionToken, clearSessionToken, roleHomePath, type AuthUser, type UserRole } from "@/lib/api";
import { getCurrentUser, signOut } from "@/services/auth";

export { roleHomePath };

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  updateRole?: (role: UserRole) => Promise<{ role: UserRole }>;
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

  const refreshUser = async () => {
    try {
      const u = await getCurrentUser();
      setUser(u);
    } catch {
      clearSessionToken();
      setUser(null);
    }
  };

  useEffect(() => { refreshUser().finally(() => setLoading(false)); }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user, loading, refreshUser,
    logout: async () => { await signOut(); clearSessionToken(); setUser(null); },
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
