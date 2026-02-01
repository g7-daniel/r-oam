import { NextRequest, NextResponse } from 'next/server';
import { searchHotelRecommendations, checkHotelRedditStatus } from '@/lib/reddit';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const destination = searchParams.get('destination');
    const budget = parseInt(searchParams.get('budget') || '3000', 10);
    const hotelName = searchParams.get('hotelName');

    if (!destination) {
      return NextResponse.json(
        { error: 'Destination is required' },
        { status: 400 }
      );
    }

    // If hotelName is provided, check status for specific hotel
    if (hotelName) {
      const status = await checkHotelRedditStatus(hotelName, destination, budget);
      return NextResponse.json(status);
    }

    // Otherwise, get general hotel recommendations
    const recommendations = await searchHotelRecommendations(destination, budget);

    return NextResponse.json({
      destination,
      budget,
      recommendations,
    });
  } catch (error) {
    console.error('Reddit hotels API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hotel recommendations' },
      { status: 500 }
    );
  }
}
