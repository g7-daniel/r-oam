/**
 * Area Discovery API
 * Finds best areas for a trip based on destination and preferences
 * Combines Reddit data with LLM knowledge for comprehensive recommendations
 */

import { NextRequest, NextResponse } from 'next/server';
import { TripPreferences, AreaCandidate, RedditEvidence, DestinationContext } from '@/types/quick-plan';
import { searchAreaRecommendations, AreaRecommendation } from '@/lib/reddit';
import { discoverAreas, generateSplitOptions } from '@/lib/quick-plan/area-discovery';
import { chatCompletion } from '@/lib/groq';
import { GoogleGenAI } from '@google/genai';
import { prisma } from '@/lib/prisma';
import { BoundedMap } from '@/lib/bounded-cache';
import { geocodeLocation } from '@/lib/google-maps';
import { calculateHaversineDistance } from '@/lib/utils/geo';
import {
  discoverAreasPostSchema,
  validateRequestBody,
} from '@/lib/api-validation';

// Initialize Gemini client (fallback when Groq rate limits)
const gemini = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

const GEMINI_MODEL = 'gemini-2.5-flash';

// Minimum hotels required for an area to be considered valid
const MIN_HOTELS_FOR_VALID_AREA = 2;

// Rate limiting: track last search per destination (bounded to prevent memory leaks)
const searchTimestamps = new BoundedMap<string, number>(200, 5); // max 200 items, 5 min TTL
const SEARCH_COOLDOWN_MS = 60000; // 1 minute cooldown per destination

/**
 * Check hotel availability for an area by name
 * Returns the count of hotels found in the database
 */
async function getHotelCountForArea(
  areaName: string,
  destination: string,
  centerLat?: number,
  centerLng?: number
): Promise<number> {
  try {
    // Try multiple search strategies
    let count = 0;

    // Strategy 1: Search by area name in region/city fields
    // Note: SQLite LIKE is case-insensitive by default for ASCII, so we don't need mode
    count = await prisma.hotel.count({
      where: {
        OR: [
          { region: { contains: areaName } },
          { city: { contains: areaName } },
          { name: { contains: areaName } },
        ],
        googleRating: { gte: 3.5 }, // Only count decent hotels
      },
    });

    // Strategy 2: If no results by name and we have coordinates, search by proximity
    if (count === 0 && centerLat && centerLng) {
      // Search within ~10km radius (0.1 degrees ≈ 11km)
      count = await prisma.hotel.count({
        where: {
          lat: { gte: centerLat - 0.1, lte: centerLat + 0.1 },
          lng: { gte: centerLng - 0.1, lte: centerLng + 0.1 },
          googleRating: { gte: 3.5 },
        },
      });
    }

    // Strategy 3: Search by destination country/region as fallback
    if (count === 0) {
      count = await prisma.hotel.count({
        where: {
          country: { contains: destination },
          googleRating: { gte: 3.5 },
        },
      });
      // If searching by country, cap the "available" count to indicate general availability
      if (count > 10) count = 10;
    }

    return count;
  } catch (error) {
    console.error(`Error checking hotels for ${areaName}:`, error);
    return 0;
  }
}

/**
 * Validate areas have hotel availability and add hotel count metadata
 */
