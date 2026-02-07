'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  MapPin,
  Utensils,
  Hotel,
  Compass,
  Search,
  Calendar,
  Plane,
  Heart
} from 'lucide-react';

type EmptyStateVariant =
  | 'destinations'
  | 'hotels'
  | 'restaurants'
  | 'experiences'
  | 'search'
  | 'trips'
  | 'favorites'
  | 'calendar'
  | 'generic';

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: ReactNode;
  className?: string;
}

const variantConfig: Record<EmptyStateVariant, { icon: ReactNode; title: string; description: string }> = {
  destinations: {
    icon: <MapPin className="w-12 h-12" />,
    title: 'No destinations yet',
    description: 'Start planning your trip by adding your first destination.',
  },
  hotels: {
    icon: <Hotel className="w-12 h-12" />,
    title: 'No hotels found',
    description: 'We couldn\'t find hotels matching your criteria. Try adjusting your filters.',
  },
  restaurants: {
    icon: <Utensils className="w-12 h-12" />,
    title: 'No restaurants found',
    description: 'We couldn\'t find restaurants in this area. Try a different location.',
  },
  experiences: {
    icon: <Compass className="w-12 h-12" />,
    title: 'No experiences found',
    description: 'We couldn\'t find activities matching your interests. Try different options.',
  },
  search: {
    icon: <Search className="w-12 h-12" />,
    title: 'No results',
    description: 'Try adjusting your search terms or filters.',
  },
  trips: {
    icon: <Plane className="w-12 h-12" />,
    title: 'No trips planned',
    description: 'Start planning your next adventure!',
  },
  favorites: {
    icon: <Heart className="w-12 h-12" />,
    title: 'No favorites yet',
    description: 'Save places you love to find them easily later.',
  },
  calendar: {
    icon: <Calendar className="w-12 h-12" />,
    title: 'Nothing scheduled',
    description: 'Add activities to your itinerary to see them here.',
  },
  generic: {
    icon: <MapPin className="w-12 h-12" />,
    title: 'Nothing here yet',
    description: 'Check back later or try a different action.',
  },
};

export function EmptyState({
  variant = 'generic',
  title,
  description,
  action,
  icon,
  className,
}: EmptyStateProps) {
  const config = variantConfig[variant];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-12 px-4',
        className
      )}
      role="status"
      aria-label={title || config.title}
    >
      <div className="text-slate-300 dark:text-slate-600 mb-4" aria-hidden="true">
        {icon || config.icon}
      </div>
      <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
        {title || config.title}
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6">
        {description || config.description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-5 py-2.5 min-h-[44px] bg-reddit hover:bg-reddit-dark text-white rounded-full font-medium transition-colors shadow-reddit hover:shadow-reddit-hover focus:outline-none focus:ring-2 focus:ring-reddit focus:ring-offset-2 dark:focus:ring-offset-slate-900"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// Inline empty state for smaller spaces
export function InlineEmptyState({
  message,
  action,
  className,
}: {
  message: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}) {
  return (
    <div
      className={cn(
        'text-center py-6 px-4 text-slate-500 dark:text-slate-400',
        className
      )}
      role="status"
    >
      <p className="text-sm">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-2 text-sm text-reddit hover:text-reddit-dark dark:text-orange-400 dark:hover:text-orange-300 font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-reddit focus:ring-offset-2 dark:focus:ring-offset-slate-900 rounded"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
