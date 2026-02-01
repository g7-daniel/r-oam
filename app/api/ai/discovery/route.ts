import { NextRequest } from 'next/server';
import { z } from 'zod';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import { searchReddit } from '@/lib/reddit';

export const runtime = 'nodejs';

const GROQ_MODEL = 'llama-3.3-70b-versatile';
const GEMINI_MODEL = 'gemini-2.5-flash';

// Initialize Groq client
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || '',
  baseURL: 'https://api.groq.com/openai/v1',
});

// Initialize Gemini client (fallback)
const gemini = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

// ============ ZOD SCHEMAS ============

const RecommendationSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.enum([
    'beaches', 'museums', 'food_tours', 'nightlife', 'day_trips',
    'hidden_gems', 'outdoor', 'shopping', 'cultural', 'wellness',
    'adventure', 'nature', 'landmarks', 'entertainment', 'dining',
    'water_sports', 'wildlife', 'tours', 'sports', 'relaxation',
  ]),
  whyMatch: z.string(),
  source: z.object({
    type: z.enum(['reddit', 'ai', 'curated']),
    subreddit: z.string().optional(),
    quote: z.string().optional(),
    upvotes: z.number().optional(), // Reddit upvote count for the quote/recommendation
  }),
  estimatedDurationMinutes: z.number().optional(),
  estimatedCostUsd: z.number().optional(),
  imageQuery: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  // Dining-specific fields
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'any']).optional(),
  preferredTime: z.string().optional(), // e.g., "19:00"
  diningStyle: z.enum(['street_food', 'casual', 'fine_dining', 'local_favorite', 'food_tour']).optional(),
  reservationRequired: z.boolean().optional(),
  cuisineType: z.string().optional(),
});

const AIResponseSchema = z.object({
  type: z.enum(['question', 'recommendations', 'error']),
  message: z.string(), // The conversational message to show the user
  recommendations: z.array(RecommendationSchema).optional(),
  followUpQuestion: z.string().optional(),
  interestsDetected: z.array(z.string()).optional(),
});

type AIResponse = z.infer<typeof AIResponseSchema>;

// ============ REQUEST SCHEMA ============

const RequestSchema = z.object({
  destinationId: z.string(),
  destinationName: z.string(),
  countryCode: z.string(),
  message: z.string(),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })),
  tripContext: z.object({
    totalBudget: z.number().optional(), // Total budget for ENTIRE trip
    totalDestinations: z.number().optional(), // Number of destinations in trip
    allDestinations: z.array(z.string()).optional(), // Names of all destinations
    destinationNights: z.number().optional(), // Nights for THIS destination
    totalNights: z.number().optional(), // Total nights for entire trip
    pace: z.string().optional(),
    budgetStyle: z.string().optional(),
    tripTypeTags: z.array(z.string()).optional(),
    travelers: z.object({
      adults: z.number(),
      children: z.number(),
    }).optional(),
  }).optional(),
});

// ============ SYSTEM PROMPT ============

