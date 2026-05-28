import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Index from "./pages/Index";
import LoginPage from "./pages/Login";
import OtpPage from "./pages/OtpPage";
import RoleSelectionPage from "./pages/RoleSelection";

import HouseholdDashboardPage from "./pages/HouseholdDashboard";
import RequestPickupPage from "./pages/RequestPickup";
import TrackingPage from "./pages/TrackingPage";
import EcoPointsPage from "./pages/EcoPoints";
import HistoryPage from "./pages/HistoryPage";
import PaymentPage from "./pages/PaymentPage";
import CompletionPage from "./pages/CompletionPage";
import ChallengesPage from "./pages/ChallengesPage";
import RedeemPage from "./pages/RedeemPage";
import ProfilePage from "./pages/ProfilePage";

import CollectorDashboardPage from "./pages/CollectorDashboard";
import BusinessDashboardPage from "./pages/BusinessDashboard";
import PartnerDashboardPage from "./pages/PartnerDashboard";
import PartnerRequestPage from "./pages/PartnerRequest";
import AdminDashboardPage from "./pages/AdminDashboard";
import AdminKycPage from "./pages/AdminKyc";
import AdminPricingPage from "./pages/AdminPricing";
import AdminEcoPointsPage from "./pages/AdminEcoPoints";
import AdminBatchesPage from "./pages/AdminBatches";
import AdminImpactPage from "./pages/AdminImpact";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/otp" element={<OtpPage />} />
          <Route path="/role-selection" element={<RoleSelectionPage />} />

          {/* Household */}
          <Route path="/household/dashboard" element={<HouseholdDashboardPage />} />
          <Route path="/household/request-pickup" element={<RequestPickupPage />} />
          <Route path="/household/tracking" element={<TrackingPage />} />
          <Route path="/household/ecopoints" element={<EcoPointsPage />} />
          <Route path="/household/history" element={<HistoryPage />} />
          <Route path="/household/payment" element={<PaymentPage />} />
          <Route path="/household/completion" element={<CompletionPage />} />
          <Route path="/household/challenges" element={<ChallengesPage />} />
          <Route path="/household/redeem" element={<RedeemPage />} />
          <Route path="/household/profile" element={<ProfilePage />} />

          {/* Collector */}
          <Route path="/collector/dashboard" element={<CollectorDashboardPage />} />

          {/* Business */}
          <Route path="/business/dashboard" element={<BusinessDashboardPage />} />

          {/* Partner */}
          <Route path="/partner/dashboard" element={<PartnerDashboardPage />} />
          <Route path="/partner/request" element={<PartnerRequestPage />} />

          {/* Admin */}
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="/admin/kyc" element={<AdminKycPage />} />
          <Route path="/admin/pricing" element={<AdminPricingPage />} />
          <Route path="/admin/ecopoints" element={<AdminEcoPointsPage />} />
          <Route path="/admin/batches" element={<AdminBatchesPage />} />
          <Route path="/admin/impact" element={<AdminImpactPage />} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
