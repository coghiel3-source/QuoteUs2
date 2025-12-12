import { useState } from "react";
import { useQuotes, Quote } from "@/lib/QuoteContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Filter, Download, User, Calendar, MapPin, Car, Home, Briefcase, Plane, Heart, Dog } from "lucide-react";
import { format } from "date-fns";

export default function AdminCRMPage() {
  const { quotes, updateStatus } = useQuotes();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

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

  return (
    <div className="min-h-screen bg-secondary/10 pb-20">
      <div className="bg-primary text-white py-8 px-4 shadow-md">
        <div className="container mx-auto">
          <h1 className="text-3xl font-serif font-bold mb-2">Broker CRM Dashboard</h1>
          <p className="text-primary-foreground/80">Manage your leads and quotes in one place.</p>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-8">
        <Card className="shadow-lg border-none">
          <CardHeader className="bg-white border-b pb-4">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
              <CardTitle>Recent Leads</CardTitle>
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
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
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
                          <Badge className={`${getStatusColor(quote.status)} border-none`}>
                            {quote.status}
                          </Badge>
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
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar size={14} />
                            {format(new Date(quote.date), 'MMM d, yyyy')}
                          </div>
                          <div className="text-xs text-muted-foreground pl-5">
                            {format(new Date(quote.date), 'h:mm a')}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Select 
                            value={quote.status} 
                            onValueChange={(val: any) => updateStatus(quote.id, val)}
                          >
                            <SelectTrigger className="w-[110px] h-8 ml-auto text-xs">
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
      </div>
    </div>
  );
}
