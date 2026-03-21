import { useState, useEffect, useRef } from "react";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import type { RgLead, DocumentRequest, RepDocument } from "@shared/schema";
import { FileText, Upload, Check, AlertCircle, Home, CloudUpload, X } from "lucide-react";

interface UploadInfo {
  request: DocumentRequest;
  lead: RgLead;
  uploadedDocs: RepDocument[];
}

export default function DocUpload() {
  const [, params] = useRoute("/doc-upload/:token");
  const token = params?.token;
  const { toast } = useToast();

  const [info, setInfo] = useState<UploadInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<RepDocument[]>([]);

  // Upload state per doc type
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [selectedDocType, setSelectedDocType] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (token) loadInfo();
  }, [token]);

  async function loadInfo() {
    setLoading(true);
    try {
      const data = await apiRequest<UploadInfo>(`/upload/${token}`);
      setInfo(data);
      setUploadedDocs(data.uploadedDocs || []);
      if (data.request.requiredDocs && data.request.requiredDocs.length > 0) {
        setSelectedDocType(data.request.requiredDocs[0]);
      } else {
        setSelectedDocType("Other");
      }
    } catch (err: any) {
      setError(err.message || "This upload link is invalid or has expired.");
    } finally {
      setLoading(false);
    }
  }

  async function uploadFile(file: File) {
    if (!selectedDocType) {
      toast({ title: "Please select a document type first", variant: "destructive" });
      return;
    }
    setUploading(prev => ({ ...prev, [selectedDocType]: true }));
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("docType", selectedDocType);
      const res = await fetch(`/api/upload/${token}/file`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Upload failed");
      }
      const doc: RepDocument = await res.json();
      setUploadedDocs(prev => [...prev, doc]);
      toast({ title: "Document uploaded successfully" });
    } catch (err: any) {
      toast({ title: err.message || "Upload failed", variant: "destructive" });
    } finally {
      setUploading(prev => ({ ...prev, [selectedDocType]: false }));
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }

  const isExpired = info?.request.expiresAt && new Date(info.request.expiresAt) < new Date();

  // Determine which required docs still need uploading
  const requiredDocs = info?.request.requiredDocs || [];
  const uploadedDocTypes = new Set(uploadedDocs.map(d => d.docType));
  const pendingDocs = requiredDocs.filter(d => !uploadedDocTypes.has(d));
  const completedDocs = requiredDocs.filter(d => uploadedDocTypes.has(d));
  const allComplete = requiredDocs.length > 0 && pendingDocs.length === 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || isExpired) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="bg-red-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Link Unavailable</h1>
          <p className="text-gray-500">{error || "This upload link has expired. Please contact your representative for a new link."}</p>
        </div>
      </div>
    );
  }

  if (!info) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-blue-600 rounded-2xl p-3 w-14 h-14 mx-auto mb-4 flex items-center justify-center">
            <Home className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Document Upload Portal</h1>
          <p className="text-gray-500 mt-1">QuoteUs.ca — Rent Guarantee Application</p>
        </div>

        {/* Request summary */}
        <div className="bg-white border rounded-2xl p-5 mb-6 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Hello, <strong>{info.request.recipientName}</strong></p>
          <p className="text-sm text-gray-600">
            Your {info.request.recipientType === "tenant" ? "rep" : "rep"} has requested documents for the rent guarantee application at:
          </p>
          <p className="font-semibold text-gray-900 mt-1">{info.lead.propertyAddress}</p>
          <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
            <span>Tenant: {info.lead.tenantName}</span>
            <span>·</span>
            <span>Rent: ${Number(info.lead.monthlyRent).toLocaleString()}/month</span>
            {info.request.expiresAt && (
              <>
                <span>·</span>
                <span>Expires: {new Date(info.request.expiresAt).toLocaleDateString()}</span>
              </>
            )}
          </div>
        </div>

        {/* Required docs checklist */}
        {requiredDocs.length > 0 && (
          <div className="bg-white border rounded-2xl p-5 mb-6 shadow-sm">
            <h2 className="font-semibold text-gray-800 mb-3">Required Documents</h2>
            <div className="space-y-2">
              {requiredDocs.map(doc => {
                const isUploaded = uploadedDocTypes.has(doc);
                return (
                  <div key={doc} className={`flex items-center gap-2.5 py-1.5 px-2 rounded-lg text-sm ${isUploaded ? "bg-green-50" : "bg-gray-50"}`} data-testid={`doc-checklist-${doc.replace(/\s+/g, "-").toLowerCase()}`}>
                    {isUploaded ? (
                      <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-gray-300 flex-shrink-0" />
                    )}
                    <span className={isUploaded ? "text-green-700 line-through" : "text-gray-700"}>{doc}</span>
                    {isUploaded && <Badge className="ml-auto text-xs bg-green-100 text-green-800">Uploaded</Badge>}
                  </div>
                );
              })}
            </div>
            {allComplete && (
              <div className="mt-3 bg-green-50 text-green-700 rounded-lg px-3 py-2 text-sm flex items-center gap-2">
                <Check className="h-4 w-4" /> All required documents have been uploaded!
              </div>
            )}
          </div>
        )}

        {/* Upload area */}
        <div className="bg-white border rounded-2xl p-5 shadow-sm mb-6">
          <h2 className="font-semibold text-gray-800 mb-4">Upload a Document</h2>

          {/* Doc type selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Document Type</label>
            <div className="flex flex-wrap gap-2">
              {[...requiredDocs, ...(requiredDocs.length === 0 ? ["Pay Stub", "ID", "Bank Statement", "Lease", "Other"] : ["Other"])].map(doc => (
                <button
                  key={doc}
                  onClick={() => setSelectedDocType(doc)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${selectedDocType === doc ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"}`}
                  data-testid={`button-doctype-${doc.replace(/\s+/g, "-").toLowerCase()}`}
                >
                  {doc}
                  {uploadedDocTypes.has(doc) && <Check className="inline h-3 w-3 ml-1" />}
                </button>
              ))}
            </div>
          </div>

          {/* Drop zone */}
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${dragOver ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            data-testid="dropzone-upload"
          >
            <CloudUpload className={`h-10 w-10 mx-auto mb-3 ${dragOver ? "text-blue-500" : "text-gray-400"}`} />
            <p className="font-medium text-gray-700">Drop file here or click to browse</p>
            <p className="text-sm text-gray-400 mt-1">PDF, Word, or image files up to 20MB</p>
            {Object.values(uploading).some(Boolean) && (
              <div className="mt-3 flex items-center justify-center gap-2 text-blue-600 text-sm">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                Uploading...
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.heic,.webp"
            onChange={handleFileSelect}
            data-testid="input-file"
          />
        </div>

        {/* Uploaded docs list */}
        {uploadedDocs.length > 0 && (
          <div className="bg-white border rounded-2xl p-5 shadow-sm">
            <h2 className="font-semibold text-gray-800 mb-3">Uploaded Documents ({uploadedDocs.length})</h2>
            <div className="space-y-2">
              {uploadedDocs.map(doc => (
                <div key={doc.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3" data-testid={`uploaded-doc-${doc.id}`}>
                  <div className="bg-blue-50 rounded-lg p-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{doc.fileName}</p>
                    <p className="text-xs text-gray-400">{doc.docType} · {doc.fileSize ? `${Math.round(doc.fileSize / 1024)} KB` : ""}</p>
                  </div>
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-8">
          This secure upload portal is provided by QuoteUs.ca. Your documents are encrypted and shared only with your authorized representative.
        </p>
      </div>
    </div>
  );
}
