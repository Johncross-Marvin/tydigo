import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import type { ReactNode } from "react";
import { AuthProvider } from "@/components/auth-provider";
import { ProtectedRoute } from "@/components/protected-route";
import { InstallPromptBanner, OfflineBanner, UpdateAvailableBanner } from "@/components/pwa-banner";
import type { UserRole } from "@/lib/api";

import Index from "./pages/Index";
import LoginPage from "./pages/Login";
import SignupPage from "./pages/Signup";
import OtpPage from "./pages/OtpPage";
import RoleSelectionPage from "./pages/RoleSelection";
import ForgotPasswordPage from "./pages/ForgotPassword";
import ResetPasswordPage from "./pages/ResetPassword";

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
import StatusPage from "./pages/StatusPage";

const queryClient = new QueryClient();

const protectedPage = (page: ReactNode, roles?: UserRole[]) => (
  <ProtectedRoute allowedRoles={roles}>{page}</ProtectedRoute>
);

// Role groups for access control
const HOUSEHOLD_ROLES: UserRole[] = ["customer", "household"];
const BUSINESS_ROLES: UserRole[] = ["business", "estate", "corporate"];
const COLLECTOR_ROLES: UserRole[] = ["collector", "fleet"];
const PARTNER_ROLES: UserRole[] = ["partner", "recycler", "organic_partner"];
const ADMIN_ROLES: UserRole[] = ["admin", "government"];

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
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/otp" element={<OtpPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/role-selection" element={protectedPage(<RoleSelectionPage />)} />
            <Route path="/status" element={<StatusPage />} />

            {/* Household / Customer */}
            <Route path="/household/dashboard" element={protectedPage(<HouseholdDashboardPage />, HOUSEHOLD_ROLES)} />
            <Route path="/household/request-pickup" element={protectedPage(<RequestPickupPage />, HOUSEHOLD_ROLES)} />
            <Route path="/household/tracking" element={protectedPage(<TrackingPage />, HOUSEHOLD_ROLES)} />
            <Route path="/household/ecopoints" element={protectedPage(<EcoPointsPage />, HOUSEHOLD_ROLES)} />
            <Route path="/household/history" element={protectedPage(<HistoryPage />, HOUSEHOLD_ROLES)} />
            <Route path="/household/payment" element={protectedPage(<PaymentPage />, HOUSEHOLD_ROLES)} />
            <Route path="/household/completion" element={protectedPage(<CompletionPage />, HOUSEHOLD_ROLES)} />
            <Route path="/household/challenges" element={protectedPage(<ChallengesPage />, HOUSEHOLD_ROLES)} />
            <Route path="/household/redeem" element={protectedPage(<RedeemPage />, HOUSEHOLD_ROLES)} />
            <Route path="/household/profile" element={protectedPage(<ProfilePage />)} />

            {/* Collector / Fleet */}
            <Route path="/collector/dashboard" element={protectedPage(<CollectorDashboardPage />, COLLECTOR_ROLES)} />

            {/* Business / Estate / Corporate */}
            <Route path="/business/dashboard" element={protectedPage(<BusinessDashboardPage />, BUSINESS_ROLES)} />

            {/* Partner / Recycler / Organic Partner */}
            <Route path="/partner/dashboard" element={protectedPage(<PartnerDashboardPage />, PARTNER_ROLES)} />
            <Route path="/partner/request" element={protectedPage(<PartnerRequestPage />, PARTNER_ROLES)} />

            {/* Admin / Government */}
            <Route path="/admin/dashboard" element={protectedPage(<AdminDashboardPage />, ADMIN_ROLES)} />
            <Route path="/admin/kyc" element={protectedPage(<AdminKycPage />, ADMIN_ROLES)} />
            <Route path="/admin/pricing" element={protectedPage(<AdminPricingPage />, ADMIN_ROLES)} />
            <Route path="/admin/ecopoints" element={protectedPage(<AdminEcoPointsPage />, ADMIN_ROLES)} />
            <Route path="/admin/batches" element={protectedPage(<AdminBatchesPage />, ADMIN_ROLES)} />
            <Route path="/admin/impact" element={protectedPage(<AdminImpactPage />, ADMIN_ROLES)} />

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
