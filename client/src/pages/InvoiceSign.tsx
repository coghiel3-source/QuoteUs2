import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { CheckCircle2, Loader2, FileText, AlertTriangle } from "lucide-react";

function fmtCAD(cents: number) {
  return `$${(cents / 100).toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtPct(pct: string | number) {
  return `${parseFloat(String(pct)).toFixed(2)}%`;
}

interface Invoice {
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
  requiresSignature: boolean;
  signedAt: string | null;
  signedBy: string | null;
  signedPlan: string | null;
  createdAt: string;
}

export default function InvoiceSign() {
  const { token } = useParams<{ token: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<"annual" | "monthly" | null>(null);
  const [signerName, setSignerName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch(`/api/invoice-sign/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); }
        else {
          setInvoice(data);
          if (data.signedAt) setDone(true);
        }
        setLoading(false);
      })
      .catch(() => { setError("Failed to load invoice."); setLoading(false); });
  }, [token]);

  async function handleAccept() {
    if (!selectedPlan) return;
    if (!signerName.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/invoice-sign/${token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selectedPlan, signerName: signerName.trim() }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDone(true);
      setInvoice(prev => prev ? { ...prev, signedAt: new Date().toISOString(), signedBy: signerName.trim(), signedPlan: selectedPlan } : prev);
    } catch (err: any) {
      setError(err.message || "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  );

  if (error && !invoice) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-gray-800 mb-2">Invoice Not Found</h2>
        <p className="text-sm text-gray-500">{error}</p>
      </div>
    </div>
  );

  if (!invoice) return null;

  const annualMonthly = Math.round(invoice.annualAmountCents / 12);
  const monthlyAnnual = invoice.monthlyAmountCents * 12;
  const date = new Date(invoice.createdAt).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });

  if (done) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-[#1e3a5f] px-8 py-6 text-white text-center">
          <img src="/mascot.png" alt="QuoteUs" className="h-14 w-auto mx-auto mb-3" />
          <div className="text-xl font-bold">QuoteUs.ca — Rent Guarantee</div>
        </div>
        <div className="p-8 text-center">
          <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Quote Accepted</h2>
          <p className="text-sm text-gray-500 mb-4">
            Thank you, <strong>{invoice.signedBy}</strong>. You have accepted the{" "}
            <strong>{invoice.signedPlan === "annual" ? "Annual" : "Monthly"} Plan</strong> for invoice{" "}
            <span className="font-mono font-bold text-blue-700">{invoice.invoiceNumber}</span>.
          </p>
          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 mb-4">
            <div className="flex justify-between mb-1"><span>Plan</span><span className="font-semibold">{invoice.signedPlan === "annual" ? "Annual" : "Monthly"}</span></div>
            <div className="flex justify-between mb-1"><span>Premium</span><span className="font-semibold">{invoice.signedPlan === "annual" ? fmtCAD(invoice.annualAmountCents) : `${fmtCAD(invoice.monthlyAmountCents)}/mo`}</span></div>
            <div className="flex justify-between"><span>Property</span><span className="font-semibold text-right max-w-[60%]">{invoice.propertyAddress || "—"}</span></div>
          </div>
          <p className="text-xs text-gray-400">A representative will be in touch shortly to complete the process. For questions call <strong>1-877-253-2695</strong> or email <strong>info@quoteus.ca</strong>.</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-[#1e3a5f] text-white rounded-t-2xl px-8 py-6 flex justify-between items-start">
          <div className="flex items-center gap-4">
            <img src="/mascot.png" alt="QuoteUs" className="h-14 w-auto" />
            <div>
              <div className="text-xl font-bold">QuoteUs.ca</div>
              <div className="text-sm opacity-70">Rent Guarantee</div>
              <div className="text-xs opacity-60 mt-0.5">1-877-253-2695 · info@quoteus.ca</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">INVOICE</div>
            <div className="font-mono text-blue-300 font-bold mt-1">{invoice.invoiceNumber}</div>
            <div className="text-xs opacity-70 mt-1">{date}</div>
          </div>
        </div>

        <div className="bg-white shadow-lg rounded-b-2xl overflow-hidden">
          {/* Sub-header */}
          <div className="bg-blue-600 text-white px-8 py-2.5 text-sm font-medium">
            Rent Guarantee — Quote &amp; Premium Summary
          </div>

          {/* Parties */}
          <div className="px-8 py-5 grid grid-cols-2 gap-5 border-b">
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2">Prepared For</div>
              <div className="font-bold text-gray-800 text-base">{invoice.landlordName || "—"}</div>
              <div className="text-sm text-gray-500 mt-0.5">{invoice.landlordEmail || ""}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2">Property</div>
              <div className="font-bold text-gray-800 text-base">{invoice.propertyAddress || "—"}</div>
              <div className="text-sm text-gray-500 mt-0.5">Monthly Rent: <strong>{fmtCAD(invoice.monthlyRentCents)}</strong></div>
            </div>
          </div>

          {/* Plan options */}
          <div className="px-8 py-5 border-b">
            <div className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-3">Plan Options</div>
            <table className="w-full border border-gray-200 rounded-xl overflow-hidden border-separate border-spacing-0">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs text-gray-500 font-semibold border-b border-gray-200">Plan</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 font-semibold border-b border-gray-200">Rate</th>
                  <th className="px-4 py-3 text-right text-xs text-gray-500 font-semibold border-b border-gray-200">Premium</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 font-semibold border-b border-gray-200">Billing</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-blue-50">
                  <td className="px-4 py-4 border-b border-gray-200">
                    <div className="font-bold text-blue-700 text-sm">Annual Plan</div>
                    <div className="text-xs text-blue-500 mt-0.5">Best value — save vs monthly</div>
                  </td>
                  <td className="px-4 py-4 text-gray-700 text-sm border-b border-gray-200">{fmtPct(invoice.annualRatePct)} of annual rent</td>
                  <td className="px-4 py-4 text-right border-b border-gray-200">
                    <div className="font-bold text-xl text-blue-700">{fmtCAD(invoice.annualAmountCents)}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{fmtCAD(annualMonthly)}/mo equiv.</div>
                  </td>
                  <td className="px-4 py-4 text-gray-500 text-xs border-b border-gray-200">One lump-sum per year</td>
                </tr>
                <tr className="bg-green-50">
                  <td className="px-4 py-4">
                    <div className="font-bold text-green-700 text-sm">Monthly Plan</div>
                    <div className="text-xs text-green-600 mt-0.5">Flexible month-to-month</div>
                  </td>
                  <td className="px-4 py-4 text-gray-700 text-sm">{fmtPct(invoice.monthlyRatePct)} of monthly rent</td>
                  <td className="px-4 py-4 text-right">
                    <div className="font-bold text-xl text-green-700">{fmtCAD(invoice.monthlyAmountCents)}<span className="text-sm font-normal">/mo</span></div>
                    <div className="text-xs text-gray-400 mt-0.5">{fmtCAD(monthlyAnnual)}/yr total</div>
                  </td>
                  <td className="px-4 py-4 text-gray-500 text-xs">Billed each month</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="px-8 py-4 border-b">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1">Notes</div>
                <p className="text-sm text-gray-700 leading-relaxed">{invoice.notes}</p>
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="px-8 py-4 border-b">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="text-xs uppercase tracking-wider text-amber-800 font-bold mb-1">Disclaimer</div>
              <p className="text-xs text-amber-700 leading-relaxed">
                The premiums shown above are estimates only. <strong>Applicable taxes and fees will be added at the time of payment</strong>, depending on the selected payment option.
                Credit card payments may incur additional processing fees. This quote is valid for 30 days from the date of issue and is subject to underwriting approval and final review.
              </p>
            </div>
          </div>

          {/* Signature section */}
          <div className="px-8 py-6 bg-blue-50">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-blue-600" />
              <h3 className="text-base font-bold text-gray-800">Accept This Quote</h3>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              Please select your preferred plan and type your full name below to confirm acceptance of this quote.
              By signing, you agree that the selected plan is your chosen Rent Guarantee option.
            </p>

            {/* Plan selection */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <button
                onClick={() => setSelectedPlan("annual")}
                className={`rounded-xl border-2 p-4 text-left transition-all ${selectedPlan === "annual" ? "border-blue-600 bg-blue-600 text-white shadow-md" : "border-gray-200 bg-white hover:border-blue-300"}`}
                data-testid="button-select-annual-plan"
              >
                <div className={`font-bold text-sm ${selectedPlan === "annual" ? "text-white" : "text-blue-700"}`}>Annual Plan</div>
                <div className={`text-xl font-bold mt-1 ${selectedPlan === "annual" ? "text-white" : "text-blue-700"}`}>{fmtCAD(invoice.annualAmountCents)}</div>
                <div className={`text-xs mt-0.5 ${selectedPlan === "annual" ? "text-blue-100" : "text-gray-400"}`}>One lump-sum payment</div>
              </button>
              <button
                onClick={() => setSelectedPlan("monthly")}
                className={`rounded-xl border-2 p-4 text-left transition-all ${selectedPlan === "monthly" ? "border-green-600 bg-green-600 text-white shadow-md" : "border-gray-200 bg-white hover:border-green-300"}`}
                data-testid="button-select-monthly-plan"
              >
                <div className={`font-bold text-sm ${selectedPlan === "monthly" ? "text-white" : "text-green-700"}`}>Monthly Plan</div>
                <div className={`text-xl font-bold mt-1 ${selectedPlan === "monthly" ? "text-white" : "text-green-700"}`}>{fmtCAD(invoice.monthlyAmountCents)}<span className="text-sm font-normal">/mo</span></div>
                <div className={`text-xs mt-0.5 ${selectedPlan === "monthly" ? "text-green-100" : "text-gray-400"}`}>Billed each month</div>
              </button>
            </div>

            {/* Signer name */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={signerName}
                onChange={e => setSignerName(e.target.value)}
                placeholder="Type your full legal name"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                data-testid="input-signer-name"
              />
            </div>

            {error && (
              <div className="mb-3 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              onClick={handleAccept}
              disabled={!selectedPlan || !signerName.trim() || submitting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
              data-testid="button-accept-invoice"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {submitting ? "Submitting…" : "Confirm & Accept Quote"}
            </button>
            <p className="text-xs text-gray-400 text-center mt-3">
              By clicking above you are accepting the {selectedPlan ? (selectedPlan === "annual" ? "Annual" : "Monthly") : "selected"} plan for invoice {invoice.invoiceNumber}.
            </p>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 border-t border-gray-200 px-8 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <img src="/mascot.png" alt="QuoteUs" className="h-8 w-auto" />
              <div>
                <div className="text-xs font-bold text-[#1e3a5f]">QuoteUs.ca</div>
                <div className="text-xs text-gray-400">Rent Guarantee</div>
              </div>
            </div>
            <div className="text-xs text-gray-400 text-right">
              <div>Serving Ontario Since 2016</div>
              <div>{invoice.invoiceNumber}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
