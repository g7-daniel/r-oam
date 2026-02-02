'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import ChatTranscript, { EmptyTranscript, PhaseDivider } from './chat/ChatTranscript';
import ChatMessage from './chat/ChatMessage';
import ReplyCard from './chat/ReplyCard';
import SnooAgent from './chat/SnooAgent';
import DebugDrawer, { DebugButton } from './chat/DebugDrawer';
import {
  QuickPlanOrchestrator,
  createOrchestrator,
} from '@/lib/quick-plan/orchestrator';
import type {
  ChatMessage as ChatMessageType,
  QuestionConfig,
  DebugInfo,
  DebugEntry,
  EnrichmentStatus,
  SnooState,
  OrchestratorState,
} from '@/types/quick-plan';
import { finalizeQuickPlanTrip } from '@/lib/quick-plan/trip-transformer';
import { RotateCcw } from 'lucide-react';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function QuickPlanChat() {
  // Orchestrator state
  const [orchestrator] = useState(() => createOrchestrator());
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionConfig | null>(null);
  const [snooState, setSnooState] = useState<SnooState>('idle');
  const [phase, setPhase] = useState<'gathering' | 'enriching' | 'generating' | 'reviewing' | 'satisfied'>('gathering');

  // Debug state
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugInfo, setDebugInfo] = useState<Partial<DebugInfo>>({});
  const [debugLog, setDebugLog] = useState<DebugEntry[]>([]);
  const [enrichmentStatus, setEnrichmentStatus] = useState<Record<string, EnrichmentStatus>>({
    reddit: 'pending',
    areas: 'pending',
    hotels: 'pending',
    activities: 'pending',
    pricing: 'pending',
    restaurants: 'pending',
    experiences: 'pending',
  });

  // UI state
  const [isTyping, setIsTyping] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  useEffect(() => {
    // Prevent double initialization in React 18 Strict Mode
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    // Start the conversation
    startConversation();
  }, []);

  const startConversation = async () => {
    setSnooState('typing');
    setIsTyping(true);

    // Small delay for effect
    await new Promise(resolve => setTimeout(resolve, 500));

    // Get first question (destination question already includes greeting)
    const question = await orchestrator.selectNextQuestion();
    if (question) {
      setCurrentQuestion(question);
      orchestrator.state.currentQuestion = question;

      // Add the question message (which includes the greeting for destination)
      orchestrator.addSnooMessage(question.snooMessage, 'idle');
      setMessages([...orchestrator.getMessages()]);
    }

    setIsTyping(false);
    setSnooState('idle');
  };

  // ============================================================================
  // START OVER FUNCTIONALITY
  // ============================================================================

  const handleStartOver = useCallback(() => {
    // Reset all state to initial values
    orchestrator.reset();
    setMessages([]);
    setCurrentQuestion(null);
    setSnooState('idle');
    setPhase('gathering');
    setDebugInfo({});
    setDebugLog([]);
    setEnrichmentStatus({
      reddit: 'pending',
      areas: 'pending',
      hotels: 'pending',
      activities: 'pending',
      pricing: 'pending',
      restaurants: 'pending',
      experiences: 'pending',
    });
    setIsTyping(false);
    setIsProcessing(false);

    // Reset the initialization flag to allow restart
    hasInitialized.current = false;

    // Start fresh conversation
    setTimeout(() => {
      hasInitialized.current = true;
      startConversation();
    }, 100);
  }, [orchestrator]);

  // ============================================================================
  // ACKNOWLEDGMENT MESSAGES - Make conversation feel more personal
  // ============================================================================

  const generateAcknowledgment = (field: string, value: unknown): string | null => {
    const prefs = orchestrator.getState().preferences;

    switch (field) {
      case 'destination': {
        const dest = value as { canonicalName?: string };
        return dest.canonicalName
          ? `${dest.canonicalName}! Great choice. Let me search for the best recommendations from Reddit travelers.`
          : null;
      }
      case 'dates': {
        const dates = value as { nights?: number };
        if (dates.nights) {
          if (dates.nights >= 10) {
            return `${dates.nights} nights - that's a solid amount of time to really explore! Let's make the most of it.`;
          } else if (dates.nights <= 4) {
            return `A quick ${dates.nights}-night trip! I'll help you prioritize the must-sees.`;
          }
          return `${dates.nights} nights - perfect. I'll plan a great itinerary for that time.`;
        }
        return null;
      }
      case 'party': {
        const party = value as { adults: number; children?: number };
        if (party.children && party.children > 0) {
          return `Got it - ${party.adults} adult${party.adults > 1 ? 's' : ''} and ${party.children} little one${party.children > 1 ? 's' : ''}! I'll focus on family-friendly options.`;
        }
        if (party.adults === 1) {
          return `Solo adventure! I'll find great options for independent travelers.`;
        }
        if (party.adults === 2) {
          return `Perfect for a couple's trip! Let me find some romantic spots.`;
        }
        return `${party.adults} travelers - got it! Let me find the best options for your group.`;
      }
      case 'budget': {
        const budget = value as { value: number };
        if (budget.value >= 400) {
          return `With that budget, you'll have access to some amazing properties. Let me find the top-rated options.`;
        } else if (budget.value <= 100) {
          return `Budget-conscious travel - smart! I know some great hidden gems that won't break the bank.`;
        }
        return `Great, I'll find the best value options in that range.`;
      }
      case 'activities': {
        const activities = value as { label: string }[];
        if (activities.length >= 4) {
          return `Wow, you want to do it all! I'll make sure we pack in lots of variety.`;
        } else if (activities.length === 1) {
          return `${activities[0].label} focused - I'll find the best spots for that!`;
        }
        return `Nice picks! I'll search for the best ${activities.map(a => a.label.toLowerCase()).join(' and ')} options.`;
      }
      case 'pace': {
        const pace = value as { id: string };
        if (pace.id === 'chill') {
          return `Relaxation mode - love it. I'll keep the schedule spacious.`;
        } else if (pace.id === 'packed') {
          return `Adventure mode! Let's maximize every day.`;
        }
        return `Balanced pace - I'll mix in downtime with activities.`;
      }
      case 'areas': {
        const areas = value as { name: string }[];
        if (areas.length === 1) {
          return `${areas[0].name} - great choice! Let me find the best hotels there.`;
        } else if (areas.length === 2) {
          return `${areas[0].name} and ${areas[1].name} - a great combo! Now let's find you places to stay.`;
        }
        return `${areas.length} areas selected - this will be an adventure! Let me search for hotels.`;
      }
      default:
        return null;
    }
  };

  // ============================================================================
  // HANDLE USER RESPONSE
  // ============================================================================

  const handleUserResponse = useCallback(async (value: unknown) => {
    if (isProcessing || !currentQuestion) return;

    setIsProcessing(true);
    setSnooState('thinking');

    // Add user message to transcript
    const userMessageContent = formatUserResponse(value);
    orchestrator.addUserMessage(userMessageContent);
    setMessages([...orchestrator.getMessages()]);

    // Store which field was just answered
    const answeredField = currentQuestion.field;

    // Generate and show acknowledgment message for key steps
    const acknowledgment = generateAcknowledgment(answeredField, value);
    if (acknowledgment) {
      orchestrator.addSnooMessage(acknowledgment, 'thinking');
      setMessages([...orchestrator.getMessages()]);
      // Small pause to let user see the acknowledgment
      await new Promise(resolve => setTimeout(resolve, 600));
    }

    // Process the response
    orchestrator.processUserResponse(currentQuestion.id, value);
    setCurrentQuestion(null);

    // If dining was just answered and user selected "Help me find restaurants", ask about cuisines first
    if (answeredField === 'dining') {
      const diningMode = (value as any).id;
      console.log('[QuickPlanChat] Dining answered:', diningMode);

      if (diningMode === 'plan') {
        // User wants restaurant help - next step is to ask about cuisine preferences
        // Give the orchestrator time to process the response before asking for next question
        await new Promise(resolve => setTimeout(resolve, 100));

        const nextQuestion = await orchestrator.selectNextQuestion();
        console.log('[Dining] After dining plan, next question:', nextQuestion?.field);

        if (nextQuestion && nextQuestion.field === 'cuisinePreferences') {
          orchestrator.addSnooMessage(nextQuestion.snooMessage, 'idle');
          setMessages([...orchestrator.getMessages()]);
          setCurrentQuestion(nextQuestion);
          orchestrator.state.currentQuestion = nextQuestion;
          setIsTyping(false);
          setIsProcessing(false);
          setSnooState('idle');
          setDebugLog([...orchestrator.getDebugLog()]);
          return;
        } else {
          console.warn('[Dining] Expected cuisinePreferences but got:', nextQuestion?.field);
        }
      }
      // If diningMode is 'none' or 'list', continue to generation
    }

    // If cuisine preferences were just answered, fetch restaurants by cuisine
    if (answeredField === 'cuisinePreferences') {
      const cuisinePrefs = value as { id: string; label: string }[];
      const cuisineTypes = cuisinePrefs.map(c => c.id);
      console.log('[QuickPlanChat] Cuisine preferences answered:', cuisineTypes);

      // Fetch restaurants for all cuisine types
      await fetchRestaurantsByCuisine(cuisineTypes);

      // After restaurants are fetched, get the next question (restaurant selection)
      const restaurantQuestion = await orchestrator.selectNextQuestion();
      console.log('[Restaurants] After fetch, selectNextQuestion returned:', restaurantQuestion ? {
        field: restaurantQuestion.field,
        inputType: restaurantQuestion.inputType,
        candidatesCount: (restaurantQuestion.inputConfig as any)?.candidates?.length || 0,
      } : null);

      if (restaurantQuestion) {
        orchestrator.addSnooMessage(restaurantQuestion.snooMessage, 'idle');
        setMessages([...orchestrator.getMessages()]);
        setCurrentQuestion(restaurantQuestion);
        orchestrator.state.currentQuestion = restaurantQuestion;
        setIsTyping(false);
        setIsProcessing(false);
        setSnooState('idle');
        setDebugLog([...orchestrator.getDebugLog()]);
        return;
      } else {
        // No restaurant question - restaurants are done, check for experiences
        console.log('[Restaurants] No more restaurants, checking for experiences');

        // Fetch experiences if user has selected activities
        const state = orchestrator.getState();
        const selectedActivities = state.preferences.selectedActivities || [];
        if (selectedActivities.length > 0) {
          const activityTypes = selectedActivities.map(a => a.type);
          await fetchExperiencesByType(activityTypes);

          // After experiences are fetched, get the next question
          const experienceQuestion = await orchestrator.selectNextQuestion();
          if (experienceQuestion && experienceQuestion.field === 'experiences') {
            orchestrator.addSnooMessage(experienceQuestion.snooMessage, 'idle');
            setMessages([...orchestrator.getMessages()]);
            setCurrentQuestion(experienceQuestion);
            orchestrator.state.currentQuestion = experienceQuestion;
            setIsTyping(false);
            setIsProcessing(false);
            setSnooState('idle');
            setDebugLog([...orchestrator.getDebugLog()]);
            return;
          }
        }

        const currentPhase = orchestrator.getPhase();
        console.log('[Restaurants] No question returned, phase:', currentPhase);

        if (currentPhase === 'generating') {
          setPhase('generating');
          await handleGenerationPhase();
          setIsTyping(false);
          setIsProcessing(false);
          setSnooState('idle');
          setDebugLog([...orchestrator.getDebugLog()]);
          return;
        }
      }
    }

    // If restaurants were just answered, check if we need more cuisines or move to experiences
    if (answeredField === 'restaurants') {
      // Get the next question - could be more restaurant cuisines or experiences
      const nextQuestion = await orchestrator.selectNextQuestion();
      console.log('[Restaurants answered] Next question:', nextQuestion?.field);

      if (nextQuestion && nextQuestion.field === 'restaurants') {
        // More cuisines to show
        orchestrator.addSnooMessage(nextQuestion.snooMessage, 'idle');
        setMessages([...orchestrator.getMessages()]);
        setCurrentQuestion(nextQuestion);
        orchestrator.state.currentQuestion = nextQuestion;
        setIsTyping(false);
        setIsProcessing(false);
        setSnooState('idle');
        setDebugLog([...orchestrator.getDebugLog()]);
        return;
      } else if (!nextQuestion || nextQuestion.field !== 'experiences') {
        // All restaurants done - fetch experiences
        const state = orchestrator.getState();
        const selectedActivities = state.preferences.selectedActivities || [];
        if (selectedActivities.length > 0) {
          const activityTypes = selectedActivities.map(a => a.type);
          await fetchExperiencesByType(activityTypes);

          const experienceQuestion = await orchestrator.selectNextQuestion();
          if (experienceQuestion && experienceQuestion.field === 'experiences') {
            orchestrator.addSnooMessage(experienceQuestion.snooMessage, 'idle');
            setMessages([...orchestrator.getMessages()]);
            setCurrentQuestion(experienceQuestion);
            orchestrator.state.currentQuestion = experienceQuestion;
            setIsTyping(false);
            setIsProcessing(false);
            setSnooState('idle');
            setDebugLog([...orchestrator.getDebugLog()]);
            return;
          }
        }
      } else if (nextQuestion) {
        // Experiences or other question
        orchestrator.addSnooMessage(nextQuestion.snooMessage, 'idle');
        setMessages([...orchestrator.getMessages()]);
        setCurrentQuestion(nextQuestion);
        orchestrator.state.currentQuestion = nextQuestion;
        setIsTyping(false);
        setIsProcessing(false);
        setSnooState('idle');
        setDebugLog([...orchestrator.getDebugLog()]);
        return;
      }
    }

    // If experiences were just answered, check if we need more activity types
    if (answeredField === 'experiences') {
      const nextQuestion = await orchestrator.selectNextQuestion();
      console.log('[Experiences answered] Next question:', nextQuestion?.field);

      if (nextQuestion) {
        orchestrator.addSnooMessage(nextQuestion.snooMessage, 'idle');
        setMessages([...orchestrator.getMessages()]);
        setCurrentQuestion(nextQuestion);
        orchestrator.state.currentQuestion = nextQuestion;
        setIsTyping(false);
        setIsProcessing(false);
        setSnooState('idle');
        setDebugLog([...orchestrator.getDebugLog()]);
        return;
      } else {
        // No more questions - move to generation
        const currentPhase = orchestrator.getPhase();
        if (currentPhase === 'generating') {
          setPhase('generating');
          await handleGenerationPhase();
          setIsTyping(false);
          setIsProcessing(false);
          setSnooState('idle');
          setDebugLog([...orchestrator.getDebugLog()]);
          return;
        }
      }
    }

    // If hotel preferences were just answered, fetch hotels for selected areas
    if (answeredField === 'hotelPreferences') {
      await fetchHotelsForAreas();

      // After hotels are fetched, immediately get and show the hotel selection question
      const hotelQuestion = await orchestrator.selectNextQuestion();
      console.log('[Hotels] After fetch, selectNextQuestion returned:', hotelQuestion ? {
        field: hotelQuestion.field,
        inputType: hotelQuestion.inputType,
        candidatesCount: (hotelQuestion.inputConfig as any)?.candidates?.length || 0,
      } : null);

      if (hotelQuestion) {
        orchestrator.addSnooMessage(hotelQuestion.snooMessage, 'idle');
        setMessages([...orchestrator.getMessages()]);
        setCurrentQuestion(hotelQuestion);
        orchestrator.state.currentQuestion = hotelQuestion;
        setIsTyping(false);
        setIsProcessing(false);
        setSnooState('idle');
        setDebugLog([...orchestrator.getDebugLog()]);
        return; // Exit early - we've handled this case
      } else {
        // No hotel question returned - check if we should move to next phase
        const currentPhase = orchestrator.getPhase();
        console.log('[Hotels] No question returned, phase:', currentPhase);

        if (currentPhase === 'generating') {
          // Move directly to generation
          setPhase('generating');
          await handleGenerationPhase();
          setIsTyping(false);
          setIsProcessing(false);
          setSnooState('idle');
          setDebugLog([...orchestrator.getDebugLog()]);
          return;
        }

        // Otherwise, try to get the next question (might be dining, etc.)
        const nextQuestion = await orchestrator.selectNextQuestion();
        if (nextQuestion) {
          orchestrator.addSnooMessage(nextQuestion.snooMessage, 'idle');
          setMessages([...orchestrator.getMessages()]);
          setCurrentQuestion(nextQuestion);
          orchestrator.state.currentQuestion = nextQuestion;
        }
        setIsTyping(false);
        setIsProcessing(false);
        setSnooState('idle');
        setDebugLog([...orchestrator.getDebugLog()]);
        return;
      }
    }

    // Small delay for effect
    await new Promise(resolve => setTimeout(resolve, 300));

    setSnooState('typing');
    setIsTyping(true);

    console.log('[QuickPlanChat] Getting next question after answering:', answeredField);

    // Get next question (this may change the phase internally)
    const nextQuestion = await orchestrator.selectNextQuestion();

    console.log('[QuickPlanChat] Got next question:', nextQuestion ? {
      field: nextQuestion.field,
      inputType: nextQuestion.inputType,
    } : 'null');

    // Check if phase changed after getting next question
    const currentPhase = orchestrator.getPhase();
    if (currentPhase !== phase) {
      setPhase(currentPhase);

      // Handle phase-specific actions
      if (currentPhase === 'enriching') {
        setIsTyping(false);
        await handleEnrichmentPhase();

        // After enrichment, get the next question again
        const postEnrichmentQuestion = await orchestrator.selectNextQuestion();
        if (postEnrichmentQuestion) {
          orchestrator.addSnooMessage(postEnrichmentQuestion.snooMessage, 'idle');
          setMessages([...orchestrator.getMessages()]);
          setCurrentQuestion(postEnrichmentQuestion);
          orchestrator.state.currentQuestion = postEnrichmentQuestion;
        }

        setIsProcessing(false);
        setSnooState('idle');
        setDebugLog([...orchestrator.getDebugLog()]);
        return;
      } else if (currentPhase === 'generating') {
        await handleGenerationPhase();
      } else if (currentPhase === 'satisfied') {
        // Conversation complete - show celebration and navigate to itinerary
        const celebrationMsg = await orchestrator.generateSnooMessage({ type: 'celebration' });
        orchestrator.addSnooMessage(celebrationMsg, 'celebrating');
        setMessages([...orchestrator.getMessages()]);
        setSnooState('celebrating');
        setPhase('satisfied');
        setIsProcessing(false);

        // Auto-navigate to the full itinerary after a short delay
        setTimeout(async () => {
          try {
            const tripId = finalizeQuickPlanTrip(orchestrator.getState());
            console.log('[QuickPlanChat] Satisfaction confirmed, navigating to trip:', tripId);

            // BUG #6 FIX: Verify localStorage was written before navigating
            const stored = localStorage.getItem('wandercraft-trip-v2');
            if (!stored) {
              throw new Error('Trip data not saved to localStorage');
            }

            window.location.href = `/plan/${tripId}`;
          } catch (error) {
            console.error('[QuickPlanChat] Failed to finalize trip:', error);
            // Show error to user instead of blank page
            orchestrator.addSnooMessage(
              "Oops! Something went wrong saving your trip. Please try clicking the button again.",
              'idle'
            );
            setMessages([...orchestrator.getMessages()]);
            setSnooState('idle');
            setPhase('reviewing'); // Go back to reviewing so user can try again
          }
        }, 1500); // Give user time to see the celebration message
        return; // Don't continue processing - we're navigating away
      }
    }

    if (nextQuestion) {
      // Add Snoo's next message
      orchestrator.addSnooMessage(nextQuestion.snooMessage, 'idle');
      setMessages([...orchestrator.getMessages()]);
      setCurrentQuestion(nextQuestion);
      orchestrator.state.currentQuestion = nextQuestion;
    }

    setIsTyping(false);
    setIsProcessing(false);
    setSnooState('idle');

    // Update debug info
    setDebugLog([...orchestrator.getDebugLog()]);
  }, [currentQuestion, isProcessing, orchestrator, phase]);

  // ============================================================================
  // ENRICHMENT PHASE
  // ============================================================================

  const handleEnrichmentPhase = async () => {
    setSnooState('thinking');

    // Add phase transition message
    orchestrator.addSnooMessage(
      "Let me research the best options for your trip. This might take a moment...",
      'thinking'
    );
    setMessages([...orchestrator.getMessages()]);

    const destContext = orchestrator.getState().preferences.destinationContext;
    const destination = destContext?.canonicalName || destContext?.rawInput || '';

    // Start enrichment pipelines
    try {
      // Area discovery (includes Reddit search internally)
      setEnrichmentStatus(prev => ({ ...prev, reddit: 'loading', areas: 'loading' }));
      const prefs = orchestrator.getState().preferences;
      const selectedSubreddits = (prefs as any).selectedSubreddits || ['travel', 'solotravel'];

      const areasResponse = await fetch('/api/quick-plan/discover-areas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination,
          preferences: prefs,
          subreddits: selectedSubreddits,
        }),
      });
      const areasData = await areasResponse.json();

      // Update status based on actual API results
      setEnrichmentStatus(prev => ({ ...prev, reddit: 'done', areas: 'done' }));
      setDebugInfo(prev => ({
        ...prev,
        redditThreadsFetched: areasData.redditPostCount || 0,
        redditPostsAnalyzed: areasData.redditPostCount || 0,
        llmAreasFound: areasData.llmAreasCount || 0,
      }));

      if (areasData.areas) {
        orchestrator.setDiscoveredAreas(areasData.areas);
      }

      // Note: Hotels are fetched later after user answers hotelPreferences
      // Activities are discovered as part of area discovery

      // Update snoo with results
      const areasCount = orchestrator.getState().discoveredData.areas.length;
      if (areasCount > 0) {
        orchestrator.addSnooMessage(
          `Great news! I found ${areasCount} areas in ${destination} that match what you're looking for. Let me show you the best ones...`,
          'celebrating'
        );
      } else {
        orchestrator.addSnooMessage(
          `I'm having trouble finding specific areas for ${destination}. Let's continue with general recommendations.`,
          'idle'
        );
      }
      setMessages([...orchestrator.getMessages()]);
      setSnooState('celebrating');

    } catch (error) {
      console.error('Enrichment failed:', error);
      setEnrichmentStatus(prev => ({
        ...prev,
        reddit: 'error',
        areas: 'error',
      }));
    }

    await new Promise(resolve => setTimeout(resolve, 500));
    setSnooState('idle');
  };

  // ============================================================================
  // FETCH HOTELS FOR SELECTED AREAS
  // ============================================================================

  const fetchHotelsForAreas = async () => {
    const state = orchestrator.getState();
    const selectedAreas = state.preferences.selectedAreas || [];
    const destContext = state.preferences.destinationContext;
    const destination = destContext?.canonicalName || destContext?.rawInput || '';
    const budget = state.preferences.budgetPerNight;

    console.log('[Hotels] fetchHotelsForAreas called', {
      selectedAreasCount: selectedAreas.length,
      selectedAreaIds: selectedAreas.map(a => a.id),
      destination,
      budget,
    });

    if (selectedAreas.length === 0) {
      console.log('[Hotels] No areas selected, skipping hotel fetch');
      // Still show a message to the user
      orchestrator.addSnooMessage(
        `Looks like no areas were selected. Let me help you pick some areas first!`,
        'concerned'
      );
      setMessages([...orchestrator.getMessages()]);
      return;
    }

    orchestrator.addSnooMessage(
      `Searching for hotels that match your preferences...`,
      'thinking'
    );
    setMessages([...orchestrator.getMessages()]);
    setEnrichmentStatus(prev => ({ ...prev, hotels: 'loading' }));

    try {
      // Use POST endpoint with all area IDs
      const areaIds = selectedAreas.map(a => a.id);
      const firstArea = selectedAreas[0];
      console.log('[Hotels] Fetching hotels for areas:', areaIds, 'destination:', destination);

      // Format dates for Makcorps pricing API
      const formatDateForAPI = (date: Date | string | null | undefined): string | undefined => {
        if (!date) return undefined;
        const d = typeof date === 'string' ? new Date(date) : date;
        return d.toISOString().split('T')[0];
      };

      const response = await fetch('/api/quick-plan/hotels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          areaIds,
          destination,
          preferences: {
            budgetMin: budget?.min || 0,
            budgetMax: budget?.max || 1000,
            minRating: 4.0,
          },
          coordinates: firstArea ? {
            lat: firstArea.centerLat || 0,
            lng: firstArea.centerLng || 0,
          } : undefined,
          // Pass dates for Makcorps real-time pricing
          checkIn: formatDateForAPI(state.preferences.startDate),
          checkOut: formatDateForAPI(state.preferences.endDate),
          adults: state.preferences.adults || 2,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[Hotels] API response:', data);

        // Store hotels for each area
        let totalHotels = 0;
        if (data.hotelsByArea) {
          for (const [areaId, hotels] of Object.entries(data.hotelsByArea)) {
            const hotelList = hotels as any[];
            if (hotelList.length > 0) {
              orchestrator.setDiscoveredHotels(areaId, hotelList);
              totalHotels += hotelList.length;
              console.log(`Found ${hotelList.length} hotels for area ${areaId}`);
            }
          }
        }

        if (totalHotels > 0) {
          orchestrator.addSnooMessage(
            `Found ${totalHotels} hotels across your selected areas!`,
            'celebrating'
          );
        } else {
          // No hotels found - let user know and skip to next question
          orchestrator.addSnooMessage(
            `I couldn't find any hotels matching your preferences in those areas yet. Let me move on to the next step.`,
            'concerned'
          );
          // Mark hotels as complete (skipped) so we don't get stuck
          orchestrator.setConfidence('hotels', 'partial');
        }
        setMessages([...orchestrator.getMessages()]);
      } else {
        console.error('[Hotels] API error:', response.status, response.statusText);
        orchestrator.addSnooMessage(
          `Having trouble finding hotels right now. Let's continue with the rest of your trip.`,
          'concerned'
        );
        orchestrator.setConfidence('hotels', 'partial');
        setMessages([...orchestrator.getMessages()]);
      }

      setEnrichmentStatus(prev => ({ ...prev, hotels: 'done' }));
      orchestrator.setEnrichmentStatus('hotels', 'done');
    } catch (error) {
      console.error('[Hotels] Fetch failed:', error);
      orchestrator.addSnooMessage(
        `Having trouble finding hotels right now. Let's continue with the rest of your trip.`,
        'concerned'
      );
      orchestrator.setConfidence('hotels', 'partial');
      orchestrator.setEnrichmentStatus('hotels', 'error');
      setMessages([...orchestrator.getMessages()]);
      setEnrichmentStatus(prev => ({ ...prev, hotels: 'error' }));
    }
  };

  // ============================================================================
  // FETCH RESTAURANTS BY CUISINE TYPE
  // ============================================================================

  const fetchRestaurantsByCuisine = async (cuisineTypes: string[]) => {
    const state = orchestrator.getState();
    const selectedAreas = state.preferences.selectedAreas || [];
    const destContext = state.preferences.destinationContext;
    const destination = destContext?.canonicalName || destContext?.rawInput || '';
    const selectedHotels = (state.preferences as any).selectedHotels || {};

    console.log('[Restaurants] fetchRestaurantsByCuisine called', {
      cuisineTypes,
      selectedAreasCount: selectedAreas.length,
      selectedHotelCount: Object.keys(selectedHotels).length,
      destination,
    });

    if (cuisineTypes.length === 0) {
      console.log('[Restaurants] No cuisines selected, skipping restaurant fetch');
      return;
    }

    orchestrator.addSnooMessage(
      `Finding the best ${cuisineTypes.length > 1 ? 'restaurants' : cuisineTypes[0]} restaurants near your hotels...`,
      'thinking'
    );
    setMessages([...orchestrator.getMessages()]);
    setEnrichmentStatus(prev => ({ ...prev, restaurants: 'loading' }));

    try {
      // Build hotels object with coordinates
      const hotelsData: Record<string, { lat: number; lng: number; name: string }> = {};
      for (const area of selectedAreas) {
        const hotel = selectedHotels[area.id];
        if (hotel?.lat && hotel?.lng) {
          hotelsData[area.id] = {
            lat: hotel.lat,
            lng: hotel.lng,
            name: hotel.name || area.name,
          };
        } else if (area.centerLat && area.centerLng) {
          // Fallback to area center
          hotelsData[area.id] = {
            lat: area.centerLat,
            lng: area.centerLng,
            name: area.name,
          };
        }
      }

      console.log('[Restaurants] Fetching restaurants for cuisines:', cuisineTypes, 'with hotels:', hotelsData);

      const response = await fetch('/api/quick-plan/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cuisineTypes,
          destination,
          hotels: hotelsData,
          areas: selectedAreas.map(a => ({
            id: a.id,
            name: a.name,
            centerLat: a.centerLat,
            centerLng: a.centerLng,
          })),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[Restaurants] API response:', data);

        // Store restaurants by cuisine type
        let totalRestaurants = 0;
        if (data.restaurantsByCuisine) {
          for (const [cuisine, restaurants] of Object.entries(data.restaurantsByCuisine)) {
            const restaurantList = restaurants as any[];
            if (restaurantList.length > 0) {
              // Use setDiscoveredRestaurants but keyed by cuisine instead of area
              orchestrator.setDiscoveredRestaurants(cuisine, restaurantList);
              totalRestaurants += restaurantList.length;
              console.log(`Found ${restaurantList.length} ${cuisine} restaurants`);
            }
          }
        }

        if (totalRestaurants > 0) {
          const cuisineLabels = cuisineTypes.length > 2
            ? `${cuisineTypes.length} cuisine types`
            : cuisineTypes.join(' and ');
          orchestrator.addSnooMessage(
            `Found ${totalRestaurants} great ${cuisineLabels} restaurants near your hotels!`,
            'celebrating'
          );
        } else {
          orchestrator.addSnooMessage(
            `I couldn't find restaurants for those cuisines near your hotels. Let's continue with your itinerary.`,
            'concerned'
          );
        }
        setMessages([...orchestrator.getMessages()]);
      } else {
        console.error('[Restaurants] API error:', response.status, response.statusText);
        orchestrator.addSnooMessage(
          `Having trouble finding restaurants right now. Let's continue with your itinerary.`,
          'concerned'
        );
        setMessages([...orchestrator.getMessages()]);
      }

      setEnrichmentStatus(prev => ({ ...prev, restaurants: 'done' }));
      orchestrator.setEnrichmentStatus('restaurants', 'done');
    } catch (error) {
      console.error('[Restaurants] Fetch failed:', error);
      orchestrator.addSnooMessage(
        `Having trouble finding restaurants right now. Let's continue with your itinerary.`,
        'concerned'
      );
      orchestrator.setEnrichmentStatus('restaurants', 'error');
      setMessages([...orchestrator.getMessages()]);
      setEnrichmentStatus(prev => ({ ...prev, restaurants: 'error' }));
    }
  };

  // ============================================================================
  // FETCH EXPERIENCES BY ACTIVITY TYPE
  // ============================================================================

  const fetchExperiencesByType = async (activityTypes: string[]) => {
    const state = orchestrator.getState();
    const selectedAreas = state.preferences.selectedAreas || [];
    const destContext = state.preferences.destinationContext;
    const destination = destContext?.canonicalName || destContext?.rawInput || '';
    const selectedHotels = (state.preferences as any).selectedHotels || {};

    console.log('[Experiences] fetchExperiencesByType called', {
      activityTypes,
      selectedAreasCount: selectedAreas.length,
      selectedHotelCount: Object.keys(selectedHotels).length,
      destination,
    });

    if (activityTypes.length === 0) {
      console.log('[Experiences] No activities selected, skipping experience fetch');
      return;
    }

    const activityEmojis: Record<string, string> = {
      surf: '🏄', snorkel: '🤿', dive: '🐠', swimming: '🏊', wildlife: '🐋',
      hiking: '🥾', adventure: '🧗', cultural: '🏛️', food_tour: '🍽️',
      nightlife: '🎉', beach: '🏖️', spa_wellness: '💆', golf: '⛳',
      photography: '📸', horseback: '🐎', boat: '⛵', fishing: '🎣',
    };
    const emoji = activityEmojis[activityTypes[0]] || '🎯';

    orchestrator.addSnooMessage(
      `${emoji} Finding the best ${activityTypes.length > 1 ? 'experiences' : activityTypes[0]} tours and activities near your hotels...`,
      'thinking'
    );
    setMessages([...orchestrator.getMessages()]);
    setEnrichmentStatus(prev => ({ ...prev, experiences: 'loading' }));

    try {
      // Build hotels object with coordinates
      const hotelsData: Record<string, { lat: number; lng: number; name: string }> = {};
      for (const area of selectedAreas) {
        const hotel = selectedHotels[area.id];
        if (hotel?.lat && hotel?.lng) {
          hotelsData[area.id] = {
            lat: hotel.lat,
            lng: hotel.lng,
            name: hotel.name || area.name,
          };
        } else if (area.centerLat && area.centerLng) {
          hotelsData[area.id] = {
            lat: area.centerLat,
            lng: area.centerLng,
            name: area.name,
          };
        }
      }

      console.log('[Experiences] Fetching experiences for activities:', activityTypes, 'with hotels:', hotelsData);

      const response = await fetch('/api/quick-plan/experiences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activityTypes,
          destination,
          hotels: hotelsData,
          areas: selectedAreas.map(a => ({
            id: a.id,
            name: a.name,
            centerLat: a.centerLat,
            centerLng: a.centerLng,
          })),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[Experiences] API response:', data);

        // Store experiences by activity type
        let totalExperiences = 0;
        if (data.experiencesByType) {
          for (const [activity, experiences] of Object.entries(data.experiencesByType)) {
            const experienceList = experiences as any[];
            if (experienceList.length > 0) {
              orchestrator.setDiscoveredExperiences(activity, experienceList);
              totalExperiences += experienceList.length;
              console.log(`Found ${experienceList.length} ${activity} experiences`);
            }
          }
        }

        if (totalExperiences > 0) {
          const activityLabels = activityTypes.length > 2
            ? `${activityTypes.length} activity types`
            : activityTypes.join(' and ');
          orchestrator.addSnooMessage(
            `Found ${totalExperiences} great ${activityLabels} experiences near your hotels!`,
            'celebrating'
          );
        } else {
          orchestrator.addSnooMessage(
            `I couldn't find tour options for those activities near your hotels. Let's continue with your itinerary.`,
            'concerned'
          );
        }
        setMessages([...orchestrator.getMessages()]);
      } else {
        console.error('[Experiences] API error:', response.status, response.statusText);
        orchestrator.addSnooMessage(
          `Having trouble finding experiences right now. Let's continue with your itinerary.`,
          'concerned'
        );
        setMessages([...orchestrator.getMessages()]);
      }

      setEnrichmentStatus(prev => ({ ...prev, experiences: 'done' }));
      orchestrator.setEnrichmentStatus('experiences', 'done');
    } catch (error) {
      console.error('[Experiences] Fetch failed:', error);
      orchestrator.addSnooMessage(
        `Having trouble finding experiences right now. Let's continue with your itinerary.`,
        'concerned'
      );
      orchestrator.setEnrichmentStatus('experiences', 'error');
      setMessages([...orchestrator.getMessages()]);
      setEnrichmentStatus(prev => ({ ...prev, experiences: 'error' }));
    }
  };

  // ============================================================================
  // GENERATION PHASE
  // ============================================================================

  const handleGenerationPhase = async () => {
    setSnooState('thinking');

    orchestrator.addSnooMessage(
      "Building your personalized itinerary...",
      'thinking'
    );
    setMessages([...orchestrator.getMessages()]);

    const state = orchestrator.getState();
    const prefs = state.preferences;

    // Use user-selected hotels, not just first from list
    const selectedHotels = (prefs as any).selectedHotels || {};
    const hotelsObj: Record<string, any> = { ...selectedHotels };

    // Fallback: if no selected hotels, use first from discovered
    if (Object.keys(hotelsObj).length === 0) {
      state.discoveredData.hotels.forEach((hotelList, areaId) => {
        if (hotelList && hotelList[0]) {
          hotelsObj[areaId] = hotelList[0];
        }
      });
    }

    const restaurantsObj: Record<string, any[]> = {};
    state.discoveredData.restaurants.forEach((rests, areaId) => {
      restaurantsObj[areaId] = rests;
    });

    // Auto-generate split from selected areas if not set
    const selectedAreas = prefs.selectedAreas || [];
    const tripLength = prefs.tripLength || 7;
    const nightsPerArea = Math.floor(tripLength / Math.max(selectedAreas.length, 1));

    const autoSplit = prefs.selectedSplit || {
      id: 'auto-split',
      name: selectedAreas.map(a => a.name).join(' → '),
      areas: selectedAreas.map((area, idx) => ({
        areaId: area.id,
        areaName: area.name,
        nights: idx === selectedAreas.length - 1
          ? tripLength - (nightsPerArea * (selectedAreas.length - 1)) // Last area gets remainder
          : nightsPerArea,
      })),
      fitScore: 0.8,
      stops: selectedAreas.map((area, idx) => ({
        areaId: area.id,
        areaName: area.name,
        nights: idx === selectedAreas.length - 1
          ? tripLength - (nightsPerArea * (selectedAreas.length - 1))
          : nightsPerArea,
      })),
    };

    try {
      const response = await fetch('/api/quick-plan/generate-itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferences: { ...prefs, selectedSplit: autoSplit },
          areas: state.discoveredData.areas,
          hotels: hotelsObj,
          restaurants: restaurantsObj,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.itinerary) {
          orchestrator.setItinerary(data.itinerary);
          orchestrator.addSnooMessage(
            "Your itinerary is ready! Take a look and let me know what you think.",
            'celebrating'
          );
        } else {
          orchestrator.addSnooMessage(
            "I've put together a plan for you. Take a look!",
            'celebrating'
          );
        }
      } else {
        console.error('Itinerary generation failed:', await response.text());
        orchestrator.addSnooMessage(
          "Had some trouble generating the itinerary. Let me try a simpler approach.",
          'idle'
        );
      }
    } catch (error) {
      console.error('Itinerary generation error:', error);
      orchestrator.addSnooMessage(
        "Something went wrong building your itinerary. Let's try again.",
        'idle'
      );
    }

    setMessages([...orchestrator.getMessages()]);
    setSnooState('celebrating');

    await new Promise(resolve => setTimeout(resolve, 500));
    setSnooState('idle');

    // BUG #5 FIX: Transition to reviewing phase so itinerary is displayed
    setPhase('reviewing');
    console.log('[QuickPlanChat] Transitioned to reviewing phase');
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-80px)] p-4 sm:p-6">
      {/* Centered chat frame */}
      <div className="w-full max-w-2xl h-[calc(100vh-120px)] max-h-[800px] bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
        {/* Chat header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SnooAgent state={snooState} size="sm" showLabel={false} />
              <div>
                <h2 className="font-semibold text-slate-900 dark:text-white text-sm">Snoo</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Your AI travel buddy</p>
              </div>
            </div>
            {/* Start Over button */}
            <button
              onClick={handleStartOver}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Start over from the beginning"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Start Over</span>
            </button>
          </div>
        </div>

        {/* Chat transcript - scrollable middle section */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <EmptyTranscript />
          ) : (
            <ChatTranscript
              messages={messages}
              isTyping={isTyping}
              className=""
            />
          )}

          {/* Phase divider */}
          {phase !== 'gathering' && (
            <div className="px-4">
              <PhaseDivider phase={phase} />
            </div>
          )}

          {/* Itinerary display when in reviewing phase */}
          {(phase === 'reviewing' || phase === 'satisfied') && orchestrator.getState().itinerary && (
            <div className="px-4 pb-4">
              <ItineraryPreview
                orchestratorState={orchestrator.getState()}
              />
            </div>
          )}
        </div>

        {/* Reply card area - anchored at bottom */}
        <div className="flex-shrink-0 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-4">
          <AnimatePresence mode="wait">
            {currentQuestion && !isProcessing && (
              <div ref={inputRef}>
                <ReplyCard
                  type={currentQuestion.inputType}
                  config={currentQuestion.inputConfig}
                  onSubmit={handleUserResponse}
                  disabled={isProcessing}
                />
              </div>
            )}
          </AnimatePresence>

          {/* Processing indicator */}
          {isProcessing && (
            <div className="flex items-center justify-center gap-3 py-4">
              <SnooAgent state={snooState} size="sm" showLabel={true} />
            </div>
          )}
        </div>
      </div>

      {/* Debug button (dev mode only) */}
      {process.env.NODE_ENV === 'development' && (
        <>
          <DebugButton onClick={() => setDebugOpen(true)} />
          <DebugDrawer
            isOpen={debugOpen}
            onClose={() => setDebugOpen(false)}
            debugInfo={debugInfo}
            debugLog={debugLog}
            enrichmentStatus={enrichmentStatus}
          />
        </>
      )}
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function formatUserResponse(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  // Handle arrays FIRST (before object check since arrays are objects)
  if (Array.isArray(value)) {
    if (value.length === 0) return '(none selected)';

    // Areas array (has bestFor property)
    if (value[0].bestFor) {
      return value.map((a: any) => a.name).join(', ');
    }

    // Generic array with labels/names
    return value.map((v: any) => v.label || v.name || String(v)).join(', ');
  }

  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, any>;

    // Tradeoff resolution response
    if (obj.tradeoffId && obj.selectedOptionId) {
      return obj.selectedLabel || obj.selectedOptionId;
    }

    // Destination response (DestinationContext uses canonicalName, not name)
    if (obj.canonicalName || obj.rawInput) {
      const name = obj.canonicalName || obj.rawInput;
      return obj.countryName ? `${name}, ${obj.countryName}` : name;
    }

    // Date response
    if (obj.startDate && obj.endDate) {
      const start = new Date(obj.startDate).toLocaleDateString();
      const end = new Date(obj.endDate).toLocaleDateString();
      return `${start} to ${end} (${obj.nights} nights)`;
    }

    // Party response
    if (obj.adults !== undefined) {
      const parts = [`${obj.adults} adult${obj.adults > 1 ? 's' : ''}`];
      if (obj.children > 0) {
        parts.push(`${obj.children} child${obj.children > 1 ? 'ren' : ''}`);
      }
      return parts.join(', ');
    }

    // Budget response
    if (obj.value !== undefined && obj.label) {
      return obj.label;
    }

    // Hotel response
    if (obj.placeId && obj.name && obj.googleRating !== undefined) {
      return `${obj.name} (${obj.googleRating}★)`;
    }

    // Split/itinerary response
    if (obj.stops && obj.fitScore !== undefined) {
      const areaNames = obj.stops?.map((s: any) => s.areaName || s.area?.name).filter(Boolean);
      return areaNames?.length > 0 ? areaNames.join(' → ') : (obj.name || 'Selected itinerary');
    }

    // Satisfaction response
    if (obj.satisfied !== undefined) {
      return obj.satisfied ? "Looks great!" : "I'd like to make some changes";
    }

    // Dining response (single id without label)
    if (obj.id && !obj.label && !obj.placeId && !obj.canonicalName) {
      const diningLabels: Record<string, string> = {
        'schedule': 'Plan dinners',
        'list': 'Just a list',
        'none': 'Skip dining',
      };
      return diningLabels[obj.id] || obj.id;
    }

    // Chip/pace response (has id AND label)
    if (obj.id && obj.label) {
      return obj.label;
    }

    // Fallback: try to extract something readable
    if (obj.name) return obj.name;
    if (obj.label) return obj.label;

    return JSON.stringify(value);
  }

  return String(value);
}

