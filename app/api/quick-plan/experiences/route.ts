/**
 * Quick Plan Experiences API
 * Fetches experiences/tours by activity type, near the user's selected hotels
 */

import { NextRequest, NextResponse } from 'next/server';
import { placesCache, CACHE_TTL, createCacheKey, fetchWithTimeout } from '@/lib/api-cache';
import { calculateHaversineDistance } from '@/lib/utils/geo';
import {
  experiencesPostSchema,
  validateRequestBody,
  isValidCoordinate,
} from '@/lib/api-validation';

const GOOGLE_MAPS_BASE_URL = 'https://maps.googleapis.com/maps/api';
const GOOGLE_API_TIMEOUT = 15000; // 15 second timeout

// Maximum distance from hotel to consider an experience (in meters)
const MAX_DISTANCE_METERS = 25000; // 25km - reasonable for tours/experiences

// Place types to ALWAYS exclude from experience/activity searches
// These are Google Place types, not name strings
// See: https://developers.google.com/maps/documentation/places/web-service/place-types
const EXCLUDED_PLACE_TYPES = [
  'lodging',              // Hotels, motels, resorts, B&Bs
  'real_estate_agency',
  'insurance_agency',
  'accounting',
  'lawyer',
  'bank',
  'atm',
  'local_government_office',
  'car_rental',           // Excludes ATV rentals from horseback searches
  'car_dealer',
  'pet_store',            // Exclude pet stores from wildlife/nature searches
  'veterinary_care',      // Exclude vet clinics
];

