import { useEffect } from "react";
import { useLocation } from "wouter";
import { canonicalUrl, classifyPage, publicPages, SEO_IMAGE, SEO_ORIGIN } from "@shared/seo";

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

/** One route-driven metadata owner handles all client-side navigations. */
export function SeoNavigation() {
  const [location] = useLocation();
  useEffect(() => {
    const kind = classifyPage(location);
    const page = kind === "public" ? publicPages[location] : undefined;
    const title = page?.title ?? (kind === "private" ? "QuoteUs.ca | Account" : "Page Not Found | QuoteUs.ca");
    const description = page?.description ?? (kind === "private" ? "QuoteUs.ca account page." : "This page could not be found.");
    document.title = title;
    upsertMeta("name", "description", description);
    upsertMeta("name", "robots", page ? "index, follow" : "noindex, nofollow");
    const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (page) {
      const link = canonical || document.createElement("link");
      link.rel = "canonical";
      link.href = canonicalUrl(location);
      if (!canonical) document.head.appendChild(link);
    } else {
      canonical?.remove();
    }
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:image", SEO_IMAGE);
    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", SEO_IMAGE);
    const ogUrl = document.head.querySelector<HTMLMetaElement>('meta[property="og:url"]');
    if (page) upsertMeta("property", "og:url", canonicalUrl(location));
    else ogUrl?.remove();
    document.getElementById("seo-structured-data")?.remove();
    if (page) {
      const script = document.createElement("script");
      script.id = "seo-structured-data";
      script.type = "application/ld+json";
      script.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "Organization", name: "QuoteUs.ca", url: SEO_ORIGIN },
          { "@type": "WebSite", name: "QuoteUs.ca", url: SEO_ORIGIN },
        ],
      });
      document.head.appendChild(script);
    }
  }, [location]);
  return null;
}

// Legacy page-local calls are intentionally inert; SeoNavigation owns route metadata.
export function useSeo(_opts: { title: string; description?: string; keywords?: string; canonical?: string; image?: string; noindex?: boolean }) {}