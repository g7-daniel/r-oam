'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { cn, getPlaceholderImage, type PlaceholderType } from '@/lib/utils';

// Base64 blur placeholder - a tiny 10x10 pixel neutral gray image
const DEFAULT_BLUR_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVR42mN8+/btfwYKACMqAQAAAP//AwAI/AL+8xyZ5wAAAABJRU5ErkJggg==';

interface FallbackImageProps {
  /** Image source URL */
  src?: string | null;
  /** Alternative text for accessibility */
  alt: string;
  /** Width in pixels (required for non-fill images) */
  width?: number;
  /** Height in pixels (required for non-fill images) */
  height?: number;
  /** Use fill mode (image fills parent container) */
  fill?: boolean;
  /** The type of placeholder to show on error */
  fallbackType?: PlaceholderType;
  /** Optional custom fallback content (overrides fallbackType) */
  fallbackContent?: React.ReactNode;
  /** Whether to show a loading skeleton while image loads */
  showSkeleton?: boolean;
  /** Container className for the wrapper div */
  containerClassName?: string;
  /** Image className */
  className?: string;
  /** Priority loading (for above-the-fold images) */
  priority?: boolean;
  /** Loading strategy: 'lazy' (default), 'eager' */
  loading?: 'lazy' | 'eager';
  /** Object fit style */
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  /** Image sizes for responsive loading */
  sizes?: string;
  /** Quality (1-100) */
  quality?: number;
  /** Custom blur data URL for placeholder */
  blurDataURL?: string;
  /** Enable blur placeholder */
  placeholder?: 'blur' | 'empty';
  /** Callback when image loads successfully */
  onLoad?: () => void;
  /** Callback when image fails to load */
  onError?: () => void;
}

/**
 * Optimized image component with built-in fallback handling using next/image
 *
 * Features:
 * - Uses next/image for automatic optimization
 * - Shows a type-appropriate SVG placeholder when image fails to load
 * - Supports blur placeholder for better UX during loading
 * - Prevents layout shift with proper width/height or fill
 * - Lazy loading by default for off-screen images
 * - Optional loading skeleton
 *
 * Usage:
 * ```tsx
 * // Fixed dimensions
 * <FallbackImage
 *   src={hotel.imageUrl}
 *   alt={hotel.name}
 *   width={400}
 *   height={300}
 *   fallbackType="hotel"
 * />
 *
 * // Fill parent container (requires relative parent)
 * <div className="relative w-full h-48">
 *   <FallbackImage
 *     src={hotel.imageUrl}
 *     alt={hotel.name}
 *     fill
 *     fallbackType="hotel"
 *     className="object-cover"
 *   />
 * </div>
 * ```
 */
export function FallbackImage({
  src,
  alt,
  width,
  height,
  fill = false,
  fallbackType = 'generic',
  fallbackContent,
  showSkeleton = false,
  containerClassName,
  className,
  priority = false,
  loading,
  objectFit = 'cover',
  sizes,
  quality = 75,
  blurDataURL,
  placeholder = 'blur',
  onLoad,
  onError,
}: FallbackImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const prevSrcRef = useRef(src);

  // Reset error/loading state when src changes so a new valid image can load
  useEffect(() => {
    if (prevSrcRef.current !== src) {
      prevSrcRef.current = src;
      setHasError(false);
      setIsLoading(true);
    }
  }, [src]);

  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoading(false);
    onError?.();
  }, [onError]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    onLoad?.();
  }, [onLoad]);

  // If custom fallback content is provided and there's an error, show it
  if (hasError && fallbackContent) {
    return (
      <div className={cn('w-full h-full', containerClassName)}>
        {fallbackContent}
      </div>
    );
  }

  // Get the image source - use placeholder if no src or error
  const imageSrc = hasError || !src ? getPlaceholderImage(fallbackType) : src;

  // Check if the source is a data URI (placeholder)
  const isDataUri = imageSrc.startsWith('data:');

  // For data URIs, we need to use unoptimized mode
  // Also for external URLs that may not be in the allowed domains
  const shouldUseUnoptimized = isDataUri || imageSrc.includes('googleusercontent');

  // Default sizes for responsive images
  const defaultSizes = fill
    ? '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
    : undefined;

  return (
    <div className={cn('relative w-full h-full overflow-hidden', containerClassName)}>
      {/* Loading skeleton */}
      {showSkeleton && isLoading && !hasError && (
        <div className="absolute inset-0 bg-slate-200 dark:bg-slate-700 animate-pulse" />
      )}

      {fill ? (
        <Image
          src={imageSrc}
          alt={alt}
          fill
          className={cn(
            'transition-opacity duration-300',
            isLoading && showSkeleton ? 'opacity-0' : 'opacity-100',
            objectFit === 'cover' && 'object-cover',
            objectFit === 'contain' && 'object-contain',
            objectFit === 'fill' && 'object-fill',
            objectFit === 'none' && 'object-none',
            objectFit === 'scale-down' && 'object-scale-down',
            className
          )}
          sizes={sizes || defaultSizes}
          quality={quality}
          priority={priority}
          loading={priority ? undefined : (loading || 'lazy')}
          placeholder={!isDataUri && placeholder === 'blur' ? 'blur' : 'empty'}
          blurDataURL={!isDataUri ? (blurDataURL || DEFAULT_BLUR_DATA_URL) : undefined}
          onLoad={handleLoad}
          onError={handleError}
          unoptimized={shouldUseUnoptimized}
        />
      ) : (
        <Image
          src={imageSrc}
          alt={alt}
          width={width || 400}
          height={height || 300}
          className={cn(
            'transition-opacity duration-300',
            isLoading && showSkeleton ? 'opacity-0' : 'opacity-100',
            className
          )}
          quality={quality}
          priority={priority}
          loading={priority ? undefined : (loading || 'lazy')}
          placeholder={!isDataUri && placeholder === 'blur' ? 'blur' : 'empty'}
          blurDataURL={!isDataUri ? (blurDataURL || DEFAULT_BLUR_DATA_URL) : undefined}
          onLoad={handleLoad}
          onError={handleError}
          unoptimized={shouldUseUnoptimized}
        />
      )}
    </div>
  );
}

export default FallbackImage;
