// 2026 Federal Tax Brackets (estimated, based on inflation adjustments)
const FEDERAL_BRACKETS_SINGLE = [
  { min: 0, max: 11925, rate: 0.10 },
  { min: 11925, max: 48475, rate: 0.12 },
  { min: 48475, max: 103350, rate: 0.22 },
  { min: 103350, max: 197300, rate: 0.24 },
  { min: 197300, max: 250525, rate: 0.32 },
  { min: 250525, max: 626350, rate: 0.35 },
  { min: 626350, max: Infinity, rate: 0.37 },
];

const FEDERAL_BRACKETS_MARRIED = [
  { min: 0, max: 23850, rate: 0.10 },
  { min: 23850, max: 96950, rate: 0.12 },
  { min: 96950, max: 206700, rate: 0.22 },
  { min: 206700, max: 394600, rate: 0.24 },
  { min: 394600, max: 501050, rate: 0.32 },
  { min: 501050, max: 751600, rate: 0.35 },
  { min: 751600, max: Infinity, rate: 0.37 },
];

const STANDARD_DEDUCTION = {
  single: 15700,
  married: 31400,
  head_of_household: 23500,
};

const STATE_TAX_RATES: Record<string, number> = {
  CA: 0.093, NY: 0.0685, NJ: 0.0637, IL: 0.0495, PA: 0.0307,
  OH: 0.04, TX: 0, FL: 0, WA: 0, NV: 0, WY: 0, SD: 0, TN: 0,
  AK: 0, NH: 0, MA: 0.05, CT: 0.0699, OR: 0.099, MN: 0.0985,
  HI: 0.11, GA: 0.055, NC: 0.0475, VA: 0.0575, CO: 0.044,
  AZ: 0.025, MD: 0.0575, MI: 0.0425, WI: 0.0765, MO: 0.048,
  IN: 0.0305, SC: 0.065, AL: 0.05, KY: 0.04, IA: 0.06,
  OK: 0.0475, KS: 0.057, AR: 0.047, MS: 0.05, NE: 0.0664,
  NM: 0.059, UT: 0.0465, ID: 0.058, MT: 0.0675, ND: 0.029,
  WV: 0.065, ME: 0.0715, RI: 0.0599, VT: 0.0875, DE: 0.066,
  DC: 0.085, LA: 0.0425,
};

export type FilingStatus = "single" | "married" | "head_of_household";

export interface TaxEstimate {
  gross_income: number;
  deduction: number;
  taxable_income: number;
  federal_tax: number;
  state_tax: number;
  total_tax: number;
  effective_rate: number;
  marginal_rate: number;
  quarterly_payment: number;
  monthly_set_aside: number;
  brackets_breakdown: { rate: number; taxed_amount: number; tax: number }[];
}

function computeBracketTax(
  taxableIncome: number,
  brackets: { min: number; max: number; rate: number }[]
): { total: number; marginalRate: number; breakdown: { rate: number; taxed_amount: number; tax: number }[] } {
  let total = 0;
  let marginalRate = 0.10;
  const breakdown: { rate: number; taxed_amount: number; tax: number }[] = [];

  for (const bracket of brackets) {
    if (taxableIncome <= bracket.min) break;
    const taxedAmount = Math.min(taxableIncome, bracket.max) - bracket.min;
    const tax = taxedAmount * bracket.rate;
    total += tax;
    marginalRate = bracket.rate;
    breakdown.push({ rate: bracket.rate, taxed_amount: Math.round(taxedAmount), tax: Math.round(tax) });
  }

  return { total, marginalRate, breakdown };
}

export function estimateTax(
  annualIncome: number,
  filingStatus: FilingStatus,
  stateCode: string,
  additionalDeductions = 0
): TaxEstimate {
  const brackets = filingStatus === "married" ? FEDERAL_BRACKETS_MARRIED : FEDERAL_BRACKETS_SINGLE;
  const standardDeduction = STANDARD_DEDUCTION[filingStatus] ?? STANDARD_DEDUCTION.single;
  const deduction = standardDeduction + additionalDeductions;
  const taxableIncome = Math.max(0, annualIncome - deduction);

  const { total: federalTax, marginalRate, breakdown } = computeBracketTax(taxableIncome, brackets);
  const stateRate = STATE_TAX_RATES[stateCode.toUpperCase()] ?? 0.05;
  const stateTax = taxableIncome * stateRate;
  const totalTax = federalTax + stateTax;
  const effectiveRate = annualIncome > 0 ? totalTax / annualIncome : 0;

  return {
    gross_income: annualIncome,
    deduction,
    taxable_income: taxableIncome,
    federal_tax: Math.round(federalTax),
    state_tax: Math.round(stateTax),
    total_tax: Math.round(totalTax),
    effective_rate: Math.round(effectiveRate * 1000) / 10,
    marginal_rate: Math.round(marginalRate * 100),
    quarterly_payment: Math.round(totalTax / 4),
    monthly_set_aside: Math.round(totalTax / 12),
    brackets_breakdown: breakdown,
  };
}
