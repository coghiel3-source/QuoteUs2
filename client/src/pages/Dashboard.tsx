import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Filter, Plus, Phone, Mail, MapPin, Calendar, Clock, MoreHorizontal, FileText, CheckCircle, XCircle, ArrowRight, Users, LogIn, Lock, AlertTriangle, Bell, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useQuotes } from "@/lib/QuoteContext";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function DashboardPage() {
  const { user, login, logout, register } = useAuth();
  const { quotes, updateStatus } = useQuotes();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();

  // Login States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"admin" | "broker">("broker");
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(email, role, password)) {
      if (role === 'admin') {
        setLocation('/admin');
      } else {
        toast({ title: "Welcome back!", description: "You are now logged in." });
      }
    } else {
      // Toast is handled in AuthContext logic now generally, but specific errors might still bubble or be duplicate. 
      // AuthContext returns false on fail.
      // We will keep the toast here as backup or ensure it's not double toasting if AuthContext also toasts (it alerts currently).
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    register(registerName, registerEmail, registerPassword);
    setIsRegistering(false);
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
                  <Input type="email" placeholder="john@quoteus.ca" value={email} onChange={e => setEmail(e.target.value)} required />
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
                      <SelectItem value="admin">Account Manager</SelectItem>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
                          </SelectContent>
                        </Select>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(lead.date), 'MMM d')}
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
                       <Button size="sm" variant="outline" className="text-xs h-8">View Details</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

      </div>
    </div>
  );
}
