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
      <div className="h-40 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
        <span className="text-sm text-slate-500">Loading map...</span>
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
  const areasWithCoords = areas.filter(
    a => a.centerLat && a.centerLng && !isNaN(a.centerLat) && !isNaN(a.centerLng)
  );

  if (areasWithCoords.length === 0) {
    return null;
  }

  if (!isClient) {
    return (
      <div className="h-40 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
        <span className="text-sm text-slate-500">Loading map...</span>
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
