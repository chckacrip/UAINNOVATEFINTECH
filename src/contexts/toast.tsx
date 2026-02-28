"use client";

import { createContext, useCallback, useContext, useState } from "react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  undo?: () => void;
}

interface ToastContextValue {
  toasts: Toast[];
  toast: (message: string, type?: ToastType, options?: { undo?: () => void }) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = "success", options?: { undo?: () => void }) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type, undo: options?.undo }]);
    const t = options?.undo ? 8000 : 4000;
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), t);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        <div className="pointer-events-auto flex flex-col gap-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              role="alert"
              className={`rounded-lg border px-4 py-2.5 text-sm font-medium shadow-lg flex items-center gap-3 ${
                t.type === "error"
                  ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200"
                  : t.type === "info"
                    ? "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200"
                    : "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200"
              }`}
            >
              <span>{t.message}</span>
              {t.undo && (
                <button type="button" onClick={() => { t.undo?.(); dismiss(t.id); }} className="font-semibold underline shrink-0">
                  Undo
                </button>
            )}
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) return { toast: () => {}, dismiss: () => {}, toasts: [] };
  return ctx;
}
