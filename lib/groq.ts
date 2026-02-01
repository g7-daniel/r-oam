import OpenAI from 'openai';

// Groq uses OpenAI-compatible API
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || '',
  baseURL: 'https://api.groq.com/openai/v1',
});

export const GROQ_MODEL = 'llama-3.3-70b-versatile';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ExperienceRecommendation {
  name: string;
  description: string;
  category: string;
  whyMatch: string;
  redditQuote?: string;
  redditSubreddit?: string;
  estimatedDuration: string;
  estimatedCost: string;
  location?: {
    name: string;
    lat?: number;
    lng?: number;
  };
}

/**
 * Create a system prompt for the travel experience interview
 */
export function createExperienceInterviewPrompt(
  destination: string,
  budget?: number,
  days?: number,
  tripType?: string,
  redditContext?: string
): string {
  return `You are an expert travel advisor helping plan an amazing trip to ${destination}. You're friendly, curious, and genuinely interested in understanding what the traveler wants to experience.

## Your Personality
- Warm and conversational (not robotic or salesy)
- Ask follow-up questions to understand their interests deeply
- Share insider tips and Reddit-sourced recommendations when relevant
- Be specific with suggestions (actual place names, not generic categories)

## Context
${budget ? `- Budget: $${budget.toLocaleString()} total` : ''}
${days ? `- Trip duration: ${days} days` : ''}
${tripType ? `- Travel style: ${tripType}` : ''}

## Reddit Insights Available
${redditContext || 'No Reddit data loaded yet - will incorporate once we understand their interests.'}

## Your Goals
1. First 2-3 exchanges: Understand what they want to DO (activities, experiences, vibes)
2. Ask about experience levels for relevant activities (surfing skill, hiking fitness, etc.)
3. Learn preferences (crowded vs quiet, luxury vs authentic, tourist spots vs hidden gems)
4. After understanding their interests, recommend 3-5 specific experiences

## When Making Recommendations
Format each recommendation as a JSON object within your response like this:
\`\`\`json
{
  "recommendations": [
    {
      "name": "Specific Place or Experience Name",
      "description": "What it is and what you'll do there",
      "category": "beach|culture|food|adventure|nature|nightlife|relaxation",
      "whyMatch": "Why this matches their stated interests",
      "redditQuote": "Actual quote from Reddit if available",
      "redditSubreddit": "r/travel",
      "estimatedDuration": "2-3 hours",
      "estimatedCost": "$50-100"
    }
  ]
}
\`\`\`

Only include the JSON block when you're ready to make recommendations (usually after 2-3 exchanges).

Remember: Focus on EXPERIENCES and ACTIVITIES, not hotels or logistics. That comes later.`;
}

/**
 * Non-streaming chat completion
 */
export async function chatCompletion(
  messages: ChatMessage[],
  temperature: number = 0.7
): Promise<string> {
  const response = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages,
    temperature,
    max_tokens: 1024,
  });

  return response.choices[0]?.message?.content || '';
}

/**
 * Streaming chat completion
 */
export async function* streamChatCompletion(
  messages: ChatMessage[],
  temperature: number = 0.7
): AsyncGenerator<string> {
  const stream = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages,
    temperature,
    max_tokens: 1024,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      yield content;
    }
  }
}

/**
 * Parse experience recommendations from AI response
 */
export function parseRecommendations(response: string): ExperienceRecommendation[] {
  try {
    // Look for JSON block in the response
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1]);
      if (parsed.recommendations && Array.isArray(parsed.recommendations)) {
        return parsed.recommendations;
      }
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Check if Groq API is configured
 */
export function isGroqConfigured(): boolean {
  return !!process.env.GROQ_API_KEY;
}

export default groq;
