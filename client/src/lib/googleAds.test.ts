import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { trackGoogleAdsLead } from "./googleAds";

test("saved public enquiries send the exact conversion once without personal details", () => {
  const calls: unknown[][] = [];
  Object.assign(globalThis, { window: { location: { pathname: "/rent-guarantee" }, gtag: (...args: unknown[]) => calls.push(args) } });
  trackGoogleAdsLead("test-lead");
  trackGoogleAdsLead("test-lead");
  assert.deepEqual(calls, [["event", "conversion", {
    send_to: "AW-18512103274/Sh5ZCPDtlZwdEOqOoftE", transaction_id: "test-lead",
  }]]);
  (window as any).location.pathname = "/admin";
  trackGoogleAdsLead("staff-lead");
  assert.equal(calls.length, 1);
  delete (globalThis as any).window;
});

test("missing IDs, absent trackers, blocked trackers and server rendering are safe", () => {
  assert.doesNotThrow(() => trackGoogleAdsLead("server"));
  Object.assign(globalThis, { window: { location: { pathname: "/auto" } } });
  assert.doesNotThrow(() => trackGoogleAdsLead("no-tracker"));
  (window as any).gtag = () => { throw new Error("blocked"); };
  assert.doesNotThrow(() => trackGoogleAdsLead("blocked"));
  assert.doesNotThrow(() => trackGoogleAdsLead(undefined));
  delete (globalThis as any).window;
});

test("shared head configures Google Ads but does not count visits as conversions", () => {
  const html = fs.readFileSync("client/index.html", "utf8").split("</head>")[0];
  assert.equal(html.match(/googletagmanager.com\/gtag\/js/g)?.length, 1);
  assert.ok(html.includes("gtag('config', 'AW-18512103274')"));
  assert.ok(!html.includes("Sh5ZCPDtlZwdEOqOoftE"));
});
