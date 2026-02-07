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
  topText: string | null;
  centerText: string | null;
  bottomText: string | null;
  topTextColor: string | null;
  centerTextColor: string | null;
  bottomTextColor: string | null;
  topBgColor: string | null;
  centerBgColor: string | null;
  bottomBgColor: string | null;
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
  const trackedAdIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    trackedAdIds.current = new Set();
    setAds([]);
    setLoading(true);
    fetchActiveAds();
  }, [page]);

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
      const res = await fetch(`/api/advertisements/active?page=${encodeURIComponent(page)}`);
      if (res.ok) {
        const data = await res.json();
        setAds(Array.isArray(data) ? data : []);
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
  const hasTopText = (ad: Advertisement) => ad.topText;
  const hasCenterText = (ad: Advertisement) => ad.centerText;
  const hasBottomText = (ad: Advertisement) => ad.bottomText;
  const hasLegacyText = (ad: Advertisement) => ad.adText && !ad.topText && !ad.centerText && !ad.bottomText;

  const getGridClass = () => {
    if (adCount === 1) return "";
    if (adCount === 2) return "grid grid-cols-2 gap-4";
    return "grid grid-cols-3 gap-4";
  };

  const textSizeClass = adCount === 1 ? 'text-sm md:text-base' : 'text-xs md:text-sm';

  const renderAd = (ad: Advertisement, index: number) => (
    <div 
      key={ad.id}
      className="cursor-pointer overflow-hidden rounded-lg shadow-md hover:shadow-lg transition-all hover:scale-[1.01] relative"
      onClick={(e) => handleAdClick(e, ad)}
      data-testid={`ad-placement-${page}-${index}`}
    >
      <div className="relative" style={{ minHeight: adCount === 1 ? '200px' : '180px' }}>
        {ad.mediaType === "image" ? (
          <img 
            src={ad.mediaUrl} 
            alt={ad.name}
            className="w-full h-full block"
            style={{ 
              height: adCount === 1 ? '300px' : '250px',
              objectFit: 'cover', 
              width: '100%',
            }}
            data-testid={`ad-image-${index}`}
          />
        ) : (
          <video 
            src={ad.mediaUrl}
            className="w-full h-full block"
            style={{ 
              height: adCount === 1 ? '300px' : '250px',
              objectFit: 'cover',
            }}
            autoPlay
            muted
            loop
            playsInline
            data-testid={`ad-video-${index}`}
          />
        )}
        {hasTopText(ad) && (
          <div 
            className={`absolute left-0 right-0 top-0 p-2 text-center font-bold ${textSizeClass}`}
            style={{ 
              color: ad.topTextColor || '#ffffff', 
              backgroundColor: `${ad.topBgColor || '#1e3a5f'}dd`,
              textShadow: '1px 1px 3px rgba(0,0,0,0.7)',
              whiteSpace: 'pre-line'
            }}
            data-testid={`ad-top-text-${index}`}
          >
            {ad.topText}
          </div>
        )}
        {hasCenterText(ad) && (
          <div 
            className={`absolute left-0 right-0 top-1/2 -translate-y-1/2 p-2 text-center font-semibold italic ${textSizeClass}`}
            style={{ 
              color: ad.centerTextColor || '#ffffff', 
              backgroundColor: `${ad.centerBgColor || '#1e3a5f'}99`,
              textShadow: '1px 1px 3px rgba(0,0,0,0.7)',
              whiteSpace: 'pre-line'
            }}
            data-testid={`ad-center-text-${index}`}
          >
            {ad.centerText}
          </div>
        )}
        {hasBottomText(ad) && (
          <div 
            className={`absolute left-0 right-0 bottom-0 p-2 text-center font-bold ${textSizeClass}`}
            style={{ 
              color: ad.bottomTextColor || '#ffffff', 
              backgroundColor: `${ad.bottomBgColor || '#1e3a5f'}dd`,
              textShadow: '1px 1px 3px rgba(0,0,0,0.7)',
              whiteSpace: 'pre-line'
            }}
            data-testid={`ad-bottom-text-${index}`}
          >
            {ad.bottomText}
          </div>
        )}
        {hasLegacyText(ad) && (
          <div 
            className={`absolute left-0 right-0 p-2 text-center font-semibold ${textSizeClass} ${
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
