import { RENT_CLOCK_PROVINCES, type ProvinceCode } from "./rentClockConfig";

export interface CalculationInputs {
  rent: string;
  units: string;
  months: number;
  province: ProvinceCode;
}
export const DEFAULT_CALCULATION: CalculationInputs = { rent: "2500", units: "1", months: 8, province: "ON" };

export function validateRent(raw: string): number | null {
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) return null;
  const amount = Number(raw);
  return Number.isFinite(amount) && amount > 0 && Number.isSafeInteger(Math.round(amount * 100)) ? amount : null;
}

export function validateUnits(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const units = Number(raw);
  return Number.isSafeInteger(units) && units >= 1 ? units : null;
}

export function validateMonths(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 12;
}

export function calculateExposure(inputs: Pick<CalculationInputs, "rent" | "units" | "months">): number | null {
  const rent = validateRent(inputs.rent);
  const units = validateUnits(inputs.units);
  if (rent === null || units === null || !validateMonths(inputs.months)) return null;
  const cents = Math.round(rent * 100) * units * inputs.months;
  return Number.isSafeInteger(cents) ? cents / 100 : null;
}

export function restoreCalculation(search: string): CalculationInputs {
  const params = new URLSearchParams(search);
  const rent = params.get("rent");
  const units = params.get("units");
  const monthsRaw = params.get("months");
  const months = monthsRaw !== null && /^\d+$/.test(monthsRaw) ? Number(monthsRaw) : NaN;
  const provinceRaw = params.get("province");
  const province = RENT_CLOCK_PROVINCES.find(p => p.code === provinceRaw)?.code ?? DEFAULT_CALCULATION.province;
  const restored = {
    rent: rent !== null && validateRent(rent) !== null ? rent : DEFAULT_CALCULATION.rent,
    units: units !== null && validateUnits(units) !== null ? units : DEFAULT_CALCULATION.units,
    months: validateMonths(months) ? months : DEFAULT_CALCULATION.months,
    province,
  };
  // Individually valid but unsafe combined amounts must not create a misleading result.
  return calculateExposure(restored) === null ? { ...DEFAULT_CALCULATION, province } : restored;
}

export function calculationUrl(origin: string, inputs: CalculationInputs): string {
  if (calculateExposure(inputs) === null || !RENT_CLOCK_PROVINCES.some(p => p.code === inputs.province)) {
    throw new Error("Enter a valid calculation before sharing.");
  }
  const url = new URL("/rent-clock", origin);
  url.search = new URLSearchParams({
    rent: String(validateRent(inputs.rent)),
    units: String(validateUnits(inputs.units)),
    months: String(inputs.months),
    province: inputs.province,
  }).toString();
  return url.toString();
}

export function embedCode(origin: string, province: ProvinceCode): string {
  const url = new URL("/rent-clock", origin);
  url.search = new URLSearchParams({ embed: "1", province }).toString();
  return `<iframe src="${url.toString()}" title="The Rent Clock by QuoteUs.ca" width="100%" height="880" style="border:0;max-width:650px;" loading="lazy"></iframe>`;
}

export function formatCAD(amount: number): string {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", minimumFractionDigits: Number.isInteger(amount) ? 0 : 2, maximumFractionDigits: 2 }).format(amount);
}
