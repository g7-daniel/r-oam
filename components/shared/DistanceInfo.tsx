'use client';

import { MapPin, Clock, Car, Footprints, Train } from 'lucide-react';
import clsx from 'clsx';
import type { TransitInfo } from '@/types';

interface DistanceInfoProps {
  distance?: number | string;
  duration?: string;
  transitInfo?: TransitInfo;
  fromLabel?: string;
  className?: string;
}

export default function DistanceInfo({
  distance,
  duration,
  transitInfo,
  fromLabel = 'city center',
  className,
}: DistanceInfoProps) {
  const getModeIcon = (mode: TransitInfo['mode']) => {
    switch (mode) {
      case 'walk':
        return <Footprints className="w-4 h-4" />;
      case 'train':
        return <Train className="w-4 h-4" />;
      case 'taxi':
      case 'uber':
        return <Car className="w-4 h-4" />;
      default:
        return <MapPin className="w-4 h-4" />;
    }
  };

  const formatDistance = (dist: number | string) => {
    if (typeof dist === 'string') return dist;
    if (dist < 1) {
      return `${Math.round(dist * 1000)}m`;
    }
    return `${dist.toFixed(1)}km`;
  };

  if (transitInfo) {
    return (
      <div className={clsx('flex items-center gap-3 text-sm text-gray-600', className)}>
        <div className="flex items-center gap-1.5">
          {getModeIcon(transitInfo.mode)}
          <span className="capitalize">{transitInfo.mode}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-4 h-4" />
          <span>{transitInfo.duration}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin className="w-4 h-4" />
          <span>{transitInfo.distance}</span>
        </div>
        {transitInfo.cost !== undefined && transitInfo.cost > 0 && (
          <span className="text-primary-600 font-medium">
            ~${transitInfo.cost}
          </span>
        )}
      </div>
    );
  }

  if (!distance && !duration) {
    return null;
  }

  return (
    <div className={clsx('flex items-center gap-2 text-sm text-gray-600', className)}>
      {distance !== undefined && (
        <div className="flex items-center gap-1">
          <MapPin className="w-4 h-4 text-gray-400" />
          <span>
            {formatDistance(distance)} from {fromLabel}
          </span>
        </div>
      )}
      {duration && (
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4 text-gray-400" />
          <span>{duration}</span>
        </div>
      )}
    </div>
  );
}
