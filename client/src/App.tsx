import { Suspense, lazy } from "react";
import { RouteErrorBoundary, RouteLoading } from "@/components/RouteStatus";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QuoteProvider } from "@/lib/QuoteContext";
import { AuthProvider } from "@/lib/AuthContext";
import AnalyticsEvents from "@/components/AnalyticsEvents";
import NotFound from "@/pages/not-found";
import Layout from "@/components/Layout";
import HomePage from "@/pages/Home";
import AutoPage from "@/pages/Auto";
import ComparePage from "@/pages/Compare";
import HomeInsurancePage from "@/pages/HomeInsurance";
import TenantPage from "@/pages/Tenant";
import TravelPage from "@/pages/Travel";
import LifePage from "@/pages/Life";
import BusinessPage from "@/pages/Business";
import PetPage from "@/pages/Pet";
import MortgagePage from "@/pages/Mortgage";
import AboutPage from "@/pages/About";
import PrivacyPage from "@/pages/Privacy";
import TermsPage from "@/pages/Terms";
import ContactPage from "@/pages/Contact";
import RentGuaranteePage from "@/pages/RentGuarantee";
import RentGuaranteeGuidePage from "@/pages/RentGuaranteeGuide";
import RentClockPage from "@/pages/RentClock";
import { SeoNavigation } from "@/hooks/use-seo";

// Account, payment, and token pages are loaded only on the client. They must
// not enter the public prerender bundle (or run browser-only module code on SSR).
const DashboardPage = lazy(() => import("@/pages/Dashboard"));
const AdminCRMPage = lazy(() => import("@/pages/AdminCRM"));
const BrokerCreditsPage = lazy(() => import("@/pages/BrokerCredits"));
const LoginPage = lazy(() => import("@/pages/Login"));
const AdPreviewPage = lazy(() => import("@/pages/AdPreview"));
const RepDashboardPage = lazy(() => import("@/pages/RepDashboard"));
const DocUploadPage = lazy(() => import("@/pages/DocUpload"));
const SignAgreementPage = lazy(() => import("@/pages/SignAgreement"));
const DocSignPage = lazy(() => import("@/pages/DocSign"));
const ServiceSignPage = lazy(() => import("@/pages/ServiceSign"));
const RgPaymentSuccessPage = lazy(() => import("@/pages/RgPaymentSuccess"));
const CustomerPortalPage = lazy(() => import("@/pages/CustomerPortal"));
const InvoiceSignPage = lazy(() => import("@/pages/InvoiceSign"));

function AppRoutes() {
  const [route] = useLocation();
  return (
    <RouteErrorBoundary key={route}>
    <Suspense fallback={<RouteLoading />}><Switch>
      {/* Public standalone pages (no nav/footer) */}
      <Route path="/doc-upload/:token" component={DocUploadPage} />
      <Route path="/sign/:token" component={SignAgreementPage} />
      <Route path="/doc-sign/:token" component={DocSignPage} />
      <Route path="/service-sign/:token" component={ServiceSignPage} />
      <Route path="/rg-payment/success" component={RgPaymentSuccessPage} />
      <Route path="/invoice-sign/:token" component={InvoiceSignPage} />
      <Route path="/rent-clock" component={RentClockPage} />
      {/* Main app with layout */}
      <Route>
        <Layout>
          <Switch>
            <Route path="/" component={HomePage} />
            <Route path="/auto" component={AutoPage} />
            <Route path="/home-insurance" component={HomeInsurancePage} />
            <Route path="/tenant" component={TenantPage} />
            <Route path="/travel" component={TravelPage} />
            <Route path="/life" component={LifePage} />
            <Route path="/business" component={BusinessPage} />
            <Route path="/pet" component={PetPage} />
            <Route path="/mortgage" component={MortgagePage} />
            <Route path="/compare" component={ComparePage} />
            <Route path="/about" component={AboutPage} />
            <Route path="/contact" component={ContactPage} />
            <Route path="/dashboard" component={DashboardPage} />
            <Route path="/privacy" component={PrivacyPage} />
            <Route path="/terms" component={TermsPage} />
            <Route path="/admin" component={AdminCRMPage} />
            <Route path="/broker/credits" component={BrokerCreditsPage} />
            <Route path="/login" component={LoginPage} />
            <Route path="/ad-preview/:token" component={AdPreviewPage} />
            <Route path="/rent-guarantee" component={RentGuaranteePage} />
            <Route path="/rent-guarantee-guide" component={RentGuaranteeGuidePage} />
            <Route path="/customer-portal/success" component={CustomerPortalPage} />
            <Route path="/customer-portal" component={CustomerPortalPage} />
            <Route path="/rep" component={() => <RepDashboardPage />} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch></Suspense>
    </RouteErrorBoundary>
  );
}

function App({ client = queryClient }: { client?: QueryClient }) {
  return (
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <AuthProvider>
          <QuoteProvider>
            <Toaster />
            <AnalyticsEvents />
            <SeoNavigation />
            <AppRoutes />
          </QuoteProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
