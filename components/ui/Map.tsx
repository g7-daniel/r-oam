'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import clsx from 'clsx';
import { clientEnv } from '@/lib/env';

interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  type?: 'hotel' | 'experience' | 'flight';
  selected?: boolean;
}

interface MapProps {
  center: { lat: number; lng: number };
  zoom?: number;
  markers?: MapMarker[];
  onMarkerClick?: (markerId: string) => void;
  className?: string;
}

/**
 * Validate that latitude and longitude are within valid geographic ranges.
 */
function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    isFinite(lat) &&
    isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Escape HTML to prevent XSS in InfoWindow content.
 * SSR-safe: only runs in browser context
 */
function escapeHtml(str: string): string {
  if (typeof document === 'undefined') {
    // SSR fallback - basic escaping
    return str.replace(/[&<>"']/g, (char) => {
      const escapeChars: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      };
      return escapeChars[char] || char;
    });
  }
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

export default function Map({
  center,
  zoom = 12,
  markers = [],
  onMarkerClick,
  className,
}: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const listenersRef = useRef<google.maps.MapsEventListener[]>([]);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  // Initialize map - only once (no center/zoom in dependency array)
  useEffect(() => {
    const apiKey = clientEnv.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      setError('Google Maps API key not configured. Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local');
      return;
    }

    const initializeMap = () => {
      if (!mapRef.current || !window.google?.maps) return;
      // Avoid re-initializing if map already exists
      if (mapInstanceRef.current) return;

      mapInstanceRef.current = new google.maps.Map(mapRef.current, {
        center,
        zoom,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }],
          },
        ],
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      setMapLoaded(true);
    };

    // Check if Google Maps is already loaded
    if (window.google?.maps) {
      initializeMap();
      return;
    }

    // Check if a script tag for Google Maps already exists (e.g., from another component)
    const existingScript = document.querySelector(
      'script[src*="maps.googleapis.com/maps/api/js"]'
    );
    if (existingScript) {
      // Wait for the existing script to load
      existingScript.addEventListener('load', initializeMap);
      return () => {
        existingScript.removeEventListener('load', initializeMap);
        mapInstanceRef.current = null;
      };
    }

    // Load Google Maps script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = initializeMap;
    script.onerror = () => setError('Failed to load Google Maps. Please check your connection.');
    document.head.appendChild(script);
    scriptRef.current = script;

    return () => {
      // Cleanup markers and their event listeners
      // Guard against google not being loaded (script may have failed or not finished)
      if (typeof google !== 'undefined' && google.maps?.event) {
        listenersRef.current.forEach((listener) =>
          google.maps.event.removeListener(listener)
        );
      }
      listenersRef.current = [];
      markersRef.current.forEach((marker) => {
        try { marker.setMap(null); } catch { /* ignore if google not loaded */ }
      });
      markersRef.current = [];
      mapInstanceRef.current = null;
    };
    // Intentionally only run on mount/unmount - center/zoom updates handled separately
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers when they change
  const updateMarkers = useCallback(() => {
    if (!mapInstanceRef.current || !window.google?.maps) return;

    // Clear existing markers and their event listeners
    listenersRef.current.forEach((listener) =>
      google.maps.event.removeListener(listener)
    );
    listenersRef.current = [];
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    // Add new markers (only those with valid coordinates)
    markers
      .filter((markerData) => isValidCoordinate(markerData.lat, markerData.lng))
      .forEach((markerData) => {
        const iconColors: Record<string, string> = {
          hotel: '#F97316',
          experience: '#10B981',
          flight: '#0EA5E9',
        };

        const marker = new google.maps.Marker({
          position: { lat: markerData.lat, lng: markerData.lng },
          map: mapInstanceRef.current,
          title: markerData.title,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: markerData.selected ? 12 : 8,
            fillColor: iconColors[markerData.type || 'experience'],
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 2,
          },
        });

        // Add info window with escaped HTML to prevent XSS
        const infoWindow = new google.maps.InfoWindow({
          content: `<div class="p-2 font-sans"><strong>${escapeHtml(markerData.title)}</strong></div>`,
        });

        // On click: toggle InfoWindow and fire callback.
        // This ensures touch/mobile users can see the InfoWindow (no hover on touch).
        const clickListener = marker.addListener('click', () => {
          // Close any other open info windows by closing this one first
          infoWindow.close();
          infoWindow.open(mapInstanceRef.current, marker);
          onMarkerClick?.(markerData.id);
        });
        listenersRef.current.push(clickListener);

        // Desktop: also show on hover for quick preview
        const mouseoverListener = marker.addListener('mouseover', () => {
          infoWindow.open(mapInstanceRef.current, marker);
        });
        listenersRef.current.push(mouseoverListener);

        const mouseoutListener = marker.addListener('mouseout', () => {
          infoWindow.close();
        });
        listenersRef.current.push(mouseoutListener);

        markersRef.current.push(marker);
      });
  }, [markers, onMarkerClick]);

  useEffect(() => {
    if (mapLoaded) {
      updateMarkers();
    }
  }, [mapLoaded, updateMarkers]);

  // Update center when it changes (without reinitializing the map)
  useEffect(() => {
    if (mapInstanceRef.current && isValidCoordinate(center.lat, center.lng)) {
      mapInstanceRef.current.setCenter(center);
    }
  }, [center]);

  // Update zoom when it changes
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setZoom(zoom);
    }
  }, [zoom]);

  if (error) {
    return (
      <div
        className={clsx(
          'bg-gray-100 dark:bg-slate-800 rounded-xl flex items-center justify-center',
          className
        )}
        role="alert"
      >
        <div className="text-center p-8">
          <div className="text-4xl mb-4">Map</div>
          <p className="text-gray-500 dark:text-gray-400">{error}</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
            Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local to enable maps
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx('relative', className)}
      role="application"
      aria-label={`Map with ${markers.length} markers`}
    >
      <div ref={mapRef} className="w-full h-full rounded-xl" />
      {!mapLoaded && (
        <div
          className="absolute inset-0 bg-gray-100 dark:bg-slate-800 rounded-xl flex items-center justify-center"
          aria-busy="true"
          aria-label="Loading map"
        >
          <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

// Add TypeScript declaration for google maps
declare global {
  interface Window {
    google: typeof google;
  }
}