// Destination type classification for context-aware questions
const DESTINATION_TYPES: Record<string, { type: string; highlights: string[] }> = {
  // City destinations
  'Tokyo': { type: 'city', highlights: ['temples', 'food', 'shopping', 'pop culture', 'technology', 'nightlife'] },
  'Kyoto': { type: 'city', highlights: ['temples', 'traditional culture', 'gardens', 'geisha districts', 'tea ceremonies'] },
  'Osaka': { type: 'city', highlights: ['food', 'nightlife', 'shopping', 'castles', 'entertainment'] },
  'Paris': { type: 'city', highlights: ['museums', 'food', 'architecture', 'romance', 'shopping', 'nightlife'] },
  'London': { type: 'city', highlights: ['museums', 'history', 'theater', 'pubs', 'shopping', 'royal sites'] },
  'New York': { type: 'city', highlights: ['museums', 'Broadway', 'food', 'shopping', 'nightlife', 'landmarks'] },
  'Los Angeles': { type: 'city', highlights: ['beaches', 'entertainment', 'food', 'shopping', 'hiking', 'nightlife'] },
  'San Francisco': { type: 'city', highlights: ['landmarks', 'food', 'parks', 'culture', 'tech', 'neighborhoods'] },
  'Rome': { type: 'city', highlights: ['ancient history', 'museums', 'food', 'architecture', 'Vatican'] },
  'Barcelona': { type: 'city', highlights: ['architecture', 'beaches', 'food', 'nightlife', 'art'] },
  'Amsterdam': { type: 'city', highlights: ['canals', 'museums', 'cycling', 'nightlife', 'history'] },
  'Singapore': { type: 'city', highlights: ['food', 'shopping', 'gardens', 'architecture', 'nightlife'] },
  'Hong Kong': { type: 'city', highlights: ['food', 'shopping', 'skyline', 'temples', 'hiking', 'nightlife'] },
  'Seoul': { type: 'city', highlights: ['food', 'shopping', 'K-culture', 'palaces', 'nightlife', 'technology'] },
  'Bangkok': { type: 'city', highlights: ['temples', 'food', 'markets', 'nightlife', 'shopping', 'culture'] },
  'Berlin': { type: 'city', highlights: ['history', 'museums', 'nightlife', 'art', 'food', 'culture'] },
  'Prague': { type: 'city', highlights: ['architecture', 'history', 'beer', 'nightlife', 'castles'] },
  'Vienna': { type: 'city', highlights: ['music', 'coffee houses', 'palaces', 'museums', 'food'] },
  'Lisbon': { type: 'city', highlights: ['food', 'nightlife', 'history', 'beaches', 'architecture'] },

  // Beach destinations
  'Bali': { type: 'beach', highlights: ['beaches', 'temples', 'rice terraces', 'surfing', 'yoga', 'nightlife'] },
  'Phuket': { type: 'beach', highlights: ['beaches', 'islands', 'nightlife', 'water sports', 'Thai food'] },
  'Cancun': { type: 'beach', highlights: ['beaches', 'Mayan ruins', 'nightlife', 'water sports', 'cenotes'] },
  'Tulum': { type: 'beach', highlights: ['beaches', 'Mayan ruins', 'cenotes', 'yoga', 'nightlife'] },
  'Playa del Carmen': { type: 'beach', highlights: ['beaches', 'nightlife', 'diving', 'shopping', 'food'] },
  'Maldives': { type: 'beach', highlights: ['beaches', 'snorkeling', 'diving', 'luxury resorts', 'overwater villas'] },
  'Santorini': { type: 'beach', highlights: ['beaches', 'sunsets', 'wine', 'architecture', 'romance'] },
  'Mykonos': { type: 'beach', highlights: ['beaches', 'nightlife', 'restaurants', 'shopping', 'parties'] },
  'Miami': { type: 'beach', highlights: ['beaches', 'nightlife', 'Art Deco', 'food', 'shopping', 'Cuban culture'] },
  'Hawaii': { type: 'beach', highlights: ['beaches', 'volcanoes', 'hiking', 'snorkeling', 'luaus', 'nature'] },
  'Maui': { type: 'beach', highlights: ['beaches', 'Road to Hana', 'snorkeling', 'whale watching', 'hiking'] },
  'Koh Samui': { type: 'beach', highlights: ['beaches', 'temples', 'nightlife', 'water sports', 'wellness'] },

  // Nature/Adventure destinations
  'Costa Rica': { type: 'nature', highlights: ['rainforests', 'wildlife', 'volcanoes', 'beaches', 'adventure sports', 'zip-lining', 'surfing'] },
  'Tamarindo': { type: 'beach', highlights: ['surfing', 'beaches', 'wildlife', 'fishing', 'nightlife', 'sea turtles'] },
  'Manuel Antonio': { type: 'nature', highlights: ['national park', 'beaches', 'wildlife', 'monkeys', 'hiking'] },
  'La Fortuna': { type: 'nature', highlights: ['Arenal volcano', 'hot springs', 'waterfalls', 'zip-lining', 'wildlife'] },
  'Monteverde': { type: 'nature', highlights: ['cloud forest', 'zip-lining', 'wildlife', 'hanging bridges', 'birdwatching'] },
  'Santa Teresa': { type: 'beach', highlights: ['surfing', 'beaches', 'yoga', 'nightlife', 'restaurants', 'wellness'] },
  'Jaco': { type: 'beach', highlights: ['surfing', 'beaches', 'nightlife', 'water sports', 'restaurants'] },
  'Puerto Viejo': { type: 'beach', highlights: ['beaches', 'Caribbean culture', 'reggae', 'snorkeling', 'local food'] },
  'Nosara': { type: 'beach', highlights: ['surfing', 'yoga', 'beaches', 'wellness', 'wildlife', 'eco-tourism'] },
  'Guanacaste': { type: 'beach', highlights: ['beaches', 'national parks', 'surfing', 'wildlife', 'volcanoes'] },
  'Panama': { type: 'mixed', highlights: ['Panama Canal', 'beaches', 'rainforests', 'city life', 'indigenous culture'] },
  'Panama City': { type: 'city', highlights: ['Panama Canal', 'Casco Viejo', 'food', 'nightlife', 'shopping'] },
  'Bocas del Toro': { type: 'beach', highlights: ['beaches', 'surfing', 'snorkeling', 'nightlife', 'islands'] },
  'Iceland': { type: 'nature', highlights: ['northern lights', 'geysers', 'glaciers', 'waterfalls', 'hiking', 'hot springs'] },
  'New Zealand': { type: 'nature', highlights: ['hiking', 'adventure sports', 'Lord of the Rings', 'glaciers', 'Maori culture'] },

  // Cultural destinations
  'Thailand': { type: 'mixed', highlights: ['temples', 'beaches', 'food', 'islands', 'nightlife', 'culture'] },
  'Chiang Mai': { type: 'cultural', highlights: ['temples', 'markets', 'food', 'trekking', 'elephants', 'culture'] },
  'Japan': { type: 'mixed', highlights: ['temples', 'food', 'culture', 'technology', 'nature', 'hot springs'] },
  'Greece': { type: 'mixed', highlights: ['ancient ruins', 'beaches', 'islands', 'food', 'history'] },
  'Morocco': { type: 'cultural', highlights: ['medinas', 'souks', 'desert', 'food', 'architecture', 'culture'] },
  'Marrakech': { type: 'cultural', highlights: ['medina', 'souks', 'palaces', 'food', 'riads', 'gardens'] },
  'Egypt': { type: 'cultural', highlights: ['pyramids', 'temples', 'Nile', 'history', 'markets'] },
  'Peru': { type: 'cultural', highlights: ['Machu Picchu', 'food', 'Andes', 'history', 'culture'] },
  'India': { type: 'cultural', highlights: ['temples', 'food', 'history', 'culture', 'palaces', 'spirituality'] },

  // Middle East
  'Tel Aviv': { type: 'city', highlights: ['beaches', 'food scene', 'nightlife', 'Bauhaus architecture', 'Jaffa', 'culture'] },
  'Jerusalem': { type: 'cultural', highlights: ['holy sites', 'Old City', 'history', 'markets', 'food', 'Dead Sea day trips'] },
  'Israel': { type: 'mixed', highlights: ['holy sites', 'beaches', 'history', 'food', 'nightlife', 'desert'] },
  'Jordan': { type: 'cultural', highlights: ['Petra', 'Wadi Rum', 'Dead Sea', 'Roman ruins', 'local cuisine', 'desert adventures'] },
  'Dubai': { type: 'city', highlights: ['luxury', 'shopping', 'architecture', 'desert', 'beaches', 'dining'] },
  'Abu Dhabi': { type: 'city', highlights: ['mosques', 'culture', 'beaches', 'shopping', 'luxury'] },

  // More cities
  'Athens': { type: 'city', highlights: ['Acropolis', 'ancient ruins', 'food', 'neighborhoods', 'nightlife', 'history'] },
  'Budapest': { type: 'city', highlights: ['baths', 'architecture', 'nightlife', 'food', 'history'] },
  'Florence': { type: 'city', highlights: ['art', 'museums', 'food', 'architecture', 'wine', 'shopping'] },
  'Venice': { type: 'city', highlights: ['canals', 'architecture', 'art', 'romance', 'food'] },
  'Dublin': { type: 'city', highlights: ['pubs', 'history', 'music', 'literature', 'food'] },
  'Edinburgh': { type: 'city', highlights: ['castles', 'history', 'festivals', 'whisky', 'food'] },
  'Copenhagen': { type: 'city', highlights: ['design', 'food', 'cycling', 'hygge', 'architecture'] },
  'Stockholm': { type: 'city', highlights: ['islands', 'design', 'food', 'history', 'nature'] },
  'Sydney': { type: 'city', highlights: ['beaches', 'Opera House', 'food', 'harbor', 'wildlife'] },
  'Melbourne': { type: 'city', highlights: ['food', 'coffee', 'art', 'sports', 'nightlife'] },
  'Cape Town': { type: 'mixed', highlights: ['Table Mountain', 'beaches', 'wine', 'wildlife', 'food'] },
  'Rio de Janeiro': { type: 'mixed', highlights: ['beaches', 'Christ the Redeemer', 'samba', 'nightlife', 'food'] },
  'Buenos Aires': { type: 'city', highlights: ['tango', 'food', 'nightlife', 'architecture', 'culture'] },

  // Caribbean
  'Jamaica': { type: 'beach', highlights: ['beaches', 'reggae', 'food', 'waterfalls', 'culture'] },
  'Punta Cana': { type: 'beach', highlights: ['beaches', 'resorts', 'golf', 'water sports', 'nightlife'] },
  'Aruba': { type: 'beach', highlights: ['beaches', 'water sports', 'nightlife', 'casinos', 'food'] },
  'Puerto Rico': { type: 'mixed', highlights: ['beaches', 'Old San Juan', 'food', 'nightlife', 'rainforest'] },
};

