'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTripStore } from '@/stores/tripStore';

export default function PlanPage() {
  const router = useRouter();
  const trip = useTripStore((state) => state.trip);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Clear any corrupted localStorage data on first load
    try {
      const stored = localStorage.getItem('wandercraft-trip-v2');
      if (stored) {
        const data = JSON.parse(stored);
        // Validate stored data
        if (!data.state?.trip?.id) {
          localStorage.removeItem('wandercraft-trip-v2');
        }
      }
    } catch (e) {
      localStorage.removeItem('wandercraft-trip-v2');
    }

    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      // Route based on trip state
      if (trip.destinations.length > 0) {
        // Has destinations - go to builder
        router.push(`/plan/${trip.id}`);
      } else {
        // No destinations - go to start page
        router.push('/plan/start');
      }
    }
  }, [isClient, trip.destinations.length, trip.id, router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] bg-slate-50 dark:bg-slate-900">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary-200 dark:border-primary-800 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-600 dark:text-slate-400">Loading your journey planner...</p>
      </div>
    </div>
  );
}
