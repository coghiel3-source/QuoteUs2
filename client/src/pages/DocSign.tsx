import { useEffect, useRef, useState } from "react";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fieldDocumentIndex, nextGuideIndex } from "./docSignGuide";

type FieldType = "signature" | "initials" | "date" | "text" | "notes";

interface SignatureField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  defaultValue?: string;
  signerId?: string;
  page?: number;
  hint?: string;
  documentId?: string;
  fileId?: string;
  documentIndex?: number;
  docIndex?: number;
  fileIndex?: number;
}

interface GuideStep {
  key: string;
  label: string;
  complete: boolean;
  required: boolean;
  field?: SignatureField;
}

function SignaturePad({
  id,
  label = "Signature",
  height = 140,
  onCapture,
}: {
  id: string;
  label?: string;
  height?: number;
  onCapture: (data: string | null) => void;
}) {
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

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    drawing.current = true;
    lastPos.current = getPos(e);
  };

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
    if (isEmpty) { setIsEmpty(false); onCapture(canvas.toDataURL()); }
    else onCapture(canvas.toDataURL());
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
      <div className="relative border-2 border-gray-200 rounded-xl overflow-hidden bg-white touch-none" style={{ height }}>
        <canvas
          ref={canvasRef}
          id={id}
          tabIndex={0}
          role="img"
          aria-label={`Draw ${label.toLowerCase()} here`}
          width={600}
          height={height * 2}
          className="w-full h-full cursor-crosshair"
          onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
          onTouchStart={start} onTouchMove={move} onTouchEnd={end}
        />
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-gray-300 text-sm select-none">Draw {label.toLowerCase()} here</p>
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

