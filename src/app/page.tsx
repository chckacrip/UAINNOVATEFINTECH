import Link from "next/link";
import { BarChart3, MessageSquare, RefreshCw } from "lucide-react";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ session_expired?: string }>;
}) {
  const params = await searchParams;
  const sessionExpired = params?.session_expired === "1";

  return (
    <div className="min-h-screen min-h-[100dvh] bg-slate-50 dark:bg-slate-900 relative overflow-hidden">
      {/* Subtle background gradient */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-blue-50/50 via-transparent to-transparent dark:from-blue-950/20 dark:via-transparent dark:to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -top-40 -right-40 h-80 w-80 rounded-full bg-blue-200/30 dark:bg-blue-500/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-slate-200/50 dark:bg-slate-700/20 blur-3xl"
        aria-hidden
      />

      <main className="relative mx-auto max-w-2xl px-4 sm:px-6 py-16 sm:py-24 md:py-32">
        {sessionExpired && (
          <p className="mb-8 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            Your session expired. Sign in again to continue.
          </p>
        )}

        <p className="mb-4 text-sm font-medium text-blue-600 dark:text-blue-400">
          Your AI financial analyst
        </p>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-white mb-6 sm:mb-8">
          Understand your money
          <br />
          <span className="text-slate-500 dark:text-slate-400">without the spreadsheets.</span>
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-lg sm:text-xl leading-relaxed mb-10 max-w-xl">
          Upload a CSV from your bank. We categorize transactions, spot subscriptions you might have forgotten, and you can ask questions in plain English.
        </p>

        <ul className="grid gap-3 sm:gap-4 mb-12 max-w-md">
          {[
            { icon: BarChart3, text: "Spending by category and trends" },
            { icon: RefreshCw, text: "Recurring subscriptions surfaced" },
            { icon: MessageSquare, text: "Chat with your transaction history" },
          ].map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-200/80 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300">
                <Icon className="h-4 w-4" />
              </span>
              <span>{text}</span>
            </li>
          ))}
        </ul>

        <p className="text-slate-500 dark:text-slate-500 text-sm mb-8">
          Your data stays on our servers. We don’t store account numbers. Analysis runs server-side only.
        </p>

        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-xl bg-blue-600 text-white px-8 py-4 text-base font-semibold shadow-lg shadow-blue-600/25 hover:bg-blue-700 hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 transition-all touch-manipulation min-h-[52px]"
        >
          Get started
        </Link>

        <footer className="mt-20 sm:mt-28 pt-10 sm:pt-14 border-t border-slate-200/80 dark:border-slate-700/80">
          <p className="text-slate-500 dark:text-slate-500 text-sm mb-4">
            Dashboard, charts, and a chat that uses your transaction history. No fluff.
          </p>
          <nav className="flex gap-6 text-sm">
            <Link
              href="/privacy"
              className="text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              Terms
            </Link>
          </nav>
        </footer>
      </main>
    </div>
  );
}
