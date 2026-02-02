/**
 * Area Discovery Engine
 * Uses Reddit data and Google Places to find best areas for trip preferences
 */

import {
  TripPreferences,
  AreaCandidate,
  Evidence,
  ActivityIntent,
} from '@/types/quick-plan';

// Area scoring weights
const SCORING_WEIGHTS = {
  activityMatch: 0.35,
  redditMentions: 0.25,
  redditSentiment: 0.2,
  vibeMatch: 0.1,
  logistics: 0.1,
};

// Activity type to area characteristic mapping
const ACTIVITY_AREA_REQUIREMENTS: Record<string, string[]> = {
  surf: ['surf_breaks', 'wave_beach', 'surf_school'],
  beach: ['beach', 'sandy_beach', 'calm_water'],
  snorkel: ['reef', 'marine_reserve', 'calm_water', 'clear_water'],
  diving: ['dive_sites', 'reef', 'deep_water'],
  hiking: ['mountains', 'trails', 'nature_reserve', 'national_park'],
  adventure: ['jungle', 'mountains', 'outdoor_activities'],
  nightlife: ['bars', 'clubs', 'downtown', 'resort_strip'],
  golf: ['golf_course', 'resort'],
  spa: ['spa', 'resort', 'wellness'],
  swimming: ['beach', 'pool', 'calm_water'],
  kayak: ['bay', 'lagoon', 'mangroves', 'calm_water'],
  paddleboard: ['bay', 'lagoon', 'calm_water'],
  food_tour: ['local_restaurants', 'downtown', 'food_scene'],
  shopping: ['downtown', 'resort_area', 'markets'],
  culture: ['historic_center', 'museums', 'local_towns'],
};

// Vibe to area characteristic mapping
const VIBE_AREA_MAPPING: Record<string, string[]> = {
  relaxed: ['quiet', 'secluded', 'boutique', 'intimate'],
  lively: ['resort_strip', 'downtown', 'nightlife', 'busy'],
  adventurous: ['jungle', 'mountains', 'off_beaten_path'],
  romantic: ['boutique', 'secluded', 'sunset_views', 'intimate'],
  family: ['resort', 'all_inclusive', 'pools', 'kids_activities'],
  luxury: ['luxury_resort', 'exclusive', 'five_star'],
  budget: ['hostel_area', 'local_town', 'affordable'],
  authentic: ['local_town', 'off_beaten_path', 'traditional'],
};

// Budget indicators for areas
const LUXURY_INDICATORS = ['luxury', 'exclusive', 'upscale', 'five_star', 'luxury_resort', 'high_end'];
const BUDGET_INDICATORS = ['budget', 'affordable', 'hostel', 'hostel_area', 'backpacker', 'local_town'];
const MID_RANGE_INDICATORS = ['resort', 'all_inclusive', 'boutique'];

/**
 * Calculate budget fit score based on area characteristics and user budget
 */
function calculateBudgetFit(
  area: { characteristics: string[]; vibe: string[] },
  budgetPerNight?: { min: number; max: number }
): number {
  if (!budgetPerNight) return 0.5; // Neutral if no budget specified

  const budgetMid = (budgetPerNight.min + budgetPerNight.max) / 2;
  const allTraits = [...(area.characteristics || []), ...(area.vibe || [])].map(t => t.toLowerCase());

  // Count indicators
  const luxuryCount = allTraits.filter(t => LUXURY_INDICATORS.some(l => t.includes(l))).length;
  const budgetCount = allTraits.filter(t => BUDGET_INDICATORS.some(b => t.includes(b))).length;
  const midCount = allTraits.filter(t => MID_RANGE_INDICATORS.some(m => t.includes(m))).length;

  // Estimate area price tier
  let estimatedTier: 'budget' | 'mid' | 'luxury' = 'mid';
  if (luxuryCount > budgetCount && luxuryCount > midCount) {
    estimatedTier = 'luxury';
  } else if (budgetCount > luxuryCount && budgetCount >= midCount) {
    estimatedTier = 'budget';
  }

  // Match tier to user budget
  if (budgetMid >= 400) {
    // High budget - luxury areas fit well
    return estimatedTier === 'luxury' ? 1.0 : estimatedTier === 'mid' ? 0.7 : 0.5;
  } else if (budgetMid >= 150) {
    // Mid-range budget - mid areas fit well, luxury still OK
    return estimatedTier === 'mid' ? 1.0 : estimatedTier === 'budget' ? 0.8 : 0.6;
  } else {
    // Budget traveler - budget areas fit well
    return estimatedTier === 'budget' ? 1.0 : estimatedTier === 'mid' ? 0.6 : 0.3;
  }
}

