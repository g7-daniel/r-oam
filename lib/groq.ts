import OpenAI from 'openai';
import type { Stream } from 'openai/streaming';
import { isConfigured } from './env';

// Groq uses OpenAI-compatible API
// Note: We use process.env directly here because this file may be imported
// before env validation runs. The actual API calls check for the key.
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || '',
  baseURL: 'https://api.groq.com/openai/v1',
});

export const GROQ_MODEL = 'llama-3.3-70b-versatile';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Type for API error responses from OpenAI-compatible APIs
interface ApiErrorResponse {
  status?: number;
  message?: string;
  error?: {
    message?: string;
    code?: string;
  };
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
 * Custom error class for Groq API errors
 */
export class GroqApiError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'GroqApiError';
  }
}

/**
 * Non-streaming chat completion
 * @throws {GroqApiError} When API call fails or returns no content
 */
export async function chatCompletion(
  messages: ChatMessage[],
  temperature: number = 0.7
): Promise<string> {
  if (!isConfigured.groq()) {
    throw new GroqApiError(
      'Groq API key not configured. Please set GROQ_API_KEY in your .env.local file.',
      'NO_API_KEY'
    );
  }

  try {
    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages,
      temperature,
      max_tokens: 1024,
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new GroqApiError(
        'Groq API returned empty response',
        'EMPTY_RESPONSE'
      );
    }

    return content;
  } catch (error) {
    // Re-throw our custom errors
    if (error instanceof GroqApiError) {
      throw error;
    }

    // Handle OpenAI/Groq SDK errors with proper type checking
    const apiError = error as ApiErrorResponse;
    const status = apiError?.status;
    const message = apiError?.message || apiError?.error?.message || 'Unknown error';

    if (status === 429) {
      throw new GroqApiError('Rate limit exceeded', 'RATE_LIMITED', 429);
    }
    if (status !== undefined && status >= 500) {
      throw new GroqApiError('Groq service unavailable', 'SERVICE_ERROR', status);
    }

    throw new GroqApiError(
      `Groq API error: ${message}`,
      'API_ERROR',
      status
    );
  }
}

/**
 * Streaming chat completion
 * @throws {GroqApiError} When API call fails
 */
export async function* streamChatCompletion(
  messages: ChatMessage[],
  temperature: number = 0.7
): AsyncGenerator<string> {
  if (!isConfigured.groq()) {
    throw new GroqApiError(
      'Groq API key not configured. Please set GROQ_API_KEY in your .env.local file.',
      'NO_API_KEY'
    );
  }

  try {
    const stream = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages,
      temperature,
      max_tokens: 1024,
      stream: true,
    }) as Stream<OpenAI.Chat.Completions.ChatCompletionChunk>;

    let hasContent = false;

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        hasContent = true;
        yield content;
      }
    }

    if (!hasContent) {
      throw new GroqApiError('Groq API stream returned no content', 'EMPTY_STREAM');
    }
  } catch (error) {
    // Re-throw our custom errors
    if (error instanceof GroqApiError) {
      throw error;
    }

    // Handle OpenAI/Groq SDK errors with proper type checking
    const apiError = error as ApiErrorResponse;
    const status = apiError?.status;
    const message = apiError?.message || apiError?.error?.message || 'Unknown error';

    if (status === 429) {
      throw new GroqApiError('Rate limit exceeded', 'RATE_LIMITED', 429);
    }

    throw new GroqApiError(
      `Groq streaming error: ${message}`,
      'STREAM_ERROR',
      status
    );
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
  return isConfigured.groq();
}

export default groq;
