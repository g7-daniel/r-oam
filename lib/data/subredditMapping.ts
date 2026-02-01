/**
 * Subreddit mapping for destination-specific Reddit recommendations
 * Maps destinations to relevant subreddits for travel recommendations
 */

/**
 * Global subreddits that are always included regardless of destination
 * Each has a specific color: chubbytravel (silver), fattravel (gold)
 */
export const GLOBAL_SUBREDDITS = ['chubbytravel', 'fattravel'];

/**
 * Get the color class for a global subreddit
 * @param subreddit - The subreddit name
 * @returns Tailwind color classes for the subreddit chip
 */
export function getGlobalSubredditColor(subreddit: string): { active: string; inactive: string } {
  const sub = subreddit.toLowerCase();
  if (sub === 'fattravel') {
    return { active: 'bg-amber-500 text-white', inactive: 'bg-slate-100 text-slate-400 line-through' };
  }
  if (sub === 'chubbytravel') {
    return { active: 'bg-green-600 text-white', inactive: 'bg-slate-100 text-slate-400 line-through' };
  }
  // Default for any other global subreddit
  return { active: 'bg-purple-500 text-white', inactive: 'bg-slate-100 text-slate-400 line-through' };
}

export const DESTINATION_SUBREDDITS: Record<string, string[]> = {
  // Costa Rica
  'Santa Teresa': ['costarica', 'travel', 'surfing', 'digitalnomad', 'solotravel'],
  'Costa Rica': ['costarica', 'travel', 'surfing', 'centralamerica', 'solotravel'],
  'Tamarindo': ['costarica', 'surfing', 'travel', 'solotravel'],
  'Manuel Antonio': ['costarica', 'travel', 'wildlife', 'solotravel'],
  'Monteverde': ['costarica', 'hiking', 'travel', 'wildlife'],
  'La Fortuna': ['costarica', 'travel', 'hiking', 'adventure'],
  'Jaco': ['costarica', 'surfing', 'travel', 'nightlife'],
  'Puerto Viejo': ['costarica', 'travel', 'caribbean', 'solotravel'],
  'Nosara': ['costarica', 'surfing', 'travel', 'yoga'],

  // Central America
  'Panama': ['Panama', 'travel', 'centralamerica', 'solotravel'],
  'Panama City': ['Panama', 'travel', 'centralamerica', 'solotravel'],
  'Guatemala': ['Guatemala', 'travel', 'centralamerica', 'backpacking'],
  'Antigua': ['Guatemala', 'travel', 'centralamerica'],

  // Japan
  'Tokyo': ['JapanTravel', 'japanlife', 'travel', 'foodie', 'Tokyo'],
  'Kyoto': ['JapanTravel', 'travel', 'japanlife', 'japan'],
  'Osaka': ['JapanTravel', 'travel', 'japanlife', 'foodie'],
  'Japan': ['JapanTravel', 'japanlife', 'travel', 'japan'],

  // Southeast Asia
  'Bali': ['bali', 'travel', 'digitalnomad', 'surfing', 'solotravel'],
  'Thailand': ['Thailand', 'travel', 'solotravel', 'digitalnomad'],
  'Bangkok': ['Thailand', 'travel', 'foodie', 'solotravel'],
  'Phuket': ['Thailand', 'travel', 'beaches', 'solotravel'],
  'Chiang Mai': ['Thailand', 'digitalnomad', 'travel', 'chiangmai'],
  'Vietnam': ['VietNam', 'travel', 'solotravel', 'backpacking'],
  'Singapore': ['singapore', 'travel', 'foodie', 'asia'],
  'Indonesia': ['indonesia', 'travel', 'bali', 'backpacking'],
  'Philippines': ['Philippines', 'travel', 'solotravel', 'diving'],

  // Europe
  'Paris': ['paris', 'travel', 'france', 'foodie', 'europe'],
  'France': ['france', 'travel', 'paris', 'europe'],
  'Barcelona': ['Barcelona', 'travel', 'spain', 'europe'],
  'Spain': ['spain', 'travel', 'europe', 'Barcelona'],
  'London': ['london', 'travel', 'unitedkingdom', 'europe'],
  'Rome': ['rome', 'travel', 'italy', 'europe', 'foodie'],
  'Italy': ['italy', 'travel', 'rome', 'europe', 'foodie'],
  'Amsterdam': ['Amsterdam', 'travel', 'Netherlands', 'europe'],
  'Berlin': ['berlin', 'travel', 'germany', 'europe'],
  'Prague': ['Prague', 'travel', 'europe', 'backpacking'],
  'Lisbon': ['portugal', 'travel', 'europe', 'digitalnomad'],
  'Portugal': ['portugal', 'travel', 'europe', 'digitalnomad'],
  'Athens': ['greece', 'travel', 'europe', 'history'],
  'Greece': ['greece', 'travel', 'europe', 'islands'],
  'Santorini': ['greece', 'travel', 'europe', 'honeymoon'],
  'Croatia': ['croatia', 'travel', 'europe', 'sailing'],
  'Dubrovnik': ['croatia', 'travel', 'europe', 'gameofthrones'],
  'Iceland': ['VisitingIceland', 'travel', 'europe', 'nature'],

  // Americas
  'New York': ['AskNYC', 'travel', 'newyorkcity', 'foodie'],
  'Los Angeles': ['LosAngeles', 'travel', 'california', 'foodie'],
  'San Francisco': ['sanfrancisco', 'travel', 'california', 'foodie'],
  'Miami': ['Miami', 'travel', 'florida', 'beaches'],
  'Hawaii': ['HawaiiVisitors', 'travel', 'hawaii', 'beaches'],
  'Maui': ['HawaiiVisitors', 'travel', 'maui', 'beaches'],
  'Mexico': ['mexico', 'travel', 'solotravel', 'backpacking'],
  'Mexico City': ['MexicoCity', 'travel', 'mexico', 'foodie'],
  'Cancun': ['cancun', 'travel', 'mexico', 'beaches'],
  'Peru': ['Peru', 'travel', 'solotravel', 'backpacking'],
  'Colombia': ['Colombia', 'travel', 'solotravel', 'medellin'],
  'Argentina': ['argentina', 'travel', 'buenosaires', 'solotravel'],
  'Brazil': ['Brazil', 'travel', 'riodejaneiro', 'solotravel'],

  // Middle East
  'Dubai': ['dubai', 'travel', 'UAE', 'middleeast'],
  'Israel': ['Israel', 'travel', 'TelAviv', 'Jerusalem'],
  'Tel Aviv': ['Israel', 'TelAviv', 'travel', 'foodie'],
  'Jerusalem': ['Israel', 'Jerusalem', 'travel', 'history'],
  'Jordan': ['jordan', 'travel', 'middleeast', 'history'],
  'Morocco': ['Morocco', 'travel', 'solotravel', 'marrakech'],
  'Marrakech': ['Morocco', 'travel', 'marrakech', 'solotravel'],
  'Turkey': ['turkey', 'travel', 'istanbul', 'europe'],
  'Istanbul': ['istanbul', 'travel', 'turkey', 'foodie'],

  // Australia & Pacific
  'Australia': ['australia', 'travel', 'sydney', 'melbourne'],
  'Sydney': ['sydney', 'travel', 'australia', 'solotravel'],
  'Melbourne': ['melbourne', 'travel', 'australia', 'foodie'],
  'New Zealand': ['newzealand', 'travel', 'solotravel', 'adventure'],
  'Fiji': ['fiji', 'travel', 'beaches', 'honeymoon'],

  // Africa
  'South Africa': ['southafrica', 'travel', 'capetown', 'safari'],
  'Cape Town': ['capetown', 'travel', 'southafrica', 'africa'],
  'Kenya': ['Kenya', 'travel', 'safari', 'africa'],
  'Tanzania': ['tanzania', 'travel', 'safari', 'africa'],
  'Egypt': ['Egypt', 'travel', 'history', 'africa'],

  // Caribbean
  'Caribbean': ['caribbean', 'travel', 'beaches', 'cruises'],
  'Jamaica': ['Jamaica', 'travel', 'caribbean', 'beaches'],
  'Puerto Rico': ['PuertoRico', 'travel', 'caribbean', 'beaches'],
  'Dominican Republic': ['DominicanRepublic', 'travel', 'caribbean', 'beaches'],
  'Cuba': ['cuba', 'travel', 'caribbean', 'backpacking'],

  // South Asia
  'India': ['india', 'travel', 'incredibleindia', 'backpacking'],
  'Nepal': ['Nepal', 'travel', 'hiking', 'backpacking'],
  'Sri Lanka': ['srilanka', 'travel', 'solotravel', 'backpacking'],
  'Maldives': ['maldives', 'travel', 'honeymoon', 'beaches'],

  // Default fallback
  'default': ['travel', 'solotravel', 'TravelHacks', 'shoestring', 'backpacking'],
};