// Comprehensive area database with activity mappings
// Based on expert knowledge of what areas are best for each activity type
const DESTINATION_AREAS: Record<string, Array<{
  name: string;
  type: 'town' | 'beach' | 'region' | 'neighborhood';
  characteristics: string[];
  description: string;
  bestFor: string[];
  notIdealFor?: string[];
  vibe: string[];
}>> = {
  'dominican republic': [
    // SURFING - Primary surf destinations
    { name: 'Cabarete', type: 'beach', characteristics: ['surf_breaks', 'kiteboarding', 'nightlife', 'beach', 'adventure'], description: 'The DR\'s surf capital with Playa Encuentro - the best and most consistent waves in the country. Great surf schools, beach bars, and adventure sports hub.', bestFor: ['surf', 'beach', 'adventure', 'nightlife', 'water_sports'], notIdealFor: ['snorkel', 'spa_wellness'], vibe: ['adventurous', 'lively', 'young'] },
    { name: 'Macao Beach', type: 'beach', characteristics: ['surf_breaks', 'beach', 'beginner_surf'], description: 'Best beginner surf spot near Punta Cana. Consistent waves and several surf schools. Easy access from resort areas.', bestFor: ['surf', 'beach', 'adventure'], vibe: ['adventurous', 'accessible'] },

    // SNORKELING/DIVING - Best underwater experiences
    { name: 'Bayahibe', type: 'town', characteristics: ['reef', 'diving', 'clear_water', 'calm_water', 'boat_trips'], description: 'The DR\'s snorkeling and diving capital. Gateway to Isla Saona and Catalina with the best reef access in the country.', bestFor: ['snorkel', 'diving', 'beach', 'swimming'], vibe: ['relaxed', 'nature'] },
    { name: 'Isla Catalina', type: 'beach', characteristics: ['reef', 'clear_water', 'day_trip', 'snorkel'], description: 'Famous for "The Wall" - world-class snorkeling with vibrant coral reefs. Day trip from Bayahibe or La Romana.', bestFor: ['snorkel', 'diving', 'beach'], vibe: ['nature', 'adventure'] },

    // SAMANÁ PENINSULA - Nature and wildlife hub (includes Las Terrenas, Samaná town, Los Haitises)
    { name: 'Samaná Peninsula', type: 'region', characteristics: ['whale_watching', 'waterfalls', 'nature', 'secluded', 'jungle', 'beach', 'las_terrenas', 'el_limon'], description: 'The DR\'s nature paradise. Includes Las Terrenas (European beach town), Samaná town (whale watching Jan-Mar), El Limón waterfall, and Los Haitises National Park. Best base for nature lovers.', bestFor: ['wildlife', 'nature', 'adventure', 'hiking', 'beach', 'food_tour'], notIdealFor: ['nightlife', 'spa_wellness'], vibe: ['nature', 'adventurous', 'secluded', 'authentic'] },
    { name: 'Los Haitises', type: 'region', characteristics: ['national_park', 'mangroves', 'caves', 'birds', 'boat_tours'], description: 'Dramatic national park with mangrove forests, Taino cave art, and incredible bird watching. Day trip from Samaná Peninsula.', bestFor: ['wildlife', 'nature', 'adventure', 'cultural'], vibe: ['nature', 'adventurous'] },

    // BEACH & RELAXATION - Best beach days
    { name: 'Cap Cana', type: 'neighborhood', characteristics: ['luxury_resort', 'calm_water', 'spa', 'golf', 'upscale', 'beach'], description: 'Ultra-luxury enclave with the best spas and calmest beaches. Juanillo Beach is stunning. High-end resorts and golf.', bestFor: ['beach', 'spa_wellness', 'golf', 'swimming', 'relaxation'], vibe: ['luxury', 'relaxed', 'romantic'] },
    { name: 'Punta Cana', type: 'region', characteristics: ['beach', 'resort', 'all_inclusive', 'pools', 'family', 'spa'], description: 'Classic resort strip with endless palm-lined beaches. Maximum convenience, great spas, and easy airport access.', bestFor: ['beach', 'spa_wellness', 'swimming', 'relaxation', 'family'], vibe: ['relaxed', 'family', 'resort'] },
    { name: 'Bávaro', type: 'beach', characteristics: ['beach', 'resort', 'all_inclusive', 'calm_water', 'spa'], description: 'The main Punta Cana beach strip with pristine white sand. Calm turquoise waters and excellent resort spas.', bestFor: ['beach', 'swimming', 'spa_wellness', 'relaxation'], vibe: ['relaxed', 'family'] },
    { name: 'Isla Saona', type: 'beach', characteristics: ['postcard_beach', 'shallow_water', 'day_trip', 'natural_pools'], description: 'Postcard-perfect beaches with natural pools and shallow turquoise water. The iconic DR beach day trip.', bestFor: ['beach', 'swimming', 'snorkel'], vibe: ['relaxed', 'romantic'] },

    // ADVENTURE - Mountains and activities
    { name: 'Jarabacoa', type: 'town', characteristics: ['mountains', 'rivers', 'hiking', 'cool_climate', 'adventure', 'waterfalls'], description: 'Mountain town in the central highlands. Rafting, hiking, waterfalls, and cooler temperatures. The "Alps of the Caribbean."', bestFor: ['hiking', 'adventure', 'nature', 'wildlife'], notIdealFor: ['beach', 'snorkel'], vibe: ['adventurous', 'nature'] },

    // CULTURE & NIGHTLIFE
    { name: 'Santo Domingo', type: 'town', characteristics: ['historic_center', 'nightlife', 'museums', 'food_scene', 'colonial'], description: 'Historic capital with the oldest European city in the Americas. Colonial Zone, incredible food scene, and vibrant nightlife.', bestFor: ['cultural', 'food_tour', 'nightlife', 'shopping'], notIdealFor: ['beach', 'snorkel', 'wildlife'], vibe: ['lively', 'cultural', 'urban'] },

    // GOLF & LUXURY
    { name: 'Casa de Campo', type: 'neighborhood', characteristics: ['golf_course', 'luxury_resort', 'spa', 'marina', 'beach'], description: 'World-famous luxury resort with Teeth of the Dog golf course. Full ecosystem with spa, marina, and Altos de Chavón.', bestFor: ['golf', 'spa_wellness', 'beach', 'relaxation'], vibe: ['luxury', 'exclusive'] },
    { name: 'La Romana', type: 'town', characteristics: ['golf', 'luxury', 'beach', 'day_trips', 'snorkel_access'], description: 'Gateway to Casa de Campo and Bayahibe. Good base for mixing golf, beach, and snorkeling day trips.', bestFor: ['golf', 'beach', 'snorkel'], vibe: ['relaxed', 'upscale'] },

    // OFF THE BEATEN PATH
    { name: 'Bahía de las Águilas', type: 'beach', characteristics: ['untouched', 'remote', 'pristine', 'nature'], description: 'The most spectacular untouched beach in the DR. Remote southwest location - worth the effort for the most beautiful beach.', bestFor: ['beach', 'nature', 'adventure', 'wildlife'], notIdealFor: ['spa_wellness', 'nightlife'], vibe: ['adventurous', 'nature', 'secluded'] },
    { name: 'Puerto Plata', type: 'town', characteristics: ['historic', 'cable_car', 'mountains', 'amber', 'beach'], description: 'North coast city with colonial history, cable car to Mt. Isabel, and nearby beaches. Gateway to Cabarete.', bestFor: ['cultural', 'adventure', 'beach', 'surf'], vibe: ['authentic', 'cultural'] },
  ],
  'costa rica': [
    { name: 'Manuel Antonio', type: 'region', characteristics: ['beach', 'national_park', 'wildlife', 'jungle'], description: 'Beautiful beaches meet rainforest in this popular national park area. Monkeys, sloths, and pristine beaches.', bestFor: ['beach', 'wildlife', 'hiking'], vibe: ['nature', 'family'] },
    { name: 'Arenal', type: 'region', characteristics: ['volcano', 'hot_springs', 'adventure', 'jungle', 'spa'], description: 'Volcanic region with natural hot springs and adventure activities. Zip-lining, hiking, and relaxing spa options.', bestFor: ['adventure', 'spa_wellness', 'nature'], vibe: ['adventurous', 'romantic'] },
    { name: 'La Fortuna', type: 'town', characteristics: ['volcano', 'hot_springs', 'waterfalls', 'adventure'], description: 'Gateway town to Arenal Volcano with waterfalls and adventure tours. Great base for active exploration.', bestFor: ['adventure', 'nature', 'hiking'], vibe: ['adventurous'] },
    { name: 'Tamarindo', type: 'beach', characteristics: ['surf_breaks', 'beach', 'nightlife', 'sunset'], description: 'Popular surf town with great waves and beach vibe. Good mix of surf, nightlife, and beach days.', bestFor: ['surf', 'beach', 'nightlife'], vibe: ['lively', 'young'] },
    { name: 'Monteverde', type: 'region', characteristics: ['cloud_forest', 'wildlife', 'zip_lines', 'birds'], description: 'Misty cloud forests with incredible biodiversity. Famous for bird watching and hanging bridges.', bestFor: ['wildlife', 'hiking', 'adventure'], notIdealFor: ['beach'], vibe: ['nature', 'adventurous'] },
    { name: 'Puerto Viejo', type: 'town', characteristics: ['caribbean', 'beach', 'reggae', 'reef', 'relaxed'], description: 'Laid-back Caribbean coast with coral reefs and Afro-Caribbean culture. Chill vibes and great snorkeling.', bestFor: ['beach', 'snorkel', 'cultural'], vibe: ['relaxed', 'authentic'] },
    { name: 'Santa Teresa', type: 'beach', characteristics: ['surf', 'yoga', 'boutique', 'wellness'], description: 'Trendy surf and yoga destination on the Nicoya Peninsula. Boutique hotels and wellness retreats.', bestFor: ['surf', 'spa_wellness', 'beach'], vibe: ['relaxed', 'wellness'] },
    { name: 'Nosara', type: 'beach', characteristics: ['surf', 'yoga', 'wellness', 'nature'], description: 'Surf and wellness haven with world-class yoga retreats. More established than Santa Teresa.', bestFor: ['surf', 'spa_wellness', 'beach'], vibe: ['wellness', 'relaxed'] },
    { name: 'Tortuguero', type: 'region', characteristics: ['wildlife', 'turtles', 'canals', 'jungle'], description: 'Remote jungle canals famous for sea turtle nesting. Incredible wildlife viewing by boat.', bestFor: ['wildlife', 'nature', 'adventure'], notIdealFor: ['beach', 'convenience'], vibe: ['nature', 'adventurous'] },
    { name: 'Guanacaste', type: 'region', characteristics: ['beach', 'resort', 'dry_climate', 'golf'], description: 'Northwest coast with beautiful beaches and reliable dry season. Good mix of resorts and nature.', bestFor: ['beach', 'golf', 'relaxation'], vibe: ['relaxed', 'family'] },
  ],
  'mexico': [
    { name: 'Cancún', type: 'town', characteristics: ['beach', 'resort', 'nightlife', 'all_inclusive'], description: 'World-famous resort destination with incredible beaches and vibrant nightlife. Hotel Zone has everything.', bestFor: ['beach', 'nightlife', 'relaxation'], vibe: ['lively', 'resort'] },
    { name: 'Playa del Carmen', type: 'town', characteristics: ['beach', 'downtown', 'cenotes', 'food_scene', 'fifth_avenue'], description: 'Trendy beach town with great restaurants, shops, and nearby cenotes. More walkable than Cancún.', bestFor: ['beach', 'food_tour', 'cultural', 'nightlife'], vibe: ['lively', 'trendy'] },
    { name: 'Tulum', type: 'town', characteristics: ['ruins', 'beach', 'cenotes', 'boutique', 'wellness'], description: 'Bohemian beach town with ancient Mayan ruins and cenotes. Wellness retreats and boutique hotels.', bestFor: ['cultural', 'beach', 'spa_wellness'], vibe: ['relaxed', 'wellness', 'romantic'] },
    { name: 'Cozumel', type: 'town', characteristics: ['diving', 'reef', 'cruise_port', 'relaxed'], description: 'Island famous for world-class diving and snorkeling. More relaxed pace than mainland.', bestFor: ['diving', 'snorkel', 'beach'], vibe: ['relaxed'] },
    { name: 'Isla Mujeres', type: 'town', characteristics: ['beach', 'relaxed', 'snorkel', 'golf_carts'], description: 'Small island with beautiful beaches and laid-back vibe. Great day trip or overnight escape from Cancún.', bestFor: ['beach', 'snorkel', 'relaxation'], vibe: ['relaxed', 'romantic'] },
    { name: 'Puerto Vallarta', type: 'town', characteristics: ['beach', 'downtown', 'mountains', 'lgbtq_friendly', 'malecon'], description: 'Charming coastal city with cobblestone old town and beautiful malecon. Great food and nightlife scene.', bestFor: ['beach', 'cultural', 'nightlife', 'food_tour'], vibe: ['lively', 'romantic', 'cultural'] },
    { name: 'Cabo San Lucas', type: 'town', characteristics: ['desert', 'beach', 'fishing', 'nightlife', 'arch'], description: 'Desert meets ocean with dramatic Land\'s End arch. Great for sport fishing and party scene.', bestFor: ['beach', 'adventure', 'nightlife'], vibe: ['lively', 'adventurous'] },
    { name: 'San José del Cabo', type: 'town', characteristics: ['art', 'downtown', 'golf', 'relaxed'], description: 'Quieter sister to Cabo San Lucas with art galleries and golf. More refined and relaxed.', bestFor: ['cultural', 'golf', 'relaxation'], vibe: ['relaxed', 'cultural'] },
    { name: 'Sayulita', type: 'beach', characteristics: ['surf', 'bohemian', 'beach', 'colorful'], description: 'Colorful surf town near Puerto Vallarta. Great for beginners and has artsy, bohemian vibe.', bestFor: ['surf', 'beach', 'cultural'], vibe: ['relaxed', 'bohemian', 'young'] },
    { name: 'Holbox', type: 'town', characteristics: ['beach', 'remote', 'whale_sharks', 'car_free'], description: 'Car-free island paradise with bioluminescence and whale shark swimming (June-Sept).', bestFor: ['beach', 'wildlife', 'relaxation'], vibe: ['relaxed', 'nature', 'romantic'] },
    { name: 'Bacalar', type: 'town', characteristics: ['lagoon', 'cenotes', 'nature', 'kayak'], description: 'Stunning seven-color lagoon, perfect for kayaking and swimming. Off the beaten path.', bestFor: ['nature', 'water_sports', 'relaxation'], notIdealFor: ['beach', 'nightlife'], vibe: ['relaxed', 'nature'] },
  ],

  // FIX 3.1: Add Thailand areas
  'thailand': [
    { name: 'Bangkok', type: 'town', characteristics: ['temples', 'downtown', 'nightlife', 'food_scene', 'markets', 'shopping'], description: 'Vibrant capital with incredible temples, street food, and shopping. The Grand Palace and floating markets are must-sees.', bestFor: ['cultural', 'food_tour', 'nightlife', 'shopping'], vibe: ['lively', 'cultural', 'foodie'] },
    { name: 'Chiang Mai', type: 'town', characteristics: ['temples', 'mountains', 'old_city', 'cooking_classes', 'elephant_sanctuary', 'markets'], description: 'Northern gem with hundreds of temples, night markets, and elephant sanctuaries. Great for cooking classes and trekking.', bestFor: ['cultural', 'hiking', 'food_tour', 'spa_wellness'], vibe: ['relaxed', 'cultural', 'authentic'] },
    { name: 'Koh Phangan', type: 'town', characteristics: ['beach', 'full_moon_party', 'yoga', 'nightlife', 'wellness'], description: 'Famous for Full Moon Parties but also has amazing yoga retreats and peaceful beaches. Split personality island.', bestFor: ['beach', 'nightlife', 'spa_wellness'], vibe: ['lively', 'beach', 'party'] },
    { name: 'Koh Tao', type: 'town', characteristics: ['diving', 'beach', 'snorkeling', 'calm_water', 'dive_certification'], description: 'The Caribbean of Thailand - best and cheapest place to get dive certified. Crystal clear water and abundant marine life.', bestFor: ['diving', 'snorkel', 'beach'], vibe: ['relaxed', 'adventure', 'backpacker'] },
    { name: 'Koh Samui', type: 'town', characteristics: ['beach', 'resort', 'spa', 'family', 'luxury'], description: 'Upscale island with luxury resorts and beautiful beaches. More developed but still gorgeous.', bestFor: ['beach', 'spa_wellness', 'relaxation'], vibe: ['luxury', 'relaxed', 'family'] },
    { name: 'Krabi', type: 'region', characteristics: ['beach', 'islands', 'rock_climbing', 'nature', 'limestone_cliffs'], description: 'Gateway to stunning islands with dramatic limestone cliffs. World-class rock climbing at Railay Beach.', bestFor: ['beach', 'adventure', 'snorkel'], vibe: ['relaxed', 'adventure', 'scenic'] },
    { name: 'Railay Beach', type: 'beach', characteristics: ['rock_climbing', 'beach', 'limestone', 'boat_access'], description: 'Accessible only by boat, stunning cliffs and beaches. The rock climbing mecca of Southeast Asia.', bestFor: ['adventure', 'beach', 'climbing'], vibe: ['adventure', 'scenic', 'secluded'] },
    { name: 'Phuket', type: 'town', characteristics: ['beach', 'resort_strip', 'nightlife', 'family', 'water_sports'], description: 'Thailand\'s largest island with everything from party beaches to quiet luxury. Great infrastructure and variety.', bestFor: ['beach', 'nightlife', 'water_sports'], vibe: ['lively', 'beach', 'resort'] },
    { name: 'Pai', type: 'town', characteristics: ['mountains', 'hippie', 'nature', 'waterfalls', 'hot_springs'], description: 'Bohemian mountain town with hot springs and waterfalls. Great for motorbike trips from Chiang Mai.', bestFor: ['hiking', 'nature', 'relaxation'], vibe: ['relaxed', 'bohemian', 'nature'] },
    { name: 'Koh Lanta', type: 'town', characteristics: ['beach', 'relaxed', 'family', 'snorkel', 'quiet'], description: 'Laid-back island popular with families. Less developed and more relaxed than Phuket or Samui.', bestFor: ['beach', 'snorkel', 'relaxation'], vibe: ['relaxed', 'family', 'quiet'] },
  ],

  // FIX 3.2: Add Indonesia (Bali) areas
  'indonesia': [
    { name: 'Ubud', type: 'town', characteristics: ['temples', 'rice_terraces', 'yoga', 'art', 'wellness', 'monkey_forest'], description: 'Cultural heart of Bali with stunning rice terraces, art galleries, and yoga retreats. The Eat Pray Love destination.', bestFor: ['cultural', 'spa_wellness', 'photography'], vibe: ['relaxed', 'cultural', 'spiritual'] },
    { name: 'Seminyak', type: 'beach', characteristics: ['beach', 'boutique', 'nightlife', 'restaurants', 'trendy'], description: 'Trendy beach area with upscale boutiques, beach clubs, and restaurants. The stylish heart of Bali.', bestFor: ['beach', 'nightlife', 'shopping'], vibe: ['lively', 'trendy', 'upscale'] },
    { name: 'Canggu', type: 'beach', characteristics: ['surf', 'beach', 'hipster', 'digital_nomad', 'cafes'], description: 'Surf and digital nomad haven with great cafes and beach clubs. The cool, younger sibling to Seminyak.', bestFor: ['surf', 'beach', 'food_tour'], vibe: ['relaxed', 'young', 'surf'] },
    { name: 'Uluwatu', type: 'beach', characteristics: ['surf_breaks', 'cliffs', 'temples', 'sunset', 'advanced_surf'], description: 'Dramatic clifftop temples and world-class surf breaks. Spectacular sunsets at the temple.', bestFor: ['surf', 'cultural', 'photography'], vibe: ['adventure', 'surf', 'scenic'] },
    { name: 'Nusa Penida', type: 'town', characteristics: ['dramatic_cliffs', 'snorkel', 'manta_rays', 'day_trip', 'photography'], description: 'Instagram-famous island with dramatic cliffs and manta ray snorkeling. Kelingking Beach is iconic.', bestFor: ['snorkel', 'photography', 'adventure'], vibe: ['adventure', 'nature', 'dramatic'] },
    { name: 'Gili Islands', type: 'region', characteristics: ['beach', 'diving', 'snorkeling', 'no_cars', 'party', 'turtles'], description: 'Three car-free islands with great diving, turtle snorkeling, and laid-back vibes. Gili T has nightlife.', bestFor: ['diving', 'snorkel', 'beach'], vibe: ['relaxed', 'backpacker', 'paradise'] },
    { name: 'Sanur', type: 'beach', characteristics: ['beach', 'calm_water', 'family', 'relaxed', 'traditional'], description: 'Calm, family-friendly beach area with traditional Balinese atmosphere. Less hectic than Seminyak.', bestFor: ['beach', 'relaxation', 'cultural'], vibe: ['relaxed', 'family', 'authentic'] },
    { name: 'Nusa Dua', type: 'neighborhood', characteristics: ['luxury_resort', 'beach', 'calm_water', 'golf', 'spa'], description: 'Gated luxury resort enclave with pristine beaches and water sports. High-end and secure.', bestFor: ['beach', 'spa_wellness', 'golf'], vibe: ['luxury', 'relaxed', 'family'] },
    { name: 'Munduk', type: 'town', characteristics: ['mountains', 'waterfalls', 'hiking', 'coffee', 'nature'], description: 'Cool mountain village with waterfalls and coffee plantations. Great for trekking away from beach crowds.', bestFor: ['hiking', 'nature', 'photography'], vibe: ['nature', 'quiet', 'authentic'] },
  ],

  // FIX 3.3: Add Japan areas
  'japan': [
    { name: 'Tokyo', type: 'town', characteristics: ['downtown', 'shopping', 'food_scene', 'nightlife', 'temples', 'tech'], description: 'Mega-city with everything from ancient temples to cutting-edge tech. Incredible food and shopping.', bestFor: ['cultural', 'food_tour', 'shopping', 'nightlife'], vibe: ['lively', 'modern', 'cultural'] },
    { name: 'Kyoto', type: 'town', characteristics: ['temples', 'traditional', 'gardens', 'geisha', 'cultural'], description: 'Traditional Japan with thousands of temples, geisha districts, and beautiful gardens. The cultural heart.', bestFor: ['cultural', 'photography', 'hiking'], vibe: ['cultural', 'traditional', 'serene'] },
    { name: 'Osaka', type: 'town', characteristics: ['food_scene', 'nightlife', 'downtown', 'castle', 'friendly'], description: 'Japan\'s kitchen with incredible street food and friendly locals. Great nightlife in Dotonbori.', bestFor: ['food_tour', 'nightlife', 'cultural'], vibe: ['lively', 'foodie', 'friendly'] },
    { name: 'Hakone', type: 'region', characteristics: ['hot_springs', 'mountains', 'fuji_views', 'ryokan', 'nature'], description: 'Mountain resort area with hot springs and Mount Fuji views. Traditional ryokan inns.', bestFor: ['spa_wellness', 'nature', 'photography'], vibe: ['relaxed', 'traditional', 'scenic'] },
    { name: 'Nara', type: 'town', characteristics: ['deer', 'temples', 'cultural', 'day_trip', 'peaceful'], description: 'Ancient capital famous for friendly deer and massive Buddha statue. Great day trip from Kyoto.', bestFor: ['cultural', 'wildlife', 'photography'], vibe: ['peaceful', 'cultural', 'nature'] },
    { name: 'Hiroshima', type: 'town', characteristics: ['history', 'peace_memorial', 'cultural', 'food'], description: 'Moving peace memorial and delicious okonomiyaki. Gateway to Miyajima Island.', bestFor: ['cultural', 'food_tour'], vibe: ['cultural', 'moving', 'peaceful'] },
  ],
};

