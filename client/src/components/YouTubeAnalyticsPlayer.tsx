import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics";

const YOUTUBE_IFRAME_API_URL = "https://www.youtube.com/iframe_api";
const YOUTUBE_API_TIMEOUT_MS = 10000;

interface YouTubeStateChangeEvent {
  data: number;
}

interface YouTubePlayer {
  destroy: () => void;
}

interface YouTubeApi {
  Player: new (
    element: HTMLIFrameElement,
    options: {
      events: {
        onStateChange: (event: YouTubeStateChangeEvent) => void;
      };
    },
  ) => YouTubePlayer;
  PlayerState?: {
    PLAYING?: number;
    ENDED?: number;
  };
}

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApiPromise: Promise<YouTubeApi | null> | null = null;

function findYouTubeApiScript() {
  return Array.from(document.scripts).find((script) => {
    const source = script.getAttribute("src") || "";
    return source === YOUTUBE_IFRAME_API_URL || source.startsWith(`${YOUTUBE_IFRAME_API_URL}?`);
  });
}

function loadYouTubeIframeApi(): Promise<YouTubeApi | null> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.resolve(null);
  }

  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  if (youtubeApiPromise) {
    return youtubeApiPromise;
  }

  youtubeApiPromise = new Promise<YouTubeApi | null>((resolve) => {
    const script = findYouTubeApiScript() || document.createElement("script");
    const previousReadyCallback = window.onYouTubeIframeAPIReady;
    let settled = false;
    let timeoutId: number | undefined;

    const cleanup = () => {
      script.removeEventListener("error", handleScriptError);
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
      if (window.onYouTubeIframeAPIReady === handleApiReady) {
        window.onYouTubeIframeAPIReady = previousReadyCallback;
      }
    };

    const settle = (api: YouTubeApi | null) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(api);
    };

    const handleApiReady = () => {
      // Preserve another consumer's callback if one was registered before ours.
      try {
        previousReadyCallback?.();
      } catch {
        // A separate callback must not prevent player initialization.
      } finally {
        settle(window.YT?.Player ? window.YT : null);
      }
    };

    const handleScriptError = () => settle(null);

    script.addEventListener("error", handleScriptError, { once: true });
    window.onYouTubeIframeAPIReady = handleApiReady;

    if (window.YT?.Player) {
      settle(window.YT);
      return;
    }

    timeoutId = window.setTimeout(() => settle(null), YOUTUBE_API_TIMEOUT_MS);

    if (!script.getAttribute("src")) {
      script.src = YOUTUBE_IFRAME_API_URL;
      script.async = true;
      document.head?.appendChild(script);
    } else if (!script.parentNode) {
      document.head?.appendChild(script);
    }
  });

  return youtubeApiPromise;
}

function addEnableJsApiParameter(src: string): string {
  if (/[?&]enablejsapi=/.test(src)) return src;
  return `${src}${src.includes("?") ? "&" : "?"}enablejsapi=1`;
}

interface YouTubeAnalyticsPlayerProps {
  videoId: string;
  insuranceType: string;
  title: string;
  className: string;
  /**
   * Keep a page's existing embed query parameters when they differ from the
   * defaults used for newly added marketing videos.
   */
  src?: string;
}

export default function YouTubeAnalyticsPlayer({
  videoId,
  insuranceType,
  title,
  className,
  src,
}: YouTubeAnalyticsPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const startedRef = useRef(false);
  const completedRef = useRef(false);

  useEffect(() => {
    let active = true;
    let player: YouTubePlayer | null = null;
    startedRef.current = false;
    completedRef.current = false;

    loadYouTubeIframeApi()
      .then((api) => {
        if (!active || !api || !iframeRef.current) return;

        const playingState = api.PlayerState?.PLAYING ?? 1;
        const endedState = api.PlayerState?.ENDED ?? 0;

        try {
          player = new api.Player(iframeRef.current, {
            events: {
              onStateChange: ({ data }) => {
                if (!active) return;

                if (data === playingState && !startedRef.current) {
                  startedRef.current = true;
                  trackEvent("video_started", {
                    insurance_type: insuranceType,
                    video_id: videoId,
                  });
                }

                if (data === endedState && !completedRef.current) {
                  completedRef.current = true;
                  trackEvent("video_completed", {
                    insurance_type: insuranceType,
                    video_id: videoId,
                  });
                }
              },
            },
          });
        } catch {
          // A failed API upgrade must not prevent the regular iframe from working.
        }
      })
      .catch(() => {
        // The iframe remains usable when the API script cannot be loaded.
      });

    return () => {
      active = false;
      if (!player) return;

      try {
        player.destroy();
      } catch {
        // Player cleanup should never affect the surrounding quote form.
      }
    };
  }, [insuranceType, videoId]);

  const iframeSrc = addEnableJsApiParameter(
    src || `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?rel=0&modestbranding=1`,
  ) + (typeof window === "undefined" ? "" : `&origin=${encodeURIComponent(window.location.origin)}`);

  return (
    <iframe
      ref={iframeRef}
      className={className}
      src={iframeSrc}
      title={title}
      loading="lazy"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      referrerPolicy="strict-origin-when-cross-origin"
      allowFullScreen
    />
  );
}