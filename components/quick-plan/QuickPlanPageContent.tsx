'use client';

/**
 * QuickPlanPageContent
 *
 * UX-R1 audit fixes:
 * - Added role="status" and aria-label to the loading state for screen reader announcements
 * - Added h1 heading to loading screen for accessibility (sr-only so layout unchanged)
 * - Added proper error UI when Google Maps fails to load (was only console.error before)
 * - Added safe-area-inset-bottom to loading screen for consistency on notched devices
 * - Improved dynamic import loading fallback with role="status"
 */

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft, Zap, Loader2, AlertTriangle } from 'lucide-react';
import { useJsApiLoader } from '@react-google-maps/api';
import { clientEnv } from '@/lib/env';

// Libraries needed for Places Autocomplete
const GOOGLE_MAPS_LIBRARIES: ('places')[] = ['places'];

// Lazy load the chat UI
const QuickPlanChat = dynamic(
  () => import('@/components/quick-plan/QuickPlanChat'),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-96" role="status" aria-label="Loading chat interface"><div className="animate-pulse text-slate-400">Loading chat...</div></div> }
);

export default function QuickPlanPageContent() {
  // Load Google Maps script with Places library
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: clientEnv.GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  // Show loading state while Google Maps loads
  if (!isLoaded && !loadError) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center safe-area-inset-bottom safe-area-inset-top" role="status" aria-label="Loading Quick Plan">
        <h1 className="sr-only">Quick Plan - Loading</h1>
        <div className="text-center">
          <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse" aria-hidden="true">
            <Zap className="w-8 h-8 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-4">
            <Loader2 className="w-5 h-5 text-orange-500 animate-spin" aria-hidden="true" />
            <p className="text-slate-600 dark:text-slate-400">Loading Quick Plan...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error if Google Maps failed to load
  if (loadError) {
    console.error('Google Maps load error:', loadError);
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center safe-area-inset-bottom safe-area-inset-top px-4">
        <h1 className="sr-only">Quick Plan - Error</h1>
        <div className="text-center max-w-md" role="alert">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6" aria-hidden="true">
            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            Unable to load maps
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            We could not load Google Maps, which is needed for destination search. Please check your internet connection and try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50 safe-area-inset-top">
        <div className="max-w-4xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors min-h-[44px] min-w-[44px] sm:min-w-0 justify-center sm:justify-start"
              aria-label="Go back home"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm hidden sm:inline">Home</span>
            </Link>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-600 hidden sm:block" aria-hidden="true" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center" aria-hidden="true">
                <Zap className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              </div>
              <h1 className="font-semibold text-slate-900 dark:text-white">Quick Plan</h1>
            </div>
          </div>
          <span className="text-xs px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full font-medium">
            BETA
          </span>
        </div>
      </header>

      {/* Main content */}
      <main className="safe-area-inset-bottom">
        <QuickPlanChat />
      </main>
    </div>
  );
}
