import { trackTagManager } from "./googleTagManager";

const leadPages = new Set([
  "/auto", "/home-insurance", "/tenant", "/travel", "/life",
  "/business", "/pet", "/mortgage", "/rent-guarantee", "/contact",
]);
const recorded = new Set<string>();

/** Call only after the lead API succeeds. Never send contact details to Google. */
export function trackGoogleAdsLead(id: unknown): void {
  if (typeof window === "undefined" || !leadPages.has(window.location.pathname)) return;
  if (typeof id !== "string" || !id || recorded.has(id)) return;
  if (trackTagManager("generate_lead", { transaction_id: id })) {
    recorded.add(id);
  }
}
