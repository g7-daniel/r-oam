import { NextRequest, NextResponse } from 'next/server';
import { searchHotelRecommendations, checkHotelRedditStatus } from '@/lib/reddit';

// Budget mapping for preferences
const BUDGET_MAP: Record<string, number> = {
  budget: 150,
  mid: 300,
  upscale: 500,
  luxury: 1000,
  any: 500,
};

// Style keywords for search
const STYLE_KEYWORDS: Record<string, string[]> = {
  resort: ['resort', 'all-inclusive', 'beachfront'],
  boutique: ['boutique', 'unique', 'charming', 'design'],
  chain: ['marriott', 'hilton', 'hyatt', 'sheraton', 'westin'],
  villa: ['villa', 'private', 'airbnb', 'rental'],
  any: [],
};

// Priority keywords
const PRIORITY_KEYWORDS: Record<string, string[]> = {
  beach: ['beachfront', 'beach access', 'oceanfront', 'on the beach'],
  pool: ['amazing pool', 'infinity pool', 'pool area', 'poolside'],
  service: ['service', 'staff', 'butler', 'concierge', 'attentive'],
  food: ['restaurant', 'dining', 'food', 'breakfast', 'chef'],
  any: [],
};

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

// POST handler for preference-based search (from Snoo questionnaire)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { destination, preferences } = body;

    if (!destination) {
      return NextResponse.json(
        { error: 'Destination is required' },
        { status: 400 }
      );
    }

    const budget = BUDGET_MAP[preferences?.budget || 'mid'] || 300;
    const styleKeywords = STYLE_KEYWORDS[preferences?.style || 'any'] || [];
    const priorityKeywords = PRIORITY_KEYWORDS[preferences?.priority || 'any'] || [];

    // Build search context
    const searchContext = {
      destination,
      budget,
      keywords: [...styleKeywords, ...priorityKeywords].join(' '),
    };

    console.log('Snoo hotel search:', searchContext);

    // Get recommendations from Reddit
    const recommendations = await searchHotelRecommendations(destination, budget);

    // Score and filter recommendations based on preferences
    const scoredHotels = recommendations.map((hotel: any) => {
      let score = hotel.upvotes || 0;
      const hotelText = `${hotel.name} ${hotel.description || ''}`.toLowerCase();

      // Boost for style match
      for (const keyword of styleKeywords) {
        if (hotelText.includes(keyword.toLowerCase())) {
          score += 50;
        }
      }

      // Boost for priority match
      for (const keyword of priorityKeywords) {
        if (hotelText.includes(keyword.toLowerCase())) {
          score += 30;
        }
      }

      // Budget alignment
      if (preferences?.budget === 'luxury' && hotelText.includes('luxury')) {
        score += 40;
      }

      return {
        ...hotel,
        id: `reddit-${hotel.name.toLowerCase().replace(/\s+/g, '-').slice(0, 30)}`,
        matchScore: score,
        tags: [
          preferences?.budget && `${preferences.budget} budget`,
          preferences?.style && preferences.style,
          preferences?.priority && preferences.priority,
        ].filter(Boolean),
      };
    });

    // Sort by match score
    scoredHotels.sort((a: any, b: any) => (b.matchScore || 0) - (a.matchScore || 0));

    return NextResponse.json({
      hotels: scoredHotels.slice(0, 10),
      preferences,
      destination,
    });
  } catch (error) {
    console.error('Reddit hotels POST API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hotel recommendations' },
      { status: 500 }
    );
  }
}