/**
 * Get relevant subreddits for a destination
 * Includes destination-specific subreddits + global subreddits
 * @param destination - The destination name (city or country)
 * @returns Array of relevant subreddit names (destination-specific first, then global)
 */
export function getSubredditsForDestination(destination: string): string[] {
  let destinationSubs: string[] = [];

  // Check exact match first
  if (DESTINATION_SUBREDDITS[destination]) {
    destinationSubs = DESTINATION_SUBREDDITS[destination];
  } else {
    // Check partial match (case-insensitive)
    const lowerDest = destination.toLowerCase();
    for (const [key, subs] of Object.entries(DESTINATION_SUBREDDITS)) {
      if (key === 'default') continue;
      if (lowerDest.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerDest)) {
        destinationSubs = subs;
        break;
      }
    }

    if (destinationSubs.length === 0) {
      destinationSubs = DESTINATION_SUBREDDITS['default'];
    }
  }

  // Always add global subreddits at the end
  return [...destinationSubs, ...GLOBAL_SUBREDDITS];
}

/**
 * Check if a subreddit is a global subreddit
 * @param subreddit - The subreddit name
 * @returns True if it's a global subreddit
 */
export function isGlobalSubreddit(subreddit: string): boolean {
  return GLOBAL_SUBREDDITS.includes(subreddit.toLowerCase());
}

