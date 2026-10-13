import type { Request, Response, NextFunction, RequestHandler } from "express";
import { canonicalUrl, classifyPage, publicPages, SEO_IMAGE, SEO_ORIGIN } from "../shared/seo";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import RentGuaranteeGuidePage from "../client/src/pages/RentGuaranteeGuide";

export const noindex = "noindex, nofollow";

export function seoDirectives(req: Request, res: Response, next: NextFunction) {
  const path = req.path;
  if (/^\/(?:api|uploads|objects)(?:\/|$)/.test(path) || classifyPage(path) === "private") {
    res.setHeader("X-Robots-Tag", noindex);
  }
  next();
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]!);
}

export function renderPageHtml(template: string, path: string, content?: string): { html: string; status: number; robots?: string } {
  const kind = classifyPage(path);
  const page = kind === "public" ? publicPages[path] : undefined;
  const title = page?.title ?? (kind === "private" ? "QuoteUs.ca | Account" : "Page Not Found | QuoteUs.ca");
  const description = page?.description ?? (kind === "private" ? "QuoteUs.ca account page." : "This page could not be found.");
  const canonical = page ? `<link rel="canonical" href="${escapeHtml(canonicalUrl(path))}" />` : "";
  const robots = page ? "index, follow" : noindex;
  const tags = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<meta name="robots" content="${robots}" />`,
    canonical,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="QuoteUs.ca" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    ...(page ? [`<meta property="og:url" content="${escapeHtml(canonicalUrl(path))}" />`] : []),
    `<meta property="og:image" content="${SEO_IMAGE}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    `<meta name="twitter:image" content="${SEO_IMAGE}" />`,
    ...(page ? [`<script id="seo-structured-data" type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "Organization", name: "QuoteUs.ca", url: SEO_ORIGIN },
        { "@type": "WebSite", name: "QuoteUs.ca", url: SEO_ORIGIN },
      ],
    }).replace(/</g, "\\u003c")}</script>`] : []),
  ].join("\n");
  let html = template.replace("</head>", `${tags}\n</head>`);
  // Content comes exclusively from our React renderer, never from the request.
  // A replacement callback preserves literal "$&" etc. in rendered copy.
  if (page && content !== undefined) {
    if (!template.includes('<div id="root"></div>')) throw new Error("Missing prerender root");
    html = html.replace('<div id="root"></div>', () => `<div id="root" data-prerendered="true">${content}</div>`);
  } else if (page && path === "/rent-guarantee-guide") {
    // Preserve the guide's standalone rendering for callers without a manifest.
    // The full prerendered App tree above always takes precedence for hydration.
    html = html.replace('<div id="root"></div>', () => `<div id="root">${renderToStaticMarkup(createElement(RentGuaranteeGuidePage))}</div>`);
  }
  return { html, status: kind === "missing" ? 404 : 200, robots: page ? undefined : noindex };
}

/** Install before static/Vite so /index.html cannot bypass route-aware metadata. */
export const redirectIndexHtml: RequestHandler = (req, res, next) => {
  if (req.path === "/index.html" && (req.method === "GET" || req.method === "HEAD")) {
    return res.redirect(301, "/");
  }
  next();
};

/** Production SPA fallback; use without a mount path to preserve req.path. */
export function serveSeoHtml(template: string, content: Record<string, string> = {}): RequestHandler {
  return (req, res) => {
    if (!["GET", "HEAD"].includes(req.method) || /^\/(?:api|uploads|objects)(?:\/|$)/.test(req.path) || /\.[^/]+$/.test(req.path)) {
      res.setHeader("X-Robots-Tag", noindex);
      return res.status(404).end();
    }
    const clientOnlyEmbed = req.path === "/rent-clock" && req.query.embed === "1";
    const markup = !clientOnlyEmbed && Object.prototype.hasOwnProperty.call(content, req.path) ? content[req.path] : undefined;
    const page = renderPageHtml(template, req.path, markup);
    if (page.robots) res.setHeader("X-Robots-Tag", page.robots);
    return res.status(page.status).type("html").send(page.html);
  };
}

export function sitemapXml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${Object.keys(publicPages).map(path => `  <url><loc>${escapeHtml(canonicalUrl(path))}</loc></url>`).join("\n")}\n</urlset>`;
}