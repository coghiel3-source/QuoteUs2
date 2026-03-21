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
import type { RgLead, DocumentRequest, RepDocument, RepReminder } from "@shared/schema";
import {
  Home, Plus, Search, FileText, Upload, Send, Eye, Trash2,
  ChevronRight, X, RefreshCw, AlertCircle, Check, Clock, ExternalLink, Copy,
  BarChart3, Bell, BellRing, CheckCircle2, TrendingUp, Users, Calendar,
  AlarmClock, Pencil,
} from "lucide-react";

type Status = "New" | "Contacted" | "Documents Pending" | "Documents Received" | "Submitted" | "Approved" | "Declined";
type ActiveTab = "overview" | "leads" | "reminders" | "new";

const STATUS_COLORS: Record<Status, string> = {
  "New": "bg-blue-100 text-blue-800",
  "Contacted": "bg-yellow-100 text-yellow-800",
  "Documents Pending": "bg-orange-100 text-orange-800",
  "Documents Received": "bg-purple-100 text-purple-800",
  "Submitted": "bg-indigo-100 text-indigo-800",
  "Approved": "bg-green-100 text-green-800",
  "Declined": "bg-red-100 text-red-800",
};

const IN_PROGRESS_STATUSES: Status[] = ["Contacted", "Documents Pending", "Documents Received", "Submitted"];

const EMPLOYMENT_STATUSES = ["Employed Full-Time", "Employed Part-Time", "Self-Employed", "Student", "Retired", "Unemployed", "Other"];
const TENANT_DOC_TYPES = ["Pay Stubs (Last 3 Months)", "T4 / Notice of Assessment", "Bank Statements (3 Months)", "Credit Check Authorization", "Government ID", "Employment Letter", "Other"];
const LANDLORD_DOC_TYPES = ["Lease Agreement", "Property Deed / Ownership Proof", "Property Insurance", "Government ID", "Other"];

const REMINDER_PRESETS = [
  "Follow up on lease agreement",
  "Chase tenant documents",
  "Follow up with landlord",
  "Submit application",
  "Check approval status",
  "Review credit report",
  "Confirm move-in date",
];

