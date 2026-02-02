import { Zap } from 'lucide-react';

export default function QuickPlanLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="text-center">
        <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse">
          <Zap className="w-8 h-8 text-orange-600 dark:text-orange-400" />
        </div>
        <div className="w-8 h-8 border-3 border-orange-200 dark:border-orange-800 border-t-orange-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-600 dark:text-slate-400">Loading Quick Plan...</p>
      </div>
    </div>
  );
}
