"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "./theme-toggle";
import {
  LayoutDashboard,
  Upload,
  MessageSquare,
  LogOut,
  Settings,
  List,
  PiggyBank,
  Calculator,
  Users,
  RefreshCw,
  CreditCard,
  Plus,
  MoreHorizontal,
  User,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { QuickAddTransaction } from "./quick-add-transaction";
import { ShortcutsHelp } from "./shortcuts-help";

const MAIN_NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/transactions", label: "Transactions", icon: List },
  { href: "/subscriptions", label: "Subscriptions", icon: RefreshCw },
  { href: "/upload", label: "Upload", icon: Upload },
];

const BURGER_NAV = [
  { href: "/profile", label: "Profile", icon: User },
  { href: "/net-worth", label: "Net Worth", icon: PiggyBank },
  { href: "/debt", label: "Debt", icon: CreditCard },
  { href: "/tax", label: "Tax", icon: Calculator },
  { href: "/household", label: "Household", icon: Users },
  { href: "/onboarding", label: "Settings", icon: Settings },
];

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [burgerOpen, setBurgerOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false);
  const burgerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let supabase;
    try {
      supabase = createClient();
    } catch {
      setUser(null);
      return;
    }
    supabase.auth.getUser().then(({ data: { user: u } }) => setUser(u ?? null));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) =>
      setUser(session?.user ?? null)
    );
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const closeBurger = (e: MouseEvent) => {
      if (burgerRef.current && !burgerRef.current.contains(e.target as Node)) {
        setBurgerOpen(false);
      }
    };
    if (burgerOpen) document.addEventListener("click", closeBurger);
    return () => document.removeEventListener("click", closeBurger);
  }, [burgerOpen]);

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // e.g. missing env; still send user home
    }
    router.push("/");
  };

  const linkClass = (isActive: boolean) =>
    `flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
      isActive
        ? "bg-blue-500/15 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300"
        : "text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
    }`;

  return (
    <>
    <nav className="sticky top-0 z-50 border-b border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 backdrop-blur-md pt-[env(safe-area-inset-top)]">
      
      {/* Top Bar — compact on mobile */}
      <div className="flex h-14 sm:h-16 w-full items-center justify-between gap-2 px-4 sm:px-6">

        {/* LEFT: Logo — smaller on mobile */}
        <div className="flex items-center min-w-0 shrink">
          <Link href="/dashboard" className="flex items-center" aria-label="MotionFi home">
            <Image
              src="/lightmode.png"
              alt=""
              width={200}
              height={40}
              priority
              className="h-8 sm:h-10 md:h-12 lg:h-14 w-auto dark:hidden"
            />
            <Image
              src="/darkmode.png"
              alt=""
              width={200}
              height={40}
              priority
              className="hidden h-8 sm:h-10 md:h-12 lg:h-14 w-auto dark:block"
            />
          </Link>
        </div>

        {/* CENTER: Main nav on desktop */}
        <div className="hidden lg:flex items-center gap-0.5 flex-1 justify-center">
          {MAIN_NAV.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className={linkClass(isActive)}>
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* RIGHT SIDE — touch-friendly on mobile */}
        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
          {user ? (
            <>
              <button
                type="button"
                onClick={() => setQuickAddOpen(true)}
                className="rounded-lg p-2.5 sm:p-1.5 text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center sm:min-h-0 sm:min-w-0 transition-colors"
                aria-label="Quick add transaction"
              >
                <Plus className="h-5 w-5" />
              </button>

              <Link
                href="/profile"
                className={`${linkClass(pathname === "/profile")} touch-manipulation min-h-[44px] min-w-[44px] justify-center sm:min-h-0 sm:min-w-0 sm:px-2.5 sm:py-1.5`}
                aria-label="Profile"
              >
                <User className="h-5 w-5 sm:h-4 sm:w-4 shrink-0" />
                <span className="hidden sm:inline">Profile</span>
              </Link>

              <div className="relative" ref={burgerRef}>
                <button
                  type="button"
                  onClick={() => setBurgerOpen((o) => !o)}
                  className="rounded-lg p-2.5 sm:p-1.5 text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center gap-1.5 sm:min-h-0 sm:min-w-0 transition-colors"
                  aria-label="More menu"
                >
                  <MoreHorizontal className="h-5 w-5 shrink-0" />
                  <span className="hidden sm:inline text-sm font-medium">More</span>
                </button>

                {burgerOpen && (
                  <div className="absolute right-0 top-full mt-2 py-1 w-52 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-xl z-50">
                    {BURGER_NAV.map((item) => {
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setBurgerOpen(false)}
                          className={
                            "flex w-full items-center gap-2 px-3 py-2.5 text-sm " +
                            (isActive
                              ? "bg-blue-500/15 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300"
                              : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50")
                          }
                        >
                          <item.icon className="h-4 w-4" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              <ThemeToggle />

              <button
                onClick={handleSignOut}
                className="rounded-lg p-2.5 sm:p-1.5 text-slate-600 dark:text-slate-200 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-400 transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center sm:min-h-0 sm:min-w-0"
                aria-label="Sign out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[44px] flex items-center justify-center touch-manipulation"
            >
              Log in
            </Link>
          )}
        </div>
      </div>

      <QuickAddTransaction open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
      <ShortcutsHelp open={shortcutsHelpOpen} onClose={() => setShortcutsHelpOpen(false)} />
    </nav>

      {/* Mobile bottom nav — main links when logged in */}
      {user && (
        <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden no-print border-t border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 backdrop-blur-md pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-around h-14">
            {MAIN_NAV.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 py-2 text-xs font-medium transition-colors touch-manipulation min-h-[44px] ${
                    isActive
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-slate-500 dark:text-slate-300 active:bg-slate-100 dark:active:bg-slate-800"
                  }`}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span className="truncate max-w-[80px]">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}