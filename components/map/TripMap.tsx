'use client';

import { useCallback, useState, useMemo } from 'react';
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

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
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
    libraries: ['places'],
  });

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Calculate center from experiences if not provided
  const mapCenter = useMemo(() => {
    if (center) return center;
    if (experiences.length === 0) return defaultCenter;

    const lats = experiences.map((e) => e.latitude);
    const lngs = experiences.map((e) => e.longitude);
    return {
      lat: lats.reduce((a, b) => a + b, 0) / lats.length,
      lng: lngs.reduce((a, b) => a + b, 0) / lngs.length,
    };
  }, [center, experiences]);

  // Calculate route path from selected experiences
  const routePath = useMemo(() => {
    if (!showRoute || selectedExperiences.length < 2) return [];
    return selectedExperiences
      .map((id) => experiences.find((e) => e.id === id))
      .filter(Boolean)
      .map((e) => ({ lat: e!.latitude, lng: e!.longitude }));
  }, [showRoute, selectedExperiences, experiences]);

  // Fit bounds when experiences change
  useMemo(() => {
    if (!map || experiences.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    experiences.forEach((exp) => {
      bounds.extend({ lat: exp.latitude, lng: exp.longitude });
    });

    // Add padding to bounds
    map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
  }, [map, experiences]);

  const handleMarkerClick = (experience: Experience) => {
    setActiveMarker(experience.id);
    onExperienceClick?.(experience);
  };

  const getMarkerIcon = (experience: Experience): google.maps.Symbol => {
    const isSelected = selectedExperiences.includes(experience.id);
    const color = categoryColors[experience.category] || '#6B7280';

    return {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: isSelected ? color : '#FFFFFF',
      fillOpacity: 1,
      strokeColor: color,
      strokeWeight: isSelected ? 3 : 2,
      scale: isSelected ? 12 : 10,
    };
  };

  if (loadError) {
    return (
      <div className={`flex items-center justify-center bg-slate-100 ${className}`} style={{ height }}>
        <p className="text-slate-500">Error loading maps</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className={`flex items-center justify-center bg-slate-100 ${className}`} style={{ height }}>
        <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
      </div>
    );
  }

  return (
    <div className={className} style={{ height }}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={mapCenter}
        zoom={zoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={mapOptions}
      >
        {/* Experience Markers */}
        {experiences.map((experience) => (
          <Marker
            key={experience.id}
            position={{ lat: experience.latitude, lng: experience.longitude }}
            icon={getMarkerIcon(experience)}
            onClick={() => handleMarkerClick(experience)}
            zIndex={selectedExperiences.includes(experience.id) ? 1000 : 1}
          />
        ))}

        {/* Info Window */}
        {activeMarker && (
          <InfoWindow
            position={{
              lat: experiences.find((e) => e.id === activeMarker)?.latitude || 0,
              lng: experiences.find((e) => e.id === activeMarker)?.longitude || 0,
            }}
            onCloseClick={() => setActiveMarker(null)}
          >
            <div className="p-2 max-w-xs">
              {(() => {
                const exp = experiences.find((e) => e.id === activeMarker);
                if (!exp) return null;
                return (
                  <>
                    <h3 className="font-semibold text-slate-900 mb-1">{exp.name}</h3>
                    <p className="text-sm text-slate-600 mb-2 line-clamp-2">{exp.description}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">{exp.duration}</span>
                      <span className="font-medium text-sky-600">
                        {exp.price > 0 ? `$${exp.price}` : 'Free'}
                      </span>
                    </div>
                    {onExperienceSelect && (
                      <button
                        onClick={() => onExperienceSelect(exp)}
                        className={`mt-2 w-full py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          selectedExperiences.includes(exp.id)
                            ? 'bg-sky-100 text-sky-700 hover:bg-sky-200'
                            : 'bg-sky-500 text-white hover:bg-sky-600'
                        }`}
                      >
                        {selectedExperiences.includes(exp.id) ? 'Selected' : 'Add to Trip'}
                      </button>
                    )}
                  </>
                );
              })()}
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
