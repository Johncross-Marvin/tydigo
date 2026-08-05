import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { clearSessionToken, setSessionToken, type AuthUser, type UserRole, roleHomePath } from "@/lib/api";
import { getCurrentUser, signOut, verifyOtp, updateProfile } from "@/services/auth";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  verifySession: (phone: string, code: string, profileMeta?: { name?: string; role?: UserRole }) => Promise<AuthUser>;
  updateRole: (role: UserRole) => Promise<AuthUser>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const nextUser = await getCurrentUser();
      setUser(nextUser);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      refreshUser,
      verifySession: async (phoneOrId: string, code: string, profileMeta) => {
        const { user: nextUser, token } = await verifyOtp(phoneOrId, code, phoneOrId, profileMeta);
        if (token) setSessionToken(token);
        setUser(nextUser);
        return nextUser;
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
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}

export { roleHomePath };
