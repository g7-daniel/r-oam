'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

export default function QuickPlanError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Quick Plan error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
          Something went wrong
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-2">
          {error.message || 'An error occurred while planning your trip'}
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-500 mb-6">
          Your preferences may have been saved. Try refreshing or starting over.
        </p>
        <div className="space-y-3">
          <button
            onClick={() => {
              // Clear Quick Plan localStorage data
              try {
                localStorage.removeItem('quick-plan-store');
              } catch (e) {
                console.error('Failed to clear storage:', e);
              }
              reset();
            }}
            className="w-full px-6 py-3 bg-amber-500 text-white font-medium rounded-xl hover:bg-amber-600 transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Reset & Start Fresh
          </button>
          <button
            onClick={reset}
            className="w-full px-6 py-3 bg-orange-500 text-white font-medium rounded-xl hover:bg-orange-600 transition-colors"
          >
            Try Again
          </button>
          <a
            href="/"
            className="block w-full px-6 py-3 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Go Home
          </a>
        </div>
      </div>
    </div>
  );
}
