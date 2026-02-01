import { NextRequest, NextResponse } from 'next/server';
import { generateFullItinerary } from '@/lib/itinerary-scheduler';
import type { TripLeg } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { legs } = body as { legs: TripLeg[] };

    if (!legs || !Array.isArray(legs)) {
      return NextResponse.json(
        { error: 'Invalid request: legs array is required' },
        { status: 400 }
      );
    }

    // Generate the full itinerary
    const itinerary = generateFullItinerary(legs);

    return NextResponse.json({
      success: true,
      itinerary: {
        days: itinerary.days,
        totalDays: itinerary.totalDays,
        summary: itinerary.summary,
      },
    });
  } catch (error) {
    console.error('Error generating itinerary:', error);
    return NextResponse.json(
      { error: 'Failed to generate itinerary' },
      { status: 500 }
    );
  }
}
