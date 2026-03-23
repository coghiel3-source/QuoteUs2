import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import type { RgLocation, RgLead, DocumentRequest, RepDocument, RepReminder } from "@shared/schema";
import {
  Home, Plus, Search, FileText, Send, Eye, Trash2, ChevronRight,
  X, RefreshCw, Check, Clock, ExternalLink, Copy, BarChart3, Bell,
  BellRing, TrendingUp, AlarmClock, Pencil, MapPin, User, AlertTriangle,
  Building2, DollarSign, Calendar, Phone, Mail, UserPlus, ArrowRight,
  Calculator, CreditCard, Percent, BadgePercent, CheckCircle2,
} from "lucide-react";

type Status = "New" | "Contacted" | "Documents Pending" | "Documents Received" | "Submitted" | "Approved" | "Declined";
type ActiveTab = "overview" | "locations" | "leads" | "reminders";
type LocationView = "list" | "detail";
type LeadDetailTab = "info" | "pricing" | "docs";

const STATUS_COLORS: Record<Status, string> = {
  "New": "bg-blue-100 text-blue-800",
  "Contacted": "bg-yellow-100 text-yellow-800",
  "Documents Pending": "bg-orange-100 text-orange-800",
  "Documents Received": "bg-purple-100 text-purple-800",
  "Submitted": "bg-indigo-100 text-indigo-800",
  "Approved": "bg-green-100 text-green-800",
  "Declined": "bg-red-100 text-red-800",
};

const IN_PROGRESS_STATUSES: Status[] = ["Contacted", "Documents Pending", "Documents Received", "Submitted"];
const EMPLOYMENT_STATUSES = ["Employed Full-Time", "Employed Part-Time", "Self-Employed", "Student", "Retired", "Unemployed", "Other"];
const PAYMENT_METHODS = ["e-Transfer", "Cheque", "Cash", "Direct Deposit", "Pre-Authorized Debit", "Other"];
const TENANT_DOC_TYPES = ["Pay Stubs (Last 3 Months)", "T4 / Notice of Assessment", "Bank Statements (3 Months)", "Credit Check Authorization", "Government ID", "Employment Letter", "Other"];
const LANDLORD_DOC_TYPES = ["Lease Agreement", "Property Deed / Ownership Proof", "Property Insurance", "Government ID", "Other"];
const REMINDER_PRESETS = [
  "Follow up on lease agreement", "Chase tenant documents", "Follow up with landlord",
  "Submit application", "Check approval status", "Review credit report", "Confirm move-in date",
];