// Name patterns to EXCLUDE from results (case-insensitive regex)
const EXCLUDED_NAME_PATTERNS = [
  // Pet-related (for wildlife/nature searches)
  /\bpet\b/i,
  /\bpets\b/i,
  /pet\s*(shop|store|supply|grooming)/i,
  /\bveterinar/i,
  /\bvet\s*clinic/i,
  /animal\s*hospital/i,
  /dog\s*(grooming|boarding|kennel|daycare|training)/i,
  /cat\s*(boarding|kennel|cafe)/i,
  /\bpuppy\b/i,
  /\bkitten\b/i,
  /\bpet\s*food/i,
  /\bpet\s*supplies/i,
  /\banimal\s*feed/i,
  /\baquarium\s*(store|shop|supplies)/i,

  // Retail/commercial (not tours)
  /\bsupermarket\b/i,
  /\bgrocery\b/i,
  /\bdepartment\s*store\b/i,
  /\bshopping\s*(mall|center|centre)\b/i,
  /\bwholesale\b/i,
  /\bwarehouse\b/i,
  /\bretail\b/i,
  /\boutlet\s*(store|mall)\b/i,
  /\bdiscount\s*store\b/i,
  /\bdollar\s*store\b/i,
  /\bthrift\s*store\b/i,
  /\bhardware\s*store\b/i,
  /\belectronics\s*store\b/i,
  /\bfurniture\s*(store|shop)\b/i,
  /\bhome\s*depot\b/i,
  /\blowe'?s\b/i,
  /\bwalmart\b/i,
  /\btarget\b/i,
  /\bcostco\b/i,

  // Auto-related
  /\bcar\s*(dealer|rental|wash|repair|service)\b/i,
  /\bauto\s*(shop|repair|parts|dealer|body|glass)\b/i,
  /\btire\s*(shop|center|centre)\b/i,
  /\bmechanic\b/i,
  /\bmotor\s*vehicle/i,
  /\bsmog\s*(check|test)/i,
  /\boil\s*change/i,
  /\bparking\s*(lot|garage|structure)\b/i,
  /\btowing\b/i,
  /\bauto\s*insurance/i,
  /\bgas\s*station\b/i,
  /\bcar\s*wash\b/i,
  /\btruck\s*(rental|dealer|stop)\b/i,
  /\bmotorcycle\s*(dealer|repair|shop)\b/i,
  /\brv\s*(dealer|rental|park)\b/i,

  // Professional services
  /\binsurance\b/i,
  /\blawyer\b/i,
  /\battorney\b/i,
  /\baccountant\b/i,
  /\breal\s*estate\b/i,
  /\bdentist\b/i,
  /\bdental\b/i,
  /\bclinic\b(?!.*tour)/i, // Clinic unless "clinic tour"
  /\bhospital\b(?!.*tour)/i,
  /\bpharmacy\b/i,
  /\bmedical\s*(center|office|group)\b/i,
  /\bchiropract/i,
  /\bphysical\s*therapy/i,
  /\boptometr/i,
  /\beye\s*(doctor|care|clinic)\b/i,
  /\bhearing\s*(aid|center)\b/i,
  /\bfinancial\s*(advisor|planner|services)\b/i,
  /\btax\s*(preparation|services)\b/i,
  /\bmortgage\b/i,
  /\bcredit\s*union\b/i,

  // Generic businesses unlikely to be tours
  /\bbank\b/i,
  /\batm\b/i,
  /\bgas\s*station\b/i,
  /\bconvenience\s*store\b/i,
  /\blaundromat\b/i,
  /\bdry\s*clean/i,
  /\bpost\s*office\b/i,
  /\bfedex\b/i,
  /\bups\s*store\b/i,
  /\bstorage\s*(unit|facility)\b/i,
  /\bself\s*storage\b/i,
  /\bmoving\s*(company|service)\b/i,
  /\bcleaning\s*(service|company)\b/i,
  /\bpest\s*control\b/i,
  /\bplumb(er|ing)\b/i,
  /\belectric(ian|al\s*service)\b/i,
  /\bhvac\b/i,
  /\broofing\b/i,
  /\blandscap(e|ing)\s*(company|service)\b/i,

  // Food/drink establishments (not food tours)
  /\bfast\s*food\b/i,
  /\bmcdonald'?s\b/i,
  /\bburger\s*king\b/i,
  /\bwendy'?s\b/i,
  /\bsubway\b(?!.*tour)/i,
  /\bstarbucks\b/i,
  /\bdunkin/i,
  /\bpizza\s*(hut|delivery)\b/i,
  /\bdomino'?s\b/i,
  /\bliquor\s*store\b/i,
  /\bconvenience\b/i,

  // Education (not educational tours)
  /\belementary\s*school\b/i,
  /\bhigh\s*school\b/i,
  /\bmiddle\s*school\b/i,
  /\buniversity\b(?!.*tour)/i,
  /\bcollege\b(?!.*tour)/i,
  /\bdaycare\b/i,
  /\bpreschool\b/i,
  /\bkindergarten\b/i,
  /\btutoring\b/i,

  // Religious (unless historical tour)
  /\bchurch\b(?!.*(tour|historic|heritage))/i,
  /\bmosque\b(?!.*(tour|historic|heritage))/i,
  /\bsynagogue\b(?!.*(tour|historic|heritage))/i,

  // Lodging (should use excluded place types but catch edge cases)
  /\bmotel\b/i,
  /\bhostel\b(?!.*tour)/i,
  /\bairbnb\b/i,
  /\bvacation\s*rental\b/i,
  /\bapartment\s*(complex|rental)\b/i,

  // Additional irrelevant businesses
  /\bstorage\s*facility\b/i,
  /\bwarehouse\s*club\b/i,
  /\bjob\s*(center|agency|service)\b/i,
  /\bemployment\s*(agency|service)\b/i,
  /\bstaffing\s*agency\b/i,
  /\brecruiting\b/i,
  /\btemp\s*agency\b/i,
  /\bcall\s*center\b/i,
  /\boffice\s*(space|rental|building)\b/i,
  /\bcoworking\b/i,
  /\bindustrial\s*park\b/i,
  /\bmanufacturing\b/i,
  /\bfactory\b(?!.*tour)/i,
  /\bprint\s*(shop|service)\b/i,
  /\bcopy\s*(center|shop)\b/i,
  /\bnotary\b/i,
  /\btitle\s*company\b/i,
  /\bescrow\b/i,
  /\bpawn\s*shop\b/i,
  /\bcheck\s*cashing\b/i,
  /\bpayday\s*loan\b/i,
  /\brent.?a.?center\b/i,
  /\bused\s*car\b/i,
  /\bbuy\s*here\s*pay\s*here\b/i,
];

