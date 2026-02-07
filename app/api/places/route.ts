import { NextRequest, NextResponse } from 'next/server';
import { searchPlaces, getExperiencesByCategory, getPlaceDetails } from '@/lib/google-maps';
import type { Experience, ExperienceCategory } from '@/types';
import { calculateHaversineDistance as getDistanceKm } from '@/lib/utils/geo';

// Handle POST requests (some components might use POST)
export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({
        places: [],
        error: 'Invalid JSON in request body'
      }, { status: 400 });
    }
    const { destination, category, query, lat, lng, radius } = body;

    // Extract destination from query if not provided directly
    // e.g., "museums in Tokyo" -> "Tokyo"
    let searchDestination = destination;
    let searchQuery = query;

    if (!searchDestination && query) {
      // Try to extract destination from query like "museums in Tokyo"
      const inMatch = query.match(/in\s+(.+)$/i);
      if (inMatch) {
        searchDestination = inMatch[1].trim();
        searchQuery = query.replace(/\s+in\s+.+$/i, '').trim();
      } else {
        searchDestination = query; // Use query as destination
      }
    }

    if (!searchDestination) {
      // Return mock data if no destination
      return NextResponse.json({
        places: [],
        message: 'No destination specified'
      });
    }

    // Build location object if coordinates are provided
    const locationCoords = (lat && lng) ? { lat: Number(lat), lng: Number(lng) } : undefined;
    const searchRadius = radius ? Number(radius) : 50000;
    const maxDistanceKm = searchRadius / 1000; // Convert to km for filtering

    if (category) {
      let experiences = await getExperiencesByCategory(searchDestination, category as ExperienceCategory, locationCoords);

      // Filter by distance if we have coordinates
      if (locationCoords && locationCoords.lat !== 0 && locationCoords.lng !== 0) {
        experiences = experiences.filter((exp: any) => {
          const expLat = exp.latitude || exp.lat || 0;
          const expLng = exp.longitude || exp.lng || 0;
          if (expLat === 0 && expLng === 0) return true; // Keep items without coords
          const distance = getDistanceKm(locationCoords.lat, locationCoords.lng, expLat, expLng);
          return distance <= maxDistanceKm;
        });
      }

      // Normalize lat/lng field names
      const normalized = experiences.map((exp: any) => ({
        ...exp,
        lat: exp.latitude || exp.lat || 0,
        lng: exp.longitude || exp.lng || 0,
      }));
      const response = NextResponse.json({ places: normalized });
      // Places data can be cached for 10 minutes
      response.headers.set('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1200');
      return response;
    }

    if (searchQuery && searchQuery !== searchDestination) {
      // IMPORTANT: Always include destination name in search query for geo-relevance
      const fullQuery = `${searchQuery} ${searchDestination}`;
      let results = await searchPlaces(fullQuery, locationCoords, searchRadius);

      // Filter results by distance from destination
      if (locationCoords && locationCoords.lat !== 0 && locationCoords.lng !== 0) {
        results = results.filter((place: any) => {
          const placeLat = place.geometry?.location?.lat || 0;
          const placeLng = place.geometry?.location?.lng || 0;
          if (placeLat === 0 && placeLng === 0) return false; // Exclude items without coords
          const distance = getDistanceKm(locationCoords.lat, locationCoords.lng, placeLat, placeLng);
          return distance <= maxDistanceKm;
        });
      }

      // Fetch place details to get descriptions
      const detailsPromises = results.slice(0, 15).map(async (place: any, index: number) => {
        try {
          const details = await getPlaceDetails(place.place_id);
          return { place, details, index };
        } catch {
          return { place, details: null, index };
        }
      });

      const placesWithDetails = await Promise.all(detailsPromises);

      // Normalize results to have consistent id field with descriptions
      const normalizedResults = placesWithDetails.map(({ place, details, index }) => {
        // Get description from editorial_summary or first review
        let description = '';
        if (details) {
          const detailsAny = details as any;
          if (detailsAny.editorial_summary?.overview) {
            description = detailsAny.editorial_summary.overview;
          } else if (detailsAny.reviews?.[0]?.text) {
            const reviewText = detailsAny.reviews[0].text;
            description = reviewText.length > 200 ? reviewText.slice(0, 200) + '...' : reviewText;
          }
        }

        return {
          id: place.place_id || place.id || `place-${Date.now()}-${index}`,
          name: place.name,
          category: searchQuery,
          description,
          rating: place.rating,
          reviewCount: place.user_ratings_total,
          address: place.formatted_address,
          lat: place.geometry?.location?.lat || 0,
          lng: place.geometry?.location?.lng || 0,
          imageUrl: place.photos?.[0]?.photo_reference
            ? `/api/photo-proxy?ref=${encodeURIComponent(place.photos[0].photo_reference)}&maxwidth=400`
            : undefined,
        };
      });
      const searchResponse = NextResponse.json({ places: normalizedResults });
      // Places search data can be cached for 10 minutes
      searchResponse.headers.set('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1200');
      return searchResponse;
    }

    // Default: get a mix of experiences
    const allCategories: ExperienceCategory[] = [
      'cultural',
      'food_tours',
      'museums',
      'hidden_gems',
      'outdoor',
      'nightlife',
    ];

    const experiencePromises = allCategories.map((cat) =>
      getExperiencesByCategory(searchDestination, cat, locationCoords)
    );

    const allExperiences = await Promise.all(experiencePromises);
    const flatExperiences = allExperiences.flat();

    const uniqueExperiences = Array.from(
      new Map(flatExperiences.map((e) => [e.id, e])).values()
    );

    const sortedExperiences = uniqueExperiences
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 20);

    // Normalize lat/lng field names
    const normalized = sortedExperiences.map((exp: any) => ({
      ...exp,
      lat: exp.latitude || exp.lat || 0,
      lng: exp.longitude || exp.lng || 0,
    }));

    const mixResponse = NextResponse.json({ places: normalized });
    mixResponse.headers.set('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1200');
    return mixResponse;
  } catch (error) {
    console.error('Places API POST error:', error);
    return NextResponse.json({
      places: [],
      error: 'Failed to search places'
    });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const destination = searchParams.get('destination');
  const category = searchParams.get('category') as ExperienceCategory | null;
  // tripType and budget are available for future filtering
  // const tripType = searchParams.get('tripType');
  // const budget = parseInt(searchParams.get('budget') || '500', 10);

  if (!destination) {
    return NextResponse.json(
      { error: 'Missing required parameter: destination' },
      { status: 400 }
    );
  }

  try {
    if (category) {
      const experiences = await getExperiencesByCategory(destination, category);
      const catResponse = NextResponse.json(experiences);
      catResponse.headers.set('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1200');
      return catResponse;
    }

    // Get a mix of experiences from different categories
    const allCategories: ExperienceCategory[] = [
      'cultural',
      'food_tours',
      'museums',
      'hidden_gems',
      'outdoor',
      'nightlife',
    ];

    const experiencePromises = allCategories.map((cat) =>
      getExperiencesByCategory(destination, cat)
    );

    const allExperiences = await Promise.all(experiencePromises);
    const flatExperiences = allExperiences.flat();

    // Deduplicate by id
    const uniqueExperiences = Array.from(
      new Map(flatExperiences.map((e) => [e.id, e])).values()
    );

    // Sort by rating and return top results
    const sortedExperiences = uniqueExperiences
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 20);

    const expResponse = NextResponse.json(sortedExperiences);
    expResponse.headers.set('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1200');
    return expResponse;
  } catch (error) {
    console.error('Places API error:', error);

    // Return mock data as fallback
    const mockExperiences: Experience[] = [
      {
        id: 'mock-1',
        name: `${destination} City Tour`,
        category: 'cultural',
        description: `Explore the highlights of ${destination} with a local guide.`,
        imageUrl: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800',
        price: 45,
        currency: 'USD',
        duration: '3 hours',
        rating: 4.7,
        reviewCount: 234,
        address: `${destination} City Center`,
        latitude: 0,
        longitude: 0,
      },
      {
        id: 'mock-2',
        name: `${destination} Food Walking Tour`,
        category: 'food_tours',
        description: `Taste the best local cuisine on this food-focused walking tour.`,
        imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
        price: 75,
        currency: 'USD',
        duration: '4 hours',
        rating: 4.9,
        reviewCount: 567,
        address: `${destination} Old Town`,
        latitude: 0,
        longitude: 0,
      },
      {
        id: 'mock-3',
        name: `${destination} Museum Pass`,
        category: 'museums',
        description: `Skip-the-line access to the top museums.`,
        imageUrl: 'https://images.unsplash.com/photo-1565060169194-19fabf63012c?w=800',
        price: 55,
        currency: 'USD',
        duration: 'Full day',
        rating: 4.6,
        reviewCount: 890,
        address: `Museum District`,
        latitude: 0,
        longitude: 0,
      },
    ];

    return NextResponse.json(mockExperiences);
  }
}
