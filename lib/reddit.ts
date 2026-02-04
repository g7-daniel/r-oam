import type { SentimentData, RedditPost, RedditComment } from '@/types';
import { fetchWithTimeout } from './api-cache';

// Use Reddit's public JSON API (no authentication required)
const REDDIT_BASE_URL = 'https://www.reddit.com';
const REDDIT_TIMEOUT = 10000; // 10 second timeout for Reddit API

// Reddit API rate limiting - minimum 1 second between requests to comply with terms
const REDDIT_RATE_LIMIT_MS = 200; // Reduced from 1000ms for faster searches
// User-Agent must be descriptive per Reddit API terms
const REDDIT_USER_AGENT = 'web:r-oam-travel-planner:v1.0 (https://roam.travel)';

// Type for Reddit API post child data
interface RedditPostData {
  data: {
    id: string;
    title: string;
    selftext?: string;
    subreddit: string;
    score: number;
    num_comments: number;
    created_utc: number;
    permalink: string;
  };
}

export function getSubredditsForBudget(budgetPerPerson: number): string[] {
  if (budgetPerPerson >= 5000) {
    return ['fattravel', 'luxurytravel', 'travel'];
  } else if (budgetPerPerson >= 2000) {
    return ['travel', 'solotravel', 'TravelHacks'];
  } else {
    return ['budgettravel', 'solotravel', 'shoestring', 'backpacking'];
  }
}

export async function searchReddit(
  query: string,
  subreddits: string[],
  limit = 25
): Promise<RedditPost[]> {
  try {
    const allPosts: RedditPost[] = [];

    for (const subreddit of subreddits.slice(0, 3)) {
      try {
        const response = await fetchWithTimeout(
          `${REDDIT_BASE_URL}/r/${subreddit}/search.json?q=${encodeURIComponent(
            query
          )}&sort=relevance&limit=${limit}&restrict_sr=true`,
          {
            headers: {
              'User-Agent': REDDIT_USER_AGENT,
            },
          },
          REDDIT_TIMEOUT
        );

        if (response.ok) {
          const data = await response.json();
          const children = data.data?.children as RedditPostData[] | undefined;
          const posts: RedditPost[] = children?.map((child) => ({
            id: child.data.id,
            title: child.data.title,
            selftext: child.data.selftext || '',
            subreddit: child.data.subreddit,
            score: child.data.score,
            numComments: child.data.num_comments,
            createdUtc: child.data.created_utc,
            permalink: child.data.permalink,
          })) || [];
          allPosts.push(...posts);
        }
      } catch (err) {
        console.warn(`Failed to fetch from r/${subreddit}:`, err);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, REDDIT_RATE_LIMIT_MS));
    }

    return allPosts.sort((a, b) => b.score - a.score);
  } catch (error) {
    console.error('Reddit search error:', error);
    return [];
  }
}

