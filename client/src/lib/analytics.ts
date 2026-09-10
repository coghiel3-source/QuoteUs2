type AnalyticsData = Record<string, string | number | boolean>;

declare global {
  interface Window {
    umami?: {
      track(name: string, data?: AnalyticsData): void | Promise<unknown>;
    };
  }
}

// Replit supplies the tracker on published sites with analytics enabled.
// Never allow missing/blocked analytics to interrupt a visitor's task.
export function trackEvent(name: string, data?: AnalyticsData): void {
  if (typeof window === "undefined") return;
  try {
    const result = window.umami?.track(name, data);
    if (result) void Promise.resolve(result).catch(() => {});
  } catch {
    // Analytics is optional.
  }
}

export const insuranceRoutes: Record<string, string> = {
  "/auto": "Auto",
  "/home-insurance": "Home",
  "/tenant": "Tenant",
  "/travel": "Travel",
  "/life": "Life",
  "/business": "Business",
  "/pet": "Pet",
  "/mortgage": "Mortgage",
  "/rent-guarantee": "Rent Guarantee",
};