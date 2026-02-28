"use client";

import { Goal, GOAL_TYPES } from "@/lib/types";

interface GoalTrackerProps {
  goals: Goal[];
  monthlySavings: number;
}

export function GoalTracker({ goals, monthlySavings }: GoalTrackerProps) {
  if (goals.length === 0) return null;

  return (
    <div className="space-y-3">
      {goals.filter((g) => g.name && g.target_amount > 0).map((goal, i) => {
        const goalType = GOAL_TYPES.find((t) => t.value === goal.type) ?? GOAL_TYPES[GOAL_TYPES.length - 1];
        const targetDate = goal.target_date ? new Date(goal.target_date) : null;
        const now = new Date();
        const monthsLeft = targetDate
          ? Math.max(1, (targetDate.getFullYear() - now.getFullYear()) * 12 + targetDate.getMonth() - now.getMonth())
          : 12;

        const savedSoFar = goal.saved ?? 0;
        const neededPerMonth = Math.max(1, (goal.target_amount - savedSoFar) / monthsLeft);
        const projectedTotal = savedSoFar + (monthlySavings > 0 ? monthlySavings * monthsLeft : 0);
        const progress = Math.min(100, Math.max(0, (projectedTotal / goal.target_amount) * 100));
        const onTrack = monthlySavings >= neededPerMonth;

        return (
          <div key={i} className="rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{goalType.icon}</span>
                <span className="text-sm font-semibold text-slate-900 dark:text-white">{goal.name}</span>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                onTrack
                  ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                  : "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
              }`}>
                {onTrack ? "On Track" : "Behind"}
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 mb-2">
              <div
                className={`h-2 rounded-full transition-all ${onTrack ? "bg-emerald-500" : "bg-amber-500"}`}
                style={{ width: `${Math.min(100, progress)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Need ${neededPerMonth.toFixed(0)}/mo</span>
              <span>${(savedSoFar).toLocaleString()} saved → ${goal.target_amount.toLocaleString()}</span>
              {targetDate && <span>{monthsLeft} mo left</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
