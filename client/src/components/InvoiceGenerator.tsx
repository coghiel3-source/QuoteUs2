import { useState, useRef, useEffect, forwardRef } from "react";
import { FileText, Download, Send, Mail, Plus, ChevronDown, ChevronUp, CheckCircle2, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface RgInvoice {
  id: string;
  invoiceNumber: string;
  monthlyRentCents: number;
  annualRatePct: string;
  monthlyRatePct: string;
  annualAmountCents: number;
  monthlyAmountCents: number;
  landlordName: string | null;
  landlordEmail: string | null;
  propertyAddress: string | null;
  notes: string | null;
  status: string | null;
  emailedAt: string | null;
  createdAt: string;
}

interface Props {
  locationId: string;
  actorId?: string;
  monthlyRent: number;
  annualRatePct: number;
  monthlyRatePct: number;
  annualAmountCents: number;
  monthlyAmountCents: number;
  landlordName?: string | null;
  landlordEmail?: string | null;
  propertyAddress?: string | null;
}

function fmtCAD(cents: number) {
  return `$${(cents / 100).toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPct(pct: string | number) {
  return `${parseFloat(String(pct)).toFixed(2)}%`;
}

// ── Invoice Print Template (rendered off-screen for PDF capture) ────────────
const InvoiceTemplate = forwardRef<HTMLDivElement, {
  invoice: Partial<RgInvoice> & {
    invoiceNumber: string;
    monthlyRentCents: number;
    annualRatePct: string;
    monthlyRatePct: string;
    annualAmountCents: number;
    monthlyAmountCents: number;
  };
  date: string;
}>(({ invoice, date }, ref) => {
  const annualMonthly = Math.round(invoice.annualAmountCents / 12);
  const monthlyAnnual = invoice.monthlyAmountCents * 12;

  return (
    <div
      ref={ref}
      style={{
        width: "794px",
        minHeight: "1123px",
        background: "#ffffff",
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: "14px",
        color: "#1a1a1a",
        padding: "0",
        position: "absolute",
        left: "-9999px",
        top: "0",
      }}
    >
      {/* Header */}
      <div style={{ background: "#1e3a5f", color: "white", padding: "32px 40px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <img src="/mascot.png" alt="QuoteUs Mascot" style={{ height: "72px", width: "auto" }} />
          <div>
            <div style={{ fontSize: "22px", fontWeight: "700", letterSpacing: "-0.5px" }}>QuoteUs.ca</div>
            <div style={{ fontSize: "13px", opacity: 0.8, marginTop: "4px" }}>Ontario's Insurance Platform</div>
            <div style={{ fontSize: "12px", opacity: 0.7, marginTop: "2px" }}>1-877-253-2695 · info@quoteus.ca</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "26px", fontWeight: "700", letterSpacing: "-0.5px" }}>INVOICE</div>
          <div style={{ fontSize: "16px", fontWeight: "600", marginTop: "6px", color: "#7dd3fc" }}>{invoice.invoiceNumber}</div>
          <div style={{ fontSize: "13px", opacity: 0.8, marginTop: "4px" }}>Date: {date}</div>
        </div>
      </div>

      {/* Sub-header */}
      <div style={{ background: "#2563eb", color: "white", padding: "10px 40px", fontSize: "13px", fontWeight: "500" }}>
        Rent Guarantee Insurance — Quote &amp; Premium Summary
      </div>

      {/* Body */}
      <div style={{ padding: "32px 40px" }}>
        {/* Parties */}
        <div style={{ display: "flex", gap: "32px", marginBottom: "32px" }}>
          <div style={{ flex: 1, background: "#f8fafc", borderRadius: "8px", padding: "20px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", color: "#94a3b8", marginBottom: "10px", fontWeight: "600" }}>Prepared For</div>
            <div style={{ fontWeight: "700", fontSize: "16px", color: "#1e293b" }}>{invoice.landlordName || "—"}</div>
            <div style={{ color: "#64748b", marginTop: "4px", fontSize: "13px" }}>{invoice.landlordEmail || ""}</div>
          </div>
          <div style={{ flex: 1, background: "#f8fafc", borderRadius: "8px", padding: "20px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", color: "#94a3b8", marginBottom: "10px", fontWeight: "600" }}>Property</div>
            <div style={{ fontWeight: "700", fontSize: "16px", color: "#1e293b" }}>{invoice.propertyAddress || "—"}</div>
            <div style={{ color: "#64748b", marginTop: "4px", fontSize: "13px" }}>Monthly Rent: <strong>{fmtCAD(invoice.monthlyRentCents)}</strong></div>
          </div>
        </div>

        {/* Plan Options */}
        <div style={{ marginBottom: "28px" }}>
          <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px", color: "#94a3b8", marginBottom: "12px", fontWeight: "600" }}>Plan Options</div>
          <table style={{ width: "100%", borderCollapse: "collapse", borderRadius: "8px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
            <thead>
              <tr style={{ background: "#f1f5f9" }}>
                <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "#64748b", fontWeight: "600", borderBottom: "1px solid #e2e8f0" }}>Plan</th>
                <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "#64748b", fontWeight: "600", borderBottom: "1px solid #e2e8f0" }}>Rate</th>
                <th style={{ padding: "12px 16px", textAlign: "right", fontSize: "11px", textTransform: "uppercase", color: "#64748b", fontWeight: "600", borderBottom: "1px solid #e2e8f0" }}>Premium</th>
                <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "#64748b", fontWeight: "600", borderBottom: "1px solid #e2e8f0" }}>Billing Frequency</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ background: "#eff6ff" }}>
                <td style={{ padding: "18px 16px", borderBottom: "1px solid #e2e8f0" }}>
                  <div style={{ fontWeight: "700", fontSize: "15px", color: "#1d4ed8" }}>Annual Plan</div>
                  <div style={{ fontSize: "12px", color: "#3b82f6", marginTop: "3px" }}>Best value — save vs monthly</div>
                </td>
                <td style={{ padding: "18px 16px", color: "#374151", borderBottom: "1px solid #e2e8f0" }}>
                  {fmtPct(invoice.annualRatePct)} of annual rent
                </td>
                <td style={{ padding: "18px 16px", textAlign: "right", borderBottom: "1px solid #e2e8f0" }}>
                  <div style={{ fontWeight: "700", fontSize: "20px", color: "#1d4ed8" }}>{fmtCAD(invoice.annualAmountCents)}</div>
                  <div style={{ fontSize: "12px", color: "#16a34a", marginTop: "2px" }}>≈ {fmtCAD(annualMonthly)}/mo</div>
                </td>
                <td style={{ padding: "18px 16px", color: "#6b7280", fontSize: "13px", borderBottom: "1px solid #e2e8f0" }}>
                  One lump-sum payment per year
                </td>
              </tr>
              <tr style={{ background: "#f0fdf4" }}>
                <td style={{ padding: "18px 16px" }}>
                  <div style={{ fontWeight: "700", fontSize: "15px", color: "#15803d" }}>Monthly Plan</div>
                  <div style={{ fontSize: "12px", color: "#16a34a", marginTop: "3px" }}>Flexible month-to-month</div>
                </td>
                <td style={{ padding: "18px 16px", color: "#374151" }}>
                  {fmtPct(invoice.monthlyRatePct)} of monthly rent
                </td>
                <td style={{ padding: "18px 16px", textAlign: "right" }}>
                  <div style={{ fontWeight: "700", fontSize: "20px", color: "#15803d" }}>{fmtCAD(invoice.monthlyAmountCents)}<span style={{ fontSize: "13px", fontWeight: "400" }}>/mo</span></div>
                  <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>{fmtCAD(monthlyAnnual)}/yr total</div>
                </td>
                <td style={{ padding: "18px 16px", color: "#6b7280", fontSize: "13px" }}>
                  Billed each month
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div style={{ background: "#fafafa", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "16px 20px", marginBottom: "24px" }}>
            <div style={{ fontWeight: "600", fontSize: "12px", textTransform: "uppercase", color: "#6b7280", marginBottom: "6px", letterSpacing: "0.5px" }}>Notes</div>
            <div style={{ color: "#374151", fontSize: "13px", lineHeight: "1.6" }}>{invoice.notes}</div>
          </div>
        )}

        {/* Footer note */}
        <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "20px" }}>
          <p style={{ fontSize: "12px", color: "#9ca3af", lineHeight: "1.6", margin: 0 }}>
            This quote is valid for 30 days from the date of issue. Subject to underwriting approval and final review.
            For questions, please contact <strong>info@quoteus.ca</strong> or call <strong>1-877-253-2695</strong>.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: "#f8fafc", borderTop: "1px solid #e2e8f0", padding: "16px 40px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <img src="/mascot.png" alt="QuoteUs Mascot" style={{ height: "40px", width: "auto" }} />
          <div>
            <div style={{ fontWeight: "700", fontSize: "13px", color: "#1e3a5f" }}>QuoteUs.ca</div>
            <div style={{ fontSize: "11px", color: "#94a3b8" }}>Ontario's Top Rated Insurance Platform</div>
          </div>
        </div>
        <div style={{ fontSize: "11px", color: "#94a3b8", textAlign: "right" }}>
          <div>Serving Ontario Residents Since 2016</div>
          <div>{invoice.invoiceNumber} · Generated {date}</div>
        </div>
      </div>
    </div>
  );
});

InvoiceTemplate.displayName = "InvoiceTemplate";

// ── Main Component ───────────────────────────────────────────────────────────
export default function InvoiceGenerator({
  locationId, actorId, monthlyRent,
  annualRatePct, monthlyRatePct, annualAmountCents, monthlyAmountCents,
  landlordName, landlordEmail, propertyAddress,
}: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [invoices, setInvoices] = useState<RgInvoice[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Form state
  const [notes, setNotes] = useState("");
  const [emailTo, setEmailTo] = useState(landlordEmail || "");

  // Action states
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [emailing, setEmailing] = useState<string | null>(null); // invoiceId being emailed
  const [savedInvoice, setSavedInvoice] = useState<RgInvoice | null>(null);
  const [emailDialogInvoice, setEmailDialogInvoice] = useState<RgInvoice | null>(null);
  const [emailDialogAddr, setEmailDialogAddr] = useState("");

  const templateRef = useRef<HTMLDivElement>(null);
  const today = new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });

  async function loadInvoices() {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/rep/locations/${locationId}/invoices?actorId=${actorId || ""}`);
      const data = await res.json();
      if (Array.isArray(data)) setInvoices(data);
    } catch {
      // ignore
    } finally {
      setLoadingHistory(false);
    }
  }

  useEffect(() => {
    if (showHistory) loadInvoices();
  }, [showHistory]);

  async function handleSaveAndGenerate(): Promise<RgInvoice | null> {
    setSaving(true);
    try {
      const res = await fetch(`/api/rep/locations/${locationId}/invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actorId,
          monthlyRentCents: Math.round(monthlyRent * 100),
          annualRatePct: String(annualRatePct),
          monthlyRatePct: String(monthlyRatePct),
          annualAmountCents,
          monthlyAmountCents,
          landlordName: landlordName || "",
          landlordEmail: landlordEmail || "",
          propertyAddress: propertyAddress || "",
          notes: notes || null,
        }),
      });
      const inv = await res.json();
      if (inv.error) throw new Error(inv.error);
      setSavedInvoice(inv);
      toast({ title: "Invoice saved", description: `${inv.invoiceNumber} stored successfully.` });
      loadInvoices();
      return inv as RgInvoice;
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function handleDownloadPDF(inv?: RgInvoice) {
    setDownloading(true);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ]);
      const el = templateRef.current;
      if (!el) throw new Error("Template element not found");

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: 794,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      const fileName = `${inv?.invoiceNumber || savedInvoice?.invoiceNumber || "invoice"}.pdf`;
      pdf.save(fileName);
      toast({ title: "PDF downloaded", description: fileName });
    } catch (err: any) {
      toast({ title: "PDF error", description: err.message, variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  }

  async function handleEmail(invId: string, emailAddr: string) {
    setEmailing(invId);
    try {
      const res = await fetch(`/api/rep/locations/${locationId}/invoices/${invId}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorId, email: emailAddr }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast({ title: "Invoice emailed", description: `Sent to ${emailAddr}` });
      setEmailDialogInvoice(null);
      loadInvoices();
    } catch (err: any) {
      toast({ title: "Email failed", description: err.message, variant: "destructive" });
    } finally {
      setEmailing(null);
    }
  }

  const currentInvoiceData = {
    invoiceNumber: savedInvoice?.invoiceNumber || "PREVIEW",
    monthlyRentCents: Math.round(monthlyRent * 100),
    annualRatePct: String(annualRatePct),
    monthlyRatePct: String(monthlyRatePct),
    annualAmountCents,
    monthlyAmountCents,
    landlordName: landlordName || null,
    landlordEmail: landlordEmail || null,
    propertyAddress: propertyAddress || null,
    notes: notes || null,
    status: null,
    emailedAt: null,
    createdAt: new Date().toISOString(),
    id: savedInvoice?.id || "",
  };

  return (
    <>
      {/* Hidden invoice template for PDF */}
      <InvoiceTemplate ref={templateRef} invoice={currentInvoiceData} date={today} />

      {/* Trigger button */}
      <div className="bg-white border border-blue-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-600" />
            Invoice Generator
          </p>
        </div>
        <p className="text-xs text-gray-500 mb-3">Generate a professional quote invoice with Annual and Monthly options. Download as PDF or email directly to your client.</p>
        <Button
          onClick={() => setOpen(true)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm h-9"
          data-testid="button-generate-invoice"
        >
          <Plus className="h-4 w-4 mr-1.5" /> Generate Invoice
        </Button>

        {/* Invoice history toggle */}
        <button
          onClick={() => setShowHistory(h => !h)}
          className="mt-3 w-full flex items-center justify-between text-xs text-gray-500 hover:text-gray-700 transition-colors"
          data-testid="button-toggle-invoice-history"
        >
          <span className="flex items-center gap-1.5">
            <FileText className="h-3 w-3" />
            Saved Invoices {invoices.length > 0 && <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold">{invoices.length}</span>}
          </span>
          {showHistory ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        {showHistory && (
          <div className="mt-2 border-t pt-2 space-y-2">
            {loadingHistory ? (
              <div className="py-4 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-gray-400" /></div>
            ) : invoices.length === 0 ? (
              <p className="text-xs text-gray-400 py-3 text-center">No invoices generated yet</p>
            ) : (
              invoices.map(inv => (
                <div key={inv.id} className="flex items-center justify-between gap-2 py-2 border-b last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-xs font-bold text-blue-700">{inv.invoiceNumber}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${inv.status === "emailed" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                        {inv.status === "emailed" ? "Emailed" : "Generated"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(inv.createdAt).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
                      {" · "}Annual {fmtCAD(inv.annualAmountCents)} · Monthly {fmtCAD(inv.monthlyAmountCents)}/mo
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-blue-600 hover:bg-blue-50"
                      onClick={() => { setEmailDialogInvoice(inv); setEmailDialogAddr(inv.landlordEmail || ""); }}
                      data-testid={`button-email-invoice-${inv.id}`}
                    >
                      <Mail className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Generate Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-blue-600" />
              Generate Quote Invoice
            </DialogTitle>
          </DialogHeader>

          <div className="px-6 pb-6 space-y-5 mt-4">
            {/* Preview Card */}
            <div className="border rounded-xl overflow-hidden">
              {/* Invoice header preview */}
              <div className="bg-[#1e3a5f] text-white px-5 py-4 flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <img src="/mascot.png" alt="mascot" className="h-12 w-auto" />
                  <div>
                    <div className="font-bold text-base leading-tight">QuoteUs.ca</div>
                    <div className="text-xs opacity-70">Ontario's Insurance Platform</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs opacity-70 uppercase tracking-wider">Invoice</div>
                  <div className="font-mono font-bold text-sm text-blue-300">{savedInvoice?.invoiceNumber || "INV-YYYY-XXXXXX"}</div>
                  <div className="text-xs opacity-70">{today}</div>
                </div>
              </div>

              {/* Landlord + property */}
              <div className="bg-gray-50 px-5 py-3 grid grid-cols-2 gap-4 border-b">
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Prepared For</div>
                  <div className="font-semibold text-sm text-gray-800">{landlordName || "—"}</div>
                  <div className="text-xs text-gray-500">{landlordEmail || ""}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Property</div>
                  <div className="font-semibold text-sm text-gray-800">{propertyAddress || "—"}</div>
                  <div className="text-xs text-gray-500">Monthly Rent: {fmtCAD(Math.round(monthlyRent * 100))}</div>
                </div>
              </div>

              {/* Plan options */}
              <div className="divide-y">
                {/* Annual */}
                <div className="px-5 py-4 bg-blue-50 flex items-center gap-4">
                  <div className="flex-1">
                    <div className="font-bold text-blue-700 text-sm">Annual Plan</div>
                    <div className="text-xs text-blue-500 mt-0.5">{fmtPct(annualRatePct)} of annual rent · One lump-sum payment</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-blue-700 text-xl">{fmtCAD(annualAmountCents)}</div>
                    <div className="text-xs text-green-600">≈ {fmtCAD(Math.round(annualAmountCents / 12))}/mo</div>
                  </div>
                </div>
                {/* Monthly */}
                <div className="px-5 py-4 bg-green-50 flex items-center gap-4">
                  <div className="flex-1">
                    <div className="font-bold text-green-700 text-sm">Monthly Plan</div>
                    <div className="text-xs text-green-600 mt-0.5">{fmtPct(monthlyRatePct)} of monthly rent · Paid each month</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-700 text-xl">{fmtCAD(monthlyAmountCents)}<span className="text-sm font-normal">/mo</span></div>
                    <div className="text-xs text-gray-500">{fmtCAD(monthlyAmountCents * 12)}/yr total</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-2">Notes (optional)</label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any additional notes to include on the invoice..."
                className="text-sm resize-none h-20"
                data-testid="input-invoice-notes"
              />
            </div>

            {/* Email to */}
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-2">Email Invoice To</label>
              <Input
                value={emailTo}
                onChange={e => setEmailTo(e.target.value)}
                placeholder="landlord@email.com"
                type="email"
                className="text-sm"
                data-testid="input-invoice-email"
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-1">
              {/* Save + Download PDF */}
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white h-10"
                onClick={async () => {
                  let inv = savedInvoice;
                  if (!inv) inv = await handleSaveAndGenerate();
                  await handleDownloadPDF(inv || undefined);
                }}
                disabled={saving || downloading}
                data-testid="button-download-invoice-pdf"
              >
                {downloading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Download className="h-4 w-4 mr-1.5" />}
                {downloading ? "Generating PDF…" : "Download as PDF"}
              </Button>

              {/* Save + Email */}
              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white h-10"
                onClick={async () => {
                  if (!emailTo) { toast({ title: "No email address", variant: "destructive" }); return; }
                  let inv = savedInvoice;
                  if (!inv) inv = await handleSaveAndGenerate();
                  if (inv) await handleEmail(inv.id, emailTo);
                }}
                disabled={saving || !!emailing || !emailTo}
                data-testid="button-email-invoice"
              >
                {emailing ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Send className="h-4 w-4 mr-1.5" />}
                {emailing ? "Sending…" : "Save & Email to Client"}
              </Button>

              {/* Save only */}
              {!savedInvoice && (
                <Button
                  variant="outline"
                  className="w-full h-9 text-sm"
                  onClick={handleSaveAndGenerate}
                  disabled={saving}
                  data-testid="button-save-invoice"
                >
                  {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1.5" />}
                  {saving ? "Saving…" : "Save Invoice Only"}
                </Button>
              )}

              {savedInvoice && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-green-700">Invoice saved: {savedInvoice.invoiceNumber}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-green-600"
                    onClick={() => handleDownloadPDF(savedInvoice)}
                    disabled={downloading}
                  >
                    <Download className="h-3 w-3 mr-1" /> PDF
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email dialog for history items */}
      <Dialog open={!!emailDialogInvoice} onOpenChange={v => { if (!v) setEmailDialogInvoice(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-blue-600" />
              Email Invoice
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-gray-600">Send <strong>{emailDialogInvoice?.invoiceNumber}</strong> to:</p>
            <Input
              value={emailDialogAddr}
              onChange={e => setEmailDialogAddr(e.target.value)}
              placeholder="email@example.com"
              type="email"
              data-testid="input-email-dialog-addr"
            />
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={!emailDialogAddr || !!emailing}
              onClick={() => emailDialogInvoice && handleEmail(emailDialogInvoice.id, emailDialogAddr)}
              data-testid="button-confirm-email-invoice"
            >
              {emailing ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Send className="h-4 w-4 mr-1.5" />}
              {emailing ? "Sending…" : "Send Invoice"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
