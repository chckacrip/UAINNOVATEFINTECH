"use client";

import { useState, useCallback, useEffect } from "react";
import { BookOpen, RefreshCw, Loader2 } from "lucide-react";

export function MoneyStoryCard() {
  const [story, setStory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/money-story", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        setStory(null);
        return;
      }
      setStory(data.story ?? null);
    } catch {
      setError("Could not load your money story.");
      setStory(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStory();
  }, [fetchStory]);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-blue-50/80 to-indigo-50/60 dark:from-slate-800 dark:to-slate-800/80 p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          Your money story this week
        </h3>
        <button
          type="button"
          onClick={fetchStory}
          disabled={loading}
          className="rounded-lg p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors touch-manipulation disabled:opacity-50"
          aria-label="Generate or refresh story"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </button>
      </div>

      {loading && !story && (
        <p className="text-sm text-slate-500 dark:text-slate-400 italic">Writing your story…</p>
      )}

      {error && !story && !loading && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {!story && !loading && !error && (
        <button
          type="button"
          onClick={fetchStory}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
        >
          Generate your weekly money story →
        </button>
      )}

      {story && (
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          {story}
        </p>
      )}
    </div>
  );
}
