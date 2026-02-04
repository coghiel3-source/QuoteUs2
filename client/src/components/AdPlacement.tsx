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
  adText: string | null;
  textColor: string | null;
  backgroundColor: string | null;
  textPosition: string | null;
}

interface AdPlacementProps {
  page: string;
  className?: string;
  maxAds?: number;
}

export default function AdPlacement({ page, className = "", maxAds = 1 }: AdPlacementProps) {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [popupAd, setPopupAd] = useState<Advertisement | null>(null);
  const trackedAdIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    trackedAdIds.current = new Set();
    setAds([]);
    setLoading(true);
    fetchActiveAds();
  }, [page, maxAds]);

  useEffect(() => {
    ads.forEach(ad => {
      if (!trackedAdIds.current.has(ad.id)) {
        trackImpression(ad.id);
        trackedAdIds.current.add(ad.id);
      }
    });
  }, [ads]);

  const fetchActiveAds = async () => {
    try {
      const res = await fetch(`/api/advertisements/active?page=${encodeURIComponent(page)}&limit=${maxAds}`);
      if (res.ok) {
        const data = await res.json();
        if (maxAds === 1) {
          setAds(data ? [data] : []);
        } else {
          setAds(Array.isArray(data) ? data : []);
        }
      }
    } catch (error) {
      console.error("Error fetching ads:", error);
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

  const handleAdClick = (ad: Advertisement) => {
    trackClick(ad.id);

    if (ad.openInPopup) {
      setPopupAd(ad);
    } else if (ad.linkUrl) {
      window.open(ad.linkUrl, "_blank", "noopener,noreferrer");
    }
  };

  if (loading || ads.length === 0) {
    return null;
  }

  const renderAd = (ad: Advertisement, index: number) => (
    <div 
      key={ad.id}
      className="cursor-pointer overflow-hidden rounded-lg shadow-md hover:shadow-lg transition-shadow relative flex-1"
      onClick={() => handleAdClick(ad)}
      style={{ backgroundColor: ad.backgroundColor || undefined }}
      data-testid={`ad-placement-${page}-${index}`}
    >
      {ad.mediaType === "image" ? (
        <img 
          src={ad.mediaUrl} 
          alt={ad.name}
          className="w-full h-auto object-cover"
          data-testid={`ad-image-${index}`}
        />
      ) : (
        <video 
          src={ad.mediaUrl}
          className="w-full h-auto"
          autoPlay
          muted
          loop
          playsInline
          data-testid={`ad-video-${index}`}
        />
      )}
      {ad.adText && (
        <div 
          className={`absolute left-0 right-0 p-2 text-center font-semibold text-sm md:text-lg ${
            ad.textPosition === 'top' ? 'top-0' : 
            ad.textPosition === 'center' ? 'top-1/2 -translate-y-1/2' : 
            'bottom-0'
          }`}
          style={{ 
            color: ad.textColor || '#ffffff', 
            backgroundColor: `${ad.backgroundColor || '#1e3a5f'}dd`,
            textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
          }}
          data-testid={`ad-text-overlay-${index}`}
        >
          {ad.adText}
        </div>
      )}
    </div>
  );

  return (
    <>
      <div 
        className={`ad-placement ${ads.length > 1 ? 'flex gap-2' : ''} ${className}`}
        data-testid={`ad-placement-${page}`}
      >
        {ads.map((ad, index) => renderAd(ad, index))}
      </div>

      {popupAd && popupAd.linkUrl && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          data-testid="ad-popup-overlay"
        >
          <div className="relative w-full max-w-4xl h-[80vh] bg-white rounded-lg overflow-hidden shadow-2xl">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPopupAd(null);
              }}
              className="absolute top-3 right-3 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors"
              data-testid="ad-popup-close"
            >
              <X className="h-5 w-5" />
            </button>
            <iframe
              src={popupAd.linkUrl}
              className="w-full h-full border-0"
              title={popupAd.name}
              data-testid="ad-popup-iframe"
            />
          </div>
        </div>
      )}
    </>
  );
}