// Legacy fallback for backwards compatibility
const FALLBACK_AREAS = DESTINATION_AREAS;

// Specific activity mappings - custom activities that map to specific areas
// These are activities that can ONLY be done in certain places
const SPECIFIC_ACTIVITY_MAPPINGS: Record<string, Array<{
  keywords: string[];
  area: string;
  destination: string;
  description: string;
  seasonality?: { months: number[]; note: string };
}>> = {
  'whale_watching': [
    { keywords: ['whale', 'whales', 'whale watching', 'humpback'], area: 'Samaná Peninsula', destination: 'dominican republic', description: 'Humpback whale watching in Samaná Bay', seasonality: { months: [1, 2, 3], note: 'Jan-Mar only' } },
  ],
  'horseback_water': [
    { keywords: ['horse', 'horseback', 'riding in water', 'horse water', 'horse beach', 'horseback beach'], area: 'Macao Beach', destination: 'dominican republic', description: 'Horseback riding in the water at Macao Beach' },
    { keywords: ['horse', 'horseback', 'riding in water'], area: 'Punta Cana', destination: 'dominican republic', description: 'Horseback riding on the beach' },
  ],
  'waterfall': [
    { keywords: ['waterfall', 'waterfalls', 'el limon', 'limon'], area: 'Samaná Peninsula', destination: 'dominican republic', description: 'El Limón Waterfall hike' },
    { keywords: ['waterfall', 'waterfalls', '27 charcos', 'damajagua'], area: 'Puerto Plata', destination: 'dominican republic', description: '27 Waterfalls of Damajagua' },
  ],
  'zip_line': [
    { keywords: ['zip line', 'zipline', 'zip lining', 'ziplining'], area: 'Jarabacoa', destination: 'dominican republic', description: 'Zip lining in the mountains' },
    { keywords: ['zip line', 'zipline'], area: 'Puerto Plata', destination: 'dominican republic', description: 'Zip line adventures' },
  ],
  'cave': [
    { keywords: ['cave', 'caves', 'los haitises', 'taino'], area: 'Los Haitises', destination: 'dominican republic', description: 'Cave exploration with Taino art' },
    { keywords: ['cave', 'caves', 'fun fun'], area: 'Samaná Peninsula', destination: 'dominican republic', description: 'Fun Fun Cave adventure' },
  ],
  'cenote': [
    { keywords: ['cenote', 'cenotes'], area: 'Tulum', destination: 'mexico', description: 'Cenote swimming and snorkeling' },
    { keywords: ['cenote', 'cenotes'], area: 'Playa del Carmen', destination: 'mexico', description: 'Cenote day trips' },
  ],
  'whale_shark': [
    { keywords: ['whale shark', 'whale sharks'], area: 'Holbox', destination: 'mexico', description: 'Whale shark swimming (June-Sept)' },
    { keywords: ['whale shark', 'whale sharks'], area: 'Isla Mujeres', destination: 'mexico', description: 'Whale shark tours' },
  ],
  'turtle': [
    { keywords: ['turtle', 'turtles', 'sea turtle', 'nesting'], area: 'Tortuguero', destination: 'costa rica', description: 'Sea turtle nesting (Jul-Oct)' },
  ],
  'volcano': [
    { keywords: ['volcano', 'lava', 'hot springs'], area: 'Arenal', destination: 'costa rica', description: 'Arenal Volcano and hot springs' },
  ],
};

