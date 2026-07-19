import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, clearSessionToken, setSessionToken, type AuthUser, type UserRole } from "@/lib/api";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  verifySession: (verificationId: string, code: string) => Promise<AuthUser>;
  updateRole: (role: UserRole) => Promise<AuthUser>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    const { user: nextUser } = await api.me();
    setUser(nextUser);
  };

  useEffect(() => {
    api
      .me()
      .then(({ user: nextUser }) => setUser(nextUser))
      .catch(() => {
        clearSessionToken();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      refreshUser,
      verifySession: async (verificationId, code) => {
        const { token, user: nextUser } = await api.verifyAuth({ verificationId, code });
        setSessionToken(token);
        setUser(nextUser);
        return nextUser;
      },
      updateRole: async (role) => {
        const { user: nextUser } = await api.updateMe({ role });
        setUser(nextUser);
        return nextUser;
      },
      logout: async () => {
        await api.logout().catch(() => undefined);
        clearSessionToken();
        setUser(null);
      },
    }),
    [loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}
