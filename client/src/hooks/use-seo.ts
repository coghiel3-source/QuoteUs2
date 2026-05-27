import { useEffect } from "react";

type SeoOpts = {
  title: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  image?: string;
  noindex?: boolean;
};

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
  return el;
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
  return el;
}

const BASE = "https://quoteus.ca";

export function useSeo(opts: SeoOpts) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = opts.title;

    const canonical = opts.canonical || `${BASE}${window.location.pathname}`;
    const image = opts.image || `${BASE}/opengraph.jpg`;
    const desc = opts.description || "";

    upsertLink("canonical", canonical);
    if (desc) upsertMeta("name", "description", desc);
    if (opts.keywords) upsertMeta("name", "keywords", opts.keywords);
    upsertMeta("name", "robots", opts.noindex ? "noindex, nofollow" : "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1");

    upsertMeta("property", "og:title", opts.title);
    upsertMeta("property", "og:url", canonical);
    upsertMeta("property", "og:image", image);
    if (desc) upsertMeta("property", "og:description", desc);

    upsertMeta("name", "twitter:title", opts.title);
    upsertMeta("name", "twitter:image", image);
    if (desc) upsertMeta("name", "twitter:description", desc);

    return () => {
      document.title = prevTitle;
    };
  }, [opts.title, opts.description, opts.keywords, opts.canonical, opts.image, opts.noindex]);
}
