import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Recycle,
  LayoutDashboard,
  Users,
  FileCheck,
  DollarSign,
  FileText,
  LogOut,
  Bell,
  Menu,
  X,
  Home,
  BarChart3,
  Package,
  Megaphone,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import { PlatformKPIs } from "@/components/admin/PlatformKPIs";
import { UserManager } from "@/components/admin/UserManager";
import { KycReviewQueue } from "@/components/admin/KycReviewQueue";
import { PricingConfig } from "@/components/admin/PricingConfig";
import { AuditLogs } from "@/components/admin/AuditLogs";
import { useToast } from "@/components/ui/toast-provider";
import type { AdminUser, KycDocument, AuditLog } from "@/lib/api";
import type { PricingConfig as PricingConfigType } from "@/services/admin";

const AdminDashboardPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { success, error: toastError } = useToast();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [kpiPeriod, setKpiPeriod] = useState("month");
  const [userSearch, setUserSearch] = useState("");

  const { data: overviewData } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: api.adminOverview,
  });

  const { data: usersData, refetch: refetchUsers } = useQuery({
    queryKey: ["admin-users", userSearch],
    queryFn: () => api.adminListUsers(userSearch),
  });

  const { data: pricingData } = useQuery({
    queryKey: ["admin-pricing"],
    queryFn: api.adminGetPricing,
  });

  const { data: auditData } = useQuery({
    queryKey: ["admin-audit-logs"],
    queryFn: () => api.adminGetAuditLogs(50),
  });

  const kpis = overviewData?.kpis ?? {
    totalUsers: 0, activeCollectors: 0, wasteCollectedKg: 0,
    totalPickups: 0, revenueNgn: 0, ecopointsIssued: 0, pendingKyc: 0,
  };

  const pendingKycDocs: Array<KycDocument & { name?: string; role?: string }> =
    (overviewData?.pendingKyc ?? []).map((doc) => ({
      ...doc,
      document_url: "",
      status: "pending" as const,
    }));

  const users: AdminUser[] = usersData?.users ?? [];
  const pricingConfigs: PricingConfigType[] = (pricingData?.configs ?? []).map((c) => ({
    ...c,
    min_kg: (c as Record<string, unknown>).min_kg as number ?? 0,
    max_kg: (c as Record<string, unknown>).max_kg as number | null ?? null,
    updated_at: (c as Record<string, unknown>).updated_at as string ?? new Date().toISOString(),
  }));
  const auditLogs: AuditLog[] = auditData?.logs ?? [];

  const handleSearchUsers = (query: string) => {
    setUserSearch(query);
    setTimeout(() => refetchUsers(), 100);
  };

  const handleSuspendUser = async (userId: string, suspend: boolean) => {
    try {
      await api.adminSuspendUser(userId, suspend);
      success(suspend ? "User Suspended" : "User Activated", "The user status has been updated.");
      refetchUsers();
    } catch (err) {
      toastError("Action failed", err instanceof Error ? err.message : "Please try again.");
    }
  };

  const handleViewUserDetails = (userId: string) => {
    success("User Details", `Viewing details for user ${userId.slice(0, 8)}...`);
  };

  const handleApproveKyc = async (documentId: string) => {
    try {
      await api.adminReviewKyc(documentId, "approved");
      success("KYC Approved", "Document has been approved.");
    } catch (err) {
      toastError("Approval failed", err instanceof Error ? err.message : "Please try again.");
    }
  };

  const handleRejectKyc = async (documentId: string) => {
    try {
      await api.adminReviewKyc(documentId, "rejected", "Document does not meet requirements.");
      success("KYC Rejected", "Document has been rejected.");
    } catch (err) {
      toastError("Rejection failed", err instanceof Error ? err.message : "Please try again.");
    }
  };

  const handleViewKyc = (documentId: string) => {
    success("Viewing Document", `Opening document ${documentId.slice(0, 8)}...`);
  };

  const handleUpdatePricing = async (configId: string, updates: Record<string, unknown>) => {
    try {
      await api.adminUpdatePricing(configId, updates);
      success("Pricing Updated", "The pricing configuration has been updated.");
    } catch (err) {
      toastError("Update failed", err instanceof Error ? err.message : "Please try again.");
    }
  };

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", active: true },
    { icon: Users, label: "Users", active: false },
    { icon: FileCheck, label: "KYC Review", active: false },
    { icon: DollarSign, label: "Pricing", active: false },
    { icon: Package, label: "Batches", active: false },
    { icon: BarChart3, label: "Impact", active: false },
    { icon: FileText, label: "Audit Logs", active: false },
    { icon: Megaphone, label: "Broadcast", active: false },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#0A2F14] text-white fixed inset-y-0 left-0 z-30">
        <div className="p-5">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <Recycle className="w-5 h-5 text-amber-400" />
            </div>
            <span className="text-xl font-bold">
              Ty<span className="text-amber-400">digo</span>
            </span>
          </Link>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.label}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all w-full text-left ${
                item.active
                  ? "bg-[#145C25] text-white shadow-lg"
                  : "text-green-200 hover:bg-white/10 hover:text-white"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-green-700/50">
          <button
            onClick={() => void logout().then(() => navigate("/login"))}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-green-300 hover:bg-white/10 hover:text-white transition-all w-full"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile sidebar */}
      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-[#0A2F14] text-white p-5 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <span className="text-lg font-bold">Tydigo Admin</span>
              <button onClick={() => setMobileSidebarOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="space-y-1">
              {menuItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => setMobileSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium w-full text-left ${
                    item.active ? "bg-[#145C25] text-white" : "text-green-200 hover:bg-white/10"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 sm:px-6 h-14 flex items-center gap-4">
          <button className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-neutral-100" onClick={() => setMobileSidebarOpen(true)}>
            <Menu className="w-5 h-5 text-neutral-700" />
          </button>
          <h1 className="font-bold text-neutral-900">Admin Dashboard</h1>
          <div className="flex-1" />
          <Button variant="ghost" size="icon" className="rounded-xl">
            <Bell className="w-5 h-5 text-neutral-500" />
          </Button>
          <Avatar className="w-8 h-8 ring-2 ring-red-100">
            <AvatarFallback className="bg-red-100 text-red-600 font-bold text-sm">
              {user?.name?.charAt(0) ?? "A"}
            </AvatarFallback>
          </Avatar>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 space-y-6">
          <div>
            <h1 className="text-2xl font-extrabold text-neutral-900">
              Admin Panel
            </h1>
            <p className="text-neutral-500">Manage platform operations, users, and configurations.</p>
          </div>

          <PlatformKPIs
            kpis={kpis}
            period={kpiPeriod}
            onPeriodChange={setKpiPeriod}
          />

          <Tabs defaultValue="users">
            <TabsList className="rounded-xl bg-neutral-100 p-1 flex-wrap">
              <TabsTrigger value="users" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Users
              </TabsTrigger>
              <TabsTrigger value="kyc" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                KYC ({pendingKycDocs.length})
              </TabsTrigger>
              <TabsTrigger value="pricing" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Pricing
              </TabsTrigger>
              <TabsTrigger value="audit" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Audit Logs
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="mt-4">
              <UserManager
                users={users}
                onSearch={handleSearchUsers}
                onSuspend={handleSuspendUser}
                onViewDetails={handleViewUserDetails}
              />
            </TabsContent>

            <TabsContent value="kyc" className="mt-4">
              <KycReviewQueue
                documents={pendingKycDocs}
                onApprove={handleApproveKyc}
                onReject={handleRejectKyc}
                onView={handleViewKyc}
              />
            </TabsContent>

            <TabsContent value="pricing" className="mt-4">
              <PricingConfig
                configs={pricingConfigs}
                onUpdate={handleUpdatePricing}
              />
            </TabsContent>

            <TabsContent value="audit" className="mt-4">
              <AuditLogs logs={auditLogs} />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
