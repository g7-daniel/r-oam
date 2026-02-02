'use client';

import QuickPlanWizard from '@/components/quick-plan/QuickPlanWizard';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft, Zap } from 'lucide-react';

// Lazy load the new chat UI to keep bundle size down when using wizard
const QuickPlanChat = dynamic(
  () => import('@/components/quick-plan/QuickPlanChat'),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-96"><div className="animate-pulse text-slate-400">Loading chat...</div></div> }
);

// Feature flag: use new chat UI or old wizard
// Set NEXT_PUBLIC_QUICK_PLAN_WIZARD=true in .env.local to use old wizard UI
const USE_NEW_CHAT_UI = process.env.NEXT_PUBLIC_QUICK_PLAN_WIZARD !== 'true';

export default function QuickPlanPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Home</span>
            </Link>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-600" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              </div>
              <span className="font-semibold text-slate-900 dark:text-white">Quick Plan</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {USE_NEW_CHAT_UI && (
              <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full font-medium">
                CHAT
              </span>
            )}
            <span className="text-xs px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full font-medium">
              BETA
            </span>
          </div>
        </div>
      </header>

      {/* Main content - feature flagged */}
      <main>
        {USE_NEW_CHAT_UI ? <QuickPlanChat /> : <QuickPlanWizard />}
      </main>
    </div>
  );
}
