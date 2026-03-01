import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mb-8">
          Privacy Policy
        </h1>
        <div className="prose prose-slate dark:prose-invert text-sm space-y-4 text-slate-600 dark:text-slate-400">
          <p>
            MotionFi (&ldquo;we&rdquo;) processes your data to provide financial analysis and insights.
          </p>
          <h2 className="text-base font-medium text-slate-900 dark:text-white mt-6">
            Data we use
          </h2>
          <p>
            We store the information you provide: email (for account and password reset), transaction data you upload (dates, descriptions, amounts, categories), and preferences (income, budgets, goals). We do not store bank account numbers or raw CSV files beyond what is needed to normalize transactions.
          </p>
          <h2 className="text-base font-medium text-slate-900 dark:text-white mt-6">
            How we use it
          </h2>
          <p>
            Transaction data is used to categorize spending, detect recurring charges, generate summaries, and power the AI chat. Analysis runs server-side. We do not sell your data to third parties.
          </p>
          <h2 className="text-base font-medium text-slate-900 dark:text-white mt-6">
            Security
          </h2>
          <p>
            Authentication and data are handled via Supabase with Row Level Security so you only access your own data. API keys (e.g. OpenAI) are kept server-side.
          </p>
          <p className="mt-8">
            <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline">
              Back to home
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
