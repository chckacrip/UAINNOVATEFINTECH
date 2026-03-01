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
    const supabase = createClient();
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
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const linkClass = (isActive: boolean) =>
    `flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
      isActive
        ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
    }`;

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
      
      {/* Top Bar */}
      <div className="flex h-16 w-full items-center justify-between px-0">

        {/* LEFT SIDE */}
        <div className="flex items-center gap-4 min-w-0">
          
          {/* Logo — larger: 5rem → 8rem by breakpoint */}
          <Link href="/dashboard" className="flex items-center">
            <Image
              src="/lightmode.png"
              alt="MotionFi"
              width={320}
              height={64}
              priority
              className="h-20 sm:h-24 md:h-28 lg:h-32 w-auto dark:hidden"
            />
            <Image
              src="/darkmode.png"
              alt="MotionFi"
              width={320}
              height={64}
              priority
              className="hidden h-20 sm:h-24 md:h-28 lg:h-32 w-auto dark:block"
            />
          </Link>

          {/* Main Navigation */}
          <div className="hidden lg:flex items-center gap-1">
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
        </div>

        {/* RIGHT SIDE */}
        <div className="flex items-center gap-1 pr-4">
          {user ? (
            <>
              <button
                type="button"
                onClick={() => setQuickAddOpen(true)}
                className="rounded-lg p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Plus className="h-5 w-5" />
              </button>

              <div className="relative" ref={burgerRef}>
                <button
                  type="button"
                  onClick={() => setBurgerOpen((o) => !o)}
                  className="rounded-lg p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>

                {burgerOpen && (
                  <div className="absolute right-0 top-full mt-2 py-1 w-52 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg z-50">
                    {BURGER_NAV.map((item) => {
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setBurgerOpen(false)}
                          className={
                            "flex w-full items-center gap-2 px-3 py-2 text-sm " +
                            (isActive
                              ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
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
                className="rounded-lg p-1.5 text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Get Started
            </Link>
          )}
        </div>
      </div>

      <QuickAddTransaction open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
      <ShortcutsHelp open={shortcutsHelpOpen} onClose={() => setShortcutsHelpOpen(false)} />
    </nav>
  );
}