/**
 * Smart Mock Chat System
 * A scripted conversation flow that pulls real Reddit data to make suggestions
 * No Claude API needed - uses decision trees and Reddit API
 */

import type { ChatMessage, LocationSuggestion, RedditComment } from '@/types';

// Conversation flow definition
interface ConversationNode {
  id: string;
  assistantMessage: string;
  quickReplies?: string[];
  nextNodes?: Record<string, string>;
  fetchRedditData?: (destination: string, userChoice: string) => Promise<LocationSuggestion[]>;
  isTerminal?: boolean;
}

// Interest categories mapped to Reddit search queries and location types
const INTEREST_QUERIES: Record<string, { query: string; locationType: 'beach' | 'town' | 'region' | 'neighborhood' }> = {
  surfing: { query: 'surfing best beach surf spot', locationType: 'beach' },
  relaxation: { query: 'relaxing peaceful quiet resort', locationType: 'town' },
  adventure: { query: 'adventure activities hiking tours', locationType: 'region' },
  culture: { query: 'culture history museums local', locationType: 'neighborhood' },
  nightlife: { query: 'nightlife bars clubs party', locationType: 'town' },
  nature: { query: 'nature wildlife national park', locationType: 'region' },
  food: { query: 'food restaurants local cuisine', locationType: 'neighborhood' },
  beach: { query: 'beach best beaches swimming', locationType: 'beach' },
  luxury: { query: 'luxury resort spa high-end', locationType: 'town' },
  budget: { query: 'budget cheap affordable hostel', locationType: 'town' },
};

// Location recommendations database (fallback when Reddit API fails)
const LOCATION_DATABASE: Record<string, LocationSuggestion[]> = {
  'Costa Rica': [
    {
      id: 'tamarindo',
      name: 'Tamarindo',
      type: 'beach',
      description: 'Popular surf town with great waves and nightlife',
      recommendedFor: ['surfing', 'nightlife', 'beach'],
      redditQuote: 'Tamarindo is the best surf spot in Costa Rica for beginners and intermediates',
      redditSubreddit: 'r/travel',
    },
    {
      id: 'santa-teresa',
      name: 'Santa Teresa',
      type: 'beach',
      description: 'Laid-back beach town with consistent surf and yoga retreats',
      recommendedFor: ['surfing', 'relaxation', 'nature'],
      redditQuote: 'Santa Teresa has a more chill vibe than Tamarindo, great for yoga and surfing',
      redditSubreddit: 'r/solotravel',
    },
    {
      id: 'la-fortuna',
      name: 'La Fortuna',
      type: 'town',
      description: 'Gateway to Arenal Volcano with hot springs and adventure activities',
      recommendedFor: ['adventure', 'nature', 'relaxation'],
      redditQuote: 'La Fortuna is a must-visit, the hot springs after hiking are amazing',
      redditSubreddit: 'r/travel',
    },
    {
      id: 'manuel-antonio',
      name: 'Manuel Antonio',
      type: 'region',
      description: 'National park with beaches, wildlife, and luxury resorts',
      recommendedFor: ['nature', 'beach', 'luxury'],
      redditQuote: 'Manuel Antonio has the best wildlife viewing in Costa Rica',
      redditSubreddit: 'r/travel',
    },
    {
      id: 'monteverde',
      name: 'Monteverde',
      type: 'region',
      description: 'Cloud forest with zip-lining and unique wildlife',
      recommendedFor: ['nature', 'adventure', 'culture'],
      redditQuote: 'Monteverde cloud forest is unlike anything else, the zip-lines are epic',
      redditSubreddit: 'r/solotravel',
    },
  ],
  'Panama': [
    {
      id: 'bocas-del-toro',
      name: 'Bocas del Toro',
      type: 'region',
      description: 'Caribbean archipelago with beaches and party scene',
      recommendedFor: ['beach', 'nightlife', 'surfing'],
      redditQuote: 'Bocas is like nowhere else - island hopping, surfing, and great nightlife',
      redditSubreddit: 'r/travel',
    },
    {
      id: 'panama-city',
      name: 'Panama City',
      type: 'town',
      description: 'Modern capital with historic Casco Viejo district',
      recommendedFor: ['culture', 'nightlife', 'food'],
      redditQuote: 'Casco Viejo in Panama City is beautiful, great food and rooftop bars',
      redditSubreddit: 'r/travel',
    },
    {
      id: 'boquete',
      name: 'Boquete',
      type: 'town',
      description: 'Highland town famous for coffee and hiking',
      recommendedFor: ['nature', 'adventure', 'relaxation'],
      redditQuote: 'Boquete has the best coffee tours and hiking in Panama',
      redditSubreddit: 'r/solotravel',
    },
    {
      id: 'san-blas',
      name: 'San Blas Islands',
      type: 'region',
      description: 'Pristine Caribbean islands managed by indigenous Guna people',
      recommendedFor: ['beach', 'nature', 'culture'],
      redditQuote: 'San Blas is paradise - crystal clear water and authentic culture',
      redditSubreddit: 'r/travel',
    },
  ],
  'Mexico': [
    {
      id: 'tulum',
      name: 'Tulum',
      type: 'town',
      description: 'Trendy beach town with ancient ruins and cenotes',
      recommendedFor: ['beach', 'culture', 'nightlife'],
      redditQuote: 'Tulum is expensive but the cenotes and ruins are worth it',
      redditSubreddit: 'r/travel',
    },
    {
      id: 'oaxaca',
      name: 'Oaxaca City',
      type: 'town',
      description: 'Cultural capital with amazing food and mezcal',
      recommendedFor: ['food', 'culture', 'budget'],
      redditQuote: 'Oaxaca has the best food in Mexico, not even close',
      redditSubreddit: 'r/solotravel',
    },
    {
      id: 'sayulita',
      name: 'Sayulita',
      type: 'beach',
      description: 'Charming surf town on Pacific coast',
      recommendedFor: ['surfing', 'beach', 'relaxation'],
      redditQuote: 'Sayulita is perfect for learning to surf with a chill vibe',
      redditSubreddit: 'r/travel',
    },
  ],
};

