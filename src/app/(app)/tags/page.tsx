"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Transaction } from "@/lib/types";
import Link from "next/link";
import { Tag } from "lucide-react";

export default function TagsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("transactions").select("id, tags, amount").eq("user_id", user.id);
      setTransactions((data as Transaction[]) ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const tagCounts = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    for (const t of transactions) {
      if (!Array.isArray(t.tags)) continue;
      for (const tag of t.tags) {
        const key = tag.trim().toLowerCase();
        if (!key) continue;
        if (!map[key]) map[key] = { count: 0, total: 0 };
        map[key].count += 1;
        map[key].total += Math.abs(t.amount);
      }
    }
    return Object.entries(map).sort((a, b) => b[1].count - a[1].count);
  }, [transactions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="w-full min-h-[calc(100vh-7rem)] flex flex-col space-y-6">
      <div className="flex-shrink-0">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tags</h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm">All tags used on your transactions. Click to filter in Transactions.</p>
      </div>

      {tagCounts.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 text-center">
          <Tag className="h-10 w-10 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600 dark:text-slate-400">No tags yet. Add tags when editing transactions.</p>
          <Link href="/transactions" className="inline-block mt-3 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">Go to Transactions</Link>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Tag</th>
                <th className="text-right py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Transactions</th>
                <th className="text-right py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Total</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {tagCounts.map(([tag, { count, total }]) => (
                <tr key={tag} className="border-b border-slate-50 dark:border-slate-700/50">
                  <td className="py-2.5 px-4 font-medium text-slate-900 dark:text-white">{tag}</td>
                  <td className="py-2.5 px-4 text-right text-slate-600 dark:text-slate-400">{count}</td>
                  <td className="py-2.5 px-4 text-right text-slate-700 dark:text-slate-300">${total.toFixed(2)}</td>
                  <td className="py-2.5 px-2">
                    <Link href={`/transactions?tag=${encodeURIComponent(tag)}`} className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
