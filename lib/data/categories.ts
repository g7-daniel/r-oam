// Shared category definitions used by CategoryBrowser and AddPlaceSearch

export interface Category {
  id: string;
  label: string;
  icon: string;
  query: string;
}

// All available categories
export const ALL_CATEGORIES: Category[] = [
  { id: 'beaches', label: 'Beaches', icon: '🏖️', query: 'beach' },
  { id: 'nature', label: 'Nature', icon: '🌿', query: 'nature hiking trail' },
  { id: 'adventure', label: 'Adventure', icon: '🧗', query: 'adventure activities tours' },
  { id: 'wildlife', label: 'Wildlife', icon: '🦜', query: 'wildlife animals nature reserve' },
  { id: 'water_sports', label: 'Water Sports', icon: '🏄', query: 'surfing diving snorkeling' },
  { id: 'temples', label: 'Temples', icon: '⛩️', query: 'temple shrine' },
  { id: 'museums', label: 'Museums', icon: '🏛️', query: 'museum' },
  { id: 'cultural', label: 'Cultural', icon: '🎭', query: 'theater cultural' },
  { id: 'parks', label: 'Parks', icon: '🌳', query: 'park garden' },
  { id: 'dining', label: 'Dining', icon: '🍽️', query: 'restaurant' },
  { id: 'cafes', label: 'Cafes', icon: '☕', query: 'cafe coffee' },
  { id: 'shopping', label: 'Shopping', icon: '🛍️', query: 'shopping mall market' },
  { id: 'nightlife', label: 'Nightlife', icon: '🌙', query: 'bar nightclub' },
  { id: 'landmarks', label: 'Landmarks', icon: '🗼', query: 'landmark viewpoint' },
  { id: 'hidden_gems', label: 'Local Gems', icon: '💎', query: 'local favorite unique' },
];

