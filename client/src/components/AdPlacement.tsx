import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";

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
}

interface AdPlacementProps {
  page: string;
  className?: string;
}

export default function AdPlacement({ page, className = "" }: AdPlacementProps) {
  const [ad, setAd] = useState<Advertisement | null>(null);
  const [loading, setLoading] = useState(true);
  const [popupOpen, setPopupOpen] = useState(false);
  const lastTrackedAdId = useRef<string | null>(null);

  useEffect(() => {
    lastTrackedAdId.current = null;
    setAd(null);
    setLoading(true);
    fetchActiveAd();
  }, [page]);

  useEffect(() => {
    if (ad && ad.id !== lastTrackedAdId.current) {
      trackImpression(ad.id);
      lastTrackedAdId.current = ad.id;
    }
  }, [ad]);

  const fetchActiveAd = async () => {
    try {
      const res = await fetch(`/api/advertisements/active?page=${encodeURIComponent(page)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.id) {
          setAd(data);
        } else {
          setAd(null);
        }
      }
    } catch (error) {
      console.error("Error fetching ad:", error);
    } finally {
      setLoading(false);
    }
  };

  const trackImpression = async (adId: string) => {
    try {
      await fetch(`/api/advertisements/${adId}/impression`, { method: "POST" });
    } catch (error) {
      console.error("Error tracking impression:", error);
    }
  };

  const trackClick = async (adId: string) => {
    try {
      await fetch(`/api/advertisements/${adId}/click`, { method: "POST" });
    } catch (error) {
      console.error("Error tracking click:", error);
    }
  };

  const handleAdClick = () => {
    if (!ad) return;
    
    trackClick(ad.id);

    if (ad.openInPopup) {
      setPopupOpen(true);
    } else if (ad.linkUrl) {
      window.open(ad.linkUrl, "_blank", "noopener,noreferrer");
    }
  };

  if (loading || !ad) {
    return null;
  }

  return (
    <>
      <div 
        className={`ad-placement cursor-pointer overflow-hidden rounded-lg shadow-md hover:shadow-lg transition-shadow ${className}`}
        onClick={handleAdClick}
        data-testid={`ad-placement-${page}`}
      >
        {ad.mediaType === "image" ? (
          <img 
            src={ad.mediaUrl} 
            alt={ad.name}
            className="w-full h-auto object-cover"
            data-testid="ad-image"
          />
        ) : (
          <video 
            src={ad.mediaUrl}
            className="w-full h-auto"
            autoPlay
            muted
            loop
            playsInline
            data-testid="ad-video"
          />
        )}
      </div>

      {popupOpen && ad.linkUrl && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          data-testid="ad-popup-overlay"
        >
          <div className="relative w-full max-w-4xl h-[80vh] bg-white rounded-lg overflow-hidden shadow-2xl">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPopupOpen(false);
              }}
              className="absolute top-3 right-3 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors"
              data-testid="ad-popup-close"
            >
              <X className="h-5 w-5" />
            </button>
            <iframe
              src={ad.linkUrl}
              className="w-full h-full border-0"
              title={ad.name}
              data-testid="ad-popup-iframe"
            />
          </div>
        </div>
      )}
    </>
  );
}
