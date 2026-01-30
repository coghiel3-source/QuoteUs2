import { useState, useEffect } from "react";
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
import { Search, Filter, Download, User, Calendar, MapPin, Car, Home, Briefcase, Plane, Heart, Dog, Shield, Check, X, FileText, BarChart, Settings, LogOut, LayoutDashboard, Users, UserPlus, MoreHorizontal, Lock, Pause, Play, Ban, Trash2, Mail, MessageSquare, Clock, AlertCircle, Eye, EyeOff, Key, CheckCircle, XCircle, Menu, Pencil, UserCog } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState("dashboard");
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
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  
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
          viewLeadCosts: false, editLeadCosts: false
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

  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuote || !emailSubject.trim()) return;
    
    logEmail(selectedQuote.id, emailSubject, selectedQuote.email || 'Client', user?.name || 'Admin');
    setEmailSubject("");
    setEmailBody("");
    setIsEmailOpen(false);
    toast({
      title: "Email Sent",
      description: `Email "${emailSubject}" sent to client.`,
    });
    // Force refresh
    const updated = quotes.find(q => q.id === selectedQuote.id);
    if (updated) setSelectedQuote(updated);
  };

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

  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = 
      quote.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (quote.email && quote.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (quote.postalCode && quote.postalCode.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = typeFilter === "all" || quote.type === typeFilter;
    const matchesStatus = statusFilter === "all" || quote.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
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
  const brokers = users.filter(u => u.role === 'broker' && (u.status === 'active' || u.status === 'paused' || u.status === 'cancelled'));
  const pendingBrokers = users.filter(u => u.role === 'broker' && u.status === 'pending');

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
                      onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
                    >
                      <LayoutDashboard size={18} className="mr-3" /> Dashboard
                    </Button>
                    {hasPermission('viewLeads') && (
                    <Button 
                      variant={activeTab === 'leads' ? 'secondary' : 'ghost'} 
                      className="justify-start mb-1"
                      onClick={() => { setActiveTab('leads'); setMobileMenuOpen(false); }}
                    >
                      <FileText size={18} className="mr-3" /> Leads
                    </Button>
                    )}
                    <Button 
                      variant={activeTab === 'manager' ? 'secondary' : 'ghost'} 
                      className="justify-start mb-1"
                      onClick={() => { setActiveTab('manager'); setMobileMenuOpen(false); }}
                    >
                      <Users size={18} className="mr-3" /> Manager
                      {pendingBrokers.length > 0 && <Badge className="ml-auto bg-red-500 text-white border-none">{pendingBrokers.length}</Badge>}
                    </Button>
                    <Button 
                      variant={activeTab === 'reports' ? 'secondary' : 'ghost'} 
                      className="justify-start mb-1"
                      onClick={() => { setActiveTab('reports'); setMobileMenuOpen(false); }}
                    >
                      <BarChart size={18} className="mr-3" /> Reports
                    </Button>
                    {hasPermission('viewCredits') && (
                      <Button 
                        variant={activeTab === 'credits' ? 'secondary' : 'ghost'} 
                        className="justify-start mb-1"
                        onClick={() => { setActiveTab('credits'); setMobileMenuOpen(false); }}
                      >
                        <DollarSign size={18} className="mr-3" /> Credits
                      </Button>
                    )}
                    {user?.role === 'admin' && (
                      <Button 
                        variant={activeTab === 'manage' ? 'secondary' : 'ghost'} 
                        className="justify-start mb-1"
                        onClick={() => { setActiveTab('manage'); setMobileMenuOpen(false); }}
                      >
                        <Key size={18} className="mr-3" /> Manage
                      </Button>
                    )}
                    <div className="border-t my-2" />
                    {(user?.role === 'admin' || hasPermission('viewSettings')) && (
                      <Button 
                        variant={activeTab === 'settings' ? 'secondary' : 'ghost'} 
                        className="justify-start mb-1"
                        onClick={() => { setActiveTab('settings'); setMobileMenuOpen(false); }}
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
                  onClick={() => setActiveTab('dashboard')}
                  className={activeTab === 'dashboard' ? 'bg-white text-primary hover:bg-white/90' : 'text-white hover:bg-white/10 hover:text-white'}
                >
                  <LayoutDashboard size={16} className="mr-2" /> Dashboard
                </Button>
                {hasPermission('viewLeads') && (
                <Button 
                  variant={activeTab === 'leads' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  onClick={() => setActiveTab('leads')}
                  className={activeTab === 'leads' ? 'bg-white text-primary hover:bg-white/90' : 'text-white hover:bg-white/10 hover:text-white'}
                >
                  <FileText size={16} className="mr-2" /> Leads
                </Button>
                )}
                <Button 
                  variant={activeTab === 'manager' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  onClick={() => setActiveTab('manager')}
                  className={activeTab === 'manager' ? 'bg-white text-primary hover:bg-white/90' : 'text-white hover:bg-white/10 hover:text-white'}
                >
                  <Users size={16} className="mr-2" /> Manager
                  {pendingBrokers.length > 0 && <Badge className="ml-2 bg-red-500 text-white border-none h-5 px-1">{pendingBrokers.length}</Badge>}
                </Button>
                <Button 
                  variant={activeTab === 'reports' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  onClick={() => setActiveTab('reports')}
                  className={activeTab === 'reports' ? 'bg-white text-primary hover:bg-white/90' : 'text-white hover:bg-white/10 hover:text-white'}
                >
                  <BarChart size={16} className="mr-2" /> Reports
                </Button>
                {hasPermission('viewCredits') && (
                  <Button 
                    variant={activeTab === 'credits' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    onClick={() => setActiveTab('credits')}
                    className={activeTab === 'credits' ? 'bg-white text-primary hover:bg-white/90' : 'text-white hover:bg-white/10 hover:text-white'}
                  >
                    <DollarSign size={16} className="mr-2" /> Credits
                  </Button>
                )}
                {user?.role === 'admin' && (
                  <Button 
                    variant={activeTab === 'manage' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    onClick={() => setActiveTab('manage')}
                    className={activeTab === 'manage' ? 'bg-white text-primary hover:bg-white/90' : 'text-white hover:bg-white/10 hover:text-white'}
                    data-testid="nav-manage"
                  >
                    <Key size={16} className="mr-2" /> Manage
                  </Button>
                )}
              </nav>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              <div className="text-right hidden sm:block mr-2">
                <div className="text-sm font-medium">{user.name}</div>
                <div className="text-xs text-white/70 capitalize">{user.role}</div>
              </div>
              <Button variant="ghost" size="icon" className="hidden md:flex text-white hover:bg-white/10" onClick={() => setActiveTab('settings')}>
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
                           <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsEmailOpen(true)}>
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
                    </div>

                    <div className="border rounded-lg p-4 bg-slate-50">
                      <h4 className="font-semibold mb-3 flex items-center gap-2"><Car size={16}/> Quote Details</h4>
                      <div className="space-y-3">
                        {selectedQuote.details && (() => {
                          const formatLabel = (k: string) => k
                            .replace(/([A-Z])/g, ' $1')
                            .replace(/^./, str => str.toUpperCase())
                            .replace(/_/g, ' ')
                            .trim();
                          
                          const renderValue = (v: any, depth: number = 0): React.ReactNode => {
                            if (v === null || v === undefined || v === '') return <span className="text-slate-400 italic">Not provided</span>;
                            if (typeof v === 'boolean') return v ? 'Yes' : 'No';
                            if (typeof v === 'string' || typeof v === 'number') return String(v);
                            
                            if (Array.isArray(v)) {
                              if (v.length === 0) return <span className="text-slate-400 italic">None</span>;
                              return (
                                <div className="space-y-2">
                                  {v.map((item, i) => (
                                    <div key={i} className={`${depth > 0 ? 'pl-3 border-l-2 border-slate-200' : ''}`}>
                                      {typeof item === 'object' && item !== null ? (
                                        <div className="bg-slate-50 rounded p-2 space-y-1">
                                          {Object.entries(item).map(([k, val]) => (
                                            <div key={k} className="flex gap-2">
                                              <span className="text-xs text-slate-500 min-w-[80px]">{formatLabel(k)}:</span>
                                              <span className="text-xs font-medium">{renderValue(val, depth + 1)}</span>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <span className="text-sm">{String(item)}</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              );
                            }
                            
                            if (typeof v === 'object') {
                              return (
                                <div className="bg-slate-50 rounded p-2 space-y-1">
                                  {Object.entries(v).map(([k, val]) => (
                                    <div key={k} className="flex gap-2">
                                      <span className="text-xs text-slate-500 min-w-[80px]">{formatLabel(k)}:</span>
                                      <span className="text-xs font-medium">{renderValue(val, depth + 1)}</span>
                                    </div>
                                  ))}
                                </div>
                              );
                            }
                            
                            return String(v);
                          };

                          return Object.entries(selectedQuote.details).map(([key, value]) => (
                            <div key={key} className="py-2 border-b border-slate-200 last:border-0">
                              <div className="text-sm text-slate-500 mb-1">{formatLabel(key)}</div>
                              <div className="text-sm font-semibold text-primary">{renderValue(value)}</div>
                            </div>
                          ));
                        })()}
                        {(!selectedQuote.details || Object.keys(selectedQuote.details).length === 0) && (
                          <p className="text-sm text-muted-foreground">No additional details available.</p>
                        )}
                      </div>
                    </div>
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
                        </SelectContent>
                      </Select>
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
              <DialogTitle>Send Email to Client</DialogTitle>
              <DialogDescription>
                Send a message directly to {selectedQuote?.clientName}. A copy will be logged in the CRM.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSendEmail} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>To</Label>
                <Input value={selectedQuote?.email || ''} disabled />
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
                <Button type="submit"><Mail size={16} className="mr-2"/> Send Email</Button>
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
                  />
                  <span className="text-sm">View Leads</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={editingPermissions.assignLeads}
                    onChange={(e) => setEditingPermissions({...editingPermissions, assignLeads: e.target.checked})}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm">Assign Leads</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={editingPermissions.manageBrokers}
                    onChange={(e) => setEditingPermissions({...editingPermissions, manageBrokers: e.target.checked})}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm">Manage Brokers</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={editingPermissions.viewCredits}
                    onChange={(e) => setEditingPermissions({...editingPermissions, viewCredits: e.target.checked})}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm">View Credits</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={editingPermissions.adjustBalances}
                    onChange={(e) => setEditingPermissions({...editingPermissions, adjustBalances: e.target.checked})}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm">Adjust Balances</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={editingPermissions.viewSettings}
                    onChange={(e) => setEditingPermissions({...editingPermissions, viewSettings: e.target.checked})}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm">View Settings</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={editingPermissions.viewLeadCosts}
                    onChange={(e) => setEditingPermissions({...editingPermissions, viewLeadCosts: e.target.checked})}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm">View Lead Costs</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={editingPermissions.editLeadCosts}
                    onChange={(e) => setEditingPermissions({...editingPermissions, editLeadCosts: e.target.checked})}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm">Edit Lead Costs</span>
                </label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditPermissionsOpen(false)}>Cancel</Button>
              <Button onClick={handleSavePermissions}>Save Permissions</Button>
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
                  <Button variant="link" className="w-full mt-4" onClick={() => setActiveTab('leads')}>View All Leads</Button>
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
                      <SelectItem value="Closed">Closed</SelectItem>
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
                              <SelectTrigger className={`w-[110px] h-8 text-xs text-white border-none ${getStatusColor(quote.status).replace('hover:', '')}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="New">New</SelectItem>
                                <SelectItem value="Contacted">Contacted</SelectItem>
                                <SelectItem value="Quoted">Quoted</SelectItem>
                                <SelectItem value="Bound">Bound</SelectItem>
                                <SelectItem value="Follow-Up">Follow-Up</SelectItem>
                                <SelectItem value="Closed">Closed</SelectItem>
                                <SelectItem value="Lost">Lost</SelectItem>
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
                              {hasPermission('assignLeads') && quote.assignedTo && (
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
                            placeholder="jane@quoteus.ca"
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
                        
                        {newUser.role === 'manager' && (
                          <div className="space-y-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <Label className="text-blue-800 font-semibold">Manager Permissions</Label>
                            <p className="text-xs text-blue-600 mb-2">Select which features this manager can access:</p>
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
                                {['Auto', 'Home', 'Life', 'Travel', 'Business'].map((product) => (
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
                              </div>
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

                {/* Staff Table */}
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead>User Name</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Login</TableHead>
                        <TableHead className="text-center">Assigned Leads</TableHead>
                        <TableHead className="text-center">Performance</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                       {allStaff.map(staff => (
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
                                {staff.name}
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
                             <Badge className={getUserStatusBadge(staff.status)}>
                               {staff.status}
                             </Badge>
                           </TableCell>
                           <TableCell className="text-sm text-muted-foreground">
                             {staff.lastLogin ? format(new Date(staff.lastLogin), 'MMM d, h:mm a') : 'Never'}
                           </TableCell>
                           <TableCell className="text-center font-bold">
                             {quotes.filter(q => q.assignedTo === staff.id).length}
                           </TableCell>
                           <TableCell>
                             {staff.role === 'broker' ? (
                               <div className="flex flex-col items-center gap-1">
                                 <Badge variant="secondary" className="text-xs">
                                   {staff.performance?.conversionRate || 0}% Conv.
                                 </Badge>
                                 <span className="text-[10px] text-muted-foreground">
                                   {staff.performance?.responseTime || 'N/A'} resp.
                                 </span>
                               </div>
                             ) : (
                               <span className="text-center block text-muted-foreground">-</span>
                             )}
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

        {/* REPORTS TAB Placeholder */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-6 text-slate-800">Performance Reports</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Conversion Rate by Broker</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground border-dashed border-2 m-4 rounded-lg">
                   Chart Placeholder
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Leads by Type</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground border-dashed border-2 m-4 rounded-lg">
                   Chart Placeholder
                </CardContent>
              </Card>
            </div>
          </div>
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

        {/* MANAGE TAB - API Keys & Services */}
        {activeTab === 'manage' && user?.role === 'admin' && (
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
                      placeholder="info@quoteus.ca"
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
                        placeholder="info@quoteus.ca"
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
                        placeholder="info@quoteus.ca"
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

              <div className="text-sm text-muted-foreground mt-4">
                <p>Need help setting up integrations? Contact support for assistance with API configuration.</p>
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}