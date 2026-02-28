"use client";

interface BudgetBarsProps {
  categorySpending: Record<string, number>;
  budgets: Record<string, number>;
}

export function BudgetBars({ categorySpending, budgets }: BudgetBarsProps) {
  const categories = Object.keys(budgets).filter((k) => budgets[k] > 0);

  if (categories.length === 0) return null;

  return (
    <div className="space-y-3">
      {categories.map((cat) => {
        const limit = budgets[cat];
        const spent = categorySpending[cat] || 0;
        const pct = Math.min(100, (spent / limit) * 100);
        const over = spent > limit;

        return (
          <div key={cat}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-slate-700 dark:text-slate-300 font-medium">{cat}</span>
              <span className={`text-xs font-medium ${over ? "text-red-600" : "text-slate-500 dark:text-slate-400"}`}>
                ${spent.toFixed(0)} / ${limit.toFixed(0)}
                {over && ` (+$${(spent - limit).toFixed(0)})`}
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
