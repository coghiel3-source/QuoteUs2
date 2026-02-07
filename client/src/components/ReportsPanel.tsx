import { useState, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import {
  Printer, Download, Mail, TrendingUp, TrendingDown, Users, FileText,
  BarChart3, MousePointerClick, Eye, Calendar, Filter
} from "lucide-react";

interface Quote {
  id: string;
  quoteNumber: string;
  type: string;
  clientName: string;
  email?: string | null;
  phone?: string | null;
  postalCode?: string | null;
  status: string;
  priority: string;
  source: string;
  assignedTo?: string | null;
  createdAt?: string;
}

interface Advertisement {
  id: string;
  name: string;
  targetPages: string[];
  impressions: number;
  clicks: number;
  status: string;
}

interface User {
  id: string;
  name: string;
  role: string;
}

const COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#6366f1", "#14b8a6"
];

const GRADIENT_COLORS = {
  blue: { start: "#3b82f6", end: "#60a5fa" },
  green: { start: "#10b981", end: "#34d399" },
  purple: { start: "#8b5cf6", end: "#a78bfa" },
  orange: { start: "#f59e0b", end: "#fbbf24" },
  red: { start: "#ef4444", end: "#f87171" },
  pink: { start: "#ec4899", end: "#f472b6" },
};

type Period = "day" | "week" | "month" | "year";

