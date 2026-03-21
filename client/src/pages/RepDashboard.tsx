import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import type { RgLead, DocumentRequest, RepDocument } from "@shared/schema";
import {
  Home, Plus, Search, FileText, Upload, Send, Eye, Trash2,
  ChevronRight, X, RefreshCw, AlertCircle, Check, Clock, ExternalLink, Copy
} from "lucide-react";

type Status = "New" | "Contacted" | "Documents Pending" | "Documents Received" | "Submitted" | "Approved" | "Declined";

const STATUS_COLORS: Record<Status, string> = {
  "New": "bg-blue-100 text-blue-800",
  "Contacted": "bg-yellow-100 text-yellow-800",
  "Documents Pending": "bg-orange-100 text-orange-800",
  "Documents Received": "bg-purple-100 text-purple-800",
  "Submitted": "bg-indigo-100 text-indigo-800",
  "Approved": "bg-green-100 text-green-800",
  "Declined": "bg-red-100 text-red-800",
};

const EMPLOYMENT_STATUSES = ["Employed Full-Time", "Employed Part-Time", "Self-Employed", "Student", "Retired", "Unemployed", "Other"];

const TENANT_DOC_TYPES = ["Pay Stubs (Last 3 Months)", "T4 / Notice of Assessment", "Bank Statements (3 Months)", "Credit Check Authorization", "Government ID", "Employment Letter", "Other"];
const LANDLORD_DOC_TYPES = ["Lease Agreement", "Property Deed / Ownership Proof", "Property Insurance", "Government ID", "Other"];

