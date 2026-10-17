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