// Keywords that BOOST relevance for specific activity types
const RELEVANCE_BOOST_KEYWORDS: Record<string, string[]> = {
  surf: ['surf', 'wave', 'board', 'lesson', 'school', 'beach break', 'surfboard', 'surf camp'],
  snorkel: ['snorkel', 'reef', 'coral', 'underwater', 'marine', 'sea life', 'snorkeling', 'marine life'],
  dive: ['dive', 'scuba', 'padi', 'underwater', 'reef', 'certification', 'diving', 'diver'],
  wildlife: ['wildlife', 'safari', 'animal', 'sanctuary', 'reserve', 'watching', 'whale', 'dolphin', 'turtle', 'bird', 'nature', 'conservation'],
  nature: ['nature', 'park', 'reserve', 'forest', 'rainforest', 'jungle', 'botanical', 'garden', 'waterfall', 'eco', 'trail', 'scenic'],
  hiking: ['hike', 'hiking', 'trail', 'trek', 'trekking', 'mountain', 'summit', 'walk', 'guided hike', 'nature walk'],
  adventure: ['adventure', 'zipline', 'zip line', 'canopy', 'rafting', 'bungee', 'extreme', 'atv', 'quad', 'thrill'],
  cultural: ['heritage', 'historic', 'museum', 'cultural', 'temple', 'church', 'archaeological', 'ruins', 'old town', 'history'],
  food_tour: ['food', 'culinary', 'cooking', 'cuisine', 'tasting', 'market', 'gastronomy', 'chef', 'local food'],
  spa_wellness: ['spa', 'wellness', 'massage', 'yoga', 'meditation', 'retreat', 'hot spring', 'thermal', 'relaxation'],
  horseback: ['horse', 'horseback', 'riding', 'equestrian', 'ranch', 'stable', 'trail ride', 'horse riding'],
  boat: ['boat', 'sailing', 'cruise', 'catamaran', 'yacht', 'ferry', 'sunset', 'charter', 'vessel', 'maritime'],
  fishing: ['fishing', 'charter', 'angler', 'sport fish', 'deep sea', 'fishing trip', 'catch'],
  swimming: ['swim', 'swimming', 'pool', 'beach', 'lagoon', 'cenote'],
  beach: ['beach', 'shore', 'coast', 'seaside', 'oceanfront', 'beachfront'],
  golf: ['golf', 'course', 'links', 'fairway', 'driving range', 'tee'],
  photography: ['photo', 'photography', 'scenic', 'viewpoint', 'landscape', 'sunrise', 'sunset'],
  nightlife: ['night', 'club', 'bar', 'lounge', 'dance', 'entertainment', 'live music'],
  kids_activities: ['kids', 'children', 'family', 'child', 'playground', 'educational'],
  water_park: ['water park', 'slide', 'splash', 'aqua', 'wave pool'],
};

