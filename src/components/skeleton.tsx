"use client";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-slate-200 dark:bg-slate-700 ${className}`} />;
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48 mb-1" />
        <Skeleton className="h-4 w-36" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}

export function TransactionsSkeleton() {
  return (
    <div className="space-y-4">
      <div>
        <Skeleton className="h-8 w-40 mb-1" />
        <Skeleton className="h-4 w-28" />
      </div>
      <Skeleton className="h-14 rounded-xl w-full" />
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 px-4 py-3 flex gap-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="flex gap-4 px-4 py-3 border-b border-slate-50 dark:border-slate-700/50">
            <Skeleton className="h-4 w-24 shrink-0" />
            <Skeleton className="h-4 flex-1 max-w-[120px]" />
            <Skeleton className="h-4 w-20 shrink-0" />
            <Skeleton className="h-4 w-16 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
