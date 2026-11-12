import { test } from "node:test";
import assert from "node:assert/strict";
import { isRentClockReferral, trackRentClock } from "./rentClockAnalytics";

test("campaign tracking supports existing providers and filters personal properties", () => {
  const umami: unknown[][] = [], ga: unknown[] = [];
  Object.assign(globalThis, { window: {
    location: { search: "?source=rent_clock&email=private@example.test" },
    umami: { track: (...args: unknown[]) => { umami.push(args); } },
    dataLayer: ga,
  } });
  assert.equal(isRentClockReferral(), true);
  trackRentClock("cta_click", { placement: "hero", email: "private@example.test", rent: 2500 } as any);
  assert.deepEqual(umami[0], ["rent_clock_cta_click", { campaign: "rent_clock", variant: "concise", placement: "hero" }]);
  assert.deepEqual(ga[0], { event: "rent_clock_cta_click", campaign: "rent_clock", variant: "concise", placement: "hero" });
  assert.ok(!JSON.stringify([umami, ga]).includes("private@"));
});

test("blocked or absent tracking never breaks conversion", async () => {
  Object.assign(globalThis, { window: { location: { search: "" } } });
  assert.equal(isRentClockReferral(), false);
  assert.doesNotThrow(() => trackRentClock("application_submitted"));
  Object.assign(globalThis, { window: {
    umami: { track: () => Promise.reject(new Error("blocked")) },
    dataLayer: { push: () => { throw new Error("blocked"); } },
  } });
  assert.doesNotThrow(() => trackRentClock("cta_click"));
  await new Promise(resolve => setTimeout(resolve, 0));
  delete (globalThis as any).window;
  assert.doesNotThrow(() => trackRentClock("page_view"));
});
