import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QuoteProvider } from "@/lib/QuoteContext";
import { AuthProvider } from "@/lib/AuthContext";
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
import DashboardPage from "@/pages/Dashboard";
import PrivacyPage from "@/pages/Privacy";
import TermsPage from "@/pages/Terms";
import ContactPage from "@/pages/Contact";
import AdminCRMPage from "@/pages/AdminCRM";
import BrokerCreditsPage from "@/pages/BrokerCredits";
import LoginPage from "@/pages/Login";
import AdPreviewPage from "@/pages/AdPreview";
import RentGuaranteePage from "@/pages/RentGuarantee";
import RepDashboardPage from "@/pages/RepDashboard";
import DocUploadPage from "@/pages/DocUpload";
import SignAgreementPage from "@/pages/SignAgreement";
import DocSignPage from "@/pages/DocSign";
import ServiceSignPage from "@/pages/ServiceSign";
import RgPaymentSuccessPage from "@/pages/RgPaymentSuccess";
import CustomerPortalPage from "@/pages/CustomerPortal";
import InvoiceSignPage from "@/pages/InvoiceSign";

// Placeholder pages for other routes to prevent 404s during dev
const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="container mx-auto py-20 px-4 text-center">
    <h1 className="text-4xl font-serif font-bold text-primary mb-4">{title} Insurance</h1>
    <p className="text-muted-foreground mb-8 text-lg">Our {title.toLowerCase()} quote engine is being updated for 2025 rates.</p>
    <div className="max-w-2xl mx-auto bg-secondary/30 p-8 rounded-xl border border-border">
      <p className="mb-4">This section would contain the specific form for {title} insurance.</p>
    </div>
  </div>
);

function Router() {
  return (
    <Switch>
      {/* Public standalone pages (no nav/footer) */}
      <Route path="/doc-upload/:token" component={DocUploadPage} />
      <Route path="/sign/:token" component={SignAgreementPage} />
      <Route path="/doc-sign/:token" component={DocSignPage} />
      <Route path="/service-sign/:token" component={ServiceSignPage} />
      <Route path="/rg-payment/success" component={RgPaymentSuccessPage} />
      <Route path="/customer-portal/success" component={CustomerPortalPage} />
      <Route path="/customer-portal" component={CustomerPortalPage} />
      <Route path="/invoice-sign/:token" component={InvoiceSignPage} />
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
            <Route path="/rep" component={() => <RepDashboardPage />} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <QuoteProvider>
            <Toaster />
            <Router />
          </QuoteProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
