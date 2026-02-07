'use client';

import { useCallback, useState, useMemo, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Polyline } from '@react-google-maps/api';
import type { Experience } from '@/types';
import { Loader2 } from 'lucide-react';
import { clientEnv } from '@/lib/env';

interface TripMapProps {
  experiences: Experience[];
  selectedExperiences?: string[];
  center?: { lat: number; lng: number };
  zoom?: number;
  onExperienceClick?: (experience: Experience) => void;
  onExperienceSelect?: (experience: Experience) => void;
  showRoute?: boolean;
  height?: string;
  className?: string;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = { lat: 9.7489, lng: -83.7534 }; // Costa Rica default

// Stabilize the libraries array to prevent useJsApiLoader from reloading
// on every render (it uses referential equality)
const GOOGLE_MAPS_LIBRARIES: ('places')[] = ['places'];

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  zoomControlOptions: {
    position: 7, // google.maps.ControlPosition.RIGHT_TOP
  },
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
  fullscreenControlOptions: {
    position: 7, // google.maps.ControlPosition.RIGHT_TOP
  },
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }],
    },
  ],
};

const categoryColors: Record<string, string> = {
  beaches: '#0EA5E9', // sky-500
  museums: '#8B5CF6', // violet-500
  food_tours: '#F97316', // orange-500
  nightlife: '#EC4899', // pink-500
  day_trips: '#10B981', // emerald-500
  hidden_gems: '#F59E0B', // amber-500
  outdoor: '#22C55E', // green-500
  shopping: '#EF4444', // red-500
  cultural: '#6366F1', // indigo-500
  wellness: '#14B8A6', // teal-500
};

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

export default function TripMap({
  experiences,
  selectedExperiences = [],
  center,
  zoom = 12,
  onExperienceClick,
  onExperienceSelect,
  showRoute = false,
  height = '100%',
  className = '',
}: TripMapProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [activeMarker, setActiveMarker] = useState<string | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: clientEnv.GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Filter experiences to only those with valid coordinates
  const validExperiences = useMemo(
    () => experiences.filter((e) => isValidCoordinate(e.latitude, e.longitude)),
    [experiences]
  );

  // Calculate center from experiences if not provided
  const mapCenter = useMemo(() => {
    if (center) return center;
    if (validExperiences.length === 0) return defaultCenter;

    const lats = validExperiences.map((e) => e.latitude);
    const lngs = validExperiences.map((e) => e.longitude);
    return {
      lat: lats.reduce((a, b) => a + b, 0) / lats.length,
      lng: lngs.reduce((a, b) => a + b, 0) / lngs.length,
    };
  }, [center, validExperiences]);

  // Calculate route path from selected experiences
  const routePath = useMemo(() => {
    if (!showRoute || selectedExperiences.length < 2) return [];
    return selectedExperiences
      .map((id) => validExperiences.find((e) => e.id === id))
      .filter((e): e is Experience => e != null)
      .map((e) => ({ lat: e.latitude, lng: e.longitude }));
  }, [showRoute, selectedExperiences, validExperiences]);

  // Fit bounds when experiences change - useEffect instead of useMemo for side effects
  useEffect(() => {
    if (!map || validExperiences.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    validExperiences.forEach((exp) => {
      bounds.extend({ lat: exp.latitude, lng: exp.longitude });
    });

    // For a single marker, setZoom+setCenter instead of fitBounds (which can over-zoom)
    if (validExperiences.length === 1) {
      map.setCenter({ lat: validExperiences[0].latitude, lng: validExperiences[0].longitude });
      map.setZoom(14);
    } else {
      map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
    }
  }, [map, validExperiences]);

  // Clear activeMarker if it no longer exists in the experience list
  useEffect(() => {
    if (activeMarker && !validExperiences.find((e) => e.id === activeMarker)) {
      setActiveMarker(null);
    }
  }, [activeMarker, validExperiences]);

  const handleMarkerClick = (experience: Experience) => {
    setActiveMarker(experience.id);
    onExperienceClick?.(experience);

    // Smooth pan to marker when clicked
    if (map) {
      map.panTo({ lat: experience.latitude, lng: experience.longitude });
    }
  };

  const getMarkerIcon = (experience: Experience): google.maps.Symbol => {
    const isSelected = selectedExperiences.includes(experience.id);
    const isActive = activeMarker === experience.id;
    const color = categoryColors[experience.category] || '#6B7280';

    return {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: isSelected ? color : '#FFFFFF',
      fillOpacity: 1,
      strokeColor: color,
      strokeWeight: isSelected ? 3 : 2,
      scale: isActive ? 14 : isSelected ? 12 : 10,
    };
  };

  // Find the active experience for the InfoWindow - avoid defaulting to 0,0
  const activeExperience = activeMarker
    ? validExperiences.find((e) => e.id === activeMarker)
    : null;

  if (loadError) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-100 dark:bg-slate-800 ${className}`}
        style={{ height }}
        role="alert"
      >
        <p className="text-slate-500 dark:text-slate-400">Error loading maps. Please check your connection.</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-100 dark:bg-slate-800 ${className}`}
        style={{ height }}
        aria-busy="true"
        aria-label="Loading map"
      >
        <Loader2 className="w-8 h-8 animate-spin text-orange-500 dark:text-orange-400" />
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{ height }}
      role="application"
      aria-label={`Map showing ${validExperiences.length} experiences`}
    >
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={mapCenter}
        zoom={zoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={mapOptions}
      >
        {/* Experience Markers */}
        {validExperiences.map((experience) => (
          <Marker
            key={experience.id}
            position={{ lat: experience.latitude, lng: experience.longitude }}
            icon={getMarkerIcon(experience)}
            onClick={() => handleMarkerClick(experience)}
            title={experience.name}
            zIndex={selectedExperiences.includes(experience.id) ? 1000 : 1}
          />
        ))}

        {/* Info Window - only render when active experience is found */}
        {activeExperience && (
          <InfoWindow
            position={{
              lat: activeExperience.latitude,
              lng: activeExperience.longitude,
            }}
            onCloseClick={() => setActiveMarker(null)}
          >
            <div className="p-2 max-w-xs">
              <h3 className="font-semibold text-slate-900 mb-1">{activeExperience.name}</h3>
              <p className="text-sm text-slate-600 mb-2 line-clamp-2">{activeExperience.description}</p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">{activeExperience.duration}</span>
                <span className="font-medium text-sky-600">
                  {activeExperience.price > 0 ? `$${activeExperience.price}` : 'Free'}
                </span>
              </div>
              {onExperienceSelect && (
                <button
                  onClick={() => onExperienceSelect(activeExperience)}
                  className={`mt-2 w-full py-2 min-h-[40px] rounded-lg text-sm font-medium transition-all active:scale-95 ${
                    selectedExperiences.includes(activeExperience.id)
                      ? 'bg-sky-100 text-sky-700 hover:bg-sky-200'
                      : 'bg-sky-500 text-white hover:bg-sky-600 shadow-sm'
                  }`}
                  aria-label={selectedExperiences.includes(activeExperience.id) ? 'Already selected' : 'Add experience to trip'}
                >
                  {selectedExperiences.includes(activeExperience.id) ? 'Selected' : 'Add to Trip'}
                </button>
              )}
            </div>
          </InfoWindow>
        )}

        {/* Route Line */}
        {showRoute && routePath.length > 1 && (
          <Polyline
            path={routePath}
            options={{
              strokeColor: '#0EA5E9',
              strokeOpacity: 0.8,
              strokeWeight: 3,
              geodesic: true,
            }}
          />
        )}
      </GoogleMap>
    </div>
  );
}