export async function getPostComments(
  subreddit: string,
  postId: string,
  limit = 10
): Promise<RedditComment[]> {
  try {
    const response = await fetchWithTimeout(
      `${REDDIT_BASE_URL}/r/${subreddit}/comments/${postId}.json?limit=${limit}&depth=1`,
      {
        headers: {
          'User-Agent': REDDIT_USER_AGENT,
        },
      },
      REDDIT_TIMEOUT
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    const comments: RedditComment[] = [];

    if (data[1]?.data?.children) {
      for (const child of data[1].data.children) {
        if (child.kind === 't1' && child.data.body) {
          comments.push({
            text: child.data.body.slice(0, 500),
            subreddit,
            score: child.data.score,
            date: new Date(child.data.created_utc * 1000).toISOString(),
          });
        }
      }
    }

    return comments.sort((a, b) => b.score - a.score);
  } catch (error) {
    console.error('Reddit comments error:', error);
    return [];
  }
}

// Negation words that flip sentiment
const NEGATION_WORDS = [
  'not', "n't", 'never', 'no', 'neither', 'nobody', 'nothing',
  'nowhere', 'hardly', 'barely', 'scarcely', "don't", "doesn't",
  "didn't", "won't", "wouldn't", "couldn't", "shouldn't", "wasn't", "weren't"
];

/**
 * Check if a word is preceded by a negation within a certain window
 */
function isNegated(text: string, wordIndex: number, windowSize: number = 4): boolean {
  // Get the text before the word (up to windowSize words back)
  const textBefore = text.substring(Math.max(0, wordIndex - 50), wordIndex).toLowerCase();
  const wordsBefore = textBefore.split(/\s+/).slice(-windowSize);

  return wordsBefore.some(word =>
    NEGATION_WORDS.some(neg => word.includes(neg))
  );
}

/**
 * Find word with word boundary matching to avoid partial matches
 */
function findWordWithBoundary(text: string, word: string): number {
  const regex = new RegExp(`\\b${word}\\b`, 'gi');
  const match = regex.exec(text);
  return match ? match.index : -1;
}

export function analyzeSentiment(text: string): number {
  const positiveWords = [
    'amazing', 'beautiful', 'excellent', 'fantastic', 'great', 'incredible',
    'love', 'loved', 'perfect', 'recommend', 'stunning', 'wonderful', 'awesome',
    'best', 'friendly', 'clean', 'comfortable', 'delicious', 'helpful',
    'memorable', 'relaxing', 'scenic', 'worth', 'must-see', 'must-do',
  ];

  const negativeWords = [
    'awful', 'bad', 'disappointing', 'dirty', 'expensive', 'horrible',
    'overpriced', 'overcrowded', 'poor', 'rude', 'scam', 'terrible',
    'tourist trap', 'waste', 'worst', 'avoid', 'crowded', 'noisy',
    'smelly', 'unsafe', 'overrated', 'mediocre', 'skip',
  ];

  const lowerText = text.toLowerCase();
  let score = 0;
  let matches = 0;

  // Check positive words with negation detection
  for (const word of positiveWords) {
    const index = findWordWithBoundary(lowerText, word);
    if (index !== -1) {
      matches++;
      // If negated, treat as negative; otherwise positive
      if (isNegated(lowerText, index)) {
        score -= 1; // "not amazing" = negative
      } else {
        score += 1;
      }
    }
  }

  // Check negative words with negation detection
  for (const word of negativeWords) {
    const index = findWordWithBoundary(lowerText, word);
    if (index !== -1) {
      matches++;
      // If negated, treat as positive; otherwise negative
      if (isNegated(lowerText, index)) {
        score += 0.5; // "not bad" = slightly positive (double negatives are weaker)
      } else {
        score -= 1;
      }
    }
  }

  if (matches === 0) return 0;
  return Math.max(-1, Math.min(1, score / matches));
}

export async function getDestinationSentiment(
  destination: string,
  budgetPerPerson: number
): Promise<SentimentData> {
  const subreddits = getSubredditsForBudget(budgetPerPerson);
  const posts = await searchReddit(destination, subreddits, 30);

  if (posts.length === 0) {
    return {
      score: 0,
      label: 'neutral',
      mentionCount: 0,
      topComments: [],
      subreddits,
    };
  }

  const allText = posts.map((p) => `${p.title} ${p.selftext}`).join(' ');
  const sentimentScore = analyzeSentiment(allText);

  const topPosts = posts.slice(0, 5);
  const topComments: RedditComment[] = [];

  for (const post of topPosts.slice(0, 2)) {
    const comments = await getPostComments(post.subreddit, post.id, 3);
    topComments.push(...comments);
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, REDDIT_RATE_LIMIT_MS));
  }

  topComments.sort((a, b) => b.score - a.score);

  return {
    score: sentimentScore,
    label: sentimentScore > 0.2 ? 'positive' : sentimentScore < -0.2 ? 'negative' : 'neutral',
    mentionCount: posts.length,
    topComments: topComments.slice(0, 5),
    subreddits: Array.from(new Set(posts.map((p) => p.subreddit))),
  };
}

export async function getAirlineSentiment(
  airlineName: string
): Promise<SentimentData> {
  const subreddits = ['travel', 'flights', 'aviation'];
  const posts = await searchReddit(airlineName, subreddits, 20);

  if (posts.length === 0) {
    return {
      score: 0,
      label: 'neutral',
      mentionCount: 0,
      topComments: [],
      subreddits,
    };
  }

  const allText = posts.map((p) => `${p.title} ${p.selftext}`).join(' ');
  const sentimentScore = analyzeSentiment(allText);

  const topComments: RedditComment[] = posts.slice(0, 3).map((post) => ({
    text: post.title,
    subreddit: post.subreddit,
    score: post.score,
    date: new Date(post.createdUtc * 1000).toISOString(),
  }));

  return {
    score: sentimentScore,
    label: sentimentScore > 0.2 ? 'positive' : sentimentScore < -0.2 ? 'negative' : 'neutral',
    mentionCount: posts.length,
    topComments,
    subreddits: Array.from(new Set(posts.map((p) => p.subreddit))),
  };
}

export async function getHotelSentiment(
  hotelName: string,
  city: string
): Promise<SentimentData> {
  const query = `${hotelName} ${city}`;
  const subreddits = ['travel', 'hotels', 'solotravel'];
  const posts = await searchReddit(query, subreddits, 15);

  if (posts.length === 0) {
    return {
      score: 0,
      label: 'neutral',
      mentionCount: 0,
      topComments: [],
      subreddits,
    };
  }

  const allText = posts.map((p) => `${p.title} ${p.selftext}`).join(' ');
  const sentimentScore = analyzeSentiment(allText);

  const topComments: RedditComment[] = posts.slice(0, 3).map((post) => ({
    text: post.selftext.slice(0, 200) || post.title,
    subreddit: post.subreddit,
    score: post.score,
    date: new Date(post.createdUtc * 1000).toISOString(),
  }));

  return {
    score: sentimentScore,
    label: sentimentScore > 0.2 ? 'positive' : sentimentScore < -0.2 ? 'negative' : 'neutral',
    mentionCount: posts.length,
    topComments,
    subreddits: Array.from(new Set(posts.map((p) => p.subreddit))),
  };
}

