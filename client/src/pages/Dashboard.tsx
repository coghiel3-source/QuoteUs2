import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Filter, Plus, Phone, Mail, MapPin, Calendar, Clock, MoreHorizontal, FileText, CheckCircle, XCircle, ArrowRight } from "lucide-react";
import { useState } from "react";

export default function DashboardPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("leads");

  // Mock Data
  const leads = [
    { id: "L-1023", name: "Sarah Jenkins", type: "Auto", status: "New", date: "2025-05-12", email: "sarah.j@example.com", phone: "(416) 555-0123" },
    { id: "L-1022", name: "Michael Chen", type: "Home", status: "Contacted", date: "2025-05-12", email: "m.chen@example.com", phone: "(647) 555-0198" },
    { id: "L-1021", name: "David Miller", type: "Auto", status: "Quoted", date: "2025-05-11", email: "dave.m@example.com", phone: "(905) 555-0145" },
    { id: "L-1020", name: "Emma Wilson", type: "Tenant", status: "New", date: "2025-05-11", email: "emma.w@example.com", phone: "(416) 555-0167" },
    { id: "L-1019", name: "James Rodriquez", type: "Business", status: "Converted", date: "2025-05-10", email: "j.rodriquez@example.com", phone: "(647) 555-0112" },
    { id: "L-1018", name: "Lisa Wong", type: "Life", status: "Contacted", date: "2025-05-10", email: "lisa.w@example.com", phone: "(416) 555-0189" },
    { id: "L-1017", name: "Robert Taylor", type: "Auto", status: "Lost", date: "2025-05-09", email: "r.taylor@example.com", phone: "(905) 555-0134" },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "New": return "bg-blue-100 text-blue-700 hover:bg-blue-200";
      case "Contacted": return "bg-yellow-100 text-yellow-700 hover:bg-yellow-200";
      case "Quoted": return "bg-purple-100 text-purple-700 hover:bg-purple-200";
      case "Converted": return "bg-green-100 text-green-700 hover:bg-green-200";
      case "Lost": return "bg-gray-100 text-gray-700 hover:bg-gray-200";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const filteredLeads = leads.filter(lead => 
    lead.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-secondary/30 pb-20">
      {/* Dashboard Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="container mx-auto max-w-7xl px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <h1 className="text-xl font-bold text-primary font-serif">Broker CRM</h1>
             <span className="bg-accent/10 text-accent text-xs px-2 py-1 rounded-full font-medium hidden md:inline-block">Pro Edition</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                type="search" 
                placeholder="Search leads..." 
                className="pl-9 w-64 h-9 bg-secondary/50 border-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button size="sm" className="bg-primary text-white gap-2">
              <Plus size={16} /> <span className="hidden sm:inline">New Lead</span>
            </Button>
            <Avatar className="h-8 w-8 cursor-pointer">
              <AvatarImage src="https://github.com/shadcn.png" />
              <AvatarFallback>JD</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-7xl px-4 py-8">
        
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="shadow-sm border-none">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">New Leads</p>
                <h3 className="text-2xl font-bold text-primary mt-1">12</h3>
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><ArrowRight size={12} className="rotate-45" /> +4 today</p>
              </div>
              <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                <Users size={20} />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-none">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Pending Quotes</p>
                <h3 className="text-2xl font-bold text-primary mt-1">28</h3>
                <p className="text-xs text-yellow-600 mt-1 flex items-center gap-1"><Clock size={12} /> 5 urgent</p>
              </div>
              <div className="h-10 w-10 bg-yellow-50 text-yellow-600 rounded-full flex items-center justify-center">
                <FileText size={20} />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-none">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Converted</p>
                <h3 className="text-2xl font-bold text-primary mt-1">8</h3>
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><CheckCircle size={12} /> This week</p>
              </div>
              <div className="h-10 w-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
                <CheckCircle size={20} />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-none">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Conversion Rate</p>
                <h3 className="text-2xl font-bold text-primary mt-1">24%</h3>
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><ArrowRight size={12} className="-rotate-45" /> +2.4%</p>
              </div>
              <div className="h-10 w-10 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center">
                <Filter size={20} />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="leads" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList className="bg-white border">
              <TabsTrigger value="leads">All Leads</TabsTrigger>
              <TabsTrigger value="active">Active Quotes</TabsTrigger>
              <TabsTrigger value="customers">Customers</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
               <Button variant="outline" size="sm" className="gap-2 bg-white">
                 <Filter size={14} /> Filter
               </Button>
               <Button variant="outline" size="sm" className="gap-2 bg-white">
                 <Calendar size={14} /> Date Range
               </Button>
            </div>
          </div>

          <TabsContent value="leads" className="mt-0">
            <Card className="border-none shadow-md overflow-hidden">
              <Table>
                <TableHeader className="bg-secondary/30">
                  <TableRow>
                    <TableHead className="w-[100px]">ID</TableHead>
                    <TableHead>Client Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => (
                    <TableRow key={lead.id} className="hover:bg-secondary/10 cursor-pointer">
                      <TableCell className="font-medium">{lead.id}</TableCell>
                      <TableCell>
                        <div className="font-medium">{lead.name}</div>
                        <div className="text-xs text-muted-foreground">{lead.email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-white">{lead.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getStatusColor(lead.status)} border-none`}>{lead.status}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{lead.date}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                           <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary">
                             <Phone size={14} />
                           </Button>
                           <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary">
                             <Mail size={14} />
                           </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" className="h-8 w-8">
                          <MoreHorizontal size={16} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="p-4 border-t bg-secondary/10 flex justify-center">
                 <Button variant="link" className="text-muted-foreground">View All Leads</Button>
              </div>
            </Card>
          </TabsContent>
          
          <TabsContent value="active">
             <div className="flex flex-col items-center justify-center py-12 text-center bg-white rounded-lg border border-dashed">
                <div className="bg-secondary/50 p-4 rounded-full mb-4">
                  <FileText size={32} className="text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">Active Quotes View</h3>
                <p className="text-muted-foreground max-w-sm mt-2">This view would show detailed quote stages and pipeline management for active deals.</p>
             </div>
          </TabsContent>

          <TabsContent value="customers">
             <div className="flex flex-col items-center justify-center py-12 text-center bg-white rounded-lg border border-dashed">
                <div className="bg-secondary/50 p-4 rounded-full mb-4">
                  <Users size={32} className="text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">Customer Database</h3>
                <p className="text-muted-foreground max-w-sm mt-2">This view would show all converted customers with their policy details and renewal dates.</p>
             </div>
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}
