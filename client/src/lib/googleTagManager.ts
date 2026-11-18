import { insuranceRoutes } from "./analytics";

/** Derive the only event parameter from the public route, never form data. */
export function trackQuoteFunnel(event: "quote_started" | "quote_submitted", path: string): boolean {
  if (!Object.hasOwn(insuranceRoutes, path)) return false;
  return trackTagManager(event, { insurance_type: insuranceRoutes[path] });
}

/** Queue events even before GTM finishes loading; analytics must never break forms. */
export function trackTagManager(event: string, properties: Record<string, string | number> = {}): boolean {
  if (typeof window === "undefined") return false;
  try {
    const target = window as Window & { dataLayer?: Record<string, string | number>[] };
    target.dataLayer = target.dataLayer || [];
    target.dataLayer.push({ ...properties, event });
    return true;
  } catch {
    return false;
  }
}
