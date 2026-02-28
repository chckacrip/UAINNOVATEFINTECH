"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Upload,
  FileText,
  AlertCircle,
  CheckCircle,
  Loader2,
  Download,
  Camera,
  FileSpreadsheet,
  Image as ImageIcon,
  Plus,
  Landmark,
  CreditCard,
  Wallet,
} from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { createClient } from "@/lib/supabase/client";
import { usePlaidLink } from "react-plaid-link";

type UploadMode = "csv" | "image";
type ImageSubMode = "statement" | "receipt";
interface Account { id: string; name: string; account_type: string; }

const ACCOUNT_ICONS: Record<string, React.ReactNode> = {
  checking: <Landmark className="h-4 w-4" />,
  savings: <Wallet className="h-4 w-4" />,
  credit: <CreditCard className="h-4 w-4" />,
  investment: <Landmark className="h-4 w-4" />,
};

export default function UploadPage() {
  const [mode, setMode] = useState<UploadMode>("csv");
  const [imageSubMode, setImageSubMode] = useState<ImageSubMode>("statement");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    inserted: number;
    extracted?: number;
    errors: string[];
  } | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [showNewAccount, setShowNewAccount] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountType, setNewAccountType] = useState("checking");

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("accounts").select("*").eq("user_id", user.id).order("created_at");
      setAccounts((data as Account[]) ?? []);
    };
    load();
  }, []);

  const createAccount = async () => {
    if (!newAccountName.trim()) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("accounts").insert({ name: newAccountName, account_type: newAccountType, user_id: user.id }).select().single();
    if (data) {
      const acct = data as Account;
      setAccounts([...accounts, acct]);
      setSelectedAccount(acct.id);
    }
    setNewAccountName("");
    setShowNewAccount(false);
  };

  const acceptTypes = mode === "csv" ? ".csv" : ".png,.jpg,.jpeg,.webp";

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  }, []);

  const handleFile = (f: File) => {
    setFile(f);
    setResult(null);
    if (f.type.startsWith("image/")) {
      setPreview(URL.createObjectURL(f));
      setMode("image");
    } else {
      setPreview(null);
      setMode("csv");
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) handleFile(dropped);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) handleFile(selected);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    if (selectedAccount) formData.append("account_id", selectedAccount);
    if (file.type.startsWith("image/") && imageSubMode === "receipt") formData.append("receipt", "true");

    const endpoint = file.type.startsWith("image/") ? "/api/upload-image" : "/api/upload";

    try {
      const res = await apiFetch(endpoint, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ success: false, inserted: 0, errors: ["Upload failed. Please try again."] });
    }
    setUploading(false);
  };

  const handleDownloadDemo = () => {
    const csv = `date,description,amount
2026-01-02,PAYROLL DIRECT DEPOSIT,4500.00
2026-01-03,RENT PAYMENT - APT 4B,-1400.00
2026-01-04,WALMART GROCERY,-87.32
2026-01-05,STARBUCKS COFFEE,-6.45
2026-01-06,NETFLIX SUBSCRIPTION,-15.99
2026-01-07,SHELL GAS STATION,-45.20
2026-01-08,AMAZON.COM PURCHASE,-29.99
2026-01-10,UBER TRIP,-18.50
2026-01-12,WHOLE FOODS MARKET,-62.15
2026-01-14,AT&T WIRELESS,-85.00
2026-01-15,PAYROLL DIRECT DEPOSIT,4500.00
2026-01-15,CHIPOTLE MEXICAN GRILL,-12.85
2026-01-17,PLANET FITNESS MONTHLY,-24.99
2026-01-18,CHEVRON GAS,-42.00
2026-01-20,SPOTIFY PREMIUM,-10.99
2026-01-21,TARGET STORE,-45.67
2026-01-22,DOORDASH ORDER,-28.50
2026-01-23,CVS PHARMACY,-15.40
2026-01-25,COMCAST INTERNET,-79.99
2026-01-27,TRADER JOES,-55.20
2026-01-28,LYFT RIDE,-14.30
2026-01-30,UNITED AIRLINES TICKET,-320.00
2026-02-01,PAYROLL DIRECT DEPOSIT,4500.00
2026-02-02,RENT PAYMENT - APT 4B,-1400.00
2026-02-03,WALMART GROCERY,-95.10
2026-02-04,STARBUCKS COFFEE,-7.20
2026-02-05,NETFLIX SUBSCRIPTION,-15.99
2026-02-06,SHELL GAS STATION,-48.30
2026-02-07,AMAZON.COM PURCHASE,-149.99
2026-02-09,COSTCO WHOLESALE,-125.40
2026-02-11,WHOLE FOODS MARKET,-58.90
2026-02-14,AT&T WIRELESS,-85.00
2026-02-15,PAYROLL DIRECT DEPOSIT,4500.00
2026-02-16,MCDONALD'S,-9.45
2026-02-17,PLANET FITNESS MONTHLY,-24.99
2026-02-18,BP GAS STATION,-39.80
2026-02-20,SPOTIFY PREMIUM,-10.99
2026-02-21,HULU SUBSCRIPTION,-17.99
2026-02-22,UBER EATS ORDER,-35.20
2026-02-24,COMCAST INTERNET,-79.99
2026-02-25,KROGER GROCERY,-72.30
2026-02-27,AIRBNB BOOKING,-245.00
2026-02-28,WALGREENS PHARMACY,-22.50`;

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "demo_transactions.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full min-h-[calc(100vh-7rem)] flex flex-col space-y-6">
      <div className="flex-shrink-0">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Upload Statements</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Import transactions from a CSV, screenshot, or connect your bank.
        </p>
      </div>

      <div className="space-y-5">
        {/* Mode Toggle */}
        <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-1 gap-1">
          <button
            onClick={() => { setMode("csv"); setFile(null); setPreview(null); setResult(null); }}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
              mode === "csv"
                ? "bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            <FileSpreadsheet className="h-4 w-4" />
            CSV File
          </button>
          <button
            onClick={() => { setMode("image"); setFile(null); setPreview(null); setResult(null); }}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
              mode === "image"
                ? "bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            <Camera className="h-4 w-4" />
            Screenshot / Receipt
          </button>
        </div>

        {mode === "image" && (
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 p-1 gap-1 w-fit">
            <button
              onClick={() => setImageSubMode("statement")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${imageSubMode === "statement" ? "bg-slate-200 dark:bg-slate-600 text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"}`}
            >
              Statement
            </button>
            <button
              onClick={() => setImageSubMode("receipt")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${imageSubMode === "receipt" ? "bg-slate-200 dark:bg-slate-600 text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"}`}
            >
              Receipt
            </button>
          </div>
        )}

        {/* Account Selector */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Account</span>
            <button
              onClick={() => setShowNewAccount(!showNewAccount)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 font-medium"
            >
              <Plus className="h-3 w-3" /> New
            </button>
          </div>

          {showNewAccount && (
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                placeholder="Account name"
                className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:text-white"
              />
              <select
                value={newAccountType}
                onChange={(e) => setNewAccountType(e.target.value)}
                className="rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-2 py-2 text-sm outline-none dark:text-white"
              >
                <option value="checking">Checking</option>
                <option value="savings">Savings</option>
                <option value="credit">Credit</option>
                <option value="investment">Investment</option>
              </select>
              <button onClick={createAccount} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">Add</button>
            </div>
          )}

          {accounts.length > 0 ? (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedAccount("")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium border transition-colors ${
                  !selectedAccount
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                    : "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500"
                }`}
              >
                All Accounts
              </button>
              {accounts.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSelectedAccount(a.id)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium border transition-colors ${
                    selectedAccount === a.id
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                      : "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500"
                  }`}
                >
                  {ACCOUNT_ICONS[a.account_type] || <Wallet className="h-4 w-4" />}
                  {a.name}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No accounts yet. Add one to organize uploads, or just upload directly.
            </p>
          )}
        </div>

        {/* Drop Zone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative rounded-xl border-2 border-dashed p-10 text-center transition-all ${
            dragActive
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
              : "border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 hover:border-slate-400 dark:hover:border-slate-500"
          }`}
        >
          <input
            type="file"
            accept={acceptTypes}
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          {preview ? (
            <div className="space-y-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Statement preview"
                className="max-h-48 mx-auto rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm"
              />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{file?.name}</p>
            </div>
          ) : (
            <>
              <div className={`mx-auto mb-4 w-12 h-12 rounded-full flex items-center justify-center ${
                dragActive ? "bg-blue-100 dark:bg-blue-800" : "bg-slate-200 dark:bg-slate-700"
              }`}>
                {mode === "csv" ? (
                  <Upload className={`h-5 w-5 ${dragActive ? "text-blue-600" : "text-slate-500 dark:text-slate-400"}`} />
                ) : (
                  <ImageIcon className={`h-5 w-5 ${dragActive ? "text-blue-600" : "text-slate-500 dark:text-slate-400"}`} />
                )}
              </div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {mode === "csv"
                  ? "Drop your CSV file here, or click to browse"
                  : "Drop a screenshot here, or click to browse"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {mode === "csv"
                  ? "Expected columns: date, description, amount"
                  : "PNG, JPG, or WebP — screenshot of your bank statement"}
              </p>
            </>
          )}
        </div>

        {/* File Info + Upload Button */}
        {file && (
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
              file.type.startsWith("image/") ? "bg-purple-100 dark:bg-purple-900/30" : "bg-blue-100 dark:bg-blue-900/30"
            }`}>
              {file.type.startsWith("image/") ? (
                <ImageIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              ) : (
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{file.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {(file.size / 1024).toFixed(1)} KB
                {file.type.startsWith("image/") && " · AI vision analysis"}
              </p>
            </div>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2 shrink-0"
            >
              {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
              {uploading
                ? file.type.startsWith("image/") ? "Scanning..." : "Processing..."
                : "Upload & Analyze"}
            </button>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className={`rounded-xl border p-4 ${
            result.success
              ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20"
              : "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20"
          }`}>
            <div className="flex items-start gap-3">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
              )}
              <div>
                <p className={`text-sm font-medium ${
                  result.success ? "text-emerald-800 dark:text-emerald-300" : "text-red-800 dark:text-red-300"
                }`}>
                  {result.success
                    ? result.extracted
                      ? `AI found ${result.extracted} transactions — imported ${result.inserted}!`
                      : `Successfully imported ${result.inserted} transactions!`
                    : "Upload encountered issues"}
                </p>
                {result.errors.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {result.errors.slice(0, 5).map((err, i) => (
                      <li key={i} className="text-xs text-slate-600 dark:text-slate-400">{err}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Screenshot Tips */}
        {mode === "image" && !file && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Tips for best results</h3>
            <div className="grid gap-2">
              {[
                "Use a clear, full-screen screenshot of your transactions",
                "Make sure date, description, and amount columns are visible",
                "Crop out sensitive info like account numbers if desired",
                "Works with bank apps, credit card portals, and Venmo/Cash App",
              ].map((tip, i) => (
                <div key={i} className="flex gap-2.5 items-start">
                  <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{i + 1}</span>
                  </div>
                  <span className="text-sm text-slate-600 dark:text-slate-400">{tip}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom row: Plaid + Demo side by side */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Landmark className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Connect Bank</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Auto-import transactions via Plaid.
            </p>
            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 mb-3">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-200 mb-1.5">Sandbox testing</p>
              <p className="text-xs text-amber-800 dark:text-amber-300/90 mb-1">1. Click Connect Bank → pick any bank.</p>
              <p className="text-xs text-amber-800 dark:text-amber-300/90 mb-1">2. Username: <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">user_good</code></p>
              <p className="text-xs text-amber-800 dark:text-amber-300/90">3. Password: <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">pass_good</code></p>
              <p className="text-xs text-amber-700 dark:text-amber-400/80 mt-1.5">Don’t use your real phone number—skip or use 415-555-1234 if asked.</p>
            </div>
            <PlaidLinkButton />
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Download className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Demo Data</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Try the app with sample transactions.
            </p>
            <button
              onClick={handleDownloadDemo}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Download CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlaidLinkButton() {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "linking" | "syncing" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const fetchLinkToken = async () => {
    setStatus("loading");
    setMessage("");
    try {
      const res = await apiFetch("/api/plaid/link-token", { method: "POST" });
      const data = await res.json();
      if (data.error) {
        setStatus("error");
        setMessage(data.error);
        return;
      }
      setLinkToken(data.link_token);
      setStatus("linking");
    } catch {
      setStatus("error");
      setMessage("Failed to initialize. Check Plaid keys.");
    }
  };

  if (status === "linking" && linkToken) {
    return <PlaidLinkModal linkToken={linkToken} onSuccess={(publicToken, metadata) => {
      setStatus("syncing");
      setMessage(`Connecting to ${metadata?.institution?.name || "bank"}...`);
      apiFetch("/api/plaid/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          public_token: publicToken,
          institution: metadata?.institution,
        }),
      })
        .then(async (r) => {
          const data = await r.json().catch(() => ({}));
          if (!r.ok) {
            setStatus("error");
            setMessage(data?.error || `Request failed (${r.status}). Check your connection and try again.`);
            return;
          }
          if (data.success) {
            setStatus("success");
            setMessage(`Connected to ${data.institution || "bank"}! Synced ${data.synced} transactions.`);
          } else {
            setStatus("error");
            setMessage(data.error || "Exchange failed.");
          }
        })
        .catch((err: unknown) => {
          setStatus("error");
          const msg = err instanceof Error ? err.message : "Connection failed.";
          setMessage(
            msg.includes("fetch") || msg.includes("Network") || msg.includes("Failed to fetch")
              ? "Connection failed. Check your network and that the app is running, then try again."
              : msg
          );
        });
    }} onExit={() => {
      setStatus("idle");
      setLinkToken(null);
    }} />;
  }

  return (
    <div>
      <button
        onClick={fetchLinkToken}
        disabled={status === "loading" || status === "syncing"}
        className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {(status === "loading" || status === "syncing") && <Loader2 className="h-4 w-4 animate-spin" />}
        {status === "syncing" ? "Syncing..." : status === "success" ? "Connected!" : "Connect Bank"}
      </button>
      {message && (
        <p className={`mt-2 text-xs ${
          status === "error" ? "text-red-500 dark:text-red-400"
            : status === "success" ? "text-emerald-600 dark:text-emerald-400"
            : "text-slate-500 dark:text-slate-400"
        }`}>{message}</p>
      )}
    </div>
  );
}

function PlaidLinkModal({
  linkToken,
  onSuccess,
  onExit,
}: {
  linkToken: string;
  onSuccess: (publicToken: string, metadata: any) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
  onExit: () => void;
}) {
  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: (public_token, metadata) => onSuccess(public_token, metadata),
    onExit: () => onExit(),
  });

  useEffect(() => {
    if (ready) open();
  }, [ready, open]);

  return (
    <div className="text-center py-2">
      <Loader2 className="h-5 w-5 animate-spin text-emerald-600 mx-auto mb-1" />
      <p className="text-xs text-slate-500 dark:text-slate-400">Opening Plaid Link...</p>
    </div>
  );
}