// Hotel recommendation types
export interface HotelRecommendation {
  hotelName: string;
  mentionCount: number;
  sentimentScore: number;
  quotes: string[];
  subreddits: string[];
  upvotes?: number;
}

// Minimum upvote threshold for quality filtering (lowered for better coverage)
const MIN_UPVOTES = 5;

// Generic hotel terms that aren't specific properties
const GENERIC_HOTEL_TERMS = [
  'party hostel', 'party hostels', 'on hostel', 'a hostel', 'the hostel',
  'this hotel', 'that hotel', 'any hotel', 'some hotel', 'our hotel',
  'all-inclusive resort', 'all inclusive resort', 'beach resort', 'city hotel',
  'budget hotel', 'cheap hotel', 'nice hotel', 'good hotel', 'great hotel',
  'local hotel', 'small hotel', 'big hotel', 'new hotel', 'old hotel',
  'regular hotel', 'regular hotels', 'other hotel', 'same hotel', 'another hotel',
  'different hostel', 'a different hostel', 'cheapest hotel', 'five-star hotel',
  'five star hotel', 'four-star hotel', 'four star hotel', 'luxury hotel',
  'destination hostel', 'nearby hotel', 'closest hotel', 'closest hostel',
  'flights and hotel', 'flight and hotel', 'airbnb or hostel', 'hotel or hostel',
  'hostel or hotel',
];

/**
 * Validate that a string looks like a real hotel name (not a sentence or generic term)
 */
function isValidHotelName(name: string): boolean {
  const trimmed = name.trim();
  const words = trimmed.split(/\s+/);

  // Too many words = likely a sentence
  if (words.length > 6) return false;

  // Too few characters = likely not a hotel
  if (trimmed.length < 4) return false;

  // Starts with common sentence starters or articles = not a hotel name
  if (/^(You|I|We|They|The|This|That|It|My|Our|Your|If|When|Where|How|Why|What|Staying|Stay|An|All|A)\s/i.test(trimmed)) {
    return false;
  }

  // Contains common sentence phrases = not a hotel
  if (/\b(have to|need to|should|from|going to|want to|will be|would be)\b/i.test(trimmed)) {
    return false;
  }

  // Reject generic hotel terms
  const lowerName = trimmed.toLowerCase();
  if (GENERIC_HOTEL_TERMS.some(term => lowerName === term || lowerName.startsWith(term + ' '))) {
    return false;
  }

  // Only letters at start = might be valid
  if (!/^[A-Z]/i.test(trimmed)) return false;

  return true;
}

/**
 * Normalize hotel name for deduplication
 */
function normalizeHotelName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Search Reddit for hotel recommendations in a destination
 */
