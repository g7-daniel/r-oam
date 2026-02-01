'use client';

import { useState, useEffect } from 'react';
import { useTripStore } from '@/stores/tripStore';
import { AIChatInterface } from '@/components/chat';
import { LegSelector } from '@/components/legs';
import Card from '@/components/ui/Card';
import type { ChatSession, LocationSuggestion } from '@/types';
import { Check, Sparkles, ArrowRight } from 'lucide-react';
import clsx from 'clsx';

export default function Step7ExperiencesChat() {
  const {
    legs,
    activeLegId,
    setActiveLeg,
    chatSessions,
    addChatSession,
    getChatSession,
  } = useTripStore();

  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);

  const activeLeg = legs.find((l) => l.id === activeLegId);

  // Initialize or get session for active leg
  useEffect(() => {
    if (!activeLeg) return;

    const existingSession = getChatSession(activeLeg.id, 'experiences');
    if (existingSession) {
      setCurrentSession(existingSession);
    } else {
      const newSession: ChatSession = {
        id: `exp-session-${Date.now()}`,
        legId: activeLeg.id,
        type: 'experiences',
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
    // In a full implementation, these would be converted to Experience objects
    // and added to the leg's experiences
    console.log('Experience suggestions confirmed:', suggestions);
  };

  // Check completion status for all legs
  const legCompletionStatus = legs.map((leg) => {
    const session = getChatSession(leg.id, 'experiences');
    return {
      legId: leg.id,
      name: leg.destination.name,
      isComplete: session?.isComplete && session.selectedSuggestions.length > 0,
      experiences: session?.selectedSuggestions.length || 0,
    };
  });

  const allLegsComplete = legCompletionStatus.every((s) => s.isComplete);
  const anyLegComplete = legCompletionStatus.some((s) => s.isComplete);

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
        <h1 className="section-title mb-2">Discover Experiences</h1>
        <p className="section-subtitle">
          Let's find activities and experiences you'll love
        </p>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Leg Progress */}
        {legs.length > 1 && (
          <div className="mb-6">
            <div className="flex items-center gap-4 p-4 bg-slate-100 rounded-xl overflow-x-auto">
              {legCompletionStatus.map((status, index) => (
                <div
                  key={status.legId}
                  onClick={() => setActiveLeg(status.legId)}
                  className={clsx(
                    'flex-shrink-0 flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all',
                    status.legId === activeLegId
                      ? 'bg-white shadow-sm'
                      : 'hover:bg-white/50'
                  )}
                >
                  <div
                    className={clsx(
                      'w-8 h-8 rounded-full flex items-center justify-center',
                      status.isComplete
                        ? 'bg-orange-500 text-white'
                        : status.legId === activeLegId
                        ? 'bg-sky-500 text-white'
                        : 'bg-slate-300 text-white'
                    )}
                  >
                    {status.isComplete ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-slate-700 truncate">
                      {status.name}
                    </div>
                    {status.isComplete && (
                      <div className="text-xs text-orange-600">
                        {status.experiences} experience{status.experiences !== 1 ? 's' : ''} added
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
              conversationType="experiences"
              session={currentSession}
              onSessionUpdate={handleSessionUpdate}
              onSuggestionsConfirmed={handleSuggestionsConfirmed}
            />
          </Card>
        )}

        {/* Skip option */}
        {!currentSession?.isComplete && (
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                if (currentSession) {
                  handleSessionUpdate({
                    ...currentSession,
                    isComplete: true,
                    selectedSuggestions: [],
                  });
                }
              }}
              className="text-slate-500 hover:text-slate-700 text-sm flex items-center gap-2 mx-auto"
            >
              Skip and browse experiences manually
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Summary */}
        {anyLegComplete && (
          <div className="mt-8 p-6 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl">
            <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-orange-500" />
              Your Experience Interests
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {legCompletionStatus
                .filter((s) => s.isComplete && s.experiences > 0)
                .map((status) => {
                  const session = getChatSession(status.legId, 'experiences');
                  const leg = legs.find((l) => l.id === status.legId);

                  if (!session || !leg) return null;

                  return (
                    <div
                      key={status.legId}
                      className="bg-white rounded-lg p-4 border border-orange-200"
                    >
                      <h4 className="font-medium text-slate-700 mb-2">
                        {leg.destination.name}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {session.selectedSuggestions.map((suggestion) => (
                          <span
                            key={suggestion.id}
                            className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm"
                          >
                            {suggestion.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Completion message */}
        {allLegsComplete && (
          <div className="mt-8 p-6 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl text-center">
            <Sparkles className="w-12 h-12 text-white mx-auto mb-3" />
            <h3 className="text-xl font-bold text-white mb-2">
              Experiences Discovered!
            </h3>
            <p className="text-orange-100">
              Now let's browse and select specific activities for your trip.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
