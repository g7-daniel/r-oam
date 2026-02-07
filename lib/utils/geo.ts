/**
 * Geographic utilities for distance calculation and filtering
 */

/**
 * Calculate distance between two coordinates using the Haversine formula
 * @param lat1 Latitude of first point
 * @param lng1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lng2 Longitude of second point
 * @returns Distance in kilometers
 */
export function calculateHaversineDistance(
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
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Filter items by distance from a center point
 * @param items Array of items to filter
 * @param getCoords Function to extract coordinates from an item
 * @param center Center point coordinates
 * @param maxKm Maximum distance in kilometers
 * @returns Filtered array of items within the specified distance
 */
export function filterByDistance<T>(
  items: T[],
  getCoords: (item: T) => { lat: number; lng: number } | null,
  center: { lat: number; lng: number },
  maxKm: number
): T[] {
  return items.filter((item) => {
    const coords = getCoords(item);
    if (!coords || coords.lat == null || coords.lng == null) return false;
    const distance = calculateHaversineDistance(
      center.lat,
      center.lng,
      coords.lat,
      coords.lng
    );
    return distance <= maxKm;
  });
}

/**
 * Get distance from center for an item (for sorting/display)
 * @param itemLat Item latitude
 * @param itemLng Item longitude
 * @param centerLat Center latitude
 * @param centerLng Center longitude
 * @returns Distance in kilometers, or null if coordinates invalid
 */
export function getDistanceFromCenter(
  itemLat: number | undefined,
  itemLng: number | undefined,
  centerLat: number,
  centerLng: number
): number | null {
  if (itemLat == null || itemLng == null || centerLat == null || centerLng == null) return null;
  return calculateHaversineDistance(centerLat, centerLng, itemLat, itemLng);
}
