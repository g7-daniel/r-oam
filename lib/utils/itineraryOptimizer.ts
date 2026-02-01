// Itinerary optimization utilities

import { calculateDistance, calculateRouteDistance, calculateRouteTravelTime } from './travelTime';

interface LocationItem {
  id: string;
  lat: number;
  lng: number;
  category?: string;
  durationMinutes?: number;
  preferredTime?: 'morning' | 'afternoon' | 'evening' | 'any';
}

interface OptimizationResult {
  originalOrder: string[];
  optimizedOrder: string[];
  originalDistanceKm: number;
  optimizedDistanceKm: number;
  distanceSavedKm: number;
  distanceSavedPercent: number;
  originalTimeMinutes: number;
  optimizedTimeMinutes: number;
  timeSavedMinutes: number;
}

/**
 * Optimize route order using nearest neighbor algorithm
 * Starts from the first item and always goes to the nearest unvisited item
 */
export function optimizeRouteNearestNeighbor(items: LocationItem[]): string[] {
  if (items.length <= 2) {
    return items.map(i => i.id);
  }

  const visited = new Set<string>();
  const result: string[] = [];

  // Start with the first item
  let current = items[0];
  result.push(current.id);
  visited.add(current.id);

  while (visited.size < items.length) {
    let nearestDist = Infinity;
    let nearest: LocationItem | null = null;

    for (const item of items) {
      if (visited.has(item.id)) continue;

      const dist = calculateDistance(current.lat, current.lng, item.lat, item.lng);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = item;
      }
    }

    if (nearest) {
      result.push(nearest.id);
      visited.add(nearest.id);
      current = nearest;
    }
  }

  return result;
}

/**
 * Optimize route considering time preferences
 * Morning items first, evening items last, with geographical optimization in between
 */
export function optimizeRouteWithTimePreferences(items: LocationItem[]): string[] {
  if (items.length <= 2) {
    return items.map(i => i.id);
  }

  // Categorize by time preference
  const morning: LocationItem[] = [];
  const afternoon: LocationItem[] = [];
  const evening: LocationItem[] = [];
  const any: LocationItem[] = [];

  for (const item of items) {
    const pref = item.preferredTime || getDefaultTimePreference(item.category);
    switch (pref) {
      case 'morning':
        morning.push(item);
        break;
      case 'afternoon':
        afternoon.push(item);
        break;
      case 'evening':
        evening.push(item);
        break;
      default:
        any.push(item);
    }
  }

  // Optimize each group and combine
  const result: string[] = [];

  // Morning items (optimized within group)
  if (morning.length > 0) {
    result.push(...optimizeRouteNearestNeighbor(morning));
  }

  // Distribute 'any' items between morning and afternoon based on distance
  if (any.length > 0) {
    // Find anchor point (last morning item or first item overall)
    const anchor = morning.length > 0 ? morning[morning.length - 1] : any[0];
    const sortedAny = [...any].sort((a, b) => {
      const distA = calculateDistance(anchor.lat, anchor.lng, a.lat, a.lng);
      const distB = calculateDistance(anchor.lat, anchor.lng, b.lat, b.lng);
      return distA - distB;
    });
    result.push(...sortedAny.map(i => i.id));
  }

  // Afternoon items
  if (afternoon.length > 0) {
    result.push(...optimizeRouteNearestNeighbor(afternoon));
  }

  // Evening items last
  if (evening.length > 0) {
    result.push(...optimizeRouteNearestNeighbor(evening));
  }

  return result;
}

/**
 * Get default time preference based on category
 */
function getDefaultTimePreference(category?: string): 'morning' | 'afternoon' | 'evening' | 'any' {
  if (!category) return 'any';

  const morning = ['beach', 'park', 'hiking', 'outdoor', 'market'];
  const afternoon = ['museum', 'cultural', 'shopping', 'landmarks'];
  const evening = ['nightlife', 'bar', 'dinner', 'dining', 'restaurant', 'entertainment'];

  const cat = category.toLowerCase();
  if (morning.some(m => cat.includes(m))) return 'morning';
  if (afternoon.some(a => cat.includes(a))) return 'afternoon';
  if (evening.some(e => cat.includes(e))) return 'evening';
  return 'any';
}

