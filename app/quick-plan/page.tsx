'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft, Zap, Loader2 } from 'lucide-react';
import { useJsApiLoader } from '@react-google-maps/api';

// Libraries needed for Places Autocomplete
const GOOGLE_MAPS_LIBRARIES: ('places')[] = ['places'];

// Lazy load the chat UI
const QuickPlanChat = dynamic(
  () => import('@/components/quick-plan/QuickPlanChat'),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-96"><div className="animate-pulse text-slate-400">Loading chat...</div></div> }
);

export default function QuickPlanPage() {
  // Load Google Maps script with Places library
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  // Show loading state while Google Maps loads
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse">
            <Zap className="w-8 h-8 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-4">
            <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
            <p className="text-slate-600 dark:text-slate-400">Loading Quick Plan...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error if Google Maps failed to load
  if (loadError) {
    console.error('Google Maps load error:', loadError);
  }
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
          <span className="text-xs px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full font-medium">
            BETA
          </span>
        </div>
      </header>

      {/* Main content */}
      <main>
        <QuickPlanChat />
      </main>
    </div>
  );
}
