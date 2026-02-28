// Cost of Living Index relative to national average (100)
// Sources: BLS, Council for Community and Economic Research
// Higher = more expensive

interface CityData {
  index: number;
  housing_multiplier: number;
  label: string;
}

const CITY_INDEX: Record<string, CityData> = {
  // Very High Cost (VHCOL)
  "new york:ny": { index: 187, housing_multiplier: 2.8, label: "Very High" },
  "san francisco:ca": { index: 179, housing_multiplier: 3.1, label: "Very High" },
  "san jose:ca": { index: 170, housing_multiplier: 2.7, label: "Very High" },
  "honolulu:hi": { index: 168, housing_multiplier: 2.5, label: "Very High" },
  "manhattan:ny": { index: 210, housing_multiplier: 3.5, label: "Very High" },
  "brooklyn:ny": { index: 178, housing_multiplier: 2.6, label: "Very High" },

  // High Cost (HCOL)
  "los angeles:ca": { index: 166, housing_multiplier: 2.6, label: "High" },
  "boston:ma": { index: 162, housing_multiplier: 2.4, label: "High" },
  "washington:dc": { index: 158, housing_multiplier: 2.3, label: "High" },
  "seattle:wa": { index: 156, housing_multiplier: 2.3, label: "High" },
  "san diego:ca": { index: 153, housing_multiplier: 2.4, label: "High" },
  "miami:fl": { index: 148, housing_multiplier: 2.2, label: "High" },
  "oakland:ca": { index: 155, housing_multiplier: 2.5, label: "High" },
  "portland:or": { index: 138, housing_multiplier: 1.8, label: "High" },
  "denver:co": { index: 135, housing_multiplier: 1.7, label: "High" },
  "chicago:il": { index: 131, housing_multiplier: 1.6, label: "High" },
  "austin:tx": { index: 130, housing_multiplier: 1.6, label: "High" },
  "philadelphia:pa": { index: 128, housing_multiplier: 1.5, label: "High" },
  "minneapolis:mn": { index: 125, housing_multiplier: 1.4, label: "High" },
  "nashville:tn": { index: 123, housing_multiplier: 1.4, label: "High" },

  // Average Cost
  "atlanta:ga": { index: 112, housing_multiplier: 1.2, label: "Average" },
  "dallas:tx": { index: 110, housing_multiplier: 1.2, label: "Average" },
  "houston:tx": { index: 108, housing_multiplier: 1.1, label: "Average" },
  "charlotte:nc": { index: 107, housing_multiplier: 1.1, label: "Average" },
  "raleigh:nc": { index: 106, housing_multiplier: 1.1, label: "Average" },
  "phoenix:az": { index: 105, housing_multiplier: 1.1, label: "Average" },
  "tampa:fl": { index: 104, housing_multiplier: 1.1, label: "Average" },
  "salt lake city:ut": { index: 103, housing_multiplier: 1.1, label: "Average" },
  "orlando:fl": { index: 102, housing_multiplier: 1.0, label: "Average" },
  "las vegas:nv": { index: 101, housing_multiplier: 1.0, label: "Average" },

  // Low Cost (LCOL)
  "san antonio:tx": { index: 95, housing_multiplier: 0.9, label: "Below Average" },
  "columbus:oh": { index: 93, housing_multiplier: 0.9, label: "Below Average" },
  "indianapolis:in": { index: 91, housing_multiplier: 0.8, label: "Below Average" },
  "kansas city:mo": { index: 90, housing_multiplier: 0.8, label: "Below Average" },
  "pittsburgh:pa": { index: 89, housing_multiplier: 0.8, label: "Below Average" },
  "detroit:mi": { index: 87, housing_multiplier: 0.7, label: "Below Average" },
  "memphis:tn": { index: 84, housing_multiplier: 0.7, label: "Low" },
  "oklahoma city:ok": { index: 83, housing_multiplier: 0.7, label: "Low" },
  "little rock:ar": { index: 81, housing_multiplier: 0.6, label: "Low" },
  "birmingham:al": { index: 80, housing_multiplier: 0.6, label: "Low" },
};