function getDestinationContext(destination: string): string {
  const info = DESTINATION_TYPES[destination];
  if (info) {
    return `${destination} is known as a ${info.type} destination famous for: ${info.highlights.join(', ')}.`;
  }

  // Try to match partial names
  for (const [name, data] of Object.entries(DESTINATION_TYPES)) {
    if (destination.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(destination.toLowerCase())) {
      return `${destination} is known as a ${data.type} destination famous for: ${data.highlights.join(', ')}.`;
    }
  }

  // Infer destination type from keywords in the name
  const destLower = destination.toLowerCase();

  // Beach/island indicators
  if (destLower.includes('beach') || destLower.includes('island') || destLower.includes('coast') ||
      destLower.includes('bay') || destLower.includes('playa') || destLower.includes('cabo')) {
    return `${destination} appears to be a beach/coastal destination. Focus on beaches, water sports, seafood, and coastal activities.`;
  }

  // Nature/adventure indicators
  if (destLower.includes('park') || destLower.includes('forest') || destLower.includes('mountain') ||
      destLower.includes('volcano') || destLower.includes('canyon') || destLower.includes('falls')) {
    return `${destination} appears to be a nature/adventure destination. Focus on hiking, wildlife, natural attractions, and outdoor activities.`;
  }

  // City indicators
  if (destLower.includes('city') || destLower.includes('town')) {
    return `${destination} is an urban destination. Focus on local food, culture, nightlife, museums, and city attractions.`;
  }

  // Default context that instructs AI to be destination-specific
  return `IMPORTANT: Research and recommend ONLY things that are actually in ${destination}. Do not recommend generic tourist activities - only suggest real places, restaurants, and experiences that exist in ${destination}. If you're unsure about specific locations, recommend asking locals or checking recent travel blogs.`;
}

