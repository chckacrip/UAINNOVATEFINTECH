"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/contexts/toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Loader2, Plus, Trash2, PiggyBank, CreditCard, TrendingUp } from "lucide-react";

interface Asset { id: string; name: string; asset_type: string; value: number; }
interface Liability { id: string; name: string; liability_type: string; balance: number; interest_rate: number; minimum_payment?: number; }
interface Snapshot { id: string; snapshot_month: string; assets_total: number; liabilities_total: number; }

const ASSET_TYPES = ["savings", "checking", "investment", "retirement", "property", "vehicle", "crypto", "other"];
const LIABILITY_TYPES = ["credit_card", "student_loan", "mortgage", "auto_loan", "personal_loan", "medical", "other"];

export default function NetWorthPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recording, setRecording] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ type: "asset" | "liability"; id: string; name: string } | null>(null);
  const { toast } = useToast();

  const [newAsset, setNewAsset] = useState({ name: "", asset_type: "savings", value: 0 });
  const [newLiability, setNewLiability] = useState({ name: "", liability_type: "credit_card", balance: 0, interest_rate: 0, minimum_payment: 0 });
  const [targetAmount, setTargetAmount] = useState<number | null>(null);
  const [targetDate, setTargetDate] = useState("");
  const [savingTarget, setSavingTarget] = useState(false);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [a, l, s, p] = await Promise.all([
        supabase.from("assets").select("*").eq("user_id", user.id).order("value", { ascending: false }),
        supabase.from("liabilities").select("*").eq("user_id", user.id).order("balance", { ascending: false }),
        supabase.from("net_worth_snapshots").select("*").eq("user_id", user.id).order("snapshot_month", { ascending: false }),
        supabase.from("profiles").select("net_worth_target_amount, net_worth_target_date").eq("id", user.id).single(),
      ]);
      setAssets((a.data as Asset[]) ?? []);
      setLiabilities((l.data as Liability[]) ?? []);
      setSnapshots((s.data as Snapshot[]) ?? []);
      if (p.data?.net_worth_target_amount != null) setTargetAmount(p.data.net_worth_target_amount);
      if (p.data?.net_worth_target_date) setTargetDate(p.data.net_worth_target_date);
      setLoading(false);
    };
    load();
  }, []);

  const totalAssets = assets.reduce((s, a) => s + a.value, 0);
  const totalLiabilities = liabilities.reduce((s, l) => s + l.balance, 0);
  const netWorth = totalAssets - totalLiabilities;

  const saveTarget = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setSavingTarget(true);
    await supabase.from("profiles").update({
      net_worth_target_amount: targetAmount ?? null,
      net_worth_target_date: targetDate || null,
    }).eq("id", user.id);
    setSavingTarget(false);
    toast("Target saved");
  };

  const targetProgress = targetAmount != null && targetAmount > 0 && targetDate
    ? Math.min(100, (netWorth / targetAmount) * 100)
    : null;

  const addAsset = async () => {
    if (!newAsset.name || !newAsset.value) return;
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("assets").insert({ ...newAsset, user_id: user.id }).select().single();
    if (data) setAssets([data as Asset, ...assets]);
    setNewAsset({ name: "", asset_type: "savings", value: 0 });
    toast("Asset added");
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
    setNewLiability({ name: "", liability_type: "credit_card", balance: 0, interest_rate: 0, minimum_payment: 0 });
    toast("Liability added");
    setSaving(false);
  };

  const deleteAsset = async (id: string) => {
    const supabase = createClient();
    await supabase.from("assets").delete().eq("id", id);
    setAssets(assets.filter((a) => a.id !== id));
    setConfirmDelete(null);
    toast("Asset removed");
  };

  const deleteLiability = async (id: string) => {
    const supabase = createClient();
    await supabase.from("liabilities").delete().eq("id", id);
    setLiabilities(liabilities.filter((l) => l.id !== id));
    setConfirmDelete(null);
    toast("Liability removed");
  };

  const recordSnapshot = async () => {
    const month = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
    setRecording(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("net_worth_snapshots").upsert({
      user_id: user.id,
      snapshot_month: month,
      assets_total: totalAssets,
      liabilities_total: totalLiabilities,
    }, { onConflict: "user_id,snapshot_month" }).select().single();
    if (data) setSnapshots([data as Snapshot, ...snapshots.filter((x) => x.snapshot_month !== month)]);
    toast("Snapshot recorded");
    setRecording(false);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="w-full space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Net Worth</h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm">Track your assets and liabilities.</p>
        </div>
      </div>

      {/* Net worth target */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Target</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Target amount ($)</label>
            <input type="number" value={targetAmount ?? ""} onChange={(e) => setTargetAmount(e.target.value ? parseFloat(e.target.value) : null)} className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm w-36 outline-none dark:text-white" placeholder="Optional" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">By date</label>
            <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm w-40 outline-none dark:text-white" />
          </div>
          <button type="button" onClick={saveTarget} disabled={savingTarget} className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">Save target</button>
        </div>
        {targetProgress != null && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
              <span>Current: ${netWorth.toLocaleString()}</span>
              <span>Target: ${(targetAmount ?? 0).toLocaleString()}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700">
              <div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${targetProgress}%` }} />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{targetProgress.toFixed(0)}% of target</p>
          </div>
        )}
      </div>

      {/* Summary Cards — full width */}
      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <div className="flex items-center gap-2 mb-1">
            <PiggyBank className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Total Assets</span>
          </div>
          <p className="text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">${totalAssets.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="h-4 w-4 text-red-500 shrink-0" />
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Total Liabilities</span>
          </div>
          <p className="text-xl font-bold tabular-nums text-red-600 dark:text-red-400">${totalLiabilities.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-blue-600 shrink-0" />
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Net Worth</span>
          </div>
          <p className={`text-xl font-bold tabular-nums ${netWorth >= 0 ? "text-blue-700 dark:text-blue-400" : "text-red-600 dark:text-red-400"}`}>${netWorth.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Net worth over time — compact bar */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Net worth over time</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{snapshots.length === 0 ? "Record a snapshot each month to see your trend." : `${snapshots.length} snapshot(s) recorded.`}</p>
          </div>
          <button onClick={recordSnapshot} disabled={recording} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 shrink-0">Record snapshot</button>
        </div>
        {snapshots.length > 0 && (
          <div className="mt-3 overflow-x-auto -mx-1">
            <table className="w-full min-w-[320px] text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700">
                  <th className="text-left py-1.5 font-medium text-slate-600 dark:text-slate-400">Month</th>
                  <th className="text-right py-1.5 font-medium text-slate-600 dark:text-slate-400">Assets</th>
                  <th className="text-right py-1.5 font-medium text-slate-600 dark:text-slate-400">Liab.</th>
                  <th className="text-right py-1.5 font-medium text-slate-600 dark:text-slate-400">Net</th>
                </tr>
              </thead>
              <tbody>
                {snapshots.slice(0, 12).map((s) => {
                  const nw = s.assets_total - s.liabilities_total;
                  return (
                    <tr key={s.id} className="border-b border-slate-50 dark:border-slate-700/50">
                      <td className="py-1.5 text-slate-700 dark:text-slate-300">{s.snapshot_month}</td>
                      <td className="py-1.5 text-right text-emerald-600 dark:text-emerald-400 tabular-nums">${s.assets_total.toLocaleString("en-US", { minimumFractionDigits: 0 })}</td>
                      <td className="py-1.5 text-right text-red-600 dark:text-red-400 tabular-nums">${s.liabilities_total.toLocaleString("en-US", { minimumFractionDigits: 0 })}</td>
                      <td className={`py-1.5 text-right font-medium tabular-nums ${nw >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400"}`}>${nw.toLocaleString("en-US", { minimumFractionDigits: 0 })}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assets & Liabilities — side by side, full width */}
      <div className="grid w-full gap-4 lg:grid-cols-2">
        {/* Assets */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Assets</h3>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <input type="text" value={newAsset.name} onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })} placeholder="Name" className="min-w-0 flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2.5 py-1.5 text-sm outline-none dark:text-white" />
            <select value={newAsset.asset_type} onChange={(e) => setNewAsset({ ...newAsset, asset_type: e.target.value })} className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1.5 text-sm outline-none dark:text-white w-28 shrink-0">
              {ASSET_TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
            </select>
            <input type="number" value={newAsset.value || ""} onChange={(e) => setNewAsset({ ...newAsset, value: Number(e.target.value) })} placeholder="$" className="w-20 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1.5 text-sm outline-none dark:text-white shrink-0" />
            <button onClick={addAsset} disabled={saving} className="rounded-lg bg-emerald-600 p-1.5 text-white hover:bg-emerald-700 disabled:opacity-50 shrink-0"><Plus className="h-4 w-4" /></button>
          </div>
          <div className="space-y-1.5">
            {assets.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border border-slate-100 dark:border-slate-700 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{a.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{a.asset_type.replace("_", " ")}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">${a.value.toLocaleString()}</span>
                  <button onClick={() => setConfirmDelete({ type: "asset", id: a.id, name: a.name })} className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-700"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ))}
            {assets.length === 0 && <p className="text-xs text-slate-500 dark:text-slate-400 py-2">No assets yet. Add one above.</p>}
          </div>
        </div>

        {/* Liabilities */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Liabilities</h3>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <input type="text" value={newLiability.name} onChange={(e) => setNewLiability({ ...newLiability, name: e.target.value })} placeholder="Name" className="min-w-0 flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2.5 py-1.5 text-sm outline-none dark:text-white" />
            <select value={newLiability.liability_type} onChange={(e) => setNewLiability({ ...newLiability, liability_type: e.target.value })} className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1.5 text-sm outline-none dark:text-white w-28 shrink-0">
              {LIABILITY_TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
            </select>
            <input type="number" value={newLiability.balance || ""} onChange={(e) => setNewLiability({ ...newLiability, balance: Number(e.target.value) })} placeholder="$" className="w-20 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1.5 text-sm outline-none dark:text-white shrink-0" />
            <input type="number" value={newLiability.interest_rate || ""} onChange={(e) => setNewLiability({ ...newLiability, interest_rate: Number(e.target.value) })} placeholder="APR%" className="w-14 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-1.5 py-1.5 text-sm outline-none dark:text-white shrink-0" />
            <input type="number" value={newLiability.minimum_payment || ""} onChange={(e) => setNewLiability({ ...newLiability, minimum_payment: Number(e.target.value) })} placeholder="Min" className="w-14 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-1.5 py-1.5 text-sm outline-none dark:text-white shrink-0" />
            <button onClick={addLiability} disabled={saving} className="rounded-lg bg-red-600 p-1.5 text-white hover:bg-red-700 disabled:opacity-50 shrink-0"><Plus className="h-4 w-4" /></button>
          </div>
          <div className="space-y-1.5">
            {liabilities.map((l) => (
              <div key={l.id} className="flex items-center justify-between rounded-lg border border-slate-100 dark:border-slate-700 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{l.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{l.liability_type.replace("_", " ")}{l.interest_rate > 0 ? ` · ${l.interest_rate}%` : ""}{(l.minimum_payment ?? 0) > 0 ? ` · $${l.minimum_payment}/mo` : ""}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-bold text-red-600 dark:text-red-400 tabular-nums">${l.balance.toLocaleString()}</span>
                  <button onClick={() => setConfirmDelete({ type: "liability", id: l.id, name: l.name })} className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-700"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ))}
            {liabilities.length === 0 && <p className="text-xs text-slate-500 dark:text-slate-400 py-2">No liabilities yet. Add one above.</p>}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmDelete}
        title={confirmDelete?.type === "asset" ? "Remove asset?" : "Remove liability?"}
        message={confirmDelete ? `"${confirmDelete.name}" will be removed. This can't be undone.` : ""}
        confirmLabel="Remove"
        onConfirm={() => confirmDelete && (confirmDelete.type === "asset" ? deleteAsset(confirmDelete.id) : deleteLiability(confirmDelete.id))}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