export default function RepDashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [leads, setLeads] = useState<RgLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"leads" | "new">("leads");

  // Selected lead detail
  const [selectedLead, setSelectedLead] = useState<RgLead | null>(null);
  const [docRequests, setDocRequests] = useState<DocumentRequest[]>([]);
  const [documents, setDocuments] = useState<RepDocument[]>([]);
  const [detailTab, setDetailTab] = useState<"info" | "docs">("info");

  // New lead form
  const [newLead, setNewLead] = useState({
    tenantName: "", tenantEmail: "", tenantPhone: "", employmentStatus: "",
    landlordName: "", landlordEmail: "", landlordPhone: "",
    propertyAddress: "", monthlyRent: "", coApplicantName: "", coApplicantEmail: "",
    moveInDate: "", notes: ""
  });

  // Status update
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Send document request dialog
  const [showDocRequest, setShowDocRequest] = useState(false);
  const [docReqForm, setDocReqForm] = useState({
    recipientType: "tenant", recipientName: "", recipientEmail: "",
    requiredDocs: [] as string[], expiresInDays: 7
  });
  const [sendingDocReq, setSendingDocReq] = useState(false);
  const [createdLink, setCreatedLink] = useState<string | null>(null);

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isAdminOrManager = user?.role === "admin" || user?.role === "manager";

  useEffect(() => {
    if (!user || !["rep", "admin", "manager"].includes(user.role)) {
      navigate("/");
    } else {
      loadLeads();
    }
  }, [user]);

  async function loadLeads() {
    if (!user) return;
    setLoading(true);
    try {
      const data = await apiRequest<RgLead[]>(`/rep/leads?actorId=${user.id}`);
      setLeads(data || []);
    } catch {
      toast({ title: "Failed to load leads", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function openLead(lead: RgLead) {
    setSelectedLead(lead);
    setDetailTab("info");
    setCreatedLink(null);
    if (!user) return;
    try {
      const [reqs, docs] = await Promise.all([
        apiRequest<DocumentRequest[]>(`/rep/leads/${lead.id}/requests?actorId=${user.id}`),
        apiRequest<RepDocument[]>(`/rep/leads/${lead.id}/documents?actorId=${user.id}`),
      ]);
      setDocRequests(reqs || []);
      setDocuments(docs || []);
    } catch {}
  }

  async function handleCreateLead(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!newLead.tenantName || !newLead.tenantEmail || !newLead.tenantPhone || !newLead.landlordName || !newLead.landlordEmail || !newLead.propertyAddress || !newLead.monthlyRent || !newLead.employmentStatus) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    try {
      const created = await apiRequest<RgLead>("/rep/leads", {
        method: "POST",
        body: JSON.stringify({ actorId: user.id, ...newLead }),
      });
      setLeads(prev => [created, ...prev]);
      setNewLead({ tenantName: "", tenantEmail: "", tenantPhone: "", employmentStatus: "", landlordName: "", landlordEmail: "", landlordPhone: "", propertyAddress: "", monthlyRent: "", coApplicantName: "", coApplicantEmail: "", moveInDate: "", notes: "" });
      toast({ title: "Lead created successfully" });
      setActiveTab("leads");
      openLead(created);
    } catch (err: any) {
      toast({ title: err.message || "Failed to create lead", variant: "destructive" });
    }
  }

  async function handleStatusChange(leadId: string, status: string) {
    if (!user) return;
    setUpdatingStatus(true);
    try {
      const updated = await apiRequest<RgLead>(`/rep/leads/${leadId}`, {
        method: "PATCH",
        body: JSON.stringify({ actorId: user.id, status }),
      });
      setLeads(prev => prev.map(l => l.id === leadId ? updated : l));
      setSelectedLead(updated);
      toast({ title: "Status updated" });
    } catch {
      toast({ title: "Failed to update status", variant: "destructive" });
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleDeleteLead() {
    if (!deleteConfirm || !user) return;
    setDeleting(true);
    try {
      await apiRequest(`/rep/leads/${deleteConfirm}?actorId=${user.id}`, { method: "DELETE" });
      setLeads(prev => prev.filter(l => l.id !== deleteConfirm));
      setSelectedLead(null);
      setDeleteConfirm(null);
      toast({ title: "Lead deleted" });
    } catch {
      toast({ title: "Failed to delete lead", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  }

  async function handleSendDocRequest() {
    if (!selectedLead || !user) return;
    if (!docReqForm.recipientName || !docReqForm.recipientEmail) {
      toast({ title: "Please fill in recipient details", variant: "destructive" });
      return;
    }
    setSendingDocReq(true);
    try {
      const result = await apiRequest<DocumentRequest>(`/rep/leads/${selectedLead.id}/request-docs`, {
        method: "POST",
        body: JSON.stringify({ actorId: user.id, ...docReqForm }),
      });
      setDocRequests(prev => [result, ...prev]);
      const link = `${window.location.origin}/doc-upload/${result.token}`;
      setCreatedLink(link);
      // Auto-update lead status to Documents Pending
      if (selectedLead.status === "New" || selectedLead.status === "Contacted") {
        await handleStatusChange(selectedLead.id, "Documents Pending");
      }
      toast({ title: "Document request created" });
    } catch (err: any) {
      toast({ title: err.message || "Failed to create request", variant: "destructive" });
    } finally {
      setSendingDocReq(false);
    }
  }

  async function handleDeleteDoc(docId: string) {
    if (!user) return;
    try {
      await apiRequest(`/rep/documents/${docId}?actorId=${user.id}`, { method: "DELETE" });
      setDocuments(prev => prev.filter(d => d.id !== docId));
      toast({ title: "Document removed" });
    } catch {
      toast({ title: "Failed to remove document", variant: "destructive" });
    }
  }

  function copyLink(link: string) {
    navigator.clipboard.writeText(link);
    toast({ title: "Link copied to clipboard" });
  }

  const filtered = leads.filter(l => {
    const matchesSearch = !search ||
      l.tenantName.toLowerCase().includes(search.toLowerCase()) ||
      l.landlordName.toLowerCase().includes(search.toLowerCase()) ||
      l.propertyAddress.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (!user || !["rep", "admin", "manager"].includes(user.role)) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 rounded-lg p-2">
              <Home className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Rent Guarantee Portal</h1>
              <p className="text-sm text-gray-500">{isAdminOrManager ? "All Rep Leads" : `Welcome, ${user.name}`}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadLeads} data-testid="button-refresh-leads">
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
            <Button size="sm" onClick={() => setActiveTab("new")} data-testid="button-add-lead">
              <Plus className="h-4 w-4 mr-1" /> New Lead
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white border rounded-lg p-1 w-fit">
          <button
            onClick={() => setActiveTab("leads")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "leads" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
            data-testid="tab-leads"
          >
            Leads ({leads.length})
          </button>
          <button
            onClick={() => setActiveTab("new")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "new" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
            data-testid="tab-new-lead"
          >
            <Plus className="h-3.5 w-3.5 inline mr-1" /> New Lead
          </button>
        </div>

        {/* Leads list tab */}
        {activeTab === "leads" && (
          <div>
            {/* Filters */}
            <div className="flex gap-3 mb-4">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search leads..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-leads"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48" data-testid="select-status-filter">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {Object.keys(STATUS_COLORS).map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="text-center py-12 text-gray-500">Loading leads...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border">
                <Home className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No leads yet</p>
                <p className="text-gray-400 text-sm mb-4">Create your first rent guarantee lead to get started</p>
                <Button onClick={() => setActiveTab("new")} size="sm">
                  <Plus className="h-4 w-4 mr-1" /> Add Lead
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map(lead => (
                  <div
                    key={lead.id}
                    className="bg-white border rounded-xl p-4 flex items-center justify-between hover:border-blue-300 hover:shadow-sm cursor-pointer transition-all"
                    onClick={() => openLead(lead)}
                    data-testid={`lead-row-${lead.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-50 rounded-lg p-2.5">
                        <Home className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{lead.tenantName}</p>
                        <p className="text-sm text-gray-500">{lead.propertyAddress}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Landlord: {lead.landlordName} · Rent: ${Number(lead.monthlyRent).toLocaleString()}/mo</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[lead.status as Status]}`}>
                        {lead.status}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </span>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* New lead form tab */}
        {activeTab === "new" && (
          <form onSubmit={handleCreateLead} className="bg-white border rounded-xl p-6 max-w-3xl">
            <h2 className="text-lg font-semibold mb-6 text-gray-900">New Rent Guarantee Lead</h2>
            <div className="grid grid-cols-1 gap-6">
              <div>
                <h3 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <span className="bg-blue-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">1</span>
                  Tenant Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tenantName">Tenant Name *</Label>
                    <Input id="tenantName" value={newLead.tenantName} onChange={e => setNewLead(p => ({ ...p, tenantName: e.target.value }))} data-testid="input-tenant-name" />
                  </div>
                  <div>
                    <Label htmlFor="tenantEmail">Tenant Email *</Label>
                    <Input id="tenantEmail" type="email" value={newLead.tenantEmail} onChange={e => setNewLead(p => ({ ...p, tenantEmail: e.target.value }))} data-testid="input-tenant-email" />
                  </div>
                  <div>
                    <Label htmlFor="tenantPhone">Tenant Phone *</Label>
                    <Input id="tenantPhone" value={newLead.tenantPhone} onChange={e => setNewLead(p => ({ ...p, tenantPhone: e.target.value }))} data-testid="input-tenant-phone" />
                  </div>
                  <div>
                    <Label htmlFor="employmentStatus">Employment Status *</Label>
                    <Select value={newLead.employmentStatus} onValueChange={v => setNewLead(p => ({ ...p, employmentStatus: v }))}>
                      <SelectTrigger data-testid="select-employment-status">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {EMPLOYMENT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="coApplicantName">Co-Applicant Name</Label>
                    <Input id="coApplicantName" value={newLead.coApplicantName} onChange={e => setNewLead(p => ({ ...p, coApplicantName: e.target.value }))} data-testid="input-coapplicant-name" />
                  </div>
                  <div>
                    <Label htmlFor="coApplicantEmail">Co-Applicant Email</Label>
                    <Input id="coApplicantEmail" type="email" value={newLead.coApplicantEmail} onChange={e => setNewLead(p => ({ ...p, coApplicantEmail: e.target.value }))} data-testid="input-coapplicant-email" />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <span className="bg-blue-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">2</span>
                  Landlord Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="landlordName">Landlord Name *</Label>
                    <Input id="landlordName" value={newLead.landlordName} onChange={e => setNewLead(p => ({ ...p, landlordName: e.target.value }))} data-testid="input-landlord-name" />
                  </div>
                  <div>
                    <Label htmlFor="landlordEmail">Landlord Email *</Label>
                    <Input id="landlordEmail" type="email" value={newLead.landlordEmail} onChange={e => setNewLead(p => ({ ...p, landlordEmail: e.target.value }))} data-testid="input-landlord-email" />
                  </div>
                  <div>
                    <Label htmlFor="landlordPhone">Landlord Phone</Label>
                    <Input id="landlordPhone" value={newLead.landlordPhone} onChange={e => setNewLead(p => ({ ...p, landlordPhone: e.target.value }))} data-testid="input-landlord-phone" />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <span className="bg-blue-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">3</span>
                  Property Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="propertyAddress">Property Address *</Label>
                    <Input id="propertyAddress" value={newLead.propertyAddress} onChange={e => setNewLead(p => ({ ...p, propertyAddress: e.target.value }))} data-testid="input-property-address" />
                  </div>
                  <div>
                    <Label htmlFor="monthlyRent">Monthly Rent ($) *</Label>
                    <Input id="monthlyRent" type="number" min="0" step="0.01" value={newLead.monthlyRent} onChange={e => setNewLead(p => ({ ...p, monthlyRent: e.target.value }))} data-testid="input-monthly-rent" />
                  </div>
                  <div>
                    <Label htmlFor="moveInDate">Move-In Date</Label>
                    <Input id="moveInDate" type="date" value={newLead.moveInDate} onChange={e => setNewLead(p => ({ ...p, moveInDate: e.target.value }))} data-testid="input-move-in-date" />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea id="notes" rows={3} value={newLead.notes} onChange={e => setNewLead(p => ({ ...p, notes: e.target.value }))} data-testid="input-notes" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button type="submit" data-testid="button-submit-lead">Create Lead</Button>
              <Button type="button" variant="outline" onClick={() => setActiveTab("leads")}>Cancel</Button>
            </div>
          </form>
        )}
      </div>

      {/* Lead Detail Panel */}
      {selectedLead && (
        <div className="fixed inset-0 z-40 flex">
          <div className="flex-1 bg-black/30" onClick={() => setSelectedLead(null)} />
          <div className="w-full max-w-2xl bg-white shadow-2xl overflow-y-auto flex flex-col">
            {/* Header */}
            <div className="p-5 border-b flex items-start justify-between bg-gradient-to-r from-blue-600 to-blue-700 text-white">
              <div>
                <h2 className="text-xl font-bold">{selectedLead.tenantName}</h2>
                <p className="text-blue-100 text-sm mt-0.5">{selectedLead.propertyAddress}</p>
              </div>
              <button onClick={() => setSelectedLead(null)} className="text-blue-100 hover:text-white" data-testid="button-close-lead">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Status bar */}
            <div className="px-5 py-3 border-b bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Status:</span>
                <Select value={selectedLead.status} onValueChange={v => handleStatusChange(selectedLead.id, v)} disabled={updatingStatus}>
                  <SelectTrigger className="h-7 text-xs border-none bg-transparent p-0 w-auto gap-1 font-medium" data-testid="select-lead-status">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[selectedLead.status as Status]}`}>
                      {selectedLead.status}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(STATUS_COLORS).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { setShowDocRequest(true); setDocReqForm({ recipientType: "tenant", recipientName: selectedLead.tenantName, recipientEmail: selectedLead.tenantEmail, requiredDocs: [], expiresInDays: 7 }); setCreatedLink(null); }} data-testid="button-send-doc-request">
                  <Send className="h-3.5 w-3.5 mr-1" /> Request Docs
                </Button>
                <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => setDeleteConfirm(selectedLead.id)} data-testid="button-delete-lead">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Detail tabs */}
            <div className="flex gap-1 px-5 pt-4">
              <button onClick={() => setDetailTab("info")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${detailTab === "info" ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:bg-gray-100"}`} data-testid="tab-lead-info">
                Info
              </button>
              <button onClick={() => setDetailTab("docs")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${detailTab === "docs" ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:bg-gray-100"}`} data-testid="tab-lead-docs">
                Documents ({documents.length})
              </button>
            </div>

            <div className="flex-1 p-5">
              {detailTab === "info" && (
                <div className="space-y-4">
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-600">Tenant</CardTitle></CardHeader>
                    <CardContent className="text-sm space-y-1">
                      <p><span className="text-gray-500">Name:</span> <strong>{selectedLead.tenantName}</strong></p>
                      <p><span className="text-gray-500">Email:</span> {selectedLead.tenantEmail}</p>
                      <p><span className="text-gray-500">Phone:</span> {selectedLead.tenantPhone}</p>
                      <p><span className="text-gray-500">Employment:</span> {selectedLead.employmentStatus}</p>
                      {selectedLead.coApplicantName && <p><span className="text-gray-500">Co-Applicant:</span> {selectedLead.coApplicantName} ({selectedLead.coApplicantEmail})</p>}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-600">Landlord</CardTitle></CardHeader>
                    <CardContent className="text-sm space-y-1">
                      <p><span className="text-gray-500">Name:</span> <strong>{selectedLead.landlordName}</strong></p>
                      {selectedLead.landlordEmail && <p><span className="text-gray-500">Email:</span> {selectedLead.landlordEmail}</p>}
                      {selectedLead.landlordPhone && <p><span className="text-gray-500">Phone:</span> {selectedLead.landlordPhone}</p>}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-600">Property</CardTitle></CardHeader>
                    <CardContent className="text-sm space-y-1">
                      <p><span className="text-gray-500">Address:</span> <strong>{selectedLead.propertyAddress}</strong></p>
                      <p><span className="text-gray-500">Monthly Rent:</span> ${Number(selectedLead.monthlyRent).toLocaleString()}/month</p>
                      {selectedLead.moveInDate && <p><span className="text-gray-500">Move-In Date:</span> {selectedLead.moveInDate}</p>}
                    </CardContent>
                  </Card>
                  {selectedLead.notes && (
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-600">Notes</CardTitle></CardHeader>
                      <CardContent className="text-sm text-gray-700">{selectedLead.notes}</CardContent>
                    </Card>
                  )}

                  {/* Document requests */}
                  {docRequests.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-600">Document Requests Sent</CardTitle></CardHeader>
                      <CardContent className="space-y-2">
                        {docRequests.map(req => {
                          const link = `${window.location.origin}/doc-upload/${req.token}`;
                          const expired = req.expiresAt && new Date(req.expiresAt) < new Date();
                          return (
                            <div key={req.id} className="bg-gray-50 rounded-lg p-3 text-sm">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium capitalize">{req.recipientType}: {req.recipientName}</span>
                                {expired ? <Badge variant="destructive" className="text-xs">Expired</Badge> : <Badge className="text-xs bg-green-100 text-green-800">Active</Badge>}
                              </div>
                              <p className="text-gray-500 text-xs mb-1">{req.recipientEmail}</p>
                              {req.requiredDocs && req.requiredDocs.length > 0 && (
                                <p className="text-xs text-gray-500">Docs: {req.requiredDocs.join(", ")}</p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <code className="text-xs bg-white border rounded px-2 py-0.5 flex-1 truncate">{link}</code>
                                <button onClick={() => copyLink(link)} className="text-blue-600 hover:text-blue-800" data-testid={`button-copy-link-${req.id}`}>
                                  <Copy className="h-3.5 w-3.5" />
                                </button>
                                <a href={link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800" data-testid={`button-open-link-${req.id}`}>
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {detailTab === "docs" && (
                <div className="space-y-3">
                  {documents.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                      <FileText className="h-10 w-10 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No documents uploaded yet</p>
                      <p className="text-xs mt-1">Send a document request to collect files from tenant or landlord</p>
                    </div>
                  ) : (
                    documents.map(doc => (
                      <div key={doc.id} className="bg-gray-50 border rounded-lg p-3 flex items-center justify-between" data-testid={`doc-row-${doc.id}`}>
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-blue-500" />
                          <div>
                            <p className="text-sm font-medium">{doc.fileName}</p>
                            <p className="text-xs text-gray-500">{doc.docType} · {doc.fileSize ? `${Math.round(doc.fileSize / 1024)} KB` : ""}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800" data-testid={`button-view-doc-${doc.id}`}>
                            <Eye className="h-4 w-4" />
                          </a>
                          <button onClick={() => handleDeleteDoc(doc.id)} className="text-red-500 hover:text-red-700" data-testid={`button-delete-doc-${doc.id}`}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Send Document Request Dialog */}
      <Dialog open={showDocRequest} onOpenChange={v => { setShowDocRequest(v); if (!v) setCreatedLink(null); }}>
        <DialogContent className="max-w-lg" data-testid="dialog-doc-request">
          <DialogHeader>
            <DialogTitle>Request Documents</DialogTitle>
          </DialogHeader>
          {createdLink ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 bg-green-50 text-green-700 rounded-lg p-3 text-sm">
                <Check className="h-4 w-4" />
                Document request created successfully
              </div>
              <div>
                <Label>Upload Link (share with recipient)</Label>
                <div className="flex gap-2 mt-1">
                  <Input value={createdLink} readOnly className="text-xs" data-testid="input-upload-link" />
                  <Button variant="outline" size="sm" onClick={() => copyLink(createdLink)} data-testid="button-copy-upload-link">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">This link allows the recipient to upload documents without logging in.</p>
              </div>
              <a href={createdLink} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="w-full" data-testid="button-preview-upload-link">
                  <ExternalLink className="h-4 w-4 mr-2" /> Preview Upload Page
                </Button>
              </a>
              <Button onClick={() => { setShowDocRequest(false); setCreatedLink(null); }} className="w-full" data-testid="button-close-doc-request">
                Done
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div>
                  <Label>Recipient Type *</Label>
                  <div className="flex gap-2 mt-1">
                    {["tenant", "landlord"].map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          const name = type === "tenant" ? selectedLead?.tenantName : selectedLead?.landlordName;
                          const email = type === "tenant" ? selectedLead?.tenantEmail : selectedLead?.landlordEmail || "";
                          setDocReqForm(p => ({ ...p, recipientType: type, recipientName: name || "", recipientEmail: email || "" }));
                        }}
                        className={`flex-1 py-2 px-3 rounded-md border text-sm font-medium transition-colors capitalize ${docReqForm.recipientType === type ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 hover:bg-gray-50"}`}
                        data-testid={`button-recipient-type-${type}`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Recipient Name *</Label>
                    <Input value={docReqForm.recipientName} onChange={e => setDocReqForm(p => ({ ...p, recipientName: e.target.value }))} data-testid="input-recipient-name" />
                  </div>
                  <div>
                    <Label>Recipient Email *</Label>
                    <Input type="email" value={docReqForm.recipientEmail} onChange={e => setDocReqForm(p => ({ ...p, recipientEmail: e.target.value }))} data-testid="input-recipient-email" />
                  </div>
                </div>
                <div>
                  <Label>Required Documents</Label>
                  <div className="mt-2 space-y-1 max-h-44 overflow-y-auto border rounded-md p-2">
                    {(docReqForm.recipientType === "tenant" ? TENANT_DOC_TYPES : LANDLORD_DOC_TYPES).map(doc => (
                      <label key={doc} className="flex items-center gap-2 text-sm cursor-pointer p-1 hover:bg-gray-50 rounded">
                        <input
                          type="checkbox"
                          checked={docReqForm.requiredDocs.includes(doc)}
                          onChange={e => setDocReqForm(p => ({
                            ...p,
                            requiredDocs: e.target.checked ? [...p.requiredDocs, doc] : p.requiredDocs.filter(d => d !== doc)
                          }))}
                          data-testid={`checkbox-doc-${doc.replace(/\s+/g, "-").toLowerCase()}`}
                        />
                        {doc}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Link Expires In (days)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={docReqForm.expiresInDays}
                    onChange={e => setDocReqForm(p => ({ ...p, expiresInDays: Number(e.target.value) }))}
                    className="w-24 mt-1"
                    data-testid="input-expires-days"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDocRequest(false)}>Cancel</Button>
                <Button onClick={handleSendDocRequest} disabled={sendingDocReq} data-testid="button-create-doc-request">
                  {sendingDocReq ? "Creating..." : "Create Request"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent data-testid="dialog-delete-confirm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" /> Delete Lead
            </DialogTitle>
          </DialogHeader>
          <p className="text-gray-600 text-sm">Are you sure you want to delete this lead? All associated documents and document requests will also be deleted. This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteLead} disabled={deleting} data-testid="button-confirm-delete">
              {deleting ? "Deleting..." : "Delete Lead"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
