/**
 * Activity Verification Pipeline
 *
 * Ensures activities can ONLY appear in the itinerary if they have:
 * 1. Google Places place_id, OR
 * 2. Verified operator URL, OR
 * 3. 2+ Reddit sources with at least 10 upvotes each
 */

import { searchReddit, getPostComments, analyzeSentiment } from '@/lib/reddit';
import type { RedditPost } from '@/types';
import { searchPlaces } from '@/lib/google-maps';
import type {
  VerifiedActivity,
  ActivityVerification,
  ActivityType,
  RedditEvidence,
  isActivityVerified,
} from '@/types/quick-plan';

// ============================================================================
// TYPES
// ============================================================================

interface ActivityCandidate {
  name: string;
  rawName: string;
  type: ActivityType;
  location: string;
  operator?: string;
  operatorUrl?: string;
  redditSources: RedditSource[];
  mentionCount: number;
  totalUpvotes: number;
  duration?: string;
  priceEstimate?: number;
}

interface RedditSource {
  postUrl: string;
  postId: string;
  commentId?: string;
  subreddit: string;
  postTitle: string;
  upvotes: number;
  quote: string;
  fetchedAt: Date;
}

interface ExtractionResult {
  candidates: ActivityCandidate[];
  postsAnalyzed: number;
  subredditsSearched: string[];
  errors: string[];
}

// ============================================================================
// ACTIVITY EXTRACTION PATTERNS
// ============================================================================

