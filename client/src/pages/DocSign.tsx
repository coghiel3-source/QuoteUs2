import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FieldType = "signature" | "initials" | "date" | "text";

interface SignatureField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  defaultValue?: string; // pre-filled value for contact-info fields
  x?: number;       // % from left of document container
  y?: number;       // % from top of document container
  page?: number;    // which document (0-indexed)
  pageNum?: number; // which PDF page within that document (1-indexed)
  width?: number;   // % of overlay width
  height?: number;  // % of overlay height
}

// ── Signature Pad ─────────────────────────────────────────────────────────────
function SignaturePad({
  id,
  height = 140,
  onCapture,
  initialData,
}: {
  id: string;
  height?: number;
  onCapture: (data: string | null) => void;
  initialData?: string | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const [isEmpty, setIsEmpty] = useState(!initialData);

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
    if (initialData) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      img.src = initialData;
    }
  }, []);

  const getPos = (e: any, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const startDraw = (e: any) => {
    drawing.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    lastPos.current = getPos(e, canvas);
  };

  const draw = (e: any) => {
    if (!drawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx || !lastPos.current) return;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
    setIsEmpty(false);
    onCapture(canvas.toDataURL("image/png"));
  };

  const endDraw = () => { drawing.current = false; lastPos.current = null; };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    onCapture(null);
  };

  return (
    <div>
      <div className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-white touch-none">
        <canvas
          ref={canvasRef}
          id={id}
          width={600}
          height={height}
          className="w-full cursor-crosshair"
          style={{ touchAction: "none" }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
      </div>
      <div className="flex items-center justify-between mt-1">
        {isEmpty && <p className="text-xs text-gray-400">Draw here</p>}
        <button type="button" onClick={clear} className="ml-auto text-xs text-blue-600 hover:underline">Clear</button>
      </div>
    </div>
  );
}

// ── Field type colours ─────────────────────────────────────────────────────────
const FIELD_COLORS: Record<FieldType, string> = {
  signature: "bg-blue-600",
  initials:  "bg-purple-600",
  date:      "bg-emerald-600",
  text:      "bg-gray-500",
};

