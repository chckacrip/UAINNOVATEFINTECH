"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Plus, Trash2, PiggyBank, CreditCard, TrendingUp } from "lucide-react";

interface Asset { id: string; name: string; asset_type: string; value: number; }
interface Liability { id: string; name: string; liability_type: string; balance: number; interest_rate: number; }

const ASSET_TYPES = ["savings", "checking", "investment", "retirement", "property", "vehicle", "crypto", "other"];
const LIABILITY_TYPES = ["credit_card", "student_loan", "mortgage", "auto_loan", "personal_loan", "medical", "other"];

export default function NetWorthPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [newAsset, setNewAsset] = useState({ name: "", asset_type: "savings", value: 0 });
  const [newLiability, setNewLiability] = useState({ name: "", liability_type: "credit_card", balance: 0, interest_rate: 0 });

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [a, l] = await Promise.all([
        supabase.from("assets").select("*").eq("user_id", user.id).order("value", { ascending: false }),
        supabase.from("liabilities").select("*").eq("user_id", user.id).order("balance", { ascending: false }),
      ]);
      setAssets((a.data as Asset[]) ?? []);
      setLiabilities((l.data as Liability[]) ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const totalAssets = assets.reduce((s, a) => s + a.value, 0);
  const totalLiabilities = liabilities.reduce((s, l) => s + l.balance, 0);
  const netWorth = totalAssets - totalLiabilities;

  const addAsset = async () => {
    if (!newAsset.name || !newAsset.value) return;
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("assets").insert({ ...newAsset, user_id: user.id }).select().single();
    if (data) setAssets([data as Asset, ...assets]);
    setNewAsset({ name: "", asset_type: "savings", value: 0 });
    setSaving(false);
  };

  const addLiability = async () => {
    if (!newLiability.name || !newLiability.balance) return;
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("liabilities").insert({ ...newLiability, user_id: user.id }).select().single();
    if (data) setLiabilities([data as Liability, ...liabilities]);
    setNewLiability({ name: "", liability_type: "credit_card", balance: 0, interest_rate: 0 });
    setSaving(false);
  };

  const deleteAsset = async (id: string) => {
    const supabase = createClient();
    await supabase.from("assets").delete().eq("id", id);
    setAssets(assets.filter((a) => a.id !== id));
  };

  const deleteLiability = async (id: string) => {
    const supabase = createClient();
    await supabase.from("liabilities").delete().eq("id", id);
    setLiabilities(liabilities.filter((l) => l.id !== id));
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Net Worth</h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm">Track your assets and liabilities.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
          <div className="flex items-center gap-2 mb-2"><PiggyBank className="h-5 w-5 text-emerald-600" /><span className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Assets</span></div>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">${totalAssets.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
          <div className="flex items-center gap-2 mb-2"><CreditCard className="h-5 w-5 text-red-500" /><span className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Liabilities</span></div>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">${totalLiabilities.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
          <div className="flex items-center gap-2 mb-2"><TrendingUp className="h-5 w-5 text-blue-600" /><span className="text-sm font-medium text-slate-600 dark:text-slate-400">Net Worth</span></div>
          <p className={`text-2xl font-bold ${netWorth >= 0 ? "text-blue-700 dark:text-blue-400" : "text-red-600 dark:text-red-400"}`}>${netWorth.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Assets */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Assets</h3>
          <div className="flex gap-2 mb-4">
            <input type="text" value={newAsset.name} onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })} placeholder="Name" className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm outline-none dark:text-white" />
            <select value={newAsset.asset_type} onChange={(e) => setNewAsset({ ...newAsset, asset_type: e.target.value })} className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-2 text-sm outline-none dark:text-white">
              {ASSET_TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
            </select>
            <input type="number" value={newAsset.value || ""} onChange={(e) => setNewAsset({ ...newAsset, value: Number(e.target.value) })} placeholder="$" className="w-24 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm outline-none dark:text-white" />
            <button onClick={addAsset} disabled={saving} className="rounded-lg bg-emerald-600 px-3 py-2 text-white text-sm hover:bg-emerald-700 disabled:opacity-50"><Plus className="h-4 w-4" /></button>
          </div>
          <div className="space-y-2">
            {assets.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border border-slate-100 dark:border-slate-700 p-3">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{a.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{a.asset_type.replace("_", " ")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">${a.value.toLocaleString()}</span>
                  <button onClick={() => deleteAsset(a.id)} className="text-slate-400 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ))}
            {assets.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">No assets added yet.</p>}
          </div>
        </div>

        {/* Liabilities */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Liabilities</h3>
          <div className="flex gap-2 mb-4">
            <input type="text" value={newLiability.name} onChange={(e) => setNewLiability({ ...newLiability, name: e.target.value })} placeholder="Name" className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm outline-none dark:text-white" />
            <select value={newLiability.liability_type} onChange={(e) => setNewLiability({ ...newLiability, liability_type: e.target.value })} className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-2 text-sm outline-none dark:text-white">
              {LIABILITY_TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
            </select>
            <input type="number" value={newLiability.balance || ""} onChange={(e) => setNewLiability({ ...newLiability, balance: Number(e.target.value) })} placeholder="$" className="w-24 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm outline-none dark:text-white" />
            <button onClick={addLiability} disabled={saving} className="rounded-lg bg-red-600 px-3 py-2 text-white text-sm hover:bg-red-700 disabled:opacity-50"><Plus className="h-4 w-4" /></button>
          </div>
          <div className="space-y-2">
            {liabilities.map((l) => (
              <div key={l.id} className="flex items-center justify-between rounded-lg border border-slate-100 dark:border-slate-700 p-3">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{l.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{l.liability_type.replace("_", " ")}{l.interest_rate > 0 ? ` · ${l.interest_rate}% APR` : ""}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-red-600 dark:text-red-400">${l.balance.toLocaleString()}</span>
                  <button onClick={() => deleteLiability(l.id)} className="text-slate-400 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ))}
            {liabilities.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">No liabilities added yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
