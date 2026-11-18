import assert from "node:assert/strict";
import test from "node:test";
import { trackQuoteFunnel } from "./googleTagManager";

test("public quote events enqueue only fixed route labels and skip private or unknown URLs", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "window");
  const target = { dataLayer: [] };
  Object.defineProperty(globalThis, "window", { configurable: true, value: target });
  try {
    assert.equal(trackQuoteFunnel("quote_started", "/auto"), true);
    assert.equal(trackQuoteFunnel("quote_submitted", "/rent-guarantee"), true);
    for (const path of ["/contact", "/admin", "/invoice-sign/private", "/auto?email=test", "constructor"]) {
      assert.equal(trackQuoteFunnel("quote_submitted", path), false);
    }
    assert.deepEqual(target.dataLayer, [
      { event: "quote_started", insurance_type: "Auto" },
      { event: "quote_submitted", insurance_type: "Rent Guarantee" },
    ]);
  } finally {
    if (original) Object.defineProperty(globalThis, "window", original);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
