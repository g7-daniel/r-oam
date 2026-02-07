/**
 * Quick Plan Chat API
 * Server-side endpoint for LLM calls (avoids browser SDK issues)
 */

import { NextRequest, NextResponse } from 'next/server';
import { chatCompletion } from '@/lib/groq';
import {
  ValidationError,
  ExternalAPIError,
  RateLimitError,
  ConfigurationError,
  createErrorResponse,
  logError,
  isRateLimitError,
} from '@/lib/errors';

export async function POST(request: NextRequest) {
  const context = 'Quick Plan Chat API';

  try {
    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      throw new ValidationError('Invalid JSON in request body');
    }

    const { messages, temperature = 0.7 } = body as {
      messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
      temperature?: number;
    };

    // Validate temperature
    if (typeof temperature !== 'number' || temperature < 0 || temperature > 2) {
      throw new ValidationError('Temperature must be a number between 0 and 2');
    }

    // Validate input
    if (!messages || !Array.isArray(messages)) {
      throw new ValidationError('Messages array is required');
    }

    if (messages.length === 0) {
      throw new ValidationError('Messages array cannot be empty');
    }

    if (messages.length > 20) {
      throw new ValidationError('Messages array exceeds maximum length (20)');
    }

    // Validate message structure and content length
    for (const msg of messages) {
      if (!msg.role || !['system', 'user', 'assistant'].includes(msg.role)) {
        throw new ValidationError('Each message must have a valid role (system, user, or assistant)');
      }
      if (typeof msg.content !== 'string') {
        throw new ValidationError('Each message must have a content string');
      }
      if (msg.content.length > 10000) {
        throw new ValidationError('Message content exceeds maximum length (10000 characters)');
      }
    }

    // Call LLM service
    let content: string;
    try {
      content = await chatCompletion(messages, temperature);
    } catch (llmError) {
      // Handle specific LLM errors
      if (isRateLimitError(llmError)) {
        throw new RateLimitError(60);
      }

      const errorMessage = llmError instanceof Error ? llmError.message : String(llmError);

      // Check for API key issues
      if (errorMessage.toLowerCase().includes('api key') || errorMessage.toLowerCase().includes('unauthorized')) {
        throw new ConfigurationError('LLM API key');
      }

      throw new ExternalAPIError('LLM', llmError instanceof Error ? llmError : new Error(errorMessage));
    }

    const response = NextResponse.json({
      content,
      success: true,
    });
    // Chat responses are user-specific and dynamic - don't cache
    response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    return response;
  } catch (error) {
    logError(context, error);
    return createErrorResponse(error, context);
  }
}
