import { useState, useEffect } from "react";
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
import { Plus, Pencil, Trash2, Image, Video, ExternalLink, Eye, MousePointer, Calendar, Loader2 } from "lucide-react";

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

  const togglePage = (page: string) => {
    setFormData(prev => ({
      ...prev,
      targetPages: prev.targetPages.includes(page)
        ? prev.targetPages.filter(p => p !== page)
        : [...prev.targetPages, page]
    }));
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
                <TableHead>Schedule</TableHead>
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
                    <TableCell className="text-sm text-muted-foreground">
                      {ad.startDate || ad.endDate ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {ad.startDate?.split("T")[0]} - {ad.endDate?.split("T")[0] || "∞"}
                        </div>
                      ) : "Always"}
                    </TableCell>
                    <TableCell className="text-right">{ad.impressions.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{ad.clicks.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{getCTR(ad.impressions, ad.clicks)}</TableCell>
                    <TableCell className="text-right">
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
              <Label>Media URL *</Label>
              <Input 
                value={formData.mediaUrl} 
                onChange={(e) => setFormData(prev => ({ ...prev, mediaUrl: e.target.value }))}
                placeholder="https://example.com/ad-image.jpg"
                data-testid="input-ad-media-url"
              />
              <p className="text-xs text-muted-foreground">Enter the URL of the image or video. Recommended size: 728x90 for banners.</p>
            </div>

            {formData.mediaUrl && (
              <div className="border rounded-lg p-4 bg-muted/50">
                <Label className="mb-2 block">Preview</Label>
                {formData.mediaType === "image" ? (
                  <img src={formData.mediaUrl} alt="Preview" className="max-h-32 object-contain mx-auto" onError={(e) => (e.currentTarget.style.display = 'none')} />
                ) : (
                  <video src={formData.mediaUrl} className="max-h-32 mx-auto" controls muted />
                )}
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
