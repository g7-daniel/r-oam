import { NextRequest, NextResponse } from 'next/server';
import { searchReddit } from '@/lib/reddit';
import { searchPlaces, getPlaceDetails } from '@/lib/google-maps';
import { getSubredditsForDestination, getSearchTermsForCategory } from '@/lib/data/subredditMapping';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import { serverEnv, isConfigured } from '@/lib/env';

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

// Lazy-initialize Gemini client (fallback when Groq is rate limited)
let _gemini: GoogleGenAI | null | undefined = undefined;
function getGemini(): GoogleGenAI | null {
  if (_gemini === undefined) {
    _gemini = serverEnv.GEMINI_API_KEY
      ? new GoogleGenAI({ apiKey: serverEnv.GEMINI_API_KEY })
      : null;
  }
  return _gemini;
}

const GROQ_MODEL = 'llama-3.3-70b-versatile';
const GEMINI_MODEL = 'gemini-2.5-flash';

interface ExtractedPlace {
  name: string;
  quote: string;
  subreddit: string;
  upvotes: number;
  category: string;
}

interface EnrichedRecommendation {
  id: string;
  name: string;
  description: string;
  category: string;
  rating?: number;
  reviewCount?: number;
  lat?: number;
  lng?: number;
  address?: string;
  imageUrl?: string;
  source: {
    type: 'reddit';
    subreddit: string;
    quote?: string;
    upvotes: number;
    url?: string;
  };
  durationMinutes: number;
}

/**
 * Reddit-first recommendations API
 *
 * Flow:
 * 1. Search Reddit for posts about the category in the destination
 * 2. Use AI (Groq) to extract REAL place names from the posts
 * 3. Verify each place exists via Google Places API
 * 4. Only return places with valid Google data (coords, photos)
 */
export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body', recommendations: [], sources: [] }, { status: 400 });
    }
    const { category, destination, lat, lng, subreddits: customSubreddits } = body;

    if (!destination) {
      return NextResponse.json({ error: 'Destination is required' }, { status: 400 });
    }

    // Use provided subreddits or get defaults for destination
    const subreddits = customSubreddits?.length > 0
      ? customSubreddits
      : getSubredditsForDestination(destination);

    // 1. Search Reddit for relevant posts
    const redditPosts = await searchRedditPosts(subreddits, destination, category);

    if (redditPosts.length === 0) {
      // Fallback to Google-only if no Reddit posts found
      return await getGoogleOnlyResults(category, destination, lat, lng);
    }

    // 2. Use AI to extract real place names from Reddit posts
    const extractedPlaces = await extractPlaceNamesWithAI(redditPosts, destination, category);

    if (extractedPlaces.length === 0) {
      // Fallback to Google-only if AI couldn't extract places
      return await getGoogleOnlyResults(category, destination, lat, lng);
    }

    // 3. Verify each place with Google Places and enrich with data
    const verifiedPlaces = await verifyAndEnrichWithGoogle(
      extractedPlaces,
      destination,
      lat ? { lat: Number(lat), lng: Number(lng) } : undefined
    );

    return NextResponse.json({
      recommendations: verifiedPlaces,
      sources: subreddits,
      extractedFromReddit: extractedPlaces.length,
      verifiedWithGoogle: verifiedPlaces.length,
    });
  } catch (error) {
    console.error('Recommendations API error:', error);
    return NextResponse.json({
      recommendations: [],
      sources: [],
      error: 'Failed to fetch recommendations',
    });
  }
}

/**
 * Search Reddit for posts about the category
 */
