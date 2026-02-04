'use client';

import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useTripStore } from '@/stores/tripStore';
import { GoogleMap, useJsApiLoader, Marker, Polyline, InfoWindow } from '@react-google-maps/api';
import { Loader2, Map, Calendar, Bookmark } from 'lucide-react';
import clsx from 'clsx';
import type { CollectionItem } from '@/stores/tripStore';
import { clientEnv } from '@/lib/env';

interface RightMapPanelProps {
  selectedDayIndex: number;
  setSelectedDayIndex: (index: number) => void;
  totalDays: number;
  mapView: 'day' | 'all' | 'saved';
  setMapView: (view: 'day' | 'all' | 'saved') => void;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

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

export default function RightMapPanel({
  selectedDayIndex,
  setSelectedDayIndex,
  totalDays,
  mapView,
  setMapView,
}: RightMapPanelProps) {
  const { trip, scheduledItems, collections } = useTripStore();
  const [activeMarker, setActiveMarker] = useState<string | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const boundsRef = useRef<string>(''); // Track bounds to prevent unnecessary updates

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: clientEnv.GOOGLE_MAPS_API_KEY,
    libraries: ['places'],
  });

  // Get active destination for map center
  const activeDestination = trip.destinations.find(
    d => d.destinationId === trip.activeDestinationId
  ) || trip.destinations[0];

  const defaultCenter = activeDestination
    ? { lat: activeDestination.place.lat, lng: activeDestination.place.lng }
    : { lat: 35.6762, lng: 139.6503 }; // Tokyo fallback

  // Default zoom: show wider area (country/region level)
  const defaultZoom = 8;

  // Get items to display based on view mode
  const displayItems = useMemo(() => {
    switch (mapView) {
      case 'day':
        return scheduledItems.filter(item => item.scheduledDayIndex === selectedDayIndex);
      case 'all':
        return scheduledItems;
      case 'saved':
        return [...collections.experiences, ...collections.restaurants];
      default:
        return [];
    }
  }, [mapView, selectedDayIndex, scheduledItems, collections]);

  // Filter items with valid coordinates
  const itemsWithCoords = displayItems.filter(item => item.lat && item.lng);

  // Calculate and apply bounds when items change
  const fitBoundsToItems = useCallback(() => {
    if (!map || !isLoaded) return;

    // Create a unique key for current bounds
    const boundsKey = itemsWithCoords.map(i => `${i.lat}-${i.lng}`).join(',');

    // Skip if bounds haven't changed
    if (boundsRef.current === boundsKey && boundsKey !== '') return;
    boundsRef.current = boundsKey;

    if (itemsWithCoords.length === 0) {
      // No items - show the whole destination region
      if (activeDestination) {
        map.setCenter({ lat: activeDestination.place.lat, lng: activeDestination.place.lng });
        map.setZoom(defaultZoom);
      }
      return;
    }

    if (itemsWithCoords.length === 1) {
      // Single item - center on it with reasonable zoom
      map.setCenter({ lat: itemsWithCoords[0].lat!, lng: itemsWithCoords[0].lng! });
      map.setZoom(14);
      return;
    }

    // Multiple items - fit bounds to show all
    const bounds = new google.maps.LatLngBounds();
    itemsWithCoords.forEach(item => {
      bounds.extend({ lat: item.lat!, lng: item.lng! });
    });

    // Add some padding
    map.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 });
  }, [map, isLoaded, itemsWithCoords, activeDestination, defaultZoom]);

  // Fit bounds when items, view, or selected day changes
  useEffect(() => {
    fitBoundsToItems();
  }, [fitBoundsToItems, mapView, selectedDayIndex]);

  // Map load callback
  const onMapLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  // Map unmount callback
  const onMapUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Calculate route path for day view
  const routePath = useMemo(() => {
    if (mapView !== 'day' || itemsWithCoords.length < 2) return [];

    return itemsWithCoords
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(item => ({ lat: item.lat!, lng: item.lng! }));
  }, [mapView, itemsWithCoords]);

  // Get marker icon based on item type
  const getMarkerIcon = (item: CollectionItem, index: number): google.maps.Symbol | google.maps.Icon => {
    const isRestaurant = item.category === 'dining' || item.category === 'restaurants';
    const isScheduled = item.scheduledDayIndex !== undefined;

    // For scheduled items, show numbered markers
    if (isScheduled && mapView === 'day') {
      return {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: isRestaurant ? '#F59E0B' : '#0EA5E9',
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 2,
        scale: 14,
        labelOrigin: new google.maps.Point(0, 0),
      };
    }

    // For saved items or all-days view
    return {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: isRestaurant ? '#F59E0B' : '#0EA5E9',
      fillOpacity: 0.8,
      strokeColor: '#FFFFFF',
      strokeWeight: 2,
      scale: 10,
    };
  };

  // Generate day selector tabs
  const dayTabs = useMemo(() => {
    const tabs = [];
    for (let i = 0; i < Math.min(totalDays, 10); i++) {
      tabs.push(i);
    }
    return tabs;
  }, [totalDays]);

  if (loadError) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-100">
        <p className="text-slate-500">Error loading map</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Map view toggle */}
      <div className="px-3 py-2 border-b border-slate-200 flex-shrink-0">
        <div className="flex bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setMapView('day')}
            className={clsx(
              'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              mapView === 'day'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <Calendar className="w-3.5 h-3.5" />
            This Day
          </button>
          <button
            onClick={() => setMapView('all')}
            className={clsx(
              'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              mapView === 'all'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <Map className="w-3.5 h-3.5" />
            All Days
          </button>
          <button
            onClick={() => setMapView('saved')}
            className={clsx(
              'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              mapView === 'saved'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <Bookmark className="w-3.5 h-3.5" />
            All Saved
          </button>
        </div>
      </div>

      {/* Day selector (only show in day view) */}
      {mapView === 'day' && (
        <div className="px-3 py-2 border-b border-slate-200 flex-shrink-0">
          <div className="flex gap-1 overflow-x-auto pb-1">
            {dayTabs.map((dayIdx) => (
              <button
                key={dayIdx}
                onClick={() => setSelectedDayIndex(dayIdx)}
                className={clsx(
                  'px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                  selectedDayIndex === dayIdx
                    ? 'bg-primary-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                Day {dayIdx + 1}
              </button>
            ))}
            {totalDays > 10 && (
              <span className="px-2 py-1 text-xs text-slate-400">
                +{totalDays - 10} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Map */}
      <div className="flex-1">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={defaultCenter}
          zoom={defaultZoom}
          options={mapOptions}
          onLoad={onMapLoad}
          onUnmount={onMapUnmount}
        >
          {/* Markers */}
          {itemsWithCoords.map((item, index) => {
            const isRestaurant = item.category === 'dining' || item.category === 'restaurants';

            return (
              <Marker
                key={item.id}
                position={{ lat: item.lat!, lng: item.lng! }}
                icon={getMarkerIcon(item, index)}
                label={mapView === 'day' && item.scheduledDayIndex !== undefined ? {
                  text: String(index + 1),
                  color: '#FFFFFF',
                  fontSize: '11px',
                  fontWeight: 'bold',
                } : undefined}
                onClick={() => setActiveMarker(item.id)}
                zIndex={activeMarker === item.id ? 1000 : 1}
              />
            );
          })}

          {/* Route polyline */}
          {routePath.length > 1 && (
            <Polyline
              path={routePath}
              options={{
                strokeColor: '#0EA5E9',
                strokeOpacity: 0.8,
                strokeWeight: 3,
                geodesic: true,
                icons: [{
                  icon: {
                    path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                    scale: 3,
                    strokeColor: '#0EA5E9',
                  },
                  offset: '50%',
                }],
              }}
            />
          )}

          {/* Info window */}
          {activeMarker && (
            <InfoWindow
              position={{
                lat: itemsWithCoords.find(i => i.id === activeMarker)?.lat || 0,
                lng: itemsWithCoords.find(i => i.id === activeMarker)?.lng || 0,
              }}
              onCloseClick={() => setActiveMarker(null)}
            >
              <div className="p-1 max-w-[200px]">
                {(() => {
                  const item = itemsWithCoords.find(i => i.id === activeMarker);
                  if (!item) return null;

                  return (
                    <>
                      <h3 className="font-semibold text-slate-900 text-sm mb-1">
                        {item.name}
                      </h3>
                      <p className="text-xs text-slate-500 capitalize">
                        {item.category?.replace('_', ' ')}
                      </p>
                      {item.rating && (
                        <p className="text-xs text-amber-600 mt-1">
                          ⭐ {item.rating.toFixed(1)}
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </div>

      {/* Legend */}
      <div className="px-3 py-2 border-t border-slate-200 flex-shrink-0">
        <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-sky-500" />
            <span>Experiences</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span>Restaurants</span>
          </div>
        </div>
      </div>
    </div>
  );
}