function fmt(n: number) {
  return n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StatCard({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color: string }) {
  return (
    <div className={`rounded-xl p-4 border ${color}`}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

function BigStatCard({
  label, value, sub, icon, iconBg, valueColor, onClick, action,
}: {
  label: string; value: number | string; sub?: string;
  icon: React.ReactNode; iconBg: string; valueColor: string;
  onClick?: () => void; action?: React.ReactNode;
}) {
  return (
    <div
      className={`bg-white rounded-xl border shadow-sm p-5 flex flex-col gap-2 ${onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <div className={`${iconBg} rounded-full p-2`}>{icon}</div>
      </div>
      <p className={`text-4xl font-bold ${valueColor}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

function PricingTab({
  monthlyRent, markupPercent, baseAnnualRate = 4.5, baseMonthlyRate = 5,
  onSaveMarkup, onSaveRates, paymentLink, onSavePaymentLink,
}: {
  monthlyRent: number;
  markupPercent?: number | string | null;
  baseAnnualRate?: number;
  baseMonthlyRate?: number;
  onSaveMarkup?: (pct: number) => void;
  onSaveRates?: (annual: number, monthly: number) => void;
  paymentLink?: string | null;
  onSavePaymentLink?: (link: string) => void;
}) {
  const rent = monthlyRent || 0;
  const [markup, setMarkup] = useState<string>(markupPercent ? String(Number(markupPercent)) : "0");
  const [editAnnual, setEditAnnual] = useState<string>(String(baseAnnualRate));
  const [editMonthly, setEditMonthly] = useState<string>(String(baseMonthlyRate));
  const [editLink, setEditLink] = useState<string>(paymentLink || "");
  const [markupSaved, setMarkupSaved] = useState(false);
  const [ratesSaved, setRatesSaved] = useState(false);
  const [linkSaved, setLinkSaved] = useState(false);

  const markupNum = Math.max(0, parseFloat(markup) || 0);
  const annualRateNum = parseFloat(editAnnual) || 4.5;
  const monthlyRateNum = parseFloat(editMonthly) || 5;
  const finalAnnualRate = annualRateNum + markupNum;
  const finalMonthlyRate = monthlyRateNum + markupNum;
  const annualRent = rent * 12;
  const annualPremium = (finalAnnualRate / 100) * annualRent;
  const annualPremiumMonthly = annualPremium / 12;
  const monthlyPremium = (finalMonthlyRate / 100) * rent;
  const monthlyPremiumAnnual = monthlyPremium * 12;

  return (
    <div className="space-y-5">
      <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-4">
        <div className="bg-blue-100 rounded-lg p-2.5"><DollarSign className="h-5 w-5 text-blue-600" /></div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Monthly Rent</p>
          <p className="text-2xl font-bold text-gray-900">${fmt(rent)}<span className="text-sm font-normal text-gray-400">/mo</span></p>
          <p className="text-xs text-gray-400">Annual: ${fmt(annualRent)}</p>
        </div>
      </div>

      {/* Editable base rates (location level only) */}
      {onSaveRates && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-blue-800 flex items-center gap-2 mb-3"><BadgePercent className="h-4 w-4" /> Base Rates</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <Label className="text-xs text-blue-700 mb-1 block">Annual Rate (%)</Label>
              <div className="relative">
                <Input type="number" min="0" max="30" step="0.1" value={editAnnual} onChange={e => { setEditAnnual(e.target.value); setRatesSaved(false); }} className="pr-8" data-testid="input-annual-rate" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
              </div>
            </div>
            <div>
              <Label className="text-xs text-blue-700 mb-1 block">Monthly Rate (%)</Label>
              <div className="relative">
                <Input type="number" min="0" max="30" step="0.1" value={editMonthly} onChange={e => { setEditMonthly(e.target.value); setRatesSaved(false); }} className="pr-8" data-testid="input-monthly-rate" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
              </div>
            </div>
          </div>
          <Button onClick={() => { onSaveRates(annualRateNum, monthlyRateNum); setRatesSaved(true); setTimeout(() => setRatesSaved(false), 2000); }} size="sm" variant={ratesSaved ? "outline" : "default"} className={ratesSaved ? "border-green-500 text-green-600" : ""} data-testid="button-save-rates">
            {ratesSaved ? <><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Saved</> : "Save Rates"}
          </Button>
        </div>
      )}

      {/* Markup (lead level) */}
      {onSaveMarkup && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-amber-800 flex items-center gap-2 mb-3"><BadgePercent className="h-4 w-4" /> Additional Markup</p>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="relative">
                <Input type="number" min="0" max="20" step="0.5" value={markup} onChange={e => { setMarkup(e.target.value); setMarkupSaved(false); }} className="pr-8 text-lg font-semibold" data-testid="input-markup-percent" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">%</span>
              </div>
              <p className="text-xs text-amber-700 mt-1">Added to base rates ({annualRateNum}% / {monthlyRateNum}%)</p>
            </div>
            <Button onClick={() => { onSaveMarkup(markupNum); setMarkupSaved(true); setTimeout(() => setMarkupSaved(false), 2000); }} size="sm" variant={markupSaved ? "outline" : "default"} className={markupSaved ? "border-green-500 text-green-600" : ""} data-testid="button-save-markup">
              {markupSaved ? <><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Saved</> : "Save"}
            </Button>
          </div>
        </div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 gap-4">
        <div className="bg-white border-2 border-blue-200 rounded-xl overflow-hidden">
          <div className="bg-blue-600 text-white px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /><span className="font-semibold text-sm">Annual Plan — Pay in Full</span></div>
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{finalAnnualRate.toFixed(2)}% of annual rent</span>
          </div>
          <div className="p-4">
            <div className="flex items-end gap-2 mb-1">
              <p className="text-3xl font-bold text-gray-900">${fmt(annualPremium)}</p>
              <p className="text-gray-400 text-sm mb-1">one-time payment</p>
            </div>
            <p className="text-xs text-gray-400 mb-3">Equivalent to ${fmt(annualPremiumMonthly)}/month</p>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-500"><span>Annual rent</span><span>${fmt(annualRent)}</span></div>
              <div className="flex justify-between text-gray-500"><span>Base rate ({annualRateNum}%)</span><span>${fmt((annualRateNum / 100) * annualRent)}</span></div>
              {markupNum > 0 && <div className="flex justify-between text-amber-600"><span>Markup ({markupNum}%)</span><span>+${fmt((markupNum / 100) * annualRent)}</span></div>}
              <div className="flex justify-between font-semibold text-gray-900 pt-1.5 border-t"><span>Total premium</span><span>${fmt(annualPremium)}</span></div>
            </div>
          </div>
        </div>
        <div className="bg-white border-2 border-green-200 rounded-xl overflow-hidden">
          <div className="bg-green-600 text-white px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2"><CreditCard className="h-4 w-4" /><span className="font-semibold text-sm">Monthly Plan</span></div>
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{finalMonthlyRate.toFixed(2)}% of monthly rent</span>
          </div>
          <div className="p-4">
            <div className="flex items-end gap-2 mb-1">
              <p className="text-3xl font-bold text-gray-900">${fmt(monthlyPremium)}</p>
              <p className="text-gray-400 text-sm mb-1">/month</p>
            </div>
            <p className="text-xs text-gray-400 mb-3">Total annual cost: ${fmt(monthlyPremiumAnnual)}</p>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-500"><span>Monthly rent</span><span>${fmt(rent)}</span></div>
              <div className="flex justify-between text-gray-500"><span>Base rate ({monthlyRateNum}%)</span><span>${fmt((monthlyRateNum / 100) * rent)}/mo</span></div>
              {markupNum > 0 && <div className="flex justify-between text-amber-600"><span>Markup ({markupNum}%)</span><span>+${fmt((markupNum / 100) * rent)}/mo</span></div>}
              <div className="flex justify-between font-semibold text-gray-900 pt-1.5 border-t"><span>Monthly premium</span><span>${fmt(monthlyPremium)}/mo</span></div>
            </div>
          </div>
        </div>
      </div>

      {rent > 0 && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm">
          <p className="font-semibold text-indigo-800 mb-2 flex items-center gap-2"><Calculator className="h-4 w-4" /> Savings Comparison</p>
          <div className="flex items-center justify-between">
            <div><p className="text-indigo-700">Annual plan saves:</p><p className="text-xs text-indigo-500 mt-0.5">vs paying monthly all year</p></div>
            <p className={`text-xl font-bold ${monthlyPremiumAnnual > annualPremium ? "text-green-600" : "text-gray-500"}`}>
              {monthlyPremiumAnnual > annualPremium ? `$${fmt(monthlyPremiumAnnual - annualPremium)}` : "—"}
            </p>
          </div>
        </div>
      )}

      {/* Payment link */}
      {onSavePaymentLink !== undefined && (
        <div className="bg-gray-50 border rounded-xl p-4">
          <p className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3"><ExternalLink className="h-4 w-4" /> Payment Page Link</p>
          <div className="flex gap-2">
            <Input value={editLink} onChange={e => { setEditLink(e.target.value); setLinkSaved(false); }} placeholder="https://..." className="flex-1" data-testid="input-payment-link" />
            <Button onClick={() => { onSavePaymentLink(editLink); setLinkSaved(true); setTimeout(() => setLinkSaved(false), 2000); }} size="sm" variant={linkSaved ? "outline" : "default"} className={linkSaved ? "border-green-500 text-green-600" : ""} data-testid="button-save-payment-link">
              {linkSaved ? <><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Saved</> : "Save"}
            </Button>
          </div>
          {paymentLink && <a href={paymentLink} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:underline"><ExternalLink className="h-3 w-3" /> Open payment page</a>}
        </div>
      )}
    </div>
  );
}

interface RepDashboardProps {
  embedded?: boolean;
}

export default function RepDashboard({ embedded = false }: RepDashboardProps) {
  const { user, refreshUser } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Core data
  const [locations, setLocations] = useState<RgLocation[]>([]);
  const [leads, setLeads] = useState<RgLead[]>([]);
  const [reminders, setReminders] = useState<RepReminder[]>([]);
  const [loading, setLoading] = useState(true);

  // Location tenants cache
  const [locationTenants, setLocationTenants] = useState<Record<string, RgLead[]>>({});

  // UI state
  const [activeTab, setActiveTab] = useState<ActiveTab>("locations");
  const [locationView, setLocationView] = useState<LocationView>("list");
  const [selectedLocation, setSelectedLocation] = useState<RgLocation | null>(null);
  const [selectedLead, setSelectedLead] = useState<RgLead | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [detailTab, setDetailTab] = useState<LeadDetailTab>("info");

  // Lead docs
  const [docRequests, setDocRequests] = useState<DocumentRequest[]>([]);
  const [documents, setDocuments] = useState<RepDocument[]>([]);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Global RG default rates from admin
  const [globalRgRates, setGlobalRgRates] = useState<{ annualRate: number; monthlyRate: number }>({ annualRate: 4.5, monthlyRate: 5 });

  // Location detail
  const [locationDetailTab, setLocationDetailTab] = useState<"info" | "pricing" | "docs">("info");
  const [locationDocRequests, setLocationDocRequests] = useState<DocumentRequest[]>([]);
  const [locationDocs, setLocationDocs] = useState<RepDocument[]>([]);
  const [updatingLocationStatus, setUpdatingLocationStatus] = useState(false);

  // Edit lead dialog
  const [showEditLead, setShowEditLead] = useState(false);
  const [editLeadForm, setEditLeadForm] = useState({
    tenantName: "", tenantEmail: "", tenantPhone: "", employmentStatus: "",
    coApplicantName: "", coApplicantEmail: "", monthlyRent: "", moveInDate: "", notes: "",
    householdIncome: "", employerName: "", paymentMethod: "",
  });
  const [savingLead, setSavingLead] = useState(false);

  // Doc request dialog
  const [showDocRequest, setShowDocRequest] = useState(false);
  const [docReqForm, setDocReqForm] = useState({ recipientType: "tenant", recipientName: "", recipientEmail: "", requiredDocs: [] as string[], expiresInDays: 7 });
  const [sendingDocReq, setSendingDocReq] = useState(false);
  const [createdLink, setCreatedLink] = useState<string | null>(null);

  // Delete confirms
  const [deleteLeadConfirm, setDeleteLeadConfirm] = useState<string | null>(null);
  const [deleteLocationConfirm, setDeleteLocationConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Account balance / fund account
  const [showFundAccount, setShowFundAccount] = useState(false);
  const [creditPackages, setCreditPackages] = useState<{ amount: number; label: string }[]>([]);
  const [repTransactions, setRepTransactions] = useState<{ id: string; type: string; amount: string; balanceAfter: string; description: string; createdAt: string }[]>([]);
  const [purchaseLoading, setPurchaseLoading] = useState<number | null>(null);
  const [fundSuccessMessage, setFundSuccessMessage] = useState<string | null>(null);

  // Reminders
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [editingReminder, setEditingReminder] = useState<RepReminder | null>(null);
  const [reminderFilter, setReminderFilter] = useState<"all" | "pending" | "completed">("pending");
  const [reminderForm, setReminderForm] = useState({ title: "", notes: "", dueDate: "", dueTime: "09:00", leadId: "" });
  const [savingReminder, setSavingReminder] = useState(false);
  const [deleteReminderConfirm, setDeleteReminderConfirm] = useState<string | null>(null);

  // Location form
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState<RgLocation | null>(null);
  const [locationForm, setLocationForm] = useState({ propertyAddress: "", unit: "", landlordName: "", landlordEmail: "", landlordPhone: "", monthlyRent: "", moveInDate: "", notes: "" });
  const [savingLocation, setSavingLocation] = useState(false);

  // Tenant form
  const [showTenantForm, setShowTenantForm] = useState(false);
  const [tenantTargetLocation, setTenantTargetLocation] = useState<RgLocation | null>(null);
  const [tenantForm, setTenantForm] = useState({ tenantName: "", tenantEmail: "", tenantPhone: "", employmentStatus: "", coApplicantName: "", coApplicantEmail: "", notes: "", householdIncome: "", employerName: "", paymentMethod: "", status: "New" });
  const [savingTenant, setSavingTenant] = useState(false);

  const isRep = user?.role === "rep";
  const isAdminOrManager = user?.role === "admin" || user?.role === "manager";

  // RG permission helper — admin/manager always have full access; reps default to all true
  function rgPerm(key: string): boolean {
    if (!isRep) return true;
    const rg = (user?.permissions as any)?.rg;
    if (!rg || rg[key] === undefined) return true;
    return !!rg[key];
  }

  useEffect(() => {
    if (!user || !["rep", "admin", "manager"].includes(user.role)) {
      if (!embedded) navigate("/");
    } else {
      loadAll();
      // Load credit packages for reps
      if (user.role === "rep") {
        fetch("/api/credits/packages").then(r => r.json()).then(data => {
          setCreditPackages(data.packages || []);
        }).catch(() => {});
        fetch(`/api/users/${user.id}/transactions`).then(r => r.json()).then(txns => {
          setRepTransactions(Array.isArray(txns) ? txns : []);
        }).catch(() => {});
      }
      // Handle Stripe success redirect
      if (!embedded) {
        const params = new URLSearchParams(window.location.search);
        if (params.get("success") === "true") {
          const amount = params.get("amount");
          setFundSuccessMessage(`Successfully added $${amount} to your account!`);
          refreshUser?.();
          window.history.replaceState({}, "", "/rep");
        }
        if (params.get("canceled") === "true") {
          window.history.replaceState({}, "", "/rep");
        }
      }
    }
  }, [user]);

  async function loadAll() {
    if (!user) return;
    setLoading(true);
    try {
      const [locs, leadsData, remindersData, rgRatesData] = await Promise.all([
        apiRequest<RgLocation[]>(`/rep/locations?actorId=${user.id}`),
        apiRequest<RgLead[]>(`/rep/leads?actorId=${user.id}`),
        isRep ? apiRequest<RepReminder[]>(`/rep/reminders?actorId=${user.id}`) : Promise.resolve([]),
        fetch("/api/credits/rg-rates").then(r => r.json()).catch(() => null),
      ]);
      setLocations(locs || []);
      setLeads(leadsData || []);
      setReminders(remindersData || []);
      if (rgRatesData && typeof rgRatesData.annualRate === "number") {
        setGlobalRgRates({ annualRate: rgRatesData.annualRate, monthlyRate: rgRatesData.monthlyRate });
      }
    } catch {
      toast({ title: "Failed to load data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function loadTenantsForLocation(locationId: string) {
    if (!user) return [];
    try {
      const tenants = await apiRequest<RgLead[]>(`/rep/locations/${locationId}/tenants?actorId=${user.id}`);
      const result = tenants || [];
      setLocationTenants(prev => ({ ...prev, [locationId]: result }));
      return result;
    } catch { return []; }
  }

  async function openLocation(loc: RgLocation) {
    setSelectedLocation(loc);
    setLocationView("detail");
    setSelectedLead(null);
    setLocationDetailTab("info");
    setLocationDocRequests([]);
    setLocationDocs([]);
    await loadTenantsForLocation(loc.id);
    if (user) {
      try {
        const [reqs, docs] = await Promise.all([
          apiRequest<DocumentRequest[]>(`/rep/locations/${loc.id}/doc-requests?actorId=${user.id}`),
          apiRequest<RepDocument[]>(`/rep/locations/${loc.id}/documents?actorId=${user.id}`),
        ]);
        setLocationDocRequests(reqs || []);
        setLocationDocs(docs || []);
      } catch {}
    }
  }

  async function handleLocationStatusChange(status: string) {
    if (!selectedLocation || !user) return;
    setUpdatingLocationStatus(true);
    try {
      const updated = await apiRequest<RgLocation>(`/rep/locations/${selectedLocation.id}`, { method: "PATCH", body: JSON.stringify({ actorId: user.id, status }) });
      setSelectedLocation(updated);
      setLocations(prev => prev.map(l => l.id === updated.id ? updated : l));
    } catch { toast({ title: "Failed to update status", variant: "destructive" }); }
    finally { setUpdatingLocationStatus(false); }
  }

  async function handleSaveLocationRates(annual: number, monthly: number) {
    if (!selectedLocation || !user) return;
    try {
      const updated = await apiRequest<RgLocation>(`/rep/locations/${selectedLocation.id}`, { method: "PATCH", body: JSON.stringify({ actorId: user.id, annualRatePercent: String(annual), monthlyRatePercent: String(monthly) }) });
      setSelectedLocation(updated);
      setLocations(prev => prev.map(l => l.id === updated.id ? updated : l));
      toast({ title: "Rates saved" });
    } catch { toast({ title: "Failed to save rates", variant: "destructive" }); }
  }

  async function handleSaveLocationPaymentLink(link: string) {
    if (!selectedLocation || !user) return;
    try {
      const updated = await apiRequest<RgLocation>(`/rep/locations/${selectedLocation.id}`, { method: "PATCH", body: JSON.stringify({ actorId: user.id, paymentLink: link || null }) });
      setSelectedLocation(updated);
      setLocations(prev => prev.map(l => l.id === updated.id ? updated : l));
      toast({ title: "Payment link saved" });
    } catch { toast({ title: "Failed to save payment link", variant: "destructive" }); }
  }

  async function openLead(lead: RgLead) {
    setSelectedLead(lead);
    setDetailTab("info");
    setCreatedLink(null);
    if (!user) return;
    try {
      const [reqs, docs] = await Promise.all([
        apiRequest<DocumentRequest[]>(`/rep/leads/${lead.id}/requests?actorId=${user.id}`),
        apiRequest<RepDocument[]>(`/rep/leads/${lead.id}/documents?actorId=${user.id}`),
      ]);
      setDocRequests(reqs || []);
      setDocuments(docs || []);
    } catch {}
  }

  // ===== LOCATION CRUD =====
  function openNewLocation() {
    setLocationForm({ propertyAddress: "", unit: "", landlordName: "", landlordEmail: "", landlordPhone: "", monthlyRent: "", moveInDate: "", notes: "" });
    setEditingLocation(null);
    setShowLocationForm(true);
  }

  function openEditLocation(loc: RgLocation, e?: React.MouseEvent) {
    e?.stopPropagation();
    setLocationForm({ propertyAddress: loc.propertyAddress, unit: loc.unit || "", landlordName: loc.landlordName, landlordEmail: loc.landlordEmail || "", landlordPhone: loc.landlordPhone || "", monthlyRent: loc.monthlyRent, moveInDate: loc.moveInDate || "", notes: loc.notes || "" });
    setEditingLocation(loc);
    setShowLocationForm(true);
  }

  async function handleSaveLocation() {
    if (!user || !locationForm.propertyAddress || !locationForm.landlordName || !locationForm.monthlyRent) {
      toast({ title: "Please fill in address, landlord name, and monthly rent", variant: "destructive" });
      return;
    }
    setSavingLocation(true);
    try {
      const payload = { actorId: user.id, ...locationForm, unit: locationForm.unit || null, landlordEmail: locationForm.landlordEmail || null, landlordPhone: locationForm.landlordPhone || null, moveInDate: locationForm.moveInDate || null, notes: locationForm.notes || null };
      if (editingLocation) {
        const updated = await apiRequest<RgLocation>(`/rep/locations/${editingLocation.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        setLocations(prev => prev.map(l => l.id === editingLocation.id ? updated : l));
        if (selectedLocation?.id === editingLocation.id) setSelectedLocation(updated);
        toast({ title: "Location updated" });
      } else {
        const created = await apiRequest<RgLocation>("/rep/locations", { method: "POST", body: JSON.stringify(payload) });
        setLocations(prev => [created, ...prev]);
        toast({ title: "Location created" });
        setShowLocationForm(false);
        openLocation(created);
        openAddTenant(created);
        return;
      }
      setShowLocationForm(false);
    } catch (err: any) {
      toast({ title: err.message || "Failed to save location", variant: "destructive" });
    } finally {
      setSavingLocation(false);
    }
  }

  async function handleDeleteLocation() {
    if (!deleteLocationConfirm || !user) return;
    setDeleting(true);
    try {
      await apiRequest(`/rep/locations/${deleteLocationConfirm}?actorId=${user.id}`, { method: "DELETE" });
      setLocations(prev => prev.filter(l => l.id !== deleteLocationConfirm));
      if (selectedLocation?.id === deleteLocationConfirm) { setSelectedLocation(null); setLocationView("list"); }
      setDeleteLocationConfirm(null);
      toast({ title: "Location deleted" });
    } catch {
      toast({ title: "Failed to delete location", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  }

  // ===== TENANT CRUD =====
  function openAddTenant(loc: RgLocation, e?: React.MouseEvent) {
    e?.stopPropagation();
    setTenantTargetLocation(loc);
    setTenantForm({ tenantName: "", tenantEmail: "", tenantPhone: "", employmentStatus: "", coApplicantName: "", coApplicantEmail: "", notes: "", householdIncome: "", employerName: "", paymentMethod: "", status: "New" });
    setShowTenantForm(true);
  }

  async function handleSaveTenant() {
    if (!user || !tenantTargetLocation) return;
    if (!tenantForm.tenantName || !tenantForm.tenantEmail || !tenantForm.tenantPhone || !tenantForm.employmentStatus) {
      toast({ title: "Please fill in all required tenant fields", variant: "destructive" });
      return;
    }
    setSavingTenant(true);
    try {
      const created = await apiRequest<RgLead>(`/rep/locations/${tenantTargetLocation.id}/tenants`, {
        method: "POST",
        body: JSON.stringify({ actorId: user.id, ...tenantForm, coApplicantName: tenantForm.coApplicantName || null, coApplicantEmail: tenantForm.coApplicantEmail || null, notes: tenantForm.notes || null, householdIncome: tenantForm.householdIncome || null, employerName: tenantForm.employerName || null, paymentMethod: tenantForm.paymentMethod || null }),
      });
      setLeads(prev => [created, ...prev]);
      setLocationTenants(prev => ({ ...prev, [tenantTargetLocation.id]: [created, ...(prev[tenantTargetLocation.id] || [])] }));
      setShowTenantForm(false);
      toast({ title: "Tenant added successfully" });
      openLead(created);
    } catch (err: any) {
      toast({ title: err.message || "Failed to add tenant", variant: "destructive" });
    } finally {
      setSavingTenant(false);
    }
  }

  // ===== EDIT LEAD =====
  function openEditLead() {
    if (!selectedLead) return;
    setEditLeadForm({
      tenantName: selectedLead.tenantName,
      tenantEmail: selectedLead.tenantEmail,
      tenantPhone: selectedLead.tenantPhone,
      employmentStatus: selectedLead.employmentStatus,
      coApplicantName: selectedLead.coApplicantName || "",
      coApplicantEmail: selectedLead.coApplicantEmail || "",
      monthlyRent: selectedLead.monthlyRent,
      moveInDate: selectedLead.moveInDate || "",
      notes: selectedLead.notes || "",
      householdIncome: selectedLead.householdIncome || "",
      employerName: selectedLead.employerName || "",
      paymentMethod: selectedLead.paymentMethod || "",
    });
    setShowEditLead(true);
  }

  async function handleSaveEditLead() {
    if (!user || !selectedLead) return;
    if (!editLeadForm.tenantName || !editLeadForm.tenantEmail || !editLeadForm.tenantPhone || !editLeadForm.employmentStatus) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    setSavingLead(true);
    try {
      const updated = await apiRequest<RgLead>(`/rep/leads/${selectedLead.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          actorId: user.id,
          tenantName: editLeadForm.tenantName,
          tenantEmail: editLeadForm.tenantEmail,
          tenantPhone: editLeadForm.tenantPhone,
          employmentStatus: editLeadForm.employmentStatus,
          coApplicantName: editLeadForm.coApplicantName || null,
          coApplicantEmail: editLeadForm.coApplicantEmail || null,
          monthlyRent: editLeadForm.monthlyRent,
          moveInDate: editLeadForm.moveInDate || null,
          notes: editLeadForm.notes || null,
          householdIncome: editLeadForm.householdIncome || null,
          employerName: editLeadForm.employerName || null,
          paymentMethod: editLeadForm.paymentMethod || null,
        }),
      });
      setLeads(prev => prev.map(l => l.id === selectedLead.id ? updated : l));
      if (updated.locationId) {
        setLocationTenants(prev => ({ ...prev, [updated.locationId!]: (prev[updated.locationId!] || []).map(t => t.id === updated.id ? updated : t) }));
      }
      setSelectedLead(updated);
      setShowEditLead(false);
      toast({ title: "Tenant details updated" });
    } catch (err: any) {
      toast({ title: err.message || "Failed to update tenant", variant: "destructive" });
    } finally {
      setSavingLead(false);
    }
  }

  async function handleSaveMarkup(markupPct: number) {
    if (!user || !selectedLead) return;
    try {
      const updated = await apiRequest<RgLead>(`/rep/leads/${selectedLead.id}`, {
        method: "PATCH",
        body: JSON.stringify({ actorId: user.id, markupPercent: String(markupPct) }),
      });
      setLeads(prev => prev.map(l => l.id === selectedLead.id ? updated : l));
      setSelectedLead(updated);
    } catch {
      toast({ title: "Failed to save markup", variant: "destructive" });
    }
  }

  async function handleStatusChange(leadId: string, status: string) {
    if (!user) return;
    setUpdatingStatus(true);
    try {
      const updated = await apiRequest<RgLead>(`/rep/leads/${leadId}`, { method: "PATCH", body: JSON.stringify({ actorId: user.id, status }) });
      setLeads(prev => prev.map(l => l.id === leadId ? updated : l));
      if (updated.locationId) setLocationTenants(prev => ({ ...prev, [updated.locationId!]: (prev[updated.locationId!] || []).map(t => t.id === leadId ? updated : t) }));
      setSelectedLead(updated);
      toast({ title: "Status updated" });
    } catch {
      toast({ title: "Failed to update status", variant: "destructive" });
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleDeleteLead() {
    if (!deleteLeadConfirm || !user) return;
    setDeleting(true);
    try {
      const lead = leads.find(l => l.id === deleteLeadConfirm);
      await apiRequest(`/rep/leads/${deleteLeadConfirm}?actorId=${user.id}`, { method: "DELETE" });
      setLeads(prev => prev.filter(l => l.id !== deleteLeadConfirm));
      if (lead?.locationId) setLocationTenants(prev => ({ ...prev, [lead.locationId!]: (prev[lead.locationId!] || []).filter(t => t.id !== deleteLeadConfirm) }));
      setSelectedLead(null);
      setDeleteLeadConfirm(null);
      toast({ title: "Tenant removed" });
    } catch {
      toast({ title: "Failed to remove tenant", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  }

  async function handleSendDocRequest() {
    if (!selectedLead || !user) return;
    if (!docReqForm.recipientName || !docReqForm.recipientEmail) { toast({ title: "Please fill in recipient details", variant: "destructive" }); return; }
    setSendingDocReq(true);
    try {
      const result = await apiRequest<DocumentRequest>(`/rep/leads/${selectedLead.id}/request-docs`, { method: "POST", body: JSON.stringify({ actorId: user.id, ...docReqForm }) });
      setDocRequests(prev => [result, ...prev]);
      const link = `${window.location.origin}/doc-upload/${result.token}`;
      setCreatedLink(link);
      if (selectedLead.status === "New" || selectedLead.status === "Contacted") await handleStatusChange(selectedLead.id, "Documents Pending");
      toast({ title: "Document request created" });
    } catch (err: any) {
      toast({ title: err.message || "Failed to create request", variant: "destructive" });
    } finally {
      setSendingDocReq(false);
    }
  }

  async function handleDeleteDoc(docId: string) {
    if (!user) return;
    try {
      await apiRequest(`/rep/documents/${docId}?actorId=${user.id}`, { method: "DELETE" });
      setDocuments(prev => prev.filter(d => d.id !== docId));
      toast({ title: "Document removed" });
    } catch { toast({ title: "Failed to remove document", variant: "destructive" }); }
  }

  // ===== REMINDERS =====
  function openNewReminder(preset?: string) {
    const now = new Date(); now.setDate(now.getDate() + 1);
    setReminderForm({ title: preset || "", notes: "", dueDate: now.toISOString().split("T")[0], dueTime: "09:00", leadId: "" });
    setEditingReminder(null); setShowReminderForm(true);
  }

  function openEditReminder(r: RepReminder) {
    const d = new Date(r.dueDate);
    setReminderForm({ title: r.title, notes: r.notes || "", dueDate: d.toISOString().split("T")[0], dueTime: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`, leadId: r.leadId || "" });
    setEditingReminder(r); setShowReminderForm(true);
  }

  async function handleSaveReminder() {
    if (!user || !reminderForm.title || !reminderForm.dueDate) { toast({ title: "Please fill in a title and due date", variant: "destructive" }); return; }
    setSavingReminder(true);
    try {
      const dueDate = new Date(`${reminderForm.dueDate}T${reminderForm.dueTime}:00`);
      const payload = { actorId: user.id, title: reminderForm.title, notes: reminderForm.notes || null, dueDate: dueDate.toISOString(), leadId: reminderForm.leadId || null };
      if (editingReminder) {
        const updated = await apiRequest<RepReminder>(`/rep/reminders/${editingReminder.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        setReminders(prev => prev.map(r => r.id === editingReminder.id ? updated : r));
        toast({ title: "Reminder updated" });
      } else {
        const created = await apiRequest<RepReminder>("/rep/reminders", { method: "POST", body: JSON.stringify(payload) });
        setReminders(prev => [created, ...prev]);
        toast({ title: "Reminder set" });
      }
      setShowReminderForm(false); setEditingReminder(null);
    } catch (err: any) { toast({ title: err.message || "Failed to save reminder", variant: "destructive" }); }
    finally { setSavingReminder(false); }
  }

  async function handleToggleReminder(r: RepReminder) {
    if (!user) return;
    try {
      const updated = await apiRequest<RepReminder>(`/rep/reminders/${r.id}`, { method: "PATCH", body: JSON.stringify({ actorId: user.id, completed: !r.completed }) });
      setReminders(prev => prev.map(x => x.id === r.id ? updated : x));
    } catch { toast({ title: "Failed to update reminder", variant: "destructive" }); }
  }

  async function handleDeleteReminder() {
    if (!deleteReminderConfirm || !user) return;
    try {
      await apiRequest(`/rep/reminders/${deleteReminderConfirm}?actorId=${user.id}`, { method: "DELETE" });
      setReminders(prev => prev.filter(r => r.id !== deleteReminderConfirm));
      setDeleteReminderConfirm(null);
      toast({ title: "Reminder deleted" });
    } catch { toast({ title: "Failed to delete reminder", variant: "destructive" }); }
  }

  function copyLink(link: string) { navigator.clipboard.writeText(link); toast({ title: "Link copied to clipboard" }); }

  async function handleRepPurchase(amount: number) {
    if (!user) return;
    setPurchaseLoading(amount);
    try {
      const res = await fetch("/api/credits/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, amount, returnPath: "/rep" }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast({ title: data.error || "Failed to start checkout", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to initiate purchase", variant: "destructive" });
    } finally {
      setPurchaseLoading(null);
    }
  }

  // Stats
  const statsNew = leads.filter(l => l.status === "New").length;
  const statsInProgress = leads.filter(l => (IN_PROGRESS_STATUSES as string[]).includes(l.status)).length;
  const statsApproved = leads.filter(l => l.status === "Approved").length;
  const statsDeclined = leads.filter(l => l.status === "Declined").length;
  const totalClosed = statsApproved + statsDeclined;
  const winRate = totalClosed > 0 ? Math.round((statsApproved / totalClosed) * 100) : 0;
  const overdueReminders = reminders.filter(r => !r.completed && new Date(r.dueDate) < new Date()).length;
  const pendingReminders = reminders.filter(r => !r.completed).length;

  const filteredLeads = leads.filter(l => {
    const matchesSearch = !search || l.tenantName.toLowerCase().includes(search.toLowerCase()) || l.propertyAddress.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || l.status === statusFilter ||
      ((IN_PROGRESS_STATUSES as string[]).includes(statusFilter) && (IN_PROGRESS_STATUSES as string[]).includes(l.status));
    return matchesSearch && matchesStatus;
  });

  const filteredLocations = locations.filter(loc =>
    !search || loc.propertyAddress.toLowerCase().includes(search.toLowerCase()) || loc.landlordName.toLowerCase().includes(search.toLowerCase())
  );

  const filteredReminders = reminders.filter(r => {
    if (reminderFilter === "pending") return !r.completed;
    if (reminderFilter === "completed") return r.completed;
    return true;
  });

  if (!user || !["rep", "admin", "manager"].includes(user.role)) return null;

  const currentLocationTenants = selectedLocation ? (locationTenants[selectedLocation.id] || []) : [];
  const hasDeclinedTenant = currentLocationTenants.some(t => t.status === "Declined");
  const hasApprovedTenant = currentLocationTenants.some(t => t.status === "Approved");

  function getLocationStatus(tenants: RgLead[]) {
    if (tenants.length === 0) return { label: "No tenants", color: "text-gray-400" };
    const active = tenants.find(t => t.status !== "Declined");
    if (!active) return { label: "All declined", color: "text-red-600" };
    if (active.status === "Approved") return { label: "Approved", color: "text-green-600" };
    return { label: active.status, color: "text-blue-600" };
  }

  return (
    <div className={embedded ? "" : "min-h-screen bg-gray-50"}>
      <div className={embedded ? "" : "max-w-7xl mx-auto px-4 py-8"}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          {!embedded && (
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 rounded-lg p-2"><Home className="h-6 w-6 text-white" /></div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Rent Guarantee Portal</h1>
                <p className="text-sm text-gray-500">{isAdminOrManager ? "All Rep Leads" : `Welcome, ${user.name}`}</p>
              </div>
            </div>
          )}
          {embedded && (
            <p className="text-sm text-gray-500">{isAdminOrManager ? "Showing all rep leads" : `Welcome, ${user.name}`}</p>
          )}
          <div className="flex gap-2">
            {overdueReminders > 0 && isRep && rgPerm("canManageReminders") && (
              <button onClick={() => setActiveTab("reminders")} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded-lg hover:bg-red-100 transition-colors" data-testid="badge-overdue-reminders">
                <BellRing className="h-3.5 w-3.5" /> {overdueReminders} overdue
              </button>
            )}
            <Button variant="outline" size="sm" onClick={loadAll} data-testid="button-refresh"><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>
            {rgPerm("canAddLocations") && <Button size="sm" onClick={openNewLocation} data-testid="button-add-location"><Plus className="h-4 w-4 mr-1" /> New Location</Button>}
          </div>
        </div>

        {/* Fund success banner */}
        {fundSuccessMessage && !embedded && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3" data-testid="banner-fund-success">
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
            <p className="text-green-800 text-sm font-medium flex-1">{fundSuccessMessage}</p>
            <button onClick={() => setFundSuccessMessage(null)} className="text-green-600 hover:text-green-800"><X className="h-4 w-4" /></button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white border rounded-lg p-1 w-fit">
          {([
            { id: "overview", icon: <BarChart3 className="h-3.5 w-3.5" />, label: "Overview" },
            { id: "locations", icon: <MapPin className="h-3.5 w-3.5" />, label: `Locations (${locations.length})` },
            { id: "leads", icon: null, label: `All Leads (${leads.length})` },
            ...((isRep && rgPerm("canManageReminders")) || isAdminOrManager ? [{ id: "reminders", icon: <Bell className="h-3.5 w-3.5" />, label: `Reminders${pendingReminders > 0 ? ` (${pendingReminders})` : ""}` }] : []),
          ] as { id: ActiveTab; icon: React.ReactNode; label: string }[]).map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); if (tab.id === "locations") setLocationView("list"); }} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${activeTab === tab.id ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`} data-testid={`tab-${tab.id}`}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {/* ===== OVERVIEW TAB ===== */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Account Balance Card — reps only */}
            {isRep && (
              <div className="bg-white border rounded-xl p-5 flex items-center justify-between" data-testid="card-rep-balance">
                <div className="flex items-center gap-4">
                  <div className="bg-green-100 rounded-xl p-3"><DollarSign className="h-6 w-6 text-green-600" /></div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Account Balance</p>
                    <p className="text-3xl font-bold text-green-700" data-testid="text-rep-balance">${parseFloat(user.balance || "0").toFixed(2)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Available funds</p>
                  </div>
                </div>
                <Button onClick={() => setShowFundAccount(true)} className="bg-green-600 hover:bg-green-700 text-white" data-testid="button-fund-account">
                  <CreditCard className="h-4 w-4 mr-2" /> Fund Account
                </Button>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <BigStatCard
                label="Total RG Leads"
                value={leads.length}
                sub={`across ${locations.length} ${locations.length === 1 ? "location" : "locations"}`}
                icon={<Home className="h-4 w-4 text-violet-600" />}
                iconBg="bg-violet-100"
                valueColor="text-violet-700"
                onClick={() => { setActiveTab("leads"); setStatusFilter("all"); }}
              />
              <BigStatCard
                label="New Assigned Leads"
                value={statsNew}
                sub="awaiting action"
                icon={<UserPlus className="h-4 w-4 text-blue-600" />}
                iconBg="bg-blue-100"
                valueColor="text-blue-700"
                onClick={() => { setActiveTab("leads"); setStatusFilter("New"); }}
              />
              <BigStatCard
                label="In Progress"
                value={statsInProgress}
                sub="active applications"
                icon={<Clock className="h-4 w-4 text-orange-600" />}
                iconBg="bg-orange-100"
                valueColor="text-orange-700"
                onClick={() => { setActiveTab("leads"); setStatusFilter("Contacted"); }}
              />
              <BigStatCard
                label="Approved"
                value={statsApproved}
                sub={winRate > 0 ? `${winRate}% win rate` : `${totalClosed} closed`}
                icon={<CheckCircle2 className="h-4 w-4 text-green-600" />}
                iconBg="bg-green-100"
                valueColor="text-green-700"
                onClick={() => { setActiveTab("leads"); setStatusFilter("Approved"); }}
              />
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white border rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-900 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-blue-600" /> Recent Locations</h2>
                  <button onClick={() => setActiveTab("locations")} className="text-xs text-blue-600 hover:underline">View all</button>
                </div>
                {locations.length === 0 ? (
                  <div className="text-center py-6"><p className="text-sm text-gray-400 mb-3">No locations yet</p><Button size="sm" variant="outline" onClick={openNewLocation}><Plus className="h-3.5 w-3.5 mr-1" /> Add Location</Button></div>
                ) : (
                  <div className="space-y-2">
                    {locations.slice(0, 5).map(loc => {
                      const tenants = locationTenants[loc.id] || [];
                      const status = getLocationStatus(tenants);
                      return (
                        <div key={loc.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => { setActiveTab("locations"); openLocation(loc); }} data-testid={`overview-location-${loc.id}`}>
                          <div><p className="text-sm font-medium text-gray-900">{loc.propertyAddress}{loc.unit ? ` — Unit ${loc.unit}` : ""}</p><p className="text-xs text-gray-400">Landlord: {loc.landlordName}</p></div>
                          <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              {isRep && (
                <div className="bg-white border rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-gray-900 flex items-center gap-2"><AlarmClock className="h-4 w-4 text-blue-600" /> Upcoming Reminders</h2>
                    <button onClick={() => setActiveTab("reminders")} className="text-xs text-blue-600 hover:underline">View all</button>
                  </div>
                  {reminders.filter(r => !r.completed).length === 0 ? (
                    <div className="text-center py-6"><p className="text-sm text-gray-400 mb-3">No pending reminders</p><Button size="sm" variant="outline" onClick={() => openNewReminder()}><Plus className="h-3.5 w-3.5 mr-1" /> Add Reminder</Button></div>
                  ) : (
                    <div className="space-y-2">
                      {reminders.filter(r => !r.completed).slice(0, 5).map(r => {
                        const due = new Date(r.dueDate);
                        const isOverdue = due < new Date();
                        return (
                          <div key={r.id} className={`flex items-center gap-2.5 p-2.5 rounded-lg ${isOverdue ? "bg-red-50" : "hover:bg-gray-50"}`}>
                            <button onClick={() => handleToggleReminder(r)} className="h-4 w-4 rounded-full border-2 border-gray-300 hover:border-blue-500 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{r.title}</p>
                              <p className={`text-xs ${isOverdue ? "text-red-600 font-medium" : "text-gray-400"}`}>{isOverdue ? "Overdue · " : ""}{due.toLocaleDateString("en-CA", { month: "short", day: "numeric" })}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== LOCATIONS TAB ===== */}
        {activeTab === "locations" && (
          <div>
            {locationView === "list" ? (
              <>
                <div className="flex gap-3 mb-4">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input placeholder="Search locations..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" data-testid="input-search-locations" />
                  </div>
                </div>
                {loading ? (
                  <div className="text-center py-12 text-gray-500">Loading...</div>
                ) : filteredLocations.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-xl border">
                    <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No locations yet</p>
                    <p className="text-gray-400 text-sm mb-4">Create a location for each rental property</p>
                    {rgPerm("canAddLocations") && <Button onClick={openNewLocation} size="sm"><Plus className="h-4 w-4 mr-1" /> New Location</Button>}
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {filteredLocations.map(loc => {
                      const tenants = locationTenants[loc.id] || [];
                      const status = getLocationStatus(tenants);
                      const allDeclined = tenants.length > 0 && tenants.every(t => t.status === "Declined");
                      return (
                        <div key={loc.id} className={`bg-white border rounded-xl p-4 hover:border-blue-300 hover:shadow-sm cursor-pointer transition-all ${allDeclined ? "border-red-200" : ""}`} onClick={() => openLocation(loc)} data-testid={`location-card-${loc.id}`}>
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-start gap-3">
                              <div className={`rounded-lg p-2 mt-0.5 ${allDeclined ? "bg-red-50" : "bg-blue-50"}`}>
                                <Building2 className={`h-5 w-5 ${allDeclined ? "text-red-500" : "text-blue-600"}`} />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{loc.propertyAddress}</p>
                                {loc.unit && <p className="text-xs text-gray-500">Unit {loc.unit}</p>}
                              </div>
                            </div>
                            <div className="flex gap-1.5">
                              {allDeclined && rgPerm("canAddTenants") && (
                                <button onClick={e => { e.stopPropagation(); openAddTenant(loc); }} className="flex items-center gap-1 text-xs px-2.5 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium" data-testid={`button-add-tenant-declined-${loc.id}`}>
                                  <UserPlus className="h-3.5 w-3.5" /> New Tenant
                                </button>
                              )}
                              {tenants.length > 0 && (
                                <button onClick={e => { e.stopPropagation(); const active = tenants.find(t => t.status !== "Declined") || tenants[0]; openLead(active); }} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500" title="View lead detail" data-testid={`button-view-lead-${loc.id}`}><Eye className="h-3.5 w-3.5" /></button>
                              )}
                              {rgPerm("canEditLocations") && <button onClick={e => openEditLocation(loc, e)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400" data-testid={`button-edit-location-${loc.id}`}><Pencil className="h-3.5 w-3.5" /></button>}
                            </div>
                          </div>
                          <div className="space-y-1.5 text-xs text-gray-500">
                            <div className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Landlord: <span className="font-medium text-gray-700">{loc.landlordName}</span></div>
                            <div className="flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5" /> ${Number(loc.monthlyRent).toLocaleString()}/month</div>
                          </div>
                          <div className="flex items-center justify-between mt-3 pt-3 border-t">
                            <div className="flex gap-1.5 flex-wrap">
                              {tenants.length === 0 ? <span className="text-xs text-gray-400 italic">No tenants yet</span> : tenants.map(t => (
                                <span key={t.id} className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[t.status as Status]}`}>{t.tenantName.split(" ")[0]}: {t.status}</span>
                              ))}
                            </div>
                            <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              selectedLocation && (
                <div>
                  <button onClick={() => { setLocationView("list"); setSelectedLocation(null); }} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4" data-testid="button-back-to-locations">
                    <ChevronRight className="h-4 w-4 rotate-180" /> Back to Locations
                  </button>

                  {/* Location header */}
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-xl p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Building2 className="h-5 w-5 text-blue-200 flex-shrink-0" />
                          <h2 className="text-xl font-bold truncate">{selectedLocation.propertyAddress}</h2>
                          {selectedLocation.unit && <span className="text-blue-200 text-sm">Unit {selectedLocation.unit}</span>}
                        </div>
                        <p className="text-blue-100 text-sm">Landlord: {selectedLocation.landlordName}</p>
                        {selectedLocation.applicationNumber && (
                          <span className="mt-2 inline-block text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-mono">{selectedLocation.applicationNumber}</span>
                        )}
                      </div>
                      {rgPerm("canEditLocations") && (
                        <div className="flex gap-1.5 flex-shrink-0 ml-2">
                          <button onClick={e => openEditLocation(selectedLocation, e)} className="p-2 bg-blue-500/40 rounded-lg hover:bg-blue-500/60 text-white" data-testid="button-edit-location-detail"><Pencil className="h-4 w-4" /></button>
                          <button onClick={() => setDeleteLocationConfirm(selectedLocation.id)} className="p-2 bg-red-500/40 rounded-lg hover:bg-red-500/60 text-white" data-testid="button-delete-location"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-3 mt-3 text-xs text-blue-100 flex-wrap">
                      <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" />${Number(selectedLocation.monthlyRent).toLocaleString()}/mo</span>
                      {selectedLocation.moveInDate && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{selectedLocation.moveInDate}</span>}
                      {selectedLocation.landlordPhone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{selectedLocation.landlordPhone}</span>}
                      {selectedLocation.landlordEmail && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{selectedLocation.landlordEmail}</span>}
                    </div>
                  </div>

                  {/* Status + actions bar */}
                  <div className="bg-white border-x border-b px-4 py-3 flex items-center justify-between flex-wrap gap-2 rounded-b-xl mb-4 shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Status:</span>
                      <Select value={selectedLocation.status || "New"} onValueChange={handleLocationStatusChange} disabled={updatingLocationStatus}>
                        <SelectTrigger className="h-7 text-xs border-none bg-transparent p-0 w-auto gap-1 font-medium" data-testid="select-location-status">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[(selectedLocation.status || "New") as Status]}`}>{selectedLocation.status || "New"}</span>
                        </SelectTrigger>
                        <SelectContent>{Object.keys(STATUS_COLORS).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {(isAdminOrManager || (isRep && rgPerm("canManageReminders"))) && (
                        <Button size="sm" variant="outline" onClick={() => openNewReminder(`Follow up · ${selectedLocation.propertyAddress}`)} data-testid="button-remind-location">
                          <Bell className="h-3.5 w-3.5 mr-1" /> Remind
                        </Button>
                      )}
                      {rgPerm("canRequestDocs") && (
                        <Button size="sm" variant="outline" onClick={() => {
                          const firstTenant = currentLocationTenants.find(t => t.status !== "Declined") || currentLocationTenants[0];
                          if (firstTenant) {
                            setShowDocRequest(true);
                            setDocReqForm({ recipientType: "tenant", recipientName: firstTenant.tenantName, recipientEmail: firstTenant.tenantEmail, requiredDocs: [], expiresInDays: 7 });
                            setCreatedLink(null);
                            openLead(firstTenant);
                          } else {
                            openAddTenant(selectedLocation);
                          }
                        }} data-testid="button-request-docs-location">
                          <Send className="h-3.5 w-3.5 mr-1" /> Request Docs
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
                    <button onClick={() => setLocationDetailTab("info")} className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${locationDetailTab === "info" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`} data-testid="tab-loc-info">
                      Info
                    </button>
                    {rgPerm("canViewPricing") && (
                      <button onClick={() => setLocationDetailTab("pricing")} className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-1 ${locationDetailTab === "pricing" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`} data-testid="tab-loc-pricing">
                        <Calculator className="h-3.5 w-3.5" /> Pricing
                      </button>
                    )}
                    <button onClick={() => setLocationDetailTab("docs")} className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${locationDetailTab === "docs" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`} data-testid="tab-loc-docs">
                      Documents ({locationDocs.length})
                    </button>
                  </div>

                  {/* INFO TAB */}
                  {locationDetailTab === "info" && (
                    <div className="space-y-4">
                      <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-600">Property & Landlord</CardTitle></CardHeader>
                        <CardContent className="text-sm space-y-1">
                          <p><span className="text-gray-500">Address:</span> <strong>{selectedLocation.propertyAddress}{selectedLocation.unit ? `, Unit ${selectedLocation.unit}` : ""}</strong></p>
                          <p><span className="text-gray-500">Monthly Rent:</span> ${Number(selectedLocation.monthlyRent).toLocaleString()}/month</p>
                          {selectedLocation.moveInDate && <p><span className="text-gray-500">Move-In Date:</span> {selectedLocation.moveInDate}</p>}
                          <p><span className="text-gray-500">Landlord:</span> {selectedLocation.landlordName}</p>
                          {selectedLocation.landlordEmail && <p><span className="text-gray-500">Landlord Email:</span> {selectedLocation.landlordEmail}</p>}
                          {selectedLocation.landlordPhone && <p><span className="text-gray-500">Landlord Phone:</span> {selectedLocation.landlordPhone}</p>}
                          {selectedLocation.notes && <p className="mt-2 pt-2 border-t text-gray-600"><span className="text-gray-500">Notes:</span> {selectedLocation.notes}</p>}
                        </CardContent>
                      </Card>

                      {/* Doc requests summary in info tab */}
                      {locationDocRequests.length > 0 && (
                        <Card>
                          <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-600">Document Requests</CardTitle></CardHeader>
                          <CardContent className="space-y-2">
                            {locationDocRequests.map(req => {
                              const link = `${window.location.origin}/doc-upload/${req.token}`;
                              const expired = req.expiresAt && new Date(req.expiresAt) < new Date();
                              return (
                                <div key={req.id} className="bg-gray-50 rounded-lg p-3 text-sm">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-medium capitalize">{req.recipientType}: {req.recipientName}</span>
                                    {expired ? <span className="text-xs text-red-600 font-medium">Expired</span> : <span className="text-xs text-green-600 font-medium">Active</span>}
                                  </div>
                                  <div className="flex gap-2 mt-1">
                                    <button onClick={() => copyLink(link)} className="flex items-center gap-1 text-xs text-blue-600 hover:underline"><Copy className="h-3 w-3" /> Copy link</button>
                                    <a href={link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:underline"><ExternalLink className="h-3 w-3" /> Open</a>
                                  </div>
                                </div>
                              );
                            })}
                          </CardContent>
                        </Card>
                      )}

                      {/* Tenant list */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <User className="h-4 w-4 text-blue-600" /> Tenant Applications
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{currentLocationTenants.length}</span>
                          </h3>
                          {rgPerm("canAddTenants") && <Button size="sm" onClick={() => openAddTenant(selectedLocation)} data-testid="button-add-tenant-to-location"><UserPlus className="h-3.5 w-3.5 mr-1" /> Add Tenant</Button>}
                        </div>
                        {hasDeclinedTenant && !hasApprovedTenant && (
                          <div className="mb-3 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="font-semibold text-red-800 text-sm">Tenant Declined</p>
                              <p className="text-red-700 text-xs mt-0.5">Add a new tenant for this property.</p>
                              <Button size="sm" className="mt-2 bg-red-600 hover:bg-red-700 text-white" onClick={() => openAddTenant(selectedLocation)} data-testid="button-replace-tenant">
                                <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Add New Tenant <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                              </Button>
                            </div>
                          </div>
                        )}
                        {currentLocationTenants.length === 0 ? (
                          <div className="text-center py-10 border-2 border-dashed rounded-xl">
                            <User className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                            <p className="text-gray-500 text-sm font-medium">No tenants yet</p>
                            {rgPerm("canAddTenants") && <Button size="sm" onClick={() => openAddTenant(selectedLocation)} className="mt-3" data-testid="button-first-tenant"><UserPlus className="h-4 w-4 mr-1" /> Add First Tenant</Button>}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {currentLocationTenants.map((tenant, idx) => (
                              <div key={tenant.id} className={`border rounded-xl p-4 cursor-pointer hover:shadow-sm transition-all ${tenant.status === "Declined" ? "border-red-200 bg-red-50/30 opacity-80" : tenant.status === "Approved" ? "border-green-200 bg-green-50/30" : "hover:border-blue-300"}`} onClick={() => openLead(tenant)} data-testid={`tenant-card-${tenant.id}`}>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${tenant.status === "Declined" ? "bg-red-100 text-red-600" : tenant.status === "Approved" ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"}`}>{idx + 1}</div>
                                    <div>
                                      <p className="font-semibold text-gray-900">{tenant.tenantName}</p>
                                      <p className="text-xs text-gray-500">{tenant.tenantEmail} · {tenant.employmentStatus}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                    <Select value={tenant.status} onValueChange={v => handleStatusChange(tenant.id, v)} disabled={updatingStatus}>
                                      <SelectTrigger className={`h-7 text-xs px-2 py-0.5 rounded-full border-0 font-medium w-auto ${STATUS_COLORS[tenant.status as Status]}`} data-testid={`select-inline-status-${tenant.id}`}>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>{Object.keys(STATUS_COLORS).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <ChevronRight className="h-4 w-4 text-gray-400" />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* PRICING TAB */}
                  {locationDetailTab === "pricing" && (
                    <PricingTab
                      monthlyRent={Number(selectedLocation.monthlyRent)}
                      markupPercent={0}
                      baseAnnualRate={Number(selectedLocation.annualRatePercent) || globalRgRates.annualRate}
                      baseMonthlyRate={Number(selectedLocation.monthlyRatePercent) || globalRgRates.monthlyRate}
                      onSaveRates={rgPerm("canEditPricing") ? handleSaveLocationRates : undefined}
                      paymentLink={selectedLocation.paymentLink}
                      onSavePaymentLink={rgPerm("canEditPricing") ? handleSaveLocationPaymentLink : undefined}
                    />
                  )}

                  {/* DOCUMENTS TAB */}
                  {locationDetailTab === "docs" && (
                    <div>
                      {locationDocRequests.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Document Requests</p>
                          <div className="space-y-2">
                            {locationDocRequests.map(req => {
                              const link = `${window.location.origin}/doc-upload/${req.token}`;
                              const expired = req.expiresAt && new Date(req.expiresAt) < new Date();
                              return (
                                <div key={req.id} className="bg-white border rounded-lg p-3 text-sm">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-medium capitalize">{req.recipientType}: {req.recipientName}</span>
                                    {expired ? <span className="text-xs text-red-600 font-medium">Expired</span> : <span className="text-xs text-green-600 font-medium">Active</span>}
                                  </div>
                                  <div className="flex gap-2 mt-1">
                                    <button onClick={() => copyLink(link)} className="flex items-center gap-1 text-xs text-blue-600 hover:underline"><Copy className="h-3 w-3" /> Copy link</button>
                                    <a href={link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:underline"><ExternalLink className="h-3 w-3" /> Open</a>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {locationDocs.length === 0 && locationDocRequests.length === 0 ? (
                        <div className="text-center py-12"><FileText className="h-10 w-10 text-gray-300 mx-auto mb-2" /><p className="text-gray-500 text-sm">No documents yet</p><p className="text-gray-400 text-xs mt-1">Request documents from tenants to see them here</p></div>
                      ) : locationDocs.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Uploaded Documents</p>
                          <div className="space-y-2">
                            {locationDocs.map(doc => (
                              <div key={doc.id} className="bg-white border rounded-lg p-3 flex items-center justify-between">
                                <div className="flex items-center gap-3"><FileText className="h-5 w-5 text-blue-500" /><div><p className="text-sm font-medium">{doc.fileName}</p><p className="text-xs text-gray-500">{doc.docType}</p></div></div>
                                <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded hover:bg-gray-100 text-gray-500"><Eye className="h-4 w-4" /></a>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        )}

        {/* ===== ALL LEADS TAB ===== */}
        {activeTab === "leads" && (
          <div>
            {/* Quick stat filter pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {[
                { label: "All Leads", count: leads.length, value: "all", color: "bg-gray-50 border-gray-200 hover:border-gray-400", activeColor: "bg-gray-900 text-white border-gray-900", textColor: "text-gray-700" },
                { label: "New", count: statsNew, value: "New", color: "bg-blue-50 border-blue-200 hover:border-blue-400", activeColor: "bg-blue-600 text-white border-blue-600", textColor: "text-blue-700" },
                { label: "In Progress", count: statsInProgress, value: "__inprogress__", color: "bg-orange-50 border-orange-200 hover:border-orange-400", activeColor: "bg-orange-500 text-white border-orange-500", textColor: "text-orange-700" },
                { label: "Approved", count: statsApproved, value: "Approved", color: "bg-green-50 border-green-200 hover:border-green-400", activeColor: "bg-green-600 text-white border-green-600", textColor: "text-green-700" },
              ].map(pill => {
                const isActive = pill.value === "__inprogress__"
                  ? (IN_PROGRESS_STATUSES as string[]).includes(statusFilter)
                  : statusFilter === pill.value;
                return (
                  <button
                    key={pill.value}
                    onClick={() => {
                      if (pill.value === "__inprogress__") {
                        setStatusFilter("Contacted");
                      } else {
                        setStatusFilter(pill.value);
                      }
                    }}
                    className={`rounded-xl border p-3 text-left transition-all ${isActive ? pill.activeColor : pill.color}`}
                    data-testid={`pill-filter-${pill.value}`}
                  >
                    <p className={`text-2xl font-bold ${isActive ? "" : pill.textColor}`}>{pill.count}</p>
                    <p className={`text-xs font-medium mt-0.5 ${isActive ? "opacity-80" : "text-gray-500"}`}>{pill.label}</p>
                  </button>
                );
              })}
            </div>

            {/* Search + status filter bar */}
            <div className="flex gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Search by tenant name or property..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" data-testid="input-search-leads" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-44" data-testid="select-status-filter"><SelectValue placeholder="All statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {Object.keys(STATUS_COLORS).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {loading ? <div className="text-center py-12 text-gray-500">Loading...</div> : filteredLeads.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border"><Home className="h-12 w-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500 font-medium">No leads found</p><p className="text-sm text-gray-400 mt-1">{statusFilter !== "all" ? "Try changing the status filter" : "Add tenants from the Locations tab"}</p></div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-gray-400 mb-2">{filteredLeads.length} lead{filteredLeads.length !== 1 ? "s" : ""} shown</p>
                {filteredLeads.map(lead => {
                  const loc = locations.find(l => l.id === lead.locationId);
                  return (
                    <div key={lead.id} className="bg-white border rounded-xl p-4 hover:border-blue-300 hover:shadow-sm cursor-pointer transition-all" onClick={() => openLead(lead)} data-testid={`lead-row-${lead.id}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1 min-w-0">
                          <div className="bg-blue-50 rounded-lg p-2.5 flex-shrink-0 mt-0.5"><Home className="h-5 w-5 text-blue-600" /></div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-gray-900">{lead.tenantName}</p>
                              <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${STATUS_COLORS[lead.status as Status]}`}>{lead.status}</span>
                            </div>
                            <p className="text-sm text-gray-500 mt-0.5">{lead.propertyAddress || loc?.propertyAddress || "—"}{loc?.unit ? ` · Unit ${loc.unit}` : ""}</p>
                            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                              {lead.landlordName && <p className="text-xs text-gray-400">Landlord: {lead.landlordName}</p>}
                              <p className="text-xs text-gray-400">Rent: ${Number(lead.monthlyRent || 0).toLocaleString()}/mo</p>
                              {lead.moveInDate && <p className="text-xs text-gray-400">Move-in: {new Date(lead.moveInDate).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}</p>}
                              {lead.tenantPhone && <p className="text-xs text-gray-400">{lead.tenantPhone}</p>}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className="text-xs text-gray-400">{new Date(lead.createdAt).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}</span>
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===== REMINDERS TAB ===== */}
        {activeTab === "reminders" && (isRep || isAdminOrManager) && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-1 bg-white border rounded-lg p-1">
                {(["pending", "completed", "all"] as const).map(f => (
                  <button key={f} onClick={() => setReminderFilter(f)} className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${reminderFilter === f ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`} data-testid={`filter-reminders-${f}`}>
                    {f} {f === "pending" ? `(${reminders.filter(r => !r.completed).length})` : f === "completed" ? `(${reminders.filter(r => r.completed).length})` : ""}
                  </button>
                ))}
              </div>
              <Button size="sm" onClick={() => openNewReminder()} data-testid="button-new-reminder"><Plus className="h-4 w-4 mr-1" /> New Reminder</Button>
            </div>
            <div className="mb-4 flex flex-wrap gap-2">
              {REMINDER_PRESETS.map(preset => (
                <button key={preset} onClick={() => openNewReminder(preset)} className="text-xs px-3 py-1.5 border border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" data-testid={`preset-reminder-${preset.toLowerCase().replace(/\s+/g, "-")}`}>+ {preset}</button>
              ))}
            </div>
            {filteredReminders.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border"><Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500 font-medium">No {reminderFilter !== "all" ? reminderFilter : ""} reminders</p><Button onClick={() => openNewReminder()} size="sm" className="mt-4"><Plus className="h-4 w-4 mr-1" /> Set a Reminder</Button></div>
            ) : (
              <div className="space-y-2">
                {filteredReminders.map(r => {
                  const due = new Date(r.dueDate);
                  const isOverdue = !r.completed && due < new Date();
                  const isDueToday = !r.completed && due.toDateString() === new Date().toDateString();
                  const linkedLead = leads.find(l => l.id === r.leadId);
                  return (
                    <div key={r.id} className={`bg-white border rounded-xl p-4 flex gap-3 transition-all ${r.completed ? "opacity-60" : isOverdue ? "border-red-300 bg-red-50/30" : isDueToday ? "border-amber-300 bg-amber-50/30" : ""}`} data-testid={`reminder-card-${r.id}`}>
                      <button onClick={() => handleToggleReminder(r)} className={`mt-0.5 flex-shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${r.completed ? "bg-green-500 border-green-500" : "border-gray-300 hover:border-blue-500"}`} data-testid={`button-toggle-reminder-${r.id}`}>
                        {r.completed && <Check className="h-3 w-3 text-white" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm ${r.completed ? "line-through text-gray-400" : "text-gray-900"}`}>{r.title}</p>
                        {r.notes && <p className="text-xs text-gray-500 mt-0.5 truncate">{r.notes}</p>}
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <span className={`text-xs flex items-center gap-1 ${isOverdue ? "text-red-600 font-medium" : isDueToday ? "text-amber-600 font-medium" : "text-gray-400"}`}>
                            <Clock className="h-3 w-3" />{isOverdue ? "Overdue · " : isDueToday ? "Due today · " : ""}{due.toLocaleDateString("en-CA", { month: "short", day: "numeric" })} at {due.toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {linkedLead && <span className="text-xs text-blue-600 flex items-center gap-1"><Home className="h-3 w-3" />{linkedLead.tenantName}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => openEditReminder(r)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600" data-testid={`button-edit-reminder-${r.id}`}><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => setDeleteReminderConfirm(r.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500" data-testid={`button-delete-reminder-${r.id}`}><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===== LEAD DETAIL PANEL ===== */}
      {selectedLead && (
        <div className="fixed inset-0 top-16 z-40 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelectedLead(null)} />
          <div className="w-full max-w-md bg-white shadow-2xl overflow-y-auto flex flex-col">
            {/* Header */}
            <div className="p-4 border-b flex items-start justify-between bg-gradient-to-r from-blue-600 to-blue-700 text-white">
              <div className="flex-1 min-w-0 pr-3">
                <h2 className="text-base font-bold truncate">{selectedLead.tenantName}</h2>
                <p className="text-blue-100 text-xs mt-0.5 truncate">{selectedLead.propertyAddress}</p>
                <p className="text-blue-200 text-xs">${Number(selectedLead.monthlyRent).toLocaleString()}/month</p>
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg px-3 py-1.5 text-xs font-semibold flex-shrink-0 transition-colors"
                data-testid="button-close-lead"
              >
                <X className="h-3.5 w-3.5" /> Close
              </button>
            </div>

            {/* Status + actions bar */}
            <div className="px-5 py-3 border-b bg-gray-50 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Status:</span>
                <Select value={selectedLead.status} onValueChange={v => handleStatusChange(selectedLead.id, v)} disabled={updatingStatus}>
                  <SelectTrigger className="h-7 text-xs border-none bg-transparent p-0 w-auto gap-1 font-medium" data-testid="select-lead-status">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[selectedLead.status as Status]}`}>{selectedLead.status}</span>
                  </SelectTrigger>
                  <SelectContent>{Object.keys(STATUS_COLORS).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={openEditLead} data-testid="button-edit-lead">
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                </Button>
                {isRep && (
                  <Button size="sm" variant="outline" onClick={() => { openNewReminder(`Follow up · ${selectedLead.tenantName}`); setSelectedLead(null); }} data-testid="button-set-reminder-lead">
                    <Bell className="h-3.5 w-3.5 mr-1" /> Remind
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => { setShowDocRequest(true); setDocReqForm({ recipientType: "tenant", recipientName: selectedLead.tenantName, recipientEmail: selectedLead.tenantEmail, requiredDocs: [], expiresInDays: 7 }); setCreatedLink(null); }} data-testid="button-send-doc-request">
                  <Send className="h-3.5 w-3.5 mr-1" /> Request Docs
                </Button>
                <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => setDeleteLeadConfirm(selectedLead.id)} data-testid="button-delete-lead"><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>

            {/* Declined alert */}
            {selectedLead.status === "Declined" && selectedLead.locationId && (
              <div className="mx-5 mt-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-800">This tenant was declined</p>
                  <button onClick={() => { const loc = locations.find(l => l.id === selectedLead.locationId); if (loc) { setSelectedLead(null); openAddTenant(loc); } }} className="mt-2 flex items-center gap-1.5 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-lg transition-colors" data-testid="button-add-new-tenant-from-declined">
                    <UserPlus className="h-3.5 w-3.5" /> Add New Tenant for This Property
                  </button>
                </div>
              </div>
            )}

            {/* Detail tabs */}
            <div className="flex gap-1 px-5 pt-4">
              <button onClick={() => setDetailTab("info")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${detailTab === "info" ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:bg-gray-100"}`} data-testid="tab-lead-info">Info</button>
              {rgPerm("canViewPricing") && (
                <button onClick={() => setDetailTab("pricing")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${detailTab === "pricing" ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:bg-gray-100"}`} data-testid="tab-lead-pricing">
                  <Calculator className="h-3.5 w-3.5" /> Pricing
                </button>
              )}
              <button onClick={() => setDetailTab("docs")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${detailTab === "docs" ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:bg-gray-100"}`} data-testid="tab-lead-docs">Documents ({documents.length})</button>
            </div>

            <div className="flex-1 p-5">
              {/* INFO TAB */}
              {detailTab === "info" && (
                <div className="space-y-4">
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-600">Tenant</CardTitle></CardHeader>
                    <CardContent className="text-sm space-y-1">
                      <p><span className="text-gray-500">Name:</span> <strong>{selectedLead.tenantName}</strong></p>
                      <p><span className="text-gray-500">Email:</span> {selectedLead.tenantEmail}</p>
                      <p><span className="text-gray-500">Phone:</span> {selectedLead.tenantPhone}</p>
                      <p><span className="text-gray-500">Employment:</span> {selectedLead.employmentStatus}</p>
                      {selectedLead.employerName && <p><span className="text-gray-500">Employer:</span> {selectedLead.employerName}</p>}
                      {selectedLead.householdIncome && <p><span className="text-gray-500">Household Income:</span> ${Number(selectedLead.householdIncome).toLocaleString()}/yr</p>}
                      {selectedLead.paymentMethod && <p><span className="text-gray-500">Payment Method:</span> {selectedLead.paymentMethod}</p>}
                      {selectedLead.coApplicantName && <p><span className="text-gray-500">Co-Applicant:</span> {selectedLead.coApplicantName} ({selectedLead.coApplicantEmail})</p>}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-600">Property & Landlord</CardTitle></CardHeader>
                    <CardContent className="text-sm space-y-1">
                      <p><span className="text-gray-500">Address:</span> <strong>{selectedLead.propertyAddress}</strong></p>
                      <p><span className="text-gray-500">Monthly Rent:</span> ${Number(selectedLead.monthlyRent).toLocaleString()}/month</p>
                      {selectedLead.moveInDate && <p><span className="text-gray-500">Move-In Date:</span> {selectedLead.moveInDate}</p>}
                      <p><span className="text-gray-500">Landlord:</span> {selectedLead.landlordName}</p>
                      {selectedLead.landlordEmail && <p><span className="text-gray-500">Landlord Email:</span> {selectedLead.landlordEmail}</p>}
                      {selectedLead.landlordPhone && <p><span className="text-gray-500">Landlord Phone:</span> {selectedLead.landlordPhone}</p>}
                    </CardContent>
                  </Card>
                  {selectedLead.notes && <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-gray-600">Notes</CardTitle></CardHeader><CardContent className="text-sm text-gray-700">{selectedLead.notes}</CardContent></Card>}
                  {docRequests.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-600">Document Requests Sent</CardTitle></CardHeader>
                      <CardContent className="space-y-2">
                        {docRequests.map(req => {
                          const link = `${window.location.origin}/doc-upload/${req.token}`;
                          const expired = req.expiresAt && new Date(req.expiresAt) < new Date();
                          return (
                            <div key={req.id} className="bg-gray-50 rounded-lg p-3 text-sm">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium capitalize">{req.recipientType}: {req.recipientName}</span>
                                {expired ? <span className="text-xs text-red-600 font-medium">Expired</span> : <span className="text-xs text-green-600 font-medium">Active</span>}
                              </div>
                              <div className="flex gap-2 mt-1">
                                <button onClick={() => copyLink(link)} className="flex items-center gap-1 text-xs text-blue-600 hover:underline"><Copy className="h-3 w-3" /> Copy link</button>
                                <a href={link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:underline"><ExternalLink className="h-3 w-3" /> Open</a>
                              </div>
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* PRICING TAB */}
              {detailTab === "pricing" && (() => {
                const loc = locations.find(l => l.id === selectedLead.locationId);
                return (
                  <PricingTab
                    monthlyRent={Number(selectedLead.monthlyRent)}
                    markupPercent={selectedLead.markupPercent}
                    baseAnnualRate={Number(loc?.annualRatePercent) || globalRgRates.annualRate}
                    baseMonthlyRate={Number(loc?.monthlyRatePercent) || globalRgRates.monthlyRate}
                    onSaveMarkup={rgPerm("canEditPricing") ? handleSaveMarkup : undefined}
                  />
                );
              })()}

              {/* DOCS TAB */}
              {detailTab === "docs" && (
                <div>
                  {documents.length === 0 ? (
                    <div className="text-center py-12"><FileText className="h-10 w-10 text-gray-300 mx-auto mb-2" /><p className="text-gray-500 text-sm">No documents uploaded yet</p></div>
                  ) : (
                    <div className="space-y-2">
                      {documents.map(doc => (
                        <div key={doc.id} className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                          <div className="flex items-center gap-3"><FileText className="h-5 w-5 text-blue-500" /><div><p className="text-sm font-medium">{doc.fileName}</p><p className="text-xs text-gray-500">{doc.docType}</p></div></div>
                          <div className="flex gap-2">
                            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded hover:bg-gray-200 text-gray-500"><Eye className="h-4 w-4" /></a>
                            <button onClick={() => handleDeleteDoc(doc.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500" data-testid={`button-delete-doc-${doc.id}`}><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== EDIT LEAD DIALOG ===== */}
      <Dialog open={showEditLead} onOpenChange={setShowEditLead}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Tenant Details</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Tenant Information</p>
              <div className="space-y-3">
                <div className="space-y-1.5"><Label>Full Name *</Label><Input value={editLeadForm.tenantName} onChange={e => setEditLeadForm(p => ({ ...p, tenantName: e.target.value }))} data-testid="input-edit-tenant-name" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Email *</Label><Input type="email" value={editLeadForm.tenantEmail} onChange={e => setEditLeadForm(p => ({ ...p, tenantEmail: e.target.value }))} data-testid="input-edit-tenant-email" /></div>
                  <div className="space-y-1.5"><Label>Phone *</Label><Input value={editLeadForm.tenantPhone} onChange={e => setEditLeadForm(p => ({ ...p, tenantPhone: e.target.value }))} data-testid="input-edit-tenant-phone" /></div>
                </div>
                <div className="space-y-1.5">
                  <Label>Employment Status *</Label>
                  <Select value={editLeadForm.employmentStatus} onValueChange={v => setEditLeadForm(p => ({ ...p, employmentStatus: v }))}>
                    <SelectTrigger data-testid="select-edit-employment"><SelectValue /></SelectTrigger>
                    <SelectContent>{EMPLOYMENT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Employer Name</Label><Input placeholder="Company or employer" value={editLeadForm.employerName} onChange={e => setEditLeadForm(p => ({ ...p, employerName: e.target.value }))} data-testid="input-edit-employer-name" /></div>
                  <div className="space-y-1.5"><Label>Household Income ($)</Label><Input type="number" placeholder="75000" min={0} value={editLeadForm.householdIncome} onChange={e => setEditLeadForm(p => ({ ...p, householdIncome: e.target.value }))} data-testid="input-edit-household-income" /></div>
                </div>
                <div className="space-y-1.5">
                  <Label>Payment Method</Label>
                  <Select value={editLeadForm.paymentMethod} onValueChange={v => setEditLeadForm(p => ({ ...p, paymentMethod: v }))}>
                    <SelectTrigger data-testid="select-edit-payment-method"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Co-Applicant Name</Label><Input value={editLeadForm.coApplicantName} onChange={e => setEditLeadForm(p => ({ ...p, coApplicantName: e.target.value }))} data-testid="input-edit-coapplicant-name" /></div>
                  <div className="space-y-1.5"><Label>Co-Applicant Email</Label><Input type="email" value={editLeadForm.coApplicantEmail} onChange={e => setEditLeadForm(p => ({ ...p, coApplicantEmail: e.target.value }))} data-testid="input-edit-coapplicant-email" /></div>
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Lease Details</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Monthly Rent ($)</Label><Input type="number" min="0" step="0.01" value={editLeadForm.monthlyRent} onChange={e => setEditLeadForm(p => ({ ...p, monthlyRent: e.target.value }))} data-testid="input-edit-monthly-rent" /></div>
                <div className="space-y-1.5"><Label>Move-In Date</Label><Input type="date" value={editLeadForm.moveInDate} onChange={e => setEditLeadForm(p => ({ ...p, moveInDate: e.target.value }))} data-testid="input-edit-movein" /></div>
              </div>
            </div>
            <div className="space-y-1.5"><Label>Notes</Label><Textarea rows={3} value={editLeadForm.notes} onChange={e => setEditLeadForm(p => ({ ...p, notes: e.target.value }))} data-testid="input-edit-notes" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditLead(false)}>Cancel</Button>
            <Button onClick={handleSaveEditLead} disabled={savingLead} data-testid="button-confirm-edit-lead">{savingLead ? "Saving..." : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== LOCATION FORM DIALOG ===== */}
      <Dialog open={showLocationForm} onOpenChange={setShowLocationForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingLocation ? "Edit Location" : "New Rental Location"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Property Details</p>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5"><Label>Unit # (optional)</Label><Input placeholder="e.g. 4B" value={locationForm.unit} onChange={e => setLocationForm(p => ({ ...p, unit: e.target.value }))} data-testid="input-location-unit" /></div>
                  <div className="col-span-2 space-y-1.5"><Label>Property Address *</Label><Input placeholder="456 Oak Ave, Toronto, ON M6K 2P3" value={locationForm.propertyAddress} onChange={e => setLocationForm(p => ({ ...p, propertyAddress: e.target.value }))} data-testid="input-location-address" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Monthly Rent ($) *</Label><Input type="number" min="0" step="0.01" placeholder="2500" value={locationForm.monthlyRent} onChange={e => setLocationForm(p => ({ ...p, monthlyRent: e.target.value }))} data-testid="input-location-rent" /></div>
                  <div className="space-y-1.5"><Label>Move-In Date</Label><Input type="date" value={locationForm.moveInDate} onChange={e => setLocationForm(p => ({ ...p, moveInDate: e.target.value }))} data-testid="input-location-movein" /></div>
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Landlord Information</p>
              <div className="space-y-3">
                <div className="space-y-1.5"><Label>Landlord Name *</Label><Input placeholder="Full name" value={locationForm.landlordName} onChange={e => setLocationForm(p => ({ ...p, landlordName: e.target.value }))} data-testid="input-location-landlord-name" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Landlord Email</Label><Input type="email" value={locationForm.landlordEmail} onChange={e => setLocationForm(p => ({ ...p, landlordEmail: e.target.value }))} data-testid="input-location-landlord-email" /></div>
                  <div className="space-y-1.5"><Label>Landlord Phone</Label><Input value={locationForm.landlordPhone} onChange={e => setLocationForm(p => ({ ...p, landlordPhone: e.target.value }))} data-testid="input-location-landlord-phone" /></div>
                </div>
              </div>
            </div>
            <div className="space-y-1.5"><Label>Notes</Label><Textarea rows={2} value={locationForm.notes} onChange={e => setLocationForm(p => ({ ...p, notes: e.target.value }))} data-testid="input-location-notes" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLocationForm(false)}>Cancel</Button>
            <Button onClick={handleSaveLocation} disabled={savingLocation} data-testid="button-save-location">{savingLocation ? "Saving..." : editingLocation ? "Update Location" : "Create Location"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== ADD TENANT DIALOG ===== */}
      <Dialog open={showTenantForm} onOpenChange={setShowTenantForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Tenant Application</DialogTitle>
            {tenantTargetLocation && <p className="text-sm text-gray-500 mt-1">{tenantTargetLocation.propertyAddress}{tenantTargetLocation.unit ? ` — Unit ${tenantTargetLocation.unit}` : ""}</p>}
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-[70vh] overflow-y-auto pr-1">
            <div className="space-y-1.5"><Label>Tenant Name *</Label><Input placeholder="Full legal name" value={tenantForm.tenantName} onChange={e => setTenantForm(p => ({ ...p, tenantName: e.target.value }))} data-testid="input-tenant-name" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Email *</Label><Input type="email" value={tenantForm.tenantEmail} onChange={e => setTenantForm(p => ({ ...p, tenantEmail: e.target.value }))} data-testid="input-tenant-email" /></div>
              <div className="space-y-1.5"><Label>Phone *</Label><Input value={tenantForm.tenantPhone} onChange={e => setTenantForm(p => ({ ...p, tenantPhone: e.target.value }))} data-testid="input-tenant-phone" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Employment Status *</Label>
                <Select value={tenantForm.employmentStatus} onValueChange={v => setTenantForm(p => ({ ...p, employmentStatus: v }))}>
                  <SelectTrigger data-testid="select-employment-status"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{EMPLOYMENT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Application Status</Label>
                <Select value={tenantForm.status} onValueChange={v => setTenantForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger data-testid="select-tenant-status"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.keys(STATUS_COLORS).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Employer Name</Label><Input placeholder="Company or employer" value={tenantForm.employerName} onChange={e => setTenantForm(p => ({ ...p, employerName: e.target.value }))} data-testid="input-employer-name" /></div>
              <div className="space-y-1.5"><Label>Household Income ($)</Label><Input type="number" placeholder="75000" min={0} value={tenantForm.householdIncome} onChange={e => setTenantForm(p => ({ ...p, householdIncome: e.target.value }))} data-testid="input-household-income" /></div>
            </div>
            <div className="space-y-1.5">
              <Label>Payment Method</Label>
              <Select value={tenantForm.paymentMethod} onValueChange={v => setTenantForm(p => ({ ...p, paymentMethod: v }))}>
                <SelectTrigger data-testid="select-payment-method"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Co-Applicant Name</Label><Input value={tenantForm.coApplicantName} onChange={e => setTenantForm(p => ({ ...p, coApplicantName: e.target.value }))} data-testid="input-coapplicant-name" /></div>
              <div className="space-y-1.5"><Label>Co-Applicant Email</Label><Input type="email" value={tenantForm.coApplicantEmail} onChange={e => setTenantForm(p => ({ ...p, coApplicantEmail: e.target.value }))} data-testid="input-coapplicant-email" /></div>
            </div>
            <div className="space-y-1.5"><Label>Notes</Label><Textarea rows={2} value={tenantForm.notes} onChange={e => setTenantForm(p => ({ ...p, notes: e.target.value }))} data-testid="input-tenant-notes" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTenantForm(false)}>Cancel</Button>
            <Button onClick={handleSaveTenant} disabled={savingTenant} data-testid="button-save-tenant">{savingTenant ? "Adding..." : "Add Tenant"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== REMINDER FORM ===== */}
      <Dialog open={showReminderForm} onOpenChange={setShowReminderForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingReminder ? "Edit Reminder" : "Set a Reminder"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input placeholder="e.g. Follow up on lease agreement" value={reminderForm.title} onChange={e => setReminderForm(p => ({ ...p, title: e.target.value }))} data-testid="input-reminder-title" />
              <div className="flex flex-wrap gap-1.5 pt-1">{REMINDER_PRESETS.slice(0, 4).map(p => (<button key={p} type="button" onClick={() => setReminderForm(f => ({ ...f, title: p }))} className="text-xs px-2 py-1 border rounded-md text-gray-500 hover:text-blue-600 hover:border-blue-400 transition-colors">{p}</button>))}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Date *</Label><Input type="date" value={reminderForm.dueDate} onChange={e => setReminderForm(p => ({ ...p, dueDate: e.target.value }))} data-testid="input-reminder-date" /></div>
              <div className="space-y-2"><Label>Time</Label><Input type="time" value={reminderForm.dueTime} onChange={e => setReminderForm(p => ({ ...p, dueTime: e.target.value }))} data-testid="input-reminder-time" /></div>
            </div>
            <div className="space-y-2">
              <Label>Linked Lead (optional)</Label>
              <Select value={reminderForm.leadId} onValueChange={v => setReminderForm(p => ({ ...p, leadId: v === "_none" ? "" : v }))}>
                <SelectTrigger data-testid="select-reminder-lead"><SelectValue placeholder="No lead linked" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">No lead linked</SelectItem>
                  {leads.map(l => <SelectItem key={l.id} value={l.id}>{l.tenantName} — {l.propertyAddress.split(",")[0]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Notes (optional)</Label><Textarea placeholder="Additional context..." rows={2} value={reminderForm.notes} onChange={e => setReminderForm(p => ({ ...p, notes: e.target.value }))} data-testid="input-reminder-notes" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReminderForm(false)}>Cancel</Button>
            <Button onClick={handleSaveReminder} disabled={savingReminder} data-testid="button-save-reminder">{savingReminder ? "Saving..." : editingReminder ? "Update" : "Set Reminder"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== DOC REQUEST DIALOG ===== */}
      <Dialog open={showDocRequest} onOpenChange={setShowDocRequest}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Request Documents</DialogTitle></DialogHeader>
          {createdLink ? (
            <div className="space-y-4 py-2">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm font-medium text-green-800 mb-2">Upload link created!</p>
                <div className="flex items-center gap-2 bg-white border rounded-lg p-2.5">
                  <p className="text-xs text-gray-600 flex-1 truncate">{createdLink}</p>
                  <Button size="sm" variant="outline" onClick={() => copyLink(createdLink)}><Copy className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
              <Button className="w-full" onClick={() => { setShowDocRequest(false); setCreatedLink(null); }}>Done</Button>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-2"><Label>Recipient Type</Label><Select value={docReqForm.recipientType} onValueChange={v => setDocReqForm(p => ({ ...p, recipientType: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="tenant">Tenant</SelectItem><SelectItem value="landlord">Landlord</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Recipient Name *</Label><Input value={docReqForm.recipientName} onChange={e => setDocReqForm(p => ({ ...p, recipientName: e.target.value }))} data-testid="input-doc-recipient-name" /></div>
              <div className="space-y-2"><Label>Recipient Email *</Label><Input type="email" value={docReqForm.recipientEmail} onChange={e => setDocReqForm(p => ({ ...p, recipientEmail: e.target.value }))} data-testid="input-doc-recipient-email" /></div>
              <div className="space-y-2">
                <Label>Documents Required</Label>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {(docReqForm.recipientType === "tenant" ? TENANT_DOC_TYPES : LANDLORD_DOC_TYPES).map(doc => (
                    <label key={doc} className="flex items-center gap-2 cursor-pointer text-sm">
                      <input type="checkbox" checked={docReqForm.requiredDocs.includes(doc)} onChange={e => setDocReqForm(p => ({ ...p, requiredDocs: e.target.checked ? [...p.requiredDocs, doc] : p.requiredDocs.filter(d => d !== doc) }))} className="h-4 w-4 rounded" data-testid={`checkbox-doc-${doc.toLowerCase().replace(/\s+/g, "-")}`} />
                      {doc}
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2"><Label>Expires In (days)</Label><Input type="number" min={1} max={30} value={docReqForm.expiresInDays} onChange={e => setDocReqForm(p => ({ ...p, expiresInDays: parseInt(e.target.value) || 7 }))} data-testid="input-doc-expires" /></div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDocRequest(false)}>Cancel</Button>
                <Button onClick={handleSendDocRequest} disabled={sendingDocReq} data-testid="button-confirm-doc-request">{sendingDocReq ? "Creating..." : "Create Link"}</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirms */}
      <Dialog open={!!deleteLeadConfirm} onOpenChange={() => setDeleteLeadConfirm(null)}>
        <DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Remove Tenant?</DialogTitle></DialogHeader><p className="text-sm text-gray-500 py-2">This will permanently remove the tenant application and all associated documents.</p><DialogFooter><Button variant="outline" onClick={() => setDeleteLeadConfirm(null)}>Cancel</Button><Button variant="destructive" onClick={handleDeleteLead} disabled={deleting} data-testid="button-confirm-delete-lead">{deleting ? "Removing..." : "Remove"}</Button></DialogFooter></DialogContent>
      </Dialog>
      <Dialog open={!!deleteLocationConfirm} onOpenChange={() => setDeleteLocationConfirm(null)}>
        <DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Delete Location?</DialogTitle></DialogHeader><p className="text-sm text-gray-500 py-2">This will permanently delete the location. Tenant applications will remain but will no longer be grouped under it.</p><DialogFooter><Button variant="outline" onClick={() => setDeleteLocationConfirm(null)}>Cancel</Button><Button variant="destructive" onClick={handleDeleteLocation} disabled={deleting} data-testid="button-confirm-delete-location">{deleting ? "Deleting..." : "Delete Location"}</Button></DialogFooter></DialogContent>
      </Dialog>
      <Dialog open={!!deleteReminderConfirm} onOpenChange={() => setDeleteReminderConfirm(null)}>
        <DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Delete Reminder?</DialogTitle></DialogHeader><p className="text-sm text-gray-500 py-2">This reminder will be permanently deleted.</p><DialogFooter><Button variant="outline" onClick={() => setDeleteReminderConfirm(null)}>Cancel</Button><Button variant="destructive" onClick={handleDeleteReminder} data-testid="button-confirm-delete-reminder">Delete</Button></DialogFooter></DialogContent>
      </Dialog>

      {/* Fund Account Dialog */}
      <Dialog open={showFundAccount} onOpenChange={setShowFundAccount}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-green-600" /> Fund Account
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-1">
            {/* Current Balance */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-medium">Current Balance</p>
                <p className="text-3xl font-bold text-green-700">${parseFloat(user.balance || "0").toFixed(2)}</p>
              </div>
              <DollarSign className="h-10 w-10 text-green-400" />
            </div>

            {/* Purchase packages */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">Select an amount to add</p>
              {creditPackages.length === 0 ? (
                <p className="text-sm text-gray-400">Loading packages…</p>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {creditPackages.map(pkg => (
                    <button
                      key={pkg.amount}
                      onClick={() => handleRepPurchase(pkg.amount)}
                      disabled={purchaseLoading !== null}
                      data-testid={`button-rep-purchase-${pkg.amount}`}
                      className="flex flex-col items-center justify-center h-20 rounded-xl border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 transition-all font-semibold text-gray-800 disabled:opacity-50"
                    >
                      {purchaseLoading === pkg.amount ? (
                        <span className="text-xs text-green-600 animate-pulse">Processing…</span>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mb-1 text-green-600" />
                          <span className="text-lg">{pkg.label}</span>
                        </>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Transaction History */}
            {repTransactions.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Recent Transactions</p>
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {repTransactions.slice(0, 10).map(txn => {
                    const amt = parseFloat(txn.amount);
                    const isPos = amt >= 0;
                    return (
                      <div key={txn.id} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
                        <div className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center ${isPos ? "bg-green-100" : "bg-red-100"}`}>
                            {isPos ? <Plus className="h-3 w-3 text-green-600" /> : <DollarSign className="h-3 w-3 text-red-600" />}
                          </span>
                          <div>
                            <p className="font-medium text-gray-900 leading-tight">{txn.description}</p>
                            <p className="text-xs text-gray-400">{new Date(txn.createdAt).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${isPos ? "text-green-600" : "text-red-600"}`}>{isPos ? "+" : ""}{amt.toFixed(2)}</p>
                          <p className="text-xs text-gray-400">Bal: ${parseFloat(txn.balanceAfter).toFixed(2)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFundAccount(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
