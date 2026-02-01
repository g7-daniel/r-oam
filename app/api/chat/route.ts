import { NextRequest, NextResponse } from 'next/server';
import { processMessage, getInitialGreeting } from '@/lib/smart-chat';
import type { ChatMessage } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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

    if (!destination) {
      return NextResponse.json(
        { error: 'Destination is required' },
        { status: 400 }
      );
    }

    // Ensure conversationHistory is an array
    const history = conversationHistory || [];

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
