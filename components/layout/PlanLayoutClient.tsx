'use client';

import ThemeToggle from '@/components/ui/ThemeToggle';

export default function PlanLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 shadow-sm dark:shadow-slate-700/20 sticky top-0 z-50 transition-colors duration-300 safe-area-inset-top">
        <div className="container mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <a
            href="/"
            className="text-2xl font-bold flex items-center gap-1 transition-all duration-300 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-800 rounded-lg px-2 py-1 -ml-2"
            aria-label="Return to r/oam home page"
          >
            <span className="text-orange-500 transition-colors duration-300">r/</span>
            <span className="text-slate-900 dark:text-white transition-colors duration-300">oam</span>
          </a>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="text-sm text-slate-600 dark:text-slate-300 hidden sm:block font-medium">
              Your dream vacation awaits
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main id="main-content" className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 safe-area-inset">
        {children}
      </main>
    </div>
  );
}