async function validateAreasWithHotels(
  areas: AreaCandidate[],
  destination: string
): Promise<{ validatedAreas: AreaCandidate[]; excludedAreas: string[] }> {
  const validatedAreas: AreaCandidate[] = [];
  const excludedAreas: string[] = [];

  for (const area of areas) {
    const hotelCount = await getHotelCountForArea(
      area.name,
      destination,
      area.centerLat,
      area.centerLng
    );

    console.log(`[Area Validation] ${area.name}: ${hotelCount} hotels found`);

    if (hotelCount >= MIN_HOTELS_FOR_VALID_AREA) {
      validatedAreas.push({
        ...area,
        hotelCount, // Add hotel count for UI display
      });
    } else if (hotelCount > 0) {
      // Has some hotels but below threshold - still include with warning
      validatedAreas.push({
        ...area,
        hotelCount,
        lowHotelInventory: true,
      });
    } else {
      // No hotels at all - exclude but track
      excludedAreas.push(area.name);
      console.log(`[Area Validation] Excluding ${area.name} - no hotels found`);
    }
  }

  // If we excluded too many areas and have very few left, be more lenient
  if (validatedAreas.length < 2 && excludedAreas.length > 0) {
    console.log(`[Area Validation] Only ${validatedAreas.length} areas passed validation, including excluded areas with warning`);
    // Re-add excluded areas but flag them
    for (const areaName of excludedAreas) {
      const area = areas.find(a => a.name === areaName);
      if (area) {
        validatedAreas.push({
          ...area,
          hotelCount: 0,
          lowHotelInventory: true,
          needsHotelIndexing: true, // Signal that hotels should be indexed
        });
      }
    }
  }

  return { validatedAreas, excludedAreas };
}

/**
 * Call Gemini as fallback when Groq rate limits
 */
async function callGeminiForAreas(prompt: string, systemPrompt: string): Promise<string | null> {
  if (!gemini) {
    console.log('[Area Discovery] Gemini not configured (no API key)');
    return null;
  }

  try {
    console.log('[Area Discovery] Attempting Gemini fallback...');
    const fullPrompt = `${systemPrompt}\n\n${prompt}\n\nIMPORTANT: Output ONLY valid JSON. No markdown, no code blocks, just the JSON object.`;

    const response = await gemini.models.generateContent({
      model: GEMINI_MODEL,
      contents: fullPrompt,
      config: {
        temperature: 0.3,
        maxOutputTokens: 4000,
        responseMimeType: 'application/json',
      },
    });

    const content = response.text || '';
    console.log(`[Area Discovery] Gemini response length: ${content.length}`);
    return content;
  } catch (error) {
    console.error('[Area Discovery] Gemini call failed:', error);
    return null;
  }
}

/**
 * Check if an error is a rate limit error
 */
function isRateLimitError(error: unknown): boolean {
  const errorMessage = error instanceof Error ? error.message : String(error);
  return (
    errorMessage.includes('Rate limit') ||
    errorMessage.includes('rate_limit') ||
    errorMessage.includes('429') ||
    errorMessage.includes('quota') ||
    errorMessage.includes('Too Many Requests')
  );
}

/**
 * Use LLM to discover areas based on destination and activities
 * This works for ANY destination - the LLM provides expert knowledge
 * Falls back to Gemini if Groq rate limits
 */
// Internal evidence format used during area discovery (simpler than full RedditEvidence)
interface LocalEvidence {
  type: string;
  subreddit: string;
  snippet: string;
  score: number;
}

// Mentioned area structure
interface MentionedArea {
  name: string;
  characteristics: string[];
}

// Base area data structure shared between LLM and Reddit sources
interface BaseAreaData {
  postId: string;
  title: string;
  text: string;
  sentiment: number;
  upvotes: number;
  mentionedAreas: Array<{ name: string; characteristics: string[] }>;
  // Properties added during merging - use local evidence format
  evidence?: LocalEvidence[];
  redditUpvotes?: number;
  hasRedditMentions?: boolean;
  needsAISummary?: boolean;
}

// LLM-generated area data with AI-specific fields
interface LLMAreaData extends BaseAreaData {
  llmGenerated: true;
  bestFor: string[];
  specificActivities: Array<{ activity: string; location: string; seasonality?: string; note?: string }>;
  sourceModel: 'gemini' | 'groq';
}

// Reddit-sourced area data (may not have LLM-specific fields)
interface LocalRedditAreaData extends BaseAreaData {
  llmGenerated?: false;
  bestFor?: string[];
  specificActivities?: Array<{ activity: string; location: string; seasonality?: string; note?: string }>;
  sourceModel?: 'gemini' | 'groq';
}