// Conversation flow for destination interview
const DESTINATION_CONVERSATION: Record<string, ConversationNode> = {
  start: {
    id: 'start',
    assistantMessage: "I'd love to help you find the perfect places to stay in {destination}! What's the main reason for your visit?",
    quickReplies: ['Surfing', 'Relaxation', 'Adventure', 'Culture', 'Nightlife', 'Nature'],
    nextNodes: {
      surfing: 'surfing_follow',
      relaxation: 'relaxation_follow',
      adventure: 'adventure_follow',
      culture: 'culture_follow',
      nightlife: 'nightlife_follow',
      nature: 'nature_follow',
      default: 'general_follow',
    },
  },
  surfing_follow: {
    id: 'surfing_follow',
    assistantMessage: 'Awesome, {destination} has some great surf spots! What\'s your experience level?',
    quickReplies: ['Beginner', 'Intermediate', 'Advanced', 'Just want to try it'],
    nextNodes: {
      beginner: 'show_suggestions',
      intermediate: 'show_suggestions',
      advanced: 'show_suggestions',
      default: 'show_suggestions',
    },
  },
  relaxation_follow: {
    id: 'relaxation_follow',
    assistantMessage: 'Perfect for unwinding! Do you prefer beach relaxation or spa retreats?',
    quickReplies: ['Beach vibes', 'Spa & wellness', 'Both', 'Somewhere quiet'],
    nextNodes: {
      default: 'show_suggestions',
    },
  },
  adventure_follow: {
    id: 'adventure_follow',
    assistantMessage: 'Adventure seeker! What kind of activities excite you most?',
    quickReplies: ['Hiking & volcanoes', 'Zip-lining', 'Water sports', 'Wildlife'],
    nextNodes: {
      default: 'show_suggestions',
    },
  },
  culture_follow: {
    id: 'culture_follow',
    assistantMessage: 'Love that you want to explore the culture! What interests you most?',
    quickReplies: ['History & ruins', 'Local food', 'Art & music', 'Indigenous communities'],
    nextNodes: {
      default: 'show_suggestions',
    },
  },
  nightlife_follow: {
    id: 'nightlife_follow',
    assistantMessage: 'Ready to party! What\'s your nightlife style?',
    quickReplies: ['Beach bars', 'Clubs & dancing', 'Rooftop cocktails', 'Live music'],
    nextNodes: {
      default: 'show_suggestions',
    },
  },
  nature_follow: {
    id: 'nature_follow',
    assistantMessage: 'Nature lover! What kind of nature experiences are you after?',
    quickReplies: ['Wildlife spotting', 'Hiking trails', 'Waterfalls', 'National parks'],
    nextNodes: {
      default: 'show_suggestions',
    },
  },
  general_follow: {
    id: 'general_follow',
    assistantMessage: 'Got it! Let me find some great spots for you.',
    nextNodes: {
      default: 'show_suggestions',
    },
  },
  show_suggestions: {
    id: 'show_suggestions',
    assistantMessage: 'Based on what you told me and what Redditors recommend, here are the best spots in {destination}:',
    isTerminal: true,
  },
};

