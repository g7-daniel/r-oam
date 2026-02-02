/**
 * Area Discovery API
 * Finds best areas for a trip based on destination and preferences
 * Combines Reddit data with LLM knowledge for comprehensive recommendations
 */

import { NextRequest, NextResponse } from 'next/server';
import { TripPreferences, AreaCandidate, RedditEvidence } from '@/types/quick-plan';
import { searchAreaRecommendations, AreaRecommendation } from '@/lib/reddit';
import { discoverAreas, generateSplitOptions } from '@/lib/quick-plan/area-discovery';
import { chatCompletion } from '@/lib/groq';
import { prisma } from '@/lib/prisma';

// Minimum hotels required for an area to be considered valid
const MIN_HOTELS_FOR_VALID_AREA = 2;

// Rate limiting: track last search per destination
const searchTimestamps = new Map<string, number>();
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
    count = await prisma.hotel.count({
      where: {
        OR: [
          { region: { contains: areaName, mode: 'insensitive' } },
          { city: { contains: areaName, mode: 'insensitive' } },
          { name: { contains: areaName, mode: 'insensitive' } },
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
          country: { contains: destination, mode: 'insensitive' },
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
 * Use LLM to discover areas based on destination and activities
 * This works for ANY destination - the LLM provides expert knowledge
 */
async function discoverAreasWithLLM(
  destination: string,
  activities: string[],
  customActivities: string[],
  tripLength: number
): Promise<any[]> {
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

  try {
    const response = await chatCompletion([
      { role: 'system', content: 'You are a travel expert with deep knowledge of destinations worldwide. You know specific locations for activities, seasonality, and local operators. Respond only with valid JSON.' },
      { role: 'user', content: prompt },
    ], 0.3);

    // FIX 2.9: Safe JSON parsing with multiple fallback strategies
    let parsed: any = null;
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
        console.log(`LLM discovered ${parsed.areas.length} areas for ${destination}`);
        return parsed.areas.map((area: any, idx: number) => {
          // Build enhanced description with specific activities
          let enhancedDescription = area.description;
          if (area.specificActivities && area.specificActivities.length > 0) {
            const highlights = area.specificActivities.map((sa: any) =>
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
          };
        });
    }
  } catch (error) {
    console.error('LLM area discovery failed:', error);
  }

  return [];
}

/**
 * FIX 2.9: Extract areas from plain text when JSON parsing fails
 */
function extractAreasFromText(text: string): { areas: any[] } | null {
  const areas: any[] = [];

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

/**
 * Convert Reddit area recommendations to the format expected by the area discovery engine
 */
function convertRedditDataToAreaFormat(recommendations: AreaRecommendation[]): any[] {
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
    const body = await request.json();
    const { destination, preferences, subreddits: selectedSubreddits } = body as {
      destination: string;
      preferences: Partial<TripPreferences>;
      subreddits?: string[];
    };

    if (!destination) {
      return NextResponse.json(
        { error: 'Destination is required' },
        { status: 400 }
      );
    }

    const destKey = destination.toLowerCase();
    const lastSearch = searchTimestamps.get(destKey) || 0;
    const now = Date.now();

    // Handle undefined preferences
    const prefs = preferences || {};
    const selectedActivities = prefs.selectedActivities || [];
    const activityTypes = selectedActivities.map(a => a.type);
    const tripLength = prefs.tripLength || 7;

    // Extract custom activities (user-typed like "whale watching", "horse riding in water")
    const customActivities = (selectedActivities || [])
      .filter((a: any) => a && (a.isCustom || a.customLabel))
      .map((a: any) => a.customLabel || a.type?.replace(/_/g, ' ') || '');

    // Always call LLM for area recommendations (works for ANY destination)
    console.log(`Area discovery: Calling LLM for ${destination} with activities: ${activityTypes.join(', ')}`);
    if (customActivities.length > 0) {
      console.log(`Area discovery: Custom activities: ${customActivities.join(', ')}`);
    }
    const llmData = await discoverAreasWithLLM(destination, activityTypes, customActivities, tripLength);
    console.log(`Area discovery: LLM returned ${llmData.length} areas`);

    // Also try Reddit for real user experiences (but don't block on it)
    let redditData: any[] = [];
    let fromCache = false;

    if (now - lastSearch < SEARCH_COOLDOWN_MS) {
      console.log(`Area discovery: Using cached Reddit data for ${destination} (cooldown)`);
      fromCache = true;
    } else {
      searchTimestamps.set(destKey, now);
      console.log(`Area discovery: Searching Reddit for ${destination}`);

      try {
        const subredditsToSearch = selectedSubreddits && selectedSubreddits.length > 0
          ? selectedSubreddits
          : undefined;
        console.log(`Area discovery: Searching subreddits: ${subredditsToSearch?.join(', ') || 'default'}`);
        const recommendations = await searchAreaRecommendations(destination, activityTypes, subredditsToSearch);
        console.log(`Area discovery: Found ${recommendations.length} areas from Reddit`);

        if (recommendations.length > 0) {
          redditData = convertRedditDataToAreaFormat(recommendations);
        }
      } catch (redditError) {
        console.error('Reddit search failed:', redditError);
      }
    }

    // Merge LLM and Reddit data, prioritizing Reddit when available
    const mergedData = [...redditData];

    // Add LLM areas that weren't found in Reddit
    for (const llmArea of llmData) {
      const areaName = llmArea.mentionedAreas[0]?.name?.toLowerCase();
      const existsInReddit = redditData.some(rd =>
        rd.mentionedAreas?.some((ma: any) =>
          ma.name.toLowerCase().includes(areaName) || areaName?.includes(ma.name.toLowerCase())
        )
      );

      if (!existsInReddit) {
        mergedData.push(llmArea);
      }
    }

    console.log(`Area discovery: Merged ${mergedData.length} total areas (${redditData.length} Reddit + ${llmData.length} LLM)`);

    // Use merged data for discovery
    const combinedData = mergedData;

    // Build full preferences with defaults
    // Ensure destination context includes the canonicalName and rawInput
    const destContext = preferences.destinationContext || {
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
    // Ensure canonicalName is set for backwards compatibility
    if (destContext && !destContext.canonicalName) {
      (destContext as any).canonicalName = destination;
    }
    if (destContext && !destContext.rawInput) {
      (destContext as any).rawInput = destination;
    }

    const fullPreferences: TripPreferences = {
      destinationContext: destContext as any,
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

    // Add evidence to areas (prefer Reddit evidence, fall back to LLM note)
    const areasWithEvidence = areasWithHotelData.map(area => {
      // Find matching Reddit data
      const matchingReddit = combinedData.find(
        rd => !rd.llmGenerated && rd.mentionedAreas?.some((ma: any) =>
          ma.name.toLowerCase() === area.name.toLowerCase()
        )
      );

      // Find matching LLM data
      const matchingLLM = combinedData.find(
        rd => rd.llmGenerated && rd.mentionedAreas?.some((ma: any) =>
          ma.name.toLowerCase() === area.name.toLowerCase()
        )
      );

      let evidence: RedditEvidence[] = [];

      if (matchingReddit?.evidence) {
        evidence = matchingReddit.evidence.map((e: any) => ({
          postUrl: `https://reddit.com/r/${e.subreddit}`,
          subreddit: e.subreddit,
          postTitle: matchingReddit.title,
          upvotes: e.score || matchingReddit.upvotes,
          quote: e.snippet,
          fetchedAt: new Date(),
        }));
      }

      // Add LLM best-for info to area if available
      const llmBestFor = matchingLLM?.bestFor || [];

      return {
        ...area,
        evidence: evidence.length > 0 ? evidence : area.evidence,
        bestFor: area.bestFor.length > 0 ? area.bestFor : llmBestFor,
        sourceNote: matchingReddit ? 'Reddit + AI' : 'AI recommendation',
      };
    });

    // Generate split options
    const splitOptions = generateSplitOptions(areasWithEvidence as any, fullPreferences);

    return NextResponse.json({
      areas: areasWithEvidence as any,
      splitOptions,
      redditPostCount: redditData.length,
      llmAreasCount: llmData.length,
      fromCache,
      excludedAreas, // Areas excluded due to no hotel availability
      debug: {
        destination,
        redditAreasFound: redditData.length,
        llmAreasFound: llmData.length,
        mergedAreasCount: combinedData.length,
        areasDiscovered: areas.length,
        areasValidated: areasWithHotelData.length,
        areasExcluded: excludedAreas.length,
        areasReturned: areasWithEvidence.length,
        splitsGenerated: splitOptions.length,
      },
    });
  } catch (error) {
    console.error('Area discovery error:', error);
    return NextResponse.json(
      { error: 'Failed to discover areas', details: String(error) },
      { status: 500 }
    );
  }
}
