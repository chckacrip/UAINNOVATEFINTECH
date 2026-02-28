import { computeMonthlySummary, detectRecurring, computeFinancialScore } from "./summary";
import { detectAnomalies } from "./anomaly";
import { Transaction, MonthlySummary } from "./types";
import { getOpenAI } from "./openai";

export interface DigestData {
  userName: string;
  summary: MonthlySummary;
  previousSummary: MonthlySummary;
  score: number;
  anomalyCount: number;
  recurringTotal: number;
  topCategory: string;
  topCategoryAmount: number;
}

export function buildDigestData(
  transactions: Transaction[],
  monthlyIncome: number,
  userName: string
): DigestData | null {
  if (transactions.length === 0) return null;

  const newestDate = transactions.reduce((latest, t) => {
    const d = new Date(t.posted_at);
    return d > latest ? d : latest;
  }, new Date(transactions[0].posted_at));

  const refMonth = `${newestDate.getFullYear()}-${String(newestDate.getMonth() + 1).padStart(2, "0")}`;
  const prevDate = new Date(newestDate.getFullYear(), newestDate.getMonth() - 1, 1);
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

  const summary = computeMonthlySummary(transactions, refMonth);
  const previousSummary = computeMonthlySummary(transactions, prevMonth);
  const recurring = detectRecurring(transactions);
  const anomalies = detectAnomalies(transactions);

  const months: MonthlySummary[] = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date(newestDate.getFullYear(), newestDate.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push(computeMonthlySummary(transactions, ym));
  }

  const { score } = computeFinancialScore(monthlyIncome, summary.total_expenses, months);
  const recurringTotal = recurring.reduce((s, r) => s + r.avg_amount, 0);

  const cats = Object.entries(summary.by_category).filter(([c]) => c !== "Income").sort((a, b) => b[1] - a[1]);
  const topCategory = cats[0]?.[0] || "None";
  const topCategoryAmount = cats[0]?.[1] || 0;

  return {
    userName,
    summary,
    previousSummary,
    score,
    anomalyCount: anomalies.length,
    recurringTotal,
    topCategory,
    topCategoryAmount,
  };
}

export async function generateDigestEmail(data: DigestData): Promise<{ subject: string; html: string }> {
  const expenseChange = data.previousSummary.total_expenses > 0
    ? ((data.summary.total_expenses - data.previousSummary.total_expenses) / data.previousSummary.total_expenses * 100).toFixed(1)
    : "N/A";

  const openai = getOpenAI();

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.5,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You write brief, friendly weekly financial digest emails. Return JSON with "subject" (string) and "bullets" (string array of 4-6 brief insights).`,
      },
      {
        role: "user",
        content: JSON.stringify({
          name: data.userName,
          month: data.summary.month,
          income: data.summary.total_income,
          expenses: data.summary.total_expenses,
          net: data.summary.net_cashflow,
          score: data.score,
          expense_change_pct: expenseChange,
          top_category: data.topCategory,
          top_category_amount: data.topCategoryAmount,
          anomalies: data.anomalyCount,
          recurring_total: data.recurringTotal,
        }),
      },
    ],
  });

  const text = response.choices[0]?.message?.content ?? "{}";
  let parsed: { subject?: string; bullets?: string[] } = {};
  try { parsed = JSON.parse(text); } catch { /* fallback below */ }

  const subject = parsed.subject || `FinanceCopilot Weekly: ${data.summary.month}`;
  const bullets = parsed.bullets || [
    `You spent $${data.summary.total_expenses.toFixed(0)} this month.`,
    `Your Financial Score is ${data.score}/100.`,
  ];

  const html = `
    <div style="max-width:600px;margin:0 auto;font-family:system-ui,sans-serif;color:#1e293b;">
      <div style="padding:24px;background:#f8fafc;border-radius:12px;">
        <h1 style="font-size:20px;color:#1e293b;margin-bottom:4px;">Your Weekly Financial Digest</h1>
        <p style="color:#64748b;font-size:14px;margin-top:0;">Hi ${data.userName}, here's your week in review.</p>
        
        <div style="display:flex;gap:12px;margin:16px 0;">
          <div style="flex:1;padding:12px;background:white;border-radius:8px;border:1px solid #e2e8f0;text-align:center;">
            <p style="font-size:12px;color:#64748b;margin:0;">Income</p>
            <p style="font-size:18px;font-weight:bold;color:#059669;margin:4px 0 0;">$${data.summary.total_income.toLocaleString()}</p>
          </div>
          <div style="flex:1;padding:12px;background:white;border-radius:8px;border:1px solid #e2e8f0;text-align:center;">
            <p style="font-size:12px;color:#64748b;margin:0;">Expenses</p>
            <p style="font-size:18px;font-weight:bold;color:#dc2626;margin:4px 0 0;">$${data.summary.total_expenses.toLocaleString()}</p>
          </div>
          <div style="flex:1;padding:12px;background:white;border-radius:8px;border:1px solid #e2e8f0;text-align:center;">
            <p style="font-size:12px;color:#64748b;margin:0;">Score</p>
            <p style="font-size:18px;font-weight:bold;color:#2563eb;margin:4px 0 0;">${data.score}/100</p>
          </div>
        </div>
        
        <h2 style="font-size:15px;color:#1e293b;margin-bottom:8px;">Key Insights</h2>
        <ul style="padding-left:20px;margin:0;">
          ${bullets.map((b) => `<li style="color:#475569;font-size:14px;margin-bottom:6px;">${b}</li>`).join("")}
        </ul>
        
        <p style="margin-top:20px;font-size:13px;color:#94a3b8;">
          — FinanceCopilot | <a href="#" style="color:#3b82f6;">Open Dashboard</a>
        </p>
      </div>
    </div>
  `;

  return { subject, html };
}
