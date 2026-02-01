import type { Experience, ExperienceCategory, PlaceResult, DirectionsResult, TransitInfo } from '@/types';

const GOOGLE_MAPS_BASE_URL = 'https://maps.googleapis.com/maps/api';

export async function searchPlaces(
  query: string,
  location?: { lat: number; lng: number },
  radius = 50000
): Promise<PlaceResult[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.warn('Google Maps API key not configured');
    return [];
  }

  const params = new URLSearchParams({
    query,
    key: apiKey,
  });

  if (location) {
    params.append('location', `${location.lat},${location.lng}`);
    params.append('radius', radius.toString());
  }

  const response = await fetch(
    `${GOOGLE_MAPS_BASE_URL}/place/textsearch/json?${params}`
  );

  if (!response.ok) {
    console.error('Google Places search failed:', response.statusText);
    return [];
  }

  const data = await response.json();
  return data.results || [];
}

export async function getPlaceDetails(placeId: string): Promise<PlaceResult | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return null;
  }

  const params = new URLSearchParams({
    place_id: placeId,
    fields: 'name,formatted_address,geometry,photos,rating,user_ratings_total,types,opening_hours,editorial_summary,reviews',
    key: apiKey,
  });

  const response = await fetch(
    `${GOOGLE_MAPS_BASE_URL}/place/details/json?${params}`
  );

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data.result || null;
}

export async function getDirections(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  mode: 'driving' | 'walking' | 'transit' = 'transit'
): Promise<DirectionsResult | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return null;
  }

  const params = new URLSearchParams({
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    mode,
    key: apiKey,
  });

  const response = await fetch(
    `${GOOGLE_MAPS_BASE_URL}/directions/json?${params}`
  );

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data;
}

export async function getDistanceMatrix(
  origins: { lat: number; lng: number }[],
  destinations: { lat: number; lng: number }[],
  mode: 'driving' | 'walking' | 'transit' = 'transit'
): Promise<{ distance: string; duration: string }[][]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return [];
  }

  const originStr = origins.map((o) => `${o.lat},${o.lng}`).join('|');
  const destStr = destinations.map((d) => `${d.lat},${d.lng}`).join('|');

  const params = new URLSearchParams({
    origins: originStr,
    destinations: destStr,
    mode,
    key: apiKey,
  });

  const response = await fetch(
    `${GOOGLE_MAPS_BASE_URL}/distancematrix/json?${params}`
  );

  if (!response.ok) {
    return [];
  }

  const data = await response.json();

  return data.rows?.map((row: any) =>
    row.elements?.map((element: any) => ({
      distance: element.distance?.text || 'N/A',
      duration: element.duration?.text || 'N/A',
    })) || []
  ) || [];
}

export function getTransitRecommendation(
  distanceMeters: number,
  durationMinutes: number
): TransitInfo {
  if (distanceMeters < 1000) {
    return {
      mode: 'walk',
      duration: `${Math.ceil(distanceMeters / 80)} min`,
      distance: `${(distanceMeters / 1000).toFixed(1)} km`,
    };
  } else if (distanceMeters < 5000) {
    return {
      mode: 'taxi',
      duration: `${Math.ceil(durationMinutes * 0.8)} min`,
      distance: `${(distanceMeters / 1000).toFixed(1)} km`,
      cost: Math.ceil(distanceMeters / 1000) * 3,
    };
  } else {
    return {
      mode: 'train',
      duration: `${durationMinutes} min`,
      distance: `${(distanceMeters / 1000).toFixed(1)} km`,
      cost: Math.ceil(distanceMeters / 1000) * 0.5,
    };
  }
}

