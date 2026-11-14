/**
 * Read-only HTTP checks, including media loaded from public ad settings.
 * Usage: npx tsx script/audit-public-links.ts https://quoteus.ca /tmp/links.json
 * Private account/token routes, tracking endpoints and preconnect hints are not crawled.
 */
import { writeFile } from "node:fs/promises";
import { publicPages } from "../shared/seo";

const origin = new URL(process.argv[2] || "https://quoteus.ca").origin;
const output = process.argv[3];
type Result = { url: string; status: number; type?: string; error?: string; from: string[] };
const refs = new Map<string, Set<string>>();
const results = new Map<string, Result>();
const bodies = new Map<string, string>();

function add(raw: string, from: string) {
  try {
    const url = new URL(raw.replace(/&amp;/g, "&"), from);
    url.hash = "";
    if (url.origin !== origin) return;
    if (/^\/(?:api|sign|doc-sign|service-sign|invoice-sign|doc-upload|ad-preview)(?:\/|$)/.test(url.pathname)) return;
    if (!refs.has(url.href)) refs.set(url.href, new Set());
    refs.get(url.href)!.add(from);
  } catch { /* Not an HTTP reference. */ }
}

async function check(url: string) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(20000), headers: { "User-Agent": "QuoteUs-LinkAudit/1.0" } });
    const type = r.headers.get("content-type") || "";
    results.set(url, { url, status: r.status, type, from: [...(refs.get(url) || [])] });
    if (type.includes("text/html") || type.includes("xml")) {
      const text = await r.text();
      bodies.set(url, text);
      if (r.ok && type.includes("text/html")) {
        for (const tag of text.matchAll(/<(?:a|link|img|script|iframe|source|video)\b[^>]*>/gi)) {
          if (/\brel=["'][^"']*(?:preconnect|dns-prefetch)[^"']*["']/i.test(tag[0])) continue;
          const match = tag[0].match(/\b(?:href|src)=["']([^"']+)["']/i);
          if (match && !/^(?:#|mailto:|tel:|data:|javascript:)/i.test(match[1])) add(match[1], url);
        }
      }
    } else {
      await r.body?.cancel();
    }
  } catch (e) {
    results.set(url, { url, status: 0, error: e instanceof Error ? e.message : String(e), from: [...(refs.get(url) || [])] });
  }
}

async function batch(urls: string[]) {
  let index = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (index < urls.length) await check(urls[index++]);
  }));
}

for (const path of [...Object.keys(publicPages), "/sitemap.xml", "/robots.txt"]) add(path, origin);
await batch([...refs.keys()]);
for (const match of (bodies.get(origin + "/sitemap.xml") || "").matchAll(/<loc>([^<]+)<\/loc>/g)) add(match[1], origin + "/sitemap.xml");

// These responses contain public artwork, not customer information.
for (const page of ["Home Page", "Auto", "Home", "Tenant", "Travel", "Life", "Business", "Pet", "Mortgage", "Rent Guarantee"]) {
  const endpoint = `${origin}/api/advertisements/active?page=${encodeURIComponent(page)}`;
  try {
    const r = await fetch(endpoint, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const ads = await r.json();
    if (!Array.isArray(ads)) throw new Error("Expected an advertisement list");
    for (const ad of ads) if (ad.mediaUrl) add(ad.mediaUrl, endpoint);
  } catch (e) {
    results.set(endpoint, { url: endpoint, status: 0, error: String(e), from: [] });
  }
}
for (let depth = 0; depth < 3; depth++) {
  const pending = [...refs.keys()].filter(url => !results.has(url));
  if (!pending.length) break;
  if (results.size + pending.length > 300) throw new Error("Audit limit exceeded; narrow the site before continuing.");
  await batch(pending);
}
const report = [...results.values()].map(r => ({ ...r, from: [...(refs.get(r.url) || r.from)] }));
const broken = report.filter(r => r.status < 200 || r.status >= 400);
if (output) await writeFile(output, JSON.stringify({ origin, checked: report.length, broken, results: report }, null, 2));
console.log(`Checked ${report.length} URLs on ${origin}; ${broken.length} failed.`);
for (const r of broken) console.log(`${r.status || "NETWORK"} ${r.url}${r.error ? ` (${r.error})` : ""}`);
console.log("Scope: public same-origin HTML links/assets and configured ad media. External links, private flows and orphan URLs require separate review.");
if (broken.length) process.exitCode = 1;
