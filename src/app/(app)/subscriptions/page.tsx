"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Transaction } from "@/lib/types";
import { detectRecurring } from "@/lib/summary";
import { Loader2, RefreshCw, Check, X } from "lucide-react";

export default function SubscriptionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, "keep" | "cancel" | "">>({});
  const [priceHistory, setPriceHistory] = useState<Record<string, { date: string; amount: number }[]>>({});

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [txRes, profileRes] = await Promise.all([
        supabase.from("transactions").select("*").eq("user_id", user.id).order("posted_at", { ascending: false }),
        supabase.from("profiles").select("subscription_notes, subscription_price_history").eq("id", user.id).single(),
      ]);
      setTransactions((txRes.data as Transaction[]) ?? []);
      setNotes((profileRes.data?.subscription_notes as Record<string, string>) ?? {});
      setPriceHistory((profileRes.data?.subscription_price_history as Record<string, { date: string; amount: number }[]>) ?? {});
      setLoading(false);
    };
    load();
  }, []);

  const recurring = detectRecurring(transactions);
  const totalMonthly = recurring.reduce((s, r) => s + r.avg_amount, 0);

  const priceChangeByMerchant: Record<string, { prev: number; last: number }> = {};
  for (const r of recurring) {
    const txs = transactions
      .filter((t) => t.amount < 0 && (t.merchant || t.description).toLowerCase() === r.merchant.toLowerCase())
      .sort((a, b) => b.posted_at.localeCompare(a.posted_at));
    if (txs.length >= 2) {
      const last = Math.abs(txs[0].amount);
      const prev = Math.abs(txs[1].amount);
      if (Math.abs(last - prev) > 0.01) priceChangeByMerchant[r.merchant] = { prev, last };
    }
  }

  const setNote = async (merchant: string, value: "keep" | "cancel" | "") => {
    const next = { ...notes, [merchant]: value };
    setNotes(next);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("profiles").update({ subscription_notes: next }).eq("id", user.id);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Subscription Audit</h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm">Review recurring charges and mark keep/cancel.</p>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recurring (detected)</h2>
          </div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Total: <span className="text-blue-600 dark:text-blue-400">${totalMonthly.toFixed(2)}/mo</span>
          </p>
        </div>

        {recurring.length === 0 ? (
          <div className="rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 text-sm text-slate-600 dark:text-slate-400">
            <p className="font-medium text-slate-700 dark:text-slate-300 mb-1">No recurring charges detected</p>
            <p>We need at least 2 similar transactions per merchant (about a month apart) to detect subscriptions. Upload more statements or connect your bank to see recurring items here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recurring.map((r, i) => (
              <div key={i} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-100 dark:border-slate-700 p-4">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">{r.merchant}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {r.category} · ~{r.frequency_days}d · ${r.avg_amount.toFixed(2)}/cycle
                    {priceChangeByMerchant[r.merchant] && (
                      <span className="ml-2 text-amber-600 dark:text-amber-400">(Price changed: was ${priceChangeByMerchant[r.merchant].prev.toFixed(2)}, now ${priceChangeByMerchant[r.merchant].last.toFixed(2)})</span>
                    )}
                  </p>
                  {priceHistory[r.merchant]?.length > 0 && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Price history: {priceHistory[r.merchant].map((h) => `${h.date} $${h.amount}`).join(" → ")}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setNote(r.merchant, notes[r.merchant] === "keep" ? "" : "keep")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1 ${notes[r.merchant] === "keep" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300" : "border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400"}`}
                  >
                    <Check className="h-3.5 w-3.5" /> Keep
                  </button>
                  <button
                    onClick={() => setNote(r.merchant, notes[r.merchant] === "cancel" ? "" : "cancel")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1 ${notes[r.merchant] === "cancel" ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300" : "border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400"}`}
                  >
                    <X className="h-3.5 w-3.5" /> Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
