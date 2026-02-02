import Link from 'next/link';
import { MapPin, Home, Zap } from 'lucide-react';

export default function QuickPlanNotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
          <MapPin className="w-8 h-8 text-slate-400 dark:text-slate-500" />
        </div>
        <h1 className="text-6xl font-bold text-slate-200 dark:text-slate-700 mb-4">404</h1>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
          Page not found
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-8">
          This destination doesn't exist. Let's get you back on track.
        </p>
        <div className="space-y-3">
          <Link
            href="/quick-plan"
            className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-orange-500 text-white font-medium rounded-xl hover:bg-orange-600 transition-colors"
          >
            <Zap className="w-4 h-4" />
            Start Planning
          </Link>
          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full px-6 py-3 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Home className="w-4 h-4" />
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
