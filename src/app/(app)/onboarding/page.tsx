"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Goal, GOAL_TYPES, INDUSTRIES, EMPLOYMENT_TYPES, CATEGORIES, RecurringIncomeItem, MerchantRule, BillReminder, ReportSchedule, TransactionRule } from "@/lib/types";
import { getHCOLAnalysis, US_STATES } from "@/lib/hcol";
import {
  Target,
  Plus,
  Trash2,
  Loader2,
  CheckCircle,
  Briefcase,
  MapPin,
  DollarSign,
  TrendingUp,
  Wallet,
  CalendarDays,
  Mail,
  Link2,
} from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";

export default function OnboardingPage() {
  const [monthlyIncome, setMonthlyIncome] = useState<number>(0);
  const [fixedCosts, setFixedCosts] = useState<number>(0);
  const [goals, setGoals] = useState<Goal[]>([
    { type: "other", name: "", target_amount: 0, target_date: "", saved: 0 },
  ]);

  const [jobTitle, setJobTitle] = useState("");
  const [employer, setEmployer] = useState("");
  const [industry, setIndustry] = useState("");
  const [employmentType, setEmploymentType] = useState("full-time");

  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [digestEnabled, setDigestEnabled] = useState(false);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [recurringIncome, setRecurringIncome] = useState<RecurringIncomeItem[]>([]);
  const [newRecurring, setNewRecurring] = useState({ name: "", amount: 0, frequency: "monthly" as "weekly" | "biweekly" | "monthly" });
  const [merchantRules, setMerchantRules] = useState<MerchantRule[]>([]);
  const [newRule, setNewRule] = useState({ pattern: "", category: "Other" });
  const [billReminders, setBillReminders] = useState<BillReminder[]>([]);
  const [budgetRollover, setBudgetRollover] = useState<Record<string, boolean>>({});
  const [reportSchedule, setReportSchedule] = useState<ReportSchedule>({ enabled: false, frequency: "weekly" });
  const [transactionRules, setTransactionRules] = useState<TransactionRule[]>([]);
  const [categoryEmoji, setCategoryEmoji] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showClearTransactionsConfirm, setShowClearTransactionsConfirm] = useState(false);
  const [clearingTransactions, setClearingTransactions] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) {
        setMonthlyIncome(data.monthly_income || 0);
        setFixedCosts(data.fixed_costs || 0);
        if (data.goals && Array.isArray(data.goals) && data.goals.length > 0) {
          setGoals(data.goals as Goal[]);
        }
        setJobTitle(data.job_title || "");
        setEmployer(data.employer || "");
        setIndustry(data.industry || "");
        setEmploymentType(data.employment_type || "full-time");
        setCity(data.city || "");
        setState(data.state || "");
        if (data.budgets && typeof data.budgets === "object") {
          setBudgets(data.budgets as Record<string, number>);
        }
        setDigestEnabled(data.digest_enabled ?? false);
        setCustomCategories(Array.isArray(data.custom_categories) ? data.custom_categories : []);
        setRecurringIncome(Array.isArray(data.recurring_income) ? data.recurring_income as RecurringIncomeItem[] : []);
        setMerchantRules(Array.isArray(data.merchant_rules) ? data.merchant_rules as MerchantRule[] : []);
        setBudgetRollover((data.budget_rollover as Record<string, boolean>) ?? {});
        const rs = data.report_schedule as ReportSchedule | null;
        if (rs && typeof rs.enabled === "boolean") setReportSchedule({ enabled: rs.enabled, frequency: rs.frequency || "weekly" });
        setTransactionRules(Array.isArray(data.transaction_rules) ? data.transaction_rules : []);
        setCategoryEmoji((data.category_emoji as Record<string, string>) ?? {});
      }
      setInitialLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    const loadReminders = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("bill_reminders").select("*").eq("user_id", user.id);
      setBillReminders((data as BillReminder[]) ?? []);
    };
    loadReminders();
  }, []);

  const hcol = useMemo(() => {
    if (!city || !state || !monthlyIncome) return null;
    return getHCOLAnalysis(city, state, monthlyIncome);
  }, [city, state, monthlyIncome]);

  const addGoal = () => {
    setGoals([...goals, { type: "other", name: "", target_amount: 0, target_date: "", saved: 0 }]);
  };

  const removeGoal = (index: number) => {
    setGoals(goals.filter((_, i) => i !== index));
  };

  const updateGoal = (index: number, field: keyof Goal, value: string | number) => {
    const updated = [...goals];
    updated[index] = { ...updated[index], [field]: value };
    setGoals(updated);
  };

  const handleSave = async () => {
    setLoading(true);
    setSaved(false);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const validGoals = goals.filter((g) => g.name.trim());

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: user.id,
      monthly_income: monthlyIncome,
      fixed_costs: fixedCosts,
      goals: validGoals,
      job_title: jobTitle || null,
      employer: employer || null,
      industry: industry || null,
      employment_type: employmentType,
      city: city || null,
      state: state || null,
      budgets,
      digest_enabled: digestEnabled,
      custom_categories: customCategories,
      recurring_income: recurringIncome,
      merchant_rules: merchantRules,
      budget_rollover: budgetRollover,
      report_schedule: reportSchedule,
      transaction_rules: transactionRules,
      category_emoji: categoryEmoji,
      onboarded: true,
      updated_at: new Date().toISOString(),
    });

    if (!profileError) {
      await supabase.from("bill_reminders").delete().eq("user_id", user.id);
      if (billReminders.length > 0) {
        await supabase.from("bill_reminders").insert(
          billReminders.map((b) => ({
            user_id: user.id,
            name: b.name,
            due_day: b.due_day,
            amount: b.amount ?? null,
            category: b.category ?? null,
            reminder_days_before: b.reminder_days_before ?? 3,
          }))
        );
      }
    }

    if (!profileError) {
      setSaved(true);
      setTimeout(() => router.push("/dashboard"), 1200);
    }
    setLoading(false);
  };

  const handleExportData = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [tx, assets, liabilities, profile] = await Promise.all([
      supabase.from("transactions").select("*").eq("user_id", user.id),
      supabase.from("assets").select("*").eq("user_id", user.id),
      supabase.from("liabilities").select("*").eq("user_id", user.id),
      supabase.from("profiles").select("*").eq("id", user.id).single(),
    ]);
    const payload = {
      exported_at: new Date().toISOString(),
      transactions: tx.data ?? [],
      assets: assets.data ?? [],
      liabilities: liabilities.data ?? [],
      profile: profile.data ? { ...profile.data, id: undefined } : null,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "finance-export-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
      </div>
    );
  }

  return (
    <div className="w-full min-h-[calc(100vh-7rem)] flex flex-col">
      <div className="mb-8 flex-shrink-0">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Financial Profile</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Tell us about yourself so we can give personalized, location-aware insights.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch flex-1 min-h-0">
        {/* Job Information */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 h-full flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-4">
            <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Job Information</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Job Title
              </label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                placeholder="Software Engineer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Employer
              </label>
              <input
                type="text"
                value={employer}
                onChange={(e) => setEmployer(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                placeholder="Company name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Industry
              </label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
              >
                <option value="">Select industry...</option>
                {INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Employment Type
              </label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
              >
                {EMPLOYMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 h-full flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Location</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                placeholder="San Francisco"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                State
              </label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
              >
                <option value="">Select state...</option>
                {US_STATES.map((s) => (
                  <option key={s.code} value={s.code}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* HCOL Indicator */}
          {hcol && (
            <div className="mt-4 rounded-lg border border-slate-100 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Cost of Living: {hcol.label}
                </span>
                <span className="ml-auto text-xs font-mono text-slate-500 dark:text-slate-400">
                  Index {hcol.index} / 100
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-white dark:bg-slate-800 p-2.5 border border-slate-200 dark:border-slate-600">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Housing Budget</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    ${hcol.recommended_housing_budget.toLocaleString()}/mo
                  </p>
                </div>
                <div className="rounded-lg bg-white dark:bg-slate-800 p-2.5 border border-slate-200 dark:border-slate-600">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Target Savings</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{hcol.recommended_savings_rate}%</p>
                </div>
                <div className="rounded-lg bg-white dark:bg-slate-800 p-2.5 border border-slate-200 dark:border-slate-600">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">$100 Buys</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">${hcol.adjusted_purchasing_power}</p>
                </div>
              </div>
              {hcol.index >= 140 && (
                <p className="mt-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 rounded px-2 py-1">
                  You&apos;re in a high cost-of-living area. Our AI will factor this into budget recommendations.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Income & Costs */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 h-full flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Income & Costs</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Monthly Income (after tax)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-sm">$</span>
                <input
                  type="number"
                  value={monthlyIncome || ""}
                  onChange={(e) => setMonthlyIncome(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 pl-7 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                  placeholder="5000"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Fixed Monthly Costs
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-sm">$</span>
                <input
                  type="number"
                  value={fixedCosts || ""}
                  onChange={(e) => setFixedCosts(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 pl-7 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                  placeholder="2000"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Custom categories */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 h-full flex flex-col min-h-0">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Custom Categories</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Add your own categories for transactions and budgets.</p>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (newCategory.trim()) { setCustomCategories([...customCategories, newCategory.trim()]); setNewCategory(""); } } }}
              placeholder="e.g. Pet care"
              className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm dark:text-white"
            />
            <button type="button" onClick={() => { if (newCategory.trim()) { setCustomCategories([...customCategories, newCategory.trim()]); setNewCategory(""); } }} className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700">Add</button>
          </div>
          {customCategories.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {customCategories.map((c, i) => (
                <li key={i} className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-700 px-3 py-1 text-sm">
                  {c}
                  <button type="button" onClick={() => setCustomCategories(customCategories.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500">×</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Merchant rules */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 h-full flex flex-col min-h-0">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Merchant rules</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Always categorize transactions containing a keyword as a specific category (e.g. &quot;starbucks&quot; → Dining).</p>
          <div className="flex flex-wrap gap-2 mb-3">
            <input type="text" value={newRule.pattern} onChange={(e) => setNewRule({ ...newRule, pattern: e.target.value })} placeholder="Keyword (e.g. netflix)" className="w-40 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm dark:text-white" />
            <select value={newRule.category} onChange={(e) => setNewRule({ ...newRule, category: e.target.value })} className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-2 text-sm dark:text-white">
              {[...CATEGORIES, ...customCategories].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button type="button" onClick={() => { if (newRule.pattern.trim()) { setMerchantRules([...merchantRules, { pattern: newRule.pattern.trim().toLowerCase(), category: newRule.category }]); setNewRule({ pattern: "", category: "Other" }); } }} className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700">Add</button>
          </div>
          {merchantRules.length > 0 && (
            <ul className="space-y-2">
              {merchantRules.map((rule, i) => (
                <li key={i} className="flex items-center justify-between rounded-lg border border-slate-100 dark:border-slate-700 p-2 text-sm">
                  <span className="text-slate-700 dark:text-slate-300">&quot;{rule.pattern}&quot; → {rule.category}</span>
                  <button type="button" onClick={() => setMerchantRules(merchantRules.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500">Remove</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recurring income (paychecks) */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 h-full flex flex-col min-h-0">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Recurring Income</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Track paychecks for cash flow and savings rate.</p>
          <div className="flex flex-wrap gap-2 mb-3">
            <input type="text" value={newRecurring.name} onChange={(e) => setNewRecurring({ ...newRecurring, name: e.target.value })} placeholder="Name (e.g. Paycheck)" className="w-36 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm dark:text-white" />
            <input type="number" value={newRecurring.amount || ""} onChange={(e) => setNewRecurring({ ...newRecurring, amount: Number(e.target.value) })} placeholder="$" className="w-24 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm dark:text-white" />
            <select value={newRecurring.frequency} onChange={(e) => setNewRecurring({ ...newRecurring, frequency: e.target.value as "weekly" | "biweekly" | "monthly" })} className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-2 text-sm dark:text-white">
              <option value="weekly">Weekly</option>
              <option value="biweekly">Biweekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <button type="button" onClick={() => { if (newRecurring.name && newRecurring.amount) { setRecurringIncome([...recurringIncome, { ...newRecurring }]); setNewRecurring({ name: "", amount: 0, frequency: "monthly" }); } }} className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700">Add</button>
          </div>
          {recurringIncome.length > 0 && (
            <ul className="space-y-2">
              {recurringIncome.map((r, i) => (
                <li key={i} className="flex items-center justify-between rounded-lg border border-slate-100 dark:border-slate-700 p-2 text-sm">
                  <span className="text-slate-700 dark:text-slate-300">{r.name} — ${r.amount.toFixed(0)}/{r.frequency}</span>
                  <button type="button" onClick={() => setRecurringIncome(recurringIncome.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500">Remove</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Financial Goals */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 h-full flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Financial Goals</h2>
            </div>
            <button
              onClick={addGoal}
              className="flex items-center gap-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Goal
            </button>
          </div>

          <div className="space-y-4">
            {goals.map((goal, i) => {
              const goalType = GOAL_TYPES.find((t) => t.value === goal.type) ?? GOAL_TYPES[GOAL_TYPES.length - 1];
              return (
                <div
                  key={i}
                  className="rounded-lg border border-slate-100 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 p-4"
                >
                  <div className="flex gap-3 items-start">
                    <span className="text-xl mt-1 shrink-0">{goalType.icon}</span>
                    <div className="flex-1 space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <select
                          value={goal.type}
                          onChange={(e) => {
                            const selected = GOAL_TYPES.find((t) => t.value === e.target.value);
                            updateGoal(i, "type", e.target.value);
                            if (selected && !goal.name) {
                              updateGoal(i, "name", selected.label);
                            }
                          }}
                          className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                        >
                          {GOAL_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.icon} {t.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={goal.name}
                          onChange={(e) => updateGoal(i, "name", e.target.value)}
                          placeholder="Goal name"
                          className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                        />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-sm">$</span>
                          <input
                            type="number"
                            value={goal.target_amount || ""}
                            onChange={(e) =>
                              updateGoal(i, "target_amount", Number(e.target.value))
                            }
                            placeholder="Target amount"
                            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 pl-7 pr-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                          />
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-sm">$</span>
                          <input
                            type="number"
                            value={goal.saved ?? ""}
                            onChange={(e) => updateGoal(i, "saved", Number(e.target.value) || 0)}
                            placeholder="Saved so far"
                            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 pl-7 pr-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                          />
                        </div>
                        <input
                          type="date"
                          value={goal.target_date}
                          onChange={(e) => updateGoal(i, "target_date", e.target.value)}
                          className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                    {goals.length > 1 && (
                      <button
                        onClick={() => removeGoal(i)}
                        className="mt-1 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Weekly Digest */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 h-full flex flex-col min-h-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">AI Weekly Digest</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Get a weekly email with spending insights and your financial score.</p>
            </div>
            <button
              type="button"
              onClick={() => setDigestEnabled(!digestEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${digestEnabled ? "bg-blue-600 dark:bg-blue-500" : "bg-slate-300 dark:bg-slate-600"}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${digestEnabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
        </div>

        {/* Budget Limits */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 h-full flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Monthly Budget Limits</h2>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Set spending limits per category. Leave at 0 to skip.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {CATEGORIES.filter((c) => c !== "Income").map((cat) => (
              <div key={cat} className="flex items-center gap-3">
                <label className="w-28 text-sm font-medium text-slate-700 dark:text-slate-300 shrink-0">{cat}</label>
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-xs">$</span>
                  <input
                    type="number"
                    value={budgets[cat] || ""}
                    onChange={(e) => setBudgets({ ...budgets, [cat]: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 pl-7 pr-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                    placeholder="0"
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Budget rollover (carry unspent to next month)</p>
            <div className="flex flex-wrap gap-3">
              {CATEGORIES.filter((c) => c !== "Income" && (budgets[c] || 0) > 0).map((cat) => (
                <label key={cat} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!budgetRollover[cat]}
                    onChange={(e) => setBudgetRollover({ ...budgetRollover, [cat]: e.target.checked })}
                    className="rounded border-slate-300 dark:border-slate-600 text-blue-600"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">{cat}</span>
                </label>
              ))}
              {!CATEGORIES.some((c) => c !== "Income" && (budgets[c] || 0) > 0) && (
                <span className="text-xs text-slate-500 dark:text-slate-400">Set budget limits above to enable rollover.</span>
              )}
            </div>
          </div>
        </div>

        {/* Bill reminders */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 h-full flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Bill reminders</h2>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Get reminded when bills are due. We&apos;ll show them on your dashboard.</p>
          <ul className="space-y-2 mb-4">
            {billReminders.map((b, i) => (
              <li key={b.id || i} className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-3 py-2 text-sm">
                <span className="text-slate-900 dark:text-white font-medium">{b.name}</span>
                <span className="text-slate-600 dark:text-slate-400">Due day {b.due_day}{b.amount != null ? ` · $${b.amount}` : ""}</span>
                <button type="button" onClick={() => setBillReminders(billReminders.filter((_, j) => j !== i))} className="p-1 rounded text-slate-400 hover:text-red-600 dark:hover:text-red-400">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              placeholder="Bill name"
              className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm w-32 placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-white"
              id="new-bill-name"
            />
            <input
              type="number"
              min={1}
              max={31}
              placeholder="Due day (1–31)"
              className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm w-28 placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-white"
              id="new-bill-day"
            />
            <input
              type="number"
              step="0.01"
              placeholder="Amount (optional)"
              className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm w-28 placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-white"
              id="new-bill-amount"
            />
            <button
              type="button"
              onClick={() => {
                const nameEl = document.getElementById("new-bill-name") as HTMLInputElement;
                const dayEl = document.getElementById("new-bill-day") as HTMLInputElement;
                const amountEl = document.getElementById("new-bill-amount") as HTMLInputElement;
                const name = nameEl?.value?.trim();
                const day = dayEl?.value ? parseInt(dayEl.value, 10) : 0;
                if (!name || day < 1 || day > 31) return;
                setBillReminders([
                  ...billReminders,
                  { id: crypto.randomUUID(), user_id: "", name, due_day: day, amount: amountEl?.value ? parseFloat(amountEl.value) : undefined, reminder_days_before: 3 },
                ]);
                if (nameEl) nameEl.value = "";
                if (dayEl) dayEl.value = "";
                if (amountEl) amountEl.value = "";
              }}
              className="rounded-lg bg-blue-600 dark:bg-blue-500 px-3 py-2 text-sm text-white hover:bg-blue-700 dark:hover:bg-blue-600"
            >
              <Plus className="h-4 w-4 inline mr-1" /> Add
            </button>
          </div>
        </div>

        {/* Report schedule */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 h-full flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Scheduled reports</h2>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Email digest (when enabled, we&apos;ll send a summary on the chosen frequency).</p>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-700 dark:text-slate-300">Enable scheduled report</span>
            <button
              type="button"
              onClick={() => setReportSchedule({ ...reportSchedule, enabled: !reportSchedule.enabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${reportSchedule.enabled ? "bg-blue-600 dark:bg-blue-500" : "bg-slate-300 dark:bg-slate-600"}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${reportSchedule.enabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
          {reportSchedule.enabled && (
            <div className="mt-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Frequency</label>
              <select
                value={reportSchedule.frequency}
                onChange={(e) => setReportSchedule({ ...reportSchedule, frequency: e.target.value as "weekly" | "monthly" })}
                className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm dark:text-white"
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          )}
        </div>

        {/* Transaction rules */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 h-full flex flex-col min-h-0">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Transaction rules</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">When a transaction matches, add a tag or set category. E.g. merchant contains &quot;AMZN&quot; → tag &quot;work&quot;.</p>
          <ul className="space-y-2 mb-3">
            {transactionRules.map((r, i) => (
              <li key={r.id} className="flex justify-between items-center text-sm rounded-lg bg-slate-50 dark:bg-slate-700/50 px-3 py-2">
                <span className="text-slate-700 dark:text-slate-300">{r.condition.merchantPattern || r.condition.category || "—"} → {r.action.addTag || r.action.setCategory || "—"}</span>
                <button type="button" onClick={() => setTransactionRules(transactionRules.filter((_, j) => j !== i))} className="p-1 text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <input type="text" placeholder="Merchant contains" id="tr-pattern" className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2.5 py-1.5 text-sm w-32 dark:text-white" />
            <input type="text" placeholder="Add tag" id="tr-tag" className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2.5 py-1.5 text-sm w-24 dark:text-white" />
            <button type="button" onClick={() => { const p = (document.getElementById("tr-pattern") as HTMLInputElement)?.value?.trim(); const tag = (document.getElementById("tr-tag") as HTMLInputElement)?.value?.trim(); if (!p || !tag) return; setTransactionRules([...transactionRules, { id: crypto.randomUUID(), condition: { merchantPattern: p }, action: { addTag: tag } }]); (document.getElementById("tr-pattern") as HTMLInputElement).value = ""; (document.getElementById("tr-tag") as HTMLInputElement).value = ""; }} className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-sm text-white">Add</button>
          </div>
        </div>

        {/* Category emoji */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 h-full flex flex-col min-h-0">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Category emoji</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Optional emoji for each category (e.g. 🍽️ for Dining).</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.filter((c) => c !== "Income").map((cat) => (
              <label key={cat} className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-600 px-2.5 py-1.5 text-sm">
                <input type="text" value={categoryEmoji[cat] ?? ""} onChange={(e) => setCategoryEmoji({ ...categoryEmoji, [cat]: e.target.value.slice(0, 2) })} className="w-8 bg-transparent text-center outline-none dark:text-white" placeholder="—" maxLength={2} />
                <span className="text-slate-700 dark:text-slate-300">{cat}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Link bank (Plaid placeholder) */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 h-full flex flex-col min-h-0 opacity-90">
          <div className="flex items-center gap-2 mb-2">
            <Link2 className="h-5 w-5 text-slate-400 dark:text-slate-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Link bank account</h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Connect your bank via Plaid to import transactions automatically. (Coming soon)</p>
        </div>

        {/* Export / Import */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 h-full flex flex-col min-h-0">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Backup & restore</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Export your data as JSON or restore from a previous export.</p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleExportData()}
              className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Download JSON
            </button>
            <label className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer">
              Restore from JSON
              <input type="file" accept=".json,application/json" className="hidden" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const text = await file.text();
                try {
                  const data = JSON.parse(text);
                  if (!data.transactions && !data.profile) { alert("Invalid backup file."); return; }
                  if (!window.confirm(`Restore ${data.transactions?.length ?? 0} transactions, ${data.assets?.length ?? 0} assets, ${data.liabilities?.length ?? 0} liabilities? This will add to your existing data.`)) return;
                  const supabase = createClient();
                  const { data: { user } } = await supabase.auth.getUser();
                  if (!user) return;
                  if (data.transactions?.length) {
                    const rows = data.transactions.map((t: Record<string, unknown>) => ({ ...t, user_id: user.id, id: undefined }));
                    await supabase.from("transactions").insert(rows);
                  }
                  if (data.assets?.length) {
                    const rows = data.assets.map((a: Record<string, unknown>) => ({ ...a, user_id: user.id, id: undefined }));
                    await supabase.from("assets").insert(rows);
                  }
                  if (data.liabilities?.length) {
                    const rows = data.liabilities.map((l: Record<string, unknown>) => ({ ...l, user_id: user.id, id: undefined }));
                    await supabase.from("liabilities").insert(rows);
                  }
                  if (data.profile && typeof data.profile === "object") {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- omit id when restoring profile
                    const { id, ...rest } = data.profile as Record<string, unknown>;
                    await supabase.from("profiles").update(rest).eq("id", user.id);
                  }
                  alert("Restore complete. Refresh the page.");
                  window.location.reload();
                } catch { alert("Invalid JSON or restore failed."); }
                e.target.value = "";
              }} />
            </label>
          </div>
        </div>

        <div className="md:col-span-2 lg:col-span-3">
          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 dark:bg-blue-500 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <CheckCircle className="h-4 w-4" />
            ) : null}
            {saved ? "Saved! Redirecting..." : "Save & Continue"}
          </button>
        </div>

        <div className="md:col-span-2 lg:col-span-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setShowClearTransactionsConfirm(true)}
            disabled={clearingTransactions}
            className="w-full rounded-lg border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {clearingTransactions ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Clear all transactions
          </button>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 text-center">
            Permanently delete every transaction in your account. This cannot be undone.
          </p>
        </div>
      </div>

      <ConfirmDialog
        open={showClearTransactionsConfirm}
        title="Clear all transactions?"
        message="This will permanently delete every transaction in your account. This cannot be undone."
        confirmLabel="Clear all"
        onConfirm={async () => {
          setShowClearTransactionsConfirm(false);
          setClearingTransactions(true);
          try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              const { error } = await supabase.from("transactions").delete().eq("user_id", user.id);
              if (error) throw error;
            }
          } catch (e) {
            alert("Failed to clear transactions: " + (e instanceof Error ? e.message : String(e)));
          }
          setClearingTransactions(false);
        }}
        onCancel={() => setShowClearTransactionsConfirm(false)}
      />
    </div>
  );
}