// Destination type to relevant categories mapping
// Ordered by relevance for each destination
export const DESTINATION_CATEGORIES: Record<string, string[]> = {
  // Central/South America - Nature/Adventure destinations
  'Costa Rica': ['beaches', 'nature', 'adventure', 'wildlife', 'water_sports', 'dining', 'hidden_gems'],
  'Santa Teresa': ['beaches', 'water_sports', 'nature', 'dining', 'nightlife', 'hidden_gems'],
  'Tamarindo': ['beaches', 'water_sports', 'dining', 'nightlife', 'nature', 'adventure'],
  'Manuel Antonio': ['beaches', 'wildlife', 'nature', 'dining', 'adventure', 'hidden_gems'],
  'La Fortuna': ['nature', 'adventure', 'wildlife', 'dining', 'hidden_gems', 'parks'],
  'Monteverde': ['nature', 'wildlife', 'adventure', 'dining', 'hidden_gems', 'parks'],
  'Jaco': ['beaches', 'water_sports', 'nightlife', 'dining', 'adventure', 'shopping'],
  'Puerto Viejo': ['beaches', 'nature', 'dining', 'nightlife', 'hidden_gems', 'wildlife'],
  'Nosara': ['beaches', 'water_sports', 'nature', 'dining', 'hidden_gems', 'adventure'],
  'Panama': ['beaches', 'nature', 'cultural', 'dining', 'nightlife', 'landmarks', 'shopping', 'hidden_gems'],
  'Panama City': ['landmarks', 'cultural', 'dining', 'nightlife', 'shopping', 'beaches', 'hidden_gems'],
  'Bocas del Toro': ['beaches', 'water_sports', 'nature', 'nightlife', 'dining', 'hidden_gems'],
  'Colombia': ['cultural', 'nature', 'dining', 'nightlife', 'beaches', 'landmarks', 'hidden_gems'],
  'Cartagena': ['beaches', 'cultural', 'dining', 'nightlife', 'landmarks', 'hidden_gems', 'shopping'],
  'Medellin': ['cultural', 'dining', 'nightlife', 'nature', 'landmarks', 'hidden_gems'],
  'Mexico City': ['cultural', 'museums', 'dining', 'landmarks', 'nightlife', 'shopping', 'hidden_gems'],

  // Iceland & Nordic
  'Iceland': ['nature', 'adventure', 'landmarks', 'hidden_gems', 'dining', 'wildlife'],
  'Reykjavik': ['nature', 'landmarks', 'dining', 'nightlife', 'cultural', 'hidden_gems'],

  // Southeast Asia
  'Bali': ['beaches', 'temples', 'nature', 'dining', 'water_sports', 'nightlife', 'hidden_gems'],
  'Ubud': ['temples', 'nature', 'cultural', 'dining', 'parks', 'hidden_gems'],
  'Phuket': ['beaches', 'water_sports', 'nightlife', 'dining', 'temples', 'hidden_gems'],
  'Thailand': ['beaches', 'temples', 'dining', 'nightlife', 'cultural', 'nature', 'hidden_gems'],
  'Bangkok': ['temples', 'dining', 'shopping', 'nightlife', 'cultural', 'hidden_gems'],
  'Chiang Mai': ['temples', 'nature', 'cultural', 'dining', 'adventure', 'hidden_gems'],
  'Vietnam': ['cultural', 'dining', 'nature', 'landmarks', 'beaches', 'hidden_gems'],
  'Hanoi': ['cultural', 'dining', 'landmarks', 'temples', 'hidden_gems', 'nightlife'],
  'Ho Chi Minh City': ['cultural', 'dining', 'landmarks', 'shopping', 'nightlife', 'hidden_gems'],

  // Japan
  'Tokyo': ['temples', 'museums', 'dining', 'shopping', 'nightlife', 'cultural', 'hidden_gems'],
  'Kyoto': ['temples', 'cultural', 'parks', 'dining', 'hidden_gems', 'museums'],
  'Osaka': ['dining', 'cultural', 'nightlife', 'temples', 'shopping', 'hidden_gems'],

  // Other Asia
  'Singapore': ['dining', 'shopping', 'parks', 'cultural', 'nightlife', 'landmarks'],
  'Hong Kong': ['dining', 'shopping', 'landmarks', 'cultural', 'nightlife', 'temples'],
  'Seoul': ['dining', 'shopping', 'cultural', 'nightlife', 'temples', 'hidden_gems'],

  // Caribbean & Beach destinations
  'Dominican Republic': ['beaches', 'water_sports', 'dining', 'nightlife', 'nature', 'hidden_gems', 'cultural'],
  'Punta Cana': ['beaches', 'water_sports', 'dining', 'nightlife', 'adventure', 'hidden_gems'],
  'Santo Domingo': ['cultural', 'landmarks', 'dining', 'nightlife', 'beaches', 'hidden_gems'],
  'Puerto Plata': ['beaches', 'water_sports', 'adventure', 'dining', 'nature', 'hidden_gems'],
  'La Romana': ['beaches', 'water_sports', 'dining', 'adventure', 'hidden_gems', 'nature'],
  'Samana': ['beaches', 'nature', 'wildlife', 'water_sports', 'adventure', 'hidden_gems'],
  'Jamaica': ['beaches', 'water_sports', 'dining', 'nightlife', 'nature', 'hidden_gems'],
  'Montego Bay': ['beaches', 'water_sports', 'dining', 'nightlife', 'adventure', 'hidden_gems'],
  'Puerto Rico': ['beaches', 'cultural', 'dining', 'nightlife', 'nature', 'hidden_gems'],
  'San Juan': ['beaches', 'cultural', 'dining', 'nightlife', 'landmarks', 'hidden_gems'],
  'Aruba': ['beaches', 'water_sports', 'dining', 'nightlife', 'adventure', 'hidden_gems'],
  'Bahamas': ['beaches', 'water_sports', 'dining', 'nightlife', 'nature', 'hidden_gems'],
  'Turks and Caicos': ['beaches', 'water_sports', 'dining', 'nature', 'hidden_gems'],
  'Barbados': ['beaches', 'water_sports', 'dining', 'nightlife', 'cultural', 'hidden_gems'],
  'St. Lucia': ['beaches', 'nature', 'water_sports', 'dining', 'adventure', 'hidden_gems'],
  'Cancun': ['beaches', 'water_sports', 'nightlife', 'dining', 'cultural', 'adventure'],
  'Maldives': ['beaches', 'water_sports', 'dining', 'hidden_gems', 'nature'],
  'Santorini': ['beaches', 'landmarks', 'dining', 'nightlife', 'hidden_gems', 'cultural'],
  'Hawaii': ['beaches', 'nature', 'water_sports', 'dining', 'adventure', 'hidden_gems'],
  'Maui': ['beaches', 'nature', 'water_sports', 'dining', 'adventure', 'hidden_gems'],
  'Oahu': ['beaches', 'water_sports', 'nature', 'dining', 'landmarks', 'hidden_gems'],
  'Miami': ['beaches', 'nightlife', 'dining', 'shopping', 'cultural', 'water_sports'],
  'Tulum': ['beaches', 'cultural', 'dining', 'nature', 'water_sports', 'hidden_gems'],
  'Playa del Carmen': ['beaches', 'water_sports', 'nightlife', 'dining', 'adventure', 'hidden_gems'],
  'Fiji': ['beaches', 'water_sports', 'nature', 'dining', 'adventure', 'hidden_gems'],
  'Bora Bora': ['beaches', 'water_sports', 'dining', 'nature', 'hidden_gems'],
  'Tahiti': ['beaches', 'water_sports', 'nature', 'dining', 'cultural', 'hidden_gems'],

  // Australia/New Zealand
  'Sydney': ['beaches', 'landmarks', 'dining', 'cultural', 'nature', 'nightlife', 'hidden_gems'],
  'Melbourne': ['cultural', 'dining', 'cafes', 'nightlife', 'parks', 'museums', 'hidden_gems'],
  'New Zealand': ['nature', 'adventure', 'wildlife', 'landmarks', 'dining', 'hidden_gems'],
  'Queenstown': ['adventure', 'nature', 'dining', 'landmarks', 'water_sports', 'hidden_gems'],

  // Europe - Cities
  'Paris': ['museums', 'landmarks', 'dining', 'shopping', 'cultural', 'cafes', 'nightlife'],
  'London': ['museums', 'landmarks', 'dining', 'shopping', 'cultural', 'nightlife', 'parks'],
  'Rome': ['landmarks', 'museums', 'dining', 'cultural', 'hidden_gems', 'cafes'],
  'Barcelona': ['beaches', 'landmarks', 'dining', 'nightlife', 'cultural', 'museums'],
  'Amsterdam': ['museums', 'cultural', 'cafes', 'nightlife', 'parks', 'hidden_gems'],
  'Berlin': ['museums', 'cultural', 'nightlife', 'dining', 'landmarks', 'hidden_gems'],
  'Prague': ['landmarks', 'cultural', 'nightlife', 'dining', 'museums', 'hidden_gems'],
  'Lisbon': ['landmarks', 'beaches', 'dining', 'nightlife', 'cultural', 'hidden_gems'],
  'Athens': ['landmarks', 'museums', 'dining', 'cultural', 'beaches', 'nightlife'],
  'Vienna': ['museums', 'cultural', 'cafes', 'dining', 'landmarks', 'parks'],
  'Budapest': ['landmarks', 'cultural', 'nightlife', 'dining', 'cafes', 'hidden_gems'],
  'Dublin': ['cultural', 'nightlife', 'dining', 'landmarks', 'museums', 'hidden_gems'],
  'Edinburgh': ['landmarks', 'cultural', 'dining', 'nightlife', 'museums', 'hidden_gems'],

  // Americas
  'New York': ['museums', 'landmarks', 'dining', 'shopping', 'nightlife', 'cultural', 'parks'],
  'Los Angeles': ['beaches', 'dining', 'shopping', 'landmarks', 'nightlife', 'cultural'],
  'San Francisco': ['landmarks', 'dining', 'parks', 'cultural', 'museums', 'hidden_gems'],
  'Las Vegas': ['nightlife', 'dining', 'shopping', 'landmarks', 'adventure', 'cultural'],
  'Chicago': ['museums', 'dining', 'landmarks', 'cultural', 'nightlife', 'parks'],
  'Austin': ['dining', 'nightlife', 'cultural', 'nature', 'hidden_gems', 'parks'],
  'Nashville': ['nightlife', 'dining', 'cultural', 'landmarks', 'shopping', 'hidden_gems'],
  'New Orleans': ['dining', 'nightlife', 'cultural', 'landmarks', 'hidden_gems', 'museums'],

  // Middle East
  'Dubai': ['landmarks', 'shopping', 'dining', 'beaches', 'adventure', 'nightlife'],
  'Abu Dhabi': ['landmarks', 'cultural', 'beaches', 'dining', 'shopping', 'adventure'],
  'Tel Aviv': ['beaches', 'dining', 'nightlife', 'cultural', 'hidden_gems', 'museums'],
  'Jerusalem': ['cultural', 'landmarks', 'museums', 'dining', 'hidden_gems'],

  // Africa
  'Morocco': ['cultural', 'landmarks', 'dining', 'shopping', 'nature', 'hidden_gems'],
  'Marrakech': ['cultural', 'dining', 'shopping', 'landmarks', 'hidden_gems', 'parks'],
  'Cape Town': ['beaches', 'nature', 'dining', 'landmarks', 'adventure', 'nightlife'],
  'Tanzania': ['wildlife', 'nature', 'adventure', 'beaches', 'cultural', 'hidden_gems'],
  'Kenya': ['wildlife', 'nature', 'adventure', 'beaches', 'cultural', 'hidden_gems'],
};

