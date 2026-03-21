import { useState, useEffect, useCallback, useRef } from "react";
import { useQuotes, Quote } from "@/lib/QuoteContext";
import { useAuth } from "@/lib/AuthContext";
import { DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Search, Filter, Download, User, Calendar, MapPin, Car, Home, Briefcase, Plane, Heart, Dog, Shield, Check, X, FileText, BarChart, Settings, LogOut, LayoutDashboard, Users, UserPlus, Plus, MoreHorizontal, Lock, Pause, Play, Ban, Trash2, Mail, MessageSquare, Clock, AlertCircle, Eye, EyeOff, Key, CheckCircle, XCircle, Menu, Pencil, UserCog, Megaphone, Link2, Code, Timer, RefreshCw, Upload, PackageCheck, Send } from "lucide-react";
import AdvertisementManager, { AdvertisementManagerHandle } from "@/components/AdvertisementManager";
import ReportsPanel from "@/components/ReportsPanel";
import LeadDetailView from "@/components/LeadDetailView";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";

export default function AdminCRMPage() {
  const { quotes, updateStatus, assignQuote, assignQuoteLocal, refreshQuotes, addQuote, deleteQuote, addNote, logEmail } = useQuotes();
  const { user, users, approveBroker, denyBroker, logout, updateUser, resetPassword, register } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [refIdFilter, setRefIdFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("dashboard");
  const adHasUnsavedChanges = useRef(false);
  const adManagerRef = useRef<AdvertisementManagerHandle>(null);
  const [adUnsavedDialogOpen, setAdUnsavedDialogOpen] = useState(false);
  const pendingTabRef = useRef<string | null>(null);

  const handleAdUnsavedChanges = useCallback((hasChanges: boolean) => {
    adHasUnsavedChanges.current = hasChanges;
  }, []);

  const switchTab = useCallback((tab: string) => {
    if (activeTab === 'advertisements' && adHasUnsavedChanges.current && tab !== 'advertisements') {
      pendingTabRef.current = tab;
      setAdUnsavedDialogOpen(true);
    } else {
      setActiveTab(tab);
    }
  }, [activeTab]);

  const handleAdTabSaveAndContinue = useCallback(async () => {
    if (adManagerRef.current) {
      const success = await adManagerRef.current.save();
      if (success) {
        setAdUnsavedDialogOpen(false);
        adHasUnsavedChanges.current = false;
        const tab = pendingTabRef.current;
        pendingTabRef.current = null;
        if (tab) setActiveTab(tab);
      }
    }
  }, []);

  const handleAdTabDiscard = useCallback(() => {
    setAdUnsavedDialogOpen(false);
    adHasUnsavedChanges.current = false;
    if (adManagerRef.current) adManagerRef.current.discard();
    const tab = pendingTabRef.current;
    pendingTabRef.current = null;
    if (tab) setActiveTab(tab);
  }, []);

  const handleAdTabCancel = useCallback(() => {
    setAdUnsavedDialogOpen(false);
    pendingTabRef.current = null;
  }, []);
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);
  
  // Lead Detail View State
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [newNote, setNewNote] = useState("");
  const [isEmailOpen, setIsEmailOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Referral Partners State
  const [referralPartners, setReferralPartners] = useState<any[]>([]);
  const [isAddPartnerOpen, setIsAddPartnerOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<any>(null);
  const [partnerForm, setPartnerForm] = useState({
    contactName: "",
    email: "",
    phone: "",
    address: "",
    province: "",
    businessDescription: "",
    relationships: "",
  });
  const [partnerSearch, setPartnerSearch] = useState("");
  
  // New User Form State
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    phone: "",
    role: "broker" as "broker" | "manager" | "admin",
    status: "active" as "pending" | "active",
    password: "",
    brokerage: "",
    yearsOfService: "",
    productTypes: [] as string[],
    permissions: {
      viewLeads: true,
      assignLeads: true,
      manageBrokers: false,
      viewCredits: false,
      adjustBalances: false,
      viewSettings: false,
      viewLeadCosts: false,
      editLeadCosts: false,
      approveAds: false,
      manageAds: false,
      manageSocialMedia: false,
      manageCustomCss: false,
      managePartnerRedirects: false,
      manageSmtp: false,
      manageNotificationEmail: false,
    }
  });
  
  // Edit Permissions Dialog State
  const [isEditPermissionsOpen, setIsEditPermissionsOpen] = useState(false);
  const [editingManagerId, setEditingManagerId] = useState<string | null>(null);
  const [editingPermissions, setEditingPermissions] = useState({
    viewLeads: true,
    assignLeads: true,
    manageBrokers: false,
    viewCredits: false,
    adjustBalances: false,
    viewSettings: false,
    viewLeadCosts: false,
    editLeadCosts: false,
    approveAds: false,
    manageAds: false,
    manageSocialMedia: false,
    manageCustomCss: false,
    managePartnerRedirects: false,
    manageSmtp: false,
    manageNotificationEmail: false,
  });

  // Lead costs from API
  const [leadCosts, setLeadCosts] = useState<Record<string, number>>({});
  const [assigningLead, setAssigningLead] = useState<string | null>(null);

  // Credits tab state
  const [isAddFundsOpen, setIsAddFundsOpen] = useState(false);
  const [selectedBrokerForFunds, setSelectedBrokerForFunds] = useState<string | null>(null);
  const [fundAmount, setFundAmount] = useState("");
  const [fundReason, setFundReason] = useState("");
  const [editingLeadCost, setEditingLeadCost] = useState<string | null>(null);
  const [newLeadCost, setNewLeadCost] = useState("");
  
  // Edit User Dialog State
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<{
    id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    brokerage: string;
    status: string;
  } | null>(null);
  const [editingDefaultCosts, setEditingDefaultCosts] = useState(false);
  const [editedCosts, setEditedCosts] = useState<Record<string, string>>({});
  
  // User Filter State
  const [userRoleFilter, setUserRoleFilter] = useState<string>("all");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  
  // Postal Codes / Cities Assignment Dialog
  const [isAssignAreaOpen, setIsAssignAreaOpen] = useState(false);
  const [assigningUserId, setAssigningUserId] = useState<string | null>(null);
  const [assignedPostalCodes, setAssignedPostalCodes] = useState<string>("");
  const [assignedCities, setAssignedCities] = useState<string>("");
  const [savingAreas, setSavingAreas] = useState(false);
  
  // Timed Pause Dialog State
  const [isPauseDialogOpen, setIsPauseDialogOpen] = useState(false);
  const [pausingUserId, setPausingUserId] = useState<string | null>(null);
  const [pauseStartDate, setPauseStartDate] = useState("");
  const [pauseEndDate, setPauseEndDate] = useState("");
  const [isPausingUser, setIsPausingUser] = useState(false);
  
  // Mobile Menu State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // SMTP Settings State
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUsername, setSmtpUsername] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpFromEmail, setSmtpFromEmail] = useState("");
  const [smtpFromName, setSmtpFromName] = useState("");
  const [smtpUseSsl, setSmtpUseSsl] = useState(true);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [smtpConfigured, setSmtpConfigured] = useState(false);
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [smtpHasPassword, setSmtpHasPassword] = useState(false);
  const [smtpSendingTest, setSmtpSendingTest] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState("");
  
  // Notification Email State
  const [notificationEmail, setNotificationEmail] = useState("info@quoteus.ca");
  const [savingNotificationEmail, setSavingNotificationEmail] = useState(false);
  
  // Social Media State
  const [socialMedia, setSocialMedia] = useState({
    facebook: "",
    instagram: "",
    twitter: "",
    linkedin: "",
    youtube: "",
    tiktok: "",
  });
  const [savingSocialMedia, setSavingSocialMedia] = useState(false);
  
  // Custom CSS State
  const [customCss, setCustomCss] = useState("");
  const [updateFile, setUpdateFile] = useState<File | null>(null);
  const [installingUpdate, setInstallingUpdate] = useState(false);
  const [updateResult, setUpdateResult] = useState<any>(null);
  const [reportAds, setReportAds] = useState<any[]>([]);
  const [savingCustomCss, setSavingCustomCss] = useState(false);
  
  // Partner Redirects State
  interface PartnerRedirect {
    id: string;
    quoteType: string;
    redirectUrl: string;
    isActive: boolean;
    description: string | null;
    createdAt: string;
    updatedAt: string;
  }
  const [redirects, setRedirects] = useState<PartnerRedirect[]>([]);
  const [loadingRedirects, setLoadingRedirects] = useState(false);
  const [isAddRedirectOpen, setIsAddRedirectOpen] = useState(false);
  const [editingRedirect, setEditingRedirect] = useState<PartnerRedirect | null>(null);
  const [newRedirect, setNewRedirect] = useState({
    quoteType: "",
    redirectUrl: "",
    isActive: true,
    description: "",
  });
  
  // Lead Expiry Timer State
  const [leadExpiryHours, setLeadExpiryHours] = useState<number>(24);
  const [editingExpiryHours, setEditingExpiryHours] = useState<string>("24");
  const [savingExpiryHours, setSavingExpiryHours] = useState(false);
  const [reassigningLead, setReassigningLead] = useState<string | null>(null);
  const [, setTimerTick] = useState(0);

  // Broker Profile State
  const [isBrokerProfileOpen, setIsBrokerProfileOpen] = useState(false);
  const [profileBroker, setProfileBroker] = useState<any>(null);
  const [brokerNotes, setBrokerNotes] = useState<any[]>([]);
  const [brokerStats, setBrokerStats] = useState<any>(null);
  const [newBrokerNote, setNewBrokerNote] = useState("");
  const [brokerTier, setBrokerTier] = useState<string>("");
  const [brokerPreferredTypes, setBrokerPreferredTypes] = useState<string[]>([]);
  const [brokerDemographics, setBrokerDemographics] = useState("");
  const [brokerReferenceId, setBrokerReferenceId] = useState("");
  const [savingBrokerProfile, setSavingBrokerProfile] = useState(false);
  const [addingBrokerNote, setAddingBrokerNote] = useState(false);

  const openBrokerProfile = async (broker: any) => {
    setProfileBroker(broker);
    setBrokerTier(broker.brokerTier || "");
    setBrokerPreferredTypes(broker.preferredInsuranceTypes || []);
    setBrokerDemographics(broker.preferredDemographics || "");
    setBrokerReferenceId(broker.referenceId || "");
    setIsBrokerProfileOpen(true);
    setNewBrokerNote("");
    try {
      const [notesRes, statsRes] = await Promise.all([
        fetch(`/api/admin/broker-notes/${broker.id}?actorId=${user?.id}`),
        fetch(`/api/admin/broker-stats/${broker.id}?actorId=${user?.id}`),
      ]);
      if (notesRes.ok) setBrokerNotes(await notesRes.json());
      if (statsRes.ok) setBrokerStats(await statsRes.json());
    } catch (err) {
      console.error("Failed to load broker profile data", err);
    }
  };

  const saveBrokerProfile = async () => {
    if (!profileBroker) return;
    setSavingBrokerProfile(true);
    try {
      const res = await fetch("/api/admin/broker-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brokerId: profileBroker.id,
          brokerTier: brokerTier || null,
          preferredInsuranceTypes: brokerPreferredTypes,
          preferredDemographics: brokerDemographics,
          referenceId: brokerReferenceId || null,
          actorId: user?.id,
        }),
      });
      if (res.ok) {
        toast({ title: "Profile Updated", description: `${profileBroker.name}'s profile has been saved.` });
        window.location.reload();
      } else {
        const err = await res.json();
        toast({ title: "Error", description: err.error, variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to save broker profile", variant: "destructive" });
    } finally {
      setSavingBrokerProfile(false);
    }
  };

  const addBrokerNote = async () => {
    if (!profileBroker || !newBrokerNote.trim()) return;
    setAddingBrokerNote(true);
    try {
      const res = await fetch("/api/admin/broker-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brokerId: profileBroker.id,
          content: newBrokerNote.trim(),
          actorId: user?.id,
          authorName: user?.name,
        }),
      });
      if (res.ok) {
        const note = await res.json();
        setBrokerNotes(prev => [note, ...prev]);
        setNewBrokerNote("");
        toast({ title: "Note Added" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to add note", variant: "destructive" });
    } finally {
      setAddingBrokerNote(false);
    }
  };

  const deleteBrokerNote = async (noteId: string) => {
    try {
      const res = await fetch(`/api/admin/broker-notes/${noteId}?actorId=${user?.id}`, { method: "DELETE" });
      if (res.ok) {
        setBrokerNotes(prev => prev.filter(n => n.id !== noteId));
        toast({ title: "Note Deleted" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to delete note", variant: "destructive" });
    }
  };

  const insuranceTypes = ["Auto", "Home", "Tenant", "Business", "Life", "Travel", "Pet", "Mortgage", "Rent Guarantee"];
  const tierColors: Record<string, string> = {
    bronze: "bg-amber-700 text-white",
    silver: "bg-slate-400 text-white",
    gold: "bg-yellow-500 text-white",
    platinum: "bg-slate-700 text-white",
  };

  // Manager Permissions State
  const [managerPermissions, setManagerPermissions] = useState({
    viewLeads: true,
    assignLeads: true,
    manageBrokers: false,
    viewCredits: true,
    adjustBalances: false,
    viewSettings: false,
    viewLeadCosts: false,
    editLeadCosts: false,
    approveAds: false,
    manageAds: false,
    manageSocialMedia: false,
    manageCustomCss: false,
    managePartnerRedirects: false,
    manageSmtp: false,
    manageNotificationEmail: false,
  });
  const [savingPermissions, setSavingPermissions] = useState(false);

  useEffect(() => {
    fetch("/api/credits/lead-costs")
      .then(r => r.json())
      .then(data => setLeadCosts(data.costs || {}))
      .catch(console.error);
    
    // Load SMTP settings
    fetch("/api/admin/smtp/settings")
      .then(r => r.json())
      .then(data => {
        if (data.configured) {
          setSmtpConfigured(true);
          setSmtpHost(data.host || "");
          setSmtpPort(data.port?.toString() || "587");
          setSmtpUsername(data.username || "");
          setSmtpFromEmail(data.fromEmail || "");
          setSmtpFromName(data.fromName || "");
          setSmtpUseSsl(data.useSsl !== false);
          setSmtpHasPassword(data.hasPassword === true);
        }
      })
      .catch(console.error);
    
    // Load notification email setting
    fetch("/api/admin/settings/notification_email")
      .then(r => r.json())
      .then(data => {
        if (data.value) {
          setNotificationEmail(data.value);
        }
      })
      .catch(console.error);
    
    // Load manager permissions
    fetch("/api/admin/manager-permissions")
      .then(r => r.json())
      .then(data => {
        if (data.permissions) {
          setManagerPermissions(prev => ({ ...prev, ...data.permissions }));
        }
      })
      .catch(console.error);
    
    // Load partner redirects
    fetch("/api/admin/redirects")
      .then(r => r.json())
      .then(data => setRedirects(data))
      .catch(console.error);
    
    // Load social media settings
    fetch("/api/settings/social-media")
      .then(r => r.json())
      .then(data => {
        if (data && typeof data === 'object') {
          setSocialMedia(prev => ({ ...prev, ...data }));
        }
      })
      .catch(console.error);
    
    // Load custom CSS
    fetch("/api/settings/custom-css")
      .then(r => r.json())
      .then(data => {
        if (data && data.value) {
          setCustomCss(data.value);
        }
      })
      .catch(console.error);
    
    // Load advertisements for reports
    fetch("/api/admin/advertisements")
      .then(r => r.json())
      .then(data => setReportAds(Array.isArray(data) ? data : []))
      .catch(console.error);

    // Load lead expiry hours setting
    fetch("/api/settings/lead-expiry-hours")
      .then(r => r.json())
      .then(data => {
        setLeadExpiryHours(data.hours || 24);
        setEditingExpiryHours((data.hours || 24).toString());
      })
      .catch(console.error);

    // Load referral partners
    fetch("/api/referral-partners")
      .then(r => r.json())
      .then(data => setReferralPartners(Array.isArray(data) ? data : []))
      .catch(console.error);

  }, []);

  // Check for expired leads when user loads (separate effect with user dependency)
  useEffect(() => {
    if (user?.id && (user?.role === 'admin' || user?.role === 'manager')) {
      fetch("/api/leads/check-expiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorId: user.id }),
      }).then(r => r.json())
        .then(data => {
          if (data.expiredCount > 0) refreshQuotes();
        })
        .catch(console.error);
    }
  }, [user?.id]);

  // Tick every 30 seconds to update countdown timers
  useEffect(() => {
    const interval = setInterval(() => setTimerTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);
  
  // Check if current user has permission for a feature
  // Uses per-manager permissions first, falls back to global settings
  const hasPermission = (permission: keyof typeof managerPermissions): boolean => {
    if (user?.role === 'admin') return true;
    if (user?.role === 'manager') {
      // Check per-manager permissions first
      if (user.permissions && typeof user.permissions === 'object') {
        const perms = user.permissions as Record<string, boolean>;
        if (permission in perms) {
          return perms[permission];
        }
      }
      // Fall back to global manager permissions
      return managerPermissions[permission];
    }
    return false;
  };
  
  // Lead expiry timer helpers
  const getTimeRemaining = (assignedAt: string | Date | null) => {
    if (!assignedAt) return null;
    const assigned = new Date(assignedAt);
    const expiryTime = new Date(assigned.getTime() + leadExpiryHours * 60 * 60 * 1000);
    const now = new Date();
    const remaining = expiryTime.getTime() - now.getTime();
    if (remaining <= 0) return { expired: true, hours: 0, minutes: 0, text: "Expired" };
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    return { expired: false, hours, minutes, text: `${hours}h ${minutes}m` };
  };

  const saveExpiryHours = async () => {
    const hours = parseFloat(editingExpiryHours);
    if (isNaN(hours) || hours < 1 || hours > 720) {
      toast({ title: "Invalid hours", description: "Must be between 1 and 720", variant: "destructive" });
      return;
    }
    setSavingExpiryHours(true);
    try {
      const res = await fetch("/api/settings/lead-expiry-hours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hours, actorId: user?.id }),
      });
      if (res.ok) {
        setLeadExpiryHours(hours);
        toast({ title: "Expiry Timer Updated", description: `Lead response timer set to ${hours} hours` });
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to update expiry timer", variant: "destructive" });
    } finally {
      setSavingExpiryHours(false);
    }
  };

  const handleReassignLead = async (quoteId: string, brokerId: string, brokerName: string) => {
    setReassigningLead(quoteId);
    try {
      const res = await fetch("/api/leads/reassign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId, brokerId, actorId: user?.id, actorName: user?.name }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({
          title: "Reassignment Failed",
          description: data.error || "Could not reassign lead",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Lead Reassigned",
        description: `Lead reassigned to ${brokerName}. $${data.leadCost} deducted.`,
      });
      refreshQuotes();
    } catch (err) {
      toast({ title: "Error", description: "Failed to reassign lead", variant: "destructive" });
    } finally {
      setReassigningLead(null);
    }
  };

  const saveManagerPermissions = async () => {
    setSavingPermissions(true);
    try {
      const res = await fetch("/api/admin/manager-permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: managerPermissions, actorId: user?.id }),
      });
      if (res.ok) {
        alert("Manager permissions saved successfully!");
      } else {
        alert("Failed to save permissions");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving permissions");
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleAssignWithCredits = async (quoteId: string, brokerId: string, brokerName: string) => {
    if (brokerId === "unassigned") {
      // Use standard assignment for unassigning (no credit involved)
      assignQuote(quoteId, "unassigned", user?.name);
      toast({
        title: "Lead Unassigned",
        description: "Lead is now unassigned.",
      });
      return;
    }

    setAssigningLead(quoteId);
    try {
      const response = await fetch("/api/leads/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteId,
          brokerId,
          actorId: user?.id,
          actorName: user?.name
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        if (data.error === "Insufficient balance") {
          toast({
            title: "Insufficient Credits",
            description: `${brokerName} needs $${data.required} but only has $${parseFloat(data.currentBalance).toFixed(2)}.`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Assignment Failed",
            description: data.error || "Could not assign lead",
            variant: "destructive",
          });
        }
        return;
      }

      // Server is authoritative - update local state to match (no additional API call)
      assignQuoteLocal(quoteId, brokerId);
      
      toast({
        title: "Lead Assigned",
        description: `Lead assigned to ${brokerName}. $${data.leadCost} deducted. New balance: $${parseFloat(data.newBalance).toFixed(2)}`,
      });
      
      // Refresh quotes to get updated activities
      refreshQuotes();
    } catch (error) {
      console.error("Assignment error:", error);
      toast({
        title: "Assignment Failed",
        description: "An error occurred while assigning the lead",
        variant: "destructive",
      });
    } finally {
      setAssigningLead(null);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          password: newUser.password,
          role: newUser.role,
          status: newUser.status,
          actorId: user?.id,
          ...(newUser.role === 'broker' && {
            brokerage: newUser.brokerage,
            yearsOfService: newUser.yearsOfService ? parseInt(newUser.yearsOfService) : undefined,
            productTypes: newUser.productTypes
          }),
          ...(newUser.role === 'manager' && {
            permissions: newUser.permissions
          })
        }),
      });
      
      if (!response.ok) {
        const err = await response.json();
        toast({
          title: "Error",
          description: err.error || "Failed to create user",
          variant: "destructive",
        });
        return;
      }
      
      setIsAddUserOpen(false);
      setNewUser({ 
        name: "", email: "", phone: "", role: "broker", status: "active", 
        password: "", brokerage: "", yearsOfService: "", productTypes: [],
        permissions: {
          viewLeads: true, assignLeads: true, manageBrokers: false,
          viewCredits: false, adjustBalances: false, viewSettings: false,
          viewLeadCosts: false, editLeadCosts: false, approveAds: false,
          manageAds: false, manageSocialMedia: false, manageCustomCss: false,
          managePartnerRedirects: false, manageSmtp: false, manageNotificationEmail: false
        }
      });
      toast({
        title: "User Added",
        description: `New ${newUser.role} account has been created.`,
      });
      window.location.reload();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create user",
        variant: "destructive",
      });
    }
  };

  // Open Edit Permissions dialog for a manager
  const openEditPermissions = (manager: any) => {
    const perms = manager.permissions || {
      viewLeads: true,
      assignLeads: true,
      manageBrokers: false,
      viewCredits: false,
      adjustBalances: false,
      viewSettings: false,
      viewLeadCosts: false,
      editLeadCosts: false,
      approveAds: false,
      manageAds: false,
      manageSocialMedia: false,
      manageCustomCss: false,
      managePartnerRedirects: false,
      manageSmtp: false,
      manageNotificationEmail: false,
    };
    setEditingManagerId(manager.id);
    setEditingPermissions(perms);
    setIsEditPermissionsOpen(true);
  };

  // Save permissions for a manager
  const handleSavePermissions = async () => {
    if (!editingManagerId) return;
    try {
      const response = await fetch(`/api/users/${editingManagerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permissions: editingPermissions,
          actorId: user?.id,
        }),
      });
      
      if (response.ok) {
        toast({
          title: "Permissions Updated",
          description: "Manager permissions have been saved.",
        });
        setIsEditPermissionsOpen(false);
        window.location.reload();
      } else {
        const err = await response.json();
        toast({
          title: "Error",
          description: err.error || "Failed to update permissions",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save permissions",
        variant: "destructive",
      });
    }
  };

  // Send email to broker state
  const [sendingEmailToQuote, setSendingEmailToQuote] = useState<string | null>(null);
  const [binderEmailDoc, setBinderEmailDoc] = useState<{url: string; filename: string; quoteId: string} | null>(null);
  const [binderEmailTo, setBinderEmailTo] = useState("");
  const [binderEmailSending, setBinderEmailSending] = useState(false);

  const handleSendLeadToBroker = async (quoteId: string) => {
    setSendingEmailToQuote(quoteId);
    try {
      const response = await fetch(`/api/leads/${quoteId}/send-to-broker`, {
        method: 'POST',
      });
      if (response.ok) {
        toast({
          title: "Email Sent",
          description: "Lead details have been sent to the assigned broker.",
        });
      } else {
        const error = await response.json();
        toast({
          title: "Failed to Send Email",
          description: error.error || "Could not send email to broker.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSendingEmailToQuote(null);
    }
  };

  // Manual Lead Form State
  const [newLead, setNewLead] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    type: "Auto",
    source: "Manual Entry",
    notes: ""
  });

  const handleAddManualLead = (e: React.FormEvent) => {
    e.preventDefault();
    addQuote({
      type: newLead.type as any,
      clientName: `${newLead.firstName} ${newLead.lastName}`,
      email: newLead.email,
      phone: newLead.phone,
      source: newLead.source,
      priority: 'Medium',
      details: {
        notes: newLead.notes
      }
    });
    
    setIsAddLeadOpen(false);
    setNewLead({ firstName: "", lastName: "", email: "", phone: "", type: "Auto", source: "Manual Entry", notes: "" });
    toast({
      title: "Lead Added",
      description: "Manual lead has been successfully added to the CRM.",
    });
  };

  const handleAddNote = () => {
    if (!selectedQuote || !newNote.trim()) return;
    addNote(selectedQuote.id, newNote, user?.name || 'Admin');
    setNewNote("");
    toast({
      title: "Note Added",
      description: "Internal note has been added to the lead.",
    });
    // Force refresh selected quote
    const updated = quotes.find(q => q.id === selectedQuote.id);
    if (updated) setSelectedQuote(updated);
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuote || !emailSubject.trim() || !emailTo.trim() || !emailBody.trim()) return;
    
    setIsSendingEmail(true);
    try {
      const res = await fetch(`/api/leads/${selectedQuote.id}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actorId: user?.id,
          to: emailTo,
          subject: emailSubject,
          body: emailBody,
        }),
      });
      if (res.ok) {
        toast({ title: "Email Sent", description: `Email sent to ${emailTo}` });
        setEmailTo("");
        setEmailSubject("");
        setEmailBody("");
        setIsEmailOpen(false);
        await refreshQuotes();
      } else {
        const err = await res.json();
        toast({ title: "Error", description: err.error || "Failed to send email", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to send email", variant: "destructive" });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const PROVINCES = [
    { code: "ON", name: "Ontario" },
    { code: "AB", name: "Alberta" },
    { code: "BC", name: "British Columbia" },
    { code: "MB", name: "Manitoba" },
    { code: "NB", name: "New Brunswick" },
    { code: "NL", name: "Newfoundland & Labrador" },
    { code: "NS", name: "Nova Scotia" },
    { code: "NT", name: "Northwest Territories" },
    { code: "NU", name: "Nunavut" },
    { code: "PE", name: "Prince Edward Island" },
    { code: "QC", name: "Quebec" },
    { code: "SK", name: "Saskatchewan" },
    { code: "YT", name: "Yukon" },
  ];

  const fetchReferralPartners = () => {
    fetch("/api/referral-partners")
      .then(r => r.json())
      .then(data => setReferralPartners(Array.isArray(data) ? data : []))
      .catch(console.error);
  };

  const resetPartnerForm = () => {
    setPartnerForm({ contactName: "", email: "", phone: "", address: "", province: "", businessDescription: "", relationships: "" });
    setEditingPartner(null);
  };

  const handleSavePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerForm.contactName || !partnerForm.email || !partnerForm.province) {
      toast({ title: "Missing Fields", description: "Contact name, email, and province are required.", variant: "destructive" });
      return;
    }

    try {
      if (editingPartner) {
        const res = await fetch(`/api/referral-partners/${editingPartner.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ actorId: user?.id, ...partnerForm }),
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
        toast({ title: "Partner Updated", description: `${partnerForm.contactName} has been updated.` });
      } else {
        const res = await fetch("/api/referral-partners", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ actorId: user?.id, ...partnerForm }),
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
        const data = await res.json();
        toast({ title: "Partner Created", description: `Reference ID ${data.referenceId} assigned to ${partnerForm.contactName}.` });
      }
      resetPartnerForm();
      setIsAddPartnerOpen(false);
      fetchReferralPartners();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save partner", variant: "destructive" });
    }
  };

  const handleDeletePartner = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete partner "${name}"?`)) return;
    try {
      const res = await fetch(`/api/referral-partners/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorId: user?.id }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      toast({ title: "Partner Deleted", description: `${name} has been removed.` });
      fetchReferralPartners();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to delete partner", variant: "destructive" });
    }
  };

  const handleTogglePartnerStatus = async (partner: any) => {
    const newStatus = partner.status === "active" ? "paused" : "active";
    try {
      const res = await fetch(`/api/referral-partners/${partner.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorId: user?.id, status: newStatus }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      toast({ title: "Status Updated", description: `Partner is now ${newStatus}.` });
      fetchReferralPartners();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to update status", variant: "destructive" });
    }
  };

  const filteredPartners = referralPartners.filter(p => {
    if (!partnerSearch) return true;
    const search = partnerSearch.toLowerCase();
    return p.contactName?.toLowerCase().includes(search) || 
           p.email?.toLowerCase().includes(search) || 
           p.referenceId?.toLowerCase().includes(search) ||
           p.province?.toLowerCase().includes(search);
  });

  const partnerLeadCounts = referralPartners.reduce((acc: Record<string, number>, p: any) => {
    acc[p.referenceId] = quotes.filter(q => q.referenceId && q.referenceId.toUpperCase() === p.referenceId.toUpperCase()).length;
    return acc;
  }, {});

  const handlePasswordReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUserForReset && newPassword) {
      resetPassword(selectedUserForReset, newPassword);
      setIsResetPasswordOpen(false);
      setNewPassword("");
      setSelectedUserForReset(null);
      toast({
        title: "Password Updated",
        description: "The user's password has been successfully changed.",
      });
    }
  };

  const openPasswordReset = (userId: string) => {
    setSelectedUserForReset(userId);
    setIsResetPasswordOpen(true);
  };

  const handleStatusChange = (userId: string, status: 'active' | 'paused' | 'cancelled') => {
    updateUser(userId, { status });
    toast({
      title: "Status Updated",
      description: `User status has been changed to ${status}.`,
    });
  };

  const openPauseDialog = (userId: string) => {
    setPausingUserId(userId);
    setPauseStartDate(new Date().toISOString().split('T')[0]);
    setPauseEndDate("");
    setIsPauseDialogOpen(true);
  };

  const handleTimedPause = async () => {
    if (!pausingUserId) return;
    
    setIsPausingUser(true);
    try {
      const response = await fetch(`/api/users/${pausingUserId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'paused',
          pauseStartDate: pauseStartDate ? new Date(pauseStartDate).toISOString() : null,
          pauseEndDate: pauseEndDate ? new Date(pauseEndDate).toISOString() : null,
          actorId: user?.id,
        }),
      });
      
      if (response.ok) {
        toast({
          title: "Access Paused",
          description: pauseEndDate 
            ? `User access paused from ${pauseStartDate} to ${pauseEndDate}.`
            : `User access paused starting ${pauseStartDate}.`,
        });
        setIsPauseDialogOpen(false);
        // Refresh users
        window.location.reload();
      } else {
        throw new Error('Failed to pause user');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to pause user access.",
        variant: "destructive",
      });
    } finally {
      setIsPausingUser(false);
    }
  };

  const openEditUser = (userToEdit: any) => {
    setEditingUser({
      id: userToEdit.id,
      name: userToEdit.name || "",
      email: userToEdit.email || "",
      phone: userToEdit.phone || "",
      role: userToEdit.role || "broker",
      brokerage: userToEdit.brokerage || "",
      status: userToEdit.status || "active",
    });
    setIsEditUserOpen(true);
  };

  const handleSaveEditUser = async () => {
    if (!editingUser) return;
    
    try {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingUser.name,
          email: editingUser.email,
          phone: editingUser.phone,
          brokerage: editingUser.brokerage,
          status: editingUser.status,
          actorId: user?.id,
        }),
      });
      
      if (res.ok) {
        updateUser(editingUser.id, {
          name: editingUser.name,
          email: editingUser.email,
          phone: editingUser.phone,
          brokerage: editingUser.brokerage,
          status: editingUser.status as any,
        });
        toast({
          title: "User Updated",
          description: "Account details have been saved successfully.",
        });
        setIsEditUserOpen(false);
        setEditingUser(null);
      } else {
        const err = await res.json();
        toast({
          title: "Error",
          description: err.error || "Failed to update user",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save changes",
        variant: "destructive",
      });
    }
  };

  // Auth check - simulate protected route
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary/30">
        <Card className="max-w-md w-full">
          <CardHeader>
             <CardTitle className="text-destructive flex items-center gap-2"><Shield /> Access Denied</CardTitle>
             <CardDescription>You do not have permission to view this page.</CardDescription>
          </CardHeader>
          <CardContent>
             <Link href="/dashboard">
               <Button className="w-full">Go to Login</Button>
             </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    setLocation('/login');
    toast({
      title: "Logged Out",
      description: "You have been securely logged out.",
    });
  };

  // Redirect CRUD functions
  const QUOTE_TYPES = ["Auto", "Home", "Tenant", "Business", "Life", "Travel", "Pet", "Mortgage", "Rent Guarantee", "General"];
  
  const fetchRedirects = async () => {
    setLoadingRedirects(true);
    try {
      const res = await fetch("/api/admin/redirects");
      const data = await res.json();
      setRedirects(data);
    } catch (error) {
      console.error("Failed to fetch redirects:", error);
    } finally {
      setLoadingRedirects(false);
    }
  };

  const handleSaveRedirect = async () => {
    if (!newRedirect.quoteType || !newRedirect.redirectUrl) {
      toast({ title: "Error", description: "Quote type and redirect URL are required", variant: "destructive" });
      return;
    }
    
    try {
      const url = editingRedirect 
        ? `/api/admin/redirects/${editingRedirect.id}`
        : "/api/admin/redirects";
      const method = editingRedirect ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRedirect),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save redirect");
      }
      
      toast({ title: "Success", description: editingRedirect ? "Redirect updated" : "Redirect created" });
      setIsAddRedirectOpen(false);
      setEditingRedirect(null);
      setNewRedirect({ quoteType: "", redirectUrl: "", isActive: true, description: "" });
      fetchRedirects();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteRedirect = async (id: string) => {
    if (!confirm("Are you sure you want to delete this redirect?")) return;
    
    try {
      const res = await fetch(`/api/admin/redirects/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete redirect");
      
      toast({ title: "Success", description: "Redirect deleted" });
      fetchRedirects();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleToggleRedirectActive = async (redirect: PartnerRedirect) => {
    try {
      const res = await fetch(`/api/admin/redirects/${redirect.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !redirect.isActive }),
      });
      if (!res.ok) throw new Error("Failed to update redirect");
      
      fetchRedirects();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const openEditRedirect = (redirect: PartnerRedirect) => {
    setEditingRedirect(redirect);
    setNewRedirect({
      quoteType: redirect.quoteType,
      redirectUrl: redirect.redirectUrl,
      isActive: redirect.isActive,
      description: redirect.description || "",
    });
    setIsAddRedirectOpen(true);
  };

  const filteredQuotes = quotes.filter(quote => {
    // Hide expired leads only from the broker who failed to action them
    if (user?.role === 'broker' && quote.status === 'Expired' && quote.assignedTo === user.id) return false;
    
    const matchesSearch = 
      quote.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (quote.email && quote.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (quote.postalCode && quote.postalCode.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = typeFilter === "all" || quote.type === typeFilter;
    const matchesStatus = statusFilter === "all" || quote.status === statusFilter;
    const matchesRefId = refIdFilter === "all" 
      ? true 
      : refIdFilter === "has_ref" 
        ? !!(quote as any).referenceId 
        : refIdFilter === "no_ref" 
          ? !(quote as any).referenceId 
          : (quote as any).referenceId === refIdFilter;

    return matchesSearch && matchesType && matchesStatus && matchesRefId;
  });

  // Sort by date descending
  const sortedQuotes = [...filteredQuotes].sort((a, b) => 
    new Date(b.date || new Date()).getTime() - new Date(a.date || new Date()).getTime()
  );

  const getIconForType = (type: string) => {
    switch (type) {
      case 'Auto': return <Car size={16} />;
      case 'Home': return <Home size={16} />;
      case 'Tenant': return <Home size={16} />;
      case 'Business': return <Briefcase size={16} />;
      case 'Travel': return <Plane size={16} />;
      case 'Life': return <Heart size={16} />;
      case 'Pet': return <Dog size={16} />;
      default: return <User size={16} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New': return 'bg-blue-500 hover:bg-blue-600';
      case 'Contacted': return 'bg-amber-500 hover:bg-amber-600';
      case 'Quoted': return 'bg-emerald-500 hover:bg-emerald-600';
      case 'Bound': return 'bg-purple-600 hover:bg-purple-700';
      case 'Follow-Up': return 'bg-orange-500 hover:bg-orange-600';
      case 'Closed': return 'bg-teal-600 hover:bg-teal-700';
      case 'Lost': return 'bg-red-500 hover:bg-red-600';
      case 'Win': return 'bg-green-600 hover:bg-green-700';
      case 'Lose': return 'bg-rose-700 hover:bg-rose-800';
      case 'Expired': return 'bg-gray-500 hover:bg-gray-600';
      default: return 'bg-slate-500';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch(priority) {
      case 'High': return 'bg-red-100 text-red-700 border-red-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getUserStatusBadge = (status: string) => {
    switch(status) {
      case 'active': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'paused': return 'bg-orange-500';
      case 'cancelled': return 'bg-red-500';
      case 'denied': return 'bg-red-500';
      default: return 'bg-slate-500';
    }
  };

  // Filter users for the Manager Tab
  const allStaff = users.filter(u => u.role !== 'customer');
  const allBrokers = users.filter(u => u.role === 'broker' && (u.status === 'active' || u.status === 'paused' || u.status === 'cancelled'));
  const pendingBrokers = users.filter(u => u.role === 'broker' && u.status === 'pending');
  
  // Filtered staff based on role filter and search query
  const filteredStaff = allStaff.filter(u => {
    const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
    const matchesSearch = userSearchQuery === '' || 
      u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      (u.phone && u.phone.includes(userSearchQuery));
    return matchesRole && matchesSearch;
  });
  
  // Helper to check if broker is currently in pause period
  const isBrokerPaused = (broker: any): boolean => {
    if (broker.status === 'paused') return true;
    const now = new Date();
    if (broker.pauseStartDate && broker.pauseEndDate) {
      const start = new Date(broker.pauseStartDate);
      const end = new Date(broker.pauseEndDate);
      return now >= start && now <= end;
    }
    if (broker.pauseStartDate && !broker.pauseEndDate) {
      const start = new Date(broker.pauseStartDate);
      return now >= start;
    }
    return false;
  };
  
  // Brokers available for lead assignment (excludes paused)
  const brokers = allBrokers.filter(b => !isBrokerPaused(b));

  // Reports Data Calculation
  const getBrokerStats = (brokerId: string) => {
    const brokerQuotes = quotes.filter(q => q.assignedTo === brokerId);
    return {
      total: brokerQuotes.length,
      new: brokerQuotes.filter(q => q.status === 'New').length,
      inProgress: brokerQuotes.filter(q => q.status === 'Contacted' || q.status === 'Quoted').length,
      closed: brokerQuotes.filter(q => q.status === 'Closed').length
    };
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Persistent CRM Navigation */}
      <div className="bg-primary text-white shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              {/* Mobile Menu Button */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="md:hidden text-white hover:bg-white/10"
                  onClick={() => setMobileMenuOpen(true)}
                >
                  <Menu size={24} />
                </Button>
                <SheetContent side="left" className="w-[280px] p-0">
                  <SheetHeader className="bg-primary text-white p-4">
                    <SheetTitle className="text-white font-serif">QuoteUs CRM</SheetTitle>
                    <SheetDescription className="text-white/70">
                      {user.name} ({user.role})
                    </SheetDescription>
                  </SheetHeader>
                  <nav className="flex flex-col p-2">
                    <Button 
                      variant={activeTab === 'dashboard' ? 'secondary' : 'ghost'} 
                      className="justify-start mb-1"
                      onClick={() => { switchTab('dashboard'); setMobileMenuOpen(false); }}
                    >
                      <LayoutDashboard size={18} className="mr-3" /> Dashboard
                    </Button>
                    {hasPermission('viewLeads') && (
                    <Button 
                      variant={activeTab === 'leads' ? 'secondary' : 'ghost'} 
                      className="justify-start mb-1"
                      onClick={() => { switchTab('leads'); setMobileMenuOpen(false); }}
                    >
                      <FileText size={18} className="mr-3" /> Leads
                    </Button>
                    )}
                    {(user?.role === 'admin' || user?.role === 'manager') && (
                    <Button 
                      variant={activeTab === 'partners' ? 'secondary' : 'ghost'} 
                      className="justify-start mb-1"
                      onClick={() => { switchTab('partners'); setMobileMenuOpen(false); }}
                    >
                      <UserCog size={18} className="mr-3" /> Partners
                    </Button>
                    )}
                    <Button 
                      variant={activeTab === 'manager' ? 'secondary' : 'ghost'} 
                      className="justify-start mb-1"
                      onClick={() => { switchTab('manager'); setMobileMenuOpen(false); }}
                    >
                      <Users size={18} className="mr-3" /> Manager
                      {pendingBrokers.length > 0 && <Badge className="ml-auto bg-red-500 text-white border-none">{pendingBrokers.length}</Badge>}
                    </Button>
                    <Button 
                      variant={activeTab === 'reports' ? 'secondary' : 'ghost'} 
                      className="justify-start mb-1"
                      onClick={() => { switchTab('reports'); setMobileMenuOpen(false); }}
                    >
                      <BarChart size={18} className="mr-3" /> Reports
                    </Button>
                    {hasPermission('viewCredits') && (
                      <Button 
                        variant={activeTab === 'credits' ? 'secondary' : 'ghost'} 
                        className="justify-start mb-1"
                        onClick={() => { switchTab('credits'); setMobileMenuOpen(false); }}
                      >
                        <DollarSign size={18} className="mr-3" /> Credits
                      </Button>
                    )}
                    {user?.role === 'admin' && (
                      <Button 
                        variant={activeTab === 'connections' ? 'secondary' : 'ghost'} 
                        className="justify-start mb-1"
                        onClick={() => { switchTab('connections'); setMobileMenuOpen(false); }}
                      >
                        <Link2 size={18} className="mr-3" /> Connections
                      </Button>
                    )}
                    {(user?.role === 'admin' || hasPermission('approveAds')) && (
                      <Button 
                        variant={activeTab === 'advertisements' ? 'secondary' : 'ghost'} 
                        className="justify-start mb-1"
                        onClick={() => { switchTab('advertisements'); setMobileMenuOpen(false); }}
                      >
                        <Megaphone size={18} className="mr-3" /> Advertisements
                      </Button>
                    )}
                    <div className="border-t my-2" />
                    {(user?.role === 'admin' || hasPermission('viewSettings')) && (
                      <Button 
                        variant={activeTab === 'settings' ? 'secondary' : 'ghost'} 
                        className="justify-start mb-1"
                        onClick={() => { switchTab('settings'); setMobileMenuOpen(false); }}
                      >
                        <Settings size={18} className="mr-3" /> Settings
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      className="justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                    >
                      <LogOut size={18} className="mr-3" /> Logout
                    </Button>
                  </nav>
                </SheetContent>
              </Sheet>
              
              <h1 className="text-lg md:text-xl font-serif font-bold tracking-tight">QuoteUs <span className="text-white/70 font-sans text-sm font-normal ml-1">CRM</span></h1>
              
              <nav className="hidden md:flex space-x-1">
                <Button 
                  variant={activeTab === 'dashboard' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  onClick={() => switchTab('dashboard')}
                  className={activeTab === 'dashboard' ? 'bg-white text-primary hover:bg-white/90' : 'text-white hover:bg-white/10 hover:text-white'}
                >
                  <LayoutDashboard size={16} className="mr-2" /> Dashboard
                </Button>
                {hasPermission('viewLeads') && (
                <Button 
                  variant={activeTab === 'leads' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  onClick={() => switchTab('leads')}
                  className={activeTab === 'leads' ? 'bg-white text-primary hover:bg-white/90' : 'text-white hover:bg-white/10 hover:text-white'}
                >
                  <FileText size={16} className="mr-2" /> Leads
                </Button>
                )}
                {(user?.role === 'admin' || user?.role === 'manager') && (
                <Button 
                  variant={activeTab === 'partners' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  onClick={() => switchTab('partners')}
                  className={activeTab === 'partners' ? 'bg-white text-primary hover:bg-white/90' : 'text-white hover:bg-white/10 hover:text-white'}
                >
                  <UserCog size={16} className="mr-2" /> Partners
                </Button>
                )}
                <Button 
                  variant={activeTab === 'manager' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  onClick={() => switchTab('manager')}
                  className={activeTab === 'manager' ? 'bg-white text-primary hover:bg-white/90' : 'text-white hover:bg-white/10 hover:text-white'}
                >
                  <Users size={16} className="mr-2" /> Manager
                  {pendingBrokers.length > 0 && <Badge className="ml-2 bg-red-500 text-white border-none h-5 px-1">{pendingBrokers.length}</Badge>}
                </Button>
                <Button 
                  variant={activeTab === 'reports' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  onClick={() => switchTab('reports')}
                  className={activeTab === 'reports' ? 'bg-white text-primary hover:bg-white/90' : 'text-white hover:bg-white/10 hover:text-white'}
                >
                  <BarChart size={16} className="mr-2" /> Reports
                </Button>
                {hasPermission('viewCredits') && (
                  <Button 
                    variant={activeTab === 'credits' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    onClick={() => switchTab('credits')}
                    className={activeTab === 'credits' ? 'bg-white text-primary hover:bg-white/90' : 'text-white hover:bg-white/10 hover:text-white'}
                  >
                    <DollarSign size={16} className="mr-2" /> Credits
                  </Button>
                )}
                {user?.role === 'admin' && (
                  <Button 
                    variant={activeTab === 'connections' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    onClick={() => switchTab('connections')}
                    className={activeTab === 'connections' ? 'bg-white text-primary hover:bg-white/90' : 'text-white hover:bg-white/10 hover:text-white'}
                    data-testid="nav-connections"
                  >
                    <Link2 size={16} className="mr-2" /> Connections
                  </Button>
                )}
                {(user?.role === 'admin' || hasPermission('approveAds')) && (
                  <Button 
                    variant={activeTab === 'advertisements' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    onClick={() => switchTab('advertisements')}
                    className={activeTab === 'advertisements' ? 'bg-white text-primary hover:bg-white/90' : 'text-white hover:bg-white/10 hover:text-white'}
                    data-testid="nav-advertisements"
                  >
                    <Megaphone size={16} className="mr-2" /> Ads
                  </Button>
                )}
              </nav>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              <div className="text-right hidden sm:block mr-2">
                <div className="text-sm font-medium">{user.name}</div>
                <div className="text-xs text-white/70 capitalize">{user.role}</div>
              </div>
              <Button variant="ghost" size="icon" className="hidden md:flex text-white hover:bg-white/10" onClick={() => switchTab('settings')}>
                <Settings size={18} />
              </Button>
              <Button variant="ghost" size="icon" className="hidden md:flex text-white hover:bg-red-500/20 hover:text-red-200" onClick={handleLogout}>
                <LogOut size={18} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        
        {/* Lead Detail Sheet */}
        <Sheet open={!!selectedQuote} onOpenChange={(open) => !open && setSelectedQuote(null)}>
          <SheetContent className="w-full sm:max-w-xl md:max-w-2xl overflow-y-auto">
            {selectedQuote && (
              <>
                <SheetHeader className="mb-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <SheetTitle className="text-2xl font-bold flex items-center gap-2">
                        {selectedQuote.clientName}
                        <Badge variant="outline" className={getPriorityBadge(selectedQuote.priority || 'Medium')}>
                          {selectedQuote.priority || 'Medium'} Priority
                        </Badge>
                      </SheetTitle>
                      <SheetDescription className="mt-1 flex items-center gap-2">
                        Quote #{selectedQuote.quoteNumber} • {format(new Date(selectedQuote.date || new Date()), 'MMMM d, yyyy h:mm a')}
                      </SheetDescription>
                    </div>
                  </div>
                </SheetHeader>

                <Tabs defaultValue="details" className="w-full">
                  <TabsList className="w-full grid grid-cols-3 mb-6">
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="activity">Activity Log</TabsTrigger>
                    <TabsTrigger value="notes">Internal Notes</TabsTrigger>
                  </TabsList>

                  <TabsContent value="details" className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground uppercase">Email</Label>
                        <div className="font-medium flex items-center gap-2">
                           {selectedQuote.email}
                           <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEmailTo(selectedQuote.email || ''); setIsEmailOpen(true); }}>
                             <Mail size={14} />
                           </Button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground uppercase">Phone</Label>
                        <div className="font-medium">{selectedQuote.phone || 'N/A'}</div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground uppercase">Insurance Type</Label>
                        <div className="font-medium flex items-center gap-2">
                          {getIconForType(selectedQuote.type)} {selectedQuote.type}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground uppercase">Source</Label>
                        <div className="font-medium">{selectedQuote.source || 'Web Form'}</div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground uppercase">Postal Code</Label>
                        <div className="font-medium">{selectedQuote.postalCode || 'N/A'}</div>
                      </div>
                       <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground uppercase">Current Status</Label>
                        <Badge className={`${getStatusColor(selectedQuote.status).replace('hover:', '')} border-none`}>{selectedQuote.status}</Badge>
                      </div>
                      {(selectedQuote as any).referenceId && (
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground uppercase">Reference ID</Label>
                          <div className="font-medium font-mono">{(selectedQuote as any).referenceId}</div>
                        </div>
                      )}
                    </div>

                    <div className="border rounded-lg p-4 bg-slate-50">
                      <h4 className="font-semibold mb-3 flex items-center gap-2"><Car size={16}/> Quote Details</h4>
                      <LeadDetailView quoteType={selectedQuote.type} details={selectedQuote.details} />
                    </div>

                    {/* Binder / Confirmation of Insurance */}
                    {(() => {
                      const adminDocs = (selectedQuote as any).binderDocuments?.length > 0
                        ? (selectedQuote as any).binderDocuments
                        : (selectedQuote as any).binderUrl
                          ? [{ url: (selectedQuote as any).binderUrl, filename: (selectedQuote as any).binderUrl.split('/').pop() || 'Document', uploadedAt: (selectedQuote as any).binderUploadedAt || (selectedQuote as any).updatedAt, uploadedBy: 'Broker' }]
                          : [];
                      return (
                    <div className={`border rounded-lg p-4 ${adminDocs.length > 0 ? 'bg-green-50 border-green-200' : 'bg-white'}`}>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <FileText size={16} />
                        Binder / Confirmation of Insurance
                        {adminDocs.length > 0 && (
                          <Badge className="bg-green-100 text-green-800 border-green-300" variant="outline">
                            {adminDocs.length} Doc{adminDocs.length > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">Require binder before closing</p>
                            <p className="text-xs text-muted-foreground">Broker must upload confirmation of insurance</p>
                          </div>
                          <Switch
                            checked={!!(selectedQuote as any).binderRequired}
                            onCheckedChange={async (checked) => {
                              try {
                                const endpoint = checked ? "request-binder" : "remove-binder-request";
                                const res = await fetch(`/api/leads/${selectedQuote.id}/${endpoint}`, {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ actorId: user?.id }),
                                });
                                if (!res.ok) {
                                  const err = await res.json();
                                  throw new Error(err.error || "Failed to update");
                                }
                                setSelectedQuote({ ...selectedQuote, binderRequired: checked } as any);
                                await refreshQuotes();
                                toast({
                                  title: checked ? "Binder Required" : "Binder Requirement Removed",
                                  description: checked ? "Broker must upload a binder before this lead can be closed." : "Binder requirement has been removed.",
                                });
                              } catch (err: any) {
                                toast({ title: "Error", description: err.message || "Failed to update binder requirement", variant: "destructive" });
                              }
                            }}
                            data-testid="switch-binder-required"
                          />
                        </div>
                        {adminDocs.length > 0 && (
                          <div className="space-y-2">
                            {(adminDocs as Array<{url: string; filename: string; uploadedAt: string; uploadedBy: string}>).map((doc, idx) => (
                              <div key={idx} className="bg-green-50 border border-green-200 rounded-lg p-3" data-testid={`admin-binder-doc-${idx}`}>
                                <div className="flex items-center justify-between">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <CheckCircle className="h-4 w-4 text-green-600" />
                                      <p className="text-sm font-medium text-green-800 truncate">{doc.filename}</p>
                                    </div>
                                    <p className="text-xs text-green-600 ml-6">
                                      {doc.uploadedAt ? format(new Date(doc.uploadedAt), 'MMM d, yyyy h:mm a') : ''} {doc.uploadedBy ? `— by ${doc.uploadedBy}` : ''}
                                    </p>
                                  </div>
                                  <div className="flex gap-1 ml-2 shrink-0">
                                    <a href={doc.url} target="_blank" rel="noopener noreferrer" data-testid={`link-view-binder-${idx}`}>
                                      <Button size="sm" variant="outline" className="text-green-700">
                                        <Eye className="h-4 w-4 mr-1" /> View
                                      </Button>
                                    </a>
                                    <Button size="sm" variant="outline" className="text-blue-700" data-testid={`btn-admin-email-binder-${idx}`}
                                      onClick={() => { setBinderEmailDoc({ url: doc.url, filename: doc.filename, quoteId: (selectedQuote as any).id }); setBinderEmailTo(""); }}>
                                      <Send className="h-4 w-4 mr-1" /> Email
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {(selectedQuote as any).binderRequired && adminDocs.length === 0 && (
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="h-4 w-4 text-amber-600" />
                              <span className="text-sm text-amber-800">Awaiting binder upload from broker</span>
                            </div>
                          </div>
                        )}
                        {selectedQuote.status === 'Closed' && adminDocs.length === 0 && !(selectedQuote as any).binderRequired && (
                          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="h-4 w-4 text-slate-500" />
                              <span className="text-sm text-slate-600">Lead is closed. No binder was uploaded. Toggle the switch above to request one from the broker.</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    );
                    })()}
                  </TabsContent>

                  <TabsContent value="activity" className="h-[400px]">
                    <ScrollArea className="h-full pr-4">
                       <div className="space-y-6 pl-2 border-l-2 border-slate-200 ml-2">
                         {selectedQuote.activityLog && selectedQuote.activityLog.length > 0 ? (
                           selectedQuote.activityLog.map((activity) => (
                             <div key={activity.id} className="relative pl-6 pb-2">
                               <div className={`absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 border-white 
                                 ${activity.type === 'status_change' ? 'bg-blue-500' : 
                                   activity.type === 'assignment' ? 'bg-purple-500' : 
                                   activity.type === 'email_sent' ? 'bg-green-500' : 
                                   activity.type === 'note' ? 'bg-yellow-500' : 'bg-slate-400'}`} 
                               />
                               <div className="flex justify-between items-start">
                                 <span className="text-sm font-medium text-slate-900">{activity.author}</span>
                                 <span className="text-xs text-muted-foreground">{format(new Date(activity.timestamp || new Date()), 'MMM d, h:mm a')}</span>
                               </div>
                               <p className="text-sm text-slate-600 mt-1">{activity.content}</p>
                             </div>
                           ))
                         ) : (
                           <div className="pl-6 text-sm text-muted-foreground">No activity recorded yet.</div>
                         )}
                       </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="notes" className="space-y-4">
                    <div className="space-y-2">
                      <Label>Add Internal Note</Label>
                      <Textarea 
                        placeholder="Enter notes about this lead..." 
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        className="min-h-[100px]"
                      />
                      <div className="flex justify-end">
                        <Button size="sm" onClick={handleAddNote} disabled={!newNote.trim()}>Add Note</Button>
                      </div>
                    </div>
                    
                    <div className="mt-6">
                      <h4 className="font-medium mb-3 text-sm text-muted-foreground uppercase">Note History</h4>
                      {selectedQuote.internalNotes ? (
                         <div className="bg-yellow-50/50 p-4 rounded-lg border border-yellow-100 whitespace-pre-wrap text-sm text-slate-700">
                           {selectedQuote.internalNotes}
                         </div>
                      ) : (
                        <div className="text-sm text-muted-foreground italic">No internal notes yet.</div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
                
                <SheetFooter className="mt-6 pt-6 border-t flex-col sm:flex-row gap-2 sm:justify-between">
                   <div className="flex items-center gap-2">
                     <Select 
                        value={selectedQuote.status} 
                        onValueChange={(val: any) => updateStatus(selectedQuote.id, val, user?.name)}
                      >
                        <SelectTrigger className="w-[150px]">
                          <SelectValue placeholder="Update Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="New">New</SelectItem>
                          <SelectItem value="Contacted">Contacted</SelectItem>
                          <SelectItem value="Quoted">Quoted</SelectItem>
                          <SelectItem value="Bound">Bound</SelectItem>
                          <SelectItem value="Closed">Closed</SelectItem>
                          <SelectItem value="Lost">Lost</SelectItem>
                          <SelectItem value="Win">Win</SelectItem>
                          <SelectItem value="Lose">Lose</SelectItem>
                          <SelectItem value="Expired">Expired</SelectItem>
                        </SelectContent>
                      </Select>
                     <Button variant="outline" size="sm" onClick={() => { setEmailTo(selectedQuote.email || ''); setIsEmailOpen(true); }} data-testid="button-email-from-lead">
                       <Mail size={14} className="mr-1" /> Email
                     </Button>
                   </div>
                   <Button variant="outline" onClick={() => setSelectedQuote(null)}>Close</Button>
                </SheetFooter>
              </>
            )}
          </SheetContent>
        </Sheet>

        {/* Email Dialog */}
        <Dialog open={isEmailOpen} onOpenChange={setIsEmailOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Email</DialogTitle>
              <DialogDescription>
                Send an email regarding {selectedQuote?.clientName}'s lead. The email will be logged in the activity history.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSendEmail} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>To</Label>
                <Input 
                  type="email"
                  value={emailTo} 
                  onChange={(e) => setEmailTo(e.target.value)} 
                  placeholder="Enter recipient email"
                  required
                  data-testid="input-email-to"
                />
                {selectedQuote && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedQuote.email && (
                      <Button type="button" size="sm" variant="outline" className="text-xs h-6" onClick={() => setEmailTo(selectedQuote.email!)}>
                        Client: {selectedQuote.email}
                      </Button>
                    )}
                    {selectedQuote.assignedTo && (() => {
                      const broker = users.find(u => u.id === selectedQuote.assignedTo);
                      return broker?.email ? (
                        <Button type="button" size="sm" variant="outline" className="text-xs h-6" onClick={() => setEmailTo(broker.email!)}>
                          Broker: {broker.email}
                        </Button>
                      ) : null;
                    })()}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input 
                  value={emailSubject} 
                  onChange={(e) => setEmailSubject(e.target.value)} 
                  placeholder="Regarding your insurance quote..."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea 
                  value={emailBody} 
                  onChange={(e) => setEmailBody(e.target.value)} 
                  placeholder="Enter your message here..."
                  className="min-h-[150px]"
                  required
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEmailOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSendingEmail}>
                  <Mail size={16} className="mr-2"/> {isSendingEmail ? "Sending..." : "Send Email"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Password Reset Dialog */}
        <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Password</DialogTitle>
              <DialogDescription>
                Set a new password for the selected user. This will take effect immediately.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handlePasswordReset} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input 
                    id="newPassword" 
                    type={showPassword ? "text" : "password"}
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                    minLength={6}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full">Update Password</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Permissions Dialog */}
        <Dialog open={isEditPermissionsOpen} onOpenChange={setIsEditPermissionsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Manager Permissions</DialogTitle>
              <DialogDescription>
                Configure which features this manager can access in the admin portal.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={editingPermissions.viewLeads}
                    onChange={(e) => setEditingPermissions({...editingPermissions, viewLeads: e.target.checked})}
                    className="h-4 w-4 rounded border-gray-300"
                    data-testid="checkbox-edit-perm-view-leads"
                  />
                  <span className="text-sm">View Leads</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={editingPermissions.assignLeads}
                    onChange={(e) => setEditingPermissions({...editingPermissions, assignLeads: e.target.checked})}
                    className="h-4 w-4 rounded border-gray-300"
                    data-testid="checkbox-edit-perm-assign-leads"
                  />
                  <span className="text-sm">Assign Leads</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={editingPermissions.manageBrokers}
                    onChange={(e) => setEditingPermissions({...editingPermissions, manageBrokers: e.target.checked})}
                    className="h-4 w-4 rounded border-gray-300"
                    data-testid="checkbox-edit-perm-manage-brokers"
                  />
                  <span className="text-sm">Manage Brokers</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={editingPermissions.viewCredits}
                    onChange={(e) => setEditingPermissions({...editingPermissions, viewCredits: e.target.checked})}
                    className="h-4 w-4 rounded border-gray-300"
                    data-testid="checkbox-edit-perm-view-credits"
                  />
                  <span className="text-sm">View Credits</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={editingPermissions.adjustBalances}
                    onChange={(e) => setEditingPermissions({...editingPermissions, adjustBalances: e.target.checked})}
                    className="h-4 w-4 rounded border-gray-300"
                    data-testid="checkbox-edit-perm-adjust-balances"
                  />
                  <span className="text-sm">Adjust Balances</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={editingPermissions.viewSettings}
                    onChange={(e) => setEditingPermissions({...editingPermissions, viewSettings: e.target.checked})}
                    className="h-4 w-4 rounded border-gray-300"
                    data-testid="checkbox-edit-perm-view-settings"
                  />
                  <span className="text-sm">View Settings</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={editingPermissions.viewLeadCosts}
                    onChange={(e) => setEditingPermissions({...editingPermissions, viewLeadCosts: e.target.checked})}
                    className="h-4 w-4 rounded border-gray-300"
                    data-testid="checkbox-edit-perm-view-lead-costs"
                  />
                  <span className="text-sm">View Lead Costs</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={editingPermissions.editLeadCosts}
                    onChange={(e) => setEditingPermissions({...editingPermissions, editLeadCosts: e.target.checked})}
                    className="h-4 w-4 rounded border-gray-300"
                    data-testid="checkbox-edit-perm-edit-lead-costs"
                  />
                  <span className="text-sm">Edit Lead Costs</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={editingPermissions.approveAds}
                    onChange={(e) => setEditingPermissions({...editingPermissions, approveAds: e.target.checked})}
                    className="h-4 w-4 rounded border-gray-300"
                    data-testid="checkbox-edit-perm-approve-ads"
                  />
                  <span className="text-sm">Approve Ads</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={editingPermissions.manageAds}
                    onChange={(e) => setEditingPermissions({...editingPermissions, manageAds: e.target.checked})}
                    className="h-4 w-4 rounded border-gray-300"
                    data-testid="checkbox-edit-perm-manage-ads"
                  />
                  <span className="text-sm">Manage Ads</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={editingPermissions.manageSocialMedia}
                    onChange={(e) => setEditingPermissions({...editingPermissions, manageSocialMedia: e.target.checked})}
                    className="h-4 w-4 rounded border-gray-300"
                    data-testid="checkbox-edit-perm-manage-social-media"
                  />
                  <span className="text-sm">Manage Social Media</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={editingPermissions.manageCustomCss}
                    onChange={(e) => setEditingPermissions({...editingPermissions, manageCustomCss: e.target.checked})}
                    className="h-4 w-4 rounded border-gray-300"
                    data-testid="checkbox-edit-perm-manage-custom-css"
                  />
                  <span className="text-sm">Manage Custom CSS</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={editingPermissions.managePartnerRedirects}
                    onChange={(e) => setEditingPermissions({...editingPermissions, managePartnerRedirects: e.target.checked})}
                    className="h-4 w-4 rounded border-gray-300"
                    data-testid="checkbox-edit-perm-manage-partner-redirects"
                  />
                  <span className="text-sm">Manage Partner Redirects</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={editingPermissions.manageSmtp}
                    onChange={(e) => setEditingPermissions({...editingPermissions, manageSmtp: e.target.checked})}
                    className="h-4 w-4 rounded border-gray-300"
                    data-testid="checkbox-edit-perm-manage-smtp"
                  />
                  <span className="text-sm">Manage SMTP</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={editingPermissions.manageNotificationEmail}
                    onChange={(e) => setEditingPermissions({...editingPermissions, manageNotificationEmail: e.target.checked})}
                    className="h-4 w-4 rounded border-gray-300"
                    data-testid="checkbox-edit-perm-manage-notification-email"
                  />
                  <span className="text-sm">Manage Notification Email</span>
                </label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditPermissionsOpen(false)}>Cancel</Button>
              <Button onClick={handleSavePermissions}>Save Permissions</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assign Areas Dialog */}
        <Dialog open={isAssignAreaOpen} onOpenChange={setIsAssignAreaOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Assign Service Areas</DialogTitle>
              <DialogDescription>
                Assign postal codes and cities to this broker. They will receive leads from these areas.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="assignedCities">Cities</Label>
                <Textarea 
                  id="assignedCities" 
                  placeholder="Toronto, Mississauga, Brampton, Oakville..."
                  value={assignedCities}
                  onChange={(e) => setAssignedCities(e.target.value)}
                  rows={2}
                  data-testid="input-assigned-cities"
                />
                <p className="text-xs text-muted-foreground">Enter city names separated by commas</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignedPostalCodes">Postal Codes</Label>
                <Textarea 
                  id="assignedPostalCodes" 
                  placeholder="M5V, M5H, L5B, L6Y..."
                  value={assignedPostalCodes}
                  onChange={(e) => setAssignedPostalCodes(e.target.value)}
                  rows={2}
                  data-testid="input-assigned-postal-codes"
                />
                <p className="text-xs text-muted-foreground">Enter postal code prefixes separated by commas (e.g., M5V, L5B)</p>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsAssignAreaOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={async () => {
                  if (!assigningUserId) return;
                  setSavingAreas(true);
                  try {
                    const postalCodes = assignedPostalCodes.split(',').map(s => s.trim()).filter(s => s);
                    const cities = assignedCities.split(',').map(s => s.trim()).filter(s => s);
                    const res = await fetch(`/api/users/${assigningUserId}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ 
                        assignedPostalCodes: postalCodes,
                        assignedCities: cities,
                        actorId: user?.id 
                      }),
                    });
                    if (res.ok) {
                      toast({ title: "Success", description: "Service areas updated successfully." });
                      setIsAssignAreaOpen(false);
                      window.location.reload();
                    } else {
                      const err = await res.json();
                      toast({ title: "Error", description: err.error || "Failed to update areas", variant: "destructive" });
                    }
                  } catch (err) {
                    toast({ title: "Error", description: "Failed to update areas", variant: "destructive" });
                  } finally {
                    setSavingAreas(false);
                  }
                }}
                disabled={savingAreas}
              >
                {savingAreas ? "Saving..." : "Save Areas"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Timed Pause Dialog */}
        <Dialog open={isPauseDialogOpen} onOpenChange={setIsPauseDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Pause User Access</DialogTitle>
              <DialogDescription>
                Set a time period to pause this user's access. They will not be able to log in during this period.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="pauseStart">Pause Start Date</Label>
                <Input 
                  id="pauseStart" 
                  type="date"
                  value={pauseStartDate} 
                  onChange={(e) => setPauseStartDate(e.target.value)}
                  data-testid="input-pause-start"
                />
                <p className="text-xs text-muted-foreground">When should the pause begin?</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pauseEnd">Pause End Date (Optional)</Label>
                <Input 
                  id="pauseEnd" 
                  type="date"
                  value={pauseEndDate} 
                  onChange={(e) => setPauseEndDate(e.target.value)}
                  min={pauseStartDate}
                  data-testid="input-pause-end"
                />
                <p className="text-xs text-muted-foreground">Leave empty for indefinite pause. Access will be restored automatically after this date.</p>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsPauseDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleTimedPause}
                disabled={isPausingUser || !pauseStartDate}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {isPausingUser ? "Pausing..." : "Pause Access"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Account Details</DialogTitle>
              <DialogDescription>
                Update the account information for this user.
              </DialogDescription>
            </DialogHeader>
            {editingUser && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="editName">Full Name</Label>
                  <Input 
                    id="editName" 
                    value={editingUser.name} 
                    onChange={(e) => setEditingUser({...editingUser, name: e.target.value})}
                    placeholder="John Smith"
                    data-testid="input-edit-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editEmail">Email Address</Label>
                  <Input 
                    id="editEmail" 
                    type="email"
                    value={editingUser.email} 
                    onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                    placeholder="john@example.com"
                    data-testid="input-edit-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editPhone">Phone Number</Label>
                  <Input 
                    id="editPhone" 
                    type="tel"
                    value={editingUser.phone} 
                    onChange={(e) => setEditingUser({...editingUser, phone: e.target.value})}
                    placeholder="416-555-0100"
                    data-testid="input-edit-phone"
                  />
                </div>
                {editingUser.role === 'broker' && (
                  <div className="space-y-2">
                    <Label htmlFor="editBrokerage">Brokerage Name</Label>
                    <Input 
                      id="editBrokerage" 
                      value={editingUser.brokerage} 
                      onChange={(e) => setEditingUser({...editingUser, brokerage: e.target.value})}
                      placeholder="ABC Insurance Brokers Inc."
                      data-testid="input-edit-brokerage"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="editStatus">Account Status</Label>
                  <Select 
                    value={editingUser.status} 
                    onValueChange={(val) => setEditingUser({...editingUser, status: val})}
                  >
                    <SelectTrigger data-testid="select-edit-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="denied">Denied</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-xs text-muted-foreground">
                  Role: <span className="font-medium capitalize">{editingUser.role}</span>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEditUserOpen(false)}>Cancel</Button>
                  <Button onClick={handleSaveEditUser} data-testid="button-save-user-edit">
                    Save Changes
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
        
        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-6 text-slate-800">Overview</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="border-l-4 border-l-blue-500 shadow-sm">
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Total Leads</div>
                  <div className="text-3xl font-bold mt-2">{quotes.length}</div>
                  <div className="text-xs text-muted-foreground mt-1">+12% from last month</div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-green-500 shadow-sm">
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Closed Won</div>
                  <div className="text-3xl font-bold mt-2">{quotes.filter(q => q.status === 'Closed').length}</div>
                  <div className="text-xs text-muted-foreground mt-1">Conversion rate: {Math.round((quotes.filter(q => q.status === 'Closed').length / quotes.length) * 100) || 0}%</div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-yellow-500 shadow-sm">
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">In Progress</div>
                  <div className="text-3xl font-bold mt-2">{quotes.filter(q => ['Contacted', 'Quoted', 'Bound'].includes(q.status)).length}</div>
                  <div className="text-xs text-muted-foreground mt-1">Active opportunities</div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-purple-500 shadow-sm">
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Active Brokers</div>
                  <div className="text-3xl font-bold mt-2">{brokers.length}</div>
                  <div className="text-xs text-muted-foreground mt-1">{pendingBrokers.length} pending approval</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>Recent Leads</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {quotes.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        No leads yet. New quote submissions will appear here.
                      </div>
                    ) : (
                      quotes.slice(0, 5).map(quote => (
                        <div key={quote.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0 hover:bg-slate-50 p-2 rounded transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full bg-slate-100 text-slate-600`}>
                              {getIconForType(quote.type)}
                            </div>
                            <div>
                              <div className="font-medium">{quote.clientName}</div>
                              <div className="text-xs text-muted-foreground">{format(new Date(quote.date || new Date()), 'MMM d, h:mm a')}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col items-end gap-1 mr-2">
                               <Badge className={`${getStatusColor(quote.status).replace('hover:', '')} border-none`}>{quote.status}</Badge>
                               <span className="text-[10px] text-muted-foreground">{quote.priority} Priority</span>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-7 text-xs"
                              data-testid={`button-view-${quote.id}`}
                              onClick={() => setSelectedQuote(quote)}
                            >
                              <Eye size={14} className="mr-1" /> View
                            </Button>
                            {hasPermission('assignLeads') && !quote.assignedTo && (
                              <Select 
                                value=""
                                onValueChange={(val) => {
                                  const broker = users.find(u => u.id === val);
                                  handleAssignWithCredits(quote.id, val, broker?.name || "");
                                }}
                              >
                                <SelectTrigger className="w-[100px] h-7 text-xs">
                                  <SelectValue placeholder="Assign" />
                                </SelectTrigger>
                                <SelectContent>
                                  {brokers.map(broker => (
                                    <SelectItem key={broker.id} value={broker.id}>
                                      <span className="flex items-center gap-1">
                                        {broker.name}
                                        {(broker as any).referenceId && <span className="text-[10px] font-mono text-blue-600">[{(broker as any).referenceId}]</span>}
                                        <span className="text-xs text-muted-foreground">
                                          (${parseFloat(broker.balance || "0").toFixed(0)})
                                        </span>
                                      </span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                            {quote.assignedTo && (
                              <Badge variant="secondary" className="text-xs">
                                {users.find(u => u.id === quote.assignedTo)?.name || 'Assigned'}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <Button variant="link" className="w-full mt-4" onClick={() => switchTab('leads')}>View All Leads</Button>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>Team Performance</CardTitle>
                </CardHeader>
                <CardContent>
                   <div className="space-y-4">
                     {brokers.slice(0, 5).map(broker => {
                        const stats = getBrokerStats(broker.id);
                        const conversion = stats.total > 0 ? Math.round((stats.closed / stats.total) * 100) : 0;
                        return (
                          <div key={broker.id} className="space-y-2">
                             <div className="flex justify-between text-sm">
                               <span className="font-medium">{broker.name}</span>
                               <span className="text-muted-foreground">{conversion}% Conversion</span>
                             </div>
                             <div className="h-2 bg-secondary/20 rounded-full overflow-hidden">
                               <div 
                                 className="h-full bg-green-500 rounded-full" 
                                 style={{ width: `${conversion}%` }}
                               ></div>
                             </div>
                          </div>
                        );
                     })}
                   </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* LEADS TAB */}
        {activeTab === 'leads' && hasPermission('viewLeads') && (
          <Card className="shadow-lg border-none">
            <CardHeader className="bg-white border-b pb-4">
              <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                <CardTitle>Lead Management</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download size={16} /> Export CSV
                  </Button>
                  
                  <Dialog open={isAddLeadOpen} onOpenChange={setIsAddLeadOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-2 bg-primary">
                        <UserPlus size={16} /> Add Manual Lead
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Manual Lead</DialogTitle>
                        <DialogDescription>
                          Manually enter a new lead into the CRM system.
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleAddManualLead} className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="firstName">First Name</Label>
                            <Input 
                              id="firstName" 
                              value={newLead.firstName} 
                              onChange={(e) => setNewLead({...newLead, firstName: e.target.value})}
                              required 
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input 
                              id="lastName" 
                              value={newLead.lastName} 
                              onChange={(e) => setNewLead({...newLead, lastName: e.target.value})}
                              required 
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input 
                            id="email" 
                            type="email"
                            value={newLead.email} 
                            onChange={(e) => setNewLead({...newLead, email: e.target.value})}
                            required 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone</Label>
                          <Input 
                            id="phone" 
                            type="tel"
                            value={newLead.phone} 
                            onChange={(e) => setNewLead({...newLead, phone: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="type">Insurance Type</Label>
                          <Select 
                            value={newLead.type} 
                            onValueChange={(val) => setNewLead({...newLead, type: val})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Auto">Auto</SelectItem>
                              <SelectItem value="Home">Home</SelectItem>
                              <SelectItem value="Tenant">Tenant</SelectItem>
                              <SelectItem value="Business">Business</SelectItem>
                              <SelectItem value="Life">Life</SelectItem>
                              <SelectItem value="Travel">Travel</SelectItem>
                              <SelectItem value="Pet">Pet</SelectItem>
                              <SelectItem value="Mortgage">Mortgage</SelectItem>
                              <SelectItem value="Rent Guarantee">Rent Guarantee</SelectItem>
                              <SelectItem value="General">General</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                           <Label htmlFor="source">Source</Label>
                           <Select 
                            value={newLead.source} 
                            onValueChange={(val) => setNewLead({...newLead, source: val})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Manual Entry">Manual Entry</SelectItem>
                              <SelectItem value="Phone">Phone</SelectItem>
                              <SelectItem value="Walk-in">Walk-in</SelectItem>
                              <SelectItem value="Referral">Referral</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="notes">Initial Notes</Label>
                          <Input 
                            id="notes" 
                            placeholder="Source, preferences, etc."
                            value={newLead.notes} 
                            onChange={(e) => setNewLead({...newLead, notes: e.target.value})}
                          />
                        </div>
                        <DialogFooter>
                          <Button type="submit" className="w-full">Add Lead to CRM</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              
              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-4 mb-6 bg-slate-50 p-4 rounded-lg border">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <Input 
                    placeholder="Search name, email, or postal code..." 
                    className="pl-10 bg-white" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <div className="w-full md:w-48">
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="bg-white">
                      <div className="flex items-center gap-2">
                        <Filter size={16} className="text-muted-foreground" />
                        <SelectValue placeholder="Filter by Type" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="Auto">Auto</SelectItem>
                      <SelectItem value="Home">Home</SelectItem>
                      <SelectItem value="Tenant">Tenant</SelectItem>
                      <SelectItem value="Business">Business</SelectItem>
                      <SelectItem value="Life">Life</SelectItem>
                      <SelectItem value="Travel">Travel</SelectItem>
                      <SelectItem value="Pet">Pet</SelectItem>
                      <SelectItem value="Mortgage">Mortgage</SelectItem>
                      <SelectItem value="Rent Guarantee">Rent Guarantee</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-full md:w-48">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Filter by Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="New">New</SelectItem>
                      <SelectItem value="Contacted">Contacted</SelectItem>
                      <SelectItem value="Quoted">Quoted</SelectItem>
                      <SelectItem value="Bound">Bound</SelectItem>
                      <SelectItem value="Follow-Up">Follow-Up</SelectItem>
                      <SelectItem value="Closed">Closed</SelectItem>
                      <SelectItem value="Lost">Lost</SelectItem>
                      <SelectItem value="Win">Win</SelectItem>
                      <SelectItem value="Lose">Lose</SelectItem>
                      <SelectItem value="Expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-full md:w-48">
                  <Select value={refIdFilter} onValueChange={setRefIdFilter}>
                    <SelectTrigger className="bg-white" data-testid="select-ref-id-filter">
                      <div className="flex items-center gap-2">
                        <Key size={16} className="text-muted-foreground" />
                        <SelectValue placeholder="Reference ID" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Leads</SelectItem>
                      <SelectItem value="has_ref">Has Reference ID</SelectItem>
                      <SelectItem value="no_ref">No Reference ID</SelectItem>
                      {(() => {
                        const uniqueRefIds = [...new Set(quotes.map(q => (q as any).referenceId).filter(Boolean))];
                        return uniqueRefIds.map(refId => (
                          <SelectItem key={refId} value={refId}>
                            <span className="font-mono">{refId}</span>
                            {(() => {
                              const matchingBroker = users.find(u => (u as any).referenceId === refId);
                              return matchingBroker ? <span className="text-muted-foreground ml-1">({matchingBroker.name})</span> : null;
                            })()}
                          </SelectItem>
                        ));
                      })()}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Table */}
              <div className="rounded-md border bg-white overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="w-[120px]">Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Client Details</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Assigned Broker</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedQuotes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                          No quotes found matching your criteria.
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedQuotes.map((quote) => (
                        <TableRow key={quote.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={(e) => {
                          // Don't trigger if clicking on select or button
                          if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('[role="combobox"]')) return;
                          setSelectedQuote(quote);
                        }}>
                          <TableCell>
                            <Select 
                              value={quote.status} 
                              onValueChange={(val: any) => updateStatus(quote.id, val, user?.name)}
                            >
                              <SelectTrigger className={`w-[110px] h-8 text-xs font-bold text-white border-none ${getStatusColor(quote.status).replace('hover:', '')}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="New"><span className="font-bold text-red-600">New</span></SelectItem>
                                <SelectItem value="Contacted"><span className="font-bold text-red-600">Contacted</span></SelectItem>
                                <SelectItem value="Quoted"><span className="font-bold text-red-600">Quoted</span></SelectItem>
                                <SelectItem value="Bound"><span className="font-bold text-red-600">Bound</span></SelectItem>
                                <SelectItem value="Follow-Up"><span className="font-bold text-red-600">Follow-Up</span></SelectItem>
                                <SelectItem value="Closed"><span className="font-bold text-red-600">Closed</span></SelectItem>
                                <SelectItem value="Lost"><span className="font-bold text-red-600">Lost</span></SelectItem>
                                <SelectItem value="Win"><span className="font-bold text-red-600">Win</span></SelectItem>
                                <SelectItem value="Lose"><span className="font-bold text-red-600">Lose</span></SelectItem>
                                <SelectItem value="Expired"><span className="font-bold text-gray-600">Expired</span></SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                             <Badge variant="outline" className={`text-xs ${getPriorityBadge(quote.priority || 'Medium')}`}>
                               {quote.priority || 'Medium'}
                             </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-slate-900">{quote.clientName}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                               {quote.email || 'No email'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                               {quote.phone || 'No phone'} • {quote.source || 'Web'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-secondary/10 rounded-full text-primary">
                                {getIconForType(quote.type)}
                              </div>
                              <span className="font-medium text-sm">{quote.type}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                             <Select 
                              value={quote.assignedTo || "unassigned"} 
                              onValueChange={(val) => {
                                const broker = users.find(u => u.id === val);
                                handleAssignWithCredits(quote.id, val, broker?.name || "");
                              }}
                              disabled={assigningLead === quote.id}
                            >
                              <SelectTrigger className="w-[160px] h-8 text-xs">
                                <SelectValue placeholder="Unassigned" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unassigned">Unassigned</SelectItem>
                                {brokers.map(broker => (
                                  <SelectItem key={broker.id} value={broker.id}>
                                    <span className="flex items-center gap-2">
                                      {broker.name}
                                      <span className="text-xs text-muted-foreground">
                                        (${parseFloat(broker.balance || "0").toFixed(0)})
                                      </span>
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Calendar size={14} />
                              {format(new Date(quote.date || new Date()), 'MMM d')}
                            </div>
                            <div className="text-xs text-muted-foreground pl-5">
                              {format(new Date(quote.date || new Date()), 'h:mm a')}
                            </div>
                            {quote.assignedTo && quote.assignedAt && quote.status === "New" && (
                              (() => {
                                const timer = getTimeRemaining(quote.assignedAt);
                                if (!timer) return null;
                                if (timer.expired) {
                                  return (
                                    <div className="flex items-center gap-1 mt-1 text-xs font-semibold text-red-600">
                                      <Timer size={12} />
                                      Expired
                                    </div>
                                  );
                                }
                                const isUrgent = timer.hours < 2;
                                return (
                                  <div className={`flex items-center gap-1 mt-1 text-xs font-semibold ${isUrgent ? 'text-red-500 animate-pulse' : 'text-orange-500'}`}>
                                    <Timer size={12} />
                                    {timer.text}
                                  </div>
                                );
                              })()
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="text-xs h-7 px-2"
                                data-testid={`button-view-details-${quote.id}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedQuote(quote);
                                }}
                              >
                                <Eye size={14} className="mr-1" />
                                View
                              </Button>
                              {hasPermission('assignLeads') && quote.assignedTo && quote.status !== "Expired" && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="text-xs h-7 px-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                                  data-testid={`button-send-to-broker-${quote.id}`}
                                  disabled={sendingEmailToQuote === quote.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSendLeadToBroker(quote.id);
                                  }}
                                >
                                  <Mail size={14} className="mr-1" />
                                  {sendingEmailToQuote === quote.id ? "Sending..." : "Send"}
                                </Button>
                              )}
                              {hasPermission('assignLeads') && quote.status === "Expired" && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      className="text-xs h-7 px-2 text-amber-600 border-amber-200 hover:bg-amber-50"
                                      data-testid={`button-reassign-${quote.id}`}
                                      disabled={reassigningLead === quote.id}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <RefreshCw size={14} className="mr-1" />
                                      {reassigningLead === quote.id ? "..." : "Reassign"}
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                    <DropdownMenuLabel>Reassign to Broker</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {brokers.filter(b => b.id !== quote.assignedTo && b.status === "active").map(broker => (
                                      <DropdownMenuItem
                                        key={broker.id}
                                        onClick={() => handleReassignLead(quote.id, broker.id, broker.name)}
                                        data-testid={`reassign-to-${broker.id}`}
                                      >
                                        {broker.name} (${parseFloat(broker.balance || "0").toFixed(0)})
                                      </DropdownMenuItem>
                                    ))}
                                    {brokers.filter(b => b.id !== quote.assignedTo && b.status === "active").length === 0 && (
                                      <DropdownMenuItem disabled>No other brokers available</DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                              {hasPermission('assignLeads') && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="text-muted-foreground hover:text-destructive h-7 w-7"
                                  data-testid={`button-delete-${quote.id}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm('Are you sure you want to delete this quote? This action cannot be undone.')) {
                                      deleteQuote(quote.id);
                                      toast({
                                        title: "Quote Deleted",
                                        description: "The quote has been permanently removed.",
                                        variant: "destructive"
                                      });
                                    }
                                  }}
                                >
                                  <Trash2 size={14} />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              
              <div className="mt-4 text-xs text-muted-foreground text-center">
                Showing {sortedQuotes.length} of {quotes.length} total records
              </div>

            </CardContent>
          </Card>
        )}

        {/* PARTNERS TAB */}
        {activeTab === 'partners' && (user?.role === 'admin' || user?.role === 'manager') && (
          <Card className="shadow-lg border-none">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Referral Partners</CardTitle>
                  <CardDescription>Manage referral partner accounts and auto-generated Reference IDs</CardDescription>
                </div>
                <Button onClick={() => { resetPartnerForm(); setIsAddPartnerOpen(true); }} data-testid="button-add-partner">
                  <Plus size={16} className="mr-2" /> Add Partner
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input 
                    placeholder="Search partners..." 
                    value={partnerSearch} 
                    onChange={(e) => setPartnerSearch(e.target.value)} 
                    className="pl-10"
                    data-testid="input-partner-search"
                  />
                </div>
              </div>

              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-indigo-900 mb-2">How Partner Reference IDs Work</h4>
                <ol className="list-decimal list-inside text-sm text-indigo-800 space-y-1">
                  <li>Create a partner account below with their province of business</li>
                  <li>The system generates a unique Reference ID based on province (e.g., ON0000001 for Ontario)</li>
                  <li>Share the Reference ID with the partner</li>
                  <li>When a client enters this code on a quote form, the lead is tagged to this partner</li>
                </ol>
              </div>

              {filteredPartners.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <UserCog className="mx-auto h-12 w-12 mb-3 opacity-40" />
                  <p className="font-medium">No referral partners yet</p>
                  <p className="text-sm mt-1">Click "Add Partner" to create your first referral partner account</p>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Contact Name</TableHead>
                        <TableHead>Reference ID</TableHead>
                        <TableHead>Province</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Leads</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPartners.map((partner) => (
                        <TableRow key={partner.id} data-testid={`row-partner-${partner.id}`}>
                          <TableCell className="font-medium">{partner.contactName}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-sm bg-indigo-50 text-indigo-700 border-indigo-300">
                              {partner.referenceId}
                            </Badge>
                          </TableCell>
                          <TableCell>{PROVINCES.find(p => p.code === partner.province)?.name || partner.province}</TableCell>
                          <TableCell>{partner.email}</TableCell>
                          <TableCell>{partner.phone || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{partnerLeadCounts[partner.referenceId] || 0}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={partner.status === 'active' ? 'bg-green-100 text-green-800 border-green-300' : 'bg-yellow-100 text-yellow-800 border-yellow-300'} variant="outline">
                              {partner.status === 'active' ? 'Active' : 'Paused'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => {
                                setEditingPartner(partner);
                                setPartnerForm({
                                  contactName: partner.contactName,
                                  email: partner.email,
                                  phone: partner.phone || "",
                                  address: partner.address || "",
                                  province: partner.province,
                                  businessDescription: partner.businessDescription || "",
                                  relationships: partner.relationships || "",
                                });
                                setIsAddPartnerOpen(true);
                              }} data-testid={`button-edit-partner-${partner.id}`}>
                                <Pencil size={14} />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleTogglePartnerStatus(partner)} data-testid={`button-toggle-partner-${partner.id}`}>
                                {partner.status === 'active' ? <Pause size={14} /> : <Play size={14} />}
                              </Button>
                              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-800" onClick={() => handleDeletePartner(partner.id, partner.contactName)} data-testid={`button-delete-partner-${partner.id}`}>
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="mt-4 text-sm text-muted-foreground">
                Total Partners: {referralPartners.length} | Active: {referralPartners.filter(p => p.status === 'active').length} | Paused: {referralPartners.filter(p => p.status !== 'active').length}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Add/Edit Partner Dialog */}
        <Dialog open={isAddPartnerOpen} onOpenChange={(open) => { if (!open) { resetPartnerForm(); } setIsAddPartnerOpen(open); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingPartner ? 'Edit Partner' : 'Add Referral Partner'}</DialogTitle>
              <DialogDescription>
                {editingPartner 
                  ? `Update details for ${editingPartner.contactName} (${editingPartner.referenceId})`
                  : 'Create a new referral partner account. A unique Reference ID will be auto-generated based on the selected province.'
                }
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSavePartner} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Primary Contact Name *</Label>
                  <Input 
                    value={partnerForm.contactName} 
                    onChange={(e) => setPartnerForm(f => ({ ...f, contactName: e.target.value }))} 
                    placeholder="John Smith"
                    required
                    data-testid="input-partner-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input 
                    type="email"
                    value={partnerForm.email} 
                    onChange={(e) => setPartnerForm(f => ({ ...f, email: e.target.value }))} 
                    placeholder="partner@example.com"
                    required
                    data-testid="input-partner-email"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input 
                    value={partnerForm.phone} 
                    onChange={(e) => setPartnerForm(f => ({ ...f, phone: e.target.value }))} 
                    placeholder="416-555-0100"
                    data-testid="input-partner-phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Province / Territory *</Label>
                  <Select 
                    value={partnerForm.province} 
                    onValueChange={(val) => setPartnerForm(f => ({ ...f, province: val }))}
                    disabled={!!editingPartner}
                  >
                    <SelectTrigger data-testid="select-partner-province">
                      <SelectValue placeholder="Select province" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVINCES.map(p => (
                        <SelectItem key={p.code} value={p.code}>{p.name} ({p.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input 
                  value={partnerForm.address} 
                  onChange={(e) => setPartnerForm(f => ({ ...f, address: e.target.value }))} 
                  placeholder="123 Main Street, Toronto, ON"
                  data-testid="input-partner-address"
                />
              </div>
              <div className="space-y-2">
                <Label>Business Description</Label>
                <Textarea 
                  value={partnerForm.businessDescription} 
                  onChange={(e) => setPartnerForm(f => ({ ...f, businessDescription: e.target.value }))} 
                  placeholder="Describe the partner's business, services, and how they generate referrals..."
                  className="min-h-[80px]"
                  data-testid="input-partner-business"
                />
              </div>
              <div className="space-y-2">
                <Label>Relationships</Label>
                <Textarea 
                  value={partnerForm.relationships} 
                  onChange={(e) => setPartnerForm(f => ({ ...f, relationships: e.target.value }))} 
                  placeholder="Key contacts, affiliated companies, broker connections..."
                  className="min-h-[80px]"
                  data-testid="input-partner-relationships"
                />
              </div>
              {editingPartner && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <Label className="text-xs text-muted-foreground">Reference ID (auto-generated)</Label>
                  <p className="font-mono text-lg font-bold text-indigo-700">{editingPartner.referenceId}</p>
                </div>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { resetPartnerForm(); setIsAddPartnerOpen(false); }}>Cancel</Button>
                <Button type="submit" data-testid="button-save-partner">
                  {editingPartner ? 'Update Partner' : 'Create Partner'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* MANAGER TAB (Users) */}
        {activeTab === 'manager' && (
           <Card className="shadow-lg border-none">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>Manage staff accounts, roles, and permissions.</CardDescription>
                  </div>
                  {hasPermission('manageBrokers') && (
                  <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                    <DialogTrigger asChild>
                      <Button><UserPlus className="mr-2" size={16}/> Add New User</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New User</DialogTitle>
                        <DialogDescription>
                          Create a new account for a broker or manager.
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleAddUser} className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="userName">Full Name</Label>
                          <Input 
                            id="userName" 
                            value={newUser.name} 
                            onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                            required 
                            placeholder="Jane Doe"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="userEmail">Email Address</Label>
                          <Input 
                            id="userEmail" 
                            type="email"
                            value={newUser.email} 
                            onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                            required 
                            placeholder="jane@QuoteUs.ca"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="userPhone">Phone Number</Label>
                          <Input 
                            id="userPhone" 
                            type="tel"
                            value={newUser.phone} 
                            onChange={(e) => setNewUser({...newUser, phone: e.target.value})}
                            required 
                            placeholder="416-555-0123"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="userRole">Role</Label>
                            <Select 
                              value={newUser.role} 
                              onValueChange={(val: any) => setNewUser({...newUser, role: val})}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="broker">Broker</SelectItem>
                                <SelectItem value="manager">Manager</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="userStatus">Account Status</Label>
                            <Select 
                              value={newUser.status} 
                              onValueChange={(val: any) => setNewUser({...newUser, status: val})}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">Active (Immediate Access)</SelectItem>
                                <SelectItem value="pending">Pending (Requires Approval)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        {(newUser.role === 'manager' || newUser.role === 'admin') && (
                          <div className="space-y-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <Label className="text-blue-800 font-semibold">{newUser.role === 'admin' ? 'Admin' : 'Manager'} Permissions</Label>
                            <p className="text-xs text-blue-600 mb-2">Select which features this {newUser.role} can access:</p>
                            
                            <p className="text-xs font-semibold text-blue-700 mt-3">Leads & Users</p>
                            <div className="grid grid-cols-2 gap-2">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={newUser.permissions.viewLeads}
                                  onChange={(e) => setNewUser({
                                    ...newUser, 
                                    permissions: {...newUser.permissions, viewLeads: e.target.checked}
                                  })}
                                  className="h-4 w-4 rounded border-gray-300"
                                />
                                <span className="text-sm">View Leads</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={newUser.permissions.assignLeads}
                                  onChange={(e) => setNewUser({
                                    ...newUser, 
                                    permissions: {...newUser.permissions, assignLeads: e.target.checked}
                                  })}
                                  className="h-4 w-4 rounded border-gray-300"
                                />
                                <span className="text-sm">Assign Leads</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={newUser.permissions.manageBrokers}
                                  onChange={(e) => setNewUser({
                                    ...newUser, 
                                    permissions: {...newUser.permissions, manageBrokers: e.target.checked}
                                  })}
                                  className="h-4 w-4 rounded border-gray-300"
                                />
                                <span className="text-sm">Manage Brokers</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={newUser.permissions.viewCredits}
                                  onChange={(e) => setNewUser({
                                    ...newUser, 
                                    permissions: {...newUser.permissions, viewCredits: e.target.checked}
                                  })}
                                  className="h-4 w-4 rounded border-gray-300"
                                />
                                <span className="text-sm">View Credits</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={newUser.permissions.adjustBalances}
                                  onChange={(e) => setNewUser({
                                    ...newUser, 
                                    permissions: {...newUser.permissions, adjustBalances: e.target.checked}
                                  })}
                                  className="h-4 w-4 rounded border-gray-300"
                                />
                                <span className="text-sm">Adjust Balances</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={newUser.permissions.viewSettings}
                                  onChange={(e) => setNewUser({
                                    ...newUser, 
                                    permissions: {...newUser.permissions, viewSettings: e.target.checked}
                                  })}
                                  className="h-4 w-4 rounded border-gray-300"
                                />
                                <span className="text-sm">View Settings</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={newUser.permissions.viewLeadCosts}
                                  onChange={(e) => setNewUser({
                                    ...newUser, 
                                    permissions: {...newUser.permissions, viewLeadCosts: e.target.checked}
                                  })}
                                  className="h-4 w-4 rounded border-gray-300"
                                />
                                <span className="text-sm">View Lead Costs</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={newUser.permissions.editLeadCosts}
                                  onChange={(e) => setNewUser({
                                    ...newUser, 
                                    permissions: {...newUser.permissions, editLeadCosts: e.target.checked}
                                  })}
                                  className="h-4 w-4 rounded border-gray-300"
                                />
                                <span className="text-sm">Edit Lead Costs</span>
                              </label>
                            </div>
                            
                            <p className="text-xs font-semibold text-blue-700 mt-4">Ads Section</p>
                            <div className="grid grid-cols-2 gap-2">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={newUser.permissions.approveAds}
                                  onChange={(e) => setNewUser({
                                    ...newUser, 
                                    permissions: {...newUser.permissions, approveAds: e.target.checked}
                                  })}
                                  className="h-4 w-4 rounded border-gray-300"
                                />
                                <span className="text-sm">Approve Ads</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={newUser.permissions.manageAds}
                                  onChange={(e) => setNewUser({
                                    ...newUser, 
                                    permissions: {...newUser.permissions, manageAds: e.target.checked}
                                  })}
                                  className="h-4 w-4 rounded border-gray-300"
                                />
                                <span className="text-sm">Manage Advertisements</span>
                              </label>
                            </div>
                            
                            <p className="text-xs font-semibold text-blue-700 mt-4">Connections Section</p>
                            <div className="grid grid-cols-2 gap-2">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={newUser.permissions.manageSmtp}
                                  onChange={(e) => setNewUser({
                                    ...newUser, 
                                    permissions: {...newUser.permissions, manageSmtp: e.target.checked}
                                  })}
                                  className="h-4 w-4 rounded border-gray-300"
                                />
                                <span className="text-sm">Manage SMTP Settings</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={newUser.permissions.manageNotificationEmail}
                                  onChange={(e) => setNewUser({
                                    ...newUser, 
                                    permissions: {...newUser.permissions, manageNotificationEmail: e.target.checked}
                                  })}
                                  className="h-4 w-4 rounded border-gray-300"
                                />
                                <span className="text-sm">Manage Notification Email</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={newUser.permissions.manageSocialMedia}
                                  onChange={(e) => setNewUser({
                                    ...newUser, 
                                    permissions: {...newUser.permissions, manageSocialMedia: e.target.checked}
                                  })}
                                  className="h-4 w-4 rounded border-gray-300"
                                />
                                <span className="text-sm">Manage Social Media Links</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={newUser.permissions.manageCustomCss}
                                  onChange={(e) => setNewUser({
                                    ...newUser, 
                                    permissions: {...newUser.permissions, manageCustomCss: e.target.checked}
                                  })}
                                  className="h-4 w-4 rounded border-gray-300"
                                />
                                <span className="text-sm">Manage Custom CSS</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={newUser.permissions.managePartnerRedirects}
                                  onChange={(e) => setNewUser({
                                    ...newUser, 
                                    permissions: {...newUser.permissions, managePartnerRedirects: e.target.checked}
                                  })}
                                  className="h-4 w-4 rounded border-gray-300"
                                />
                                <span className="text-sm">Manage Partner Redirects</span>
                              </label>
                            </div>
                          </div>
                        )}
                        
                        {newUser.role === 'broker' && (
                          <>
                            <div className="space-y-2">
                              <Label htmlFor="userBrokerage">Name of Brokerage</Label>
                              <Input 
                                id="userBrokerage" 
                                value={newUser.brokerage} 
                                onChange={(e) => setNewUser({...newUser, brokerage: e.target.value})}
                                placeholder="ABC Insurance Brokers Inc."
                                data-testid="input-brokerage"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="userYears">Years of Service</Label>
                              <Select 
                                value={newUser.yearsOfService} 
                                onValueChange={(val) => setNewUser({...newUser, yearsOfService: val})}
                              >
                                <SelectTrigger data-testid="select-years-service">
                                  <SelectValue placeholder="Select years" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1">Less than 1 year</SelectItem>
                                  <SelectItem value="2">1-2 years</SelectItem>
                                  <SelectItem value="5">3-5 years</SelectItem>
                                  <SelectItem value="10">6-10 years</SelectItem>
                                  <SelectItem value="15">11-15 years</SelectItem>
                                  <SelectItem value="20">16-20 years</SelectItem>
                                  <SelectItem value="25">20+ years</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Products You Sell</Label>
                              <div className="grid grid-cols-2 gap-2">
                                {['Auto', 'Home', 'Life', 'Travel', 'Business', 'Mortgage'].map((product) => (
                                  <label key={product} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={newUser.productTypes.includes(product)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setNewUser({...newUser, productTypes: [...newUser.productTypes, product]});
                                        } else {
                                          setNewUser({...newUser, productTypes: newUser.productTypes.filter(p => p !== product)});
                                        }
                                      }}
                                      className="h-4 w-4 rounded border-gray-300"
                                      data-testid={`checkbox-product-${product.toLowerCase()}`}
                                    />
                                    <span className="text-sm">{product}</span>
                                  </label>
                                ))}
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={newUser.productTypes.some(p => p.startsWith('Other:') || p === 'Other')}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setNewUser({...newUser, productTypes: [...newUser.productTypes, 'Other']});
                                      } else {
                                        setNewUser({...newUser, productTypes: newUser.productTypes.filter(p => !p.startsWith('Other'))});
                                      }
                                    }}
                                    className="h-4 w-4 rounded border-gray-300"
                                    data-testid="checkbox-product-other"
                                  />
                                  <span className="text-sm">Other</span>
                                </label>
                              </div>
                              {newUser.productTypes.some(p => p.startsWith('Other') || p === 'Other') && (
                                <div className="mt-2">
                                  <Input
                                    placeholder="Please describe other products..."
                                    value={newUser.productTypes.find(p => p.startsWith('Other:'))?.replace('Other: ', '') || ''}
                                    onChange={(e) => {
                                      const otherValue = e.target.value ? `Other: ${e.target.value}` : 'Other';
                                      const filtered = newUser.productTypes.filter(p => !p.startsWith('Other'));
                                      setNewUser({...newUser, productTypes: [...filtered, otherValue]});
                                    }}
                                    data-testid="input-product-other-description"
                                  />
                                </div>
                              )}
                            </div>
                          </>
                        )}
                        
                        <div className="space-y-2">
                          <Label htmlFor="userPassword">Initial Password</Label>
                          <div className="relative">
                            <Input 
                              id="userPassword" 
                              type={showNewUserPassword ? "text" : "password"}
                              value={newUser.password} 
                              onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                              required 
                              placeholder="••••••••"
                              className="pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewUserPassword(!showNewUserPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              data-testid="button-toggle-new-user-password"
                            >
                              {showNewUserPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="submit" className="w-full">Create Account</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {/* Pending Approvals Section */}
                {pendingBrokers.length > 0 && (
                  <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h3 className="font-bold text-yellow-800 mb-4 flex items-center gap-2">
                       Pending Approvals <Badge variant="destructive">{pendingBrokers.length}</Badge>
                    </h3>
                    <div className="grid gap-4">
                       {pendingBrokers.map(broker => (
                         <div key={broker.id} className="flex items-center justify-between p-3 bg-white border border-yellow-100 rounded shadow-sm">
                            <div className="flex gap-4 items-center">
                              <div className="h-10 w-10 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 font-bold">
                                {broker.name.charAt(0)}
                              </div>
                              <div>
                                <div className="font-bold text-slate-800">{broker.name}</div>
                                <div className="text-sm text-muted-foreground">{broker.email}</div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                               <Button size="sm" variant="destructive" onClick={() => denyBroker(broker.id)}><X size={16} className="mr-1" /> Deny</Button>
                               <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => approveBroker(broker.id)}><Check size={16} className="mr-1" /> Approve</Button>
                            </div>
                         </div>
                       ))}
                    </div>
                  </div>
                )}

                {/* Search and Filter */}
                <div className="flex flex-wrap gap-4 mb-4">
                  <div className="flex-1 min-w-[200px]">
                    <Input
                      placeholder="Search by name, email, or phone..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="w-full"
                      data-testid="input-user-search"
                    />
                  </div>
                  <Select value={userRoleFilter} onValueChange={setUserRoleFilter}>
                    <SelectTrigger className="w-[180px]" data-testid="select-role-filter">
                      <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="admin">Admins</SelectItem>
                      <SelectItem value="manager">Managers</SelectItem>
                      <SelectItem value="broker">Brokers</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="text-sm text-muted-foreground flex items-center">
                    Showing {filteredStaff.length} of {allStaff.length} users
                  </div>
                </div>
                
                {/* Staff Table */}
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead>User Name</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Assigned Areas</TableHead>
                        <TableHead className="text-center">Assigned Leads</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                       {filteredStaff.map(staff => (
                         <TableRow 
                           key={staff.id} 
                           className="cursor-pointer hover:bg-slate-50"
                           onClick={() => openEditUser(staff)}
                         >
                           <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                                  {staff.name.charAt(0)}
                                </div>
                                <div>
                                  {staff.name}
                                  {staff.role === 'broker' && (staff as any).brokerTier && (
                                    <Badge className={`ml-2 text-[10px] capitalize ${tierColors[(staff as any).brokerTier] || 'bg-gray-500 text-white'}`}>
                                      {(staff as any).brokerTier}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                           </TableCell>
                           <TableCell>
                             <Badge variant="outline" className={`capitalize ${staff.role === 'admin' ? 'border-purple-500 text-purple-700 bg-purple-50' : staff.role === 'manager' ? 'border-blue-500 text-blue-700 bg-blue-50' : 'border-slate-300'}`}>
                               {staff.role}
                             </Badge>
                           </TableCell>
                           <TableCell>
                             <div className="text-sm">{staff.email}</div>
                             <div className="text-xs text-muted-foreground">{staff.phone || 'No phone'}</div>
                           </TableCell>
                           <TableCell>
                             <div className="flex flex-col gap-1">
                               <Badge className={getUserStatusBadge(staff.status)}>
                                 {staff.status}
                               </Badge>
                               {(staff.pauseStartDate || staff.pauseEndDate) && (
                                 <div className="text-[10px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                                   {staff.pauseStartDate && staff.pauseEndDate ? (
                                     <>Pause: {format(new Date(staff.pauseStartDate), 'MMM d')} - {format(new Date(staff.pauseEndDate), 'MMM d')}</>
                                   ) : staff.pauseStartDate ? (
                                     <>Paused from {format(new Date(staff.pauseStartDate), 'MMM d')}</>
                                   ) : null}
                                 </div>
                               )}
                             </div>
                           </TableCell>
                           <TableCell>
                             {staff.role === 'broker' ? (
                               <div className="text-xs">
                                 {((staff as any).assignedPostalCodes?.length > 0 || (staff as any).assignedCities?.length > 0) ? (
                                   <div className="space-y-1">
                                     {(staff as any).assignedCities?.length > 0 && (
                                       <div className="text-muted-foreground">
                                         <span className="font-medium">Cities:</span> {(staff as any).assignedCities.slice(0, 2).join(', ')}
                                         {(staff as any).assignedCities.length > 2 && ` +${(staff as any).assignedCities.length - 2}`}
                                       </div>
                                     )}
                                     {(staff as any).assignedPostalCodes?.length > 0 && (
                                       <div className="text-muted-foreground">
                                         <span className="font-medium">Postal:</span> {(staff as any).assignedPostalCodes.slice(0, 3).join(', ')}
                                         {(staff as any).assignedPostalCodes.length > 3 && ` +${(staff as any).assignedPostalCodes.length - 3}`}
                                       </div>
                                     )}
                                   </div>
                                 ) : (
                                   <span className="text-muted-foreground italic">No areas assigned</span>
                                 )}
                               </div>
                             ) : (
                               <span className="text-muted-foreground">-</span>
                             )}
                           </TableCell>
                           <TableCell className="text-center font-bold">
                             {quotes.filter(q => q.assignedTo === staff.id).length}
                           </TableCell>
                           <TableCell className="text-right">
                            {hasPermission('manageBrokers') ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditUser(staff); }}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openPasswordReset(staff.id); }}>
                                  <Lock className="mr-2 h-4 w-4" />
                                  Change Password
                                </DropdownMenuItem>
                                {staff.role === 'manager' && (
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditPermissions(staff); }}>
                                    <UserCog className="mr-2 h-4 w-4" />
                                    Edit Permissions
                                  </DropdownMenuItem>
                                )}
                                {staff.role === 'broker' && (
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openBrokerProfile(staff); }}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Profile
                                  </DropdownMenuItem>
                                )}
                                {staff.role === 'broker' && (
                                  <DropdownMenuItem onClick={(e) => { 
                                    e.stopPropagation(); 
                                    setAssigningUserId(staff.id);
                                    setAssignedPostalCodes(((staff as any).assignedPostalCodes || []).join(', '));
                                    setAssignedCities(((staff as any).assignedCities || []).join(', '));
                                    setIsAssignAreaOpen(true);
                                  }}>
                                    <MapPin className="mr-2 h-4 w-4" />
                                    Assign Areas
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                {staff.status === 'active' && (
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openPauseDialog(staff.id); }}>
                                    <Pause className="mr-2 h-4 w-4" />
                                    Pause Access
                                  </DropdownMenuItem>
                                )}
                                {staff.status === 'paused' && (
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(staff.id, 'active'); }}>
                                    <Play className="mr-2 h-4 w-4" />
                                    Resume Access
                                  </DropdownMenuItem>
                                )}
                                {staff.status !== 'cancelled' && (
                                  <DropdownMenuItem className="text-red-600" onClick={(e) => { e.stopPropagation(); handleStatusChange(staff.id, 'cancelled'); }}>
                                    <Ban className="mr-2 h-4 w-4" />
                                    Cancel Account
                                  </DropdownMenuItem>
                                )}
                                {staff.status === 'cancelled' && (
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(staff.id, 'active'); }}>
                                    <Check className="mr-2 h-4 w-4" />
                                    Reactivate Account
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                            ) : (
                              <span className="text-sm text-muted-foreground">--</span>
                            )}
                           </TableCell>
                         </TableRow>
                       ))}
                       {allStaff.length === 0 && (
                         <TableRow>
                           <TableCell colSpan={8} className="text-center py-4 text-muted-foreground">
                             No staff members found.
                           </TableCell>
                         </TableRow>
                       )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
           </Card>
        )}

        {activeTab === 'reports' && (
          <ReportsPanel
            quotes={quotes}
            advertisements={reportAds}
            allStaff={allStaff}
            smtpConfigured={smtpConfigured}
            userEmail={user?.email}
            userId={user?.id}
          />
        )}
        
        {/* CREDITS TAB - Admin/Manager with permission */}
        {activeTab === 'credits' && hasPermission('viewCredits') && (
          <Card className="shadow-lg border-none">
            <CardHeader className="bg-white border-b pb-4">
              <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign size={20} /> Credit Management
                  </CardTitle>
                  <CardDescription>Add funds to broker accounts and set custom lead costs.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Broker</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead className="text-right">Lead Cost</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {brokers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                          No brokers found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      brokers.map((broker) => (
                        <TableRow key={broker.id}>
                          <TableCell className="font-medium">{broker.name}</TableCell>
                          <TableCell>{broker.email}</TableCell>
                          <TableCell>
                            <Badge variant={broker.status === 'active' ? 'default' : 'secondary'}>
                              {broker.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            ${parseFloat(broker.balance || "0").toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            {editingLeadCost === broker.id ? (
                              <div className="flex items-center justify-end gap-2">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="Default"
                                  value={newLeadCost}
                                  onChange={(e) => setNewLeadCost(e.target.value)}
                                  className="w-24 h-8 text-right"
                                  data-testid={`input-lead-cost-${broker.id}`}
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8"
                                  onClick={async () => {
                                    try {
                                      const res = await fetch("/api/admin/broker-lead-cost", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({
                                          brokerId: broker.id,
                                          leadCost: newLeadCost || null,
                                          actorId: user?.id,
                                        }),
                                      });
                                      if (res.ok) {
                                        toast({ title: "Lead Cost Updated", description: newLeadCost ? `Set to $${parseFloat(newLeadCost).toFixed(2)} per lead.` : "Reset to default pricing." });
                                        setEditingLeadCost(null);
                                        setNewLeadCost("");
                                        window.location.reload();
                                      } else {
                                        const err = await res.json();
                                        toast({ title: "Error", description: err.error, variant: "destructive" });
                                      }
                                    } catch (err) {
                                      toast({ title: "Error", description: "Failed to update lead cost", variant: "destructive" });
                                    }
                                  }}
                                >
                                  <Check size={14} />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8"
                                  onClick={() => { setEditingLeadCost(null); setNewLeadCost(""); }}
                                >
                                  <X size={14} />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-2">
                                <span className="font-mono">
                                  {broker.leadCostOverride ? `$${parseFloat(broker.leadCostOverride).toFixed(2)}` : "Default"}
                                </span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2"
                                  onClick={() => {
                                    setEditingLeadCost(broker.id);
                                    setNewLeadCost(broker.leadCostOverride || "");
                                  }}
                                  data-testid={`button-edit-lead-cost-${broker.id}`}
                                >
                                  Edit
                                </Button>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {hasPermission('adjustBalances') ? (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1"
                                  onClick={() => {
                                    setSelectedBrokerForFunds(broker.id);
                                    setFundAmount("");
                                    setFundReason("");
                                  }}
                                  data-testid={`button-add-funds-${broker.id}`}
                                >
                                  <DollarSign size={14} /> Add Funds
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Add Funds to {broker.name}</DialogTitle>
                                  <DialogDescription>
                                    Current balance: ${parseFloat(broker.balance || "0").toFixed(2)}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="space-y-2">
                                    <Label>Amount to Add ($)</Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      placeholder="50.00"
                                      value={fundAmount}
                                      onChange={(e) => setFundAmount(e.target.value)}
                                      data-testid="input-fund-amount"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Reason</Label>
                                    <Input
                                      placeholder="Manual credit adjustment"
                                      value={fundReason}
                                      onChange={(e) => setFundReason(e.target.value)}
                                      data-testid="input-fund-reason"
                                    />
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button
                                    onClick={async () => {
                                      if (!fundAmount || !fundReason) {
                                        toast({ title: "Error", description: "Please enter amount and reason", variant: "destructive" });
                                        return;
                                      }
                                      try {
                                        const res = await fetch("/api/admin/credits/adjust", {
                                          method: "POST",
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify({
                                            userId: broker.id,
                                            amount: fundAmount,
                                            reason: fundReason,
                                            actorId: user?.id,
                                            actorName: user?.name,
                                          }),
                                        });
                                        if (res.ok) {
                                          const data = await res.json();
                                          toast({ 
                                            title: "Funds Added", 
                                            description: `$${parseFloat(fundAmount).toFixed(2)} added to ${broker.name}. New balance: $${parseFloat(data.newBalance).toFixed(2)}` 
                                          });
                                          setFundAmount("");
                                          setFundReason("");
                                          window.location.reload();
                                        } else {
                                          const err = await res.json();
                                          toast({ title: "Error", description: err.error, variant: "destructive" });
                                        }
                                      } catch (err) {
                                        toast({ title: "Error", description: "Failed to add funds", variant: "destructive" });
                                      }
                                    }}
                                    data-testid="button-confirm-add-funds"
                                  >
                                    Add ${fundAmount || "0.00"}
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                            ) : (
                              <span className="text-sm text-muted-foreground">--</span>
                            )}
                            {hasPermission('manageBrokers') && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="gap-1 ml-2"
                              onClick={() => openEditUser(broker)}
                              data-testid={`button-edit-user-${broker.id}`}
                            >
                              <Pencil size={14} /> Edit
                            </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">Default Lead Costs</h3>
                  {hasPermission('editLeadCosts') && !editingDefaultCosts ? (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setEditingDefaultCosts(true);
                        setEditedCosts(Object.fromEntries(
                          Object.entries(leadCosts).map(([k, v]) => [k, String(v)])
                        ));
                      }}
                      data-testid="button-edit-default-costs"
                    >
                      Edit Costs
                    </Button>
                  ) : hasPermission('editLeadCosts') && editingDefaultCosts ? (
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setEditingDefaultCosts(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        size="sm"
                        onClick={async () => {
                          try {
                            const numericCosts: Record<string, number> = {};
                            for (const [type, cost] of Object.entries(editedCosts)) {
                              const numCost = parseFloat(cost);
                              if (isNaN(numCost) || numCost < 0) {
                                toast({ title: "Error", description: `Invalid cost for ${type}`, variant: "destructive" });
                                return;
                              }
                              numericCosts[type] = numCost;
                            }
                            const res = await fetch("/api/admin/lead-costs", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ costs: numericCosts, actorId: user?.id }),
                            });
                            if (res.ok) {
                              toast({ title: "Lead Costs Updated", description: "Default lead costs have been saved." });
                              setLeadCosts(numericCosts);
                              setEditingDefaultCosts(false);
                            } else {
                              const err = await res.json();
                              toast({ title: "Error", description: err.error, variant: "destructive" });
                            }
                          } catch (err) {
                            toast({ title: "Error", description: "Failed to update lead costs", variant: "destructive" });
                          }
                        }}
                        data-testid="button-save-default-costs"
                      >
                        Save Changes
                      </Button>
                    </div>
                  ) : null}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(editingDefaultCosts ? editedCosts : leadCosts).map(([type, cost]) => (
                    <div key={type} className="bg-slate-50 rounded-lg p-3 text-center">
                      <div className="text-sm text-muted-foreground mb-1">{type}</div>
                      {editingDefaultCosts ? (
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-lg">$</span>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editedCosts[type] || ""}
                            onChange={(e) => setEditedCosts({ ...editedCosts, [type]: e.target.value })}
                            className="w-20 h-8 text-center font-bold"
                            data-testid={`input-default-cost-${type}`}
                          />
                        </div>
                      ) : (
                        <div className="text-xl font-bold">${cost}</div>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  These are the default costs per lead type. Set a custom lead cost on individual brokers above to override.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ADVERTISEMENTS TAB */}
        {activeTab === 'advertisements' && (user?.role === 'admin' || (user?.role === 'manager' && hasPermission('approveAds'))) && (
          <AdvertisementManager ref={adManagerRef} canApproveAds={user?.role === 'admin' || hasPermission('approveAds')} onHasUnsavedChanges={handleAdUnsavedChanges} />
        )}

        {/* SETTINGS TAB - Manager Permissions */}
        {activeTab === 'settings' && user?.role === 'admin' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="h-5 w-5" />
                Manager Permissions
              </CardTitle>
              <CardDescription>Configure what features managers can access in the admin portal.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Managers have limited access compared to Admins. 
                  Use these settings to control which features they can use.
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">View Leads</h4>
                    <p className="text-sm text-muted-foreground">Allow managers to view and browse leads</p>
                  </div>
                  <Switch
                    checked={managerPermissions.viewLeads}
                    onCheckedChange={(checked) => setManagerPermissions(prev => ({ ...prev, viewLeads: checked }))}
                    data-testid="toggle-manager-view-leads"
                  />
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Assign Leads</h4>
                    <p className="text-sm text-muted-foreground">Allow managers to assign leads to brokers</p>
                  </div>
                  <Switch
                    checked={managerPermissions.assignLeads}
                    onCheckedChange={(checked) => setManagerPermissions(prev => ({ ...prev, assignLeads: checked }))}
                    data-testid="toggle-manager-assign-leads"
                  />
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Manage Brokers</h4>
                    <p className="text-sm text-muted-foreground">Allow managers to add, edit, and manage broker accounts</p>
                  </div>
                  <Switch
                    checked={managerPermissions.manageBrokers}
                    onCheckedChange={(checked) => setManagerPermissions(prev => ({ ...prev, manageBrokers: checked }))}
                    data-testid="toggle-manager-manage-brokers"
                  />
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">View Credits</h4>
                    <p className="text-sm text-muted-foreground">Allow managers to view broker credit balances and transactions</p>
                  </div>
                  <Switch
                    checked={managerPermissions.viewCredits}
                    onCheckedChange={(checked) => setManagerPermissions(prev => ({ ...prev, viewCredits: checked }))}
                    data-testid="toggle-manager-view-credits"
                  />
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Adjust Balances</h4>
                    <p className="text-sm text-muted-foreground">Allow managers to manually adjust broker credit balances</p>
                  </div>
                  <Switch
                    checked={managerPermissions.adjustBalances}
                    onCheckedChange={(checked) => setManagerPermissions(prev => ({ ...prev, adjustBalances: checked }))}
                    data-testid="toggle-manager-adjust-balances"
                  />
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">View Settings</h4>
                    <p className="text-sm text-muted-foreground">Allow managers to view system settings (read-only)</p>
                  </div>
                  <Switch
                    checked={managerPermissions.viewSettings}
                    onCheckedChange={(checked) => setManagerPermissions(prev => ({ ...prev, viewSettings: checked }))}
                    data-testid="toggle-manager-view-settings"
                  />
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Approve Ads</h4>
                    <p className="text-sm text-muted-foreground">Allow managers to approve advertisements before they go live</p>
                  </div>
                  <Switch
                    checked={managerPermissions.approveAds}
                    onCheckedChange={(checked) => setManagerPermissions(prev => ({ ...prev, approveAds: checked }))}
                    data-testid="toggle-manager-approve-ads"
                  />
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Manage Ads</h4>
                    <p className="text-sm text-muted-foreground">Allow managers to create, edit, and delete advertisements</p>
                  </div>
                  <Switch
                    checked={managerPermissions.manageAds}
                    onCheckedChange={(checked) => setManagerPermissions(prev => ({ ...prev, manageAds: checked }))}
                    data-testid="toggle-manager-manage-ads"
                  />
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Manage Social Media</h4>
                    <p className="text-sm text-muted-foreground">Allow managers to configure social media links</p>
                  </div>
                  <Switch
                    checked={managerPermissions.manageSocialMedia}
                    onCheckedChange={(checked) => setManagerPermissions(prev => ({ ...prev, manageSocialMedia: checked }))}
                    data-testid="toggle-manager-manage-social-media"
                  />
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Manage Custom CSS</h4>
                    <p className="text-sm text-muted-foreground">Allow managers to add custom CSS for site-wide styling</p>
                  </div>
                  <Switch
                    checked={managerPermissions.manageCustomCss}
                    onCheckedChange={(checked) => setManagerPermissions(prev => ({ ...prev, manageCustomCss: checked }))}
                    data-testid="toggle-manager-manage-custom-css"
                  />
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Manage Partner Redirects</h4>
                    <p className="text-sm text-muted-foreground">Allow managers to configure partner redirect URLs</p>
                  </div>
                  <Switch
                    checked={managerPermissions.managePartnerRedirects}
                    onCheckedChange={(checked) => setManagerPermissions(prev => ({ ...prev, managePartnerRedirects: checked }))}
                    data-testid="toggle-manager-manage-partner-redirects"
                  />
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Manage SMTP</h4>
                    <p className="text-sm text-muted-foreground">Allow managers to configure email SMTP settings</p>
                  </div>
                  <Switch
                    checked={managerPermissions.manageSmtp}
                    onCheckedChange={(checked) => setManagerPermissions(prev => ({ ...prev, manageSmtp: checked }))}
                    data-testid="toggle-manager-manage-smtp"
                  />
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Manage Notification Email</h4>
                    <p className="text-sm text-muted-foreground">Allow managers to change the notification email address</p>
                  </div>
                  <Switch
                    checked={managerPermissions.manageNotificationEmail}
                    onCheckedChange={(checked) => setManagerPermissions(prev => ({ ...prev, manageNotificationEmail: checked }))}
                    data-testid="toggle-manager-manage-notification-email"
                  />
                </div>
              </div>
              
              <Button 
                onClick={saveManagerPermissions} 
                disabled={savingPermissions}
                data-testid="button-save-manager-permissions"
              >
                {savingPermissions ? "Saving..." : "Save Permissions"}
              </Button>
            </CardContent>
          </Card>
        )}
        
        {/* SETTINGS TAB - Manager view (if permitted - read-only) */}
        {activeTab === 'settings' && user?.role === 'manager' && managerPermissions.viewSettings && (
          <Card>
            <CardHeader>
              <CardTitle>Settings (Read-Only)</CardTitle>
              <CardDescription>
                You can view system settings but cannot make changes. Contact an admin to update settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">Default Lead Costs</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(leadCosts).map(([type, cost]) => (
                    <div key={type} className="bg-slate-50 rounded-lg p-3 text-center">
                      <div className="text-sm text-muted-foreground mb-1">{type}</div>
                      <div className="text-xl font-bold">${cost}</div>
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
              <div className="text-center text-muted-foreground py-4">
                SMTP and other settings are configured by administrators only.
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* SETTINGS TAB - Manager view (no permission) */}
        {activeTab === 'settings' && user?.role === 'manager' && !managerPermissions.viewSettings && (
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-8 text-center text-muted-foreground border border-dashed rounded-lg">
                You don't have permission to view system settings.
              </div>
            </CardContent>
          </Card>
        )}

        {/* CONNECTIONS TAB - API Keys, Services & Redirects */}
        {activeTab === 'connections' && (user?.role === 'admin' || user?.role === 'manager') && (
          <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API Keys & Services
              </CardTitle>
              <CardDescription>
                Configure third-party service integrations. API keys are securely stored as environment secrets.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800">
                  <strong>Security Note:</strong> API keys are stored as encrypted environment secrets and cannot be viewed once set. 
                  To update a key, enter a new value and save.
                </p>
              </div>

              {/* Stripe Payment Integration */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-purple-100 p-2 rounded-lg">
                      <DollarSign className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Stripe Payments</h3>
                      <p className="text-sm text-muted-foreground">Process credit purchases and payments</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    Connected
                  </Badge>
                </div>
                <div className="space-y-3 mt-4">
                  <div className="space-y-2">
                    <Label>Stripe Secret Key</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="password" 
                        placeholder="sk_live_••••••••••••••••"
                        className="font-mono"
                        data-testid="input-stripe-secret-key"
                      />
                      <Button variant="outline" data-testid="button-save-stripe-key">Save</Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Your Stripe secret key from the Stripe Dashboard</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Stripe Publishable Key</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="text" 
                        placeholder="pk_live_••••••••••••••••"
                        className="font-mono"
                        data-testid="input-stripe-publishable-key"
                      />
                      <Button variant="outline" data-testid="button-save-stripe-pub-key">Save</Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Your Stripe publishable key (safe to expose client-side)</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Webhook Signing Secret</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="password" 
                        placeholder="whsec_••••••••••••••••"
                        className="font-mono"
                        data-testid="input-stripe-webhook-secret"
                      />
                      <Button variant="outline" data-testid="button-save-stripe-webhook">Save</Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Used to verify webhook events from Stripe</p>
                  </div>
                </div>
              </div>

              {/* SMTP Email Service Integration */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <Mail className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">SMTP Email (Hosting Company)</h3>
                      <p className="text-sm text-muted-foreground">Connect your hosting company email account</p>
                    </div>
                  </div>
                  {smtpConfigured ? (
                    <Badge variant="outline" className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="h-3 w-3" />
                      Configured
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="flex items-center gap-1 text-muted-foreground">
                      <XCircle className="h-3 w-3" />
                      Not Configured
                    </Badge>
                  )}
                </div>
                <div className="space-y-3 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>SMTP Host</Label>
                      <Input 
                        type="text" 
                        placeholder="mail.yourdomain.com"
                        className="font-mono"
                        value={smtpHost}
                        onChange={(e) => setSmtpHost(e.target.value)}
                        data-testid="input-smtp-host"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>SMTP Port</Label>
                      <Input 
                        type="number" 
                        placeholder="587"
                        className="font-mono"
                        value={smtpPort}
                        onChange={(e) => setSmtpPort(e.target.value)}
                        data-testid="input-smtp-port"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Email Username</Label>
                    <Input 
                      type="text" 
                      placeholder="info@QuoteUs.ca"
                      value={smtpUsername}
                      onChange={(e) => setSmtpUsername(e.target.value)}
                      data-testid="input-smtp-username"
                    />
                    <p className="text-xs text-muted-foreground">Usually your full email address</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Email Password {smtpHasPassword && <span className="text-xs text-green-600 font-normal">(saved)</span>}</Label>
                    <div className="relative">
                      <Input 
                        type={showSmtpPassword ? "text" : "password"}
                        placeholder={smtpHasPassword ? "Leave blank to keep existing password" : "Enter password"}
                        value={smtpPassword}
                        onChange={(e) => setSmtpPassword(e.target.value)}
                        className="pr-10"
                        data-testid="input-smtp-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        data-testid="button-toggle-smtp-password"
                      >
                        {showSmtpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">Your email account password</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>From Email Address</Label>
                      <Input 
                        type="email" 
                        placeholder="info@QuoteUs.ca"
                        value={smtpFromEmail}
                        onChange={(e) => setSmtpFromEmail(e.target.value)}
                        data-testid="input-email-from"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>From Name</Label>
                      <Input 
                        type="text" 
                        placeholder="QuoteUs.ca"
                        value={smtpFromName}
                        onChange={(e) => setSmtpFromName(e.target.value)}
                        data-testid="input-email-from-name"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <input 
                      type="checkbox" 
                      id="smtp-ssl" 
                      className="h-4 w-4" 
                      checked={smtpUseSsl}
                      onChange={(e) => setSmtpUseSsl(e.target.checked)}
                      data-testid="checkbox-smtp-ssl" 
                    />
                    <Label htmlFor="smtp-ssl" className="text-sm font-normal">Use SSL/TLS encryption</Label>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button 
                      variant="outline" 
                      onClick={async () => {
                        if (!smtpHost || !smtpUsername || !smtpPassword) {
                          toast({ title: "Error", description: "Please fill in host, username and password", variant: "destructive" });
                          return;
                        }
                        setSmtpTesting(true);
                        try {
                          const res = await fetch("/api/admin/smtp/test", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              host: smtpHost,
                              port: parseInt(smtpPort),
                              username: smtpUsername,
                              password: smtpPassword,
                              fromEmail: smtpFromEmail || smtpUsername,
                              fromName: smtpFromName || "QuoteUs.ca",
                              useSsl: smtpUseSsl,
                              actorId: user?.id
                            }),
                          });
                          if (res.ok) {
                            toast({ title: "Success", description: "SMTP connection test successful!" });
                          } else {
                            const err = await res.json();
                            toast({ title: "Connection Failed", description: err.error || "Could not connect to SMTP server", variant: "destructive" });
                          }
                        } catch (err) {
                          toast({ title: "Error", description: "Failed to test connection", variant: "destructive" });
                        } finally {
                          setSmtpTesting(false);
                        }
                      }}
                      disabled={smtpTesting}
                      data-testid="button-test-email"
                    >
                      {smtpTesting ? "Testing..." : "Test Connection"}
                    </Button>
                    <Button 
                      onClick={async () => {
                        if (!smtpHost || !smtpUsername || !smtpPassword) {
                          toast({ title: "Error", description: "Please fill in host, username and password", variant: "destructive" });
                          return;
                        }
                        setSmtpSaving(true);
                        try {
                          const res = await fetch("/api/admin/smtp/save", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              host: smtpHost,
                              port: parseInt(smtpPort),
                              username: smtpUsername,
                              password: smtpPassword,
                              fromEmail: smtpFromEmail || smtpUsername,
                              fromName: smtpFromName || "QuoteUs.ca",
                              useSsl: smtpUseSsl,
                              actorId: user?.id
                            }),
                          });
                          if (res.ok) {
                            setSmtpConfigured(true);
                            toast({ title: "Settings Saved", description: "SMTP email settings have been saved." });
                          } else {
                            const err = await res.json();
                            toast({ title: "Error", description: err.error || "Failed to save settings", variant: "destructive" });
                          }
                        } catch (err) {
                          toast({ title: "Error", description: "Failed to save settings", variant: "destructive" });
                        } finally {
                          setSmtpSaving(false);
                        }
                      }}
                      disabled={smtpSaving}
                      data-testid="button-save-smtp"
                    >
                      {smtpSaving ? "Saving..." : "Save Settings"}
                    </Button>
                  </div>
                  
                  {/* Test Email Section */}
                  <div className="mt-4 pt-4 border-t">
                    <Label className="text-sm font-medium">Send Test Email</Label>
                    <div className="flex gap-2 mt-2">
                      <Input 
                        type="email" 
                        placeholder="Enter email to send test"
                        value={testEmailAddress}
                        onChange={(e) => setTestEmailAddress(e.target.value)}
                        className="flex-1"
                        data-testid="input-test-email-address"
                      />
                      <Button 
                        variant="outline"
                        disabled={smtpSendingTest || !testEmailAddress}
                        onClick={async () => {
                          if (!testEmailAddress) return;
                          setSmtpSendingTest(true);
                          try {
                            const res = await fetch("/api/admin/smtp/send-test", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ toEmail: testEmailAddress, actorId: user?.id }),
                            });
                            if (res.ok) {
                              toast({ title: "Success", description: "Test email sent! Check your inbox." });
                            } else {
                              const err = await res.json();
                              toast({ title: "Error", description: err.error || "Failed to send test email", variant: "destructive" });
                            }
                          } catch (err) {
                            toast({ title: "Error", description: "Failed to send test email", variant: "destructive" });
                          } finally {
                            setSmtpSendingTest(false);
                          }
                        }}
                        data-testid="button-send-test-email"
                      >
                        {smtpSendingTest ? "Sending..." : "Send Test"}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Save settings first, then send a test email to verify</p>
                  </div>
                </div>
              </div>

              {/* Admin Notification Email */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-100 p-2 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Admin Notifications</h3>
                      <p className="text-sm text-muted-foreground">Configure where admin alerts are sent</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3 mt-4">
                  <div className="space-y-2">
                    <Label>Admin Email Address</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="email" 
                        placeholder="info@QuoteUs.ca"
                        value={notificationEmail}
                        onChange={(e) => setNotificationEmail(e.target.value)}
                        data-testid="input-admin-email"
                      />
                      <Button 
                        variant="outline" 
                        disabled={savingNotificationEmail}
                        onClick={async () => {
                          if (!notificationEmail) {
                            toast({ title: "Error", description: "Please enter an email address", variant: "destructive" });
                            return;
                          }
                          setSavingNotificationEmail(true);
                          try {
                            const res = await fetch("/api/admin/settings/notification_email", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ value: notificationEmail, actorId: user?.id }),
                            });
                            if (res.ok) {
                              toast({ title: "Saved", description: "Notification email updated successfully." });
                            } else {
                              const err = await res.json();
                              toast({ title: "Error", description: err.error || "Failed to save", variant: "destructive" });
                            }
                          } catch (err) {
                            toast({ title: "Error", description: "Failed to save settings", variant: "destructive" });
                          } finally {
                            setSavingNotificationEmail(false);
                          }
                        }}
                        data-testid="button-save-admin-email"
                      >
                        {savingNotificationEmail ? "Saving..." : "Save"}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Email address to receive new lead notifications</p>
                  </div>
                </div>
              </div>

              {/* Lead Response Timer */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-orange-100 p-2 rounded-lg">
                      <Timer className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Lead Response Timer</h3>
                      <p className="text-sm text-muted-foreground">Set how long brokers have to respond before a lead expires</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3 mt-4">
                  <div className="space-y-2">
                    <Label>Response Time Limit (hours)</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="number" 
                        min="1"
                        max="720"
                        placeholder="24"
                        value={editingExpiryHours}
                        onChange={(e) => setEditingExpiryHours(e.target.value)}
                        data-testid="input-expiry-hours"
                      />
                      <Button 
                        variant="outline" 
                        disabled={savingExpiryHours}
                        onClick={saveExpiryHours}
                        data-testid="button-save-expiry-hours"
                      >
                        {savingExpiryHours ? "Saving..." : "Save"}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Currently set to <span className="font-semibold">{leadExpiryHours} hours</span>. 
                      If a broker doesn't update a lead's status within this time, it will be marked as expired and can be reassigned.
                    </p>
                  </div>
                </div>
              </div>

              {/* Social Media Links */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-pink-100 p-2 rounded-lg">
                      <Link2 className="h-5 w-5 text-pink-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Social Media Links</h3>
                      <p className="text-sm text-muted-foreground">Configure social media icons displayed in website footer</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label>Facebook URL</Label>
                    <Input 
                      placeholder="https://facebook.com/yourpage"
                      value={socialMedia.facebook}
                      onChange={(e) => setSocialMedia(prev => ({ ...prev, facebook: e.target.value }))}
                      data-testid="input-social-facebook"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Instagram URL</Label>
                    <Input 
                      placeholder="https://instagram.com/yourpage"
                      value={socialMedia.instagram}
                      onChange={(e) => setSocialMedia(prev => ({ ...prev, instagram: e.target.value }))}
                      data-testid="input-social-instagram"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Twitter/X URL</Label>
                    <Input 
                      placeholder="https://twitter.com/yourhandle"
                      value={socialMedia.twitter}
                      onChange={(e) => setSocialMedia(prev => ({ ...prev, twitter: e.target.value }))}
                      data-testid="input-social-twitter"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>LinkedIn URL</Label>
                    <Input 
                      placeholder="https://linkedin.com/company/yourcompany"
                      value={socialMedia.linkedin}
                      onChange={(e) => setSocialMedia(prev => ({ ...prev, linkedin: e.target.value }))}
                      data-testid="input-social-linkedin"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>YouTube URL</Label>
                    <Input 
                      placeholder="https://youtube.com/yourchannel"
                      value={socialMedia.youtube}
                      onChange={(e) => setSocialMedia(prev => ({ ...prev, youtube: e.target.value }))}
                      data-testid="input-social-youtube"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>TikTok URL</Label>
                    <Input 
                      placeholder="https://tiktok.com/@yourhandle"
                      value={socialMedia.tiktok}
                      onChange={(e) => setSocialMedia(prev => ({ ...prev, tiktok: e.target.value }))}
                      data-testid="input-social-tiktok"
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <Button 
                    onClick={async () => {
                      setSavingSocialMedia(true);
                      try {
                        const res = await fetch("/api/admin/settings/social_media", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ value: JSON.stringify(socialMedia), actorId: user?.id }),
                        });
                        if (res.ok) {
                          toast({ title: "Saved", description: "Social media links updated successfully." });
                        } else {
                          const err = await res.json();
                          toast({ title: "Error", description: err.error || "Failed to save", variant: "destructive" });
                        }
                      } catch (err) {
                        toast({ title: "Error", description: "Failed to save settings", variant: "destructive" });
                      } finally {
                        setSavingSocialMedia(false);
                      }
                    }}
                    disabled={savingSocialMedia}
                    data-testid="button-save-social-media"
                  >
                    {savingSocialMedia ? "Saving..." : "Save Social Links"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Leave a URL empty to hide that social media icon from the footer.</p>
              </div>

              {/* Custom CSS */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-purple-100 p-2 rounded-lg">
                      <Code className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Custom CSS</h3>
                      <p className="text-sm text-muted-foreground">Add custom styles that will be injected into the website</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <Textarea 
                    placeholder="/* Add your custom CSS here */&#10;.my-class {&#10;  color: blue;&#10;}"
                    value={customCss}
                    onChange={(e) => setCustomCss(e.target.value)}
                    className="font-mono text-sm min-h-[150px]"
                    data-testid="input-custom-css"
                  />
                </div>
                <div className="flex justify-end mt-4">
                  <Button 
                    onClick={async () => {
                      setSavingCustomCss(true);
                      try {
                        const res = await fetch("/api/admin/settings/custom_css", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ value: customCss, actorId: user?.id }),
                        });
                        if (res.ok) {
                          toast({ title: "Saved", description: "Custom CSS updated successfully." });
                        } else {
                          const err = await res.json();
                          toast({ title: "Error", description: err.error || "Failed to save", variant: "destructive" });
                        }
                      } catch (err) {
                        toast({ title: "Error", description: "Failed to save settings", variant: "destructive" });
                      } finally {
                        setSavingCustomCss(false);
                      }
                    }}
                    disabled={savingCustomCss}
                    data-testid="button-save-custom-css"
                  >
                    {savingCustomCss ? "Saving..." : "Save CSS"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">CSS will be applied site-wide. Use with caution.</p>
              </div>

              {/* Reference ID Management */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-indigo-100 p-2 rounded-lg">
                      <Key className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Reference ID Management</h3>
                      <p className="text-sm text-muted-foreground">Assign unique codes to brokers for direct lead routing</p>
                    </div>
                  </div>
                </div>

                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mt-4 space-y-2">
                  <p className="text-sm text-indigo-900 font-semibold">How Reference IDs Work</p>
                  <ol className="text-sm text-indigo-800 list-decimal list-inside space-y-1">
                    <li>Go to the <strong>Staff</strong> tab and click the actions menu (three dots) next to a broker</li>
                    <li>Select <strong>"View Profile"</strong> to open the broker's profile panel</li>
                    <li>In the profile panel, enter a unique 6-character code (letters and numbers) in the <strong>Reference ID</strong> field</li>
                    <li>Click <strong>"Save Profile"</strong> to assign the code to that broker</li>
                    <li>Share the Reference ID code with the broker so they can give it to their clients</li>
                    <li>When a customer fills out any quote form and enters that code, the lead is <strong>automatically assigned</strong> to the broker — no credit deduction</li>
                  </ol>
                </div>

                <div className="mt-4">
                  <h4 className="text-sm font-semibold mb-3">Current Reference ID Assignments</h4>
                  {(() => {
                    const brokersWithRefId = users.filter(u => u.role === 'broker' && (u as any).referenceId);
                    const brokersWithoutRefId = users.filter(u => u.role === 'broker' && !(u as any).referenceId && (u.status === 'active' || u.status === 'paused'));
                    return (
                      <div className="space-y-3">
                        {brokersWithRefId.length > 0 ? (
                          <div className="rounded-md border overflow-hidden">
                            <Table>
                              <TableHeader className="bg-slate-50">
                                <TableRow>
                                  <TableHead>Broker</TableHead>
                                  <TableHead>Reference ID</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead className="text-right">Leads Using This Code</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {brokersWithRefId.map(broker => {
                                  const leadCount = quotes.filter(q => (q as any).referenceId === (broker as any).referenceId).length;
                                  return (
                                    <TableRow key={broker.id} data-testid={`refid-row-${broker.id}`}>
                                      <TableCell className="font-medium">{broker.name}</TableCell>
                                      <TableCell>
                                        <Badge variant="outline" className="font-mono text-indigo-700 bg-indigo-50">
                                          {(broker as any).referenceId}
                                        </Badge>
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant={broker.status === 'active' ? 'default' : 'secondary'}>
                                          {broker.status}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="text-right font-medium">{leadCount}</TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        ) : (
                          <div className="text-center py-6 text-muted-foreground border rounded-lg bg-slate-50">
                            <Key className="h-8 w-8 mx-auto mb-2 opacity-40" />
                            <p className="text-sm">No Reference IDs assigned yet.</p>
                            <p className="text-xs mt-1">Go to the Staff tab, click a broker's actions menu, then "View Profile" to assign one.</p>
                          </div>
                        )}
                        {brokersWithoutRefId.length > 0 && (
                          <div className="text-xs text-muted-foreground mt-2">
                            <span className="font-medium">{brokersWithoutRefId.length} broker{brokersWithoutRefId.length > 1 ? 's' : ''}</span> without a Reference ID: {brokersWithoutRefId.map(b => b.name).join(', ')}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="text-sm text-muted-foreground mt-4">
                <p>Need help setting up integrations? Contact support for assistance with API configuration.</p>
              </div>
            </CardContent>
          </Card>

          {/* Partner Redirects Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Link2 className="h-5 w-5" />
                    Partner Redirects
                  </CardTitle>
                  <CardDescription>Configure redirect URLs for partner sites after quote submissions.</CardDescription>
                </div>
                <Dialog open={isAddRedirectOpen} onOpenChange={(open) => {
                  setIsAddRedirectOpen(open);
                  if (!open) {
                    setEditingRedirect(null);
                    setNewRedirect({ quoteType: "", redirectUrl: "", isActive: true, description: "" });
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button data-testid="btn-add-redirect">
                      <UserPlus className="h-4 w-4 mr-2" /> Add Redirect
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingRedirect ? "Edit Redirect" : "Add Partner Redirect"}</DialogTitle>
                      <DialogDescription>
                        Configure a redirect URL that users will be sent to after submitting a quote.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Quote Type</Label>
                        <Select 
                          value={newRedirect.quoteType}
                          onValueChange={(value) => setNewRedirect(prev => ({ ...prev, quoteType: value }))}
                          disabled={!!editingRedirect}
                        >
                          <SelectTrigger data-testid="select-redirect-type">
                            <SelectValue placeholder="Select quote type" />
                          </SelectTrigger>
                          <SelectContent>
                            {QUOTE_TYPES.filter(type => 
                              editingRedirect?.quoteType === type || !redirects.find(r => r.quoteType === type)
                            ).map(type => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Redirect URL</Label>
                        <Input 
                          value={newRedirect.redirectUrl}
                          onChange={(e) => setNewRedirect(prev => ({ ...prev, redirectUrl: e.target.value }))}
                          placeholder="https://partner-site.com/quote"
                          data-testid="input-redirect-url"
                        />
                        <p className="text-xs text-muted-foreground">The full URL where users will be redirected after submitting their quote.</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Description (optional)</Label>
                        <Textarea 
                          value={newRedirect.description}
                          onChange={(e) => setNewRedirect(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Partner name or notes about this redirect"
                          data-testid="input-redirect-description"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch 
                          id="redirectActive"
                          checked={newRedirect.isActive}
                          onCheckedChange={(checked) => setNewRedirect(prev => ({ ...prev, isActive: checked }))}
                          data-testid="switch-redirect-active"
                        />
                        <Label htmlFor="redirectActive" className="cursor-pointer">Active</Label>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddRedirectOpen(false)}>Cancel</Button>
                      <Button onClick={handleSaveRedirect} data-testid="btn-save-redirect">
                        {editingRedirect ? "Update" : "Create"} Redirect
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  <strong>How it works:</strong> When a customer submits a quote for a type with an active redirect, 
                  they will be automatically redirected to the partner site after their quote is saved.
                </p>
              </div>
              
              {redirects.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Link2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No redirects configured yet.</p>
                  <p className="text-sm">Add a redirect to send customers to partner sites after quote submission.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Quote Type</TableHead>
                      <TableHead>Redirect URL</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {redirects.map(redirect => (
                      <TableRow key={redirect.id} data-testid={`redirect-row-${redirect.id}`}>
                        <TableCell>
                          <Badge variant="outline">{redirect.quoteType}</Badge>
                        </TableCell>
                        <TableCell>
                          <a 
                            href={redirect.redirectUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm max-w-xs truncate block"
                          >
                            {redirect.redirectUrl}
                          </a>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                          {redirect.description || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={redirect.isActive ? "default" : "secondary"}>
                            {redirect.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" data-testid={`redirect-actions-${redirect.id}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditRedirect(redirect)}>
                                <Pencil className="h-4 w-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleRedirectActive(redirect)}>
                                {redirect.isActive ? (
                                  <>
                                    <Pause className="h-4 w-4 mr-2" /> Deactivate
                                  </>
                                ) : (
                                  <>
                                    <Play className="h-4 w-4 mr-2" /> Activate
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDeleteRedirect(redirect.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Update Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PackageCheck className="h-5 w-5" />
                Update
              </CardTitle>
              <CardDescription>
                Upload a ZIP file to install updates. This will update application files without affecting the database or critical configuration files.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Update Guide:</strong> Select the update ZIP file exported from Replit, then click "Install Update". 
                  Protected files (database schema, migrations, environment config) will be automatically skipped to keep your system safe.
                </p>
              </div>
              
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800">
                  <strong>Safety Note:</strong> This will only update application code files (pages, components, styles, routes). 
                  It will NOT modify your database, user data, environment variables, or critical system files.
                </p>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium mb-2">
                  {updateFile ? updateFile.name : "Select a ZIP file to upload"}
                </p>
                {updateFile && (
                  <p className="text-xs text-muted-foreground mb-3">
                    Size: {(updateFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                )}
                <div className="flex justify-center gap-2">
                  <label htmlFor="update-file-input">
                    <input
                      id="update-file-input"
                      type="file"
                      accept=".zip"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setUpdateFile(file);
                        setUpdateResult(null);
                      }}
                      data-testid="input-update-file"
                    />
                    <Button variant="outline" asChild>
                      <span>
                        <Upload className="h-4 w-4 mr-2" />
                        {updateFile ? "Change File" : "Choose ZIP File"}
                      </span>
                    </Button>
                  </label>
                  {updateFile && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setUpdateFile(null); setUpdateResult(null); }}
                      data-testid="button-clear-update-file"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  disabled={!updateFile || installingUpdate}
                  onClick={async () => {
                    if (!updateFile) return;
                    setInstallingUpdate(true);
                    setUpdateResult(null);
                    try {
                      const formData = new FormData();
                      formData.append("updateFile", updateFile);
                      formData.append("actorId", String(user?.id || ""));
                      const res = await fetch("/api/admin/update/install", {
                        method: "POST",
                        body: formData,
                      });
                      const data = await res.json();
                      if (res.ok) {
                        setUpdateResult(data.summary);
                        toast({ title: "Update Installed", description: `${data.summary.updated} files updated successfully.` });
                        setUpdateFile(null);
                        const fileInput = document.getElementById('update-file-input') as HTMLInputElement;
                        if (fileInput) fileInput.value = '';
                      } else {
                        toast({ title: "Update Failed", description: data.error || "Failed to install update", variant: "destructive" });
                      }
                    } catch (err) {
                      toast({ title: "Error", description: "Failed to install update", variant: "destructive" });
                    } finally {
                      setInstallingUpdate(false);
                    }
                  }}
                  data-testid="button-install-update"
                >
                  {installingUpdate ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Installing...
                    </>
                  ) : (
                    <>
                      <PackageCheck className="h-4 w-4 mr-2" />
                      Install Update
                    </>
                  )}
                </Button>
              </div>

              {updateResult && (
                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold flex items-center gap-2 text-green-700">
                    <CheckCircle className="h-4 w-4" />
                    Update Complete
                  </h4>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="text-lg font-bold">{updateResult.totalFiles}</div>
                      <div className="text-xs text-muted-foreground">Total Files</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <div className="text-lg font-bold text-green-700">{updateResult.updated}</div>
                      <div className="text-xs text-green-600">Updated</div>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-3">
                      <div className="text-lg font-bold text-amber-700">{updateResult.skipped}</div>
                      <div className="text-xs text-amber-600">Skipped</div>
                    </div>
                  </div>
                  {updateResult.updatedFiles?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-green-700 mb-1">Updated Files:</p>
                      <div className="bg-green-50 rounded p-2 max-h-40 overflow-y-auto">
                        {updateResult.updatedFiles.map((f: string, i: number) => (
                          <div key={i} className="text-xs font-mono text-green-800">{f}</div>
                        ))}
                      </div>
                    </div>
                  )}
                  {updateResult.skippedFiles?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-amber-700 mb-1">Skipped Files (protected):</p>
                      <div className="bg-amber-50 rounded p-2 max-h-40 overflow-y-auto">
                        {updateResult.skippedFiles.map((f: string, i: number) => (
                          <div key={i} className="text-xs font-mono text-amber-800">{f}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          </div>
        )}

      </div>

      {/* Broker Profile Sheet - Only visible to admin/manager */}
      <Sheet open={isBrokerProfileOpen} onOpenChange={setIsBrokerProfileOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto" data-testid="broker-profile-sheet">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                {profileBroker?.name?.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  {profileBroker?.name}
                  {brokerTier && (
                    <Badge className={`text-xs capitalize ${tierColors[brokerTier] || 'bg-gray-500 text-white'}`}>
                      {brokerTier}
                    </Badge>
                  )}
                </div>
                <div className="text-sm font-normal text-muted-foreground">{profileBroker?.email}</div>
              </div>
            </SheetTitle>
            <SheetDescription>Internal broker profile - not visible to brokers</SheetDescription>
          </SheetHeader>

          <div className="space-y-6 mt-6">
            {/* Win Rate & Performance Stats */}
            {brokerStats && (
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><BarChart size={16} /> Performance Stats</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-blue-700">{brokerStats.totalAssigned}</div>
                    <div className="text-xs text-blue-600">Total Leads</div>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-green-700">{brokerStats.winRate}%</div>
                    <div className="text-xs text-green-600">Win Rate</div>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-emerald-700">{brokerStats.bound}</div>
                    <div className="text-xs text-emerald-600">Bound</div>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-red-700">{brokerStats.lost}</div>
                    <div className="text-xs text-red-600">Lost</div>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  <div className="text-center p-2 bg-slate-50 rounded">
                    <div className="text-sm font-semibold">{brokerStats.quoted}</div>
                    <div className="text-[10px] text-muted-foreground">Quoted</div>
                  </div>
                  <div className="text-center p-2 bg-slate-50 rounded">
                    <div className="text-sm font-semibold">{brokerStats.contacted}</div>
                    <div className="text-[10px] text-muted-foreground">Contacted</div>
                  </div>
                  <div className="text-center p-2 bg-slate-50 rounded">
                    <div className="text-sm font-semibold">{brokerStats.followUp}</div>
                    <div className="text-[10px] text-muted-foreground">Follow-Up</div>
                  </div>
                  <div className="text-center p-2 bg-slate-50 rounded">
                    <div className="text-sm font-semibold">{brokerStats.closed}</div>
                    <div className="text-[10px] text-muted-foreground">Closed</div>
                  </div>
                </div>
                {brokerStats.byType && Object.keys(brokerStats.byType).length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs font-medium text-muted-foreground mb-1">Leads by Type</div>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(brokerStats.byType).map(([type, count]) => (
                        <Badge key={type} variant="outline" className="text-xs">
                          {type}: {count as number}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <Separator />

            {/* Reference ID */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Reference ID</h3>
              <p className="text-xs text-muted-foreground mb-2">6-character code that customers can enter on quote forms to link leads to this broker</p>
              <Input
                value={brokerReferenceId}
                onChange={(e) => setBrokerReferenceId(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="e.g. ABC123"
                maxLength={6}
                className="uppercase"
                data-testid="input-broker-reference-id"
              />
            </div>

            <Separator />

            {/* Broker Tier */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Broker Tier</h3>
              <Select value={brokerTier || "none"} onValueChange={(v) => setBrokerTier(v === "none" ? "" : v)}>
                <SelectTrigger data-testid="select-broker-tier">
                  <SelectValue placeholder="Select tier..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Tier</SelectItem>
                  <SelectItem value="bronze">
                    <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-amber-700" /> Bronze</span>
                  </SelectItem>
                  <SelectItem value="silver">
                    <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-slate-400" /> Silver</span>
                  </SelectItem>
                  <SelectItem value="gold">
                    <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-yellow-500" /> Gold</span>
                  </SelectItem>
                  <SelectItem value="platinum">
                    <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-slate-700" /> Platinum</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Preferred Insurance Types */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Preferred Insurance Types</h3>
              <p className="text-xs text-muted-foreground mb-2">What kind of business this broker wants to write</p>
              <div className="flex flex-wrap gap-2">
                {insuranceTypes.map(type => (
                  <Button
                    key={type}
                    size="sm"
                    variant={brokerPreferredTypes.includes(type) ? "default" : "outline"}
                    className="text-xs"
                    onClick={() => {
                      setBrokerPreferredTypes(prev =>
                        prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
                      );
                    }}
                    data-testid={`btn-pref-type-${type.toLowerCase()}`}
                  >
                    {type}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Preferred Demographics */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Preferred Demographics</h3>
              <p className="text-xs text-muted-foreground mb-2">Target demographics and areas this broker prefers</p>
              <Textarea
                value={brokerDemographics}
                onChange={(e) => setBrokerDemographics(e.target.value)}
                placeholder="e.g., Young professionals, families, seniors, specific neighborhoods or regions..."
                rows={3}
                data-testid="textarea-broker-demographics"
              />
            </div>

            <Button 
              onClick={saveBrokerProfile} 
              disabled={savingBrokerProfile} 
              className="w-full"
              data-testid="btn-save-broker-profile"
            >
              {savingBrokerProfile ? "Saving..." : "Save Profile"}
            </Button>

            <Separator />

            {/* Internal Notes Section */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <MessageSquare size={16} /> Internal Notes
                <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">Not visible to broker</Badge>
              </h3>
              <div className="flex gap-2 mb-4">
                <Textarea
                  value={newBrokerNote}
                  onChange={(e) => setNewBrokerNote(e.target.value)}
                  placeholder="Add an internal note about this broker..."
                  rows={2}
                  className="flex-1"
                  data-testid="textarea-broker-note"
                />
                <Button 
                  onClick={addBrokerNote} 
                  disabled={addingBrokerNote || !newBrokerNote.trim()}
                  size="sm"
                  className="self-end"
                  data-testid="btn-add-broker-note"
                >
                  Add
                </Button>
              </div>
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {brokerNotes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No internal notes yet.</p>
                ) : (
                  brokerNotes.map((note: any) => (
                    <div key={note.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 relative group">
                      <div className="flex justify-between items-start">
                        <div className="text-xs text-muted-foreground mb-1">
                          <span className="font-medium text-yellow-800">{note.authorName}</span>
                          {" · "}
                          {note.createdAt ? format(new Date(note.createdAt), "MMM d, yyyy h:mm a") : ""}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700"
                          onClick={() => deleteBrokerNote(note.id)}
                          data-testid={`btn-delete-note-${note.id}`}
                        >
                          <Trash2 size={12} />
                        </Button>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Binder Email Dialog */}
      <Dialog open={!!binderEmailDoc} onOpenChange={(open) => { if (!open) setBinderEmailDoc(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Email Binder Document
            </DialogTitle>
            <DialogDescription>
              Send "{binderEmailDoc?.filename}" to a third party via email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="admin-binder-email-to">Recipient Email</Label>
              <Input
                id="admin-binder-email-to"
                type="email"
                placeholder="Enter email address"
                value={binderEmailTo}
                onChange={(e) => setBinderEmailTo(e.target.value)}
                data-testid="input-admin-binder-email-to"
              />
            </div>
            {selectedQuote?.email && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setBinderEmailTo(selectedQuote.email!)} data-testid="btn-admin-fill-client-email">
                  <Mail className="h-3 w-3 mr-1" /> Client ({selectedQuote.email})
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBinderEmailDoc(null)}>Cancel</Button>
            <Button
              disabled={!binderEmailTo || binderEmailSending}
              data-testid="btn-admin-send-binder-email"
              onClick={async () => {
                if (!binderEmailDoc) return;
                setBinderEmailSending(true);
                try {
                  const res = await fetch(`/api/leads/${binderEmailDoc.quoteId}/email-binder`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      actorId: user?.id,
                      to: binderEmailTo,
                      binderUrl: binderEmailDoc.url,
                      binderFilename: binderEmailDoc.filename,
                    }),
                  });
                  if (res.ok) {
                    const data = await res.json();
                    toast({ title: "Binder Sent", description: data.delivered ? `Binder emailed to ${binderEmailTo}` : `Email logged (SMTP not configured)` });
                    setBinderEmailDoc(null);
                    refreshQuotes();
                  } else {
                    const err = await res.json();
                    toast({ title: "Error", description: err.error || "Failed to send", variant: "destructive" });
                  }
                } catch (err) {
                  toast({ title: "Error", description: "Failed to send binder email", variant: "destructive" });
                }
                setBinderEmailSending(false);
              }}
            >
              {binderEmailSending ? "Sending..." : "Send Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={adUnsavedDialogOpen} onOpenChange={(open) => { if (!open) handleAdTabCancel(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
            <DialogDescription>
              You have unsaved changes in the Advertisement Manager. Would you like to save them before leaving?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleAdTabCancel}>Cancel</Button>
            <Button variant="destructive" onClick={handleAdTabDiscard}>Discard</Button>
            <Button onClick={handleAdTabSaveAndContinue}>Save & Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}