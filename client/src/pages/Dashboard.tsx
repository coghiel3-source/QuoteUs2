import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Filter, Plus, Phone, Mail, MapPin, Calendar, Clock, MoreHorizontal, FileText, CheckCircle, XCircle, ArrowRight, Users, LogIn, Lock, AlertTriangle, Bell, Eye, EyeOff, Car, Home, Briefcase, Plane, Heart, Dog, Shield, DollarSign, CreditCard } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useQuotes, Quote } from "@/lib/QuoteContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";

export default function DashboardPage() {
  const { user, login, logout, register } = useAuth();
  const { quotes, updateStatus } = useQuotes();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();

  // Login States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"admin" | "manager" | "broker">("broker");
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [registerBrokerage, setRegisterBrokerage] = useState("");
  const [registerYearsOfService, setRegisterYearsOfService] = useState("");
  const [registerProductTypes, setRegisterProductTypes] = useState<string[]>([]);
  const [registerOtherServices, setRegisterOtherServices] = useState("");
  const [selectedLead, setSelectedLead] = useState<Quote | null>(null);
  const [isFundDialogOpen, setIsFundDialogOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [creditPackages, setCreditPackages] = useState<{amount: number; label: string}[]>([]);

  useEffect(() => {
    if (user && user.role === 'broker') {
      fetchBalance();
      fetchPackages();
    }
  }, [user]);

  const fetchBalance = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/users/${user.id}/balance`);
      if (res.ok) {
        const data = await res.json();
        setBalance(parseFloat(data.balance || "0"));
      }
    } catch (err) {
      console.error("Failed to fetch balance:", err);
    }
  };

  const fetchPackages = async () => {
    try {
      const res = await fetch("/api/credits/packages");
      if (res.ok) {
        const data = await res.json();
        setCreditPackages(data.packages || []);
      }
    } catch (err) {
      console.error("Failed to fetch packages:", err);
    }
  };

  const handleFundAccount = async () => {
    if (!selectedPackage || !user) return;
    setIsLoadingBalance(true);
    try {
      const res = await fetch("/api/credits/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, amount: selectedPackage }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        }
      } else {
        const err = await res.json();
        toast({ title: "Error", description: err.error, variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to initiate payment", variant: "destructive" });
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case "Auto": return <Car size={16} />;
      case "Home": return <Home size={16} />;
      case "Tenant": return <Home size={16} />;
      case "Business": return <Briefcase size={16} />;
      case "Life": return <Heart size={16} />;
      case "Travel": return <Plane size={16} />;
      case "Pet": return <Dog size={16} />;
      default: return <Shield size={16} />;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login(email, role, password);
    if (success) {
      if (role === 'admin' || role === 'manager') {
        setLocation('/admin');
      } else {
        toast({ title: "Welcome back!", description: "You are now logged in." });
      }
    } else {
      toast({ title: "Login Failed", description: "Invalid email or password.", variant: "destructive" });
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const allProductTypes = registerOtherServices 
      ? [...registerProductTypes, registerOtherServices]
      : registerProductTypes;
    register(
      registerName, 
      registerEmail, 
      registerPassword, 
      'broker', 
      registerPhone,
      {
        brokerage: registerBrokerage,
        yearsOfService: registerYearsOfService ? parseInt(registerYearsOfService) : undefined,
        productTypes: allProductTypes
      }
    );
    setIsRegistering(false);
    setRegisterBrokerage("");
    setRegisterYearsOfService("");
    setRegisterProductTypes([]);
    setRegisterOtherServices("");
    toast({ title: "Registration Submitted", description: "Your account is pending approval from an Account Manager." });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-secondary/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-none">
          <CardHeader className="text-center space-y-4 pb-8">
            <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center text-primary mb-2">
              <Lock size={32} />
            </div>
            <CardTitle className="text-2xl font-serif font-bold">Broker Portal Login</CardTitle>
            <CardDescription>
              {isRegistering ? "Create a profile to request access" : "Access your assigned leads and quotes"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isRegistering ? (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Full Name</label>
                  <Input placeholder="John Doe" value={registerName} onChange={e => setRegisterName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email Address</label>
                  <Input type="email" placeholder="john@example.com" value={registerEmail} onChange={e => setRegisterEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone Number</label>
                  <Input type="tel" placeholder="416-555-0123" value={registerPhone} onChange={e => setRegisterPhone(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Create Password</label>
                  <div className="relative">
                    <Input 
                      type={showRegisterPassword ? "text" : "password"} 
                      placeholder="********" 
                      value={registerPassword} 
                      onChange={e => setRegisterPassword(e.target.value)} 
                      required 
                      className="pr-10"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                      className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      {showRegisterPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Brokerage / Insurance Company Name</label>
                  <Input 
                    placeholder="ABC Insurance Brokers Inc." 
                    value={registerBrokerage} 
                    onChange={e => setRegisterBrokerage(e.target.value)} 
                    data-testid="input-register-brokerage"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Years of Experience</label>
                  <Select value={registerYearsOfService} onValueChange={setRegisterYearsOfService}>
                    <SelectTrigger data-testid="select-register-years">
                      <SelectValue placeholder="Select years of experience" />
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
                  <label className="text-sm font-medium">Services Offered</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Auto', 'Home', 'Life', 'Travel', 'Business'].map((product) => (
                      <label key={product} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={registerProductTypes.includes(product)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setRegisterProductTypes([...registerProductTypes, product]);
                            } else {
                              setRegisterProductTypes(registerProductTypes.filter(p => p !== product));
                            }
                          }}
                          className="h-4 w-4 rounded border-gray-300"
                          data-testid={`checkbox-register-${product.toLowerCase()}`}
                        />
                        <span className="text-sm">{product}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Other Services (optional)</label>
                  <Input 
                    placeholder="e.g., Pet, Tenant, Motorcycle" 
                    value={registerOtherServices} 
                    onChange={e => setRegisterOtherServices(e.target.value)} 
                    data-testid="input-register-other-services"
                  />
                </div>
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90">Request Access</Button>
                <div className="text-center text-sm">
                  <button type="button" onClick={() => setIsRegistering(false)} className="text-accent hover:underline">
                    Back to Login
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email Address</label>
                  <Input type="email" placeholder="john@QuoteUs.ca" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Password</label>
                  <div className="relative">
                    <Input 
                      type={showPassword ? "text" : "password"} 
                      placeholder="********" 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      required 
                      className="pr-10"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Role</label>
                  <Select value={role} onValueChange={(v: any) => setRole(v)}>
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
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90">Login</Button>
                <div className="text-center text-sm">
                  <button type="button" onClick={() => setIsRegistering(true)} className="text-accent hover:underline">
                    New Broker? Create Profile
                  </button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // BROKER DASHBOARD VIEW
  const myQuotes = quotes.filter(q => q.assignedTo === user.id);
  const newLeadsCount = myQuotes.filter(q => q.status === 'New').length;
  const contactedCount = myQuotes.filter(q => q.status === 'Contacted').length;
  const closedCount = myQuotes.filter(q => q.status === 'Closed').length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "New": return "bg-blue-100 text-blue-700 hover:bg-blue-200";
      case "Contacted": return "bg-yellow-100 text-yellow-700 hover:bg-yellow-200";
      case "Quoted": return "bg-purple-100 text-purple-700 hover:bg-purple-200";
      case "Closed": return "bg-green-100 text-green-700 hover:bg-green-200";
      case "Win": return "bg-emerald-100 text-emerald-700 hover:bg-emerald-200";
      case "Lost": return "bg-red-100 text-red-700 hover:bg-red-200";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="min-h-screen bg-secondary/30 pb-20">
      {/* Dashboard Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="container mx-auto max-w-7xl px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <h1 className="text-xl font-bold text-primary font-serif">Broker Portal</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-right hidden md:block">
               <div className="font-medium">{user.name}</div>
               <div className="text-xs text-muted-foreground">{user.email}</div>
            </div>
            <Button size="icon" variant="ghost" className="relative text-muted-foreground hover:text-primary">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </Button>
            <Button size="sm" variant="ghost" onClick={logout}>Logout</Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-7xl px-4 py-8">
        
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="shadow-sm border-none bg-purple-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm text-purple-600 font-medium">Account Balance</p>
                  <h3 className="text-3xl font-bold text-purple-900 mt-1">${balance.toFixed(2)}</h3>
                </div>
                <div className="h-12 w-12 bg-white text-purple-600 rounded-full flex items-center justify-center shadow-sm">
                  <DollarSign size={24} />
                </div>
              </div>
              <Button 
                size="sm" 
                className="w-full mt-2"
                onClick={() => setIsFundDialogOpen(true)}
                data-testid="button-fund-account"
              >
                <CreditCard size={16} className="mr-2" /> Fund Account
              </Button>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-none bg-blue-50">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">New Assigned Leads</p>
                <h3 className="text-3xl font-bold text-blue-900 mt-1">{newLeadsCount}</h3>
              </div>
              <div className="h-12 w-12 bg-white text-blue-600 rounded-full flex items-center justify-center shadow-sm">
                <Users size={24} />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-none bg-yellow-50">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600 font-medium">In Progress</p>
                <h3 className="text-3xl font-bold text-yellow-900 mt-1">{contactedCount}</h3>
              </div>
              <div className="h-12 w-12 bg-white text-yellow-600 rounded-full flex items-center justify-center shadow-sm">
                <Clock size={24} />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-none bg-green-50">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Closed Deals</p>
                <h3 className="text-3xl font-bold text-green-900 mt-1">{closedCount}</h3>
              </div>
              <div className="h-12 w-12 bg-white text-green-600 rounded-full flex items-center justify-center shadow-sm">
                <CheckCircle size={24} />
              </div>
            </CardContent>
          </Card>
        </div>

        <h2 className="text-2xl font-serif font-bold mb-6">My Assigned Leads</h2>

        <Card className="border-none shadow-md overflow-hidden">
          <Table>
            <TableHeader className="bg-secondary/30">
              <TableRow>
                <TableHead className="w-[100px]">Quote #</TableHead>
                <TableHead>Client Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date Assigned</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {myQuotes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                       <AlertTriangle className="opacity-50" />
                       <p>You have no assigned leads yet.</p>
                       <p className="text-xs">Contact your Account Manager to request assignments.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                myQuotes.map((lead) => (
                  <TableRow key={lead.id} className="hover:bg-secondary/10 cursor-pointer">
                    <TableCell className="font-medium text-xs text-muted-foreground font-mono">
                      {lead.quoteNumber || `#${lead.id.substring(0, 5)}`}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{lead.clientName}</div>
                      <div className="text-xs text-muted-foreground">{lead.postalCode}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-white">{lead.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Select 
                          value={lead.status} 
                          onValueChange={(val: any) => updateStatus(lead.id, val)}
                        >
                          <SelectTrigger className={`w-[110px] h-7 text-xs border-none ${getStatusColor(lead.status)}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="New">New</SelectItem>
                            <SelectItem value="Contacted">Contacted</SelectItem>
                            <SelectItem value="Quoted">Quoted</SelectItem>
                            <SelectItem value="Closed">Closed</SelectItem>
                            <SelectItem value="Win">Win</SelectItem>
                            <SelectItem value="Lost">Lost</SelectItem>
                          </SelectContent>
                        </Select>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {lead.date || lead.createdAt ? format(new Date(lead.date || lead.createdAt!), 'MMM d') : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                         <a href={`mailto:${lead.email}`}>
                           <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary">
                             <Mail size={14} />
                           </Button>
                         </a>
                         <a href={`tel:${lead.phone}`}>
                           <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary">
                             <Phone size={14} />
                           </Button>
                         </a>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                       <Button 
                         size="sm" 
                         variant="outline" 
                         className="text-xs h-8"
                         onClick={() => setSelectedLead(lead)}
                         data-testid={`button-view-lead-${lead.id}`}
                       >
                         View Details
                       </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Lead Details Sheet */}
        <Sheet open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
          <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
            {selectedLead && (
              <>
                <SheetHeader className="mb-6">
                  <SheetTitle className="text-xl font-bold flex items-center gap-2">
                    {selectedLead.clientName}
                  </SheetTitle>
                  <SheetDescription>
                    Quote #{selectedLead.quoteNumber} • {format(new Date(selectedLead.date || new Date()), 'MMMM d, yyyy')}
                  </SheetDescription>
                </SheetHeader>

                <div className="space-y-6">
                  {/* Contact Information */}
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">Contact Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Email</Label>
                        <div className="font-medium flex items-center gap-2">
                          {selectedLead.email}
                          <a href={`mailto:${selectedLead.email}`}>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <Mail size={14} />
                            </Button>
                          </a>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Phone</Label>
                        <div className="font-medium flex items-center gap-2">
                          {selectedLead.phone || 'N/A'}
                          {selectedLead.phone && (
                            <a href={`tel:${selectedLead.phone}`}>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <Phone size={14} />
                              </Button>
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Postal Code</Label>
                        <div className="font-medium">{selectedLead.postalCode || 'N/A'}</div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Insurance Type</Label>
                        <div className="font-medium flex items-center gap-2">
                          {getIconForType(selectedLead.type)} {selectedLead.type}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quote Details */}
                  {selectedLead.details && Object.keys(selectedLead.details).length > 0 && (
                    <div>
                      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">Quote Details</h3>
                      <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                        {Object.entries(selectedLead.details).map(([key, value]) => {
                          if (!value || key === 'email' || key === 'phone' || key === 'postalCode' || key === 'firstName' || key === 'lastName') return null;
                          const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                          return (
                            <div key={key} className="flex justify-between items-start border-b border-slate-200 pb-2 last:border-0 last:pb-0">
                              <span className="text-sm text-muted-foreground">{label}</span>
                              <span className="text-sm font-medium text-right max-w-[60%]">
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Status */}
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">Status</h3>
                    <Select 
                      value={selectedLead.status} 
                      onValueChange={(val: any) => {
                        updateStatus(selectedLead.id, val);
                        setSelectedLead({ ...selectedLead, status: val });
                      }}
                    >
                      <SelectTrigger className={`w-[140px] ${getStatusColor(selectedLead.status)}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="New">New</SelectItem>
                        <SelectItem value="Contacted">Contacted</SelectItem>
                        <SelectItem value="Quoted">Quoted</SelectItem>
                        <SelectItem value="Closed">Closed</SelectItem>
                        <SelectItem value="Win">Win</SelectItem>
                        <SelectItem value="Lost">Lost</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t flex justify-end">
                  <Button variant="outline" onClick={() => setSelectedLead(null)}>Close</Button>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>

        {/* Fund Account Dialog */}
        <Dialog open={isFundDialogOpen} onOpenChange={setIsFundDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Fund Your Account
              </DialogTitle>
              <DialogDescription>
                Select a credit package to add funds to your account. Funds are used when leads are assigned to you.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="grid grid-cols-2 gap-3">
                {creditPackages.map((pkg) => (
                  <button
                    key={pkg.amount}
                    onClick={() => setSelectedPackage(pkg.amount)}
                    className={`p-4 rounded-lg border-2 text-center transition-all ${
                      selectedPackage === pkg.amount
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-primary/50'
                    }`}
                    data-testid={`package-${pkg.amount}`}
                  >
                    <div className="text-2xl font-bold text-primary">${pkg.amount}</div>
                    <div className="text-sm text-muted-foreground">{pkg.label}</div>
                  </button>
                ))}
              </div>
              {creditPackages.length === 0 && (
                <div className="text-center text-muted-foreground py-4">
                  Loading packages...
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsFundDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleFundAccount} 
                disabled={!selectedPackage || isLoadingBalance}
                data-testid="button-confirm-fund"
              >
                {isLoadingBalance ? "Processing..." : `Pay $${selectedPackage || 0}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}
