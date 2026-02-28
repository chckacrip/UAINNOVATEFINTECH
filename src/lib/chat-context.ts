import { Transaction, MonthlySummary, RecurringItem } from "./types";
import { computeMonthlySummary, detectRecurring } from "./summary";

interface ChatContext {
  summary: {
    current_month: MonthlySummary;
    last_3_months: MonthlySummary[];
    recurring: RecurringItem[];
    top_merchants: { merchant: string; total: number }[];
    largest_transactions: Pick<Transaction, "posted_at" | "description" | "amount" | "category" | "merchant">[];
  };
  relevant_transactions: Pick<Transaction, "posted_at" | "description" | "amount" | "category" | "merchant">[];
}

function getTopMerchants(
  transactions: Transaction[],
  limit = 10
): { merchant: string; total: number }[] {
  const map: Record<string, number> = {};
  for (const t of transactions) {
    if (t.amount >= 0) continue;
    const key = t.merchant || t.description;
    map[key] = (map[key] || 0) + Math.abs(t.amount);
  }
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([merchant, total]) => ({ merchant, total: Math.round(total * 100) / 100 }));
}

function selectRelevantTransactions(
  transactions: Transaction[],
  question: string,
  limit = 50
): Transaction[] {
  const keywords = question
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);

  const scored = transactions.map((t) => {
    let score = 0;
    const text = `${t.description} ${t.merchant} ${t.category}`.toLowerCase();

    for (const kw of keywords) {
      if (text.includes(kw)) score += 10;
    }

    // Boost recent transactions
    const daysAgo =
      (Date.now() - new Date(t.posted_at).getTime()) / (1000 * 60 * 60 * 24);
    if (daysAgo < 7) score += 5;
    else if (daysAgo < 30) score += 3;

    // Boost high-amount transactions
    if (Math.abs(t.amount) > 500) score += 3;
    if (Math.abs(t.amount) > 1000) score += 2;

    return { t, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.t);
}

const pick = (t: Transaction) => ({
  posted_at: t.posted_at,
  description: t.description,
  amount: t.amount,
  category: t.category,
  merchant: t.merchant,
});

export function buildChatContext(
  transactions: Transaction[],
  question: string
): ChatContext {
  // Use newest transaction as reference point so historical data works
  const newest = transactions.reduce((latest, t) => {
    const d = new Date(t.posted_at);
    return d > latest ? d : latest;
  }, new Date(transactions[0]?.posted_at ?? Date.now()));

  const cutoff = new Date(newest);
  cutoff.setMonth(cutoff.getMonth() - 3);
  const last90 = transactions.filter((t) => new Date(t.posted_at) >= cutoff);

  const months: MonthlySummary[] = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date(newest.getFullYear(), newest.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push(computeMonthlySummary(last90, ym));
  }

  const currentMonth = months[0];
  const recurring = detectRecurring(last90);
  const topMerchants = getTopMerchants(last90);
  const largest = [...last90]
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    .slice(0, 10);

  const relevant = selectRelevantTransactions(last90, question);

  return {
    summary: {
      current_month: currentMonth,
      last_3_months: months,
      recurring,
      top_merchants: topMerchants,
      largest_transactions: largest.map(pick),
    },
    relevant_transactions: relevant.map(pick),
  };
}
