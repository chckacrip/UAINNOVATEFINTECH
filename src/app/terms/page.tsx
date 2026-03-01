import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mb-8">
          Terms of Service
        </h1>
        <div className="prose prose-slate dark:prose-invert text-sm space-y-4 text-slate-600 dark:text-slate-400">
          <p>
            By using MotionFi you agree to these terms.
          </p>
          <h2 className="text-base font-medium text-slate-900 dark:text-white mt-6">
            Use of the service
          </h2>
          <p>
            You must provide accurate information and keep your account secure. You are responsible for the data you upload and how you use the insights we provide. The service is for personal financial awareness and is not a substitute for professional tax, legal, or investment advice.
          </p>
          <h2 className="text-base font-medium text-slate-900 dark:text-white mt-6">
            Acceptable use
          </h2>
          <p>
            You may not use the service for illegal purposes, to harm others, or to attempt to gain unauthorized access to our or others’ systems. We may suspend or terminate access if we detect abuse.
          </p>
          <h2 className="text-base font-medium text-slate-900 dark:text-white mt-6">
            Changes
          </h2>
          <p>
            We may update these terms and the product over time. Continued use after changes constitutes acceptance.
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