/**
 * Find specific activities mentioned in custom text
 */
function findSpecificActivities(
  customActivities: string[],
  destination: string
): Array<{ activity: string; area: string; description: string; seasonNote?: string }> {
  const found: Array<{ activity: string; area: string; description: string; seasonNote?: string }> = [];
  const destLower = destination.toLowerCase();

  for (const customActivity of customActivities) {
    const activityLower = customActivity.toLowerCase();

    for (const [activityType, mappings] of Object.entries(SPECIFIC_ACTIVITY_MAPPINGS)) {
      for (const mapping of mappings) {
        // Check if destination matches
        if (!destLower.includes(mapping.destination)) continue;

        // Check if any keyword matches
        const matches = mapping.keywords.some(kw => activityLower.includes(kw));
        if (matches) {
          found.push({
            activity: customActivity,
            area: mapping.area,
            description: mapping.description,
            seasonNote: mapping.seasonality?.note,
          });
        }
      }
    }
  }

  return found;
}

/**
 * Check if an area name looks valid (not a sentence fragment)
 */
function isValidAreaName(name: string): boolean {
  if (!name || name.length < 3 || name.length > 30) return false;

  // Must start with capital letter
  if (!/^[A-Z]/.test(name)) return false;

  // Max 4 words
  const words = name.split(/\s+/);
  if (words.length > 4) return false;

  // Reject common sentence fragments
  const lower = name.toLowerCase();
  const badPatterns = [
    'would', 'could', 'should', 'might', 'will', 'have', 'need',
    'worth', 'night on', 'day on', 'get to', 'this', 'that',
    'a lot', 'so much', 'too much', 'very', 'really', 'just',
    'island if', 'beach if', 'area if', 'it is', 'it was',
  ];
  if (badPatterns.some(p => lower.includes(p))) return false;

  // Reject if it starts with articles or pronouns
  if (/^(the|a|an|this|that|it|we|i|you|they|he|she)\s/i.test(name)) return false;

  return true;
}