// Union type for merged area data
type MergedAreaData = LLMAreaData | LocalRedditAreaData;

async function discoverAreasWithLLM(
  destination: string,
  activities: string[],
  customActivities: string[],
  tripLength: number
): Promise<LLMAreaData[]> {
  // Build activity context - include both standard and custom activities
  const allActivities = [...activities];
  const customList = customActivities.filter(a => a && a.trim());

  let activitiesText = '';
  if (allActivities.length > 0 || customList.length > 0) {
    const combined = [...allActivities, ...customList];
    activitiesText = `Activities I want to do: ${combined.join(', ')}`;
  } else {
    activitiesText = 'I want a mix of beach, culture, and relaxation';
  }

  // Build specific activity questions if user has unique requests
  let specificActivityPrompt = '';
  if (customList.length > 0) {
    specificActivityPrompt = `

IMPORTANT: The traveler specifically wants to do these activities: ${customList.join(', ')}
For each of these specific activities, make sure to:
1. Include the area where this activity is BEST done
2. Note any seasonality (e.g., whale watching only Jan-Mar)
3. Mention the specific location/operator if known`;
  }

  const prompt = `I'm planning a ${tripLength}-night trip to ${destination}.
${activitiesText}
${specificActivityPrompt}

What are the 5-6 best areas/regions to stay in ${destination}? For each area, provide:
1. The area name (use the common tourist name)
2. A brief description (1-2 sentences) - be specific about what makes it special
3. What activities it's BEST for (not just okay, but the TOP spot for these)
4. Key characteristics (beach, mountains, nightlife, diving, wildlife, etc.)
5. If this is THE place to do a specific activity the user mentioned, highlight it

IMPORTANT:
- If multiple towns are in the same region, group them (e.g., "Samaná Peninsula" includes Las Terrenas)
- For specific activities like whale watching, diving with specific animals, etc. - tell me exactly WHERE and WHEN
- Be specific: "whale watching" should map to a specific bay/area, not just "the coast"

Respond in JSON format:
{
  "areas": [
    {
      "name": "Area Name",
      "description": "Brief description",
      "bestFor": ["activity1", "activity2"],
      "characteristics": ["beach", "nightlife"],
      "specificActivities": [
        {
          "activity": "whale watching",
          "location": "Samaná Bay",
          "seasonality": "January to March only",
          "note": "Humpback whale breeding ground"
        }
      ]
    }
  ]
}

Only respond with the JSON, no other text.`;

  const systemPrompt = 'You are a travel expert with deep knowledge of destinations worldwide. You know specific locations for activities, seasonality, and local operators. Respond only with valid JSON.';

  let response: string | null = null;
  let usedGemini = false;

  // Try Groq first
  try {
    console.log(`[Area Discovery] Calling Groq for ${destination}...`);
    response = await chatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ], 0.3);
    console.log(`[Area Discovery] Groq response length: ${response?.length || 0}`);
  } catch (error) {
    console.error('[Area Discovery] Groq call failed:', error);

    // Check if it's a rate limit error - try Gemini fallback
    if (isRateLimitError(error)) {
      console.log('[Area Discovery] Groq rate limited, trying Gemini fallback...');
      response = await callGeminiForAreas(prompt, systemPrompt);
      usedGemini = true;
    }
  }

  // If we still don't have a response (both failed), return empty
  if (!response) {
    console.error('[Area Discovery] Both Groq and Gemini failed - no LLM response');
    return [];
  }

  // Parse the response
  try {
    // FIX 2.9: Safe JSON parsing with multiple fallback strategies
    let parsed: { areas?: Array<{ name: string; description: string; bestFor?: string[]; characteristics?: string[]; specificActivities?: Array<{ activity: string; location: string; seasonality?: string; note?: string }> }> } | null = null;
    try {
      // Strategy 1: Find JSON object in response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        // Strategy 2: Try parsing entire response as JSON
        parsed = JSON.parse(response);
      }
    } catch (parseError) {
      console.warn('[Area Discovery] Failed to parse LLM response as JSON:', parseError);
      console.log('[Area Discovery] Raw response (first 500 chars):', response.substring(0, 500));

      // Strategy 3: Attempt to extract areas from plain text
      parsed = extractAreasFromText(response);
    }

    if (parsed?.areas && Array.isArray(parsed.areas)) {
      console.log(`[Area Discovery] ${usedGemini ? 'Gemini' : 'Groq'} discovered ${parsed.areas.length} areas for ${destination}`);
      return parsed.areas.map((area, idx: number) => {
        // Build enhanced description with specific activities
        let enhancedDescription = area.description;
        if (area.specificActivities && area.specificActivities.length > 0) {
          const highlights = area.specificActivities.map((sa) =>
            `🎯 ${sa.activity}: ${sa.location}${sa.seasonality ? ` (${sa.seasonality})` : ''}`
          ).join('. ');
          enhancedDescription = `${highlights}. ${area.description}`;
        }

        return {
          postId: `llm-${idx}`,
          title: `LLM recommendation: ${area.name}`,
          text: enhancedDescription,
          sentiment: 0.8,
          upvotes: 100,
          mentionedAreas: [{
            name: area.name,
            characteristics: area.characteristics || [],
          }],
          llmGenerated: true,
          bestFor: area.bestFor || [],
          specificActivities: area.specificActivities || [],
          sourceModel: usedGemini ? 'gemini' as const : 'groq' as const,
        };
      });
    }
  } catch (parseError) {
    console.error('[Area Discovery] Failed to parse response:', parseError);
  }

  console.warn('[Area Discovery] No valid areas parsed from response');
  return [];
}

