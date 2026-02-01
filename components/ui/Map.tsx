'use client';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

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

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      setError('Google Maps API key not configured');
      return;
    }

    // Check if Google Maps is already loaded
    if (window.google?.maps) {
      initMap();
      return;
    }

    // Load Google Maps script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = initMap;
    script.onerror = () => setError('Failed to load Google Maps');
    document.head.appendChild(script);

    return () => {
      // Cleanup markers
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
    };
  }, []);

  const initMap = () => {
    if (!mapRef.current || !window.google?.maps) return;

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
    updateMarkers();
  };

  const updateMarkers = () => {
    if (!mapInstanceRef.current || !window.google?.maps) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    // Add new markers
    markers.forEach((markerData) => {
      const iconColors = {
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

      marker.addListener('click', () => {
        onMarkerClick?.(markerData.id);
      });

      // Add info window
      const infoWindow = new google.maps.InfoWindow({
        content: `<div class="p-2 font-sans"><strong>${markerData.title}</strong></div>`,
      });

      marker.addListener('mouseover', () => {
        infoWindow.open(mapInstanceRef.current, marker);
      });

      marker.addListener('mouseout', () => {
        infoWindow.close();
      });

      markersRef.current.push(marker);
    });
  };

  useEffect(() => {
    if (mapLoaded) {
      updateMarkers();
    }
  }, [markers, mapLoaded]);

  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setCenter(center);
    }
  }, [center]);

  if (error) {
    return (
      <div
        className={clsx(
          'bg-gray-100 rounded-xl flex items-center justify-center',
          className
        )}
      >
        <div className="text-center p-8">
          <div className="text-4xl mb-4">🗺️</div>
          <p className="text-gray-500">{error}</p>
          <p className="text-sm text-gray-400 mt-2">
            Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable maps
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('relative', className)}>
      <div ref={mapRef} className="w-full h-full rounded-xl" />
      {!mapLoaded && (
        <div className="absolute inset-0 bg-gray-100 rounded-xl flex items-center justify-center">
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