// State-level fallbacks
const STATE_INDEX: Record<string, number> = {
  ca: 150, ny: 140, ma: 145, hi: 165, dc: 158, ct: 130, nj: 130,
  wa: 130, co: 120, or: 125, md: 125, il: 110, va: 115, mn: 110,
  nh: 115, vt: 110, ri: 115, ak: 125, fl: 105, tx: 100, az: 100,
  ga: 100, nc: 100, pa: 100, oh: 90, mi: 90, tn: 95, in: 90,
  mo: 90, wi: 95, ia: 90, ks: 90, ne: 90, ok: 85, ar: 85,
  al: 85, ms: 82, wv: 82, ky: 88, la: 90, sc: 95, nm: 95,
  nv: 100, ut: 100, id: 95, mt: 95, nd: 90, sd: 90, wy: 95,
  me: 105, de: 105,
};

export interface HCOLAnalysis {
  index: number;
  label: string;
  housing_multiplier: number;
  recommended_housing_budget: number;
  recommended_savings_rate: number;
  adjusted_purchasing_power: number;
}

export function getHCOLAnalysis(
  city: string,
  state: string,
  monthlyIncome: number
): HCOLAnalysis {
  const key = `${city.toLowerCase().trim()}:${state.toLowerCase().trim()}`;
  const cityData = CITY_INDEX[key];

  let index: number;
  let housingMultiplier: number;
  let label: string;

  if (cityData) {
    index = cityData.index;
    housingMultiplier = cityData.housing_multiplier;
    label = cityData.label;
  } else {
    const stateCode = state.toLowerCase().trim();
    index = STATE_INDEX[stateCode] ?? 100;
    housingMultiplier = index > 130 ? index / 65 : index > 110 ? index / 85 : index / 100;
    label = index >= 150 ? "Very High" : index >= 120 ? "High" : index >= 95 ? "Average" : index >= 85 ? "Below Average" : "Low";
  }

  // 28% rule adjusted for COL
  const baseHousingPct = 0.28;
  const adjustedHousingPct = Math.min(0.40, baseHousingPct * (housingMultiplier > 1 ? 1 + (housingMultiplier - 1) * 0.3 : 1));
  const recommendedHousing = Math.round(monthlyIncome * adjustedHousingPct);

  // Savings rate recommendation: higher COL = harder to save, but still aim for 15–20%
  const recommendedSavingsRate = index >= 150 ? 12 : index >= 120 ? 15 : 20;

  // Purchasing power: $100 in average city buys this much here
  const adjustedPurchasingPower = Math.round((100 / index) * 10000) / 100;

  return {
    index,
    label,
    housing_multiplier: housingMultiplier,
    recommended_housing_budget: recommendedHousing,
    recommended_savings_rate: recommendedSavingsRate,
    adjusted_purchasing_power: adjustedPurchasingPower,
  };
}

export const US_STATES = [
  { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" }, { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" }, { code: "CA", name: "California" }, { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" }, { code: "DC", name: "Washington DC" },
  { code: "FL", name: "Florida" }, { code: "GA", name: "Georgia" }, { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" }, { code: "IL", name: "Illinois" }, { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" }, { code: "KS", name: "Kansas" }, { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" }, { code: "ME", name: "Maine" }, { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" }, { code: "MI", name: "Michigan" }, { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" }, { code: "MO", name: "Missouri" }, { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" }, { code: "NV", name: "Nevada" }, { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" }, { code: "NM", name: "New Mexico" }, { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" }, { code: "ND", name: "North Dakota" }, { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" }, { code: "OR", name: "Oregon" }, { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" }, { code: "SC", name: "South Carolina" }, { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" }, { code: "TX", name: "Texas" }, { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" }, { code: "VA", name: "Virginia" }, { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" }, { code: "WI", name: "Wisconsin" }, { code: "WY", name: "Wyoming" },
] as const;
