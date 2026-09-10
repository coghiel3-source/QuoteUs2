import assert from "node:assert/strict";
import { test } from "node:test";
import { trackEvent } from "./analytics";

test("tracking safely handles an absent browser or tracker", () => {
  Reflect.deleteProperty(globalThis, "window");
  assert.doesNotThrow(() => trackEvent("quote_started"));
  Object.assign(globalThis, { window: {} });
  assert.doesNotThrow(() => trackEvent("quote_started"));
  Reflect.deleteProperty(globalThis, "window");
});

test("tracking forwards only the supplied event and dimensions", () => {
  const calls: unknown[][] = [];
  Object.assign(globalThis, { window: { umami: { track: (...args: unknown[]) => { calls.push(args); } } } });
  trackEvent("quote_submitted", { insurance_type: "Auto" });
  assert.deepEqual(calls, [["quote_submitted", { insurance_type: "Auto" }]]);
  Reflect.deleteProperty(globalThis, "window");
});

test("tracker exceptions and rejected promises never break the app", async () => {
  Object.assign(globalThis, { window: { umami: { track: () => { throw new Error("blocked"); } } } });
  assert.doesNotThrow(() => trackEvent("video_started"));
  Object.assign(globalThis, { window: { umami: { track: () => Promise.reject(new Error("offline")) } } });
  assert.doesNotThrow(() => trackEvent("video_completed"));
  await new Promise(resolve => setImmediate(resolve));
  Reflect.deleteProperty(globalThis, "window");
});