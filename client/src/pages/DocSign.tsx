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
}

interface FieldResponse {
  id: string;
  type: FieldType;
  value: string; // base64 for pads, string for text/date
}

// Reusable mini signature pad
function SignaturePad({ id, height = 140, onCapture }: { id: string; height?: number; onCapture: (data: string | null) => void }) {
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
    if (isEmpty) {
      setIsEmpty(false);
      onCapture(canvas.toDataURL("image/png"));
    } else {
      onCapture(canvas.toDataURL("image/png"));
    }
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

  // Main signature (always required even with no custom fields)
  const [mainSigData, setMainSigData] = useState<string | null>(null);
  const [mainSigEmpty, setMainSigEmpty] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/doc-sign/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else {
          setRecord(d);
          setFiles(d.files || []);
          setFields(d.fields || []);
          // Init date fields with today
          const today = new Date().toLocaleDateString("en-CA");
          const initResponses: Record<string, string> = {};
          (d.fields || []).forEach((f: SignatureField) => {
            if (f.type === "date") initResponses[f.id] = today;
          });
          setFieldResponses(initResponses);
        }
        setLoading(false);
      })
      .catch(() => { setError("Failed to load document."); setLoading(false); });
  }, [token]);

  const setFieldResponse = useCallback((id: string, value: string) => {
    setFieldResponses(prev => ({ ...prev, [id]: value }));
  }, []);

  const validate = () => {
    if (!signerName.trim()) return "Please enter your full name.";
    if (!mainSigData) return "Please draw your signature.";
    for (const f of fields) {
      if (f.required && !fieldResponses[f.id]) {
        return `Please complete: ${f.label}`;
      }
    }
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) { alert(validationError); return; }
    setSubmitting(true);
    try {
      const responses = [
        { id: "__main__", type: "signature" as FieldType, value: mainSigData! },
        ...fields.map(f => ({ id: f.id, type: f.type, value: fieldResponses[f.id] || "" })),
      ];
      const res = await fetch(`/api/doc-sign/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatureData: mainSigData, signerName: signerName.trim(), fieldResponses: responses }),
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
        <p className="text-gray-500 text-sm">Your signature has been recorded and the documents are now on file. You may close this window.</p>
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
        <p className="text-gray-600">This was already signed by <strong>{record.signerName}</strong>.</p>
        {record.signedAt && (
          <p className="text-gray-400 text-sm mt-1">Signed on {new Date(record.signedAt).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })}</p>
        )}
      </div>
    </div>
  );

  const currentFile = files[activeDoc];
  const isPdf = (f: any) => f?.mimeType === "application/pdf" || f?.filePath?.endsWith(".pdf");

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-blue-700 text-white rounded-t-xl p-5 flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold">Document Signing Request</h1>
            {record?.propertyAddress && <p className="text-blue-200 text-sm">{record.propertyAddress}</p>}
          </div>
          <div className="ml-auto text-right">
            <p className="text-blue-200 text-xs">For: {record?.landlordName || "Landlord"}</p>
            <p className="text-blue-300 text-xs">{files.length} document{files.length !== 1 ? "s" : ""}</p>
          </div>
        </div>

        {/* Document tabs (if multiple) */}
        {files.length > 1 && (
          <div className="bg-white border-x border-gray-200 flex overflow-x-auto">
            {files.map((f, i) => (
              <button
                key={f.id}
                onClick={() => setActiveDoc(i)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 shrink-0 transition-colors ${activeDoc === i ? "border-blue-600 text-blue-700 bg-blue-50" : "border-transparent text-gray-500 hover:text-gray-700"}`}
              >
                {f.fileName || `Document ${i + 1}`}
              </button>
            ))}
          </div>
        )}

        {/* Document Viewer */}
        {currentFile ? (
          <div className="bg-gray-100 border-x border-gray-200">
            <div className="bg-white border-b px-4 py-2 flex items-center justify-between">
              <p className="text-xs font-medium text-gray-600 truncate max-w-xs">{currentFile.fileName}</p>
              <a href={currentFile.filePath} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline shrink-0">Open in new tab ↗</a>
            </div>
            {isPdf(currentFile) ? (
              <iframe src={currentFile.filePath} className="w-full" style={{ height: "55vh", border: "none" }} title={currentFile.fileName} />
            ) : (
              <div className="flex items-center justify-center p-6 bg-gray-100" style={{ minHeight: "30vh" }}>
                <img src={currentFile.filePath} alt={currentFile.fileName} className="max-w-full max-h-96 object-contain rounded shadow" />
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white border-x border-gray-200 p-8 text-center text-gray-400 text-sm">No documents attached to this request.</div>
        )}

        {/* Signature + Fields Section */}
        <div className="bg-white border border-gray-200 rounded-b-xl p-6 border-t-0 space-y-6">
          <div>
            <h3 className="text-base font-semibold text-gray-800 mb-4">Complete &amp; Sign</h3>
            <div className="space-y-1">
              <Label htmlFor="signerName" className="text-sm font-medium text-gray-700">
                Full Legal Name <span className="text-red-500">*</span>
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
          </div>

          {/* Custom fields */}
          {fields.map(field => (
            <div key={field.id} className="border border-gray-100 rounded-lg p-4 bg-gray-50">
              <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                {field.label} {field.required && <span className="text-red-500">*</span>}
                <span className="ml-2 text-xs font-normal text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded">{field.type}</span>
              </Label>
              {(field.type === "signature" || field.type === "initials") ? (
                <SignaturePad
                  id={`pad-${field.id}`}
                  height={field.type === "initials" ? 80 : 140}
                  onCapture={data => setFieldResponse(field.id, data || "")}
                />
              ) : field.type === "date" ? (
                <Input
                  type="date"
                  className="max-w-xs"
                  value={fieldResponses[field.id] || ""}
                  onChange={e => setFieldResponse(field.id, e.target.value)}
                />
              ) : (
                <Input
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                  value={fieldResponses[field.id] || ""}
                  onChange={e => setFieldResponse(field.id, e.target.value)}
                  className="max-w-sm"
                />
              )}
            </div>
          ))}

          {/* Main signature */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-semibold text-gray-700">
                Signature <span className="text-red-500">*</span>
              </Label>
            </div>
            <SignaturePad
              id="main-signature-pad"
              height={160}
              onCapture={data => { setMainSigData(data); setMainSigEmpty(!data); }}
            />
            {mainSigEmpty && <p className="text-xs text-gray-400 mt-1">Draw your signature in the box above</p>}
          </div>

          <div className="pt-2 border-t">
            <Button
              onClick={handleSubmit}
              disabled={submitting || !mainSigData || !signerName.trim()}
              className="bg-blue-700 hover:bg-blue-800 text-white px-8"
              data-testid="button-submit-signature"
            >
              {submitting ? "Submitting…" : `Submit Signed Document${files.length > 1 ? "s" : ""}`}
            </Button>
            <p className="text-xs text-gray-400 mt-2">
              By submitting, you confirm you have reviewed all documents and agree to their contents.
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">Powered by QuoteUs.ca — Secure document signing</p>
      </div>
    </div>
  );
}
