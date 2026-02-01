import { NextRequest, NextResponse } from 'next/server';
import { searchHotelRecommendations, checkHotelRedditStatus, searchReddit, analyzeSentiment } from '@/lib/reddit';
import { searchPlaces } from '@/lib/google-maps';
import { calculateHaversineDistance } from '@/lib/utils/geo';

// Minimum upvote threshold for quality filtering
const MIN_UPVOTES = 20;

// Budget mapping for preferences
const BUDGET_MAP: Record<string, number> = {
  budget: 150,
  mid: 300,
  upscale: 500,
  luxury: 1000,
  any: 500,
};

// Known hotel brands for validation
const KNOWN_HOTEL_BRANDS = [
  'marriott', 'hilton', 'hyatt', 'sheraton', 'westin', 'ritz-carlton', 'ritz carlton',
  'four seasons', 'st regis', 'st. regis', 'eden roc', 'holiday inn', 'courtyard',
  'hampton', 'waldorf', 'conrad', 'intercontinental', 'crowne plaza', 'radisson',
  'sofitel', 'jw marriott', 'w hotel', 'renaissance', 'fairmont', 'langham',
  'peninsula', 'mandarin oriental', 'rosewood', 'aman', 'one&only', 'banyan tree',
  'six senses', 'shangri-la', 'raffles', 'belmond', 'park hyatt', 'grand hyatt',
  'andaz', 'aloft', 'element', 'le meridien', 'tribute', 'autograph', 'best western',
  'doubletree', 'embassy suites', 'homewood suites', 'residence inn', 'springhill',
  'towneplace', 'ac hotel', 'moxy', 'casa de campo', 'breathless', 'secrets',
  'excellence', 'zoetry', 'dreams', 'now resorts', 'sanctuary cap cana', 'cap cana',
  'eden', 'tortuga bay', 'puntacana', 'barcelo', 'iberostar', 'riu', 'melia',
  'hard rock', 'paradisus', 'lopesan', 'bahia principe'
];

// Verify hotel name with Google Places including distance check
async function verifyHotelWithGoogle(
  hotelName: string,
  destination: string,
  destinationCoords?: { lat: number; lng: number },
  maxDistanceKm: number = 100
): Promise<{
  verified: boolean;
  name: string;
  lat?: number;
  lng?: number;
  rating?: number;
  address?: string;
  imageRef?: string;
  priceLevel?: number;
} | null> {
  try {
    const query = `${hotelName} hotel ${destination}`;
    const places = await searchPlaces(query);

    if (places && places.length > 0) {
      const match = places[0];
      // Check if it's actually a hotel/lodging
      const types = match.types || [];
      const isLodging = types.some((t: string) =>
        ['lodging', 'hotel', 'resort', 'guest_house'].includes(t)
      );

      if (isLodging || match.name.toLowerCase().includes('hotel') || match.name.toLowerCase().includes('resort')) {
        const hotelLat = match.geometry?.location?.lat;
        const hotelLng = match.geometry?.location?.lng;

        // Check distance from destination if coordinates provided
        if (destinationCoords && hotelLat && hotelLng) {
          const distance = calculateHaversineDistance(
            destinationCoords.lat,
            destinationCoords.lng,
            hotelLat,
            hotelLng
          );
          if (distance > maxDistanceKm) {
            console.log(`Rejected hotel "${match.name}" - ${distance.toFixed(0)}km from destination (max ${maxDistanceKm}km)`);
            return null; // Hotel is too far from destination
          }
        }

        return {
          verified: true,
          name: match.name,
          lat: hotelLat,
          lng: hotelLng,
          rating: match.rating,
          address: match.formatted_address || match.vicinity,
          imageRef: match.photos?.[0]?.photo_reference,
          priceLevel: match.price_level,
        };
      }
    }
    return null;
  } catch (error) {
    console.error('Error verifying hotel:', error);
    return null;
  }
}

/**
 * Validate that a string looks like a real hotel name (not a sentence)
 */
