import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { setSessionToken, clearSessionToken, roleHomePath, type AuthUser, type UserRole } from "@/lib/api";
import { getCurrentUser, signOut, verifyOtp, updateProfile, signIn } from "@/services/auth";

// Re-export for convenience
export { roleHomePath };

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  verifySession: (phone: string, code: string, profileMeta?: { name?: string; role?: UserRole }) => Promise<AuthUser>;
  signInWithPassword: (identifier: string, password: string) => Promise<AuthUser>;
  updateRole: (role: UserRole) => Promise<AuthUser>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const nextUser = await getCurrentUser();
      setUser(nextUser);
    } catch {
      clearSessionToken();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

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
      },
    }),
    [user, loading, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}
