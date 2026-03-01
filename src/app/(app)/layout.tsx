import { ToastProvider } from "@/contexts/toast";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <main className="w-full px-4 sm:px-6 lg:px-8 -mt-2 pt-2 pb-20 lg:pb-10 min-h-[100dvh]">{children}</main>
      </div>
    </ToastProvider>
  );
}
