'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence } from 'framer-motion';
import ChatTranscript, { EmptyTranscript, PhaseDivider } from './chat/ChatTranscript';
import ReplyCard from './chat/ReplyCard';
import SnooAgent from './chat/SnooAgent';
import { DebugButton } from './chat/DebugDrawer';
import {
  createOrchestrator,
} from '@/lib/quick-plan/orchestrator';

// Dynamic import for DebugDrawer - only loaded when debug panel is opened
const DebugDrawer = dynamic(
  () => import('./chat/DebugDrawer').then(mod => ({ default: mod.default })),
  { ssr: false }
);
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
import { useToast } from '@/components/ui/Toast';
import { parseAPIErrorResponse, getUserFriendlyMessage } from '@/lib/errors';
import { dedupedPost } from '@/lib/request-dedup';
import { RotateCcw, Send, MessageCircle, ArrowLeft, SkipForward } from 'lucide-react';
import { ProgressIndicatorCompact } from './ProgressIndicator';
import { LoadingCard } from './LoadingMessage';

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
  const isProcessingRef = useRef(false); // Synchronous guard against double-submission
  const inputRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);
  // Track timeouts for cleanup
  const startOverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (startOverTimeoutRef.current) {
        clearTimeout(startOverTimeoutRef.current);
      }
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

  // Free text input state
  const [freeTextInput, setFreeTextInput] = useState('');
  const [showFreeTextInput, setShowFreeTextInput] = useState(false);

  // Loading state - tracks what's currently being loaded for better UX
  type LoadingType = 'hotel' | 'restaurant' | 'experience' | 'area' | 'itinerary' | null;
  const [currentLoadingType, setCurrentLoadingType] = useState<LoadingType>(null);

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  const startConversation = useCallback(async () => {
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
  }, [orchestrator]);

  useEffect(() => {
    // Prevent double initialization in React 18 Strict Mode
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    // Start the conversation
    startConversation();
  }, [startConversation]);

  // ============================================================================
  // START OVER FUNCTIONALITY
  // ============================================================================

  const handleStartOver = useCallback(() => {
    // Confirm before discarding all progress
    if (!window.confirm('Start over? All your current choices will be lost.')) {
      return;
    }
    // Cancel any pending navigation timeout (prevents race with satisfaction flow)
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
      navigationTimeoutRef.current = null;
    }
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
    setIsProcessing(false); isProcessingRef.current = false;

    // Reset the initialization flag to allow restart
    hasInitialized.current = false;

    // Start fresh conversation with cleanup tracking
    if (startOverTimeoutRef.current) {
      clearTimeout(startOverTimeoutRef.current);
    }
    startOverTimeoutRef.current = setTimeout(() => {
      hasInitialized.current = true;
      startConversation();
    }, 100);
  }, [orchestrator, startConversation]);

  // ============================================================================
  // FREE TEXT INPUT - Allow users to ask questions or provide context
  // ============================================================================

  const handleFreeTextSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!freeTextInput.trim() || isProcessing) return;

    // Sanitize: strip HTML tags to prevent injection into LLM prompts and transcript
    const userMessage = freeTextInput.trim().replace(/<[^>]*>/g, '');
    if (!userMessage) return;
    setFreeTextInput('');
    setShowFreeTextInput(false);
    setIsProcessing(true);
    setSnooState('thinking');

    // Add user message to transcript
    orchestrator.addUserMessage(userMessage);
    setMessages([...orchestrator.getMessages()]);

    try {
      // Send to chat API for intelligent response
      const response = await fetch('/api/quick-plan/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `You are Snoo, a friendly AI travel planning assistant. The user is planning a trip and has asked a question or provided additional context.

Current trip context:
${JSON.stringify((() => {
  const { safetyContext, accessibilityNeeds, childNeeds, allergyTypes, mobilityLimitations, ...safe } = orchestrator.getState().preferences as any;
  return safe;
})(), null, 2)}

Respond helpfully and concisely (2-3 sentences max). If they're asking about something specific to their trip, incorporate that into your response. If they're providing preferences or context, acknowledge it and explain how you'll use that information. Stay friendly and encouraging!`
            },
            { role: 'user', content: userMessage }
          ],
          temperature: 0.7,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const snooResponse = data.content || "Got it! I'll keep that in mind as we plan your trip.";
        orchestrator.addSnooMessage(snooResponse, 'idle');
        setMessages([...orchestrator.getMessages()]);
      } else {
        // Parse error response for better messaging
        const errorMessage = await parseAPIErrorResponse(response);
        console.error('[FreeText] API error:', response.status, errorMessage);

        // Provide a graceful fallback message
        orchestrator.addSnooMessage("Thanks for sharing! I'll factor that into your trip planning.", 'idle');
        setMessages([...orchestrator.getMessages()]);
      }
    } catch (error) {
      console.error('[FreeText] Error processing message:', error);
      const friendlyMessage = getUserFriendlyMessage(error);
      console.error('[FreeText] User-friendly message:', friendlyMessage);

      // Graceful fallback - don't show error to user, just continue
      orchestrator.addSnooMessage("Thanks for the input! Let's continue planning your trip.", 'idle');
      setMessages([...orchestrator.getMessages()]);
    }

    setIsProcessing(false); isProcessingRef.current = false;
    setSnooState('idle');
    setDebugLog([...orchestrator.getDebugLog()]);
  }, [freeTextInput, isProcessing, orchestrator]);

  // ============================================================================
  // USER NOTES - Allow users to add context/notes for specific fields
  // ============================================================================

  const handleAddNote = useCallback((field: string, note: string) => {
    if (!note || !note.trim()) return;
    orchestrator.addUserNote(field, note);
    console.log(`[QuickPlanChat] Added note for ${field}: ${note.substring(0, 50)}...`);
  }, [orchestrator]);

  // FIX 4.2: Go Back functionality
  const handleGoBack = useCallback(async () => {
    const success = orchestrator.goToPreviousQuestion();
    if (success) {
      // goToPreviousQuestion may have reverted the phase — sync UI
      const phaseAfterGoBack = orchestrator.getPhase();
      if (phaseAfterGoBack !== phase) {
        setPhase(phaseAfterGoBack);
      }

      // Get the new current question after going back.
      // Save phase to detect unexpected transitions from selectNextQuestion side effects.
      const phaseBefore = orchestrator.getPhase();
      const question = await orchestrator.selectNextQuestion();
      const phaseAfter = orchestrator.getPhase();

      // Guard: if selectNextQuestion caused an unexpected phase advance, revert it.
      // Going back should never advance the phase forward.
      const PHASE_ORDER = ['gathering', 'enriching', 'generating', 'reviewing', 'satisfied'];
      if (PHASE_ORDER.indexOf(phaseAfter) > PHASE_ORDER.indexOf(phaseBefore)) {
        console.warn('[QuickPlanChat] Go-back caused unexpected phase advance:', phaseBefore, '->', phaseAfter, '- reverting');
        (orchestrator as any).state.phase = phaseBefore;
        setPhase(phaseBefore);
      }

      if (question) {
        setCurrentQuestion(question);
        orchestrator.state.currentQuestion = question;
      }
      console.log('[QuickPlanChat] Went back to previous question');
    } else {
      console.log('[QuickPlanChat] Cannot go back - at first question');
    }
  }, [orchestrator, phase]);

  // FIX 4.3: Skip functionality - properly advance to next question
  const handleSkip = useCallback(async () => {
    if (!currentQuestion) return;

    setIsProcessing(true);
    setSnooState('thinking');

    // Mark the current question as skipped first (validates the skip)
    orchestrator.processUserResponse(currentQuestion.id, 'SKIP');

    // Only add transcript message after processUserResponse accepts the skip
    orchestrator.addUserMessage('(Skipped)');
    setMessages([...orchestrator.getMessages()]);
    setCurrentQuestion(null);

    console.log('[QuickPlanChat] Skipped question:', currentQuestion.field);

    // Get the next question
    const nextQuestion = await orchestrator.selectNextQuestion();

    if (nextQuestion) {
      // Add Snoo's message for the next question
      orchestrator.addSnooMessage(nextQuestion.snooMessage, 'idle');
      setMessages([...orchestrator.getMessages()]);
      setCurrentQuestion(nextQuestion);
      orchestrator.state.currentQuestion = nextQuestion;
    }

    setIsProcessing(false); isProcessingRef.current = false;
    setSnooState('idle');
    setDebugLog([...orchestrator.getDebugLog()]);
  }, [orchestrator, currentQuestion]);

  // Check if we can go back (have question history)
  const canGoBack = orchestrator.getQuestionHistory().length > 1;

  // Check if current question is skippable (optional)
  const canSkip = currentQuestion && !currentQuestion.required;

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
    if (isProcessing || isProcessingRef.current || !currentQuestion) return;

    isProcessingRef.current = true;
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

    // Process the response (trim string values to avoid whitespace-only inputs)
    const processedValue = typeof value === 'string' ? (value.trim() || null) : value;
    if (processedValue === null) {
      // Whitespace-only input — reset state and treat as if nothing was entered
      setIsProcessing(false); isProcessingRef.current = false;
      setSnooState('idle');
      return;
    }
    orchestrator.processUserResponse(currentQuestion.id, processedValue);
    setCurrentQuestion(null);

    // CRITICAL: Handle satisfaction response (dissatisfaction needs special handling)
    if (answeredField === 'satisfaction') {
      const satisfactionResponse = value as { satisfied: boolean; reasons?: string[]; customFeedback?: string };
      console.log('[QuickPlanChat] Satisfaction answered:', satisfactionResponse);

      if (satisfactionResponse.satisfied) {
        // User is happy - this is handled by the phase transition to 'satisfied' below
        // Let the normal flow continue
      } else {
        // User is dissatisfied - orchestrator.processUserResponse already called handleDissatisfaction
        // which reset confidence levels and set the appropriate phase
        const currentPhase = orchestrator.getPhase();
        console.log('[Dissatisfaction] Phase after handling:', currentPhase);

        // Add acknowledgment message
        const reasonLabels = satisfactionResponse.reasons?.map(r => {
          const labels: Record<string, string> = {
            'wrong_areas': 'areas',
            'wrong_vibe': 'overall vibe',
            'too_packed': 'pace (too busy)',
            'too_chill': 'pace (not enough)',
            'hotel_wrong': 'hotels',
            'dining_wrong': 'restaurants',
            'too_touristy': 'touristy spots',
            'missing_activity': 'missing activities',
            'budget_exceeded': 'budget',
            'other': 'other concerns',
          };
          return labels[r] || r;
        }) || [];

        const feedbackSummary = reasonLabels.length > 0
          ? `I hear you - let's fix the ${reasonLabels.join(' and ')}.`
          : "Got it, let me make some adjustments.";

        orchestrator.addSnooMessage(feedbackSummary, 'thinking');
        setMessages([...orchestrator.getMessages()]);

        // Small delay for the thinking message to show
        await new Promise(resolve => setTimeout(resolve, 500));

        if (currentPhase === 'generating') {
          // Need to regenerate itinerary with new preferences
          setPhase('generating');
          await handleGenerationPhase();
          // After regeneration, show the itinerary again
          setPhase('reviewing');
          const satisfactionQuestion = await orchestrator.selectNextQuestion();
          if (satisfactionQuestion) {
            orchestrator.addSnooMessage(satisfactionQuestion.snooMessage, 'idle');
            setMessages([...orchestrator.getMessages()]);
            setCurrentQuestion(satisfactionQuestion);
            orchestrator.state.currentQuestion = satisfactionQuestion;
          }
        } else if (currentPhase === 'gathering' || currentPhase === 'enriching') {
          // Need to go back and re-ask questions
          setPhase(currentPhase);
          const nextQuestion = await orchestrator.selectNextQuestion();
          if (nextQuestion) {
            orchestrator.addSnooMessage(nextQuestion.snooMessage, 'idle');
            setMessages([...orchestrator.getMessages()]);
            setCurrentQuestion(nextQuestion);
            orchestrator.state.currentQuestion = nextQuestion;
          }
        }

        setIsTyping(false);
        setIsProcessing(false); isProcessingRef.current = false;
        setSnooState('idle');
        setDebugLog([...orchestrator.getDebugLog()]);
        return; // Exit early - we've handled the dissatisfaction
      }
    }

    // Check for trip length cap and seasonal warnings after dates are answered
    if (answeredField === 'dates') {
      const userNights = (value as any).nights;
      const storedNights = orchestrator.getState().preferences.tripLength;
      if (userNights && storedNights && userNights !== storedNights) {
        orchestrator.addSnooMessage(
          `Just a heads up — I've adjusted your trip to ${storedNights} nights (the maximum I can plan for is 365). You can always extend it later in the full planner.`,
          'idle'
        );
        setMessages([...orchestrator.getMessages()]);
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      const state = orchestrator.getState();
      const warnings = state.seasonalWarnings;
      if (warnings && warnings.length > 0) {
        // Build a friendly warning message
        const severityIcon = (severity: string) => {
          switch (severity) {
            case 'caution': return '🚨';
            case 'warning': return '⚠️';
            default: return 'ℹ️';
          }
        };
        const priceNote = (impact?: string) => {
          switch (impact) {
            case 'much_higher': return ' Prices are significantly higher.';
            case 'higher': return ' Prices tend to be higher.';
            case 'lower': return ' Good deals are often available!';
            case 'much_lower': return ' Great deals available!';
            default: return '';
          }
        };

        const warningLines = warnings.map(w =>
          `${severityIcon(w.severity)} **${w.title}**: ${w.description}${priceNote(w.priceImpact)}`
        );

        const hasSevereWarnings = warnings.some(w => w.severity === 'caution' || w.severity === 'warning');

        const warningMessage = hasSevereWarnings
          ? `Heads up about your travel dates:\n\n${warningLines.join('\n\n')}\n\nIf you'd like to pick different dates, tap the **back** button. Otherwise, let's keep planning!`
          : `Quick note about your dates:\n\n${warningLines.join('\n\n')}\n\nLet's keep planning!`;

        orchestrator.addSnooMessage(warningMessage, 'idle');
        setMessages([...orchestrator.getMessages()]);
        await new Promise(resolve => setTimeout(resolve, 800)); // Let user read the warning
      }
    }

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

        if (nextQuestion && (nextQuestion.field === 'cuisinePreferences' || nextQuestion.field === 'dietaryRestrictions')) {
          orchestrator.addSnooMessage(nextQuestion.snooMessage, 'idle');
          setMessages([...orchestrator.getMessages()]);
          setCurrentQuestion(nextQuestion);
          orchestrator.state.currentQuestion = nextQuestion;
          setIsTyping(false);
          setIsProcessing(false); isProcessingRef.current = false;
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

      // PARALLELIZED: Fetch restaurants AND experiences concurrently to reduce loading time
      // Get activity types for parallel fetch
      const state = orchestrator.getState();
      const selectedActivities = state.preferences.selectedActivities || [];
      const activityTypes = selectedActivities.map(a => a.type);

      console.log('[QuickPlanChat] Fetching restaurants and experiences in parallel');

      // Execute both fetches in parallel
      const fetchPromises: Promise<void>[] = [
        fetchRestaurantsByCuisine(cuisineTypes),
      ];
      if (activityTypes.length > 0) {
        fetchPromises.push(fetchExperiencesByType(activityTypes));
      }

      await Promise.all(fetchPromises);
      console.log('[QuickPlanChat] Parallel fetch complete');

      // After fetches complete, get the next question — ONE call only to avoid double phase transition
      const nextQuestion = await orchestrator.selectNextQuestion();
      console.log('[CuisinePrefs] After fetch, selectNextQuestion returned:', nextQuestion ? {
        field: nextQuestion.field,
        inputType: nextQuestion.inputType,
        candidatesCount: (nextQuestion.inputConfig as any)?.candidates?.length || 0,
      } : null);

      if (nextQuestion) {
        // Show the question (restaurants, experiences, etc.)
        orchestrator.addSnooMessage(nextQuestion.snooMessage, 'idle');
        setMessages([...orchestrator.getMessages()]);
        setCurrentQuestion(nextQuestion);
        orchestrator.state.currentQuestion = nextQuestion;
        setIsTyping(false);
        setIsProcessing(false); isProcessingRef.current = false;
        setSnooState('idle');
        setDebugLog([...orchestrator.getDebugLog()]);
        return;
      }

      // No question — check phase (may have transitioned to 'generating')
      const currentPhase = orchestrator.getPhase();
      console.log('[CuisinePrefs] No question returned, phase:', currentPhase);

      if (currentPhase === 'generating') {
        setPhase('generating');
        await handleGenerationPhase();
        setPhase('reviewing');
        const reviewQ = await orchestrator.selectNextQuestion();
        if (reviewQ) {
          orchestrator.addSnooMessage(reviewQ.snooMessage, 'idle');
          setMessages([...orchestrator.getMessages()]);
          setCurrentQuestion(reviewQ);
          orchestrator.state.currentQuestion = reviewQ;
        }
        setIsTyping(false);
        setIsProcessing(false); isProcessingRef.current = false;
        setSnooState('idle');
        setDebugLog([...orchestrator.getDebugLog()]);
        return;
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
        setIsProcessing(false); isProcessingRef.current = false;
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
            setIsProcessing(false); isProcessingRef.current = false;
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
        setIsProcessing(false); isProcessingRef.current = false;
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
        setIsProcessing(false); isProcessingRef.current = false;
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
          setIsProcessing(false); isProcessingRef.current = false;
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
        setIsProcessing(false); isProcessingRef.current = false;
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
          setIsProcessing(false); isProcessingRef.current = false;
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
        setIsProcessing(false); isProcessingRef.current = false;
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

        // Guard: check if enrichment→generating transition happened (all enrichment fields done)
        const postEnrichPhase = orchestrator.getPhase();
        if (postEnrichPhase === 'generating') {
          setPhase('generating');
          await handleGenerationPhase();
          setPhase('reviewing');
          const reviewQ = await orchestrator.selectNextQuestion();
          if (reviewQ) {
            orchestrator.addSnooMessage(reviewQ.snooMessage, 'idle');
            setMessages([...orchestrator.getMessages()]);
            setCurrentQuestion(reviewQ);
            orchestrator.state.currentQuestion = reviewQ;
          }
          setIsProcessing(false); isProcessingRef.current = false;
          setSnooState('idle');
          setDebugLog([...orchestrator.getDebugLog()]);
          return;
        }

        if (postEnrichmentQuestion) {
          orchestrator.addSnooMessage(postEnrichmentQuestion.snooMessage, 'idle');
          setMessages([...orchestrator.getMessages()]);
          setCurrentQuestion(postEnrichmentQuestion);
          orchestrator.state.currentQuestion = postEnrichmentQuestion;
        }

        setIsProcessing(false); isProcessingRef.current = false;
        setSnooState('idle');
        setDebugLog([...orchestrator.getDebugLog()]);
        return;
      } else if (currentPhase === 'generating') {
        await handleGenerationPhase();
        // After generation, show the itinerary review
        setPhase('reviewing');
        // Get the satisfaction question to show
        const satisfactionQuestion = await orchestrator.selectNextQuestion();
        if (satisfactionQuestion) {
          orchestrator.addSnooMessage(satisfactionQuestion.snooMessage, 'idle');
          setMessages([...orchestrator.getMessages()]);
          setCurrentQuestion(satisfactionQuestion);
          orchestrator.state.currentQuestion = satisfactionQuestion;
        }
        setIsTyping(false);
        setIsProcessing(false); isProcessingRef.current = false;
        setSnooState('idle');
        setDebugLog([...orchestrator.getDebugLog()]);
        return;
      } else if (currentPhase === 'gathering') {
        // Phase changed back to gathering (e.g., from dissatisfaction with hotels/dining)
        // Continue with the next question in the flow
        const gatherQuestion = await orchestrator.selectNextQuestion();
        if (gatherQuestion) {
          orchestrator.addSnooMessage(gatherQuestion.snooMessage, 'idle');
          setMessages([...orchestrator.getMessages()]);
          setCurrentQuestion(gatherQuestion);
          orchestrator.state.currentQuestion = gatherQuestion;
        }
        setIsTyping(false);
        setIsProcessing(false); isProcessingRef.current = false;
        setSnooState('idle');
        setDebugLog([...orchestrator.getDebugLog()]);
        return;
      } else if (currentPhase === 'satisfied') {
        // Conversation complete - show celebration and navigate to itinerary
        const celebrationMsg = await orchestrator.generateSnooMessage({ type: 'celebration' });
        orchestrator.addSnooMessage(celebrationMsg, 'celebrating');
        setMessages([...orchestrator.getMessages()]);
        setSnooState('celebrating');
        setPhase('satisfied');
        setIsProcessing(false); isProcessingRef.current = false;

        // Save trip data synchronously BEFORE the delay to prevent race conditions
        let savedTripId: string | null = null;
        try {
          savedTripId = finalizeQuickPlanTrip(orchestrator.getState());
          console.log('[QuickPlanChat] Trip saved successfully:', savedTripId);

          // Verify localStorage was written
          const stored = localStorage.getItem('wandercraft-trip-v2');
          if (!stored) {
            throw new Error('Trip data not saved to localStorage');
          }
        } catch (error) {
          console.error('[QuickPlanChat] Failed to finalize trip:', error);
          orchestrator.addSnooMessage(
            "Oops! Something went wrong saving your trip. Please try clicking the button again.",
            'idle'
          );
          setMessages([...orchestrator.getMessages()]);
          setSnooState('idle');
          setPhase('reviewing');
          return;
        }

        // Navigate after a short delay for celebration — only if state hasn't been reset
        if (navigationTimeoutRef.current) {
          clearTimeout(navigationTimeoutRef.current);
        }
        const tripIdForNav = savedTripId;
        navigationTimeoutRef.current = setTimeout(() => {
          // Guard: if user clicked "Start Over" during the delay, don't navigate
          if (orchestrator.getPhase() !== 'satisfied') {
            console.log('[QuickPlanChat] Navigation cancelled — state was reset');
            return;
          }
          window.location.href = `/plan/${tripIdForNav}`;
        }, 1500); // Give user time to see the celebration message
        return; // Don't continue processing - we're navigating away
      }
    } else if (currentPhase === 'reviewing') {
      const reviewQ = await orchestrator.selectNextQuestion();
      if (reviewQ) {
        orchestrator.addSnooMessage(reviewQ.snooMessage, 'idle');
        setMessages([...orchestrator.getMessages()]);
        setCurrentQuestion(reviewQ);
        orchestrator.state.currentQuestion = reviewQ;
      }
      setIsTyping(false);
      setIsProcessing(false); isProcessingRef.current = false;
      setSnooState('idle');
      setDebugLog([...orchestrator.getDebugLog()]);
      return;
    }

    if (nextQuestion) {
      // Add Snoo's next message
      orchestrator.addSnooMessage(nextQuestion.snooMessage, 'idle');
      setMessages([...orchestrator.getMessages()]);
      setCurrentQuestion(nextQuestion);
      orchestrator.state.currentQuestion = nextQuestion;
    }

    setIsTyping(false);
    setIsProcessing(false); isProcessingRef.current = false;
    setSnooState('idle');

    // Update debug info
    setDebugLog([...orchestrator.getDebugLog()]);
  }, [currentQuestion, isProcessing, orchestrator, phase]);

  // ============================================================================
  // ENRICHMENT PHASE
  // ============================================================================

  const handleEnrichmentPhase = async () => {
    setSnooState('thinking');
    setCurrentLoadingType('area'); // Set loading state for areas discovery

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

      // Use deduplicated fetch to prevent duplicate API calls
      const areasData = await dedupedPost<{
        areas?: any[];
        redditPostCount?: number;
        llmAreasCount?: number;
      }>('/api/quick-plan/discover-areas', {
        destination,
        preferences: prefs,
        subreddits: selectedSubreddits,
      }, { cacheTTL: 5 * 60 * 1000, timeout: 60000 }); // Cache for 5 mins, 60s timeout

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
          `I couldn't find specific areas for ${destination}. I'll continue building your trip without area-specific suggestions — you can always add neighborhoods later in the full planner. If you'd like to try a different destination, tap the **back** button.`,
          'idle'
        );
      }
      setMessages([...orchestrator.getMessages()]);
      setSnooState('celebrating');
      setCurrentLoadingType(null); // Clear loading state

    } catch (error: any) {
      console.error('[Enrichment] Failed:', error);
      console.error('[Enrichment] Error name:', error?.name);
      console.error('[Enrichment] Error message:', error?.message);
      console.error('[Enrichment] Error stack:', error?.stack);
      if (error?.data) {
        console.error('[Enrichment] Error data:', error.data);
      }
      const friendlyMessage = getUserFriendlyMessage(error);

      setEnrichmentStatus(prev => ({
        ...prev,
        reddit: 'error',
        areas: 'error',
      }));
      setCurrentLoadingType(null); // Clear loading state on error

      // Show a helpful message instead of failing silently
      orchestrator.addSnooMessage(
        `I had some trouble researching ${destination}, but let's continue with your trip planning. ${friendlyMessage}`,
        'concerned'
      );
      setMessages([...orchestrator.getMessages()]);
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

    // Set loading state for skeleton display
    setCurrentLoadingType('hotel');

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

      // Get preferences from state
      const accessibilityNeeds = state.preferences.accessibilityNeeds;
      const accommodationType = (state.preferences as any).accommodationType;
      const travelingWithPets = (state.preferences as any).travelingWithPets;
      const sustainabilityPreference = (state.preferences as any).sustainabilityPreference;

      // Use deduplicated fetch to prevent duplicate API calls on rapid clicks
      const data = await dedupedPost<{
        hotelsByArea?: Record<string, any[]>;
      }>('/api/quick-plan/hotels', {
        areaIds,
        destination,
        preferences: {
          budgetMin: budget?.min || 150,  // Default to store's initial budget
          budgetMax: budget?.max || 350,  // Default to store's initial budget
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
        children: state.preferences.children || 0,
        estimatedRooms: state.preferences.estimatedRoomsNeeded,
        // Pass all filtering preferences
        accessibilityNeeds,
        accommodationType,
        travelingWithPets,
        sustainabilityPreference,
      }, { cacheTTL: 3 * 60 * 1000, timeout: 45000 }); // Cache for 3 mins, 45s timeout

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
          `I couldn't find hotels matching your preferences in those areas. I'll continue building your itinerary without hotel picks — you can add accommodations later in the full planner.`,
          'concerned'
        );
        // Mark hotels as complete (skipped) so we don't get stuck
        orchestrator.setConfidence('hotels', 'partial');
      }
      setMessages([...orchestrator.getMessages()]);

      setEnrichmentStatus(prev => ({ ...prev, hotels: 'done' }));
      orchestrator.setEnrichmentStatus('hotels', 'done');
      setCurrentLoadingType(null); // Clear loading state
    } catch (error) {
      console.error('[Hotels] Fetch failed:', error);
      const friendlyMessage = getUserFriendlyMessage(error);

      // Check for specific error types
      const isTimeout = friendlyMessage.toLowerCase().includes('timeout') || friendlyMessage.toLowerCase().includes('took too long');
      const isNetworkError = friendlyMessage.toLowerCase().includes('connect') || friendlyMessage.toLowerCase().includes('network');
      const message = isTimeout
        ? `The hotel search took too long. Let's continue with the rest of your trip - you can always add hotels later.`
        : isNetworkError
          ? `Unable to connect to search for hotels. Please check your connection. Let's continue with the rest of your trip.`
          : `Having trouble finding hotels right now. Let's continue with the rest of your trip.`;

      orchestrator.addSnooMessage(message, 'concerned');
      orchestrator.setConfidence('hotels', 'partial');
      orchestrator.setEnrichmentStatus('hotels', 'error');
      setMessages([...orchestrator.getMessages()]);
      setEnrichmentStatus(prev => ({ ...prev, hotels: 'error' }));
      setCurrentLoadingType(null); // Clear loading state on error
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

    // Set loading state for skeleton display
    setCurrentLoadingType('restaurant');

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

      // Get dietary restrictions from state
      const dietaryRestrictions = (state.preferences as any).dietaryRestrictions || [];
      console.log('[Restaurants] Fetching restaurants for cuisines:', cuisineTypes, 'with hotels:', hotelsData, 'dietary:', dietaryRestrictions);

      // Use deduplicated fetch to prevent duplicate API calls on rapid clicks
      const data = await dedupedPost<{
        restaurantsByCuisine?: Record<string, any[]>;
      }>('/api/quick-plan/restaurants', {
        cuisineTypes,
        destination,
        hotels: hotelsData,
        areas: selectedAreas.map(a => ({
          id: a.id,
          name: a.name,
          centerLat: a.centerLat,
          centerLng: a.centerLng,
        })),
        dietaryRestrictions, // Pass dietary restrictions to API
      }, { cacheTTL: 5 * 60 * 1000, timeout: 45000 }); // Cache for 5 mins, 45s timeout

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

      setEnrichmentStatus(prev => ({ ...prev, restaurants: 'done' }));
      orchestrator.setEnrichmentStatus('restaurants', 'done');
      setCurrentLoadingType(null); // Clear loading state
    } catch (error) {
      console.error('[Restaurants] Fetch failed:', error);
      const friendlyMessage = getUserFriendlyMessage(error);

      // Check for specific error types
      const isRateLimit = friendlyMessage.toLowerCase().includes('too many') || friendlyMessage.toLowerCase().includes('rate limit');
      const isNetworkError = friendlyMessage.toLowerCase().includes('connect') || friendlyMessage.toLowerCase().includes('network');
      const message = isRateLimit
        ? `We're getting a lot of requests right now. Let's continue with your itinerary - you can browse restaurants later.`
        : isNetworkError
          ? `Unable to connect to search for restaurants. Please check your connection. Let's continue with your itinerary.`
          : `Having trouble finding restaurants right now. Let's continue with your itinerary.`;

      orchestrator.addSnooMessage(message, 'concerned');
      orchestrator.setEnrichmentStatus('restaurants', 'error');
      setMessages([...orchestrator.getMessages()]);
      setEnrichmentStatus(prev => ({ ...prev, restaurants: 'error' }));
      setCurrentLoadingType(null); // Clear loading state on error
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

    // Set loading state for skeleton display
    setCurrentLoadingType('experience');

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

      // Use deduplicated fetch to prevent duplicate API calls on rapid clicks
      const data = await dedupedPost<{
        experiencesByType?: Record<string, any[]>;
      }>('/api/quick-plan/experiences', {
        activityTypes,
        destination,
        hotels: hotelsData,
        areas: selectedAreas.map(a => ({
          id: a.id,
          name: a.name,
          centerLat: a.centerLat,
          centerLng: a.centerLng,
        })),
      }, { cacheTTL: 5 * 60 * 1000, timeout: 45000 }); // Cache for 5 mins, 45s timeout

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

      setEnrichmentStatus(prev => ({ ...prev, experiences: 'done' }));
      orchestrator.setEnrichmentStatus('experiences', 'done');
      setCurrentLoadingType(null); // Clear loading state
    } catch (error) {
      console.error('[Experiences] Fetch failed:', error);
      const friendlyMessage = getUserFriendlyMessage(error);

      // Check for specific error types
      const isTimeout = friendlyMessage.toLowerCase().includes('timeout') || friendlyMessage.toLowerCase().includes('took too long');
      const isNetworkError = friendlyMessage.toLowerCase().includes('connect') || friendlyMessage.toLowerCase().includes('network');
      const message = isTimeout
        ? `The experience search took too long. Let's continue with your itinerary - you can browse activities later.`
        : isNetworkError
          ? `Unable to connect to search for experiences. Please check your connection. Let's continue with your itinerary.`
          : `Having trouble finding experiences right now. Let's continue with your itinerary.`;

      orchestrator.addSnooMessage(message, 'concerned');
      orchestrator.setEnrichmentStatus('experiences', 'error');
      setMessages([...orchestrator.getMessages()]);
      setEnrichmentStatus(prev => ({ ...prev, experiences: 'error' }));
      setCurrentLoadingType(null); // Clear loading state on error
    }
  };

  // ============================================================================
  // GENERATION PHASE
  // ============================================================================

  const handleGenerationPhase = async () => {
    setSnooState('thinking');
    setCurrentLoadingType('itinerary'); // Set loading state for itinerary generation

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
      // Use deduplicated fetch to prevent duplicate API calls on rapid clicks
      const data = await dedupedPost<{
        itinerary?: any;
      }>('/api/quick-plan/generate-itinerary', {
        preferences: { ...prefs, selectedSplit: autoSplit },
        areas: state.discoveredData.areas,
        hotels: hotelsObj,
        restaurants: restaurantsObj,
      }, { cacheTTL: 2 * 60 * 1000, timeout: 90000 }); // Cache for 2 mins, 90s timeout for complex generation

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
    } catch (error) {
      console.error('[Generation] Itinerary generation error:', error);
      const friendlyMessage = getUserFriendlyMessage(error);

      // Check for specific error types
      const isRateLimit = friendlyMessage.toLowerCase().includes('too many') || friendlyMessage.toLowerCase().includes('rate limit');
      const isTimeout = friendlyMessage.toLowerCase().includes('timeout') || friendlyMessage.toLowerCase().includes('took too long');
      const isNetworkError = friendlyMessage.toLowerCase().includes('connect') || friendlyMessage.toLowerCase().includes('network');

      let message: string;
      if (isRateLimit) {
        message = "Our AI is a bit busy right now. Let me try a simpler approach to your itinerary.";
      } else if (isTimeout) {
        message = "The itinerary took longer than expected to generate. Let me simplify things a bit.";
      } else if (isNetworkError) {
        message = "Unable to connect to generate your itinerary. Please check your connection and try again.";
      } else {
        message = "Had some trouble generating the itinerary. Let me try a simpler approach.";
      }

      orchestrator.addSnooMessage(message, 'concerned');
    }

    setMessages([...orchestrator.getMessages()]);
    setSnooState('celebrating');
    setCurrentLoadingType(null); // Clear loading state

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
    <div className="flex items-center justify-center min-h-[calc(100vh-80px)] p-2 sm:p-4 md:p-6">
      {/* Centered chat frame - responsive width and height */}
      <div className="w-full max-w-2xl h-[calc(100vh-100px)] sm:h-[calc(100vh-120px)] max-h-[800px] bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
        {/* Chat header - responsive padding */}
        <div className="flex-shrink-0 px-3 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <SnooAgent state={snooState} size="sm" showLabel={false} />
              <div>
                <h2 className="font-semibold text-slate-900 dark:text-white text-sm">Snoo</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">Your AI travel buddy</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Progress indicator - FIX 4.12 */}
              <ProgressIndicatorCompact currentPhase={phase} className="hidden sm:flex" />
              {/* Start Over button - touch-friendly size */}
              <button
                onClick={handleStartOver}
                disabled={isProcessing}
                className="flex items-center justify-center gap-1.5 min-h-[44px] min-w-[44px] sm:min-w-0 px-2 sm:px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Start over from the beginning"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="hidden sm:inline">Start Over</span>
              </button>
            </div>
          </div>
          {/* Mobile progress indicator */}
          <div className="sm:hidden mt-2 pt-2 border-t border-slate-200 dark:border-slate-600">
            <ProgressIndicatorCompact currentPhase={phase} />
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
                onNavigate={() => {
                  if (navigationTimeoutRef.current) {
                    clearTimeout(navigationTimeoutRef.current);
                    navigationTimeoutRef.current = null;
                  }
                }}
              />
            </div>
          )}
        </div>

        {/* Reply card area - anchored at bottom, responsive padding */}
        <div className="flex-shrink-0 border-t border-slate-200 dark:border-slate-700 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-800/50 p-3 sm:p-5">
          <AnimatePresence mode="wait">
            {currentQuestion && !isProcessing && (
              <div ref={inputRef}>
                {/* FIX 4.2 & 4.3: Go Back and Skip buttons - touch-friendly */}
                <div className="flex items-center justify-between mb-2">
                  {canGoBack ? (
                    <button
                      onClick={handleGoBack}
                      className="flex items-center gap-1.5 min-h-[44px] px-2 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span className="hidden xs:inline">Go back</span>
                    </button>
                  ) : (
                    <div /> // Spacer
                  )}
                  {canSkip && (
                    <button
                      onClick={handleSkip}
                      className="flex items-center gap-1.5 min-h-[44px] px-2 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 transition-colors"
                    >
                      Skip
                      <SkipForward className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <ReplyCard
                  type={currentQuestion.inputType}
                  config={currentQuestion.inputConfig}
                  onSubmit={handleUserResponse}
                  onAddNote={handleAddNote}
                  disabled={isProcessing}
                />
              </div>
            )}
          </AnimatePresence>

          {/* Processing indicator with contextual loading */}
          {isProcessing && (
            <div className="py-4 space-y-3">
              {/* Main processing indicator */}
              <div className="flex items-center justify-center gap-3">
                <SnooAgent state={snooState} size="sm" showLabel={true} />
              </div>

              {/* Contextual loading card when fetching data */}
              {currentLoadingType && (
                <LoadingCard
                  type={currentLoadingType}
                  count={3}
                />
              )}
            </div>
          )}

          {/* Free text input toggle and form - responsive */}
          {!isProcessing && (
            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-200 dark:border-slate-700">
              {showFreeTextInput ? (
                <form onSubmit={handleFreeTextSubmit} className="space-y-2">
                  <div className="relative">
                    <input
                      type="text"
                      value={freeTextInput}
                      onChange={(e) => {
                        // Limit to 500 characters
                        if (e.target.value.length <= 500) {
                          setFreeTextInput(e.target.value);
                        }
                      }}
                      placeholder="Ask Snoo anything or add context..."
                      autoFocus
                      maxLength={500}
                      aria-label="Message to Snoo"
                      className={`w-full px-3 sm:px-4 py-3 sm:py-2 rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base sm:text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${
                        freeTextInput.length > 450
                          ? 'border-amber-400 focus:ring-amber-500'
                          : 'border-slate-300 dark:border-slate-600 focus:ring-orange-500'
                      }`}
                    />
                    {/* Character count - always visible */}
                    <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs transition-colors ${
                      freeTextInput.length > 450
                        ? 'text-amber-500'
                        : freeTextInput.length > 400
                        ? 'text-slate-500'
                        : 'text-slate-300 dark:text-slate-600'
                    }`}>
                      {freeTextInput.length}/500
                    </span>
                  </div>

                  {/* Validation hint */}
                  {freeTextInput.length > 450 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      {500 - freeTextInput.length} characters remaining
                    </p>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={!freeTextInput.trim()}
                      className="flex-1 sm:flex-none min-h-[44px] px-4 py-2 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      <span className="sm:hidden">Send</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowFreeTextInput(false);
                        setFreeTextInput('');
                      }}
                      className="min-h-[44px] px-3 py-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setShowFreeTextInput(true)}
                  className="flex items-center justify-center gap-2 min-h-[44px] py-2 px-3 sm:w-full sm:py-2.5 text-sm text-slate-500 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <MessageCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm font-medium hidden sm:inline">Ask Snoo a question or add context</span>
                </button>
              )}
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
    return value.trim() || 'Skipped';
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
        'plan': 'Help me find restaurants',
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
  onNavigate?: () => void;
}

function ItineraryPreview({ orchestratorState, onNavigate }: ItineraryPreviewProps) {
  const [isNavigating, setIsNavigating] = useState(false);
  const toast = useToast();

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
    // Cancel any auto-navigation timer to prevent double navigation
    onNavigate?.();
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
      toast.error(
        'Failed to create itinerary',
        'There was an error saving your trip. Please try again.'
      );
      setIsNavigating(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-lg shadow-slate-200/50 dark:shadow-none">
      {/* Header */}
      <div className="p-5 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-b border-slate-200 dark:border-slate-700">
        <h3 className="font-bold text-slate-900 dark:text-white text-xl">
          Your Trip to {preferences.destinationContext?.canonicalName || 'Your Destination'}
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5 font-medium">
          {days.length} days · {stops.length} {stops.length === 1 ? 'location' : 'locations'}
        </p>
      </div>

      {/* Stops summary */}
      <div className="p-5 border-b border-slate-200 dark:border-slate-700">
        <div className="flex flex-wrap gap-3">
          {stops.map((stop: any, idx: number) => (
            <div
              key={stop.areaId || idx}
              className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600 shadow-sm"
            >
              <span className="w-7 h-7 flex items-center justify-center bg-gradient-to-br from-orange-500 to-amber-500 text-white rounded-full text-sm font-bold shadow-sm">
                {idx + 1}
              </span>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white text-sm">
                  {stop.areaName || stop.area?.name || `Stop ${idx + 1}`}
                </p>
                <p className="text-xs text-slate-500 font-medium">{stop.nights} nights</p>
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
            className="p-5 border-b border-slate-100 dark:border-slate-700 last:border-b-0 hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors"
          >
            <div className="flex items-center gap-2.5 mb-3">
              <span className="px-2.5 py-1 bg-gradient-to-r from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 text-orange-700 dark:text-orange-400 rounded-lg text-xs font-bold">
                Day {day.dayNumber}
              </span>
              {day.date && (
                <span className="text-xs text-slate-500 font-medium">
                  {new Date(day.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>

            <div className="space-y-2.5 ml-1">
              {day.morning && (
                <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/30 transition-colors">
                  <span className="text-xs text-slate-400 dark:text-slate-400 w-16 font-semibold uppercase tracking-wide pt-0.5">Morning</span>
                  <p className="text-sm text-slate-700 dark:text-slate-300 flex-1 leading-relaxed">{day.morning.description || day.morning.activity}</p>
                </div>
              )}
              {day.afternoon && (
                <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/30 transition-colors">
                  <span className="text-xs text-slate-400 dark:text-slate-400 w-16 font-semibold uppercase tracking-wide pt-0.5">Afternoon</span>
                  <p className="text-sm text-slate-700 dark:text-slate-300 flex-1 leading-relaxed">{day.afternoon.description || day.afternoon.activity}</p>
                </div>
              )}
              {day.evening && (
                <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/30 transition-colors">
                  <span className="text-xs text-slate-400 dark:text-slate-400 w-16 font-semibold uppercase tracking-wide pt-0.5">Evening</span>
                  <p className="text-sm text-slate-700 dark:text-slate-300 flex-1 leading-relaxed">{day.evening.description || day.evening.activity}</p>
                </div>
              )}
              {!day.morning && !day.afternoon && !day.evening && (
                <p className="text-sm text-slate-500 italic p-2">Free day to explore</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer with action button */}
      <div className="p-5 bg-gradient-to-b from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-800 border-t border-slate-200 dark:border-slate-700">
        <button
          onClick={handleTakeToItinerary}
          disabled={isNavigating}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-lg hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 transform hover:scale-[1.01] active:scale-[0.99]"
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
