import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { redirectToStripeCheckout } from "@/lib/stripeRedirect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, LogIn, UserPlus, LogOut, FileText, DollarSign, ChevronRight, AlertCircle, CheckCircle2, Clock, Shield, Home, Car, Briefcase, User } from "lucide-react";
import { motion } from "framer-motion";

const API = (path: string, opts?: RequestInit) => {
  const token = localStorage.getItem("customer_token");
  return fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...opts,
  });
};

const INSURANCE_ICONS: Record<string, any> = {
  auto: Car,
  home: Home,
  tenant: Home,
  business: Briefcase,
  life: Shield,
  default: FileText,
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  assigned: "bg-purple-100 text-purple-800",
  contacted: "bg-yellow-100 text-yellow-800",
  quoted: "bg-orange-100 text-orange-800",
  closed: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-800",
};

function formatCurrency(amount: string | number) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(Number(amount));
}

function formatDate(dt: string) {
  return new Date(dt).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

// ── Success Page ─────────────────────────────────────────────────────────────
function SuccessPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [status, setStatus] = useState<"loading" | "paid" | "pending">("loading");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (!sessionId) { setStatus("pending"); return; }

    API("/api/customer/payment/confirm", {
      method: "POST",
      body: JSON.stringify({ sessionId }),
    })
      .then((r) => r.json())
      .then((data) => {
        setStatus(data.status === "paid" ? "paid" : "pending");
      })
      .catch(() => setStatus("pending"));
  }, []);

  return (
    <div className="bg-gradient-to-br from-slate-50 to-blue-50 min-h-[60vh] flex items-center justify-center p-4 py-16">
      <Card className="w-full max-w-md shadow-xl text-center">
        <CardContent className="pt-10 pb-8 px-8">
          {status === "loading" && (
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center animate-pulse">
                <CreditCard className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-gray-600">Confirming your payment…</p>
            </div>
          )}
          {status === "paid" && (
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Payment Received</h2>
              <p className="text-gray-600">Thank you! Your payment has been processed successfully.</p>
              <Button className="mt-2 w-full" onClick={() => setLocation("/customer-portal")} data-testid="btn-return-portal">
                Return to Portal
              </Button>
            </div>
          )}
          {status === "pending" && (
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center">
                <Clock className="w-10 h-10 text-yellow-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Payment Pending</h2>
              <p className="text-gray-600">Your payment is being processed. You'll receive a confirmation shortly.</p>
              <Button variant="outline" className="mt-2 w-full" onClick={() => setLocation("/customer-portal")} data-testid="btn-return-portal-pending">
                Return to Portal
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Payment Form ──────────────────────────────────────────────────────────────
function PaymentForm({ account }: { account: any | null }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    accountNumber: account?.accountNumber || "",
    policyNumber: "",
    contactName: account?.contactName || "",
    postalCode: account?.postalCode || "",
    email: account?.email || "",
    phone: account?.phone || "",
    amount: "",
    description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountCents = Math.round(parseFloat(form.amount) * 100);
    if (!amountCents || amountCents < 50) {
      toast({ title: "Invalid Amount", description: "Minimum payment is $0.50.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await API("/api/customer/payment", {
        method: "POST",
        body: JSON.stringify({
          accountNumber: form.accountNumber.trim().toUpperCase(),
          policyNumber: form.policyNumber.trim().toUpperCase() || undefined,
          contactName: form.contactName.trim(),
          postalCode: form.postalCode.trim().toUpperCase(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          amountCents,
          description: form.description.trim() || "Insurance Payment",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Payment failed.");
      redirectToStripeCheckout(data.url);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="accountNumber">{account ? "Account Number" : "Account / Policy Number"}</Label>
          <Input
            id="accountNumber"
            data-testid="input-account-number"
            placeholder={account ? "CP-XXXXXX" : "CP-XXXXXX or policy #"}
            value={form.accountNumber}
            onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="policyNumber">Account / Policy # to Apply Payment</Label>
          <Input
            id="policyNumber"
            data-testid="input-policy-number"
            placeholder="Policy or account # for this payment"
            value={form.policyNumber}
            onChange={(e) => setForm({ ...form, policyNumber: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="contactName">Full Name</Label>
        <Input
          id="contactName"
          data-testid="input-contact-name"
          placeholder="John Smith"
          value={form.contactName}
          onChange={(e) => setForm({ ...form, contactName: e.target.value })}
          required
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="postalCode">Postal Code</Label>
          <Input
            id="postalCode"
            data-testid="input-postal-code"
            placeholder="M5V 2T6"
            value={form.postalCode}
            onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            data-testid="input-phone-payment"
            type="tel"
            placeholder="416-555-0100"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          data-testid="input-email-payment"
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">Payment Description</Label>
        <Input
          id="description"
          data-testid="input-description"
          placeholder="e.g. Auto Insurance Premium — March 2025"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="amount">Amount (CAD)</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
          <Input
            id="amount"
            data-testid="input-amount"
            type="number"
            min="0.50"
            step="0.01"
            placeholder="0.00"
            className="pl-7"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            required
          />
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={loading} data-testid="btn-pay">
        {loading ? "Redirecting to Payment…" : "Proceed to Secure Payment"}
        <ChevronRight className="ml-2 w-4 h-4" />
      </Button>
      <p className="text-xs text-gray-500 text-center">Payments are processed securely via Stripe. Your card details are never stored on our servers.</p>
    </form>
  );
}

// ── Auth Forms ────────────────────────────────────────────────────────────────
function LoginForm({ onSuccess }: { onSuccess: (token: string, account: any) => void }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await API("/api/customer/login", {
        method: "POST",
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed.");
      onSuccess(data.token, data.account);
    } catch (err: any) {
      toast({ title: "Login Failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="login-email">Email Address</Label>
        <Input
          id="login-email"
          data-testid="input-login-email"
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="login-password">Password</Label>
        <Input
          id="login-password"
          data-testid="input-login-password"
          type="password"
          placeholder="••••••••"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading} data-testid="btn-login">
        {loading ? "Signing in…" : "Sign In"}
        <LogIn className="ml-2 w-4 h-4" />
      </Button>
    </form>
  );
}

function RegisterForm({ onSuccess }: { onSuccess: (token: string, account: any) => void }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", confirmPassword: "", contactName: "", postalCode: "", phone: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast({ title: "Password Mismatch", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    if (form.password.length < 6) {
      toast({ title: "Weak Password", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await API("/api/customer/register", {
        method: "POST",
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed.");
      toast({ title: "Account Created", description: `Your account number is ${data.account.accountNumber}` });
      onSuccess(data.token, data.account);
    } catch (err: any) {
      toast({ title: "Registration Failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="reg-name">Full Name</Label>
          <Input
            id="reg-name"
            data-testid="input-reg-name"
            placeholder="John Smith"
            value={form.contactName}
            onChange={(e) => setForm({ ...form, contactName: e.target.value })}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reg-phone">Phone (optional)</Label>
          <Input
            id="reg-phone"
            data-testid="input-reg-phone"
            type="tel"
            placeholder="416-555-0100"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reg-email">Email Address</Label>
        <Input
          id="reg-email"
          data-testid="input-reg-email"
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reg-postal">Postal Code</Label>
        <Input
          id="reg-postal"
          data-testid="input-reg-postal"
          placeholder="M5V 2T6"
          value={form.postalCode}
          onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
          required
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="reg-password">Password</Label>
          <Input
            id="reg-password"
            data-testid="input-reg-password"
            type="password"
            placeholder="Min. 6 characters"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reg-confirm">Confirm Password</Label>
          <Input
            id="reg-confirm"
            data-testid="input-reg-confirm"
            type="password"
            placeholder="Re-enter password"
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            required
          />
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={loading} data-testid="btn-register">
        {loading ? "Creating Account…" : "Create Account"}
        <UserPlus className="ml-2 w-4 h-4" />
      </Button>
    </form>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ account, onLogout }: { account: any; onLogout: () => void }) {
  const { toast } = useToast();
  const [payments, setPayments] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [loadingPolicies, setLoadingPolicies] = useState(true);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  useEffect(() => {
    API("/api/customer/payments")
      .then((r) => r.json())
      .then(setPayments)
      .catch(() => {})
      .finally(() => setLoadingPayments(false));

    API("/api/customer/policies")
      .then((r) => r.json())
      .then(setPolicies)
      .catch(() => {})
      .finally(() => setLoadingPolicies(false));
  }, []);

  const handleLogout = async () => {
    await API("/api/customer/logout", { method: "POST" });
    localStorage.removeItem("customer_token");
    localStorage.removeItem("customer_account");
    onLogout();
  };

  return (
    <div className="space-y-6">
      {/* Account Card */}
      <Card className="bg-gradient-to-r from-[#1B2B5E] to-[#2d4a9e] text-white">
        <CardContent className="pt-6 pb-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p className="text-blue-200 text-sm">Welcome back</p>
              <h2 className="text-2xl font-bold mt-0.5" data-testid="text-account-name">{account.contactName}</h2>
              <p className="text-blue-200 text-sm mt-1">Account: <span className="font-mono font-semibold text-white" data-testid="text-account-number">{account.accountNumber}</span></p>
              <p className="text-blue-200 text-sm">{account.email} · {account.postalCode}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={handleLogout} data-testid="btn-logout" className="shrink-0">
              <LogOut className="w-4 h-4 mr-1" />Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="payment" className="w-full">
        <TabsList className="w-full grid grid-cols-3" data-testid="tabs-dashboard">
          <TabsTrigger value="payment" data-testid="tab-payment">Make Payment</TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">Payment History</TabsTrigger>
          <TabsTrigger value="policies" data-testid="tab-policies">Policy Updates</TabsTrigger>
        </TabsList>

        {/* Payment Tab */}
        <TabsContent value="payment" className="mt-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                Make a Payment
              </CardTitle>
              <CardDescription>Your account details are pre-filled. Adjust if paying for a different policy.</CardDescription>
            </CardHeader>
            <CardContent>
              <PaymentForm account={account} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                Payment History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPayments ? (
                <div className="text-center py-8 text-gray-500">Loading…</div>
              ) : payments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <DollarSign className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>No payments on record yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map((p) => (
                    <div key={p.id} data-testid={`payment-row-${p.id}`} className="flex items-center justify-between p-3 rounded-lg border bg-gray-50">
                      <div>
                        <p className="font-medium text-sm text-gray-900">{p.description || "Insurance Payment"}</p>
                        {p.policyNumber && (
                          <p className="text-xs text-gray-600 font-mono" data-testid={`payment-policy-${p.id}`}>Applied to: {p.policyNumber}</p>
                        )}
                        <p className="text-xs text-gray-500">{formatDate(p.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm" data-testid={`payment-amount-${p.id}`}>{formatCurrency(p.amount)}</p>
                        <Badge className={`text-xs mt-0.5 ${p.status === "paid" ? "bg-green-100 text-green-800" : p.status === "failed" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`} data-testid={`payment-status-${p.id}`}>
                          {p.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Policies Tab */}
        <TabsContent value="policies" className="mt-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                Policy Updates
              </CardTitle>
              <CardDescription>Insurance quotes and status updates linked to your email address.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingPolicies ? (
                <div className="text-center py-8 text-gray-500">Loading…</div>
              ) : policies.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>No policies found linked to your email.</p>
                  <p className="text-xs mt-1">Quotes you submit with this email will appear here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {policies.map((p) => {
                    const Icon = INSURANCE_ICONS[p.insuranceType?.toLowerCase()] || INSURANCE_ICONS.default;
                    return (
                      <div key={p.id} data-testid={`policy-row-${p.id}`} className="flex items-center justify-between p-3 rounded-lg border bg-gray-50">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-sm text-gray-900 capitalize">{p.insuranceType} Insurance</p>
                            <p className="text-xs text-gray-500">{formatDate(p.createdAt)}{p.postalCode ? ` · ${p.postalCode}` : ""}</p>
                          </div>
                        </div>
                        <Badge className={`text-xs ${STATUS_COLORS[p.status] || "bg-gray-100 text-gray-800"}`} data-testid={`policy-status-${p.id}`}>
                          {p.status}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CustomerPortal() {
  const [location] = useLocation();
  const isSuccess = location.includes("/success");

  const [account, setAccount] = useState<any | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("customer_token");
    if (!token) { setAuthChecked(true); return; }
    API("/api/customer/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setAccount(data);
      })
      .catch(() => {})
      .finally(() => setAuthChecked(true));
  }, []);

  const handleAuthSuccess = (token: string, acc: any) => {
    localStorage.setItem("customer_token", token);
    localStorage.setItem("customer_account", JSON.stringify(acc));
    setAccount(acc);
  };

  const handleLogout = () => {
    setAccount(null);
  };

  if (isSuccess) return <SuccessPage />;

  return (
    <div className="bg-gradient-to-br from-slate-50 to-blue-50">
      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#1B2B5E] to-[#2d4a9e] flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-[#1B2B5E] text-lg leading-none" data-testid="text-portal-title">Make Payment</h1>
            <p className="text-xs text-gray-500">QuoteUs.ca Insurance</p>
          </div>
        </div>
        {!authChecked ? (
          <div className="text-center py-12 text-gray-500">Loading…</div>
        ) : account ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Dashboard account={account} onLogout={handleLogout} />
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Guest Payment */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  Make a Payment
                </CardTitle>
                <CardDescription>No account needed — just enter your policy details and pay securely.</CardDescription>
              </CardHeader>
              <CardContent>
                <PaymentForm account={null} />
              </CardContent>
            </Card>

            {/* Auth */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-xl">Account Access</CardTitle>
                <CardDescription>Sign in or create an account to view payment history and policy updates.</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="login">
                  <TabsList className="w-full grid grid-cols-2 mb-4">
                    <TabsTrigger value="login" data-testid="tab-login">Sign In</TabsTrigger>
                    <TabsTrigger value="register" data-testid="tab-register">Create Account</TabsTrigger>
                  </TabsList>
                  <TabsContent value="login">
                    <LoginForm onSuccess={handleAuthSuccess} />
                  </TabsContent>
                  <TabsContent value="register">
                    <RegisterForm onSuccess={handleAuthSuccess} />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </main>
    </div>
  );
}
