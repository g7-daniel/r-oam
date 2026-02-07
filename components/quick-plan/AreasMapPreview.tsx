'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { AreaCandidate } from '@/types/quick-plan';

// Dynamically import the map to avoid SSR issues with Leaflet
const MapWithNoSSR = dynamic(
  () => import('./AreasMapLeaflet'),
  {
    ssr: false,
    loading: () => (
      <div className="h-48 sm:h-56 md:h-64 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center transition-all duration-300 animate-pulse">
        <span className="text-sm text-slate-500 dark:text-slate-400">Loading map...</span>
      </div>
    ),
  }
);

interface AreasMapPreviewProps {
  areas: AreaCandidate[];
  selectedAreaIds: Set<string>;
  onAreaClick?: (areaId: string) => void;
}

export default function AreasMapPreview({ areas, selectedAreaIds, onAreaClick }: AreasMapPreviewProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Filter areas with valid coordinates
  // Reject (0,0) as it means "not geocoded", not an actual location
  const areasWithCoords = areas.filter(
    a =>
      a.centerLat != null &&
      a.centerLng != null &&
      !isNaN(a.centerLat) &&
      !isNaN(a.centerLng) &&
      isFinite(a.centerLat) &&
      isFinite(a.centerLng) &&
      a.centerLat >= -90 &&
      a.centerLat <= 90 &&
      a.centerLng >= -180 &&
      a.centerLng <= 180 &&
      !(a.centerLat === 0 && a.centerLng === 0)
  );

  if (areasWithCoords.length === 0) {
    return null;
  }

  if (!isClient) {
    return (
      <div className="h-48 sm:h-56 md:h-64 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center transition-all duration-300 animate-pulse">
        <span className="text-sm text-slate-500 dark:text-slate-400">Loading map...</span>
      </div>
    );
  }

  return (
    <MapWithNoSSR
      areas={areasWithCoords}
      selectedAreaIds={selectedAreaIds}
      onAreaClick={onAreaClick}
    />
  );
}
