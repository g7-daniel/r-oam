'use client';

import { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { AreaCandidate } from '@/types/quick-plan';

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';

// Fix for default markers not showing - use bundled icons to avoid external CDN failures
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const defaultIcon = L.icon({
  iconUrl: markerIcon.src ?? markerIcon,
  iconRetinaUrl: markerIcon2x.src ?? markerIcon2x,
  shadowUrl: markerShadow.src ?? markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Orange marker as inline SVG data URI - avoids external CDN dependency for reliability
// Using encodeURIComponent instead of btoa for SSR compatibility
const ORANGE_MARKER_SVG = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 41"><path d="M12.5 0C5.596 0 0 5.596 0 12.5c0 2.472.723 4.776 1.969 6.713L12.5 41l10.531-21.787A12.44 12.44 0 0025 12.5C25 5.596 19.404 0 12.5 0z" fill="#F97316"/><circle cx="12.5" cy="12.5" r="5.5" fill="#fff"/></svg>')}`;

const selectedIcon = L.icon({
  iconUrl: ORANGE_MARKER_SVG,
  shadowUrl: markerShadow.src ?? markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = defaultIcon;

/**
 * Validate that latitude and longitude are within valid ranges.
 * Latitude: -90 to 90, Longitude: -180 to 180
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
    lng <= 180 &&
    // Reject 0,0 — it means "not geocoded", not an actual location
    !(lat === 0 && lng === 0)
  );
}

interface AreasMapLeafletProps {
  areas: AreaCandidate[];
  selectedAreaIds: Set<string>;
  onAreaClick?: (areaId: string) => void;
}

// Component to fit bounds when areas change
function FitBounds({ areas }: { areas: AreaCandidate[] }) {
  const map = useMap();

  useEffect(() => {
    if (areas.length === 0) return;

    const validAreas = areas.filter(a => isValidCoordinate(a.centerLat, a.centerLng));
    if (validAreas.length === 0) return;

    const bounds = L.latLngBounds(
      validAreas.map(a => [a.centerLat, a.centerLng] as [number, number])
    );

    // For a single point, fitBounds with zero-size bounds causes maxZoom issues.
    // Use setView instead for single markers.
    if (validAreas.length === 1) {
      map.setView([validAreas[0].centerLat, validAreas[0].centerLng], 12);
    } else {
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
    }
  }, [map, areas]);

  return null;
}

// Component to handle container resize - invalidates map size when container changes
function ResizeHandler() {
  const map = useMap();

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });

    const container = map.getContainer();
    if (container) {
      observer.observe(container);
    }

    return () => {
      observer.disconnect();
    };
  }, [map]);

  return null;
}

export default function AreasMapLeaflet({ areas, selectedAreaIds, onAreaClick }: AreasMapLeafletProps) {
  const mapRef = useRef<L.Map | null>(null);
  const [tileError, setTileError] = useState(false);

  // Cleanup map instance on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.remove();
          mapRef.current = null;
        } catch (error) {
          // Ignore cleanup errors (map may already be disposed)
          console.debug('Map cleanup error (safe to ignore):', error);
        }
      }
    };
  }, []);

  // Filter areas with valid coordinates
  const validAreas = useMemo(
    () => areas.filter(a => isValidCoordinate(a.centerLat, a.centerLng)),
    [areas]
  );

  // Calculate center from all valid areas
  const center: [number, number] = useMemo(() => {
    if (validAreas.length === 0) return [0, 0];
    return [
      validAreas.reduce((sum, a) => sum + a.centerLat, 0) / validAreas.length,
      validAreas.reduce((sum, a) => sum + a.centerLng, 0) / validAreas.length,
    ];
  }, [validAreas]);

  // Detect dark mode via media query
  const [isDarkMode, setIsDarkMode] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // Also check for Tailwind dark class on html element, and observe changes
  // (handles apps using Tailwind's `class` strategy for dark mode toggling)
  useEffect(() => {
    const htmlEl = document.documentElement;
    if (htmlEl.classList.contains('dark')) {
      setIsDarkMode(true);
    }

    const observer = new MutationObserver(() => {
      setIsDarkMode(htmlEl.classList.contains('dark'));
    });
    observer.observe(htmlEl, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  const tileUrl = isDarkMode
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  const tileAttribution = isDarkMode
    ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

  const handleMarkerKeyDown = useCallback(
    (e: L.LeafletKeyboardEvent, areaId: string) => {
      // Safe access to keyboard event - might not exist on all devices
      if (!e.originalEvent) return;

      if (e.originalEvent.key === 'Enter' || e.originalEvent.key === ' ') {
        e.originalEvent.preventDefault();
        onAreaClick?.(areaId);
      }
    },
    [onAreaClick]
  );

  if (tileError) {
    return (
      <div
        className="h-48 sm:h-56 md:h-64 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600 mb-3 flex items-center justify-center bg-slate-100 dark:bg-slate-700 transition-all duration-300"
        role="alert"
      >
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Map tiles could not be loaded. Please check your connection.
        </p>
      </div>
    );
  }

  return (
    <div
      className="h-48 sm:h-56 md:h-64 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600 mb-3 transition-all duration-300"
      role="application"
      aria-label={`Interactive map showing ${validAreas.length} areas. ${selectedAreaIds.size} selected. Use tab to navigate markers.`}
    >
      <MapContainer
        center={center}
        zoom={10}
        scrollWheelZoom={false}
        className="h-full w-full"
        ref={mapRef}
        keyboard={true}
        zoomControl={true}
      >
        <TileLayer
          key={tileUrl}
          attribution={tileAttribution}
          url={tileUrl}
          eventHandlers={{
            tileerror: () => setTileError(true),
          }}
        />
        <FitBounds areas={validAreas} />
        <ResizeHandler />
        {validAreas.map((area, idx) => (
          <Marker
            key={area.id}
            position={[area.centerLat, area.centerLng]}
            icon={selectedAreaIds.has(area.id) ? selectedIcon : defaultIcon}
            keyboard={true}
            alt={`${area.name}${selectedAreaIds.has(area.id) ? ' (selected)' : ''}`}
            title={area.name}
            eventHandlers={{
              click: () => onAreaClick?.(area.id),
              keypress: (e) => handleMarkerKeyDown(e, area.id),
            }}
          >
            <Popup>
              <div className="min-w-[150px]">
                <div className="font-medium text-slate-900">{idx + 1}. {area.name}</div>
                <div className="text-xs text-slate-500 mt-1">
                  {area.description ? `${area.description.slice(0, 80)}${area.description.length > 80 ? '...' : ''}` : ''}
                </div>
                {area.suggestedNights > 0 && (
                  <div className="text-xs text-orange-600 mt-1">
                    Suggested: {area.suggestedNights} nights
                  </div>
                )}
                <button
                  onClick={() => onAreaClick?.(area.id)}
                  className="mt-2 min-h-[44px] px-3 py-2 text-xs text-orange-600 hover:text-orange-800 hover:bg-orange-50 font-medium rounded-md transition-colors"
                  aria-label={selectedAreaIds.has(area.id) ? `Deselect ${area.name}` : `Select ${area.name}`}
                >
                  {selectedAreaIds.has(area.id) ? 'Deselect' : 'Select this area'}
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
