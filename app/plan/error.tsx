'use client';

import { useEffect } from 'react';

export default function PlanError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Plan error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
          Planning Error
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-2">
          {error.message || 'An error occurred while loading the planner'}
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-500 mb-6">
          This might be due to corrupted trip data. Try resetting.
        </p>
        <div className="space-y-3">
          <button
            onClick={() => {
              // Clear localStorage trip data
              try {
                localStorage.removeItem('trip-store-v2');
              } catch (e) {
                console.error('Failed to clear storage:', e);
              }
              reset();
            }}
            className="w-full px-6 py-3 bg-amber-500 text-white font-medium rounded-xl hover:bg-amber-600 transition-colors"
          >
            Reset Trip Data & Try Again
          </button>
          <button
            onClick={reset}
            className="w-full px-6 py-3 bg-primary-500 text-white font-medium rounded-xl hover:bg-primary-600 transition-colors"
          >
            Try Again (Keep Data)
          </button>
          <a
            href="/"
            className="block w-full px-6 py-3 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Go Home
          </a>
        </div>
      </div>
    </div>
  );
}
