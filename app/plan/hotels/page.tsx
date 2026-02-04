'use client';

import { useRouter } from 'next/navigation';
import Step5HotelsV2 from '@/components/journey/Step5HotelsV2';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useTripStore } from '@/stores/tripStore';

export default function HotelsPage() {
  const router = useRouter();
  const { trip } = useTripStore();
  const { destinations } = trip;

  // Check if all hotels are selected
  const allHotelsSelected = destinations.every((d) => d.hotels.selectedHotelId);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push('/plan')}
            className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Itinerary
          </button>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-sm">
              <span className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-medium">
                <Check className="w-3.5 h-3.5" />
              </span>
              <span className="text-slate-400">Itinerary</span>
            </div>
            <div className="w-8 h-px bg-slate-300 dark:bg-slate-600" />
            <div className="flex items-center gap-1 text-sm">
              <span className="w-6 h-6 rounded-full bg-primary-500 text-white flex items-center justify-center text-xs font-medium">2</span>
              <span className="text-slate-900 dark:text-white font-medium">Hotels</span>
            </div>
            <div className="w-8 h-px bg-slate-300 dark:bg-slate-600" />
            <div className="flex items-center gap-1 text-sm">
              <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center text-xs font-medium">3</span>
              <span className="text-slate-400">Flights</span>
            </div>
          </div>
          <div className="w-32" />
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8 pb-16 md:pb-24">
        <Step5HotelsV2 />
      </div>

      {/* Bottom navigation bar - compact on mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-4 md:px-6 py-2 md:py-4 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          <button
            onClick={() => router.push('/plan')}
            className="px-3 md:px-4 py-1.5 md:py-2 text-sm md:text-base text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium transition-colors"
          >
            Back
          </button>
          <button
            onClick={() => router.push('/plan/flights')}
            disabled={!allHotelsSelected}
            className="flex items-center gap-1.5 md:gap-2 px-4 md:px-6 py-2 md:py-2.5 text-sm md:text-base bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="hidden sm:inline">Continue to</span> Flights
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
