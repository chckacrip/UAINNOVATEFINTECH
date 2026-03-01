"use client";

import { useState, useMemo, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, Loader2 } from "lucide-react";
import Link from "next/link";

function passwordStrength(password: string): { score: number; hint: string } {
  if (!password) return { score: 0, hint: "" };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  const hints = [
    "",
    "Use at least 8 characters",
    "Add numbers or symbols for strength",
    "Strong",
    "Very strong",
  ];
  return { score, hint: hints[Math.min(score, 4)] };
}

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState(searchParams.get("message") ?? "");
  const router = useRouter();

  const pwdStrength = useMemo(() => passwordStrength(password), [password]);
  const isPasswordWeak = isSignUp && password.length > 0 && pwdStrength.score < 2;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    let supabase;
    try {
      supabase = createClient();
    } catch (err) {
      setError(err instanceof Error ? err.message : "App is misconfigured. Check the console.");
      setLoading(false);
      return;
    }

    if (forgotPassword) {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/login&type=recovery`,
      });
      if (err) {
        setError(err.message);
      } else {
        setMessage("Check your email for a reset link.");
      }
      setLoading(false);
      return;
    }

    if (isSignUp) {
      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding` },
      });
      if (err) {
        setError(err.message);
      } else if (data?.user && !data?.session) {
        setMessage("Check your email to confirm your account before signing in.");
      } else {
        router.refresh();
        window.location.href = "/onboarding";
        return;
      }
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (err) {
        setError(err.message);
      } else {
        router.refresh();
        window.location.href = "/dashboard";
        return;
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <div className="flex-1 flex items-center justify-center px-4 py-6 sm:py-8">
        <div className="w-full max-w-md text-center">
          <p className="text-slate-600 dark:text-slate-400 mb-6 sm:mb-8 text-sm sm:text-base">
            {forgotPassword
              ? "Reset your password"
              : isSignUp
                ? "Create your account"
                : "Welcome back"}
          </p>

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 sm:p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 pl-10 pr-4 py-3 text-base sm:text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-slate-900 dark:text-white touch-manipulation"
                  placeholder="you@example.com"
                  />
                </div>
              </div>

              {!forgotPassword && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required={!forgotPassword}
                      minLength={6}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 pl-10 pr-4 py-3 text-base sm:text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-slate-900 dark:text-white touch-manipulation"
                  placeholder="••••••••"
                    />
                  </div>
                  {isSignUp && pwdStrength.hint && (
                    <p
                      className={`mt-1 text-xs ${
                        isPasswordWeak ? "text-amber-600 dark:text-amber-400" : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {pwdStrength.hint}
                    </p>
                  )}
                </div>
              )}

              {error && (
                <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                  {error}
                </div>
              )}
              {message && (
                <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || (isSignUp && isPasswordWeak)}
                className="w-full rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 touch-manipulation min-h-[48px]"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {forgotPassword
                  ? "Send reset link"
                  : isSignUp
                    ? "Create Account"
                    : "Sign In"}
              </button>
            </form>

            <div className="mt-6 text-center space-y-2">
              {forgotPassword ? (
                <button
                  type="button"
                  onClick={() => {
                    setForgotPassword(false);
                    setError("");
                    setMessage("");
                  }}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  Back to sign in
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      setError("");
                      setMessage("");
                    }}
                    className="block w-full text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium py-2.5 touch-manipulation min-h-[44px] flex items-center justify-center"
                  >
                    {isSignUp
                      ? "Already have an account? Sign in"
                      : "Don't have an account? Sign up"}
                  </button>
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={() => {
                        setForgotPassword(true);
                        setError("");
                        setMessage("");
                      }}
                      className="block w-full text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 py-2.5 touch-manipulation min-h-[44px]"
                    >
                      Forgot password?
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
          <p className="mt-6 text-xs text-slate-500 dark:text-slate-400">
            <Link href="/" className="hover:underline">Back to home</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900"><p className="text-slate-500">Loading...</p></div>}>
      <LoginForm />
    </Suspense>
  );
}