// Activity-specific exclusion patterns - things that should NOT match for specific activities
const ACTIVITY_SPECIFIC_EXCLUSIONS: Record<string, RegExp[]> = {
  wildlife: [
    /\bpet\b/i,
    /\bpets\b/i,
    /pet\s*store/i,
    /pet\s*shop/i,
    /\bveterinar/i,
    /animal\s*(hospital|clinic)/i,
    /\bkennel/i,
    /\bgrooming/i,
    /\bpuppy/i,
    /\bkitten/i,
    /\baquarium\s*(store|shop|supplies)/i,
    /fish\s*(store|shop|tank)/i,
  ],
  nature: [
    /\bpet\b/i,
    /\bgarden\s*(center|centre|supply|store)/i,
    /\bnursery\b(?!.*botanical)/i,
    /\bhome\s*improvement/i,
    /\blandscap(e|ing)\s*(company|service|supply)/i,
  ],
  horseback: [
    /\batv/i,
    /\bquad\b/i,
    /\bbuggy/i,
    /\bmotorcycle/i,
    /\bbike\s*rental/i,
    /\bcar\s*rental/i,
    /\bvehicle/i,
    /horse\s*(feed|supply|equipment|tack)\s*(store|shop)/i,
  ],
  surf: [
    /\bkitesurf/i, // Keep kitesurfing separate if searching for regular surf
    /\bwindsurf/i,
    /surf\s*(shop|store)\b(?!.*(lesson|school|rental))/i, // Exclude surf shops unless they offer lessons
  ],
  dive: [
    /\bdive\s*(bar|restaurant|pub)/i, // "Dive bar" is slang for a certain type of bar
    /\bdive\s*(shop|store|gear|equipment)\b(?!.*(tour|lesson|certification|center|centre))/i,
  ],
  food_tour: [
    /\bfast\s*food/i,
    /\bfood\s*court/i,
    /\bgrocery/i,
    /\bsupermarket/i,
    /\bfood\s*(truck|stand|cart)\b(?!.*tour)/i,
  ],
  spa_wellness: [
    /\bnail\s*salon\b/i,
    /\bhair\s*salon\b/i,
    /\bbarber/i,
    /\btattoo/i,
    /\bbeauty\s*supply/i,
  ],
  boat: [
    /\bboat\s*(repair|service|storage|dealer|sales)/i,
    /\bmarina\b(?!.*tour)/i,
    /\bdock\s*(repair|service)/i,
  ],
  fishing: [
    /\bfishing\s*(tackle|gear|supply|store|shop)\b(?!.*charter)/i,
    /\bbait\s*(shop|store)/i,
  ],
  cultural: [
    /\bgift\s*shop\b/i,
    /\bsouvenir/i,
    /\bantique\s*(store|shop|mall)\b(?!.*tour)/i,
  ],
  hiking: [
    /\bhiking\s*(gear|equipment|store|shop)\b/i,
    /\boutdoor\s*(store|shop|retail)\b/i,
    /\brei\b(?!.*tour)/i,
    /\bcamping\s*(store|supply|gear)\b/i,
  ],
  snorkel: [
    /\bsnorkel\s*(gear|equipment|store|shop|rental)\b(?!.*(tour|trip))/i,
    /\bdive\s*(shop|store)\b(?!.*(tour|lesson|certification))/i,
  ],
  golf: [
    /\bgolf\s*(shop|store|equipment|pro\s*shop)\b(?!.*(course|club|lesson))/i,
  ],
  swimming: [
    /\bswim\s*(shop|store|gear|wear)\b/i,
    /\bpool\s*(supply|store|maintenance|service)\b/i,
  ],
  beach: [
    /\bbeach\s*(shop|store|gear|rental)\b(?!.*(club|resort))/i,
    /\bsunglasses\s*(shop|store)\b/i,
  ],
  adventure: [
    /\badventure\s*(gear|store|shop|equipment)\b(?!.*(tour|park))/i,
  ],
  photography: [
    /\bcamera\s*(store|shop|repair)\b/i,
    /\bphoto\s*(print|lab|studio)\b(?!.*tour)/i,
  ],
  nightlife: [
    /\bliquor\s*store\b/i,
    /\bwine\s*(store|shop)\b(?!.*tasting)/i,
    /\bbeer\s*(store|shop|distributor)\b/i,
  ],
};

// FIX 2.8: Consistent relevance thresholds
const RELEVANCE_THRESHOLD_MIN = 35;  // Minimum to even consider
const RELEVANCE_THRESHOLD_GOOD = 50; // Preferred threshold for high-quality results

/**
 * Calculate relevance score for an experience based on activity type
 * Higher score = more relevant to what user is looking for
 */
