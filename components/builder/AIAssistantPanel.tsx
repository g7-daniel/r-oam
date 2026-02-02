'use client';

import { useState, useRef, useEffect } from 'react';
import { useTripStoreV2 } from '@/stores/tripStoreV2';
import {
  Send,
  Loader2,
  Plus,
  Clock,
  ArrowUp,
} from 'lucide-react';
import clsx from 'clsx';
import type { Recommendation } from '@/lib/schemas/trip';
import type { CollectionItem } from '@/stores/tripStoreV2';
import PlaceDetailModal from './PlaceDetailModal';

interface AIAssistantPanelProps {
  onCollapse?: () => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  recommendations?: Recommendation[];
  isStreaming?: boolean;
}

export default function AIAssistantPanel({ onCollapse }: AIAssistantPanelProps) {
  const { trip, addToCollection } = useTripStoreV2();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Array<{role: string; content: string}>>([]);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [selectedPlace, setSelectedPlace] = useState<CollectionItem | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get current destination context
  const activeDestination = trip.destinations.find(
    d => d.destinationId === trip.activeDestinationId
  ) || trip.destinations[0];

  const destinationName = activeDestination?.place.name || 'your destination';

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Quick suggestions
  const quickSuggestions = [
    `Best restaurants in ${destinationName}`,
    `Hidden gems in ${destinationName}`,
    `Things to do at night`,
    `Must-see attractions`,
  ];

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Add streaming assistant message
    const assistantMessageId = `assistant-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      isStreaming: true,
    }]);

    try {
      // Use the AI discovery endpoint for recommendations
      const response = await fetch('/api/ai/discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinationId: activeDestination?.destinationId || 'default',
          destinationName: destinationName,
          countryCode: activeDestination?.place.countryCode || 'XX',
          message: input,
          conversationHistory: conversationHistory,
          tripContext: {
            tripTypeTags: trip.basics.tripTypeTags,
            pace: trip.basics.pace,
            travelers: trip.basics.travelers,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();

        // Update conversation history
        setConversationHistory(prev => [
          ...prev,
          { role: 'user', content: input },
          { role: 'assistant', content: data.message || '' },
        ]);

        // Update with final response
        setMessages(prev => prev.map(m =>
          m.id === assistantMessageId
            ? {
                ...m,
                content: data.message || 'Here are some recommendations for you!',
                recommendations: data.recommendations || [],
                isStreaming: false,
              }
            : m
        ));
      } else {
        setMessages(prev => prev.map(m =>
          m.id === assistantMessageId
            ? { ...m, content: 'Sorry, I had trouble processing that. Please try again.', isStreaming: false }
            : m
        ));
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => prev.map(m =>
        m.id === assistantMessageId
          ? { ...m, content: 'Sorry, something went wrong. Please try again.', isStreaming: false }
          : m
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRecommendation = (e: React.MouseEvent, rec: Recommendation, type: 'experiences' | 'restaurants') => {
    e.stopPropagation();
    e.preventDefault();

    const itemId = rec.id || `rec-${Date.now()}`;

    addToCollection(type, {
      id: itemId,
      name: rec.name,
      category: rec.category || 'cultural',
      description: rec.description,
      whyMatch: rec.whyMatch,
      lat: rec.lat,
      lng: rec.lng,
      durationMinutes: rec.estimatedDurationMinutes,
      destinationId: activeDestination?.destinationId,
      source: rec.source,
    });

    setAddedIds(prev => new Set(prev).add(itemId));
  };

  // Convert recommendation to CollectionItem for the detail modal
  const handleSelectRecommendation = (rec: Recommendation) => {
    const isRestaurant = rec.category === 'dining' || rec.mealType;
    const collectionItem: CollectionItem = {
      id: rec.id || `rec-${Date.now()}`,
      name: rec.name,
      category: isRestaurant ? 'dining' : (rec.category || 'cultural'),
      description: rec.description,
      whyMatch: rec.whyMatch,
      lat: rec.lat,
      lng: rec.lng,
      durationMinutes: rec.estimatedDurationMinutes,
      destinationId: activeDestination?.destinationId,
      source: rec.source,
      // Use imageQuery as a hint for generating an image URL if needed
      imageUrl: rec.imageQuery
        ? `https://source.unsplash.com/800x600/?${encodeURIComponent(rec.imageQuery)}`
        : undefined,
      cuisineType: rec.cuisineType,
      reservationRequired: rec.reservationRequired,
    };
    setSelectedPlace(collectionItem);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
              Ask me for recommendations!
            </p>
            <div className="space-y-2">
              {quickSuggestions.slice(0, 2).map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="block w-full text-left px-3 py-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={clsx(
              'flex',
              message.role === 'user' ? 'justify-end' : 'justify-start'
            )}>
              <div className={clsx(
                'max-w-[85%] rounded-2xl px-3 py-2',
                message.role === 'user'
                  ? 'bg-primary-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100'
              )}>
                {message.isStreaming ? (
                  <div className="flex items-center gap-2 text-sm">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Thinking...</span>
                  </div>
                ) : (
                  <>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                    {/* Recommendation cards */}
                    {message.recommendations && message.recommendations.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {message.recommendations.map((rec) => {
                          const isRestaurant = rec.category === 'dining' || rec.mealType;
                          const isAdded = addedIds.has(rec.id);
                          const isRedditSource = rec.source?.type === 'reddit';

                          return (
                            <div
                              key={rec.id}
                              onClick={() => handleSelectRecommendation(rec)}
                              className={clsx(
                                "rounded-lg p-2 border cursor-pointer transition-all hover:shadow-md",
                                isRedditSource
                                  ? "bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800 hover:border-orange-300 dark:hover:border-orange-700"
                                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500"
                              )}
                            >
                              {/* Reddit upvotes badge */}
                              {isRedditSource && rec.source && (
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className="flex items-center gap-1 px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 rounded-full text-[9px] font-medium">
                                    <ArrowUp className="w-2 h-2" />
                                    {rec.source.upvotes?.toLocaleString() || '?'}
                                  </span>
                                  <span className="text-[9px] text-slate-500 dark:text-slate-400">
                                    r/{rec.source.subreddit || 'travel'}
                                  </span>
                                </div>
                              )}

                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="font-medium text-xs text-slate-900 dark:text-white truncate">
                                    {rec.name}
                                  </p>
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                                    {rec.description}
                                  </p>

                                  {/* Duration and category */}
                                  <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                                    {rec.estimatedDurationMinutes && (
                                      <span className="flex items-center gap-0.5">
                                        <Clock className="w-2.5 h-2.5" />
                                        {rec.estimatedDurationMinutes >= 60
                                          ? `${Math.floor(rec.estimatedDurationMinutes / 60)}h`
                                          : `${rec.estimatedDurationMinutes}m`}
                                      </span>
                                    )}
                                    <span className="capitalize">{rec.category}</span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => handleAddRecommendation(e, rec, isRestaurant ? 'restaurants' : 'experiences')}
                                  disabled={isAdded}
                                  className={clsx(
                                    'flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors',
                                    isAdded
                                      ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 cursor-default'
                                      : 'bg-primary-500 text-white hover:bg-primary-600'
                                  )}
                                >
                                  {isAdded ? (
                                    'Saved'
                                  ) : (
                                    <>
                                      <Plus className="w-3 h-3" />
                                      Save
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-700 flex-shrink-0">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask for recommendations..."
            className="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder-slate-400"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Place Detail Modal */}
      {selectedPlace && (
        <PlaceDetailModal
          item={selectedPlace}
          onClose={() => setSelectedPlace(null)}
        />
      )}
    </div>
  );
}
