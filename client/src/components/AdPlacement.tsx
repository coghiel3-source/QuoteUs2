import { useState, useEffect, useRef, useMemo, useCallback, type MouseEvent } from "react";
import { X, RefreshCw, ImageOff } from "lucide-react";

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
  /** slot label shown above ads — defaults to "Sponsored" */
  slotLabel?: string;
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

const RETRY_DELAYS = [1000, 2500, 5000];

/**
 * Fetches active ads with automatic retry on failure.
 * Returns the array of ads, or throws after all retries are exhausted.
 */
async function fetchAdsWithRetry(page: string, signal: AbortSignal): Promise<Advertisement[]> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    try {
      const res = await fetch(`/api/advertisements/active?page=${encodeURIComponent(page)}`, { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (err: unknown) {
      if ((err as { name?: string }).name === "AbortError") throw err;
      lastError = err;
      if (attempt < RETRY_DELAYS.length) {
        await new Promise<void>((resolve) => setTimeout(resolve, RETRY_DELAYS[attempt]));
      }
    }
  }
  throw lastError;
}

/** Single ad tile — handles its own image/video load error */
function AdTile({
  ad,
  index,
  adCount,
  page,
  onAdClick,
}: {
  ad: Advertisement;
  index: number;
  adCount: number;
  page: string;
  onAdClick: (e: MouseEvent, ad: Advertisement) => void;
}) {
  const [mediaError, setMediaError] = useState(false);
  const maxH = adCount === 1 ? "400px" : "240px";
  const textSize = adCount === 1 ? "text-sm md:text-base" : "text-xs md:text-sm";

  return (
    <div
      key={ad.id}
      className="cursor-pointer overflow-hidden rounded-lg shadow-md hover:shadow-lg transition-all hover:scale-[1.01] relative bg-gray-100"
      onClick={(e) => onAdClick(e, ad)}
      data-testid={`ad-placement-${page}-${index}`}
    >
      <div className="relative">
        {mediaError ? (
          /* Graceful fallback when media can't load */
          <div
            className="flex flex-col items-center justify-center gap-2 text-muted-foreground"
            style={{ height: "120px", backgroundColor: "#f3f4f6" }}
          >
            <ImageOff className="h-8 w-8 opacity-40" />
            <span className="text-xs opacity-60">{ad.name}</span>
          </div>
        ) : ad.mediaType === "image" ? (
          <img
            src={ad.mediaUrl}
            alt={ad.name}
            className="w-full block"
            style={{ objectFit: "contain", width: "100%", maxHeight: maxH }}
            onError={() => setMediaError(true)}
            data-testid={`ad-image-${index}`}
          />
        ) : (
          <video
            src={ad.mediaUrl}
            className="w-full block"
            style={{ maxHeight: maxH, objectFit: "contain" }}
            autoPlay
            muted
            loop
            playsInline
            onError={() => setMediaError(true)}
            data-testid={`ad-video-${index}`}
          />
        )}

        {/* Text overlays — only when media loaded */}
        {!mediaError && ad.topText && (
          <div
            className={`absolute left-0 right-0 top-0 p-2 text-center font-bold ${textSize}`}
            style={{
              color: ad.topTextColor || "#ffffff",
              backgroundColor: `${ad.topBgColor || "#1e3a5f"}dd`,
              textShadow: "1px 1px 3px rgba(0,0,0,0.7)",
              whiteSpace: "pre-line",
            }}
            data-testid={`ad-top-text-${index}`}
          >
            {ad.topText}
          </div>
        )}
        {!mediaError && ad.centerText && (
          <div
            className={`absolute left-0 right-0 top-1/2 -translate-y-1/2 p-2 text-center font-semibold italic ${textSize}`}
            style={{
              color: ad.centerTextColor || "#ffffff",
              backgroundColor: `${ad.centerBgColor || "#1e3a5f"}99`,
              textShadow: "1px 1px 3px rgba(0,0,0,0.7)",
              whiteSpace: "pre-line",
            }}
            data-testid={`ad-center-text-${index}`}
          >
            {ad.centerText}
          </div>
        )}
        {!mediaError && ad.bottomText && (
          <div
            className={`absolute left-0 right-0 bottom-0 p-2 text-center font-bold ${textSize}`}
            style={{
              color: ad.bottomTextColor || "#ffffff",
              backgroundColor: `${ad.bottomBgColor || "#1e3a5f"}dd`,
              textShadow: "1px 1px 3px rgba(0,0,0,0.7)",
              whiteSpace: "pre-line",
            }}
            data-testid={`ad-bottom-text-${index}`}
          >
            {ad.bottomText}
          </div>
        )}
        {/* Legacy single-text overlay */}
        {!mediaError && ad.adText && !ad.topText && !ad.centerText && !ad.bottomText && (
          <div
            className={`absolute left-0 right-0 p-2 text-center font-semibold ${textSize} ${
              ad.textPosition === "top"
                ? "top-0"
                : ad.textPosition === "center"
                ? "top-1/2 -translate-y-1/2"
                : "bottom-0"
            }`}
            style={{
              color: ad.textColor || "#ffffff",
              backgroundColor: `${ad.backgroundColor || "#1e3a5f"}dd`,
              textShadow: "1px 1px 2px rgba(0,0,0,0.5)",
              whiteSpace: "pre-line",
            }}
            data-testid={`ad-text-overlay-${index}`}
          >
            {ad.adText}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdPlacement({ page, className = "", slotLabel = "Sponsored" }: AdPlacementProps) {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const [popupAd, setPopupAd] = useState<Advertisement | null>(null);
  const trackedAdIds = useRef<Set<string>>(new Set());
  const abortRef = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasFetched = useRef(false);

  const loadAds = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("loading");
    setAds([]);
    trackedAdIds.current = new Set();

    try {
      const data = await fetchAdsWithRetry(page, controller.signal);
      if (controller.signal.aborted) return;
      setAds(data);
      setStatus(data.length > 0 ? "ready" : "empty");
    } catch (err: unknown) {
      if ((err as { name?: string }).name === "AbortError") return;
      setStatus("error");
    }
  }, [page]);

  /* Lazy: only fetch when the container is scrolled into view */
  useEffect(() => {
    hasFetched.current = false;
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasFetched.current) {
          hasFetched.current = true;
          loadAds();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      abortRef.current?.abort();
    };
  }, [loadAds]);

  /* Track impressions */
  useEffect(() => {
    ads.forEach((ad) => {
      if (!trackedAdIds.current.has(ad.id)) {
        trackedAdIds.current.add(ad.id);
        fetch(`/api/advertisements/${ad.id}/impression`, { method: "POST" }).catch(() => {});
      }
    });
  }, [ads]);

  const handleAdClick = useCallback((e: MouseEvent, ad: Advertisement) => {
    e.preventDefault();
    e.stopPropagation();
    fetch(`/api/advertisements/${ad.id}/click`, { method: "POST" }).catch(() => {});
    if (ad.openInPopup) {
      setPopupAd(ad);
    } else if (ad.linkUrl) {
      window.open(ad.linkUrl, "_blank", "noopener,noreferrer");
    }
  }, []);

  const displayAds = useMemo(() => {
    if (ads.length <= 1) return ads;
    return shuffleArray(ads);
  }, [ads]);

  const getGridClass = () => {
    const n = displayAds.length;
    if (n === 1) return "";
    if (n === 2) return "grid grid-cols-2 gap-4";
    return "grid grid-cols-3 gap-4";
  };

  return (
    <>
      {/* Container is always rendered so IntersectionObserver can mount */}
      <div
        ref={containerRef}
        className={`ad-placement ${className}`}
        data-testid={`ad-placement-${page}`}
      >
        {status === "loading" && (
          /* Skeleton placeholder — preserves space while loading */
          <div className="rounded-lg overflow-hidden animate-pulse" data-testid={`ad-skeleton-${page}`}>
            <div className="bg-gray-200 w-full" style={{ height: "160px" }} />
            <p className="text-xs text-center text-muted-foreground mt-1">{slotLabel}</p>
          </div>
        )}

        {status === "error" && (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-2 py-4" data-testid={`ad-error-${page}`}>
            <p className="text-xs text-muted-foreground">Ad unavailable</p>
            <button
              onClick={loadAds}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" /> Retry
            </button>
          </div>
        )}

        {status === "ready" && displayAds.length > 0 && (
          <>
            <div className={getGridClass()}>
              {displayAds.map((ad, index) => (
                <AdTile
                  key={ad.id}
                  ad={ad}
                  index={index}
                  adCount={displayAds.length}
                  page={page}
                  onAdClick={handleAdClick}
                />
              ))}
            </div>
            <p className="text-xs text-center text-muted-foreground mt-1">{slotLabel}</p>
          </>
        )}
      </div>

      {/* Popup overlay */}
      {popupAd && popupAd.linkUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          data-testid="ad-popup-overlay"
        >
          <div className="relative w-full max-w-4xl h-[80vh] bg-white rounded-lg overflow-hidden shadow-2xl">
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPopupAd(null); }}
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