function calculateRelevanceScore(place: any, activityType: string): number {
  let score = 50; // Base score
  const nameLower = (place.name || '').toLowerCase();
  const typesStr = (place.types || []).join(' ').toLowerCase();
  const addressLower = (place.formatted_address || place.vicinity || '').toLowerCase();

  // Track if we found any activity-specific keywords (important for relevance)
  let foundActivityKeyword = false;

  // Boost for relevant keywords in name
  const boostKeywords = RELEVANCE_BOOST_KEYWORDS[activityType] || [];
  for (const keyword of boostKeywords) {
    if (nameLower.includes(keyword)) {
      score += 15;
      foundActivityKeyword = true;
    }
    if (typesStr.includes(keyword)) {
      score += 10;
      foundActivityKeyword = true;
    }
  }

  // Boost for "tour" or "experience" in name (indicates actual tour operator)
  if (nameLower.includes('tour') || nameLower.includes('excursion') || nameLower.includes('adventure')) {
    score += 20;
    foundActivityKeyword = true;
  }

  // Additional strong indicators of tour/experience businesses
  if (nameLower.includes('lesson') || nameLower.includes('school') || nameLower.includes('class')) {
    score += 15;
    foundActivityKeyword = true;
  }
  if (nameLower.includes('guided') || nameLower.includes('charter') || nameLower.includes('expedition')) {
    score += 15;
    foundActivityKeyword = true;
  }

  // Penalize if no activity-specific keywords found - likely not relevant
  if (!foundActivityKeyword) {
    score -= 25;
  }

  // Boost for high ratings (quality indicator)
  if (place.rating >= 4.5) score += 15;
  else if (place.rating >= 4.0) score += 10;
  else if (place.rating >= 3.5) score += 5;
  else if (place.rating < 3.0) score -= 20;
  else if (!place.rating) score -= 15; // No rating is suspicious

  // Boost for many reviews (established business)
  if (place.user_ratings_total >= 1000) score += 15;
  else if (place.user_ratings_total >= 500) score += 10;
  else if (place.user_ratings_total >= 100) score += 5;
  else if (place.user_ratings_total < 10) score -= 15; // Very few reviews is suspicious
  else if (!place.user_ratings_total) score -= 20; // No reviews at all

  // Penalize if types suggest retail/commercial
  const retailTypes = ['store', 'shop', 'shopping', 'supermarket', 'mall', 'clothing_store', 'shoe_store', 'jewelry_store'];
  if (retailTypes.some(t => typesStr.includes(t))) {
    score -= 30;
  }

  // Penalize generic place types
  if (place.types?.includes('point_of_interest') && place.types?.length <= 2) {
    score -= 15; // Very generic, likely not a real tour
  }

  // Penalize establishment-only types (generic businesses)
  if (place.types?.includes('establishment') && place.types?.length <= 2) {
    score -= 15;
  }

  // Boost for tour-related place types
  const tourTypes = ['travel_agency', 'tourist_attraction', 'park', 'natural_feature', 'museum', 'aquarium', 'zoo', 'amusement_park'];
  if (tourTypes.some(t => place.types?.includes(t))) {
    score += 15;
  }

  // Penalize addresses that suggest commercial/industrial areas
  const commercialIndicators = ['suite', 'unit', 'floor', 'building', 'plaza', 'mall', 'center', 'office'];
  if (commercialIndicators.some(ind => addressLower.includes(ind))) {
    score -= 10;
  }

  // Boost for nature/outdoor addresses
  const outdoorIndicators = ['beach', 'park', 'harbor', 'marina', 'pier', 'bay', 'reef', 'island', 'mountain', 'trail'];
  if (outdoorIndicators.some(ind => addressLower.includes(ind))) {
    score += 10;
  }

  return Math.max(0, Math.min(100, score));
}