function isValidHotelName(name: string): boolean {
  const trimmed = name.trim();
  const words = trimmed.split(/\s+/);

  // Too many words = likely a sentence
  if (words.length > 6) return false;

  // Too few characters = likely not a hotel
  if (trimmed.length < 4) return false;

  // Starts with common sentence starters = not a hotel
  if (/^(You|I|We|They|The|This|That|It|My|Our|Your|If|When|Where|How|Why|What)\s/i.test(trimmed)) {
    return false;
  }

  // Contains common sentence phrases = not a hotel
  if (/\b(have to|need to|should|from|going to|want to|will be|would be)\b/i.test(trimmed)) {
    return false;
  }

  return true;
}

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
    const { destination, preferences, subreddits, lat, lng } = body;
    const destinationCoords = lat && lng ? { lat, lng } : undefined;

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

      // Hotel patterns - focused on explicit hotel mentions only
      // REMOVED: overly permissive pattern that matched sentences
      const hotelPatterns = [
        // "stayed at [Hotel Name]" - must end with hotel-related suffix
        /(?:stay(?:ed|ing)? at|recommend(?:ed)?|book(?:ed)?|love(?:d)?|tried|staying at)\s+(?:the\s+)?([A-Z][A-Za-z\s&'-]{2,35}(?:Hotel|Resort|Inn|Suites|Lodge|Hostel|B&B|Villas?))/gi,
        // Known brand names - must be followed by a hotel-related word or end of name
        /\b((?:JW\s+)?Marriott(?:\s+\w+){0,3}|Hilton(?:\s+\w+){0,3}|Hyatt(?:\s+\w+){0,3}|Four Seasons(?:\s+\w+){0,3}|Ritz[- ]?Carlton(?:\s+\w+){0,3}|Westin(?:\s+\w+){0,3}|Sheraton(?:\s+\w+){0,3}|Holiday Inn(?:\s+\w+){0,3}|Best Western(?:\s+\w+){0,3}|Radisson(?:\s+\w+){0,3}|Courtyard(?:\s+\w+){0,3}|Hampton(?:\s+\w+){0,3}|St\.?\s*Regis(?:\s+\w+){0,3}|W\s+Hotel(?:\s+\w+){0,3}|Eden\s+Roc(?:\s+\w+){0,3}|Mandarin\s+Oriental(?:\s+\w+){0,3}|Peninsula(?:\s+\w+){0,3}|Amanera|Amanyara|Aman\s+\w+|Rosewood(?:\s+\w+){0,3}|Waldorf(?:\s+\w+){0,3}|Conrad(?:\s+\w+){0,3}|InterContinental(?:\s+\w+){0,3}|Sofitel(?:\s+\w+){0,3}|Fairmont(?:\s+\w+){0,3}|Shangri[- ]?La(?:\s+\w+){0,3}|Raffles(?:\s+\w+){0,3}|Belmond(?:\s+\w+){0,3}|Park Hyatt(?:\s+\w+){0,3}|Grand Hyatt(?:\s+\w+){0,3}|Andaz(?:\s+\w+){0,3}|Casa de Campo|Sanctuary Cap Cana|Excellence(?:\s+\w+){0,2}|Secrets(?:\s+\w+){0,2}|Dreams(?:\s+\w+){0,2}|Breathless(?:\s+\w+){0,2}|Zoetry(?:\s+\w+){0,2}|Barcelo(?:\s+\w+){0,2}|Iberostar(?:\s+\w+){0,3}|RIU(?:\s+\w+){0,2}|Hard Rock(?:\s+\w+){0,3}|Paradisus(?:\s+\w+){0,2})(?=\s|$|[,.])/gi,
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

              // Validate hotel name - skip sentences and invalid names
              if (!isValidHotelName(hotelName)) continue;
              if (hotelName.length < 4 || hotelName.length > 50) continue;

              // Normalize key for deduplication
              const key = hotelName.trim().replace(/\s+/g, ' ').toLowerCase();

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

      // Convert to array and sort by mentions + upvotes
      const rawRecommendations = Array.from(hotelMentions.values())
        .filter(h => {
          // Filter: must have positive sentiment, and name must look like a real hotel
          if (h.count < 1 || h.totalScore < 0) return false;

          const name = h.name.toLowerCase();
          // Must be at least 2 words OR contain a known brand
          const words = h.name.trim().split(/\s+/);
          const hasKnownBrand = KNOWN_HOTEL_BRANDS.some(brand => name.includes(brand));
          if (words.length < 2 && !hasKnownBrand) return false;

          // Reject names that are just locations
          const locationWords = ['in', 'at', 'the', 'and', 'a', 'an'];
          if (locationWords.includes(words[0].toLowerCase())) return false;

          return true;
        })
        .map(h => ({
          rawName: h.name,
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

      // Filter by minimum upvotes for quality
      const qualityRecommendations = rawRecommendations.filter(
        (rec) => (rec.upvotes || 0) >= MIN_UPVOTES
      );

      console.log(`Reddit: Filtered ${rawRecommendations.length} -> ${qualityRecommendations.length} by upvotes (min ${MIN_UPVOTES})`);

      // Verify ALL quality hotels with Google Places (with distance check)
      const verificationPromises = qualityRecommendations.map(async (rec) => {
        const verified = await verifyHotelWithGoogle(rec.rawName, destination, destinationCoords, 100);
        if (verified) {
          return {
            ...rec,
            name: verified.name, // Use verified Google name
            hotelName: verified.name,
            lat: verified.lat,
            lng: verified.lng,
            rating: verified.rating,
            address: verified.address,
            imageRef: verified.imageRef,
            priceLevel: verified.priceLevel,
            verified: true,
          };
        }
        // Keep unverified if it has a known brand
        const hasKnownBrand = KNOWN_HOTEL_BRANDS.some(brand =>
          rec.rawName.toLowerCase().includes(brand)
        );
        if (hasKnownBrand) {
          return { ...rec, verified: false };
        }
        return null; // Filter out unverified unknown hotels
      });

      const verifiedResults = await Promise.all(verificationPromises);
      recommendations = verifiedResults.filter(Boolean) as any[];

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

      // Boost for verified hotels
      if (hotel.verified) {
        score += 100;
      }

      // Estimate price based on priceLevel from Google (0-4) or budget preference
      let priceEstimate = 200;
      if (hotel.priceLevel !== undefined) {
        priceEstimate = [80, 150, 250, 400, 600][hotel.priceLevel] || 200;
      } else if (preferences?.budget === 'luxury') {
        priceEstimate = 450;
      } else if (preferences?.budget === 'budget') {
        priceEstimate = 100;
      }

      // Get image URL from Google if available
      const imageUrl = hotel.imageRef
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${hotel.imageRef}&key=${process.env.GOOGLE_MAPS_API_KEY}`
        : undefined;

      return {
        ...hotel,
        name: hotel.name || hotel.hotelName,
        id: `reddit-${(hotel.name || hotel.hotelName).toLowerCase().replace(/\s+/g, '-').slice(0, 30)}`,
        matchScore: score,
        priceEstimate,
        imageUrl,
        tags: [
          preferences?.budget && `${preferences.budget} budget`,
          preferences?.style && preferences.style,
          preferences?.priority && preferences.priority,
          ...(hotel.subreddits || []).map((s: string) => `r/${s}`),
        ].filter(Boolean),
      };
    });

    // Sort by match score (verified hotels will rank higher)
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
