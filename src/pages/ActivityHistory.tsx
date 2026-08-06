/**
 * Tydigo Activity History Page
 *
 * Chronological log of all user actions: profile updates,
 * address changes, document uploads, wallet activity, etc.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Clock, User, MapPin, CreditCard, Shield,
  Award, FileText, PhoneCall, Settings,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/components/auth-provider";
import { getActivityLogs, type ActivityLog } from "@/services/activity";

const ICON_MAP: Record<string, typeof User> = {
  profile_update: User,
  avatar_update: User,
  avatar_delete: User,
  address_create: MapPin,
  address_update: MapPin,
  address_delete: MapPin,
  bank_add: CreditCard,
  bank_update: CreditCard,
  bank_delete: CreditCard,
  emergency_add: PhoneCall,
  emergency_update: PhoneCall,
  emergency_delete: PhoneCall,
  kyc_upload: Shield,
  kyc_approved: Shield,
  document_upload: FileText,
  settings_update: Settings,
  ecopoints_earned: Award,
};

const ActivityHistoryPage = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getActivityLogs(user.id, 100).then((data) => {
      setLogs(data);
      setLoading(false);
    });
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-4 border-green-100 border-t-[#145C25] animate-spin" />
      </div>
    );
  }

  const groupedByDate = logs.reduce<Record<string, ActivityLog[]>>((acc, log) => {
    const date = new Date(log.created_at).toLocaleDateString("en-NG", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 sm:px-6 h-14 flex items-center gap-4">
        <Link to="/household/profile" className="p-1.5 -ml-1.5 rounded-lg hover:bg-neutral-100">
          <ArrowLeft className="w-5 h-5 text-neutral-600" />
        </Link>
        <h1 className="font-bold text-neutral-900">Activity History</h1>
      </header>

      <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
        {logs.length === 0 ? (
          <div className="text-center py-16">
            <Clock className="w-16 h-16 text-neutral-200 mx-auto mb-4" />
            <p className="text-neutral-500 font-semibold">No activity yet</p>
            <p className="text-sm text-neutral-400 mt-1">Your actions will appear here.</p>
          </div>
        ) : (
          Object.entries(groupedByDate).map(([date, items]) => (
            <div key={date}>
              <h3 className="text-sm font-semibold text-neutral-500 mb-3 px-1">{date}</h3>
              <Card className="border-0 shadow-brand-lg rounded-2xl overflow-hidden">
                {items.map((log, i) => {
                  const Icon = ICON_MAP[log.activity_type] || Clock;
                  const time = new Date(log.created_at).toLocaleTimeString("en-NG", {
                    hour: "2-digit", minute: "2-digit",
                  });
                  return (
                    <div
                      key={log.id}
                      className={`flex items-center gap-3 p-4 ${i < items.length - 1 ? "border-b border-neutral-100" : ""}`}
                    >
                      <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-neutral-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-neutral-900">{log.description}</p>
                      </div>
                      <span className="text-xs text-neutral-400 flex-shrink-0">{time}</span>
                    </div>
                  );
                })}
              </Card>
            </div>
          ))
        )}
      </main>
    </div>
  );
};

export default ActivityHistoryPage;
