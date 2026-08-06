/**
 * Tydigo Privacy & Settings Page
 *
 * Notification preferences, privacy toggles, language, theme.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Bell, Shield, Globe, Moon, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/components/auth-provider";
import { getNotificationPreferences, updateNotificationPreferences } from "@/services/notification";
import { getPrivacySettings, updatePrivacySettings, type PrivacySettings } from "@/services/privacy";
import { logActivity } from "@/services/activity";

const PrivacySettingsPage = () => {
  const { user } = useAuth();
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>({});
  const [privacy, setPrivacy] = useState<PrivacySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getNotificationPreferences(user.id),
      getPrivacySettings(user.id),
    ]).then(([n, p]) => {
      setNotifPrefs(n as unknown as Record<string, boolean>);
      setPrivacy(p);
      setLoading(false);
    });
  }, [user]);

  const toggleNotif = async (key: string) => {
    if (!user) return;
    const newVal = !notifPrefs[key];
    setNotifPrefs((prev) => ({ ...prev, [key]: newVal }));
    await updateNotificationPreferences(user.id, { [key]: newVal });
    flashSaved();
  };

  const togglePrivacy = async (key: keyof PrivacySettings) => {
    if (!user || !privacy) return;
    const newVal = !privacy[key];
    setPrivacy({ ...privacy, [key]: newVal });
    await updatePrivacySettings(user.id, { [key]: newVal });
    flashSaved();
  };

  const flashSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-4 border-green-100 border-t-[#145C25] animate-spin" />
      </div>
    );
  }

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      className={`w-12 h-7 rounded-full transition-colors relative ${checked ? "bg-[#145C25]" : "bg-neutral-300"}`}
    >
      <div className={`w-5 h-5 rounded-full bg-white absolute top-1 transition-all ${checked ? "left-6" : "left-1"}`} />
    </button>
  );

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 sm:px-6 h-14 flex items-center gap-4">
        <Link to="/household/profile" className="p-1.5 -ml-1.5 rounded-lg hover:bg-neutral-100">
          <ArrowLeft className="w-5 h-5 text-neutral-600" />
        </Link>
        <h1 className="font-bold text-neutral-900 flex-1">Privacy & Settings</h1>
        {saved && <CheckCircle2 className="w-5 h-5 text-green-500" />}
      </header>

      <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-5">
        {/* Notifications */}
        <div>
          <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-2 px-1 flex items-center gap-2">
            <Bell className="w-4 h-4" /> Notifications
          </h3>
          <Card className="border-0 shadow-brand-lg rounded-2xl overflow-hidden">
            {[
              { key: "push_enabled", label: "Push Notifications", desc: "Instant alerts in the app" },
              { key: "email_enabled", label: "Email Notifications", desc: "Weekly summaries and updates" },
              { key: "sms_enabled", label: "SMS Notifications", desc: "Pickup reminders via text" },
              { key: "pickup_updates", label: "Pickup Updates", desc: "Status changes for your pickups" },
              { key: "payment_updates", label: "Payment Updates", desc: "Wallet and transaction alerts" },
              { key: "ecopoints_updates", label: "EcoPoints Updates", desc: "Points earned and rewards" },
              { key: "security_alerts", label: "Security Alerts", desc: "Login and account security" },
              { key: "marketing_enabled", label: "Promotions & Offers", desc: "Special deals and campaigns" },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between p-4 border-b border-neutral-100 last:border-0">
                <div>
                  <p className="font-semibold text-neutral-900 text-sm">{item.label}</p>
                  <p className="text-xs text-neutral-500">{item.desc}</p>
                </div>
                <Toggle checked={!!notifPrefs[item.key]} onChange={() => toggleNotif(item.key)} />
              </div>
            ))}
          </Card>
        </div>

        {/* Privacy */}
        <div>
          <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-2 px-1 flex items-center gap-2">
            <Shield className="w-4 h-4" /> Privacy
          </h3>
          <Card className="border-0 shadow-brand-lg rounded-2xl overflow-hidden">
            {privacy && [
              { key: "show_profile" as const, label: "Show Profile", desc: "Visible to other users" },
              { key: "show_phone" as const, label: "Show Phone Number", desc: "Display on your profile" },
              { key: "show_email" as const, label: "Show Email", desc: "Display on your profile" },
              { key: "share_location" as const, label: "Share Location", desc: "For pickup coordination" },
              { key: "allow_messages" as const, label: "Allow Messages", desc: "Receive messages from others" },
              { key: "allow_marketing" as const, label: "Marketing Communications", desc: "Promotional content" },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between p-4 border-b border-neutral-100 last:border-0">
                <div>
                  <p className="font-semibold text-neutral-900 text-sm">{item.label}</p>
                  <p className="text-xs text-neutral-500">{item.desc}</p>
                </div>
                <Toggle checked={!!privacy[item.key]} onChange={() => togglePrivacy(item.key)} />
              </div>
            ))}
          </Card>
        </div>
      </main>
    </div>
  );
};

export default PrivacySettingsPage;