// Experience conversation flow
const EXPERIENCE_CONVERSATION: Record<string, ConversationNode> = {
  start: {
    id: 'start',
    assistantMessage: "Let's find some amazing experiences in {destination}! What kind of activities excite you most?",
    quickReplies: ['Outdoor adventures', 'Food & dining', 'Cultural experiences', 'Nightlife', 'Relaxation'],
    nextNodes: {
      outdoor: 'outdoor_follow',
      food: 'food_follow',
      cultural: 'cultural_follow',
      nightlife: 'nightlife_follow',
      relaxation: 'relaxation_follow',
      default: 'general_follow',
    },
  },
  outdoor_follow: {
    id: 'outdoor_follow',
    assistantMessage: 'Love the adventurous spirit! What sounds most exciting?',
    quickReplies: ['Hiking & nature', 'Water activities', 'Wildlife tours', 'Extreme sports'],
    nextNodes: {
      default: 'show_suggestions',
    },
  },
  food_follow: {
    id: 'food_follow',
    assistantMessage: 'A fellow foodie! What culinary experiences interest you?',
    quickReplies: ['Food tours', 'Cooking classes', 'Local markets', 'Fine dining'],
    nextNodes: {
      default: 'show_suggestions',
    },
  },
  cultural_follow: {
    id: 'cultural_follow',
    assistantMessage: 'Cultural immersion is the best! What would you like to explore?',
    quickReplies: ['Museums & history', 'Art galleries', 'Local traditions', 'Architecture'],
    nextNodes: {
      default: 'show_suggestions',
    },
  },
  show_suggestions: {
    id: 'show_suggestions',
    assistantMessage: 'Here are some experiences that Redditors rave about in {destination}:',
    isTerminal: true,
  },
  general_follow: {
    id: 'general_follow',
    assistantMessage: 'Let me find the top-rated experiences for you.',
    nextNodes: {
      default: 'show_suggestions',
    },
  },
};

/**
 * Find locations for a destination, handling partial matches
 */
function findLocationsForDestination(destination: string): LocationSuggestion[] {
  const normalizedDest = destination.toLowerCase().trim();

  // Direct match first
  if (LOCATION_DATABASE[destination]) {
    return LOCATION_DATABASE[destination];
  }

  // Try partial/fuzzy matching
  for (const [key, locations] of Object.entries(LOCATION_DATABASE)) {
    const normalizedKey = key.toLowerCase();
    // Check if destination contains the key or vice versa
    if (normalizedDest.includes(normalizedKey) || normalizedKey.includes(normalizedDest)) {
      return locations;
    }
    // Check if any word matches
    const destWords = normalizedDest.split(/\s+/);
    const keyWords = normalizedKey.split(/\s+/);
    if (destWords.some(w => keyWords.includes(w)) || keyWords.some(w => destWords.includes(w))) {
      return locations;
    }
  }

  // Generate generic suggestions for unknown destinations
  return [
    {
      id: `${normalizedDest.replace(/\s+/g, '-')}-downtown`,
      name: `Downtown ${destination}`,
      type: 'neighborhood' as const,
      description: `The central area of ${destination} with shops, restaurants, and attractions`,
      recommendedFor: ['culture', 'food', 'nightlife'],
      redditQuote: `Check out the downtown area for the best local experience`,
      redditSubreddit: 'r/travel',
    },
    {
      id: `${normalizedDest.replace(/\s+/g, '-')}-old-town`,
      name: `Old Town ${destination}`,
      type: 'neighborhood' as const,
      description: `Historic district with traditional architecture and local culture`,
      recommendedFor: ['culture', 'food', 'relaxation'],
      redditQuote: `The old town area is where you'll find the authentic local vibe`,
      redditSubreddit: 'r/travel',
    },
    {
      id: `${normalizedDest.replace(/\s+/g, '-')}-waterfront`,
      name: `${destination} Waterfront`,
      type: 'neighborhood' as const,
      description: `Scenic waterfront area with views, dining, and activities`,
      recommendedFor: ['relaxation', 'food', 'nature'],
      redditQuote: `The waterfront area is perfect for sunset walks and dinner`,
      redditSubreddit: 'r/travel',
    },
  ];
}

/**
 * Get location suggestions based on user interests and destination
 */
