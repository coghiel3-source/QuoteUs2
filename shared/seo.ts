export const SEO_ORIGIN = "https://quoteus.ca";
export const SEO_IMAGE = `${SEO_ORIGIN}/opengraph.jpg`;

// Only routes with actual public pages belong here (and in the sitemap).
export const publicPages: Record<string, { title: string; description: string }> = {
  "/rent-clock": { title: "The Rent Clock | QuoteUs.ca Rent Guarantee", description: "Explore an illustrative tribunal comparison for Canadian landlords. Calculate potential unpaid rent and review QuoteUs.ca Rent Guarantee options." },
  "/": { title: "Insurance Quotes in Ontario & Rent Guarantee | QuoteUs.ca", description: "Explore auto, home, tenant and business insurance quotes, plus rent guarantee options for landlords. Tell QuoteUs.ca what you need to get started." },
  "/auto": { title: "Auto Insurance Quotes in Ontario | QuoteUs.ca", description: "Looking for auto insurance in Ontario? Share your vehicle and driving details to explore coverage options through QuoteUs.ca. Request a quote online." },
  "/home-insurance": { title: "Home Insurance Quote | QuoteUs.ca", description: "Protect your Ontario home. Request home insurance coverage for your most valuable asset." },
  "/tenant": { title: "Tenant Insurance Quote | QuoteUs.ca", description: "Explore protection for personal belongings and liability coverage for renters across Canada." },
  "/travel": { title: "Travel Insurance Quote | QuoteUs.ca", description: "Request emergency medical and trip cancellation coverage for peace of mind while you travel." },
  "/life": { title: "Life Insurance Quote | QuoteUs.ca", description: "Secure your family's financial future with term or permanent life insurance coverage." },
  "/business": { title: "Business Insurance Quote | QuoteUs.ca", description: "Protect your Ontario business with liability, property and commercial auto coverage." },
  "/pet": { title: "Pet Insurance Quote | QuoteUs.ca", description: "Explore pet insurance to cover unexpected vet bills for your furry family members." },
  "/mortgage": { title: "Mortgage Quote | QuoteUs.ca", description: "Find mortgage rates in Ontario for buying, refinancing or renewing. Connect with lenders through QuoteUs.ca." },
  "/compare": { title: "Vehicle Comparison Tool | QuoteUs.ca", description: "See how different vehicles compare for insurance costs, safety and risk factors." },
  "/about": { title: "About QuoteUs.ca | Insurance Made Simple", description: "Learn about QuoteUs.ca and our approach to making insurance simpler for Canadians." },
  "/contact": { title: "Contact Us | QuoteUs.ca", description: "Have questions? Reach out to the QuoteUs.ca team for support or inquiries." },
  "/rent-guarantee": { title: "Rent Guarantee for Canadian Landlords | QuoteUs.ca", description: "Worried about unpaid rent? Explore rent guarantee for eligible tenancies and request an eligibility review. Terms apply. Not available in Quebec." },
  "/rent-guarantee-guide": { title: "Landlord Guide to Rent Guarantee & Unpaid Rent | QuoteUs.ca", description: "Understand rent guarantee, tenant insurance differences, existing-tenancy eligibility and what to prepare before applying. Read the QuoteUs.ca landlord guide." },
  "/privacy": { title: "Privacy Policy | QuoteUs.ca", description: "Read how QuoteUs.ca collects, uses and protects personal information." },
  "/terms": { title: "Terms of Service | QuoteUs.ca", description: "Read the terms governing use of the QuoteUs.ca platform and services." },
};

const privatePaths = new Set([
  "/dashboard", "/admin", "/broker/credits", "/login", "/rep",
  "/rg-payment/success", "/customer-portal", "/customer-portal/success",
]);
const tokenPaths = /^\/(?:doc-upload|sign|doc-sign|service-sign|invoice-sign|ad-preview)\/[^/]+$/;

export function classifyPage(path: string): "public" | "private" | "missing" {
  if (Object.prototype.hasOwnProperty.call(publicPages, path)) return "public";
  if (privatePaths.has(path) || tokenPaths.test(path)) return "private";
  return "missing";
}

export function canonicalUrl(path: string): string {
  return `${SEO_ORIGIN}${path}`;
}