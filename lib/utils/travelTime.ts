// Travel time calculation utilities

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Get recommended transport mode based on distance
 */
export function getTransportMode(distanceKm: number): 'walking' | 'driving' | 'transit' {
  if (distanceKm < 1.5) return 'walking';
  if (distanceKm < 5) return 'transit';
  return 'driving';
}

/**
 * Get smart transport mode - walking only if under threshold, otherwise best alternative
 */
export function getSmartTransportMode(
  distanceKm: number,
  walkingThresholdMinutes: number = 30
): 'walking' | 'driving' | 'transit' {
  const walkingTime = Math.round((distanceKm / 5) * 60); // 5 km/h walking speed

  if (walkingTime <= walkingThresholdMinutes) {
    return 'walking';
  }

  // For distances under 10km, prefer transit; otherwise driving
  if (distanceKm < 10) {
    return 'transit';
  }
  return 'driving';
}

/**
 * Calculate travel times for all transport modes
 */
export function calculateAllTravelModes(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): {
  distanceKm: number;
  walking: { timeMinutes: number; recommended: boolean };
  transit: { timeMinutes: number; recommended: boolean };
  driving: { timeMinutes: number; recommended: boolean };
  recommendedMode: 'walking' | 'driving' | 'transit';
} {
  const distanceKm = calculateDistance(lat1, lng1, lat2, lng2);

  const walkingTime = estimateTravelTime(distanceKm, 'walking');
  const transitTime = estimateTravelTime(distanceKm, 'transit');
  const drivingTime = estimateTravelTime(distanceKm, 'driving');

  // Walking is only recommended if under 30 minutes
  const recommendedMode = getSmartTransportMode(distanceKm, 30);

  return {
    distanceKm,
    walking: { timeMinutes: walkingTime, recommended: recommendedMode === 'walking' },
    transit: { timeMinutes: transitTime, recommended: recommendedMode === 'transit' },
    driving: { timeMinutes: drivingTime, recommended: recommendedMode === 'driving' },
    recommendedMode,
  };
}

/**
 * Estimate travel time in minutes based on distance and mode
 */
export function estimateTravelTime(distanceKm: number, mode?: 'walking' | 'driving' | 'transit'): number {
  const transportMode = mode || getTransportMode(distanceKm);

  switch (transportMode) {
    case 'walking':
      // Average walking speed: 5 km/h
      return Math.round((distanceKm / 5) * 60);
    case 'transit':
      // Average including wait time and transfers: ~20 km/h effective
      return Math.round((distanceKm / 20) * 60) + 5; // +5 min for waiting
    case 'driving':
      // Urban driving: ~30 km/h average with traffic
      return Math.round((distanceKm / 30) * 60) + 5; // +5 min for parking
    default:
      return Math.round((distanceKm / 5) * 60);
  }
}

/**
 * Calculate travel time between two points
 */
export function calculateTravelTime(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  preferredMode?: 'walking' | 'driving' | 'transit'
): {
  distanceKm: number;
  timeMinutes: number;
  mode: 'walking' | 'driving' | 'transit';
} {
  const distanceKm = calculateDistance(lat1, lng1, lat2, lng2);
  const mode = preferredMode || getTransportMode(distanceKm);
  const timeMinutes = estimateTravelTime(distanceKm, mode);

  return {
    distanceKm,
    timeMinutes,
    mode,
  };
}

/**
 * Format distance for display
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

/**
 * Format distance in miles
 */
export function formatDistanceMiles(distanceKm: number): string {
  const miles = distanceKm * 0.621371;
  if (miles < 0.1) {
    return `${Math.round(miles * 5280)} ft`;
  }
  return `${miles.toFixed(1)} mi`;
}

/**
 * Format travel time for display
 */
export function formatTravelTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
}

/**
 * Get transport mode icon/emoji
 */
export function getTransportIcon(mode: 'walking' | 'driving' | 'transit'): string {
  switch (mode) {
    case 'walking':
      return '🚶';
    case 'driving':
      return '🚗';
    case 'transit':
      return '🚇';
    default:
      return '🚶';
  }
}

/**
 * Generate Google Maps directions URL
 */
export function getDirectionsUrl(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  mode?: 'walking' | 'driving' | 'transit'
): string {
  const travelMode = mode || getTransportMode(calculateDistance(originLat, originLng, destLat, destLng));
  return `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}&travelmode=${travelMode}`;
}

/**
 * Calculate total route distance for an array of locations
 */
export function calculateRouteDistance(locations: { lat: number; lng: number }[]): number {
  if (locations.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 0; i < locations.length - 1; i++) {
    totalDistance += calculateDistance(
      locations[i].lat,
      locations[i].lng,
      locations[i + 1].lat,
      locations[i + 1].lng
    );
  }
  return totalDistance;
}

/**
 * Calculate total travel time for a route
 */
export function calculateRouteTravelTime(
  locations: { lat: number; lng: number }[],
  preferredMode?: 'walking' | 'driving' | 'transit'
): number {
  if (locations.length < 2) return 0;

  let totalTime = 0;
  for (let i = 0; i < locations.length - 1; i++) {
    const { timeMinutes } = calculateTravelTime(
      locations[i].lat,
      locations[i].lng,
      locations[i + 1].lat,
      locations[i + 1].lng,
      preferredMode
    );
    totalTime += timeMinutes;
  }
  return totalTime;
}
