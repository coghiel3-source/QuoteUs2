import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X, Maximize2, Minimize2, Send, Plus, Trash2,
  GripHorizontal, CheckCircle2, Loader2, Copy, ExternalLink, Clock, Printer,
} from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

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

/* ── Inline field input that looks like the PDF's underline blanks ── */
function Blank({
  value, onChange, width = 180, placeholder = "_______________",
}: {
  value: string; onChange: (v: string) => void; width?: number; placeholder?: string;
}) {
  const filled = value.trim().length > 0;
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        display: "inline",
        width,
        border: "none",
        borderBottom: "1px solid #555",
        background: "#fff59d",
        fontFamily: "inherit",
        fontSize: "inherit",
        lineHeight: "inherit",
        color: "#000",
        fontWeight: "normal",
        outline: "none",
        padding: "0 4px",
        verticalAlign: "baseline",
      }}
    />
  );
}

/* Date blank — formats on blur */
function DateBlank({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [raw, setRaw] = useState(value);
  useEffect(() => { setRaw(value); }, [value]);
  return (
    <input
      type="date"
      value={raw}
      onChange={e => { setRaw(e.target.value); onChange(e.target.value); }}
      style={{
        display: "inline",
        width: 170,
        border: "none",
        borderBottom: "1px solid #555",
        background: "#fff59d",
        fontFamily: "inherit",
        fontSize: "inherit",
        color: "#000",
        fontWeight: "normal",
        outline: "none",
        padding: "0 4px",
        verticalAlign: "baseline",
      }}
    />
  );
}

export default function LeaseDocumentEditor({ open, onClose, locationId, initialFields, actorId, onSent }: Props) {
  const [fields, setFields] = useState<LeaseFields>(initialFields);
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
  const docRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  const upd = (key: keyof LeaseFields) => (v: string) => setFields(f => ({ ...f, [key]: v }));

  useEffect(() => {
    if (open && !initialized.current) {
      initialized.current = true;
      const editorW = Math.min(900, window.innerWidth - 40);
      const editorH = Math.min(820, window.innerHeight - 40);
      setPos({ x: Math.max(20, (window.innerWidth - editorW) / 2), y: Math.max(20, (window.innerHeight - editorH) / 2) });
      setFields(initialFields);
      setSentLinks([]);
      setShowSigners(false);
      setError("");
      setSending(false);
      setSigners([{ id: "s1", name: initialFields.landlordName, email: initialFields.landlordEmail, role: "Landlord" }]);
    }
    if (!open) initialized.current = false;
  }, [open, initialFields]);

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

  async function buildPdfBlob(): Promise<Blob> {
    const el = docRef.current!;
    const canvas = await (html2canvas as any)(el, {
      scale: 1.5, useCORS: true, backgroundColor: "#ffffff", logging: false,
    });
    const imgData = canvas.toDataURL("image/jpeg", 0.92);
    const pdf = new (jsPDF as any)({ orientation: "portrait", unit: "mm", format: "a4" });
    const pW = pdf.internal.pageSize.getWidth();
    const pH = pdf.internal.pageSize.getHeight();
    const iH = (canvas.height * pW) / canvas.width;

    // Locate the landlord signature line so we can embed an invisible text
    // anchor at its position in the PDF. The server-side stamper searches for
    // this marker to place the signature on the actual line (vs. a new page).
    const elRect = el.getBoundingClientRect();
    const anchorEl = el.querySelector<HTMLElement>("#landlord-sig-anchor");
    let anchorMm: { x: number; y: number; w: number } | null = null;
    if (anchorEl) {
      const r = anchorEl.getBoundingClientRect();
      const scaleMm = pW / elRect.width;
      anchorMm = {
        x: (r.left - elRect.left) * scaleMm,
        y: (r.top - elRect.top) * scaleMm,
        w: r.width * scaleMm,
      };
    }

    let rem = iH, yOff = 0;
    let pageIdx = 0;
    while (rem > 0) {
      pdf.addImage(imgData, "JPEG", 0, yOff, pW, iH);
      // If the anchor falls on this page, embed an invisible marker text on
      // the signature line. White text on white background — invisible to
      // humans, fully extractable by pdfjs server-side.
      if (anchorMm) {
        const pageTop = pageIdx * pH;
        const pageBottom = pageTop + pH;
        if (anchorMm.y >= pageTop && anchorMm.y <= pageBottom) {
          const localY = anchorMm.y - pageTop;
          pdf.setTextColor(255, 255, 255);
          pdf.setFontSize(6);
          // Marker text is unique + describes the field. Server matches the prefix.
          pdf.text(`__SIG_ANCHOR_LANDLORD__W=${anchorMm.w.toFixed(1)}`, anchorMm.x, localY);
          pdf.setTextColor(0, 0, 0);
        }
      }
      rem -= pH;
      if (rem > 0) { yOff -= pH; pdf.addPage(); pageIdx++; }
    }
    return pdf.output("blob");
  }

  function buildPrintableHtml(): string {
    const el = docRef.current;
    if (!el) return "";
    const clone = el.cloneNode(true) as HTMLElement;
    // Replace every live input with a static span containing its current value
    const srcInputs = el.querySelectorAll("input");
    const cloneInputs = clone.querySelectorAll("input");
    srcInputs.forEach((src, i) => {
      const dst = cloneInputs[i];
      if (!dst) return;
      const raw = (src as HTMLInputElement).value || "";
      const value = (src as HTMLInputElement).type === "date" && raw
        ? new Date(raw + "T00:00:00").toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })
        : raw;
      const span = document.createElement("span");
      span.textContent = value || "_______________";
      span.style.cssText = `display:inline;border-bottom:1px solid #555;color:${value ? "#1a56db" : "#555"};font-weight:${value ? "600" : "normal"};padding:0 3px;`;
      dst.replaceWith(span);
    });
    return clone.innerHTML;
  }

  function handlePrint() {
    if (!docRef.current) return;
    setError("");
    const html = buildPrintableHtml();
    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) { setError("Pop-up blocked — please allow pop-ups to print."); return; }
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map(n => n.outerHTML).join("\n");
    w.document.write(`<!doctype html><html><head><title>Lease Co-Guarantee Agreement</title>${styles}
<style>
  @page { size: A4; margin: 12mm; }
  body { margin: 0; background: #fff; font-family: 'Times New Roman', Times, Georgia, serif; font-size: 11pt; line-height: 1.65; color: #000; }
  .print-doc { max-width: none; margin: 0; padding: 0; box-shadow: none; }
  ul { list-style-type: disc !important; }
</style></head><body><div class="print-doc">${html}</div>
<script>window.addEventListener('load', () => { setTimeout(() => { window.focus(); window.print(); }, 250); });<\/script>
</body></html>`);
    w.document.close();
  }

  async function handleDownloadPdf() {
    setError("");
    try {
      const blob = await buildPdfBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const safeName = (fields.landlordName || "Client").replace(/\s+/g, "_");
      a.href = url; a.download = `LeaseCoGuarantee-${safeName}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err: any) {
      setError("Could not build PDF — try Print instead. " + (err?.message || ""));
    }
  }

  async function handleSend() {
    const valid = signers.filter(s => s.email.trim());
    if (valid.length === 0) { setError("Add at least one signer email."); return; }
    setError("");
    setSending(true);
    try {
      let file: File;
      try {
        const pdfBlob = await buildPdfBlob();
        const safeName = (fields.landlordName || "Client").replace(/\s+/g, "_");
        file = new File([pdfBlob], `LeaseCoGuarantee-${safeName}.pdf`, { type: "application/pdf" });
      } catch (pdfErr: any) {
        throw new Error("Could not generate PDF: " + (pdfErr?.message || "render failed") + ". Try Print → Save as PDF, then attach manually.");
      }

      const formData = new FormData();
      formData.append("actorId", actorId);
      formData.append("signers", JSON.stringify(valid));
      formData.append("templateData", JSON.stringify(fields));
      formData.append("landlordName", fields.landlordName || "");
      formData.append("landlordEmail", fields.landlordEmail || valid[0].email);
      formData.append("documents", file);
      const res = await fetch(`/api/rep/locations/${locationId}/doc-signatures`, { method: "POST", body: formData });
      const text = await res.text();
      let result: any = {};
      try { result = text ? JSON.parse(text) : {}; } catch { result = { error: text.slice(0, 200) }; }
      if (!res.ok) throw new Error(result.error || `Server returned ${res.status}`);
      const links = result.signerLinks || result.links || [];
      setSentLinks(links);
      onSent();
    } catch (err: any) {
      console.error("[LeaseEditor] send failed:", err);
      setError(err.message || "Failed to send — please try again.");
    } finally {
      setSending(false);
    }
  }

  if (!open) return null;

  const editorW = Math.min(900, window.innerWidth - 40);
  const editorH = Math.min(820, window.innerHeight - 40);
  const eff = fields.effectiveDate ? fmtDate(fields.effectiveDate) : "_______________";

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 9990, pointerEvents: "none" }}>
      <div
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", pointerEvents: "auto" }}
        onClick={() => { if (!sending) onClose(); }}
      />

      <div
        style={{
          position: "absolute",
          left: isMaximized ? 0 : pos.x,
          top: isMaximized ? 0 : pos.y,
          width: isMaximized ? "100vw" : editorW,
          height: isMaximized ? "100vh" : editorH,
          display: "flex",
          flexDirection: "column",
          background: "#fff",
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
          <span className="text-sm font-semibold flex-1">Lease Co-Guarantee Agreement</span>
          <span className="text-xs text-slate-400 mr-2">Click any underlined field to edit</span>
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
            onClick={handlePrint}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition-colors"
            title="Print or Save as PDF"
            data-testid="button-lease-print"
          >
            <Printer className="h-3.5 w-3.5" /> Print / PDF
          </button>
          <button onClick={() => setIsMaximized(m => !m)} className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
            {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <button onClick={() => { if (!sending) onClose(); }} className="p-1.5 rounded hover:bg-red-500/70 text-slate-400 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Document area ── */}
        <div className="flex-1 overflow-y-auto bg-gray-200" style={{ minHeight: 0 }}>
          <div
            ref={docRef}
            style={{
              fontFamily: "'Times New Roman', Times, Georgia, serif",
              fontSize: "11pt",
              lineHeight: 1.65,
              color: "#000",
              background: "#fff",
              maxWidth: 820,
              margin: "24px auto",
              padding: "60px 72px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
            }}
          >
            {/* ═══════════ PAGE 1 ═══════════ */}
            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <div style={{ fontSize: "18pt", fontWeight: "bold", marginBottom: 8 }}>Lease Co-Guarantee Agreement</div>
              <div style={{ fontSize: "13pt", fontStyle: "italic" }}>"Agreement"</div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <div>Lease Co-Guarantee Agreement "Agreement"</div>
              <div>Pensio Risk Management Group Inc. "Product Manager"</div>
              <div>80 Carlauren Rd, Unit 23</div>
              <div>Woodbridge, ON, L4L 7Z5</div>
              <div>Product Manager's Email: info@pensioglobal.com</div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <div>Rentatee "Landlord"</div>
              <div style={{ marginTop: 4 }}>
                Address:&nbsp;
                <Blank value={fields.landlordAddress} onChange={upd("landlordAddress")} width={320} placeholder="___________________" />
              </div>
              <div>
                Landlord's Contact Number:&nbsp;
                <Blank value={fields.landlordPhone} onChange={upd("landlordPhone")} width={240} placeholder="____________________" />
              </div>
              <div>
                Landlord's Email:&nbsp;
                <Blank value={fields.landlordEmail} onChange={upd("landlordEmail")} width={260} placeholder="________________" />
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ fontWeight: "normal" }}>Residential Rental Property Address</div>
              <div style={{ marginTop: 12 }}>
                <Blank value={fields.propertyAddress} onChange={upd("propertyAddress")} width={420} placeholder="__________________________" />
              </div>
            </div>

            {/* ═══════════ PAGE 2 ═══════════ */}
            <div style={{ pageBreakBefore: "always", marginTop: 40 }}>
              <div style={{ fontWeight: "bold", marginBottom: 12 }}>Declarations</div>
              <div style={{ marginBottom: 8 }}>
                Residential Rental Property Address:&nbsp;
                <Blank value={fields.propertyAddress} onChange={upd("propertyAddress")} width={300} placeholder="______________________" />
              </div>
              <div style={{ marginBottom: 8 }}>
                Qualified Tenants Residing in a Rental Unit:&nbsp;
                <Blank value={fields.qualifiedTenants} onChange={upd("qualifiedTenants")} width={280} placeholder="______________________" />
              </div>
              <div style={{ marginBottom: 8 }}>
                Lease Co-Guarantee Agreement contract control number: Pensio00001/15879 95 St/5555/20260305
              </div>
              <div style={{ marginBottom: 20 }}>
                Lease Co-Guarantee Effective Date:&nbsp;
                <DateBlank value={fields.effectiveDate} onChange={upd("effectiveDate")} />
              </div>

              <div style={{ marginBottom: 16 }}>Reimbursements and Product Fee:</div>

              <p style={{ marginBottom: 12, textAlign: "justify" }}>
                Rent Guarantee Reimbursement Rent Guarantee Reimbursement provided under this Agreement covers a maximum rent loss for each registered residential rental Unit in the Property. The maximum amount for the rent loss reimbursement is capped at sixty thousand Canadian Dollars CDN $60,000 for each twelve 12 month period for any one 1 habitable rentable Unit in the Property for the Term.
              </p>
              <p style={{ marginBottom: 12, textAlign: "justify" }}>
                Malicious Tenant Damage Reimbursement provided under this Agreement covers a maximum malicious tenant damage loss for each registered residential rental Unit in the Property. The maximum amount for the malicious tenant damage loss reimbursement is capped at ten thousand Canadian Dollars CDN $10,000 for each twelve 12 month period for any one 1 habitable and rentable Unit in the Property for the Term.
              </p>
              <p style={{ marginBottom: 12, textAlign: "justify" }}>
                Eviction Expense Reimbursement provided under this Agreement covers a maximum loss for each registered residential rental Unit in the Property. The maximum amount for the eviction expense loss reimbursement is capped at one thousand five hundred Canadian Dollars CDN $1,500 for each twelve 12 month period for any one 1 habitable and rentable Unit in the Property for the Term.
              </p>
              <p style={{ textAlign: "justify" }}>
                Product Fee payable to Rentatee Technologies Inc. ("Rentatee") shall be five percent (5.0%) of the declared monthly rent if paid monthly, or four and one-half percent (4.5%) of the declared annual rent if paid annually, paid by the Landlord for the Qualifying Tenant(s) listed above to rent a Unit in the Property under a Lease Agreement. The Product Fee payment must be made to Rentatee on or before the 15th calendar day of each month commencing on the Effective Date, for the Term and any Extension thereof. If there is a demand made for Rent Guarantee Reimbursement, Malicious Tenant Damage Reimbursement or Eviction Expense Reimbursement by the Landlord, the total remaining unpaid twelve-monthly installments of the monthly Product Fee amount will be immediately due and payable by the Landlord before any payment is made by the Product Manager.
              </p>
            </div>

            {/* ═══════════ PAGE 3 ═══════════ */}
            <div style={{ pageBreakBefore: "always", marginTop: 40 }}>
              <div style={{ marginBottom: 12 }}>Reimbursement Loss Payee:</div>
              <div style={{ marginBottom: 20 }}>Landlord</div>

              <div style={{ marginBottom: 12 }}>Product Manager Agent</div>
              <div style={{ marginBottom: 4 }}>Rentatee Technologies Inc. ("Agent")</div>
              <div style={{ marginBottom: 4 }}>1610 Swainson Road, Kelowna, BC, V1P 1C5</div>
              <div style={{ marginBottom: 20 }}>Agent's Email: sales@rentatee.com</div>

              <div style={{ marginBottom: 8 }}>Product Manager Agent</div>
              <ul style={{ paddingLeft: 30, listStyleType: "disc", marginBottom: 8 }}>
                <li>Rentatee Technologies Inc. ("Agent")</li>
              </ul>
              <div style={{ marginLeft: 30, marginBottom: 8 }}>1610 Swainson Road, Kelowna, BC, V1P 1C5</div>
              <ul style={{ paddingLeft: 30, listStyleType: "disc", marginBottom: 24 }}>
                <li>Agent's Email: sales@rentatee.com</li>
              </ul>

              <div style={{ marginBottom: 12 }}>Important Notice Disclaimer</div>
              <p style={{ marginBottom: 12, textAlign: "justify" }}>
                The Tenant Management Services and Reimbursements provided by the Product Manager to the Landlord, as stated in this Agreement, are explicitly clarified to not constitute insurance. It is strongly recommended that Landlord carefully review this Agreement, seek professional advice, or consult the Product Manager or Product Manager's Agent before entering into this Agreement.
              </p>
              <p style={{ textAlign: "justify" }}>
                The Product Manager directly self-procured a surety in the form of a Performance Bond (the "Performance Bond") from a Surety with an insurance or reinsurance rating of A.M. Best A (excellent) or better (the "Surety") to secure the Product Manager's services and performance for the client. The Surety is not licensed under the Insurance Companies Act and the Province where the client and the property are located. Payment of demands may be more difficult than with an insurer licensed under the Insurance Companies Act. A foreign insurer is defined in Part XIII of the Insurance Companies Act Canada as an entity incorporated or formed by or under the laws of a country other than Canada that insures risks, including an association and an exchange (as those terms are defined in Section 571 of the ICA. The Superintendent of Insurance has no authority under the Insurance Act regarding the Surety. Provincial and federal unlicensed and excise taxes are payable by the Product Manager. The Product Manager's licensed insurance broker in the Province where the Unit is located has been instructed by the Product Manager to file with the Superintendent a return under oath or affirmation in the form and manner required by the Superintendent, containing particulars of all insurance effected under this Section; and concurrently, in respect of all premiums on such insurance Payable by the Product Manager, pay the provincial and federal excise to the Minister of Finance the premium taxes that would be payable if a licensed insurer had received such premiums. The Product Manager's product services and guarantees may be subject to provincial restrictions and only be provided in locations where the law permits. Landlords who need to file a demand must contact the Product Manager's Agent, adhering to the terms and conditions specified in this Agreement.
              </p>
            </div>

            {/* ═══════════ PAGE 4 ═══════════ */}
            <div style={{ pageBreakBefore: "always", marginTop: 40 }}>
              <div style={{ textAlign: "center", fontWeight: "bold", marginTop: 20, marginBottom: 24 }}>LEASE COGUARANTEE</div>
              <p style={{ marginBottom: 24, textAlign: "justify" }}>
                This Lease Co-Guarantee Agreement (the "Agreement") made on the&nbsp;
                <DateBlank value={fields.effectiveDate} onChange={upd("effectiveDate")} />
                &nbsp;(the "Effective Date") between Rentatee (or with the Landlord's authorized Property Manager) (the "Landlord" or "Property Manager") and Pensio Risk Management Group Inc., located at 80 Carlauren Rd, Unit 23, Woodbridge, ON, L4L 7Z5 ("Product Manager").
              </p>

              <div style={{ textAlign: "center", fontWeight: "bold", marginBottom: 16 }}>RECITALS</div>
              <p style={{ marginBottom: 10, textAlign: "justify" }}>Whereas the Landlord and Product Manager may be referred to herein each as (a "Party") and collectively as (the "Parties") to this Agreement;</p>
              <p style={{ marginBottom: 10, textAlign: "justify" }}>Whereas the Landlord, being the owner, operator, and manager of the registered rental Unit (referred to as the "Unit"), listed above, situated at the address of the property (the "Property");</p>
              <p style={{ marginBottom: 10, textAlign: "justify" }}>Whereas in consideration of the terms and conditions outlined in this Agreement, the Product Manager agrees to provide the Landlord with the following Tenant Management Services and reimbursements for losses in the event of a Tenant violation of an enforceable Lease Agreement, the (i) Rent Guarantee Reimbursement (the "Rent Guarantee Reimbursement") for defaulted rent loss; and (ii) Malicious Tenant Damage Reimbursement (the "Malicious Tenant Damage Reimbursement") for malicious tenant damage; and (iii) Eviction Expense Reimbursement (the "Eviction Expense Reimbursement"), for eviction and legal expenses;</p>
              <p style={{ marginBottom: 10, textAlign: "justify" }}>Whereas the initial term (the "Lease Term") for any Qualified Tenant listed above who meets the qualifications to enter into a Lease Agreement is for a minimum occupancy period of twelve 12 months;</p>
              <p style={{ marginBottom: 20, textAlign: "justify" }}>And Whereas the Parties have mutually agreed to enter into this Agreement and are bound by the terms and conditions specified within this Agreement.</p>

              <p style={{ textAlign: "justify" }}>NOW THEREFORE, in recognition and acceptance of the mutual promises and obligations outlined in this Agreement, and Exhibits and other valuable considerations, the Parties involved hereby agree to the following terms and conditions:</p>
            </div>

            {/* ═══════════ PAGE 5 ═══════════ */}
            <div style={{ pageBreakBefore: "always", marginTop: 40 }}>
              <div style={{ marginBottom: 12 }}>Definitions</div>
              <p style={{ marginBottom: 12 }}>The Definitions governing this Agreement shall be as follows:</p>

              <p style={{ marginBottom: 6 }}>Exhibit A – Tenant Demand Notice</p>
              <p style={{ marginBottom: 6 }}>The initial written formal communication issued by the Landlord to the Product Manager or the Product Manager's Agent, following the prescribed format and manner specified in Exhibit A.</p>
              <p style={{ marginBottom: 16 }}>("Enclosed")</p>

              <p style={{ marginBottom: 6 }}>Exhibit B – Supplemental Lease Agreement Violations Report</p>
              <p style={{ marginBottom: 6 }}>The supplemental written formal communication issued by the Landlord to the Product Manager or the Product Manager's Agent, following the prescribed format and manner specified in Exhibit B.</p>
              <p style={{ marginBottom: 16 }}>("Enclosed")</p>

              <p style={{ marginBottom: 6 }}>Exhibit C - Tenant Eviction Notice</p>
              <p style={{ marginBottom: 6 }}>The specific time, form, and manner for serving the eviction notice to Tenants in default are outlined in Section 4 and Exhibit C of this Agreement.</p>
              <p style={{ marginBottom: 16 }}>("Enclosed")</p>

              <p style={{ marginBottom: 8 }}>"Agent" means Rentatee Technologies Inc., a company, person, party, third-party, or entity acting on behalf of Product Manager.</p>
              <p style={{ marginBottom: 8 }}>"Agreement" means this Agreement, Recitals, and Exhibits.</p>
              <p style={{ marginBottom: 16 }}>"Effective Date" means the date of this Agreement.</p>

              <ul style={{ paddingLeft: 30, listStyleType: "disc", marginBottom: 8 }}>
                <li>"Eviction Expense Reimbursement" shall have the same meaning set forth in Section 4 and the Recitals.</li>
              </ul>

              <p style={{ marginBottom: 16 }}>"Extension" means the renewal of this Agreement.</p>

              <ul style={{ paddingLeft: 30, listStyleType: "disc", marginBottom: 16 }}>
                <li>"Landlord" shall have the same meaning set forth in the Recitals.</li>
                <li>"Lease Agreement" means a valid, existing, enforceable legal lease agreement for a Unit listed above between the Landlord and Qualified Tenant(s) who meets the qualifications specified in Section 5, for the Lease Term.</li>
                <li>"Lease Term" for the purpose of this Agreement means any Lease Agreement shall be for a period of not less than twelve 12 months.</li>
              </ul>

              <p style={{ marginBottom: 16 }}>"Malicious Tenant Damage Reimbursement" shall have the same meaning set forth in Section 3.</p>

              <ul style={{ paddingLeft: 30, listStyleType: "disc", marginBottom: 16 }}>
                <li>"Notices" means written communications between the Parties that are required or permitted under this Agreement, including any notices of breach, termination, or other important matters.</li>
                <li>"Party" means any individual or entity that is a signatory to this Agreement.</li>
                <li>"Performance Bond" shall have the same meaning set forth in the Important Notice Disclaimer.</li>
                <li>"Product Fee" shall have the same meaning set forth in the Declarations.</li>
              </ul>

              <p style={{ marginBottom: 16 }}>"Product Manager" means Pensio Risk Management Group Inc.</p>

              <ul style={{ paddingLeft: 30, listStyleType: "disc", marginBottom: 16 }}>
                <li>"Property" shall have the same meaning set forth in the Recitals.</li>
                <li>"Qualified Tenant" means a Person or Persons who has entered into a Lease Agreement before, on or after the Effective Date and who meets the qualifications specified in Section 5.</li>
              </ul>

              <p style={{ marginBottom: 16 }}>"Rent" means the monthly gross rent amount specified in a legal and valid in force Lease Agreement.</p>

              <ul style={{ paddingLeft: 30, listStyleType: "disc", marginBottom: 16 }}>
                <li>"Rent Guarantee Reimbursement" shall have the same meaning set forth in Section 2.</li>
                <li>"Renewal Term" shall mean the term for which the Lease Agreement is renewed after the Lease Term.</li>
                <li>"Reporting Period" means a one 1 month period starting on the first day of the calendar month and ending on the last day of the calendar month.</li>
                <li>"Reporting Date" means the close of Monday following the Reporting Period.</li>
                <li>"Supplemental Lease Agreement Violation Report" means a defined written monthly formal communication issued by the Landlord to the Product Manager or the Product Manager's Agent, following the prescribed format and manner specified in Exhibit B. This report must be sent by the Landlord to the Product Manager or the Product Manager's Agent on the Reporting Date, via a return receipt email.</li>
                <li>The monthly report should provide explicit proof and details of the following:</li>
                <li>Tenant Default Notices: This includes a list of all Tenant Default Notices that have been served or canceled by the Landlord. It helps track the status of Tenants who are in default.</li>
                <li>Tenant Demand Notices: This comprises a list of all Product Manager Tenant Demand Notices that have been served or canceled by the Landlord. It provides information on the demands made by the Landlord for reimbursement or other actions related to the Product Manager's obligations to the Landlord.</li>
                <li>Tenant Eviction Notices: This presents a list of all Tenant Eviction Notices that have been served or canceled by the Landlord. It tracks the eviction proceedings initiated by the Landlord against Tenants in default.</li>
              </ul>

              <ul style={{ paddingLeft: 60, listStyleType: "disc", marginBottom: 16 }}>
                <li>List of all Qualified Tenants: List of all Qualified Tenants residing in a Unit in the Property, rent and security deposits held by the Landlord for the Term of the enforceable Lease Agreement.</li>
                <li>List of Landlord Recoveries: This includes a list of recoveries made by the landlord, such as rent loss, malicious tenant damage, or eviction expense recoveries. It demonstrates the amount of recoveries received by the Landlord for these losses to reduce Product Manager reimbursement losses.</li>
                <li>Abandoned or Vacated Unit: Status of the Unit that has been abandoned or vacated by mutual consent of the Landlord and Tenant. It helps track the status of the Unit and the availability for future tenancy.</li>
                <li>Unit Subject to Eviction Court Order: Status of the Unit that is subject to an existing eviction court order, indicating the Unit for which eviction proceedings have been legally authorized by a court.</li>
                <li>Unit Subject to Malicious Tenant Damage Court Order: Status of the Unit that is subject to an existing court order related to Landlord's malicious tenant damage demand. It provides information on the Unit affected by such actions.</li>
              </ul>

              <ul style={{ paddingLeft: 30, listStyleType: "disc", marginBottom: 16 }}>
                <li>The Supplemental Lease Agreement Violation Report serves as a means for the Landlord to update the Product Manager or the Product Manager's Agent on the ongoing status of Lease Agreement violations and related actions. It ensures clear and transparent communication between the Landlord and the Product Manager or the Product Manager's Agent regarding the resolution of violations and the overall status of the Tenant's situation.</li>
              </ul>

              <p style={{ marginBottom: 16, textAlign: "justify" }}>To ensure compliance with the prescribed format and requirements, it is required to refer to the specific terms and conditions outlined in this Agreement, including any relevant exhibits or attachments. Consulting professionals familiar with this Agreement and the relevant laws can provide guidance on fulfilling the obligations and requirements related to the report.</p>

              <ul style={{ paddingLeft: 30, listStyleType: "disc", marginBottom: 16 }}>
                <li>"Tenant" means a Person or Persons who has a legal and valid Lease Agreement in force and who occupies a Unit.</li>
                <li>"Tenant Default Notice" means and is defined as a written formal communication issued by the Landlord to a Tenant in default. Subject to the relevant municipal and provincial statutes, laws, and the terms and conditions specified in an enforceable Lease Agreement, the Landlord has an obligation to provide the Tenant Default Notice to the Tenant in default within five 5 calendar days following the Tenant's violation of the Lease Agreement for reasons such as rent arrears, malicious tenant damage, or any other violations.</li>
                <li>The Tenant Default Notice should clearly outline the specific breaches and violations of the Lease Agreement. By providing this Tenant Default Notice, the Landlord ensures that the Tenant is formally informed about their default and the specific violations of their Unit Lease Agreement.</li>
                <li>"Tenant Demand Notice" means and is defined as the initial written formal communication issued by the Landlord to the Product Manager, following the format and manner specified in the completed Tenant Demand Notice, Exhibit A, that must be sent to the Product Manager or the Product Manager's Agent via return receipt email on the same day that the Tenant Default Notice is served to the Tenant in default, or on a date no later than five 5 days from a Tenant default or violation of the Unit Lease Agreement.</li>
                <li>The Tenant Demand Notice sent to the Product Manager by the Landlord must include all information and documents specified in the Tenant Demand Notice.</li>
                <li>In filing the Tenant Demand Notice, the Landlord must adhere to the prescribed format and manner specified in the Tenant Demand Notice to properly demand from the Product Manager, the Rent Guarantee Reimbursement Loss, Malicious Tenant Damage Reimbursement Loss, and Eviction Expenses Reimbursement Loss as provided in this Agreement.</li>
                <li>The Landlord is required to comply with any additional reasonable requirements outlined in this Agreement. By following these Tenant Demand Notice requirements, the Landlord can ensure that they are fulfilling their obligations and properly invoking the rights and entitlements provided in this Agreement.</li>
                <li>"Tenant Eviction Notice" means and is defined as the formal communication and eviction notice served on a Tenant in default by the Landlord, in accordance with the relevant provincial and municipal statutes and laws.</li>
                <li>The specific time, form, and manner for serving the eviction notice to Tenants in default are outlined in Exhibit C of this Agreement but must also comply with the format, processes, and additional requirements, laws and regulations applicable to the Property's jurisdiction.</li>
              </ul>

              <ul style={{ paddingLeft: 60, listStyleType: "disc", marginBottom: 16 }}>
                <li>The Landlord has an obligation to provide the Product Manager via receipt return of email with a copy of the comprehensive formal Tenant Eviction Notice within ten 10 calendar days of the Tenant Default Notice being served on the Tenant being in continuing violations of the Unit Lease Agreement.</li>
              </ul>

              <ul style={{ paddingLeft: 30, listStyleType: "disc", marginBottom: 16 }}>
                <li>To ensure compliance with the prescribed eviction format, processes, and additional requirements, set out in Exhibit C of this Agreement it is advisable for Landlords to consult eviction legal professionals familiar with the Property jurisdiction, as well as the terms of this Agreement. Eviction professionals can provide guidance and ensure that all necessary steps are taken to fulfill the Landlord eviction obligations and requirements outlined in this Agreement, as well as comply with applicable eviction laws and regulations.</li>
              </ul>

              <ul style={{ paddingLeft: 60, listStyleType: "disc", marginBottom: 16 }}>
                <li>"Term" means a twelve 12 month period starting at the Effective date.</li>
                <li>"Termination" means the cessation or conclusion of this Agreement, either by expiration of the Term or by the occurrence of an event of default that triggers the termination provisions, as more fully described under Section 16.</li>
              </ul>

              <ul style={{ paddingLeft: 30, listStyleType: "disc", marginBottom: 16 }}>
                <li>"Unit" means the residential rental Unit listed above that is rentable, habitable, and marketable.</li>
              </ul>
            </div>

            {/* ═══════════ PAGE 6 — Sections ═══════════ */}
            <div style={{ pageBreakBefore: "always", marginTop: 40 }}>
              <p style={{ marginBottom: 12 }}>General Engagement.</p>
              <ul style={{ paddingLeft: 60, listStyleType: "disc", marginBottom: 12 }}>
                <li>This Agreement shall govern the engagement between the Landlord and the Product Manager for the provision of certain services and reimbursements for the Term or any Extension thereof.</li>
              </ul>

              <ul style={{ paddingLeft: 30, listStyleType: "disc", marginBottom: 12 }}>
                <li>There are general limits applicable to reimbursements by the Product Manager for the Rent Guarantee, Malicious Tenant Damage, and Eviction Expense described hereunder and in details applicable to each type of reimbursement in Sections 2, 3, and 4</li>
              </ul>

              <ul style={{ paddingLeft: 60, listStyleType: "disc", marginBottom: 12 }}>
                <li>The reimbursement amount for Rent loss, pertaining to Qualified Tenants in default, is subject to the Product Manager or the Product Manager's Agent receiving specific Notices and Reports from the Landlord in the form and manner provided in Exhibits A, B, and C. These Notices and Reports include but are not limited to:</li>
                <li>the Tenant Default Notice;</li>
                <li>the Tenant Demand Notice;</li>
                <li>the Tenant Eviction Notice;</li>
                <li>the Qualifying Tenant documentation set out in Section 5; and</li>
                <li>the Supplemental Lease Agreement Violation Report</li>
                <li>(collectively the "Notices and Reports")</li>
                <li>The Product Manager's responsibility for reimbursement for Rent loss obligation will be terminated, and no reimbursement will be payable if any of the following conditions occur:</li>
                <li>the Qualified Tenant defaults on the Unit Lease Agreement within the first sixty 60 days of occupancy; or</li>
                <li>the Unit is vacated by written mutual consent of the Qualified Tenant and Landlord for any reason; or</li>
                <li>the Landlord fails to provide the Product Manager or the Product Manager's Agent with the required Notices and Reports during each Reporting Period; or</li>
                <li>the Landlord fails to take the specific steps outlined in Section 4 to evict a Tenant in default.</li>
              </ul>

              <ul style={{ paddingLeft: 30, listStyleType: "disc", marginBottom: 12 }}>
                <li>(collectively the "Exclusions")</li>
              </ul>

              <ul style={{ paddingLeft: 60, listStyleType: "disc", marginBottom: 16 }}>
                <li>The Product Manager's responsibility to provide reimbursement for Rent loss for Rent Guarantee, Malicious Tenant Damage, and Eviction Expense caused by Qualified Tenants in default of their Unit Lease Agreements is contingent upon the circumstances and actions taken by the Landlord as outlined in this Agreement. Failure to meet these conditions may result in the Product Manager not being obligated to make the specific reimbursement payment for Rent loss.</li>
              </ul>

              <ul style={{ paddingLeft: 30, listStyleType: "disc", marginBottom: 12 }}>
                <li>Rent Guarantee Reimbursement.</li>
              </ul>
              <ul style={{ paddingLeft: 60, listStyleType: "disc", marginBottom: 12 }}>
                <li>If no Landlord Event of Default exists, the Product Manager is obligated to reimburse the Landlord for Rent loss caused by Qualified Tenants in violation of their Lease Agreement subject to the following conditions:</li>
                <li>The maximum reimbursement amount for Rent loss, will be equal to, but not exceed, the Rent charged by the Landlord in the Lease Agreement. The reimbursement amount for the Rent loss is capped at a maximum of sixty thousand Canadian dollars CDN $60,000 (the "Rent Guarantee Reimbursement Limit") for any Unit for the Lease Term or any subsequent Renewal Term;</li>
                <li>The Product Manager's Rent Guarantee Reimbursement Limit for Rent loss for each registered Unit in the Property shall not exceed one 1 reimbursement Rent loss demand per each registered Unit rented by a Qualified Tenant during the Term and for each twelve 12 month extension thereof;</li>
                <li>The reimbursement amount for Rent loss will be paid to the Landlord within thirty 30 days after the Reporting Date. The reimbursement amount payable to the Landlord will be the Rent loss for each Qualified Tenant in default, minus any partial or total recoveries of Rent that the Qualified Tenant in default has paid to the Landlord during any Reporting Period;</li>
              </ul>

              <ul style={{ paddingLeft: 30, listStyleType: "disc", marginBottom: 16 }}>
                <li>Rent Guarantee Reimbursement for an Abandoned Registered Property following four 4 months after the start of this Agreement shall be paid by the Product Manager to Landlord within thirty 30 business days of the last day of the following month for a maximum of one 1 month if the Registered Property was abandoned by the Tenant without proper notice and remains vacant. If proper notice to end tenancy was given by the Tenant to the Landlord, the Rent Guarantee Reimbursement for Abandoned Registered Property would not be applicable;</li>
              </ul>

              <ul style={{ paddingLeft: 60, listStyleType: "disc", marginBottom: 12 }}>
                <li>The Product Manager's responsibility for reimbursement for Rent loss obligation will be terminated, and no reimbursement will be payable if any of the Exclusions or the following conditions occur:</li>
                <li>the Tenant in default of their enforceable Lease Agreement vacates the registered Unit in the Property due to an eviction court order,</li>
                <li>the Tenant in default of the enforceable Unit Lease Agreement cures the violation.</li>
              </ul>

              <ul style={{ paddingLeft: 30, listStyleType: "disc", marginBottom: 12 }}>
                <li>Malicious Tenant Damage Reimbursement.</li>
              </ul>
              <ul style={{ paddingLeft: 60, listStyleType: "disc", marginBottom: 12 }}>
                <li>If no Landlord Event of Default exists, the Product Manager is obligated to reimburse the Landlord for malicious tenant damage (this does not mean normal wear and tear nor Unit cleaning), caused by Qualified Tenants in violation of their Lease Agreement subject to the following conditions:</li>
                <li>the maximum reimbursement amount for malicious tenant damage will be equal to, but not exceed, the actual malicious tenant damage amount the court has ordered the Qualified Tenant to reimburse the Landlord up to a maximum of ten thousand Canadian dollars CDN $10,000 (the "Malicious Tenant Damage Reimbursement Limit") for any Unit during the Lease Term or any subsequent Renewal Term;</li>
                <li>the Product Manager's Malicious Tenant Damage Reimbursement Limit for malicious tenant damage for each registered Unit in the Property shall not exceed one 1 reimbursement malicious tenant damage demand per Unit rented by a Qualified Tenant during the Term and each twelve 12 month Extension thereof;</li>
                <li>the reimbursement amount for malicious tenant damage will be paid to the Landlord on or before sixty 60 days after the Product Manager receives a court order providing proof of the loss against the Tenant in default. The reimbursement amount will be calculated by deducting a first loss deductible of one thousand Canadian dollars CDN $1,000.</li>
                <li>However, the reimbursement is subject to the Product Manager or the Product Manager's Agent receiving the specific Notices and Reports from the Landlord, and the following:</li>
              </ul>

              <ul style={{ paddingLeft: 30, listStyleType: "disc", marginBottom: 12 }}>
                <li>receipt and proof of the Tenant in default court order.</li>
              </ul>
              <ul style={{ paddingLeft: 60, listStyleType: "disc", marginBottom: 16 }}>
                <li>The Product Manager's responsibility for reimbursement for malicious tenant damage obligation will be terminated and no reimbursement will be payable if any of the Exclusions or the following conditions occur:</li>
                <li>the Qualified Tenant in default of their Lease Agreement pays the court ordered malicious tenant damage amount to the Landlord within sixty 60 days following the court order,</li>
                <li>the Tenant in default court ordered malicious tenant damage court order is than less than one thousand Canadian Dollars CDN $1,000.</li>
              </ul>

              <ul style={{ paddingLeft: 30, listStyleType: "disc", marginBottom: 12 }}>
                <li>Eviction and Legal Expenses Reimbursement.</li>
              </ul>
              <ul style={{ paddingLeft: 60, listStyleType: "disc", marginBottom: 12 }}>
                <li>If no Landlord Event of Default exists, the Product Manager is obligated to reimburse the Landlord for actual Eviction and Legal Expenses incurred for Qualified Tenants in violation of their Lease Agreement subject to the following conditions:</li>
                <li>the maximum reimbursement amount for Eviction and Legal Expenses will be equal to, but not exceed, the actual Eviction and Legal Expenses paid by the Landlord to enforce the Lease Agreement and is capped at a maximum of one thousand five hundred Canadian dollars CDN $1,500 (the "Eviction Expense Reimbursement Limit") for any Unit for the Lease Term or any subsequent Renewal Term;</li>
                <li>the Product Manager's Eviction and Legal Expenses Reimbursement Limit for each registered Unit in the Property shall not exceed one 1 reimbursement Eviction and Legal Expenses demand per each Unit rented by the Qualified Tenant(s) during the Term and each twelve 12 month Extension thereof.</li>
                <li>the reimbursement amount for Eviction and Legal Expenses pertaining to Tenants in default of their Lease Agreement, will be paid to the Landlord within thirty 30 days after the Reporting Date to the Product Manager or the Product Manager's Agent.</li>
                <li>However, the reimbursement is subject to the Product Manager or the Product Manager's Agent receiving the specific Notices and Reports from the Landlord, and the following:</li>
              </ul>

              <ul style={{ paddingLeft: 30, listStyleType: "disc", marginBottom: 12 }}>
                <li>receipt and proof of the actual eviction and legal expenses paid by the Landlord.</li>
              </ul>
              <ul style={{ paddingLeft: 60, listStyleType: "disc", marginBottom: 16 }}>
                <li>The reimbursement amount payable to the Landlord will be the actual Eviction and Legal Expenses paid to enforce the Lease Agreement and evict the Qualified Tenant in default, minus any recoveries paid to the Landlord by the Qualified Tenant in default that may have occurred during any Reporting Period;</li>
                <li>the Product Manager's responsibility for reimbursement for eviction and legal expenses obligation will be terminated, if any of the Exclusions or the following condition occur:</li>
                <li>the Qualified Tenant in default of the Lease Agreement cures the violation, and the Landlord recovers the full eviction and legal expenses incurred to evict the Qualified Tenant in default.</li>
              </ul>

              <ul style={{ paddingLeft: 30, listStyleType: "disc", marginBottom: 12 }}>
                <li>Qualified Tenant.</li>
              </ul>
              <ul style={{ paddingLeft: 60, listStyleType: "disc", marginBottom: 16 }}>
                <li>The Landlord (or to the extent applicable, the Landlord's Property Manager) represents, warrants, and covenants a Tenant residing in a Unit subject to a legal and valid Unit Lease Agreement for the purpose of this Agreement shall have tenant history, screening review, documentation review, and credit qualifications set out below (the "Qualified Tenant"), as follows:</li>
              </ul>

              <ul style={{ paddingLeft: 30, listStyleType: "disc", marginBottom: 12 }}>
                <li>Existing Tenant Criteria having an existing valid Unit Lease Agreement as of the Effective Date:</li>
              </ul>
              <ul style={{ paddingLeft: 60, listStyleType: "disc", marginBottom: 12 }}>
                <li>The Existing Tenant must not have any current (existing) violations of the Unit Lease Agreement.</li>
                <li>There are no Tenant rent arrears in the past twelve 12 months in excess of five 5 calendar days at the time of registration of the Property</li>
              </ul>

              <ul style={{ paddingLeft: 30, listStyleType: "disc", marginBottom: 12 }}>
                <li>Inasmuch any Existing Tenant in the event of any violation of the Unit Lease Agreement which occurs within sixty 60 days of the Effective date of this Agreement, the Landlord will not be reimbursed for any loss outlined in Sections 2, 3 and 4.</li>
              </ul>
              <ul style={{ paddingLeft: 60, listStyleType: "disc", marginBottom: 12 }}>
                <li>Existing Tenant has not been notified nor has any knowledge that the job situation of the Existing Tenant has changed or is about to change, such that the Existing Tenant shall have current and valid and ongoing employment, without any formal notices of impending termination, participation in labour or strike actions, or significant health-related ailments that may impede their ability to fulfill their obligations under the Unit Lease Agreement. For clarity, employment shall encompass both employed individuals and those engaged in self-employment activities that have entered into a Unit Lease Agreement).</li>
              </ul>

              <ul style={{ paddingLeft: 30, listStyleType: "disc", marginBottom: 12 }}>
                <li>New Tenant Criteria entering into a Unit Lease Agreement after the Effective Date:</li>
              </ul>
              <ul style={{ paddingLeft: 60, listStyleType: "disc", marginBottom: 12 }}>
                <li>New Tenant, Co-Tenants, and Guarantors, if applicable, are required to undergo the Landlord's comprehensive rental application (a sample of which must be provided to the Product Manager) and screening process, which entails verification of the following criteria.</li>
                <li>Must not have been subject to any active collections, residential rental tenancy-related court-ordered judgments, bankruptcies, or tenancy evictions within the preceding three 3 years.</li>
              </ul>

              <ul style={{ paddingLeft: 30, listStyleType: "disc", marginBottom: 12 }}>
                <li>New Tenant and Co-Tenants must hold valid and ongoing employment, free from formal notices of impending termination, participation in strike actions, or significant health-related ailments that may impede their ability to adhere to the Unit Lease Agreement.</li>
              </ul>
              <ul style={{ paddingLeft: 60, listStyleType: "disc", marginBottom: 16 }}>
                <li>The gross monthly rent amount obligation payable by a New Tenant and Co-Tenant under the new Unit Lease Agreement shall not exceed forty-five percent 45% of the combined gross monthly income of the Tenant and Co-Tenant. The Landlord's verification of compliance with this criterion shall be conducted through the examination of verifiable documentary evidence outlined in the Landlord's comprehensive rental application and screening obligations. This shall include but is not limited to an examination of recent pay stub(s), or self-employment contracts, and tax filings, employment contracts (if applicable), or any similar documentary evidence. For clarity, employment encompasses both individuals in traditional employment and those engaged in self-employment activities who are entering into a new Unit Lease Agreement with the Landlord).</li>
              </ul>

              <ul style={{ paddingLeft: 30, listStyleType: "disc", marginBottom: 12 }}>
                <li>In the event of a Lease Co-Guarantee demand, Tenant documents shall be provided to the Product Manager by the Landlord within two (business days) after a written request, and shall include the following:</li>
              </ul>
              <ul style={{ paddingLeft: 60, listStyleType: "disc", marginBottom: 16 }}>
                <li>Proof of executed legal and valid Unit Lease Agreement.</li>
                <li>Landlord rental application and screening documentation for Tenant, Co-Tenant, and Guarantor, if applicable.</li>
                <li>Two references complete with contact information for the Tenant, Co-Tenant(s) and Guarantor, if applicable.</li>
                <li>One form of picture identification for each Tenant, Co-Tenant, and Guarantor, if applicable.</li>
                <li>Landlord's credit report from a major credit reporting agency for a Tenant, Co-Tenant, and Guarantor, if applicable.</li>
                <li>Proof of and verification of income of Tenant, Co-Tenant, and Guarantor if applicable.</li>
                <li>Proof and verification of the Tenant's payment of first month's rent and last month's rent and if applicable damage deposit security.</li>
                <li>Historical and current Tenant, Co-Tenant, rental history, including but not limited to rent payment history, employment history, and any violations, if any of the Unit Lease Agreement.</li>
                <li>Receipt and proof of an executed Landlord and Tenant move-in checklist detailing the Unit condition and any pre-existing damages by way of digital photographs prior to occupancy, or on move-in, if applicable.</li>
                <li>Receipt and proof of a Tenant's, Co-Tenant current and valid renters insurance policy for the Unit.</li>
                <li>Receipt and proof of the Unit's current and valid property and liability insurance policy.</li>
                <li>Landlord (or to the extent applicable, the Landlord's Property Manager) must register all Units located in any one legal address as a condition precedent. Notwithstanding the preceding, it is agreed and understood that not all Tenants in any one legal address may be Qualified Tenants pursuant to the terms and conditions of this Agreement.</li>
                <li>It is the responsibility of the Landlord to verify the identity of the Tenant, Co-Tenant, and Guarantor, if applicable, and to ensure that the documents submitted are authentic and not falsified when conducting a rental application and screening for a new qualified Tenant. If the Landlord's rental application and screening of Tenant(s)' documents and proofs are found to be not authentic or falsified, then the Product Manager will not be obligated under this Agreement.</li>
              </ul>

              <ul style={{ paddingLeft: 30, listStyleType: "disc", marginBottom: 12 }}>
                <li>Any legally interested third-party shall have the right to verify the authenticity of the Landlord's Tenant, Co-Tenant, and Guarantor, if applicable, rental application, and submitted authentic documents under Section 5. The Landlord consents to giving any legally interested third-party the right to contact the Tenant, Co-Tenant, and Guarantor, if applicable, as well as their references, and to rerun any submitted third-party credit reports, authentications, and verifications.</li>
              </ul>
              <ul style={{ paddingLeft: 60, listStyleType: "disc", marginBottom: 16 }}>
                <li>It is essential for the Landlord to maintain records and documentation readily available to comply with the requests of the Product Manager to satisfy the terms and conditions of this Section 5 and Agreement, and to ensure the Product Manager's commitment of timely payment of Demands to the Landlord as outlined in this Agreement.</li>
              </ul>

              <ul style={{ paddingLeft: 30, listStyleType: "disc", marginBottom: 12 }}>
                <li>Collections.</li>
              </ul>
              <p style={{ marginBottom: 12, textAlign: "justify" }}>The Product Manager or the Product Manager's Agent will have the exclusive right to enforce the collection of outstanding Rent Loss, Malicious Tenant Damage Loss, or outstanding Eviction and Legal Expenses Loss from existing or former Qualified Tenants in default of the Lease Agreement.</p>

              <p style={{ marginBottom: 12 }}>Maintenance of Rental Unit and Property.</p>
              <p style={{ marginBottom: 16, textAlign: "justify" }}>If the Landlord fails to maintain the minimum standards for the rental Unit in the Property and building required by local authorities and rental income has been withheld by a Qualifying Tenant residing in a registered Unit in the Property during the Lease Term and Renewal Term, the Product Manager may not reimburse the Rent Loss as specified in Section 2 of this Agreement until the Landlord has certified that the necessary maintenance and repairs have been completed.</p>

              <p style={{ marginBottom: 12 }}>Landlord Affirmative Covenants.</p>
              <p style={{ marginBottom: 8, textAlign: "justify" }}>During the Term of this Agreement, the Landlord represents, warrants, and covenants the following:</p>
              <ul style={{ paddingLeft: 30, listStyleType: "disc", marginBottom: 16 }}>
                <li>Landlord is the legal Landlord for a rental Unit in the Property;</li>
                <li>Landlord is a duly organized, validly existing, and in good standing legal entity under the laws of the jurisdiction of its formation and is qualified to conduct its business to the extent outlined in this Agreement;</li>
                <li>Landlord has the authority to enter into this Agreement;</li>
                <li>Landlord will promptly perform and observe all the covenants and obligations of this Agreement; and</li>
                <li>Landlord will promptly notify the Product Manager or the Product Manager's Agent of any material issues that are reasonably likely to adversely affect Product Manager's performance.</li>
              </ul>

              <p style={{ marginBottom: 12 }}>Product Manager Affirmative Covenants.</p>
              <p style={{ marginBottom: 8, textAlign: "justify" }}>During the term of this Agreement, Product Manager represents, warrants, and covenants the following:</p>
              <ul style={{ paddingLeft: 30, listStyleType: "disc", marginBottom: 16 }}>
                <li>Product Manager is duly organized, validly existing, and in good standing under the laws of the jurisdiction of its formation and is qualified to conduct its business to the extent outlined in this Agreement;</li>
                <li>Product Manager has the authority to enter into this Agreement; and</li>
                <li>Product Manager will promptly perform and observe all of the material performance obligations of this Agreement.</li>
              </ul>

              <p style={{ marginBottom: 12 }}>Landlord Event of Default and Remedies.</p>
              <p style={{ marginBottom: 8, textAlign: "justify" }}>A "Landlord Event of Default" shall exist under this Agreement if:</p>
              <ul style={{ paddingLeft: 30, listStyleType: "disc", marginBottom: 12 }}>
                <li>Landlord fails to pay any Product Fee amounts due or Tenant recovery amounts due or other amounts due set out in this Agreement and such amounts remain unpaid for ten 10 business days after the Product Manager or the Product Manager's Agent delivers to the Landlord a notice of non-payment; or</li>
                <li>Landlord fails to perform any other covenants or obligations under this Agreement and such failure shall continue for thirty 30 days after notice to Landlord by the Product Manager or the Product Manager's Agent, or such longer period as may be reasonably necessary to cure the default so long as the Landlord is reasonably capable of curing the default and the Landlord promptly undertakes to cure and diligently pursues the curing of the default at all times until such default is cured.</li>
              </ul>
              <p style={{ marginBottom: 16, textAlign: "justify" }}>Following a Landlord Event of Default, the Product Manager may pursue any or all of the following in any order or cumulatively for the Term of this Agreement: (i) terminate this Agreement, and (ii) pursue any other remedies at law or equity.</p>

              <p style={{ marginBottom: 12 }}>Product Manager Event of Default and Remedies.</p>
              <p style={{ marginBottom: 8, textAlign: "justify" }}>A "Product Manager Event of Default" shall exist under this Agreement if:</p>
              <ul style={{ paddingLeft: 30, listStyleType: "disc", marginBottom: 12 }}>
                <li>Product Manager fails to pay any reimbursement amounts due and such amounts remain unpaid for ten 10 business days after the Landlord delivers to Product Manager a notice of non-payment; or</li>
                <li>Product Manager fails to perform any other covenants or obligations under this Agreement and such failure shall continue for thirty 30 days after notice to Product Manager by the Landlord, or such longer period as may be reasonably necessary to cure the default so long as Product Manager is reasonably capable of curing the default and Product Manager promptly undertakes to cure and diligently pursues the curing of the default at all times until such default is cured.</li>
                <li>Following a Product Manager Event of Default, the Landlord may pursue any or all of the following in any order or cumulatively for the term of this Agreement: (i) terminate this Agreement; (ii) make a demand against the Surety by contacting the Product Manager and (iii) pursue any other remedies at law or equity.</li>
              </ul>

              <p style={{ marginBottom: 12 }}>Data and Privacy.</p>
              <p style={{ marginBottom: 8, textAlign: "justify" }}>The Parties to this Agreement acknowledge and agree that privacy laws in the Canada play a crucial role in governing the collection, use, and protection of personal information related to any tenant or individuals involved in this Agreement. To ensure compliance with these laws and protect the privacy of such personal information, the Parties agree to:</p>
              <ul style={{ paddingLeft: 30, listStyleType: "disc", marginBottom: 12 }}>
                <li>Safeguard Personal Information: The Parties will take reasonable and best efforts to implement appropriate security measures to protect personal information from unauthorized access, use, or disclosure.</li>
                <li>Consent and Notice: The Parties will obtain necessary consents and provide appropriate notices to individuals whose personal information is collected, used, or disclosed in accordance with applicable privacy laws.</li>
                <li>Purpose Limitation: Personal information will only be collected, used, or disclosed for the purposes specified in this Agreement or as otherwise permitted by applicable law.</li>
                <li>Data Minimization: The Parties will only collect and retain personal information that is necessary for the purposes of this Agreement and will ensure the accuracy and relevance of the information collected.</li>
                <li>Access and Correction: Individuals will be provided with reasonable access to their personal information and the opportunity to correct or update any inaccuracies, as required by applicable privacy laws.</li>
                <li>Data Transfers: If personal information is transferred outside of Canada, the Parties will ensure that appropriate safeguards are in place to protect the information in accordance with applicable legal requirements.</li>
                <li>Compliance with Applicable Laws: The Parties will comply with all relevant federal, provincial, and municipal privacy laws and regulations applicable to the collection, use, and protection of personal information.</li>
                <li>Data Breach Response: In the event of a data breach involving personal information, the Parties will promptly respond, investigate, and notify affected individuals and regulatory authorities as required by applicable laws.</li>
              </ul>
              <p style={{ marginBottom: 16, textAlign: "justify" }}>This provision is intended to serve as a general acknowledgment and commitment to privacy compliance, and the Parties should seek legal advice to ensure full compliance with the applicable privacy laws in their specific circumstances.</p>

              <p style={{ marginBottom: 12 }}>Confidentiality.</p>
              <ul style={{ paddingLeft: 30, listStyleType: "disc", marginBottom: 12 }}>
                <li>The Parties to this Agreement recognize and acknowledge the importance of maintaining the confidentiality of certain information exchanged between them. This Confidential Information is intended to remain private and not be disclosed to any third party or used for purposes other than those outlined in this Agreement. The term "Confidential Information" refers to various types of information, including but not limited to:</li>
                <li>This Agreement itself;</li>
                <li>This Lease Co-Guarantee;</li>
                <li>Insurance market disclosures;</li>
                <li>Information related to prospective, current, or former clients, partners, employees, investors, or other business opportunities and operations; and</li>
                <li>Any other information or materials, whether in written, graphic, or any other form, that belongs to a Party Discloser) and is shared with another Party Recipient) during the course of discussions, studies, or work related to the provision of services.</li>
                <li>The Parties agree Confidential Information does not include data outputs, analysis, or reporting resulting from the ordinary course of business activities between the Parties.</li>
                <li>The Parties agree to treat Confidential Information as strictly confidential and to exercise reasonable care in protecting its confidentiality. The Confidential Information should not be disclosed, reproduced, or used for any purpose other than as required by this Agreement, without the express written consent of the Discloser. The Recipient shall only disclose the Confidential Information to its employees, agents, or representatives who have a legitimate need to know and who are bound by obligations of confidentiality.</li>
                <li>The obligation to maintain the confidentiality of the Confidential Information shall survive the termination or expiration of this Agreement for a period of time as specified in the Agreement.</li>
              </ul>

              <p style={{ marginBottom: 12 }}>Limitation of Liability.</p>
              <ul style={{ paddingLeft: 30, listStyleType: "disc", marginBottom: 16 }}>
                <li>Product Manager's liability to the Landlord under this Agreement is limited to the agreed-upon reimbursement loss payments outlined in Sections 2, 3, and 4 of this Agreement.</li>
                <li>The Landlord's liability under this Agreement is limited to direct and actual damages arising from events within the Landlord's direct and sole control, outlined in this Agreement.</li>
                <li>Neither Party is liable for special, punitive, indirect, incidental, or consequential damages, including loss of profits or expected rental revenue, even if informed of the possibility thereof, unless payable to a third party. This applies to actions taken in good faith and with reasonable care under this Agreement.</li>
                <li>The limitations and exclusions of liability apply to both Parties, their directors, officers, employees, agents, and subcontractors, and to all claims a Party may have against the other Party, regardless of the basis of the claim.</li>
                <li>The limitations and exclusions set forth in this Section do not apply to the Product Manager's obligations to pay the Rent Guarantee Reimbursement Loss, Malicious Tenant Damage Reimbursement Loss, and Eviction and Legal Expenses Reimbursement Loss outlined in Sections 2, 3, and 4 of this Agreement.</li>
                <li>No demands or actions, regardless of form, may be brought more than twelve 12 months after the facts giving rise to the demand occurred, unless otherwise permitted by law.</li>
                <li>The representations, warranties, and covenants expressly stated in this Agreement, Recitals, and Exhibits A, B, and C are the only ones provided by the Parties. There are no other implied or express warranties or conditions, including merchantable quality, fitness for a particular purpose, non-infringement, or uninterrupted and error-free provision of tenant management services. Parties acknowledge the inherent risks in using the Internet and disclaim any reliance on representations not expressly stated in this Agreement.</li>
              </ul>

              <p style={{ marginBottom: 12 }}>Indemnities.</p>
              <ul style={{ paddingLeft: 30, listStyleType: "disc", marginBottom: 16 }}>
                <li>Landlord Indemnity: The Landlord will indemnify and hold harmless the Product Manager, its affiliates, and their respective shareholders, directors, officers, agents, subcontractors, and employees ("Product Manager Indemnitees") from any third-party costs, losses, claims, damages, liabilities, and expenses arising from the Landlord's breach of covenants, violation of this Agreement, Lease Agreement, or any applicable law, except for unauthorized use resulting from the Landlord's negligence. This indemnity does not apply to losses resulting from the willful misconduct of the Product Manager Indemnitees or any breach of this Agreement by the Product Manager Indemnitees.</li>
              </ul>
              <p style={{ marginBottom: 12, textAlign: "justify" }}>Product Manager Indemnity: The Product Manager will indemnify and hold harmless the Landlord, its affiliates, and their respective shareholders, directors, officers, agents, and employees ("Landlord Indemnitees") from any third-party costs, losses, claims, damages, liabilities, and expenses arising from the Product Manager's breach of this Agreement or services caused by negligence or willful misconduct. This indemnity does not apply to losses resulting from the willful misconduct of the Landlord Indemnitees or any breach of this Agreement by the Landlord Indemnitees.</p>
              <p style={{ marginBottom: 16, textAlign: "justify" }}>Indemnification Procedures: To trigger the indemnification obligations, the indemnified Party must provide prompt written notice of the claim, cooperate with the indemnifying Party, and allow the indemnifying Party sole control over defense and settlement, provided it defends the claim promptly and adequately. No settlement agreement shall attribute fault to the other Party or restrict its future actions without its prior written consent, unreasonably withheld or delayed.</p>

              <p style={{ marginBottom: 12 }}>Term and Termination.</p>
              <ul style={{ paddingLeft: 60, listStyleType: "disc", marginBottom: 12 }}>
                <li>Initial Term. The initial Term of this Agreement is twelve 12 months from the Effective Date.</li>
                <li>Renewal Term. The Initial Term of this Agreement will be renewed automatically for consecutive twelve 12 month periods subject to Events of Default or Termination as provided herein.</li>
              </ul>
              <ul style={{ paddingLeft: 30, listStyleType: "disc", marginBottom: 12 }}>
                <li>Termination. The termination provisions in this Agreement specify that the Product Manager cannot terminate the Agreement with the Landlord without cause. This means that the Product Manager must have a valid reason to terminate the Agreement.</li>
              </ul>
              <ul style={{ paddingLeft: 60, listStyleType: "disc", marginBottom: 12 }}>
                <li>The Product Manager has the right to terminate this Agreement upon providing written notice to the Landlord in the event of a Landlord Event of Default. If such termination occurs, the Landlord will no longer be entitled to any reimbursements under this Agreement.</li>
              </ul>
              <ul style={{ paddingLeft: 30, listStyleType: "disc", marginBottom: 12 }}>
                <li>Product Manager may also terminate this Agreement upon written notice to the Landlord if the Landlord refuses to accept the new pricing basis set by Product Manager. In this case, the existing pricing basis will be maintained by Product Manager until the end of Term any subsequent Renewal Terms.</li>
              </ul>
              <ul style={{ paddingLeft: 60, listStyleType: "disc", marginBottom: 16 }}>
                <li>If the Landlord, without cause, wishes to terminate this Agreement, they have the option to provide Product Manager with a written notice of termination, which must be given at least ninety 90 days in advance. In such a scenario, the Landlord will be obligated to pay the outstanding Product Fees owed to the Product Manager or the Product Manager's Agent.</li>
                <li>The Landlord must reimburse the Product Manager for any outstanding reimbursement loss to be recovered from Qualified Tenants in default of the Lease Agreement for the balance of the Term or subsequent Renewal Term.</li>
                <li>The Landlord must reimburse the Product Manager reimbursement payments previously paid to the Landlord for the Term or any subsequent Extension thereof. The Landlord remains obligated to fulfill their payment of Tenant in default recoveries to the Product Manager.</li>
                <li>The Landlord shall continue to cooperate and assist the Product Manager in completing collections and recoveries against any existing or former Tenants in default of the enforceable Lease Agreement.</li>
                <li>The Product Manager will continue to have the authority to settle or terminate a collection. It is important to note that any claims or legal matters the Landlord may have against the Tenant in default, in excess of reimbursement loss paid to the Landlord by the Product Manager including any Product Manager agent fees or reimbursement loss costs incurred by the Product Manager.</li>
              </ul>

              <ul style={{ paddingLeft: 30, listStyleType: "disc", marginBottom: 12 }}>
                <li>Assignment or Transfers.</li>
              </ul>
              <ul style={{ paddingLeft: 60, listStyleType: "disc", marginBottom: 16 }}>
                <li>The Landlord may assign or transfer this Agreement to another party who has a legal ownership or management interest in the Property. The Landlord must provide written notice to the Product Manager or the Product Manager's Agent at least ten 10 business days in advance.</li>
                <li>The Product Manager is not allowed to assign, transfer, or delegate any interest or obligations under this Agreement to any other party.</li>
              </ul>

              <ul style={{ paddingLeft: 30, listStyleType: "disc", marginBottom: 12 }}>
                <li>Anti-Terrorism Compliance.</li>
              </ul>
              <p style={{ marginBottom: 16, textAlign: "justify" }}>No transfer (whether such transfer shall constitute a transfer under Section 17 shall be made to any person or entity on the OFAC list or result in any failure of the Parties to comply with Anti-Terrorism Laws.</p>

              <p style={{ marginBottom: 12 }}>Cooperation.</p>
              <ul style={{ paddingLeft: 60, listStyleType: "disc", marginBottom: 16 }}>
                <li>Upon request by a Party in relation to the termination of this Agreement or any part thereof due to an Event of Default, the Parties shall cooperate and assist each other.</li>
                <li>The Landlord agrees to take reasonable steps to prevent or mitigate any covered loss or damage under this Agreement, and act in good faith to minimize the extent and impact of any demand.</li>
                <li>The Landlord shall promptly notify the Product Manager or the Product Manager's Agent of any incident that may result in a demand and provide all necessary details and information. The Landlord shall cooperate fully with the Product Manager or Product Manager's Agent throughout the demand process.</li>
                <li>The Landlord shall make reasonable efforts to preserve damaged property, prevent further loss, and secure relevant evidence. The Landlord shall comply with reasonable requests from the Product Manager or Product Manager's Agent to facilitate demand investigation and settlement.</li>
                <li>The Product Manager or Product Manager's Agent may conduct its own investigation into the demand, and the Landlord agrees to cooperate fully, providing requested documentation, records, or statements.</li>
                <li>Failure by the Landlord to fulfill their obligations under this clause may result in a reduction or denial of their guarantee, to the extent that the Landlord's actions prejudiced the Product Manager's ability to assess or settle the demand effectively.</li>
              </ul>

              <ul style={{ paddingLeft: 30, listStyleType: "disc", marginBottom: 12 }}>
                <li>Cumulative Remedies, No Waiver.</li>
              </ul>
              <ul style={{ paddingLeft: 60, listStyleType: "disc", marginBottom: 16 }}>
                <li>The remedies available to a Party under this Agreement are cumulative and may be exercised independently, concurrently, or successively as deemed necessary by that Party. The delay or failure to exercise any remedy in a specific instance shall not be considered a waiver of that right or remedy, and no partial exercise of a right or remedy shall preclude further exercise. Notice or demand given to a Party in one instance does not entitle that Party to notice or demand in similar or other circumstances, except where expressly required by this Agreement. A Party may release a liable Party, grant extensions or forbearances, accept partial or past due payments, or provide other indulgences without waiving its rights under this Agreement. The delay or failure to act, or any forbearance granted, shall not be interpreted as a waiver or estoppel of any rights or remedies available to a Party.</li>
              </ul>

              <ul style={{ paddingLeft: 30, listStyleType: "disc", marginBottom: 12 }}>
                <li>Enforcements Costs.</li>
              </ul>
              <p style={{ marginBottom: 16, textAlign: "justify" }}>Upon written demand by a Party, the other Party shall be responsible for reimbursing all costs incurred by the demanding Party in collecting any amounts payable under this Agreement or in enforcing its rights hereunder. Such costs include, but are not limited to, reasonable fees for attorneys, paralegals, and other professionals, as well as expenses related to court proceedings, discovery, and post-judgment collection efforts. These costs shall be added to the amounts owed, including any termination fees, and shall be immediately due and payable. If not paid within thirty 30 calendar days of the written demand, the outstanding amount shall accrue interest at the maximum rate permitted by law until fully paid.</p>

              <p style={{ marginBottom: 12 }}>No Waiver of Rights.</p>
              <ul style={{ paddingLeft: 60, listStyleType: "disc", marginBottom: 16 }}>
                <li>Nothing in this Agreement shall be deemed a waiver of any right the Parties may have under the Bankruptcy Code or applicable law to protect and pursue its rights under this Agreement.</li>
              </ul>

              <ul style={{ paddingLeft: 30, listStyleType: "disc", marginBottom: 12 }}>
                <li>Binding Effect.</li>
              </ul>
              <ul style={{ paddingLeft: 60, listStyleType: "disc", marginBottom: 16 }}>
                <li>This Agreement shall be binding upon the Parties hereto and their respective heirs, administrators, executors, permitted successors, and assigns.</li>
              </ul>

              <ul style={{ paddingLeft: 30, listStyleType: "disc", marginBottom: 12 }}>
                <li>Governing Law.</li>
              </ul>
              <p style={{ marginBottom: 16, textAlign: "justify" }}>This Agreement shall be governed by and construed in accordance with the laws of the Province of Ontario, without giving effect to any conflict of laws principles. Any suit, action, or proceeding arising out of or relating to this Agreement or its Exhibits shall be brought exclusively in the state courts located in the Province of Ontario. Each Party irrevocably submits to the jurisdiction of such courts for the purpose of any such suit, action, or proceeding and waives any objection to the laying of venue in such courts. Each Party further waives any claim that such courts are an inconvenient forum. Any final judgment rendered by such courts shall be conclusive and binding upon the Parties and may be enforced in any other court having jurisdiction over the Parties.</p>

              <p style={{ marginBottom: 12 }}>Entire Agreement.</p>
              <p style={{ marginBottom: 16, textAlign: "justify" }}>This Agreement, including its Recitals, and Exhibits, constitutes the entire agreement between the Parties with respect to the subject matter hereof. All prior or contemporaneous agreements, covenants, representations, and warranties, whether oral or written, are superseded by this Agreement. No modification, waiver, amendment, discharge, or change of this Agreement shall be effective unless it is in writing and signed by the Party against whom enforcement of such modification, waiver, amendment, discharge, or change is sought.</p>

              <p style={{ marginBottom: 12 }}>Severability.</p>
              <ul style={{ paddingLeft: 30, listStyleType: "disc", marginBottom: 16 }}>
                <li>If any clause or provision of this Agreement is found to be illegal, invalid, or unenforceable by a final judgment of a court with competent jurisdiction, the remaining provisions of this Agreement shall not be affected. The Parties intend that if any such provision is deemed invalid, illegal, or unenforceable, a similar provision that is legal, valid, and enforceable shall be substituted in its place to the maximum extent possible.</li>
              </ul>

              <ul style={{ paddingLeft: 30, listStyleType: "disc", marginBottom: 12 }}>
                <li>Headings.</li>
              </ul>
              <ul style={{ paddingLeft: 60, listStyleType: "disc", marginBottom: 16 }}>
                <li>All headings contained in this Agreement are for reference purposes only and are not intended to affect the meaning or interpretation of this Agreement.</li>
              </ul>

              <ul style={{ paddingLeft: 30, listStyleType: "disc", marginBottom: 12 }}>
                <li>Counterparts.</li>
              </ul>
              <p style={{ marginBottom: 16, textAlign: "justify" }}>This Agreement may be executed in multiple counterparts, each of which shall be considered an original, but all of which together shall constitute the same Agreement. The exchange of electronic copies of this Agreement and signature pages shall be deemed as effective execution and delivery of this Agreement. Electronic signatures transmitted via electronic means, including PDF copies by email, shall be considered original signatures for all purposes.</p>

              <p style={{ marginBottom: 12 }}>Waivers.</p>
              <ul style={{ paddingLeft: 30, listStyleType: "disc", marginBottom: 16 }}>
                <li>No failure or delay by either Party to enforce any covenant, agreement, term, or condition of this Agreement, or to exercise any right or remedy in case of a breach, shall be deemed as a waiver of that breach or any subsequent breach. No covenant, agreement, term, or condition of this Agreement shall be waived, altered, or modified unless done so in writing. No waiver of any breach shall affect or alter the terms of this Agreement. All covenants, agreements, terms, and conditions of this Agreement shall remain in full force and effect for any other existing or subsequent breach.</li>
              </ul>

              <ul style={{ paddingLeft: 30, listStyleType: "disc", marginBottom: 12 }}>
                <li>Further Assurance.</li>
              </ul>
              <p style={{ marginBottom: 16, textAlign: "justify" }}>Each Party agrees to cooperate and take all necessary actions to fulfill the obligations and carry out the transactions contemplated by this Agreement. This includes executing, acknowledging, and delivering any documents that may be required or deemed necessary to effectuate such transactions and continue the business relationship between the Parties.</p>

              <p style={{ marginBottom: 12 }}>Advice.</p>
              <ul style={{ paddingLeft: 30, listStyleType: "disc", marginBottom: 16 }}>
                <li>You have obtained independent professional advice before entering into this Agreement and Your Lease Agreement.</li>
              </ul>

              <ul style={{ paddingLeft: 30, listStyleType: "disc", marginBottom: 12 }}>
                <li>Specific Performance.</li>
              </ul>
              <p style={{ marginBottom: 16, textAlign: "justify" }}>Both Parties acknowledge and agree that the non-breaching Party would suffer irreparable harm if any provision of this Agreement, including the attached Exhibits, is not performed as specified, and that monetary damages would not be sufficient to remedy such harm. Therefore, in addition to any other remedies available under this Agreement, the non-breaching Party shall have the right to seek injunctive relief to prevent any breaches and to enforce the terms and provisions of this Agreement. Such relief may be sought through legal action in a court located in the Province of Ontario.</p>

              <p style={{ marginBottom: 12 }}>Force Majeure.</p>
              <ul style={{ paddingLeft: 30, listStyleType: "disc", marginBottom: 16 }}>
                <li>The Parties to this Agreement shall not be responsible or liable for any injury to the other Party arising from that Party's failure of performance hereunder due to labor disputes, strikes, wars, riots, insurrections, civil commotion, fires, floods, accidents, storms, acts of God, government Stay in Place Orders, State of Emergencies, suspension of business, suspension of tenant evictions, closure of courts, tribunals or government services, or other causes beyond that Party's control.</li>
              </ul>

              <p style={{ marginBottom: 12 }}>Publicity.</p>
              <p style={{ marginBottom: 16, textAlign: "justify" }}>Neither Party will use the name(s), trademark(s), or trade name(s) (whether registered or not) of the other, including but not limited to "Product Manager" or "Product Manager's Agent" without the express prior written consent of the Product Manager.</p>

              <p style={{ marginBottom: 12 }}>Representations.</p>
              <p style={{ textAlign: "justify" }}>Each Party, in such context, the ("Representing Party") does hereby represent and warrant to the other that the execution, delivery, and performance of this Agreement by the Representing Party has been authorized, and this Agreement represents a binding and enforceable obligation of the Representing Party.</p>
            </div>

            {/* ═══════════ Signature Page ═══════════ */}
            <div style={{ pageBreakBefore: "always", marginTop: 40 }}>
              <div style={{ textAlign: "center", marginBottom: 8 }}>- End of Agreement - Signature Page Follows -</div>
              <div style={{ textAlign: "center", fontWeight: "bold", marginBottom: 24, marginTop: 24 }}>IN WITNESS WHEREOF</div>
              <div style={{ textAlign: "center", marginBottom: 40 }}>the Parties have executed this Agreement as of the Effective Date.</div>

              <div style={{ display: "flex", gap: 60, marginTop: 20 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ marginBottom: 16 }}>Accepted, Acknowledged and Agreed:</div>
                  <div style={{ marginBottom: 24 }}>By: Pensio Risk Management Group Inc.</div>
                  <div style={{ marginTop: 8, marginBottom: 2 }}>
                    <img
                      src="/jim-milankov-signature.png"
                      alt="Jim Milankov signature"
                      style={{ width: 220, height: "auto", display: "block", mixBlendMode: "multiply" }}
                    />
                  </div>
                  <div style={{ borderBottom: "1px solid #000", width: 220, marginBottom: 4 }} />
                  <div>Jim Milankov</div>
                  <div>President</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ marginBottom: 16 }}>Accepted, Acknowledged and Agreed:</div>
                  <div style={{ marginBottom: 24 }}>By: Landlord</div>
                  <div id="landlord-sig-anchor" style={{ marginTop: 40, borderBottom: "1px solid #000", width: 220, marginBottom: 4 }} />
                  <div style={{ color: "#888", fontSize: "10pt" }}>(signature)</div>
                  <div style={{ color: "#888", fontSize: "10pt", marginBottom: 8 }}>Signature will appear here after signing</div>
                  <div>Landlord (or Landlord's Property Manager, if authorized)</div>
                </div>
              </div>

              <div style={{ marginTop: 40 }}>
                <div style={{ marginBottom: 8 }}>Disclaimer for Electronic Signatures:</div>
                <p style={{ textAlign: "justify" }}>The use of Electronic Signatures in connection with this Agreement is permitted and acknowledged by the Parties. Each Party agrees that the use of electronic signatures, whether in the form of scanned copies, digital signatures, or other electronic means, shall have the same legal effect and enforceability as a handwritten signature.</p>
              </div>

              <div style={{ textAlign: "center", marginTop: 24, fontSize: "9pt", color: "#888" }}>
                Generated by QuoteUs.ca — {new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })}
              </div>
            </div>

          </div>
        </div>

        {/* ── Footer ── */}
        {sentLinks.length > 0 ? (
          <div className="flex-shrink-0 border-t bg-emerald-50 border-emerald-200 px-5 py-4 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <span className="font-semibold text-emerald-800 text-sm">Agreement sent for signing!</span>
            </div>
            <div className="space-y-1.5 max-h-28 overflow-y-auto">
              {sentLinks.map((link, i) => (
                <div key={i} className="flex items-center gap-2 bg-white border border-emerald-200 rounded-lg px-3 py-1.5">
                  <span className="text-xs text-gray-500 shrink-0 font-medium w-28 truncate">{link.name}</span>
                  <code className="text-xs text-emerald-700 flex-1 truncate">{link.url}</code>
                  <button onClick={() => navigator.clipboard.writeText(link.url)} className="text-emerald-600 hover:text-emerald-800 shrink-0"><Copy className="h-3.5 w-3.5" /></button>
                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-800 shrink-0"><ExternalLink className="h-3.5 w-3.5" /></a>
                </div>
              ))}
            </div>
            {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex items-center gap-2">
              <button onClick={handlePrint} className="flex items-center gap-1.5 text-xs bg-white hover:bg-gray-50 border border-emerald-300 text-emerald-700 px-3 py-1.5 rounded-lg font-semibold transition-colors" data-testid="button-lease-print-sent">
                <Printer className="h-3.5 w-3.5" /> Print / Save as PDF
              </button>
              <button onClick={handleDownloadPdf} className="flex items-center gap-1.5 text-xs bg-white hover:bg-gray-50 border border-emerald-300 text-emerald-700 px-3 py-1.5 rounded-lg font-semibold transition-colors" data-testid="button-lease-download-sent">
                Download PDF
              </button>
              <div className="flex-1" />
              <button onClick={onClose} className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg font-semibold transition-colors">Done</button>
            </div>
          </div>
        ) : !showSigners ? (
          <div className="flex-shrink-0 border-t bg-white px-5 py-3 space-y-2">
            {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-gray-400 hidden sm:block">
              Fill in the highlighted fields, then Print / Save as PDF, or send for e-signing.
            </p>
            <div className="flex items-center gap-2">
              <button
                className="flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={handlePrint}
                data-testid="button-lease-print-draft"
              >
                <Printer className="h-4 w-4" /> Print / PDF
              </button>
              <button
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors shrink-0"
                onClick={() => setShowSigners(true)}
                data-testid="button-lease-send-for-signing"
              >
                <Send className="h-4 w-4" /> Send for Signing
              </button>
            </div>
            </div>
          </div>
        ) : (
          <div className="flex-shrink-0 border-t bg-white px-5 py-4 space-y-3" style={{ maxHeight: 260, overflowY: "auto" }}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-gray-800">Signers</p>
              <button onClick={() => { setShowSigners(false); setError(""); }} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"><X className="h-3 w-3" /> Cancel</button>
            </div>
            {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <div className="space-y-2">
              {signers.map(signer => (
                <div key={signer.id} className="flex items-center gap-2">
                  <input value={signer.name} onChange={e => setSigners(p => p.map(s => s.id === signer.id ? { ...s, name: e.target.value } : s))} placeholder="Full name" className="flex-1 border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" data-testid={`input-signer-name-${signer.id}`} />
                  <input value={signer.email} onChange={e => setSigners(p => p.map(s => s.id === signer.id ? { ...s, email: e.target.value } : s))} placeholder="Email" type="email" className="flex-1 border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" data-testid={`input-signer-email-${signer.id}`} />
                  <select value={signer.role} onChange={e => setSigners(p => p.map(s => s.id === signer.id ? { ...s, role: e.target.value } : s))} className="border rounded-lg px-2 py-1.5 text-xs focus:outline-none bg-white">
                    <option>Landlord</option><option>Manager</option><option>Tenant</option><option>Other</option>
                  </select>
                  {signers.length > 1 && (
                    <button onClick={() => setSigners(p => p.filter(s => s.id !== signer.id))} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded"><Trash2 className="h-4 w-4" /></button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button onClick={() => setSigners(p => [...p, { id: Math.random().toString(36).slice(2), name: "", email: "", role: "Other" }])} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium" data-testid="button-lease-add-signer">
                <Plus className="h-3.5 w-3.5" /> Add Signer
              </button>
              <div className="flex-1" />
              <button onClick={handleSend} disabled={sending} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors" data-testid="button-lease-confirm-send">
                {sending ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating &amp; Sending…</> : <><Send className="h-4 w-4" /> Confirm &amp; Send</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