export async function searchHotelRecommendations(
  destination: string,
  budgetPerPerson: number
): Promise<HotelRecommendation[]> {
  const subreddits = getSubredditsForBudget(budgetPerPerson);

  // Search for hotel-related posts
  const searchQueries = [
    `${destination} hotel recommendation`,
    `${destination} where to stay`,
    `${destination} best hotel`,
  ];

  const allPosts: RedditPost[] = [];

  for (const query of searchQueries) {
    const posts = await searchReddit(query, subreddits, 15);
    allPosts.push(...posts);
    await new Promise(resolve => setTimeout(resolve, REDDIT_RATE_LIMIT_MS));
  }

  // Extract hotel names from posts
  const hotelMentions = new Map<string, {
    count: number;
    quotes: string[];
    subreddits: Set<string>;
    totalScore: number;
    totalUpvotes: number;
  }>();

  // Hotel patterns - focused on explicit hotel mentions only
  // REMOVED: overly permissive pattern that matched sentences
  const hotelPatterns = [
    // "stayed at [Hotel Name]" - must end with hotel-related suffix
    /(?:stay(?:ed|ing)? at|recommend(?:ed)?|book(?:ed)?|love(?:d)?|tried|staying at)\s+(?:the\s+)?([A-Z][A-Za-z\s&'-]{2,35}(?:Hotel|Resort|Inn|Suites|Lodge|Hostel|B&B|Villas?))/gi,
    // Known brand names - must be followed by a hotel-related word or end of name
    /\b((?:JW\s+)?Marriott(?:\s+\w+){0,3}|Hilton(?:\s+\w+){0,3}|Hyatt(?:\s+\w+){0,3}|Four Seasons(?:\s+\w+){0,3}|Ritz[- ]?Carlton(?:\s+\w+){0,3}|Westin(?:\s+\w+){0,3}|Sheraton(?:\s+\w+){0,3}|Holiday Inn(?:\s+\w+){0,3}|Best Western(?:\s+\w+){0,3}|Radisson(?:\s+\w+){0,3}|Courtyard(?:\s+\w+){0,3}|Hampton(?:\s+\w+){0,3}|St\.?\s*Regis(?:\s+\w+){0,3}|W\s+Hotel(?:\s+\w+){0,3}|Eden\s+Roc(?:\s+\w+){0,3}|Mandarin\s+Oriental(?:\s+\w+){0,3}|Peninsula(?:\s+\w+){0,3}|Amanera|Amanyara|Aman\s+\w+|Rosewood(?:\s+\w+){0,3}|Waldorf(?:\s+\w+){0,3}|Conrad(?:\s+\w+){0,3}|InterContinental(?:\s+\w+){0,3}|Sofitel(?:\s+\w+){0,3}|Fairmont(?:\s+\w+){0,3}|Shangri[- ]?La(?:\s+\w+){0,3}|Raffles(?:\s+\w+){0,3}|Belmond(?:\s+\w+){0,3}|Park Hyatt(?:\s+\w+){0,3}|Grand Hyatt(?:\s+\w+){0,3}|Andaz(?:\s+\w+){0,3}|Casa de Campo|Sanctuary Cap Cana|Excellence(?:\s+\w+){0,2}|Secrets(?:\s+\w+){0,2}|Dreams(?:\s+\w+){0,2}|Breathless(?:\s+\w+){0,2}|Zoetry(?:\s+\w+){0,2}|Barcelo(?:\s+\w+){0,2}|Iberostar(?:\s+\w+){0,3}|RIU(?:\s+\w+){0,2}|Hard Rock(?:\s+\w+){0,3}|Paradisus(?:\s+\w+){0,2})(?=\s|$|[,.])/gi,
  ];

  // Build destination keywords for relevance check
  // Require the main destination name to appear, not just partial words
  const destLower = destination.toLowerCase();
  // For multi-word destinations like "Dominican Republic", require the main identifying word
  const destParts = destLower.split(/\s+/).filter(w => w.length > 4);
  // Also extract potential key identifiers (first word of multi-word, or single word)
  const primaryKeyword = destParts.length > 0 ? destParts[0] : destLower.split(/\s+/)[0];

  for (const post of allPosts) {
    const fullText = `${post.title} ${post.selftext}`;
    const lowerText = fullText.toLowerCase();

    // Check if post is relevant to the destination
    // Must contain either the full destination name OR the primary keyword
    const isRelevant = lowerText.includes(destLower) ||
      (primaryKeyword.length > 4 && lowerText.includes(primaryKeyword));
    if (!isRelevant) {
      // Skip posts that don't mention the destination at all
      continue;
    }

    for (const pattern of hotelPatterns) {
      pattern.lastIndex = 0; // Reset regex
      let match;
      while ((match = pattern.exec(fullText)) !== null) {
        const hotelName = match[1].trim();

        // Validate hotel name - skip sentences and invalid names
        if (!isValidHotelName(hotelName)) continue;
        if (hotelName.length < 4 || hotelName.length > 50) continue;

        // Normalize key for deduplication
        const key = normalizeHotelName(hotelName);

        const existing = hotelMentions.get(key) || {
          count: 0,
          quotes: [],
          subreddits: new Set(),
          totalScore: 0,
          totalUpvotes: 0,
        };

        existing.count++;
        existing.subreddits.add(post.subreddit);
        existing.totalScore += analyzeSentiment(fullText);
        existing.totalUpvotes += post.score;

        // Strict relevance check: hotel must be associated with the destination
        const lowerHotelName = hotelName.toLowerCase();
        const selftextLower = post.selftext.toLowerCase();

        // Option 1: Hotel name contains the destination (e.g., "Hilton Tokyo", "Paris Marriott")
        const hotelContainsDest = lowerHotelName.includes(destLower) ||
          (primaryKeyword.length > 4 && lowerHotelName.includes(primaryKeyword));

        if (hotelContainsDest) {
          // Hotel name includes destination - definitely relevant
        } else {
          // Option 2: Check if hotel and destination are in the same paragraph/section
          // Split by double newlines (paragraphs) or single newlines (list items)
          const paragraphs = post.selftext.split(/\n\n+|\n(?=[-*•]|\d+\.)/);
          const hotelInSameParagraph = paragraphs.some(para => {
            const lowerPara = para.toLowerCase();
            const hasHotel = lowerPara.includes(lowerHotelName) ||
              para.includes(hotelName); // Case-sensitive for brand names
            const hasDest = lowerPara.includes(destLower) ||
              (primaryKeyword.length > 4 && lowerPara.includes(primaryKeyword));
            return hasHotel && hasDest;
          });

          // Option 3: Fallback - check close proximity (within 200 chars)
          if (!hotelInSameParagraph) {
            const hotelIndex = selftextLower.indexOf(lowerHotelName);
            const destIndex = selftextLower.indexOf(destLower);
            const primaryIndex = primaryKeyword.length > 4 ? selftextLower.indexOf(primaryKeyword) : -1;
            const nearestDest = destIndex >= 0 ? destIndex : primaryIndex;

            if (hotelIndex < 0 || nearestDest < 0) {
              continue; // Hotel or destination not in body
            }

            const distance = Math.abs(hotelIndex - nearestDest);
            if (distance > 200) {
              continue; // Too far apart
            }
          }
        }

        // Extract quote around the mention
        const mentionIndex = fullText.indexOf(hotelName);
        if (mentionIndex >= 0) {
          const start = Math.max(0, mentionIndex - 50);
          const end = Math.min(fullText.length, mentionIndex + hotelName.length + 100);
          const quote = fullText.slice(start, end).trim();
          if (quote.length > 20 && existing.quotes.length < 3) {
            existing.quotes.push(quote);
          }
        }

        hotelMentions.set(key, existing);
      }
    }
  }

  // Convert to array and sort by mention count, upvotes, and sentiment
  const recommendations: HotelRecommendation[] = Array.from(hotelMentions.entries())
    .map(([name, data]) => ({
      hotelName: name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      mentionCount: data.count,
      sentimentScore: data.count > 0 ? data.totalScore / data.count : 0,
      quotes: data.quotes,
      subreddits: Array.from(data.subreddits),
      upvotes: data.totalUpvotes,
    }))
    .filter(rec => {
      // Must have positive sentiment
      if (rec.mentionCount < 1 || rec.sentimentScore <= 0) return false;

      // Must meet minimum upvote threshold
      if ((rec.upvotes || 0) < MIN_UPVOTES) return false;

      // Hotel name must be at least 2 words (proper names) unless it's a known brand
      const words = rec.hotelName.trim().split(/\s+/);
      if (words.length < 2) {
        // Single word is only OK if it's a recognized brand prefix
        const knownBrands = ['marriott', 'hilton', 'hyatt', 'sheraton', 'westin', 'amanera', 'amanyara'];
        if (!knownBrands.some(brand => rec.hotelName.toLowerCase().includes(brand))) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      // Sort by combination of mentions, upvotes, and sentiment
      const scoreA = (a.mentionCount * 10) + ((a.upvotes || 0) * 0.1) + (a.sentimentScore * 20);
      const scoreB = (b.mentionCount * 10) + ((b.upvotes || 0) * 0.1) + (b.sentimentScore * 20);
      return scoreB - scoreA;
    })
    .slice(0, 10);

  console.log(`Reddit hotels: Found ${recommendations.length} quality recommendations (filtered by ${MIN_UPVOTES}+ upvotes)`);

  return recommendations;
}

/**
 * Check if a hotel is mentioned positively on Reddit
 */
export async function checkHotelRedditStatus(
  hotelName: string,
  destination: string,
  budgetPerPerson: number
): Promise<{
  isRecommended: boolean;
  mentionCount: number;
  sentimentScore: number;
  topQuote?: string;
}> {
  const sentiment = await getHotelSentiment(hotelName, destination);

  return {
    isRecommended: sentiment.mentionCount > 0 && sentiment.score > 0.2,
    mentionCount: sentiment.mentionCount,
    sentimentScore: sentiment.score,
    topQuote: sentiment.topComments[0]?.text,
  };
}

// ============================================
// Quick Plan Extensions - Area Discovery
// ============================================

export interface AreaRecommendation {
  areaName: string;
  mentionCount: number;
  sentimentScore: number;
  quotes: string[];
  subreddits: string[];
  upvotes: number;
  characteristics: string[];
  bestFor: string[];
}

// Common area characteristics keywords
const AREA_CHARACTERISTICS: Record<string, string[]> = {
  beach: ['beach', 'beaches', 'sandy', 'shore', 'waterfront', 'coastal'],
  surf: ['surf', 'surfing', 'waves', 'surf break', 'surf spot'],
  nightlife: ['nightlife', 'bars', 'clubs', 'party', 'lively', 'buzzing'],
  calm_water: ['calm water', 'calm', 'peaceful', 'quiet', 'snorkeling', 'swimming'],
  luxury: ['luxury', 'upscale', 'five star', '5 star', 'high-end', 'exclusive'],
  budget: ['budget', 'cheap', 'affordable', 'backpacker', 'hostel'],
  family: ['family', 'kids', 'children', 'family-friendly', 'kid-friendly'],
  adventure: ['adventure', 'hiking', 'zip line', 'rafting', 'canyoning', 'excursion'],
  culture: ['culture', 'historic', 'history', 'museum', 'colonial', 'old town'],
  food: ['food', 'restaurants', 'dining', 'cuisine', 'foodie', 'culinary'],
  remote: ['remote', 'secluded', 'off the beaten path', 'quiet', 'isolated'],
  touristy: ['touristy', 'crowded', 'tourist trap', 'busy', 'packed'],
  nature: ['nature', 'wildlife', 'national park', 'jungle', 'forest', 'mountains'],
  resort: ['resort', 'all-inclusive', 'all inclusive', 'resort area'],
  diving: ['diving', 'scuba', 'dive', 'reef', 'underwater'],
};

// Area extraction patterns - more strict to avoid matching sentences
const AREA_PATTERNS = [
  // "stayed in [Area Name]" - limit to 2-3 words max
  /(?:stay(?:ed|ing)? (?:in|at)|visit(?:ed|ing)?|recommend|based in|explored)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?(?:\s+(?:Beach|Bay|Coast|Peninsula|Island))?)\b/g,
  // Known DR/Caribbean area names (explicit list for better matching)
  /\b(Punta\s+Cana|Puerto\s+Plata|Saman[aá]|Santo\s+Domingo|La\s+Romana|Cabarete|Sosua|Boca\s+Chica|Bayahibe|Las\s+Terrenas|Cap\s+Cana|Uvero\s+Alto|Bavaro|Juan\s+Dolio|Casa\s+de\s+Campo|Santiago|Jarabacoa|Constanza|Pedernales|Barahona)\b/gi,
  // Known Costa Rica areas
  /\b(Manuel\s+Antonio|Arenal|Tamarindo|Monteverde|La\s+Fortuna|Puerto\s+Viejo|Santa\s+Teresa|Nosara|Jaco|Guanacaste|Papagayo|Tortuguero|Drake\s+Bay|Corcovado|Osa\s+Peninsula)\b/gi,
  // Known Mexico areas
  /\b(Cancun|Playa\s+del\s+Carmen|Tulum|Puerto\s+Vallarta|Cabo\s+San\s+Lucas|Riviera\s+Maya|Cozumel|Isla\s+Mujeres|Holbox|Sayulita|San\s+Miguel\s+de\s+Allende|Oaxaca|Mexico\s+City|Merida|Bacalar)\b/gi,
];

// Generic terms that aren't specific areas
const GENERIC_AREA_TERMS = [
  'the area', 'this area', 'that area', 'any area', 'some area',
  'the beach', 'this beach', 'a beach', 'the coast', 'the town',
  'the city', 'the village', 'downtown', 'uptown', 'the resort',
  'would it', 'to get', 'this island', 'that island', 'an island',
  'worth it', 'worth a', 'be worth', 'night on', 'day trip',
];

function isValidAreaName(name: string): boolean {
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();

  // Check against generic terms
  if (GENERIC_AREA_TERMS.some(term => lower.includes(term))) return false;

  // Too short or too long (max 25 chars for area names)
  if (trimmed.length < 4 || trimmed.length > 25) return false;

  // Starts with lowercase or number
  if (!/^[A-Z]/.test(trimmed)) return false;

  // Too many words (area names are usually 1-3 words)
  const words = trimmed.split(/\s+/);
  if (words.length > 4) return false;

  // Contains sentence structures or common words that indicate a sentence
  if (/\b(have|need|should|from|going|want|will|would|could|might|it|is|was|be|been|being|a|an|the|this|that|on|in|at|to|for|with|and|or|but|if|when|then|than|I|we|you|they|he|she|my|our|your|their)\b/i.test(trimmed)) {
    return false;
  }

  // Must have at least one word that looks like a proper noun (capitalized)
  if (!words.some(w => /^[A-Z][a-z]+$/.test(w))) return false;

  return true;
}

function extractCharacteristics(text: string): string[] {
  const found: string[] = [];
  const lowerText = text.toLowerCase();

  for (const [characteristic, keywords] of Object.entries(AREA_CHARACTERISTICS)) {
    if (keywords.some(kw => lowerText.includes(kw))) {
      found.push(characteristic);
    }
  }

  return found;
}

/**
 * Search Reddit for area/region recommendations in a destination
 */
export async function searchAreaRecommendations(
  destination: string,
  activities: string[] = [],
  customSubreddits?: string[]
): Promise<AreaRecommendation[]> {
  const subreddits = customSubreddits && customSubreddits.length > 0
    ? customSubreddits
    : ['travel', 'solotravel', 'TravelHacks', 'backpacking'];

  // Search queries for areas - limited to 3 for speed
  const searchQueries = [
    `${destination} best areas where to stay`,
    `${destination} itinerary must visit`,
  ];

  // Add ONE activity-specific search if activities provided
  if (activities.length > 0) {
    searchQueries.push(`${destination} ${activities[0]}`);
  }

  const allPosts: RedditPost[] = [];

  for (const query of searchQueries) {
    const posts = await searchReddit(query, subreddits, 15);
    allPosts.push(...posts);
    await new Promise(resolve => setTimeout(resolve, REDDIT_RATE_LIMIT_MS));
  }

  // Extract area mentions
  const areaMentions = new Map<string, {
    count: number;
    quotes: string[];
    subreddits: Set<string>;
    totalScore: number;
    totalUpvotes: number;
    characteristics: Set<string>;
  }>();

  const destLower = destination.toLowerCase();

  for (const post of allPosts) {
    const fullText = `${post.title} ${post.selftext}`;
    const lowerText = fullText.toLowerCase();

    // Check relevance
    if (!lowerText.includes(destLower)) continue;

    for (const pattern of AREA_PATTERNS) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(fullText)) !== null) {
        const areaName = match[1].trim();

        if (!isValidAreaName(areaName)) continue;
        if (areaName.toLowerCase() === destLower) continue; // Skip destination itself

        const key = areaName.toLowerCase();
        const existing = areaMentions.get(key) || {
          count: 0,
          quotes: [],
          subreddits: new Set(),
          totalScore: 0,
          totalUpvotes: 0,
          characteristics: new Set(),
        };

        existing.count++;
        existing.subreddits.add(post.subreddit);
        existing.totalScore += analyzeSentiment(fullText);
        existing.totalUpvotes += post.score;

        // Extract characteristics
        const chars = extractCharacteristics(fullText);
        chars.forEach(c => existing.characteristics.add(c));

        // Extract quote
        const mentionIndex = fullText.indexOf(areaName);
        if (mentionIndex >= 0 && existing.quotes.length < 3) {
          const start = Math.max(0, mentionIndex - 30);
          const end = Math.min(fullText.length, mentionIndex + areaName.length + 100);
          const quote = fullText.slice(start, end).trim();
          if (quote.length > 20) {
            existing.quotes.push(quote);
          }
        }

        areaMentions.set(key, existing);
      }
    }
  }

  // Convert and sort
  const recommendations: AreaRecommendation[] = Array.from(areaMentions.entries())
    .map(([name, data]) => ({
      areaName: name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      mentionCount: data.count,
      sentimentScore: data.count > 0 ? data.totalScore / data.count : 0,
      quotes: data.quotes,
      subreddits: Array.from(data.subreddits),
      upvotes: data.totalUpvotes,
      characteristics: Array.from(data.characteristics),
      bestFor: Array.from(data.characteristics).slice(0, 3),
    }))
    .filter(rec => rec.mentionCount >= 1 && rec.sentimentScore >= 0)
    .sort((a, b) => {
      const scoreA = (a.mentionCount * 15) + (a.upvotes * 0.1) + (a.sentimentScore * 10);
      const scoreB = (b.mentionCount * 15) + (b.upvotes * 0.1) + (b.sentimentScore * 10);
      return scoreB - scoreA;
    })
    .slice(0, 15);

  console.log(`Reddit areas: Found ${recommendations.length} area recommendations for ${destination}`);
  return recommendations;
}

