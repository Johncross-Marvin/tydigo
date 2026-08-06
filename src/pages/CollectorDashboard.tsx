import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Truck,
  Star,
  Bell,
  Menu,
  X,
  Recycle,
  LogOut,
  Home,
  ClipboardList,
  DollarSign,
  User,
} from "lucide-react";
import { api, formatNaira } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { AvailableJobsFeed } from "@/components/collector/AvailableJobsFeed";
import { ActiveJobWorkflow } from "@/components/collector/ActiveJobWorkflow";
import { EarningsSummary } from "@/components/collector/EarningsSummary";
import { useToast } from "@/components/ui/toast-provider";
import type { CollectorJob } from "@/lib/api";

const CollectorDashboardPage = () => {
  const { user, logout } = useAuth();
  const { success, error: toastError } = useToast();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("available");

  const { data: jobsData, isLoading: jobsLoading, refetch: refetchJobs } = useQuery({
    queryKey: ["collector-jobs"],
    queryFn: () => api.listAvailableJobs(),
  });

  const { data: myJobsData, refetch: refetchMyJobs } = useQuery({
    queryKey: ["my-jobs"],
    queryFn: () => api.getMyJobs(),
  });

  const availableJobs: CollectorJob[] = jobsData?.jobs ?? [];
  const myJobs: CollectorJob[] = myJobsData?.jobs ?? [];
  const activeJob = myJobs.find(
    (j) => !["completed", "cancelled"].includes(j.status),
  );
  const completedJobs = myJobs.filter((j) => j.status === "completed").length;

  const todayEarnings = myJobs
    .filter((j) => j.status === "completed")
    .reduce((sum, j) => sum + j.price_ngn, 0);
  const weekEarnings = todayEarnings; // Simplified — would be filtered by date range

  const handleAcceptJob = async (jobId: string) => {
    try {
      await api.acceptJob(jobId);
      success("Job Accepted", "You've been assigned to this pickup.");
      refetchJobs();
      refetchMyJobs();
      setActiveTab("active");
    } catch (err) {
      toastError("Failed to accept job", err instanceof Error ? err.message : "Please try again.");
    }
  };

  const handleNavigate = (job: CollectorJob) => {
    // Open maps or navigate to tracking
    window.open(`https://maps.google.com/?q=${encodeURIComponent(job.address)}`, "_blank");
  };

  const handleUpdateStatus = async (jobId: string, status: string) => {
    try {
      await api.updateJobProgress(jobId, status);
      success("Status Updated", `Job status changed to ${status.replace(/_/g, " ")}.`);
      refetchMyJobs();
    } catch (err) {
      toastError("Update failed", err instanceof Error ? err.message : "Please try again.");
    }
  };

  const menuItems = [
    { icon: Home, label: "Dashboard", active: true },
    { icon: ClipboardList, label: "My Jobs", active: false },
    { icon: DollarSign, label: "Earnings", active: false },
    { icon: User, label: "Profile", active: false },
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
            onClick={() => void logout()}
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
              <span className="text-lg font-bold">Tydigo</span>
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
          <h1 className="font-bold text-neutral-900">Collector Dashboard</h1>
          <div className="flex-1" />
          <Button variant="ghost" size="icon" className="rounded-xl">
            <Bell className="w-5 h-5 text-neutral-500" />
          </Button>
          <Avatar className="w-8 h-8 ring-2 ring-blue-100">
            <AvatarFallback className="bg-blue-100 text-blue-600 font-bold text-sm">
              {user?.name?.charAt(0) ?? "C"}
            </AvatarFallback>
          </Avatar>
        </header>

        <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-5">
          {/* Earnings Card */}
          <Card className="border-0 shadow-brand-lg rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 text-white">
            <CardContent className="p-6">
              <p className="text-blue-200 text-sm">Available Route Value</p>
              <p className="text-4xl font-black tracking-tight mt-1">
                {formatNaira(availableJobs.reduce((sum, j) => sum + j.price_ngn, 0))}
              </p>
              <div className="flex gap-4 mt-3 text-sm text-blue-200">
                <span>{availableJobs.length} open jobs</span>
                <span>{completedJobs} completed</span>
              </div>
            </CardContent>
          </Card>

          {/* Earnings Summary */}
          <EarningsSummary
            todayEarnings={todayEarnings}
            weekEarnings={weekEarnings}
            completedJobs={completedJobs}
            rating={user?.rating ?? 5}
          />

          {/* Tabs: Available Jobs / Active Job */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 rounded-xl bg-neutral-100 p-1">
              <TabsTrigger value="available" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Available Jobs ({availableJobs.length})
              </TabsTrigger>
              <TabsTrigger value="active" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Active Job {activeJob ? "✓" : ""}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="available" className="mt-4">
              <AvailableJobsFeed
                jobs={availableJobs}
                onAccept={handleAcceptJob}
                onNavigate={handleNavigate}
                loading={jobsLoading}
              />
            </TabsContent>

            <TabsContent value="active" className="mt-4">
              {activeJob ? (
                <ActiveJobWorkflow
                  job={activeJob}
                  onUpdateStatus={handleUpdateStatus}
                />
              ) : (
                <Card className="border-0 shadow-sm rounded-2xl">
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                      <Truck className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="font-bold text-neutral-800 mb-1">No Active Job</h3>
                    <p className="text-sm text-neutral-500 mb-4">
                      Accept a job from the Available Jobs tab to get started.
                    </p>
                    <Button
                      onClick={() => setActiveTab("available")}
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                    >
                      Browse Available Jobs
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
};

export default CollectorDashboardPage;
