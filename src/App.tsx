import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import type { ReactNode } from "react";
import { AuthProvider } from "@/components/auth-provider";
import { ProtectedRoute } from "@/components/protected-route";
import { InstallPromptBanner, OfflineBanner, UpdateAvailableBanner } from "@/components/pwa-banner";

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

const protectedPage = (page: ReactNode) => <ProtectedRoute>{page}</ProtectedRoute>;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <OfflineBanner />
          <UpdateAvailableBanner />
          <Routes>
            {/* Public */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/otp" element={<OtpPage />} />
            <Route path="/role-selection" element={protectedPage(<RoleSelectionPage />)} />

            {/* Household */}
            <Route path="/household/dashboard" element={protectedPage(<HouseholdDashboardPage />)} />
            <Route path="/household/request-pickup" element={protectedPage(<RequestPickupPage />)} />
            <Route path="/household/tracking" element={protectedPage(<TrackingPage />)} />
            <Route path="/household/ecopoints" element={protectedPage(<EcoPointsPage />)} />
            <Route path="/household/history" element={protectedPage(<HistoryPage />)} />
            <Route path="/household/payment" element={protectedPage(<PaymentPage />)} />
            <Route path="/household/completion" element={protectedPage(<CompletionPage />)} />
            <Route path="/household/challenges" element={protectedPage(<ChallengesPage />)} />
            <Route path="/household/redeem" element={protectedPage(<RedeemPage />)} />
            <Route path="/household/profile" element={protectedPage(<ProfilePage />)} />

            {/* Collector */}
            <Route path="/collector/dashboard" element={protectedPage(<CollectorDashboardPage />)} />

            {/* Business */}
            <Route path="/business/dashboard" element={protectedPage(<BusinessDashboardPage />)} />

            {/* Partner */}
            <Route path="/partner/dashboard" element={protectedPage(<PartnerDashboardPage />)} />
            <Route path="/partner/request" element={protectedPage(<PartnerRequestPage />)} />

            {/* Admin */}
            <Route path="/admin/dashboard" element={protectedPage(<AdminDashboardPage />)} />
            <Route path="/admin/kyc" element={protectedPage(<AdminKycPage />)} />
            <Route path="/admin/pricing" element={protectedPage(<AdminPricingPage />)} />
            <Route path="/admin/ecopoints" element={protectedPage(<AdminEcoPointsPage />)} />
            <Route path="/admin/batches" element={protectedPage(<AdminBatchesPage />)} />
            <Route path="/admin/impact" element={protectedPage(<AdminImpactPage />)} />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <InstallPromptBanner />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
