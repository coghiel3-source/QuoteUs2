import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Image, Video, ExternalLink, Eye, MousePointer, Calendar, Loader2, Upload, Copy, Link, Check, CheckCircle, X, Save, RefreshCw, ChevronUp, LayoutGrid, AlertCircle, Pause, Play } from "lucide-react";

interface Advertisement {
  id: string;
  name: string;
  mediaType: "image" | "video";
  mediaUrl: string;
  linkUrl: string | null;
  openInPopup: boolean;
  targetPages: string[];
  status: "active" | "paused" | "scheduled" | "expired";
  startDate: string | null;
  endDate: string | null;
  priority: number;
  impressions: number;
  clicks: number;
  previewToken: string | null;
  approvalStatus: string | null;
  adText: string | null;
  textColor: string | null;
  backgroundColor: string | null;
  textPosition: string | null;
  topText: string | null;
  centerText: string | null;
  bottomText: string | null;
  topTextColor: string | null;
  centerTextColor: string | null;
  bottomTextColor: string | null;
  topBgColor: string | null;
  centerBgColor: string | null;
  bottomBgColor: string | null;
  forceDisplay: boolean;
  createdAt: string;
}

const PAGE_OPTIONS = [
  { value: "all", label: "All Pages" },
  { value: "Auto", label: "Auto Insurance" },
  { value: "Home", label: "Home Insurance" },
  { value: "Tenant", label: "Tenant Insurance" },
  { value: "Business", label: "Business Insurance" },
  { value: "Life", label: "Life Insurance" },
  { value: "Travel", label: "Travel Insurance" },
  { value: "Pet", label: "Pet Insurance" },
  { value: "Mortgage", label: "Mortgage" },
  { value: "Rent Guarantee", label: "Rent Guarantee" },
];

const DEFAULT_FORM = {
  name: "",
  mediaType: "image" as "image" | "video",
  mediaUrl: "",
  linkUrl: "",
  openInPopup: false,
  targetPages: [] as string[],
  status: "active" as "active" | "paused" | "scheduled",
  startDate: "",
  endDate: "",
  priority: 1,
  forceDisplay: false,
  adText: "",
  textColor: "#ffffff",
  backgroundColor: "#1e3a5f",
  textPosition: "bottom",
  topText: "",
  centerText: "",
  bottomText: "",
  topTextColor: "#ffffff",
  centerTextColor: "#ffffff",
  bottomTextColor: "#ffffff",
  topBgColor: "#1e3a5f",
  centerBgColor: "#1e3a5f",
  bottomBgColor: "#1e3a5f",
};

type FormData = typeof DEFAULT_FORM;

function adToFormData(ad: Advertisement): FormData {
  return {
    name: ad.name,
    mediaType: ad.mediaType,
    mediaUrl: ad.mediaUrl,
    linkUrl: ad.linkUrl || "",
    openInPopup: ad.openInPopup,
    targetPages: [...ad.targetPages],
    status: ad.status === "expired" ? "paused" : ad.status,
    startDate: ad.startDate ? ad.startDate.split("T")[0] : "",
    endDate: ad.endDate ? ad.endDate.split("T")[0] : "",
    priority: ad.priority,
    forceDisplay: ad.forceDisplay ?? false,
    adText: ad.adText || "",
    textColor: ad.textColor || "#ffffff",
    backgroundColor: ad.backgroundColor || "#1e3a5f",
    textPosition: ad.textPosition || "bottom",
    topText: ad.topText || "",
    centerText: ad.centerText || "",
    bottomText: ad.bottomText || "",
    topTextColor: ad.topTextColor || "#ffffff",
    centerTextColor: ad.centerTextColor || "#ffffff",
    bottomTextColor: ad.bottomTextColor || "#ffffff",
    topBgColor: ad.topBgColor || "#1e3a5f",
    centerBgColor: ad.centerBgColor || "#1e3a5f",
    bottomBgColor: ad.bottomBgColor || "#1e3a5f",
  };
}

function formDataEqual(a: FormData, b: FormData): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export interface AdvertisementManagerHandle {
  save: () => Promise<boolean>;
  discard: () => void;
}

interface AdvertisementManagerProps {
  canApproveAds?: boolean;
  onHasUnsavedChanges?: (hasChanges: boolean) => void;
}