function createSystemPrompt(
  destination: string,
  countryCode: string,
  tripContext: {
    totalBudget?: number;
    totalDestinations?: number;
    allDestinations?: string[];
    destinationNights?: number;
    totalNights?: number;
    pace?: string;
    budgetStyle?: string;
    tripTypeTags?: string[];
    travelers?: { adults: number; children: number };
  },
  redditContext: string
): string {
  // Calculate approximate budget per destination
  const budgetPerDestination = tripContext.totalBudget && tripContext.totalDestinations
    ? Math.round(tripContext.totalBudget / tripContext.totalDestinations)
    : null;

  // Get destination-specific context
  const destContext = getDestinationContext(destination);

  return `You are Snoo, the Reddit-powered travel guide for r/oam. You help travelers discover amazing things to do in ${destination}, ${countryCode}.

## YOUR PERSONALITY (Snoo)
- You are friendly, enthusiastic, and knowledgeable - like Reddit's favorite travel buddy
- You ALWAYS cite Reddit sources when recommending ("Reddit travelers love..." or "According to r/travel...")
- You mention upvote counts to build trust ("This got 847 upvotes on r/travel!")
- You use casual, conversational language - NOT corporate travel-agent speak
- You're honest about pros and cons - real travelers appreciate authenticity
- You emphasize that your recommendations come from REAL travelers, not paid ads

## DESTINATION CONTEXT
${destContext || `${destination} offers a variety of experiences. Research what this destination is famous for before making suggestions.`}

## CRITICAL DESTINATION RULES - YOU MUST FOLLOW THESE:
1. ONLY recommend places that ACTUALLY EXIST in ${destination}
2. NEVER suggest generic activities - every recommendation must be a REAL, NAMED place in ${destination}
3. If ${destination} is a beach destination, focus on beaches, water sports, seafood restaurants
4. If ${destination} is a nature destination, focus on national parks, hiking, wildlife, adventure
5. If ${destination} is a city, focus on local restaurants, museums, neighborhoods, nightlife
6. NEVER recommend:
   - Temples for non-Asian/Middle Eastern destinations unless they actually have them
   - Beaches for landlocked cities
   - Ski resorts for tropical destinations
   - Activities that don't exist in ${destination}
7. When in doubt, recommend FOOD and DINING - every destination has great local restaurants
8. Include specific neighborhood or area names when possible (e.g., "Senso-ji Temple in Asakusa" not just "a temple")

## CRITICAL: Response Format
You MUST respond with ONLY a valid JSON object. No markdown, no explanations, no code blocks - just pure JSON.

The JSON must match this exact structure:
{
  "type": "question" | "recommendations",
  "message": "Your friendly conversational message as Snoo",
  "recommendations": [...],  // Only when type is "recommendations"
  "followUpQuestion": "Optional follow-up",  // Only when type is "question"
  "interestsDetected": ["interest1", "interest2"]  // What you've learned so far
}

## CRITICAL: ALWAYS GIVE RECOMMENDATIONS
1. NEVER ask clarifying questions. ALWAYS provide recommendations immediately.
2. If the user mentions ANY interest at all (food, culture, adventure, etc.), give 4-6 recommendations RIGHT AWAY
3. If the user's message is vague (like "what should I do?" or "looking for things to do"), give a MIX of the destination's top highlights
4. You can ask follow-up questions ONLY at the end of your message, AFTER providing recommendations
5. Users came here for recommendations, not an interview - deliver value immediately
6. CRITICAL: After EVERY batch of recommendations, suggest exploring another category:
   - After sightseeing: "Reddit also has great tips for museums and cultural sites - interested?"
   - After culture: "Now for the adventurous side - any interest in outdoor activities?"
   - After outdoors: "Reddit foodies have amazing market and shopping recommendations..."
   - After shopping: "Now let's talk food! Where do you want to eat? I've got tons of Reddit-approved spots!"
   - After a few exchanges, ALWAYS ask about restaurants
6. The conversation should naturally flow: Activities -> Culture -> Outdoors -> Shopping -> DINING -> Nightlife
7. ALWAYS end your message with a question leading to the next topic
8. CRITICAL DINING RULES:
   - After 2-3 topic exchanges, ALWAYS prompt: "Now for the important stuff - FOOD! Are you interested in breakfast spots, lunch places, or dinner restaurants?"
   - When asking about dining, ask: "What's your vibe - street food and hidden gems, casual local favorites, or special-occasion fine dining?"
   - ALWAYS ask what TIME they prefer to eat
   - ALWAYS ask about PARTY SIZE: "Will it just be the ${tripContext.travelers?.adults || 'two'} of you, or might others join?"
   - After recommending a restaurant, ALWAYS ask: "This one has great reviews on r/travel - want me to check if there are tables available?"
   - For each restaurant recommendation, ALWAYS include:
     - mealType: "breakfast", "lunch", or "dinner"
     - preferredTime: suggested time like "19:00" or "12:30"
     - diningStyle: "street_food", "casual", "fine_dining", "local_favorite", or "food_tour"
     - reservationRequired: true/false
     - cuisineType: type of cuisine

## Trip Overview
${tripContext.totalBudget ? `- TOTAL Trip Budget: $${tripContext.totalBudget.toLocaleString()} (for the ENTIRE trip across ALL destinations)` : ''}
${tripContext.totalDestinations && tripContext.totalDestinations > 1 ? `- This is a multi-destination trip with ${tripContext.totalDestinations} destinations: ${tripContext.allDestinations?.join(', ') || ''}` : ''}
${budgetPerDestination ? `- Approximate budget for ${destination}: ~$${budgetPerDestination.toLocaleString()} (roughly divided)` : ''}
${tripContext.destinationNights ? `- Time in ${destination}: ${tripContext.destinationNights} nights` : ''}
${tripContext.totalNights ? `- Total trip duration: ${tripContext.totalNights} nights` : ''}
${tripContext.budgetStyle ? `- Travel style: ${tripContext.budgetStyle}` : ''}
${tripContext.pace ? `- Pace preference: ${tripContext.pace}` : ''}
${tripContext.tripTypeTags?.length ? `- Trip type: ${tripContext.tripTypeTags.join(', ')}` : ''}
${tripContext.travelers ? `- Travelers: ${tripContext.travelers.adults} adults${tripContext.travelers.children > 0 ? `, ${tripContext.travelers.children} children` : ''}` : ''}

## Reddit Insights
${redditContext}

## When Making Recommendations
Each recommendation MUST have:
- id: A unique snake_case identifier (e.g., "arenal_volcano_hike")
- name: Specific place/experience name
- description: What it is and what you'll do (2-3 sentences)
- category: One of: beaches, museums, food_tours, nightlife, day_trips, hidden_gems, outdoor, shopping, cultural, wellness, adventure, nature, landmarks, entertainment, dining, water_sports, wildlife, tours, sports, relaxation
- whyMatch: Why this matches THEIR stated interests (1-2 sentences, personalized)
- source: { type: "reddit" | "ai" | "curated", subreddit?: "travel" (without r/ prefix), quote?: "actual quote if from Reddit", upvotes?: number (e.g., 347) }
- estimatedDurationMinutes: Number (e.g., 180 for 3 hours)
- estimatedCostUsd: Number (per person)

FOR DINING/RESTAURANT RECOMMENDATIONS (category = "dining"), ALSO include:
- mealType: "breakfast" | "lunch" | "dinner" | "any"
- preferredTime: Suggested time like "19:00" or "08:30"
- diningStyle: "street_food" | "casual" | "fine_dining" | "local_favorite" | "food_tour"
- reservationRequired: true | false
- cuisineType: Type of cuisine (e.g., "Italian", "Local Traditional", "Seafood")

When citing Reddit, include realistic upvote counts (100-2000 range) to show community validation.

## Examples

IMPORTANT: Always respond with type "recommendations", never type "question"

Example for a specific interest (user says "I'm interested in food"):
{
  "type": "recommendations",
  "message": "Based on what you've told me about loving outdoor adventures and wanting to see wildlife, here are my top picks for you! I've included some amazing nature experiences below. By the way, are you also interested in local food and dining? Costa Rica has incredible options from street food to upscale restaurants.",
  "recommendations": [
    {
      "id": "monteverde_cloud_forest",
      "name": "Monteverde Cloud Forest Reserve",
      "description": "One of the most biodiverse places on Earth. You'll walk suspended bridges through the misty canopy, spotting exotic birds, monkeys, and if you're lucky, the elusive quetzal.",
      "category": "nature",
      "whyMatch": "You mentioned wanting to see unique wildlife and being comfortable with moderate hikes - this is perfect for that.",
      "source": { "type": "reddit", "subreddit": "travel", "quote": "Monteverde was the highlight of our Costa Rica trip - the cloud forest is absolutely magical", "upvotes": 847 },
      "estimatedDurationMinutes": 240,
      "estimatedCostUsd": 25
    },
    {
      "id": "arenal_volcano",
      "name": "Arenal Volcano National Park",
      "description": "Hike around the base of Costa Rica's most famous volcano, then relax in natural hot springs with volcanic views.",
      "category": "nature",
      "whyMatch": "Combines the outdoor adventure you want with a unique volcanic landscape experience.",
      "source": { "type": "reddit", "subreddit": "travel", "quote": "The hot springs after hiking Arenal were the perfect way to end the day", "upvotes": 1203 },
      "estimatedDurationMinutes": 300,
      "estimatedCostUsd": 35
    }
  ],
  "followUpQuestion": "Would you like me to suggest some great local restaurants or food tours as well?",
  "interestsDetected": ["wildlife", "hiking", "nature"]
}

Example for vague request (user says "what should I do?" or "looking for things"):
{
  "type": "recommendations",
  "message": "Great question! Here are the highlights that Reddit travelers absolutely LOVE about ${destination}. I've included a mix of must-sees and hidden gems:",
  "recommendations": [
    // Include 4-6 diverse recommendations covering the destination's top highlights
  ],
  "followUpQuestion": "Would you like me to dive deeper into any of these categories? Or should we talk about food and dining?",
  "interestsDetected": ["general"]
}

CRITICAL RULES:
1. ONLY output valid JSON - no markdown, no text before or after
2. ALWAYS include 4-6 recommendations in EVERY response
3. NEVER respond with type "question" - ALWAYS use type "recommendations"
4. The "message" field should acknowledge what the user said, then introduce the recommendations
5. End with a follow-up question about another category (especially food/dining after 2 exchanges)
6. If the user asks "what else?" or similar, suggest a NEW category and give 4-6 NEW recommendations`;
}