// ============================================
// Quick Plan Extensions - Restaurant Discovery
// ============================================

export interface RestaurantRecommendation {
  restaurantName: string;
  mentionCount: number;
  sentimentScore: number;
  quotes: string[];
  subreddits: string[];
  upvotes: number;
  cuisine: string[];
  priceLevel?: number; // 1-4
}

// Restaurant patterns
const RESTAURANT_PATTERNS = [
  // "ate at [Restaurant Name]"
  /(?:ate at|dined at|loved|recommend|try|tried|must visit|must try|favorite)\s+(?:the\s+)?([A-Z][A-Za-z\s&'-]{2,40}(?:\s+(?:restaurant|cafe|bistro|bar|grill|kitchen|eatery))?)/gi,
  // "[Restaurant Name] has great..."
  /([A-Z][A-Za-z\s&'-]{2,40})\s+(?:has|had|serves|is known for|makes)\s+(?:great|amazing|best|delicious|incredible)/gi,
];

const CUISINE_KEYWORDS: Record<string, string[]> = {
  seafood: ['seafood', 'fish', 'lobster', 'shrimp', 'ceviche', 'ocean'],
  local: ['local', 'traditional', 'authentic', 'native', 'regional'],
  italian: ['italian', 'pasta', 'pizza', 'risotto'],
  mexican: ['mexican', 'tacos', 'burritos', 'enchiladas'],
  asian: ['asian', 'sushi', 'thai', 'chinese', 'vietnamese', 'japanese'],
  american: ['american', 'burger', 'bbq', 'barbecue', 'steakhouse'],
  fine_dining: ['fine dining', 'upscale', 'elegant', 'tasting menu', 'michelin'],
  casual: ['casual', 'chill', 'laid back', 'relaxed'],
  brunch: ['brunch', 'breakfast', 'eggs', 'pancakes'],
};

function extractCuisine(text: string): string[] {
  const found: string[] = [];
  const lowerText = text.toLowerCase();

  for (const [cuisine, keywords] of Object.entries(CUISINE_KEYWORDS)) {
    if (keywords.some(kw => lowerText.includes(kw))) {
      found.push(cuisine);
    }
  }

  return found;
}

function isValidRestaurantName(name: string): boolean {
  const trimmed = name.trim();

  if (trimmed.length < 4 || trimmed.length > 50) return false;
  if (!/^[A-Z]/.test(trimmed)) return false;
  if (/\b(I|we|you|they|have|need|want|will|would|should)\b/i.test(trimmed)) return false;

  // Generic terms
  const lower = trimmed.toLowerCase();
  if (['the restaurant', 'this restaurant', 'that restaurant', 'a restaurant', 'the place'].includes(lower)) {
    return false;
  }

  return true;
}

/**
 * Search Reddit for restaurant recommendations in a destination
 */
export async function searchRestaurantRecommendations(
  destination: string,
  area?: string
): Promise<RestaurantRecommendation[]> {
  const subreddits = ['travel', 'solotravel', 'foodtravel', 'AskCulinary'];

  const location = area ? `${area} ${destination}` : destination;
  const searchQueries = [
    `${location} best restaurants`,
    `${location} where to eat`,
    `${location} food recommendations`,
    `${location} must try food`,
  ];

  const allPosts: RedditPost[] = [];

  for (const query of searchQueries) {
    const posts = await searchReddit(query, subreddits, 15);
    allPosts.push(...posts);
    await new Promise(resolve => setTimeout(resolve, REDDIT_RATE_LIMIT_MS));
  }

  const restaurantMentions = new Map<string, {
    count: number;
    quotes: string[];
    subreddits: Set<string>;
    totalScore: number;
    totalUpvotes: number;
    cuisine: Set<string>;
  }>();

  const destLower = destination.toLowerCase();

  for (const post of allPosts) {
    const fullText = `${post.title} ${post.selftext}`;
    const lowerText = fullText.toLowerCase();

    if (!lowerText.includes(destLower) && (!area || !lowerText.includes(area.toLowerCase()))) {
      continue;
    }

    for (const pattern of RESTAURANT_PATTERNS) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(fullText)) !== null) {
        const restaurantName = match[1].trim();

        if (!isValidRestaurantName(restaurantName)) continue;

        const key = restaurantName.toLowerCase();
        const existing = restaurantMentions.get(key) || {
          count: 0,
          quotes: [],
          subreddits: new Set(),
          totalScore: 0,
          totalUpvotes: 0,
          cuisine: new Set(),
        };

        existing.count++;
        existing.subreddits.add(post.subreddit);
        existing.totalScore += analyzeSentiment(fullText);
        existing.totalUpvotes += post.score;

        // Extract cuisine type
        const cuisines = extractCuisine(fullText);
        cuisines.forEach(c => existing.cuisine.add(c));

        // Extract quote
        const mentionIndex = fullText.indexOf(restaurantName);
        if (mentionIndex >= 0 && existing.quotes.length < 2) {
          const start = Math.max(0, mentionIndex - 30);
          const end = Math.min(fullText.length, mentionIndex + restaurantName.length + 80);
          const quote = fullText.slice(start, end).trim();
          if (quote.length > 20) {
            existing.quotes.push(quote);
          }
        }

        restaurantMentions.set(key, existing);
      }
    }
  }

  const recommendations: RestaurantRecommendation[] = Array.from(restaurantMentions.entries())
    .map(([name, data]) => ({
      restaurantName: name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      mentionCount: data.count,
      sentimentScore: data.count > 0 ? data.totalScore / data.count : 0,
      quotes: data.quotes,
      subreddits: Array.from(data.subreddits),
      upvotes: data.totalUpvotes,
      cuisine: Array.from(data.cuisine),
    }))
    .filter(rec => rec.mentionCount >= 1 && rec.sentimentScore >= 0)
    .sort((a, b) => {
      const scoreA = (a.mentionCount * 10) + (a.upvotes * 0.1) + (a.sentimentScore * 15);
      const scoreB = (b.mentionCount * 10) + (b.upvotes * 0.1) + (b.sentimentScore * 15);
      return scoreB - scoreA;
    })
    .slice(0, 10);

  console.log(`Reddit restaurants: Found ${recommendations.length} recommendations for ${location}`);
  return recommendations;
}