function StatCard({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color: string }) {
  return (
    <div className={`rounded-xl p-4 border ${color}`}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

function ReminderCard({
  reminder, leads, onToggle, onDelete, onEdit,
}: {
  reminder: RepReminder;
  leads: RgLead[];
  onToggle: (r: RepReminder) => void;
  onDelete: (id: string) => void;
  onEdit: (r: RepReminder) => void;
}) {
  const due = new Date(reminder.dueDate);
  const now = new Date();
  const isOverdue = !reminder.completed && due < now;
  const isDueToday = !reminder.completed && due.toDateString() === now.toDateString();
  const linkedLead = leads.find(l => l.id === reminder.leadId);

  return (
    <div className={`bg-white border rounded-xl p-4 flex gap-3 transition-all ${reminder.completed ? "opacity-60" : isOverdue ? "border-red-300 bg-red-50/30" : isDueToday ? "border-amber-300 bg-amber-50/30" : ""}`}>
      <button
        onClick={() => onToggle(reminder)}
        className={`mt-0.5 flex-shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${reminder.completed ? "bg-green-500 border-green-500" : "border-gray-300 hover:border-blue-500"}`}
        data-testid={`button-toggle-reminder-${reminder.id}`}
      >
        {reminder.completed && <Check className="h-3 w-3 text-white" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`font-medium text-sm ${reminder.completed ? "line-through text-gray-400" : "text-gray-900"}`}>
          {reminder.title}
        </p>
        {reminder.notes && <p className="text-xs text-gray-500 mt-0.5 truncate">{reminder.notes}</p>}
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          <span className={`text-xs flex items-center gap-1 ${isOverdue ? "text-red-600 font-medium" : isDueToday ? "text-amber-600 font-medium" : "text-gray-400"}`}>
            <Clock className="h-3 w-3" />
            {isOverdue ? "Overdue · " : isDueToday ? "Due today · " : ""}
            {due.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: due.getFullYear() !== now.getFullYear() ? "numeric" : undefined })}
            {" at "}
            {due.toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" })}
          </span>
          {linkedLead && (
            <span className="text-xs text-blue-600 flex items-center gap-1">
              <Home className="h-3 w-3" /> {linkedLead.tenantName}
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-1 flex-shrink-0">
        <button onClick={() => onEdit(reminder)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600" data-testid={`button-edit-reminder-${reminder.id}`}>
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => onDelete(reminder.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500" data-testid={`button-delete-reminder-${reminder.id}`}>
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function RepDashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [leads, setLeads] = useState<RgLead[]>([]);
  const [reminders, setReminders] = useState<RepReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");

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

  // Reminder state
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [editingReminder, setEditingReminder] = useState<RepReminder | null>(null);
  const [reminderFilter, setReminderFilter] = useState<"all" | "pending" | "completed">("pending");
  const [reminderForm, setReminderForm] = useState({
    title: "", notes: "", dueDate: "", dueTime: "09:00", leadId: ""
  });
  const [savingReminder, setSavingReminder] = useState(false);
  const [deleteReminderConfirm, setDeleteReminderConfirm] = useState<string | null>(null);

  const isAdminOrManager = user?.role === "admin" || user?.role === "manager";
  const isRep = user?.role === "rep";

  useEffect(() => {
    if (!user || !["rep", "admin", "manager"].includes(user.role)) {
      navigate("/");
    } else {
      loadAll();
    }
  }, [user]);

  async function loadAll() {
    if (!user) return;
    setLoading(true);
    try {
      const [leadsData, remindersData] = await Promise.all([
        apiRequest<RgLead[]>(`/rep/leads?actorId=${user.id}`),
        isRep ? apiRequest<RepReminder[]>(`/rep/reminders?actorId=${user.id}`) : Promise.resolve([]),
      ]);
      setLeads(leadsData || []);
      setReminders(remindersData || []);
    } catch {
      toast({ title: "Failed to load data", variant: "destructive" });
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

  // Reminder handlers
  function openNewReminder(preset?: string) {
    const now = new Date();
    now.setDate(now.getDate() + 1);
    setReminderForm({
      title: preset || "",
      notes: "",
      dueDate: now.toISOString().split("T")[0],
      dueTime: "09:00",
      leadId: "",
    });
    setEditingReminder(null);
    setShowReminderForm(true);
  }

  function openEditReminder(r: RepReminder) {
    const d = new Date(r.dueDate);
    setReminderForm({
      title: r.title,
      notes: r.notes || "",
      dueDate: d.toISOString().split("T")[0],
      dueTime: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
      leadId: r.leadId || "",
    });
    setEditingReminder(r);
    setShowReminderForm(true);
  }

  async function handleSaveReminder() {
    if (!user || !reminderForm.title || !reminderForm.dueDate) {
      toast({ title: "Please fill in a title and due date", variant: "destructive" });
      return;
    }
    setSavingReminder(true);
    try {
      const dueDate = new Date(`${reminderForm.dueDate}T${reminderForm.dueTime}:00`);
      const payload = {
        actorId: user.id,
        title: reminderForm.title,
        notes: reminderForm.notes || null,
        dueDate: dueDate.toISOString(),
        leadId: reminderForm.leadId || null,
      };
      if (editingReminder) {
        const updated = await apiRequest<RepReminder>(`/rep/reminders/${editingReminder.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        setReminders(prev => prev.map(r => r.id === editingReminder.id ? updated : r));
        toast({ title: "Reminder updated" });
      } else {
        const created = await apiRequest<RepReminder>("/rep/reminders", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setReminders(prev => [created, ...prev]);
        toast({ title: "Reminder set" });
      }
      setShowReminderForm(false);
      setEditingReminder(null);
    } catch (err: any) {
      toast({ title: err.message || "Failed to save reminder", variant: "destructive" });
    } finally {
      setSavingReminder(false);
    }
  }

  async function handleToggleReminder(r: RepReminder) {
    if (!user) return;
    try {
      const updated = await apiRequest<RepReminder>(`/rep/reminders/${r.id}`, {
        method: "PATCH",
        body: JSON.stringify({ actorId: user.id, completed: !r.completed }),
      });
      setReminders(prev => prev.map(x => x.id === r.id ? updated : x));
    } catch {
      toast({ title: "Failed to update reminder", variant: "destructive" });
    }
  }

  async function handleDeleteReminder() {
    if (!deleteReminderConfirm || !user) return;
    try {
      await apiRequest(`/rep/reminders/${deleteReminderConfirm}?actorId=${user.id}`, { method: "DELETE" });
      setReminders(prev => prev.filter(r => r.id !== deleteReminderConfirm));
      setDeleteReminderConfirm(null);
      toast({ title: "Reminder deleted" });
    } catch {
      toast({ title: "Failed to delete reminder", variant: "destructive" });
    }
  }

  function copyLink(link: string) {
    navigator.clipboard.writeText(link);
    toast({ title: "Link copied to clipboard" });
  }

  // Stats computed from leads
  const statsNew = leads.filter(l => l.status === "New").length;
  const statsInProgress = leads.filter(l => (IN_PROGRESS_STATUSES as string[]).includes(l.status)).length;
  const statsApproved = leads.filter(l => l.status === "Approved").length;
  const statsDeclined = leads.filter(l => l.status === "Declined").length;
  const totalClosed = statsApproved + statsDeclined;
  const winRate = totalClosed > 0 ? Math.round((statsApproved / totalClosed) * 100) : 0;
  const overdueReminders = reminders.filter(r => !r.completed && new Date(r.dueDate) < new Date()).length;
  const pendingReminders = reminders.filter(r => !r.completed).length;

  const filtered = leads.filter(l => {
    const matchesSearch = !search ||
      l.tenantName.toLowerCase().includes(search.toLowerCase()) ||
      l.landlordName.toLowerCase().includes(search.toLowerCase()) ||
      l.propertyAddress.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredReminders = reminders.filter(r => {
    if (reminderFilter === "pending") return !r.completed;
    if (reminderFilter === "completed") return r.completed;
    return true;
  });

  if (!user || !["rep", "admin", "manager"].includes(user.role)) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 rounded-lg p-2">
              <Home className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Rent Guarantee Portal</h1>
              <p className="text-sm text-gray-500">
                {isAdminOrManager ? "All Rep Leads" : `Welcome, ${user.name}`}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {overdueReminders > 0 && isRep && (
              <button
                onClick={() => setActiveTab("reminders")}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded-lg hover:bg-red-100 transition-colors"
                data-testid="badge-overdue-reminders"
              >
                <BellRing className="h-3.5 w-3.5" />
                {overdueReminders} overdue
              </button>
            )}
            <Button variant="outline" size="sm" onClick={loadAll} data-testid="button-refresh-leads">
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
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${activeTab === "overview" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
            data-testid="tab-overview"
          >
            <BarChart3 className="h-3.5 w-3.5" /> Overview
          </button>
          <button
            onClick={() => setActiveTab("leads")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "leads" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
            data-testid="tab-leads"
          >
            Leads ({leads.length})
          </button>
          {isRep && (
            <button
              onClick={() => setActiveTab("reminders")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${activeTab === "reminders" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
              data-testid="tab-reminders"
            >
              <Bell className="h-3.5 w-3.5" />
              Reminders
              {pendingReminders > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${overdueReminders > 0 ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                  {pendingReminders}
                </span>
              )}
            </button>
          )}
          <button
            onClick={() => setActiveTab("new")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "new" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
            data-testid="tab-new-lead"
          >
            <Plus className="h-3.5 w-3.5 inline mr-1" /> New Lead
          </button>
        </div>

        {/* ===== OVERVIEW TAB ===== */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <StatCard label="Total Leads" value={leads.length} color="bg-white" />
              <StatCard label="New" value={statsNew} color="bg-blue-50 border-blue-100" />
              <StatCard label="In Progress" value={statsInProgress} color="bg-yellow-50 border-yellow-100" />
              <StatCard label="Approved" value={statsApproved} color="bg-green-50 border-green-100" />
              <StatCard label="Declined" value={statsDeclined} color="bg-red-50 border-red-100" />
              <StatCard label="Win Rate" value={`${winRate}%`} sub={`${totalClosed} closed`} color="bg-indigo-50 border-indigo-100" />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Recent leads */}
              <div className="bg-white border rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" /> Recent Leads
                  </h2>
                  <button onClick={() => setActiveTab("leads")} className="text-xs text-blue-600 hover:underline">View all</button>
                </div>
                {leads.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No leads yet</p>
                ) : (
                  <div className="space-y-2">
                    {leads.slice(0, 5).map(lead => (
                      <div
                        key={lead.id}
                        className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer"
                        onClick={() => { openLead(lead); }}
                        data-testid={`overview-lead-${lead.id}`}
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">{lead.tenantName}</p>
                          <p className="text-xs text-gray-400 truncate max-w-[180px]">{lead.propertyAddress}</p>
                        </div>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[lead.status as Status]}`}>
                          {lead.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Upcoming reminders (reps only) */}
              {isRep && (
                <div className="bg-white border rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                      <AlarmClock className="h-4 w-4 text-blue-600" /> Upcoming Reminders
                    </h2>
                    <button onClick={() => setActiveTab("reminders")} className="text-xs text-blue-600 hover:underline">View all</button>
                  </div>
                  {reminders.filter(r => !r.completed).length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-sm text-gray-400 mb-3">No pending reminders</p>
                      <Button size="sm" variant="outline" onClick={() => openNewReminder()}>
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add Reminder
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {reminders.filter(r => !r.completed).slice(0, 4).map(r => {
                        const due = new Date(r.dueDate);
                        const isOverdue = due < new Date();
                        return (
                          <div key={r.id} className={`flex items-center gap-2.5 p-2.5 rounded-lg ${isOverdue ? "bg-red-50" : "hover:bg-gray-50"}`}>
                            <button
                              onClick={() => handleToggleReminder(r)}
                              className="h-4 w-4 rounded-full border-2 border-gray-300 hover:border-blue-500 flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{r.title}</p>
                              <p className={`text-xs ${isOverdue ? "text-red-600 font-medium" : "text-gray-400"}`}>
                                {isOverdue ? "Overdue · " : ""}{due.toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Status breakdown */}
              {!isRep && (
                <div className="bg-white border rounded-xl p-5">
                  <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                    <Users className="h-4 w-4 text-blue-600" /> Status Breakdown
                  </h2>
                  <div className="space-y-2">
                    {Object.entries(STATUS_COLORS).map(([status, color]) => {
                      const count = leads.filter(l => l.status === status).length;
                      const pct = leads.length > 0 ? Math.round((count / leads.length) * 100) : 0;
                      return (
                        <div key={status} className="flex items-center gap-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full w-40 text-center ${color}`}>{status}</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== LEADS TAB ===== */}
        {activeTab === "leads" && (
          <div>
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
                <p className="text-gray-500 font-medium">No leads found</p>
                <Button onClick={() => setActiveTab("new")} size="sm" className="mt-4">
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
                      <span className="text-xs text-gray-400">{new Date(lead.createdAt).toLocaleDateString()}</span>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== REMINDERS TAB ===== */}
        {activeTab === "reminders" && isRep && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-1 bg-white border rounded-lg p-1">
                {(["pending", "completed", "all"] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setReminderFilter(f)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${reminderFilter === f ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
                    data-testid={`filter-reminders-${f}`}
                  >
                    {f} {f === "pending" ? `(${reminders.filter(r => !r.completed).length})` : f === "completed" ? `(${reminders.filter(r => r.completed).length})` : ""}
                  </button>
                ))}
              </div>
              <Button size="sm" onClick={() => openNewReminder()} data-testid="button-new-reminder">
                <Plus className="h-4 w-4 mr-1" /> New Reminder
              </Button>
            </div>

            {/* Quick presets */}
            <div className="mb-4 flex flex-wrap gap-2">
              {REMINDER_PRESETS.map(preset => (
                <button
                  key={preset}
                  onClick={() => openNewReminder(preset)}
                  className="text-xs px-3 py-1.5 border border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  data-testid={`preset-reminder-${preset.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  + {preset}
                </button>
              ))}
            </div>

            {filteredReminders.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border">
                <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No {reminderFilter !== "all" ? reminderFilter : ""} reminders</p>
                <Button onClick={() => openNewReminder()} size="sm" className="mt-4">
                  <Plus className="h-4 w-4 mr-1" /> Set a Reminder
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredReminders.map(r => (
                  <ReminderCard
                    key={r.id}
                    reminder={r}
                    leads={leads}
                    onToggle={handleToggleReminder}
                    onDelete={id => setDeleteReminderConfirm(id)}
                    onEdit={openEditReminder}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== NEW LEAD TAB ===== */}
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
                  <div><Label htmlFor="tenantName">Tenant Name *</Label><Input id="tenantName" value={newLead.tenantName} onChange={e => setNewLead(p => ({ ...p, tenantName: e.target.value }))} data-testid="input-tenant-name" /></div>
                  <div><Label htmlFor="tenantEmail">Tenant Email *</Label><Input id="tenantEmail" type="email" value={newLead.tenantEmail} onChange={e => setNewLead(p => ({ ...p, tenantEmail: e.target.value }))} data-testid="input-tenant-email" /></div>
                  <div><Label htmlFor="tenantPhone">Tenant Phone *</Label><Input id="tenantPhone" value={newLead.tenantPhone} onChange={e => setNewLead(p => ({ ...p, tenantPhone: e.target.value }))} data-testid="input-tenant-phone" /></div>
                  <div>
                    <Label htmlFor="employmentStatus">Employment Status *</Label>
                    <Select value={newLead.employmentStatus} onValueChange={v => setNewLead(p => ({ ...p, employmentStatus: v }))}>
                      <SelectTrigger data-testid="select-employment-status"><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>{EMPLOYMENT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label htmlFor="coApplicantName">Co-Applicant Name</Label><Input id="coApplicantName" value={newLead.coApplicantName} onChange={e => setNewLead(p => ({ ...p, coApplicantName: e.target.value }))} data-testid="input-coapplicant-name" /></div>
                  <div><Label htmlFor="coApplicantEmail">Co-Applicant Email</Label><Input id="coApplicantEmail" type="email" value={newLead.coApplicantEmail} onChange={e => setNewLead(p => ({ ...p, coApplicantEmail: e.target.value }))} data-testid="input-coapplicant-email" /></div>
                </div>
              </div>
              <div>
                <h3 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <span className="bg-blue-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">2</span>
                  Landlord Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label htmlFor="landlordName">Landlord Name *</Label><Input id="landlordName" value={newLead.landlordName} onChange={e => setNewLead(p => ({ ...p, landlordName: e.target.value }))} data-testid="input-landlord-name" /></div>
                  <div><Label htmlFor="landlordEmail">Landlord Email *</Label><Input id="landlordEmail" type="email" value={newLead.landlordEmail} onChange={e => setNewLead(p => ({ ...p, landlordEmail: e.target.value }))} data-testid="input-landlord-email" /></div>
                  <div><Label htmlFor="landlordPhone">Landlord Phone</Label><Input id="landlordPhone" value={newLead.landlordPhone} onChange={e => setNewLead(p => ({ ...p, landlordPhone: e.target.value }))} data-testid="input-landlord-phone" /></div>
                </div>
              </div>
              <div>
                <h3 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <span className="bg-blue-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">3</span>
                  Property Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2"><Label htmlFor="propertyAddress">Property Address *</Label><Input id="propertyAddress" value={newLead.propertyAddress} onChange={e => setNewLead(p => ({ ...p, propertyAddress: e.target.value }))} data-testid="input-property-address" /></div>
                  <div><Label htmlFor="monthlyRent">Monthly Rent ($) *</Label><Input id="monthlyRent" type="number" min="0" step="0.01" value={newLead.monthlyRent} onChange={e => setNewLead(p => ({ ...p, monthlyRent: e.target.value }))} data-testid="input-monthly-rent" /></div>
                  <div><Label htmlFor="moveInDate">Move-In Date</Label><Input id="moveInDate" type="date" value={newLead.moveInDate} onChange={e => setNewLead(p => ({ ...p, moveInDate: e.target.value }))} data-testid="input-move-in-date" /></div>
                  <div className="col-span-2"><Label htmlFor="notes">Notes</Label><Textarea id="notes" rows={3} value={newLead.notes} onChange={e => setNewLead(p => ({ ...p, notes: e.target.value }))} data-testid="input-notes" /></div>
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

      {/* ===== LEAD DETAIL PANEL ===== */}
      {selectedLead && (
        <div className="fixed inset-0 z-40 flex">
          <div className="flex-1 bg-black/30" onClick={() => setSelectedLead(null)} />
          <div className="w-full max-w-2xl bg-white shadow-2xl overflow-y-auto flex flex-col">
            <div className="p-5 border-b flex items-start justify-between bg-gradient-to-r from-blue-600 to-blue-700 text-white">
              <div>
                <h2 className="text-xl font-bold">{selectedLead.tenantName}</h2>
                <p className="text-blue-100 text-sm mt-0.5">{selectedLead.propertyAddress}</p>
              </div>
              <button onClick={() => setSelectedLead(null)} className="text-blue-100 hover:text-white" data-testid="button-close-lead">
                <X className="h-5 w-5" />
              </button>
            </div>
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
                {isRep && (
                  <Button size="sm" variant="outline" onClick={() => { setActiveTab("reminders"); openNewReminder(`Follow up · ${selectedLead.tenantName}`); setSelectedLead(null); }} data-testid="button-set-reminder-lead">
                    <Bell className="h-3.5 w-3.5 mr-1" /> Remind
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => { setShowDocRequest(true); setDocReqForm({ recipientType: "tenant", recipientName: selectedLead.tenantName, recipientEmail: selectedLead.tenantEmail, requiredDocs: [], expiresInDays: 7 }); setCreatedLink(null); }} data-testid="button-send-doc-request">
                  <Send className="h-3.5 w-3.5 mr-1" /> Request Docs
                </Button>
                <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => setDeleteConfirm(selectedLead.id)} data-testid="button-delete-lead">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="flex gap-1 px-5 pt-4">
              <button onClick={() => setDetailTab("info")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${detailTab === "info" ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:bg-gray-100"}`} data-testid="tab-lead-info">Info</button>
              <button onClick={() => setDetailTab("docs")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${detailTab === "docs" ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:bg-gray-100"}`} data-testid="tab-lead-docs">Documents ({documents.length})</button>
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
                              <div className="flex gap-2 mt-2">
                                <button onClick={() => copyLink(link)} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                                  <Copy className="h-3 w-3" /> Copy link
                                </button>
                                <a href={link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                                  <ExternalLink className="h-3 w-3" /> Open
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
                <div>
                  {documents.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">No documents uploaded yet</p>
                      <p className="text-gray-400 text-xs mt-1">Send a document request to receive files</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {documents.map(doc => (
                        <div key={doc.id} className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-blue-500" />
                            <div>
                              <p className="text-sm font-medium">{doc.fileName}</p>
                              <p className="text-xs text-gray-500">{doc.docType} · {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : ""}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded hover:bg-gray-200 text-gray-500"><Eye className="h-4 w-4" /></a>
                            <button onClick={() => handleDeleteDoc(doc.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500" data-testid={`button-delete-doc-${doc.id}`}><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== REMINDER FORM DIALOG ===== */}
      <Dialog open={showReminderForm} onOpenChange={setShowReminderForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingReminder ? "Edit Reminder" : "Set a Reminder"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                placeholder="e.g. Follow up on lease agreement"
                value={reminderForm.title}
                onChange={e => setReminderForm(p => ({ ...p, title: e.target.value }))}
                data-testid="input-reminder-title"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {REMINDER_PRESETS.slice(0, 4).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setReminderForm(f => ({ ...f, title: p }))}
                    className="text-xs px-2 py-1 border rounded-md text-gray-500 hover:text-blue-600 hover:border-blue-400 transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={reminderForm.dueDate}
                  onChange={e => setReminderForm(p => ({ ...p, dueDate: e.target.value }))}
                  data-testid="input-reminder-date"
                />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Input
                  type="time"
                  value={reminderForm.dueTime}
                  onChange={e => setReminderForm(p => ({ ...p, dueTime: e.target.value }))}
                  data-testid="input-reminder-time"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Linked Lead (optional)</Label>
              <Select value={reminderForm.leadId} onValueChange={v => setReminderForm(p => ({ ...p, leadId: v === "_none" ? "" : v }))}>
                <SelectTrigger data-testid="select-reminder-lead">
                  <SelectValue placeholder="No lead linked" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">No lead linked</SelectItem>
                  {leads.map(l => (
                    <SelectItem key={l.id} value={l.id}>{l.tenantName} — {l.propertyAddress.split(",")[0]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="Additional context..."
                rows={2}
                value={reminderForm.notes}
                onChange={e => setReminderForm(p => ({ ...p, notes: e.target.value }))}
                data-testid="input-reminder-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReminderForm(false)}>Cancel</Button>
            <Button onClick={handleSaveReminder} disabled={savingReminder} data-testid="button-save-reminder">
              {savingReminder ? "Saving..." : editingReminder ? "Update" : "Set Reminder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== DOCUMENT REQUEST DIALOG ===== */}
      <Dialog open={showDocRequest} onOpenChange={setShowDocRequest}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Request Documents</DialogTitle></DialogHeader>
          {createdLink ? (
            <div className="space-y-4 py-2">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm font-medium text-green-800 mb-2">Upload link created!</p>
                <div className="flex items-center gap-2 bg-white border rounded-lg p-2.5">
                  <p className="text-xs text-gray-600 flex-1 truncate">{createdLink}</p>
                  <Button size="sm" variant="outline" onClick={() => copyLink(createdLink)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <Button className="w-full" onClick={() => { setShowDocRequest(false); setCreatedLink(null); }}>Done</Button>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Recipient Type</Label>
                <Select value={docReqForm.recipientType} onValueChange={v => setDocReqForm(p => ({ ...p, recipientType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tenant">Tenant</SelectItem>
                    <SelectItem value="landlord">Landlord</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Recipient Name *</Label>
                <Input value={docReqForm.recipientName} onChange={e => setDocReqForm(p => ({ ...p, recipientName: e.target.value }))} data-testid="input-doc-recipient-name" />
              </div>
              <div className="space-y-2">
                <Label>Recipient Email *</Label>
                <Input type="email" value={docReqForm.recipientEmail} onChange={e => setDocReqForm(p => ({ ...p, recipientEmail: e.target.value }))} data-testid="input-doc-recipient-email" />
              </div>
              <div className="space-y-2">
                <Label>Documents Required</Label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {(docReqForm.recipientType === "tenant" ? TENANT_DOC_TYPES : LANDLORD_DOC_TYPES).map(doc => (
                    <label key={doc} className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={docReqForm.requiredDocs.includes(doc)}
                        onChange={e => {
                          setDocReqForm(p => ({
                            ...p,
                            requiredDocs: e.target.checked
                              ? [...p.requiredDocs, doc]
                              : p.requiredDocs.filter(d => d !== doc),
                          }));
                        }}
                        className="h-4 w-4 rounded"
                        data-testid={`checkbox-doc-${doc.toLowerCase().replace(/\s+/g, "-")}`}
                      />
                      {doc}
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Expires In (days)</Label>
                <Input type="number" min={1} max={30} value={docReqForm.expiresInDays} onChange={e => setDocReqForm(p => ({ ...p, expiresInDays: parseInt(e.target.value) || 7 }))} data-testid="input-doc-expires" />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDocRequest(false)}>Cancel</Button>
                <Button onClick={handleSendDocRequest} disabled={sendingDocReq} data-testid="button-confirm-doc-request">
                  {sendingDocReq ? "Creating..." : "Create Link"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete lead confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Lead?</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-500 py-2">This will permanently delete the lead and all associated documents and requests.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteLead} disabled={deleting} data-testid="button-confirm-delete-lead">
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete reminder confirm */}
      <Dialog open={!!deleteReminderConfirm} onOpenChange={() => setDeleteReminderConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Reminder?</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-500 py-2">This reminder will be permanently deleted.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteReminderConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteReminder} data-testid="button-confirm-delete-reminder">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