const CATEGORY_QUERIES: Record<string, string[]> = {
  beaches: ['beach', 'seaside', 'coast'],
  museums: ['museum', 'art gallery', 'history museum'],
  food_tours: ['food tour', 'culinary experience', 'local cuisine'],
  nightlife: ['nightclub', 'bar', 'live music venue'],
  day_trips: ['day trip', 'excursion', 'tour'],
  hidden_gems: ['hidden gem', 'off the beaten path', 'local secret'],
  outdoor: ['hiking', 'nature park', 'outdoor activities'],
  shopping: ['shopping district', 'market', 'mall'],
  cultural: ['temple', 'church', 'cultural site', 'monument'],
  wellness: ['spa', 'wellness center', 'yoga'],
  // Additional categories used by frontend
  dining: ['restaurant', 'fine dining', 'local food'],
  cafes: ['cafe', 'coffee shop', 'bakery'],
  temples: ['buddhist temple', 'hindu temple', 'shinto shrine', 'ancient temple'],
  parks: ['park', 'garden', 'botanical garden'],
  landmarks: ['famous attraction', 'tourist attraction', 'must see'],
  nature: ['nature reserve', 'hiking trail', 'scenic lookout'],
  adventure: ['adventure tour', 'outdoor activities', 'extreme sports'],
  wildlife: ['wildlife sanctuary', 'animal sanctuary', 'zoo'],
  water_sports: ['surfing', 'diving', 'snorkeling', 'water sports'],
};

// Calculate distance between two coordinates in km (Haversine formula)
function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export async function getExperiencesByCategory(
  destination: string,
  category: ExperienceCategory,
  location?: { lat: number; lng: number },
  maxDistanceKm: number = 50
): Promise<Experience[]> {
  const queries = CATEGORY_QUERIES[category] || [category];
  const allPlaces: PlaceResult[] = [];

  for (const query of queries.slice(0, 2)) {
    const places = await searchPlaces(`${query} ${destination}`, location);
    allPlaces.push(...places);
  }

  // Deduplicate by place_id
  let uniquePlaces = Array.from(
    new Map(allPlaces.map((p) => [p.place_id, p])).values()
  );

  // Filter by distance if we have location coordinates
  if (location && location.lat !== 0 && location.lng !== 0) {
    uniquePlaces = uniquePlaces.filter((place) => {
      const placeLat = place.geometry?.location?.lat || 0;
      const placeLng = place.geometry?.location?.lng || 0;
      if (placeLat === 0 && placeLng === 0) return false;
      const distance = getDistanceKm(location.lat, location.lng, placeLat, placeLng);
      return distance <= maxDistanceKm;
    });
  }

  // Fetch place details to get descriptions (batch up to 10)
  const placesToFetch = uniquePlaces.slice(0, 10);
  const detailsPromises = placesToFetch.map(async (place) => {
    try {
      const details = await getPlaceDetails(place.place_id);
      return { place, details };
    } catch {
      return { place, details: null };
    }
  });

  const placesWithDetails = await Promise.all(detailsPromises);

  return placesWithDetails.map(({ place, details }) => {
    // Get description from editorial_summary or first review
    let description = `Popular ${category.replace('_', ' ')} attraction in ${destination}`;
    if (details) {
      const detailsAny = details as any;
      if (detailsAny.editorial_summary?.overview) {
        description = detailsAny.editorial_summary.overview;
      } else if (detailsAny.reviews?.[0]?.text) {
        // Use first review snippet if no editorial summary
        const reviewText = detailsAny.reviews[0].text;
        description = reviewText.length > 200 ? reviewText.slice(0, 200) + '...' : reviewText;
      }
    }

    return {
      id: place.place_id,
      name: place.name,
      category,
      description,
      imageUrl: place.photos?.[0]?.photo_reference
        ? `${GOOGLE_MAPS_BASE_URL}/place/photo?maxwidth=800&photo_reference=${place.photos[0].photo_reference}&key=${process.env.GOOGLE_MAPS_API_KEY}`
        : getDefaultImageForCategory(category),
      price: estimatePriceForCategory(category),
      currency: 'USD',
      duration: estimateDurationForCategory(category),
      rating: place.rating || 4.0,
      reviewCount: place.user_ratings_total || 0,
      address: place.formatted_address,
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
    };
  });
}

function getDefaultImageForCategory(category: ExperienceCategory): string {
  const images: Record<ExperienceCategory, string> = {
    beaches: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
    museums: 'https://images.unsplash.com/photo-1565060169194-19fabf63012c?w=800',
    food_tours: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
    nightlife: 'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=800',
    day_trips: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800',
    hidden_gems: 'https://images.unsplash.com/photo-1502301103665-0b95cc738daf?w=800',
    outdoor: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=800',
    shopping: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800',
    cultural: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800',
    wellness: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800',
    dining: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
    cafes: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800',
    temples: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=800',
    parks: 'https://images.unsplash.com/photo-1588714477688-cf28a50e94f7?w=800',
    landmarks: 'https://images.unsplash.com/photo-1431274172761-fca41d930114?w=800',
    nature: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800',
    adventure: 'https://images.unsplash.com/photo-1522163182402-834f871fd851?w=800',
    wildlife: 'https://images.unsplash.com/photo-1549366021-9f761d450615?w=800',
    water_sports: 'https://images.unsplash.com/photo-1530870110042-98b2cb110834?w=800',
  };
  return images[category];
}

