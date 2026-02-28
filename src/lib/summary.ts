import { Transaction, MonthlySummary, RecurringItem } from "./types";

export function computeMonthlySummary(
  transactions: Transaction[],
  yearMonth?: string
): MonthlySummary {
  const now = new Date();
  const target =
    yearMonth ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const filtered = transactions.filter((t) => t.posted_at.startsWith(target));

  const byCategory: Record<string, number> = {};
  let totalIncome = 0;
  let totalExpenses = 0;

  for (const t of filtered) {
    if (t.is_refund) {
      totalIncome += Math.abs(t.amount);
      const cat = t.category || "Other";
      byCategory[cat] = (byCategory[cat] || 0) - Math.abs(t.amount);
      if (byCategory[cat] < 0) byCategory[cat] = 0;
    } else if (t.amount > 0) {
      totalIncome += t.amount;
      const cat = t.category || "Other";
      byCategory[cat] = (byCategory[cat] || 0) + t.amount;
    } else {
      totalExpenses += Math.abs(t.amount);
      const cat = t.category || "Other";
      byCategory[cat] = (byCategory[cat] || 0) + Math.abs(t.amount);
    }
  }

  return {
    month: target,
    total_income: totalIncome,
    total_expenses: totalExpenses,
    net_cashflow: totalIncome - totalExpenses,
    by_category: byCategory,
  };
}

export function detectRecurring(transactions: Transaction[]): RecurringItem[] {
  const merchantGroups: Record<string, Transaction[]> = {};
  for (const t of transactions) {
    if (t.amount >= 0) continue; // skip income
    const key = (t.merchant || t.description).toLowerCase();
    if (!merchantGroups[key]) merchantGroups[key] = [];
    merchantGroups[key].push(t);
  }

  const recurring: RecurringItem[] = [];

  for (const [, txns] of Object.entries(merchantGroups)) {
    if (txns.length < 2) continue;

    const sorted = txns.sort(
      (a, b) => new Date(a.posted_at).getTime() - new Date(b.posted_at).getTime()
    );

    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const diff =
        (new Date(sorted[i].posted_at).getTime() -
          new Date(sorted[i - 1].posted_at).getTime()) /
        (1000 * 60 * 60 * 24);
      gaps.push(diff);
    }

    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    // Monthly cadence: 25–35 day average gap
    if (avgGap >= 25 && avgGap <= 35 && gaps.length >= 1) {
      const amounts = sorted.map((t) => Math.abs(t.amount));
      const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      // Check amounts are similar (within 20%)
      const allSimilar = amounts.every(
        (a) => Math.abs(a - avgAmount) / avgAmount < 0.2
      );

      if (allSimilar) {
        recurring.push({
          merchant: sorted[0].merchant || sorted[0].description,
          avg_amount: Math.round(avgAmount * 100) / 100,
          frequency_days: Math.round(avgGap),
          occurrences: sorted.length,
          category: sorted[0].category || "Other",
        });
      }
    }
  }

  return recurring.sort((a, b) => b.avg_amount - a.avg_amount);
}

export function computeFinancialScore(
  profileIncome: number,
  totalExpenses: number,
  recentMonthSummaries: MonthlySummary[]
): { score: number; breakdown: { savings_rate: number; volatility: number; runway: number } } {
  // Use profile income if set, otherwise infer from transaction income
  // (average monthly income across months that have income data)
  let monthlyIncome = profileIncome;
  if (monthlyIncome <= 0) {
    const monthsWithIncome = recentMonthSummaries.filter((s) => s.total_income > 0);
    if (monthsWithIncome.length > 0) {
      monthlyIncome = monthsWithIncome.reduce((sum, s) => sum + s.total_income, 0) / monthsWithIncome.length;
    }
  }

  // Also use average expenses across months for a fairer calculation
  const monthsWithExpenses = recentMonthSummaries.filter((s) => s.total_expenses > 0);
  const avgExpenses = monthsWithExpenses.length > 0
    ? monthsWithExpenses.reduce((sum, s) => sum + s.total_expenses, 0) / monthsWithExpenses.length
    : totalExpenses;

  // Savings rate (40 points max)
  const savingsRate = monthlyIncome > 0 ? (monthlyIncome - avgExpenses) / monthlyIncome : 0;
  const savingsScore = Math.min(40, Math.max(0, savingsRate * 200));

  // Expense volatility (30 points max) — lower is better
  const expenses = recentMonthSummaries.map((s) => s.total_expenses).filter((e) => e > 0);
  let volatilityScore = 30;
  if (expenses.length >= 2) {
    const mean = expenses.reduce((a, b) => a + b, 0) / expenses.length;
    const variance =
      expenses.reduce((a, b) => a + (b - mean) ** 2, 0) / expenses.length;
    const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;
    volatilityScore = Math.max(0, 30 - cv * 100);
  }

  // Emergency runway (30 points max)
  const monthlySavings = monthlyIncome - avgExpenses;
  const runway = avgExpenses > 0 ? (monthlySavings * 6) / avgExpenses : 0;
  const runwayScore = Math.min(30, Math.max(0, runway * 10));

  const score = Math.round(
    Math.min(100, Math.max(0, savingsScore + volatilityScore + runwayScore))
  );

  return {
    score,
    breakdown: {
      savings_rate: Math.round(savingsRate * 100),
      volatility: Math.round(volatilityScore),
      runway: Math.round(runwayScore),
    },
  };
}
