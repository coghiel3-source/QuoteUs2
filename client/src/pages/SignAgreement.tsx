import { useEffect, useRef, useState } from "react";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignAgreement() {
  const [, params] = useRoute("/sign/:token");
  const token = params?.token;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [signerName, setSignerName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [signed, setSigned] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/sign/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); } else { setData(d); }
        setLoading(false);
      })
      .catch(() => { setError("Failed to load agreement."); setLoading(false); });
  }, [token]);

  // Setup canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [data]);

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
    setIsEmpty(false);
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
  };

  const endDraw = () => { drawing.current = false; lastPos.current = null; };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  };

  const handleSubmit = async () => {
    if (isEmpty) { alert("Please sign the agreement before submitting."); return; }
    if (!signerName.trim()) { alert("Please enter your full name."); return; }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const signatureData = canvas.toDataURL("image/png");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/sign/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatureData, signerName: signerName.trim() }),
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

  const renderContent = (content: string) => {
    if (!data?.request) return content;
    const r = data.request;
    return content
      .replace(/\{\{landlord_name\}\}/g, r.landlordName || "")
      .replace(/\{\{landlord_email\}\}/g, r.landlordEmail || "")
      .replace(/\{\{property_address\}\}/g, r.propertyAddress || "")
      .replace(/\{\{date\}\}/g, new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" }));
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-600">Loading agreement…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl shadow p-8 max-w-md text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Agreement Not Found</h2>
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
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Agreement Signed!</h2>
        <p className="text-gray-600 mb-1">Thank you, <strong>{signerName}</strong>.</p>
        <p className="text-gray-500 text-sm">Your signature has been recorded successfully. You may close this window.</p>
      </div>
    </div>
  );

  if (data?.request?.status === "signed") return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl shadow p-8 max-w-md text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Already Signed</h2>
        <p className="text-gray-600">This agreement has already been signed by <strong>{data.request.signerName}</strong>.</p>
        {data.request.signedAt && (
          <p className="text-gray-400 text-sm mt-1">
            Signed on {new Date(data.request.signedAt).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        )}
      </div>
    </div>
  );

  const template = data?.template;
  const request = data?.request;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-blue-700 text-white rounded-t-xl p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold">{template?.title || "Agreement"}</h1>
              {request?.propertyAddress && (
                <p className="text-blue-200 text-sm mt-0.5">{request.propertyAddress}</p>
              )}
            </div>
          </div>
        </div>

        {/* Agreement Body */}
        <div className="bg-white border-x border-gray-200 p-8">
          <div
            className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap"
            style={{ fontFamily: "Georgia, serif", fontSize: "14px", lineHeight: "1.8" }}
          >
            {template?.content ? renderContent(template.content) : (
              <p className="text-gray-400 italic">No agreement content has been configured.</p>
            )}
          </div>
        </div>

        {/* Signature Section */}
        <div className="bg-white border border-gray-200 rounded-b-xl p-6 mt-0 border-t-0">
          <h3 className="text-base font-semibold text-gray-800 mb-4">Sign Below</h3>
          <div className="grid gap-5">
            <div>
              <Label htmlFor="signerName" className="text-sm font-medium text-gray-700 mb-1 block">
                Full Legal Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="signerName"
                data-testid="input-signer-name"
                placeholder="Enter your full name"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                className="max-w-sm"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-sm font-medium text-gray-700">
                  Signature <span className="text-red-500">*</span>
                </Label>
                <button
                  type="button"
                  onClick={clearSignature}
                  className="text-xs text-blue-600 hover:underline"
                  data-testid="button-clear-signature"
                >
                  Clear
                </button>
              </div>
              <div className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-white touch-none">
                <canvas
                  ref={canvasRef}
                  width={700}
                  height={160}
                  className="w-full cursor-crosshair"
                  style={{ touchAction: "none" }}
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={endDraw}
                  onMouseLeave={endDraw}
                  onTouchStart={startDraw}
                  onTouchMove={draw}
                  onTouchEnd={endDraw}
                  data-testid="canvas-signature"
                />
              </div>
              {isEmpty && (
                <p className="text-xs text-gray-400 mt-1">Draw your signature in the box above</p>
              )}
            </div>

            <div className="pt-2">
              <Button
                onClick={handleSubmit}
                disabled={submitting || isEmpty || !signerName.trim()}
                className="bg-blue-700 hover:bg-blue-800 text-white px-8"
                data-testid="button-submit-signature"
              >
                {submitting ? "Submitting…" : "Submit Signed Agreement"}
              </Button>
              <p className="text-xs text-gray-400 mt-2">
                By submitting, you confirm that you have read and agree to the terms of this agreement.
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Powered by QuoteUs.ca &mdash; Secure digital agreements
        </p>
      </div>
    </div>
  );
}
