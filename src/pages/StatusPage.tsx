import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";

/**
 * Tydigo Status Page
 *
 * Public health/status endpoint showing:
 * - App identity
 * - Build environment
 * - PWA readiness
 * - Supabase config presence
 * - Deployment info
 *
 * Accessible at /status — no auth required.
 */

type StatusItem = {
  label: string;
  status: "ok" | "warn" | "off" | "info";
  detail: string;
};

function getStatusItems(): StatusItem[] {
  const isProduction = import.meta.env.PROD;
  const appEnv = import.meta.env.VITE_APP_ENV || (isProduction ? "production" : "development");
  const hasSupabaseUrl = Boolean(import.meta.env.VITE_SUPABASE_URL);
  const hasSupabaseAnonKey = Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY);
  const pwaEnabled = import.meta.env.VITE_ENABLE_PWA !== "false";
  const pushEnabled = import.meta.env.VITE_ENABLE_PUSH_NOTIFICATIONS !== "false";
  const mockAuth = import.meta.env.VITE_ENABLE_MOCK_AUTH !== "false";
  const hasMapKey = Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);

  return [
    {
      label: "App Name",
      status: "ok",
      detail: "Tydigo",
    },
    {
      label: "Environment",
      status: isProduction ? "ok" : "warn",
      detail: appEnv,
    },
    {
      label: "Build Mode",
      status: "info",
      detail: isProduction ? "Production" : "Development",
    },
    {
      label: "Supabase URL",
      status: hasSupabaseUrl ? "ok" : "off",
      detail: hasSupabaseUrl ? "Configured" : "Not configured",
    },
    {
      label: "Supabase Anon Key",
      status: hasSupabaseAnonKey ? "ok" : "off",
      detail: hasSupabaseAnonKey ? "Configured" : "Not configured",
    },
    {
      label: "PWA Enabled",
      status: pwaEnabled ? "ok" : "off",
      detail: pwaEnabled ? "Yes" : "No",
    },
    {
      label: "Push Notifications",
      status: pushEnabled ? "ok" : "warn",
      detail: pushEnabled ? "Enabled (needs VAPID keys)" : "Disabled",
    },
    {
      label: "Mock Auth",
      status: mockAuth ? "warn" : "ok",
      detail: mockAuth ? "Enabled (development fallback)" : "Live auth",
    },
    {
      label: "Maps API Key",
      status: hasMapKey ? "ok" : "warn",
      detail: hasMapKey ? "Configured" : "Using placeholder",
    },
    {
      label: "API Base URL",
      status: import.meta.env.VITE_API_BASE_URL ? "ok" : "warn",
      detail: (import.meta.env.VITE_API_BASE_URL as string) || "Not set (using relative path)",
    },
    {
      label: "Service Worker",
      status: "info",
      detail: "Check DevTools → Application → Service Workers",
    },
    {
      label: "Deployment",
      status: "ok",
      detail: "Vercel (Vite SPA)",
    },
  ];
}

function StatusIcon({ status }: { status: StatusItem["status"] }) {
  switch (status) {
    case "ok":
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case "warn":
      return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    case "off":
      return <XCircle className="h-5 w-5 text-gray-400" />;
    case "info":
      return <Info className="h-5 w-5 text-blue-500" />;
  }
}

function StatusBadge({ status }: { status: StatusItem["status"] }) {
  switch (status) {
    case "ok":
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">OK</Badge>;
    case "warn":
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">WARN</Badge>;
    case "off":
      return <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-100">OFF</Badge>;
    case "info":
      return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">INFO</Badge>;
  }
}

export default function StatusPage() {
  const items = getStatusItems();
  const okCount = items.filter((i) => i.status === "ok").length;
  const warnCount = items.filter((i) => i.status === "warn").length;
  const offCount = items.filter((i) => i.status === "off").length;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-brand">
        <CardHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-brand-700">Tydigo Status</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                System health and configuration overview
              </p>
            </div>
            <div className="flex gap-2">
              {okCount > 0 && (
                <Badge className="bg-green-100 text-green-700">{okCount} OK</Badge>
              )}
              {warnCount > 0 && (
                <Badge className="bg-amber-100 text-amber-700">{warnCount} WARN</Badge>
              )}
              {offCount > 0 && (
                <Badge className="bg-gray-100 text-gray-600">{offCount} OFF</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-1">
            {items.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <StatusIcon status={item.status} />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{item.detail}</span>
                  <StatusBadge status={item.status} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t text-center">
            <p className="text-xs text-muted-foreground">
              Tydigo v{import.meta.env.VITE_APP_VERSION || "1.0.0"} —{" "}
              {import.meta.env.PROD ? "Production" : "Development"} build
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Tap. Sort. Picked. — Cleaner homes. Smarter cities.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
