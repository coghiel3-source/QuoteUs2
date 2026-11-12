import { test } from "node:test";
import assert from "node:assert/strict";
import { rgRate } from "./rgPricing";

test("saved zero rates do not fall back to global defaults", () => {
  assert.equal(rgRate("0", 4.5), 0);
  assert.equal(rgRate(0, 5), 0);
  assert.equal(rgRate(null, 4.5), 4.5);
  assert.equal(rgRate("", 5), 5);
});

test("nonnegative manual rates support decimals and reject invalid numbers", () => {
  assert.equal(rgRate("0.25"), 0.25);
  assert.equal(rgRate("12.75"), 12.75);
  for (const value of [-1, "bad", Infinity, NaN]) assert.equal(rgRate(value), 0);
});

test("legacy saved difference preserves independent Total and RG inputs", () => {
  for (const [total, rg] of [[0, 0], [0, 4.5], [4.5, 0], [2, 4.5], [4.5, 4.5]]) {
    const savedDifference = total - rg;
    const reopenedTotal = rgRate(rg) + savedDifference;
    assert.equal(reopenedTotal, total);
    assert.equal((reopenedTotal / 100 * 2150) + (rg / 100 * 2150), (total + rg) / 100 * 2150);
  }
});
