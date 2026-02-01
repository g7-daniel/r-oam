'use client';

import ThemeToggle from '@/components/ui/ThemeToggle';

export default function PlanLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 shadow-sm dark:shadow-slate-700/20 sticky top-0 z-50 transition-colors duration-300">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="text-2xl font-bold flex items-center gap-1">
            <span className="text-orange-500">r/</span>
            <span className="text-slate-900 dark:text-white">oam</span>
          </a>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500 dark:text-slate-400 hidden sm:block">
              Your dream vacation awaits
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
