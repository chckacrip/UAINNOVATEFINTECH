"use client";

import { RecurringItem } from "@/lib/types";

interface CashFlowForecastProps {
  recurringBills: RecurringItem[];
  avgMonthlyExpenses: number;
  monthlyIncome: number;
  recurringIncomeMonthly?: number;
}

export function CashFlowForecast({
  recurringBills,
  avgMonthlyExpenses,
  monthlyIncome,
  recurringIncomeMonthly = 0,
}: CashFlowForecastProps) {
  const income = monthlyIncome > 0 ? monthlyIncome : recurringIncomeMonthly;
  const recurringPerMonth = recurringBills.reduce((s, r) => {
    if (r.frequency_days >= 25 && r.frequency_days <= 35) return s + r.avg_amount;
    return s + (r.avg_amount * 30) / Math.max(1, r.frequency_days);
  }, 0);
  const netMonthly = income - recurringPerMonth - avgMonthlyExpenses;

  const periods = [
    { label: "30 days", months: 1 },
    { label: "60 days", months: 2 },
    { label: "90 days", months: 3 },
  ];

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Cash flow forecast</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
        Projected net cash flow (income − recurring bills − avg spending).
      </p>
      <div className="grid grid-cols-3 gap-4">
        {periods.map(({ label, months }) => {
          const projected = netMonthly * months;
          return (
            <div key={label} className="rounded-lg border border-slate-100 dark:border-slate-700 p-3 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
              <p className={`text-lg font-bold ${projected >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                ${(projected >= 0 ? projected : -projected).toFixed(0)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{projected >= 0 ? "surplus" : "shortfall"}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
