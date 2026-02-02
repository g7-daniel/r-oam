import { NextRequest, NextResponse } from 'next/server';
import { fetchWithTimeout } from '@/lib/api-cache';

const GOOGLE_MAPS_BASE_URL = 'https://maps.googleapis.com/maps/api';
const GOOGLE_API_TIMEOUT = 10000; // 10 second timeout

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query || query.length < 2) {
    return NextResponse.json({ destinations: [] });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.warn('Google Maps API key not configured');
    return NextResponse.json({ destinations: [], error: 'API not configured' });
  }

  try {
    // Use Google Places Autocomplete API for destination search
    // Filter by types to get cities, regions, countries
    const params = new URLSearchParams({
      input: query,
      types: '(regions)', // Returns cities, regions, countries, etc.
      key: apiKey,
    });

    const response = await fetchWithTimeout(
      `${GOOGLE_MAPS_BASE_URL}/place/autocomplete/json?${params}`,
      {},
      GOOGLE_API_TIMEOUT
    );

    if (!response.ok) {
      console.error('Google Places Autocomplete failed:', response.statusText);
      return NextResponse.json({ destinations: [] });
    }

    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Places API error:', data.status, data.error_message);
      return NextResponse.json({ destinations: [] });
    }

    // Get details for each prediction to get coordinates
    const destinations = await Promise.all(
      (data.predictions || []).slice(0, 8).map(async (prediction: any) => {
        try {
          // Get place details to retrieve coordinates
          const detailsParams = new URLSearchParams({
            place_id: prediction.place_id,
            fields: 'geometry,address_components,photos',
            key: apiKey,
          });

          const detailsResponse = await fetchWithTimeout(
            `${GOOGLE_MAPS_BASE_URL}/place/details/json?${detailsParams}`,
            {},
            GOOGLE_API_TIMEOUT
          );

          if (!detailsResponse.ok) {
            return null;
          }

          const detailsData = await detailsResponse.json();
          const result = detailsData.result;

          if (!result?.geometry?.location) {
            return null;
          }

          // Extract country code from address components
          const countryComponent = result.address_components?.find(
            (c: any) => c.types.includes('country')
          );
          const countryCode = countryComponent?.short_name || 'XX';
          const country = countryComponent?.long_name || '';

          // Extract the main name (first part of description)
          const mainName = prediction.structured_formatting?.main_text ||
            prediction.description.split(',')[0];

          // Get photo URL if available - use Google Places photo or reliable Unsplash static image
          let imageUrl = '';
          if (result.photos?.[0]?.photo_reference) {
            imageUrl = `${GOOGLE_MAPS_BASE_URL}/place/photo?maxwidth=400&photo_reference=${result.photos[0].photo_reference}&key=${apiKey}`;
          } else {
            // Use a reliable static Unsplash travel image as fallback
            const fallbackImages = [
              'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400&h=300&fit=crop', // travel map
              'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=300&fit=crop', // beach
              'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=400&h=300&fit=crop', // lake mountains
              'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=300&fit=crop', // paris
              'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=400&h=300&fit=crop', // city
              'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=400&h=300&fit=crop', // venice
              'https://images.unsplash.com/photo-1530521954074-e64f6810b32d?w=400&h=300&fit=crop', // tropical
              'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400&h=300&fit=crop', // japan
            ];
            // Pick a consistent image based on the destination name
            const index = mainName.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) % fallbackImages.length;
            imageUrl = fallbackImages[index];
          }

          return {
            name: mainName,
            countryCode,
            country,
            lat: result.geometry.location.lat,
            lng: result.geometry.location.lng,
            imageUrl,
            placeId: prediction.place_id,
            fullDescription: prediction.description,
          };
        } catch (err) {
          console.error('Error fetching place details:', err);
          return null;
        }
      })
    );

    // Filter out nulls and return
    const validDestinations = destinations.filter(Boolean);

    return NextResponse.json({ destinations: validDestinations });
  } catch (error) {
    console.error('Destination search error:', error);
    return NextResponse.json({ destinations: [], error: 'Search failed' });
  }
}
