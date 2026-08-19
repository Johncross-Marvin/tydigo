import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LayoutDashboard,
  MapPin,
  Shield,
  Globe,
  FileText,
  LogOut,
  Bell,
  Menu,
  X,
  Home,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { BrandMark } from "@/components/BrandMark";
import { useSeo, seoConfig } from "@/lib/seo";
import { RegionalAnalytics } from "@/components/government/RegionalAnalytics";
import { ComplianceMonitor } from "@/components/government/ComplianceMonitor";
import { EnvironmentalImpact } from "@/components/government/EnvironmentalImpact";
import { PublicReports } from "@/components/government/PublicReports";
import { useToast } from "@/components/ui/toast-provider";
import {
  getRegionalAnalytics,
  getComplianceData,
  getEnvironmentalImpact,
  generatePublicReport,
} from "@/services/government";

const GovernmentDashboardPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { success, error: toastError } = useToast();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  useSeo(seoConfig.governmentDashboard);

  const { data: regions = [] } = useQuery({
    queryKey: ["regional-analytics"],
    queryFn: getRegionalAnalytics,
  });

  const { data: compliance } = useQuery({
    queryKey: ["compliance-data"],
    queryFn: getComplianceData,
  });

  const { data: impact } = useQuery({
    queryKey: ["environmental-impact"],
    queryFn: getEnvironmentalImpact,
  });

  const complianceData = compliance ?? {
    registeredCollectors: 0,
    licensedOperators: 0,
    complianceRate: 0,
  };
  const impactData = impact ?? {
    totalWasteDivertedKg: 0,
    recyclingRate: 0,
    carbonOffsetKg: 0,
    landfillSavedKg: 0,
  };

  const handleGenerateReport = async (period: string) => {
    try {
      await generatePublicReport(period);
      success("Report Generated", `The ${period} report is being generated.`);
    } catch (err) {
      toastError("Generation failed", err instanceof Error ? err.message : "Please try again.");
    }
  };

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", active: true },
    { icon: MapPin, label: "Regional", active: false },
    { icon: Shield, label: "Compliance", active: false },
    { icon: Globe, label: "Environment", active: false },
    { icon: FileText, label: "Reports", active: false },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#0A2F14] text-white fixed inset-y-0 left-0 z-30">
        <div className="p-5">
          <Link to="/" className="flex items-center gap-2.5">
            <BrandMark size={36} className="bg-white/15" />
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
              <span className="text-lg font-bold">Tydigo Gov</span>
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
          <h1 className="font-bold text-neutral-900">Government Dashboard</h1>
          <div className="flex-1" />
          <Button variant="ghost" size="icon" className="rounded-xl">
            <Bell className="w-5 h-5 text-neutral-500" />
          </Button>
          <Avatar className="w-8 h-8 ring-2 ring-blue-100">
            <AvatarFallback className="bg-blue-100 text-blue-600 font-bold text-sm">
              {user?.name?.charAt(0) ?? "G"}
            </AvatarFallback>
          </Avatar>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
          <div>
            <h1 className="text-2xl font-extrabold text-neutral-900">
              Government Oversight
            </h1>
            <p className="text-neutral-500">Monitor waste management compliance and environmental impact.</p>
          </div>

          <Tabs defaultValue="regional">
            <TabsList className="rounded-xl bg-neutral-100 p-1">
              <TabsTrigger value="regional" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Regional
              </TabsTrigger>
              <TabsTrigger value="compliance" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Compliance
              </TabsTrigger>
              <TabsTrigger value="environment" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Environment
              </TabsTrigger>
              <TabsTrigger value="reports" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Reports
              </TabsTrigger>
            </TabsList>

            <TabsContent value="regional" className="mt-4">
              <RegionalAnalytics regions={regions} />
            </TabsContent>

            <TabsContent value="compliance" className="mt-4">
              <ComplianceMonitor
                registeredCollectors={complianceData.registeredCollectors}
                licensedOperators={complianceData.licensedOperators}
                complianceRate={complianceData.complianceRate}
              />
            </TabsContent>

            <TabsContent value="environment" className="mt-4">
              <EnvironmentalImpact
                totalWasteDivertedKg={impactData.totalWasteDivertedKg}
                recyclingRate={impactData.recyclingRate}
                carbonOffsetKg={impactData.carbonOffsetKg}
                landfillSavedKg={impactData.landfillSavedKg}
              />
            </TabsContent>

            <TabsContent value="reports" className="mt-4">
              <PublicReports onGenerate={handleGenerateReport} />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
};

export default GovernmentDashboardPage;