// ============ REDDIT CONTEXT ============

async function getRedditContext(destination: string, interests: string[]): Promise<string> {
  try {
    const subreddits = ['travel', 'solotravel', 'TravelHacks'];
    const queries = interests.length > 0
      ? interests.slice(0, 2).map(i => `${destination} ${i}`)
      : [`${destination} things to do`, `${destination} must see`];

    const posts: string[] = [];

    for (const query of queries) {
      const results = await searchReddit(query, subreddits, 3);
      for (const post of results) {
        if (post.selftext && post.selftext.length > 50) {
          posts.push(`[r/${post.subreddit}] "${post.selftext.slice(0, 200)}..."`);
        }
      }
    }

    if (posts.length === 0) {
      return 'No Reddit discussions found yet. Make general recommendations.';
    }

    return posts.slice(0, 4).join('\n\n');
  } catch (error) {
    console.error('Reddit fetch error:', error);
    return 'Reddit data temporarily unavailable.';
  }
}

// ============ AI CALL WITH RETRY ============

// Map invalid categories to valid ones
const CATEGORY_MAPPING: Record<string, string> = {
  'restaurant': 'dining',
  'restaurants': 'dining',
  'food': 'dining',
  'temple': 'cultural',
  'temples': 'cultural',
  'historical': 'cultural',
  'history': 'cultural',
  'market': 'shopping',
  'markets': 'shopping',
  'park': 'nature',
  'parks': 'nature',
  'garden': 'nature',
  'gardens': 'nature',
  'bar': 'nightlife',
  'bars': 'nightlife',
  'club': 'nightlife',
  'clubs': 'nightlife',
  'beach': 'beaches',
  'museum': 'museums',
  'cafe': 'dining',
  'cafes': 'dining',
  'hike': 'outdoor',
  'hiking': 'outdoor',
  'snorkeling': 'water_sports',
  'diving': 'water_sports',
  'scuba': 'water_sports',
  'tour': 'tours',
  'walking_tour': 'tours',
  'food_tour': 'food_tours',
  'foodtour': 'food_tours',
  'landmark': 'landmarks',
  'monument': 'landmarks',
  'monuments': 'landmarks',
  'activity': 'adventure',
  'activities': 'adventure',
  'sport': 'sports',
  'spa': 'wellness',
  'massage': 'wellness',
  'yoga': 'wellness',
  'viewpoint': 'landmarks',
  'scenic': 'nature',
  'zoo': 'wildlife',
  'aquarium': 'wildlife',
  'show': 'entertainment',
  'theater': 'entertainment',
  'theatre': 'entertainment',
  'concert': 'entertainment',
  'gem': 'hidden_gems',
  'secret': 'hidden_gems',
  'local_favorite': 'hidden_gems',
  'excursion': 'day_trips',
  'day_trip': 'day_trips',
  'trip': 'day_trips',
  'relax': 'relaxation',
  'chill': 'relaxation',
};

