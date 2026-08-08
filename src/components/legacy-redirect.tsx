/**
 * Legacy route redirects for backward compatibility.
 *
 * Redirects old routes to their canonical equivalents.
 * Example: /collector/dashboard → /fleet/dashboard for fleet_owner users.
 */

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/auth-provider";
import { getRoleDashboardPath } from "@/lib/role-registry";

type LegacyRedirectProps = {
  /** The canonical path to redirect to */
  to: string;
};

export function LegacyRedirect({ to }: LegacyRedirectProps) {
  const navigate = useNavigate();

  useEffect(() => {
    navigate(to, { replace: true });
  }, [navigate, to]);

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
      <div className="h-10 w-10 rounded-full border-4 border-green-100 border-t-[#145C25] animate-spin" />
    </div>
  );
}

/**
 * Smart redirect that uses the user's actual role to determine
 * the correct dashboard, rather than a hardcoded path.
 */
export function RoleAwareRedirect() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user?.role) {
      const path = getRoleDashboardPath(user.role);
      navigate(path, { replace: true });
    } else {
      navigate("/login", { replace: true });
    }
  }, [navigate, user]);

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
      <div className="h-10 w-10 rounded-full border-4 border-green-100 border-t-[#145C25] animate-spin" />
    </div>
  );
}