/**
 * Get full optimization comparison
 */
export function getOptimizationComparison(items: LocationItem[]): OptimizationResult {
  const originalOrder = items.map(i => i.id);
  const optimizedOrder = optimizeRouteWithTimePreferences(items);

  // Create location arrays for distance calculation
  const originalLocations = items.map(i => ({ lat: i.lat, lng: i.lng }));

  // Reorder items according to optimized order
  const itemMap = new Map(items.map(i => [i.id, i]));
  const optimizedLocations = optimizedOrder
    .map(id => itemMap.get(id))
    .filter((i): i is LocationItem => i !== undefined)
    .map(i => ({ lat: i.lat, lng: i.lng }));

  const originalDistanceKm = calculateRouteDistance(originalLocations);
  const optimizedDistanceKm = calculateRouteDistance(optimizedLocations);
  const distanceSavedKm = originalDistanceKm - optimizedDistanceKm;
  const distanceSavedPercent = originalDistanceKm > 0
    ? Math.round((distanceSavedKm / originalDistanceKm) * 100)
    : 0;

  const originalTimeMinutes = calculateRouteTravelTime(originalLocations);
  const optimizedTimeMinutes = calculateRouteTravelTime(optimizedLocations);
  const timeSavedMinutes = originalTimeMinutes - optimizedTimeMinutes;

  return {
    originalOrder,
    optimizedOrder,
    originalDistanceKm,
    optimizedDistanceKm,
    distanceSavedKm,
    distanceSavedPercent,
    originalTimeMinutes,
    optimizedTimeMinutes,
    timeSavedMinutes,
  };
}

/**
 * Auto-fill a day with suggested items based on location and time
 */
export function suggestItemsForDay(
  availableItems: LocationItem[],
  existingItems: LocationItem[],
  maxItems: number = 5,
  dayStartHour: number = 9,
  dayEndHour: number = 21
): string[] {
  if (availableItems.length === 0 || existingItems.length >= maxItems) {
    return [];
  }

  // Calculate available time (in minutes)
  const existingDuration = existingItems.reduce(
    (sum, i) => sum + (i.durationMinutes || 60),
    0
  );
  const availableMinutes = (dayEndHour - dayStartHour) * 60 - existingDuration;

  if (availableMinutes < 60) {
    return []; // Not enough time
  }

  const suggestions: string[] = [];
  let remainingTime = availableMinutes;

  // Find anchor point (center of existing items or first available item)
  const anchor = existingItems.length > 0
    ? {
        lat: existingItems.reduce((sum, i) => sum + i.lat, 0) / existingItems.length,
        lng: existingItems.reduce((sum, i) => sum + i.lng, 0) / existingItems.length,
      }
    : availableItems[0];

  // Sort available items by distance from anchor
  const sortedAvailable = [...availableItems].sort((a, b) => {
    const distA = calculateDistance(anchor.lat, anchor.lng, a.lat, a.lng);
    const distB = calculateDistance(anchor.lat, anchor.lng, b.lat, b.lng);
    return distA - distB;
  });

  // Add items that fit within remaining time
  for (const item of sortedAvailable) {
    if (suggestions.length >= maxItems - existingItems.length) break;

    const itemDuration = item.durationMinutes || 60;
    const travelTime = 20; // Estimate 20 min between items

    if (remainingTime >= itemDuration + travelTime) {
      suggestions.push(item.id);
      remainingTime -= (itemDuration + travelTime);
    }
  }

  return suggestions;
}

/**
 * Check if optimization is worth showing (>10% improvement)
 */
export function isOptimizationWorthwhile(result: OptimizationResult): boolean {
  return result.distanceSavedPercent >= 10 || result.timeSavedMinutes >= 10;
}
