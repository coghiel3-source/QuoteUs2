export type ProvinceCode = "ON" | "BC" | "AB";

export interface ProvinceConfig {
  code: ProvinceCode;
  label: string;
  tribunal: string;
  sourceUrl: string;
  days: number | null;
  status: "Illustrative comparison" | "Data pending";
  explanation: string;
  updatedAt: string | null;
}

// Illustrative values only. A verified feed must explicitly replace this data
// and its explanatory labels before any live-data claim can be made.
export const RENT_CLOCK_PROVINCES: readonly ProvinceConfig[] = [
  {
    code: "ON", label: "Ontario · LTB", tribunal: "LTB",
    sourceUrl: "https://tribunalsontario.ca/ltb/",
    days: 240, status: "Illustrative comparison",
    explanation: "Ontario illustration: 8 months × 30 days.", updatedAt: null,
  },
  {
    code: "BC", label: "British Columbia · RTB", tribunal: "RTB",
    sourceUrl: "https://www2.gov.bc.ca/gov/content/housing-tenancy/residential-tenancies",
    days: null, status: "Data pending",
    explanation: "British Columbia: verified wait-time data is not connected.", updatedAt: null,
  },
  {
    code: "AB", label: "Alberta · RTDRS", tribunal: "RTDRS",
    sourceUrl: "https://www.alberta.ca/residential-tenancy-dispute-resolution-service",
    days: null, status: "Data pending",
    explanation: "Alberta: verified wait-time data is not connected.", updatedAt: null,
  },
];

export const CLOCK_DISCLOSURE = "*One-day payment is a proposed campaign claim, not a confirmed benefit. Timing depends on approved product terms and claim requirements. This is not a live tribunal data feed.";
export const CALCULATOR_DISCLOSURE = "A planning scenario, not a forecast of tribunal wait times or a coverage calculation. Does not include legal fees, damage or other expenses.";
export const FOOTER_DISCLOSURE = "QuoteUs.ca acts as an intermediary, not an insurer. Product availability, tenant eligibility, limits, exclusions, fees and payout timing are governed by the applicable agreement. The Rent Clock is an illustrative educational comparison; no live wait-time feed is connected. Not available in Quebec.";
export const RENT_GUARANTEE_URL = "https://quoteus.ca/rent-guarantee";
export const RENT_CLOCK_SEO = {
  title: "The Rent Clock | QuoteUs.ca Rent Guarantee",
  description: "Explore The Rent Clock, an illustrative tribunal comparison for Ontario, British Columbia and Alberta. Calculate potential unpaid rent and review QuoteUs.ca Rent Guarantee options.",
};
