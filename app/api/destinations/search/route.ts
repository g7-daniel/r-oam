import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_MAPS_BASE_URL = 'https://maps.googleapis.com/maps/api';

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

    const response = await fetch(
      `${GOOGLE_MAPS_BASE_URL}/place/autocomplete/json?${params}`
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

          const detailsResponse = await fetch(
            `${GOOGLE_MAPS_BASE_URL}/place/details/json?${detailsParams}`
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

          // Get photo URL if available
          let imageUrl = `https://source.unsplash.com/400x300/?${encodeURIComponent(mainName + ' travel')}`;
          if (result.photos?.[0]?.photo_reference) {
            imageUrl = `${GOOGLE_MAPS_BASE_URL}/place/photo?maxwidth=400&photo_reference=${result.photos[0].photo_reference}&key=${apiKey}`;
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