/**
 * FIX 2.9: Extract areas from plain text when JSON parsing fails
 */
interface ExtractedArea {
  name: string;
  description: string;
  bestFor: string[];
  characteristics: string[];
}

function extractAreasFromText(text: string): { areas: ExtractedArea[] } | null {
  const areas: ExtractedArea[] = [];

  // Look for numbered lists or bullet points with area names
  const patterns = [
    /(?:^\d+\.\s*|^[-*•]\s*)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gm,
    /\*\*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\*\*/g,
    /(?:area|neighborhood|district|region):\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
  ];

  const seenNames = new Set<string>();

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null && areas.length < 8) {
      const name = match[1]?.trim();
      if (name && name.length > 2 && name.length < 50 && !seenNames.has(name.toLowerCase())) {
        seenNames.add(name.toLowerCase());
        areas.push({
          name,
          description: `Area extracted from LLM response`,
          bestFor: [],
          characteristics: [],
        });
      }
    }
  }

  if (areas.length > 0) {
    console.log(`[Area Discovery] Extracted ${areas.length} areas from text fallback`);
    return { areas };
  }

  return null;
}

// Maximum distance (km) an area can be from destination center to be considered valid
const MAX_AREA_DISTANCE_KM = 150; // 150km allows for reasonable travel within a destination

// Extended area data with geo validation info
type GeoValidatedAreaData = MergedAreaData & {
  geoValidation?: string;
  centerLat?: number;
  centerLng?: number;
  distanceFromDestCenter?: number;
};

/**
 * PHASE 2 FIX: Geographic validation - reject areas too far from destination center
 * This prevents LLM hallucinations like suggesting areas in wrong countries
 */
