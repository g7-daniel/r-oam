'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTripStoreV2 } from '@/stores/tripStoreV2';
import ItineraryBuilder from '@/components/builder/ItineraryBuilder';

export default function TripPage() {
  const params = useParams();
  const router = useRouter();
  const { trip, _hasHydrated } = useTripStoreV2();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Only redirect after store has hydrated from localStorage
    if (isClient && _hasHydrated) {
      // If no destinations, redirect to start page
      if (trip.destinations.length === 0) {
        router.push('/plan/start');
      }
    }
  }, [isClient, _hasHydrated, trip.destinations.length, router]);

  // Show loading until client-side and store is hydrated
  if (!isClient || !_hasHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-200 dark:border-primary-800 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-slate-400">Loading your trip...</p>
        </div>
      </div>
    );
  }

  if (trip.destinations.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
        <div className="text-center">
          <p className="text-gray-600 dark:text-slate-400">Redirecting to start...</p>
        </div>
      </div>
    );
  }

  return <ItineraryBuilder />;
}
