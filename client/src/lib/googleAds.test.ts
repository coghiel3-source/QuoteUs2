import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { trackGoogleAdsLead } from "./googleAds";

test("saved public enquiries send the exact conversion once without personal details", () => {
  const calls: unknown[] = [];
  Object.assign(globalThis, { window: { location: { pathname: "/rent-guarantee" }, dataLayer: calls } });
  trackGoogleAdsLead("test-lead");
  trackGoogleAdsLead("test-lead");
  assert.deepEqual(calls, [{ event: "generate_lead", transaction_id: "test-lead" }]);
  (window as any).location.pathname = "/admin";
  trackGoogleAdsLead("staff-lead");
  assert.equal(calls.length, 1);
  delete (globalThis as any).window;
});

test("missing IDs, absent trackers, blocked trackers and server rendering are safe", () => {
  assert.doesNotThrow(() => trackGoogleAdsLead("server"));
  Object.assign(globalThis, { window: { location: { pathname: "/auto" } } });
  assert.doesNotThrow(() => trackGoogleAdsLead("no-tracker"));
  assert.deepEqual((window as any).dataLayer, [{ event: "generate_lead", transaction_id: "no-tracker" }]);
  (window as any).dataLayer = { push: () => { throw new Error("blocked"); } };
  assert.doesNotThrow(() => trackGoogleAdsLead("blocked"));
  assert.doesNotThrow(() => trackGoogleAdsLead(undefined));
  delete (globalThis as any).window;
});

test("shared head loads GTM once, high in head, without the old direct Google tag", () => {
  const html = fs.readFileSync("client/index.html", "utf8").split("</head>")[0];
  assert.equal(html.match(/GTM-PZV6TJN6/g)?.length, 1);
  assert.ok(html.indexOf("GTM-PZV6TJN6") < html.indexOf('name="viewport"'));
  assert.ok(!html.includes("gtag("));
  assert.ok(!html.includes("AW-18512103274"));
  assert.ok(!html.includes("generate_lead"));
  const body = fs.readFileSync("client/index.html", "utf8").split("<body>")[1];
  assert.equal(body.match(/ns.html\?id=GTM-PZV6TJN6/g)?.length, 1);
});
