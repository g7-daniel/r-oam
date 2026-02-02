'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({
  className,
  variant = 'text',
  width,
  height,
  animation = 'pulse',
}: SkeletonProps) {
  const baseStyles = 'bg-slate-200 dark:bg-slate-700';

  const animationStyles = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: '',
  };

  const variantStyles = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: '',
    rounded: 'rounded-lg',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={cn(
        baseStyles,
        animationStyles[animation],
        variantStyles[variant],
        className
      )}
      style={style}
    />
  );
}

// Pre-built skeleton components for common patterns
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3', className)}>
      <Skeleton variant="rounded" height={160} className="w-full" />
      <Skeleton variant="text" className="w-3/4" />
      <Skeleton variant="text" className="w-1/2" />
      <div className="flex gap-2">
        <Skeleton variant="rounded" width={60} height={24} />
        <Skeleton variant="rounded" width={60} height={24} />
      </div>
    </div>
  );
}

export function SkeletonHotelCard() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <Skeleton variant="rectangular" height={180} className="w-full" />
      <div className="p-4 space-y-3">
        <Skeleton variant="text" className="w-4/5 h-5" />
        <Skeleton variant="text" className="w-2/3 h-4" />
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Skeleton variant="rounded" width={50} height={20} />
            <Skeleton variant="rounded" width={80} height={20} />
          </div>
          <Skeleton variant="rounded" width={70} height={28} />
        </div>
      </div>
    </div>
  );
}

export function SkeletonRestaurantCard() {
  return (
    <div className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
      <Skeleton variant="circular" width={48} height={48} />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" className="w-3/4 h-5" />
        <Skeleton variant="text" className="w-1/2 h-4" />
        <div className="flex gap-2">
          <Skeleton variant="rounded" width={40} height={16} />
          <Skeleton variant="rounded" width={30} height={16} />
        </div>
      </div>
    </div>
  );
}

export function SkeletonExperienceCard() {
  return (
    <div className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
      <Skeleton variant="rounded" width={80} height={80} />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" className="w-4/5 h-5" />
        <Skeleton variant="text" className="w-full h-4" />
        <div className="flex gap-2">
          <Skeleton variant="rounded" width={50} height={16} />
          <Skeleton variant="rounded" width={60} height={16} />
        </div>
      </div>
    </div>
  );
}

export function SkeletonAreaCard() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <Skeleton variant="rectangular" height={120} className="w-full" />
      <div className="p-4 space-y-2">
        <Skeleton variant="text" className="w-2/3 h-5" />
        <Skeleton variant="text" className="w-full h-4" />
        <div className="flex flex-wrap gap-1 mt-2">
          <Skeleton variant="rounded" width={60} height={20} />
          <Skeleton variant="rounded" width={50} height={20} />
          <Skeleton variant="rounded" width={70} height={20} />
        </div>
      </div>
    </div>
  );
}

export function SkeletonChatMessage() {
  return (
    <div className="flex gap-3 p-4">
      <Skeleton variant="circular" width={40} height={40} />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" className="w-1/4 h-3" />
        <Skeleton variant="text" className="w-full h-4" />
        <Skeleton variant="text" className="w-3/4 h-4" />
      </div>
    </div>
  );
}

// Loading grid for multiple cards
export function SkeletonCardGrid({ count = 4, CardComponent = SkeletonCard }: { count?: number; CardComponent?: React.ComponentType }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardComponent key={i} />
      ))}
    </div>
  );
}