async function searchRedditPosts(
  subreddits: string[],
  destination: string,
  category?: string
): Promise<Array<{ title: string; selftext: string; subreddit: string; score: number; permalink: string }>> {
  const posts: Array<{ title: string; selftext: string; subreddit: string; score: number; permalink: string }> = [];

  // Build search queries based on category
  const categoryTerms = category ? getSearchTermsForCategory(category) : ['best', 'recommend'];
  const queries = categoryTerms.slice(0, 2).map(term => `${term} ${destination}`);

  for (const subreddit of subreddits.slice(0, 3)) {
    for (const query of queries) {
      try {
        const results = await searchReddit(query, [subreddit], 8);
        posts.push(...results.map(r => ({
          title: r.title,
          selftext: r.selftext || '',
          subreddit: r.subreddit,
          score: r.score,
          permalink: r.permalink,
        })));
      } catch (error) {
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Sort by score and deduplicate
  const seen = new Set<string>();
  return posts
    .filter(p => {
      if (seen.has(p.title)) return false;
      seen.add(p.title);
      return true;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 15); // Top 15 posts
}

/**
 * Build the prompt for AI extraction
 */
function buildExtractionPrompt(
  posts: Array<{ title: string; selftext: string; subreddit: string; score: number }>,
  destination: string,
  category?: string
): string {
  const postsContent = posts
    .map((p, i) => `[Post ${i + 1}] r/${p.subreddit} (${p.score} upvotes)\nTitle: ${p.title}\n${p.selftext.slice(0, 500)}`)
    .join('\n\n---\n\n');

  const categoryContext = category
    ? `The user is looking for "${category}" recommendations.`
    : 'The user is looking for general recommendations.';

  return `You are extracting SPECIFIC, REAL place names from Reddit travel discussions about ${destination}.

${categoryContext}

Your task:
1. Read through these Reddit posts
2. Extract ONLY specific place names that are REAL businesses/locations in ${destination}
3. Each place must be a verifiable name (restaurant name, beach name, attraction name, etc.)
4. Include a relevant quote from the post mentioning the place
5. Do NOT make up places - only extract what's actually mentioned

Reddit Posts:
${postsContent}

Respond with ONLY a JSON array of places. Each place must have:
- name: The exact place name as mentioned (e.g., "Restaurante Playa Carmen" not just "a restaurant")
- quote: A short quote from the post about this place (max 100 chars)
- subreddit: Which subreddit it came from
- upvotes: The post's upvote count
- category: One of: dining, beaches, nature, adventure, nightlife, cultural, shopping, wellness, landmarks

Example output:
[
  {"name": "Koji Sushi", "quote": "Koji Sushi has the freshest fish in town", "subreddit": "costarica", "upvotes": 234, "category": "dining"},
  {"name": "Playa Hermosa", "quote": "Playa Hermosa is less crowded and has better waves", "subreddit": "surfing", "upvotes": 156, "category": "beaches"}
]

CRITICAL RULES:
- Return ONLY valid JSON array, no other text
- Only include REAL, SPECIFIC place names (not generic descriptions)
- If you can't find any real place names, return an empty array: []
- Maximum 10 places
- Do NOT include generic terms like "the beach" or "local restaurant" - only named places`;
}

/**
 * Parse AI response and extract places
 */
function parseExtractedPlaces(content: string): ExtractedPlace[] {
  // Try to find a complete JSON array
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    // If no complete array, try to fix truncated JSON
    const partialMatch = content.match(/\[[\s\S]*/);
    if (partialMatch) {
      // Try to extract whatever valid objects we can from a truncated response
      const places: ExtractedPlace[] = [];
      const objectPattern = /\{\s*"name"\s*:\s*"([^"]+)"\s*,\s*"quote"\s*:\s*"([^"]*)"[^}]*"subreddit"\s*:\s*"([^"]+)"[^}]*"upvotes"\s*:\s*(\d+)[^}]*"category"\s*:\s*"([^"]+)"\s*\}/g;
      let match;
      while ((match = objectPattern.exec(content)) !== null) {
        places.push({
          name: match[1],
          quote: match[2].slice(0, 100),
          subreddit: match[3].replace(/^r\//, ''),
          upvotes: parseInt(match[4], 10),
          category: match[5],
        });
      }
      if (places.length > 0) {
        return places;
      }
    }
    return [];
  }

  try {
    const places = JSON.parse(jsonMatch[0]) as ExtractedPlace[];
    return places;
  } catch (parseError) {
    return [];
  }
}

/**
 * Use Gemini to extract place names (fallback when Groq is rate limited)
 */
async function extractWithGemini(prompt: string): Promise<ExtractedPlace[]> {
  if (!getGemini()) {
    throw new Error('Gemini not configured');
  }

  try {
    const response = await getGemini()!.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        temperature: 0.3,
        maxOutputTokens: 4000,
        responseMimeType: 'application/json',
      },
    });

    const content = response.text || '[]';
    return parseExtractedPlaces(content);
  } catch (geminiError) {
    console.error('Gemini extraction error:', geminiError);
    throw geminiError;
  }
}

/**
 * Use AI to extract real place names from Reddit posts
 * Tries Groq first, falls back to Gemini if rate limited
 */
async function extractPlaceNamesWithAI(
  posts: Array<{ title: string; selftext: string; subreddit: string; score: number }>,
  destination: string,
  category?: string
): Promise<ExtractedPlace[]> {
  const prompt = buildExtractionPrompt(posts, destination, category);
  let isRateLimited = false;

  // Try Groq first
  if (isConfigured.groq()) {
    try {
      const response = await getGroq().chat.completions.create({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1500,
      });

      const content = response.choices[0]?.message?.content || '[]';
      return parseExtractedPlaces(content);
    } catch (error) {
      const errorMessage = (error as any)?.message || '';
      console.error('Groq extraction failed:', errorMessage);

      // Check if it's a rate limit error
      if (errorMessage.includes('Rate limit') || errorMessage.includes('rate_limit') ||
          errorMessage.includes('429') || errorMessage.includes('quota')) {
        isRateLimited = true;
      }
    }
  }

  // Try Gemini fallback
  if (getGemini()) {
    try {
      return await extractWithGemini(prompt);
    } catch (geminiError) {
      console.error('Gemini fallback also failed:', geminiError);
    }
  }

  if (isRateLimited) {
  }

  return [];
}

/**
 * Verify places with Google and enrich with real data
 */
async function verifyAndEnrichWithGoogle(
  places: ExtractedPlace[],
  destination: string,
  location?: { lat: number; lng: number }
): Promise<EnrichedRecommendation[]> {
  const verified: EnrichedRecommendation[] = [];

  for (const place of places) {
    try {
      // Search Google Places for this specific place
      const searchQuery = `${place.name} ${destination}`;
      const results = await searchPlaces(searchQuery, location, 20000);

      // Check if we got a good match (name should be similar)
      const match = results.find(r =>
        r.name.toLowerCase().includes(place.name.toLowerCase().split(' ')[0]) ||
        place.name.toLowerCase().includes(r.name.toLowerCase().split(' ')[0])
      ) || results[0];

      if (match && match.geometry?.location) {
        // Fetch place details to get real description
        let description = `Popular ${place.category || 'attraction'} in ${destination}`;
        try {
          if (match.place_id) {
            const details = await getPlaceDetails(match.place_id);
            const detailsAny = details as any;
            if (detailsAny.editorial_summary?.overview) {
              description = detailsAny.editorial_summary.overview;
            } else if (detailsAny.reviews?.[0]?.text) {
              const reviewText = detailsAny.reviews[0].text;
              description = reviewText.length > 200 ? reviewText.slice(0, 200) + '...' : reviewText;
            }
          }
        } catch (detailsError) {
        }

        verified.push({
          id: `reddit-${place.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
          name: match.name || place.name,
          description,
          category: place.category,
          rating: match.rating,
          reviewCount: match.user_ratings_total,
          lat: match.geometry.location.lat,
          lng: match.geometry.location.lng,
          address: match.formatted_address,
          imageUrl: match.photos?.[0]?.photo_reference
            ? `/api/photo-proxy?ref=${encodeURIComponent(match.photos[0].photo_reference)}&maxwidth=400`
            : undefined,
          source: {
            type: 'reddit',
            subreddit: place.subreddit,
            quote: place.quote,
            upvotes: place.upvotes,
          },
          durationMinutes: estimateDuration(place.category),
        });

      } else {
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
    }
  }

  return verified;
}

/**
 * Fallback to Google-only results when Reddit/AI fails
 */
async function getGoogleOnlyResults(
  category: string | undefined,
  destination: string,
  lat?: number,
  lng?: number
): Promise<NextResponse> {
  try {
    const query = category
      ? `${category} in ${destination}`
      : `things to do in ${destination}`;

    const location = (lat && lng) ? { lat: Number(lat), lng: Number(lng) } : undefined;
    const results = await searchPlaces(query, location, 20000);

    // Fetch place details for each result to get real descriptions
    const placesWithDetails = await Promise.all(
      results.slice(0, 10).map(async (place) => {
        try {
          if (place.place_id) {
            const details = await getPlaceDetails(place.place_id);
            return { place, details };
          }
          return { place, details: null };
        } catch {
          return { place, details: null };
        }
      })
    );

    const recommendations = placesWithDetails.map(({ place, details }, index) => {
      // Get description from editorial_summary or first review
      let description = `Popular ${category || 'attraction'} in ${destination}`;
      if (details) {
        const detailsAny = details as any;
        if (detailsAny.editorial_summary?.overview) {
          description = detailsAny.editorial_summary.overview;
        } else if (detailsAny.reviews?.[0]?.text) {
          const reviewText = detailsAny.reviews[0].text;
          description = reviewText.length > 200 ? reviewText.slice(0, 200) + '...' : reviewText;
        }
      }

      return {
        id: `google-${Date.now()}-${index}`,
        name: place.name,
        description,
        category: category || 'landmarks',
        rating: place.rating,
        reviewCount: place.user_ratings_total,
        lat: place.geometry?.location?.lat,
        lng: place.geometry?.location?.lng,
        address: place.formatted_address,
        imageUrl: place.photos?.[0]?.photo_reference
          ? `/api/photo-proxy?ref=${encodeURIComponent(place.photos[0].photo_reference)}&maxwidth=400`
          : undefined,
        source: {
          type: 'google' as const,
        },
        durationMinutes: estimateDuration(category || 'landmarks'),
      };
    });

    return NextResponse.json({
      recommendations,
      sources: [],
      fallback: true,
    });
  } catch (error) {
    console.error('Google fallback failed:', error);
    return NextResponse.json({
      recommendations: [],
      sources: [],
      error: 'Failed to fetch recommendations',
    });
  }
}

/**
 * Estimate duration based on category
 */
function estimateDuration(category: string): number {
  const durations: Record<string, number> = {
    dining: 90,
    cafes: 60,
    beaches: 180,
    nature: 180,
    adventure: 180,
    cultural: 90,
    nightlife: 120,
    shopping: 90,
    wellness: 120,
    landmarks: 60,
    museums: 120,
  };
  return durations[category] || 60;
}
