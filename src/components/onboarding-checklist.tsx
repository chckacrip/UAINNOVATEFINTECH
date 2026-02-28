"use client";

import Link from "next/link";
import { CheckCircle, Circle, DollarSign, Upload, Target } from "lucide-react";

interface OnboardingChecklistProps {
  hasIncome: boolean;
  hasTransactions: boolean;
  hasGoal: boolean;
}

export function OnboardingChecklist({ hasIncome, hasTransactions, hasGoal }: OnboardingChecklistProps) {
  const items = [
    { done: hasIncome, label: "Add income", href: "/onboarding", icon: DollarSign },
    { done: hasTransactions, label: "Upload or connect bank", href: "/upload", icon: Upload },
    { done: hasGoal, label: "Set a goal", href: "/onboarding", icon: Target },
  ];
  const allDone = items.every((i) => i.done);
  const doneCount = items.filter((i) => i.done).length;
  const total = items.length;

  if (allDone) return null;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Get started</h3>
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{doneCount}/{total}</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 mb-3">
        <div className="h-1.5 rounded-full bg-blue-500 transition-all" style={{ width: `${(doneCount / total) * 100}%` }} />
      </div>
      <ul className="space-y-2">
        {items.map(({ done, label, href, icon: Icon }) => (
          <li key={label}>
            <Link href={href} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400">
              {done ? <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" /> : <Circle className="h-4 w-4 text-slate-400 shrink-0" />}
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className={done ? "line-through text-slate-500 dark:text-slate-400" : ""}>{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
