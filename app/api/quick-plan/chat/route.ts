/**
 * Quick Plan Chat API
 * Server-side endpoint for LLM calls (avoids browser SDK issues)
 */

import { NextRequest, NextResponse } from 'next/server';
import { chatCompletion } from '@/lib/groq';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, temperature = 0.7 } = body as {
      messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
      temperature?: number;
    };

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    const content = await chatCompletion(messages as any, temperature);

    return NextResponse.json({
      content,
      success: true,
    });
  } catch (error) {
    console.error('Quick Plan Chat API error:', error);
    return NextResponse.json(
      { error: 'LLM request failed', content: '' },
      { status: 500 }
    );
  }
}
