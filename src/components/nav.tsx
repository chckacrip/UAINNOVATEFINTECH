"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
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
  Menu,
  X,
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [burgerOpen, setBurgerOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false);
  const burgerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeBurger = (e: MouseEvent) => {
      if (burgerRef.current && !burgerRef.current.contains(e.target as Node)) setBurgerOpen(false);
    };
    if (burgerOpen) document.addEventListener("click", closeBurger);
    return () => document.removeEventListener("click", closeBurger);
  }, [burgerOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement).getAttribute("contenteditable") === "true") return;
      if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); setShortcutsHelpOpen(true); }
      if ((e.key === "n" || e.key === "N") && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); setQuickAddOpen(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const linkClass = (isActive: boolean) =>
    `flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
      isActive
        ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
    }`;

  return (
    <nav className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
      <div className="w-full flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center gap-4 md:gap-6">
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
            <Image src="/motionfi.png" alt="MotionFi" width={28} height={28} className="h-7 w-7 object-contain" />
            <span className="font-bold text-slate-900 dark:text-white hidden sm:inline">MotionFi</span>
          </Link>
          <div className="hidden lg:flex items-center gap-0.5 overflow-x-auto">
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
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setQuickAddOpen(true)}
            className="rounded-lg p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Quick add transaction"
            title="Quick add transaction"
          >
            <Plus className="h-5 w-5" />
          </button>
          <div className="relative" ref={burgerRef}>
            <button
              type="button"
              onClick={() => setBurgerOpen((o) => !o)}
              className="rounded-lg p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="More"
              title="More"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
            {burgerOpen && (
              <div className="absolute right-0 top-full mt-1 py-1 w-48 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg z-50">
                {BURGER_NAV.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setBurgerOpen(false)}
                      className={linkClass(isActive) + " flex w-full px-3 py-2"}
                    >
                      <item.icon className="h-3.5 w-3.5" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className="lg:hidden rounded-lg p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <ThemeToggle />
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
      <QuickAddTransaction open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
      <ShortcutsHelp open={shortcutsHelpOpen} onClose={() => setShortcutsHelpOpen(false)} />
      {mobileOpen && (
        <div className="lg:hidden border-t border-slate-200 dark:border-slate-700 px-4 py-3 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex flex-col gap-0.5">
            {MAIN_NAV.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={linkClass(isActive)}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
            <div className="border-t border-slate-200 dark:border-slate-600 my-1 pt-1" />
            {BURGER_NAV.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={linkClass(isActive)}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}
