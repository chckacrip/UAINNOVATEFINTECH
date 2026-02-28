"use client";

import { useState, useEffect, useMemo, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Transaction, CATEGORIES, FilterPreset } from "@/lib/types";
import {
  Search,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Edit2,
  X,
  Split,
  Plus,
  Trash2,
  List,
  CalendarDays,
} from "lucide-react";
import Link from "next/link";
import { exportToCSV } from "@/lib/export";
import { TransactionsSkeleton } from "@/components/skeleton";
import { useToast } from "@/contexts/toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { TransactionsCalendarView } from "@/components/transactions-calendar-view";

type SortKey = "posted_at" | "amount" | "merchant" | "category";
type SortDir = "asc" | "desc";
const PAGE_SIZE = 50;

function TransactionsPageContent() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const searchParams = useSearchParams();
  const viewTab = (searchParams.get("view") === "calendar" ? "calendar" : "list") as "list" | "calendar";
  const setViewTab = (v: "list" | "calendar") => {
    const u = new URLSearchParams(searchParams.toString());
    if (v === "list") u.delete("view"); else u.set("view", "calendar");
    window.history.replaceState(null, "", `${window.location.pathname}${u.toString() ? "?" + u.toString() : ""}`);
  };
  const tabActiveClass = (tab: "list" | "calendar") =>
    viewTab === tab ? "bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400";
  const [tagFilter, setTagFilter] = useState("");
  const TAX_TAG = "tax-deductible";
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const setDatePreset = (preset: "this_month" | "last_30" | "last_3mo") => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    if (preset === "this_month") {
      setDateFrom(`${y}-${m}-01`);
      setDateTo(now.toISOString().slice(0, 10));
    } else if (preset === "last_30") {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      setDateFrom(start.toISOString().slice(0, 10));
      setDateTo(now.toISOString().slice(0, 10));
    } else {
      const start = new Date(now);
      start.setMonth(start.getMonth() - 3);
      setDateFrom(start.toISOString().slice(0, 10));
      setDateTo(now.toISOString().slice(0, 10));
    }
  };
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("posted_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editMerchant, setEditMerchant] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [confirmMassRemoveDuplicates, setConfirmMassRemoveDuplicates] = useState(false);
  const { toast } = useToast();
  const [splittingId, setSplittingId] = useState<string | null>(null);
  const [splitRows, setSplitRows] = useState<{ category: string; amount: number }[]>([]);
  const [savingSplit, setSavingSplit] = useState(false);
  const [filterPresets, setFilterPresets] = useState<FilterPreset[]>([]);
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [editAccountId, setEditAccountId] = useState("");
  const [editReceiptUrl, setEditReceiptUrl] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkTag, setBulkTag] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [categoryEmoji, setCategoryEmoji] = useState<Record<string, string>>({});
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [txRes, profileRes, accountsRes] = await Promise.all([
        supabase.from("transactions").select("*").eq("user_id", user.id).order("posted_at", { ascending: false }),
        supabase.from("profiles").select("custom_categories, filter_presets, category_emoji").eq("id", user.id).single(),
        supabase.from("accounts").select("id, name").eq("user_id", user.id),
      ]);
      setTransactions((txRes.data as Transaction[]) ?? []);
      setCustomCategories(Array.isArray(profileRes.data?.custom_categories) ? profileRes.data.custom_categories : []);
      setFilterPresets(Array.isArray(profileRes.data?.filter_presets) ? profileRes.data.filter_presets : []);
      setCategoryEmoji((profileRes.data?.category_emoji as Record<string, string>) ?? {});
      setAccounts((accountsRes.data ?? []).map((r: { id: string; name: string }) => ({ id: r.id, name: r.name })));
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    const tag = searchParams.get("tag");
    if (tag) setTagFilter(tag);
  }, [searchParams]);

  const filtered = useMemo(() => {
    let result = [...transactions];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          t.merchant?.toLowerCase().includes(q) ||
          (t.notes && t.notes.toLowerCase().includes(q)) ||
          (Array.isArray(t.tags) && t.tags.some((tag) => tag.toLowerCase().includes(q)))
      );
    }
    if (categoryFilter) {
      result = result.filter((t) => t.category === categoryFilter);
    }
    if (tagFilter) {
      const tagLower = tagFilter.toLowerCase();
      result = result.filter((t) => Array.isArray(t.tags) && t.tags.some((tag) => tag.trim().toLowerCase() === tagLower || (tagFilter === TAX_TAG && tag.toLowerCase().includes("tax"))));
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
  }, [transactions, search, categoryFilter, tagFilter, dateFrom, dateTo, amountMin, amountMax, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const duplicateGroups = useMemo(() => {
    const key = (t: Transaction) => `${t.posted_at}|${t.amount}|${(t.merchant || t.description || "").toLowerCase().trim().slice(0, 50)}`;
    const map = new Map<string, Transaction[]>();
    for (const t of transactions) {
      const k = key(t);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(t);
    }
    return Array.from(map.values()).filter((g) => g.length > 1);
  }, [transactions]);

  useEffect(() => { setPage(0); }, [search, categoryFilter, tagFilter, dateFrom, dateTo, amountMin, amountMax]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setEditingId(null);
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA" && document.activeElement?.getAttribute("contenteditable") === null) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editingId]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const openEdit = (t: Transaction) => {
    setEditingId(t.id);
    setEditDate(t.posted_at);
    setEditAmount(String(t.amount));
    setEditCategory(t.category);
    setEditMerchant(t.merchant ?? "");
    setEditDescription(t.description ?? "");
    setEditNotes(t.notes ?? "");
    setEditTags(Array.isArray(t.tags) ? t.tags.join(", ") : "");
    setEditAccountId(t.account_id ?? "");
    setEditReceiptUrl(t.receipt_url ?? "");
  };

  const applyPreset = (p: FilterPreset) => {
    if (p.dateFrom) setDateFrom(p.dateFrom);
    if (p.dateTo) setDateTo(p.dateTo);
    if (p.category != null) setCategoryFilter(p.category);
    if (p.tag != null) setTagFilter(p.tag);
    if (p.search != null) setSearch(p.search);
  };

  const saveCurrentAsPreset = async () => {
    const name = window.prompt("Preset name");
    if (!name?.trim()) return;
    const preset: FilterPreset = {
      id: crypto.randomUUID(),
      name: name.trim(),
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      category: categoryFilter || undefined,
      tag: tagFilter || undefined,
      search: search.trim() || undefined,
    };
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const next = [...filterPresets, preset];
    await supabase.from("profiles").update({ filter_presets: next }).eq("id", user.id);
    setFilterPresets(next);
    toast("Preset saved");
  };

  const saveTransaction = async () => {
    if (editingId == null) return;
    const amount = parseFloat(editAmount);
    if (Number.isNaN(amount)) return;
    setSavingNote(true);
    const supabase = createClient();
    const tags = editTags.trim() ? editTags.split(",").map((s) => s.trim()).filter(Boolean) : [];
    await supabase.from("transactions").update({
      posted_at: editDate,
      amount,
      category: editCategory || "Other",
      merchant: editMerchant.trim() || null,
      description: editDescription.trim() || "",
      notes: editNotes.trim() || null,
      tags: tags.length ? tags : null,
      account_id: editAccountId || null,
      receipt_url: editReceiptUrl.trim() || null,
    }).eq("id", editingId);
    setTransactions((prev) => prev.map((t) => (t.id === editingId ? { ...t, posted_at: editDate, amount, category: editCategory || "Other", merchant: editMerchant.trim() || "", description: editDescription.trim(), notes: editNotes.trim() || undefined, tags: tags.length ? tags : undefined, account_id: editAccountId || undefined, receipt_url: editReceiptUrl.trim() || undefined } : t)));
    setEditingId(null);
    toast("Transaction updated");
    setSavingNote(false);
  };

  const removeTransaction = async (id: string) => {
    const t = transactions.find((x) => x.id === id);
    const supabase = createClient();
    await supabase.from("transactions").delete().eq("id", id);
    setTransactions((prev) => prev.filter((x) => x.id !== id));
    setConfirmRemoveId(null);
    if (t) {
      toast("Transaction removed", "success", { undo: async () => {
        await supabase.from("transactions").insert(t);
        setTransactions((prev) => [t as Transaction, ...prev]);
      } });
    } else toast("Transaction removed");
  };

  const idsToRemoveForMassDedupe = useMemo(() => {
    const ids: string[] = [];
    for (const group of duplicateGroups) {
      for (let i = 1; i < group.length; i++) ids.push(group[i].id);
    }
    return ids;
  }, [duplicateGroups]);

  const removeAllDuplicateExtras = async () => {
    if (idsToRemoveForMassDedupe.length === 0) return;
    const supabase = createClient();
    const removed = transactions.filter((t) => idsToRemoveForMassDedupe.includes(t.id));
    for (const id of idsToRemoveForMassDedupe) {
      await supabase.from("transactions").delete().eq("id", id);
    }
    setTransactions((prev) => prev.filter((t) => !idsToRemoveForMassDedupe.includes(t.id)));
    setConfirmMassRemoveDuplicates(false);
    toast(`Removed ${idsToRemoveForMassDedupe.length} duplicate transaction${idsToRemoveForMassDedupe.length === 1 ? "" : "s"}`, "success", { undo: async () => { for (const t of removed) await supabase.from("transactions").insert(t); setTransactions((prev) => [...removed, ...prev]); } });
  };

  const toggleSelect = (id: string) => setSelectedIds((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const selectAllOnPage = () => { if (selectedIds.size === paginated.length) setSelectedIds(new Set()); else setSelectedIds(new Set(paginated.map((t) => t.id))); };
  const bulkApply = async () => {
    if (selectedIds.size === 0) return;
    setBulkSaving(true);
    const supabase = createClient();
    for (const id of Array.from(selectedIds)) {
      const t = transactions.find((x) => x.id === id);
      if (!t) continue;
      const updates: Record<string, unknown> = {};
      if (bulkCategory) updates.category = bulkCategory;
      if (bulkTag.trim()) {
        const tags = Array.isArray(t.tags) ? [...t.tags] : [];
        if (!tags.includes(bulkTag.trim())) tags.push(bulkTag.trim());
        updates.tags = tags;
      }
      if (Object.keys(updates).length) await supabase.from("transactions").update(updates).eq("id", id);
    }
    setTransactions((prev) => prev.map((t) => {
      if (!selectedIds.has(t.id)) return t;
      const newTags = bulkTag.trim() ? [...(Array.isArray(t.tags) ? t.tags : []), bulkTag.trim()].filter((v, i, a) => a.indexOf(v) === i) : t.tags;
      return { ...t, ...(bulkCategory ? { category: bulkCategory } : {}), ...(bulkTag.trim() ? { tags: newTags } : {}) };
    }));
    setSelectedIds(new Set());
    setBulkCategory("");
    setBulkTag("");
    toast(`Updated ${selectedIds.size} transaction${selectedIds.size === 1 ? "" : "s"}`);
    setBulkSaving(false);
  };

  const openSplit = (t: Transaction) => {
    setSplittingId(t.id);
    if (t.splits?.length) setSplitRows([...t.splits]);
    else setSplitRows([{ category: t.category, amount: Math.abs(t.amount) }]);
  };

  const saveSplit = async () => {
    if (splittingId == null) return;
    const total = Math.abs(transactions.find((x) => x.id === splittingId)?.amount ?? 0);
    const sum = splitRows.reduce((s, r) => s + r.amount, 0);
    if (Math.abs(sum - total) > 0.01) return; // must match
    setSavingSplit(true);
    const supabase = createClient();
    await supabase.from("transactions").update({ splits: splitRows }).eq("id", splittingId);
    setTransactions((prev) => prev.map((t) => (t.id === splittingId ? { ...t, splits: splitRows } : t)));
    setSplittingId(null);
    setSavingSplit(false);
    toast("Split saved");
  };

  const addSplitRow = () => setSplitRows([...splitRows, { category: "Other", amount: 0 }]);
  const removeSplitRow = (i: number) => setSplitRows(splitRows.filter((_, j) => j !== i));
  const updateSplitRow = (i: number, field: "category" | "amount", value: string | number) => {
    const next = [...splitRows];
    next[i] = { ...next[i], [field]: field === "amount" ? Number(value) : value };
    setSplitRows(next);
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronDown className="h-3 w-3 opacity-30" />;
    return sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  };

  if (loading) return <TransactionsSkeleton />;

  if (transactions.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Transactions</h1>
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800">
            <button type="button" onClick={() => setViewTab("list")} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${tabActiveClass("list")}`}><List className="h-3.5 w-3.5" /> List</button>
            <button type="button" onClick={() => setViewTab("calendar")} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${tabActiveClass("calendar")}`}><CalendarDays className="h-3.5 w-3.5" /> Calendar</button>
          </div>
        </div>
        {viewTab === "calendar" ? <TransactionsCalendarView transactions={[]} /> : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="rounded-full bg-slate-100 p-4 mb-4">
              <FileText className="h-8 w-8 text-slate-400" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No transactions yet</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">Upload your bank statements to see transactions here.</p>
            <Link href="/upload" className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
              Upload Statements
            </Link>
          </div>
        )}
      </div>
    );
  }

  if (viewTab === "calendar") {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Transactions</h1>
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800">
            <button type="button" onClick={() => setViewTab("list")} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${tabActiveClass("list")}`}><List className="h-3.5 w-3.5" /> List</button>
            <button type="button" onClick={() => setViewTab("calendar")} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${tabActiveClass("calendar")}`}><CalendarDays className="h-3.5 w-3.5" /> Calendar</button>
          </div>
        </div>
        <TransactionsCalendarView transactions={transactions} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Transactions</h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm">{transactions.length} total · {filtered.length} shown</p>
        </div>
        <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800">
          <button type="button" onClick={() => setViewTab("list")} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${tabActiveClass("list")}`}><List className="h-3.5 w-3.5" /> List</button>
          <button type="button" onClick={() => setViewTab("calendar")} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${tabActiveClass("calendar")}`}><CalendarDays className="h-3.5 w-3.5" /> Calendar</button>
        </div>
      </div>

      {/* Filters — single compact toolbar */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search... (/)"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 pl-8 pr-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none dark:text-white"
            />
          </div>
          {filterPresets.length > 0 && (
            <select
              className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2.5 py-1.5 text-sm outline-none dark:text-white w-[140px] shrink-0"
              value=""
              onChange={(e) => {
                const id = e.target.value;
                if (!id) return;
                const p = filterPresets.find((x) => x.id === id);
                if (p) applyPreset(p);
                e.target.value = "";
              }}
            >
              <option value="">Preset...</option>
              {filterPresets.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
          <button type="button" onClick={saveCurrentAsPreset} className="rounded-lg border border-slate-300 dark:border-slate-600 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 shrink-0">
            Save preset
          </button>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2.5 py-1.5 text-sm focus:border-blue-500 outline-none dark:text-white w-[140px] shrink-0"
          >
            <option value="">All categories</option>
            {[...CATEGORIES, ...customCategories].map((c) => (
              <option key={c} value={c}>{(categoryEmoji[c] ? categoryEmoji[c] + " " : "") + c}</option>
            ))}
          </select>
          <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2.5 py-1.5 text-sm outline-none dark:text-white w-[120px] shrink-0">
            <option value="">All tags</option>
            <option value={TAX_TAG}>Tax</option>
            {tagFilter && tagFilter !== TAX_TAG && <option value={tagFilter}>{tagFilter}</option>}
          </select>
          {tagFilter === TAX_TAG && filtered.length > 0 && (
            <button type="button" onClick={() => exportToCSV(filtered, "tax-deductible-transactions.csv")} className="rounded-lg border border-slate-300 dark:border-slate-600 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 shrink-0">
              Export CSV
            </button>
          )}
          <span className="hidden sm:inline h-4 w-px bg-slate-200 dark:bg-slate-600 shrink-0" aria-hidden />
          {(["this_month", "last_30", "last_3mo"] as const).map((p) => (
            <button key={p} type="button" onClick={() => setDatePreset(p)} className="rounded-lg border border-slate-300 dark:border-slate-600 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 shrink-0">
              {p === "this_month" ? "This month" : p === "last_30" ? "30d" : "3mo"}
            </button>
          ))}
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1.5 text-sm outline-none dark:text-white w-[130px] shrink-0 [color-scheme:inherit]" aria-label="From date" />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1.5 text-sm outline-none dark:text-white w-[130px] shrink-0 [color-scheme:inherit]" aria-label="To date" />
          <span className="hidden sm:inline h-4 w-px bg-slate-200 dark:bg-slate-600 shrink-0" aria-hidden />
          <input type="number" value={amountMin} onChange={(e) => setAmountMin(e.target.value)} placeholder="Min $" className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1.5 text-sm outline-none dark:text-white w-20 shrink-0" />
          <input type="number" value={amountMax} onChange={(e) => setAmountMax(e.target.value)} placeholder="Max $" className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1.5 text-sm outline-none dark:text-white w-20 shrink-0" />
          <span className="text-sm text-slate-500 dark:text-slate-400 shrink-0 ml-auto font-medium tabular-nums">
            {filtered.length}
          </span>
        </div>
      </div>

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 text-center">
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            {transactions.length === 0 ? "No transactions yet. Upload statements or add one manually." : "No transactions match your filters."}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/upload" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Upload CSV</Link>
            {transactions.length > 0 && (
              <button type="button" onClick={() => { setSearch(""); setCategoryFilter(""); setTagFilter(""); setDateFrom(""); setDateTo(""); setAmountMin(""); setAmountMax(""); }} className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Possible duplicates */}
      {duplicateGroups.length > 0 && filtered.length > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div>
              <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">Possible duplicates</h3>
              <p className="text-xs text-amber-700 dark:text-amber-200 mt-0.5">Same date, amount, and merchant. One per group will be kept.</p>
            </div>
            {idsToRemoveForMassDedupe.length > 0 && (
              <button
                type="button"
                onClick={() => setConfirmMassRemoveDuplicates(true)}
                className="rounded-lg bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 px-3 py-1.5 text-xs font-medium text-white"
              >
                Remove all duplicates ({idsToRemoveForMassDedupe.length})
              </button>
            )}
          </div>
          <div className="space-y-2">
            {duplicateGroups.slice(0, 5).map((group, gi) => (
              <div key={gi} className="rounded-lg border border-amber-100 dark:border-amber-800/50 bg-white dark:bg-slate-800/50 p-2 space-y-1">
                {group.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-slate-700 dark:text-slate-300 truncate">
                      {t.posted_at} · {(t.merchant || t.description).slice(0, 40)} · ${Math.abs(t.amount).toFixed(2)}
                    </span>
                    <div className="flex gap-1 shrink-0">
                      <button type="button" onClick={() => setConfirmRemoveId(t.id)} className="rounded border border-slate-300 dark:border-slate-600 px-2 py-0.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">Remove</button>
                      <button type="button" onClick={() => setConfirmRemoveId(t.id)} className="rounded border border-slate-300 dark:border-slate-600 px-2 py-0.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700" title="Keep the other, delete this">Merge</button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bulk edit toolbar */}
      {selectedIds.size > 0 && (
        <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-4 py-3 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-blue-800 dark:text-blue-300">{selectedIds.size} selected</span>
          <select value={bulkCategory} onChange={(e) => setBulkCategory(e.target.value)} className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2.5 py-1.5 text-sm w-36 outline-none dark:text-white">
            <option value="">Set category...</option>
            {[...CATEGORIES, ...customCategories].filter((c) => c !== "Income").map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="text" value={bulkTag} onChange={(e) => setBulkTag(e.target.value)} placeholder="Add tag..." className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2.5 py-1.5 text-sm w-28 outline-none dark:text-white" />
          <button type="button" onClick={bulkApply} disabled={bulkSaving || (!bulkCategory && !bulkTag.trim())} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50">Apply</button>
          <button type="button" onClick={() => setSelectedIds(new Set())} className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400">Clear</button>
        </div>
      )}

      {/* Table */}
      {filtered.length > 0 && (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <th className="py-3 px-2 w-10">
                  <input type="checkbox" checked={paginated.length > 0 && selectedIds.size === paginated.length} onChange={selectAllOnPage} className="rounded border-slate-300 dark:border-slate-600" aria-label="Select all" />
                </th>
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
                <th className="py-3 px-4 text-left font-medium text-slate-600 dark:text-slate-300">Notes</th>
                <th className="py-3 px-4 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((t) => (
                <tr key={t.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="py-2.5 px-2">
                    <input type="checkbox" checked={selectedIds.has(t.id)} onChange={() => toggleSelect(t.id)} className="rounded border-slate-300 dark:border-slate-600" aria-label="Select" />
                  </td>
                  <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300 whitespace-nowrap">{t.posted_at}</td>
                  <td className="py-2.5 px-4 text-slate-900 dark:text-white font-medium truncate max-w-[180px]">{t.merchant || "—"}</td>
                  <td className="py-2.5 px-4">
                    {t.splits?.length ? (
                      <div className="flex flex-wrap gap-1">
                        {t.splits.map((s, i) => (
                          <span key={i} className="rounded-full bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
                            {s.category} ${s.amount.toFixed(0)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="rounded-full bg-blue-50 dark:bg-blue-900/30 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
                        {t.category}
                      </span>
                    )}
                  </td>
                  <td className={`py-2.5 px-4 text-right font-medium whitespace-nowrap ${t.amount >= 0 ? "text-emerald-600" : "text-slate-900 dark:text-white"}`}>
                    {t.amount >= 0 ? "+" : ""}${Math.abs(t.amount).toFixed(2)}
                  </td>
                  <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400 truncate max-w-[220px]">{t.description}</td>
                  <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400 text-xs truncate max-w-[140px]" title={t.notes ?? ""}>{t.notes ?? "—"}</td>
                  <td className="py-2.5 px-2 flex gap-0.5">
                    <button type="button" onClick={() => openSplit(t)} className="p-1.5 rounded text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Split"> <Split className="h-3.5 w-3.5" /> </button>
                    <button type="button" onClick={() => openEdit(t)} className="p-1.5 rounded text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Edit notes"> <Edit2 className="h-3.5 w-3.5" /> </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Edit transaction modal */}
        {editingId && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto"
            onClick={() => setEditingId(null)}
            role="dialog"
            aria-modal="true"
          >
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 w-full max-w-md shadow-xl my-8" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Edit transaction</h3>
                <button type="button" onClick={() => setEditingId(null)} className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X className="h-4 w-4" /></button>
              </div>
              <div className="grid gap-2 mb-3">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Date</label>
                <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm outline-none dark:text-white" />
              </div>
              <div className="grid gap-2 mb-3">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Merchant</label>
                <input type="text" value={editMerchant} onChange={(e) => setEditMerchant(e.target.value)} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm outline-none dark:text-white" />
              </div>
              <div className="grid gap-2 mb-3">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Description</label>
                <input type="text" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm outline-none dark:text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Amount</label>
                  <input type="number" step="0.01" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm outline-none dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Category</label>
                  <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm outline-none dark:text-white">
                    {[...CATEGORIES, ...customCategories].map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              {accounts.length > 0 && (
                <div className="grid gap-2 mb-3">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Account</label>
                  <select value={editAccountId} onChange={(e) => setEditAccountId(e.target.value)} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm outline-none dark:text-white">
                    <option value="">—</option>
                    {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              )}
              <div className="grid gap-2 mb-3">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Notes</label>
                <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={2} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm outline-none dark:text-white" placeholder="Optional" />
              </div>
              <div className="grid gap-2 mb-3">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Tags (comma-separated)</label>
                <input type="text" value={editTags} onChange={(e) => setEditTags(e.target.value)} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm outline-none dark:text-white" placeholder="e.g. tax-deductible" />
              </div>
              <div className="grid gap-2 mb-4">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Receipt / attachment URL</label>
                <input type="url" value={editReceiptUrl} onChange={(e) => setEditReceiptUrl(e.target.value)} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm outline-none dark:text-white" placeholder="https://..." />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setEditingId(null)} className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400">Cancel</button>
                <button type="button" onClick={saveTransaction} disabled={savingNote} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50">Save</button>
              </div>
            </div>
          </div>
        )}

        {/* Split modal */}
        {splittingId && (() => {
          const t = transactions.find((x) => x.id === splittingId);
          const total = t ? Math.abs(t.amount) : 0;
          const sum = splitRows.reduce((s, r) => s + r.amount, 0);
          const valid = Math.abs(sum - total) < 0.02;
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSplittingId(null)} role="dialog" aria-modal="true">
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Split transaction</h3>
                  <button type="button" onClick={() => setSplittingId(null)} className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X className="h-4 w-4" /></button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Total must equal ${total.toFixed(2)}</p>
                <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                  {splitRows.map((row, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <select value={row.category} onChange={(e) => updateSplitRow(i, "category", e.target.value)} className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1.5 text-sm dark:text-white">
                        {[...CATEGORIES, ...customCategories].map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <input type="number" step="0.01" value={row.amount || ""} onChange={(e) => updateSplitRow(i, "amount", e.target.value)} className="w-24 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1.5 text-sm dark:text-white" />
                      <button type="button" onClick={() => removeSplitRow(i)} className="p-1 text-slate-400 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addSplitRow} className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline mb-3"><Plus className="h-3 w-3" /> Add row</button>
                <p className={`text-xs mb-3 ${valid ? "text-slate-500 dark:text-slate-400" : "text-amber-600 dark:text-amber-400"}`}>Sum: ${sum.toFixed(2)} {valid ? "✓" : `(need ${total.toFixed(2)})`}</p>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setSplittingId(null)} className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400">Cancel</button>
                  <button type="button" onClick={saveSplit} disabled={!valid || savingSplit} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50">Save</button>
                </div>
              </div>
            </div>
          );
        })()}

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
      )}

      <ConfirmDialog
        open={!!confirmRemoveId}
        title="Remove transaction?"
        message="This transaction will be deleted. This can't be undone."
        confirmLabel="Remove"
        onConfirm={() => confirmRemoveId && removeTransaction(confirmRemoveId)}
        onCancel={() => setConfirmRemoveId(null)}
      />
      <ConfirmDialog
        open={confirmMassRemoveDuplicates}
        title="Remove all duplicates?"
        message={`${idsToRemoveForMassDedupe.length} transaction${idsToRemoveForMassDedupe.length === 1 ? "" : "s"} will be deleted (one from each duplicate group will be kept). This can't be undone.`}
        confirmLabel="Remove all"
        onConfirm={() => void removeAllDuplicateExtras()}
        onCancel={() => setConfirmMassRemoveDuplicates(false)}
      />
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<TransactionsSkeleton />}>
      <TransactionsPageContent />
    </Suspense>
  );
}
