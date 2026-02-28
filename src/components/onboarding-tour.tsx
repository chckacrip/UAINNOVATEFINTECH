"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, ArrowRight, LayoutDashboard, Upload, Settings } from "lucide-react";

const TOUR_STORAGE_KEY = "financecopilot_tour_done";

export function OnboardingTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const done = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!done) setOpen(true);
  }, []);

  const finish = () => {
    setOpen(false);
    if (typeof window !== "undefined") localStorage.setItem(TOUR_STORAGE_KEY, "1");
  };

  if (!open) return null;

  const steps = [
    { icon: LayoutDashboard, title: "Dashboard", body: "Your spending overview, budgets, and goals in one place.", href: "/dashboard" },
    { icon: Upload, title: "Add transactions", body: "Use Quick add (+) or Upload CSV to import statements.", href: "/upload" },
    { icon: Settings, title: "Settings", body: "Set income, budgets, bill reminders, and more.", href: "/onboarding" },
  ];
  const current = steps[step];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Welcome to FinanceCopilot</h3>
          <button type="button" onClick={finish} className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-lg bg-blue-100 dark:bg-blue-900/30 p-2">
            <current.icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h4 className="font-medium text-slate-900 dark:text-white">{current.title}</h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">{current.body}</p>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <button key={i} type="button" onClick={() => setStep(i)} className={`h-2 rounded-full w-2 ${i === step ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-600"}`} aria-label={`Step ${i + 1}`} />
            ))}
          </div>
          <div className="flex gap-2">
            {step < steps.length - 1 ? (
              <button type="button" onClick={() => setStep(step + 1)} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 flex items-center gap-1">
                Next <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <Link href={current.href} onClick={finish} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700">
                Get started
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
