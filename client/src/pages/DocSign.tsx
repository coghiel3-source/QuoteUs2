import { useEffect, useRef, useState } from "react";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
}

function SignaturePad({
  id,
  height = 140,
  onCapture,
}: {
  id: string;
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
          width={600}
          height={height * 2}
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
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const docViewerRef = useRef<HTMLDivElement>(null);
  const hasUserScrolledRef = useRef(false);

  // Scroll gate — must genuinely scroll past the document viewer before signing is allowed.
  // We require BOTH: (a) the user has performed a scroll interaction, AND (b) the viewer's
  // bottom is at/above the viewport bottom. Edge case: if the page is not scrollable at all
  // (document already fits in viewport), unlock automatically after mount.
  useEffect(() => {
    // Reset on document set change so a fresh document always gates again
    setScrolledToBottom(false);
    hasUserScrolledRef.current = false;

    const check = () => {
      const viewer = docViewerRef.current;
      if (!viewer) return;
      const viewerBottom = viewer.getBoundingClientRect().bottom;
      if (viewerBottom <= window.innerHeight + 20) setScrolledToBottom(true);
    };
    const onScroll = () => {
      hasUserScrolledRef.current = true;
      check();
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    // After layout settles, if there is nothing to scroll, unlock automatically.
    const t = setTimeout(() => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight > 10;
      if (!scrollable) setScrolledToBottom(true);
      else if (hasUserScrolledRef.current) check();
    }, 400);

    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(t);
    };
  }, [files.length, loading]);

  const getDocPage = (i: number) => docPages[i] ?? 1;
  const setDocPage = (i: number, p: number) => setDocPages(prev => ({ ...prev, [i]: Math.max(1, p) }));

  // Jump to the page a field lives on when the user focuses it
  const focusField = (field: SignatureField) => {
    if (field.page && field.page >= 1) {
      setDocPage(activeDoc, field.page);
    }
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

  const validate = () => {
    if (!signerName.trim()) return "Please enter your full name.";
    if (!hasSignatureField && !mainSigData) return "Please draw your signature.";
    for (const f of allFields) {
      if (f.required && !fieldResponses[f.id]) return `"${f.label}" is required.`;
    }
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { alert(err); return; }
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
      setSubmitted(true);
    } catch (e: any) {
      alert(e.message || "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const totalRequired = allFields.filter(f => f.required).length + (hasSignatureField ? 0 : 1);
  const filled = allFields.filter(f => f.required && fieldResponses[f.id]).length + (hasSignatureField ? 0 : mainSigData ? 1 : 0);
  const pct = totalRequired > 0 ? Math.round((filled / totalRequired) * 100) : 100;

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
        <h2 className="text-xl font-bold text-gray-800 mb-2">Documents Signed</h2>
        <p className="text-gray-500 text-sm">Thank you, <strong>{signerName}</strong>. Your signature has been recorded.</p>
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
            <span className="text-blue-200 text-xs">{filled}/{totalRequired}</span>
          </div>
        )}
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

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
        <div ref={docViewerRef} className="bg-white rounded-2xl border shadow-sm overflow-hidden">

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
            <p className="text-xs text-gray-500 mt-0.5">Review the document above, then fill in the fields below.</p>
          </div>

          <div className="p-5 space-y-5">

            {/* Signer name */}
            <div className="space-y-1.5">
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
            </div>

            {/* Main signature (if no dedicated signature field) */}
            {!hasSignatureField && (
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-gray-700">
                  Signature <span className="text-red-500">*</span>
                </Label>
                <SignaturePad id="main-sig" height={150} onCapture={data => setMainSigData(data)} />
              </div>
            )}

            {/* All required fields */}
            {allFields.map(field => (
              <div key={field.id} className="space-y-1.5">
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <Label className="text-sm font-semibold text-gray-700">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                      <span className="ml-2 text-xs font-normal text-gray-400 capitalize">({field.type})</span>
                    </Label>
                    {/* Page + location hint */}
                    {(field.page || field.hint) && (
                      <p className="text-xs text-blue-600 mt-0.5 flex items-center gap-1">
                        {field.page && (
                          <button
                            onClick={() => { setDocPage(activeDoc, field.page!); window.scrollTo({ top: 0, behavior: "smooth" }); }}
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
                  <div onFocus={() => focusField(field)}>
                    <SignaturePad
                      id={`pad-${field.id}`}
                      height={field.type === "initials" ? 90 : 150}
                      onCapture={data => setFieldResponses(prev => ({ ...prev, [field.id]: data || "" }))}
                    />
                  </div>
                ) : field.type === "date" ? (
                  <Input type="date" className="text-sm max-w-xs"
                    onFocus={() => focusField(field)}
                    value={fieldResponses[field.id] || ""}
                    onChange={e => setFieldResponses(prev => ({ ...prev, [field.id]: e.target.value }))} />
                ) : field.type === "notes" ? (
                  <textarea
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={4}
                    placeholder={field.defaultValue || `Enter ${field.label.toLowerCase()}`}
                    onFocus={() => focusField(field)}
                    value={fieldResponses[field.id] || ""}
                    onChange={e => setFieldResponses(prev => ({ ...prev, [field.id]: e.target.value }))}
                  />
                ) : (
                  <Input className="text-sm"
                    placeholder={field.defaultValue || `Enter ${field.label.toLowerCase()}`}
                    onFocus={() => focusField(field)}
                    value={fieldResponses[field.id] || ""}
                    onChange={e => setFieldResponses(prev => ({ ...prev, [field.id]: e.target.value }))} />
                )}
              </div>
            ))}

            {/* Submit */}
            <div className="pt-2 border-t space-y-3">
              {!scrolledToBottom && (
                <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 flex items-start gap-3" data-testid="banner-scroll-required">
                  <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-900">Please scroll to the bottom of the agreement</p>
                    <p className="text-xs text-amber-700 mt-0.5">You must review the entire document before you can sign.</p>
                  </div>
                  <button
                    onClick={() => {
                      const v = docViewerRef.current;
                      if (v) window.scrollTo({ top: v.offsetTop + v.offsetHeight - window.innerHeight + 40, behavior: "smooth" });
                    }}
                    className="text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg shrink-0"
                    data-testid="button-scroll-to-bottom"
                  >
                    Scroll down
                  </button>
                </div>
              )}
              <Button
                onClick={handleSubmit}
                disabled={submitting || !signerName.trim() || (!hasSignatureField && !mainSigData) || !scrolledToBottom}
                className="bg-blue-700 hover:bg-blue-800 text-white w-full h-11 text-sm font-semibold disabled:opacity-50"
                data-testid="button-submit-signature"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting…
                  </span>
                ) : !scrolledToBottom ? "Scroll to bottom to sign" : `Submit Signed Document${files.length > 1 ? "s" : ""}`}
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
