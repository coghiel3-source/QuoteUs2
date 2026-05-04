import { useEffect, useRef, useState } from "react";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SignaturePad({ onCapture }: { onCapture: (data: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const t = e.touches[0];
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const start = (e: React.MouseEvent | React.TouchEvent) => { e.preventDefault(); drawing.current = true; lastPos.current = getPos(e); };
  const move = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const pos = getPos(e);
    if (lastPos.current) {
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
    lastPos.current = pos;
    setIsEmpty(false);
    onCapture(canvas.toDataURL());
  };
  const end = () => { drawing.current = false; lastPos.current = null; };
  const clear = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    onCapture(null);
  };

  return (
    <div className="space-y-1.5">
      <div className="relative border-2 border-gray-200 rounded-xl overflow-hidden bg-white touch-none" style={{ height: 140 }}>
        <canvas
          ref={canvasRef}
          width={600}
          height={280}
          className="w-full h-full cursor-crosshair"
          onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
          onTouchStart={start} onTouchMove={move} onTouchEnd={end}
        />
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-gray-300 text-sm select-none">Sign here</p>
          </div>
        )}
      </div>
      {!isEmpty && (
        <button onClick={clear} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
          ✕ Clear and re-draw
        </button>
      )}
    </div>
  );
}

export default function ServiceSign() {
  const [, params] = useRoute("/service-sign/:token");
  const token = params?.token;

  const [agreement, setAgreement] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [signerName, setSignerName] = useState("");
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/service-sign/${token}`)
      .then(r => r.ok ? r.json() : r.json().then(e => { throw new Error(e.error); }))
      .then(data => { setAgreement(data); if (data.status === "signed") setSubmitted(true); })
      .catch(e => setError(e.message || "Agreement not found"))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSubmit() {
    if (!signerName.trim()) { setError("Please enter your full name to sign."); return; }
    if (!signatureData) { setError("Please draw your signature before submitting."); return; }
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/service-sign/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signerName, signatureData }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setSubmitted(true);
    } catch (e: any) { setError(e.message || "Failed to submit signature"); }
    setSubmitting(false);
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Loading agreement...</p>
      </div>
    </div>
  );

  if (!agreement && error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border p-8 max-w-md w-full text-center">
        <div className="text-4xl mb-3">⚠️</div>
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Agreement Not Found</h2>
        <p className="text-gray-500 text-sm">{error}</p>
      </div>
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border p-8 max-w-md w-full text-center">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Agreement Signed</h2>
        <p className="text-gray-500 text-sm">Thank you{agreement?.signerName ? `, ${agreement.signerName}` : ""}. Your QuoteUs.ca Service Agreement has been successfully signed. A copy will be provided to you.</p>
        <div className="mt-6 p-4 bg-gray-50 rounded-xl text-left text-sm text-gray-600 space-y-1">
          <p><strong>Property:</strong> {agreement?.propertyAddress}</p>
          <p><strong>Service Fee:</strong> ${agreement?.serviceFee}</p>
          <p><strong>Signed:</strong> {agreement?.signedAt ? new Date(agreement.signedAt).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" }) : new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })}</p>
        </div>
      </div>
    </div>
  );

  const today = new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-blue-700 rounded-t-2xl px-8 py-5 flex items-center gap-4">
          <div>
            <h1 className="text-white font-bold text-xl">QuoteUs.ca</h1>
            <p className="text-blue-200 text-sm">Service Agreement</p>
          </div>
        </div>

        {/* Agreement Document */}
        <div className="bg-white shadow-sm border-x px-8 py-7 text-sm text-gray-800 space-y-5 leading-relaxed">

          {/* Title */}
          <div className="text-center border-b pb-4">
            <h2 className="text-lg font-bold text-gray-900 tracking-wide uppercase">QuoteUs.ca Service Agreement</h2>
          </div>

          {/* Parties */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Landlord Name</p>
              <p className="font-semibold text-gray-900">{agreement.landlordName || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Property Address</p>
              <p className="font-semibold text-gray-900">{agreement.propertyAddress || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Service Start Date</p>
              <p className="font-semibold text-gray-900">{agreement.serviceStartDate || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Tenant Type</p>
              <div className="flex gap-3 mt-1">
                <label className="flex items-center gap-1.5 text-sm">
                  <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${agreement.tenantType === "new" ? "border-blue-600 bg-blue-600" : "border-gray-300"}`}>
                    {agreement.tenantType === "new" && <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                  </div>
                  New Tenants
                </label>
                <label className="flex items-center gap-1.5 text-sm">
                  <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${agreement.tenantType === "existing" ? "border-blue-600 bg-blue-600" : "border-gray-300"}`}>
                    {agreement.tenantType === "existing" && <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                  </div>
                  Existing Tenants
                </label>
              </div>
            </div>
          </div>

          {/* Tenant criteria */}
          {agreement.tenantType === "new" ? (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="font-semibold text-blue-800 mb-2 text-sm">For New Tenants — Required Criteria</p>
              <ul className="space-y-1 text-sm text-blue-700 list-none">
                {["Ongoing Employment", "Government-Issued ID (legally valid ID)", "Minimum 11-Month Lease Signed", "Rent <45% of household income", "No evictions, Bankruptcies, or Judgments (within a 3-year lookback period)"].map(item => (
                  <li key={item} className="flex items-start gap-2"><span className="text-blue-400 mt-0.5">•</span>{item}</li>
                ))}
              </ul>
              <p className="text-xs text-blue-500 mt-2 italic">Refer to the agreement for full details.</p>
            </div>
          ) : (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
              <p className="font-semibold text-indigo-800 mb-2 text-sm">For Existing Tenants — Required Criteria</p>
              <ul className="space-y-1 text-sm text-indigo-700 list-none">
                {["Ongoing employment", "Government-issued ID (Legally valid ID)", "No current lease violations", "Must have completed initial lease term (12 months)", "No rent arrears > 5 days within the last 12 months"].map(item => (
                  <li key={item} className="flex items-start gap-2"><span className="text-indigo-400 mt-0.5">•</span>{item}</li>
                ))}
              </ul>
              <p className="text-xs text-indigo-500 mt-2 italic">Refer to the agreement for full details.</p>
            </div>
          )}

          {/* Service Details */}
          <div>
            <p className="font-bold text-gray-900 mb-2 text-sm uppercase tracking-wide">Service Details</p>
            <p className="text-gray-700 text-sm leading-relaxed">
              This document serves as confirmation that a non-refundable service fee in the amount of <strong>${agreement.serviceFee}</strong> has been paid to QuoteUs.ca. This fee is charged for the facilitation and administrative services provided by QuoteUs.ca in connecting clients with third-party underwriting partners. All fees paid to QuoteUs.ca are strictly non-refundable, including but not limited to situations where the client chooses not to proceed, cancels, or is deemed ineligible by the underwriting provider.
            </p>
            <p className="text-gray-700 text-sm leading-relaxed mt-3">
              QuoteUs.ca operates solely as an intermediary platform, connecting clients with the underwriting company <strong>Pensio</strong>, which is solely responsible for underwriting of this performance service bond agreement, and the payment of any claims and or demands of damages. The client, <strong>{agreement.landlordName}</strong>, acknowledges and understands that QuoteUs.ca does not assume any liability related to coverage decisions, claims handling, or payouts. The client further agrees that it is their responsibility to ensure all information provided is accurate and complete.
            </p>
            <p className="text-gray-700 text-sm leading-relaxed mt-3">
              All agreements facilitated through QuoteUs.ca are annual in nature. Payment options may be offered on a monthly or annual basis; however, the client remains responsible for maintaining active coverage. It is the client's responsibility to proactively connect with QuoteUs.ca prior to each renewal period to confirm continuation year-over-year and ensure there is no lapse in service or coverage.
            </p>
          </div>

          {agreement.notes && (
            <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-yellow-700 uppercase tracking-wide mb-1">Additional Notes</p>
              <p className="text-sm text-yellow-800">{agreement.notes}</p>
            </div>
          )}
        </div>

        {/* Signature Section */}
        <div className="bg-white shadow-sm border-x border-b rounded-b-2xl px-8 py-7 space-y-5">
          <div className="border-t pt-5">
            <h3 className="font-bold text-gray-900 mb-1 text-sm uppercase tracking-wide">Agreement &amp; Signature</h3>
            <p className="text-sm text-gray-500 mb-5">I confirm that the above services have been agreed upon and accepted.</p>

            <div className="space-y-4">
              <div>
                <Label htmlFor="signer-name" className="text-sm font-medium text-gray-700">Full Name <span className="text-red-500">*</span></Label>
                <Input
                  id="signer-name"
                  placeholder="Type your full legal name"
                  value={signerName}
                  onChange={e => setSignerName(e.target.value)}
                  className="mt-1"
                  data-testid="input-signer-name"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 block mb-1.5">Signature <span className="text-red-500">*</span></Label>
                <SignaturePad onCapture={setSignatureData} />
              </div>

              <div className="text-xs text-gray-400 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                Date: {today}
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

              <Button
                className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2.5"
                onClick={handleSubmit}
                disabled={submitting}
                data-testid="button-submit-signature"
              >
                {submitting ? "Submitting..." : "Submit Signature & Accept Agreement"}
              </Button>

              <p className="text-xs text-gray-400 text-center leading-relaxed">
                By clicking "Submit Signature", you agree to the terms of this service agreement and acknowledge that your electronic signature is legally binding.
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">© {new Date().getFullYear()} QuoteUs.ca — Ontario Insurance Platform</p>
      </div>
    </div>
  );
}