const ACTIVITY_PATTERNS: { pattern: RegExp; type: ActivityType }[] = [
  // Surfing
  { pattern: /(?:surf(?:ing)?|surf lesson|learn to surf|surf school|surf camp|surf spot|surf break)\s+(?:at|in|on|near)?\s*([A-Z][A-Za-z\s'-]{2,40}(?:\s+Beach)?)/gi, type: 'surf' },
  { pattern: /([A-Z][A-Za-z\s'-]{2,40}(?:\s+Beach)?)\s+(?:is|has|offers)\s+(?:great|amazing|perfect|best)\s+(?:surf|waves)/gi, type: 'surf' },

  // Snorkeling / Diving
  { pattern: /(?:snorkel(?:ing)?|dive|diving|scuba)\s+(?:at|in|near)?\s*([A-Z][A-Za-z\s'-]{2,40})/gi, type: 'snorkel' },
  { pattern: /([A-Z][A-Za-z\s'-]{2,40})\s+(?:is|has)\s+(?:great|amazing|clear|beautiful)\s+(?:snorkeling|diving|reef)/gi, type: 'snorkel' },

  // Wildlife
  { pattern: /(?:whale watching|see whales|humpback|whale tour)\s+(?:at|in|from|near)?\s*([A-Z][A-Za-z\s'-]{2,40})/gi, type: 'wildlife' },
  { pattern: /([A-Z][A-Za-z\s'-]{2,40})\s+(?:for|has)\s+(?:whale watching|whales|dolphins|sea turtles)/gi, type: 'wildlife' },

  // Hiking / Adventure
  { pattern: /(?:hike|hiking|trek|trekking)\s+(?:to|at|in|through)?\s*([A-Z][A-Za-z\s'-]{2,40})/gi, type: 'hiking' },
  { pattern: /(?:zip[- ]?line|canyoning|rafting|waterfall|adventure tour)\s+(?:at|in|with|near)?\s*([A-Z][A-Za-z\s'-]{2,40})/gi, type: 'adventure' },
  { pattern: /([A-Z][A-Za-z\s'-]{2,40})\s+(?:waterfall|cascade|falls)/gi, type: 'adventure' },

  // Horseback riding
  { pattern: /(?:horseback|horse[- ]?riding|horseback riding)\s+(?:at|in|on|with|through)?\s*([A-Z][A-Za-z\s'-]{2,40})/gi, type: 'adventure' },
  { pattern: /([A-Z][A-Za-z\s'-]{2,40})\s+(?:offers|has)\s+(?:horseback|horse riding)/gi, type: 'adventure' },

  // Cultural
  { pattern: /(?:visit(?:ed)?|tour(?:ed)?|explore(?:d)?)\s+(?:the\s+)?([A-Z][A-Za-z\s'-]{2,40}(?:\s+(?:Museum|Church|Cathedral|Palace|Fort|Castle|Ruins))?)/gi, type: 'cultural' },
  { pattern: /([A-Z][A-Za-z\s'-]{2,40}(?:\s+Colonial\s+Zone)?)\s+(?:is|has)\s+(?:historic|colonial|cultural|beautiful)/gi, type: 'cultural' },

  // Beach
  { pattern: /(?:relax(?:ed)?|chill(?:ed)?|sunbathe)\s+(?:at|on)?\s*([A-Z][A-Za-z\s'-]{2,40}\s+Beach)/gi, type: 'beach' },
  { pattern: /([A-Z][A-Za-z\s'-]{2,40}\s+Beach)\s+(?:is|has|was)\s+(?:beautiful|stunning|gorgeous|pristine|clean)/gi, type: 'beach' },

  // Food tours
  { pattern: /(?:food tour|food walk|culinary tour|tasting tour)\s+(?:in|of|around)?\s*([A-Z][A-Za-z\s'-]{2,40})/gi, type: 'food_tour' },

  // Spa
  { pattern: /(?:spa|massage|wellness)\s+(?:at|in)?\s*([A-Z][A-Za-z\s'-]{2,40})/gi, type: 'spa_wellness' },

  // Golf
  { pattern: /(?:golf|golfing|play golf)\s+(?:at|in)?\s*([A-Z][A-Za-z\s'-]{2,40}(?:\s+(?:Golf\s+)?(?:Club|Course|Resort))?)/gi, type: 'golf' },
];

// Known operators for specific destinations (hardcoded for reliable verification)
const KNOWN_OPERATORS: Record<string, { name: string; activities: string[]; url: string }[]> = {
  'dominican republic': [
    { name: 'Rancho Macao', activities: ['horseback riding', 'horse riding'], url: 'https://www.ranchomacao.com' },
    { name: '321 Takeoff', activities: ['surfing', 'surf lessons', 'kiteboarding'], url: 'https://www.321takeoff.com' },
    { name: 'Whale Samaná', activities: ['whale watching'], url: 'https://whalesamana.com' },
    { name: 'Cabarete Surf Camp', activities: ['surfing', 'surf lessons'], url: 'https://www.cabaretesurfcamp.com' },
  ],
  'costa rica': [
    { name: 'Safari Surf School', activities: ['surfing', 'surf lessons'], url: 'https://www.safarisurfschool.com' },
    { name: 'Witch\'s Rock Surf Camp', activities: ['surfing', 'surf lessons'], url: 'https://www.witchsrocksurfcamp.com' },
  ],
  'mexico': [
    { name: 'Cabo Adventures', activities: ['whale watching', 'snorkeling'], url: 'https://www.cabo-adventures.com' },
  ],
};

// Seasonal activities with availability windows
const SEASONAL_ACTIVITIES: Record<string, { activity: string; months: number[]; destinations: string[] }> = {
  'whale_watching_samana': {
    activity: 'Whale Watching in Samaná Bay',
    months: [1, 2, 3], // January - March
    destinations: ['dominican republic', 'samaná', 'las terrenas'],
  },
  'surf_cabarete_winter': {
    activity: 'Surfing at Encuentro Beach',
    months: [11, 12, 1, 2, 3], // Best waves
    destinations: ['dominican republic', 'cabarete', 'puerto plata'],
  },
  'turtle_nesting_dr': {
    activity: 'Sea Turtle Nesting Tours',
    months: [5, 6, 7, 8], // Nesting season
    destinations: ['dominican republic'],
  },
};

// Generic terms that aren't real activity names
const GENERIC_ACTIVITY_TERMS = [
  'the beach', 'a beach', 'this beach', 'that beach',
  'the tour', 'a tour', 'this tour', 'that tour',
  'the area', 'this area', 'the island', 'the resort',
];

// ============================================================================
// EXTRACTION
// ============================================================================

function isValidActivityName(name: string): boolean {
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();

  // Check generic terms
  if (GENERIC_ACTIVITY_TERMS.includes(lower)) return false;

  // Too short or too long
  if (trimmed.length < 4 || trimmed.length > 60) return false;

  // Must start with capital
  if (!/^[A-Z]/.test(trimmed)) return false;

  // Contains sentence structures
  if (/\b(have to|need to|should|from|going to|want to|will be|would be|I|we|you|they)\b/i.test(trimmed)) {
    return false;
  }

  return true;
}

function normalizeActivityName(name: string): string {
  return name.trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/\b(the|a|an)\b/g, '')
    .trim();
}

/**
 * Extract activity candidates from Reddit posts
 */
export async function extractActivitiesFromReddit(
  destination: string,
  area?: string,
  activityTypes?: ActivityType[]
): Promise<ExtractionResult> {
  const subreddits = ['travel', 'solotravel', 'TravelHacks', 'backpacking'];
  const errors: string[] = [];

  // Build search queries
  const location = area ? `${area} ${destination}` : destination;
  const searchQueries = [
    `${location} things to do`,
    `${location} activities`,
    `${location} must do`,
    `${location} experiences`,
  ];

  // Add activity-type specific searches
  if (activityTypes) {
    for (const type of activityTypes.slice(0, 2)) {
      searchQueries.push(`${location} ${type}`);
    }
  }

  // Fetch posts
  const allPosts: RedditPost[] = [];
  const seenPostIds = new Set<string>();

  for (const query of searchQueries) {
    try {
      const posts = await searchReddit(query, subreddits, 15);
      for (const post of posts) {
        if (!seenPostIds.has(post.id)) {
          seenPostIds.add(post.id);
          allPosts.push(post);
        }
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      errors.push(`Failed to search: ${query}`);
    }
  }

  console.log(`Activity extraction: Analyzed ${allPosts.length} posts for ${location}`);

  // Extract activities from posts
  const activityMap = new Map<string, ActivityCandidate>();
  const destLower = destination.toLowerCase();

  for (const post of allPosts) {
    const fullText = `${post.title} ${post.selftext}`;
    const lowerText = fullText.toLowerCase();

    // Check relevance
    if (!lowerText.includes(destLower) && (!area || !lowerText.includes(area.toLowerCase()))) {
      continue;
    }

    // Apply each pattern
    for (const { pattern, type } of ACTIVITY_PATTERNS) {
      // Filter by requested types if specified
      if (activityTypes && !activityTypes.includes(type)) continue;

      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(fullText)) !== null) {
        const activityName = match[1].trim();

        if (!isValidActivityName(activityName)) continue;

        const key = normalizeActivityName(activityName);

        // Skip if it's just the destination name
        if (key === destLower || key === area?.toLowerCase()) continue;

        const existing = activityMap.get(key) || {
          name: activityName,
          rawName: activityName,
          type,
          location: area || destination,
          redditSources: [],
          mentionCount: 0,
          totalUpvotes: 0,
        };

        existing.mentionCount++;
        existing.totalUpvotes += post.score;

        // Add Reddit source
        const source: RedditSource = {
          postUrl: `https://reddit.com${post.permalink}`,
          postId: post.id,
          subreddit: post.subreddit,
          postTitle: post.title,
          upvotes: post.score,
          quote: extractQuote(fullText, activityName),
          fetchedAt: new Date(),
        };

        // Only add if we don't already have this post
        if (!existing.redditSources.some(s => s.postId === post.id)) {
          existing.redditSources.push(source);
        }

        activityMap.set(key, existing);
      }
    }
  }

  return {
    candidates: Array.from(activityMap.values()),
    postsAnalyzed: allPosts.length,
    subredditsSearched: Array.from(new Set(allPosts.map(p => p.subreddit))),
    errors,
  };
}

function extractQuote(text: string, activityName: string): string {
  const index = text.indexOf(activityName);
  if (index < 0) return '';

  const start = Math.max(0, index - 30);
  const end = Math.min(text.length, index + activityName.length + 100);
  return text.slice(start, end).trim();
}

// ============================================================================
// DEDUPLICATION
// ============================================================================

/**
 * Deduplicate activity candidates by merging similar names
 */
export function deduplicateActivities(candidates: ActivityCandidate[]): ActivityCandidate[] {
  const merged = new Map<string, ActivityCandidate>();

  for (const candidate of candidates) {
    const key = normalizeActivityName(candidate.name);

    // Check for existing similar activity
    let found = false;
    for (const [existingKey, existing] of Array.from(merged.entries())) {
      // Check similarity (simple Levenshtein distance would be better, but this works)
      if (existingKey === key ||
          existingKey.includes(key) ||
          key.includes(existingKey) ||
          calculateSimilarity(existingKey, key) > 0.8) {
        // Merge into existing
        existing.mentionCount += candidate.mentionCount;
        existing.totalUpvotes += candidate.totalUpvotes;
        existing.redditSources.push(...candidate.redditSources);

        // Use the more descriptive name
        if (candidate.name.length > existing.name.length) {
          existing.name = candidate.name;
        }
        found = true;
        break;
      }
    }

    if (!found) {
      merged.set(key, { ...candidate });
    }
  }

  return Array.from(merged.values());
}

function calculateSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.split(' '));
  const wordsB = new Set(b.split(' '));

  let intersection = 0;
  for (const word of Array.from(wordsA)) {
    if (wordsB.has(word)) intersection++;
  }

  return (2 * intersection) / (wordsA.size + wordsB.size);
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate activity with Google Places
 */
async function validateWithGooglePlaces(
  activityName: string,
  location: string
): Promise<{ placeId?: string; placeName?: string; placeRating?: number } | null> {
  try {
    const query = `${activityName} ${location}`;
    const results = await searchPlaces(query);

    if (results.length > 0) {
      const place = results[0];
      // Check if the place name is similar to the activity
      const similarity = calculateSimilarity(
        normalizeActivityName(activityName),
        normalizeActivityName(place.name)
      );

      if (similarity > 0.5 || place.name.toLowerCase().includes(activityName.toLowerCase().split(' ')[0])) {
        return {
          placeId: place.place_id,
          placeName: place.name,
          placeRating: place.rating,
        };
      }
    }

    return null;
  } catch (error) {
    console.error(`Google Places validation failed for ${activityName}:`, error);
    return null;
  }
}

/**
 * Check for known operator
 */
function findKnownOperator(
  activityName: string,
  destination: string
): { name: string; url: string } | null {
  const destLower = destination.toLowerCase();
  const activityLower = activityName.toLowerCase();

  const operators = KNOWN_OPERATORS[destLower];
  if (!operators) return null;

  for (const op of operators) {
    // Check if activity mentions the operator name
    if (activityLower.includes(op.name.toLowerCase())) {
      return { name: op.name, url: op.url };
    }

    // Check if operator covers this activity type
    if (op.activities.some(a => activityLower.includes(a))) {
      return { name: op.name, url: op.url };
    }
  }

  return null;
}

/**
 * Build verification object for an activity
 */
function buildVerification(
  candidate: ActivityCandidate,
  googleResult: { placeId?: string; placeName?: string; placeRating?: number } | null,
  operator: { name: string; url: string } | null
): ActivityVerification {
  const verification: ActivityVerification = {};

  // Option 1: Google Places
  if (googleResult?.placeId) {
    verification.placeId = googleResult.placeId;
    verification.placeName = googleResult.placeName;
    verification.placeRating = googleResult.placeRating;
  }

  // Option 2: Known operator
  if (operator) {
    verification.operatorUrl = operator.url;
    verification.operatorVerifiedAt = new Date();
  } else if (candidate.operatorUrl) {
    verification.operatorUrl = candidate.operatorUrl;
    verification.operatorVerifiedAt = new Date();
  }

  // Option 3: Reddit sources with 10+ upvotes
  const highQualitySources = candidate.redditSources.filter(s => s.upvotes >= 10);
  if (highQualitySources.length >= 2) {
    verification.redditSources = highQualitySources.slice(0, 5).map(s => ({
      postUrl: s.postUrl,
      commentId: s.commentId,
      subreddit: s.subreddit,
      postTitle: s.postTitle,
      upvotes: s.upvotes,
      quote: s.quote,
      fetchedAt: s.fetchedAt,
    }));
  }

  return verification;
}

/**
 * Check if verification meets the contract requirements
 */
export function isVerified(verification: ActivityVerification): boolean {
  // Option 1: Google Places validated
  if (verification.placeId) return true;

  // Option 2: Has operator URL
  if (verification.operatorUrl) return true;

  // Option 3: Multiple Reddit sources (min 2, min 10 upvotes each)
  if (verification.redditSources && verification.redditSources.length >= 2) {
    const highQuality = verification.redditSources.filter(s => s.upvotes >= 10);
    if (highQuality.length >= 2) return true;
  }

  return false;
}

// ============================================================================
// SEASONAL FILTERING
// ============================================================================

/**
 * Filter activities by season/availability
 */
export function filterBySeason(
  activities: VerifiedActivity[],
  dates: { start: Date; end: Date }
): VerifiedActivity[] {
  const startMonth = dates.start.getMonth() + 1; // 1-12
  const endMonth = dates.end.getMonth() + 1;

  return activities.filter(activity => {
    // If no seasonal restriction, always include
    if (!activity.seasonalAvailability) return true;

    const { startMonth: seasonStart, endMonth: seasonEnd } = activity.seasonalAvailability;

    // Check if trip dates overlap with seasonal availability
    if (seasonStart <= seasonEnd) {
      // Normal range (e.g., Jan-Mar: 1-3)
      return startMonth <= seasonEnd && endMonth >= seasonStart;
    } else {
      // Wrapped range (e.g., Nov-Mar: 11-3)
      return startMonth >= seasonStart || endMonth <= seasonEnd;
    }
  });
}

// ============================================================================
// RANKING
// ============================================================================

/**
 * Rank activities by relevance and Reddit mentions
 */
export function rankActivities(
  activities: VerifiedActivity[],
  preferredTypes?: ActivityType[]
): VerifiedActivity[] {
  return activities.sort((a, b) => {
    // Type preference bonus
    let scoreA = 0;
    let scoreB = 0;

    if (preferredTypes) {
      if (preferredTypes.includes(a.type)) scoreA += 50;
      if (preferredTypes.includes(b.type)) scoreB += 50;
    }

    // Reddit mentions (capped at 100 for fairness)
    scoreA += Math.min(a.redditMentions * 10, 100);
    scoreB += Math.min(b.redditMentions * 10, 100);

    // Confidence score
    scoreA += a.confidenceScore * 30;
    scoreB += b.confidenceScore * 30;

    // Relevance score
    scoreA += a.relevanceScore * 20;
    scoreB += b.relevanceScore * 20;

    // Verification strength bonus
    if (a.verification.placeId) scoreA += 20;
    if (a.verification.operatorUrl) scoreA += 15;
    if (b.verification.placeId) scoreB += 20;
    if (b.verification.operatorUrl) scoreB += 15;

    return scoreB - scoreA;
  });
}

// ============================================================================
// MAIN PIPELINE
// ============================================================================

export interface VerificationPipelineResult {
  activities: VerifiedActivity[];
  stats: {
    candidatesExtracted: number;
    afterDedupe: number;
    verified: number;
    rejected: number;
    verificationMethods: {
      placeId: number;
      operatorUrl: number;
      reddit: number;
    };
    postsAnalyzed: number;
    timeMs: number;
  };
  errors: string[];
}

/**
 * Main pipeline: Extract → Dedupe → Validate → Filter → Rank
 */
export async function discoverAndVerifyActivities(
  destination: string,
  area?: string,
  activityTypes?: ActivityType[],
  dates?: { start: Date; end: Date }
): Promise<VerificationPipelineResult> {
  const startTime = Date.now();
  const errors: string[] = [];

  const stats = {
    candidatesExtracted: 0,
    afterDedupe: 0,
    verified: 0,
    rejected: 0,
    verificationMethods: {
      placeId: 0,
      operatorUrl: 0,
      reddit: 0,
    },
    postsAnalyzed: 0,
    timeMs: 0,
  };

  // Step 1: Extract from Reddit
  const extraction = await extractActivitiesFromReddit(destination, area, activityTypes);
  stats.candidatesExtracted = extraction.candidates.length;
  stats.postsAnalyzed = extraction.postsAnalyzed;
  errors.push(...extraction.errors);

  console.log(`Activity pipeline: Extracted ${stats.candidatesExtracted} candidates`);

  // Step 2: Deduplicate
  const deduped = deduplicateActivities(extraction.candidates);
  stats.afterDedupe = deduped.length;

  console.log(`Activity pipeline: Deduped to ${stats.afterDedupe} unique activities`);

  // Step 3: Validate each activity
  const validatedActivities: VerifiedActivity[] = [];

  for (const candidate of deduped) {
    // Try Google Places validation
    const googleResult = await validateWithGooglePlaces(candidate.name, candidate.location);

    // Try known operator lookup
    const operator = findKnownOperator(candidate.name, destination);
    if (operator) {
      candidate.operator = operator.name;
      candidate.operatorUrl = operator.url;
    }

    // Build verification
    const verification = buildVerification(candidate, googleResult, operator);

    // Check if verified
    if (isVerified(verification)) {
      // Track verification method
      if (verification.placeId) stats.verificationMethods.placeId++;
      else if (verification.operatorUrl) stats.verificationMethods.operatorUrl++;
      else stats.verificationMethods.reddit++;

      // Build VerifiedActivity
      const verifiedActivity: VerifiedActivity = {
        id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: candidate.name,
        operator: candidate.operator,
        operatorUrl: candidate.operatorUrl,
        location: candidate.location,
        type: candidate.type,
        verification,
        effortPoints: getEffortPoints(candidate.type),
        duration: estimateDuration(candidate.type),
        priceEstimate: candidate.priceEstimate,
        seasonalAvailability: getSeasonalAvailability(candidate.name, destination),
        redditMentions: candidate.mentionCount,
        redditEvidence: candidate.redditSources.map(s => ({
          postUrl: s.postUrl,
          commentId: s.commentId,
          subreddit: s.subreddit,
          postTitle: s.postTitle,
          upvotes: s.upvotes,
          quote: s.quote,
          fetchedAt: s.fetchedAt,
        })),
        relevanceScore: calculateRelevanceScore(candidate, activityTypes),
        confidenceScore: calculateConfidenceScore(verification),
      };

      validatedActivities.push(verifiedActivity);
      stats.verified++;
    } else {
      stats.rejected++;
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`Activity pipeline: Verified ${stats.verified}, rejected ${stats.rejected}`);

  // Step 4: Filter by season
  let filtered = validatedActivities;
  if (dates) {
    filtered = filterBySeason(validatedActivities, dates);
    console.log(`Activity pipeline: ${filtered.length} activities in season`);
  }

  // Step 5: Rank
  const ranked = rankActivities(filtered, activityTypes);

  stats.timeMs = Date.now() - startTime;

  return {
    activities: ranked,
    stats,
    errors,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getEffortPoints(type: ActivityType): number {
  const effortMap: Record<ActivityType, number> = {
    surf: 2,
    snorkel: 1.5,
    dive: 3,
    swimming: 1,
    water_sports: 2,
    wildlife: 2.5,
    hiking: 3,
    adventure: 2.5,
    cultural: 1.5,
    food_tour: 1.5,
    nightlife: 1.5,
    beach: 1,
    spa_wellness: 1,
    golf: 2,
    shopping: 1,
    photography: 1,
  };
  return effortMap[type] || 2;
}

function estimateDuration(type: ActivityType): string {
  const durationMap: Record<ActivityType, string> = {
    surf: '2-3 hours',
    snorkel: '2-3 hours',
    dive: '3-4 hours',
    swimming: '1-2 hours',
    water_sports: '2-3 hours',
    wildlife: 'Half day',
    hiking: '3-5 hours',
    adventure: 'Half day',
    cultural: '2-4 hours',
    food_tour: '3-4 hours',
    nightlife: 'Evening',
    beach: '2-4 hours',
    spa_wellness: '2-3 hours',
    golf: '4-5 hours',
    shopping: '2-3 hours',
    photography: '2-3 hours',
  };
  return durationMap[type] || '2-3 hours';
}

function getSeasonalAvailability(
  activityName: string,
  destination: string
): { startMonth: number; endMonth: number } | undefined {
  const activityLower = activityName.toLowerCase();
  const destLower = destination.toLowerCase();

  for (const [, seasonal] of Object.entries(SEASONAL_ACTIVITIES)) {
    if (
      activityLower.includes(seasonal.activity.toLowerCase().split(' ')[0]) &&
      seasonal.destinations.some(d => destLower.includes(d))
    ) {
      const months = seasonal.months;
      return {
        startMonth: Math.min(...months),
        endMonth: Math.max(...months),
      };
    }
  }

  return undefined;
}

function calculateRelevanceScore(
  candidate: ActivityCandidate,
  preferredTypes?: ActivityType[]
): number {
  let score = 0.5; // Base score

  // Type match
  if (preferredTypes?.includes(candidate.type)) {
    score += 0.3;
  }

  // Mention count bonus (normalized)
  score += Math.min(candidate.mentionCount / 10, 0.2);

  return Math.min(score, 1);
}

function calculateConfidenceScore(verification: ActivityVerification): number {
  let score = 0;

  // Google Places = highest confidence
  if (verification.placeId) {
    score = 0.9;
    if (verification.placeRating && verification.placeRating >= 4) {
      score = 0.95;
    }
  }
  // Operator URL = high confidence
  else if (verification.operatorUrl) {
    score = 0.8;
  }
  // Reddit sources = moderate confidence
  else if (verification.redditSources) {
    const count = verification.redditSources.length;
    const avgUpvotes = verification.redditSources.reduce((sum, s) => sum + s.upvotes, 0) / count;

    score = 0.5 + Math.min(count * 0.1, 0.2) + Math.min(avgUpvotes / 100, 0.2);
  }

  return Math.min(score, 1);
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  validateWithGooglePlaces,
  findKnownOperator,
  KNOWN_OPERATORS,
  SEASONAL_ACTIVITIES,
};
