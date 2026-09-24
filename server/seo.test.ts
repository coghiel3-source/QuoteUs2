import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import express from "express";
import { redirectIndexHtml, renderPageHtml, seoDirectives, serveSeoHtml, sitemapXml } from "./seo";
import { canonicalUrl, classifyPage, publicPages, SEO_ORIGIN } from "../shared/seo";
import type { Request, Response } from "express";

const template = fs.readFileSync(new URL("../client/index.html", import.meta.url), "utf8");

test("each public route has unique first-response metadata and canonical", () => {
  const titles = new Set<string>();
  const descriptions = new Set<string>();
  for (const [path, metadata] of Object.entries(publicPages)) {
    const { html, status, robots } = renderPageHtml(template, path);
    assert.equal(status, 200);
    assert.equal(robots, undefined);
    assert.match(html, new RegExp(`<link rel="canonical" href="${canonicalUrl(path)}"`));
    assert.ok(html.includes(`<title>${metadata.title.replace(/&/g, "&amp;")}</title>`));
    assert.ok(html.includes(`property="og:image" content="${SEO_ORIGIN}/opengraph.jpg"`));
    assert.ok(html.includes('name="twitter:description"'));
    assert.ok(html.includes('"@type":"Organization"'));
    assert.ok(html.includes('"@type":"WebSite"'));
    assert.doesNotMatch(html, /FAQPage|BreadcrumbList|aggregateRating|google-site-verification/);
    titles.add(metadata.title);
    descriptions.add(metadata.description);
  }
  assert.equal(titles.size, Object.keys(publicPages).length);
  assert.equal(descriptions.size, Object.keys(publicPages).length);
});

test("private/token routes are 200 noindex; missing pages are 404 noindex", () => {
  for (const path of ["/login", "/admin", "/dashboard", "/broker/credits", "/rep", "/customer-portal/success", "/rg-payment/success", "/sign/abc", "/doc-upload/abc", "/doc-sign/abc", "/service-sign/abc", "/invoice-sign/abc", "/ad-preview/abc"]) {
    const page = renderPageHtml(template, path);
    assert.equal(page.status, 200, path);
    assert.equal(page.robots, "noindex, nofollow");
    assert.ok(!page.html.includes('rel="canonical"'), path);
    assert.equal(classifyPage(path), "private");
  }
  const missing = renderPageHtml(template, "/no-such-page");
  assert.equal(missing.status, 404);
  assert.equal(missing.robots, "noindex, nofollow");
  assert.ok(!missing.html.includes('property="og:url"'));
});

test("sitemap matches only public registry and robots leaves assets crawlable", () => {
  const sitemap = sitemapXml();
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  assert.deepEqual(urls, Object.keys(publicPages).map(canonicalUrl));
  assert.ok(urls.every(url => url.startsWith(SEO_ORIGIN)));
  assert.ok(!urls.some(url => /\/(?:login|api|sign|dashboard)/.test(url)));
  const robots = fs.readFileSync(new URL("../client/public/robots.txt", import.meta.url), "utf8");
  assert.ok(robots.includes(`Sitemap: ${SEO_ORIGIN}/sitemap.xml`));
  assert.ok(!robots.includes("Disallow: /assets"));
  assert.ok(!robots.includes("Disallow: /src"));
  assert.ok(!robots.includes("Disallow: /login"));
  assert.ok(!robots.includes("Disallow: /sign/"));
});

test("HTML escapes metadata and structured data cannot break script", () => {
  const path = "/escape-test";
  publicPages[path] = { title: '<script>" & test', description: '</script><img src=x onerror="test">' };
  try {
    const result = renderPageHtml(template, path).html;
    assert.ok(result.includes("&lt;script&gt;&quot; &amp; test"));
    assert.ok(result.includes("&lt;/script&gt;&lt;img"));
    assert.ok(!result.includes('</script><img src=x'));
  } finally {
    delete publicPages[path];
  }
});

test("sensitive endpoints receive noindex header before route handling", () => {
  for (const path of ["/api/quote", "/uploads/doc-signatures/test", "/objects/file", "/sign/token", "/dashboard"]) {
    let header = "";
    seoDirectives({ path } as Request, { setHeader: (_key, value) => { header = String(value); } } as Response, () => {});
    assert.equal(header, "noindex, nofollow", path);
  }
});

test("Express HTTP fallback uses actual paths, redirects bare index and excludes query from canonical", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "quoteus-seo-"));
  fs.writeFileSync(path.join(dir, "index.html"), template);
  const app = express();
  app.use(seoDirectives);
  app.use(redirectIndexHtml);
  app.use(express.static(dir, { index: false }));
  app.use(serveSeoHtml(template));
  const server = app.listen(0, "127.0.0.1");
  try {
    await new Promise<void>(resolve => server.once("listening", resolve));
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const origin = `http://127.0.0.1:${address.port}`;
    const auto = await fetch(`${origin}/auto?source=test`);
    const autoHtml = await auto.text();
    assert.equal(auto.status, 200);
    assert.ok(autoHtml.includes('rel="canonical" href="https://quoteus.ca/auto"'));
    assert.ok(!autoHtml.includes("source=test"));
    const rent = await fetch(`${origin}/rent-guarantee`);
    const rentHtml = await rent.text();
    assert.equal(rent.status, 200);
    assert.ok(rentHtml.includes('rel="canonical" href="https://quoteus.ca/rent-guarantee"'));
    assert.notEqual(autoHtml.match(/<title>(.*?)<\/title>/)?.[1], rentHtml.match(/<title>(.*?)<\/title>/)?.[1]);
    const missing = await fetch(`${origin}/missing`);
    assert.equal(missing.status, 404);
    assert.equal(missing.headers.get("x-robots-tag"), "noindex, nofollow");
    assert.match(await missing.text(), /Page Not Found/);
    const login = await fetch(`${origin}/login?next=%2Fdashboard`);
    assert.equal(login.status, 200);
    assert.equal(login.headers.get("x-robots-tag"), "noindex, nofollow");
    const loginHtml = await login.text();
    assert.ok(loginHtml.includes('name="robots" content="noindex, nofollow"'));
    assert.ok(!loginHtml.includes('rel="canonical"'));
    const api = await fetch(`${origin}/api/unknown`);
    assert.equal(api.status, 404);
    assert.equal(api.headers.get("x-robots-tag"), "noindex, nofollow");
    const index = await fetch(`${origin}/index.html?source=test`, { redirect: "manual" });
    assert.equal(index.status, 301);
    assert.equal(index.headers.get("location"), "/");
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});