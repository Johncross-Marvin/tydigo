import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense, type ReactNode } from "react";
import { AuthProvider } from "@/components/auth-provider";
import { ProtectedRoute } from "@/components/protected-route";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { ToastProvider } from "@/components/ui/toast-provider";
import { InstallPromptBanner, OfflineBanner, UpdateAvailableBanner } from "@/components/pwa-banner";
import type { UserRole } from "@/lib/api";

// ─── Eagerly loaded (critical path) ──────────────────────────
import Index from "./pages/Index";
import LoginPage from "./pages/Login";
import NotFound from "./pages/NotFound";

// ─── Lazy-loaded pages (code-split by role) ──────────────────
const SignupPage = lazy(() => import("./pages/Signup"));
const OtpPage = lazy(() => import("./pages/OtpPage"));
const RoleSelectionPage = lazy(() => import("./pages/RoleSelection"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPassword"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPassword"));
const StatusPage = lazy(() => import("./pages/StatusPage"));
const CheckEmailPage = lazy(() => import("./pages/CheckEmail"));
const AuthCallbackPage = lazy(() => import("./pages/AuthCallback"));

// Household
const HouseholdDashboardPage = lazy(() => import("./pages/HouseholdDashboard"));
const RequestPickupPage = lazy(() => import("./pages/RequestPickup"));
const TrackingPage = lazy(() => import("./pages/TrackingPage"));
const EcoPointsPage = lazy(() => import("./pages/EcoPoints"));
const HistoryPage = lazy(() => import("./pages/HistoryPage"));
const PaymentPage = lazy(() => import("./pages/PaymentPage"));
const CompletionPage = lazy(() => import("./pages/CompletionPage"));
const ChallengesPage = lazy(() => import("./pages/ChallengesPage"));
const RedeemPage = lazy(() => import("./pages/RedeemPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const ProfileDashboardPage = lazy(() => import("./pages/ProfileDashboard"));
const EditProfilePage = lazy(() => import("./pages/EditProfile"));
const AddressManagementPage = lazy(() => import("./pages/AddressManagement"));
const BankAccountsPage = lazy(() => import("./pages/BankAccounts"));
const EmergencyContactsPage = lazy(() => import("./pages/EmergencyContacts"));
const PrivacySettingsPage = lazy(() => import("./pages/PrivacySettings"));
const ActivityHistoryPage = lazy(() => import("./pages/ActivityHistory"));
const DeviceManagementPage = lazy(() => import("./pages/DeviceManagement"));
const SecurityLogsPage = lazy(() => import("./pages/SecurityLogs"));
const ChangePhonePage = lazy(() => import("./pages/ChangePhone"));
const ChangeEmailPage = lazy(() => import("./pages/ChangeEmail"));
const RecoverUsernamePage = lazy(() => import("./pages/RecoverUsername"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));
const HelpCenterPage = lazy(() => import("./pages/HelpCenter"));
const AdminOnboardingPage = lazy(() => import("./pages/AdminOnboarding"));

// Collector
const CollectorDashboardPage = lazy(() => import("./pages/CollectorDashboard"));

// Business
const BusinessDashboardPage = lazy(() => import("./pages/BusinessDashboard"));

// Partner
const PartnerDashboardPage = lazy(() => import("./pages/PartnerDashboard"));
const PartnerRequestPage = lazy(() => import("./pages/PartnerRequest"));
const RecyclerDashboardPage = lazy(() => import("./pages/RecyclerDashboard"));

// Admin
const AdminDashboardPage = lazy(() => import("./pages/AdminDashboard"));
const AdminKycPage = lazy(() => import("./pages/AdminKyc"));
const AdminPricingPage = lazy(() => import("./pages/AdminPricing"));
const AdminEcoPointsPage = lazy(() => import("./pages/AdminEcoPoints"));
const AdminBatchesPage = lazy(() => import("./pages/AdminBatches"));
const AdminImpactPage = lazy(() => import("./pages/AdminImpact"));

// Government
const GovernmentDashboardPage = lazy(() => import("./pages/GovernmentDashboard"));

// ─── Setup ────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const protectedPage = (page: ReactNode, roles?: UserRole[]) => (
  <ProtectedRoute allowedRoles={roles}>{page}</ProtectedRoute>
);

// Role groups for access control
const HOUSEHOLD_ROLES: UserRole[] = ["customer", "household"];
const BUSINESS_ROLES: UserRole[] = ["business", "estate", "corporate_partner"];
const COLLECTOR_ROLES: UserRole[] = ["collector", "fleet_owner"];
const PARTNER_ROLES: UserRole[] = ["partner", "recycler", "organic_partner"];
const ADMIN_ROLES: UserRole[] = ["admin", "government"];

const LoadingFallback = () => (
  <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div className="h-10 w-10 rounded-full border-4 border-green-100 border-t-[#145C25] animate-spin" />
      <p className="text-sm text-neutral-500">Loading...</p>
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <ToastProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <OfflineBanner />
            <UpdateAvailableBanner />
            <ErrorBoundary>
              <Suspense fallback={<LoadingFallback />}>
                <Routes>
                  {/* Public — eagerly loaded */}
                  <Route path="/" element={<Index />} />
                  <Route path="/login" element={<LoginPage />} />

                  {/* Public — lazy loaded */}
                  <Route path="/signup" element={<Suspense fallback={<LoadingFallback />}><SignupPage /></Suspense>} />
                  <Route path="/otp" element={<Suspense fallback={<LoadingFallback />}><OtpPage /></Suspense>} />
                  <Route path="/forgot-password" element={<Suspense fallback={<LoadingFallback />}><ForgotPasswordPage /></Suspense>} />
                  <Route path="/reset-password" element={<Suspense fallback={<LoadingFallback />}><ResetPasswordPage /></Suspense>} />
                  <Route path="/recover-username" element={<Suspense fallback={<LoadingFallback />}><RecoverUsernamePage /></Suspense>} />
                  <Route path="/role-selection" element={protectedPage(<Suspense fallback={<LoadingFallback />}><RoleSelectionPage /></Suspense>)} />
                  <Route path="/onboarding" element={protectedPage(<Suspense fallback={<LoadingFallback />}><OnboardingPage /></Suspense>)} />
                  <Route path="/help" element={<Suspense fallback={<LoadingFallback />}><HelpCenterPage /></Suspense>} />
                  <Route path="/status" element={<Suspense fallback={<LoadingFallback />}><StatusPage /></Suspense>} />
                  <Route path="/check-email" element={<Suspense fallback={<LoadingFallback />}><CheckEmailPage /></Suspense>} />
                  <Route path="/auth/callback" element={<Suspense fallback={<LoadingFallback />}><AuthCallbackPage /></Suspense>} />

                  {/* Household / Customer */}
                  <Route path="/household/dashboard" element={protectedPage(<Suspense fallback={<LoadingFallback />}><HouseholdDashboardPage /></Suspense>, HOUSEHOLD_ROLES)} />
                  <Route path="/household/request-pickup" element={protectedPage(<Suspense fallback={<LoadingFallback />}><RequestPickupPage /></Suspense>, HOUSEHOLD_ROLES)} />
                  <Route path="/household/tracking" element={protectedPage(<Suspense fallback={<LoadingFallback />}><TrackingPage /></Suspense>, HOUSEHOLD_ROLES)} />
                  <Route path="/household/ecopoints" element={protectedPage(<Suspense fallback={<LoadingFallback />}><EcoPointsPage /></Suspense>, HOUSEHOLD_ROLES)} />
                  <Route path="/household/history" element={protectedPage(<Suspense fallback={<LoadingFallback />}><HistoryPage /></Suspense>, HOUSEHOLD_ROLES)} />
                  <Route path="/household/payment" element={protectedPage(<Suspense fallback={<LoadingFallback />}><PaymentPage /></Suspense>, HOUSEHOLD_ROLES)} />
                  <Route path="/household/completion" element={protectedPage(<Suspense fallback={<LoadingFallback />}><CompletionPage /></Suspense>, HOUSEHOLD_ROLES)} />
                  <Route path="/household/challenges" element={protectedPage(<Suspense fallback={<LoadingFallback />}><ChallengesPage /></Suspense>, HOUSEHOLD_ROLES)} />
                  <Route path="/household/redeem" element={protectedPage(<Suspense fallback={<LoadingFallback />}><RedeemPage /></Suspense>, HOUSEHOLD_ROLES)} />
                  <Route path="/household/profile" element={protectedPage(<Suspense fallback={<LoadingFallback />}><ProfileDashboardPage /></Suspense>)} />
                  <Route path="/household/profile/edit" element={protectedPage(<Suspense fallback={<LoadingFallback />}><EditProfilePage /></Suspense>)} />
                  <Route path="/household/profile/addresses" element={protectedPage(<Suspense fallback={<LoadingFallback />}><AddressManagementPage /></Suspense>)} />
                  <Route path="/household/profile/bank" element={protectedPage(<Suspense fallback={<LoadingFallback />}><BankAccountsPage /></Suspense>)} />
                  <Route path="/household/profile/emergency" element={protectedPage(<Suspense fallback={<LoadingFallback />}><EmergencyContactsPage /></Suspense>)} />
                  <Route path="/household/profile/settings" element={protectedPage(<Suspense fallback={<LoadingFallback />}><PrivacySettingsPage /></Suspense>)} />
                  <Route path="/household/profile/activity" element={protectedPage(<Suspense fallback={<LoadingFallback />}><ActivityHistoryPage /></Suspense>)} />
                  <Route path="/household/devices" element={protectedPage(<Suspense fallback={<LoadingFallback />}><DeviceManagementPage /></Suspense>)} />
                  <Route path="/household/security" element={protectedPage(<Suspense fallback={<LoadingFallback />}><SecurityLogsPage /></Suspense>)} />
                  <Route path="/household/change-phone" element={protectedPage(<Suspense fallback={<LoadingFallback />}><ChangePhonePage /></Suspense>)} />
                  <Route path="/household/change-email" element={protectedPage(<Suspense fallback={<LoadingFallback />}><ChangeEmailPage /></Suspense>)} />

                  {/* Collector / Fleet */}
                  <Route path="/collector/dashboard" element={protectedPage(<Suspense fallback={<LoadingFallback />}><CollectorDashboardPage /></Suspense>, COLLECTOR_ROLES)} />

                  {/* Business / Estate / Corporate */}
                  <Route path="/business/dashboard" element={protectedPage(<Suspense fallback={<LoadingFallback />}><BusinessDashboardPage /></Suspense>, BUSINESS_ROLES)} />

                  {/* Partner / Recycler / Organic Partner */}
                  <Route path="/partner/dashboard" element={protectedPage(<Suspense fallback={<LoadingFallback />}><PartnerDashboardPage /></Suspense>, PARTNER_ROLES)} />
                  <Route path="/partner/request" element={protectedPage(<Suspense fallback={<LoadingFallback />}><PartnerRequestPage /></Suspense>, PARTNER_ROLES)} />
                  <Route path="/recycler/dashboard" element={protectedPage(<Suspense fallback={<LoadingFallback />}><RecyclerDashboardPage /></Suspense>, PARTNER_ROLES)} />

                  {/* Admin / Government */}
                  <Route path="/admin/dashboard" element={protectedPage(<Suspense fallback={<LoadingFallback />}><AdminDashboardPage /></Suspense>, ADMIN_ROLES)} />
                  <Route path="/admin/kyc" element={protectedPage(<Suspense fallback={<LoadingFallback />}><AdminKycPage /></Suspense>, ADMIN_ROLES)} />
                  <Route path="/admin/pricing" element={protectedPage(<Suspense fallback={<LoadingFallback />}><AdminPricingPage /></Suspense>, ADMIN_ROLES)} />
                  <Route path="/admin/ecopoints" element={protectedPage(<Suspense fallback={<LoadingFallback />}><AdminEcoPointsPage /></Suspense>, ADMIN_ROLES)} />
                  <Route path="/admin/batches" element={protectedPage(<Suspense fallback={<LoadingFallback />}><AdminBatchesPage /></Suspense>, ADMIN_ROLES)} />
                  <Route path="/admin/impact" element={protectedPage(<Suspense fallback={<LoadingFallback />}><AdminImpactPage /></Suspense>, ADMIN_ROLES)} />
                  <Route path="/admin/onboarding" element={protectedPage(<Suspense fallback={<LoadingFallback />}><AdminOnboardingPage /></Suspense>, ["admin"])} />
                  <Route path="/government/dashboard" element={protectedPage(<Suspense fallback={<LoadingFallback />}><GovernmentDashboardPage /></Suspense>, ["government"])} />

                  {/* 404 */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
            <InstallPromptBanner />
          </BrowserRouter>
        </ToastProvider>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
