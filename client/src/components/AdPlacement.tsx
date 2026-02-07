import { useState, useEffect, useRef, useMemo, type MouseEvent } from "react";
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
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function AdPlacement({ page, className = "" }: AdPlacementProps) {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [popupAd, setPopupAd] = useState<Advertisement | null>(null);
  const [maxAds, setMaxAds] = useState(1);
  const trackedAdIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    fetchAdsPerSlotSetting();
  }, []);

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

  const fetchAdsPerSlotSetting = async () => {
    try {
      const res = await fetch("/api/settings/ads-per-slot");
      if (res.ok) {
        const data = await res.json();
        const value = data.value || 1;
        const clamped = isNaN(value) ? 1 : Math.max(1, Math.min(3, value));
        setMaxAds(clamped);
      }
    } catch (error) {
      console.error("Error fetching ads per slot setting:", error);
    }
  };

  const fetchActiveAds = async () => {
    try {
      const res = await fetch(`/api/advertisements/active?page=${encodeURIComponent(page)}&limit=${maxAds}`);
      if (res.ok) {
        const data = await res.json();
        if (maxAds === 1) {
          setAds(data ? [data] : []);
        } else {
          setAds(Array.isArray(data) ? data : data ? [data] : []);
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

  const handleAdClick = (e: MouseEvent, ad: Advertisement) => {
    e.preventDefault();
    e.stopPropagation();
    trackClick(ad.id);

    if (ad.openInPopup) {
      setPopupAd(ad);
    } else if (ad.linkUrl) {
      window.open(ad.linkUrl, "_blank", "noopener,noreferrer");
    }
  };

  const displayAds = useMemo(() => {
    if (ads.length <= 1) return ads;
    return shuffleArray(ads);
  }, [ads]);

  if (loading || ads.length === 0) {
    return null;
  }

  const adCount = displayAds.length;

  const getGridClass = () => {
    if (adCount === 1) return "";
    if (adCount === 2) return "grid grid-cols-2 gap-3";
    return "grid grid-cols-3 gap-3";
  };

  const renderAd = (ad: Advertisement, index: number) => (
    <div 
      key={ad.id}
      className="cursor-pointer overflow-hidden rounded-lg border border-border/50 shadow-md hover:shadow-lg transition-all hover:scale-[1.01] relative"
      onClick={(e) => handleAdClick(e, ad)}
      data-testid={`ad-placement-${page}-${index}`}
    >
      <div className="relative">
        {ad.mediaType === "image" ? (
          <img 
            src={ad.mediaUrl} 
            alt={ad.name}
            className="w-full h-auto block"
            style={{ 
              maxHeight: adCount === 1 ? '300px' : '200px', 
              objectFit: 'contain', 
              width: '100%', 
              backgroundColor: ad.backgroundColor || '#f8f9fa' 
            }}
            data-testid={`ad-image-${index}`}
          />
        ) : (
          <video 
            src={ad.mediaUrl}
            className="w-full h-auto block"
            style={{ 
              maxHeight: adCount === 1 ? '300px' : '200px', 
              objectFit: 'contain', 
              backgroundColor: ad.backgroundColor || '#000' 
            }}
            autoPlay
            muted
            loop
            playsInline
            data-testid={`ad-video-${index}`}
          />
        )}
        {ad.adText && (
          <div 
            className={`absolute left-0 right-0 p-2 text-center font-semibold ${
              adCount === 1 ? 'text-sm md:text-lg' : 'text-xs md:text-sm'
            } ${
              ad.textPosition === 'top' ? 'top-0' : 
              ad.textPosition === 'center' ? 'top-1/2 -translate-y-1/2' : 
              'bottom-0'
            }`}
            style={{ 
              color: ad.textColor || '#ffffff', 
              backgroundColor: `${ad.backgroundColor || '#1e3a5f'}dd`,
              textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
              whiteSpace: 'pre-line'
            }}
            data-testid={`ad-text-overlay-${index}`}
          >
            {ad.adText}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div 
        className={`ad-placement ${className}`}
        data-testid={`ad-placement-${page}`}
      >
        <div className={getGridClass()}>
          {displayAds.map((ad, index) => renderAd(ad, index))}
        </div>
        <p className="text-xs text-center text-muted-foreground mt-1">Sponsored</p>
      </div>

      {popupAd && popupAd.linkUrl && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          data-testid="ad-popup-overlay"
        >
          <div className="relative w-full max-w-4xl h-[80vh] bg-white rounded-lg overflow-hidden shadow-2xl">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
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
