'use client';

import { ReactNode } from 'react';
import { Train, Plane, Car, ExternalLink } from 'lucide-react';

interface CitySectionProps {
  destinationId: string;
  cityName: string;
  cityIcon: string;
  nights: number;
  transitTo?: {
    destinationName: string;
    mode: string;
    duration: string;
  };
  isLast: boolean;
  children: ReactNode;
}

export default function CitySection({
  destinationId,
  cityName,
  cityIcon,
  nights,
  transitTo,
  isLast,
  children,
}: CitySectionProps) {
  const getTransportIcon = (mode: string) => {
    switch (mode) {
      case 'train':
        return <Train className="w-4 h-4" />;
      case 'plane':
        return <Plane className="w-4 h-4" />;
      case 'car':
        return <Car className="w-4 h-4" />;
      default:
        return <Train className="w-4 h-4" />;
    }
  };

  const getTicketUrl = (mode: string, from: string, to: string) => {
    switch (mode) {
      case 'train':
        return `https://www.google.com/search?q=${encodeURIComponent(`${from} to ${to} train tickets`)}`;
      case 'plane':
        return `https://www.google.com/flights?q=${encodeURIComponent(`flights ${from} to ${to}`)}`;
      default:
        return null;
    }
  };

  return (
    <div className="relative">
      {/* City header */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-800/80 px-4 py-3 rounded-xl mb-3 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{cityIcon}</span>
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white uppercase tracking-wide">
                {cityName}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {nights} {nights === 1 ? 'night' : 'nights'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Days */}
      <div className="space-y-3 ml-2 pl-4 border-l-2 border-slate-200 dark:border-slate-700">
        {children}
      </div>

      {/* Transit to next city */}
      {transitTo && !isLast && (
        <div className="my-4 mx-2">
          <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/50 rounded-full flex items-center justify-center text-amber-600 dark:text-amber-400">
              {getTransportIcon(transitTo.mode)}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-slate-900 dark:text-white">
                Travel to {transitTo.destinationName}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {transitTo.duration} by{' '}
                {transitTo.mode === 'train' ? 'Shinkansen' : transitTo.mode}
              </p>
            </div>
            {getTicketUrl(transitTo.mode, cityName, transitTo.destinationName) && (
              <a
                href={getTicketUrl(transitTo.mode, cityName, transitTo.destinationName)!}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded-lg transition-colors"
              >
                Get tickets
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
