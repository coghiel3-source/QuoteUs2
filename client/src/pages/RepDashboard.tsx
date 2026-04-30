import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/AuthContext";
import InvoiceGenerator from "@/components/InvoiceGenerator";
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
  Calculator, CreditCard, Percent, BadgePercent, CheckCircle2, FileSignature,
} from "lucide-react";

type Status = "New" | "Contacted" | "Documents Pending" | "Documents Received" | "Submitted" | "Approved" | "Declined";
type ActiveTab = "overview" | "locations" | "leads" | "reminders" | "commission";
type LocationView = "list" | "detail";
type LeadDetailTab = "info" | "docs" | "processing";

const STATUS_COLORS: Record<Status, string> = {
  "New": "bg-blue-100 text-blue-800",
  "Contacted": "bg-yellow-100 text-yellow-800",
  "Documents Pending": "bg-orange-100 text-orange-800",
  "Documents Received": "bg-purple-100 text-purple-800",
  "Submitted": "bg-indigo-100 text-indigo-800",
  "Approved": "bg-green-100 text-green-800",
  "Declined": "bg-red-100 text-red-800",
};

const STATUS_DISPLAY_LABELS: Record<Status, string> = {
  "New": "New",
  "Contacted": "Contacted",
  "Documents Pending": "Waiting on Documents",
  "Documents Received": "Docs Received",
  "Submitted": "Quoted",
  "Approved": "Bound / Issued",
  "Declined": "Declined",
};

const IN_PROGRESS_STATUSES: Status[] = ["Contacted", "Documents Pending", "Documents Received", "Submitted"];
const EMPLOYMENT_STATUSES = ["Employed Full-Time", "Employed Part-Time", "Self-Employed", "Student", "Retired", "Unemployed", "Other"];
const PAYMENT_METHODS = ["e-Transfer", "Cheque", "Cash", "Direct Deposit", "Pre-Authorized Debit", "Other"];
const TENANT_DOC_TYPES = ["Pay Stubs (Last 3 Months)", "T4 / Notice of Assessment", "Bank Statements (3 Months)", "Credit Check Authorization", "Government ID", "Employment Letter", "Tenants' Insurance", "PAD Form", "Other"];
const LANDLORD_DOC_TYPES = ["Lease Agreement", "Property Deed / Ownership Proof", "Property Insurance", "Tenants' Insurance", "Government ID", "Photo/Video (Time-Stamped, Pre-Move-In — No Damage)", "PAD Form", "Other"];
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

type RgPaymentRecord = {
  id: string; locationId: string; trackingCode: string; planType: string;
  amountCents: number; status: string; paidAt?: string | null;
  periodLabel?: string | null; description?: string | null;
  landlordEmail?: string | null; landlordName?: string | null; createdAt: string;
};

function WfPctInput({ value, onChange, testId, min, color }: { value: string; onChange: (v: string) => void; testId: string; min?: number; color?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      <input
        type="number" min={min ?? 0} max="100" step="0.1"
        value={value}
        onChange={e => {
          const v = e.target.value;
          if (min !== undefined && v !== "" && parseFloat(v) < min) return;
          onChange(v);
        }}
        onBlur={e => {
          if (min !== undefined && (e.target.value === "" || parseFloat(e.target.value) < min)) {
            onChange(String(min));
          }
        }}
        className={`w-14 text-right border rounded px-1 py-0.5 text-xs font-mono bg-white focus:outline-none focus:ring-1 ${color ?? "border-purple-300 focus:ring-purple-400"}`}
        data-testid={testId}
      />
      <span className="text-xs text-gray-400">%</span>
    </span>
  );
}

