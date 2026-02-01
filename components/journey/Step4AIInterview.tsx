'use client';

import { useState, useEffect } from 'react';
import { useTripStore } from '@/stores/tripStore';
import { AIChatInterface } from '@/components/chat';
import { LegSelector } from '@/components/legs';
import Card from '@/components/ui/Card';
import type { ChatSession, LocationSuggestion, SpecificLocation } from '@/types';
import { Check, MessageCircle, MapPin } from 'lucide-react';
import clsx from 'clsx';

export default function Step4AIInterview() {
  const {
    legs,
    activeLegId,
    setActiveLeg,
    chatSessions,
    addChatSession,
    getChatSession,
    setLegSpecificLocations,
  } = useTripStore();

  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);

  const activeLeg = legs.find((l) => l.id === activeLegId);

  // Initialize or get session for active leg
  useEffect(() => {
    if (!activeLeg) return;

    const existingSession = getChatSession(activeLeg.id, 'destination');
    if (existingSession) {
      setCurrentSession(existingSession);
    } else {
      const newSession: ChatSession = {
        id: `session-${Date.now()}`,
        legId: activeLeg.id,
        type: 'destination',
        messages: [],
        isComplete: false,
        selectedSuggestions: [],
      };
      addChatSession(newSession);
      setCurrentSession(newSession);
    }
  }, [activeLegId]);

  const handleSessionUpdate = (session: ChatSession) => {
    setCurrentSession(session);

    // Update in store
    const { chatSessions } = useTripStore.getState();
    const existingIndex = chatSessions.findIndex((s) => s.id === session.id);
    if (existingIndex >= 0) {
      useTripStore.setState({
        chatSessions: chatSessions.map((s) => (s.id === session.id ? session : s)),
      });
    } else {
      useTripStore.setState({
        chatSessions: [...chatSessions, session],
      });
    }
  };

  const handleSuggestionsConfirmed = (suggestions: LocationSuggestion[]) => {
    if (!activeLeg) return;

    // Convert LocationSuggestion to SpecificLocation
    const specificLocations: SpecificLocation[] = suggestions.map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      description: s.description,
      recommendedFor: s.recommendedFor,
      redditMentions: 1,
    }));

    setLegSpecificLocations(activeLeg.id, specificLocations);
  };

  // Check completion status for all legs
  const legCompletionStatus = legs.map((leg) => {
    const session = getChatSession(leg.id, 'destination');
    return {
      legId: leg.id,
      name: leg.destination.name,
      isComplete: session?.isComplete && session.selectedSuggestions.length > 0,
      locations: session?.selectedSuggestions.length || 0,
    };
  });

  const allLegsComplete = legCompletionStatus.every((s) => s.isComplete);

  if (legs.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Please add destinations first</p>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="section-title mb-2">Discover Your Perfect Spots</h1>
        <p className="section-subtitle">
          Let's chat about what you're looking for in each destination
        </p>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Leg Progress */}
        {legs.length > 1 && (
          <div className="mb-6">
            <div className="flex items-center gap-4 p-4 bg-slate-100 rounded-xl">
              {legCompletionStatus.map((status, index) => (
                <div
                  key={status.legId}
                  onClick={() => setActiveLeg(status.legId)}
                  className={clsx(
                    'flex-1 flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all',
                    status.legId === activeLegId
                      ? 'bg-white shadow-sm'
                      : 'hover:bg-white/50'
                  )}
                >
                  <div
                    className={clsx(
                      'w-8 h-8 rounded-full flex items-center justify-center',
                      status.isComplete
                        ? 'bg-teal-500 text-white'
                        : status.legId === activeLegId
                        ? 'bg-sky-500 text-white'
                        : 'bg-slate-300 text-white'
                    )}
                  >
                    {status.isComplete ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-700 truncate">
                      {status.name}
                    </div>
                    {status.isComplete && (
                      <div className="text-xs text-teal-600">
                        {status.locations} spot{status.locations !== 1 ? 's' : ''} selected
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chat Interface */}
        {activeLeg && currentSession && (
          <Card padding="none" className="overflow-hidden">
            <AIChatInterface
              destination={activeLeg.destination.name}
              conversationType="destination"
              session={currentSession}
              onSessionUpdate={handleSessionUpdate}
              onSuggestionsConfirmed={handleSuggestionsConfirmed}
            />
          </Card>
        )}

        {/* Summary of completed legs */}
        {legs.some((l) => getChatSession(l.id, 'destination')?.isComplete) && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-slate-700 mb-4">
              Your Selected Spots
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {legs.map((leg) => {
                const session = getChatSession(leg.id, 'destination');
                if (!session?.isComplete || session.selectedSuggestions.length === 0) {
                  return null;
                }

                return (
                  <Card key={leg.id} className="bg-gradient-to-br from-teal-50 to-white">
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-10 h-10 rounded-lg bg-cover bg-center"
                        style={{
                          backgroundImage: leg.destination.imageUrl
                            ? `url(${leg.destination.imageUrl})`
                            : 'linear-gradient(135deg, #0EA5E9 0%, #10B981 100%)',
                        }}
                      />
                      <div>
                        <h4 className="font-semibold text-slate-800">
                          {leg.destination.name}
                        </h4>
                        <span className="text-sm text-slate-500">
                          {leg.destination.country}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {session.selectedSuggestions.map((suggestion) => (
                        <div
                          key={suggestion.id}
                          className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-teal-200"
                        >
                          <MapPin className="w-4 h-4 text-teal-500" />
                          <span className="font-medium text-slate-700">
                            {suggestion.name}
                          </span>
                          <span className="text-xs text-slate-400 capitalize">
                            {suggestion.type}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Completion message */}
        {allLegsComplete && (
          <div className="mt-8 p-6 bg-gradient-to-r from-teal-500 to-teal-600 rounded-xl text-center">
            <Check className="w-12 h-12 text-white mx-auto mb-3" />
            <h3 className="text-xl font-bold text-white mb-2">
              All Destinations Planned!
            </h3>
            <p className="text-teal-100">
              You've selected your preferred spots in all destinations. Continue to find flights.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