async function validateAreasGeographically(
  areas: MergedAreaData[],
  destination: string,
  destCenterLat: number | undefined,
  destCenterLng: number | undefined
): Promise<{ validAreas: GeoValidatedAreaData[]; rejectedAreas: { name: string; reason: string; distance?: number }[] }> {
  // If no destination center coordinates, skip validation (can't validate without reference point)
  if (!destCenterLat || !destCenterLng) {
    console.log('[Area Geo Validation] No destination center coordinates, skipping geographic validation');
    return { validAreas: areas, rejectedAreas: [] };
  }

  const validAreas: GeoValidatedAreaData[] = [];
  const rejectedAreas: { name: string; reason: string; distance?: number }[] = [];

  // Process all areas in parallel for speed
  const results = await Promise.all(areas.map(async (area) => {
    const areaName = area.mentionedAreas?.[0]?.name;
    if (!areaName) {
      return { type: 'rejected' as const, name: 'unknown', reason: 'No area name' };
    }

    try {
      // Geocode the area WITH destination context for accuracy
      // e.g., "Punta Cana, Dominican Republic" instead of just "Punta Cana"
      const searchQuery = `${areaName}, ${destination}`;
      const areaCoords = await geocodeLocation(searchQuery);

      if (!areaCoords) {
        // Can't verify - include but flag it
        console.log(`[Area Geo Validation] Could not geocode "${areaName}" - including with warning`);
        return {
          type: 'valid' as const,
          area: { ...area, geoValidation: 'unverified' as const },
        };
      }

      // Calculate distance from destination center
      const distanceKm = calculateHaversineDistance(
        destCenterLat!,
        destCenterLng!,
        areaCoords.lat,
        areaCoords.lng
      );

      console.log(`[Area Geo Validation] "${areaName}": ${distanceKm.toFixed(1)}km from destination center`);

      if (distanceKm > MAX_AREA_DISTANCE_KM) {
        // Too far - likely wrong location or LLM hallucination
        console.warn(`[Area Geo Validation] REJECTED "${areaName}": ${distanceKm.toFixed(1)}km exceeds ${MAX_AREA_DISTANCE_KM}km limit`);
        return {
          type: 'rejected' as const,
          name: areaName,
          reason: `Too far from destination (${distanceKm.toFixed(0)}km away)`,
          distance: distanceKm,
        };
      }

      // Valid - add coordinates for future use
      return {
        type: 'valid' as const,
        area: {
          ...area,
          geoValidation: 'verified' as const,
          centerLat: areaCoords.lat,
          centerLng: areaCoords.lng,
          distanceFromDestCenter: distanceKm,
        },
      };
    } catch (error) {
      console.error(`[Area Geo Validation] Error validating "${areaName}":`, error);
      // On error, include the area but flag it
      return {
        type: 'valid' as const,
        area: { ...area, geoValidation: 'error' as const },
      };
    }
  }));

  // Separate results into valid and rejected
  for (const result of results) {
    if (result.type === 'valid') {
      validAreas.push(result.area as GeoValidatedAreaData);
    } else {
      rejectedAreas.push({ name: result.name, reason: result.reason, distance: result.distance });
    }
  }

  console.log(`[Area Geo Validation] Result: ${validAreas.length} valid, ${rejectedAreas.length} rejected`);
  return { validAreas, rejectedAreas };
}

/**
 * Convert Reddit area recommendations to the format expected by the area discovery engine
 */
function convertRedditDataToAreaFormat(recommendations: AreaRecommendation[]): LocalRedditAreaData[] {
  return recommendations.map((rec, index) => ({
    postId: `reddit-${index}`,
    title: `Reddit mentions of ${rec.areaName}`,
    text: rec.quotes.join(' '),
    sentiment: rec.sentimentScore,
    upvotes: rec.upvotes,
    mentionedAreas: [
      {
        name: rec.areaName,
        characteristics: rec.characteristics,
      },
    ],
    // Store full evidence for display
    evidence: rec.quotes.map((quote, qIdx) => ({
      type: 'reddit_thread',
      subreddit: rec.subreddits[qIdx] || rec.subreddits[0] || 'travel',
      snippet: quote,
      score: Math.floor(rec.upvotes / rec.mentionCount),
    })),
  }));
}