const VALID_CATEGORIES = [
  'beaches', 'museums', 'food_tours', 'nightlife', 'day_trips',
  'hidden_gems', 'outdoor', 'shopping', 'cultural', 'wellness',
  'adventure', 'nature', 'landmarks', 'entertainment', 'dining',
  'water_sports', 'wildlife', 'tours', 'sports', 'relaxation',
];

const VALID_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'any'];
const VALID_DINING_STYLES = ['street_food', 'casual', 'fine_dining', 'local_favorite', 'food_tour'];

function normalizeCategory(category: string): string {
  if (!category) return 'cultural';
  const lower = category.toLowerCase().replace(/[\s_-]+/g, '_');
  if (VALID_CATEGORIES.includes(lower)) return lower;
  if (CATEGORY_MAPPING[lower]) return CATEGORY_MAPPING[lower];
  // Try partial match
  for (const [key, value] of Object.entries(CATEGORY_MAPPING)) {
    if (lower.includes(key) || key.includes(lower)) return value;
  }
  return 'cultural'; // Default fallback
}

function normalizeMealType(mealType: string | undefined): string | undefined {
  if (!mealType) return undefined;
  const lower = mealType.toLowerCase();
  if (VALID_MEAL_TYPES.includes(lower)) return lower;
  if (lower.includes('breakfast') || lower.includes('brunch')) return 'breakfast';
  if (lower.includes('lunch') || lower.includes('midday')) return 'lunch';
  if (lower.includes('dinner') || lower.includes('evening') || lower.includes('supper')) return 'dinner';
  return 'any';
}

