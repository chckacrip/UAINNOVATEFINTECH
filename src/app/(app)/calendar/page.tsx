"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Transaction } from "@/lib/types";
import { detectRecurring } from "@/lib/summary";
import Link from "next/link";
import { Loader2, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

export default function CalendarPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(new Date());

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("posted_at", { ascending: false });
      setTransactions((data as Transaction[]) ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const recurring = useMemo(() => detectRecurring(transactions), [transactions]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = useMemo(() => new Date(), []);

  const hasRecurring = recurring.length > 0;
  const billsByDay = useMemo(() => {
    const map: Record<number, { merchant: string; amount: number; category: string }[]> = {};
    for (const r of recurring) {
      const lastOccurrence = transactions.find(
        (t) => (t.merchant || t.description).toLowerCase() === r.merchant.toLowerCase() && t.amount < 0
      );
      if (!lastOccurrence) continue;

      const lastDate = new Date(lastOccurrence.posted_at);
      const nextDate = new Date(lastDate);
      nextDate.setDate(nextDate.getDate() + r.frequency_days);

      // Project forward into the viewed month
      while (nextDate < new Date(year, month, 1)) {
        nextDate.setDate(nextDate.getDate() + r.frequency_days);
      }

      if (nextDate.getMonth() === month && nextDate.getFullYear() === year) {
        const day = nextDate.getDate();
        if (!map[day]) map[day] = [];
        map[day].push({ merchant: r.merchant, amount: r.avg_amount, category: r.category });
      }
    }
    // Also add actual transactions for this month
    for (const t of transactions) {
      const d = new Date(t.posted_at);
      if (d.getMonth() === month && d.getFullYear() === year && t.amount < 0) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        const alreadyThere = map[day].some((b) => b.merchant.toLowerCase() === (t.merchant || "").toLowerCase());
        if (!alreadyThere) {
          map[day].push({ merchant: t.merchant || t.description, amount: Math.abs(t.amount), category: t.category });
        }
      }
    }
    return map;
  }, [recurring, transactions, month, year]);

  const upcomingBills = useMemo(() => {
    const upcoming: { merchant: string; amount: number; day: number; category: string }[] = [];
    const todayDay = today.getMonth() === month && today.getFullYear() === year ? today.getDate() : 0;
    for (let d = todayDay + 1; d <= Math.min(todayDay + 7, daysInMonth); d++) {
      if (billsByDay[d]) {
        for (const b of billsByDay[d]) {
          upcoming.push({ ...b, day: d });
        }
      }
    }
    return upcoming;
  }, [billsByDay, today, month, year, daysInMonth]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }

  if (transactions.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Bill Calendar</h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm">Track recurring bills and upcoming payments.</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 text-center">
          <CalendarDays className="h-12 w-12 text-slate-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No transactions yet</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-4">Upload statements so we can detect recurring bills and show them on the calendar.</p>
          <Link href="/upload" className="inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Upload CSV</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Bill Calendar</h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm">Track recurring bills and upcoming payments.</p>
      </div>

      {upcomingBills.length > 0 && (
        <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
          <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">Upcoming in 7 days</h3>
          <div className="space-y-1.5">
            {upcomingBills.map((b, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-blue-900 dark:text-blue-200">{b.merchant} <span className="text-blue-600 dark:text-blue-400">· Day {b.day}</span></span>
                <span className="font-medium text-blue-900 dark:text-blue-200">${b.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setViewDate(new Date(year, month - 1, 1))} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-700">
            <ChevronLeft className="h-5 w-5 text-slate-600 dark:text-slate-300" />
          </button>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </h2>
          <button onClick={() => setViewDate(new Date(year, month + 1, 1))} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-700">
            <ChevronRight className="h-5 w-5 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-700 rounded-lg overflow-hidden">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="bg-slate-50 dark:bg-slate-800 py-2 text-center text-xs font-medium text-slate-500 dark:text-slate-400">{d}</div>
          ))}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`e-${i}`} className="bg-white dark:bg-slate-800 min-h-[80px]" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const bills = billsByDay[day] || [];
            const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
            return (
              <div key={day} className={`bg-white dark:bg-slate-800 min-h-[80px] p-1.5 ${isToday ? "ring-2 ring-blue-500 ring-inset" : ""}`}>
                <span className={`text-xs font-medium ${isToday ? "text-blue-600" : "text-slate-600 dark:text-slate-400"}`}>{day}</span>
                <div className="mt-1 space-y-0.5">
                  {bills.slice(0, 2).map((b, j) => (
                    <div key={j} className="rounded bg-red-50 dark:bg-red-900/30 px-1 py-0.5 text-[10px] text-red-700 dark:text-red-300 truncate">
                      {b.merchant} ${b.amount.toFixed(0)}
                    </div>
                  ))}
                  {bills.length > 2 && (
                    <span className="text-[10px] text-slate-500">+{bills.length - 2} more</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {recurring.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">All Recurring Bills ({recurring.length})</h3>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {recurring.map((r, i) => (
              <div key={i} className="rounded-lg border border-slate-100 dark:border-slate-700 p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{r.merchant}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{r.category} &middot; ~{r.frequency_days}d cycle</p>
                  </div>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">${r.avg_amount.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
