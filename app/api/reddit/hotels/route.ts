import { NextRequest, NextResponse } from 'next/server';
import { searchHotelRecommendations, checkHotelRedditStatus, searchReddit, analyzeSentiment } from '@/lib/reddit';

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

// POST handler for preference-based search (from Snoo questionnaire or subreddit selection)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { destination, preferences, subreddits } = body;

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
      subreddits: subreddits || [],
      keywords: [...styleKeywords, ...priorityKeywords].join(' '),
    };

    console.log('Reddit hotel search:', searchContext);

    // If specific subreddits are provided, search those directly
    let recommendations: any[] = [];

    if (subreddits && subreddits.length > 0) {
      // Search each selected subreddit for hotel mentions
      const searchQueries = [
        `${destination} hotel recommendation`,
        `${destination} where to stay`,
        `${destination} best hotel`,
        `${destination} resort`,
      ];

      const hotelMentions = new Map<string, {
        name: string;
        count: number;
        totalScore: number;
        quotes: string[];
        subreddits: Set<string>;
        upvotes: number;
      }>();

      // Common hotel patterns to extract
      const hotelPatterns = [
        /(?:stay(?:ed)? at|recommend(?:ed)?|book(?:ed)?|love(?:d)?|tried)\s+(?:the\s+)?([A-Z][A-Za-z\s&']+(?:Hotel|Resort|Inn|Suites|Lodge|Hostel|B&B))/gi,
        /([A-Z][A-Za-z\s&']+(?:Marriott|Hilton|Hyatt|Four Seasons|Ritz|Westin|Sheraton|Holiday Inn|Best Western|Radisson|Courtyard|Hampton|St\.?\s*Regis|W\s+Hotel|Eden\s+Roc|Mandarin|Peninsula|Aman))/gi,
        /([A-Z][A-Za-z\s&']+)\s+(?:was|is)\s+(?:amazing|great|perfect|excellent|wonderful|incredible)/gi,
      ];

      for (const query of searchQueries) {
        const posts = await searchReddit(query, subreddits, 15);

        for (const post of posts) {
          const fullText = `${post.title} ${post.selftext}`;
          const sentiment = analyzeSentiment(fullText);

          for (const pattern of hotelPatterns) {
            pattern.lastIndex = 0;
            let match;
            while ((match = pattern.exec(fullText)) !== null) {
              const hotelName = match[1].trim();
              if (hotelName.length > 3 && hotelName.length < 60) {
                const key = hotelName.toLowerCase();
                const existing = hotelMentions.get(key) || {
                  name: hotelName,
                  count: 0,
                  totalScore: 0,
                  quotes: [],
                  subreddits: new Set(),
                  upvotes: 0,
                };

                existing.count++;
                existing.totalScore += sentiment;
                existing.subreddits.add(post.subreddit);
                existing.upvotes += post.score;

                // Extract quote around the mention
                const mentionIndex = fullText.indexOf(hotelName);
                if (mentionIndex >= 0 && existing.quotes.length < 2) {
                  const start = Math.max(0, mentionIndex - 30);
                  const end = Math.min(fullText.length, mentionIndex + hotelName.length + 80);
                  const quote = fullText.slice(start, end).trim();
                  if (quote.length > 15) {
                    existing.quotes.push(quote);
                  }
                }

                hotelMentions.set(key, existing);
              }
            }
          }
        }
      }

      // Convert to array and sort by mentions + upvotes
      recommendations = Array.from(hotelMentions.values())
        .filter(h => h.count >= 1 && h.totalScore >= 0)
        .map(h => ({
          hotelName: h.name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          name: h.name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          mentionCount: h.count,
          sentimentScore: h.count > 0 ? h.totalScore / h.count : 0,
          quotes: h.quotes,
          subreddits: Array.from(h.subreddits),
          upvotes: h.upvotes,
          description: h.quotes[0] || `Mentioned ${h.count} times on Reddit`,
        }))
        .sort((a, b) => {
          // Sort by combination of mentions, upvotes, and sentiment
          const scoreA = (a.mentionCount * 10) + (a.upvotes * 0.1) + (a.sentimentScore * 20);
          const scoreB = (b.mentionCount * 10) + (b.upvotes * 0.1) + (b.sentimentScore * 20);
          return scoreB - scoreA;
        });
    } else {
      // Fall back to default budget-based search
      recommendations = await searchHotelRecommendations(destination, budget);
    }

    // Score and filter recommendations based on preferences
    const scoredHotels = recommendations.map((hotel: any) => {
      let score = hotel.upvotes || hotel.mentionCount || 0;
      const hotelText = `${hotel.name || hotel.hotelName} ${hotel.description || ''}`.toLowerCase();

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

      // Boost for multiple subreddit mentions
      if (hotel.subreddits && hotel.subreddits.length > 1) {
        score += hotel.subreddits.length * 15;
      }

      return {
        ...hotel,
        name: hotel.name || hotel.hotelName,
        id: `reddit-${(hotel.name || hotel.hotelName).toLowerCase().replace(/\s+/g, '-').slice(0, 30)}`,
        matchScore: score,
        tags: [
          preferences?.budget && `${preferences.budget} budget`,
          preferences?.style && preferences.style,
          preferences?.priority && preferences.priority,
          ...(hotel.subreddits || []).map((s: string) => `r/${s}`),
        ].filter(Boolean),
      };
    });

    // Sort by match score
    scoredHotels.sort((a: any, b: any) => (b.matchScore || 0) - (a.matchScore || 0));

    return NextResponse.json({
      hotels: scoredHotels.slice(0, 15),
      preferences,
      destination,
      searchedSubreddits: subreddits || [],
    });
  } catch (error) {
    console.error('Reddit hotels POST API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hotel recommendations' },
      { status: 500 }
    );
  }
}
