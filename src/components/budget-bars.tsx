"use client";

interface BudgetBarsProps {
  categorySpending: Record<string, number>;
  budgets: Record<string, number>;
  showBenchmark?: boolean;
  showRemaining?: boolean;
  daysLeftInMonth?: number;
  dayOfMonth?: number;
  daysInMonth?: number;
}

export function BudgetBars({ categorySpending, budgets, showBenchmark, showRemaining, daysLeftInMonth = 0, dayOfMonth = 0, daysInMonth = 30 }: BudgetBarsProps) {
  const categories = Object.keys(budgets).filter((k) => budgets[k] > 0);

  if (categories.length === 0) return null;

  return (
    <div className="space-y-3">
      {categories.map((cat) => {
        const limit = budgets[cat];
        const spent = categorySpending[cat] || 0;
        const remaining = Math.max(0, limit - spent);
        const pct = Math.min(100, (spent / limit) * 100);
        const over = spent > limit;
        const under = spent < limit && showBenchmark;
        const onTrack = showBenchmark && daysInMonth > 0 && dayOfMonth >= Math.floor(daysInMonth / 2) && pct < 50;

        return (
          <div key={cat}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5">
                {cat}
                {onTrack && <span className="rounded bg-emerald-100 dark:bg-emerald-900/30 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">On track</span>}
              </span>
              <span className={`text-xs font-medium ${over ? "text-red-600" : under ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}`}>
                ${spent.toFixed(0)} / ${limit.toFixed(0)}
                {showRemaining && remaining >= 0 && ` · $${remaining.toFixed(0)} left`}
                {showRemaining && daysLeftInMonth > 0 && remaining > 0 && ` · $${(remaining / daysLeftInMonth).toFixed(0)}/day`}
                {over && ` (+$${(spent - limit).toFixed(0)})`}
                {under && !showRemaining && ` (Under by $${(limit - spent).toFixed(0)})`}
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-700">
              <div
                className={`h-2.5 rounded-full transition-all ${
                  pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-emerald-500"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