function normalizeDiningStyle(style: string | undefined): string | undefined {
  if (!style) return undefined;
  const lower = style.toLowerCase().replace(/[\s-]+/g, '_');
  if (VALID_DINING_STYLES.includes(lower)) return lower;
  if (lower.includes('street') || lower.includes('stall') || lower.includes('hawker')) return 'street_food';
  if (lower.includes('fine') || lower.includes('upscale') || lower.includes('fancy')) return 'fine_dining';
  if (lower.includes('local') || lower.includes('authentic') || lower.includes('traditional')) return 'local_favorite';
  if (lower.includes('tour') || lower.includes('walk')) return 'food_tour';
  return 'casual';
}

function parseAIResponse(content: string): AIResponse {
  let cleaned = content.trim();

  // Remove markdown code blocks (```json ... ``` or ``` ... ```)
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }

  // Remove common prefixes that AI might add
  cleaned = cleaned.replace(/^(Here's|Here is|Sure|Okay|I'd|Based on).*?(\{)/i, '$2');

  // Try to find JSON object - be more aggressive
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }

  // Fix common JSON issues
  cleaned = cleaned
    .replace(/,\s*}/g, '}')  // Remove trailing commas
    .replace(/,\s*]/g, ']'); // Remove trailing commas in arrays

  const parsed = JSON.parse(cleaned);

  // Pre-process recommendations to fix invalid categories before Zod validation
  if (parsed.recommendations && Array.isArray(parsed.recommendations)) {
    parsed.recommendations = parsed.recommendations.map((rec: any, idx: number) => ({
      ...rec,
      id: rec.id || `rec_${Date.now()}_${idx}`,
      category: normalizeCategory(rec.category),
      mealType: normalizeMealType(rec.mealType),
      diningStyle: normalizeDiningStyle(rec.diningStyle),
    }));
  }

  const validated = AIResponseSchema.parse(parsed);

  return validated;
}

async function callGemini(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[]
): Promise<AIResponse> {
  if (!gemini) {
    throw new Error('Gemini not configured');
  }

  console.log('Falling back to Gemini...');

  // Combine system prompt with conversation into a single prompt
  const systemPrompt = messages.find(m => m.role === 'system')?.content || '';
  const conversationMessages = messages.filter(m => m.role !== 'system');

  // Build the full prompt
  const conversationText = conversationMessages
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n\n');

  const fullPrompt = `${systemPrompt}\n\n---\n\nConversation:\n${conversationText}\n\nCRITICAL: Output ONLY a valid JSON object. No markdown, no text before or after.`;

  // Retry up to 2 times
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await gemini.models.generateContent({
        model: GEMINI_MODEL,
        contents: fullPrompt,
        config: {
          temperature: attempt === 0 ? 0.5 : 0.2,
          maxOutputTokens: 8000,
          responseMimeType: 'application/json',
        },
      });

      const content = response.text || '';
      console.log(`Gemini attempt ${attempt + 1}, response length:`, content.length);

      return parseAIResponse(content);
    } catch (parseError) {
      console.error(`Gemini attempt ${attempt + 1} parse failed:`, parseError);
      if (attempt === 1) throw parseError;
    }
  }

  throw new Error('Gemini failed after retries');
}

