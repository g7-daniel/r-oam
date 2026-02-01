'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import ChatMessage from './ChatMessage';
import SuggestionCard from './SuggestionCard';
import type { ChatMessage as ChatMessageType, LocationSuggestion, ChatSession } from '@/types';
import clsx from 'clsx';

interface ExperienceRecommendation {
  name: string;
  description: string;
  category: string;
  whyMatch: string;
  redditQuote?: string;
  redditSubreddit?: string;
  estimatedDuration: string;
  estimatedCost: string;
}

interface AIChatInterfaceProps {
  destination: string;
  conversationType: 'destination' | 'experiences';
  session?: ChatSession;
  onSessionUpdate: (session: ChatSession) => void;
  onSuggestionsConfirmed?: (suggestions: LocationSuggestion[]) => void;
  budget?: number;
  days?: number;
  tripType?: string;
}

export default function AIChatInterface({
  destination,
  conversationType,
  session,
  onSessionUpdate,
  onSuggestionsConfirmed,
  budget,
  days,
  tripType,
}: AIChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useRealAI, setUseRealAI] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages, streamingContent]);

  // Initialize chat with greeting
  useEffect(() => {
    if (!session || session.messages.length === 0) {
      initializeChat();
    } else if (session.isComplete) {
      setIsComplete(true);
      const lastMsg = [...session.messages].reverse().find(
        (m) => m.role === 'assistant' && m.suggestions
      );
      if (lastMsg?.suggestions) {
        setSuggestions(lastMsg.suggestions);
        setSelectedSuggestions(session.selectedSuggestions.map((s) => s.id));
      }
    }
  }, [destination]);

  const initializeChat = async () => {
    const greeting: ChatMessageType = {
      id: `greeting-${Date.now()}`,
      role: 'assistant',
      content: `Hey! I'm excited to help you discover amazing experiences in ${destination}! What kind of activities or experiences are you most interested in? Are you looking for adventure, relaxation, culture, food, nature... or something else entirely?`,
      timestamp: new Date(),
    };

    const newSession: ChatSession = {
      id: session?.id || `session-${Date.now()}`,
      legId: session?.legId || '',
      type: conversationType,
      messages: [greeting],
      isComplete: false,
      selectedSuggestions: [],
    };
    onSessionUpdate(newSession);
  };

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading || isComplete) return;

    setError(null);
    const userMessage: ChatMessageType = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    const updatedMessages = [...(session?.messages || []), userMessage];
    onSessionUpdate({
      ...session!,
      messages: updatedMessages,
    });

    setInput('');
    setIsLoading(true);
    setStreamingContent('');

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      // Try real AI first
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          destination,
          message: content,
          conversationHistory: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          budget,
          days,
          tripType,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 503) {
          // Groq not configured - fall back to mock or show error
          setError(errorData.message || 'AI not configured');
          setUseRealAI(false);
          // Fall back to old mock API
          await sendMockMessage(content, updatedMessages);
          return;
        }
        throw new Error(errorData.error || 'Failed to send message');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let fullContent = '';
      let recommendations: ExperienceRecommendation[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.chunk) {
                fullContent += data.chunk;
                setStreamingContent(fullContent);
              }
              if (data.done) {
                if (data.recommendations) {
                  recommendations = data.recommendations;
                }
              }
            } catch {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }

      // Create assistant message
      const assistantMessage: ChatMessageType = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: fullContent,
        timestamp: new Date(),
      };

      // Convert recommendations to LocationSuggestions
      if (recommendations.length > 0) {
        const locationSuggestions: LocationSuggestion[] = recommendations.map((rec, i) => ({
          id: `rec-${Date.now()}-${i}`,
          name: rec.name,
          type: mapCategoryToType(rec.category),
          description: rec.description,
          redditQuote: rec.redditQuote,
          redditSubreddit: rec.redditSubreddit,
          recommendedFor: [rec.category],
        }));

        assistantMessage.suggestions = locationSuggestions;
        setSuggestions(locationSuggestions);
        setIsComplete(true);
      }

      const finalMessages = [...updatedMessages, assistantMessage];
      onSessionUpdate({
        ...session!,
        messages: finalMessages,
        isComplete: recommendations.length > 0,
      });

      setStreamingContent('');
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      console.error('Chat error:', err);
      setError('Failed to get response. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [session, isLoading, isComplete, destination, budget, days, tripType, onSessionUpdate]);

  // Fallback to mock API when Groq isn't configured
  const sendMockMessage = async (
    content: string,
    updatedMessages: ChatMessageType[]
  ) => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination,
          message: content,
          conversationType,
          conversationHistory: updatedMessages,
        }),
      });

      const data = await response.json();
      if (data.message) {
        const finalMessages = [...updatedMessages, data.message];
        onSessionUpdate({
          ...session!,
          messages: finalMessages,
          isComplete: data.isComplete,
        });

        if (data.isComplete && data.suggestions) {
          setSuggestions(data.suggestions);
          setIsComplete(true);
        }
      }
    } catch (err) {
      console.error('Mock chat error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickReply = (reply: string) => {
    sendMessage(reply);
  };

  const toggleSuggestion = (suggestionId: string) => {
    setSelectedSuggestions((prev) =>
      prev.includes(suggestionId)
        ? prev.filter((id) => id !== suggestionId)
        : [...prev, suggestionId]
    );
  };

  const confirmSuggestions = () => {
    const selected = suggestions.filter((s) => selectedSuggestions.includes(s.id));
    onSessionUpdate({
      ...session!,
      selectedSuggestions: selected,
      isComplete: true,
    });
    onSuggestionsConfirmed?.(selected);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-slate-50 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-white">
            {conversationType === 'destination'
              ? 'Experience Discovery'
              : 'Activity Finder'}
          </h3>
          <p className="text-sm text-white/80">
            Let's find amazing things to do in {destination}
          </p>
        </div>
        {useRealAI && (
          <span className="px-2 py-1 bg-white/20 rounded-full text-xs text-white">
            AI Powered
          </span>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2 text-amber-700 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {session?.messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            onQuickReply={handleQuickReply}
          />
        ))}

        {/* Streaming content */}
        {streamingContent && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-teal-500 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <p className="text-slate-700 whitespace-pre-wrap">{streamingContent}</p>
              <span className="inline-block w-2 h-4 bg-sky-500 animate-pulse ml-1" />
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {isLoading && !streamingContent && (
          <div className="flex items-center gap-2 text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Thinking...</span>
          </div>
        )}

        {/* Suggestions */}
        {isComplete && suggestions.length > 0 && (
          <div className="space-y-4 mt-4">
            <h4 className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Here are my top recommendations - select the ones you like:
            </h4>
            <div className="space-y-3">
              {suggestions.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  isSelected={selectedSuggestions.includes(suggestion.id)}
                  onSelect={() => toggleSuggestion(suggestion.id)}
                />
              ))}
            </div>

            <button
              onClick={confirmSuggestions}
              disabled={selectedSuggestions.length === 0}
              className={clsx(
                'w-full py-3 rounded-xl font-medium transition-all',
                selectedSuggestions.length > 0
                  ? 'bg-gradient-to-r from-sky-500 to-teal-500 text-white hover:shadow-lg'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              )}
            >
              {selectedSuggestions.length > 0
                ? `Continue with ${selectedSuggestions.length} experience${
                    selectedSuggestions.length > 1 ? 's' : ''
                  }`
                : 'Select at least one experience'}
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {!isComplete && (
        <div className="p-4 bg-white border-t border-slate-200">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tell me what you'd love to experience..."
              className="flex-1 px-4 py-3 bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
              disabled={isLoading}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              className={clsx(
                'px-4 py-3 rounded-xl transition-all',
                input.trim() && !isLoading
                  ? 'bg-gradient-to-r from-sky-500 to-teal-500 text-white hover:shadow-lg'
                  : 'bg-slate-200 text-slate-400'
              )}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper to map category to location type
function mapCategoryToType(
  category: string
): 'town' | 'beach' | 'neighborhood' | 'region' {
  const mapping: Record<string, 'town' | 'beach' | 'neighborhood' | 'region'> = {
    beach: 'beach',
    nature: 'region',
    adventure: 'region',
    culture: 'neighborhood',
    food: 'neighborhood',
    nightlife: 'neighborhood',
    relaxation: 'beach',
  };
  return mapping[category.toLowerCase()] || 'neighborhood';
}