export default function DocSign() {
  const [, params] = useRoute("/doc-sign/:token");
  const token = params?.token;

  const [record, setRecord] = useState<any>(null);
  const [signer, setSigner] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [fields, setFields] = useState<SignatureField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDoc, setActiveDoc] = useState(0);
  const [docPages, setDocPages] = useState<Record<number, number>>({});

  const [signerName, setSignerName] = useState("");
  const [mainSigData, setMainSigData] = useState<string | null>(null);
  const [fieldResponses, setFieldResponses] = useState<Record<string, string>>({});

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [completionStatus, setCompletionStatus] = useState<string | null>(null);
  const [notificationStatus, setNotificationStatus] = useState<string | null>(null);
  const [signedCopiesReady, setSignedCopiesReady] = useState(false);
  const [consented, setConsented] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [errorStep, setErrorStep] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const stepRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [sigModalOpen, setSigModalOpen] = useState(false);
  const [sigDraft, setSigDraft] = useState<string | null>(null);

  const getDocPage = (i: number) => docPages[i] ?? 1;
  const setDocPage = (i: number, p: number) => setDocPages(prev => ({ ...prev, [i]: Math.max(1, p) }));

  // A page belongs to its document, not whichever tab happens to be open.
  // Older requests have only a page number; use the first document for those.
  const focusField = (field: SignatureField) => {
    const index = fieldDocumentIndex(field, files);
    if (files.length) setActiveDoc(index);
    if (field.page && field.page >= 1) setDocPage(index, field.page);
  };

  useEffect(() => {
    if (!token) return;
    fetch(`/api/doc-sign/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); setLoading(false); return; }
        setRecord(data);
        setSigner(data.signer || null);
        setFiles(data.files || []);
        const rawFields: SignatureField[] = data.fields || [];
        const initialResponses: Record<string, string> = {};
        rawFields.forEach(f => { if (f.defaultValue) initialResponses[f.id] = f.defaultValue; });
        setFields(rawFields);
        setFieldResponses(initialResponses);
        // Pre-fill name if the signer object has a name
        if (data.signer?.name) setSignerName(data.signer.name);
        setLoading(false);
      })
      .catch(() => { setError("Failed to load document."); setLoading(false); });
  }, [token]);

  const isPdf = (f: any) => f?.mimeType === "application/pdf" || f?.filePath?.endsWith(".pdf");
  const isHtml = (f: any) => f?.mimeType === "text/html" || f?.filePath?.endsWith(".html");

  const allFields = fields;
  const hasSignatureField = allFields.some(f => f.type === "signature" || f.type === "initials");
  const steps: GuideStep[] = [
    { key: "name", label: "Your Full Legal Name", complete: !!signerName.trim(), required: true },
    ...(!hasSignatureField ? [{ key: "main-signature", label: "Signature", complete: !!mainSigData, required: true }] : []),
    ...allFields.map(f => ({ key: `field-${f.id}`, label: f.label || f.type, complete: !!fieldResponses[f.id]?.trim(), required: f.required, field: f })),
    { key: "consent", label: "Agreement confirmation", complete: consented, required: true },
  ];
  const requiredSteps = steps.filter(step => step.required);
  const filled = requiredSteps.filter(step => step.complete).length;
  const totalRequired = requiredSteps.length;
  const pct = totalRequired > 0 ? Math.round((filled / totalRequired) * 100) : 100;

  const jumpToStep = (step: typeof steps[number]) => {
    setActiveStep(step.key);
    if (step.field) focusField(step.field);
    const target = stepRefs.current[step.key];
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
    // preventScroll avoids focus snapping past the smooth scroll animation.
    target?.querySelector<HTMLElement>("input, textarea, canvas, button")?.focus({ preventScroll: true });
  };
  const navigate = (direction: "start" | "next" | "previous") => {
    const target = steps[nextGuideIndex(steps, activeStep, direction)];
    if (target) jumpToStep(target);
  };

  const validate = () => {
    const missing = requiredSteps.find(step => !step.complete);
    if (!missing) return null;
    const message = missing.key === "name" ? "Please enter your full legal name."
      : missing.key === "main-signature" ? "Please draw your signature."
      : missing.key === "consent" ? "Please confirm you have read and agree to the documents."
      : `Please complete "${missing.label}" (${missing.field?.type === "initials" ? "initials" : missing.field?.type || "field"}).`;
    return { message, step: missing };
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { setFormError(err.message); setErrorStep(err.step.key); jumpToStep(err.step); return; }
    setFormError(null);
    setErrorStep(null);
    setSubmitting(true);
    try {
      const sigField = allFields.find(f => f.type === "signature" || f.type === "initials");
      const sig = mainSigData || (sigField ? fieldResponses[sigField.id] : "") || "";
      const responses = allFields.map(f => ({ id: f.id, type: f.type, value: fieldResponses[f.id] || "" }));
      const res = await fetch(`/api/doc-sign/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatureData: sig, signerName: signerName.trim(), fieldResponses: responses }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      setCompletionStatus(data.status || null);
      setNotificationStatus(data.notificationStatus || (data.completionEmailSent === true ? "sent" : null));
      setSignedCopiesReady(data.signedCopiesReady === true);
      setSubmitted(true);
    } catch (e: any) {
      setFormError(e.message || "Submission failed. Please try again.");
      setErrorStep(null);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500">Loading documents…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-sm">
        <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-800 mb-1">Link unavailable</h2>
        <p className="text-gray-500 text-sm">{error}</p>
      </div>
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">{completionStatus === "partial" ? "Your signing is complete" : "Documents Signed"}</h2>
        <p className="text-gray-500 text-sm">Thank you, <strong>{signerName}</strong>. Your signature has been recorded.{completionStatus === "partial" ? " Waiting for the other signers to complete their fields." : ""}</p>
        {notificationStatus === "sent" && <p className="text-gray-500 text-sm mt-2">{completionStatus === "partial" ? "A confirmation of your signature has been emailed to you. Completed copies will be sent after everyone has signed." : signedCopiesReady ? "A confirmation and signed copies have been emailed to the recipients, with a copy to rgprocessing@quoteus.ca." : "A confirmation has been emailed, with a copy to rgprocessing@quoteus.ca. Please contact the sender for the completed document copies."}</p>}
        {notificationStatus === "pending" && <p className="text-gray-500 text-sm mt-2">The signed copy email is pending.</p>}
        {notificationStatus === "failed" && <p className="text-amber-700 text-sm mt-2">Your signature was saved, but the signed copy email could not be sent. Please contact the sender for a copy.</p>}
        {record?.propertyAddress && <p className="text-gray-400 text-xs mt-2">{record.propertyAddress}</p>}
      </div>
    </div>
  );

  if (record?.status === "signed") return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Already Signed</h2>
        <p className="text-gray-500 text-sm">
          {record.signerName ? <>Signed by <strong>{record.signerName}</strong>.</> : "This document has already been signed."}
        </p>
        {record.signedAt && <p className="text-gray-400 text-xs mt-1">{new Date(record.signedAt).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })}</p>}
      </div>
    </div>
  );

  const currentFile = files[activeDoc];
  const currentPage = getDocPage(activeDoc);
  const isPdfFile = isPdf(currentFile);
  const isHtmlFile = isHtml(currentFile);

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-blue-700 text-white px-4 py-3 flex items-center gap-3 sticky top-0 z-20">
        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold leading-tight">Document Signing</h1>
          {record?.propertyAddress && <p className="text-blue-200 text-xs truncate">{record.propertyAddress}</p>}
        </div>
        {totalRequired > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-20 h-1.5 bg-white/30 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-blue-100 text-xs" aria-live="polite">{filled}/{totalRequired} required</span>
          </div>
        )}
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        <div className="bg-white rounded-xl border shadow-sm px-4 py-3 flex flex-wrap items-center gap-2" aria-label="Signing guide">
          <p className="text-sm text-gray-700 mr-auto"><strong>{filled} of {totalRequired}</strong> required steps complete. Fill fields in any order, or use the guide.</p>
          <Button variant="outline" size="sm" onClick={() => navigate("previous")} disabled={!activeStep || steps[0]?.key === activeStep}>Previous</Button>
          <Button variant="outline" size="sm" onClick={() => navigate(activeStep ? "next" : "start")}>{activeStep ? "Next field" : "Start"}</Button>
        </div>

        {/* Signer context banner */}
        {signer && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">{(signer.name || signer.email || "?").charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-blue-900">Signing as: {signer.name || signer.email}</p>
              <p className="text-xs text-blue-600">Please review the document and complete your assigned fields below.</p>
            </div>
          </div>
        )}

        {/* Pre-filled Document Fields Panel */}
        {(() => {
          let td: Record<string, string> | null = null;
          try { if (record?.templateData) td = JSON.parse(record.templateData); } catch {}
          if (!td) return null;
          const rows = [
            { label: "Landlord (Rentatee)", value: td.landlordName },
            { label: "Landlord's Address", value: td.landlordAddress },
            { label: "Landlord's Contact Number", value: td.landlordPhone },
            { label: "Landlord's Email", value: td.landlordEmail },
            { label: "Residential Rental Property Address", value: td.propertyAddress },
            { label: "Qualified Tenants Residing in Unit", value: td.qualifiedTenants },
            { label: "Lease Co-Guarantee Effective Date", value: td.effectiveDate ? new Date(td.effectiveDate + "T00:00:00").toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" }) : "" },
          ].filter(r => r.value);
          if (rows.length === 0) return null;
          return (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-amber-200 bg-amber-100/70">
                <h2 className="text-sm font-bold text-amber-900">Agreement Details</h2>
                <p className="text-xs text-amber-700 mt-0.5">The following details apply to this Lease Co-Guarantee Agreement.</p>
              </div>
              <div className="divide-y divide-amber-100">
                {rows.map((r, i) => (
                  <div key={i} className="px-5 py-2.5 flex gap-3">
                    <span className="text-xs font-semibold text-amber-800 w-52 shrink-0">{r.label}</span>
                    <span className="text-xs text-gray-800 flex-1">{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Document Viewer */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">

          {files.length > 1 && (
            <div className="flex overflow-x-auto border-b bg-gray-50">
              {files.map((f, i) => (
                <button key={f.id} onClick={() => setActiveDoc(i)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 shrink-0 transition-colors ${activeDoc === i ? "border-blue-600 text-blue-700 bg-white" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                  {f.fileName || `Document ${i + 1}`}
                </button>
              ))}
            </div>
          )}

          {currentFile && (
            <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
              <p className="text-xs font-medium text-gray-600 truncate flex-1">{currentFile.fileName}</p>
              <div className="flex items-center gap-3 shrink-0 ml-4">
                {isPdfFile && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => setDocPage(activeDoc, currentPage - 1)} disabled={currentPage <= 1}
                      className="w-6 h-6 rounded border bg-white text-gray-600 text-xs font-bold flex items-center justify-center disabled:opacity-30 hover:bg-gray-100">‹</button>
                    <span className="text-xs text-gray-600 min-w-[3rem] text-center">Page {currentPage}</span>
                    <button onClick={() => setDocPage(activeDoc, currentPage + 1)}
                      className="w-6 h-6 rounded border bg-white text-gray-600 text-xs font-bold flex items-center justify-center hover:bg-gray-100">›</button>
                  </div>
                )}
                <a href={currentFile.filePath} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                  Open ↗
                </a>
              </div>
            </div>
          )}

          {currentFile ? (
            isPdfFile ? (
              <iframe
                key={`${activeDoc}-${currentPage}`}
                src={`${currentFile.filePath}#page=${currentPage}`}
                className="w-full"
                style={{ height: 560, border: "none", display: "block" }}
                title={currentFile.fileName}
              />
            ) : isHtmlFile ? (
              <iframe
                key={`${activeDoc}-html`}
                src={currentFile.filePath}
                className="w-full"
                style={{ height: 620, border: "none", display: "block" }}
                title={currentFile.fileName}
                sandbox="allow-same-origin"
              />
            ) : (
              <div className="flex items-center justify-center p-6 bg-gray-100" style={{ minHeight: 300 }}>
                <img src={currentFile.filePath} alt={currentFile.fileName} className="max-w-full object-contain rounded shadow" style={{ maxHeight: 560 }} />
              </div>
            )
          ) : (
            <div className="flex items-center justify-center p-12 text-gray-400 text-sm">No documents attached.</div>
          )}
        </div>

        {/* Signing Form */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b bg-gray-50">
            <h2 className="text-sm font-bold text-gray-800">Complete &amp; Sign</h2>
            <p className="text-xs text-gray-500 mt-0.5">Review the documents above. Fill in fields freely or use Start / Next field to move through them.</p>
          </div>

          <div className="p-5 space-y-5">

            {/* Signer name */}
            <div ref={el => { stepRefs.current.name = el; }} className="space-y-1.5 scroll-mt-24" onFocus={() => setActiveStep("name")}>
              <Label htmlFor="signerName" className="text-sm font-semibold text-gray-700">
                Your Full Legal Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="signerName"
                data-testid="input-signer-name"
                placeholder="Full name as it appears on your ID"
                value={signerName}
                onChange={e => setSignerName(e.target.value)}
                className="text-sm"
              />
              {errorStep === "name" && !signerName.trim() && <p role="alert" className="text-sm text-red-700">{formError}</p>}
            </div>

            {/* Main signature (if no dedicated signature field) — styled to match the
                "Accepted, Acknowledged and Agreed / By: Landlord" block in the agreement.
                Clicking the signature line opens a modal to draw the signature, which
                then appears on the line itself. */}
            {!hasSignatureField && (
              <div ref={el => { stepRefs.current["main-signature"] = el; }} className="border-2 border-gray-200 rounded-xl p-6 bg-gray-50/50 scroll-mt-24" data-testid="block-landlord-signature" onFocus={() => setActiveStep("main-signature")}>
                <p className="text-base font-semibold text-gray-900 mb-1">Accepted, Acknowledged and Agreed:</p>
                <p className="text-base font-semibold text-gray-900 mb-6">By: Landlord</p>

                {/* Signature line */}
                <div className="relative" style={{ maxWidth: 360 }}>
                  {mainSigData ? (
                    <>
                      <img
                        src={mainSigData}
                        alt="Your signature"
                        className="block"
                        style={{ height: 72, objectFit: "contain", marginBottom: -8 }}
                        data-testid="img-signature-on-line"
                      />
                      <div className="border-b-2 border-gray-900" />
                      <p className="text-xs text-gray-500 mt-1">(signature)</p>
                      <button
                        onClick={() => { setSigDraft(mainSigData); setSigModalOpen(true); }}
                        className="text-xs text-blue-600 hover:underline mt-1"
                        data-testid="button-resign"
                      >
                        ✎ Re-sign
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => { setSigDraft(null); setSigModalOpen(true); }}
                        className="group w-full flex items-center justify-center gap-2 py-4 mb-1 bg-amber-100 hover:bg-amber-200 border-2 border-dashed border-amber-500 rounded-lg transition-colors animate-pulse hover:animate-none"
                        data-testid="button-open-signature-pad"
                      >
                        <svg className="w-5 h-5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span className="text-sm font-bold text-amber-900">Sign here — click to approve</span>
                      </button>
                      <div className="border-b-2 border-gray-900" />
                      <p className="text-xs text-gray-500 mt-1">(signature)</p>
                      <p className="text-xs text-gray-400 italic">Signature will appear here after signing</p>
                    </>
                  )}
                </div>
                <p className="text-sm text-gray-700 mt-4 font-medium">
                  Landlord (or Landlord's Property Manager, if authorized)
                </p>
                {errorStep === "main-signature" && !mainSigData && <p role="alert" className="text-sm text-red-700 mt-2">{formError}</p>}
              </div>
            )}

            {/* Signature modal */}
            {sigModalOpen && (
              <div
                className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
                onClick={() => setSigModalOpen(false)}
                data-testid="modal-signature"
              >
                <div
                  className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="px-5 py-4 border-b bg-gray-50">
                    <h3 className="text-base font-bold text-gray-900">Draw Your Signature</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Sign with your mouse or finger, then click "Accept &amp; Use Signature" to apply it to the agreement.</p>
                  </div>
                  <div className="p-5 space-y-4">
                    <SignaturePad id="modal-sig" height={180} onCapture={data => setSigDraft(data)} />
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        onClick={() => { setSigDraft(null); setSigModalOpen(false); }}
                        className="flex-1"
                        data-testid="button-cancel-signature"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => { setMainSigData(sigDraft); setSigModalOpen(false); }}
                        disabled={!sigDraft}
                        className="flex-1 bg-blue-700 hover:bg-blue-800 text-white"
                        data-testid="button-accept-signature"
                      >
                        Accept &amp; Use Signature
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* All required fields */}
            {allFields.map(field => (
              <div key={field.id} ref={el => { stepRefs.current[`field-${field.id}`] = el; }} className={`space-y-1.5 scroll-mt-24 rounded-lg ${activeStep === `field-${field.id}` ? "ring-2 ring-blue-200 p-2 -m-2" : ""}`} onFocus={() => { setActiveStep(`field-${field.id}`); focusField(field); }}>
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <Label htmlFor={`field-input-${field.id}`} className="text-sm font-semibold text-gray-700">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                      <span className="ml-2 text-xs font-normal text-gray-400 capitalize">({field.type})</span>
                    </Label>
                    {/* Page + location hint */}
                    {(field.page || field.hint) && (
                      <p className="text-xs text-blue-600 mt-0.5 flex items-center gap-1">
                        {field.page && (
                          <button
                            onClick={() => { focusField(field); }}
                            className="underline hover:text-blue-800 font-medium"
                          >
                            Page {field.page}
                          </button>
                        )}
                        {field.page && field.hint && <span className="text-gray-300">·</span>}
                        {field.hint && <span className="text-gray-500">{field.hint}</span>}
                      </p>
                    )}
                  </div>
                </div>
                {(field.type === "signature" || field.type === "initials") ? (
                  <div>
                    <SignaturePad
                      id={`pad-${field.id}`}
                      label={field.type === "initials" ? "Initials" : "Signature"}
                      height={field.type === "initials" ? 90 : 150}
                      onCapture={data => setFieldResponses(prev => ({ ...prev, [field.id]: data || "" }))}
                    />
                  </div>
                ) : field.type === "date" ? (
                  <Input id={`field-input-${field.id}`} type="date" className="text-sm max-w-xs"
                    value={fieldResponses[field.id] || ""}
                    onChange={e => setFieldResponses(prev => ({ ...prev, [field.id]: e.target.value }))} />
                ) : field.type === "notes" ? (
                  <textarea
                    id={`field-input-${field.id}`}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={4}
                    placeholder={field.defaultValue || `Enter ${field.label.toLowerCase()}`}
                    value={fieldResponses[field.id] || ""}
                    onChange={e => setFieldResponses(prev => ({ ...prev, [field.id]: e.target.value }))}
                  />
                ) : (
                  <Input id={`field-input-${field.id}`} className="text-sm"
                    placeholder={field.defaultValue || `Enter ${field.label.toLowerCase()}`}
                    value={fieldResponses[field.id] || ""}
                    onChange={e => setFieldResponses(prev => ({ ...prev, [field.id]: e.target.value }))} />
                )}
                {errorStep === `field-${field.id}` && !fieldResponses[field.id]?.trim() && <p role="alert" className="text-sm text-red-700">{formError}</p>}
              </div>
            ))}

            {/* Submit */}
            <div className="pt-2 border-t space-y-3">
              <div ref={el => { stepRefs.current.consent = el; }} className="flex items-start gap-2 scroll-mt-24" onFocus={() => setActiveStep("consent")}>
                <input id="doc-sign-consent" type="checkbox" checked={consented} onChange={e => setConsented(e.target.checked)} className="mt-1" />
                <Label htmlFor="doc-sign-consent" className="text-sm text-gray-700 font-normal">
                  I have reviewed and agree to all documents above, and consent to signing electronically. <span className="text-red-500">*</span>
                </Label>
              </div>
              {errorStep === "consent" && !consented && <p role="alert" className="text-sm text-red-700">{formError}</p>}
              {formError && !errorStep && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{formError}</p>}
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-blue-700 hover:bg-blue-800 text-white w-full h-11 text-sm font-semibold disabled:opacity-50"
                data-testid="button-submit-signature"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting…
                  </span>
                ) : `Finish & Sign Document${files.length > 1 ? "s" : ""}`}
              </Button>
              <p className="text-xs text-gray-400 text-center">
                By submitting, you confirm you have read and agree to all documents above.
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 pb-4">Powered by QuoteUs.ca</p>
      </div>
    </div>
  );
}
