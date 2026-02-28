"use client";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 w-full max-w-sm shadow-xl">
        <h3 id="confirm-title" className="text-sm font-semibold text-slate-900 dark:text-white mb-2">{title}</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{message}</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700">
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium text-white ${variant === "danger" ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
