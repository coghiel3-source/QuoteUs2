const leadPages = new Set([
  "/auto", "/home-insurance", "/tenant", "/travel", "/life",
  "/business", "/pet", "/mortgage", "/rent-guarantee", "/contact",
]);
const recorded = new Set<string>();

/** Call only after the lead API succeeds. Never send contact details to Google. */
export function trackGoogleAdsLead(id: unknown): void {
  if (typeof window === "undefined" || !leadPages.has(window.location.pathname)) return;
  if (typeof id !== "string" || !id || recorded.has(id)) return;
  const gtag = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof gtag !== "function") return;
  try {
    gtag("event", "conversion", {
      send_to: "AW-18512103274/Sh5ZCPDtlZwdEOqOoftE",
      transaction_id: id,
    });
    recorded.add(id);
  } catch {
    // Blocked analytics must not interrupt a successfully saved enquiry.
  }
}
