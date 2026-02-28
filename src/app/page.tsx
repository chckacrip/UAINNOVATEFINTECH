import Link from "next/link";
import {
  BarChart3,
  Upload,
  MessageSquare,
  Shield,
  TrendingUp,
  Sparkles,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-blue-600" />
            <span className="text-xl font-bold text-slate-900">FinanceCopilot</span>
          </div>
          <Link
            href="/login"
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-1.5 text-sm font-medium text-blue-700 mb-6">
            <Sparkles className="h-4 w-4" />
            AI-Powered Financial Analysis
          </div>
          <h1 className="text-5xl font-bold tracking-tight text-slate-900 mb-6">
            Your personal accountant
            <br />
            <span className="text-blue-600">& financial analyst</span>
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-8">
            Upload your bank statements, get instant spending analysis, detect
            recurring subscriptions, and chat with an AI that knows your finances.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-8 py-3 text-base font-medium text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
          >
            Start Free
            <TrendingUp className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: Upload,
              title: "Upload Statements",
              desc: "Drop in your CSV bank statements. We auto-categorize every transaction using AI.",
            },
            {
              icon: BarChart3,
              title: "Visual Dashboard",
              desc: "See spending by category, income vs expenses, top merchants, and your Financial Confidence Score.",
            },
            {
              icon: MessageSquare,
              title: "Chat with Your Data",
              desc: "Ask questions about your spending. Get insights, risk alerts, and actionable recommendations.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-slate-200 bg-white p-8 hover:shadow-lg transition-shadow"
            >
              <div className="inline-flex rounded-lg bg-blue-50 p-3 mb-4">
                <feature.icon className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-2 text-sm text-slate-500">
            <Shield className="h-4 w-4" />
            Your data stays private. No account numbers stored. Server-side AI only.
          </div>
        </div>
      </main>
    </div>
  );
}
