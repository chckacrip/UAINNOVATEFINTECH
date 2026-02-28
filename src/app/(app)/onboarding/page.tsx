"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Goal, GOAL_TYPES, INDUSTRIES, EMPLOYMENT_TYPES, CATEGORIES } from "@/lib/types";
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
} from "lucide-react";

export default function OnboardingPage() {
  const [monthlyIncome, setMonthlyIncome] = useState<number>(0);
  const [fixedCosts, setFixedCosts] = useState<number>(0);
  const [goals, setGoals] = useState<Goal[]>([
    { type: "other", name: "", target_amount: 0, target_date: "" },
  ]);

  const [jobTitle, setJobTitle] = useState("");
  const [employer, setEmployer] = useState("");
  const [industry, setIndustry] = useState("");
  const [employmentType, setEmploymentType] = useState("full-time");

  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [digestEnabled, setDigestEnabled] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
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
      }
      setInitialLoading(false);
    };
    load();
  }, []);

  const hcol = useMemo(() => {
    if (!city || !state || !monthlyIncome) return null;
    return getHCOLAnalysis(city, state, monthlyIncome);
  }, [city, state, monthlyIncome]);

  const addGoal = () => {
    setGoals([...goals, { type: "other", name: "", target_amount: 0, target_date: "" }]);
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

    const { error } = await supabase.from("profiles").upsert({
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
      onboarded: true,
      updated_at: new Date().toISOString(),
    });

    if (!error) {
      setSaved(true);
      setTimeout(() => router.push("/dashboard"), 1200);
    }
    setLoading(false);
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Financial Profile</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Tell us about yourself so we can give personalized, location-aware insights.
        </p>
      </div>

      <div className="space-y-6">
        {/* Job Information */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
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
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
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
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
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

        {/* Financial Goals */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
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
                      <div className="grid gap-3 sm:grid-cols-2">
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
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
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
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
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
        </div>

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
    </div>
  );
}