// ── Field Modal ────────────────────────────────────────────────────────────────
function FieldModal({
  field,
  currentValue,
  onSave,
  onClose,
}: {
  field: SignatureField;
  currentValue: string;
  onSave: (value: string) => void;
  onClose: () => void;
}) {
  const [localValue, setLocalValue] = useState(currentValue);

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`${FIELD_COLORS[field.type]} text-white px-5 py-3 flex items-center justify-between`}>
          <div>
            <p className="font-semibold text-sm">{field.label}</p>
            <p className="text-xs opacity-80 capitalize">{field.type} field</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-lg leading-none">✕</button>
        </div>

        <div className="p-5 space-y-4">
          {(field.type === "signature" || field.type === "initials") && (
            <SignaturePad
              id={`modal-pad-${field.id}`}
              height={field.type === "initials" ? 90 : 160}
              initialData={localValue || null}
              onCapture={data => setLocalValue(data || "")}
            />
          )}

          {field.type === "date" && (
            <div>
              <Label className="text-sm text-gray-700 mb-1 block">Select date</Label>
              <Input
                type="date"
                value={localValue}
                onChange={e => setLocalValue(e.target.value)}
                className="text-sm"
              />
            </div>
          )}

          {field.type === "text" && (
            <div>
              <Label className="text-sm text-gray-700 mb-1 block">{field.label}</Label>
              <Input
                placeholder={`Enter ${field.label.toLowerCase()}…`}
                value={localValue}
                onChange={e => setLocalValue(e.target.value)}
                className="text-sm"
              />
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              onClick={() => { onSave(localValue); onClose(); }}
              disabled={!localValue}
              className="flex-1 bg-blue-700 hover:bg-blue-800"
            >
              Save
            </Button>
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function DocSign() {
  const [, params] = useRoute("/doc-sign/:token");
  const token = params?.token;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [record, setRecord] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [fields, setFields] = useState<SignatureField[]>([]);
  const [activeDoc, setActiveDoc] = useState(0);

  const [signerName, setSignerName] = useState("");
  const [fieldResponses, setFieldResponses] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [signed, setSigned] = useState(false);

  // Per-document current PDF page (docIndex → pageNum, 1-indexed)
  const [docPages, setDocPages] = useState<Record<number, number>>({});
  const getDocPage = (docIdx: number) => docPages[docIdx] ?? 1;
  const setDocPage = (docIdx: number, page: number) =>
    setDocPages(prev => ({ ...prev, [docIdx]: Math.max(1, page) }));

  // Positioned field modal
  const [fieldModal, setFieldModal] = useState<string | null>(null);

  // Main signature (only shown if no positioned signature fields)
  const [mainSigData, setMainSigData] = useState<string | null>(null);

  // Lock html + body scroll on mount so the browser never shows a page-level
  // scrollbar. This prevents the ~15px scrollbar-width shift that occurs when
  // any element (modal, dialog, dropdown) causes the scrollbar to appear/vanish.
  // We only set overflow:hidden — no position:fixed — so there is zero layout impact.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, []);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/doc-sign/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); }
        else {
          setRecord(d);
          setFiles(d.files || []);
          setFields(d.fields || []);
          // Pre-fill date fields with today and any contact-info fields with their defaultValue
          const today = new Date().toLocaleDateString("en-CA");
          const init: Record<string, string> = {};
          (d.fields || []).forEach((f: SignatureField) => {
            if (f.type === "date") init[f.id] = today;
            if (f.defaultValue) init[f.id] = f.defaultValue;
          });
          setFieldResponses(init);
        }
        setLoading(false);
      })
      .catch(() => { setError("Failed to load document."); setLoading(false); });
  }, [token]);

  const setFieldResponse = useCallback((id: string, value: string) => {
    setFieldResponses(prev => ({ ...prev, [id]: value }));
  }, []);

  // Separate positioned vs form fields
  const positionedFields = fields.filter(f => f.x !== undefined && f.y !== undefined);
  const formFields = fields.filter(f => f.x === undefined || f.y === undefined);
  const hasPositionedSig = positionedFields.some(f => f.type === "signature" || f.type === "initials");

  const validate = (): string | null => {
    if (!signerName.trim()) return "Please enter your full name.";
    if (!hasPositionedSig && !mainSigData) return "Please draw your signature.";
    for (const f of fields) {
      if (f.required && !fieldResponses[f.id]) {
        return `Please complete: ${f.label}`;
      }
    }
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { alert(err); return; }
    setSubmitting(true);
    try {
      const sig = mainSigData || fieldResponses[positionedFields.find(f => f.type === "signature")?.id || ""] || "";
      const responses = [
        { id: "__main__", type: "signature" as FieldType, value: sig },
        ...fields.map(f => ({ id: f.id, type: f.type, value: fieldResponses[f.id] || "" })),
      ];
      const res = await fetch(`/api/doc-sign/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatureData: sig, signerName: signerName.trim(), fieldResponses: responses }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to submit");
      setSigned(true);
    } catch (err: any) {
      alert(err.message || "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Status screens ────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-600">Loading document…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl shadow p-8 max-w-md text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Document Not Found</h2>
        <p className="text-gray-600">{error}</p>
      </div>
    </div>
  );

  if (signed) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl shadow p-8 max-w-md text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">All Done!</h2>
        <p className="text-gray-600 mb-1">Thank you, <strong>{signerName}</strong>.</p>
        <p className="text-gray-500 text-sm">Your signature has been recorded. You may close this window.</p>
      </div>
    </div>
  );

  if (record?.status === "signed") return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl shadow p-8 max-w-md text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Already Signed</h2>
        <p className="text-gray-600">Signed by <strong>{record.signerName}</strong>.</p>
        {record.signedAt && (
          <p className="text-gray-400 text-sm mt-1">{new Date(record.signedAt).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })}</p>
        )}
      </div>
    </div>
  );

  const currentFile = files[activeDoc];
  const isPdf = (f: any) => f?.mimeType === "application/pdf" || f?.filePath?.endsWith(".pdf");

  // Completion progress
  const totalRequired = fields.filter(f => f.required).length + (hasPositionedSig ? 0 : 1);
  const filled = fields.filter(f => f.required && fieldResponses[f.id]).length + (hasPositionedSig ? 0 : mainSigData ? 1 : 0);
  const pct = totalRequired > 0 ? Math.round((filled / totalRequired) * 100) : 100;

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-gray-50">

      {/* ── Header (shrink-to-content, never scrolls away) ── */}
      <div className="bg-blue-700 text-white px-4 py-3 flex items-center gap-3 shrink-0">
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
            <div className="w-24 h-1.5 bg-white/30 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-blue-200 text-xs">{filled}/{totalRequired}</span>
          </div>
        )}
      </div>

      {/* ── Main area: document (left, fills space) + controls (right, own scroll) ── */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">

        {/* LEFT — document viewer (never causes page scroll) */}
        <div className="flex-1 overflow-hidden flex flex-col bg-white border-r">

          {/* Doc tabs */}
          {files.length > 1 && (
            <div className="flex overflow-x-auto border-b bg-gray-50 shrink-0">
              {files.map((f, i) => {
                const fieldsOnDoc = positionedFields.filter(field => (field.page ?? 0) === i);
                const filledOnDoc = fieldsOnDoc.filter(field => fieldResponses[field.id]).length;
                return (
                  <button
                    key={f.id}
                    onClick={() => setActiveDoc(i)}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 shrink-0 transition-colors flex items-center gap-2 ${activeDoc === i ? "border-blue-600 text-blue-700 bg-white" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                  >
                    {f.fileName || `Doc ${i + 1}`}
                    {fieldsOnDoc.length > 0 && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${filledOnDoc === fieldsOnDoc.length ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                        {filledOnDoc}/{fieldsOnDoc.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Document + overlay */}
          {currentFile ? (
            <>
              <div className="bg-gray-50 px-4 py-1.5 border-b flex items-center justify-between shrink-0">
                <p className="text-xs font-medium text-gray-600 truncate">{currentFile.fileName}</p>
                <a href={currentFile.filePath} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline shrink-0 ml-4">Open ↗</a>
              </div>

              {/* Page nav + field hint bar */}
              {(() => {
                const currentPage = getDocPage(activeDoc);
                const fieldsOnThisPage = positionedFields.filter(f => (f.page ?? 0) === activeDoc && (f.pageNum ?? 1) === currentPage);
                const isPdfFile = isPdf(currentFile);
                return (
                  <>
                    <div className="flex items-center gap-3 px-4 py-2 border-b bg-gray-50">
                      {fieldsOnThisPage.length > 0 ? (
                        <div className="flex items-center gap-1.5 flex-1">
                          <svg className="h-4 w-4 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" />
                          </svg>
                          <p className="text-xs text-blue-700">Click the highlighted fields to sign or fill them in.</p>
                        </div>
                      ) : <span className="flex-1" />}
                      {isPdfFile && (
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-xs text-gray-500">Page:</span>
                          <button onClick={() => setDocPage(activeDoc, currentPage - 1)} disabled={currentPage <= 1}
                            className="w-6 h-6 rounded border bg-white text-gray-700 text-xs font-bold flex items-center justify-center disabled:opacity-30 hover:bg-gray-100">‹</button>
                          <span className="text-xs font-semibold text-gray-700 min-w-[1.5rem] text-center">{currentPage}</span>
                          <button onClick={() => setDocPage(activeDoc, currentPage + 1)}
                            className="w-6 h-6 rounded border bg-white text-gray-700 text-xs font-bold flex items-center justify-center hover:bg-gray-100">›</button>
                        </div>
                      )}
                    </div>

                    <div className="relative overflow-hidden flex-1 flex flex-col">
                      {isPdfFile ? (
                        <iframe
                          key={`${activeDoc}-${currentPage}`}
                          src={`${currentFile.filePath}#page=${currentPage}&toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                          className="w-full flex-1"
                          scrolling="no"
                          style={{ border: "none", display: "block", minHeight: 0, overflow: "hidden", pointerEvents: "none" }}
                          title={currentFile.fileName}
                        />
                      ) : (
                        <div className="flex items-center justify-center p-6 bg-gray-100 flex-1 overflow-auto">
                          <img src={currentFile.filePath} alt={currentFile.fileName} className="max-w-full object-contain rounded shadow" />
                        </div>
                      )}

                      {/* Positioned field overlays — only for this page */}
                      {fieldsOnThisPage.length > 0 && (
                        <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 10 }}>
                          {fieldsOnThisPage.map(f => {
                            const isFilled = !!fieldResponses[f.id];
                            const w = f.width ?? 14;
                            const h = f.height ?? 6;
                            return (
                              <div
                                key={f.id}
                                style={{
                                  position: "absolute",
                                  left: `${f.x}%`,
                                  top: `${f.y}%`,
                                  width: `${w}%`,
                                  height: `${h}%`,
                                  minWidth: 80,
                                  minHeight: 28,
                                  pointerEvents: "auto",
                                }}
                                onClick={() => setFieldModal(f.id)}
                                className="cursor-pointer select-none"
                              >
                                {isFilled ? (
                                  f.type === "text" && fieldResponses[f.id] ? (
                                    /* Contact-info / text fields: show the actual value */
                                    <div className="bg-green-500 w-full h-full rounded-lg shadow-lg border-2 border-white/50 flex flex-col justify-center px-2 text-white overflow-hidden cursor-pointer"
                                      onClick={() => setFieldModal(f.id)}>
                                      <p className="text-[10px] text-white/70 leading-none truncate">{f.label}</p>
                                      <p className="text-xs font-semibold truncate">{fieldResponses[f.id]}</p>
                                    </div>
                                  ) : (
                                    <div className="bg-green-500 w-full h-full rounded-lg shadow-lg border-2 border-white/50 flex items-center gap-1.5 px-2 text-white text-xs font-semibold overflow-hidden">
                                      <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                      </svg>
                                      <span className="truncate">{f.label}</span>
                                    </div>
                                  )
                                ) : (
                                  <div
                                    className={`${FIELD_COLORS[f.type]} w-full h-full rounded-lg shadow-lg border-2 border-white/50 hover:border-white/90 flex items-center gap-1.5 px-2 text-white text-xs font-semibold overflow-hidden transition-all`}
                                  >
                                    <span className="shrink-0">✎</span>
                                    <span className="truncate">{f.label}</span>
                                    {f.required && <span className="text-red-300 shrink-0">*</span>}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">No documents attached.</div>
          )}
        </div>{/* ── end LEFT panel ── */}

        {/* RIGHT — controls panel (own scroll, completely isolated from document) */}
        <div className="w-full md:w-72 shrink-0 overflow-y-auto bg-gray-50 border-t md:border-t-0 md:border-l flex flex-col">
          <div className="p-4 space-y-4 flex-1">

            {/* Signer name */}
            <div className="bg-white rounded-lg border p-3">
              <Label htmlFor="signerName" className="text-xs font-semibold text-gray-700 block mb-1.5">
                Your Full Legal Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="signerName"
                data-testid="input-signer-name"
                placeholder="Full name as on ID"
                value={signerName}
                onChange={e => setSignerName(e.target.value)}
                className="text-sm"
              />
            </div>

            {/* Form fields (no positions) */}
            {formFields.length > 0 && (
              <div className="bg-white rounded-lg border p-3 space-y-3">
                <p className="text-xs font-semibold text-gray-700">Additional Fields</p>
                {formFields.map(field => (
                  <div key={field.id} className="space-y-1">
                    <Label className="text-xs font-medium text-gray-700">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </Label>
                    {(field.type === "signature" || field.type === "initials") ? (
                      <SignaturePad
                        id={`pad-${field.id}`}
                        height={field.type === "initials" ? 70 : 120}
                        onCapture={data => setFieldResponse(field.id, data || "")}
                      />
                    ) : field.type === "date" ? (
                      <Input type="date" className="text-sm" value={fieldResponses[field.id] || ""} onChange={e => setFieldResponse(field.id, e.target.value)} />
                    ) : (
                      <Input placeholder={`Enter ${field.label.toLowerCase()}`} value={fieldResponses[field.id] || ""} onChange={e => setFieldResponse(field.id, e.target.value)} className="text-sm" />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Main signature (only when no positioned sig fields) */}
            {!hasPositionedSig && (
              <div className="bg-white rounded-lg border p-3">
                <Label className="text-xs font-semibold text-gray-700 block mb-1.5">
                  Signature <span className="text-red-500">*</span>
                </Label>
                <SignaturePad
                  id="main-signature-pad"
                  height={140}
                  onCapture={data => setMainSigData(data)}
                />
                {!mainSigData && <p className="text-xs text-gray-400 mt-1">Draw your signature above</p>}
              </div>
            )}

            {/* Positioned fields checklist */}
            {positionedFields.length > 0 && (
              <div className="bg-white rounded-lg border p-3">
                <p className="text-xs font-semibold text-gray-700 mb-2">Fields to Complete</p>
                <div className="space-y-1.5">
                  {positionedFields.map(f => {
                    const isFilled = !!fieldResponses[f.id];
                    const docName = files[(f.page ?? 0)]?.fileName || `Doc ${(f.page ?? 0) + 1}`;
                    return (
                      <div
                        key={f.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors text-xs ${isFilled ? "border-green-200 bg-green-50" : "border-gray-200 hover:border-blue-300 hover:bg-blue-50"}`}
                        onClick={() => { setActiveDoc(f.page ?? 0); setFieldModal(f.id); }}
                      >
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${isFilled ? "bg-green-500" : "bg-gray-200"}`}>
                          {isFilled ? (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : <span className="text-gray-400" style={{ fontSize: 8 }}>✎</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium truncate ${isFilled ? "text-green-700" : "text-gray-700"}`}>{f.label}</p>
                          <p className="text-gray-400 capitalize truncate">{f.type} · {docName}</p>
                        </div>
                        {!isFilled && <span className="text-blue-600 font-medium shrink-0">Fill →</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Submit */}
            <div className="bg-white rounded-lg border p-3">
              <Button
                onClick={handleSubmit}
                disabled={submitting || !signerName.trim() || (!hasPositionedSig && !mainSigData)}
                className="bg-blue-700 hover:bg-blue-800 text-white w-full"
                data-testid="button-submit-signature"
              >
                {submitting ? "Submitting…" : `Submit Signed Document${files.length > 1 ? "s" : ""}`}
              </Button>
              <p className="text-xs text-gray-400 mt-2">By submitting you confirm you have reviewed all documents.</p>
            </div>

            <p className="text-center text-xs text-gray-400 pb-2">Powered by QuoteUs.ca</p>
          </div>
        </div>{/* ── end RIGHT panel ── */}

      </div>{/* ── end main area ── */}

      {/* ── Field Fill Modal — rendered via portal at document.body so it sits  ──
           completely outside this component's DOM subtree. This guarantees that
           no CSS transform, overflow, or stacking context from the signing page
           can affect the modal's position or cause any layout shift. ── */}
      {fieldModal && (() => {
        const field = fields.find(f => f.id === fieldModal);
        if (!field) return null;
        return createPortal(
          <FieldModal
            field={field}
            currentValue={fieldResponses[fieldModal] || ""}
            onSave={value => setFieldResponse(fieldModal, value)}
            onClose={() => setFieldModal(null)}
          />,
          document.body
        );
      })()}

    </div>
  );
}