export async function POST(request: NextRequest) {
  try {
    // Validate request body using Zod schema
    const validationResult = await validateRequestBody(request, discoverAreasPostSchema);
    if (!validationResult.success) {
      return validationResult.error;
    }

    const { destination, subreddits: selectedSubreddits } = validationResult.data;
    // Cast preferences to Partial<TripPreferences> since we use passthrough() in the schema
    const preferences = validationResult.data.preferences as Partial<TripPreferences>;

    const destKey = destination.toLowerCase();
    const lastSearch = searchTimestamps.get(destKey) || 0;
    const now = Date.now();

    // Handle undefined preferences
    const prefs = preferences || {};
    const selectedActivities = prefs.selectedActivities || [];
    const activityTypes = selectedActivities.map(a => a.type);
    const tripLength = prefs.tripLength || 7;

    // Extract custom activities (user-typed like "whale watching", "horse riding in water")
    interface ActivityWithCustom { type: string; isCustom?: boolean; customLabel?: string }
    const customActivities = (selectedActivities || [])
      .filter((a: ActivityWithCustom) => a && (a.isCustom || a.customLabel))
      .map((a: ActivityWithCustom) => a.customLabel || a.type?.replace(/_/g, ' ') || '');

    // Run LLM and Reddit search in PARALLEL for speed
    const startTime = Date.now();
    console.log(`Area discovery: Starting parallel fetch for ${destination}`);
    if (customActivities.length > 0) {
      console.log(`Area discovery: Custom activities: ${customActivities.join(', ')}`);
    }

    const destCenterLat = preferences.destinationContext?.centerLat;
    const destCenterLng = preferences.destinationContext?.centerLng;

    // Prepare Reddit search params
    const subredditsToSearch = selectedSubreddits && selectedSubreddits.length > 0
      ? selectedSubreddits
      : undefined;
    const shouldSearchReddit = now - lastSearch >= SEARCH_COOLDOWN_MS;
    if (shouldSearchReddit) {
      searchTimestamps.set(destKey, now);
    }

    // Run LLM and Reddit in parallel
    const [initialLlmData, redditResults] = await Promise.all([
      // LLM call
      discoverAreasWithLLM(destination, activityTypes, customActivities, tripLength),
      // Reddit search (or empty if on cooldown)
      shouldSearchReddit
        ? searchAreaRecommendations(destination, activityTypes, subredditsToSearch).catch(err => {
            console.error('Reddit search failed:', err);
            return [] as any[];
          })
        : Promise.resolve([] as any[]),
    ]);

    console.log(`Area discovery: LLM returned ${initialLlmData.length} areas, Reddit returned ${redditResults.length} areas [${Date.now() - startTime}ms]`);

    let redditData: LocalRedditAreaData[] = redditResults.length > 0
      ? convertRedditDataToAreaFormat(redditResults)
      : [];
    const fromCache = !shouldSearchReddit;

    // Geographic validation (skip if no coordinates - faster)
    let geoRejectedAreas: { name: string; reason: string; distance?: number }[] = [];
    let llmData: GeoValidatedAreaData[] = initialLlmData;

    if (destCenterLat && destCenterLng && (destCenterLat !== 0 || destCenterLng !== 0)) {
      console.log(`Area discovery: Validating areas geographically (center: ${destCenterLat}, ${destCenterLng})`);
      const geoValidation = await validateAreasGeographically(initialLlmData, destination, destCenterLat, destCenterLng);
      llmData = geoValidation.validAreas;
      geoRejectedAreas = geoValidation.rejectedAreas;
      console.log(`Area discovery: After geo validation: ${llmData.length} valid, ${geoRejectedAreas.length} rejected [${Date.now() - startTime}ms]`);
    } else {
      console.log(`Area discovery: No destination coordinates available, skipping geo validation`);
    }

    // Merge LLM and Reddit data - AI descriptions are primary, Reddit provides evidence
    // Start with LLM areas (they have AI-generated descriptions)
    const mergedData: MergedAreaData[] = [...llmData];

    // Enhance LLM areas with Reddit evidence (but keep LLM description)
    for (const llmArea of mergedData) {
      const areaName = llmArea.mentionedAreas[0]?.name?.toLowerCase();
      const matchingReddit = redditData.find(rd =>
        rd.mentionedAreas?.some((ma: MentionedArea) =>
          ma.name.toLowerCase().includes(areaName) || areaName?.includes(ma.name.toLowerCase())
        )
      );

      // Add Reddit evidence to LLM area but keep the AI description
      if (matchingReddit) {
        llmArea.evidence = matchingReddit.evidence;
        llmArea.redditUpvotes = matchingReddit.upvotes;
        llmArea.hasRedditMentions = true;
      }
    }

    // Add Reddit-only areas that weren't found in LLM (rare edge case)
    for (const redditArea of redditData) {
      const areaName = redditArea.mentionedAreas[0]?.name?.toLowerCase();
      const existsInLLM = llmData.some(la =>
        la.mentionedAreas?.some((ma: MentionedArea) =>
          ma.name.toLowerCase().includes(areaName) || areaName?.includes(ma.name.toLowerCase())
        )
      );

      if (!existsInLLM) {
        // Mark as needing AI summary (it only has Reddit text)
        redditArea.needsAISummary = true;
        mergedData.push(redditArea);
      }
    }

    console.log(`Area discovery: Merged ${mergedData.length} total areas (${llmData.length} LLM primary + ${redditData.length} Reddit evidence)`);

    // Use merged data for discovery
    const combinedData = mergedData;

    // Build full preferences with defaults
    // Ensure destination context includes the canonicalName and rawInput
    const existingContext = preferences.destinationContext;
    const destContext: DestinationContext = existingContext
      ? {
          ...existingContext,
          // Ensure required fields are set for backwards compatibility
          canonicalName: existingContext.canonicalName || destination,
          rawInput: existingContext.rawInput || destination,
        }
      : {
          rawInput: destination,
          canonicalName: destination,
          type: 'country' as const,
          countryCode: '',
          countryName: destination,
          centerLat: 0,
          centerLng: 0,
          timezone: '',
          suggestedAreas: [],
        };

    const fullPreferences: TripPreferences = {
      destinationContext: destContext,
      startDate: preferences.startDate ? new Date(preferences.startDate) : null,
      endDate: preferences.endDate ? new Date(preferences.endDate) : null,
      tripLength: preferences.tripLength || 7,
      isFlexibleDates: preferences.isFlexibleDates || false,
      adults: preferences.adults || 2,
      children: preferences.children || 0,
      childAges: preferences.childAges || [],
      budgetPerNight: preferences.budgetPerNight || { min: 150, max: 350 },
      flexNights: preferences.flexNights || 0,
      pace: preferences.pace || 'balanced',
      mustDos: preferences.mustDos || [],
      hardNos: preferences.hardNos || [],
      hotelVibePreferences: preferences.hotelVibePreferences || [],
      selectedActivities: preferences.selectedActivities || [],
      adultsOnlyRequired: preferences.adultsOnlyRequired || false,
      adultsOnlyPreferred: preferences.adultsOnlyPreferred || false,
      allInclusivePreferred: preferences.allInclusivePreferred || false,
      diningMode: preferences.diningMode || 'list',
      diningImportance: preferences.diningImportance || 'medium',
      diningVibes: preferences.diningVibes || [],
      budgetPerMeal: preferences.budgetPerMeal || { min: 20, max: 80 },
      dietaryRestrictions: preferences.dietaryRestrictions || [],
      detectedTradeoffs: preferences.detectedTradeoffs || [],
      resolvedTradeoffs: preferences.resolvedTradeoffs || [],
      selectedAreas: preferences.selectedAreas || [],
      selectedSplit: preferences.selectedSplit || null,
      maxBases: preferences.maxBases || 2,
      preferencesLocked: false,
    };

    // Discover areas using the engine with combined data
    console.log(`Area discovery: Running discovery with ${combinedData.length} data points for "${destination}"`);
    const areas = await discoverAreas(fullPreferences, combinedData);
    console.log(`Area discovery: Found ${areas.length} areas`);

    // Validate hotel availability for discovered areas
    console.log(`Area discovery: Validating hotel availability for ${areas.length} areas`);
    const { validatedAreas: areasWithHotelData, excludedAreas } = await validateAreasWithHotels(
      areas as AreaCandidate[],
      destination
    );
    console.log(`Area discovery: ${areasWithHotelData.length} areas passed validation, ${excludedAreas.length} excluded`);

    // Add evidence to areas - AI descriptions are primary, Reddit provides social proof
    const areasWithEvidence = areasWithHotelData.map(area => {
      // Find matching LLM data (for AI-generated description)
      const matchingLLM = combinedData.find(
        rd => rd.llmGenerated && rd.mentionedAreas?.some((ma: MentionedArea) =>
          ma.name.toLowerCase() === area.name.toLowerCase()
        )
      );

      // Find matching Reddit data (for evidence/social proof)
      const matchingReddit = combinedData.find(
        rd => !rd.llmGenerated && rd.mentionedAreas?.some((ma: MentionedArea) =>
          ma.name.toLowerCase() === area.name.toLowerCase()
        )
      );

      let evidence: RedditEvidence[] = [];

      if (matchingReddit?.evidence) {
        evidence = matchingReddit.evidence.map((e: LocalEvidence) => ({
          postUrl: `https://reddit.com/r/${e.subreddit}`,
          subreddit: e.subreddit,
          postTitle: matchingReddit.title,
          upvotes: e.score || matchingReddit.upvotes,
          quote: e.snippet,
          fetchedAt: new Date(),
        }));
      }

      // Prefer LLM-generated description over Reddit text
      const llmDescription = matchingLLM?.text;
      const llmBestFor = matchingLLM?.bestFor || [];

      return {
        ...area,
        // Use AI description if available, otherwise keep existing
        description: llmDescription || area.description,
        evidence: evidence.length > 0 ? evidence : area.evidence,
        bestFor: area.bestFor.length > 0 ? area.bestFor : llmBestFor,
        sourceNote: matchingReddit ? 'Reddit + AI' : 'AI recommendation',
      };
    });

    // Generate split options - cast to AreaCandidate[] as areasWithEvidence extends it with sourceNote
    const splitOptions = generateSplitOptions(areasWithEvidence as AreaCandidate[], fullPreferences);

    const response = NextResponse.json({
      areas: areasWithEvidence,
      splitOptions,
      redditPostCount: redditData.length,
      llmAreasCount: llmData.length,
      fromCache,
      excludedAreas, // Areas excluded due to no hotel availability
      geoRejectedAreas, // Areas rejected due to distance validation
      debug: {
        destination,
        redditAreasFound: redditData.length,
        llmAreasFound: llmData.length,
        geoRejectedCount: geoRejectedAreas.length,
        mergedAreasCount: combinedData.length,
        areasDiscovered: areas.length,
        areasValidated: areasWithHotelData.length,
        areasExcluded: excludedAreas.length,
        areasReturned: areasWithEvidence.length,
        splitsGenerated: splitOptions.length,
      },
    });

    // Add cache headers - area discovery data can be cached for 10 minutes
    // with stale-while-revalidate for 20 minutes (expensive operation)
    response.headers.set('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1200');
    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Area discovery error:', errorMessage, error);

    // Check for specific error types
    if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      return NextResponse.json(
        {
          error: 'RATE_LIMIT',
          message: 'We are processing too many requests. Please try again in a moment.',
          areas: [],
          splitOptions: [],
        },
        { status: 429 }
      );
    }

    if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
      return NextResponse.json(
        {
          error: 'TIMEOUT_ERROR',
          message: 'The area search took too long. Please try again.',
          areas: [],
          splitOptions: [],
        },
        { status: 504 }
      );
    }

    // Return a graceful degradation response
    return NextResponse.json(
      {
        error: 'DISCOVERY_ERROR',
        message: 'We had trouble finding areas for your destination. Please try a different destination or try again.',
        areas: [],
        splitOptions: [],
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}
