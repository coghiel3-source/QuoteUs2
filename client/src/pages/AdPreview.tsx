import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Check, X, ExternalLink, Loader2 } from "lucide-react";

interface Advertisement {
  id: string;
  name: string;
  mediaType: "image" | "video";
  mediaUrl: string;
  linkUrl: string | null;
  targetPages: string[];
  approvalStatus: string | null;
}

export default function AdPreviewPage() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const [ad, setAd] = useState<Advertisement | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetchAd();
  }, [token]);

  const fetchAd = async () => {
    try {
      const res = await fetch(`/api/advertisements/preview/${token}`);
      if (res.ok) {
        const data = await res.json();
        setAd(data);
        if (data.approvalStatus && data.approvalStatus !== "pending") {
          setSubmitted(true);
        }
      }
    } catch (error) {
      console.error("Error fetching ad:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (approved: boolean) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/advertisements/preview/${token}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved }),
      });
      
      if (res.ok) {
        setSubmitted(true);
        toast({
          title: approved ? "Advertisement Approved!" : "Advertisement Rejected",
          description: approved 
            ? "Thank you! Your advertisement has been approved and will go live shortly."
            : "The advertisement has been rejected and will not be published.",
        });
        fetchAd();
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to submit response", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!ad) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Advertisement Not Found</h2>
            <p className="text-muted-foreground">This preview link may have expired or is invalid.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="container mx-auto max-w-2xl">
        <Card className="shadow-lg">
          <CardHeader className="text-center border-b">
            <div className="flex items-center justify-center gap-2 mb-2">
              <img src="/quoteus-logo.png" alt="QuoteUs.ca" className="h-8" onError={(e) => (e.currentTarget.style.display = 'none')} />
              <span className="text-xl font-bold text-primary">QuoteUs.ca</span>
            </div>
            <CardTitle>Advertisement Preview</CardTitle>
            <CardDescription>Please review your advertisement below and approve or request changes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-2">
              <h3 className="font-semibold">Advertisement Name</h3>
              <p className="text-lg">{ad.name}</p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Preview</h3>
              <div className="border rounded-lg overflow-hidden bg-gray-100">
                {ad.mediaType === "image" ? (
                  <img 
                    src={ad.mediaUrl} 
                    alt={ad.name} 
                    className="w-full h-auto max-h-[400px] object-contain mx-auto"
                    data-testid="preview-image"
                  />
                ) : (
                  <video 
                    src={ad.mediaUrl} 
                    className="w-full h-auto max-h-[400px]"
                    controls
                    data-testid="preview-video"
                  />
                )}
              </div>
            </div>

            {ad.linkUrl && (
              <div className="space-y-2">
                <h3 className="font-semibold">Link Destination</h3>
                <a 
                  href={ad.linkUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  {ad.linkUrl} <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            )}

            <div className="space-y-2">
              <h3 className="font-semibold">Target Pages</h3>
              <div className="flex flex-wrap gap-2">
                {ad.targetPages.length === 0 || ad.targetPages.includes("all") ? (
                  <Badge variant="outline">All Quote Pages</Badge>
                ) : (
                  ad.targetPages.map(page => (
                    <Badge key={page} variant="outline">{page}</Badge>
                  ))
                )}
              </div>
            </div>

            {submitted ? (
              <div className="pt-4 border-t">
                <div className={`text-center p-4 rounded-lg ${ad.approvalStatus === "approved" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
                  <p className="font-semibold">
                    {ad.approvalStatus === "approved" 
                      ? "✓ This advertisement has been approved" 
                      : "✗ This advertisement has been rejected"}
                  </p>
                  <p className="text-sm mt-1">
                    {ad.approvalStatus === "approved"
                      ? "Your ad will go live shortly on the selected pages."
                      : "Please contact us to discuss changes."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="pt-4 border-t">
                <p className="text-center text-muted-foreground mb-4">
                  Does this advertisement look correct? Click approve to publish it on QuoteUs.ca
                </p>
                <div className="flex gap-4 justify-center">
                  <Button
                    variant="outline"
                    onClick={() => handleApproval(false)}
                    disabled={submitting}
                    className="min-w-[120px]"
                    data-testid="button-reject-ad"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4 mr-2" />}
                    Request Changes
                  </Button>
                  <Button
                    onClick={() => handleApproval(true)}
                    disabled={submitting}
                    className="min-w-[120px] bg-green-600 hover:bg-green-700"
                    data-testid="button-approve-ad"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                    Approve Ad
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          If you have any questions, please contact us at info@quoteus.ca
        </p>
      </div>
    </div>
  );
}
