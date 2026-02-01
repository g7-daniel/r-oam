import { NextRequest, NextResponse } from 'next/server';
import {
  getDestinationSentiment,
  getAirlineSentiment,
  getHotelSentiment,
  getSubredditsForBudget,
} from '@/lib/reddit';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const destination = searchParams.get('destination');
  const airline = searchParams.get('airline');
  const hotel = searchParams.get('hotel');
  const city = searchParams.get('city');
  const budget = parseInt(searchParams.get('budget') || '3000', 10);

  try {
    if (destination) {
      const sentiment = await getDestinationSentiment(destination, budget);
      return NextResponse.json(sentiment);
    }

    if (airline) {
      const sentiment = await getAirlineSentiment(airline);
      return NextResponse.json(sentiment);
    }

    if (hotel && city) {
      const sentiment = await getHotelSentiment(hotel, city);
      return NextResponse.json(sentiment);
    }

    // Just return subreddit suggestions based on budget
    const subreddits = getSubredditsForBudget(budget);
    return NextResponse.json({ subreddits });
  } catch (error) {
    console.error('Reddit API error:', error);

    // Return a neutral fallback sentiment
    return NextResponse.json({
      score: 0,
      label: 'neutral',
      mentionCount: 0,
      topComments: [],
      subreddits: getSubredditsForBudget(budget),
    });
  }
}
