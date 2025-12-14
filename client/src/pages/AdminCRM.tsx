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
import { Search, Filter, Download, User, Calendar, MapPin, Car, Home, Briefcase, Plane, Heart, Dog, Shield, Check, X } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

export default function AdminCRMPage() {
  const { quotes, updateStatus, assignQuote } = useQuotes();
  const { user, users, approveBroker, denyBroker } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Auth check - simulate protected route
  if (!user || user.role !== 'admin') {
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

  const brokers = users.filter(u => u.role === 'broker' && u.status === 'active');
  const pendingBrokers = users.filter(u => u.role === 'broker' && u.status === 'pending');

  return (
    <div className="min-h-screen bg-secondary/10 pb-20">
      <div className="bg-primary text-white py-8 px-4 shadow-md">
        <div className="container mx-auto">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-serif font-bold mb-2">Account Manager Dashboard</h1>
              <p className="text-primary-foreground/80">Welcome back, {user.name}</p>
            </div>
            <div className="text-right">
              <Link href="/dashboard">
                <Button variant="outline" className="text-primary bg-white hover:bg-white/90">View Broker Portal</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-8">
        <Tabs defaultValue="leads" className="space-y-6">
          <TabsList className="bg-white border shadow-sm">
             <TabsTrigger value="leads">Manage Leads</TabsTrigger>
             <TabsTrigger value="brokers">Manage Brokers {pendingBrokers.length > 0 && <Badge className="ml-2 bg-destructive">{pendingBrokers.length}</Badge>}</TabsTrigger>
          </TabsList>

          <TabsContent value="leads">
            <Card className="shadow-lg border-none">
              <CardHeader className="bg-white border-b pb-4">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                  <CardTitle>All Leads</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-2">
                      <Download size={16} /> Export CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                
                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-6 bg-secondary/5 p-4 rounded-lg border">
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
                    <TableHeader className="bg-secondary/10">
                      <TableRow>
                        <TableHead className="w-[100px]">Status</TableHead>
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
                          <TableRow key={quote.id} className="hover:bg-secondary/5">
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
                              <div className="font-medium">{quote.clientName}</div>
                              <div className="text-xs text-muted-foreground">{quote.email || 'No email'}</div>
                              <div className="text-xs text-muted-foreground">{quote.phone || 'No phone'}</div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-secondary/20 rounded-full text-primary">
                                  {getIconForType(quote.type)}
                                </div>
                                <span className="font-medium">{quote.type}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm">
                                <MapPin size={14} className="text-muted-foreground" />
                                {quote.postalCode || 'N/A'}
                              </div>
                            </TableCell>
                            <TableCell>
                               <Select 
                                value={quote.assignedTo || "unassigned"} 
                                onValueChange={(val) => assignQuote(quote.id, val)}
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
          </TabsContent>

          <TabsContent value="brokers">
             <Card className="shadow-lg border-none">
                <CardHeader>
                  <CardTitle>Manage Brokers</CardTitle>
                  <CardDescription>Approve new registrations and manage broker access.</CardDescription>
                </CardHeader>
                <CardContent>
                  <h3 className="font-bold mb-4 flex items-center gap-2">Pending Approvals {pendingBrokers.length > 0 && <Badge variant="destructive">{pendingBrokers.length}</Badge>}</h3>
                  
                  {pendingBrokers.length === 0 ? (
                    <div className="text-muted-foreground text-sm italic mb-8 border border-dashed p-4 rounded text-center">No pending approvals.</div>
                  ) : (
                    <div className="space-y-4 mb-8">
                       {pendingBrokers.map(broker => (
                         <div key={broker.id} className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div>
                              <div className="font-bold">{broker.name}</div>
                              <div className="text-sm text-muted-foreground">{broker.email}</div>
                              <div className="text-xs text-yellow-700 mt-1">Status: Pending Approval</div>
                            </div>
                            <div className="flex gap-2">
                               <Button size="sm" variant="destructive" onClick={() => denyBroker(broker.id)}><X size={16} className="mr-1" /> Deny</Button>
                               <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => approveBroker(broker.id)}><Check size={16} className="mr-1" /> Approve Access</Button>
                            </div>
                         </div>
                       ))}
                    </div>
                  )}

                  <h3 className="font-bold mb-4">Active Brokers</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                       {brokers.map(broker => (
                         <TableRow key={broker.id}>
                           <TableCell className="font-medium">{broker.name}</TableCell>
                           <TableCell>{broker.email}</TableCell>
                           <TableCell><Badge className="bg-green-500">Active</Badge></TableCell>
                           <TableCell className="text-right">
                             <Button size="sm" variant="outline">Edit Profile</Button>
                           </TableCell>
                         </TableRow>
                       ))}
                    </TableBody>
                  </Table>
                </CardContent>
             </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
