import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import express from "express";
import path from "node:path";
import { publicPages } from "../shared/seo";
import { serveStatic } from "../server/static";
import { renderPageHtml } from "../server/seo";

const template = fs.readFileSync("dist/public/index.html", "utf8");
const pages = JSON.parse(fs.readFileSync("dist/public-pages.json", "utf8"));

test("build contains real content and navigation for every public route, and nothing private", () => {
  assert.deepEqual(Object.keys(pages).sort(), Object.keys(publicPages).sort());
  for (const route of Object.keys(publicPages)) {
    const page = renderPageHtml(template, route, pages[route]);
    assert.equal(page.status, 200);
    assert.match(page.html, /id="root" data-prerendered="true"/);
    assert.match(pages[route], /<h1[\s>]/);
    if (route === "/rent-clock") {
      assert.match(pages[route], /href="https:\/\/quoteus\.ca\/"/);
      assert.match(pages[route], /href="https:\/\/quoteus\.ca\/privacy"/);
      assert.match(pages[route], /Proposed, not confirmed/);
    } else {
      assert.match(pages[route], /href="\/auto"/);
      assert.match(pages[route], /href="\/privacy"/);
    }
    assert.ok(pages[route].length > 2000, route);
  }
});

test("private and missing routes never receive content even if supplied", () => {
  for (const route of ["/admin", "/login", "/dashboard", "/rep", "/customer-portal", "/sign/test", "/doc-upload/test", "/unknown"]) {
    const page = renderPageHtml(template, route, "<h1>Must not appear</h1>");
    assert.doesNotMatch(page.html, /Must not appear|data-prerendered/);
    assert.match(page.html, /noindex, nofollow/);
    assert.match(page.html, /<div id="root"><\/div>/);
  }
});

test("rendered content is inserted literally, not interpreted as replacement syntax", () => {
  assert.ok(renderPageHtml(template, "/", "<h1>$& $' $`</h1>").html.includes("<h1>$& $' $`</h1>"));
});

test("production static handler serves public HTML and preserves route boundaries", async () => {
  const app = express();
  serveStatic(app, path.resolve("dist/public"));
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const origin = `http://127.0.0.1:${address.port}`;
  try {
    for (const route of Object.keys(publicPages)) {
      const response = await fetch(`${origin}${route}?campaign=sample`);
      assert.equal(response.status, 200, route);
      const html = await response.text();
      assert.match(html, /id="root" data-prerendered="true"/);
      assert.match(html, /<h1[\s>]/);
      assert.doesNotMatch(html, /campaign=sample/);
      const head = await fetch(`${origin}${route}`, { method: "HEAD" });
      assert.equal(head.status, 200);
      assert.equal(await head.text(), "");
    }
    for (const route of ["/admin", "/sign/test", "/customer-portal"]) {
      const response = await fetch(`${origin}${route}`);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow");
      assert.doesNotMatch(await response.text(), /data-prerendered/);
    }
    for (const route of ["/unknown", "/api/missing", "/assets/missing.js", "/public-pages.json", "/prerender/entry-server.mjs"]) {
      const response = await fetch(`${origin}${route}`);
      assert.equal(response.status, 404, route);
      assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow");
    }
    const index = await fetch(`${origin}/index.html`, { redirect: "manual" });
    assert.equal(index.status, 301);
    assert.equal(index.headers.get("location"), "/");
    const embed = await fetch(`${origin}/rent-clock?embed=1&province=BC`);
    assert.equal(embed.status, 200);
    assert.doesNotMatch(await embed.text(), /data-prerendered/);
    for (const asset of [...template.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(m => m[1])) {
      assert.equal((await fetch(`${origin}${asset}`)).status, 200, asset);
    }
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});