// Regional category patterns for smart fallbacks
const REGIONAL_PATTERNS: { pattern: RegExp; categories: string[] }[] = [
  // Caribbean & tropical islands
  {
    pattern: /caribbean|island|cay|keys|virgin|cayman|trinidad|tobago|grenada|antigua|martinique|guadeloupe|curacao|bonaire|sint|saint|st\./i,
    categories: ['beaches', 'water_sports', 'dining', 'nightlife', 'nature', 'hidden_gems']
  },
  // Beach/coastal destinations
  {
    pattern: /beach|coast|shore|bay|cove|playa|praia|strand/i,
    categories: ['beaches', 'water_sports', 'dining', 'nature', 'nightlife', 'hidden_gems']
  },
  // Mountain/nature destinations
  {
    pattern: /mountain|alps|peak|valley|forest|national park|reserve/i,
    categories: ['nature', 'adventure', 'wildlife', 'hiking', 'dining', 'hidden_gems']
  },
];

// Get categories for a destination, with smart fallbacks
export function getCategoriesForDestination(destinationName: string): Category[] {
  // Check for exact match first
  if (DESTINATION_CATEGORIES[destinationName]) {
    return ALL_CATEGORIES.filter(cat =>
      DESTINATION_CATEGORIES[destinationName].includes(cat.id)
    );
  }

  // Check for partial match (e.g., "Panama City, Panama" matches "Panama")
  for (const [name, cats] of Object.entries(DESTINATION_CATEGORIES)) {
    if (destinationName.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(destinationName.toLowerCase())) {
      return ALL_CATEGORIES.filter(cat => cats.includes(cat.id));
    }
  }

  // Check regional patterns
  for (const { pattern, categories } of REGIONAL_PATTERNS) {
    if (pattern.test(destinationName)) {
      return ALL_CATEGORIES.filter(cat => categories.includes(cat.id));
    }
  }

  // Default categories - include beaches and water sports as they're common travel activities
  // Better to show more options than miss relevant ones
  return ALL_CATEGORIES.filter(cat =>
    ['beaches', 'dining', 'landmarks', 'cultural', 'nature', 'water_sports', 'shopping', 'hidden_gems'].includes(cat.id)
  );
}

// Get category by ID
export function getCategoryById(id: string): Category | undefined {
  return ALL_CATEGORIES.find(cat => cat.id === id);
}
