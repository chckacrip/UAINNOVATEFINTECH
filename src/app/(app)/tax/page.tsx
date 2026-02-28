"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { estimateTax, FilingStatus } from "@/lib/tax";
import { US_STATES } from "@/lib/hcol";
import { Calculator, DollarSign, Percent, Calendar } from "lucide-react";

export default function TaxPage() {
  const [annualIncome, setAnnualIncome] = useState(0);
  const [filingStatus, setFilingStatus] = useState<FilingStatus>("single");
  const [stateCode, setStateCode] = useState("");
  const [deductions, setDeductions] = useState(0);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("monthly_income, state").eq("id", user.id).single();
      if (data) {
        setAnnualIncome((data.monthly_income || 0) * 12);
        setStateCode(data.state || "");
      }
    };
    load();
  }, []);

  const estimate = useMemo(
    () => annualIncome > 0 ? estimateTax(annualIncome, filingStatus, stateCode, deductions) : null,
    [annualIncome, filingStatus, stateCode, deductions]
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tax Estimator</h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm">Estimate your 2026 federal and state tax liability.</p>
      </div>

      {/* Inputs */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Your Information</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Annual Gross Income</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input type="number" value={annualIncome || ""} onChange={(e) => setAnnualIncome(Number(e.target.value))} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 pl-7 pr-4 py-2.5 text-sm outline-none dark:text-white" placeholder="75000" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Filing Status</label>
            <select value={filingStatus} onChange={(e) => setFilingStatus(e.target.value as FilingStatus)} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2.5 text-sm outline-none dark:text-white">
              <option value="single">Single</option>
              <option value="married">Married Filing Jointly</option>
              <option value="head_of_household">Head of Household</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">State</label>
            <select value={stateCode} onChange={(e) => setStateCode(e.target.value)} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2.5 text-sm outline-none dark:text-white">
              <option value="">Select state...</option>
              {US_STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Additional Deductions</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input type="number" value={deductions || ""} onChange={(e) => setDeductions(Number(e.target.value))} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 pl-7 pr-4 py-2.5 text-sm outline-none dark:text-white" placeholder="0" />
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      {estimate && (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            <ResultCard icon={<DollarSign className="h-5 w-5 text-red-500" />} label="Total Tax" value={`$${estimate.total_tax.toLocaleString()}`} />
            <ResultCard icon={<Percent className="h-5 w-5 text-blue-500" />} label="Effective Rate" value={`${estimate.effective_rate}%`} />
            <ResultCard icon={<Calendar className="h-5 w-5 text-purple-500" />} label="Quarterly Payment" value={`$${estimate.quarterly_payment.toLocaleString()}`} />
            <ResultCard icon={<Calculator className="h-5 w-5 text-emerald-500" />} label="Monthly Set-Aside" value={`$${estimate.monthly_set_aside.toLocaleString()}`} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Tax Breakdown</h3>
              <div className="space-y-3">
                <Row label="Gross Income" value={`$${estimate.gross_income.toLocaleString()}`} />
                <Row label="Standard Deduction" value={`-$${estimate.deduction.toLocaleString()}`} sub />
                <Row label="Taxable Income" value={`$${estimate.taxable_income.toLocaleString()}`} bold />
                <div className="border-t border-slate-100 dark:border-slate-700 pt-3" />
                <Row label="Federal Tax" value={`$${estimate.federal_tax.toLocaleString()}`} />
                <Row label={`State Tax (${stateCode || "avg"})`} value={`$${estimate.state_tax.toLocaleString()}`} />
                <div className="border-t border-slate-100 dark:border-slate-700 pt-3" />
                <Row label="Total Tax" value={`$${estimate.total_tax.toLocaleString()}`} bold />
                <Row label="Take-Home Pay" value={`$${(estimate.gross_income - estimate.total_tax).toLocaleString()}`} bold green />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Federal Bracket Breakdown</h3>
              <div className="space-y-2">
                {estimate.brackets_breakdown.map((b, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-700 dark:text-slate-300">{(b.rate * 100).toFixed(0)}% bracket</span>
                      <span className="text-slate-600 dark:text-slate-400">${b.tax.toLocaleString()} on ${b.taxed_amount.toLocaleString()}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700">
                      <div className="h-2 rounded-full bg-blue-500" style={{ width: `${Math.min(100, (b.tax / estimate.federal_tax) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                Marginal rate: {estimate.marginal_rate}%
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ResultCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
      <div className="flex items-center gap-2 mb-1">{icon}<span className="text-xs font-medium text-slate-600 dark:text-slate-400">{label}</span></div>
      <p className="text-xl font-bold text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

function Row({ label, value, bold, sub, green }: { label: string; value: string; bold?: boolean; sub?: boolean; green?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className={`${bold ? "font-semibold text-slate-900 dark:text-white" : sub ? "text-slate-500 dark:text-slate-400" : "text-slate-700 dark:text-slate-300"}`}>{label}</span>
      <span className={`${bold ? "font-bold" : "font-medium"} ${green ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-white"}`}>{value}</span>
    </div>
  );
}
