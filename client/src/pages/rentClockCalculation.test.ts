import { test } from "node:test";
import { strict as assert } from "node:assert";
import { calculateExposure, calculationUrl, DEFAULT_CALCULATION, embedCode, formatCAD, restoreCalculation, validateMonths, validateRent, validateUnits } from "./rentClockCalculation";
import { CLOCK_DISCLOSURE, RENT_CLOCK_PROVINCES, RENT_GUARANTEE_URL } from "./rentClockConfig";

test("default calculator is 2500 × 1 × 8 = 20000 Canadian dollars", () => {
  assert.equal(calculateExposure(DEFAULT_CALCULATION), 20000);
  assert.equal(formatCAD(20000), "$20,000");
  assert.equal(formatCAD(1250.75), "$1,250.75");
});

test("rent accepts positive decimal currency and rejects invalid syntax and unsafe values", () => {
  assert.equal(validateRent("2500.75"), 2500.75);
  assert.equal(validateRent("0.01"), 0.01);
  for (const value of ["", " ", "0", "-1", "Infinity", "NaN", "1e3", "1,000", "10x", "2.345", ".5", "2.", " 2500", "9007199254740992"]) {
    assert.equal(validateRent(value), null, value);
  }
});

test("units are strictly positive safe whole numbers; months stay in slider bounds", () => {
  assert.equal(validateUnits("3"), 3);
  for (const value of ["", "0", "-1", "1.5", "2.0", "2e3", "2x", " 2", "Infinity", "9007199254740992"]) assert.equal(validateUnits(value), null, value);
  for (const value of [0, -1, 13, 2.5, NaN, Infinity]) assert.equal(validateMonths(value), false);
  assert.equal(validateMonths(1), true);
  assert.equal(validateMonths(12), true);
  assert.equal(calculateExposure({ rent: "12.34", units: "3", months: 2 }), 74.04);
  assert.equal(calculateExposure({ rent: "", units: "1", months: 8 }), null);
  assert.equal(calculateExposure({ rent: "90000000000000", units: "100", months: 12 }), null);
});

test("sharing uses deployed origin, restores all values, and omits embed or unrelated parameters", () => {
  const input = { rent: "1875.50", units: "3", months: 6, province: "BC" as const };
  const shared = calculationUrl("https://campaign.example", input);
  assert.equal(new URL(shared).origin, "https://campaign.example");
  assert.equal(new URL(shared).pathname, "/rent-clock");
  assert.deepEqual(restoreCalculation(new URL(shared).search), { ...input, rent: "1875.5" });
  assert.equal(new URL(shared).searchParams.has("embed"), false);
  assert.throws(() => calculationUrl("https://campaign.example", { ...input, rent: "no" }));
});

test("invalid query values fall back gracefully without discarding other valid fields", () => {
  assert.deepEqual(restoreCalculation("?rent=bad&units=2&months=13&province=AB"), { rent: "2500", units: "2", months: 8, province: "AB" });
  assert.deepEqual(restoreCalculation("?rent=&units=2.5&months=1e1&province=QC"), DEFAULT_CALCULATION);
  assert.deepEqual(restoreCalculation(""), DEFAULT_CALCULATION);
  assert.equal(restoreCalculation("?months=12&province=ON").months, 12);
  assert.equal(restoreCalculation("?months=0&province=TAL").province, "ON");
});

test("province config includes only ON BC AB, honest illustrative/pending data and official sources", () => {
  assert.deepEqual(RENT_CLOCK_PROVINCES.map(p => p.code), ["ON", "BC", "AB"]);
  assert.equal(RENT_CLOCK_PROVINCES[0].days, 240);
  assert.equal(RENT_CLOCK_PROVINCES[0].status, "Illustrative comparison");
  for (const config of RENT_CLOCK_PROVINCES.slice(1)) {
    assert.equal(config.days, null);
    assert.equal(config.status, "Data pending");
    assert.equal(config.updatedAt, null);
  }
  assert.equal(RENT_CLOCK_PROVINCES[0].sourceUrl, "https://tribunalsontario.ca/ltb/");
  assert.equal(RENT_CLOCK_PROVINCES[1].sourceUrl, "https://www2.gov.bc.ca/gov/content/housing-tenancy/residential-tenancies");
  assert.equal(RENT_CLOCK_PROVINCES[2].sourceUrl, "https://www.alberta.ca/residential-tenancy-dispute-resolution-service");
  assert.ok(CLOCK_DISCLOSURE.includes("not a confirmed benefit"));
  assert.equal(RENT_GUARANTEE_URL, "https://quoteus.ca/rent-guarantee");
});

test("embed uses current origin and allows scrolling rather than clipping mandatory disclosures", () => {
  const code = embedCode("https://preview.example", "AB");
  assert.ok(code.includes('src="https://preview.example/rent-clock?embed=1&province=AB"'));
  assert.ok(code.includes('width="100%"'));
  assert.ok(code.includes('height="880"'));
  assert.ok(!code.includes('scrolling="no"'));
  assert.ok(!code.includes("quoteus.ca/rent-clock"));
});
