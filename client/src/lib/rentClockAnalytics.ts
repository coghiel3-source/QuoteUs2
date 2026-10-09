import { trackEvent } from "./analytics";

type Event = "page_view" | "cta_click" | "calculator_used" | "share_success" | "share_fallback"
  | "embed_copy_success" | "embed_copy_fallback" | "province_changed" | "faq_open"
  | "application_arrived" | "application_started" | "application_submitted" | "application_failed";
type Dimensions = { placement?: string; province?: string; mode?: string; question_index?: number };

export function isRentClockReferral(): boolean {
  return typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("source") === "rent_clock";
}

/** No personal data, calculator amounts, query strings or persistent visitor IDs. */
export function trackRentClock(event: Event, dimensions: Dimensions = {}): void {
  if (typeof window === "undefined") return;
  const data: Record<string, string | number> = { campaign: "rent_clock", variant: "concise" };
  for (const key of ["placement", "province", "mode", "question_index"] as const) {
    const value = dimensions[key];
    if (typeof value === "number" && Number.isFinite(value)) data[key] = value;
    else if (typeof value === "string") data[key] = value.slice(0, 40);
  }
  trackEvent(`rent_clock_${event}`, data);
  // Optional bridge to an EXISTING host-owned GA4 tag. Never install a tracker here.
  try {
    const gtag = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;
    if (typeof gtag === "function") gtag("event", `rent_clock_${event}`, data);
  } catch { /* Measurement must not interrupt a conversion. */ }
}