async function callAIWithRetry(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  maxRetries: number = 3
): Promise<AIResponse> {
  let lastError: Error | null = null;
  let lastContent: string = '';
  let isRateLimited = false;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`AI call attempt ${attempt + 1} using Groq`);

      const response = await groq.chat.completions.create({
        model: GROQ_MODEL,
        messages,
        temperature: attempt === 0 ? 0.7 : 0.4 - (attempt * 0.1),
        max_tokens: 3000,
      });

      const content = response.choices[0]?.message?.content || '';
      lastContent = content;

      return parseAIResponse(content);
    } catch (error) {
      lastError = error as Error;
      const errorMessage = (error as any)?.message || '';
      console.error(`AI call attempt ${attempt + 1} failed:`, errorMessage);

      // Check if it's a rate limit error
      if (errorMessage.includes('Rate limit') || errorMessage.includes('rate_limit') ||
          errorMessage.includes('429') || errorMessage.includes('quota')) {
        isRateLimited = true;
        console.log('Groq rate limited, will try Gemini fallback');
        break; // Exit Groq retry loop to try Gemini
      }

      console.error('Raw content was:', lastContent.slice(0, 500));

      // On retry, add a clarifying message with stronger instructions
      if (attempt < maxRetries) {
        messages.push({
          role: 'user',
          content: `CRITICAL: Your response MUST be ONLY a valid JSON object starting with { and ending with }. No text before or after. Include "type": "recommendations" and a "message" field. Example: {"type":"recommendations","message":"Here are my suggestions!","recommendations":[...]}`,
        });
      }
    }
  }

  // Try Gemini fallback if rate limited or all Groq retries failed
  if (gemini) {
    try {
      console.log('Attempting Gemini fallback...');
      return await callGemini(messages);
    } catch (geminiError) {
      console.error('Gemini fallback also failed:', geminiError);
    }
  }

  // All attempts failed - return a helpful response
  return {
    type: 'recommendations',
    message: isRateLimited
      ? "I'm having trouble connecting right now. Both AI services are temporarily unavailable - please try again in a few minutes!"
      : "I'm having trouble understanding the response. Let me try a different approach - what specific type of experience are you looking for?",
    recommendations: [],
    interestsDetected: [],
  };
}

// ============ MAIN HANDLER ============

export async function POST(request: NextRequest) {
  try {
    // Validate request
    const body = await request.json();
    const validatedRequest = RequestSchema.safeParse(body);

    if (!validatedRequest.success) {
      return new Response(
        JSON.stringify({
          type: 'error',
          message: 'Invalid request format',
          errors: validatedRequest.error.issues,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const {
      destinationName,
      countryCode,
      message,
      conversationHistory,
      tripContext,
    } = validatedRequest.data;

    // Check Groq configuration
    if (!process.env.GROQ_API_KEY) {
      return new Response(
        JSON.stringify({
          type: 'error',
          message: 'AI service not configured. Please add GROQ_API_KEY to your environment.',
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Extract interests from conversation
    const allText = [...conversationHistory.map(h => h.content), message].join(' ').toLowerCase();
    const interests: string[] = [];
    const interestKeywords: Record<string, string[]> = {
      surfing: ['surf', 'surfing', 'waves'],
      hiking: ['hike', 'hiking', 'trek', 'trail'],
      food: ['food', 'restaurant', 'cuisine', 'eating'],
      culture: ['culture', 'museum', 'history', 'art'],
      beach: ['beach', 'beaches', 'ocean', 'swimming'],
      nightlife: ['nightlife', 'bar', 'club', 'party'],
      adventure: ['adventure', 'extreme', 'adrenaline'],
      nature: ['nature', 'wildlife', 'animal', 'bird'],
      relaxation: ['relax', 'spa', 'wellness', 'peaceful'],
    };
    for (const [interest, keywords] of Object.entries(interestKeywords)) {
      if (keywords.some(kw => allText.includes(kw))) {
        interests.push(interest);
      }
    }

    // Get Reddit context
    const redditContext = await getRedditContext(destinationName, interests);

    // Build system prompt
    const systemPrompt = createSystemPrompt(
      destinationName,
      countryCode,
      tripContext || {},
      redditContext
    );

    // Build messages
    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user', content: message },
    ];

    // Call AI with retry
    const aiResponse = await callAIWithRetry(messages);

    return new Response(JSON.stringify(aiResponse), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Discovery API error:', error);
    return new Response(
      JSON.stringify({
        type: 'error',
        message: 'Something went wrong. Please try again.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
