'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { AreaCandidate } from '@/types/quick-plan';

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';

// Fix for default markers not showing
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const selectedIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
  iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = defaultIcon;

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

    const bounds = L.latLngBounds(
      areas.map(a => [a.centerLat, a.centerLng] as [number, number])
    );

    // Add some padding
    map.fitBounds(bounds, { padding: [30, 30] });
  }, [map, areas]);

  return null;
}

export default function AreasMapLeaflet({ areas, selectedAreaIds, onAreaClick }: AreasMapLeafletProps) {
  const mapRef = useRef<L.Map | null>(null);

  // Calculate center from all areas
  const center: [number, number] = areas.length > 0
    ? [
        areas.reduce((sum, a) => sum + a.centerLat, 0) / areas.length,
        areas.reduce((sum, a) => sum + a.centerLng, 0) / areas.length,
      ]
    : [0, 0];

  return (
    <div className="h-40 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600 mb-3">
      <MapContainer
        center={center}
        zoom={10}
        scrollWheelZoom={false}
        className="h-full w-full"
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds areas={areas} />
        {areas.map((area, idx) => (
          <Marker
            key={area.id}
            position={[area.centerLat, area.centerLng]}
            icon={selectedAreaIds.has(area.id) ? selectedIcon : defaultIcon}
            eventHandlers={{
              click: () => onAreaClick?.(area.id),
            }}
          >
            <Popup>
              <div className="min-w-[150px]">
                <div className="font-medium text-slate-900">{idx + 1}. {area.name}</div>
                <div className="text-xs text-slate-500 mt-1">{area.description?.slice(0, 80)}...</div>
                {area.suggestedNights > 0 && (
                  <div className="text-xs text-orange-600 mt-1">
                    Suggested: {area.suggestedNights} nights
                  </div>
                )}
                <button
                  onClick={() => onAreaClick?.(area.id)}
                  className="mt-2 text-xs text-orange-600 hover:text-orange-800 font-medium"
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
