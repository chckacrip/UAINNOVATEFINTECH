"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

const SHORTCUTS: { key: string; description: string }[] = [
  { key: "/", description: "Focus search (Transactions)" },
  { key: "N", description: "Quick add transaction" },
  { key: "?", description: "Show this help" },
  { key: "Esc", description: "Close modal" },
];

interface ShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
}

export function ShortcutsHelp({ open, onClose }: ShortcutsHelpProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={onClose} role="dialog" aria-modal="true">
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Keyboard shortcuts</h3>
          <button type="button" onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <X className="h-4 w-4" />
          </button>
        </div>
        <ul className="space-y-2">
          {SHORTCUTS.map(({ key, description }) => (
            <li key={key} className="flex justify-between text-sm">
              <kbd className="rounded border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 font-mono text-xs">{key}</kbd>
              <span className="text-slate-600 dark:text-slate-400">{description}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
