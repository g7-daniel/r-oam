/**
 * Utilities for calculating hotel positions based on selected experiences
 */

import type { Experience, Hotel } from '@/types';
import { calculateHaversineDistance as geoDistance } from '@/lib/utils/geo';

interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Calculate the centroid (center point) of multiple experiences
 */
export function calculateExperienceCentroid(experiences: Experience[]): Coordinates | null {
  if (experiences.length === 0) return null;

  const validExperiences = experiences.filter(
    (exp) => typeof exp.latitude === 'number' && typeof exp.longitude === 'number'
  );

  if (validExperiences.length === 0) return null;

  const sumLat = validExperiences.reduce((sum, exp) => sum + exp.latitude, 0);
  const sumLng = validExperiences.reduce((sum, exp) => sum + exp.longitude, 0);

  return {
    lat: sumLat / validExperiences.length,
    lng: sumLng / validExperiences.length,
  };
}

/**
 * Calculate Haversine distance between two coordinates in kilometers
 * Wrapper around the centralized geo utility for coordinate-object API
 */
export function calculateHaversineDistance(
  coord1: Coordinates,
  coord2: Coordinates
): number {
  return geoDistance(coord1.lat, coord1.lng, coord2.lat, coord2.lng);
}

/**
 * Calculate average distance from a hotel to all selected experiences
 */
export function calculateAverageDistanceToExperiences(
  hotel: Hotel,
  experiences: Experience[]
): number {
  if (experiences.length === 0) return 0;

  const validExperiences = experiences.filter(
    (exp) => typeof exp.latitude === 'number' && typeof exp.longitude === 'number'
  );

  if (validExperiences.length === 0) return 0;

  const totalDistance = validExperiences.reduce((sum, exp) => {
    return (
      sum +
      calculateHaversineDistance(
        { lat: hotel.latitude, lng: hotel.longitude },
        { lat: exp.latitude, lng: exp.longitude }
      )
    );
  }, 0);

  return totalDistance / validExperiences.length;
}

/**
 * Calculate the maximum distance from a hotel to any selected experience
 */
export function calculateMaxDistanceToExperiences(
  hotel: Hotel,
  experiences: Experience[]
): number {
  if (experiences.length === 0) return 0;

  const validExperiences = experiences.filter(
    (exp) => typeof exp.latitude === 'number' && typeof exp.longitude === 'number'
  );

  if (validExperiences.length === 0) return 0;

  return Math.max(
    ...validExperiences.map((exp) =>
      calculateHaversineDistance(
        { lat: hotel.latitude, lng: hotel.longitude },
        { lat: exp.latitude, lng: exp.longitude }
      )
    )
  );
}

/**
 * Sort hotels by proximity to selected experiences
 */
export function sortHotelsByExperienceProximity(
  hotels: Hotel[],
  experiences: Experience[],
  method: 'average' | 'max' = 'average'
): (Hotel & { distanceToExperiences: number })[] {
  const hotelsWithDistance = hotels.map((hotel) => ({
    ...hotel,
    distanceToExperiences:
      method === 'average'
        ? calculateAverageDistanceToExperiences(hotel, experiences)
        : calculateMaxDistanceToExperiences(hotel, experiences),
  }));

  return hotelsWithDistance.sort((a, b) => a.distanceToExperiences - b.distanceToExperiences);
}

/**
 * Filter hotels within a certain distance of selected experiences
 */
export function filterHotelsByExperienceProximity(
  hotels: Hotel[],
  experiences: Experience[],
  maxDistanceKm: number,
  method: 'average' | 'max' = 'average'
): Hotel[] {
  return hotels.filter((hotel) => {
    const distance =
      method === 'average'
        ? calculateAverageDistanceToExperiences(hotel, experiences)
        : calculateMaxDistanceToExperiences(hotel, experiences);
    return distance <= maxDistanceKm;
  });
}

/**
 * Get optimal hotel search area based on experiences
 * Returns a bounding box and center point for hotel search
 */
export function getOptimalHotelSearchArea(experiences: Experience[]): {
  center: Coordinates | null;
  boundingBox: {
    north: number;
    south: number;
    east: number;
    west: number;
  } | null;
  radiusKm: number;
} {
  if (experiences.length === 0) {
    return { center: null, boundingBox: null, radiusKm: 0 };
  }

  const validExperiences = experiences.filter(
    (exp) => typeof exp.latitude === 'number' && typeof exp.longitude === 'number'
  );

  if (validExperiences.length === 0) {
    return { center: null, boundingBox: null, radiusKm: 0 };
  }

  const lats = validExperiences.map((exp) => exp.latitude);
  const lngs = validExperiences.map((exp) => exp.longitude);

  const center = calculateExperienceCentroid(validExperiences);

  const boundingBox = {
    north: Math.max(...lats),
    south: Math.min(...lats),
    east: Math.max(...lngs),
    west: Math.min(...lngs),
  };

  // Calculate radius as distance from center to farthest corner
  if (center) {
    const corners = [
      { lat: boundingBox.north, lng: boundingBox.east },
      { lat: boundingBox.north, lng: boundingBox.west },
      { lat: boundingBox.south, lng: boundingBox.east },
      { lat: boundingBox.south, lng: boundingBox.west },
    ];

    const maxCornerDistance = Math.max(
      ...corners.map((corner) => calculateHaversineDistance(center, corner))
    );

    // Add some padding (20%) for hotel search
    const radiusKm = maxCornerDistance * 1.2 + 2; // min 2km radius

    return { center, boundingBox, radiusKm };
  }

  return { center, boundingBox, radiusKm: 5 };
}

/**
 * Score a hotel based on proximity to experiences (0-100)
 * Lower distance = higher score
 */
export function getExperienceProximityScore(
  hotel: Hotel,
  experiences: Experience[],
  maxAcceptableDistanceKm: number = 10
): number {
  if (experiences.length === 0) return 100;

  const avgDistance = calculateAverageDistanceToExperiences(hotel, experiences);

  if (avgDistance <= 0.5) return 100; // Walking distance
  if (avgDistance <= 1) return 95;
  if (avgDistance <= 2) return 85;
  if (avgDistance <= 5) return 70;
  if (avgDistance <= maxAcceptableDistanceKm) return 50;

  return Math.max(0, 50 - (avgDistance - maxAcceptableDistanceKm) * 5);
}
