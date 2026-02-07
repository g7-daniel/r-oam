'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X, Maximize2 } from 'lucide-react';
import clsx from 'clsx';
import { getPlaceholderImage } from '@/lib/utils';

// Base64 blur placeholder
const BLUR_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVR42mN8+/btfwYKACMqAQAAAP//AwAI/AL+8xyZ5wAAAABJRU5ErkJggg==';

interface ImageGalleryProps {
  images: string[];
  alt: string;
}

export default function ImageGallery({ images, alt }: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set([0]));
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());

  // Reset index when images array changes to prevent out-of-bounds access
  useEffect(() => {
    setCurrentIndex(0);
    setLoadedImages(new Set([0]));
    setFailedImages(new Set());
  }, [images]);

  const handleImageError = useCallback((index: number) => {
    setFailedImages((prev) => new Set(Array.from(prev).concat([index])));
  }, []);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => {
      const newIndex = prev === 0 ? images.length - 1 : prev - 1;
      setLoadedImages((loaded) => new Set(Array.from(loaded).concat([newIndex])));
      return newIndex;
    });
  }, [images.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => {
      const newIndex = prev === images.length - 1 ? 0 : prev + 1;
      setLoadedImages((loaded) => new Set(Array.from(loaded).concat([newIndex])));
      return newIndex;
    });
  }, [images.length]);

  const handleThumbnailClick = useCallback((index: number) => {
    setCurrentIndex(index);
    setLoadedImages((loaded) => new Set(Array.from(loaded).concat([index])));
  }, []);

  if (images.length === 0) {
    return (
      <div className="aspect-video bg-slate-200 dark:bg-slate-700 rounded-xl flex items-center justify-center">
        <span className="text-slate-400 dark:text-slate-500">No images available</span>
      </div>
    );
  }

  return (
    <>
      {/* Main Gallery */}
      <div className="space-y-3">
        {/* Main Image */}
        <div className="relative aspect-video rounded-xl overflow-hidden group bg-slate-200 dark:bg-slate-700">
          {failedImages.has(currentIndex) ? (
            <div className="w-full h-full flex items-center justify-center bg-slate-200 dark:bg-slate-700">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getPlaceholderImage('hotel')}
                alt={`${alt} - Image unavailable`}
                className="w-24 h-24 opacity-50"
              />
            </div>
          ) : (
            <Image
              src={images[currentIndex]}
              alt={`${alt} - Image ${currentIndex + 1}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 60vw"
              priority={currentIndex === 0}
              loading={currentIndex === 0 ? 'eager' : 'lazy'}
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
              onError={() => handleImageError(currentIndex)}
            />
          )}

          {/* Navigation Arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-3 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-6 h-6 text-slate-700 dark:text-white" aria-hidden="true" />
              </button>
              <button
                onClick={goToNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                aria-label="Next image"
              >
                <ChevronRight className="w-6 h-6 text-slate-700 dark:text-white" aria-hidden="true" />
              </button>
            </>
          )}

          {/* Expand Button */}
          <button
            onClick={() => setIsLightboxOpen(true)}
            className="absolute top-3 right-3 min-w-[44px] min-h-[44px] w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
            aria-label="View full size"
          >
            <Maximize2 className="w-5 h-5 text-slate-700 dark:text-white" aria-hidden="true" />
          </button>

          {/* Image Counter */}
          <div className="absolute bottom-3 right-3 px-3 py-1 bg-black/60 text-white text-sm rounded-full" aria-hidden="true">
            {currentIndex + 1} / {images.length}
          </div>
        </div>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Image thumbnails">
            {images.map((image, index) => (
              <button
                key={index}
                onClick={() => handleThumbnailClick(index)}
                role="tab"
                aria-selected={index === currentIndex}
                aria-label={`View image ${index + 1}`}
                className={clsx(
                  'relative flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition-all focus:outline-none focus:ring-2 focus:ring-orange-500',
                  index === currentIndex
                    ? 'border-orange-500 ring-2 ring-orange-200 dark:ring-orange-800'
                    : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600'
                )}
              >
                {failedImages.has(index) ? (
                  <div className="w-full h-full bg-slate-200 dark:bg-slate-700" />
                ) : (
                  <Image
                    src={image}
                    alt={`${alt} thumbnail ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="80px"
                    loading="lazy"
                    placeholder="blur"
                    blurDataURL={BLUR_DATA_URL}
                    onError={() => handleImageError(index)}
                  />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {isLightboxOpen && (
        <LightboxWrapper onClose={() => setIsLightboxOpen(false)}>
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setIsLightboxOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Image lightbox"
        >
          <button
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-4 right-4 min-w-[44px] min-h-[44px] w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Close lightbox"
          >
            <X className="w-6 h-6" aria-hidden="true" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              goToPrevious();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-8 h-8" aria-hidden="true" />
          </button>

          <div
            className="relative max-w-[90vw] max-h-[90vh] w-full h-full"
            onClick={(e) => e.stopPropagation()}
          >
            {failedImages.has(currentIndex) ? (
              <div className="w-full h-full flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getPlaceholderImage('hotel')}
                  alt={`${alt} - Image unavailable`}
                  className="w-32 h-32 opacity-50"
                />
              </div>
            ) : (
              <Image
                src={images[currentIndex]}
                alt={`${alt} - Full size ${currentIndex + 1}`}
                fill
                className="object-contain"
                sizes="90vw"
                priority
                placeholder="blur"
                blurDataURL={BLUR_DATA_URL}
                onError={() => handleImageError(currentIndex)}
              />
            )}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              goToNext();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Next image"
          >
            <ChevronRight className="w-8 h-8" aria-hidden="true" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2" role="tablist">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  handleThumbnailClick(index);
                }}
                role="tab"
                aria-selected={index === currentIndex}
                aria-label={`Go to image ${index + 1}`}
                className={clsx(
                  'w-3 h-3 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-white',
                  index === currentIndex
                    ? 'bg-white'
                    : 'bg-white/40 hover:bg-white/60'
                )}
              />
            ))}
          </div>
        </div>
        </LightboxWrapper>
      )}
    </>
  );
}

/**
 * LightboxWrapper - handles Escape key, focus trap, and focus restoration for the lightbox dialog.
 */
function LightboxWrapper({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);

  // Lock body scroll while lightbox is open
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    triggerRef.current = document.activeElement;

    // Focus the close button inside the lightbox
    const wrapper = wrapperRef.current;
    if (wrapper) {
      const closeBtn = wrapper.querySelector<HTMLElement>('button[aria-label="Close lightbox"]');
      closeBtn?.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // Focus trap
      if (e.key === 'Tab' && wrapper) {
        const focusable = wrapper.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus
      if (triggerRef.current && triggerRef.current instanceof HTMLElement) {
        triggerRef.current.focus();
      }
    };
  }, [onClose]);

  return <div ref={wrapperRef}>{children}</div>;
}
