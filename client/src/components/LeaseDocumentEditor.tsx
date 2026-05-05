import React, { useState, useRef, useEffect, useCallback, forwardRef } from "react";
import { createPortal } from "react-dom";
import {
  X, Maximize2, Minimize2, Send, Plus, Trash2, FileText,
  User, Mail, Phone, MapPin, Calendar, CheckCircle2, Loader2,
  Copy, ExternalLink, Clock, GripHorizontal,
} from "lucide-react";

export interface LeaseFields {
  landlordName: string;
  landlordAddress: string;
  landlordPhone: string;
  landlordEmail: string;
  propertyAddress: string;
  qualifiedTenants: string;
  effectiveDate: string;
}

interface Signer {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  locationId: string;
  initialFields: LeaseFields;
  actorId: string;
  onSent: () => void;
}

function fmtDate(s: string): string {
  try { return new Date(s + "T00:00:00").toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" }); }
  catch { return s; }
}

function generateLeaseHtml(d: LeaseFields): string {
  const eff = d.effectiveDate ? fmtDate(d.effectiveDate) : "_______________";
  const fill = (v: string, fb = "_______________") =>
    v && v.trim() ? `<span class="filled">${v.trim()}</span>` : `<span class="blank">${fb}</span>`;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<title>Lease Co-Guarantee Agreement</title>
<style>
  *{box-sizing:border-box}
  body{font-family:Georgia,serif;font-size:12pt;line-height:1.7;color:#111;max-width:820px;margin:0 auto;padding:36px 48px;background:#fff}
  h1{font-size:16pt;text-align:center;margin-bottom:4px;margin-top:0}
  h2{font-size:13pt;margin-top:28px;margin-bottom:6px;border-bottom:1px solid #ccc;padding-bottom:4px}
  .hb{text-align:center;margin-bottom:28px}
  .hb p{margin:2px 0;font-size:11pt}
  .pb{margin:16px 0;padding:14px 18px;border-left:3px solid #2563eb;background:#f8faff}
  .pb p{margin:3px 0;font-size:11pt}
  .legal{font-size:10.5pt;color:#333;margin-top:8px;line-height:1.75}
  table{border-collapse:collapse;width:100%;margin-top:8px}
  td{padding:6px 10px;border:1px solid #bbb;vertical-align:top;font-size:11pt}
  td:first-child{font-weight:bold;width:52%;color:#333}
  .filled{color:#1a56db;font-weight:600;border-bottom:1.5px solid #1a56db;padding:0 2px}
  .blank{color:#999;font-style:italic}
  .sb{margin-top:40px;display:flex;gap:60px;flex-wrap:wrap}
  .sc{flex:1;min-width:200px}
  .sl{border-top:1px solid #555;margin-top:40px;margin-bottom:4px}
  .sl-label{font-size:10pt;color:#555;margin:1px 0}
</style></head><body>
<div class="hb">
  <h1>Lease Co-Guarantee Agreement</h1>
  <p><strong>"Agreement"</strong></p>
  <p style="margin-top:14px"><strong>Pensio Risk Management Group Inc.</strong> "Product Manager"</p>
  <p>80 Carlauren Rd, Unit 23, Woodbridge, ON, L4L 7Z5</p>
  <p>Product Manager's Email: info@pensioglobal.com</p>
</div>
<div class="pb">
  <p><strong>Rentatee "Landlord"</strong></p>
  <p><strong>Name:</strong> ${fill(d.landlordName)}</p>
  <p><strong>Address:</strong> ${fill(d.landlordAddress)}</p>
  <p><strong>Contact Number:</strong> ${fill(d.landlordPhone)}</p>
  <p><strong>Email:</strong> ${fill(d.landlordEmail)}</p>
</div>
<h2>Declarations</h2>
<table><tbody>
  <tr><td>Residential Rental Property Address</td><td>${fill(d.propertyAddress)}</td></tr>
  <tr><td>Qualified Tenants Residing in a Rental Unit</td><td>${fill(d.qualifiedTenants)}</td></tr>
  <tr><td>Lease Co-Guarantee Agreement Contract Control Number</td><td>Pensio00001</td></tr>
  <tr><td>Lease Co-Guarantee Effective Date</td><td>${fill(eff)}</td></tr>
</tbody></table>
<h2>Reimbursements and Product Fee</h2>
<p class="legal"><strong>Rent Guarantee Reimbursement</strong> provided under this Agreement covers a maximum rent loss for each registered residential rental Unit in the Property. The maximum amount for the rent loss reimbursement is capped at sixty thousand Canadian Dollars CDN $60,000 for each twelve (12) month period for any one (1) habitable rentable Unit in the Property for the Term.</p>
<p class="legal"><strong>Malicious Tenant Damage Reimbursement</strong> provided under this Agreement covers a maximum malicious tenant damage loss for each registered residential rental Unit in the Property. The maximum amount for the malicious tenant damage loss reimbursement is capped at ten thousand Canadian Dollars CDN $10,000 for each twelve (12) month period for any one (1) habitable and rentable Unit in the Property for the Term.</p>
<p class="legal"><strong>Eviction Expense Reimbursement</strong> provided under this Agreement covers a maximum loss for each registered residential rental Unit in the Property. The maximum amount for the eviction expense loss reimbursement is capped at one thousand five hundred Canadian Dollars CDN $1,500 for each twelve (12) month period for any one (1) habitable and rentable Unit in the Property for the Term.</p>
<p class="legal"><strong>Product Fee</strong> payable to Rentatee Technologies Inc. ("Rentatee") shall be five percent (5.0%) of the declared monthly rent if paid monthly, or four and one-half percent (4.5%) of the declared annual rent if paid annually, paid by the Landlord for the Qualifying Tenant(s) listed above to rent a Unit in the Property under a Lease Agreement. The Product Fee payment must be made to Rentatee on or before the 15th calendar day of each month commencing on the Effective Date, for the Term and any Extension thereof.</p>
<h2>Reimbursement Loss Payee</h2>
<div class="pb">
  <p><strong>Landlord:</strong> ${fill(d.landlordName)}</p>
  <p><strong>Product Manager Agent:</strong> Rentatee Technologies Inc.</p>
  <p>1610 Swainson Road, Kelowna, BC, V1P 1C5</p>
  <p>Agent's Email: sales@rentatee.com</p>
</div>
<h2>Important Notice Disclaimer</h2>
<p class="legal">The Tenant Management Services and Reimbursements provided by the Product Manager to the Landlord, as stated in this Agreement, are explicitly clarified to not constitute insurance. It is strongly recommended that Landlord carefully review this Agreement, seek professional advice, or consult the Product Manager or Product Manager's Agent before entering into this Agreement.</p>
<p class="legal">The Product Manager directly self-procured a surety in the form of a Performance Bond from a Surety with an insurance or reinsurance rating of A.M. Best A (excellent) or better to secure the Product Manager's services and performance for the client.</p>
<h2>Lease Co-Guarantee</h2>
<p class="legal">This Lease Co-Guarantee Agreement (the "Agreement") made on the ${fill(eff, "_____________")} (the "Effective Date") between Rentatee (or with the Landlord's authorized Property Manager) (the "Landlord" or "Property Manager") and Pensio Risk Management Group Inc., located at 80 Carlauren Rd, Unit 23, Woodbridge, ON, L4L 7Z5 ("Product Manager").</p>
<h2>Recitals</h2>
<p class="legal">Whereas the Landlord and Product Manager may be referred to herein each as (a "Party") and collectively as (the "Parties") to this Agreement;</p>
<p class="legal">Whereas the Landlord, being the owner, operator, and manager of the registered rental Unit, situated at the address of the property (the "Property");</p>
<p class="legal">Whereas in consideration of the terms and conditions outlined in this Agreement, the Product Manager agrees to provide the Landlord with the following Tenant Management Services and reimbursements for losses in the event of a Tenant violation of an enforceable Lease Agreement: (i) Rent Guarantee Reimbursement for defaulted rent loss; (ii) Malicious Tenant Damage Reimbursement for malicious tenant damage; and (iii) Eviction Expense Reimbursement, for eviction and legal expenses.</p>
<p class="legal">Whereas the initial term (the "Lease Term") for any Qualified Tenant listed above who meets the qualifications to enter into a Lease Agreement is for a minimum occupancy period of twelve (12) months.</p>
<p class="legal">And Whereas the Parties have mutually agreed to enter into this Agreement and are bound by the terms and conditions specified within this Agreement.</p>
<div class="sb">
  <div class="sc">
    <div class="sl"></div>
    <p class="sl-label"><strong>Landlord Signature</strong></p>
    <p class="sl-label">Name: ${fill(d.landlordName)}</p>
    <p class="sl-label">Date: ${fill(eff)}</p>
  </div>
  <div class="sc">
    <div class="sl"></div>
    <p class="sl-label"><strong>Product Manager</strong></p>
    <p class="sl-label">Pensio Risk Management Group Inc.</p>
    <p class="sl-label">By: Jim Milankov, President</p>
  </div>
</div>
<p style="margin-top:48px;font-size:9pt;color:#888;text-align:center">Generated by QuoteUs.ca — ${new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })}</p>
</body></html>`;
}

const FIELD_DEFS: Array<{ key: keyof LeaseFields; label: string; icon: React.ElementType; type: string }> = [
  { key: "landlordName",     label: "Landlord Name",     icon: User,     type: "text" },
  { key: "landlordAddress",  label: "Landlord Address",  icon: MapPin,   type: "text" },
  { key: "landlordPhone",    label: "Phone",             icon: Phone,    type: "tel" },
  { key: "landlordEmail",    label: "Email",             icon: Mail,     type: "email" },
  { key: "propertyAddress",  label: "Property Address",  icon: MapPin,   type: "text" },
  { key: "qualifiedTenants", label: "Qualified Tenants", icon: User,     type: "text" },
  { key: "effectiveDate",    label: "Effective Date",    icon: Calendar, type: "date" },
];

export default function LeaseDocumentEditor({ open, onClose, locationId, initialFields, actorId, onSent }: Props) {
  const [fields, setFields] = useState<LeaseFields>(initialFields);
  const [previewHtml, setPreviewHtml] = useState(() => generateLeaseHtml(initialFields));
  const [isMaximized, setIsMaximized] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [showSigners, setShowSigners] = useState(false);
  const [signers, setSigners] = useState<Signer[]>([
    { id: "s1", name: initialFields.landlordName, email: initialFields.landlordEmail, role: "Landlord" },
  ]);
  const [sending, setSending] = useState(false);
  const [sentLinks, setSentLinks] = useState<Array<{ name: string; email: string; url: string }>>([]);
  const [error, setError] = useState("");

  const dragRef = useRef({ active: false, startX: 0, startY: 0, origX: 0, origY: 0 });
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (open && !initialized.current) {
      initialized.current = true;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const editorW = Math.min(1200, w - 40);
      const editorH = Math.min(760, h - 40);
      setPos({ x: Math.max(20, (w - editorW) / 2), y: Math.max(20, (h - editorH) / 2) });
      setFields(initialFields);
      setPreviewHtml(generateLeaseHtml(initialFields));
      setSentLinks([]);
      setShowSigners(false);
      setError("");
      setSending(false);
      setSigners([{ id: "s1", name: initialFields.landlordName, email: initialFields.landlordEmail, role: "Landlord" }]);
    }
    if (!open) initialized.current = false;
  }, [open, initialFields]);

  useEffect(() => {
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(() => setPreviewHtml(generateLeaseHtml(fields)), 280);
    return () => { if (previewTimer.current) clearTimeout(previewTimer.current); };
  }, [fields]);

  useEffect(() => {
    setSigners(prev => prev.map(s =>
      s.id === "s1" ? { ...s, name: fields.landlordName, email: fields.landlordEmail } : s
    ));
  }, [fields.landlordName, fields.landlordEmail]);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragRef.current.active) return;
    setPos({
      x: Math.max(0, dragRef.current.origX + e.clientX - dragRef.current.startX),
      y: Math.max(0, dragRef.current.origY + e.clientY - dragRef.current.startY),
    });
  }, []);

  const onMouseUp = useCallback(() => {
    dragRef.current.active = false;
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  }, [onMouseMove]);

  function onHeaderMouseDown(e: React.MouseEvent) {
    if (isMaximized) return;
    dragRef.current = { active: true, startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  useEffect(() => () => {
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  }, [onMouseMove, onMouseUp]);

  async function handleSend() {
    const valid = signers.filter(s => s.email.trim());
    if (valid.length === 0) { setError("Add at least one signer email."); return; }
    setError("");
    setSending(true);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ]);
      const el = printRef.current!;
      const canvas = await (html2canvas as any)(el, {
        scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false, width: 794,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new (jsPDF as any)({ orientation: "portrait", unit: "mm", format: "a4" });
      const pW = pdf.internal.pageSize.getWidth();
      const pH = pdf.internal.pageSize.getHeight();
      const iH = (canvas.height * pW) / canvas.width;
      let rem = iH, yOff = 0;
      while (rem > 0) {
        pdf.addImage(imgData, "PNG", 0, yOff, pW, iH);
        rem -= pH;
        if (rem > 0) { yOff -= pH; pdf.addPage(); }
      }
      const pdfBlob = pdf.output("blob");
      const safeName = (fields.landlordName || "Client").replace(/\s+/g, "_");
      const fileName = `LeaseCoGuarantee-${safeName}.pdf`;
      const file = new File([pdfBlob], fileName, { type: "application/pdf" });

      const formData = new FormData();
      formData.append("actorId", actorId);
      formData.append("signers", JSON.stringify(valid));
      formData.append("templateData", JSON.stringify(fields));
      formData.append("documents", file);
      const res = await fetch(`/api/rep/locations/${locationId}/doc-signatures`, { method: "POST", body: formData });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Send failed");
      setSentLinks(result.links || []);
      onSent();
    } catch (err: any) {
      setError(err.message || "Failed to send — please try again.");
    } finally {
      setSending(false);
    }
  }

  function addSigner() {
    setSigners(prev => [...prev, { id: Math.random().toString(36).slice(2), name: "", email: "", role: "Other" }]);
  }

  function removeSigner(id: string) {
    setSigners(prev => prev.filter(s => s.id !== id));
  }

  function updateSigner(id: string, patch: Partial<Signer>) {
    setSigners(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  }

  if (!open) return null;

  const editorW = Math.min(1200, window.innerWidth - 40);
  const editorH = Math.min(760, window.innerHeight - 40);

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 9990, pointerEvents: "none" }}>
      {/* Dim backdrop */}
      <div
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", pointerEvents: "auto" }}
        onClick={() => { if (!sending) onClose(); }}
      />

      {/* Floating window */}
      <div
        style={{
          position: "absolute",
          left: isMaximized ? 0 : pos.x,
          top: isMaximized ? 0 : pos.y,
          width: isMaximized ? "100vw" : editorW,
          height: isMaximized ? "100vh" : editorH,
          display: "flex",
          flexDirection: "column",
          background: "#ffffff",
          borderRadius: isMaximized ? 0 : 12,
          boxShadow: "0 32px 80px rgba(0,0,0,0.4)",
          overflow: "hidden",
          pointerEvents: "auto",
        }}
      >
        {/* ── Title bar ── */}
        <div
          className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-900 text-white flex-shrink-0 select-none"
          style={{ cursor: isMaximized ? "default" : "grab" }}
          onMouseDown={onHeaderMouseDown}
        >
          <GripHorizontal className="h-4 w-4 text-slate-500 shrink-0" />
          <FileText className="h-4 w-4 text-amber-400 shrink-0" />
          <span className="text-sm font-semibold flex-1 truncate">Lease Co-Guarantee Agreement</span>
          {fields.landlordName && (
            <span className="text-xs text-slate-400 hidden sm:block truncate max-w-[200px]">{fields.landlordName}</span>
          )}

          {/* Status pill */}
          {sentLinks.length > 0 ? (
            <span className="flex items-center gap-1 text-xs bg-green-500/20 text-green-300 border border-green-500/30 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="h-3 w-3" /> Sent
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
              <Clock className="h-3 w-3" /> Draft
            </span>
          )}

          <button
            onClick={() => setIsMaximized(m => !m)}
            className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            title={isMaximized ? "Restore" : "Maximize"}
            data-testid="button-lease-editor-maximize"
          >
            {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <button
            onClick={() => { if (!sending) onClose(); }}
            className="p-1.5 rounded hover:bg-red-500/70 text-slate-400 hover:text-white transition-colors"
            title="Close"
            data-testid="button-lease-editor-close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Main body ── */}
        <div className="flex flex-1 min-h-0">

          {/* Left panel — editable fields */}
          <div className="flex flex-col border-r bg-gray-50" style={{ width: 300, flexShrink: 0 }}>
            <div className="px-4 py-3 border-b bg-white flex-shrink-0">
              <p className="text-xs font-bold text-gray-800 uppercase tracking-wide">Client Details</p>
              <p className="text-xs text-gray-400 mt-0.5">Auto-filled · click any field to edit</p>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {FIELD_DEFS.map(({ key, label, icon: Icon, type }) => {
                const val = fields[key];
                const filled = val && val.trim().length > 0;
                return (
                  <div key={key}>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-1">
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      {label}
                      {filled && <CheckCircle2 className="h-3 w-3 text-emerald-500 ml-auto" />}
                    </label>
                    <input
                      type={type}
                      value={val}
                      onChange={e => setFields(f => ({ ...f, [key]: e.target.value }))}
                      className={`w-full rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all ${
                        filled
                          ? "border-blue-200 bg-blue-50/60 text-blue-900"
                          : "border-gray-200 bg-white text-gray-700"
                      }`}
                      placeholder={type === "date" ? "" : label}
                      data-testid={`input-lease-${key}`}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex-shrink-0 px-4 py-3 border-t bg-white">
              <p className="text-xs text-gray-400">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-400 mr-1" />
                Blue = auto-filled from client profile
              </p>
            </div>
          </div>

          {/* Right panel — live preview */}
          <div className="flex flex-col flex-1 min-w-0 bg-gray-100">
            <div className="px-4 py-2 border-b bg-white flex items-center gap-2 flex-shrink-0">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Live Preview</span>
              <span className="text-xs text-gray-300">· Updates as you type</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe
                srcDoc={previewHtml}
                className="w-full h-full border-none block"
                title="Lease Agreement Preview"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        {sentLinks.length > 0 ? (
          /* Success state */
          <div className="flex-shrink-0 border-t bg-emerald-50 border-emerald-200 px-5 py-4 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <span className="font-semibold text-emerald-800 text-sm">Agreement sent for signing!</span>
            </div>
            <p className="text-xs text-emerald-700">Share these signing links with each signer:</p>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {sentLinks.map((link, i) => (
                <div key={i} className="flex items-center gap-2 bg-white border border-emerald-200 rounded-lg px-3 py-1.5">
                  <span className="text-xs text-gray-500 shrink-0 font-medium w-28 truncate">{link.name}</span>
                  <code className="text-xs text-emerald-700 flex-1 truncate">{link.url}</code>
                  <button
                    onClick={() => navigator.clipboard.writeText(link.url)}
                    className="text-emerald-600 hover:text-emerald-800 shrink-0"
                    title="Copy link"
                    data-testid={`button-copy-link-${i}`}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 hover:text-emerald-800 shrink-0"
                    title="Open signing page"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={onClose}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg font-semibold transition-colors"
                data-testid="button-lease-editor-done"
              >
                Done
              </button>
            </div>
          </div>
        ) : !showSigners ? (
          /* Default footer */
          <div className="flex-shrink-0 border-t bg-white px-5 py-3 flex items-center justify-between gap-4">
            <p className="text-xs text-gray-400 hidden sm:block">
              Review and edit fields, then send for signing. The agreement will be generated as a PDF automatically.
            </p>
            <button
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors shrink-0"
              onClick={() => setShowSigners(true)}
              data-testid="button-lease-send-for-signing"
            >
              <Send className="h-4 w-4" />
              Send for Signing
            </button>
          </div>
        ) : (
          /* Signer panel */
          <div className="flex-shrink-0 border-t bg-white px-5 py-4 space-y-3" style={{ maxHeight: 260, overflowY: "auto" }}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-gray-800">Signers</p>
              <button
                onClick={() => { setShowSigners(false); setError(""); }}
                className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
              >
                <X className="h-3 w-3" /> Cancel
              </button>
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="space-y-2">
              {signers.map((signer) => (
                <div key={signer.id} className="flex items-center gap-2">
                  <input
                    value={signer.name}
                    onChange={e => updateSigner(signer.id, { name: e.target.value })}
                    placeholder="Full name"
                    className="flex-1 border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    data-testid={`input-signer-name-${signer.id}`}
                  />
                  <input
                    value={signer.email}
                    onChange={e => updateSigner(signer.id, { email: e.target.value })}
                    placeholder="Email address"
                    type="email"
                    className="flex-1 border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    data-testid={`input-signer-email-${signer.id}`}
                  />
                  <select
                    value={signer.role}
                    onChange={e => updateSigner(signer.id, { role: e.target.value })}
                    className="border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                  >
                    <option>Landlord</option>
                    <option>Manager</option>
                    <option>Tenant</option>
                    <option>Other</option>
                  </select>
                  {signers.length > 1 && (
                    <button
                      onClick={() => removeSigner(signer.id)}
                      className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded"
                      title="Remove signer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={addSigner}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
                data-testid="button-lease-add-signer"
              >
                <Plus className="h-3.5 w-3.5" /> Add Signer
              </button>
              <div className="flex-1" />
              <button
                onClick={handleSend}
                disabled={sending}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
                data-testid="button-lease-confirm-send"
              >
                {sending
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating &amp; Sending…</>
                  : <><Send className="h-4 w-4" /> Confirm &amp; Send</>}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Off-screen element for html2canvas capture */}
      <div style={{ position: "fixed", left: "-9999px", top: 0, width: 794, pointerEvents: "none" }}>
        <PrintableDoc ref={printRef} data={fields} />
      </div>
    </div>,
    document.body
  );
}

const PrintableDoc = forwardRef<HTMLDivElement, { data: LeaseFields }>(({ data }, ref) => {
  const fmtD = (s: string) => {
    try { return new Date(s + "T00:00:00").toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" }); }
    catch { return s; }
  };
  const eff = data.effectiveDate ? fmtD(data.effectiveDate) : "_______________";
  const Fill = ({ v, fb = "_______________" }: { v: string; fb?: string }) =>
    v && v.trim()
      ? <span style={{ color: "#1a56db", fontWeight: 600, borderBottom: "1.5px solid #1a56db", padding: "0 2px" }}>{v.trim()}</span>
      : <span style={{ color: "#999", fontStyle: "italic" }}>{fb}</span>;

  const st = {
    wrap: { width: "794px", background: "#fff", fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "12pt", lineHeight: 1.7, color: "#111", padding: "40px 48px" } as React.CSSProperties,
    h1: { fontSize: "16pt", textAlign: "center" as const, marginBottom: 4, marginTop: 0 },
    h2: { fontSize: "13pt", marginTop: 28, marginBottom: 6, borderBottom: "1px solid #ccc", paddingBottom: 4 },
    hb: { textAlign: "center" as const, marginBottom: 28 },
    hp: { margin: "2px 0", fontSize: "11pt" },
    pb: { margin: "16px 0", padding: "14px 18px", borderLeft: "3px solid #2563eb", background: "#f8faff" },
    pp: { margin: "3px 0", fontSize: "11pt" },
    legal: { fontSize: "10.5pt", color: "#333", marginTop: 8, lineHeight: 1.75 } as React.CSSProperties,
    table: { borderCollapse: "collapse" as const, width: "100%", marginTop: 8 },
    tdL: { padding: "6px 10px", border: "1px solid #bbb", verticalAlign: "top" as const, fontSize: "11pt", fontWeight: "bold" as const, width: "52%", color: "#333" },
    tdV: { padding: "6px 10px", border: "1px solid #bbb", verticalAlign: "top" as const, fontSize: "11pt" },
    sb: { marginTop: 40, display: "flex" as const, gap: 60 },
    sc: { flex: 1, minWidth: 200 },
    sl: { borderTop: "1px solid #555", marginTop: 40, marginBottom: 4 },
    slb: { fontSize: "10pt", color: "#555", margin: "1px 0" },
  };

  return (
    <div ref={ref} style={st.wrap}>
      <div style={st.hb}>
        <h1 style={st.h1}>Lease Co-Guarantee Agreement</h1>
        <p style={st.hp}><strong>"Agreement"</strong></p>
        <p style={{ ...st.hp, marginTop: 14 }}><strong>Pensio Risk Management Group Inc.</strong> "Product Manager"</p>
        <p style={st.hp}>80 Carlauren Rd, Unit 23, Woodbridge, ON, L4L 7Z5</p>
        <p style={st.hp}>Product Manager's Email: info@pensioglobal.com</p>
      </div>
      <div style={st.pb}>
        <p style={st.pp}><strong>Rentatee "Landlord"</strong></p>
        <p style={st.pp}><strong>Name:</strong> <Fill v={data.landlordName} /></p>
        <p style={st.pp}><strong>Address:</strong> <Fill v={data.landlordAddress} /></p>
        <p style={st.pp}><strong>Contact Number:</strong> <Fill v={data.landlordPhone} /></p>
        <p style={st.pp}><strong>Email:</strong> <Fill v={data.landlordEmail} /></p>
      </div>
      <h2 style={st.h2}>Declarations</h2>
      <table style={st.table}><tbody>
        <tr><td style={st.tdL}>Residential Rental Property Address</td><td style={st.tdV}><Fill v={data.propertyAddress} /></td></tr>
        <tr><td style={st.tdL}>Qualified Tenants Residing in a Rental Unit</td><td style={st.tdV}><Fill v={data.qualifiedTenants} /></td></tr>
        <tr><td style={st.tdL}>Lease Co-Guarantee Agreement Contract Control Number</td><td style={st.tdV}>Pensio00001</td></tr>
        <tr><td style={st.tdL}>Lease Co-Guarantee Effective Date</td><td style={st.tdV}><Fill v={eff} /></td></tr>
      </tbody></table>
      <h2 style={st.h2}>Reimbursements and Product Fee</h2>
      <p style={st.legal}><strong>Rent Guarantee Reimbursement</strong> provided under this Agreement covers a maximum rent loss for each registered residential rental Unit in the Property. The maximum amount for the rent loss reimbursement is capped at sixty thousand Canadian Dollars CDN $60,000 for each twelve (12) month period for any one (1) habitable rentable Unit in the Property for the Term.</p>
      <p style={st.legal}><strong>Malicious Tenant Damage Reimbursement</strong> provided under this Agreement covers a maximum malicious tenant damage loss for each registered residential rental Unit in the Property. The maximum amount for the malicious tenant damage loss reimbursement is capped at ten thousand Canadian Dollars CDN $10,000 for each twelve (12) month period for any one (1) habitable and rentable Unit in the Property for the Term.</p>
      <p style={st.legal}><strong>Eviction Expense Reimbursement</strong> provided under this Agreement covers a maximum loss for each registered residential rental Unit in the Property. The maximum amount for the eviction expense loss reimbursement is capped at one thousand five hundred Canadian Dollars CDN $1,500 for each twelve (12) month period for any one (1) habitable and rentable Unit in the Property for the Term.</p>
      <p style={st.legal}><strong>Product Fee</strong> payable to Rentatee Technologies Inc. ("Rentatee") shall be five percent (5.0%) of the declared monthly rent if paid monthly, or four and one-half percent (4.5%) of the declared annual rent if paid annually, paid by the Landlord for the Qualifying Tenant(s) listed above to rent a Unit in the Property under a Lease Agreement. The Product Fee payment must be made to Rentatee on or before the 15th calendar day of each month commencing on the Effective Date, for the Term and any Extension thereof.</p>
      <h2 style={st.h2}>Reimbursement Loss Payee</h2>
      <div style={st.pb}>
        <p style={st.pp}><strong>Landlord:</strong> <Fill v={data.landlordName} /></p>
        <p style={st.pp}><strong>Product Manager Agent:</strong> Rentatee Technologies Inc.</p>
        <p style={st.pp}>1610 Swainson Road, Kelowna, BC, V1P 1C5</p>
        <p style={st.pp}>Agent's Email: sales@rentatee.com</p>
      </div>
      <h2 style={st.h2}>Important Notice Disclaimer</h2>
      <p style={st.legal}>The Tenant Management Services and Reimbursements provided by the Product Manager to the Landlord, as stated in this Agreement, are explicitly clarified to not constitute insurance. It is strongly recommended that Landlord carefully review this Agreement, seek professional advice, or consult the Product Manager or Product Manager's Agent before entering into this Agreement.</p>
      <p style={st.legal}>The Product Manager directly self-procured a surety in the form of a Performance Bond from a Surety with an insurance or reinsurance rating of A.M. Best A (excellent) or better to secure the Product Manager's services and performance for the client.</p>
      <h2 style={st.h2}>Lease Co-Guarantee</h2>
      <p style={st.legal}>This Lease Co-Guarantee Agreement (the "Agreement") made on the <Fill v={eff} fb="_____________" /> (the "Effective Date") between Rentatee (or with the Landlord's authorized Property Manager) (the "Landlord" or "Property Manager") and Pensio Risk Management Group Inc., located at 80 Carlauren Rd, Unit 23, Woodbridge, ON, L4L 7Z5 ("Product Manager").</p>
      <h2 style={st.h2}>Recitals</h2>
      <p style={st.legal}>Whereas the Landlord and Product Manager may be referred to herein each as (a "Party") and collectively as (the "Parties") to this Agreement;</p>
      <p style={st.legal}>Whereas the Landlord, being the owner, operator, and manager of the registered rental Unit, situated at the address of the property (the "Property");</p>
      <p style={st.legal}>Whereas in consideration of the terms and conditions outlined in this Agreement, the Product Manager agrees to provide the Landlord with the following Tenant Management Services and reimbursements for losses in the event of a Tenant violation of an enforceable Lease Agreement: (i) Rent Guarantee Reimbursement for defaulted rent loss; (ii) Malicious Tenant Damage Reimbursement for malicious tenant damage; and (iii) Eviction Expense Reimbursement, for eviction and legal expenses.</p>
      <p style={st.legal}>Whereas the initial term (the "Lease Term") for any Qualified Tenant listed above who meets the qualifications to enter into a Lease Agreement is for a minimum occupancy period of twelve (12) months.</p>
      <p style={st.legal}>And Whereas the Parties have mutually agreed to enter into this Agreement and are bound by the terms and conditions specified within this Agreement.</p>
      <div style={st.sb}>
        <div style={st.sc}>
          <div style={st.sl} />
          <p style={st.slb}><strong>Landlord Signature</strong></p>
          <p style={st.slb}>Name: <Fill v={data.landlordName} /></p>
          <p style={st.slb}>Date: <Fill v={eff} /></p>
        </div>
        <div style={st.sc}>
          <div style={st.sl} />
          <p style={st.slb}><strong>Product Manager</strong></p>
          <p style={st.slb}>Pensio Risk Management Group Inc.</p>
          <p style={st.slb}>By: Jim Milankov, President</p>
        </div>
      </div>
      <p style={{ marginTop: 48, fontSize: "9pt", color: "#888", textAlign: "center" }}>
        Generated by QuoteUs.ca — {new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })}
      </p>
    </div>
  );
});
PrintableDoc.displayName = "PrintableDoc";