export default function ReportsPanel({
  quotes,
  advertisements,
  allStaff,
  smtpConfigured,
  userEmail,
  userId,
}: {
  quotes: Quote[];
  advertisements: Advertisement[];
  allStaff: User[];
  smtpConfigured: boolean;
  userEmail?: string;
  userId?: string;
}) {
  const [period, setPeriod] = useState<Period>("month");
  const [reportType, setReportType] = useState<"leads" | "ads">("leads");
  const reportRef = useRef<HTMLDivElement>(null);
  const [emailSending, setEmailSending] = useState(false);

  const now = new Date();

  const getStartDate = (p: Period): Date => {
    const d = new Date(now);
    switch (p) {
      case "day": d.setHours(0, 0, 0, 0); return d;
      case "week": d.setDate(d.getDate() - 7); return d;
      case "month": d.setMonth(d.getMonth() - 1); return d;
      case "year": d.setFullYear(d.getFullYear() - 1); return d;
    }
  };

  const filteredQuotes = useMemo(() => {
    const start = getStartDate(period);
    return quotes.filter(q => q.createdAt && new Date(q.createdAt) >= start);
  }, [quotes, period]);

  const previousPeriodQuotes = useMemo(() => {
    const start = getStartDate(period);
    const duration = now.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - duration);
    return quotes.filter(q => {
      if (!q.createdAt) return false;
      const d = new Date(q.createdAt!);
      return d >= prevStart && d < start;
    });
  }, [quotes, period]);

  const percentChange = previousPeriodQuotes.length > 0
    ? ((filteredQuotes.length - previousPeriodQuotes.length) / previousPeriodQuotes.length * 100).toFixed(1)
    : filteredQuotes.length > 0 ? "100" : "0";

  const leadsByType = useMemo(() => {
    const map: Record<string, number> = {};
    filteredQuotes.forEach(q => { map[q.type] = (map[q.type] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredQuotes]);

  const leadsByStatus = useMemo(() => {
    const map: Record<string, number> = {};
    filteredQuotes.forEach(q => { map[q.status] = (map[q.status] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredQuotes]);

  const leadsOverTime = useMemo(() => {
    const start = getStartDate(period);
    const map: Record<string, number> = {};

    if (period === "day") {
      for (let h = 0; h < 24; h++) map[`${h}:00`] = 0;
      filteredQuotes.forEach(q => {
        const h = new Date(q.createdAt!).getHours();
        map[`${h}:00`]++;
      });
    } else if (period === "week") {
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        map[days[d.getDay()]] = 0;
      }
      filteredQuotes.forEach(q => {
        map[days[new Date(q.createdAt!).getDay()]]++;
      });
    } else if (period === "month") {
      for (let i = 0; i < 30; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        const key = `${d.getMonth() + 1}/${d.getDate()}`;
        map[key] = 0;
      }
      filteredQuotes.forEach(q => {
        const d = new Date(q.createdAt!);
        const key = `${d.getMonth() + 1}/${d.getDate()}`;
        if (key in map) map[key]++;
      });
    } else {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      for (let i = 0; i < 12; i++) {
        const d = new Date(start);
        d.setMonth(d.getMonth() + i);
        map[months[d.getMonth()]] = 0;
      }
      filteredQuotes.forEach(q => {
        const d = new Date(q.createdAt!);
        const key = months[d.getMonth()];
        if (key in map) map[key]++;
      });
    }

    return Object.entries(map).map(([name, leads]) => ({ name, leads }));
  }, [filteredQuotes, period]);

  const leadsBySource = useMemo(() => {
    const map: Record<string, number> = {};
    filteredQuotes.forEach(q => { map[q.source || "Unknown"] = (map[q.source || "Unknown"] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredQuotes]);

  const brokerPerformance = useMemo(() => {
    const map: Record<string, { assigned: number; name: string }> = {};
    filteredQuotes.forEach(q => {
      if (q.assignedTo) {
        if (!map[q.assignedTo]) {
          const broker = allStaff.find(s => s.id === q.assignedTo);
          map[q.assignedTo] = { assigned: 0, name: broker?.name || "Unknown" };
        }
        map[q.assignedTo].assigned++;
      }
    });
    return Object.values(map).sort((a, b) => b.assigned - a.assigned);
  }, [filteredQuotes, allStaff]);

  const adPerformance = useMemo(() => {
    return advertisements.map(ad => ({
      name: ad.name.length > 20 ? ad.name.substring(0, 20) + "..." : ad.name,
      fullName: ad.name,
      impressions: ad.impressions,
      clicks: ad.clicks,
      ctr: ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(2) : "0.00",
      pages: ad.targetPages.join(", ") || "All Pages",
      status: ad.status,
    })).sort((a, b) => b.impressions - a.impressions);
  }, [advertisements]);

  const adsByPage = useMemo(() => {
    const map: Record<string, { impressions: number; clicks: number }> = {};
    advertisements.forEach(ad => {
      const pages = ad.targetPages.length > 0 ? ad.targetPages : ["All Pages"];
      pages.forEach(page => {
        if (!map[page]) map[page] = { impressions: 0, clicks: 0 };
        map[page].impressions += ad.impressions;
        map[page].clicks += ad.clicks;
      });
    });
    return Object.entries(map).map(([page, data]) => ({
      name: page,
      impressions: data.impressions,
      clicks: data.clicks,
      ctr: data.impressions > 0 ? Number(((data.clicks / data.impressions) * 100).toFixed(2)) : 0,
    }));
  }, [advertisements]);

  const totalImpressions = advertisements.reduce((sum, ad) => sum + ad.impressions, 0);
  const totalClicks = advertisements.reduce((sum, ad) => sum + ad.clicks, 0);
  const avgCTR = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0.00";
  const assignedLeads = filteredQuotes.filter(q => q.assignedTo).length;
  const newLeads = filteredQuotes.filter(q => q.status === "New").length;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadCSV = () => {
    let csv = "";
    if (reportType === "leads") {
      csv = "Quote Number,Type,Client Name,Email,Phone,Status,Priority,Source,Created At\n";
      filteredQuotes.forEach(q => {
        csv += `"${q.quoteNumber}","${q.type}","${q.clientName}","${q.email || ""}","${q.phone || ""}","${q.status}","${q.priority}","${q.source}","${q.createdAt}"\n`;
      });
    } else {
      csv = "Ad Name,Status,Impressions,Clicks,CTR (%),Target Pages\n";
      adPerformance.forEach(ad => {
        csv += `"${ad.fullName}","${ad.status}","${ad.impressions}","${ad.clicks}","${ad.ctr}","${ad.pages}"\n`;
      });
    }
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${reportType}-report-${period}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleEmailReport = async () => {
    if (!smtpConfigured) {
      alert("SMTP is not configured. Please configure email settings in the Connections tab first.");
      return;
    }
    setEmailSending(true);
    try {
      let summary = "";
      if (reportType === "leads") {
        summary = `Lead Report (${period})\n\nTotal Leads: ${filteredQuotes.length}\nNew Leads: ${newLeads}\nAssigned: ${assignedLeads}\n\nLeads by Type:\n${leadsByType.map(l => `  ${l.name}: ${l.value}`).join("\n")}\n\nLeads by Status:\n${leadsByStatus.map(l => `  ${l.name}: ${l.value}`).join("\n")}`;
      } else {
        summary = `Ad Performance Report\n\nTotal Impressions: ${totalImpressions.toLocaleString()}\nTotal Clicks: ${totalClicks.toLocaleString()}\nAverage CTR: ${avgCTR}%\n\nAd Performance:\n${adPerformance.map(a => `  ${a.fullName}: ${a.impressions} impressions, ${a.clicks} clicks (${a.ctr}% CTR)`).join("\n")}`;
      }

      const res = await fetch("/api/admin/email-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: `QuoteUs Report: ${reportType === "leads" ? "Leads" : "Ad Performance"} - ${period}`,
          body: summary,
          actorId: userId,
          to: userEmail || "admin@quoteus.ca",
        }),
      });

      if (res.ok) {
        alert("Report emailed successfully!");
      } else {
        alert("Failed to send report email. Check SMTP settings.");
      }
    } catch {
      alert("Failed to send report email.");
    } finally {
      setEmailSending(false);
    }
  };

  const periodLabel = { day: "Today", week: "This Week", month: "This Month", year: "This Year" }[period];

  return (
    <div className="space-y-6 print-report" ref={reportRef}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-report, .print-report * { visibility: visible; }
          .print-report { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-2xl font-bold text-slate-800" data-testid="text-reports-title">Business Analytics</h2>
          <p className="text-muted-foreground">Comprehensive reporting and analytics dashboard</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={reportType} onValueChange={(v: "leads" | "ads") => setReportType(v)}>
            <SelectTrigger className="w-[160px]" data-testid="select-report-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="leads">Lead Reports</SelectItem>
              <SelectItem value="ads">Ad Analytics</SelectItem>
            </SelectContent>
          </Select>

          {reportType === "leads" && (
            <Select value={period} onValueChange={(v: Period) => setPeriod(v)}>
              <SelectTrigger className="w-[140px]" data-testid="select-report-period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
          )}

          <Separator orientation="vertical" className="h-8 hidden md:block" />

          <Button variant="outline" size="sm" onClick={handlePrint} data-testid="button-print-report">
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadCSV} data-testid="button-download-report">
            <Download className="h-4 w-4 mr-2" /> Download CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleEmailReport}
            disabled={emailSending}
            data-testid="button-email-report"
          >
            <Mail className="h-4 w-4 mr-2" /> {emailSending ? "Sending..." : "Email Report"}
          </Button>
        </div>
      </div>

      {reportType === "leads" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Total Leads</p>
                    <p className="text-3xl font-bold mt-1" data-testid="text-total-leads">{filteredQuotes.length}</p>
                    <div className="flex items-center mt-2 text-sm">
                      {Number(percentChange) >= 0 ? (
                        <TrendingUp className="h-4 w-4 mr-1" />
                      ) : (
                        <TrendingDown className="h-4 w-4 mr-1" />
                      )}
                      <span>{percentChange}% vs prev {period}</span>
                    </div>
                  </div>
                  <FileText className="h-10 w-10 text-blue-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-none shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-emerald-100 text-sm font-medium">New Leads</p>
                    <p className="text-3xl font-bold mt-1" data-testid="text-new-leads">{newLeads}</p>
                    <p className="text-sm mt-2 text-emerald-100">
                      {filteredQuotes.length > 0 ? ((newLeads / filteredQuotes.length) * 100).toFixed(0) : 0}% of total
                    </p>
                  </div>
                  <TrendingUp className="h-10 w-10 text-emerald-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-none shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-medium">Assigned</p>
                    <p className="text-3xl font-bold mt-1" data-testid="text-assigned-leads">{assignedLeads}</p>
                    <p className="text-sm mt-2 text-purple-100">
                      {filteredQuotes.length > 0 ? ((assignedLeads / filteredQuotes.length) * 100).toFixed(0) : 0}% assigned rate
                    </p>
                  </div>
                  <Users className="h-10 w-10 text-purple-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-none shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-amber-100 text-sm font-medium">Lead Types</p>
                    <p className="text-3xl font-bold mt-1" data-testid="text-lead-types-count">{leadsByType.length}</p>
                    <p className="text-sm mt-2 text-amber-100">
                      Top: {leadsByType[0]?.name || "N/A"}
                    </p>
                  </div>
                  <BarChart3 className="h-10 w-10 text-amber-200" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-lg border-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  Leads Over Time ({periodLabel})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={leadsOverTime}>
                    <defs>
                      <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="leads"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      fill="url(#colorLeads)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Filter className="h-5 w-5 text-purple-500" />
                  Leads by Insurance Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={leadsByType}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={50}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {leadsByType.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-lg border-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-emerald-500" />
                  Leads by Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={leadsByStatus}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {leadsByStatus.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-orange-500" />
                  Broker Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {brokerPerformance.length === 0 ? (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No assigned leads in this period
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={brokerPerformance} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={120}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip
                        contentStyle={{ borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                      />
                      <Bar dataKey="assigned" fill="#f59e0b" radius={[0, 6, 6, 0]} name="Assigned Leads" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-lg border-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Lead Details ({periodLabel})</CardTitle>
              <CardDescription>{filteredQuotes.length} leads found</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border max-h-[400px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Quote #</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredQuotes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No leads found for this period
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredQuotes.slice(0, 50).map(q => (
                        <TableRow key={q.id}>
                          <TableCell className="font-mono text-sm">{q.quoteNumber}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{q.type}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{q.clientName}</TableCell>
                          <TableCell>
                            <Badge className={
                              q.status === "New" ? "bg-blue-100 text-blue-800" :
                              q.status === "Contacted" ? "bg-yellow-100 text-yellow-800" :
                              q.status === "Quoted" ? "bg-purple-100 text-purple-800" :
                              q.status === "Bound" ? "bg-green-100 text-green-800" :
                              q.status === "Closed" ? "bg-gray-100 text-gray-800" :
                              "bg-red-100 text-red-800"
                            }>{q.status}</Badge>
                          </TableCell>
                          <TableCell>{q.priority}</TableCell>
                          <TableCell>{q.source}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {q.createdAt ? new Date(q.createdAt).toLocaleDateString() : "N/A"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {filteredQuotes.length > 50 && (
                <p className="text-sm text-muted-foreground mt-2">Showing first 50 of {filteredQuotes.length} leads. Download CSV for full data.</p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {reportType === "ads" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white border-none shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-cyan-100 text-sm font-medium">Total Impressions</p>
                    <p className="text-3xl font-bold mt-1" data-testid="text-total-impressions">{totalImpressions.toLocaleString()}</p>
                  </div>
                  <Eye className="h-10 w-10 text-cyan-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-pink-500 to-pink-600 text-white border-none shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-pink-100 text-sm font-medium">Total Clicks</p>
                    <p className="text-3xl font-bold mt-1" data-testid="text-total-clicks">{totalClicks.toLocaleString()}</p>
                  </div>
                  <MousePointerClick className="h-10 w-10 text-pink-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-violet-500 to-violet-600 text-white border-none shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-violet-100 text-sm font-medium">Average CTR</p>
                    <p className="text-3xl font-bold mt-1" data-testid="text-avg-ctr">{avgCTR}%</p>
                  </div>
                  <TrendingUp className="h-10 w-10 text-violet-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white border-none shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-teal-100 text-sm font-medium">Active Ads</p>
                    <p className="text-3xl font-bold mt-1" data-testid="text-active-ads">
                      {advertisements.filter(a => a.status === "active").length}
                    </p>
                    <p className="text-sm mt-2 text-teal-100">of {advertisements.length} total</p>
                  </div>
                  <BarChart3 className="h-10 w-10 text-teal-200" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-lg border-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Eye className="h-5 w-5 text-cyan-500" />
                  Ad Impressions vs Clicks
                </CardTitle>
              </CardHeader>
              <CardContent>
                {adPerformance.length === 0 ? (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No advertisements found
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={adPerformance}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{ borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                      />
                      <Legend />
                      <Bar dataKey="impressions" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Impressions" />
                      <Bar dataKey="clicks" fill="#ec4899" radius={[4, 4, 0, 0]} name="Clicks" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-lg border-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MousePointerClick className="h-5 w-5 text-pink-500" />
                  Click-Through Rate by Ad
                </CardTitle>
              </CardHeader>
              <CardContent>
                {adPerformance.length === 0 ? (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No advertisements found
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={adPerformance}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} unit="%" />
                      <Tooltip
                        contentStyle={{ borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                        formatter={(value: any) => [`${value}%`, "CTR"]}
                      />
                      <Bar dataKey="ctr" radius={[6, 6, 0, 0]} name="CTR %">
                        {adPerformance.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-lg border-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-violet-500" />
                Performance by Page
              </CardTitle>
            </CardHeader>
            <CardContent>
              {adsByPage.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No page data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={adsByPage}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                    />
                    <Legend />
                    <Bar dataKey="impressions" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Impressions" />
                    <Bar dataKey="clicks" fill="#f97316" radius={[4, 4, 0, 0]} name="Clicks" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-lg border-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Ad Performance Details</CardTitle>
              <CardDescription>{advertisements.length} advertisements tracked</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border max-h-[400px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ad Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Target Pages</TableHead>
                      <TableHead className="text-right">Impressions</TableHead>
                      <TableHead className="text-right">Clicks</TableHead>
                      <TableHead className="text-right">CTR</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adPerformance.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No advertisements found
                        </TableCell>
                      </TableRow>
                    ) : (
                      adPerformance.map((ad, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{ad.fullName}</TableCell>
                          <TableCell>
                            <Badge className={
                              ad.status === "active" ? "bg-green-100 text-green-800" :
                              ad.status === "paused" ? "bg-yellow-100 text-yellow-800" :
                              "bg-gray-100 text-gray-800"
                            }>{ad.status}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">{ad.pages}</TableCell>
                          <TableCell className="text-right font-mono">{ad.impressions.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono">{ad.clicks.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono font-semibold">{ad.ctr}%</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
