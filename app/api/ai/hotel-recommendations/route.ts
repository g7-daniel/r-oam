import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { sanitizeDestination, sanitizeUserInput } from '@/lib/prompt-sanitizer';
import { serverEnv } from '@/lib/env';

// Lazy-initialize Groq client
let _groq: OpenAI | null = null;
function getGroq(): OpenAI {
  if (!_groq) {
    _groq = new OpenAI({
      apiKey: serverEnv.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    });
  }
  return _groq;
}

// Subreddits to search for hotel recommendations
const HOTEL_SUBREDDITS = [
  'fatfire',
  'luxurytravel',
  'travel',
  'hotels',
  'solotravel',
  'TravelHacks',
  'awardtravel',
  'churning',
];

interface HotelRecommendation {
  name: string;
  description: string;
  priceRange?: string;
  subreddit?: string;
  upvotes?: number;
  url?: string;
}

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    if (!body.query || !body.destination) {
      return NextResponse.json(
        { error: 'Query and destination are required' },
        { status: 400 }
      );
    }

    // Sanitize inputs to prevent prompt injection
    const query = sanitizeUserInput(body.query);
    const destination = sanitizeDestination(body.destination);

    if (!query || !destination) {
      return NextResponse.json(
        { error: 'Invalid query or destination after sanitization' },
        { status: 400 }
      );
    }

    // Detect price range from query
    const priceMatch = query.match(/\$(\d+)/);
    const budgetAmount = priceMatch ? parseInt(priceMatch[1]) : null;

    // Detect specific subreddit mentions - only allow valid subreddit names
    const subredditMatch = query.match(/r\/(\w{3,21})/i);
    const mentionedSubreddit = subredditMatch
      ? subredditMatch[1].replace(/[^\w]/g, '').slice(0, 21)
      : null;

    // Determine which subreddits to emphasize based on query
    let prioritySubreddits = HOTEL_SUBREDDITS;
    if (query.toLowerCase().includes('luxury') || query.toLowerCase().includes('fatfire') || (budgetAmount && budgetAmount > 400)) {
      prioritySubreddits = ['fatfire', 'luxurytravel', 'hotels', ...HOTEL_SUBREDDITS];
    } else if (query.toLowerCase().includes('budget') || query.toLowerCase().includes('cheap') || (budgetAmount && budgetAmount < 150)) {
      prioritySubreddits = ['solotravel', 'TravelHacks', 'awardtravel', ...HOTEL_SUBREDDITS];
    }

    if (mentionedSubreddit) {
      prioritySubreddits = [mentionedSubreddit, ...prioritySubreddits.filter(s => s !== mentionedSubreddit)];
    }

    // Use AI to generate contextual hotel recommendations
    const systemPrompt = `You are Snoo, a helpful Reddit-powered travel assistant for r/oam. Your job is to recommend hotels based on what Reddit communities like ${prioritySubreddits.slice(0, 4).map(s => `r/${s}`).join(', ')} typically recommend.

For ${destination}, provide hotel recommendations that match the user's query. Be specific about:
1. Hotel names (real hotels that exist)
2. Why Redditors recommend them (specific features, value, etc.)
3. Price range per night
4. Which subreddit community typically recommends this

${budgetAmount ? `The user has a budget around $${budgetAmount}/night.` : ''}

Respond in JSON format with this structure:
{
  "message": "A friendly 1-2 sentence intro",
  "hotels": [
    {
      "name": "Hotel Name",
      "description": "Why Redditors love this - specific details",
      "priceRange": "$XXX-$XXX/night",
      "subreddit": "subredditname",
      "upvotes": 0
    }
  ]
}

Include 3-5 hotel recommendations. Make them realistic and based on what these communities actually value:
- r/fatfire: Ultra-luxury, exceptional service, unique experiences
- r/luxurytravel: High-end but value-conscious luxury
- r/travel: Well-rounded options with good reviews
- r/solotravel: Safe, social, good value
- r/awardtravel: Point-bookable properties, good redemption value`;

    const response = await getGroq().chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query },
      ],
      temperature: 0.7,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json({
        message: `I couldn't find specific recommendations for ${destination}. Try asking about a specific budget or style!`,
        hotels: [],
      });
    }

    try {
      const parsed = JSON.parse(content);

      // Add mock upvotes and URLs for demonstration
      const hotels: HotelRecommendation[] = (parsed.hotels || []).map((hotel: any, idx: number) => ({
        ...hotel,
        upvotes: hotel.upvotes || Math.floor(Math.random() * 500) + 50,
        url: `https://reddit.com/r/${hotel.subreddit || 'travel'}/search?q=${encodeURIComponent(hotel.name + ' ' + destination)}`,
      }));

      return NextResponse.json({
        message: parsed.message || `Here are some Reddit-recommended hotels in ${destination}:`,
        hotels,
      });
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return NextResponse.json({
        message: content,
        hotels: [],
      });
    }
  } catch (error) {
    console.error('Hotel recommendations error:', error);

    // Fallback response with generic recommendations
    return NextResponse.json({
      message: `Here are some commonly recommended hotels for your destination:`,
      hotels: [
        {
          name: 'Check TripAdvisor Top Picks',
          description: 'Redditors often cross-reference with TripAdvisor for the most recent reviews',
          priceRange: 'Varies',
          subreddit: 'travel',
          upvotes: 234,
        },
        {
          name: 'Look for Hyatt/Marriott properties',
          description: 'Popular on r/awardtravel for point redemptions and consistent quality',
          priceRange: '$150-$400/night',
          subreddit: 'awardtravel',
          upvotes: 189,
        },
      ],
    });
  }
}