/**
 * Category to search terms mapping for Reddit searches
 */
export const CATEGORY_SEARCH_TERMS: Record<string, string[]> = {
  beaches: ['beach', 'swimming', 'snorkeling', 'coastline'],
  dining: ['restaurant', 'food', 'eating', 'where to eat', 'best food'],
  cafes: ['cafe', 'coffee', 'brunch', 'breakfast spot'],
  nightlife: ['bar', 'nightclub', 'nightlife', 'drinks', 'party'],
  museums: ['museum', 'art gallery', 'exhibition', 'history'],
  temples: ['temple', 'shrine', 'religious site', 'spiritual'],
  cultural: ['cultural', 'local experience', 'tradition', 'heritage'],
  nature: ['nature', 'hiking', 'trail', 'national park', 'scenic'],
  adventure: ['adventure', 'tour', 'activity', 'excursion', 'extreme'],
  shopping: ['shopping', 'market', 'souvenir', 'where to buy'],
  landmarks: ['landmark', 'viewpoint', 'famous', 'must see', 'attraction'],
  hidden_gems: ['hidden gem', 'local favorite', 'off beaten path', 'secret', 'underrated'],
  water_sports: ['surfing', 'diving', 'snorkeling', 'kayaking', 'water sports'],
  wildlife: ['wildlife', 'animals', 'safari', 'nature reserve', 'zoo'],
  wellness: ['spa', 'yoga', 'wellness', 'retreat', 'relaxation'],
};

/**
 * Get search terms for a category
 */
export function getSearchTermsForCategory(category: string): string[] {
  return CATEGORY_SEARCH_TERMS[category] || [category];
}
