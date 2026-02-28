"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Transaction, Goal } from "@/lib/types";
import { detectRecurring } from "@/lib/summary";
import Link from "next/link";
import { Search, FileText, RefreshCw, Target } from "lucide-react";

export default function GlobalSearchPage() {
  const [q, setQ] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [txRes, profileRes] = await Promise.all([
        supabase.from("transactions").select("*").eq("user_id", user.id).order("posted_at", { ascending: false }).limit(500),
        supabase.from("profiles").select("goals").eq("id", user.id).single(),
      ]);
      setTransactions((txRes.data as Transaction[]) ?? []);
      setGoals((profileRes.data?.goals as Goal[]) ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const recurring = useMemo(() => detectRecurring(transactions), [transactions]);
  const query = q.trim().toLowerCase();

  const txMatches = useMemo(() => {
    if (!query) return [];
    return transactions.filter(
      (t) =>
        (t.merchant || "").toLowerCase().includes(query) ||
        (t.description || "").toLowerCase().includes(query) ||
        (t.category || "").toLowerCase().includes(query) ||
        (t.notes || "").toLowerCase().includes(query) ||
        (Array.isArray(t.tags) && t.tags.some((tag) => tag.toLowerCase().includes(query)))
    ).slice(0, 15);
  }, [transactions, query]);

  const subMatches = useMemo(() => {
    if (!query) return [];
    return recurring.filter((r) => r.merchant.toLowerCase().includes(query) || (r.category || "").toLowerCase().includes(query)).slice(0, 10);
  }, [recurring, query]);

  const goalMatches = useMemo(() => {
    if (!query) return [];
    return goals.filter((g) => (g.name || "").toLowerCase().includes(query) || (g.type || "").toLowerCase().includes(query)).slice(0, 10);
  }, [goals, query]);

  const hasResults = txMatches.length > 0 || subMatches.length > 0 || goalMatches.length > 0;

  if (loading) return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" /></div>;

  return (
    <div className="space-y-6 w-full max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Search</h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm">Find transactions, subscriptions, and goals.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search..."
          className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
          autoFocus
        />
      </div>

      {!query && (
        <p className="text-sm text-slate-500 dark:text-slate-400">Enter a term to search transactions, recurring subscriptions, and goals.</p>
      )}

      {query && !hasResults && (
        <p className="text-sm text-slate-500 dark:text-slate-400">No results for &quot;{q}&quot;</p>
      )}

      {query && hasResults && (
        <div className="space-y-6">
          {txMatches.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2"><FileText className="h-4 w-4" /> Transactions</h2>
              <ul className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700">
                {txMatches.map((t) => (
                  <li key={t.id}>
                    <Link href={`/transactions?search=${encodeURIComponent(q)}`} className="block px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-sm">
                      <span className="font-medium text-slate-900 dark:text-white">{(t.merchant || t.description).slice(0, 50)}</span>
                      <span className="text-slate-500 dark:text-slate-400 ml-2">${Math.abs(t.amount).toFixed(2)} · {t.posted_at}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {subMatches.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2"><RefreshCw className="h-4 w-4" /> Subscriptions</h2>
              <ul className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700">
                {subMatches.map((r, i) => (
                  <li key={i}>
                    <Link href="/subscriptions" className="block px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-sm">
                      <span className="font-medium text-slate-900 dark:text-white">{r.merchant}</span>
                      <span className="text-slate-500 dark:text-slate-400 ml-2">${r.avg_amount.toFixed(2)}/cycle</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {goalMatches.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2"><Target className="h-4 w-4" /> Goals</h2>
              <ul className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700">
                {goalMatches.map((g, i) => (
                  <li key={i}>
                    <Link href="/dashboard" className="block px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-sm">
                      <span className="font-medium text-slate-900 dark:text-white">{g.name || g.type}</span>
                      <span className="text-slate-500 dark:text-slate-400 ml-2">${(g.saved ?? 0).toFixed(0)} / ${g.target_amount.toFixed(0)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
