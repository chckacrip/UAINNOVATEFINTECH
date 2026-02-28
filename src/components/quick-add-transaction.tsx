"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Transaction, CATEGORIES, TransactionTemplate } from "@/lib/types";
import { X } from "lucide-react";
import { useToast } from "@/contexts/toast";

interface QuickAddTransactionProps {
  open: boolean;
  onClose: () => void;
  onAdded?: (t: Transaction) => void;
}

export function QuickAddTransaction({ open, onClose, onAdded }: QuickAddTransactionProps) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [category, setCategory] = useState("Other");
  const [accountId, setAccountId] = useState("");
  const [saving, setSaving] = useState(false);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [templates, setTemplates] = useState<TransactionTemplate[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [profileRes, accountsRes] = await Promise.all([
        supabase.from("profiles").select("custom_categories, transaction_templates").eq("id", user.id).single(),
        supabase.from("accounts").select("id, name").eq("user_id", user.id),
      ]);
      setCustomCategories(Array.isArray(profileRes.data?.custom_categories) ? profileRes.data.custom_categories : []);
      setAccounts((accountsRes.data ?? []).map((r: { id: string; name: string }) => ({ id: r.id, name: r.name })));
      setTemplates(Array.isArray(profileRes.data?.transaction_templates) ? profileRes.data.transaction_templates : []);
    };
    load();
  }, [open]);

  const applyTemplate = (t: TransactionTemplate) => {
    setAmount(String(t.amount <= 0 ? t.amount : -t.amount));
    setMerchant(t.merchant);
    setCategory(t.category);
  };

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (Number.isNaN(num) || num === 0) return;
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setSaving(false);
    const { data, error } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        posted_at: date,
        description: merchant || "Manual entry",
        amount: num < 0 ? num : -num,
        category,
        merchant: merchant || null,
        account_id: accountId || null,
      })
      .select()
      .single();
    setSaving(false);
    if (error) {
      toast("Failed to add transaction");
      return;
    }
    toast("Transaction added");
    setAmount("");
    setMerchant("");
    onAdded?.(data as Transaction);
    onClose();
  };

  const saveAsTemplate = async () => {
    const name = window.prompt("Template name (e.g. Rent)");
    if (!name?.trim()) return;
    const num = parseFloat(amount);
    if (Number.isNaN(num)) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const newT: TransactionTemplate = { id: crypto.randomUUID(), name: name.trim(), amount: num < 0 ? num : -num, merchant: merchant.trim(), category };
    const next = [...templates, newT];
    await supabase.from("profiles").update({ transaction_templates: next }).eq("id", user.id);
    setTemplates(next);
    toast("Template saved");
  };

  const categories = [...CATEGORIES, ...customCategories].filter((c) => c !== "Income");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 w-full max-w-sm shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Quick add transaction</h3>
          <button type="button" onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <X className="h-4 w-4" />
          </button>
        </div>
        {templates.length > 0 && (
          <div className="mb-3">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">From template</label>
            <select
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm outline-none dark:text-white"
              value=""
              onChange={(e) => {
                const id = e.target.value;
                if (!id) return;
                const t = templates.find((x) => x.id === id);
                if (t) applyTemplate(t);
                e.target.value = "";
              }}
            >
              <option value="">Choose a template...</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name} — ${Math.abs(t.amount).toFixed(2)} {t.category}</option>
              ))}
            </select>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm outline-none dark:text-white"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Amount (expense as negative)</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm outline-none dark:text-white"
              placeholder="-50.00"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Merchant</label>
            <input
              type="text"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm outline-none dark:text-white"
              placeholder="e.g. Starbucks"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm outline-none dark:text-white"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          {accounts.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Account</label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm outline-none dark:text-white"
              >
                <option value="">—</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex justify-between gap-2 pt-2">
            <button type="button" onClick={saveAsTemplate} disabled={!amount || !merchant.trim()} className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50">
              Save as template
            </button>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
                {saving ? "Adding…" : "Add"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