const AdvertisementManager = forwardRef<AdvertisementManagerHandle, AdvertisementManagerProps>(function AdvertisementManager({ canApproveAds = true, onHasUnsavedChanges }, ref) {
  const { toast } = useToast();
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const [activeTextPositions, setActiveTextPositions] = useState<Set<string>>(new Set());
  const [unsavedDialogOpen, setUnsavedDialogOpen] = useState(false);
  const pendingAction = useRef<(() => void) | null>(null);
  const [previewCacheBust, setPreviewCacheBust] = useState<number>(0);
  const [showReloadHint, setShowReloadHint] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({ ...DEFAULT_FORM });
  const [savedFormData, setSavedFormData] = useState<FormData>({ ...DEFAULT_FORM });

  const hasUnsavedChanges = isFormOpen && !formDataEqual(formData, savedFormData);

  useEffect(() => {
    onHasUnsavedChanges?.(hasUnsavedChanges);
  }, [hasUnsavedChanges, onHasUnsavedChanges]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  const handleDiscard = useCallback(() => {
    if (editingAd) {
      const data = adToFormData(editingAd);
      setFormData(data);
      setSavedFormData(data);
    } else {
      setFormData({ ...DEFAULT_FORM });
      setSavedFormData({ ...DEFAULT_FORM });
    }
  }, [editingAd]);

  const saveRef = useRef<() => Promise<boolean>>(() => Promise.resolve(false));

  useImperativeHandle(ref, () => ({
    save: () => saveRef.current(),
    discard: handleDiscard,
  }), [handleDiscard]);

  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    try {
      const res = await fetch("/api/admin/advertisements");
      if (res.ok) {
        const data = await res.json();
        setAds(data);
        if (editingAd) {
          const updated = data.find((a: Advertisement) => a.id === editingAd.id);
          if (updated) setEditingAd(updated);
        }
      }
    } catch (error) {
      console.error("Error fetching ads:", error);
    } finally {
      setLoading(false);
    }
  };

  const guardAction = useCallback((action: () => void) => {
    if (hasUnsavedChanges) {
      pendingAction.current = action;
      setUnsavedDialogOpen(true);
    } else {
      action();
    }
  }, [hasUnsavedChanges]);

  const handleUnsavedDiscard = () => {
    setUnsavedDialogOpen(false);
    const action = pendingAction.current;
    pendingAction.current = null;
    if (action) action();
  };

  const handleUnsavedSave = async () => {
    const success = await handleSave();
    if (!success) return;
    setUnsavedDialogOpen(false);
    const action = pendingAction.current;
    pendingAction.current = null;
    if (action) action();
  };

  const handleUnsavedCancel = () => {
    setUnsavedDialogOpen(false);
    pendingAction.current = null;
  };

  const openCreateForm = () => {
    guardAction(() => {
      const fresh = { ...DEFAULT_FORM };
      setFormData(fresh);
      setSavedFormData(fresh);
      setEditingAd(null);
      setActiveTextPositions(new Set());
      setShowReloadHint(false);
      setPreviewCacheBust(0);
      setIsFormOpen(true);
      setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    });
  };

  const openEditForm = (ad: Advertisement) => {
    guardAction(() => {
      const data = adToFormData(ad);
      setFormData(data);
      setSavedFormData(data);
      setEditingAd(ad);
      const positions = new Set<string>();
      if (ad.topText) positions.add("top");
      if (ad.centerText) positions.add("center");
      if (ad.bottomText) positions.add("bottom");
      setActiveTextPositions(positions);
      setShowReloadHint(false);
      setPreviewCacheBust(0);
      setIsFormOpen(true);
      setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    });
  };

  const closeForm = () => {
    guardAction(() => {
      setIsFormOpen(false);
      setEditingAd(null);
      setFormData({ ...DEFAULT_FORM });
      setSavedFormData({ ...DEFAULT_FORM });
      setActiveTextPositions(new Set());
      setShowReloadHint(false);
      setPreviewCacheBust(0);
    });
  };

  const handleRefresh = async () => {
    if (editingAd) {
      try {
        const res = await fetch(`/api/admin/advertisements`);
        if (res.ok) {
          const allAds: Advertisement[] = await res.json();
          const freshAd = allAds.find(a => a.id === editingAd.id);
          if (freshAd) {
            const data = adToFormData(freshAd);
            setFormData(data);
            setSavedFormData(data);
            setEditingAd(freshAd);
            const positions = new Set<string>();
            if (freshAd.topText) positions.add("top");
            if (freshAd.centerText) positions.add("center");
            if (freshAd.bottomText) positions.add("bottom");
            setActiveTextPositions(positions);
            setAds(allAds);
            toast({ title: "Refreshed", description: "Loaded latest saved data from server" });
            return;
          }
        }
      } catch {}
      const data = adToFormData(editingAd);
      setFormData(data);
      setSavedFormData(data);
      toast({ title: "Refreshed", description: "Form reset to last saved data" });
    } else {
      const fresh = { ...DEFAULT_FORM };
      setFormData(fresh);
      setSavedFormData(fresh);
      setActiveTextPositions(new Set());
      toast({ title: "Refreshed", description: "Form cleared" });
    }
  };

  const handleSave = async (): Promise<boolean> => {
    if (!formData.name || !formData.mediaUrl) {
      toast({ title: "Error", description: "Name and media URL are required", variant: "destructive" });
      return false;
    }
    
    setSaving(true);
    try {
      const payload = {
        ...formData,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
      };
      
      const url = editingAd 
        ? `/api/admin/advertisements/${editingAd.id}`
        : "/api/admin/advertisements";
      const method = editingAd ? "PATCH" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (res.ok) {
        const savedAd = await res.json();
        toast({ title: "Success", description: editingAd ? "Advertisement updated" : "Advertisement created" });
        const updatedData = adToFormData(savedAd);
        setFormData(updatedData);
        setSavedFormData(updatedData);
        setEditingAd(savedAd);
        fetchAds();
        return true;
      } else {
        const error = await res.json();
        toast({ title: "Error", description: error.error, variant: "destructive" });
        return false;
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to save advertisement", variant: "destructive" });
      return false;
    } finally {
      setSaving(false);
    }
  };

  saveRef.current = handleSave;

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this advertisement?")) return;
    
    try {
      const res = await fetch(`/api/admin/advertisements/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: "Success", description: "Advertisement deleted" });
        if (editingAd?.id === id) {
          setIsFormOpen(false);
          setEditingAd(null);
          setFormData({ ...DEFAULT_FORM });
          setSavedFormData({ ...DEFAULT_FORM });
        }
        fetchAds();
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete advertisement", variant: "destructive" });
    }
  };

  const handleAdminApprove = async (ad: Advertisement) => {
    try {
      const res = await fetch(`/api/admin/advertisements/${ad.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalStatus: "approved", status: "active" }),
      });
      if (res.ok) {
        toast({ title: "Success", description: "Advertisement approved and activated" });
        fetchAds();
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to approve advertisement", variant: "destructive" });
    }
  };

  const handleClearEndDate = async (ad: Advertisement) => {
    try {
      const res = await fetch(`/api/admin/advertisements/${ad.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endDate: null }),
      });
      if (res.ok) {
        toast({ title: "Reactivated", description: "End date removed — ad will run indefinitely" });
        fetchAds();
        if (editingAd?.id === ad.id) {
          setFormData(prev => ({ ...prev, endDate: "" }));
          setSavedFormData(prev => ({ ...prev, endDate: "" }));
        }
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to reactivate advertisement", variant: "destructive" });
    }
  };

  const togglePage = (page: string) => {
    setFormData(prev => {
      if (page === "all") {
        return {
          ...prev,
          targetPages: prev.targetPages.includes("all") ? [] : ["all"]
        };
      }
      const withoutAll = prev.targetPages.filter(p => p !== "all");
      return {
        ...prev,
        targetPages: withoutAll.includes(page)
          ? withoutAll.filter(p => p !== page)
          : [...withoutAll, page]
      };
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    const formDataObj = new FormData();
    formDataObj.append("file", file);
    
    try {
      const res = await fetch("/api/admin/advertisements/upload", {
        method: "POST",
        body: formDataObj,
      });
      
      if (res.ok) {
        const data = await res.json();
        const isVideo = file.type.startsWith("video/");
        setFormData(prev => ({ ...prev, mediaUrl: data.url, mediaType: isVideo ? "video" : "image" }));
        setPreviewCacheBust(Date.now());
        setShowReloadHint(true);
        toast({ title: "Success", description: "File uploaded successfully" });
      } else {
        toast({ title: "Error", description: "Failed to upload file", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to upload file", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const copyPreviewLink = async (ad: Advertisement) => {
    if (!ad.previewToken) return;
    
    const previewUrl = `${window.location.origin}/ad-preview/${ad.previewToken}`;
    try {
      await navigator.clipboard.writeText(previewUrl);
      setCopiedId(ad.id);
      toast({ title: "Copied!", description: "Preview link copied to clipboard" });
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast({ title: "Error", description: "Failed to copy link", variant: "destructive" });
    }
  };

  const getApprovalBadge = (status: string | null) => {
    if (!status || status === "pending") return <Badge variant="outline">Pending Approval</Badge>;
    if (status === "approved") return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
    if (status === "rejected") return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
    return null;
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-green-100 text-green-800",
      paused: "bg-yellow-100 text-yellow-800",
      scheduled: "bg-blue-100 text-blue-800",
      expired: "bg-gray-100 text-gray-800",
    };
    return <Badge className={colors[status] || ""}>{status}</Badge>;
  };

  const getCTR = (impressions: number, clicks: number) => {
    if (impressions === 0) return "0%";
    return ((clicks / impressions) * 100).toFixed(2) + "%";
  };

  /* Build page coverage map from current ads — must be before early returns */
  const pageCoverage = useMemo(() => {
    const PAGE_VALUES = PAGE_OPTIONS.filter(p => p.value !== "all").map(p => p.value);
    return PAGE_VALUES.map(pageVal => {
      const matching = ads.filter(ad =>
        ad.status === "active" &&
        (ad.targetPages.includes("all") || ad.targetPages.length === 0 || ad.targetPages.includes(pageVal))
      );
      return { page: pageVal, count: matching.length, names: matching.map(a => a.name) };
    });
  }, [ads]);

  const handleQuickStatus = async (e: React.MouseEvent, ad: Advertisement) => {
    e.stopPropagation();
    const newStatus = ad.status === "active" ? "paused" : "active";
    try {
      const res = await fetch(`/api/admin/advertisements/${ad.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast({ title: newStatus === "active" ? "Ad Activated" : "Ad Paused", description: ad.name });
        fetchAds();
      }
    } catch {
      toast({ title: "Error", description: "Could not update status", variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Advertisements</h2>
          <p className="text-muted-foreground">Manage ads displayed on quote pages</p>
        </div>
        <Button onClick={openCreateForm} data-testid="button-new-advertisement">
          <Plus className="mr-2 h-4 w-4" /> New Advertisement
        </Button>
      </div>

      {/* Live Ads on Website Panel */}
      <Card className="border border-primary/20 shadow-sm">
        <CardHeader className="pb-3 pt-4 px-5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-primary" />
              Ads Displayed on Website
              <span className="text-xs text-muted-foreground font-normal ml-1">— Currently live per page</span>
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={fetchAds} className="h-7 text-xs gap-1 text-muted-foreground">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3" data-testid="page-coverage-grid">
            {pageCoverage.map(({ page: pv, count, names }) => {
              const liveAds = ads.filter(ad =>
                ad.status === "active" &&
                (ad.targetPages.includes("all") || ad.targetPages.length === 0 || ad.targetPages.includes(pv))
              );
              return (
                <div
                  key={pv}
                  className={`rounded-xl border overflow-hidden transition-all ${
                    count > 0
                      ? "border-green-200 shadow-sm"
                      : "border-gray-200 bg-white"
                  }`}
                  data-testid={`coverage-${pv}`}
                >
                  {/* Ad thumbnails stack */}
                  {liveAds.length > 0 ? (
                    <div className="relative bg-gray-100" style={{ height: "80px" }}>
                      {liveAds.slice(0, 3).map((ad, i) => (
                        <div
                          key={ad.id}
                          className="absolute inset-0"
                          style={{ zIndex: i, opacity: i === liveAds.length - 1 || liveAds.length === 1 ? 1 : 0.35, transform: `translateY(${i * 3}px) scale(${1 - i * 0.04})` }}
                        >
                          {ad.mediaType === "image" ? (
                            <img
                              src={ad.mediaUrl}
                              alt={ad.name}
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                            />
                          ) : (
                            <video src={ad.mediaUrl} className="w-full h-full object-cover" muted />
                          )}
                        </div>
                      ))}
                      {liveAds.length > 1 && (
                        <div className="absolute top-1.5 right-1.5 bg-black/60 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center z-10">
                          {liveAds.length}
                        </div>
                      )}
                      {liveAds.some(a => a.forceDisplay) && (
                        <div className="absolute bottom-1 left-1 bg-purple-600 text-white text-[8px] font-bold px-1 rounded z-10">
                          PINNED
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center bg-gray-50" style={{ height: "80px" }}>
                      <AlertCircle className="h-5 w-5 text-gray-200" />
                    </div>
                  )}
                  <div className={`px-2 py-1.5 ${count > 0 ? "bg-green-50" : "bg-white"}`}>
                    <div className="flex items-center gap-1 mb-0.5">
                      {count > 0
                        ? <Check className="h-3 w-3 text-green-600 shrink-0" />
                        : <AlertCircle className="h-3 w-3 text-gray-300 shrink-0" />}
                      <span className={`text-[10px] font-semibold ${count > 0 ? "text-green-700" : "text-gray-400"}`}>
                        {count > 0 ? `${count} active` : "None"}
                      </span>
                    </div>
                    <p className="text-[9px] text-muted-foreground leading-tight truncate">{pv}</p>
                    {names.length > 0 && (
                      <p className="text-[8px] text-green-700 truncate mt-0.5" title={names.join(", ")}>{names[0]}{names.length > 1 ? ` +${names.length - 1}` : ""}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Pages</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Approval</TableHead>
                <TableHead className="text-right">Views</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead className="text-right">CTR</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No advertisements yet. Create your first ad to get started.
                  </TableCell>
                </TableRow>
              ) : (
                ads.map(ad => (
                  <TableRow 
                    key={ad.id} 
                    className={editingAd?.id === ad.id ? "bg-primary/5" : "cursor-pointer hover:bg-muted/50"}
                    onClick={() => openEditForm(ad)}
                  >
                    <TableCell className="font-medium">{ad.name}</TableCell>
                    <TableCell>
                      {ad.mediaType === "image" ? <Image className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                    </TableCell>
                    <TableCell>
                      {ad.targetPages.length === 0 || ad.targetPages.includes("all") 
                        ? <Badge variant="outline">All</Badge>
                        : ad.targetPages.slice(0, 2).map(p => <Badge key={p} variant="outline" className="mr-1">{p}</Badge>)}
                      {ad.targetPages.length > 2 && <Badge variant="outline">+{ad.targetPages.length - 2}</Badge>}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {getStatusBadge(ad.status)}
                        {ad.forceDisplay && (
                          <Badge className="bg-purple-100 text-purple-800 text-[10px] whitespace-nowrap border border-purple-200">📌 Always On</Badge>
                        )}
                        {!ad.forceDisplay && ad.endDate && new Date(ad.endDate) < new Date() && ad.status === "active" && (
                          <>
                            <Badge className="bg-red-100 text-red-800 text-[10px] whitespace-nowrap">End date passed</Badge>
                            <button
                              onClick={e => { e.stopPropagation(); handleClearEndDate(ad); }}
                              className="text-[10px] text-blue-600 hover:underline text-left"
                              data-testid={`button-reactivate-ad-${ad.id}`}
                            >
                              Reactivate →
                            </button>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getApprovalBadge(ad.approvalStatus)}</TableCell>
                    <TableCell className="text-right">{ad.impressions.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{ad.clicks.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{getCTR(ad.impressions, ad.clicks)}</TableCell>
                    <TableCell className="text-right">
                      <div onClick={(e) => e.stopPropagation()} className="inline-flex">
                        {canApproveAds && ad.approvalStatus !== "approved" && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleAdminApprove(ad)} 
                            title="Approve and activate immediately"
                            data-testid={`button-admin-approve-${ad.id}`}
                          >
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => copyPreviewLink(ad)} 
                          title="Copy preview link for customer approval"
                          data-testid={`button-copy-preview-${ad.id}`}
                        >
                          {copiedId === ad.id ? <Check className="h-4 w-4 text-green-500" /> : <Link className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleQuickStatus(e, ad)}
                          title={ad.status === "active" ? "Pause ad" : "Activate ad"}
                          data-testid={`button-toggle-status-${ad.id}`}
                        >
                          {ad.status === "active"
                            ? <Pause className="h-4 w-4 text-amber-500" />
                            : <Play className="h-4 w-4 text-green-500" />}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEditForm(ad)} data-testid={`button-edit-ad-${ad.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(ad.id)} data-testid={`button-delete-ad-${ad.id}`}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {isFormOpen && (
        <Card ref={formRef} className="border-2 border-primary/20" data-testid="ad-edit-form">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{editingAd ? `Editing: ${editingAd.name}` : "Create New Advertisement"}</CardTitle>
                <CardDescription>
                  {editingAd ? "Update the fields below and click Save to apply changes" : "Fill in the details below and click Save to create the ad"}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {hasUnsavedChanges && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                    Unsaved Changes
                  </Badge>
                )}
                <Button variant="ghost" size="sm" onClick={closeForm} data-testid="button-close-ad-form">
                  <ChevronUp className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {editingAd && editingAd.mediaUrl && (
              <div className="border rounded-lg p-4 bg-amber-50">
                <Label className="mb-3 block text-sm font-semibold">Current Advertisement</Label>
                <div className="relative rounded-lg overflow-hidden shadow-sm" style={{ backgroundColor: editingAd.backgroundColor || '#1e3a5f' }}>
                  {editingAd.mediaType === "image" ? (
                    <img 
                      src={editingAd.mediaUrl} 
                      alt={editingAd.name} 
                      className="w-full h-auto object-contain"
                      style={{ maxHeight: '350px' }}
                    />
                  ) : (
                    <video 
                      src={editingAd.mediaUrl} 
                      className="w-full h-auto" 
                      style={{ maxHeight: '350px' }}
                      muted 
                      controls
                    />
                  )}
                  {editingAd.topText && (
                    <div 
                      className="absolute left-0 right-0 top-0 p-2 text-center font-semibold text-sm"
                      style={{ 
                        color: editingAd.topTextColor || '#ffffff',
                        backgroundColor: `${editingAd.topBgColor || '#1e3a5f'}dd`,
                        textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                        whiteSpace: 'pre-line'
                      }}
                    >
                      {editingAd.topText}
                    </div>
                  )}
                  {editingAd.centerText && (
                    <div 
                      className="absolute left-0 right-0 top-1/2 -translate-y-1/2 p-2 text-center font-semibold text-sm"
                      style={{ 
                        color: editingAd.centerTextColor || '#ffffff',
                        backgroundColor: `${editingAd.centerBgColor || '#1e3a5f'}dd`,
                        textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                        whiteSpace: 'pre-line'
                      }}
                    >
                      {editingAd.centerText}
                    </div>
                  )}
                  {editingAd.bottomText && (
                    <div 
                      className="absolute left-0 right-0 bottom-0 p-2 text-center font-semibold text-sm"
                      style={{ 
                        color: editingAd.bottomTextColor || '#ffffff',
                        backgroundColor: `${editingAd.bottomBgColor || '#1e3a5f'}dd`,
                        textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                        whiteSpace: 'pre-line'
                      }}
                    >
                      {editingAd.bottomText}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">This is how your ad currently appears. Make changes below to update it.</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input 
                  value={formData.name} 
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Winter Tires Promo"
                  data-testid="input-ad-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Media Type</Label>
                <Select value={formData.mediaType} onValueChange={(v: "image" | "video") => setFormData(prev => ({ ...prev, mediaType: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Media *</Label>
              <div className="flex gap-2">
                <Input 
                  value={formData.mediaUrl} 
                  onChange={(e) => { setFormData(prev => ({ ...prev, mediaUrl: e.target.value })); setShowReloadHint(false); }}
                  placeholder="Enter URL or upload a file"
                  data-testid="input-ad-media-url"
                  className="flex-1"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  data-testid="input-ad-file-upload"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  data-testid="button-upload-file"
                  title="Upload image or video file"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                </Button>
                {showReloadHint && formData.mediaUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setPreviewCacheBust(Date.now()); setShowReloadHint(false); }}
                    data-testid="button-reload-preview"
                    title="Reload preview to see uploaded file"
                    className="border-green-400 text-green-700 hover:bg-green-50"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" /> Reload
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Enter a URL or upload an image/video file. Recommended size: 728x90 for banners.</p>
              {showReloadHint && (
                <p className="text-xs text-green-700 font-medium flex items-center gap-1">
                  <Check className="h-3 w-3" /> File uploaded — click "Reload" to refresh the preview below.
                </p>
              )}
            </div>

            <div className="border rounded-lg p-4 bg-blue-50">
              <Label className="mb-3 block text-sm font-semibold">Ad Text Overlays</Label>
              <p className="text-xs text-muted-foreground mb-3">Click a button below to add text at that position. Use emojis like 🚗 🏠 💰 ⭐ ✨ 🔥</p>
              <div className="flex gap-2 mb-4">
                {[
                  { key: "top", label: "Top" },
                  { key: "center", label: "Center" },
                  { key: "bottom", label: "Bottom" },
                ].map((pos) => (
                  <Button
                    key={pos.key}
                    type="button"
                    size="sm"
                    variant={activeTextPositions.has(pos.key) ? "default" : "outline"}
                    onClick={() => {
                      setActiveTextPositions(prev => {
                        const next = new Set(prev);
                        if (next.has(pos.key)) {
                          next.delete(pos.key);
                          const textKey = pos.key === "top" ? "topText" : pos.key === "center" ? "centerText" : "bottomText";
                          setFormData(p => ({ ...p, [textKey]: "" }));
                        } else {
                          next.add(pos.key);
                        }
                        return next;
                      });
                    }}
                    data-testid={`button-add-${pos.key}-text`}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {pos.label}
                  </Button>
                ))}
              </div>
              <div className="space-y-3">
                {[
                  { key: "top", label: "Top Text", textKey: "topText", colorKey: "topTextColor", bgKey: "topBgColor", placeholder: "PLUMBER AVAILABLE 24/7" },
                  { key: "center", label: "Center Text", textKey: "centerText", colorKey: "centerTextColor", bgKey: "centerBgColor", placeholder: "Fast & Reliable Service" },
                  { key: "bottom", label: "Bottom Text", textKey: "bottomText", colorKey: "bottomTextColor", bgKey: "bottomBgColor", placeholder: "CALL NOW\n555-123-4567" },
                ].filter(pos => activeTextPositions.has(pos.key)).map((pos) => (
                  <div key={pos.key} className="border rounded-md p-3 bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{pos.label}</Label>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTextPositions(prev => {
                            const next = new Set(prev);
                            next.delete(pos.key);
                            return next;
                          });
                          setFormData(p => ({ ...p, [pos.textKey]: "" }));
                        }}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        data-testid={`button-remove-${pos.key}-text`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-start">
                      <Textarea
                        value={(formData as any)[pos.textKey]}
                        onChange={(e) => setFormData(prev => ({ ...prev, [pos.textKey]: e.target.value }))}
                        placeholder={pos.placeholder}
                        rows={2}
                        className="text-sm"
                        data-testid={`input-${pos.key}-text`}
                      />
                      <div className="space-y-1">
                        <Label className="text-[10px]">Text</Label>
                        <Input
                          type="color"
                          value={(formData as any)[pos.colorKey]}
                          onChange={(e) => setFormData(prev => ({ ...prev, [pos.colorKey]: e.target.value }))}
                          className="w-10 h-8 p-0.5 cursor-pointer"
                          data-testid={`input-${pos.key}-text-color`}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px]">BG</Label>
                        <Input
                          type="color"
                          value={(formData as any)[pos.bgKey]}
                          onChange={(e) => setFormData(prev => ({ ...prev, [pos.bgKey]: e.target.value }))}
                          className="w-10 h-8 p-0.5 cursor-pointer"
                          data-testid={`input-${pos.key}-bg-color`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border rounded-lg p-4 bg-slate-100">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-semibold">Website Preview — How ad appears on quote pages</Label>
                {formData.mediaUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => setPreviewCacheBust(Date.now())}
                    data-testid="button-refresh-website-preview"
                  >
                    <RefreshCw className="h-3 w-3" /> Reload Ad
                  </Button>
                )}
              </div>
              <div className="bg-white rounded-lg shadow-sm border p-4 max-w-md mx-auto">
                <div className="space-y-3">
                  <div className="h-3 bg-slate-200 rounded w-3/4"></div>
                  <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                  <div className="h-10 bg-orange-500 rounded flex items-center justify-center text-white text-xs font-medium">
                    Get My Quote Now
                  </div>
                  <div 
                    className="mt-4 rounded-lg overflow-hidden shadow-md cursor-pointer hover:shadow-lg transition-shadow relative" 
                    style={{ backgroundColor: formData.backgroundColor }}
                    data-testid="website-preview-ad"
                  >
                    {formData.mediaUrl ? (
                      formData.mediaType === "image" ? (
                        <img
                          key={previewCacheBust}
                          src={previewCacheBust > 0 ? `${formData.mediaUrl}?t=${previewCacheBust}` : formData.mediaUrl}
                          alt={formData.name || "Ad Preview"}
                          className="w-full h-auto object-contain"
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                      ) : (
                        <video key={previewCacheBust} src={formData.mediaUrl} className="w-full h-auto" muted />
                      )
                    ) : (
                      <div className="h-20"></div>
                    )}
                    {formData.topText && (
                      <div 
                        className="absolute left-0 right-0 top-0 p-2 text-center font-semibold text-sm"
                        style={{ 
                          color: formData.topTextColor, 
                          backgroundColor: `${formData.topBgColor}dd`,
                          textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                          whiteSpace: 'pre-line'
                        }}
                      >
                        {formData.topText}
                      </div>
                    )}
                    {formData.centerText && (
                      <div 
                        className="absolute left-0 right-0 top-1/2 -translate-y-1/2 p-2 text-center font-semibold text-sm"
                        style={{ 
                          color: formData.centerTextColor, 
                          backgroundColor: `${formData.centerBgColor}dd`,
                          textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                          whiteSpace: 'pre-line'
                        }}
                      >
                        {formData.centerText}
                      </div>
                    )}
                    {formData.bottomText && (
                      <div 
                        className="absolute left-0 right-0 bottom-0 p-2 text-center font-semibold text-sm"
                        style={{ 
                          color: formData.bottomTextColor, 
                          backgroundColor: `${formData.bottomBgColor}dd`,
                          textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                          whiteSpace: 'pre-line'
                        }}
                      >
                        {formData.bottomText}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-center text-muted-foreground">Sponsored</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Link URL (optional)</Label>
                <Input 
                  value={formData.linkUrl} 
                  onChange={(e) => setFormData(prev => ({ ...prev, linkUrl: e.target.value }))}
                  placeholder="https://external-site.com"
                  data-testid="input-ad-link-url"
                />
              </div>
              <div className="space-y-2">
                <Label>Priority (1-10)</Label>
                <Input 
                  type="number"
                  min={1}
                  max={10}
                  value={formData.priority} 
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 1 }))}
                  data-testid="input-ad-priority"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox 
                id="openInPopup"
                checked={formData.openInPopup}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, openInPopup: checked as boolean }))}
                data-testid="checkbox-ad-popup"
              />
              <Label htmlFor="openInPopup" className="cursor-pointer">Open link in popup window</Label>
            </div>

            <div className="border rounded-lg p-4 bg-primary/5">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-semibold">
                  Target Pages *
                </Label>
                {formData.targetPages.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {formData.targetPages.includes("all")
                      ? "All pages selected"
                      : `${formData.targetPages.length} page${formData.targetPages.length > 1 ? "s" : ""} selected`}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Choose which insurance pages this ad will appear on. Select "All Pages" to show everywhere, or pick individual pages for targeted placement.
              </p>
              <div className="flex flex-wrap gap-2">
                {PAGE_OPTIONS.map(page => {
                  const selected = formData.targetPages.includes(page.value);
                  const isAll = page.value === "all";
                  return (
                    <Button
                      key={page.value}
                      type="button"
                      variant={selected ? "default" : "outline"}
                      size="sm"
                      onClick={() => togglePage(page.value)}
                      className={isAll ? "border-2" : ""}
                      data-testid={`button-target-page-${page.value}`}
                    >
                      {selected && <Check className="mr-1 h-3 w-3" />}
                      {page.label}
                    </Button>
                  );
                })}
              </div>
              {formData.targetPages.length === 0 && (
                <p className="text-xs text-amber-600 font-medium mt-2 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  No pages selected — ad will not appear on any page until you select at least one.
                </p>
              )}
            </div>

            {/* Advanced Display Settings */}
            <div className="border rounded-lg p-4 bg-purple-50 border-purple-200">
              <Label className="mb-1 block text-sm font-semibold text-purple-800">Advanced Settings</Label>
              <p className="text-xs text-purple-600 mb-4">Control display behaviour beyond the standard scheduling rules.</p>

              <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-purple-200">
                <div className="flex items-center h-6 mt-0.5">
                  <Checkbox
                    id="forceDisplay"
                    checked={formData.forceDisplay}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, forceDisplay: checked as boolean }))}
                    data-testid="checkbox-force-display"
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="forceDisplay" className="cursor-pointer font-semibold text-sm text-purple-900 flex items-center gap-2">
                    Always Display
                    {formData.forceDisplay && (
                      <Badge className="bg-purple-600 text-white text-[10px] h-4 px-1.5">PINNED</Badge>
                    )}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    When enabled, this ad will display on the website regardless of start/end date restrictions. The ad will always appear as long as it is set to <strong>Active</strong>.
                  </p>
                  {formData.forceDisplay && (
                    <p className="text-xs text-purple-700 font-medium mt-1.5 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" /> This ad is pinned — it bypasses all scheduling dates and will always appear while active.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v: "active" | "paused" | "scheduled") => setFormData(prev => ({ ...prev, status: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input 
                  type="date"
                  value={formData.startDate} 
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  data-testid="input-ad-start-date"
                  disabled={formData.forceDisplay}
                  title={formData.forceDisplay ? "Disabled — Always Display overrides date restrictions" : ""}
                  className={formData.forceDisplay ? "opacity-40 cursor-not-allowed" : ""}
                />
                {formData.forceDisplay && (
                  <p className="text-[10px] text-purple-600">Ignored — Always Display enabled</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input 
                  type="date"
                  value={formData.endDate} 
                  onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  data-testid="input-ad-end-date"
                  disabled={formData.forceDisplay}
                  title={formData.forceDisplay ? "Disabled — Always Display overrides date restrictions" : ""}
                  className={formData.forceDisplay ? "opacity-40 cursor-not-allowed" : formData.endDate && new Date(formData.endDate) < new Date() ? "border-red-400" : ""}
                />
                {!formData.forceDisplay && formData.endDate && new Date(formData.endDate) < new Date() && (
                  <p className="text-xs text-red-600 font-medium">End date has passed — this ad will not show on pages. Update the end date or clear it to run indefinitely.</p>
                )}
                {formData.forceDisplay && (
                  <p className="text-[10px] text-purple-600">Ignored — Always Display enabled</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleRefresh}
                  data-testid="button-refresh-ad"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {editingAd ? "Reset to Saved" : "Clear Form"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={closeForm} 
                  data-testid="button-cancel-ad"
                >
                  Cancel
                </Button>
              </div>
              <Button 
                onClick={handleSave} 
                disabled={saving} 
                size="lg"
                data-testid="button-save-ad"
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                {editingAd ? "Save Changes" : "Save Advertisement"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={unsavedDialogOpen} onOpenChange={(open) => { if (!open) handleUnsavedCancel(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            You have unsaved changes to this advertisement. Would you like to save before continuing?
          </p>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleUnsavedCancel} data-testid="button-unsaved-cancel">
              Go Back
            </Button>
            <Button variant="destructive" onClick={handleUnsavedDiscard} data-testid="button-unsaved-discard">
              Discard
            </Button>
            <Button onClick={handleUnsavedSave} data-testid="button-unsaved-save">
              <Save className="mr-2 h-4 w-4" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

export default AdvertisementManager;
