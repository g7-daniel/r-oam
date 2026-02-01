import { NextRequest } from 'next/server';
import {
  createExperienceInterviewPrompt,
  streamChatCompletion,
  chatCompletion,
  parseRecommendations,
  isGroqConfigured,
  type ChatMessage,
} from '@/lib/groq';
import { searchReddit, analyzeSentiment } from '@/lib/reddit';

export const runtime = 'nodejs';

interface RequestBody {
  destination: string;
  message: string;
  conversationHistory: { role: 'user' | 'assistant'; content: string }[];
  budget?: number;
  days?: number;
  tripType?: string;
  interests?: string[];
}

// Fetch Reddit context for a destination and interests
async function getRedditContext(
  destination: string,
  interests: string[]
): Promise<string> {
  try {
    const subreddits = ['travel', 'solotravel', 'TravelHacks'];

    // Add budget-specific subreddits
    // Could be enhanced based on actual budget tier

    const queries = interests.length > 0
      ? interests.map(i => `${destination} ${i}`)
      : [`${destination} things to do`, `${destination} must see`];

    const allPosts: string[] = [];

    for (const query of queries.slice(0, 2)) { // Limit to 2 queries
      const posts = await searchReddit(query, subreddits, 5);
      for (const post of posts) {
        if (post.selftext && post.selftext.length > 50) {
          allPosts.push(`[r/${post.subreddit}] "${post.selftext.slice(0, 300)}..."`);
        }
      }
    }

    if (allPosts.length === 0) {
      return `Searching Reddit for ${destination} recommendations...`;
    }

    return `Recent Reddit discussions about ${destination}:\n${allPosts.slice(0, 5).join('\n\n')}`;
  } catch (error) {
    console.error('Reddit fetch error:', error);
    return 'Reddit data temporarily unavailable.';
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const {
      destination,
      message,
      conversationHistory,
      budget,
      days,
      tripType,
      interests = [],
    } = body;

    if (!destination) {
      return new Response(JSON.stringify({ error: 'Destination is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if Groq is configured
    if (!isGroqConfigured()) {
      return new Response(
        JSON.stringify({
          error: 'AI not configured',
          message: 'Please add GROQ_API_KEY to your .env.local file. Get a free key at console.groq.com',
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Get Reddit context based on conversation so far
    const extractedInterests = extractInterests(conversationHistory, message);
    const redditContext = await getRedditContext(destination, [...interests, ...extractedInterests]);

    // Build the system prompt
    const systemPrompt = createExperienceInterviewPrompt(
      destination,
      budget,
      days,
      tripType,
      redditContext
    );

    // Build messages array
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user', content: message },
    ];

    // Check if streaming is requested
    const useStreaming = request.headers.get('accept')?.includes('text/event-stream');

    if (useStreaming) {
      // Streaming response
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            let fullResponse = '';

            for await (const chunk of streamChatCompletion(messages)) {
              fullResponse += chunk;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ chunk, done: false })}\n\n`)
              );
            }

            // Parse recommendations if present
            const recommendations = parseRecommendations(fullResponse);

            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  done: true,
                  fullResponse,
                  recommendations: recommendations.length > 0 ? recommendations : undefined,
                })}\n\n`
              )
            );
            controller.close();
          } catch (error) {
            console.error('Streaming error:', error);
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: 'Stream error', done: true })}\n\n`)
            );
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    } else {
      // Non-streaming response
      const response = await chatCompletion(messages);
      const recommendations = parseRecommendations(response);

      return new Response(
        JSON.stringify({
          response,
          recommendations: recommendations.length > 0 ? recommendations : undefined,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    console.error('AI Chat error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process chat request' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// Extract interests from conversation
function extractInterests(
  history: { role: string; content: string }[],
  currentMessage: string
): string[] {
  const allText = [...history.map((h) => h.content), currentMessage].join(' ').toLowerCase();

  const interestKeywords: Record<string, string[]> = {
    surfing: ['surf', 'surfing', 'waves', 'board'],
    hiking: ['hike', 'hiking', 'trek', 'trekking', 'trail'],
    food: ['food', 'restaurant', 'eat', 'cuisine', 'cooking', 'culinary'],
    culture: ['culture', 'museum', 'history', 'art', 'heritage'],
    beach: ['beach', 'beaches', 'ocean', 'swimming', 'snorkel'],
    nightlife: ['nightlife', 'bar', 'club', 'party', 'drinking'],
    adventure: ['adventure', 'extreme', 'adrenaline', 'zip', 'bungee'],
    nature: ['nature', 'wildlife', 'animal', 'bird', 'forest', 'jungle'],
    relaxation: ['relax', 'spa', 'wellness', 'peaceful', 'quiet'],
  };

  const found: string[] = [];
  for (const [interest, keywords] of Object.entries(interestKeywords)) {
    if (keywords.some((kw) => allText.includes(kw))) {
      found.push(interest);
    }
  }

  return found;
}
