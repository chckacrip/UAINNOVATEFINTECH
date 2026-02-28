import { AppNav } from "@/components/nav";
import { ToastProvider } from "@/contexts/toast";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <AppNav />
        <main className="w-full px-4 sm:px-6 lg:px-8 py-6">{children}</main>
      </div>
    </ToastProvider>
  );
}