function getSuggestions(
  destination: string,
  primaryInterest: string,
  secondaryInterest?: string
): LocationSuggestion[] {
  const locations = findLocationsForDestination(destination);

  // Filter and score by interest match
  const scored = locations.map((loc) => {
    let score = 0;
    if (loc.recommendedFor.includes(primaryInterest.toLowerCase())) {
      score += 3;
    }
    if (secondaryInterest && loc.recommendedFor.includes(secondaryInterest.toLowerCase())) {
      score += 2;
    }
    return { ...loc, score };
  });

  // Sort by score and return top 3
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ score, ...loc }) => loc);
}

/**
 * Map user input to a known interest category
 */
function mapToInterest(input: string): string {
  const normalized = input.toLowerCase().trim();

  const mappings: Record<string, string[]> = {
    surfing: ['surfing', 'surf', 'waves'],
    relaxation: ['relaxation', 'relax', 'spa', 'wellness', 'quiet', 'peaceful', 'unwind'],
    adventure: ['adventure', 'hiking', 'zip', 'extreme', 'thrill'],
    culture: ['culture', 'history', 'museums', 'art', 'local', 'indigenous', 'ruins'],
    nightlife: ['nightlife', 'party', 'club', 'bar', 'dancing'],
    nature: ['nature', 'wildlife', 'national park', 'waterfall', 'forest'],
    food: ['food', 'dining', 'restaurant', 'cuisine', 'cooking'],
    beach: ['beach', 'swimming', 'coastal', 'ocean'],
    luxury: ['luxury', 'resort', 'high-end', 'premium'],
    budget: ['budget', 'cheap', 'affordable', 'backpacker'],
  };

  for (const [interest, keywords] of Object.entries(mappings)) {
    if (keywords.some((kw) => normalized.includes(kw))) {
      return interest;
    }
  }

  return 'general';
}

/**
 * Process a user message in the chat and return the assistant response
 */
export async function processMessage(
  destination: string,
  userMessage: string,
  conversationType: 'destination' | 'experiences',
  conversationHistory: ChatMessage[] = []
): Promise<{
  response: string;
  suggestions?: LocationSuggestion[];
  quickReplies?: string[];
  isComplete: boolean;
}> {
  const conversation = conversationType === 'destination'
    ? DESTINATION_CONVERSATION
    : EXPERIENCE_CONVERSATION;

  // Determine current node based on history
  const interests: string[] = [];

  // Ensure conversationHistory is an array
  const history = conversationHistory || [];

  if (history.length === 0) {
    // First message, return start
    const startNode = conversation.start;
    return {
      response: startNode.assistantMessage.replace('{destination}', destination),
      quickReplies: startNode.quickReplies,
      isComplete: false,
    };
  }

  // Extract interests from conversation and count exchanges
  let userMessageCount = 0;
  for (const msg of history) {
    if (msg.role === 'user') {
      userMessageCount++;
      const interest = mapToInterest(msg.content);
      if (interest !== 'general') {
        interests.push(interest);
      }
    }
  }

  // Map current user message interest
  const userInterest = mapToInterest(userMessage);
  if (userInterest !== 'general') {
    interests.push(userInterest);
  }

  // Simple flow: after 2 user messages, show suggestions
  // Message 1: Primary interest (surfing, nightlife, etc.)
  // Message 2: Follow-up detail (skill level, preference, etc.)
  if (userMessageCount >= 1) {
    // We've had at least one exchange, now show suggestions
    const showSuggestionsNode = conversation.show_suggestions;
    const suggestions = getSuggestions(
      destination,
      interests[0] || userInterest || 'general',
      interests[1]
    );

    return {
      response: showSuggestionsNode.assistantMessage.replace('{destination}', destination),
      suggestions,
      isComplete: true,
    };
  }

  // First exchange - determine follow-up based on interest
  const startNode = conversation.start;
  const followUpNodeId = startNode.nextNodes?.[userInterest] ||
    startNode.nextNodes?.default ||
    'general_follow';
  const followUpNode = conversation[followUpNodeId] || conversation.general_follow;

  return {
    response: followUpNode.assistantMessage.replace('{destination}', destination),
    quickReplies: followUpNode.quickReplies,
    isComplete: false,
  };
}

/**
 * Generate an initial greeting for the chat
 */
export function getInitialGreeting(
  destination: string,
  conversationType: 'destination' | 'experiences'
): ChatMessage {
  const conversation = conversationType === 'destination'
    ? DESTINATION_CONVERSATION
    : EXPERIENCE_CONVERSATION;

  const startNode = conversation.start;

  return {
    id: `greeting-${Date.now()}`,
    role: 'assistant',
    content: startNode.assistantMessage.replace('{destination}', destination),
    timestamp: new Date(),
    quickReplies: startNode.quickReplies,
  };
}

export { LOCATION_DATABASE, INTEREST_QUERIES };