function estimatePriceForCategory(category: ExperienceCategory): number {
  const prices: Record<ExperienceCategory, number> = {
    beaches: 0,
    museums: 25,
    food_tours: 75,
    nightlife: 50,
    day_trips: 100,
    hidden_gems: 20,
    outdoor: 30,
    shopping: 0,
    cultural: 15,
    wellness: 80,
    dining: 50,
    cafes: 15,
    temples: 10,
    parks: 0,
    landmarks: 20,
    nature: 10,
    adventure: 75,
    wildlife: 40,
    water_sports: 60,
  };
  return prices[category];
}

function estimateDurationForCategory(category: ExperienceCategory): string {
  const durations: Record<ExperienceCategory, string> = {
    beaches: '4-6 hours',
    museums: '2-3 hours',
    food_tours: '3-4 hours',
    nightlife: '4-6 hours',
    day_trips: '8-10 hours',
    hidden_gems: '1-2 hours',
    outdoor: '3-5 hours',
    shopping: '2-4 hours',
    cultural: '1-2 hours',
    wellness: '2-3 hours',
    dining: '1-2 hours',
    cafes: '1 hour',
    temples: '1-2 hours',
    parks: '2-3 hours',
    landmarks: '1-2 hours',
    nature: '3-4 hours',
    adventure: '3-5 hours',
    wildlife: '3-4 hours',
    water_sports: '2-4 hours',
  };
  return durations[category];
}

export function getPhotoUrl(photoReference: string, maxWidth = 800): string {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey || !photoReference) {
    return '';
  }
  return `${GOOGLE_MAPS_BASE_URL}/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${apiKey}`;
}

// Search for hotels using Google Places API
export async function searchHotelsGoogle(
  cityName: string,
  location?: { lat: number; lng: number }
): Promise<{
  id: string;
  name: string;
  address: string;
  rating: number;
  reviewCount: number;
  priceLevel: number;
  imageUrl: string;
  lat: number;
  lng: number;
  types: string[];
}[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.warn('Google Maps API key not configured');
    return [];
  }

  // Search for hotels in the city
  const queries = [
    `hotels in ${cityName}`,
    `luxury hotels ${cityName}`,
    `boutique hotels ${cityName}`,
  ];

  const allPlaces: PlaceResult[] = [];

  for (const query of queries) {
    const params = new URLSearchParams({
      query,
      type: 'lodging',
      key: apiKey,
    });

    if (location) {
      params.append('location', `${location.lat},${location.lng}`);
      params.append('radius', '30000'); // 30km radius
    }

    try {
      const response = await fetch(
        `${GOOGLE_MAPS_BASE_URL}/place/textsearch/json?${params}`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.results) {
          allPlaces.push(...data.results);
        }
      }
    } catch (error) {
      console.error('Google Places hotel search error:', error);
    }
  }

  // Deduplicate by place_id
  const uniquePlaces = Array.from(
    new Map(allPlaces.map((p) => [p.place_id, p])).values()
  );

  // Sort by rating (highest first)
  uniquePlaces.sort((a, b) => (b.rating || 0) - (a.rating || 0));

  return uniquePlaces.slice(0, 20).map((place: any) => ({
    id: `google-${place.place_id}`,
    name: place.name,
    address: place.formatted_address || place.vicinity || '',
    rating: place.rating || 4.0,
    reviewCount: place.user_ratings_total || 0,
    priceLevel: place.price_level || 2,
    imageUrl: place.photos?.[0]?.photo_reference
      ? `${GOOGLE_MAPS_BASE_URL}/place/photo?maxwidth=800&photo_reference=${place.photos[0].photo_reference}&key=${apiKey}`
      : 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
    lat: place.geometry?.location?.lat || 0,
    lng: place.geometry?.location?.lng || 0,
    types: place.types || [],
  }));
}
