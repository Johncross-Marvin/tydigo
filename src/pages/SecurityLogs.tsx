/**
 * Tydigo Security Logs Page
 *
 * View account security activity: logins, password changes, etc.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Shield, LogIn, LogOut, Key, Phone, Mail,
  AlertTriangle, UserPlus, Clock, ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth, type SecurityLog } from "@/components/auth-provider";
import { useSeo } from "@/lib/seo";

const EVENT_ICONS: Record<string, typeof LogIn> = {
  login: LogIn,
  logout: LogOut,
  password_change: Key,
  phone_change: Phone,
  email_change: Mail,
  failed_login: AlertTriangle,
  otp_request: Phone,
  role_change: UserPlus,
  suspicious_activity: AlertTriangle,
  signup: UserPlus,
};

const EVENT_LABELS: Record<string, string> = {
  login: "Sign in",
  logout: "Sign out",
  password_change: "Password changed",
  phone_change: "Phone changed",
  email_change: "Email changed",
  failed_login: "Failed sign in",
  otp_request: "OTP requested",
  role_change: "Role changed",
  suspicious_activity: "Suspicious activity",
  signup: "Account created",
};

const EVENT_COLORS: Record<string, string> = {
  login: "bg-blue-100 text-blue-600",
  logout: "bg-neutral-100 text-neutral-600",
  password_change: "bg-yellow-100 text-yellow-600",
  phone_change: "bg-purple-100 text-purple-600",
  email_change: "bg-purple-100 text-purple-600",
  failed_login: "bg-red-100 text-red-600",
  otp_request: "bg-indigo-100 text-indigo-600",
  role_change: "bg-orange-100 text-orange-600",
  suspicious_activity: "bg-red-100 text-red-600",
  signup: "bg-green-100 text-green-600",
};

const SecurityLogsPage = () => {
  const { user, securityLogs, loadSecurityLogs } = useAuth();
  const [loading, setLoading] = useState(true);

  useSeo({ title: "Security Logs", description: "View your account security activity" });

  useEffect(() => {
    loadSecurityLogs().finally(() => setLoading(false));
  }, [loadSecurityLogs]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return d.toLocaleDateString("en-NG", {
      day: "numeric", month: "short", year: "numeric",
    });
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link to="/household/profile" className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-[#145C25] mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Profile
        </Link>

        <Card className="border-0 shadow-brand-lg rounded-3xl">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-neutral-900">Security Logs</CardTitle>
            <p className="text-sm text-neutral-500">Recent activity on your account</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-16 bg-neutral-100 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : securityLogs.length === 0 ? (
              <div className="text-center py-8">
                <Shield className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                <p className="text-neutral-500 font-medium">No security events yet</p>
                <p className="text-sm text-neutral-400 mt-1">Activity will appear here as you use your account.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {securityLogs.map((log) => {
                  const Icon = EVENT_ICONS[log.event_type] || Shield;
                  const color = EVENT_COLORS[log.event_type] || "bg-neutral-100 text-neutral-600";
                  return (
                    <div
                      key={log.id}
                      className="flex items-center gap-4 p-3 rounded-2xl hover:bg-neutral-50 transition-colors"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-neutral-900 text-sm">
                          {EVENT_LABELS[log.event_type] || log.event_type}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-neutral-400 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {formatDate(log.created_at)}
                          {log.ip_address && (
                            <span>• {log.ip_address}</span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-neutral-300" />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SecurityLogsPage;
