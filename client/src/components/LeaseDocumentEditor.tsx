import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X, Maximize2, Minimize2, Send, Plus, Trash2,
  GripHorizontal, CheckCircle2, Loader2, Copy, ExternalLink, Clock,
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
        borderBottom: filled ? "1.5px solid #1a56db" : "1.5px solid #555",
        background: "transparent",
        fontFamily: "inherit",
        fontSize: "inherit",
        lineHeight: "inherit",
        color: filled ? "#1a56db" : "#555",
        fontWeight: filled ? 600 : "normal",
        outline: "none",
        padding: "0 3px",
        verticalAlign: "baseline",
      }}
    />
  );
}

/* Date blank — formats on blur */
function DateBlank({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [raw, setRaw] = useState(value);
  useEffect(() => { setRaw(value); }, [value]);
  const filled = raw.trim().length > 0;
  return (
    <input
      type="date"
      value={raw}
      onChange={e => { setRaw(e.target.value); onChange(e.target.value); }}
      style={{
        display: "inline",
        width: 160,
        border: "none",
        borderBottom: filled ? "1.5px solid #1a56db" : "1.5px solid #555",
        background: "transparent",
        fontFamily: "inherit",
        fontSize: "inherit",
        color: filled ? "#1a56db" : "#555",
        fontWeight: filled ? 600 : "normal",
        outline: "none",
        padding: "0 3px",
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
      const el = docRef.current!;
      const canvas = await (html2canvas as any)(el, {
        scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false,
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
      const file = new File([pdfBlob], `LeaseCoGuarantee-${safeName}.pdf`, { type: "application/pdf" });

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
            {/* ── Page 1 header ── */}
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div style={{ fontSize: "16pt", fontWeight: "bold", marginBottom: 4 }}>Lease Co-Guarantee Agreement</div>
              <div style={{ fontSize: "12pt", fontStyle: "italic", marginBottom: 16 }}>"Agreement"</div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div><strong>Lease Co-Guarantee Agreement "Agreement"</strong></div>
              <div><strong>Pensio Risk Management Group Inc. "Product Manager"</strong></div>
              <div>80 Carlauren Rd, Unit 23</div>
              <div>Woodbridge, ON, L4L 7Z5</div>
              <div>Product Manager's Email: info@pensioglobal.com</div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div><strong>Rentatee "Landlord"</strong></div>
              <div>
                Name:&nbsp;
                <Blank value={fields.landlordName} onChange={upd("landlordName")} width={220} placeholder="Landlord name" />
              </div>
              <div>
                Address:&nbsp;
                <Blank value={fields.landlordAddress} onChange={upd("landlordAddress")} width={260} placeholder="___________________" />
              </div>
              <div>
                Landlord's Contact Number:&nbsp;
                <Blank value={fields.landlordPhone} onChange={upd("landlordPhone")} width={200} placeholder="____________________" />
              </div>
              <div>
                Landlord's Email:&nbsp;
                <Blank value={fields.landlordEmail} onChange={upd("landlordEmail")} width={200} placeholder="________________" />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: "bold" }}>Residential Rental Property Address</div>
              <div style={{ marginTop: 8 }}>
                <Blank value={fields.propertyAddress} onChange={upd("propertyAddress")} width={380} placeholder="__________________________" />
              </div>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid #ccc", margin: "20px 0" }} />

            {/* ── Declarations ── */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: "13pt", fontWeight: "bold", borderBottom: "1px solid #000", paddingBottom: 4, marginBottom: 12 }}>Declarations</div>
              <div style={{ marginBottom: 6 }}>
                Residential Rental Property Address:&nbsp;
                <Blank value={fields.propertyAddress} onChange={upd("propertyAddress")} width={240} placeholder="______________________" />
              </div>
              <div style={{ marginBottom: 6 }}>
                Qualified Tenants Residing in a Rental Unit:&nbsp;
                <Blank value={fields.qualifiedTenants} onChange={upd("qualifiedTenants")} width={240} placeholder="______________________" />
              </div>
              <div style={{ marginBottom: 6 }}>
                Lease Co-Guarantee Agreement contract control number: Pensio00001/15879 95 St/5555/20260305
              </div>
              <div>
                Lease Co-Guarantee Effective Date:&nbsp;
                <DateBlank value={fields.effectiveDate} onChange={upd("effectiveDate")} />
              </div>
            </div>

            {/* ── Reimbursements ── */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: "13pt", fontWeight: "bold", borderBottom: "1px solid #000", paddingBottom: 4, marginBottom: 10 }}>Reimbursements and Product Fee:</div>
              <p style={{ marginBottom: 10, textAlign: "justify" }}>
                <strong>Rent Guarantee Reimbursement</strong> Rent Guarantee Reimbursement provided under this Agreement covers a maximum rent loss for each registered residential rental Unit in the Property. The maximum amount for the rent loss reimbursement is capped at sixty thousand Canadian Dollars CDN $60,000 for each twelve (12) month period for any one (1) habitable rentable Unit in the Property for the Term.
              </p>
              <p style={{ marginBottom: 10, textAlign: "justify" }}>
                <strong>Malicious Tenant Damage Reimbursement</strong> provided under this Agreement covers a maximum malicious tenant damage loss for each registered residential rental Unit in the Property. The maximum amount for the malicious tenant damage loss reimbursement is capped at ten thousand Canadian Dollars CDN $10,000 for each twelve (12) month period for any one (1) habitable and rentable Unit in the Property for the Term.
              </p>
              <p style={{ marginBottom: 10, textAlign: "justify" }}>
                <strong>Eviction Expense Reimbursement</strong> provided under this Agreement covers a maximum loss for each registered residential rental Unit in the Property. The maximum amount for the eviction expense loss reimbursement is capped at one thousand five hundred Canadian Dollars CDN $1,500 for each twelve (12) month period for any one (1) habitable and rentable Unit in the Property for the Term.
              </p>
              <p style={{ textAlign: "justify" }}>
                <strong>Product Fee</strong> payable to Rentatee Technologies Inc. ("Rentatee") shall be five percent (5.0%) of the declared monthly rent if paid monthly, or four and one-half percent (4.5%) of the declared annual rent if paid annually, paid by the Landlord for the Qualifying Tenant(s) listed above to rent a Unit in the Property under a Lease Agreement. The Product Fee payment must be made to Rentatee on or before the 15th calendar day of each month commencing on the Effective Date, for the Term and any Extension thereof. If there is a demand made for Rent Guarantee Reimbursement, Malicious Tenant Damage Reimbursement or Eviction Expense Reimbursement by the Landlord, the total remaining unpaid twelve-monthly installments of the monthly Product Fee amount will be immediately due and payable by the Landlord before any payment is made by the Product Manager.
              </p>
            </div>

            {/* ── Reimbursement Loss Payee ── */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: "13pt", fontWeight: "bold", borderBottom: "1px solid #000", paddingBottom: 4, marginBottom: 10 }}>Reimbursement Loss Payee:</div>
              <div style={{ marginBottom: 8 }}>
                <div><strong>Landlord</strong></div>
              </div>
              <div>
                <div><strong>Product Manager Agent</strong></div>
                <div>Rentatee Technologies Inc. ("Agent")</div>
                <div>1610 Swainson Road, Kelowna, BC, V1P 1C5</div>
                <div>Agent's Email: sales@rentatee.com</div>
              </div>
            </div>

            {/* ── Important Notice ── */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: "13pt", fontWeight: "bold", borderBottom: "1px solid #000", paddingBottom: 4, marginBottom: 10 }}>Important Notice Disclaimer</div>
              <p style={{ marginBottom: 10, textAlign: "justify" }}>
                The Tenant Management Services and Reimbursements provided by the Product Manager to the Landlord, as stated in this Agreement, are explicitly clarified to not constitute insurance. It is strongly recommended that Landlord carefully review this Agreement, seek professional advice, or consult the Product Manager or Product Manager's Agent before entering into this Agreement.
              </p>
              <p style={{ textAlign: "justify" }}>
                The Product Manager directly self-procured a surety in the form of a Performance Bond (the "Performance Bond") from a Surety with an insurance or reinsurance rating of A.M. Best A (excellent) or better (the "Surety") to secure the Product Manager's services and performance for the client. The Surety is not licensed under the Insurance Companies Act and the Province where the client and the property are located. Payment of demands may be more difficult than with an insurer licensed under the Insurance Companies Act. A foreign insurer is defined in Part XIII of the Insurance Companies Act Canada as an entity incorporated or formed by or under the laws of a country other than Canada that insures risks, including an association and an exchange (as those terms are defined in Section 571 of the ICA). The Superintendent of Insurance has no authority under the Insurance Act regarding the Surety. Provincial and federal unlicensed and excise taxes are payable by the Product Manager. The Product Manager's licensed insurance broker in the Province where the Unit is located has been instructed by the Product Manager to file with the Superintendent a return under oath or affirmation in the form and manner required by the Superintendent, containing particulars of all insurance effected under this Section; and concurrently, in respect of all premiums on such insurance Payable by the Product Manager, pay the provincial and federal excise to the Minister of Finance the premium taxes that would be payable if a licensed insurer had received such premiums. The Product Manager's product services and guarantees may be subject to provincial restrictions and only be provided in locations where the law permits. Landlords who need to file a demand must contact the Product Manager's Agent, adhering to the terms and conditions specified in this Agreement.
              </p>
            </div>

            {/* ── LEASE COGUARANTEE ── */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: "14pt", fontWeight: "bold", textAlign: "center", marginBottom: 16 }}>LEASE COGUARANTEE</div>
              <p style={{ textAlign: "justify" }}>
                This Lease Co-Guarantee Agreement (the "Agreement") made on the&nbsp;
                <DateBlank value={fields.effectiveDate} onChange={upd("effectiveDate")} />
                &nbsp;(the "Effective Date") between Rentatee (or with the Landlord's authorized Property Manager) (the "Landlord" or "Property Manager") and Pensio Risk Management Group Inc., located at 80 Carlauren Rd, Unit 23, Woodbridge, ON, L4L 7Z5 ("Product Manager").
              </p>
            </div>

            {/* ── RECITALS ── */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: "14pt", fontWeight: "bold", textAlign: "center", marginBottom: 16 }}>RECITALS</div>
              <p style={{ marginBottom: 8, textAlign: "justify" }}>Whereas the Landlord and Product Manager may be referred to herein each as (a "Party") and collectively as (the "Parties") to this Agreement;</p>
              <p style={{ marginBottom: 8, textAlign: "justify" }}>Whereas the Landlord, being the owner, operator, and manager of the registered rental Unit (referred to as the "Unit"), listed above, situated at the address of the property (the "Property");</p>
              <p style={{ marginBottom: 8, textAlign: "justify" }}>Whereas in consideration of the terms and conditions outlined in this Agreement, the Product Manager agrees to provide the Landlord with the following Tenant Management Services and reimbursements for losses in the event of a Tenant violation of an enforceable Lease Agreement, the (i) Rent Guarantee Reimbursement (the "Rent Guarantee Reimbursement") for defaulted rent loss; and (ii) Malicious Tenant Damage Reimbursement (the "Malicious Tenant Damage Reimbursement") for malicious tenant damage; and (iii) Eviction Expense Reimbursement (the "Eviction Expense Reimbursement"), for eviction and legal expenses;</p>
              <p style={{ marginBottom: 8, textAlign: "justify" }}>Whereas the initial term (the "Lease Term") for any Qualified Tenant listed above who meets the qualifications to enter into a Lease Agreement is for a minimum occupancy period of twelve (12) months;</p>
              <p style={{ textAlign: "justify" }}>And Whereas the Parties have mutually agreed to enter into this Agreement and are bound by the terms and conditions specified within this Agreement.</p>
            </div>

            {/* ── NOW THEREFORE ── */}
            <p style={{ marginBottom: 20, textAlign: "justify" }}>
              <strong>NOW THEREFORE</strong>, in recognition and acceptance of the mutual promises and obligations outlined in this Agreement, and Exhibits and other valuable considerations, the Parties involved hereby agree to the following terms and conditions:
            </p>

            {/* ── Definitions ── */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: "13pt", fontWeight: "bold", marginBottom: 10 }}>Definitions</div>
              <p style={{ marginBottom: 8 }}>The Definitions governing this Agreement shall be as follows:</p>

              <p style={{ marginBottom: 8 }}><strong>Exhibit A – Tenant Demand Notice</strong><br />The initial written formal communication issued by the Landlord to the Product Manager or the Product Manager's Agent, following the prescribed format and manner specified in Exhibit A. ("Enclosed")</p>
              <p style={{ marginBottom: 8 }}><strong>Exhibit B – Supplemental Lease Agreement Violations Report</strong><br />The supplemental written formal communication issued by the Landlord to the Product Manager or the Product Manager's Agent, following the prescribed format and manner specified in Exhibit B. ("Enclosed")</p>
              <p style={{ marginBottom: 8 }}><strong>Exhibit C - Tenant Eviction Notice</strong><br />The specific time, form, and manner for serving the eviction notice to Tenants in default are outlined in Section 4 and Exhibit C of this Agreement. ("Enclosed")</p>

              <p style={{ marginBottom: 6 }}>"Agent" means Rentatee Technologies Inc., a company, person, party, third-party, or entity acting on behalf of Product Manager.</p>
              <p style={{ marginBottom: 6 }}>"Agreement" means this Agreement, Recitals, and Exhibits.</p>
              <p style={{ marginBottom: 6 }}>"Effective Date" means the date of this Agreement.</p>
              <p style={{ marginBottom: 6 }}>"Eviction Expense Reimbursement" shall have the same meaning set forth in Section 4 and the Recitals.</p>
              <p style={{ marginBottom: 6 }}>"Extension" means the renewal of this Agreement.</p>
              <p style={{ marginBottom: 6 }}>"Landlord" shall have the same meaning set forth in the Recitals.</p>
              <p style={{ marginBottom: 6 }}>"Lease Agreement" means a valid, existing, enforceable legal lease agreement for a Unit listed above between the Landlord and Qualified Tenant(s) who meets the qualifications specified in Section 5, for the Lease Term.</p>
              <p style={{ marginBottom: 6 }}>"Lease Term" for the purpose of this Agreement means any Lease Agreement shall be for a period of not less than twelve (12) months.</p>
              <p style={{ marginBottom: 6 }}>"Malicious Tenant Damage Reimbursement" shall have the same meaning set forth in Section 3.</p>
              <p style={{ marginBottom: 6 }}>"Notices" means written communications between the Parties that are required or permitted under this Agreement, including any notices of breach, termination, or other important matters.</p>
              <p style={{ marginBottom: 6 }}>"Party" means any individual or entity that is a signatory to this Agreement.</p>
              <p style={{ marginBottom: 6 }}>"Performance Bond" shall have the same meaning set forth in the Important Notice Disclaimer.</p>
              <p style={{ marginBottom: 6 }}>"Product Fee" shall have the same meaning set forth in the Declarations.</p>
              <p style={{ marginBottom: 6 }}>"Product Manager" means Pensio Risk Management Group Inc.</p>
              <p style={{ marginBottom: 6 }}>"Property" shall have the same meaning set forth in the Recitals.</p>
              <p style={{ marginBottom: 6 }}>"Qualified Tenant" means a Person or Persons who has entered into a Lease Agreement before, on or after the Effective Date and who meets the qualifications specified in Section 5.</p>
              <p style={{ marginBottom: 6 }}>"Rent" means the monthly gross rent amount specified in a legal and valid in force Lease Agreement.</p>
              <p style={{ marginBottom: 6 }}>"Rent Guarantee Reimbursement" shall have the same meaning set forth in Section 2.</p>
              <p style={{ marginBottom: 6 }}>"Renewal Term" shall mean the term for which the Lease Agreement is renewed after the Lease Term.</p>
              <p style={{ marginBottom: 6 }}>"Reporting Period" means a one (1) month period starting on the first day of the calendar month and ending on the last day of the calendar month.</p>
              <p style={{ marginBottom: 6 }}>"Reporting Date" means the close of Monday following the Reporting Period.</p>
              <p style={{ marginBottom: 6 }}>"Supplemental Lease Agreement Violation Report" means a defined written monthly formal communication issued by the Landlord to the Product Manager or the Product Manager's Agent, following the prescribed format and manner specified in Exhibit B. This report must be sent by the Landlord to the Product Manager or the Product Manager's Agent on the Reporting Date, via a return receipt email.</p>
              <p style={{ marginBottom: 6 }}>"Tenant" means a Person or Persons who has a legal and valid Lease Agreement in force and who occupies a Unit.</p>
              <p style={{ marginBottom: 6 }}>"Tenant Default Notice" means and is defined as a written formal communication issued by the Landlord to a Tenant in default. Subject to the relevant municipal and provincial statutes, laws, and the terms and conditions specified in an enforceable Lease Agreement, the Landlord has an obligation to provide the Tenant Default Notice to the Tenant in default within five (5) calendar days following the Tenant's violation of the Lease Agreement for reasons such as rent arrears, malicious tenant damage, or any other violations.</p>
              <p style={{ marginBottom: 6 }}>"Tenant Demand Notice" means and is defined as the initial written formal communication issued by the Landlord to the Product Manager, following the format and manner specified in the completed Tenant Demand Notice, Exhibit A, that must be sent to the Product Manager or the Product Manager's Agent via return receipt email on the same day that the Tenant Default Notice is served to the Tenant in default, or on a date no later than five (5) days from a Tenant default or violation of the Unit Lease Agreement.</p>
              <p style={{ marginBottom: 6 }}>"Tenant Eviction Notice" means and is defined as the formal communication and eviction notice served on a Tenant in default by the Landlord, in accordance with the relevant provincial and municipal statutes and laws.</p>
              <p style={{ marginBottom: 6 }}>"Term" means a twelve (12) month period starting at the Effective date.</p>
              <p style={{ marginBottom: 6 }}>"Termination" means the cessation or conclusion of this Agreement, either by expiration of the Term or by the occurrence of an event of default that triggers the termination provisions, as more fully described under Section 16.</p>
              <p style={{ marginBottom: 6 }}>"Unit" means the residential rental Unit listed above that is rentable, habitable, and marketable.</p>
            </div>

            {/* ── General Engagement ── */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: "bold", marginBottom: 6 }}>General Engagement.</div>
              <p style={{ marginBottom: 6, textAlign: "justify" }}>This Agreement shall govern the engagement between the Landlord and the Product Manager for the provision of certain services and reimbursements for the Term or any Extension thereof.</p>
              <p style={{ textAlign: "justify" }}>There are general limits applicable to reimbursements by the Product Manager for the Rent Guarantee, Malicious Tenant Damage, and Eviction Expense described hereunder and in details applicable to each type of reimbursement in Sections 2, 3, and 4. The reimbursement amount for Rent loss, pertaining to Qualified Tenants in default, is subject to the Product Manager or the Product Manager's Agent receiving specific Notices and Reports from the Landlord in the form and manner provided in Exhibits A, B, and C.</p>
            </div>

            {/* ── Rent Guarantee Reimbursement ── */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: "bold", marginBottom: 6 }}>Rent Guarantee Reimbursement.</div>
              <p style={{ textAlign: "justify" }}>If no Landlord Event of Default exists, the Product Manager is obligated to reimburse the Landlord for Rent loss caused by Qualified Tenants in violation of their Lease Agreement. The maximum reimbursement amount for Rent loss will be equal to, but not exceed, the Rent charged by the Landlord in the Lease Agreement, capped at a maximum of sixty thousand Canadian dollars CDN $60,000 (the "Rent Guarantee Reimbursement Limit") for any Unit for the Lease Term or any subsequent Renewal Term.</p>
            </div>

            {/* ── Malicious Tenant Damage ── */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: "bold", marginBottom: 6 }}>Malicious Tenant Damage Reimbursement.</div>
              <p style={{ textAlign: "justify" }}>If no Landlord Event of Default exists, the Product Manager is obligated to reimburse the Landlord for malicious tenant damage (this does not mean normal wear and tear nor Unit cleaning), caused by Qualified Tenants in violation of their Lease Agreement. The maximum reimbursement amount for malicious tenant damage is capped at a maximum of ten thousand Canadian dollars CDN $10,000 (the "Malicious Tenant Damage Reimbursement Limit") for any Unit during the Lease Term or any subsequent Renewal Term.</p>
            </div>

            {/* ── Eviction ── */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: "bold", marginBottom: 6 }}>Eviction and Legal Expenses Reimbursement.</div>
              <p style={{ textAlign: "justify" }}>If no Landlord Event of Default exists, the Product Manager is obligated to reimburse the Landlord for actual Eviction and Legal Expenses incurred for Qualified Tenants in violation of their Lease Agreement, capped at a maximum of one thousand five hundred Canadian dollars CDN $1,500 (the "Eviction Expense Reimbursement Limit") for any Unit for the Lease Term or any subsequent Renewal Term.</p>
            </div>

            {/* ── Qualified Tenant ── */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: "bold", marginBottom: 6 }}>Qualified Tenant.</div>
              <p style={{ marginBottom: 8, textAlign: "justify" }}>The Landlord represents, warrants, and covenants a Tenant residing in a Unit subject to a legal and valid Unit Lease Agreement shall have tenant history, screening review, documentation review, and credit qualifications set out below (the "Qualified Tenant").</p>
              <p style={{ marginBottom: 6, textAlign: "justify" }}><strong>Existing Tenant Criteria</strong> having an existing valid Unit Lease Agreement as of the Effective Date: The Existing Tenant must not have any current violations of the Unit Lease Agreement. There are no Tenant rent arrears in the past twelve (12) months in excess of five (5) calendar days at the time of registration of the Property.</p>
              <p style={{ textAlign: "justify" }}><strong>New Tenant Criteria</strong> entering into a Unit Lease Agreement after the Effective Date: New Tenant, Co-Tenants, and Guarantors are required to undergo the Landlord's comprehensive rental application and screening process. Must not have been subject to any active collections, residential rental tenancy-related court-ordered judgments, bankruptcies, or tenancy evictions within the preceding three (3) years. The gross monthly rent amount obligation payable by a New Tenant shall not exceed forty-five percent (45%) of the combined gross monthly income of the Tenant and Co-Tenant.</p>
            </div>

            {/* ── Collections ── */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: "bold", marginBottom: 6 }}>Collections.</div>
              <p style={{ textAlign: "justify" }}>The Product Manager or the Product Manager's Agent will have the exclusive right to enforce the collection of outstanding Rent Loss, Malicious Tenant Damage Loss, or outstanding Eviction and Legal Expenses Loss from existing or former Qualified Tenants in default of the Lease Agreement. The Landlord agrees to cooperate and assist the Product Manager in completing collections against any existing or former Qualified Tenants in default of the Lease Agreement.</p>
            </div>

            {/* ── Maintenance ── */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: "bold", marginBottom: 6 }}>Maintenance of Rental Unit and Property.</div>
              <p style={{ textAlign: "justify" }}>If the Landlord fails to maintain the minimum standards for the rental Unit in the Property and building required by local authorities and rental income has been withheld by a Qualifying Tenant during the Lease Term and Renewal Term, the Product Manager may not reimburse the Rent Loss as specified in Section 2 until the Landlord has certified that the necessary maintenance and repairs have been completed.</p>
            </div>

            {/* ── Covenants ── */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: "bold", marginBottom: 6 }}>Landlord Affirmative Covenants.</div>
              <p style={{ textAlign: "justify" }}>During the Term of this Agreement, the Landlord represents, warrants, and covenants that: (i) Landlord is the legal Landlord for a rental Unit in the Property; (ii) Landlord has the authority to enter into this Agreement; (iii) Landlord will promptly perform and observe all the covenants and obligations of this Agreement; and (iv) Landlord will promptly notify the Product Manager or the Product Manager's Agent of any material issues that are reasonably likely to adversely affect Product Manager's performance.</p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: "bold", marginBottom: 6 }}>Product Manager Affirmative Covenants.</div>
              <p style={{ textAlign: "justify" }}>During the term of this Agreement, Product Manager represents, warrants, and covenants that: (i) Product Manager is duly organized, validly existing, and in good standing; (ii) Product Manager has the authority to enter into this Agreement; and (iii) Product Manager will promptly perform and observe all of the material performance obligations of this Agreement.</p>
            </div>

            {/* ── Events of Default ── */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: "bold", marginBottom: 6 }}>Landlord Event of Default and Remedies.</div>
              <p style={{ textAlign: "justify" }}>A "Landlord Event of Default" shall exist under this Agreement if: (i) Landlord fails to pay any Product Fee amounts due and such amounts remain unpaid for ten (10) business days after the Product Manager delivers to the Landlord a notice of non-payment; or (ii) Landlord fails to perform any other covenants or obligations under this Agreement and such failure shall continue for thirty (30) days after notice to Landlord by the Product Manager.</p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: "bold", marginBottom: 6 }}>Product Manager Event of Default and Remedies.</div>
              <p style={{ textAlign: "justify" }}>A "Product Manager Event of Default" shall exist under this Agreement if: (i) Product Manager fails to pay any reimbursement amounts due and such amounts remain unpaid for ten (10) business days after the Landlord delivers to Product Manager a notice of non-payment; or (ii) Product Manager fails to perform any other covenants or obligations under this Agreement and such failure shall continue for thirty (30) days after notice to Product Manager by the Landlord.</p>
            </div>

            {/* ── Data and Privacy ── */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: "bold", marginBottom: 6 }}>Data and Privacy.</div>
              <p style={{ textAlign: "justify" }}>The Parties to this Agreement acknowledge and agree that privacy laws in Canada play a crucial role in governing the collection, use, and protection of personal information related to any tenant or individuals involved in this Agreement. The Parties agree to safeguard personal information, obtain necessary consents, limit data collection to the purposes of this Agreement, provide individuals access to their personal information, and comply with all relevant federal, provincial, and municipal privacy laws and regulations.</p>
            </div>

            {/* ── Confidentiality ── */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: "bold", marginBottom: 6 }}>Confidentiality.</div>
              <p style={{ textAlign: "justify" }}>The Parties recognize and acknowledge the importance of maintaining the confidentiality of certain information exchanged between them, including this Agreement, this Lease Co-Guarantee, insurance market disclosures, and information related to prospective, current, or former clients, partners, employees, investors, or other business opportunities and operations. The Parties agree to treat Confidential Information as strictly confidential.</p>
            </div>

            {/* ── Limitation of Liability ── */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: "bold", marginBottom: 6 }}>Limitation of Liability.</div>
              <p style={{ textAlign: "justify" }}>Product Manager's liability to the Landlord under this Agreement is limited to the agreed-upon reimbursement loss payments outlined in Sections 2, 3, and 4 of this Agreement. Neither Party is liable for special, punitive, indirect, incidental, or consequential damages, including loss of profits or expected rental revenue, even if informed of the possibility thereof, unless payable to a third party.</p>
            </div>

            {/* ── Indemnities ── */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: "bold", marginBottom: 6 }}>Indemnities.</div>
              <p style={{ marginBottom: 8, textAlign: "justify" }}><strong>Landlord Indemnity:</strong> The Landlord will indemnify and hold harmless the Product Manager, its affiliates, and their respective shareholders, directors, officers, agents, subcontractors, and employees from any third-party costs, losses, claims, damages, liabilities, and expenses arising from the Landlord's breach of covenants, violation of this Agreement, Lease Agreement, or any applicable law.</p>
              <p style={{ textAlign: "justify" }}><strong>Product Manager Indemnity:</strong> The Product Manager will indemnify and hold harmless the Landlord, its affiliates, and their respective shareholders, directors, officers, agents, and employees from any third-party costs, losses, claims, damages, liabilities, and expenses arising from the Product Manager's breach of this Agreement or services caused by negligence or willful misconduct.</p>
            </div>

            {/* ── Term and Termination ── */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: "bold", marginBottom: 6 }}>Term and Termination.</div>
              <p style={{ marginBottom: 8, textAlign: "justify" }}><strong>Initial Term.</strong> The initial Term of this Agreement is twelve (12) months from the Effective Date.</p>
              <p style={{ marginBottom: 8, textAlign: "justify" }}><strong>Renewal Term.</strong> The Initial Term of this Agreement will be renewed automatically for consecutive twelve (12) month periods subject to Events of Default or Termination as provided herein.</p>
              <p style={{ textAlign: "justify" }}><strong>Termination.</strong> The Product Manager has the right to terminate this Agreement upon providing written notice to the Landlord in the event of a Landlord Event of Default. If the Landlord, without cause, wishes to terminate this Agreement, they have the option to provide Product Manager with a written notice of termination, which must be given at least ninety (90) days in advance.</p>
            </div>

            {/* ── Additional Provisions ── */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: "bold", marginBottom: 6 }}>Assignment or Transfers.</div>
              <p style={{ textAlign: "justify" }}>The Landlord may assign or transfer this Agreement to another party who has a legal ownership or management interest in the Property. The Landlord must provide written notice to the Product Manager or the Product Manager's Agent at least ten (10) business days in advance. The Product Manager is not allowed to assign, transfer, or delegate any interest or obligations under this Agreement to any other party.</p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: "bold", marginBottom: 6 }}>Governing Law.</div>
              <p style={{ textAlign: "justify" }}>This Agreement shall be governed by and construed in accordance with the laws of the Province of Ontario, without giving effect to any conflict of laws principles. Any suit, action, or proceeding arising out of or relating to this Agreement or its Exhibits shall be brought exclusively in the state courts located in the Province of Ontario.</p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: "bold", marginBottom: 6 }}>Entire Agreement.</div>
              <p style={{ textAlign: "justify" }}>This Agreement, including its Recitals, and Exhibits, constitutes the entire agreement between the Parties with respect to the subject matter hereof. All prior or contemporaneous agreements, covenants, representations, and warranties, whether oral or written, are superseded by this Agreement. No modification, waiver, amendment, discharge, or change of this Agreement shall be effective unless it is in writing and signed by the Party against whom enforcement of such modification, waiver, amendment, discharge, or change is sought.</p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: "bold", marginBottom: 6 }}>Severability.</div>
              <p style={{ textAlign: "justify" }}>If any clause or provision of this Agreement is found to be illegal, invalid, or unenforceable by a final judgment of a court with competent jurisdiction, the remaining provisions of this Agreement shall not be affected.</p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: "bold", marginBottom: 6 }}>Counterparts.</div>
              <p style={{ textAlign: "justify" }}>This Agreement may be executed in multiple counterparts, each of which shall be considered an original, but all of which together shall constitute the same Agreement. The exchange of electronic copies of this Agreement and signature pages shall be deemed as effective execution and delivery of this Agreement. Electronic signatures transmitted via electronic means, including PDF copies by email, shall be considered original signatures for all purposes.</p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: "bold", marginBottom: 6 }}>Force Majeure.</div>
              <p style={{ textAlign: "justify" }}>The Parties to this Agreement shall not be responsible or liable for any injury to the other Party arising from that Party's failure of performance hereunder due to labor disputes, strikes, wars, riots, insurrections, civil commotion, fires, floods, accidents, storms, acts of God, government Stay in Place Orders, State of Emergencies, suspension of business, suspension of tenant evictions, closure of courts, tribunals or government services, or other causes beyond that Party's control.</p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: "bold", marginBottom: 6 }}>Publicity.</div>
              <p style={{ textAlign: "justify" }}>Neither Party will use the name(s), trademark(s), or trade name(s) (whether registered or not) of the other, including but not limited to "Product Manager" or "Product Manager's Agent" without the express prior written consent of the Product Manager.</p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: "bold", marginBottom: 6 }}>Representations.</div>
              <p style={{ textAlign: "justify" }}>Each Party, in such context, the ("Representing Party") does hereby represent and warrant to the other that the execution, delivery, and performance of this Agreement by the Representing Party has been authorized, and this Agreement represents a binding and enforceable obligation of the Representing Party.</p>
            </div>

            {/* ── Signature Page ── */}
            <div style={{ borderTop: "2px solid #000", paddingTop: 30, marginTop: 40 }}>
              <div style={{ textAlign: "center", fontWeight: "bold", fontSize: "13pt", marginBottom: 4 }}>- End of Agreement - Signature Page Follows -</div>
              <div style={{ textAlign: "center", fontWeight: "bold", fontSize: "13pt", marginBottom: 24 }}>IN WITNESS WHEREOF</div>
              <div style={{ textAlign: "center", marginBottom: 30 }}>the Parties have executed this Agreement as of the Effective Date.</div>

              <div style={{ display: "flex", gap: 60, marginTop: 20 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ marginBottom: 16 }}>Accepted, Acknowledged and Agreed:</div>
                  <div><strong>By: Pensio Risk Management Group Inc.</strong></div>
                  <div style={{ marginTop: 8, marginBottom: 2 }}>
                    {/* Jim Milankov signature */}
                    <svg viewBox="0 0 240 60" width="240" height="60" xmlns="http://www.w3.org/2000/svg" style={{ display: "block" }}>
                      <path d="
                        M 10,42
                        C 12,30 14,22 18,20
                        C 22,18 22,30 20,38
                        C 19,42 20,44 22,43
                        C 25,41 27,35 29,30
                        C 31,25 32,24 34,26
                        C 36,28 35,36 34,42
                        C 33,46 35,47 37,44
                        C 40,40 43,30 46,28
                        C 49,26 50,28 50,32
                        C 50,38 48,44 47,48
                        C 46,51 48,51 50,49
                        M 54,30
                        C 56,26 58,24 60,26
                        C 63,29 62,36 60,42
                        C 59,46 60,48 62,46
                        C 65,43 68,36 70,32
                        C 72,28 74,28 75,31
                        C 76,35 75,41 74,45
                        C 73,48 74,49 76,47
                        C 79,44 82,38 85,34
                        C 87,31 89,30 91,32
                        C 94,35 93,42 91,47
                        C 90,50 91,52 93,50
                        M 97,38
                        C 100,30 104,22 108,20
                        C 112,18 113,24 112,32
                        C 111,39 109,45 107,48
                        C 105,51 105,53 107,52
                        C 112,49 118,42 122,38
                        C 126,34 128,32 130,34
                        C 133,37 132,44 130,48
                        C 129,51 130,52 133,50
                        C 138,47 143,40 146,36
                        C 149,32 152,30 155,32
                        C 158,35 158,42 156,47
                        C 155,50 156,51 158,49
                        C 162,46 166,40 170,37
                        C 174,34 178,33 182,36
                        C 186,39 188,45 190,50
                        C 192,54 195,56 200,54
                        C 205,52 210,47 215,43
                        C 218,41 220,40 222,41
                        C 225,43 226,46 225,49
                      " fill="none" stroke="#1a1a6e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div style={{ borderBottom: "1px solid #000", width: 240, marginBottom: 4 }} />
                  <div>Jim Milankov</div>
                  <div>President</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ marginBottom: 16 }}>Accepted, Acknowledged and Agreed:</div>
                  <div><strong>By: Landlord</strong></div>
                  <div style={{ marginTop: 40, borderBottom: "1px solid #000", width: 240, marginBottom: 4 }} />
                  <div style={{ color: "#888", fontSize: "10pt" }}>(signature)</div>
                  <div style={{ color: "#888", fontSize: "10pt" }}>Signature will appear here after signing</div>
                  <div style={{ marginTop: 8 }}>Landlord (or Landlord's Property Manager, if authorized)</div>
                </div>
              </div>

              <div style={{ marginTop: 30, padding: "16px", border: "1px solid #ccc", borderRadius: 4 }}>
                <div style={{ fontWeight: "bold", marginBottom: 6 }}>Disclaimer for Electronic Signatures:</div>
                <p style={{ fontSize: "10pt", textAlign: "justify" }}>The use of Electronic Signatures in connection with this Agreement is permitted and acknowledged by the Parties. Each Party agrees that the use of electronic signatures, whether in the form of scanned copies, digital signatures, or other electronic means, shall have the same legal effect and enforceability as a handwritten signature.</p>
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
            <button onClick={onClose} className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg font-semibold transition-colors">Done</button>
          </div>
        ) : !showSigners ? (
          <div className="flex-shrink-0 border-t bg-white px-5 py-3 flex items-center justify-between gap-4">
            <p className="text-xs text-gray-400 hidden sm:block">
              Fill in the highlighted fields, then click Send for Signing to collect signatures.
            </p>
            <button
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors shrink-0"
              onClick={() => setShowSigners(true)}
              data-testid="button-lease-send-for-signing"
            >
              <Send className="h-4 w-4" /> Send for Signing
            </button>
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
