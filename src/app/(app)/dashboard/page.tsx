"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Transaction, MonthlySummary, Goal } from "@/lib/types";
import { computeMonthlySummary, detectRecurring, computeFinancialScore } from "@/lib/summary";
import { detectAnomalies } from "@/lib/anomaly";
import { exportToCSV, exportToPrintPDF } from "@/lib/export";
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  RefreshCw,
  AlertTriangle,
  Upload,
  Download,
  Printer,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { SpendingChart } from "@/components/spending-chart";
import { ScoreGauge } from "@/components/score-gauge";
import { TrendChart } from "@/components/trend-chart";
import { BudgetBars } from "@/components/budget-bars";
import { GoalTracker } from "@/components/goal-tracker";

export default function DashboardPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [goals, setGoals] = useState<Goal[]>([]);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [txRes, profileRes] = await Promise.all([
        supabase
          .from("transactions")
          .select("*")
          .eq("user_id", user.id)
          .order("posted_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("monthly_income, budgets, goals")
          .eq("id", user.id)
          .single(),
      ]);

      setTransactions((txRes.data as Transaction[]) ?? []);
      setMonthlyIncome(profileRes.data?.monthly_income ?? 0);
      setBudgets((profileRes.data?.budgets as Record<string, number>) ?? {});
      setGoals((profileRes.data?.goals as Goal[]) ?? []);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="rounded-full bg-slate-100 dark:bg-slate-800 p-4 mb-4">
          <Upload className="h-8 w-8 text-slate-400" />
        </div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No transactions yet</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md">
          Upload your bank statements to see your spending dashboard with AI-powered insights.
        </p>
        <Link href="/upload" className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
          Upload Statements
        </Link>
      </div>
    );
  }

  const newestDate = transactions.reduce((latest, t) => {
    const d = new Date(t.posted_at);
    return d > latest ? d : latest;
  }, new Date(transactions[0].posted_at));

  const refMonth = `${newestDate.getFullYear()}-${String(newestDate.getMonth() + 1).padStart(2, "0")}`;
  const currentSummary = computeMonthlySummary(transactions, refMonth);
  const months: MonthlySummary[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(newestDate.getFullYear(), newestDate.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push(computeMonthlySummary(transactions, ym));
  }

  const recurring = detectRecurring(transactions);
  const anomalies = detectAnomalies(transactions);
  const { score, breakdown } = computeFinancialScore(monthlyIncome, currentSummary.total_expenses, months.slice(0, 3));

  const topMerchants: { name: string; total: number }[] = [];
  const merchantMap: Record<string, number> = {};
  for (const t of transactions.filter((t) => t.amount < 0)) {
    const key = t.merchant || t.description;
    merchantMap[key] = (merchantMap[key] || 0) + Math.abs(t.amount);
  }
  Object.entries(merchantMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .forEach(([name, total]) => topMerchants.push({ name, total }));

  const categoryData = Object.entries(currentSummary.by_category)
    .filter(([cat]) => cat !== "Income")
    .sort((a, b) => b[1] - a[1]);

  const monthlySavings = currentSummary.net_cashflow;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            {currentSummary.month} &middot; {transactions.length} transactions
          </p>
        </div>
        <div className="flex gap-2 no-print">
          <button onClick={() => exportToCSV(transactions)} className="flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
          <button onClick={exportToPrintPDF} className="flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
        </div>
      </div>

      {/* Anomaly Alerts */}
      {anomalies.length > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">Spending Alerts</h3>
          </div>
          <div className="space-y-2">
            {anomalies.slice(0, 3).map((a, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${a.severity === "alert" ? "bg-red-500" : "bg-amber-500"}`} />
                <span className="text-amber-900 dark:text-amber-200">{a.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Income" value={currentSummary.total_income} icon={<TrendingUp className="h-5 w-5 text-emerald-600" />} color="emerald" />
        <SummaryCard label="Expenses" value={currentSummary.total_expenses} icon={<TrendingDown className="h-5 w-5 text-red-500" />} color="red" />
        <SummaryCard label="Net Cashflow" value={currentSummary.net_cashflow} icon={<DollarSign className="h-5 w-5 text-blue-600" />} color={currentSummary.net_cashflow >= 0 ? "emerald" : "red"} />
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
          <ScoreGauge score={score} />
          <div className="mt-2 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Savings {breakdown.savings_rate}% &middot; Stability {breakdown.volatility}/30 &middot; Runway {breakdown.runway}/30
            </p>
          </div>
        </div>
      </div>

      {/* Trend Chart */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Income vs Expenses Trend</h3>
        <TrendChart months={months} />
      </div>

      {/* Charts + Budgets Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Spending by Category</h3>
          <SpendingChart data={categoryData} />
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          {Object.keys(budgets).some((k) => budgets[k] > 0) ? (
            <>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Budget Progress</h3>
              <BudgetBars categorySpending={currentSummary.by_category} budgets={budgets} />
            </>
          ) : (
            <>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Top Merchants</h3>
              <div className="space-y-3">
                {topMerchants.map((m) => {
                  const max = topMerchants[0]?.total || 1;
                  return (
                    <div key={m.name}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[200px]">{m.name}</span>
                        <span className="text-slate-600 dark:text-slate-400">${m.total.toFixed(2)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700">
                        <div className="h-2 rounded-full bg-blue-500" style={{ width: `${(m.total / max) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Goal Tracker */}
      {goals.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Goal Progress</h3>
          <GoalTracker goals={goals} monthlySavings={monthlySavings} />
        </div>
      )}

      {/* Recurring Subscriptions */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
        <div className="flex items-center gap-2 mb-4">
          <RefreshCw className="h-4 w-4 text-blue-600" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Detected Recurring Subscriptions</h3>
        </div>
        {recurring.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700">
                  <th className="text-left py-2 font-medium text-slate-600 dark:text-slate-300">Merchant</th>
                  <th className="text-left py-2 font-medium text-slate-600 dark:text-slate-300">Category</th>
                  <th className="text-right py-2 font-medium text-slate-600 dark:text-slate-300">Avg Amount</th>
                  <th className="text-right py-2 font-medium text-slate-600 dark:text-slate-300">Frequency</th>
                  <th className="text-right py-2 font-medium text-slate-600 dark:text-slate-300">Count</th>
                </tr>
              </thead>
              <tbody>
                {recurring.map((r, i) => (
                  <tr key={i} className="border-b border-slate-50 dark:border-slate-700/50">
                    <td className="py-2.5 text-slate-900 dark:text-white font-medium">{r.merchant}</td>
                    <td className="py-2.5">
                      <span className="rounded-full bg-blue-50 dark:bg-blue-900/30 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">{r.category}</span>
                    </td>
                    <td className="py-2.5 text-right text-slate-700 dark:text-slate-300">${r.avg_amount.toFixed(2)}</td>
                    <td className="py-2.5 text-right text-slate-600 dark:text-slate-400">~{r.frequency_days}d</td>
                    <td className="py-2.5 text-right text-slate-600 dark:text-slate-400">{r.occurrences}x</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <AlertTriangle className="h-4 w-4" />
            No recurring subscriptions detected yet. Upload more months of data for better detection.
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  const colorClasses: Record<string, string> = {
    emerald: "text-emerald-700 dark:text-emerald-400",
    red: "text-red-600 dark:text-red-400",
    blue: "text-blue-700 dark:text-blue-400",
  };
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</span>
        {icon}
      </div>
      <p className={`text-2xl font-bold ${colorClasses[color] || "text-slate-900 dark:text-white"}`}>
        ${Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
    </div>
  );
}