export async function POST(request: NextRequest) {
  try {
    // Validate request body using Zod schema
    const validationResult = await validateRequestBody(request, experiencesPostSchema);
    if (!validationResult.success) {
      return validationResult.error;
    }

    const {
      activityTypes,
      destination,
      hotels,
      areas,
    } = validationResult.data;

    console.log('[Experiences API] Request:', {
      activityTypes,
      destination,
      hotelCount: Object.keys(hotels || {}).length,
      areasCount: areas?.length,
    });

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('[Experiences API] No Google Maps API key configured');
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    // Build hotel coordinates list for proximity filtering
    const hotelCoords: { areaId: string; areaName: string; lat: number; lng: number }[] = [];
    for (const area of areas || []) {
      const hotel = hotels?.[area.id];
      if (hotel?.lat && hotel?.lng && isValidCoordinate(hotel.lat, hotel.lng)) {
        hotelCoords.push({
          areaId: area.id,
          areaName: area.name,
          lat: hotel.lat,
          lng: hotel.lng,
        });
      } else if (area.centerLat && area.centerLng && isValidCoordinate(area.centerLat, area.centerLng)) {
        hotelCoords.push({
          areaId: area.id,
          areaName: area.name,
          lat: area.centerLat,
          lng: area.centerLng,
        });
      } else {
        console.warn(`[Experiences API] Invalid coordinates for area ${area.name}: hotel=(${hotel?.lat}, ${hotel?.lng}), center=(${area.centerLat}, ${area.centerLng})`);
      }
    }

    console.log('[Experiences API] Hotel coordinates:', hotelCoords);

    if (hotelCoords.length === 0) {
      console.warn('[Experiences API] No hotel/area coordinates available');
      return NextResponse.json({
        experiencesByType: {},
        totalCount: 0,
        error: 'No location coordinates available',
      });
    }

    // Activity type to Google Places search terms - MORE SPECIFIC to avoid mismatches
    const activitySearchTerms: Record<string, string[]> = {
      surf: ['surf lessons', 'surf school', 'learn to surf'],
      snorkel: ['snorkeling tour', 'snorkel reef excursion', 'snorkeling trip'],
      dive: ['scuba diving center', 'PADI diving', 'dive certification'],
      swimming: ['swimming beach', 'natural swimming pool', 'beach club swimming'],
      wildlife: [
        'wildlife sanctuary tour',
        'wildlife watching tour',
        'animal sanctuary visit',
        'wildlife reserve tour',
        'safari tour',
        'whale watching tour',
        'dolphin watching tour',
        'turtle nesting tour',
        'bird watching tour',
      ],
      nature: [
        'nature reserve tour',
        'national park tour',
        'rainforest tour',
        'botanical garden',
        'nature trail guided',
        'eco tour nature',
        'waterfall tour',
        'jungle tour',
      ],
      hiking: ['hiking trail guided', 'nature hike tour', 'rainforest hike', 'volcano hike'],
      adventure: ['zip line canopy tour', 'atv tour adventure', 'white water rafting', 'bungee jumping'],
      cultural: ['historical walking tour', 'museum tour', 'heritage site tour', 'archaeological site'],
      food_tour: ['food walking tour', 'culinary tour local', 'cooking class cuisine', 'market food tour'],
      nightlife: ['nightclub', 'bar crawl tour', 'night entertainment district'],
      beach: ['beach club day pass', 'beach resort activities', 'beach rental'],
      spa_wellness: ['spa resort', 'wellness retreat', 'hot springs', 'yoga retreat'],
      golf: ['golf course', 'golf club', 'golf resort'],
      photography: ['photo tour', 'photography safari', 'scenic viewpoint tour'],
      horseback: ['horseback riding trail', 'horse riding tour beach'],
      boat: ['boat tour', 'sailing cruise', 'catamaran tour', 'sunset cruise'],
      fishing: ['fishing charter', 'sport fishing tour', 'deep sea fishing'],
      // Family-friendly categories
      kids_activities: ['family activities', 'kids tour', 'children activities', 'family adventure park'],
      water_park: ['water park', 'aqua park', 'water slides'],
    };

    const results: Record<string, any[]> = {};

    // FIX 2.7: Valid activity types for validation
    const VALID_ACTIVITY_TYPES = Object.keys(activitySearchTerms);

    // =================================================================
    // PARALLELIZED: Process all activity types concurrently using Promise.all
    // =================================================================
    console.log(`[Experiences API] Processing ${activityTypes.length} activity types in parallel`);

    const activityResults = await Promise.all(activityTypes.map(async (activityType) => {
      // Warn for unknown activity types but still process with generic search
      if (!VALID_ACTIVITY_TYPES.includes(activityType)) {
        console.warn(`[Experiences API] Unknown activity type: ${activityType}, using generic search`);
      }

      const searchTerms = activitySearchTerms[activityType] || [`${activityType} tour`, `${activityType} experience`];
      const allExperiences: any[] = [];
      const seenPlaceIds = new Set<string>();

      // Parallelize searches across hotels and search terms
      const searchPromises: Promise<{ hotel: typeof hotelCoords[0]; searchTerm: string; data: any } | null>[] = [];

      for (const hotel of hotelCoords) {
        for (const searchTerm of searchTerms.slice(0, 2)) {
          searchPromises.push((async () => {
            try {
              const searchQuery = `${searchTerm} ${hotel.areaName} ${destination}`;
              const cacheKey = createCacheKey('places-experiences', {
                query: searchQuery,
                lat: hotel.lat.toFixed(2),
                lng: hotel.lng.toFixed(2),
              });

              // Check cache first
              let data = placesCache.get<any>(cacheKey);

              if (!data) {
                const params = new URLSearchParams({
                  query: searchQuery,
                  key: apiKey,
                  location: `${hotel.lat},${hotel.lng}`,
                  radius: String(MAX_DISTANCE_METERS),
                });

                const response = await fetchWithTimeout(
                  `${GOOGLE_MAPS_BASE_URL}/place/textsearch/json?${params}`,
                  {},
                  GOOGLE_API_TIMEOUT
                );

                if (response.ok) {
                  data = await response.json();
                  // Cache the response
                  placesCache.set(cacheKey, data, CACHE_TTL.EXPERIENCES);
                }
              }

              return { hotel, searchTerm, data };
            } catch (error) {
              console.error(`[Experiences API] Search failed for ${searchTerm}:`, error);
              return null;
            }
          })());
        }
      }

      // Wait for all searches to complete
      const searchResults = await Promise.all(searchPromises);

      // Process results
      for (const result of searchResults) {
        if (!result || !result.data?.results) continue;

        const { hotel, data } = result;
        for (const place of data.results) {
          if (place.place_id && !seenPlaceIds.has(place.place_id)) {
            seenPlaceIds.add(place.place_id);

            // Skip places with excluded types (like lodging/hotels, car rentals, pet stores)
            const placeTypes: string[] = place.types || [];
            const excludedTypes = EXCLUDED_PLACE_TYPES.filter(t => placeTypes.includes(t));
            if (excludedTypes.length > 0) {
              continue;
            }

            // Skip places with excluded name patterns (pet stores, vet clinics, etc.)
            const placeName = place.name || '';
            const matchedPattern = EXCLUDED_NAME_PATTERNS.find(pattern => pattern.test(placeName));
            if (matchedPattern) {
              continue;
            }

            // Apply activity-specific exclusions
            const activityExclusions = ACTIVITY_SPECIFIC_EXCLUSIONS[activityType] || [];
            const activityMatchedPattern = activityExclusions.find(pattern => pattern.test(placeName));
            if (activityMatchedPattern) {
              continue;
            }

            // Validate place coordinates before using them
            const placeLat = place.geometry?.location?.lat;
            const placeLng = place.geometry?.location?.lng;

            // Skip places with invalid or missing coordinates
            if (!isValidCoordinate(placeLat, placeLng)) {
              continue;
            }

            const distance = calculateDistance(hotel.lat, hotel.lng, placeLat, placeLng);

            if (distance <= MAX_DISTANCE_METERS) {
              // Calculate relevance score for this experience
              const relevanceScore = calculateRelevanceScore(place, activityType);

              // FIX 2.8: Skip low-relevance results using consistent threshold
              if (relevanceScore < RELEVANCE_THRESHOLD_MIN) {
                continue;
              }

              allExperiences.push({
                id: place.place_id,
                placeId: place.place_id,
                name: place.name,
                address: place.formatted_address || place.vicinity || '',
                googleMapsUrl: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
                activityType: formatActivityLabel(activityType),
                googleRating: place.rating || 0,
                reviewCount: place.user_ratings_total || 0,
                priceLevel: place.price_level || 2,
                imageUrl: place.photos?.[0]?.photo_reference
                  ? `/api/photo-proxy?ref=${encodeURIComponent(place.photos[0].photo_reference)}&maxwidth=400`
                  : '/images/activity-placeholder.svg',
                lat: placeLat || 0,
                lng: placeLng || 0,
                reasons: generateReasons(place, distance, hotel.areaName),
                nearArea: hotel.areaName,
                distanceFromHotel: Math.round(distance / 1000 * 10) / 10,
                relevanceScore, // Include for sorting
              });
            }
          }
        }
      }

      console.log(`[Experiences API] Found ${allExperiences.length} ${activityType} experiences after filtering`);

      // Sort by relevance score (primary), then rating, then distance
      allExperiences.sort((a, b) => {
        // Primary: relevance score
        const relevanceDiff = (b.relevanceScore || 0) - (a.relevanceScore || 0);
        if (Math.abs(relevanceDiff) > 10) return relevanceDiff;

        // Secondary: rating
        const ratingDiff = (b.googleRating || 0) - (a.googleRating || 0);
        if (Math.abs(ratingDiff) > 0.3) return ratingDiff;

        // Tertiary: distance
        return (a.distanceFromHotel || 999) - (b.distanceFromHotel || 999);
      });

      // FIX 2.8: Use consistent thresholds and add quality tier indicator
      // Filter into quality tiers
      const highQuality = allExperiences.filter(e => e.relevanceScore >= RELEVANCE_THRESHOLD_GOOD);
      const mediumQuality = allExperiences.filter(e =>
        e.relevanceScore >= RELEVANCE_THRESHOLD_MIN &&
        e.relevanceScore < RELEVANCE_THRESHOLD_GOOD
      );

      console.log(`[Experiences API] ${activityType}: ${highQuality.length} high-quality, ${mediumQuality.length} medium-quality results`);

      // Prioritize high-quality results - only include medium-quality if we don't have enough high-quality
      // If we have 4+ high-quality results, don't include any medium-quality
      const MIN_HIGH_QUALITY_THRESHOLD = 4;
      const MAX_RESULTS = 8;

      let finalResults: any[];
      if (highQuality.length >= MIN_HIGH_QUALITY_THRESHOLD) {
        // We have enough high-quality results, use only those
        finalResults = highQuality.slice(0, MAX_RESULTS);
        console.log(`[Experiences API] ${activityType}: Using ${finalResults.length} high-quality results only`);
      } else {
        // Not enough high-quality, supplement with medium-quality
        const highQualityToUse = highQuality.slice(0, MAX_RESULTS);
        const mediumSlotsAvailable = MAX_RESULTS - highQualityToUse.length;
        const mediumQualityToUse = mediumQuality.slice(0, mediumSlotsAvailable);
        finalResults = [...highQualityToUse, ...mediumQualityToUse];
        console.log(`[Experiences API] ${activityType}: Using ${highQualityToUse.length} high + ${mediumQualityToUse.length} medium quality results`);
      }

      // Add quality tier indicator to results
      const mappedResults = finalResults.map(exp => ({
        ...exp,
        qualityTier: exp.relevanceScore >= RELEVANCE_THRESHOLD_GOOD ? 'high' : 'medium',
      }));

      console.log(`[Experiences API] Returning ${mappedResults.length} quality results for ${activityType}`);
      return { activityType, experiences: mappedResults };
    }));

    // Collect results from parallel execution
    for (const { activityType, experiences } of activityResults) {
      results[activityType] = experiences;
    }

    const response = NextResponse.json({
      experiencesByType: results,
      totalCount: Object.values(results).reduce((sum, arr) => sum + arr.length, 0),
      success: true,
    });

    // Add cache headers - experiences data can be cached for 5 minutes
    // with stale-while-revalidate for 10 minutes
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Experiences API] Error:', errorMessage, error);

    // Check for specific error types
    if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
      return NextResponse.json({
        error: 'TIMEOUT_ERROR',
        message: 'The experience search took too long. Please try again.',
        experiencesByType: {},
        totalCount: 0,
      }, { status: 504 });
    }

    // Return a graceful degradation response
    return NextResponse.json({
      error: 'FETCH_ERROR',
      message: 'We had trouble finding experiences. Please try again.',
      experiencesByType: {},
      totalCount: 0,
    }, { status: 500 });
  }
}

