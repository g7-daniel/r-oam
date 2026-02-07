import { NextRequest, NextResponse } from 'next/server';
import { processMessage, getInitialGreeting } from '@/lib/smart-chat';
import type { ChatMessage } from '@/types';

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    const {
      destination,
      message,
      conversationType,
      conversationHistory,
    } = body as {
      destination: string;
      message?: string;
      conversationType: 'destination' | 'experiences';
      conversationHistory: ChatMessage[];
    };

    if (!destination || typeof destination !== 'string') {
      return NextResponse.json(
        { error: 'Destination is required' },
        { status: 400 }
      );
    }

    if (conversationType && !['destination', 'experiences'].includes(conversationType)) {
      return NextResponse.json(
        { error: 'conversationType must be "destination" or "experiences"' },
        { status: 400 }
      );
    }

    // Ensure conversationHistory is an array and limit its size
    const history = Array.isArray(conversationHistory) ? conversationHistory.slice(0, 50) : [];

    // Validate message length if provided
    if (message && (typeof message !== 'string' || message.length > 5000)) {
      return NextResponse.json(
        { error: 'Message must be a string of at most 5000 characters' },
        { status: 400 }
      );
    }

    // If no message, return initial greeting
    if (!message && history.length === 0) {
      const greeting = getInitialGreeting(destination, conversationType);
      return NextResponse.json({
        message: greeting,
        isComplete: false,
      });
    }

    // Process the message
    const result = await processMessage(
      destination,
      message || '',
      conversationType,
      history
    );

    const assistantMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: result.response,
      timestamp: new Date(),
      suggestions: result.suggestions,
      quickReplies: result.quickReplies,
    };

    return NextResponse.json({
      message: assistantMessage,
      isComplete: result.isComplete,
      suggestions: result.suggestions,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}
