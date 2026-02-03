import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Image, Video, ExternalLink, Eye, MousePointer, Calendar, Loader2, Upload, Copy, Link, Check, CheckCircle } from "lucide-react";

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
];

export default function AdvertisementManager() {
  const { toast } = useToast();
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [formData, setFormData] = useState({
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
  });

  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    try {
      const res = await fetch("/api/admin/advertisements");
      if (res.ok) {
        const data = await res.json();
        setAds(data);
      }
    } catch (error) {
      console.error("Error fetching ads:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      mediaType: "image",
      mediaUrl: "",
      linkUrl: "",
      openInPopup: false,
      targetPages: [],
      status: "active",
      startDate: "",
      endDate: "",
      priority: 1,
    });
    setEditingAd(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (ad: Advertisement) => {
    setEditingAd(ad);
    setFormData({
      name: ad.name,
      mediaType: ad.mediaType,
      mediaUrl: ad.mediaUrl,
      linkUrl: ad.linkUrl || "",
      openInPopup: ad.openInPopup,
      targetPages: ad.targetPages,
      status: ad.status === "expired" ? "paused" : ad.status,
      startDate: ad.startDate ? ad.startDate.split("T")[0] : "",
      endDate: ad.endDate ? ad.endDate.split("T")[0] : "",
      priority: ad.priority,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.mediaUrl) {
      toast({ title: "Error", description: "Name and media URL are required", variant: "destructive" });
      return;
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
        toast({ title: "Success", description: editingAd ? "Advertisement updated" : "Advertisement created" });
        setDialogOpen(false);
        fetchAds();
        resetForm();
      } else {
        const error = await res.json();
        toast({ title: "Error", description: error.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to save advertisement", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this advertisement?")) return;
    
    try {
      const res = await fetch(`/api/admin/advertisements/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: "Success", description: "Advertisement deleted" });
        fetchAds();
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete advertisement", variant: "destructive" });
    }
  };

  const handleAdminApprove = async (ad: Advertisement) => {
    try {
      const res = await fetch(`/api/admin/advertisements/${ad.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...ad, approvalStatus: "approved", status: "active" }),
      });
      if (res.ok) {
        toast({ title: "Success", description: "Advertisement approved and activated" });
        fetchAds();
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to approve advertisement", variant: "destructive" });
    }
  };

  const togglePage = (page: string) => {
    setFormData(prev => ({
      ...prev,
      targetPages: prev.targetPages.includes(page)
        ? prev.targetPages.filter(p => p !== page)
        : [...prev.targetPages, page]
    }));
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
        setFormData(prev => ({ ...prev, mediaUrl: data.url }));
        
        // Auto-detect media type from file
        const isVideo = file.type.startsWith("video/");
        setFormData(prev => ({ ...prev, mediaType: isVideo ? "video" : "image" }));
        
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
        <Button onClick={openCreateDialog} data-testid="button-new-advertisement">
          <Plus className="mr-2 h-4 w-4" /> New Advertisement
        </Button>
      </div>

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
                  <TableRow key={ad.id}>
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
                    <TableCell>{getStatusBadge(ad.status)}</TableCell>
                    <TableCell>{getApprovalBadge(ad.approvalStatus)}</TableCell>
                    <TableCell className="text-right">{ad.impressions.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{ad.clicks.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{getCTR(ad.impressions, ad.clicks)}</TableCell>
                    <TableCell className="text-right">
                      {ad.approvalStatus !== "approved" && (
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
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(ad)} data-testid={`button-edit-ad-${ad.id}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(ad.id)} data-testid={`button-delete-ad-${ad.id}`}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAd ? "Edit Advertisement" : "Create Advertisement"}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
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
                  onChange={(e) => setFormData(prev => ({ ...prev, mediaUrl: e.target.value }))}
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
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Enter a URL or upload an image/video file. Recommended size: 728x90 for banners.</p>
            </div>

            {formData.mediaUrl && (
              <div className="space-y-4">
                <div className="border rounded-lg p-4 bg-muted/50">
                  <Label className="mb-2 block">Media Preview</Label>
                  {formData.mediaType === "image" ? (
                    <img src={formData.mediaUrl} alt="Preview" className="max-h-32 object-contain mx-auto" onError={(e) => (e.currentTarget.style.display = 'none')} />
                  ) : (
                    <video src={formData.mediaUrl} className="max-h-32 mx-auto" controls muted />
                  )}
                </div>

                <div className="border rounded-lg p-4 bg-slate-100">
                  <Label className="mb-3 block text-sm font-semibold">Website Preview - How ad appears on quote pages</Label>
                  <div className="bg-white rounded-lg shadow-sm border p-4 max-w-md mx-auto">
                    <div className="space-y-3">
                      <div className="h-3 bg-slate-200 rounded w-3/4"></div>
                      <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                      <div className="h-10 bg-orange-500 rounded flex items-center justify-center text-white text-xs font-medium">
                        Get My Quote Now
                      </div>
                      <div className="mt-4 rounded-lg overflow-hidden shadow-md cursor-pointer hover:shadow-lg transition-shadow" data-testid="website-preview-ad">
                        {formData.mediaType === "image" ? (
                          <img src={formData.mediaUrl} alt={formData.name || "Ad Preview"} className="w-full h-auto object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                        ) : (
                          <video src={formData.mediaUrl} className="w-full h-auto" muted />
                        )}
                      </div>
                      <p className="text-xs text-center text-muted-foreground">Sponsored</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

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

            <div className="space-y-2">
              <Label>Target Pages</Label>
              <div className="flex flex-wrap gap-2">
                {PAGE_OPTIONS.map(page => (
                  <Button
                    key={page.value}
                    type="button"
                    variant={formData.targetPages.includes(page.value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => togglePage(page.value)}
                    data-testid={`button-target-page-${page.value}`}
                  >
                    {page.label}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Select pages where this ad should appear. Leave empty for all pages.</p>
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
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input 
                  type="date"
                  value={formData.endDate} 
                  onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  data-testid="input-ad-end-date"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-ad">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} data-testid="button-save-ad">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingAd ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
