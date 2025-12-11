import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Layout from "@/components/Layout";
import HomePage from "@/pages/Home";
import AutoPage from "@/pages/Auto";
import ComparePage from "@/pages/Compare";

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
    <Layout>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/auto" component={AutoPage} />
        <Route path="/home-insurance">
           <PlaceholderPage title="Home" />
        </Route>
        <Route path="/tenant">
           <PlaceholderPage title="Tenant" />
        </Route>
        <Route path="/travel">
           <PlaceholderPage title="Travel" />
        </Route>
        <Route path="/life">
           <PlaceholderPage title="Life" />
        </Route>
        <Route path="/business">
           <PlaceholderPage title="Business" />
        </Route>
        <Route path="/pet">
           <PlaceholderPage title="Pet" />
        </Route>
        <Route path="/compare" component={ComparePage} />
        <Route path="/profile">
           <PlaceholderPage title="My Profile" />
        </Route>
        <Route path="/dashboard">
           <PlaceholderPage title="Broker Dashboard" />
        </Route>
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
