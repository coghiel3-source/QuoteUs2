import { useEffect, useRef, useState, useCallback } from "react";
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

  // Lock body scroll while modal is open so canvas init can't trigger page jump
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

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
          // Pre-fill date fields
          const today = new Date().toLocaleDateString("en-CA");
          const init: Record<string, string> = {};
          (d.fields || []).forEach((f: SignatureField) => {
            if (f.type === "date") init[f.id] = today;
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
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ── */}
      <div className="bg-blue-700 text-white px-4 py-4 flex items-center gap-3">
        <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold">Document Signing Request</h1>
          {record?.propertyAddress && <p className="text-blue-200 text-xs truncate">{record.propertyAddress}</p>}
        </div>
        <div className="text-right shrink-0">
          <p className="text-blue-200 text-xs">{record?.landlordName}</p>
          <p className="text-blue-300 text-xs">{files.length} doc{files.length !== 1 ? "s" : ""} · {positionedFields.length} field{positionedFields.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* ── Progress bar ── */}
      {totalRequired > 0 && (
        <div className="bg-white border-b px-4 py-2">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-gray-500 shrink-0">{filled}/{totalRequired} fields</span>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto py-6 px-4 space-y-4">
        {/* ── Signer Name ── */}
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <Label htmlFor="signerName" className="text-sm font-semibold text-gray-700 block mb-2">
            Your Full Legal Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="signerName"
            data-testid="input-signer-name"
            placeholder="Enter your full name as it appears on ID"
            value={signerName}
            onChange={e => setSignerName(e.target.value)}
            className="max-w-sm"
          />
        </div>

        {/* ── Document viewer with positioned fields ── */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {/* Doc tabs */}
          {files.length > 1 && (
            <div className="flex overflow-x-auto border-b bg-gray-50">
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
              <div className="bg-gray-50 px-4 py-2 border-b flex items-center justify-between">
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

                    <div className="relative overflow-hidden" style={{ height: isPdfFile ? "75vh" : "auto" }}>
                      {isPdfFile ? (
                        <iframe
                          key={`${activeDoc}-${currentPage}`}
                          src={`${currentFile.filePath}#page=${currentPage}`}
                          className="w-full h-full"
                          style={{ border: "none", display: "block" }}
                          title={currentFile.fileName}
                        />
                      ) : (
                        <div className="flex items-center justify-center p-6 bg-gray-100 h-full overflow-auto">
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
                                  <div className="bg-green-500 w-full h-full rounded-lg shadow-lg border-2 border-white/50 flex items-center gap-1.5 px-2 text-white text-xs font-semibold overflow-hidden">
                                    <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span className="truncate">{f.label}</span>
                                  </div>
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
            <div className="p-8 text-center text-gray-400 text-sm">No documents attached.</div>
          )}
        </div>

        {/* ── Form fields (no positions) ── */}
        {formFields.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">Additional Fields</h3>
            {formFields.map(field => (
              <div key={field.id} className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                  <span className="ml-2 text-xs font-normal text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded capitalize">{field.type}</span>
                </Label>
                {(field.type === "signature" || field.type === "initials") ? (
                  <SignaturePad
                    id={`pad-${field.id}`}
                    height={field.type === "initials" ? 80 : 140}
                    onCapture={data => setFieldResponse(field.id, data || "")}
                  />
                ) : field.type === "date" ? (
                  <Input type="date" className="max-w-xs" value={fieldResponses[field.id] || ""} onChange={e => setFieldResponse(field.id, e.target.value)} />
                ) : (
                  <Input placeholder={`Enter ${field.label.toLowerCase()}`} value={fieldResponses[field.id] || ""} onChange={e => setFieldResponse(field.id, e.target.value)} className="max-w-sm" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Main signature (only if no positioned signature fields) ── */}
        {!hasPositionedSig && (
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <Label className="text-sm font-semibold text-gray-700 block mb-3">
              Signature <span className="text-red-500">*</span>
            </Label>
            <SignaturePad
              id="main-signature-pad"
              height={160}
              onCapture={data => setMainSigData(data)}
            />
            {!mainSigData && <p className="text-xs text-gray-400 mt-1">Draw your signature above</p>}
          </div>
        )}

        {/* ── Positioned fields checklist ── */}
        {positionedFields.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Fields to Complete</h3>
            <div className="space-y-2">
              {positionedFields.map(f => {
                const isFilled = !!fieldResponses[f.id];
                const docName = files[(f.page ?? 0)]?.fileName || `Document ${(f.page ?? 0) + 1}`;
                return (
                  <div
                    key={f.id}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${isFilled ? "border-green-200 bg-green-50" : "border-gray-200 hover:border-blue-200 hover:bg-blue-50"}`}
                    onClick={() => { setActiveDoc(f.page ?? 0); setFieldModal(f.id); }}
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${isFilled ? "bg-green-500" : "bg-gray-200"}`}>
                      {isFilled ? (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : <span className="text-gray-400 text-xs">✎</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${isFilled ? "text-green-700" : "text-gray-700"}`}>{f.label}</p>
                      <p className="text-xs text-gray-400 capitalize">{f.type} · {docName}</p>
                    </div>
                    {!isFilled && (
                      <span className="text-xs text-blue-600 font-medium shrink-0">Click to fill →</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Submit ── */}
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <Button
            onClick={handleSubmit}
            disabled={submitting || !signerName.trim() || (!hasPositionedSig && !mainSigData)}
            className="bg-blue-700 hover:bg-blue-800 text-white w-full sm:w-auto px-8"
            data-testid="button-submit-signature"
          >
            {submitting ? "Submitting…" : `Submit Signed Document${files.length > 1 ? "s" : ""}`}
          </Button>
          <p className="text-xs text-gray-400 mt-2">By submitting, you confirm you have reviewed all documents and agree to their contents.</p>
        </div>

        <p className="text-center text-xs text-gray-400 pb-4">Powered by QuoteUs.ca — Secure document signing</p>
      </div>

      {/* ── Field Fill Modal ── */}
      {fieldModal && (() => {
        const field = fields.find(f => f.id === fieldModal);
        if (!field) return null;
        return (
          <FieldModal
            field={field}
            currentValue={fieldResponses[fieldModal] || ""}
            onSave={value => setFieldResponse(fieldModal, value)}
            onClose={() => setFieldModal(null)}
          />
        );
      })()}
    </div>
  );
}
