import { NextRequest, NextResponse } from 'next/server';
import { getDirections, getDistanceMatrix } from '@/lib/google-maps';
import type { ItineraryDay, ItineraryItem, TransitInfo } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { itinerary, hotelLocation } = body;

    if (!itinerary || !Array.isArray(itinerary)) {
      return NextResponse.json(
        { error: 'Missing required parameter: itinerary' },
        { status: 400 }
      );
    }

    // Calculate transit times between locations
    const enhancedItinerary: ItineraryDay[] = await Promise.all(
      itinerary.map(async (day: ItineraryDay) => {
        const itemsWithTransit = await Promise.all(
          day.items.map(async (item: ItineraryItem, index: number) => {
            if (index === 0 || !hotelLocation) {
              return item;
            }

            const prevItem = day.items[index - 1];
            if (!prevItem) return item;

            // For now, just estimate transit times
            // In production, you would use Google Maps Directions API
            const transitInfo: TransitInfo = {
              mode: 'walk',
              duration: '15 min',
              distance: '1.2 km',
            };

            return {
              ...item,
              transitInfo,
            };
          })
        );

        return {
          ...day,
          items: itemsWithTransit,
        };
      })
    );

    return NextResponse.json(enhancedItinerary);
  } catch (error) {
    console.error('Itinerary API error:', error);
    return NextResponse.json(
      { error: 'Failed to process itinerary' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const origin = searchParams.get('origin');
  const destination = searchParams.get('destination');

  if (!origin || !destination) {
    return NextResponse.json(
      { error: 'Missing required parameters: origin, destination' },
      { status: 400 }
    );
  }

  try {
    // Parse coordinates
    const [originLat, originLng] = origin.split(',').map(Number);
    const [destLat, destLng] = destination.split(',').map(Number);

    if (isNaN(originLat) || isNaN(originLng) || isNaN(destLat) || isNaN(destLng)) {
      return NextResponse.json(
        { error: 'Invalid coordinates format' },
        { status: 400 }
      );
    }

    const directions = await getDirections(
      { lat: originLat, lng: originLng },
      { lat: destLat, lng: destLng },
      'transit'
    );

    if (!directions || !directions.routes.length) {
      return NextResponse.json({
        mode: 'walk',
        duration: 'N/A',
        distance: 'N/A',
      });
    }

    const leg = directions.routes[0].legs[0];
    return NextResponse.json({
      mode: 'transit',
      duration: leg.duration.text,
      distance: leg.distance.text,
      steps: leg.steps.map((step) => ({
        mode: step.travel_mode,
        distance: step.distance.text,
        duration: step.duration.text,
        instructions: step.instructions,
      })),
    });
  } catch (error) {
    console.error('Directions API error:', error);
    return NextResponse.json(
      { error: 'Failed to get directions' },
      { status: 500 }
    );
  }
}