// ============================================================================
// ITINERARY PREVIEW
// ============================================================================

interface ItineraryPreviewProps {
  orchestratorState: OrchestratorState;
}

function ItineraryPreview({ orchestratorState }: ItineraryPreviewProps) {
  const [isNavigating, setIsNavigating] = useState(false);

  const itinerary = orchestratorState.itinerary;
  const preferences = orchestratorState.preferences;

  if (!itinerary || !itinerary.days) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 text-center">
        <p className="text-slate-500">No itinerary generated yet</p>
      </div>
    );
  }

  const days = itinerary.days || [];
  const stops = itinerary.stops || [];

  const handleTakeToItinerary = async () => {
    setIsNavigating(true);

    try {
      // Transform Quick Plan data into Trip format and save to store
      const tripId = finalizeQuickPlanTrip(orchestratorState);
      console.log('[ItineraryPreview] Transformed and saved trip:', tripId);

      // Log summary of what was transferred
      const prefs = orchestratorState.preferences;
      const selectedRestaurants = (prefs as any).selectedRestaurants || {};
      const selectedExperiences = (prefs as any).selectedExperiences || {};
      const restaurantCount = Object.values(selectedRestaurants).flat().length;
      const experienceCount = Object.values(selectedExperiences).flat().length;

      console.log('[ItineraryPreview] Transfer summary:', {
        destinations: prefs.selectedAreas?.length || 0,
        hotels: Object.keys((prefs as any).selectedHotels || {}).length,
        restaurants: restaurantCount,
        experiences: experienceCount,
        tripLength: prefs.tripLength || 0,
      });

      // Navigate to the main planner
      window.location.href = `/plan/${tripId}`;
    } catch (error) {
      console.error('[ItineraryPreview] Failed to finalize trip:', error);
      // Show error to user (could add a toast here in the future)
      alert('There was an error creating your itinerary. Please try again.');
      setIsNavigating(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-b border-slate-200 dark:border-slate-700">
        <h3 className="font-semibold text-slate-900 dark:text-white text-lg">
          Your Trip to {preferences.destinationContext?.canonicalName || 'Your Destination'}
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          {days.length} days · {stops.length} {stops.length === 1 ? 'location' : 'locations'}
        </p>
      </div>

      {/* Stops summary */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex flex-wrap gap-2">
          {stops.map((stop: any, idx: number) => (
            <div
              key={stop.areaId || idx}
              className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg"
            >
              <span className="w-6 h-6 flex items-center justify-center bg-orange-500 text-white rounded-full text-xs font-bold">
                {idx + 1}
              </span>
              <div>
                <p className="font-medium text-slate-900 dark:text-white text-sm">
                  {stop.areaName || stop.area?.name || `Stop ${idx + 1}`}
                </p>
                <p className="text-xs text-slate-500">{stop.nights} nights</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Day-by-day */}
      <div className="max-h-96 overflow-y-auto">
        {days.map((day: any) => (
          <div
            key={day.dayNumber}
            className="p-4 border-b border-slate-100 dark:border-slate-700 last:border-b-0"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded text-xs font-medium">
                Day {day.dayNumber}
              </span>
              {day.date && (
                <span className="text-xs text-slate-500">
                  {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>

            <div className="space-y-2 ml-2">
              {day.morning && (
                <div className="flex items-start gap-2">
                  <span className="text-xs text-slate-400 w-16">Morning</span>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{day.morning.description || day.morning.activity}</p>
                </div>
              )}
              {day.afternoon && (
                <div className="flex items-start gap-2">
                  <span className="text-xs text-slate-400 w-16">Afternoon</span>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{day.afternoon.description || day.afternoon.activity}</p>
                </div>
              )}
              {day.evening && (
                <div className="flex items-start gap-2">
                  <span className="text-xs text-slate-400 w-16">Evening</span>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{day.evening.description || day.evening.activity}</p>
                </div>
              )}
              {!day.morning && !day.afternoon && !day.evening && (
                <p className="text-sm text-slate-500 italic">Free day to explore</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer with action button */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
        <button
          onClick={handleTakeToItinerary}
          disabled={isNavigating}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg shadow-orange-500/25 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isNavigating ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Loading your itinerary...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"/>
                <path d="m12 5 7 7-7 7"/>
              </svg>
              Take me to my itinerary
            </>
          )}
        </button>
      </div>
    </div>
  );
}
