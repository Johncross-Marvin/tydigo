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
import { LegacyRedirect } from "@/components/legacy-redirect";
import type { UserRole } from "@/lib/api";

// ─── Eagerly loaded (critical path) ──────────────────────────
import Index from "./pages/Index";
import LoginPage from "./pages/Login";
import NotFound from "./pages/NotFound";

// ─── Lazy-loaded pages (code-split by role) ──────────────────
const SignupPage = lazy(() => import("./pages/Signup"));
const RoleLandingPage = lazy(() => import("./pages/RoleLanding"));
const PublicPlaceholder = lazy(() =>
  import("./pages/PublicPlaceholder").then((m) => ({ default: m.PublicPlaceholder })),
);
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
const CollectorJobsPage = lazy(() => import("./pages/CollectorJobs"));

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

// Dedicated role dashboards
const EstateDashboardPage = lazy(() => import("./pages/EstateDashboard"));
const FleetDashboardPage = lazy(() => import("./pages/FleetDashboard"));
const OrganicDashboardPage = lazy(() => import("./pages/OrganicDashboard"));
const CorporateDashboardPage = lazy(() => import("./pages/CorporateDashboard"));

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
// CRITICAL: Government is NOT admin. Admin is admin only.
const HOUSEHOLD_ROLES: UserRole[] = ["customer", "household"];
const BUSINESS_ROLES: UserRole[] = ["business", "estate", "corporate_partner"];
const COLLECTOR_ROLES: UserRole[] = ["collector"];
const PARTNER_ROLES: UserRole[] = ["partner", "recycler", "organic_partner"];
const ADMIN_ROLES: UserRole[] = ["admin"];
const GOVERNMENT_ROLES: UserRole[] = ["government"];

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
                  <Route path="/signup/:role" element={<Suspense fallback={<LoadingFallback />}><RoleLandingPage /></Suspense>} />
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

                  {/* Public marketing / content routes */}
                  <Route path="/services/households" element={<Suspense fallback={<LoadingFallback />}><PublicPlaceholder title="Household pickup" description="On-demand waste collection for your home." contentKey="services/households" cta={{ label: "Get started", href: "/signup/household" }} /></Suspense>} />
                  <Route path="/services/estates" element={<Suspense fallback={<LoadingFallback />}><PublicPlaceholder title="Estate operations" description="Community-wide waste management for residential estates." contentKey="services/estates" cta={{ label: "Get started", href: "/signup/estate" }} /></Suspense>} />
                  <Route path="/services/businesses" element={<Suspense fallback={<LoadingFallback />}><PublicPlaceholder title="Business waste" description="Bulk and recurring waste management for businesses." contentKey="services/businesses" cta={{ label: "Get started", href: "/signup/business" }} /></Suspense>} />
                  <Route path="/services/recycling" element={<Suspense fallback={<LoadingFallback />}><PublicPlaceholder title="Recycling & recovery" description="Material recovery network for recyclers." contentKey="services/recycling" cta={{ label: "Partner as a recycler", href: "/signup/recycler" }} /></Suspense>} />
                  <Route path="/services/organic-recovery" element={<Suspense fallback={<LoadingFallback />}><PublicPlaceholder title="Organic recovery" description="Compost and BSF feedstock from organic waste." contentKey="services/organic-recovery" cta={{ label: "Become a partner", href: "/signup/organic_partner" }} /></Suspense>} />
                  <Route path="/earn" element={<Suspense fallback={<LoadingFallback />}><PublicPlaceholder title="Earn with Tydigo" description="Turn waste into income as a collector, recycler, organic partner, or fleet operator." contentKey="earn" cta={{ label: "Become a collector", href: "/signup/collector" }} /></Suspense>} />
                  <Route path="/earn/collector" element={<Suspense fallback={<LoadingFallback />}><PublicPlaceholder title="Become a Collector" description="Accept pickup jobs and grow your earnings." contentKey="earn/collector" cta={{ label: "Start application", href: "/signup/collector" }} /></Suspense>} />
                  <Route path="/earn/recycler" element={<Suspense fallback={<LoadingFallback />}><PublicPlaceholder title="Partner as a Recycler" description="Source recyclable materials and manage intake." contentKey="earn/recycler" cta={{ label: "Start application", href: "/signup/recycler" }} /></Suspense>} />
                  <Route path="/earn/organic-partner" element={<Suspense fallback={<LoadingFallback />}><PublicPlaceholder title="Organic Recovery Partner" description="Process organic waste for compost and BSF feedstock." contentKey="earn/organic-partner" cta={{ label: "Start application", href: "/signup/organic_partner" }} /></Suspense>} />
                  <Route path="/earn/fleet-operator" element={<Suspense fallback={<LoadingFallback />}><PublicPlaceholder title="Operate a Fleet" description="Manage vehicles, drivers, and dispatch operations." contentKey="earn/fleet-operator" cta={{ label: "Start application", href: "/signup/fleet_owner" }} /></Suspense>} />
                  <Route path="/company/about" element={<Suspense fallback={<LoadingFallback />}><PublicPlaceholder title="About Tydigo" description="Our mission to build cleaner Nigerian cities." contentKey="company/about" /></Suspense>} />
                  <Route path="/company/impact" element={<Suspense fallback={<LoadingFallback />}><PublicPlaceholder title="Impact" description="Environmental outcomes from waste collection and recovery." contentKey="company/impact" /></Suspense>} />
                  <Route path="/company/careers" element={<Suspense fallback={<LoadingFallback />}><PublicPlaceholder title="Careers" description="Join the Tydigo team." contentKey="company/careers" /></Suspense>} />
                  <Route path="/safety" element={<Suspense fallback={<LoadingFallback />}><PublicPlaceholder title="Safety Centre" description="Standards and guidance for safe waste handling." contentKey="safety" /></Suspense>} />
                  <Route path="/safety/collectors" element={<Suspense fallback={<LoadingFallback />}><PublicPlaceholder title="Collector Safety" description="On-the-job safety for collectors." contentKey="safety/collectors" /></Suspense>} />
                  <Route path="/safety/waste-handling" element={<Suspense fallback={<LoadingFallback />}><PublicPlaceholder title="Waste Handling" description="Safe sorting and disposal guidance." contentKey="safety/waste-handling" /></Suspense>} />
                  <Route path="/safety/report-incident" element={<Suspense fallback={<LoadingFallback />}><PublicPlaceholder title="Report an Incident" description="Tell us what happened so we can help." contentKey="safety/report-incident" /></Suspense>} />
                  <Route path="/support" element={<Suspense fallback={<LoadingFallback />}><PublicPlaceholder title="Help Centre" description="Find answers and get support." contentKey="support" cta={{ label: "Contact support", href: "/support" }} /></Suspense>} />
                  <Route path="/support/:audience" element={<Suspense fallback={<LoadingFallback />}><PublicPlaceholder title="Support" description="Account-specific help and guidance." contentKey="support" /></Suspense>} />
                  <Route path="/cities" element={<Suspense fallback={<LoadingFallback />}><PublicPlaceholder title="Cities" description="Where Tydigo operates and how to request your city." contentKey="cities" /></Suspense>} />
                  <Route path="/cities/:slug" element={<Suspense fallback={<LoadingFallback />}><PublicPlaceholder title="City" description="Service details for this city." contentKey="cities" /></Suspense>} />
                  <Route path="/legal/terms" element={<Suspense fallback={<LoadingFallback />}><PublicPlaceholder title="Terms of Service" description="The terms governing your use of Tydigo." contentKey="legal/terms" /></Suspense>} />
                  <Route path="/legal/privacy" element={<Suspense fallback={<LoadingFallback />}><PublicPlaceholder title="Privacy Policy" description="How Tydigo handles your data." contentKey="legal/privacy" /></Suspense>} />
                  <Route path="/legal/cookies" element={<Suspense fallback={<LoadingFallback />}><PublicPlaceholder title="Cookie Policy" description="How Tydigo uses cookies." contentKey="legal/cookies" /></Suspense>} />
                  <Route path="/legal/security" element={<Suspense fallback={<LoadingFallback />}><PublicPlaceholder title="Security" description="How Tydigo protects your account and data." contentKey="legal/security" /></Suspense>} />

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
                  <Route path="/collector/jobs" element={protectedPage(<Suspense fallback={<LoadingFallback />}><CollectorJobsPage /></Suspense>, COLLECTOR_ROLES)} />

                  {/* Business / Estate / Corporate */}
                  <Route path="/business/dashboard" element={protectedPage(<Suspense fallback={<LoadingFallback />}><BusinessDashboardPage /></Suspense>, BUSINESS_ROLES)} />
                  <Route path="/estate/dashboard" element={protectedPage(<Suspense fallback={<LoadingFallback />}><EstateDashboardPage /></Suspense>, ["estate"])} />
                  <Route path="/fleet/dashboard" element={protectedPage(<Suspense fallback={<LoadingFallback />}><FleetDashboardPage /></Suspense>, ["fleet_owner"])} />
                  <Route path="/organic/dashboard" element={protectedPage(<Suspense fallback={<LoadingFallback />}><OrganicDashboardPage /></Suspense>, ["organic_partner"])} />
                  <Route path="/corporate/dashboard" element={protectedPage(<Suspense fallback={<LoadingFallback />}><CorporateDashboardPage /></Suspense>, ["corporate_partner"])} />

                  {/* Partner / Recycler / Organic Partner */}
                  <Route path="/partner/dashboard" element={protectedPage(<Suspense fallback={<LoadingFallback />}><PartnerDashboardPage /></Suspense>, PARTNER_ROLES)} />
                  <Route path="/partner/request" element={protectedPage(<Suspense fallback={<LoadingFallback />}><PartnerRequestPage /></Suspense>, PARTNER_ROLES)} />
                  <Route path="/recycler/dashboard" element={protectedPage(<Suspense fallback={<LoadingFallback />}><RecyclerDashboardPage /></Suspense>, ["recycler"])} />

                  {/* Admin / Government */}
                  <Route path="/admin/dashboard" element={protectedPage(<Suspense fallback={<LoadingFallback />}><AdminDashboardPage /></Suspense>, ADMIN_ROLES)} />
                  <Route path="/admin/kyc" element={protectedPage(<Suspense fallback={<LoadingFallback />}><AdminKycPage /></Suspense>, ADMIN_ROLES)} />
                  <Route path="/admin/pricing" element={protectedPage(<Suspense fallback={<LoadingFallback />}><AdminPricingPage /></Suspense>, ADMIN_ROLES)} />
                  <Route path="/admin/ecopoints" element={protectedPage(<Suspense fallback={<LoadingFallback />}><AdminEcoPointsPage /></Suspense>, ADMIN_ROLES)} />
                  <Route path="/admin/batches" element={protectedPage(<Suspense fallback={<LoadingFallback />}><AdminBatchesPage /></Suspense>, ADMIN_ROLES)} />
                  <Route path="/admin/impact" element={protectedPage(<Suspense fallback={<LoadingFallback />}><AdminImpactPage /></Suspense>, ADMIN_ROLES)} />
                  <Route path="/admin/onboarding" element={protectedPage(<Suspense fallback={<LoadingFallback />}><AdminOnboardingPage /></Suspense>, ["admin"])} />
                  <Route path="/government/dashboard" element={protectedPage(<Suspense fallback={<LoadingFallback />}><GovernmentDashboardPage /></Suspense>, GOVERNMENT_ROLES)} />

                  {/* Legacy route redirects — backward compatibility */}
                  <Route path="/customer/dashboard" element={<LegacyRedirect to="/household/dashboard" />} />

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
