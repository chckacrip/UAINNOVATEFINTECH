import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-slate-50 dark:bg-slate-900">
      <div className="text-center max-w-md">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
          Page not found
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
          The page you’re looking for doesn’t exist or was moved.
        </p>
        <Link
          href="/"
          className="inline-block rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 text-sm font-medium hover:opacity-90"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
