import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { renderRgEligibilityHtml, renderRgEligibilityText, rgEligibility } from "./rgInvoiceEligibility";

test("invoice eligibility includes all supplied requirements in HTML and plain text", () => {
  const html = renderRgEligibilityHtml();
  const text = renderRgEligibilityText();
  assert.equal(rgEligibility.newTenants.length, 8);
  assert.equal(rgEligibility.existingTenants.length, 5);
  for (const content of [
    rgEligibility.title, rgEligibility.introduction,
    ...rgEligibility.newTenants, ...rgEligibility.existingTenants,
    rgEligibility.conclusion,
  ]) {
    assert.ok(html.includes(content));
    assert.ok(text.includes(content));
  }
  assert.equal((html.match(/<li /g) || []).length, 13);
});

test("PDF, email and signing views put eligibility before the disclaimer and hide pricing rates", () => {
  for (const path of [
    "client/src/components/InvoiceGenerator.tsx",
    "client/src/pages/InvoiceSign.tsx",
    "server/routes.ts",
  ]) {
    const source = readFileSync(path, "utf8");
    const eligibility = source.indexOf("renderRgEligibilityHtml()", source.indexOf("renderRgEligibilityHtml") + 1);
    assert.ok(eligibility > 0, path);
    assert.ok(source.indexOf("Disclaimer", eligibility) > eligibility, path);
    assert.doesNotMatch(source, />Rate<\/th>/, path);
    assert.doesNotMatch(source, /fmtPct\(invoice\.(annual|monthly)RatePct\)/, path);
  }
});

test("PDF generation includes extra pages instead of clipping the expanded invoice", () => {
  const source = readFileSync("client/src/components/InvoiceGenerator.tsx", "utf8");
  assert.match(source, /offset < pdfHeight/);
  assert.match(source, /pdf\.addPage\(\)/);
});
