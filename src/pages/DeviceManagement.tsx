/**
 * Tydigo Device Management Page
 *
 * View and manage active device sessions.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Monitor, Smartphone, Tablet, Laptop, X, Shield, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth, type DeviceSession } from "@/components/auth-provider";
import { useSeo } from "@/lib/seo";

const DeviceManagementPage = () => {
  const { user, deviceSessions, loadDeviceSessions, terminateDeviceSession, terminateOtherDeviceSessions } = useAuth();
  const [loading, setLoading] = useState(true);
  const [terminating, setTerminating] = useState<string | null>(null);

  useSeo({ title: "Device Management", description: "Manage your active sessions" });

  useEffect(() => {
    loadDeviceSessions().finally(() => setLoading(false));
  }, [loadDeviceSessions]);

  const handleTerminate = async (sessionId: string) => {
    setTerminating(sessionId);
    await terminateDeviceSession(sessionId);
    setTerminating(null);
  };

  const handleTerminateAll = async () => {
    setLoading(true);
    await terminateOtherDeviceSessions();
    setLoading(false);
  };

  const getDeviceIcon = (device: string | null) => {
    if (!device) return <Monitor className="w-5 h-5" />;
    if (device.toLowerCase().includes("mobile")) return <Smartphone className="w-5 h-5" />;
    if (device.toLowerCase().includes("tablet")) return <Tablet className="w-5 h-5" />;
    return <Laptop className="w-5 h-5" />;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-NG", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
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
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold text-neutral-900">Device Sessions</CardTitle>
              {deviceSessions.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTerminateAll}
                  disabled={loading}
                  className="rounded-xl text-red-600 border-red-200 hover:bg-red-50"
                >
                  Sign out all others
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-neutral-100 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : deviceSessions.length === 0 ? (
              <div className="text-center py-8">
                <Shield className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                <p className="text-neutral-500 font-medium">No device sessions found</p>
                <p className="text-sm text-neutral-400 mt-1">Your current session will appear here.</p>
              </div>
            ) : (
              deviceSessions.map((session) => (
                <div
                  key={session.id}
                  className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                    session.is_current
                      ? "border-[#145C25] bg-green-50"
                      : "border-neutral-100 bg-white"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    session.is_current ? "bg-green-100 text-[#145C25]" : "bg-neutral-100 text-neutral-500"
                  }`}>
                    {getDeviceIcon(session.device_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-neutral-900 text-sm">
                        {session.browser || "Unknown"} on {session.os || "Unknown"}
                      </p>
                      {session.is_current && (
                        <span className="text-xs font-bold text-[#145C25] bg-green-100 px-2 py-0.5 rounded-full">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {session.device_name || "Desktop"} • {session.city || "Unknown location"}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-neutral-400 mt-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(session.last_seen_at)}
                    </div>
                  </div>
                  {!session.is_current && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleTerminate(session.id)}
                      disabled={terminating === session.id}
                      className="text-neutral-400 hover:text-red-600 rounded-xl"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DeviceManagementPage;
