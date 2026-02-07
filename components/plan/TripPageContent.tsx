'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTripStore } from '@/stores/tripStore';
import ItineraryBuilder from '@/components/builder/ItineraryBuilder';

export default function TripPageContent() {
  const params = useParams();
  const router = useRouter();
  const trip = useTripStore((state) => state.trip);
  const [isReady, setIsReady] = useState(false);
  const [hasDestinations, setHasDestinations] = useState<boolean | null>(null);

  useEffect(() => {
    // Check localStorage directly to see if there are destinations
    // This avoids race conditions with Zustand hydration
    try {
      const stored = localStorage.getItem('wandercraft-trip-v2');
      if (stored) {
        const parsed = JSON.parse(stored);
        const destinations = parsed?.state?.trip?.destinations || [];
        console.log(`[TripPageContent] localStorage check: ${destinations.length} destinations, version=${parsed?.version}, tripId=${parsed?.state?.trip?.id}`);
        setHasDestinations(destinations.length > 0);
      } else {
        console.log('[TripPageContent] localStorage check: no data found');
        setHasDestinations(false);
      }
    } catch (e) {
      console.error('[TripPageContent] localStorage read error:', e);
      // If localStorage fails, fall back to store state after delay
      setHasDestinations(null);
    }
    setIsReady(true);
  }, []);

  useEffect(() => {
    // Redirect only if we're sure there are no destinations
    if (isReady && hasDestinations === false) {
      router.push('/plan/start');
    }
  }, [isReady, hasDestinations, router]);

  // Show loading until ready
  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-200 dark:border-primary-800 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-slate-400">Loading your trip...</p>
        </div>
      </div>
    );
  }

  // If we checked localStorage and found no destinations, show redirect message
  if (hasDestinations === false) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
        <div className="text-center">
          <p className="text-gray-600 dark:text-slate-400">Redirecting to start...</p>
        </div>
      </div>
    );
  }

  // If localStorage check failed, use store state (with fallback)
  if (hasDestinations === null && trip.destinations.length === 0) {
    // Give store more time to hydrate before redirecting
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-200 dark:border-primary-800 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-slate-400">Loading your trip...</p>
        </div>
      </div>
    );
  }

  return <ItineraryBuilder />;
}
