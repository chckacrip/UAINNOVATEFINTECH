"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Transaction, CATEGORIES } from "@/lib/types";
import {
  Loader2,
  Search,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
} from "lucide-react";
import Link from "next/link";

type SortKey = "posted_at" | "amount" | "merchant" | "category";
type SortDir = "asc" | "desc";
const PAGE_SIZE = 50;

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("posted_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);

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

  const filtered = useMemo(() => {
    let result = [...transactions];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          t.merchant?.toLowerCase().includes(q)
      );
    }
    if (categoryFilter) {
      result = result.filter((t) => t.category === categoryFilter);
    }
    if (dateFrom) {
      result = result.filter((t) => t.posted_at >= dateFrom);
    }
    if (dateTo) {
      result = result.filter((t) => t.posted_at <= dateTo);
    }
    if (amountMin) {
      result = result.filter((t) => t.amount >= parseFloat(amountMin));
    }
    if (amountMax) {
      result = result.filter((t) => t.amount <= parseFloat(amountMax));
    }

    result.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "posted_at") cmp = a.posted_at.localeCompare(b.posted_at);
      else if (sortKey === "amount") cmp = a.amount - b.amount;
      else if (sortKey === "merchant") cmp = (a.merchant || "").localeCompare(b.merchant || "");
      else if (sortKey === "category") cmp = (a.category || "").localeCompare(b.category || "");
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [transactions, search, categoryFilter, dateFrom, dateTo, amountMin, amountMax, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  useEffect(() => { setPage(0); }, [search, categoryFilter, dateFrom, dateTo, amountMin, amountMax]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronDown className="h-3 w-3 opacity-30" />;
    return sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="rounded-full bg-slate-100 p-4 mb-4">
          <FileText className="h-8 w-8 text-slate-400" />
        </div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">No transactions yet</h2>
        <p className="text-slate-600 mb-6">Upload your bank statements to see transactions here.</p>
        <Link href="/upload" className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
          Upload Statements
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Transactions</h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm">{transactions.length} total transactions</p>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search merchant or description..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 pl-10 pr-4 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none dark:text-white"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm focus:border-blue-500 outline-none dark:text-white"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-2 text-sm outline-none dark:text-white" />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-2 text-sm outline-none dark:text-white" />
          </div>
        </div>
        <div className="flex gap-3 mt-3">
          <input type="number" value={amountMin} onChange={(e) => setAmountMin(e.target.value)} placeholder="Min $" className="w-28 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm outline-none dark:text-white" />
          <input type="number" value={amountMax} onChange={(e) => setAmountMax(e.target.value)} placeholder="Max $" className="w-28 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm outline-none dark:text-white" />
          <span className="text-sm text-slate-500 dark:text-slate-400 self-center ml-auto">
            {filtered.length} results
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                {([
                  ["posted_at", "Date"],
                  ["merchant", "Merchant"],
                  ["category", "Category"],
                  ["amount", "Amount"],
                ] as [SortKey, string][]).map(([key, label]) => (
                  <th
                    key={key}
                    onClick={() => toggleSort(key)}
                    className={`py-3 px-4 font-medium text-slate-600 dark:text-slate-300 cursor-pointer hover:text-slate-900 dark:hover:text-white select-none ${key === "amount" ? "text-right" : "text-left"}`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {label}
                      <SortIcon col={key} />
                    </span>
                  </th>
                ))}
                <th className="py-3 px-4 text-left font-medium text-slate-600 dark:text-slate-300">Description</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((t) => (
                <tr key={t.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300 whitespace-nowrap">{t.posted_at}</td>
                  <td className="py-2.5 px-4 text-slate-900 dark:text-white font-medium truncate max-w-[180px]">{t.merchant || "—"}</td>
                  <td className="py-2.5 px-4">
                    <span className="rounded-full bg-blue-50 dark:bg-blue-900/30 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
                      {t.category}
                    </span>
                  </td>
                  <td className={`py-2.5 px-4 text-right font-medium whitespace-nowrap ${t.amount >= 0 ? "text-emerald-600" : "text-slate-900 dark:text-white"}`}>
                    {t.amount >= 0 ? "+" : ""}${Math.abs(t.amount).toFixed(2)}
                  </td>
                  <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400 truncate max-w-[220px]">{t.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-700">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Page {page + 1} of {totalPages}
            </span>
            <div className="flex gap-1">
              <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="rounded-lg border border-slate-300 dark:border-slate-600 px-2 py-1 text-sm disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-700">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="rounded-lg border border-slate-300 dark:border-slate-600 px-2 py-1 text-sm disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-700">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
