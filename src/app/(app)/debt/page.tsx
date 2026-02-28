"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Loader2, CreditCard, Snowflake, Flame } from "lucide-react";

interface Liability {
  id: string;
  name: string;
  liability_type: string;
  balance: number;
  interest_rate: number;
  minimum_payment?: number;
}

function monthsToPayoff(balance: number, annualRate: number, monthlyPayment: number): number | null {
  if (monthlyPayment <= 0 || balance <= 0) return null;
  const r = annualRate / 100 / 12;
  if (r <= 0) return Math.ceil(balance / monthlyPayment);
  if (monthlyPayment <= balance * r) return null; // never pays off
  const n = Math.log(1 - (r * balance) / monthlyPayment) / Math.log(1 + r);
  return Math.ceil(-n);
}

export default function DebtPlannerPage() {
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [loading, setLoading] = useState(true);
  const [strategy, setStrategy] = useState<"avalanche" | "snowball">("avalanche");
  const [extraPayment, setExtraPayment] = useState(0);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("liabilities").select("*").eq("user_id", user.id).order("balance", { ascending: false });
      setLiabilities((data as Liability[]) ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const ordered = [...liabilities].sort((a, b) =>
    strategy === "avalanche"
      ? (b.interest_rate || 0) - (a.interest_rate || 0)
      : a.balance - b.balance
  );

  const totalDebt = liabilities.reduce((s, l) => s + l.balance, 0);
  const totalMinPayment = liabilities.reduce((s, l) => s + (l.minimum_payment ?? 0), 0);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;

  if (liabilities.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Debt Payoff Planner</h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm">Avalanche or Snowball. Add debts in Net Worth.</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 text-center">
          <CreditCard className="h-12 w-12 text-slate-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No debts yet</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-4">Add liabilities in Net Worth to see payoff plans and compare avalanche vs snowball.</p>
          <Link href="/net-worth" className="inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Go to Net Worth</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Debt Payoff Planner</h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm">Avalanche (highest rate first) or Snowball (smallest balance first). Add debts in <Link href="/net-worth" className="text-blue-600 dark:text-blue-400 underline">Net Worth</Link>.</p>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Strategy:</span>
          <button
            onClick={() => setStrategy("avalanche")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${strategy === "avalanche" ? "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200" : "border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400"}`}
          >
            <Flame className="h-4 w-4" /> Avalanche (save interest)
          </button>
          <button
            onClick={() => setStrategy("snowball")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${strategy === "snowball" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200" : "border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400"}`}
          >
            <Snowflake className="h-4 w-4" /> Snowball (quick wins)
          </button>
          <div className="flex items-center gap-2 ml-auto">
            <label className="text-sm text-slate-600 dark:text-slate-400">Extra $/mo:</label>
            <input type="number" min={0} value={extraPayment || ""} onChange={(e) => setExtraPayment(Number(e.target.value) || 0)} className="w-24 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1.5 text-sm dark:text-white" />
          </div>
        </div>

        <div className="mb-4 flex justify-between text-sm">
          <span className="text-slate-600 dark:text-slate-400">Total debt: <strong className="text-slate-900 dark:text-white">${totalDebt.toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong></span>
          <span className="text-slate-600 dark:text-slate-400">Min payments: <strong className="text-slate-900 dark:text-white">${totalMinPayment.toFixed(2)}/mo</strong></span>
        </div>

        {ordered.length === 0 ? (
          <div className="rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 text-sm text-slate-600 dark:text-slate-400">
            <p className="font-medium text-slate-700 dark:text-slate-300 mb-1">No debts yet</p>
            <p>Add liabilities in <Link href="/net-worth" className="text-blue-600 dark:text-blue-400 hover:underline">Net Worth</Link> (with balance, interest rate, and minimum payment) to see your payoff order and estimated dates.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {ordered.map((debt, i) => {
              const minP = debt.minimum_payment ?? 0;
              const payment = minP + (i === 0 ? extraPayment : 0);
              const months = monthsToPayoff(debt.balance, debt.interest_rate || 0, payment);
              const payoffDate = months ? (() => { const d = new Date(); d.setMonth(d.getMonth() + months); return d.toLocaleDateString("en-US", { month: "short", year: "numeric" }); })() : "—";
              return (
                <div key={debt.id} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-100 dark:border-slate-700 p-4">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{debt.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{debt.liability_type.replace("_", " ")} · {debt.interest_rate}% APR · Min ${minP.toFixed(2)}/mo</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-red-600 dark:text-red-400">${debt.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Payoff: {payoffDate}{months != null ? ` (${months} mo)` : ""}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
