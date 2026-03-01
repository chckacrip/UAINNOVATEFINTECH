import Link from "next/link";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ session_expired?: string }>;
}) {
  const params = await searchParams;
  const sessionExpired = params?.session_expired === "1";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <main className="mx-auto max-w-2xl px-6 py-24">
        {sessionExpired && (
          <p className="mb-6 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            Your session expired. Sign in again to continue.
          </p>
        )}
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white mb-4">
          MotionFi
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed mb-10">
          Upload a CSV from your bank. We categorize transactions, spot subscriptions you might have forgotten, and you can ask questions about your spending in plain English.
        </p>
        <p className="text-slate-500 dark:text-slate-500 text-sm mb-12">
          Your data stays on our servers. We don’t store account numbers. Analysis runs server-side only.
        </p>
        <Link
          href="/login"
          className="inline-block rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Get started
        </Link>

        <footer className="mt-24 pt-12 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500 dark:text-slate-500">
          <p>Dashboard, charts, and a chat that uses your transaction history. No fluff.</p>
          <span className="flex gap-4">
            <Link href="/privacy" className="hover:text-slate-700 dark:hover:text-slate-300 underline">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-slate-700 dark:hover:text-slate-300 underline">
              Terms
            </Link>
          </span>
        </footer>
      </main>
    </div>
  );
}