function WfRow({ label, value, subtotal, total }: { label: React.ReactNode; value: number; subtotal?: boolean; total?: boolean }) {
  return (
    <div className={`flex justify-between items-center text-sm py-1 ${subtotal ? "border-t border-gray-200 mt-1 pt-2" : ""} ${total ? "border-t-2 border-purple-300 mt-1 pt-2 font-bold" : ""}`}>
      <span className={total ? "text-purple-800" : subtotal ? "text-gray-700 font-semibold" : "text-gray-500"}>{label}</span>
      <span className={`font-mono ${total ? "text-purple-700 text-base" : subtotal ? "text-gray-800 font-semibold" : "text-gray-700"}`}>${(value).toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
    </div>
  );
}

function PricingTab({
  monthlyRent, markupPercent, baseAnnualRate = 6.5, baseMonthlyRate = 7,
  commissionPercent: commissionPercentProp,
  monthlyCommissionPercent: monthlyCommissionPercentProp,
  pricingNotes: pricingNotesProp,
  onSaveMarkup, onSaveRates, onSaveCommission, onSaveMonthlyCommission, onSavePricingNotes,
  paymentLink, onSavePaymentLink,
  locationId, landlordEmail, landlordName, payments, onPaymentCreated, actorId,
  serviceFeeEnabled: serviceFeeEnabledProp, serviceFee: serviceFeeProp,
  stripeSubscriptionId, subscriptionStatus,
  onSaveServiceFee, onCancelSubscription, onSyncPayments,
}: {
  monthlyRent: number;
  markupPercent?: number | string | null;
  baseAnnualRate?: number;
  baseMonthlyRate?: number;
  commissionPercent?: number | string | null;
  monthlyCommissionPercent?: number | string | null;
  pricingNotes?: string | null;
  onSaveCommission?: (pct: number) => void;
  onSaveMonthlyCommission?: (pct: number) => void;
  onSavePricingNotes?: (notes: string) => void;
  onSaveMarkup?: (pct: number) => void;
  onSaveRates?: (annual: number, monthly: number) => void;
  paymentLink?: string | null;
  onSavePaymentLink?: (link: string) => void;
  locationId?: string;
  landlordEmail?: string | null;
  landlordName?: string | null;
  payments?: RgPaymentRecord[];
  onPaymentCreated?: () => void;
  actorId?: string;
  serviceFeeEnabled?: boolean | null;
  serviceFee?: number | string | null;
  stripeSubscriptionId?: string | null;
  subscriptionStatus?: string | null;
  onSaveServiceFee?: (enabled: boolean, fee: number) => void;
  onCancelSubscription?: () => void;
  onSyncPayments?: () => void;
}) {
  const { toast } = useToast();
  const rent = monthlyRent || 0;
  const [markup, setMarkup] = useState<string>(markupPercent ? String(Number(markupPercent)) : "0");
  // totalAnnualStr / totalMonthlyStr = the COMBINED rate the user enters (RG + commission)
  // Commission is derived as: totalRate - rgRate
  const initAnnualRg = Number(baseAnnualRate) || 4.5;
  const initMonthlyRg = Number(baseMonthlyRate) || 4.5;
  const initCommA = Number(commissionPercentProp) || 0;
  const initCommM = Number(monthlyCommissionPercentProp) || 0;
  const [totalAnnualStr, setTotalAnnualStr] = useState<string>(String(initAnnualRg + initCommA));
  const [totalMonthlyStr, setTotalMonthlyStr] = useState<string>(String(initMonthlyRg + initCommM));
  const [commissionSaved, setCommissionSaved] = useState(false);
  const [pricingNotes, setPricingNotes] = useState<string>(pricingNotesProp || "");
  const [pricingNotesSaved, setPricingNotesSaved] = useState(false);
  const [editAnnual, setEditAnnual] = useState<string>(String(baseAnnualRate));
  const [editMonthly, setEditMonthly] = useState<string>(String(baseMonthlyRate));
  const [editLink, setEditLink] = useState<string>(paymentLink || "");
  const [markupSaved, setMarkupSaved] = useState(false);
  const [ratesSaved, setRatesSaved] = useState(false);
  const [linkSaved, setLinkSaved] = useState(false);

  // Service fee + recurring state
  const [sfEnabled, setSfEnabled] = useState<boolean>(!!serviceFeeEnabledProp);
  const [sfAmount, setSfAmount] = useState<string>(String(Number(serviceFeeProp) || 0));
  const [sfSaved, setSfSaved] = useState(false);
  const [sfSaving, setSfSaving] = useState(false);
  const [recurringEnabled, setRecurringEnabled] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);

  // Payment dialog state
  const [payDialog, setPayDialog] = useState<{ open: boolean; planType: "annual" | "monthly" | null }>({ open: false, planType: null });
  const [payEmail, setPayEmail] = useState(landlordEmail || "");
  const [payName, setPayName] = useState(landlordName || "");
  const [payPeriod, setPayPeriod] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payLoading, setPayLoading] = useState(false);

  // Receipt dialog state
  const [rcptDialog, setRcptDialog] = useState(false);
  const [rcptEmail, setRcptEmail] = useState(landlordEmail || "");
  const [rcptYear, setRcptYear] = useState(String(new Date().getFullYear()));
  const [rcptLoading, setRcptLoading] = useState(false);

  const markupNum = Math.max(0, parseFloat(markup) || 0);
  const MIN_ANNUAL_RATE = 4.5;
  const MIN_MONTHLY_RATE = 4.5;
  const annualRateNum = Math.max(MIN_ANNUAL_RATE, parseFloat(editAnnual) || MIN_ANNUAL_RATE);
  const monthlyRateNum = Math.max(MIN_MONTHLY_RATE, parseFloat(editMonthly) || MIN_MONTHLY_RATE);
  // Total rate entered by user; must be >= the RG rate
  const totalAnnualNum = Math.max(annualRateNum, parseFloat(totalAnnualStr) || annualRateNum);
  const totalMonthlyNum = Math.max(monthlyRateNum, parseFloat(totalMonthlyStr) || monthlyRateNum);
  // Commission is the difference between total and RG rate
  const commissionNum = Math.max(0, totalAnnualNum - annualRateNum);
  const commissionMonthlyNum = Math.max(0, totalMonthlyNum - monthlyRateNum);
  const finalAnnualRate = annualRateNum + markupNum;
  const finalMonthlyRate = monthlyRateNum + markupNum;
  const annualRent = rent * 12;
  // RG amounts
  const rgAmountAnnual = (annualRateNum / 100) * annualRent;
  const rgAmountMonthly = (monthlyRateNum / 100) * rent;
  // Commission amounts (derived from difference)
  const commAmountAnnual = (commissionNum / 100) * annualRent;
  const commAmountMonthly = (commissionMonthlyNum / 100) * rent;
  // Total deduction = totalRate × rent (same as RG + Commission)
  const totalDeductionAnnual = (totalAnnualNum / 100) * annualRent;
  const totalDeductionMonthly = (totalMonthlyNum / 100) * rent;
  const annualPremium = rgAmountAnnual;
  const annualPremiumMonthly = annualPremium / 12;
  const monthlyPremium = rgAmountMonthly;
  const monthlyPremiumAnnual = monthlyPremium * 12;
  const collectDefaultAnnual = totalDeductionAnnual;
  const collectDefaultMonthly = totalDeductionMonthly;

  const selectedAmount = payDialog.planType === "annual" ? annualPremium : monthlyPremium;

  async function handleCollectPayment() {
    if (!locationId || !payEmail) return;
    const parsedAmount = parseFloat(payAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast({ title: "Invalid amount", description: "Please enter a valid payment amount.", variant: "destructive" });
      return;
    }
    const amountCents = Math.round(parsedAmount * 100);
    const isMonthlyRecurring = payDialog.planType === "monthly" && recurringEnabled;
    const sfAmountCents = isMonthlyRecurring && sfEnabled ? Math.round((parseFloat(sfAmount) || 0) * 100) : 0;
    setPayLoading(true);
    try {
      const res = await fetch(`/api/rep/locations/${locationId}/create-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actorId,
          planType: payDialog.planType,
          amountCents,
          landlordEmail: payEmail,
          landlordName: payName,
          periodLabel: payPeriod,
          recurring: isMonthlyRecurring,
          serviceFeeAmountCents: sfAmountCents,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.url) window.location.href = data.url;
      setPayDialog({ open: false, planType: null });
      onPaymentCreated?.();
    } catch (err: any) {
      toast({ title: "Payment error", description: err.message, variant: "destructive" });
    } finally {
      setPayLoading(false);
    }
  }

  async function handleSaveServiceFee() {
    if (!locationId) return;
    setSfSaving(true);
    try {
      await fetch(`/api/rep/locations/${locationId}/service-fee`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorId, serviceFeeEnabled: sfEnabled, serviceFee: parseFloat(sfAmount) || 0 }),
      });
      setSfSaved(true);
      setTimeout(() => setSfSaved(false), 2000);
      onSaveServiceFee?.(sfEnabled, parseFloat(sfAmount) || 0);
    } catch {
      toast({ title: "Failed to save service fee", variant: "destructive" });
    } finally {
      setSfSaving(false);
    }
  }

  async function handleCancelSubscription() {
    if (!locationId) return;
    if (!confirm("Cancel the active Stripe subscription? The landlord will no longer be charged monthly.")) return;
    setCancelLoading(true);
    try {
      const res = await fetch(`/api/rep/locations/${locationId}/cancel-subscription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorId }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast({ title: "Subscription cancelled" });
      onCancelSubscription?.();
    } catch (err: any) {
      toast({ title: "Failed to cancel", description: err.message, variant: "destructive" });
    } finally {
      setCancelLoading(false);
    }
  }

  async function handleSyncPayments() {
    if (!locationId) return;
    setSyncLoading(true);
    try {
      const res = await fetch(`/api/rep/locations/${locationId}/sync-subscription-payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorId }),
      });
      const data = await res.json();
      toast({ title: `Synced ${data.synced ?? 0} new payment(s) from Stripe` });
      onSyncPayments?.();
      onPaymentCreated?.();
    } catch (err: any) {
      toast({ title: "Sync failed", description: err.message, variant: "destructive" });
    } finally {
      setSyncLoading(false);
    }
  }

  async function handleSendReceipt() {
    if (!locationId || !rcptEmail) return;
    setRcptLoading(true);
    try {
      const res = await fetch(`/api/rep/locations/${locationId}/send-receipt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorId, recipientEmail: rcptEmail, year: Number(rcptYear), type: "annual" }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast({ title: "Receipt sent!", description: `${data.paymentCount} payment(s) included — $${((data.totalCents || 0) / 100).toFixed(2)} total` });
      setRcptDialog(false);
    } catch (err: any) {
      toast({ title: "Send failed", description: err.message, variant: "destructive" });
    } finally {
      setRcptLoading(false);
    }
  }

  const paidPayments = (payments || []).filter(p => p.status === "paid");
  const pendingPayments = (payments || []).filter(p => p.status === "pending");

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

      {/* Pricing Breakdown */}
      {rent > 0 && (
        <div className="space-y-4">
          {/* Save button */}
          {(onSaveRates || onSaveCommission) && (
            <div className="flex justify-end">
              <Button
                size="sm"
                variant={(ratesSaved && commissionSaved) ? "outline" : "default"}
                className={(ratesSaved && commissionSaved) ? "border-green-500 text-green-600 h-7 text-xs" : "h-7 text-xs"}
                onClick={() => {
                  onSaveRates?.(annualRateNum, monthlyRateNum);
                  onSaveCommission?.(commissionNum);
                  onSaveMonthlyCommission?.(commissionMonthlyNum);
                  setRatesSaved(true); setCommissionSaved(true);
                  setTimeout(() => { setRatesSaved(false); setCommissionSaved(false); }, 2000);
                }}
                data-testid="button-save-breakdown"
              >
                {(ratesSaved && commissionSaved) ? <><CheckCircle2 className="h-3 w-3 mr-1" />Saved</> : "Save Rates"}
              </Button>
            </div>
          )}

          {/* Annual Plan Breakdown */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-blue-800 flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Annual Plan — 12 Months
            </p>
            <div className="bg-white rounded-lg border border-blue-100 overflow-hidden">
              {/* Annual rent */}
              <div className="flex justify-between items-center text-sm px-3 py-2.5 border-b border-gray-100">
                <span className="text-gray-500">Annual rent (12 × ${fmt(rent)}/mo)</span>
                <span className="font-mono font-semibold text-gray-800">${fmt(annualRent)}</span>
              </div>
              {/* Combined rate + total — headline row */}
              <div className="px-3 py-3 bg-blue-600 text-white flex items-center justify-between gap-3">
                <div className="flex flex-col gap-1 text-sm min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="opacity-70 text-xs shrink-0">Total %</span>
                    <WfPctInput value={totalAnnualStr} onChange={v => { setTotalAnnualStr(v); setCommissionSaved(false); }} testId="input-total-annual" min={annualRateNum} color="border-white/40 focus:ring-white/60 text-gray-900" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="opacity-70 text-xs shrink-0">RG min %</span>
                    <WfPctInput value={editAnnual} onChange={v => { setEditAnnual(v); setRatesSaved(false); }} testId="input-annual-rate" min={MIN_ANNUAL_RATE} color="border-white/40 focus:ring-white/60 text-gray-900" />
                  </div>
                  <div className="flex items-center gap-1.5 opacity-90">
                    <span className="text-xs">Commission = ${fmt(totalDeductionAnnual)} − ${fmt(rgAmountAnnual)} =</span>
                    <span className="font-bold text-sm">${fmt(commAmountAnnual)}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs opacity-70">Total Deduction</p>
                  <p className="font-bold text-xl font-mono">${fmt(totalDeductionAnnual)}</p>
                </div>
              </div>
              {/* Breakdown of how the total splits */}
              <div className="px-3 pt-2.5 pb-1 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Breakdown</p>
              </div>
              <div className="flex justify-between items-center text-sm px-3 py-2.5 border-b border-gray-100">
                <span className="flex items-center gap-2 text-gray-600">
                  <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0"></span>
                  Commission
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 font-mono">{totalAnnualNum.toFixed(2)}% × ${fmt(annualRent)}</span>
                  <span className="font-mono text-purple-700 font-semibold w-20 text-right">${fmt(totalDeductionAnnual)}</span>
                </span>
              </div>
              <div className="flex justify-between items-center text-sm px-3 py-2.5 border-b border-gray-100">
                <span className="flex items-center gap-2 text-gray-600">
                  <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
                  Rent Guarantee
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 font-mono">{annualRateNum.toFixed(2)}% × ${fmt(annualRent)}</span>
                  <span className="font-mono text-blue-700 font-semibold w-20 text-right">${fmt(rgAmountAnnual)}</span>
                </span>
              </div>
              <div className="flex justify-between items-center text-sm px-3 py-2.5 border-b border-gray-100 bg-gray-50">
                <span className="text-gray-500 font-medium">Total Commission</span>
                <span className="font-mono text-purple-700 font-semibold">${fmt(commAmountAnnual)}</span>
              </div>
              <div className="flex justify-between items-center text-sm px-3 py-3 bg-blue-600 text-white font-bold">
                <span>Total Deduction <span className="font-normal opacity-80 text-xs">({totalAnnualNum.toFixed(2)}% of ${fmt(annualRent)})</span></span>
                <span className="font-mono text-base">${fmt(totalDeductionAnnual)}</span>
              </div>
            </div>
          </div>

          {/* Monthly Plan Breakdown */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-green-800 flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> Monthly Plan
            </p>
            <div className="bg-white rounded-lg border border-green-100 overflow-hidden">
              {/* Monthly rent */}
              <div className="flex justify-between items-center text-sm px-3 py-2.5 border-b border-gray-100">
                <span className="text-gray-500">Monthly rent</span>
                <span className="font-mono font-semibold text-gray-800">${fmt(rent)}/mo</span>
              </div>
              {/* Combined rate + total */}
              <div className="px-3 py-3 bg-green-600 text-white flex items-center justify-between gap-3">
                <div className="flex flex-col gap-1 text-sm min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="opacity-70 text-xs shrink-0">Total %</span>
                    <WfPctInput value={totalMonthlyStr} onChange={v => { setTotalMonthlyStr(v); setCommissionSaved(false); }} testId="input-total-monthly" min={monthlyRateNum} color="border-white/40 focus:ring-white/60 text-gray-900" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="opacity-70 text-xs shrink-0">RG min %</span>
                    <WfPctInput value={editMonthly} onChange={v => { setEditMonthly(v); setRatesSaved(false); }} testId="input-monthly-rate" min={MIN_MONTHLY_RATE} color="border-white/40 focus:ring-white/60 text-gray-900" />
                  </div>
                  <div className="flex items-center gap-1.5 opacity-90">
                    <span className="text-xs">Commission = ${fmt(totalDeductionMonthly)} − ${fmt(rgAmountMonthly)} =</span>
                    <span className="font-bold text-sm">${fmt(commAmountMonthly)}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs opacity-70">Total Deduction</p>
                  <p className="font-bold text-xl font-mono">${fmt(totalDeductionMonthly)}<span className="text-sm font-normal opacity-80">/mo</span></p>
                </div>
              </div>
              {/* Breakdown */}
              <div className="px-3 pt-2.5 pb-1 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Breakdown</p>
              </div>
              <div className="flex justify-between items-center text-sm px-3 py-2.5 border-b border-gray-100">
                <span className="flex items-center gap-2 text-gray-600">
                  <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0"></span>
                  Commission
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 font-mono">{totalMonthlyNum.toFixed(2)}% × ${fmt(rent)}</span>
                  <span className="font-mono text-purple-700 font-semibold w-20 text-right">${fmt(totalDeductionMonthly)}/mo</span>
                </span>
              </div>
              <div className="flex justify-between items-center text-sm px-3 py-2.5 border-b border-gray-100">
                <span className="flex items-center gap-2 text-gray-600">
                  <span className="w-2 h-2 rounded-full bg-green-500 shrink-0"></span>
                  Rent Guarantee
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 font-mono">{monthlyRateNum.toFixed(2)}% × ${fmt(rent)}</span>
                  <span className="font-mono text-green-700 font-semibold w-20 text-right">${fmt(rgAmountMonthly)}/mo</span>
                </span>
              </div>
              <div className="flex justify-between items-center text-sm px-3 py-2.5 border-b border-gray-100 bg-gray-50">
                <span className="text-gray-500 font-medium">Total Commission</span>
                <span className="font-mono text-purple-700 font-semibold">${fmt(commAmountMonthly)}/mo <span className="text-xs text-gray-400">(${fmt(commAmountMonthly * 12)}/yr)</span></span>
              </div>
              <div className="flex justify-between items-center text-sm px-3 py-3 bg-green-600 text-white font-bold">
                <span>Total Deduction <span className="font-normal opacity-80 text-xs">({totalMonthlyNum.toFixed(2)}% of ${fmt(rent)}/mo)</span></span>
                <span className="font-mono text-base">${fmt(totalDeductionMonthly)}/mo</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Service Fee & Recurring Configuration */}
      {locationId && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-green-800 flex items-center gap-2">
            <RefreshCw className="h-4 w-4" /> Monthly Recurring Settings
          </p>

          {/* Subscription status */}
          {stripeSubscriptionId && (
            <div className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${subscriptionStatus === "active" ? "bg-green-100 border border-green-300" : "bg-gray-100 border border-gray-300"}`}>
              <span className="flex items-center gap-2 font-medium">
                <span className={`w-2 h-2 rounded-full ${subscriptionStatus === "active" ? "bg-green-500" : "bg-gray-400"}`}></span>
                Stripe Subscription: <span className="capitalize">{subscriptionStatus || "unknown"}</span>
              </span>
              <div className="flex gap-2">
                {subscriptionStatus === "active" && (
                  <>
                    <Button size="sm" variant="outline" className="h-7 text-xs border-green-400 text-green-700 hover:bg-green-50" onClick={handleSyncPayments} disabled={syncLoading} data-testid="button-sync-payments">
                      <RefreshCw className={`h-3 w-3 mr-1 ${syncLoading ? "animate-spin" : ""}`} /> Sync
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs border-red-300 text-red-600 hover:bg-red-50" onClick={handleCancelSubscription} disabled={cancelLoading} data-testid="button-cancel-subscription">
                      {cancelLoading ? "Cancelling…" : "Cancel"}
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Recurring toggle */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input type="checkbox" checked={recurringEnabled} onChange={e => setRecurringEnabled(e.target.checked)} className="w-4 h-4 accent-green-600" data-testid="toggle-recurring" />
            <span className="text-sm text-gray-700 font-medium">Enable Stripe Recurring Subscription on next collect</span>
          </label>

          {/* Service fee section */}
          <div className="border-t border-green-200 pt-3 space-y-2">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input type="checkbox" checked={sfEnabled} onChange={e => { setSfEnabled(e.target.checked); setSfSaved(false); }} className="w-4 h-4 accent-green-600" data-testid="toggle-service-fee" />
              <span className="text-sm text-gray-700 font-medium">Charge a one-time service fee on the first payment</span>
            </label>
            {sfEnabled && (
              <div className="flex items-center gap-2 ml-7">
                <span className="text-sm text-gray-500">$</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={sfAmount}
                  onChange={e => { setSfAmount(e.target.value); setSfSaved(false); }}
                  className="w-32 h-8 text-sm"
                  placeholder="0.00"
                  data-testid="input-service-fee"
                />
                {onSaveServiceFee !== undefined && (
                  <Button size="sm" onClick={handleSaveServiceFee} disabled={sfSaving} variant={sfSaved ? "outline" : "default"} className={`h-8 text-xs ${sfSaved ? "border-green-500 text-green-600" : "bg-green-600 hover:bg-green-700 text-white"}`} data-testid="button-save-service-fee">
                    {sfSaved ? <><CheckCircle2 className="h-3 w-3 mr-1" />Saved</> : sfSaving ? "Saving…" : "Save Fee"}
                  </Button>
                )}
              </div>
            )}
            {sfEnabled && recurringEnabled && (
              <p className="ml-7 text-xs text-green-700 font-medium">
                First invoice: ${fmt(totalDeductionMonthly)} (monthly) + ${fmt(parseFloat(sfAmount) || 0)} (fee) = <span className="font-bold">${fmt(totalDeductionMonthly + (parseFloat(sfAmount) || 0))}</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Collect buttons */}
      {locationId && (
        <div className="grid grid-cols-2 gap-4">
          <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm h-10" onClick={() => { setPayDialog({ open: true, planType: "annual" }); setPayEmail(landlordEmail || ""); setPayName(landlordName || ""); setPayPeriod(`${new Date().getFullYear()} Full Year`); setPayAmount(totalDeductionAnnual.toFixed(2)); }} data-testid="button-collect-annual">
            <CreditCard className="h-4 w-4 mr-1.5" /> Collect Annual — ${fmt(totalDeductionAnnual)}
          </Button>
          <Button className={`w-full text-white text-sm h-10 ${recurringEnabled ? "bg-purple-600 hover:bg-purple-700" : "bg-green-600 hover:bg-green-700"}`}
            onClick={() => { setPayDialog({ open: true, planType: "monthly" }); setPayEmail(landlordEmail || ""); setPayName(landlordName || ""); setPayPeriod(new Date().toLocaleString("en-CA", { month: "long", year: "numeric" })); setPayAmount(totalDeductionMonthly.toFixed(2)); }}
            data-testid="button-collect-monthly">
            <CreditCard className="h-4 w-4 mr-1.5" />
            {recurringEnabled ? `Start Subscription — ${fmt(totalDeductionMonthly)}/mo` : `Collect Monthly — $${fmt(totalDeductionMonthly)}/mo`}
          </Button>
        </div>
      )}

      {/* Payment link (legacy/manual) */}
      {onSavePaymentLink !== undefined && (
        <div className="bg-gray-50 border rounded-xl p-4">
          <p className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3"><ExternalLink className="h-4 w-4" /> Manual Payment Page Link</p>
          <div className="flex gap-2">
            <Input value={editLink} onChange={e => { setEditLink(e.target.value); setLinkSaved(false); }} placeholder="https://..." className="flex-1" data-testid="input-payment-link" />
            <Button onClick={() => { onSavePaymentLink(editLink); setLinkSaved(true); setTimeout(() => setLinkSaved(false), 2000); }} size="sm" variant={linkSaved ? "outline" : "default"} className={linkSaved ? "border-green-500 text-green-600" : ""} data-testid="button-save-payment-link">
              {linkSaved ? <><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Saved</> : "Save"}
            </Button>
          </div>
          {paymentLink && <a href={paymentLink} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:underline"><ExternalLink className="h-3 w-3" /> Open payment page</a>}
        </div>
      )}

      {/* Payment History */}
      {locationId && payments !== undefined && (
        <div className="border rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b">
            <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              Payment History
              {paidPayments.length > 0 && <span className="ml-1 bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">{paidPayments.length} paid</span>}
            </p>
            {paidPayments.length > 0 && (
              <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { setRcptDialog(true); setRcptEmail(landlordEmail || ""); }} data-testid="button-send-receipt">
                <Send className="h-3 w-3 mr-1" /> Send Receipt
              </Button>
            )}
          </div>

          {payments.length === 0 ? (
            <div className="py-8 text-center">
              <CreditCard className="h-8 w-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No payments recorded yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {payments.map(p => (
                <div key={p.id} className="px-4 py-3 flex items-start justify-between gap-3" data-testid={`payment-row-${p.id}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{p.trackingCode}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${p.planType === "annual" ? "bg-blue-50 text-blue-700" : "bg-green-50 text-green-700"}`}>{p.planType}</span>
                      {p.periodLabel && <span className="text-xs text-gray-500">{p.periodLabel}</span>}
                    </div>
                    <p className="text-xs text-gray-400">
                      {p.paidAt ? `Paid ${new Date(p.paidAt).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })}` : `Created ${new Date(p.createdAt).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}`}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-gray-900">${fmt(p.amountCents / 100)}</p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.status === "paid" ? "bg-green-100 text-green-700" : p.status === "failed" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                      {p.status === "paid" ? "Paid" : p.status === "failed" ? "Failed" : "Pending"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pendingPayments.length > 0 && (
            <div className="bg-yellow-50 border-t px-4 py-2 text-xs text-yellow-700 flex items-center gap-1.5">
              <Clock className="h-3 w-3" /> {pendingPayments.length} payment(s) awaiting completion
            </div>
          )}
        </div>
      )}

      {/* Pricing Notes */}
      {onSavePricingNotes && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
            <BadgePercent className="h-4 w-4 text-gray-500" /> Pricing Notes
          </p>
          <textarea
            value={pricingNotes}
            onChange={e => { setPricingNotes(e.target.value); setPricingNotesSaved(false); }}
            rows={4}
            placeholder="Add commission agreements, special terms, or any pricing notes…"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-purple-300"
            data-testid="textarea-pricing-notes"
          />
          <div className="flex justify-end mt-2">
            <Button
              size="sm"
              variant={pricingNotesSaved ? "outline" : "default"}
              className={pricingNotesSaved ? "border-green-500 text-green-600" : ""}
              onClick={() => { onSavePricingNotes(pricingNotes); setPricingNotesSaved(true); setTimeout(() => setPricingNotesSaved(false), 2000); }}
              data-testid="button-save-pricing-notes"
            >
              {pricingNotesSaved ? <><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Saved</> : "Save Notes"}
            </Button>
          </div>
        </div>
      )}

      {/* Invoice Generator */}
      {locationId && (
        <InvoiceGenerator
          locationId={locationId}
          actorId={actorId}
          monthlyRent={rent}
          annualRatePct={totalAnnualNum}
          monthlyRatePct={totalMonthlyNum}
          annualAmountCents={Math.round(totalDeductionAnnual * 100)}
          monthlyAmountCents={Math.round(totalDeductionMonthly * 100)}
          landlordName={landlordName}
          landlordEmail={landlordEmail}
          propertyAddress={undefined}
        />
      )}

      {/* Payment collection dialog */}
      <Dialog open={payDialog.open} onOpenChange={open => setPayDialog(p => ({ ...p, open }))}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {payDialog.planType === "annual" ? "Collect Annual Payment" : recurringEnabled ? "Start Recurring Subscription" : "Collect Monthly Payment"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Recurring mode badge */}
            {payDialog.planType === "monthly" && recurringEnabled && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 text-xs text-purple-700 space-y-1">
                <p className="font-semibold flex items-center gap-1.5"><RefreshCw className="h-3 w-3" /> Recurring subscription via Stripe</p>
                <p>Monthly amount: <strong>${fmt(parseFloat(payAmount) || 0)}</strong></p>
                {sfEnabled && (parseFloat(sfAmount) || 0) > 0 && (
                  <>
                    <p>First-payment service fee: <strong>${fmt(parseFloat(sfAmount) || 0)}</strong></p>
                    <p className="font-bold border-t border-purple-200 pt-1">First invoice total: ${fmt((parseFloat(payAmount) || 0) + (parseFloat(sfAmount) || 0))}</p>
                  </>
                )}
              </div>
            )}
            <div className="bg-gray-50 rounded-lg px-4 py-3 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Calculated from pricing</span>
                <span className="text-xs text-gray-400">${fmt(selectedAmount)} CAD</span>
              </div>
              <Label className="text-xs text-gray-600 block">{recurringEnabled && payDialog.planType === "monthly" ? "Recurring Monthly Amount (CAD) *" : "Charge Amount (CAD) *"}</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  className="pl-7 text-lg font-semibold"
                  placeholder="0.00"
                  data-testid="input-pay-amount"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-gray-600 mb-1 block">Landlord Name</Label>
              <Input value={payName} onChange={e => setPayName(e.target.value)} placeholder="Full name" data-testid="input-pay-landlord-name" />
            </div>
            <div>
              <Label className="text-xs text-gray-600 mb-1 block">Landlord Email *</Label>
              <Input type="email" value={payEmail} onChange={e => setPayEmail(e.target.value)} placeholder="landlord@email.com" required data-testid="input-pay-email" />
            </div>
            {(!recurringEnabled || payDialog.planType === "annual") && (
              <div>
                <Label className="text-xs text-gray-600 mb-1 block">Period Label</Label>
                <Input value={payPeriod} onChange={e => setPayPeriod(e.target.value)} placeholder={payDialog.planType === "annual" ? "2026 Full Year" : "June 2026"} data-testid="input-pay-period" />
              </div>
            )}
            <p className="text-xs text-gray-400">
              {recurringEnabled && payDialog.planType === "monthly"
                ? "Stripe will automatically charge the landlord each month. You can cancel anytime from the recurring settings."
                : "The landlord will be redirected to a secure Stripe checkout to complete payment."}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialog({ open: false, planType: null })}>Cancel</Button>
            <Button disabled={!payEmail || payLoading} onClick={handleCollectPayment} className={recurringEnabled && payDialog.planType === "monthly" ? "bg-purple-600 hover:bg-purple-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"} data-testid="button-confirm-payment">
              {payLoading ? "Redirecting…" : recurringEnabled && payDialog.planType === "monthly" ? "Start Subscription →" : "Open Stripe Checkout →"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send receipt dialog */}
      <Dialog open={rcptDialog} onOpenChange={setRcptDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Send Annual Receipt</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-gray-600 mb-1 block">Recipient Email *</Label>
              <Input type="email" value={rcptEmail} onChange={e => setRcptEmail(e.target.value)} placeholder="landlord@email.com" data-testid="input-receipt-email" />
            </div>
            <div>
              <Label className="text-xs text-gray-600 mb-1 block">Year</Label>
              <Input value={rcptYear} onChange={e => setRcptYear(e.target.value)} placeholder="2026" data-testid="input-receipt-year" />
            </div>
            <p className="text-xs text-gray-400">All paid payments for this location in the selected year will be included.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRcptDialog(false)}>Cancel</Button>
            <Button disabled={!rcptEmail || rcptLoading} onClick={handleSendReceipt} data-testid="button-confirm-receipt">
              {rcptLoading ? "Sending…" : "Send Receipt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
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
  const [globalRgRates, setGlobalRgRates] = useState<{ annualRate: number; monthlyRate: number }>({ annualRate: 6.5, monthlyRate: 7 });

  // Location detail
  const [locationDetailTab, setLocationDetailTab] = useState<"info" | "pricing" | "docs">("info");
  const [locationDocRequests, setLocationDocRequests] = useState<DocumentRequest[]>([]);
  const [locationDocs, setLocationDocs] = useState<RepDocument[]>([]);
  const [updatingLocationStatus, setUpdatingLocationStatus] = useState(false);

  // RG Payments for selected location
  const [locationPayments, setLocationPayments] = useState<RgPaymentRecord[]>([]);

  // Earnings & payouts
  type EarningsSummary = {
    totalSubmittedCents: number; totalCollectedCents: number;
    totalPayments: number; totalPaid: number; commissionEarned: number;
    commissionType: string | null; commissionRate: string | null;
    payoutSchedule: string | null; renewalCommissionRate: string | null;
    commissionNotes: string | null;
  };
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
  const [payouts, setPayouts] = useState<any[]>([]);
  type CommissionPayment = RgPaymentRecord & { applicationNumber: string | null; propertyAddress: string };
  const [allPayments, setAllPayments] = useState<CommissionPayment[]>([]);

  // Signature / agreement
  const [locationSignature, setLocationSignature] = useState<any>(null);
  const [showSendAgreement, setShowSendAgreement] = useState(false);
  const [agreementEmail, setAgreementEmail] = useState("");
  const [sendingAgreement, setSendingAgreement] = useState(false);

  // Document signatures (DocuSign-like)
  const [locationDocSigs, setLocationDocSigs] = useState<any[]>([]);
  const [showDocSignDialog, setShowDocSignDialog] = useState(false);
  const [docSignDragOver, setDocSignDragOver] = useState(false);
  const [docSignFiles, setDocSignFiles] = useState<File[]>([]);
  const [docSignLandlordName, setDocSignLandlordName] = useState("");
  const [docSignLandlordEmail, setDocSignLandlordEmail] = useState("");
  const [sendingDocSig, setSendingDocSig] = useState(false);
  const [docSignLink, setDocSignLink] = useState<string | null>(null);
  const [adminDocTemplates, setAdminDocTemplates] = useState<any[]>([]);
  const [docSignSelectedTemplates, setDocSignSelectedTemplates] = useState<string[]>([]);
  const [docSignFields, setDocSignFields] = useState<Array<{
    id: string; type: string; label: string; required: boolean;
  }>>([]);

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
  const [sendingForProcessing, setSendingForProcessing] = useState(false);
  const [processingResult, setProcessingResult] = useState<{ sent: boolean; emailedTo: string; documentCount: number } | null>(null);
  const [fileNumberInput, setFileNumberInput] = useState("");
  const [savingFileNumber, setSavingFileNumber] = useState(false);
  const [createdLink, setCreatedLink] = useState<string | null>(null);

  // Delete confirms
  const [deleteLeadConfirm, setDeleteLeadConfirm] = useState<string | null>(null);
  const [deleteLocationConfirm, setDeleteLocationConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Broker / Rep assignment (admin/manager only)
  const [brokers, setBrokers] = useState<{ id: string; name: string; email: string; balance: string; preferredInsuranceTypes: string[] }[]>([]);
  const [reps, setReps] = useState<{ id: string; name: string; email: string }[]>([]);
  const [referredQuotes, setReferredQuotes] = useState<any[]>([]);
  const [selectedBrokerId, setSelectedBrokerId] = useState<string>("");
  const [selectedRepId, setSelectedRepId] = useState<string>("");
  const [assigningBroker, setAssigningBroker] = useState(false);
  const [assigningRep, setAssigningRep] = useState(false);

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
  const [locationForm, setLocationForm] = useState({ street: "", city: "", province: "ON", postalCode: "", unit: "", landlordName: "", landlordEmail: "", landlordPhone: "", monthlyRent: "", moveInDate: "", notes: "", otherContactName: "", otherContactEmail: "", otherContactPhone: "" });
  const [savingLocation, setSavingLocation] = useState(false);

  // Tenant form
  const [showTenantForm, setShowTenantForm] = useState(false);
  const [tenantFormAutoOpened, setTenantFormAutoOpened] = useState(false);
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
      // Load active brokers and reps for admin/manager assignment
      if (user.role === "admin" || user.role === "manager") {
        fetch("/api/users").then(r => r.json()).then((data: any[]) => {
          const activeBrokers = data.filter((u: any) => u.role === "broker" && u.status === "active");
          setBrokers(activeBrokers.map((u: any) => ({ id: u.id, name: u.name, email: u.email, balance: u.balance ?? "0", preferredInsuranceTypes: u.preferredInsuranceTypes ?? [] })));
          const activeReps = data.filter((u: any) => u.role === "rep" && (u.status === "active" || u.status === "paused"));
          setReps(activeReps.map((u: any) => ({ id: u.id, name: u.name, email: u.email })));
        }).catch(() => {});
        // Load quotes assigned to reps from the lead manager
        fetch(`/api/rep/referred-quotes?actorId=${user.id}`).then(r => r.json()).then(data => {
          setReferredQuotes(Array.isArray(data) ? data : []);
        }).catch(() => {});
      }
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
      const [locs, leadsData, remindersData, rgRatesData, earningsData, payoutsData, allPaymentsData] = await Promise.all([
        apiRequest<RgLocation[]>(`/rep/locations?actorId=${user.id}`),
        apiRequest<RgLead[]>(`/rep/leads?actorId=${user.id}`),
        isRep ? apiRequest<RepReminder[]>(`/rep/reminders?actorId=${user.id}`) : Promise.resolve([]),
        fetch("/api/credits/rg-rates").then(r => r.json()).catch(() => null),
        fetch(`/api/rep/earnings?actorId=${user.id}`).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`/api/rep/payouts?actorId=${user.id}`).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`/api/rep/all-payments?actorId=${user.id}`).then(r => r.ok ? r.json() : []).catch(() => []),
      ]);
      setLocations(locs || []);
      setLeads(leadsData || []);
      setReminders(remindersData || []);
      if (rgRatesData && typeof rgRatesData.annualRate === "number") {
        setGlobalRgRates({ annualRate: rgRatesData.annualRate, monthlyRate: rgRatesData.monthlyRate });
      }
      if (earningsData) setEarnings(earningsData);
      setPayouts(payoutsData || []);
      setAllPayments(allPaymentsData || []);
    } catch {
      toast({ title: "Failed to load data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function loadLocationPayments(locationId: string) {
    try {
      const actorParam = user?.id ? `?actorId=${user.id}` : "";
      const res = await fetch(`/api/rep/locations/${locationId}/payments${actorParam}`);
      if (res.ok) { const data = await res.json(); setLocationPayments(data || []); }
    } catch { setLocationPayments([]); }
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
    setLocationSignature(null);
    setShowSendAgreement(false);
    setAgreementEmail(loc.landlordEmail || "");
    setLocationPayments([]);
    setLocationDocSigs([]);
    setDocSignFiles([]);
    setDocSignLink(null);
    setDocSignSelectedTemplates([]);
    setDocSignFields([]);
    setDocSignLandlordName(loc.landlordName || "");
    setDocSignLandlordEmail(loc.landlordEmail || "");
    await loadTenantsForLocation(loc.id);
    loadLocationPayments(loc.id);
    if (user) {
      try {
        const [reqs, docs, sig, docSigs] = await Promise.all([
          apiRequest<DocumentRequest[]>(`/rep/locations/${loc.id}/doc-requests?actorId=${user.id}`),
          apiRequest<RepDocument[]>(`/rep/locations/${loc.id}/documents?actorId=${user.id}`),
          apiRequest<any>(`/rep/locations/${loc.id}/signature-status?actorId=${user.id}`),
          apiRequest<any[]>(`/rep/locations/${loc.id}/doc-signatures?actorId=${user.id}`),
        ]);
        setLocationDocRequests(reqs || []);
        setLocationDocs(docs || []);
        setLocationSignature(sig || null);
        setLocationDocSigs(docSigs || []);
      } catch {}
    }
  }

  async function loadAdminDocTemplates() {
    if (!user) return;
    try {
      const templates = await apiRequest<any[]>(`/admin/doc-templates?actorId=${user.id}`);
      setAdminDocTemplates(templates || []);
    } catch {}
  }

  function openDocSignDialog() {
    setDocSignLink(null);
    setDocSignFiles([]);
    setDocSignSelectedTemplates([]);
    setDocSignFields([]);
    setShowDocSignDialog(true);
    setLocationDetailTab("docs");
    loadAdminDocTemplates();
  }

  function addDocSignField(type: string) {
    const labels: Record<string, string> = {
      signature: "Signature", initials: "Initials", date: "Date", text: "Text Field"
    };
    setDocSignFields(prev => [...prev, {
      id: Math.random().toString(36).slice(2),
      type,
      label: labels[type] || type,
      required: true,
    }]);
  }

  async function handleSendDocSignature() {
    if (!selectedLocation || !user) return;
    if (!docSignLandlordEmail.trim()) { toast({ title: "Landlord email is required", variant: "destructive" }); return; }
    if (docSignFiles.length === 0 && docSignSelectedTemplates.length === 0) {
      toast({ title: "Please add at least one document", variant: "destructive" }); return;
    }
    setSendingDocSig(true);
    setDocSignLink(null);
    try {
      const formData = new FormData();
      formData.append("actorId", user.id);
      formData.append("landlordName", docSignLandlordName.trim());
      formData.append("landlordEmail", docSignLandlordEmail.trim());
      if (docSignFields.length > 0) formData.append("signatureFields", JSON.stringify(docSignFields));
      docSignSelectedTemplates.forEach(id => formData.append("templateIds", id));
      docSignFiles.forEach(f => formData.append("documents", f));
      const res = await fetch(`/api/rep/locations/${selectedLocation.id}/doc-signatures`, {
        method: "POST",
        body: formData,
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to create signature request");
      setLocationDocSigs(prev => [result.record, ...prev]);
      setDocSignFiles([]);
      setDocSignSelectedTemplates([]);
      setDocSignFields([]);
      if (result.emailSent) {
        toast({ title: "Signature request sent!", description: `Email sent to ${docSignLandlordEmail}` });
        setShowDocSignDialog(false);
      } else {
        setDocSignLink(result.signingUrl);
        toast({ title: "Request created", description: "SMTP not configured — copy the link below to share with the landlord.", duration: 8000 });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSendingDocSig(false);
    }
  }

  async function handleSendAgreement() {
    if (!selectedLocation || !user) return;
    if (!agreementEmail.trim()) { toast({ title: "Landlord email is required", variant: "destructive" }); return; }
    setSendingAgreement(true);
    try {
      const result = await apiRequest<any>(`/rep/locations/${selectedLocation.id}/send-signature`, {
        method: "POST",
        body: JSON.stringify({ actorId: user?.id, landlordEmail: agreementEmail.trim() }),
      });
      setLocationSignature(result.request);
      setShowSendAgreement(false);
      if (result.emailSent) {
        toast({ title: "Agreement sent!", description: `Signature request emailed to ${agreementEmail}` });
      } else {
        toast({
          title: "Agreement link created",
          description: `SMTP not configured — share this link manually: ${result.signingUrl}`,
          duration: 10000,
        });
      }
    } catch (err: any) {
      toast({ title: "Failed to send agreement", description: err.message, variant: "destructive" });
    } finally {
      setSendingAgreement(false);
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

  async function handleSaveCommission(pct: number) {
    if (!selectedLocation || !user) return;
    try {
      const updated = await apiRequest<RgLocation>(`/rep/locations/${selectedLocation.id}`, { method: "PATCH", body: JSON.stringify({ actorId: user.id, commissionPercent: String(pct) }) });
      setSelectedLocation(updated);
      setLocations(prev => prev.map(l => l.id === updated.id ? updated : l));
      toast({ title: "Commission rate saved" });
    } catch { toast({ title: "Failed to save commission rate", variant: "destructive" }); }
  }

  async function handleSaveMonthlyCommission(pct: number) {
    if (!selectedLocation || !user) return;
    try {
      const updated = await apiRequest<RgLocation>(`/rep/locations/${selectedLocation.id}`, { method: "PATCH", body: JSON.stringify({ actorId: user.id, monthlyCommissionPercent: String(pct) }) });
      setSelectedLocation(updated);
      setLocations(prev => prev.map(l => l.id === updated.id ? updated : l));
      toast({ title: "Monthly commission rate saved" });
    } catch { toast({ title: "Failed to save monthly commission rate", variant: "destructive" }); }
  }

  async function handleSavePricingNotes(notes: string) {
    if (!selectedLocation || !user) return;
    try {
      const updated = await apiRequest<RgLocation>(`/rep/locations/${selectedLocation.id}`, { method: "PATCH", body: JSON.stringify({ actorId: user.id, pricingNotes: notes || null }) });
      setSelectedLocation(updated);
      setLocations(prev => prev.map(l => l.id === updated.id ? updated : l));
      toast({ title: "Notes saved" });
    } catch { toast({ title: "Failed to save notes", variant: "destructive" }); }
  }

  async function openLead(lead: RgLead) {
    setSelectedLead(lead);
    setDetailTab("info");
    setCreatedLink(null);
    setSelectedBrokerId((lead as any).brokerId || "");
    setSelectedRepId((lead as any).repId || "");
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

  async function handleAssignBroker(brokerId: string | null) {
    if (!user || !selectedLead) return;
    setAssigningBroker(true);
    try {
      const res = await fetch(`/api/admin/rg-leads/${selectedLead.id}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorId: user.id, brokerId }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast({ title: err.error || "Failed to assign broker", variant: "destructive" });
        return;
      }
      const updated: RgLead = await res.json();
      setSelectedLead(updated);
      setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
      setSelectedBrokerId((updated as any).brokerId || "");
      toast({ title: brokerId ? "Broker assigned successfully" : "Broker unassigned" });
    } catch (err: any) {
      toast({ title: err.message || "Failed to assign broker", variant: "destructive" });
    } finally {
      setAssigningBroker(false);
    }
  }

  async function handleAssignRep(repId: string | null) {
    if (!user || !selectedLead) return;
    setAssigningRep(true);
    try {
      const res = await fetch(`/api/admin/rg-leads/${selectedLead.id}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorId: user.id, repId }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast({ title: err.error || "Failed to assign rep", variant: "destructive" });
        return;
      }
      const updated: RgLead = await res.json();
      setSelectedLead(updated);
      setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
      setSelectedRepId((updated as any).repId || "");
      toast({ title: repId ? "Rep assigned successfully" : "Rep unassigned" });
    } catch (err: any) {
      toast({ title: err.message || "Failed to assign rep", variant: "destructive" });
    } finally {
      setAssigningRep(false);
    }
  }

  // ===== LOCATION CRUD =====
  function openNewLocation() {
    setLocationForm({ street: "", city: "", province: "ON", postalCode: "", unit: "", landlordName: "", landlordEmail: "", landlordPhone: "", monthlyRent: "", moveInDate: "", notes: "", otherContactName: "", otherContactEmail: "", otherContactPhone: "" });
    setEditingLocation(null);
    setShowLocationForm(true);
  }

  function openEditLocation(loc: RgLocation, e?: React.MouseEvent) {
    e?.stopPropagation();
    // On edit, put full existing address into street field
    setLocationForm({ street: loc.propertyAddress, city: "", province: "ON", postalCode: "", unit: loc.unit || "", landlordName: loc.landlordName, landlordEmail: loc.landlordEmail || "", landlordPhone: loc.landlordPhone || "", monthlyRent: loc.monthlyRent, moveInDate: loc.moveInDate || "", notes: loc.notes || "", otherContactName: (loc as any).otherContactName || "", otherContactEmail: (loc as any).otherContactEmail || "", otherContactPhone: (loc as any).otherContactPhone || "" });
    setEditingLocation(loc);
    setShowLocationForm(true);
  }

  function buildPropertyAddress(form: typeof locationForm): string {
    const parts = [form.street.trim()];
    const cityProv = [form.city.trim(), form.province.trim()].filter(Boolean).join(", ");
    if (cityProv) parts.push(cityProv);
    if (form.postalCode.trim()) parts.push(form.postalCode.trim().toUpperCase());
    return parts.join(" ");
  }

  async function handleSaveLocation() {
    if (!user || !locationForm.street || !locationForm.landlordName || !locationForm.monthlyRent) {
      toast({ title: "Please fill in the street address, landlord name, and monthly rent", variant: "destructive" });
      return;
    }
    if (!locationForm.city) {
      toast({ title: "Please fill in the city", variant: "destructive" });
      return;
    }
    if (!locationForm.postalCode) {
      toast({ title: "Please fill in the postal code", variant: "destructive" });
      return;
    }
    setSavingLocation(true);
    const propertyAddress = buildPropertyAddress(locationForm);
    try {
      const payload = { actorId: user.id, propertyAddress, province: locationForm.province, unit: locationForm.unit || null, landlordName: locationForm.landlordName, landlordEmail: locationForm.landlordEmail || null, landlordPhone: locationForm.landlordPhone || null, monthlyRent: locationForm.monthlyRent, moveInDate: locationForm.moveInDate || null, notes: locationForm.notes || null, otherContactName: locationForm.otherContactName || null, otherContactEmail: locationForm.otherContactEmail || null, otherContactPhone: locationForm.otherContactPhone || null };
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
        openAddTenant(created, undefined, true);
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
  function openAddTenant(loc: RgLocation, e?: React.MouseEvent, autoOpened = false) {
    e?.stopPropagation();
    setTenantTargetLocation(loc);
    setTenantFormAutoOpened(autoOpened);
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
      const res = await fetch(`/api/rep/locations/${tenantTargetLocation.id}/tenants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorId: user.id, ...tenantForm, coApplicantName: tenantForm.coApplicantName || null, coApplicantEmail: tenantForm.coApplicantEmail || null, notes: tenantForm.notes || null, householdIncome: tenantForm.householdIncome || null, employerName: tenantForm.employerName || null, paymentMethod: tenantForm.paymentMethod || null }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add tenant");
      }
      const created: RgLead = await res.json();
      setLeads(prev => [created, ...prev]);
      setLocationTenants(prev => ({ ...prev, [tenantTargetLocation.id]: [created, ...(prev[tenantTargetLocation.id] || [])] }));
      // Refresh balance after deduction
      refreshUser?.();
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

  async function toggleLeadFlag(field: "creditReportOnFile" | "bankruptcyLastThreeYears" | "noEvictionsOrJudgements" | "employmentLetterOnFile" | "governmentIdOnFile" | "twelveMonthLease" | "leaseViolation" | "rentArrearsLastTwelveMonths" | "noDefaultFirstSixtyDays" | "ongoingEmploymentNoTerminationRisk" | "documentsReceived", value: boolean) {
    if (!user || !selectedLead) return;
    try {
      const updated = await apiRequest<RgLead>(`/rep/leads/${selectedLead.id}`, {
        method: "PATCH",
        body: JSON.stringify({ actorId: user.id, [field]: value }),
      });
      setLeads(prev => prev.map(l => l.id === selectedLead.id ? updated : l));
      setSelectedLead(updated);
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
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

  async function handleSendForProcessing() {
    if (!selectedLead || !user) return;
    setSendingForProcessing(true);
    try {
      const result = await apiRequest<{ sent: boolean; emailedTo: string; documentCount: number; lead: RgLead }>(`/rep/leads/${selectedLead.id}/send-for-processing`, { method: "POST" });
      setProcessingResult({ sent: result.sent, emailedTo: result.emailedTo, documentCount: result.documentCount });
      setSelectedLead(result.lead);
      setLeads(prev => prev.map(l => l.id === result.lead.id ? result.lead : l));
      if (selectedLead.status === "Documents Received" || selectedLead.status === "Contacted") {
        await handleStatusChange(selectedLead.id, "Submitted");
      }
      toast({ title: result.sent ? "Application sent for processing!" : "Application logged (SMTP not configured)" });
    } catch (err: any) {
      toast({ title: err.message || "Failed to send for processing", variant: "destructive" });
    } finally {
      setSendingForProcessing(false);
    }
  }

  async function handleSaveFileNumber() {
    if (!selectedLead || !fileNumberInput.trim()) return;
    setSavingFileNumber(true);
    try {
      const updated = await apiRequest<RgLead>(`/rep/leads/${selectedLead.id}/file-number`, { method: "PATCH", body: JSON.stringify({ fileNumber: fileNumberInput.trim() }) });
      setSelectedLead(updated);
      setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
      setFileNumberInput("");
      toast({ title: "File number saved!" });
    } catch (err: any) {
      toast({ title: err.message || "Failed to save file number", variant: "destructive" });
    } finally {
      setSavingFileNumber(false);
    }
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
            ...((isAdminOrManager || user?.permissions?.viewCommission === true) ? [{ id: "commission", icon: <DollarSign className="h-3.5 w-3.5" />, label: "Commission" }] : []),
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

            {/* Earnings & Commission Summary */}
            {(isAdminOrManager || user?.permissions?.viewCommission === true) && earnings && (earnings.totalPayments > 0 || earnings.commissionRate) && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5" data-testid="card-rep-earnings">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-blue-900 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" /> Payment Earnings Overview
                  </h3>
                  {earnings.payoutSchedule && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium capitalize">
                      {earnings.payoutSchedule} payouts
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Submitted</p>
                    <p className="text-2xl font-bold text-gray-900">${fmt(earnings.totalSubmittedCents / 100)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{earnings.totalPayments} payment{earnings.totalPayments !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Collected</p>
                    <p className="text-2xl font-bold text-green-700">${fmt(earnings.totalCollectedCents / 100)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{earnings.totalPaid} confirmed</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Commission Earned</p>
                    <p className="text-2xl font-bold text-indigo-700">${fmt(earnings.commissionEarned / 100)}</p>
                    {earnings.commissionRate && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {earnings.commissionType === "percentage"
                          ? `${parseFloat(earnings.commissionRate).toFixed(2)}% of collected`
                          : `$${parseFloat(earnings.commissionRate).toFixed(2)} per payment`}
                      </p>
                    )}
                  </div>
                </div>
                {earnings.commissionNotes && (
                  <div className="bg-white/70 rounded-lg px-3 py-2 text-xs text-gray-600 flex items-start gap-2">
                    <span className="font-semibold text-gray-500 shrink-0">Terms:</span>
                    <span>{earnings.commissionNotes}</span>
                  </div>
                )}
                {earnings.renewalCommissionRate && (
                  <div className="mt-2 text-xs text-indigo-600 font-medium">
                    Renewal rate: {parseFloat(earnings.renewalCommissionRate).toFixed(2)}%
                  </div>
                )}
              </div>
            )}

            {/* Payout History (shown when there are payouts) */}
            {payouts.length > 0 && (
              <div className="bg-white border rounded-xl overflow-hidden" data-testid="card-rep-payouts">
                <div className="bg-gray-50 px-5 py-3 border-b flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" /> Commission Payouts
                  </h3>
                  <span className="text-xs text-gray-400">{payouts.length} payout{payouts.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="divide-y max-h-60 overflow-y-auto">
                  {payouts.map(p => (
                    <div key={p.id} className="px-5 py-3 flex items-center justify-between gap-3" data-testid={`payout-row-${p.id}`}>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{p.periodLabel}</p>
                        <p className="text-xs text-gray-400">
                          {p.isRenewal && <span className="text-amber-600 font-medium mr-1">Renewal · </span>}
                          {p.totalPaymentsCents > 0 ? `$${fmt(p.totalPaymentsCents / 100)} collected · ` : ""}
                          {p.paidAt ? `Paid ${new Date(p.paidAt).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}` : `Created ${new Date(p.createdAt).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}`}
                        </p>
                        {p.notes && <p className="text-xs text-gray-400 italic mt-0.5">{p.notes}</p>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-gray-900">${fmt(p.commissionCents / 100)}</p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.status === "paid" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                          {p.status === "paid" ? "Paid" : "Pending"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-gray-50 px-5 py-2.5 border-t flex justify-between text-sm">
                  <span className="text-gray-500 font-medium">Total paid out</span>
                  <span className="font-bold text-green-700">
                    ${fmt(payouts.filter(p => p.status === "paid").reduce((s: number, p: any) => s + p.commissionCents, 0) / 100)}
                  </span>
                </div>
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
                  <div className="bg-white border rounded-xl overflow-hidden">
                    {/* Table header */}
                    <div className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr_auto] gap-0 border-b bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      <div>Address</div>
                      <div>Tenants / Rent</div>
                      <div>Documents</div>
                      <div>Signature</div>
                      <div>Payment</div>
                      <div></div>
                    </div>

                    {filteredLocations.map((loc, idx) => {
                      const tenants = locationTenants[loc.id] || [];
                      const status = getLocationStatus(tenants);
                      const allDeclined = tenants.length > 0 && tenants.every(t => t.status === "Declined");
                      const active = tenants.find(t => t.status !== "Declined") || tenants[0] || null;
                      const docsReceived = active && ["Documents Received", "Submitted", "Approved"].includes(active.status);
                      const docsPending = active?.status === "Documents Pending";
                      const signed = active && ["Submitted", "Approved"].includes(active.status);
                      let docLabel = "Not Sent"; let docCls = "bg-gray-100 text-gray-500";
                      if (docsReceived) { docLabel = "Received"; docCls = "bg-green-100 text-green-700"; }
                      else if (docsPending) { docLabel = "Pending"; docCls = "bg-orange-100 text-orange-700"; }
                      else if (tenants.length === 0) { docLabel = "—"; }
                      return (
                        <div
                          key={loc.id}
                          className={`grid grid-cols-[2fr_2fr_1fr_1fr_1fr_auto] gap-0 px-4 py-3 cursor-pointer hover:bg-blue-50/40 transition-colors text-sm ${idx !== 0 ? "border-t" : ""} ${allDeclined ? "bg-red-50/30 hover:bg-red-50" : ""}`}
                          onClick={() => openLocation(loc)}
                          data-testid={`location-card-${loc.id}`}
                        >
                          {/* Address */}
                          <div className="flex items-start gap-2 pr-3">
                            <Building2 className={`h-4 w-4 mt-0.5 flex-shrink-0 ${allDeclined ? "text-red-400" : "text-blue-500"}`} />
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 truncate">{loc.propertyAddress}</p>
                              {loc.unit && <p className="text-xs text-gray-500">Unit {loc.unit}</p>}
                              {loc.moveInDate && <p className="text-xs text-gray-400">Move-in: {loc.moveInDate}</p>}
                            </div>
                          </div>

                          {/* Tenants / Rent */}
                          <div className="flex flex-col gap-1 justify-center pr-3">
                            {tenants.length === 0
                              ? <span className="text-xs text-gray-400 italic">No tenants yet</span>
                              : tenants.map(t => (
                                <div key={t.id} className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-medium text-gray-800 text-xs">{t.tenantName}</span>
                                  <span className="text-gray-400 text-xs">${Number(t.monthlyRent).toLocaleString()}/mo</span>
                                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[t.status as Status]}`}>{STATUS_DISPLAY_LABELS[t.status as Status] || t.status}</span>
                                </div>
                              ))
                            }
                          </div>

                          {/* Documents */}
                          <div className="flex items-center">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${docCls}`}>{docLabel}</span>
                          </div>

                          {/* Signature */}
                          <div className="flex items-center">
                            {tenants.length === 0
                              ? <span className="text-xs text-gray-400">—</span>
                              : signed
                                ? <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-green-100 text-green-700">Signed</span>
                                : <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-gray-100 text-gray-500">Pending</span>
                            }
                          </div>

                          {/* Payment */}
                          <div className="flex items-center">
                            {tenants.length === 0
                              ? <span className="text-xs text-gray-400">—</span>
                              : active?.paymentMethod
                                ? <span className="text-xs font-medium text-gray-800">{active.paymentMethod}</span>
                                : <span className="text-xs text-gray-400 italic">Not Set</span>
                            }
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 pl-2" onClick={e => e.stopPropagation()}>
                            {allDeclined && rgPerm("canAddTenants") && (
                              <button onClick={e => { e.stopPropagation(); openAddTenant(loc); }} className="flex items-center gap-1 text-xs px-2 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium whitespace-nowrap" data-testid={`button-add-tenant-declined-${loc.id}`}><UserPlus className="h-3 w-3" /> New</button>
                            )}
                            {tenants.length > 0 && (
                              <button onClick={e => { e.stopPropagation(); const a = tenants.find(t => t.status !== "Declined") || tenants[0]; openLead(a); }} className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-500" title="View tenant" data-testid={`button-view-lead-${loc.id}`}><Eye className="h-3.5 w-3.5" /></button>
                            )}
                            {rgPerm("canEditLocations") && <button onClick={e => openEditLocation(loc, e)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400" data-testid={`button-edit-location-${loc.id}`}><Pencil className="h-3.5 w-3.5" /></button>}
                            <ChevronRight className="h-4 w-4 text-gray-300 ml-1" />
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
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setShowSendAgreement(true); setAgreementEmail(selectedLocation.landlordEmail || ""); }}
                        className={locationSignature?.status === "signed" ? "border-green-300 text-green-700 hover:bg-green-50" : ""}
                        data-testid="button-send-agreement"
                      >
                        <FileSignature className="h-3.5 w-3.5 mr-1" />
                        {locationSignature?.status === "signed" ? "Signed ✓" : locationSignature ? "Resend Agreement" : "Send Agreement"}
                      </Button>
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
                          {((selectedLocation as any).otherContactName || (selectedLocation as any).otherContactEmail) && (
                            <div className="mt-2 pt-2 border-t">
                              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Other Contact</p>
                              {(selectedLocation as any).otherContactName && <p><span className="text-gray-500">Name:</span> {(selectedLocation as any).otherContactName}</p>}
                              {(selectedLocation as any).otherContactEmail && <p><span className="text-gray-500">Email:</span> {(selectedLocation as any).otherContactEmail}</p>}
                              {(selectedLocation as any).otherContactPhone && <p><span className="text-gray-500">Phone:</span> {(selectedLocation as any).otherContactPhone}</p>}
                            </div>
                          )}
                          {selectedLocation.notes && <p className="mt-2 pt-2 border-t text-gray-600"><span className="text-gray-500">Notes:</span> {selectedLocation.notes}</p>}
                        </CardContent>
                      </Card>

                      {/* Agreement / Signature Status Card */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-gray-600 flex items-center justify-between">
                            <span className="flex items-center gap-1.5"><FileSignature className="h-4 w-4" /> Agreement Status</span>
                            <button
                              onClick={openDocSignDialog}
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                              data-testid="button-send-docusign-agreement"
                            >
                              <Plus className="h-3.5 w-3.5" /> Send for DocuSign
                            </button>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm space-y-3">
                          {/* Landlord Contact Details */}
                          <div className="bg-gray-50 rounded-lg border p-3 space-y-2">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Landlord Contact</p>
                            <div className="grid grid-cols-1 gap-1.5">
                              {selectedLocation.landlordName && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400 w-16 shrink-0">Name</span>
                                  <span className="text-xs font-medium text-gray-800">{selectedLocation.landlordName}</span>
                                </div>
                              )}
                              {selectedLocation.landlordEmail && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400 w-16 shrink-0">Email</span>
                                  <a href={`mailto:${selectedLocation.landlordEmail}`} className="text-xs text-blue-600 hover:underline truncate">{selectedLocation.landlordEmail}</a>
                                </div>
                              )}
                              {selectedLocation.landlordPhone && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400 w-16 shrink-0">Phone</span>
                                  <a href={`tel:${selectedLocation.landlordPhone}`} className="text-xs text-blue-600 hover:underline">{selectedLocation.landlordPhone}</a>
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400 w-16 shrink-0">Address</span>
                                <span className="text-xs text-gray-800">{selectedLocation.propertyAddress}{selectedLocation.unit ? `, Unit ${selectedLocation.unit}` : ""}</span>
                              </div>
                              {selectedLocation.moveInDate && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400 w-16 shrink-0">Move-in</span>
                                  <span className="text-xs text-gray-800">{selectedLocation.moveInDate}</span>
                                </div>
                              )}
                              {selectedLocation.monthlyRent && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400 w-16 shrink-0">Rent</span>
                                  <span className="text-xs text-gray-800">${parseFloat(selectedLocation.monthlyRent).toLocaleString()}/mo</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Signature status */}
                          {locationSignature ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${locationSignature.status === "signed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                                  {locationSignature.status === "signed" ? "✓ Signed" : "Awaiting Signature"}
                                </span>
                                <span className="text-gray-400 text-xs">Sent to {locationSignature.landlordEmail}</span>
                              </div>
                              {locationSignature.status === "signed" && (
                                <div className="text-xs text-gray-500 space-y-0.5">
                                  <p>Signed by: <strong>{locationSignature.signerName}</strong></p>
                                  {locationSignature.signedAt && <p>Date: {new Date(locationSignature.signedAt).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })}</p>}
                                </div>
                              )}
                              {locationSignature.sentAt && (
                                <p className="text-xs text-gray-400">Sent: {new Date(locationSignature.sentAt).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })}</p>
                              )}
                            </div>
                          ) : (
                            <p className="text-gray-400 italic text-xs">No agreement sent yet. Click "Send for DocuSign" to upload a document and request a landlord signature.</p>
                          )}
                        </CardContent>
                      </Card>

                      {/* Document Signing (summary — full form lives in Docs tab) */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-gray-600 flex items-center justify-between">
                            <span className="flex items-center gap-1.5"><FileText className="h-4 w-4" /> Document Signing</span>
                            <button
                              onClick={openDocSignDialog}
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                              data-testid="button-send-docusign-from-info"
                            >
                              <Plus className="h-3.5 w-3.5" /> New Request
                            </button>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm">
                          {locationDocSigs.length === 0 ? (
                            <p className="text-gray-400 italic text-xs">No signing requests yet. Click "New Request" to send a document for signature.</p>
                          ) : (
                            <div className="space-y-1.5">
                              {locationDocSigs.slice(0, 3).map((sig: any) => (
                                <div key={sig.id} className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full shrink-0 ${sig.status === "signed" ? "bg-green-500" : "bg-yellow-400"}`} />
                                  <span className="text-xs text-gray-700 flex-1 min-w-0 truncate">{sig.landlordName || sig.landlordEmail}</span>
                                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 ${sig.status === "signed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                                    {sig.status === "signed" ? "Signed" : "Pending"}
                                  </span>
                                </div>
                              ))}
                              {locationDocSigs.length > 3 && (
                                <button onClick={() => setLocationDetailTab("docs")} className="text-xs text-blue-600 hover:underline">
                                  +{locationDocSigs.length - 3} more — view in Docs tab
                                </button>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Status Overview Board */}
                      {currentLocationTenants.length > 0 && (
                        <Card>
                          <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-600">Status Overview</CardTitle></CardHeader>
                          <CardContent className="p-0">
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b bg-gray-50">
                                    <th className="text-left px-4 py-2 font-semibold text-gray-500 uppercase tracking-wide">Tenant</th>
                                    <th className="text-left px-4 py-2 font-semibold text-gray-500 uppercase tracking-wide">Rent</th>
                                    <th className="text-left px-4 py-2 font-semibold text-gray-500 uppercase tracking-wide">Documents</th>
                                    <th className="text-left px-4 py-2 font-semibold text-gray-500 uppercase tracking-wide">Signature</th>
                                    <th className="text-left px-4 py-2 font-semibold text-gray-500 uppercase tracking-wide">Payment</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {currentLocationTenants.map(tenant => {
                                    const tenantDocReqs = locationDocRequests.filter(r => r.recipientType === "tenant" && r.recipientName === tenant.tenantName);
                                    const hasActiveDocReq = tenantDocReqs.some(r => !r.expiresAt || new Date(r.expiresAt) >= new Date());
                                    const docsReceived = ["Documents Received", "Submitted", "Approved"].includes(tenant.status);
                                    const signed = ["Submitted", "Approved"].includes(tenant.status);
                                    let docStatus = "Not Sent";
                                    let docColor = "bg-gray-100 text-gray-500";
                                    if (docsReceived) { docStatus = "Received"; docColor = "bg-green-100 text-green-700"; }
                                    else if (hasActiveDocReq) { docStatus = "Requested"; docColor = "bg-yellow-100 text-yellow-700"; }
                                    else if (tenantDocReqs.length > 0) { docStatus = "Expired"; docColor = "bg-red-100 text-red-600"; }
                                    return (
                                      <tr key={tenant.id} className="border-b last:border-b-0 hover:bg-gray-50/70 cursor-pointer transition-colors" onClick={() => openLead(tenant)} data-testid={`status-row-${tenant.id}`}>
                                        <td className="px-4 py-3">
                                          <p className="font-semibold text-gray-900 mb-0.5">{tenant.tenantName}</p>
                                          <span className={`px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[tenant.status as Status]}`}>{STATUS_DISPLAY_LABELS[tenant.status as Status] || tenant.status}</span>
                                        </td>
                                        <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">${Number(tenant.monthlyRent).toLocaleString()}/mo</td>
                                        <td className="px-4 py-3">
                                          <span className={`px-2 py-0.5 rounded-full font-medium ${docColor}`}>{docStatus}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                          {signed
                                            ? <span className="px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">Signed</span>
                                            : <span className="px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">Pending</span>
                                          }
                                        </td>
                                        <td className="px-4 py-3">
                                          {tenant.paymentMethod
                                            ? <span className="text-gray-700">{tenant.paymentMethod}</span>
                                            : <span className="text-gray-400 italic">Not Set</span>
                                          }
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </CardContent>
                        </Card>
                      )}

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
                                    <span className="font-medium capitalize">{req.recipientType === "other" ? "Other Contact" : req.recipientType}: {req.recipientName}</span>
                                    {expired ? <span className="text-xs text-red-600 font-medium">Expired</span> : <span className="text-xs text-green-600 font-medium">Active</span>}
                                  </div>
                                  {req.recipientEmail && (
                                    <p className="text-xs text-gray-500 flex items-center gap-1 mb-1.5"><Mail className="h-3 w-3" /> {req.recipientEmail}</p>
                                  )}
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
                      commissionPercent={selectedLocation.commissionPercent ?? 0}
                      monthlyCommissionPercent={selectedLocation.monthlyCommissionPercent ?? 0}
                      pricingNotes={selectedLocation.pricingNotes}
                      onSaveRates={rgPerm("canEditPricing") ? handleSaveLocationRates : undefined}
                      onSaveCommission={rgPerm("canEditPricing") ? handleSaveCommission : undefined}
                      onSaveMonthlyCommission={rgPerm("canEditPricing") ? handleSaveMonthlyCommission : undefined}
                      onSavePricingNotes={rgPerm("canEditPricing") ? handleSavePricingNotes : undefined}
                      paymentLink={selectedLocation.paymentLink}
                      onSavePaymentLink={rgPerm("canEditPricing") ? handleSaveLocationPaymentLink : undefined}
                      locationId={selectedLocation.id}
                      landlordEmail={selectedLocation.landlordEmail}
                      landlordName={selectedLocation.landlordName}
                      payments={locationPayments}
                      onPaymentCreated={() => loadLocationPayments(selectedLocation.id)}
                      actorId={user?.id}
                      serviceFeeEnabled={selectedLocation.serviceFeeEnabled}
                      serviceFee={selectedLocation.serviceFee}
                      stripeSubscriptionId={selectedLocation.stripeSubscriptionId}
                      subscriptionStatus={selectedLocation.subscriptionStatus}
                      onSaveServiceFee={(enabled, fee) => setSelectedLocation((prev: any) => prev ? { ...prev, serviceFeeEnabled: enabled, serviceFee: String(fee) } : prev)}
                      onCancelSubscription={() => setSelectedLocation((prev: any) => prev ? { ...prev, subscriptionStatus: "cancelled", stripeSubscriptionId: null } : prev)}
                      onSyncPayments={() => loadLocationPayments(selectedLocation.id)}
                    />
                  )}

                  {/* DOCUMENTS TAB */}
                  {locationDetailTab === "docs" && (
                    <div className="space-y-5">

                      {/* ── Document Signing Section ── */}
                      <div className="border rounded-xl overflow-hidden">
                        {/* Section header */}
                        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-semibold text-gray-800">Document Signing</span>
                            {locationDocSigs.length > 0 && (
                              <span className="text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 font-medium">{locationDocSigs.length}</span>
                            )}
                          </div>
                          <button
                            onClick={() => { if (showDocSignDialog) { setShowDocSignDialog(false); } else { openDocSignDialog(); } }}
                            className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                            data-testid="button-request-doc-signature"
                          >
                            {showDocSignDialog ? (
                              <><X className="h-3.5 w-3.5" /> Cancel</>
                            ) : (
                              <><Plus className="h-3.5 w-3.5" /> New Request</>
                            )}
                          </button>
                        </div>

                        {/* Inline form (shown when showDocSignDialog) */}
                        {showDocSignDialog && (
                          <div className="bg-white border-b">

                            {/* ── Recipient ── */}
                            <div className="px-4 pt-4 pb-3 border-b">
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recipient</p>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <Label htmlFor="ds-landlord-name" className="text-xs">Name</Label>
                                  <Input id="ds-landlord-name" placeholder="Full name" value={docSignLandlordName} onChange={e => setDocSignLandlordName(e.target.value)} data-testid="input-ds-landlord-name" />
                                </div>
                                <div className="space-y-1">
                                  <Label htmlFor="ds-landlord-email" className="text-xs">Email <span className="text-red-500">*</span></Label>
                                  <Input id="ds-landlord-email" type="email" placeholder="landlord@email.com" value={docSignLandlordEmail} onChange={e => setDocSignLandlordEmail(e.target.value)} data-testid="input-ds-landlord-email" />
                                </div>
                              </div>
                            </div>

                            {/* ── Documents ── */}
                            <div className="px-4 py-3 border-b space-y-3">
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Documents</p>

                              {/* Upload drop zone */}
                              <div
                                onDragOver={e => { e.preventDefault(); setDocSignDragOver(true); }}
                                onDragLeave={() => setDocSignDragOver(false)}
                                onDrop={e => { e.preventDefault(); setDocSignDragOver(false); setDocSignFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]); }}
                                onClick={() => document.getElementById("ds-file-input")?.click()}
                                className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${docSignDragOver ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-gray-50 hover:border-gray-300"}`}
                                data-testid="dropzone-doc-signature"
                              >
                                <input id="ds-file-input" type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.heic,.webp" className="sr-only"
                                  onChange={e => setDocSignFiles(prev => [...prev, ...Array.from(e.target.files || [])])} />
                                <FileText className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                                <p className="text-xs text-gray-500">Drag & drop or <span className="text-blue-600 font-medium">browse</span> — PDF, Word, images</p>
                              </div>

                              {/* Uploaded files list */}
                              {docSignFiles.length > 0 && (
                                <div className="space-y-1.5">
                                  {docSignFiles.map((f, i) => (
                                    <div key={i} className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2">
                                      <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                                      <span className="text-xs text-gray-800 flex-1 truncate">{f.name}</span>
                                      <span className="text-xs text-gray-400 shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                                      <button onClick={() => setDocSignFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-gray-300 hover:text-red-500 shrink-0">
                                        <X className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Library templates */}
                              {adminDocTemplates.length > 0 && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1.5">From library:</p>
                                  <div className="space-y-1.5">
                                    {adminDocTemplates.map(t => {
                                      const selected = docSignSelectedTemplates.includes(t.id);
                                      return (
                                        <div key={t.id} onClick={() => setDocSignSelectedTemplates(prev => selected ? prev.filter(id => id !== t.id) : [...prev, t.id])}
                                          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${selected ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-gray-300 bg-white"}`}>
                                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${selected ? "bg-blue-600 border-blue-600" : "border-gray-300"}`}>
                                            {selected && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                          </div>
                                          <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                                          <span className="text-xs text-gray-800 flex-1 truncate">{t.title}</span>
                                          <a href={t.filePath} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-xs text-blue-500 hover:underline shrink-0">View</a>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* ── Signature Fields ── */}
                            <div className="px-4 py-3 border-b space-y-3">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Required Fields</p>
                                <div className="flex gap-1.5">
                                  {[
                                    { type: "signature", label: "Signature", color: "bg-blue-600 hover:bg-blue-700" },
                                    { type: "initials", label: "Initials", color: "bg-purple-600 hover:bg-purple-700" },
                                    { type: "date", label: "Date", color: "bg-emerald-600 hover:bg-emerald-700" },
                                    { type: "text", label: "Text", color: "bg-gray-600 hover:bg-gray-700" },
                                  ].map(({ type, label, color }) => (
                                    <button key={type} onClick={() => addDocSignField(type)}
                                      className={`${color} text-white text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors`}>
                                      <Plus className="h-3 w-3" /> {label}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {docSignFields.length === 0 ? (
                                <p className="text-xs text-gray-400 italic">No fields added yet. Click a button above to add a required field for the signer.</p>
                              ) : (
                                <div className="space-y-1.5">
                                  {docSignFields.map((f, idx) => (
                                    <div key={f.id} className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2">
                                      {/* Move up/down */}
                                      <div className="flex flex-col gap-0.5 shrink-0">
                                        <button
                                          onClick={() => setDocSignFields(prev => { if (idx === 0) return prev; const a = [...prev]; [a[idx - 1], a[idx]] = [a[idx], a[idx - 1]]; return a; })}
                                          disabled={idx === 0}
                                          className="text-gray-300 hover:text-gray-600 disabled:opacity-20 leading-none"
                                          title="Move up"
                                        >▴</button>
                                        <button
                                          onClick={() => setDocSignFields(prev => { if (idx === prev.length - 1) return prev; const a = [...prev]; [a[idx], a[idx + 1]] = [a[idx + 1], a[idx]]; return a; })}
                                          disabled={idx === docSignFields.length - 1}
                                          className="text-gray-300 hover:text-gray-600 disabled:opacity-20 leading-none"
                                          title="Move down"
                                        >▾</button>
                                      </div>
                                      <span className={`text-xs font-bold px-2 py-0.5 rounded text-white shrink-0 ${f.type === "signature" ? "bg-blue-600" : f.type === "initials" ? "bg-purple-600" : f.type === "date" ? "bg-emerald-600" : "bg-gray-600"}`}>
                                        {f.type === "signature" ? "SIG" : f.type === "initials" ? "INI" : f.type === "date" ? "DATE" : "TXT"}
                                      </span>
                                      <input
                                        className="flex-1 text-sm bg-transparent border-none outline-none text-gray-800 min-w-0"
                                        value={f.label}
                                        placeholder="Field label"
                                        onChange={e => setDocSignFields(prev => prev.map((x, i) => i === idx ? { ...x, label: e.target.value } : x))}
                                      />
                                      <label className="flex items-center gap-1 text-xs text-gray-500 shrink-0 cursor-pointer">
                                        <input type="checkbox" checked={f.required}
                                          onChange={e => setDocSignFields(prev => prev.map((x, i) => i === idx ? { ...x, required: e.target.checked } : x))} />
                                        Required
                                      </label>
                                      <button onClick={() => setDocSignFields(prev => prev.filter((_, i) => i !== idx))} className="text-gray-300 hover:text-red-500 shrink-0">
                                        <X className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* ── Signing link (if SMTP not configured) ── */}
                            {docSignLink && (
                              <div className="mx-4 mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                                <p className="text-xs font-semibold text-amber-800">Email not sent — share this link with the signer:</p>
                                <div className="flex items-center gap-2 bg-white border rounded-lg px-2.5 py-2">
                                  <p className="text-xs text-gray-700 flex-1 truncate">{docSignLink}</p>
                                  <button onClick={() => { navigator.clipboard.writeText(docSignLink!); toast({ title: "Link copied!" }); }} className="shrink-0 text-blue-600 hover:text-blue-800">
                                    <Copy className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* ── Actions ── */}
                            <div className="flex items-center gap-2 px-4 py-3">
                              <Button variant="outline" size="sm" onClick={() => { setShowDocSignDialog(false); setDocSignLink(null); }}>
                                {docSignLink ? "Done" : "Cancel"}
                              </Button>
                              {!docSignLink && (
                                <Button size="sm" onClick={handleSendDocSignature}
                                  disabled={sendingDocSig || !docSignLandlordEmail.trim() || (docSignFiles.length === 0 && docSignSelectedTemplates.length === 0)}
                                  className="bg-blue-700 hover:bg-blue-800" data-testid="button-send-doc-signature">
                                  {sendingDocSig ? "Sending…" : `Send for Signature${docSignFiles.length + docSignSelectedTemplates.length > 1 ? ` (${docSignFiles.length + docSignSelectedTemplates.length} docs)` : ""}`}
                                </Button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Signing request history */}
                        {locationDocSigs.length > 0 && (
                          <div className="divide-y">
                            {locationDocSigs.map((sig: any) => {
                              const docFiles: any[] = sig.files || (sig.documentPath ? [{ filePath: sig.documentPath, fileName: sig.documentName || "Document" }] : []);
                              return (
                                <div key={sig.id} className="px-4 py-3 flex items-start gap-3 hover:bg-gray-50/60 transition-colors">
                                  <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${sig.status === "signed" ? "bg-green-500" : "bg-yellow-400"}`} />
                                  <div className="flex-1 min-w-0 space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="text-xs font-semibold text-gray-800">
                                        {docFiles.length} doc{docFiles.length !== 1 ? "s" : ""} — {sig.landlordName || sig.landlordEmail}
                                      </p>
                                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${sig.status === "signed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                                        {sig.status === "signed" ? "Signed" : "Pending"}
                                      </span>
                                    </div>
                                    {sig.status === "signed" ? (
                                      <p className="text-xs text-green-600">✓ Signed by {sig.signerName} · {sig.signedAt ? new Date(sig.signedAt).toLocaleDateString("en-CA") : "—"}</p>
                                    ) : (
                                      <p className="text-xs text-gray-400">Awaiting signature</p>
                                    )}
                                    {docFiles.length > 0 && (
                                      <div className="flex flex-wrap gap-2 mt-1">
                                        {docFiles.map((f: any, fi: number) => (
                                          <a key={fi} href={f.filePath} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                                            <FileText className="h-3 w-3" />{f.fileName || `Document ${fi + 1}`}
                                          </a>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  {sig.status === "signed" && sig.signatureData && (
                                    <a href={sig.signatureData} download={`signature-${sig.id}.png`} className="text-xs text-blue-500 hover:underline shrink-0">Sig ↓</a>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {!showDocSignDialog && locationDocSigs.length === 0 && (
                          <div className="px-4 py-6 text-center">
                            <p className="text-xs text-gray-400 italic">No signature requests yet. Click "New Request" to send a document for signature.</p>
                          </div>
                        )}
                      </div>

                      {/* ── Document Requests ── */}
                      {locationDocRequests.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Document Requests</p>
                          <div className="space-y-2">
                            {locationDocRequests.map(req => {
                              const link = `${window.location.origin}/doc-upload/${req.token}`;
                              const expired = req.expiresAt && new Date(req.expiresAt) < new Date();
                              return (
                                <div key={req.id} className="bg-white border rounded-lg p-3 text-sm">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-medium capitalize">{req.recipientType === "other" ? "Other Contact" : req.recipientType}: {req.recipientName}</span>
                                    {expired ? <span className="text-xs text-red-600 font-medium">Expired</span> : <span className="text-xs text-green-600 font-medium">Active</span>}
                                  </div>
                                  {req.recipientEmail && (
                                    <p className="text-xs text-gray-500 flex items-center gap-1 mb-1.5"><Mail className="h-3 w-3" /> {req.recipientEmail}</p>
                                  )}
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

                      {/* ── Uploaded Documents ── */}
                      {locationDocs.length > 0 && (
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

                      {locationDocs.length === 0 && locationDocRequests.length === 0 && locationDocSigs.length === 0 && !showDocSignDialog && (
                        <div className="text-center py-8"><FileText className="h-10 w-10 text-gray-300 mx-auto mb-2" /><p className="text-gray-500 text-sm">No documents yet</p><p className="text-gray-400 text-xs mt-1">Use "New Request" above to send a document for signature, or request documents from tenants.</p></div>
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
                  {Object.keys(STATUS_COLORS).map(s => <SelectItem key={s} value={s}>{STATUS_DISPLAY_LABELS[s as Status] ?? s}</SelectItem>)}
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
                  const assignedBroker = lead.brokerId ? brokers.find(b => b.id === lead.brokerId) : null;
                  const assignedRep = lead.repId ? reps.find(r => r.id === lead.repId) : null;
                  const displayStatus = STATUS_DISPLAY_LABELS[lead.status as Status] ?? lead.status;
                  return (
                    <div key={lead.id} className="bg-white border rounded-xl p-4 hover:border-blue-300 hover:shadow-sm cursor-pointer transition-all" onClick={() => openLead(lead)} data-testid={`lead-row-${lead.id}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1 min-w-0">
                          <div className="bg-blue-50 rounded-lg p-2.5 flex-shrink-0 mt-0.5"><Home className="h-5 w-5 text-blue-600" /></div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-gray-900">{lead.tenantName}</p>
                              <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${STATUS_COLORS[lead.status as Status]}`}>{displayStatus}</span>
                            </div>
                            <p className="text-sm text-gray-500 mt-0.5">{lead.propertyAddress || loc?.propertyAddress || "—"}{loc?.unit ? ` · Unit ${loc.unit}` : ""}</p>
                            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                              {lead.landlordName && <p className="text-xs text-gray-400">Landlord: {lead.landlordName}</p>}
                              <p className="text-xs text-gray-400">Rent: ${Number(lead.monthlyRent || 0).toLocaleString()}/mo</p>
                              {lead.moveInDate && <p className="text-xs text-gray-400">Move-in: {new Date(lead.moveInDate).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}</p>}
                              {lead.tenantPhone && <p className="text-xs text-gray-400">{lead.tenantPhone}</p>}
                            </div>
                            {(assignedBroker || (isAdminOrManager && assignedRep)) && (
                              <div className="flex items-center gap-1.5 mt-1.5">
                                {assignedBroker && (
                                  <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
                                    Broker: {assignedBroker.name}
                                  </span>
                                )}
                                {isAdminOrManager && assignedRep && !isRep && (
                                  <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
                                    Rep: {assignedRep.name}
                                  </span>
                                )}
                              </div>
                            )}
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
          {/* Referred from Lead Manager (admin/manager only) */}
          {isAdminOrManager && referredQuotes.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px flex-1 bg-gray-200" />
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-2">Leads Forwarded from Lead Manager</p>
                <div className="h-px flex-1 bg-gray-200" />
              </div>
              <div className="space-y-2">
                {referredQuotes.map(q => {
                  const assignedRepName = reps.find(r => r.id === q.assignedTo)?.name;
                  return (
                    <div key={q.id} className="bg-amber-50 border border-amber-200 rounded-xl p-4" data-testid={`referred-quote-${q.id}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="bg-amber-100 rounded-lg p-2 flex-shrink-0">
                            <Home className="h-4 w-4 text-amber-700" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-gray-900 text-sm">{q.clientName}</p>
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">{q.type}</span>
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                q.status === "New" ? "bg-blue-100 text-blue-800" :
                                q.status === "Quoted" ? "bg-indigo-100 text-indigo-800" :
                                q.status === "Bound" ? "bg-green-100 text-green-800" :
                                "bg-gray-100 text-gray-700"
                              }`}>{q.status}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{q.quoteNumber} · {q.email} · {q.phone}</p>
                            {assignedRepName && (
                              <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-medium mt-1 inline-block">
                                Rep: {assignedRepName}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-gray-400 flex-shrink-0">{new Date(q.createdAt).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
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

        {/* ===== COMMISSION TAB ===== */}
        {activeTab === "commission" && !(isAdminOrManager || user?.permissions?.viewCommission === true) && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <BadgePercent className="h-12 w-12 text-gray-200 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-1">Commission Access Not Enabled</h3>
            <p className="text-sm text-gray-400 max-w-xs">Your admin hasn't granted you access to view your commission details yet. Contact your administrator to request access.</p>
          </div>
        )}
        {activeTab === "commission" && (isAdminOrManager || user?.permissions?.viewCommission === true) && (() => {
          const fmtMoney = (cents: number) => `$${(cents / 100).toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });

          // Commission calculation per payment
          const calcCommission = (amountCents: number, planType: string): number => {
            if (!earnings?.commissionType || !earnings?.commissionRate) return 0;
            const rate = parseFloat(earnings.commissionRate);
            if (earnings.commissionType === "percentage") {
              const useRate = planType?.toLowerCase().includes("monthly") && earnings.renewalCommissionRate
                ? parseFloat(earnings.renewalCommissionRate) : rate;
              return Math.round((amountCents * useRate) / 100);
            }
            return Math.round(rate * 100);
          };

          const paidPayments = allPayments.filter(p => p.status === "paid");
          const pendingPayments = allPayments.filter(p => p.status === "pending");

          // Monthly breakdown: group paid payments by month
          const monthlyGroups: Record<string, { label: string; collected: number; commission: number; count: number }> = {};
          for (const p of paidPayments) {
            const d = new Date(p.paidAt || p.createdAt);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            const label = d.toLocaleDateString("en-CA", { year: "numeric", month: "long" });
            if (!monthlyGroups[key]) monthlyGroups[key] = { label, collected: 0, commission: 0, count: 0 };
            monthlyGroups[key].collected += p.amountCents;
            monthlyGroups[key].commission += calcCommission(p.amountCents, p.planType);
            monthlyGroups[key].count++;
          }
          const monthlyRows = Object.entries(monthlyGroups).sort((a, b) => b[0].localeCompare(a[0]));

          const totalCommission = paidPayments.reduce((s, p) => s + calcCommission(p.amountCents, p.planType), 0);
          const totalCollected = paidPayments.reduce((s, p) => s + p.amountCents, 0);
          const totalSubmitted = allPayments.reduce((s, p) => s + p.amountCents, 0);
          const monthlyPlanPayments = paidPayments.filter(p => p.planType?.toLowerCase().includes("monthly"));

          return (
            <div className="space-y-6" data-testid="tab-commission-content">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border rounded-xl p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Submitted</p>
                  <p className="text-xl font-bold text-gray-900" data-testid="text-commission-submitted">{fmtMoney(totalSubmitted)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{allPayments.length} file{allPayments.length !== 1 ? "s" : ""}</p>
                </div>
                <div className="bg-white border rounded-xl p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Collected</p>
                  <p className="text-xl font-bold text-green-700" data-testid="text-commission-collected">{fmtMoney(totalCollected)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{paidPayments.length} confirmed</p>
                </div>
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl p-4">
                  <p className="text-xs text-indigo-600 uppercase tracking-wide mb-1">Commission Earned</p>
                  <p className="text-xl font-bold text-indigo-700" data-testid="text-commission-earned">{fmtMoney(totalCommission)}</p>
                  {earnings?.commissionRate && (
                    <p className="text-xs text-indigo-400 mt-0.5">
                      {earnings.commissionType === "percentage" ? `${parseFloat(earnings.commissionRate).toFixed(2)}% rate` : `$${parseFloat(earnings.commissionRate).toFixed(2)}/payment`}
                    </p>
                  )}
                </div>
                <div className="bg-white border rounded-xl p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Monthly Renewals</p>
                  <p className="text-xl font-bold text-blue-700" data-testid="text-commission-renewals">{monthlyPlanPayments.length}</p>
                  <p className="text-xs text-gray-400 mt-0.5">monthly plan payment{monthlyPlanPayments.length !== 1 ? "s" : ""}</p>
                </div>
              </div>

              {/* Admin-Approved Commission Terms */}
              {earnings?.commissionRate ? (
                <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-300 rounded-xl p-5" data-testid="card-approved-commission">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-indigo-900 text-base flex items-center gap-2">
                        <BadgePercent className="h-5 w-5 text-indigo-600" />
                        Admin-Approved Commission Terms
                      </h3>
                      <p className="text-xs text-indigo-500 mt-0.5">Set and approved by your admin</p>
                    </div>
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold border border-green-200">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Approved
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white/70 rounded-lg p-3 border border-indigo-100">
                      <p className="text-xs text-indigo-500 uppercase tracking-wide mb-1">Commission Rate</p>
                      <p className="text-2xl font-bold text-indigo-800" data-testid="text-approved-rate">
                        {earnings.commissionType === "percentage"
                          ? `${parseFloat(earnings.commissionRate).toFixed(2)}%`
                          : `$${parseFloat(earnings.commissionRate).toFixed(2)}`}
                      </p>
                      <p className="text-xs text-indigo-400 mt-0.5">
                        {earnings.commissionType === "percentage" ? "of collected premium" : "fixed per payment"}
                      </p>
                    </div>
                    {earnings.renewalCommissionRate && (
                      <div className="bg-white/70 rounded-lg p-3 border border-indigo-100">
                        <p className="text-xs text-indigo-500 uppercase tracking-wide mb-1">Renewal Rate</p>
                        <p className="text-2xl font-bold text-indigo-800" data-testid="text-renewal-rate">
                          {parseFloat(earnings.renewalCommissionRate).toFixed(2)}%
                        </p>
                        <p className="text-xs text-indigo-400 mt-0.5">monthly plan renewals</p>
                      </div>
                    )}
                    {earnings.payoutSchedule && (
                      <div className="bg-white/70 rounded-lg p-3 border border-indigo-100">
                        <p className="text-xs text-indigo-500 uppercase tracking-wide mb-1">Payout Schedule</p>
                        <p className="text-lg font-bold text-indigo-800 capitalize" data-testid="text-payout-schedule">{earnings.payoutSchedule}</p>
                        <p className="text-xs text-indigo-400 mt-0.5">payment frequency</p>
                      </div>
                    )}
                    <div className="bg-white/70 rounded-lg p-3 border border-indigo-100">
                      <p className="text-xs text-indigo-500 uppercase tracking-wide mb-1">Type</p>
                      <p className="text-lg font-bold text-indigo-800 capitalize" data-testid="text-commission-type">
                        {earnings.commissionType === "percentage" ? "Percentage" : "Fixed"}
                      </p>
                      <p className="text-xs text-indigo-400 mt-0.5">commission structure</p>
                    </div>
                  </div>
                  {earnings.commissionNotes && (
                    <div className="mt-3 pt-3 border-t border-indigo-200">
                      <p className="text-xs text-indigo-600 font-medium mb-1">Terms &amp; Notes</p>
                      <p className="text-sm text-indigo-700">{earnings.commissionNotes}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-5 text-center" data-testid="card-no-commission">
                  <BadgePercent className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm font-medium text-gray-500">No Commission Rate Set</p>
                  <p className="text-xs text-gray-400 mt-1">Your admin hasn't configured a commission rate for your account yet.</p>
                </div>
              )}

              {/* Files Table */}
              <div className="bg-white border rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b bg-gray-50 flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-gray-700">All Files Submitted</h3>
                  <span className="text-xs text-gray-400">{allPayments.length} record{allPayments.length !== 1 ? "s" : ""}</span>
                </div>
                {allPayments.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No payments submitted yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Policy / Acct #</th>
                          <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Property</th>
                          <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Plan</th>
                          <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Period</th>
                          <th className="text-right px-4 py-2 font-medium text-gray-500 text-xs">Premium</th>
                          <th className="text-center px-4 py-2 font-medium text-gray-500 text-xs">Status</th>
                          <th className="text-right px-4 py-2 font-medium text-gray-500 text-xs">Commission</th>
                          <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {allPayments.map((p, i) => {
                          const comm = p.status === "paid" ? calcCommission(p.amountCents, p.planType) : 0;
                          const isMonthly = p.planType?.toLowerCase().includes("monthly");
                          return (
                            <tr key={p.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"} data-testid={`row-commission-${p.id}`}>
                              <td className="px-4 py-2.5 font-mono text-xs font-semibold text-violet-700">
                                {p.applicationNumber || <span className="text-gray-300">—</span>}
                              </td>
                              <td className="px-4 py-2.5 text-gray-700 max-w-[180px] truncate" title={p.propertyAddress}>
                                {p.propertyAddress}
                              </td>
                              <td className="px-4 py-2.5">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${isMonthly ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"}`}>
                                  {isMonthly ? "Monthly" : "Annual"}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-gray-500 text-xs">{p.periodLabel || "—"}</td>
                              <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{fmtMoney(p.amountCents)}</td>
                              <td className="px-4 py-2.5 text-center">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  p.status === "paid" ? "bg-green-50 text-green-700" :
                                  p.status === "failed" ? "bg-red-50 text-red-700" :
                                  "bg-yellow-50 text-yellow-700"
                                }`}>{p.status}</span>
                              </td>
                              <td className="px-4 py-2.5 text-right font-semibold text-indigo-700">
                                {p.status === "paid" ? fmtMoney(comm) : <span className="text-gray-300">—</span>}
                              </td>
                              <td className="px-4 py-2.5 text-xs text-gray-400">{fmtDate(p.paidAt || p.createdAt)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="border-t bg-gray-50">
                        <tr>
                          <td colSpan={4} className="px-4 py-2 text-xs text-gray-500 font-medium">Totals</td>
                          <td className="px-4 py-2 text-right font-bold text-gray-900">{fmtMoney(totalSubmitted)}</td>
                          <td></td>
                          <td className="px-4 py-2 text-right font-bold text-indigo-700">{fmtMoney(totalCommission)}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              {/* Monthly Breakdown */}
              {monthlyRows.length > 0 && (
                <div className="bg-white border rounded-xl overflow-hidden">
                  <div className="px-5 py-3 border-b bg-gray-50">
                    <h3 className="font-semibold text-sm text-gray-700">Monthly Payout Breakdown</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Collected premiums and commission per calendar month</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Month</th>
                          <th className="text-right px-4 py-2 font-medium text-gray-500 text-xs">Payments</th>
                          <th className="text-right px-4 py-2 font-medium text-gray-500 text-xs">Collected</th>
                          <th className="text-right px-4 py-2 font-medium text-gray-500 text-xs">Commission</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {monthlyRows.map(([key, g], i) => (
                          <tr key={key} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"} data-testid={`row-monthly-${key}`}>
                            <td className="px-4 py-2.5 font-medium text-gray-700">{g.label}</td>
                            <td className="px-4 py-2.5 text-right text-gray-500">{g.count}</td>
                            <td className="px-4 py-2.5 text-right font-semibold text-green-700">{fmtMoney(g.collected)}</td>
                            <td className="px-4 py-2.5 text-right font-semibold text-indigo-700">{fmtMoney(g.commission)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Monthly Renewal Payments */}
              {monthlyPlanPayments.length > 0 && (
                <div className="bg-white border rounded-xl overflow-hidden">
                  <div className="px-5 py-3 border-b bg-blue-50">
                    <h3 className="font-semibold text-sm text-blue-700">Monthly Renewal Payments</h3>
                    <p className="text-xs text-blue-400 mt-0.5">Recurring monthly plan collections</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Policy / Acct #</th>
                          <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Property</th>
                          <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Period</th>
                          <th className="text-right px-4 py-2 font-medium text-gray-500 text-xs">Premium</th>
                          <th className="text-right px-4 py-2 font-medium text-gray-500 text-xs">Commission</th>
                          <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Paid</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {monthlyPlanPayments.map((p, i) => (
                          <tr key={p.id} className={i % 2 === 0 ? "bg-white" : "bg-blue-50/30"} data-testid={`row-renewal-${p.id}`}>
                            <td className="px-4 py-2.5 font-mono text-xs font-semibold text-violet-700">{p.applicationNumber || "—"}</td>
                            <td className="px-4 py-2.5 text-gray-700 max-w-[180px] truncate" title={p.propertyAddress}>{p.propertyAddress}</td>
                            <td className="px-4 py-2.5 text-gray-500 text-xs">{p.periodLabel || "—"}</td>
                            <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{fmtMoney(p.amountCents)}</td>
                            <td className="px-4 py-2.5 text-right font-semibold text-indigo-700">{fmtMoney(calcCommission(p.amountCents, p.planType))}</td>
                            <td className="px-4 py-2.5 text-xs text-gray-400">{p.paidAt ? fmtDate(p.paidAt) : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Payout History */}
              {payouts.length > 0 && (
                <div className="bg-white border rounded-xl overflow-hidden">
                  <div className="px-5 py-3 border-b bg-gray-50">
                    <h3 className="font-semibold text-sm text-gray-700">Payout History</h3>
                  </div>
                  <div className="divide-y">
                    {payouts.map((payout: any) => (
                      <div key={payout.id} className="flex items-center justify-between px-5 py-3" data-testid={`row-payout-${payout.id}`}>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{fmtMoney(payout.amountCents)}</p>
                          <p className="text-xs text-gray-400">{payout.periodLabel || "—"} · {payout.notes || ""}</p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${payout.status === "paid" ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}`}>
                            {payout.status}
                          </span>
                          {payout.paidAt && <p className="text-xs text-gray-400 mt-0.5">{fmtDate(payout.paidAt)}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* ===== LEAD DETAIL PANEL ===== */}
      <Dialog open={!!selectedLead} onOpenChange={(o) => { if (!o) setSelectedLead(null); }}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden [&>button.absolute]:text-white [&>button.absolute]:top-3 [&>button.absolute]:right-3">
          {selectedLead && (
          <div className="flex flex-col overflow-y-auto max-h-[88vh]">
            {/* Header */}
            <div className="p-4 border-b flex items-start bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
              <div className="flex-1 min-w-0 pr-12">
                <h2 className="text-base font-bold truncate">{selectedLead.tenantName}</h2>
                <p className="text-blue-100 text-xs mt-0.5 truncate">{selectedLead.propertyAddress}</p>
                <p className="text-blue-200 text-xs">${Number(selectedLead.monthlyRent).toLocaleString()}/month</p>
              </div>
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
              <button onClick={() => setDetailTab("docs")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${detailTab === "docs" ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:bg-gray-100"}`} data-testid="tab-lead-docs">Documents ({documents.length})</button>
              <button onClick={() => setDetailTab("processing")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${detailTab === "processing" ? "bg-indigo-50 text-indigo-700" : "text-gray-500 hover:bg-gray-100"}`} data-testid="tab-lead-processing">
                {(selectedLead as any).processingStatus === "file_received" ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : (selectedLead as any).processingStatus === "sent" ? <Clock className="h-3.5 w-3.5 text-amber-500" /> : null}
                Processing
              </button>
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
                      {selectedLead.householdIncome && selectedLead.monthlyRent && (() => {
                        const monthlyIncome = Number(selectedLead.householdIncome) / 12;
                        const pct = monthlyIncome > 0 ? (Number(selectedLead.monthlyRent) / monthlyIncome) * 100 : 0;
                        const color = pct <= 30 ? { bar: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50 border-green-200', label: 'Affordable' }
                          : pct <= 40 ? { bar: 'bg-yellow-400', text: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200', label: 'Moderate' }
                          : pct <= 50 ? { bar: 'bg-orange-500', text: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', label: 'High' }
                          : { bar: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50 border-red-200', label: 'Very High' };
                        return (
                          <div className={`mt-2 rounded-md border p-3 ${color.bg}`} data-testid="rent-to-income-calc">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Rent-to-Income Ratio</span>
                              <span className={`text-sm font-bold ${color.text}`}>{pct.toFixed(1)}% <span className="font-normal text-xs">({color.label})</span></span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
                              <div className={`h-2 rounded-full ${color.bar} transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
                            </div>
                            <p className="text-[11px] text-gray-500 mt-1.5">
                              ${Number(selectedLead.monthlyRent).toLocaleString()}/mo rent ÷ ${Math.round(monthlyIncome).toLocaleString()}/mo income
                            </p>
                          </div>
                        );
                      })()}
                      {selectedLead.paymentMethod && <p><span className="text-gray-500">Payment Method:</span> {selectedLead.paymentMethod}</p>}
                      {selectedLead.coApplicantName && <p><span className="text-gray-500">Co-Applicant:</span> {selectedLead.coApplicantName} ({selectedLead.coApplicantEmail})</p>}
                    </CardContent>
                  </Card>

                  {/* Verification Checklist */}
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-600">Verification Checklist</CardTitle></CardHeader>
                    <CardContent className="space-y-5">
                      {/* ── New Customer Screening ── */}
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">New Customer Screening</p>
                        <div className="space-y-2.5">
                          {([
                            { field: "creditReportOnFile" as const,        label: "Credit Report on File",           danger: false },
                            { field: "bankruptcyLastThreeYears" as const,  label: "Bankruptcy in Last 3 Years",      danger: true  },
                            { field: "noEvictionsOrJudgements" as const,   label: "No Evictions or Judgements",      danger: false },
                            { field: "employmentLetterOnFile" as const,    label: "Employment Letter on File",       danger: false },
                            { field: "governmentIdOnFile" as const,        label: "Government ID on File",           danger: false },
                            { field: "twelveMonthLease" as const,          label: "12 Month Lease",                  danger: false },
                          ]).map(({ field, label, danger }) => {
                            const checked = !!(selectedLead as any)[field];
                            const isRed = danger ? checked : false;
                            const isGreen = !danger && checked;
                            return (
                              <div key={field} className="flex items-center gap-3" data-testid={`check-${field}`}>
                                <div className="shrink-0">
                                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isRed ? "bg-red-500 border-red-500" : isGreen ? "bg-green-500 border-green-500" : "border-gray-300 bg-white"}`}>
                                    {checked && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                  </div>
                                </div>
                                <span className={`text-sm flex-1 ${isRed ? "text-red-700 font-medium" : isGreen ? "text-green-700 font-medium" : "text-gray-600"}`}>{label}</span>
                                <div className="flex shrink-0 rounded-full border border-gray-200 overflow-hidden text-xs font-semibold">
                                  <button onClick={() => toggleLeadFlag(field, true)} className={`px-3 py-1 transition-colors ${checked ? (danger ? "bg-red-500 text-white" : "bg-green-500 text-white") : "bg-white text-gray-400 hover:bg-gray-50"}`} data-testid={`yes-${field}`}>Yes</button>
                                  <button onClick={() => toggleLeadFlag(field, false)} className={`px-3 py-1 border-l border-gray-200 transition-colors ${!checked ? "bg-gray-200 text-gray-700" : "bg-white text-gray-400 hover:bg-gray-50"}`} data-testid={`no-${field}`}>No</button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="border-t pt-4">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Existing Tenant Review</p>
                        <div className="space-y-2.5">
                          {([
                            { field: "leaseViolation" as const,                     label: "Lease Violation",                                          danger: true  },
                            { field: "rentArrearsLastTwelveMonths" as const,        label: "Rent Arrears > 5 Days in Last 12 Months",                  danger: true  },
                            { field: "noDefaultFirstSixtyDays" as const,            label: "No Default Within First 60 Days After Agreement Start",    danger: false },
                            { field: "ongoingEmploymentNoTerminationRisk" as const, label: "Ongoing Employment — No Known Termination Risk",           danger: false },
                          ]).map(({ field, label, danger }) => {
                            const checked = !!(selectedLead as any)[field];
                            const isRed = danger ? checked : false;
                            const isGreen = !danger && checked;
                            return (
                              <div key={field} className="flex items-center gap-3" data-testid={`check-${field}`}>
                                <div className="shrink-0">
                                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isRed ? "bg-red-500 border-red-500" : isGreen ? "bg-green-500 border-green-500" : "border-gray-300 bg-white"}`}>
                                    {checked && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                  </div>
                                </div>
                                <span className={`text-sm flex-1 ${isRed ? "text-red-700 font-medium" : isGreen ? "text-green-700 font-medium" : "text-gray-600"}`}>{label}</span>
                                <div className="flex shrink-0 rounded-full border border-gray-200 overflow-hidden text-xs font-semibold">
                                  <button onClick={() => toggleLeadFlag(field, true)} className={`px-3 py-1 transition-colors ${checked ? (danger ? "bg-red-500 text-white" : "bg-green-500 text-white") : "bg-white text-gray-400 hover:bg-gray-50"}`} data-testid={`yes-${field}`}>Yes</button>
                                  <button onClick={() => toggleLeadFlag(field, false)} className={`px-3 py-1 border-l border-gray-200 transition-colors ${!checked ? "bg-gray-200 text-gray-700" : "bg-white text-gray-400 hover:bg-gray-50"}`} data-testid={`no-${field}`}>No</button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="border-t pt-4">
                        <label className="flex items-center gap-3 cursor-pointer group" data-testid="check-documentsReceived">
                          <div className="relative shrink-0">
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={!!(selectedLead as any).documentsReceived}
                              onChange={e => toggleLeadFlag("documentsReceived", e.target.checked)}
                            />
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${(selectedLead as any).documentsReceived ? "bg-blue-600 border-blue-600" : "border-gray-300 bg-white group-hover:border-blue-400"}`}>
                              {(selectedLead as any).documentsReceived && (
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                              )}
                            </div>
                          </div>
                          <span className={`text-sm font-semibold ${(selectedLead as any).documentsReceived ? "text-blue-700" : "text-gray-600"}`}>
                            Documents Received
                          </span>
                          {(selectedLead as any).documentsReceived && (
                            <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 shrink-0">Confirmed</span>
                          )}
                        </label>
                      </div>
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

                  {/* Assignment — admin/manager only */}
                  {isAdminOrManager && (() => {
                    const rgBrokers = brokers.filter(b => Array.isArray(b.preferredInsuranceTypes) && b.preferredInsuranceTypes.includes("Rent Guarantee"));
                    const currentRep = reps.find(r => r.id === (selectedLead as any).repId);
                    const currentBroker = rgBrokers.find(b => b.id === (selectedLead as any).brokerId);
                    return (
                      <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-600">Assignment</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                          {/* Rep Assignment */}
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Rep</p>
                            {currentRep ? (
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{currentRep.name}</p>
                                  <p className="text-xs text-gray-500">{currentRep.email}</p>
                                </div>
                                <button onClick={() => handleAssignRep(null)} disabled={assigningRep} className="text-xs text-red-500 hover:text-red-700 font-medium" data-testid="button-unassign-rep">
                                  {assigningRep ? "..." : "Unassign"}
                                </button>
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400 mb-2">No rep assigned</p>
                            )}
                            <div className="flex gap-2">
                              <Select value={selectedRepId} onValueChange={setSelectedRepId}>
                                <SelectTrigger className="h-8 text-xs flex-1" data-testid="select-assign-rep">
                                  <SelectValue placeholder="Select a rep..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {reps.length === 0 && <SelectItem value="none" disabled>No active reps</SelectItem>}
                                  {reps.map(r => (
                                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button size="sm" className="h-8 text-xs px-3" onClick={() => handleAssignRep(selectedRepId || null)} disabled={!selectedRepId || assigningRep} data-testid="button-assign-rep">
                                {assigningRep ? "Assigning..." : "Assign"}
                              </Button>
                            </div>
                          </div>
                          {/* Broker Assignment — only brokers with Rent Guarantee permission */}
                          {rgBrokers.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Broker (Rent Guarantee)</p>
                              {currentBroker ? (
                                <div className="flex items-center justify-between mb-2">
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">{currentBroker.name}</p>
                                    <p className="text-xs text-gray-500">{currentBroker.email}</p>
                                  </div>
                                  <button onClick={() => handleAssignBroker(null)} disabled={assigningBroker} className="text-xs text-red-500 hover:text-red-700 font-medium" data-testid="button-unassign-broker">
                                    {assigningBroker ? "..." : "Unassign"}
                                  </button>
                                </div>
                              ) : (
                                <p className="text-xs text-gray-400 mb-2">No broker assigned</p>
                              )}
                              <div className="flex gap-2">
                                <Select value={selectedBrokerId} onValueChange={setSelectedBrokerId}>
                                  <SelectTrigger className="h-8 text-xs flex-1" data-testid="select-assign-broker">
                                    <SelectValue placeholder="Select a broker..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {rgBrokers.map(b => (
                                      <SelectItem key={b.id} value={b.id}>{b.name} — ${Number(b.balance).toFixed(2)}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button size="sm" className="h-8 text-xs px-3" onClick={() => handleAssignBroker(selectedBrokerId || null)} disabled={!selectedBrokerId || assigningBroker} data-testid="button-assign-broker">
                                  {assigningBroker ? "Assigning..." : "Assign"}
                                </Button>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })()}

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
                                <span className="font-medium capitalize">{req.recipientType === "other" ? "Other Contact" : req.recipientType}: {req.recipientName}</span>
                                {expired ? <span className="text-xs text-red-600 font-medium">Expired</span> : <span className="text-xs text-green-600 font-medium">Active</span>}
                              </div>
                              {req.recipientEmail && (
                                <p className="text-xs text-gray-500 flex items-center gap-1 mb-1.5"><Mail className="h-3 w-3" /> {req.recipientEmail}</p>
                              )}
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

              {/* PROCESSING TAB */}
              {detailTab === "processing" && (
                <div className="space-y-5">

                  {/* File Number — prominent display if received */}
                  {(selectedLead as any).processingStatus === "file_received" && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
                      <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Official File Number</p>
                      <p className="text-3xl font-bold text-green-800 tracking-wider">{(selectedLead as any).processingFileNumber}</p>
                      <p className="text-xs text-green-600 mt-2">Application successfully processed</p>
                      {(selectedLead as any).processingSentAt && (
                        <p className="text-xs text-green-500 mt-1">Submitted {new Date((selectedLead as any).processingSentAt).toLocaleDateString("en-CA")}</p>
                      )}
                    </div>
                  )}

                  {/* Waiting for file number */}
                  {(selectedLead as any).processingStatus === "sent" && (selectedLead as any).processingStatus !== "file_received" && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <Clock className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium text-amber-800">Waiting for Official File Number</p>
                          <p className="text-sm text-amber-600 mt-0.5">Application submitted for processing{(selectedLead as any).processingSentAt ? ` on ${new Date((selectedLead as any).processingSentAt).toLocaleDateString("en-CA")}` : ""}.</p>
                          {processingResult && (
                            <p className="text-xs text-amber-500 mt-1">{processingResult.sent ? `Sent to ${processingResult.emailedTo}` : "Logged (SMTP not configured)"} — {processingResult.documentCount} document(s)</p>
                          )}
                        </div>
                      </div>
                      {/* Enter file number once received */}
                      <div className="mt-4 pt-4 border-t border-amber-100">
                        <p className="text-xs font-semibold text-amber-700 mb-2">Enter File Number When Received</p>
                        <div className="flex gap-2">
                          <Input
                            placeholder="e.g. RG-2026-00123"
                            value={fileNumberInput}
                            onChange={e => setFileNumberInput(e.target.value)}
                            className="flex-1 bg-white"
                            data-testid="input-file-number"
                            onKeyDown={e => { if (e.key === "Enter") handleSaveFileNumber(); }}
                          />
                          <Button onClick={handleSaveFileNumber} disabled={savingFileNumber || !fileNumberInput.trim()} className="bg-green-600 hover:bg-green-700" data-testid="button-save-file-number">
                            {savingFileNumber ? "Saving..." : "Save"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* File number input shown even if file_received (to correct it) */}
                  {(selectedLead as any).processingStatus === "file_received" && (
                    <div className="mt-1">
                      <p className="text-xs text-gray-400 mb-2">Update file number if needed:</p>
                      <div className="flex gap-2">
                        <Input placeholder="New file number" value={fileNumberInput} onChange={e => setFileNumberInput(e.target.value)} className="flex-1" data-testid="input-file-number-update" />
                        <Button variant="outline" size="sm" onClick={handleSaveFileNumber} disabled={savingFileNumber || !fileNumberInput.trim()} data-testid="button-update-file-number">Update</Button>
                      </div>
                    </div>
                  )}

                  {/* Collected Documents summary */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-gray-600 flex items-center justify-between">
                        <span>Collected Documents ({documents.length})</span>
                        {documents.length > 0 && (selectedLead as any).processingStatus === "none" && (
                          <span className="text-xs font-normal text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Ready to send</span>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {documents.length === 0 ? (
                        <div className="text-center py-6 text-gray-400">
                          <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                          <p className="text-sm">No documents collected yet.</p>
                          <p className="text-xs mt-1">Use the Documents tab to request and receive files.</p>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {documents.map(doc => (
                            <div key={doc.id} className="flex items-center gap-2 text-sm py-1">
                              <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                              <span className="font-medium">{doc.fileName}</span>
                              <span className="text-gray-400">— {doc.docType}</span>
                              <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="ml-auto text-blue-500 hover:text-blue-700"><ExternalLink className="h-3.5 w-3.5" /></a>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Contact Summary */}
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-600">Application Summary</CardTitle></CardHeader>
                    <CardContent className="text-sm space-y-3">
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Tenant</p>
                        <p className="font-medium">{selectedLead.tenantName}</p>
                        <p className="text-gray-500">{selectedLead.tenantEmail} · {selectedLead.tenantPhone}</p>
                        {selectedLead.employmentStatus && <p className="text-gray-500">{selectedLead.employmentStatus}{selectedLead.employerName ? ` — ${selectedLead.employerName}` : ""}</p>}
                        {selectedLead.coApplicantName && <p className="text-gray-500">Co-applicant: {selectedLead.coApplicantName}</p>}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Landlord</p>
                        <p className="font-medium">{selectedLead.landlordName}</p>
                        {selectedLead.landlordEmail && <p className="text-gray-500">{selectedLead.landlordEmail}</p>}
                        {selectedLead.landlordPhone && <p className="text-gray-500">{selectedLead.landlordPhone}</p>}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Property</p>
                        <p className="font-medium">{selectedLead.propertyAddress}</p>
                        <p className="text-gray-500">${Number(selectedLead.monthlyRent).toLocaleString()}/month{selectedLead.moveInDate ? ` · Move-in ${selectedLead.moveInDate}` : ""}</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Send for Processing button */}
                  {(selectedLead as any).processingStatus !== "file_received" && (
                    <div className="pt-1">
                      <Button
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 text-base font-semibold gap-2"
                        onClick={handleSendForProcessing}
                        disabled={sendingForProcessing}
                        data-testid="button-send-for-processing"
                      >
                        {sendingForProcessing ? (
                          <><RefreshCw className="h-4 w-4 animate-spin" /> Sending...</>
                        ) : (selectedLead as any).processingStatus === "sent" ? (
                          <><RefreshCw className="h-4 w-4" /> Resend for Processing</>
                        ) : (
                          <><Send className="h-4 w-4" /> Send for Processing</>
                        )}
                      </Button>
                      {documents.length === 0 && (
                        <p className="text-xs text-center text-amber-600 mt-2">No documents collected yet — consider adding documents before sending</p>
                      )}
                      <p className="text-xs text-center text-gray-400 mt-2">This will email all tenant &amp; landlord details plus all collected documents to the processing team</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          )}
        </DialogContent>
      </Dialog>

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
                  <div className="col-span-2 space-y-1.5"><Label>Street Address *</Label><Input placeholder="456 Oak Ave" value={locationForm.street} onChange={e => setLocationForm(p => ({ ...p, street: e.target.value }))} data-testid="input-location-street" /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5"><Label>City *</Label><Input placeholder="Toronto" value={locationForm.city} onChange={e => setLocationForm(p => ({ ...p, city: e.target.value }))} data-testid="input-location-city" /></div>
                  <div className="space-y-1.5">
                    <Label>Province</Label>
                    <Select value={locationForm.province} onValueChange={v => setLocationForm(p => ({ ...p, province: v }))}>
                      <SelectTrigger data-testid="select-location-province"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["AB","BC","MB","NB","NL","NS","NT","NU","ON","PE","QC","SK","YT"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5"><Label>Postal Code *</Label><Input placeholder="M6K 2P3" value={locationForm.postalCode} onChange={e => setLocationForm(p => ({ ...p, postalCode: e.target.value }))} data-testid="input-location-postal" /></div>
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
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Other Contact <span className="normal-case text-gray-400 font-normal">(Optional)</span></p>
              <p className="text-xs text-gray-400 mb-3">An additional contact such as a property manager, agent, or emergency contact</p>
              <div className="space-y-3">
                <div className="space-y-1.5"><Label>Contact Name</Label><Input placeholder="Full name" value={locationForm.otherContactName} onChange={e => setLocationForm(p => ({ ...p, otherContactName: e.target.value }))} data-testid="input-location-other-name" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Contact Email</Label><Input type="email" placeholder="email@example.com" value={locationForm.otherContactEmail} onChange={e => setLocationForm(p => ({ ...p, otherContactEmail: e.target.value }))} data-testid="input-location-other-email" /></div>
                  <div className="space-y-1.5"><Label>Contact Phone</Label><Input placeholder="416-xxx-xxxx" value={locationForm.otherContactPhone} onChange={e => setLocationForm(p => ({ ...p, otherContactPhone: e.target.value }))} data-testid="input-location-other-phone" /></div>
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
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {isAdminOrManager && tenantFormAutoOpened && (
              <Button variant="ghost" className="text-gray-500 sm:mr-auto" onClick={() => setShowTenantForm(false)} data-testid="button-add-tenant-later">
                Add Tenants Later
              </Button>
            )}
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
      {/* ── Send Agreement Dialog ── */}
      <Dialog open={showSendAgreement} onOpenChange={setShowSendAgreement}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileSignature className="h-5 w-5 text-blue-600" /> Send Agreement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {selectedLocation && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm text-blue-800">
                Sending agreement for <strong>{selectedLocation.propertyAddress}{selectedLocation.unit ? `, Unit ${selectedLocation.unit}` : ""}</strong>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="agr-email">Landlord Email <span className="text-red-500">*</span></Label>
              <Input
                id="agr-email"
                type="email"
                placeholder="landlord@email.com"
                value={agreementEmail}
                onChange={e => setAgreementEmail(e.target.value)}
                data-testid="input-agreement-email"
              />
            </div>
            {locationSignature && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                A previous agreement was sent on {new Date(locationSignature.sentAt).toLocaleDateString("en-CA")}. Sending again will create a new signature request.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendAgreement(false)}>Cancel</Button>
            <Button onClick={handleSendAgreement} disabled={sendingAgreement || !agreementEmail.trim()} className="bg-blue-700 hover:bg-blue-800" data-testid="button-confirm-send-agreement">
              {sendingAgreement ? "Sending…" : "Send Agreement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


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
              {/* Recipient Type */}
              <div className="space-y-2">
                <Label>Send Request To</Label>
                <Select
                  value={docReqForm.recipientType}
                  onValueChange={v => {
                    const loc = selectedLocation as any;
                    const lead = selectedLead;
                    let name = "";
                    let email = "";
                    if (v === "tenant") {
                      name = lead?.tenantName || "";
                      email = lead?.tenantEmail || "";
                    } else if (v === "landlord") {
                      name = loc?.landlordName || lead?.landlordName || "";
                      email = loc?.landlordEmail || lead?.landlordEmail || "";
                    } else if (v === "other") {
                      name = loc?.otherContactName || "";
                      email = loc?.otherContactEmail || "";
                    }
                    setDocReqForm(p => ({ ...p, recipientType: v, recipientName: name || p.recipientName, recipientEmail: email || p.recipientEmail, requiredDocs: [] }));
                  }}
                >
                  <SelectTrigger data-testid="select-doc-recipient-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tenant">Tenant</SelectItem>
                    <SelectItem value="landlord">Landlord</SelectItem>
                    {((selectedLocation as any)?.otherContactEmail || (selectedLocation as any)?.otherContactName) && (
                      <SelectItem value="other">Other Contact{(selectedLocation as any)?.otherContactName ? ` — ${(selectedLocation as any).otherContactName}` : ""}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Recipient Name */}
              <div className="space-y-2"><Label>Recipient Name *</Label><Input value={docReqForm.recipientName} onChange={e => setDocReqForm(p => ({ ...p, recipientName: e.target.value }))} data-testid="input-doc-recipient-name" /></div>

              {/* Recipient Email with prominent banner */}
              <div className="space-y-2">
                <Label>Recipient Email *</Label>
                <Input type="email" value={docReqForm.recipientEmail} onChange={e => setDocReqForm(p => ({ ...p, recipientEmail: e.target.value }))} data-testid="input-doc-recipient-email" />
                {docReqForm.recipientEmail && (
                  <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mt-1" data-testid="banner-doc-email-recipient">
                    <Mail className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-blue-600 font-medium">Upload link will be sent to:</p>
                      <p className="text-sm font-semibold text-blue-900 truncate">{docReqForm.recipientEmail}</p>
                      {docReqForm.recipientName && <p className="text-xs text-blue-500">{docReqForm.recipientName}</p>}
                    </div>
                  </div>
                )}
              </div>

              {/* Documents Required */}
              <div className="space-y-2">
                <Label>Documents Required</Label>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {(docReqForm.recipientType === "landlord" ? LANDLORD_DOC_TYPES : TENANT_DOC_TYPES).map(doc => (
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
