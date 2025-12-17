import { useState } from "react";
import { useQuotes, Quote } from "@/lib/QuoteContext";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter, Download, User, Calendar, MapPin, Car, Home, Briefcase, Plane, Heart, Dog, Shield, Check, X, FileText, BarChart, Settings, LogOut, LayoutDashboard, Users, UserPlus } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";

export default function AdminCRMPage() {
  const { quotes, updateStatus, assignQuote } = useQuotes();
  const { user, users, approveBroker, denyBroker, logout, updateUser } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("dashboard");

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
    new Date(b.date).getTime() - new Date(a.date).getTime()
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
      case 'Contacted': return 'bg-yellow-500 hover:bg-yellow-600';
      case 'Quoted': return 'bg-green-500 hover:bg-green-600';
      case 'Closed': return 'bg-gray-500 hover:bg-gray-600';
      default: return 'bg-slate-500';
    }
  };

  // Filter users for the Manager Tab
  const allStaff = users.filter(u => u.role !== 'customer');
  const brokers = users.filter(u => u.role === 'broker' && u.status === 'active');
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
            <div className="flex items-center gap-6">
              <h1 className="text-xl font-serif font-bold tracking-tight">QuoteUs <span className="text-white/70 font-sans text-sm font-normal ml-1">CRM</span></h1>
              
              <nav className="hidden md:flex space-x-1">
                <Button 
                  variant={activeTab === 'dashboard' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  onClick={() => setActiveTab('dashboard')}
                  className={activeTab === 'dashboard' ? 'bg-white text-primary hover:bg-white/90' : 'text-white hover:bg-white/10 hover:text-white'}
                >
                  <LayoutDashboard size={16} className="mr-2" /> Dashboard
                </Button>
                <Button 
                  variant={activeTab === 'leads' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  onClick={() => setActiveTab('leads')}
                  className={activeTab === 'leads' ? 'bg-white text-primary hover:bg-white/90' : 'text-white hover:bg-white/10 hover:text-white'}
                >
                  <FileText size={16} className="mr-2" /> Leads
                </Button>
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
              </nav>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block mr-2">
                <div className="text-sm font-medium">{user.name}</div>
                <div className="text-xs text-white/70 capitalize">{user.role}</div>
              </div>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => setActiveTab('settings')}>
                <Settings size={18} />
              </Button>
              <Button variant="ghost" size="icon" className="text-white hover:bg-red-500/20 hover:text-red-200" onClick={handleLogout}>
                <LogOut size={18} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        
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
                  <div className="text-3xl font-bold mt-2">{quotes.filter(q => ['Contacted', 'Quoted'].includes(q.status)).length}</div>
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
                    {quotes.slice(0, 5).map(quote => (
                      <div key={quote.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full bg-slate-100 text-slate-600`}>
                            {getIconForType(quote.type)}
                          </div>
                          <div>
                            <div className="font-medium">{quote.clientName}</div>
                            <div className="text-xs text-muted-foreground">{format(new Date(quote.date), 'MMM d, h:mm a')}</div>
                          </div>
                        </div>
                        <Badge className={`${getStatusColor(quote.status).replace('hover:', '')} border-none`}>{quote.status}</Badge>
                      </div>
                    ))}
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
        {activeTab === 'leads' && (
          <Card className="shadow-lg border-none">
            <CardHeader className="bg-white border-b pb-4">
              <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                <CardTitle>Lead Management</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download size={16} /> Export CSV
                  </Button>
                  <Button size="sm" className="gap-2 bg-primary">
                     <UserPlus size={16} /> Add Manual Lead
                  </Button>
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
                      <TableHead>Client Details</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Assigned Broker</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedQuotes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                          No quotes found matching your criteria.
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedQuotes.map((quote) => (
                        <TableRow key={quote.id} className="hover:bg-slate-50 transition-colors">
                          <TableCell>
                            <Select 
                              value={quote.status} 
                              onValueChange={(val: any) => updateStatus(quote.id, val)}
                            >
                              <SelectTrigger className={`w-[110px] h-8 text-xs text-white border-none ${getStatusColor(quote.status).replace('hover:', '')}`}>
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
                          <TableCell>
                            <div className="font-medium text-slate-900">{quote.clientName}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                               {quote.email || 'No email'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                               {quote.phone || 'No phone'}
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
                            <div className="flex items-center gap-1 text-sm text-slate-600">
                              <MapPin size={14} className="text-muted-foreground" />
                              {quote.postalCode || 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell>
                             <Select 
                              value={quote.assignedTo || "unassigned"} 
                              onValueChange={(val) => {
                                assignQuote(quote.id, val);
                                const broker = users.find(u => u.id === val);
                                if (broker) {
                                  toast({
                                    title: "Lead Assigned",
                                    description: `Notification sent to ${broker.name}.`,
                                  });
                                } else {
                                   toast({
                                    title: "Lead Unassigned",
                                    description: "Lead is now unassigned.",
                                  });
                                }
                              }}
                            >
                              <SelectTrigger className="w-[180px] h-8 text-xs">
                                <SelectValue placeholder="Unassigned" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unassigned">Unassigned</SelectItem>
                                {brokers.map(broker => (
                                  <SelectItem key={broker.id} value={broker.id}>{broker.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Calendar size={14} />
                              {format(new Date(quote.date), 'MMM d, yyyy')}
                            </div>
                            <div className="text-xs text-muted-foreground pl-5">
                              {format(new Date(quote.date), 'h:mm a')}
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
                  <Button><UserPlus className="mr-2" size={16}/> Add New User</Button>
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
                         <TableRow key={staff.id}>
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
                             <Badge className={staff.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'}>
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
                             <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                               <Settings size={16} className="text-muted-foreground" />
                             </Button>
                           </TableCell>
                         </TableRow>
                       ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
           </Card>
        )}

        {/* REPORTS TAB */}
        {activeTab === 'reports' && (
          <Card className="shadow-lg border-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BarChart className="text-accent" /> Broker Performance Reports</CardTitle>
              <CardDescription>View lead assignment distribution and status updates per broker.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                {brokers.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">No active brokers found to generate reports.</div>
                ) : (
                  <div className="rounded-md border bg-white overflow-hidden">
                    <Table>
                      <TableHeader className="bg-secondary/10">
                        <TableRow>
                          <TableHead>Broker Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead className="text-center">Total Assigned</TableHead>
                          <TableHead className="text-center text-blue-600">New Leads</TableHead>
                          <TableHead className="text-center text-yellow-600">In Progress</TableHead>
                          <TableHead className="text-center text-green-600">Closed Won</TableHead>
                          <TableHead className="text-center">Avg Response</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {brokers.map(broker => {
                          const stats = getBrokerStats(broker.id);
                          return (
                            <TableRow key={broker.id}>
                              <TableCell className="font-medium">{broker.name}</TableCell>
                              <TableCell className="text-muted-foreground">{broker.email}</TableCell>
                              <TableCell className="text-center font-bold">{stats.total}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200">{stats.new}</Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200">{stats.inProgress}</Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-200">{stats.closed}</Badge>
                              </TableCell>
                              <TableCell className="text-center text-sm text-muted-foreground">
                                {broker.performance?.responseTime || 'N/A'}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        
                        {/* Unassigned Row */}
                        <TableRow className="bg-slate-50">
                           <TableCell className="font-medium text-muted-foreground italic">Unassigned Leads</TableCell>
                           <TableCell className="text-muted-foreground">-</TableCell>
                           <TableCell className="text-center font-bold text-muted-foreground">
                             {getBrokerStats("undefined").total + getBrokerStats("unassigned").total}
                           </TableCell>
                           <TableCell colSpan={4} className="text-center text-xs text-muted-foreground italic">
                             Assign these leads to brokers to start tracking performance
                           </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* SETTINGS TAB Placeholder */}
        {activeTab === 'settings' && (
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>Configure CRM preferences and notifications.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-8 text-center text-muted-foreground border border-dashed rounded-lg">
                Settings panel content would go here.
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