/**
 * Discover best areas for given preferences
 * Uses expert knowledge base as primary source, enriched with Reddit data
 */
export async function discoverAreas(
  preferences: TripPreferences,
  redditData: RedditAreaData[]
): Promise<AreaCandidate[]> {
  const destName = (preferences.destinationContext?.canonicalName || preferences.destinationContext?.rawInput || '').toLowerCase();

  // Try to match destination to our database (more flexible matching)
  const destKey = Object.keys(DESTINATION_AREAS).find(key => {
    // Check if destination contains key or key contains destination
    return destName.includes(key) || key.includes(destName) ||
      // Also check individual words (e.g., "dominican" matches "dominican republic")
      key.split(' ').some(word => word.length > 4 && destName.includes(word));
  });

  // Get known areas for this destination
  let knownAreas = destKey ? DESTINATION_AREAS[destKey] : [];
  console.log(`Area discovery: destName="${destName}", destKey="${destKey}", found ${knownAreas.length} known areas`);

  // If no known areas, try to extract areas from LLM-generated data
  // This is what makes the system work for ANY destination worldwide
  if (knownAreas.length === 0 && redditData.length > 0) {
    console.log(`Area discovery: No hardcoded areas for "${destName}", using LLM-generated areas`);
    // Convert LLM data to our area format
    const llmAreas = redditData
      .filter(rd => rd.mentionedAreas && rd.mentionedAreas.length > 0)
      .map(rd => {
        const area = rd.mentionedAreas[0];
        const specificActivities = (rd as any).specificActivities || [];

        // Build bestFor from both explicit bestFor and specific activities
        const bestFor = [...((rd as any).bestFor || [])];
        for (const sa of specificActivities) {
          if (sa.activity && !bestFor.includes(sa.activity)) {
            bestFor.push(sa.activity);
          }
        }

        return {
          name: area.name,
          type: 'region' as const,
          characteristics: area.characteristics || [],
          description: rd.text || `${area.name} is a popular destination.`,
          bestFor,
          vibe: [],
          // Store specific activities for smart matching
          specificActivities,
        };
      });

    // Deduplicate by name
    const seen = new Set<string>();
    knownAreas = llmAreas.filter(a => {
      const key = a.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    console.log(`Area discovery: Extracted ${knownAreas.length} unique areas from LLM for worldwide destination`);
  }

  // Get user's selected activities (both standard and custom)
  const allActivities = preferences.selectedActivities || [];
  const selectedActivityTypes = allActivities.map(a => a.type);
  const mustDoActivities = allActivities
    .filter(a => a.priority === 'must-do')
    .map(a => a.type);

  // Extract custom activities - use the original label if available
  const standardTypes = ['surf', 'snorkel', 'dive', 'swimming', 'wildlife', 'hiking', 'adventure', 'cultural', 'food_tour', 'nightlife', 'beach', 'spa_wellness', 'golf', 'photography'];
  const customActivities = allActivities
    .filter(a => (a as any).isCustom || !standardTypes.includes(a.type))
    .map(a => {
      // Use the custom label if available, otherwise convert underscore to space
      const customLabel = (a as any).customLabel;
      if (customLabel) return customLabel;
      // Convert food_tour -> food tour, spa_wellness -> spa wellness
      return a.type.replace(/_/g, ' ');
    });

  // Find specific activities from custom inputs
  const specificActivities = findSpecificActivities(customActivities, destName);
  console.log(`Area discovery: Found ${specificActivities.length} specific activities:`, specificActivities);

  // Build a map of areas that MUST be shown because of specific activities
  const mustShowAreas = new Map<string, { activity: string; description: string; seasonNote?: string }>();
  for (const specific of specificActivities) {
    mustShowAreas.set(specific.area.toLowerCase(), {
      activity: specific.activity,
      description: specific.description,
      seasonNote: specific.seasonNote,
    });
  }

  // Build Reddit evidence map for enrichment
  const redditEvidenceMap = new Map<string, {
    mentions: number;
    sentiment: number;
    quotes: string[];
    upvotes: number;
  }>();

  for (const post of redditData) {
    for (const area of post.mentionedAreas || []) {
      const key = area.name.toLowerCase();
      const existing = redditEvidenceMap.get(key) || {
        mentions: 0,
        sentiment: 0,
        quotes: [],
        upvotes: 0,
      };
      existing.mentions++;
      existing.sentiment += post.sentiment;
      existing.upvotes += post.upvotes;
      if (post.text && existing.quotes.length < 3) {
        existing.quotes.push(post.text.slice(0, 150));
      }
      redditEvidenceMap.set(key, existing);
    }
  }

  // Score each known area based on activity match
  const scoredAreas: AreaCandidate[] = [];

  for (const area of knownAreas) {
    // Calculate activity fit score
    // Key insight: An area that's THE BEST for 1-2 activities the user wants
    // should score higher than an area that's mediocre for all activities
    let activityMatchScore = 0;
    let matchedActivities: string[] = [];

    for (const activityType of selectedActivityTypes) {
      if (area.bestFor.includes(activityType)) {
        matchedActivities.push(activityType);
        // Base match
        activityMatchScore += 1;
        // Bonus if it's in the first 2 bestFor (primary strength)
        if (area.bestFor.indexOf(activityType) < 2) {
          activityMatchScore += 0.5; // Primary activity bonus
        }
      }
    }

    // If area matches at least 1 activity well, give it a fighting chance
    // Don't penalize too harshly for not matching ALL activities
    const activityFitScore = selectedActivityTypes.length > 0
      ? matchedActivities.length > 0
        ? Math.min(1, (activityMatchScore / selectedActivityTypes.length) + 0.2) // Boost all matches
        : 0.1 // Low score if no matches
      : 0.5; // Default if no activities selected

    // Check for conflicts with notIdealFor - only penalize if it's a primary activity
    const hasConflict = (area.notIdealFor || []).some(notFor =>
      selectedActivityTypes.slice(0, 2).includes(notFor as any) // Only check first 2 activities
    );
    const conflictPenalty = hasConflict ? 0.2 : 0;

    // Calculate vibe match
    const vibePrefs = preferences.hotelVibePreferences || [];
    const vibeMatch = vibePrefs.length > 0
      ? vibePrefs.filter(v => area.vibe.includes(v.toLowerCase())).length / vibePrefs.length
      : 0.5;

    // Get Reddit evidence if available
    const redditKey = area.name.toLowerCase();
    const redditEvidence = redditEvidenceMap.get(redditKey);
    const redditBonus = redditEvidence ? Math.min(0.1, redditEvidence.mentions * 0.02) : 0;

    // Check if this area has a SPECIFIC activity the user wants
    // First check our hardcoded mappings (for known destinations)
    const specificMatch = mustShowAreas.get(area.name.toLowerCase());

    // Also check LLM-generated specificActivities (for any destination worldwide)
    const llmSpecificActivities = (area as any).specificActivities || [];
    let llmSpecificMatch: { activity: string; description: string; seasonNote?: string } | null = null;

    if (llmSpecificActivities.length > 0 && customActivities.length > 0) {
      // Check if any LLM-identified specific activity matches user's custom activities
      for (const sa of llmSpecificActivities) {
        const saLower = (sa.activity || '').toLowerCase();
        for (const userActivity of customActivities) {
          const userLower = userActivity.toLowerCase();
          if (saLower.includes(userLower) || userLower.includes(saLower)) {
            llmSpecificMatch = {
              activity: sa.activity,
              description: `${sa.activity} at ${sa.location || area.name}`,
              seasonNote: sa.seasonality,
            };
            break;
          }
        }
        if (llmSpecificMatch) break;
      }
    }

    // Use whichever specific match we found (hardcoded or LLM)
    const finalSpecificMatch = specificMatch || llmSpecificMatch;
    const specificActivityBonus = finalSpecificMatch ? 0.3 : 0; // Big boost for specific activity match

    // Calculate overall score
    const overallScore = Math.max(0, Math.min(1,
      (activityFitScore * 0.5) +
      (vibeMatch * 0.1) +
      (0.2) + // Base score
      specificActivityBonus + // Boost for specific activities like whale watching
      redditBonus -
      conflictPenalty
    ));

    // Build description - append specific activity info if applicable
    let description = area.description;
    if (finalSpecificMatch) {
      description = `🎯 ${finalSpecificMatch.description}${finalSpecificMatch.seasonNote ? ` (${finalSpecificMatch.seasonNote})` : ''}. ${description}`;
    }

    // Build bestFor - add the specific activity at the front
    let bestForList = [...area.bestFor];
    if (finalSpecificMatch) {
      bestForList = [finalSpecificMatch.activity, ...bestForList.filter(b => b !== finalSpecificMatch.activity)];
    }

    // Debug logging
    console.log(`  ${area.name}: ${Math.round(overallScore * 100)}% (activities: ${matchedActivities.join(', ') || 'none'}${finalSpecificMatch ? `, SPECIFIC: ${finalSpecificMatch.activity}` : ''})`);

    // Build evidence array
    const evidence: Evidence[] = [];
    if (redditEvidence && redditEvidence.quotes.length > 0) {
      evidence.push({
        type: 'reddit_thread',
        subreddit: 'travel',
        snippet: redditEvidence.quotes[0],
        score: redditEvidence.upvotes,
      });
    }

    // Calculate suggested nights based on activity matches
    const matchCount = matchedActivities.length + (finalSpecificMatch ? 1 : 0);
    const suggestedNights = matchCount >= 3
      ? Math.min(4, Math.ceil(preferences.tripLength / 2))
      : matchCount >= 1
        ? Math.min(3, Math.ceil(preferences.tripLength / 3))
        : 2;

    const candidate: AreaCandidate = {
      id: slugify(area.name),
      name: area.name,
      type: area.type,
      description: description, // Use modified description with specific activity
      centerLat: 0,
      centerLng: 0,
      activityFitScore,
      vibeFitScore: vibeMatch,
      budgetFitScore: calculateBudgetFit(area, preferences.budgetPerNight),
      overallScore,
      bestFor: bestForList, // Use modified bestFor with specific activity first
      notIdealFor: area.notIdealFor || [],
      whyItFits: bestForList.slice(0, 3).map(b => `Great for ${b}`),
      caveats: area.notIdealFor?.slice(0, 2).map(n => `Not ideal for ${n}`) || [],
      evidence,
      confidenceScore: overallScore,
      suggestedNights,
    };

    scoredAreas.push(candidate);
  }

  // Sort by overall score
  scoredAreas.sort((a, b) => b.overallScore - a.overallScore);

  // Return top areas - ensure minimum of 5 areas for user choice
  const MIN_AREAS = 5;
  const maxAreas = Math.min(10, Math.max(MIN_AREAS, Math.ceil(preferences.tripLength / 2) + 2));
  let topAreas = scoredAreas.slice(0, maxAreas);

  // If we have fewer than MIN_AREAS, pad with additional areas from the database
  if (topAreas.length < MIN_AREAS && destKey && DESTINATION_AREAS[destKey]) {
    const existingIds = new Set(topAreas.map(a => a.id));
    const remainingAreas = DESTINATION_AREAS[destKey]
      .filter(area => !existingIds.has(slugify(area.name)))
      .slice(0, MIN_AREAS - topAreas.length);

    for (const area of remainingAreas) {
      const candidate: AreaCandidate = {
        id: slugify(area.name),
        name: area.name,
        type: area.type,
        description: area.description,
        centerLat: 0,
        centerLng: 0,
        activityFitScore: 0.3,
        vibeFitScore: 0.3,
        budgetFitScore: calculateBudgetFit(area, preferences.budgetPerNight),
        overallScore: 0.3,
        bestFor: area.bestFor,
        notIdealFor: area.notIdealFor || [],
        whyItFits: area.bestFor.slice(0, 3).map(b => `Great for ${b}`),
        caveats: [],
        evidence: [],
        confidenceScore: 0.3,
        suggestedNights: 2,
      };
      topAreas.push(candidate);
    }
    console.log(`Area discovery: Padded with ${remainingAreas.length} additional areas from database`);
  }

  console.log(`Area discovery: Returning ${topAreas.length} areas (min: ${MIN_AREAS})`);
  console.log(`  Top picks: ${topAreas.slice(0, 3).map(a => `${a.name} (${Math.round(a.overallScore * 100)}%)`).join(', ')}`);

  return topAreas;
}

/**
 * Calculate area scores based on preferences
 */
function calculateAreaScores(
  name: string,
  data: AreaData,
  preferences: TripPreferences
): { total: number; breakdown: Record<string, number> } {
  const breakdown: Record<string, number> = {};

  // Activity match score
  breakdown.activityMatch = calculateActivityMatchScore(data, preferences);

  // Reddit mentions score (normalized by total mentions)
  const mentionCount = data.mentions.length;
  breakdown.redditMentions = Math.min(1, mentionCount / 10);

  // Reddit sentiment score
  const avgSentiment = data.sentiment.length > 0
    ? data.sentiment.reduce((a, b) => a + b, 0) / data.sentiment.length
    : 0.5;
  breakdown.redditSentiment = avgSentiment;

  // Vibe match score
  breakdown.vibeMatch = calculateVibeMatchScore(data, preferences);

  // Logistics score (based on base preferences)
  breakdown.logistics = calculateLogisticsScore(name, data, preferences);

  // Weighted total
  const total = Object.entries(breakdown).reduce((sum, [key, value]) => {
    return sum + value * (SCORING_WEIGHTS[key as keyof typeof SCORING_WEIGHTS] || 0);
  }, 0);

  return { total, breakdown };
}

/**
 * Calculate activity match score
 */
function calculateActivityMatchScore(data: AreaData, preferences: TripPreferences): number {
  const characteristics = Array.from(data.characteristics);
  let matchedActivities = 0;
  let totalActivities = 0;

  for (const activity of preferences.selectedActivities) {
    const requirements = ACTIVITY_AREA_REQUIREMENTS[activity.type] || [];
    if (requirements.length === 0) continue;

    totalActivities++;
    const hasMatch = requirements.some(req =>
      characteristics.some(char => char.includes(req) || req.includes(char))
    );

    if (hasMatch) {
      // Weight by priority
      matchedActivities += activity.priority === 'must-do' ? 1.5 : 1;
    }
  }

  if (totalActivities === 0) return 0.5;
  return Math.min(1, matchedActivities / totalActivities);
}

/**
 * Calculate vibe match score
 */
function calculateVibeMatchScore(data: AreaData, preferences: TripPreferences): number {
  const characteristics = Array.from(data.characteristics);
  let matchScore = 0;
  let totalVibes = 0;

  for (const vibe of preferences.hotelVibePreferences) {
    const vibeChars = VIBE_AREA_MAPPING[vibe.toLowerCase()] || [];
    if (vibeChars.length === 0) continue;

    totalVibes++;
    const hasMatch = vibeChars.some(v =>
      characteristics.some(char => char.includes(v) || v.includes(char))
    );

    if (hasMatch) matchScore++;
  }

  // Check hard nos
  for (const hardNo of preferences.hardNos) {
    const noLower = hardNo.toLowerCase();
    const hasNegative = characteristics.some(char =>
      char.toLowerCase().includes(noLower) ||
      noLower.includes(char.toLowerCase())
    );
    if (hasNegative) matchScore -= 0.5;
  }

  if (totalVibes === 0) return 0.5;
  return Math.max(0, Math.min(1, matchScore / totalVibes));
}

/**
 * Calculate logistics score
 */
function calculateLogisticsScore(
  name: string,
  data: AreaData,
  preferences: TripPreferences
): number {
  let score = 0.7; // Base score

  // Penalize if "long drive" is a hard no and area is remote
  const hasNoDrives = preferences.hardNos?.some(n =>
    n.toLowerCase().includes('drive') || n.toLowerCase().includes('car')
  ) ?? false;

  const isRemote = Array.from(data.characteristics).some(c =>
    c.includes('remote') || c.includes('off_beaten_path') || c.includes('isolated')
  );

  if (hasNoDrives && isRemote) {
    score -= 0.3;
  }

  // Bonus if area has good infrastructure
  const hasInfrastructure = Array.from(data.characteristics).some(c =>
    c.includes('resort') || c.includes('downtown') || c.includes('airport')
  );

  if (hasInfrastructure) {
    score += 0.2;
  }

  return Math.max(0, Math.min(1, score));
}

/**
 * Extract evidence from Reddit data
 */
function extractEvidence(data: AreaData, preferences: TripPreferences): Evidence[] {
  const evidence: Evidence[] = [];

  // Sort mentions by relevance (upvotes + sentiment)
  const sortedMentions = [...data.mentions].sort((a, b) =>
    (b.upvotes * b.sentiment) - (a.upvotes * a.sentiment)
  );

  // Extract top 3 pieces of evidence
  for (const mention of sortedMentions.slice(0, 3)) {
    // Extract relevant snippet from text
    const snippet = extractRelevantSnippet(mention.text, data.name, preferences);
    if (!snippet) continue;

    evidence.push({
      type: 'reddit_thread',
      snippet,
      subreddit: 'travel',
      score: mention.upvotes,
    });
  }

  return evidence;
}

/**
 * Extract relevant snippet from Reddit text
 */
function extractRelevantSnippet(
  text: string,
  areaName: string,
  preferences: TripPreferences
): string | null {
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 20);

  // Find sentences mentioning the area
  const areaSentences = sentences.filter(s =>
    s.toLowerCase().includes(areaName.toLowerCase())
  );

  if (areaSentences.length === 0) return null;

  // Prefer sentences that also mention activities
  const activityTypes = preferences.selectedActivities.map(a => a.type);
  const relevantSentences = areaSentences.filter(s => {
    const lower = s.toLowerCase();
    return activityTypes.some(type => lower.includes(type));
  });

  const bestSentence = relevantSentences[0] || areaSentences[0];

  // Truncate if too long
  if (bestSentence.length > 200) {
    return bestSentence.substring(0, 197) + '...';
  }

  return bestSentence;
}

/**
 * Generate area description
 */
function generateAreaDescription(
  name: string,
  data: AreaData,
  preferences: TripPreferences
): string {
  const characteristics = Array.from(data.characteristics);

  // Build description based on characteristics
  const descriptors: string[] = [];

  if (characteristics.some(c => c.includes('beach') || c.includes('coast'))) {
    descriptors.push('coastal area');
  }
  if (characteristics.some(c => c.includes('mountain') || c.includes('jungle'))) {
    descriptors.push('nature destination');
  }
  if (characteristics.some(c => c.includes('resort'))) {
    descriptors.push('resort zone');
  }
  if (characteristics.some(c => c.includes('downtown') || c.includes('city'))) {
    descriptors.push('urban center');
  }

  const type = descriptors.join(' and ') || 'destination';
  const mentionCount = data.mentions.length;

  return `${name} is a ${type} frequently mentioned by travelers (${mentionCount} Reddit mentions).`;
}

/**
 * Generate "why it fits" explanation
 */
function generateWhyItFits(
  name: string,
  data: AreaData,
  preferences: TripPreferences
): string[] {
  const reasons: string[] = [];
  const characteristics = Array.from(data.characteristics);

  // Match activities to reasons
  for (const activity of preferences.selectedActivities) {
    if (activity.priority !== 'must-do') continue;

    const requirements = ACTIVITY_AREA_REQUIREMENTS[activity.type] || [];
    const hasMatch = requirements.some(req =>
      characteristics.some(char => char.includes(req))
    );

    if (hasMatch) {
      reasons.push(`Great for ${activity.type.replace('_', ' ')}`);
    }
  }

  // Add vibe matches
  for (const vibe of (preferences.hotelVibePreferences || []).slice(0, 2)) {
    const vibeChars = VIBE_AREA_MAPPING[vibe.toLowerCase()] || [];
    const hasMatch = vibeChars.some(v =>
      characteristics.some(char => char.includes(v))
    );

    if (hasMatch) {
      reasons.push(`Matches your ${vibe} vibe`);
    }
  }

  // Add sentiment-based reason
  const avgSentiment = data.sentiment.reduce((a, b) => a + b, 0) / data.sentiment.length;
  if (avgSentiment > 0.7) {
    reasons.push('Highly recommended by travelers');
  }

  return reasons.slice(0, 4);
}

/**
 * Generate caveats/warnings
 */
function generateCaveats(
  name: string,
  data: AreaData,
  preferences: TripPreferences
): string[] {
  const caveats: string[] = [];
  const characteristics = Array.from(data.characteristics);

  // Check for potential conflicts with hard nos
  for (const hardNo of preferences.hardNos) {
    const noLower = hardNo.toLowerCase();

    if (noLower.includes('crowd') && characteristics.some(c => c.includes('busy') || c.includes('tourist'))) {
      caveats.push('Can be crowded during peak season');
    }
    if (noLower.includes('drive') && characteristics.some(c => c.includes('remote'))) {
      caveats.push('Requires car/driver to reach');
    }
    if (noLower.includes('party') && characteristics.some(c => c.includes('nightlife'))) {
      caveats.push('Known for nightlife scene');
    }
  }

  // Add negative sentiment caveats
  const negativeMentions = data.mentions.filter(m => m.sentiment < 0.4);
  if (negativeMentions.length > data.mentions.length * 0.3) {
    caveats.push('Mixed reviews from travelers');
  }

  return caveats.slice(0, 3);
}

/**
 * Get best activities for area
 */
function getBestForActivities(data: AreaData, preferences: TripPreferences): string[] {
  const characteristics = Array.from(data.characteristics);
  const bestFor: string[] = [];

  for (const [activityType, requirements] of Object.entries(ACTIVITY_AREA_REQUIREMENTS)) {
    const matchCount = requirements.filter(req =>
      characteristics.some(char => char.includes(req))
    ).length;

    if (matchCount >= requirements.length * 0.5) {
      bestFor.push(activityType.replace('_', ' '));
    }
  }

  return bestFor.slice(0, 5);
}

/**
 * Get activities area is not ideal for
 */
function getNotIdealFor(data: AreaData, preferences: TripPreferences): string[] {
  const characteristics = Array.from(data.characteristics);
  const notIdealFor: string[] = [];

  // Check activities user wants that don't match
  for (const activity of preferences.selectedActivities) {
    const requirements = ACTIVITY_AREA_REQUIREMENTS[activity.type] || [];
    if (requirements.length === 0) continue;

    const hasAnyMatch = requirements.some(req =>
      characteristics.some(char => char.includes(req))
    );

    if (!hasAnyMatch) {
      notIdealFor.push(activity.type.replace('_', ' '));
    }
  }

  return notIdealFor.slice(0, 3);
}

/**
 * Calculate suggested days for area
 */
function calculateSuggestedDays(data: AreaData, preferences: TripPreferences): number {
  const characteristics = Array.from(data.characteristics);

  // Base days on area characteristics
  let baseDays = 2;

  // More days for areas matching must-do activities
  const mustDoMatches = preferences.selectedActivities.filter(a => {
    if (a.priority !== 'must-do') return false;
    const reqs = ACTIVITY_AREA_REQUIREMENTS[a.type] || [];
    return reqs.some(req => characteristics.some(c => c.includes(req)));
  }).length;

  baseDays += Math.min(2, mustDoMatches);

  // Cap at trip length / 2 to leave room for other areas
  return Math.min(baseDays, Math.ceil(preferences.tripLength / 2));
}

/**
 * Generate area split options for the trip
 */
export function generateSplitOptions(
  areas: AreaCandidate[],
  preferences: TripPreferences
): AreaSplitOption[] {
  const tripLength = preferences.tripLength;
  const options: AreaSplitOption[] = [];

  if (areas.length === 0) return options;

  // Option 1: Single base (top area)
  if (preferences.maxBases >= 1) {
    const topArea = areas[0];
    options.push({
      id: 'single_base',
      name: 'Single Base',
      description: `Stay in ${topArea.name} for the entire trip`,
      areas: [{ area: topArea, nights: tripLength }],
      totalNights: tripLength,
      pros: ['No packing/unpacking', 'Deeper experience', 'Less logistics'],
      cons: ['Less variety', 'May miss other areas'],
    });
  }

  // Option 2: Two bases (top 2 areas)
  if (areas.length >= 2 && preferences.maxBases >= 2 && tripLength >= 5) {
    const [area1, area2] = areas.slice(0, 2);
    const nights1 = Math.ceil(tripLength / 2);
    const nights2 = tripLength - nights1;

    options.push({
      id: 'two_bases',
      name: 'Two Bases',
      description: `Split between ${area1.name} and ${area2.name}`,
      areas: [
        { area: area1, nights: nights1 },
        { area: area2, nights: nights2 },
      ],
      totalNights: tripLength,
      pros: ['Good variety', 'Experience both areas well'],
      cons: ['One transfer day', 'Some packing'],
    });
  }

  // Option 3: Three bases (for longer trips)
  if (areas.length >= 3 && preferences.maxBases >= 3 && tripLength >= 8) {
    const [area1, area2, area3] = areas.slice(0, 3);
    const nightsPer = Math.floor(tripLength / 3);
    const extra = tripLength - nightsPer * 3;

    options.push({
      id: 'three_bases',
      name: 'Three Bases',
      description: `Explore ${area1.name}, ${area2.name}, and ${area3.name}`,
      areas: [
        { area: area1, nights: nightsPer + (extra > 0 ? 1 : 0) },
        { area: area2, nights: nightsPer + (extra > 1 ? 1 : 0) },
        { area: area3, nights: nightsPer },
      ],
      totalNights: tripLength,
      pros: ['Maximum variety', 'See all highlights'],
      cons: ['Two transfer days', 'Less depth in each area'],
    });
  }

  return options;
}

// Helper function
function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Types
interface RedditAreaData {
  postId: string;
  title: string;
  text: string;
  sentiment: number;
  upvotes: number;
  mentionedAreas: { name: string; characteristics?: string[] }[];
}

interface AreaData {
  name: string;
  mentions: {
    postId: string;
    title: string;
    text: string;
    sentiment: number;
    upvotes: number;
  }[];
  characteristics: Set<string>;
  sentiment: number[];
}

interface AreaSplitOption {
  id: string;
  name: string;
  description: string;
  areas: { area: AreaCandidate; nights: number }[];
  totalNights: number;
  pros: string[];
  cons: string[];
}