// Distance in meters using centralized Haversine utility
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  return calculateHaversineDistance(lat1, lng1, lat2, lng2) * 1000; // Convert km to meters
}

function formatActivityLabel(activity: string): string {
  const labels: Record<string, string> = {
    surf: 'Surfing',
    snorkel: 'Snorkeling',
    dive: 'Scuba Diving',
    swimming: 'Swimming',
    wildlife: 'Wildlife',
    nature: 'Nature',
    hiking: 'Hiking',
    adventure: 'Adventure',
    cultural: 'Cultural',
    food_tour: 'Food Tour',
    nightlife: 'Nightlife',
    beach: 'Beach',
    spa_wellness: 'Spa & Wellness',
    golf: 'Golf',
    photography: 'Photography',
    horseback: 'Horseback Riding',
    boat: 'Boat Tours',
    fishing: 'Fishing',
    kids_activities: 'Kids Activities',
    water_park: 'Water Parks',
  };
  return labels[activity] || activity;
}

function generateReasons(place: any, distance: number, areaName?: string): string[] {
  const reasons: string[] = [];

  if (place.rating >= 4.5) {
    reasons.push(`Highly rated (${place.rating}/5)`);
  } else if (place.rating >= 4.0) {
    reasons.push(`Well-reviewed (${place.rating}/5)`);
  }

  if (place.user_ratings_total > 500) {
    reasons.push('Very popular');
  } else if (place.user_ratings_total > 100) {
    reasons.push('Popular with travelers');
  }

  const distanceKm = distance / 1000;
  const hotelRef = areaName ? `${areaName} hotel` : 'hotel';
  if (distanceKm <= 2) {
    reasons.push(`Walking distance from ${hotelRef}`);
  } else if (distanceKm <= 5) {
    reasons.push(`Short drive from ${hotelRef}`);
  } else if (distanceKm <= 15) {
    reasons.push(`${Math.round(distanceKm)} km from ${hotelRef}`);
  } else {
    reasons.push(`${Math.round(distanceKm)} km away`);
  }

  return reasons;
}
