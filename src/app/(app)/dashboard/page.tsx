"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Transaction, MonthlySummary, Goal, BillReminder } from "@/lib/types";
import { computeMonthlySummary, detectRecurring, computeFinancialScore } from "@/lib/summary";
import { detectAnomalies } from "@/lib/anomaly";
import { exportToCSV, exportToPrintPDF, exportMonthlyReportPDF } from "@/lib/export";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  RefreshCw,
  AlertTriangle,
  Upload,
  Download,
  Printer,
  ShieldAlert,
  CalendarDays,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Link from "next/link";
import { SpendingChart } from "@/components/spending-chart";
import { ScoreGauge } from "@/components/score-gauge";
import { TrendChart } from "@/components/trend-chart";
import { BudgetBars } from "@/components/budget-bars";
import { GoalTracker } from "@/components/goal-tracker";
import { CashFlowForecast } from "@/components/cash-flow-forecast";
import { OnboardingChecklist } from "@/components/onboarding-checklist";
import { OnboardingTour } from "@/components/onboarding-tour";
import { DashboardSkeleton } from "@/components/skeleton";
import { MoneyStoryCard } from "@/components/money-story-card";

export default function DashboardPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [goals, setGoals] = useState<Goal[]>([]);
  const [recurringIncomeMonthly, setRecurringIncomeMonthly] = useState(0);
  const [recurringIncomeList, setRecurringIncomeList] = useState<{ name: string; amount: number; frequency: string }[]>([]);
  const [billReminders, setBillReminders] = useState<BillReminder[]>([]);
  const [budgetRollover, setBudgetRollover] = useState<Record<string, boolean>>({});
  type DatePreset = "this_month" | "last_30" | "last_3mo";
  const [datePreset, setDatePreset] = useState<DatePreset>("this_month");
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const toggleSection = (id: string) => setCollapsedSections((s) => ({ ...s, [id]: !s[id] }));

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        router.replace("/login");
        return;
      }

      const [txRes, profileRes, remindersRes] = await Promise.all([
        supabase
          .from("transactions")
          .select("*")
          .eq("user_id", user.id)
          .order("posted_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("monthly_income, budgets, goals, recurring_income, budget_rollover")
          .eq("id", user.id)
          .single(),
        supabase.from("bill_reminders").select("*").eq("user_id", user.id),
      ]);

      setTransactions((txRes.data as Transaction[]) ?? []);
      setMonthlyIncome(profileRes.data?.monthly_income ?? 0);
      setBudgets((profileRes.data?.budgets as Record<string, number>) ?? {});
      setGoals((profileRes.data?.goals as Goal[]) ?? []);
      setBudgetRollover((profileRes.data?.budget_rollover as Record<string, boolean>) ?? {});
      setBillReminders((remindersRes.data as BillReminder[]) ?? []);
      const rawRec = (profileRes.data?.recurring_income as { name?: string; amount: number; frequency: string }[]) ?? [];
      const rec = rawRec.map((r) => ({ name: r.name ?? "", amount: r.amount, frequency: r.frequency }));
      setRecurringIncomeList(rec);
      const monthly = rec.reduce((s, r) => {
        if (r.frequency === "weekly") return s + r.amount * (52 / 12);
        if (r.frequency === "biweekly") return s + r.amount * (26 / 12);
        return s + r.amount;
      }, 0);
      setRecurringIncomeMonthly(monthly);
      setLoading(false);
    };
    load();
  }, [router]);

  if (loading) return <DashboardSkeleton />;

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

  const filteredByPreset = (() => {
    const now = new Date(newestDate);
    if (datePreset === "this_month") {
      const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const end = now.toISOString().slice(0, 10);
      return transactions.filter((t) => t.posted_at >= start && t.posted_at <= end);
    }
    if (datePreset === "last_30") {
      const end = now;
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      return transactions.filter((t) => {
        const d = new Date(t.posted_at);
        return d >= start && d <= end;
      });
    }
    const end = now;
    const start = new Date(now);
    start.setMonth(start.getMonth() - 3);
    return transactions.filter((t) => {
      const d = new Date(t.posted_at);
      return d >= start && d <= end;
    });
  })();

  const refMonth = `${newestDate.getFullYear()}-${String(newestDate.getMonth() + 1).padStart(2, "0")}`;
  const currentSummary = computeMonthlySummary(transactions, refMonth);
  const months: MonthlySummary[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(newestDate.getFullYear(), newestDate.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push(computeMonthlySummary(transactions, ym));
  }
  const prevMonthSummary = months[1] ? computeMonthlySummary(transactions, months[1].month) : null;

  const displaySummary = datePreset === "this_month" ? currentSummary : (() => {
    let total_income = 0, total_expenses = 0;
    const by_category: Record<string, number> = {};
    for (const t of filteredByPreset) {
      if (t.amount > 0) total_income += t.amount;
      else total_expenses += Math.abs(t.amount);
      const cat = t.category || "Other";
      by_category[cat] = (by_category[cat] || 0) + (t.amount < 0 ? Math.abs(t.amount) : t.amount);
    }
    return {
      month: datePreset === "last_30" ? "Last 30 days" : "Last 3 months",
      total_income,
      total_expenses,
      net_cashflow: total_income - total_expenses,
      by_category,
    } as MonthlySummary;
  })();

  const prevMonth = months[1];
  const effectiveBudgets = { ...budgets };
  if (prevMonth && Object.keys(budgetRollover).some((c) => budgetRollover[c])) {
    for (const cat of Object.keys(budgetRollover)) {
      if (!budgetRollover[cat] || !budgets[cat]) continue;
      const limit = budgets[cat];
      const spent = prevMonth.by_category[cat] || 0;
      const surplus = Math.max(0, limit - spent);
      effectiveBudgets[cat] = (effectiveBudgets[cat] || 0) + surplus;
    }
  }

  const budgetAlerts = Object.entries(effectiveBudgets)
    .filter(([, limit]) => limit > 0)
    .map(([cat, limit]) => ({ cat, spent: (displaySummary.by_category[cat] || 0), limit }))
    .filter(({ spent, limit }) => limit > 0 && spent / limit >= 0.8)
    .sort((a, b) => b.spent / b.limit - a.spent / a.limit);

  const spendingComparison = prevMonthSummary ? Object.entries(displaySummary.by_category)
    .filter(([c]) => c !== "Income" && (displaySummary.by_category[c] || 0) > 0)
    .map(([cat]) => {
      const curr = displaySummary.by_category[cat] || 0;
      const prev = prevMonthSummary.by_category[cat] || 0;
      const pct = prev > 0 ? ((curr - prev) / prev) * 100 : 0;
      return { category: cat, current: curr, previous: prev, pctChange: pct };
    })
    .filter((x) => Math.abs(x.pctChange) >= 5)
    .sort((a, b) => Math.abs(b.pctChange) - Math.abs(a.pctChange))
    .slice(0, 5) : [];

  const topMerchants: { name: string; total: number }[] = [];
  const merchantMap: Record<string, number> = {};
  for (const t of filteredByPreset.filter((t) => t.amount < 0)) {
    const key = t.merchant || t.description;
    merchantMap[key] = (merchantMap[key] || 0) + Math.abs(t.amount);
  }
  Object.entries(merchantMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .forEach(([name, total]) => topMerchants.push({ name, total }));

  const prevMerchants: Record<string, number> = {};
  if (prevMonthSummary) {
    const prevMonthTxs = transactions.filter((t) => t.posted_at.startsWith(months[1]?.month || ""));
    for (const t of prevMonthTxs.filter((t) => t.amount < 0)) {
      const key = t.merchant || t.description;
      prevMerchants[key] = (prevMerchants[key] || 0) + Math.abs(t.amount);
    }
  }
  const whatChangedNew = Object.keys(merchantMap).filter((m) => !prevMerchants[m]).slice(0, 5);

  const recurring = detectRecurring(transactions);
  const anomalies = detectAnomalies(transactions);
  const { score, breakdown } = computeFinancialScore(monthlyIncome, currentSummary.total_expenses, months.slice(0, 3));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const dueThisWeek: { merchant: string; amount: number; dueDate: Date }[] = [];
  for (const r of recurring) {
    const lastTx = transactions.find((t) => t.amount < 0 && (t.merchant || t.description).toLowerCase() === r.merchant.toLowerCase());
    if (!lastTx) continue;
    const lastDate = new Date(lastTx.posted_at);
    lastDate.setHours(0, 0, 0, 0);
    const nextDue = new Date(lastDate);
    nextDue.setDate(nextDue.getDate() + r.frequency_days);
    if (nextDue >= today && nextDue <= nextWeek) dueThisWeek.push({ merchant: r.merchant, amount: r.avg_amount, dueDate: nextDue });
  }
  dueThisWeek.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  const billRemindersDue: { name: string; amount?: number; dueDate: Date; daysLeft: number }[] = [];
  const now = new Date();
  for (let d = 0; d < 7; d++) {
    const check = new Date(now);
    check.setDate(check.getDate() + d);
    const day = check.getDate();
    for (const b of billReminders) {
      if (b.due_day !== day) continue;
      billRemindersDue.push({
        name: b.name,
        amount: b.amount ?? undefined,
        dueDate: new Date(check),
        daysLeft: d,
      });
    }
  }
  billRemindersDue.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  const sameMonthLastYear = computeMonthlySummary(transactions, `${newestDate.getFullYear() - 1}-${String(newestDate.getMonth() + 1).padStart(2, "0")}`);
  const yoyIncomeChange = sameMonthLastYear.total_income > 0 ? ((currentSummary.total_income - sameMonthLastYear.total_income) / sameMonthLastYear.total_income) * 100 : 0;
  const yoyExpenseChange = sameMonthLastYear.total_expenses > 0 ? ((currentSummary.total_expenses - sameMonthLastYear.total_expenses) / sameMonthLastYear.total_expenses) * 100 : 0;

  const categoryData = Object.entries(displaySummary.by_category)
    .filter(([cat]) => cat !== "Income")
    .sort((a, b) => b[1] - a[1]);

  const monthlySavings = displaySummary.net_cashflow;
  const avgMonthlyExpenses = months.slice(0, 3).reduce((s, m) => s + m.total_expenses, 0) / Math.max(1, months.filter((m) => m.total_expenses > 0).length) || currentSummary.total_expenses;
  const categoryTrendMonths = months.slice(0, 6).reverse();
  const savingsRateByMonth = categoryTrendMonths.map((m) => ({
    month: m.month,
    rate: m.total_income > 0 ? ((m.total_income - m.total_expenses) / m.total_income) * 100 : 0,
  }));

  const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay());
  const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(startOfWeek.getDate() + 6);
  const weekTx = transactions.filter((t) => t.posted_at >= startOfWeek.toISOString().slice(0, 10) && t.posted_at <= endOfWeek.toISOString().slice(0, 10));
  const weekIncome = weekTx.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const weekExpenses = weekTx.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  const nextPayRecurring: { name: string; amount: number; when: string }[] = [];
  for (const r of recurringIncomeList) {
    if (r.frequency === "weekly") nextPayRecurring.push({ name: r.name || "Pay", amount: r.amount, when: "this week" });
    else if (r.frequency === "biweekly") nextPayRecurring.push({ name: r.name || "Pay", amount: r.amount, when: "every 2 weeks" });
    else nextPayRecurring.push({ name: r.name || "Pay", amount: r.amount, when: "this month" });
  }

  return (
    <div className="space-y-6">
      <OnboardingTour />
      <OnboardingChecklist
        hasIncome={monthlyIncome > 0 || recurringIncomeMonthly > 0}
        hasTransactions={transactions.length > 0}
        hasGoal={goals.length > 0 && goals.some((g) => g.target_amount > 0)}
      />
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            {displaySummary.month} &middot; {filteredByPreset.length} transactions
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(["this_month", "last_30", "last_3mo"] as DatePreset[]).map((preset) => (
            <button
              key={preset}
              onClick={() => setDatePreset(preset)}
              className={`rounded-lg px-3 py-2.5 sm:py-1.5 text-xs font-medium transition-colors touch-manipulation min-h-[44px] sm:min-h-0 ${
                datePreset === preset
                  ? "bg-blue-600 text-white dark:bg-blue-500"
                  : "border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
            >
              {preset === "this_month" ? "This month" : preset === "last_30" ? "Last 30 days" : "Last 3 months"}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 no-print">
          <button onClick={() => exportToCSV(transactions)} className="flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2.5 sm:py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors touch-manipulation min-h-[44px] sm:min-h-0">
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
          <button onClick={() => exportMonthlyReportPDF(displaySummary, goals.map((g) => ({ ...g, saved: 0 })))} className="flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2.5 sm:py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors touch-manipulation min-h-[44px] sm:min-h-0">
            <Printer className="h-3.5 w-3.5" /> PDF report
          </button>
          <button onClick={exportToPrintPDF} className="flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2.5 sm:py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors touch-manipulation min-h-[44px] sm:min-h-0">
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
        </div>
      </div>

      <MoneyStoryCard />

      {/* Anomaly Alerts */}
      {anomalies.length > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 pt-4 pb-5">
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

      {/* Budget Alerts (80%+) */}
      {budgetAlerts.length > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">Budget limits</h3>
          </div>
          <p className="text-xs text-amber-800 dark:text-amber-200 mb-2">You&apos;ve used 80% or more of your budget in:</p>
          <ul className="space-y-1">
            {budgetAlerts.map(({ cat, spent, limit }) => (
              <li key={cat} className="text-sm text-amber-900 dark:text-amber-200">
                <strong>{cat}</strong> — ${spent.toFixed(0)} / ${limit.toFixed(0)} ({Math.round((spent / limit) * 100)}%)
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Due this week + Bill reminders */}
      {(dueThisWeek.length > 0 || billRemindersDue.length > 0) && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <button type="button" onClick={() => toggleSection("due")} className="flex w-full items-center justify-between mb-2 text-left">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              {collapsedSections["due"] ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronUp className="h-4 w-4 text-slate-400" />}
              <CalendarDays className="h-4 w-4 text-blue-600" />
              Due this week
              {recurring.length > 0 && (
                <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                  ({recurring.length} recurring detected)
                </span>
              )}
            </h3>
            <Link href="/calendar" onClick={(e) => e.stopPropagation()} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">View calendar</Link>
          </button>
          {!collapsedSections["due"] && (
          <ul className="space-y-1.5">
            {dueThisWeek.map((b) => (
              <li key={b.merchant} className="flex justify-between text-sm">
                <span className="text-slate-700 dark:text-slate-300">{b.merchant}</span>
                <span className="text-slate-600 dark:text-slate-400">${b.amount.toFixed(2)} · {b.dueDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
              </li>
            ))}
            {billRemindersDue.map((b) => (
              <li key={b.name + b.dueDate.toISOString()} className="flex justify-between text-sm">
                <span className="text-slate-700 dark:text-slate-300">{b.name}</span>
                <span className="text-slate-600 dark:text-slate-400">
                  {b.amount != null ? `$${b.amount.toFixed(2)} · ` : ""}
                  {b.daysLeft === 0 ? "Today" : b.daysLeft === 1 ? "Tomorrow" : b.dueDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                </span>
              </li>
            ))}
          </ul>
          )}
        </div>
      )}

      {/* Expected income + next pay */}
      {(monthlyIncome > 0 || recurringIncomeMonthly > 0) && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Expected income (this month)</h3>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            ${(monthlyIncome + recurringIncomeMonthly).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {monthlyIncome > 0 && recurringIncomeMonthly > 0 && "Profile income + recurring · "}
            {recurringIncomeMonthly > 0 && `~$${recurringIncomeMonthly.toFixed(0)}/mo from recurring`}
          </p>
          {nextPayRecurring.length > 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Next pay: {nextPayRecurring.map((p) => `$${p.amount.toFixed(0)} (${p.when})`).join(", ")}</p>
          )}
        </div>
      )}

      {/* Weekly cash flow */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">This week</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">In <span className="font-medium text-emerald-600 dark:text-emerald-400">${weekIncome.toFixed(0)}</span> · Out <span className="font-medium text-red-600 dark:text-red-400">${weekExpenses.toFixed(0)}</span></p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Income" value={displaySummary.total_income} icon={<TrendingUp className="h-5 w-5 text-emerald-600" />} color="emerald" />
        <SummaryCard label="Expenses" value={displaySummary.total_expenses} icon={<TrendingDown className="h-5 w-5 text-red-500" />} color="red" />
        <SummaryCard label="Net Cashflow" value={displaySummary.net_cashflow} icon={<DollarSign className="h-5 w-5 text-blue-600" />} color={displaySummary.net_cashflow >= 0 ? "emerald" : "red"} />
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
          <ScoreGauge score={score} />
          <div className="mt-2 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Savings {breakdown.savings_rate}% &middot; Stability {breakdown.volatility}/30 &middot; Runway {breakdown.runway}/30
            </p>
          </div>
        </div>
      </div>

      {/* Trend Chart (12 months) + YoY + Income/Exp table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Income vs Expenses (12 months)</h3>
        <TrendChart months={months} />
        {sameMonthLastYear.total_income > 0 || sameMonthLastYear.total_expenses > 0 ? (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Vs same month last year</p>
            <div className="flex gap-4 text-sm">
              <span className={yoyIncomeChange >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>Income {yoyIncomeChange >= 0 ? "+" : ""}{yoyIncomeChange.toFixed(0)}%</span>
              <span className={yoyExpenseChange <= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>Expenses {yoyExpenseChange >= 0 ? "+" : ""}{yoyExpenseChange.toFixed(0)}%</span>
            </div>
          </div>
        ) : null}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                <th className="text-left py-1.5 font-medium text-slate-600 dark:text-slate-400">Month</th>
                <th className="text-right py-1.5 font-medium text-slate-600 dark:text-slate-400">Income</th>
                <th className="text-right py-1.5 font-medium text-slate-600 dark:text-slate-400">Expenses</th>
                <th className="text-right py-1.5 font-medium text-slate-600 dark:text-slate-400">Net</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) => (
                <tr key={m.month} className="border-b border-slate-50 dark:border-slate-700/50">
                  <td className="py-1.5 text-slate-700 dark:text-slate-300">{m.month}</td>
                  <td className="py-1.5 text-right text-emerald-600 dark:text-emerald-400">${m.total_income.toFixed(0)}</td>
                  <td className="py-1.5 text-right text-red-600 dark:text-red-400">${m.total_expenses.toFixed(0)}</td>
                  <td className={`py-1.5 text-right font-medium ${m.net_cashflow >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>${m.net_cashflow.toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cash flow forecast + Category trends + Savings rate */}
      <div className="grid gap-6 lg:grid-cols-3">
        <CashFlowForecast
          recurringBills={recurring}
          avgMonthlyExpenses={avgMonthlyExpenses}
          monthlyIncome={monthlyIncome}
          recurringIncomeMonthly={recurringIncomeMonthly}
        />
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Category trends (6 months)</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {Object.keys(currentSummary.by_category)
              .filter((c) => c !== "Income")
              .slice(0, 6)
              .map((cat) => {
                const vals = categoryTrendMonths.map((m) => m.by_category[cat] || 0);
                const max = Math.max(...vals, 1);
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-slate-700 dark:text-slate-300 truncate">{cat}</span>
                      <span className="text-slate-500 dark:text-slate-400">${(vals[vals.length - 1] || 0).toFixed(0)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700">
                      <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${((vals[vals.length - 1] || 0) / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Savings rate (6 months)</h3>
          <div className="space-y-2">
            {savingsRateByMonth.map(({ month, rate }) => (
              <div key={month} className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">{month}</span>
                <span className={rate >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>{rate.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Spending comparison + What changed */}
      {(spendingComparison.length > 0 || whatChangedNew.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {spendingComparison.length > 0 && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Spending vs last month</h3>
              <ul className="space-y-2">
                {spendingComparison.map(({ category, pctChange }) => (
                  <li key={category} className="flex justify-between text-sm">
                    <span className="text-slate-700 dark:text-slate-300">{category}</span>
                    <span className={pctChange > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}>
                      {pctChange > 0 ? "+" : ""}{pctChange.toFixed(0)}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {whatChangedNew.length > 0 && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">New merchants this period</h3>
              <ul className="space-y-1">
                {whatChangedNew.map((name) => (
                  <li key={name} className="text-sm text-slate-600 dark:text-slate-400 truncate">{name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Charts + Budgets Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Spending by Category</h3>
          <SpendingChart data={categoryData} />
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          {Object.keys(effectiveBudgets).some((k) => effectiveBudgets[k] > 0) ? (
            <>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Budget Progress</h3>
              <BudgetBars
                categorySpending={displaySummary.by_category}
                budgets={effectiveBudgets}
                showBenchmark
                showRemaining={datePreset === "this_month"}
                daysLeftInMonth={datePreset === "this_month" ? Math.max(0, new Date(newestDate.getFullYear(), newestDate.getMonth() + 1, 0).getDate() - newestDate.getDate()) : 0}
                dayOfMonth={datePreset === "this_month" ? newestDate.getDate() : 0}
                daysInMonth={datePreset === "this_month" ? new Date(newestDate.getFullYear(), newestDate.getMonth() + 1, 0).getDate() : 30}
              />
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
      {goals.length > 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Goal Progress</h3>
          <GoalTracker goals={goals} monthlySavings={monthlySavings} />
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Goals</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Set a target and we&apos;ll track progress from your monthly savings.</p>
          <Link href="/onboarding" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">Add a goal in Settings →</Link>
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
