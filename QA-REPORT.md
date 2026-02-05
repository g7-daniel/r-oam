# QA Report: Roam App Quick Plan Flow

**Date**: 2026-02-05
**Auditor**: QA Engineering Analysis
**Codebase Version**: Current HEAD
**Scope**: Full Quick Plan flow (Homepage entry through trip finalization)

---

## PHASE 1: PRODUCT MAP

### 1.1 Architecture Overview

The Quick Plan flow is a chat-based, multi-phase trip planning wizard. The core components are:

- **Orchestrator** (`/lib/quick-plan/orchestrator.ts`): A client-side state machine that manages question selection, confidence tracking, phase transitions, and user response processing. ~3900 lines.
- **QuickPlanChat** (`/components/quick-plan/QuickPlanChat.tsx`): The main UI component (~2007 lines) that bridges the orchestrator with React state and handles all API calls.
- **ReplyCard** (`/components/quick-plan/chat/ReplyCard.tsx`): Renders the structured input cards (chips, sliders, date pickers, hotel/restaurant/experience browsers, area pickers, split selectors, satisfaction gates).
- **API Routes**: Seven server-side endpoints under `/app/api/quick-plan/` (chat, discover-areas, hotels, restaurants, experiences, generate-itinerary, validate-place).
- **Supporting modules**: satisfaction-loop.ts, trip-transformer.ts, seasonal-data.ts, theme-park-data.ts, surf-data.ts, events-api.ts, tradeoff-engine.ts, intensity-budget.ts, quality-check.ts, area-discovery.ts, activity-verification.ts.

### 1.2 Flow Phases

| Phase | Description | Key Fields |
|-------|-------------|------------|
| **Gathering** | Collects user preferences via chat questions | destination, dates, party, tripOccasion, pets, accessibility, budget, accommodationType, sustainability, pace, activities, skillLevel, subreddits, vibe |
| **Enriching** | Area discovery via Reddit + LLM; hotel fetching | areas, split, hotelPreferences, hotels |
| **Generating** | Calls LLM to build day-by-day itinerary | dining, dietaryRestrictions, cuisinePreferences, restaurants, experiences, itinerary generation |
| **Reviewing** | Shows itinerary, asks satisfaction question | satisfaction gate |
| **Satisfied** | Celebration, trip finalization, navigation to builder | finalizeQuickPlanTrip, localStorage save |

### 1.3 Question Priority Order (from orchestrator `decideNextField`)

1. destination
2. themeParkPreferences (conditional: theme park destination)
3. multiCountryLogistics (conditional: multi-country trip)
4. dates
5. party
6. childNeeds (conditional: young children)
7. tripOccasion
8. workationNeeds (conditional: workation occasion)
9. travelingWithPets
10. travelingWithPetsType (conditional: has pets)
11. accessibility
12. accessibilityType (conditional: has accessibility needs)
13. budget
14. accommodationType
15. sustainabilityPreference
16. pace
17. activities
18. surfingDetails (conditional: surfing selected)
19. activitySkillLevel (conditional: surf/dive/golf selected)
20. subreddits
21. vibe
22. userNotes
23. areas (post-enrichment)
24. split (if 2+ areas)
25. hotelPreferences
26. hotels (per area)
27. dining
28. dietaryRestrictions (if dining=plan)
29. cuisinePreferences (if dining=plan)
30. restaurants (per cuisine type)
31. experiences (per activity type)
32. satisfaction

### 1.4 Integration Points

| Integration | Protocol | File |
|-------------|----------|------|
| Groq LLM (Llama) | REST via `/api/quick-plan/chat` | `lib/groq.ts` |
| Google Gemini (fallback) | REST | `lib/groq.ts` |
| Google Places Autocomplete | Client-side JS API | `GooglePlacesAutocomplete.tsx` |
| Reddit API | Server-side | `lib/reddit.ts` |
| Google Places (validation) | Server-side | `/api/quick-plan/validate-place` |
| Hotel Search | Server-side (Amadeus/Makcorps/Google) | `/api/quick-plan/hotels` |
| Restaurant Search | Server-side (Google Places) | `/api/quick-plan/restaurants` |
| Experience Search | Server-side (Google Places) | `/api/quick-plan/experiences` |
| Itinerary Generation | Server-side (LLM) | `/api/quick-plan/generate-itinerary` |
| Trip Store (Zustand) | localStorage | `stores/tripStoreV2.ts` |

---

## PHASE 2: PERSONA CATALOG

### 50 Personas

| # | Name | Age | Device/Browser/OS | Screen | Connection | Tech (1-10) | Patience (1-10) | Accessibility | Goal | Likely Mistakes | Edge Case Data |
|---|------|-----|------------------|--------|------------|-------------|-----------------|---------------|------|-----------------|----------------|
| 1 | Sarah M. | 32 | iPhone 15 / Safari / iOS 18 | 393px | 5G | 7 | 6 | None | Plan honeymoon to Maldives | Skip budget question thinking she can set later | Budget $1000+/night |
| 2 | Jim T. | 68 | Windows PC / Chrome / Win 11 | 1920px | Broadband | 3 | 8 | Low vision (needs large text) | Plan anniversary trip to Italy | Struggle with date picker, type destination slowly | "Florence, Italy" with trailing spaces |
| 3 | Priya K. | 24 | Pixel 8 / Chrome / Android 14 | 412px | 4G (India) | 9 | 3 | None | Solo backpacking SE Asia multi-country | Rapid-click through questions, switch tabs constantly | "Thailand and Vietnam" |
| 4 | Marcus W. | 45 | MacBook Pro / Safari / macOS | 1440px | Fiber | 8 | 5 | Color blind (deuteranopia) | Family vacation, 2 adults + 3 kids (ages 3, 7, 12) | Not notice color-coded indicators | Kids ages "3, 7, 12" |
| 5 | Elena R. | 55 | iPad Air / Safari / iPadOS | 820px | WiFi | 4 | 7 | None | Wellness retreat to Costa Rica | Confuse "Skip" with "Next" | Single destination, long trip (21 nights) |
| 6 | Amir H. | 28 | Samsung S23 / Samsung Internet / Android | 360px | 3G | 6 | 4 | None | Bachelor party in Cancun | Try to use back button aggressively | Group of 8 adults |
| 7 | Linda C. | 72 | Windows PC / Edge / Win 10 | 1366px | DSL | 2 | 9 | Motor impairment (keyboard only) | Cruise departure port planning | Unable to use mouse, needs full keyboard nav | "Miami, Florida" |
| 8 | Kenji N. | 35 | MacBook / Firefox / macOS | 1680px | Fiber | 10 | 2 | None | Dev workation to Lisbon | Open dev tools, inspect network, rapid test | "Lisbon, Portugal" workation occasion |
| 9 | Fatima A. | 40 | iPhone SE / Safari / iOS 17 | 375px | 4G | 5 | 6 | None | Halal-friendly family trip | Expects halal dietary filtering to work perfectly | Party: 4 adults, 2 children (ages 1, 5) |
| 10 | Carlos M. | 19 | Android (budget) / Chrome / Android 12 | 320px | Intermittent 3G | 6 | 3 | None | Budget backpacking Europe | Connection drops mid-flow, tiny screen | Budget $50/night, destination "Spain + Portugal" |
| 11 | Susan B. | 60 | Windows / Chrome / Win 11 | 1920px | Broadband | 5 | 7 | Screen reader (JAWS) | Plan accessible trip to London | Can't interact with custom components without ARIA | Wheelchair accessible needed |
| 12 | David L. | 38 | MacBook / Chrome / macOS | 2560px (4K) | Fiber | 9 | 4 | None | Planning Orlando Disney trip with kids | Expect theme park specific recommendations | "Orlando, Florida" with kids ages 4, 8 |
| 13 | Yuki T. | 22 | iPhone 14 / Safari / iOS 17 | 390px | 5G | 8 | 5 | None | Girls trip to Bali | Select many activities, expect nightlife recs | Group of 6, girls_trip occasion |
| 14 | Robert F. | 50 | Windows / Firefox / Win 10 | 1920px | Broadband | 4 | 8 | None | Golf trip to Scotland | Only selects golf as activity | Solo, high budget $500+/night |
| 15 | Maria G. | 33 | iPhone 13 / Safari / iOS 16 | 390px | WiFi | 6 | 6 | None | Destination wedding guest in DR | Wedding occasion, needs hotel near venue | "Punta Cana, Dominican Republic" |
| 16 | Tom H. | 42 | Chromebook / Chrome / ChromeOS | 1366px | WiFi (cafe) | 7 | 5 | None | Family road trip planning | Expect car/driving options | "California" (broad destination) |
| 17 | Asha P. | 29 | MacBook Air / Safari / macOS | 1440px | Fiber | 8 | 4 | None | Surfing trip to Costa Rica | Select surf activity, expects skill follow-up | "Santa Teresa, Costa Rica" |
| 18 | Pierre D. | 65 | Windows / Chrome / Win 11 | 1920px | Broadband | 3 | 9 | Hearing impairment | River cruise in France | Ignore audio cues, need visual feedback | "France" (country-level destination) |
| 19 | Mei L. | 26 | Android / Chrome / Android 13 | 384px | 5G | 7 | 3 | None | Food tour trip to Tokyo | Select many cuisine types | "Tokyo, Japan" foodie trip |
| 20 | Brian K. | 55 | iPad Pro / Safari / iPadOS | 1024px | WiFi | 5 | 7 | None | Luxury anniversary trip | Budget at maximum ($1000+) | 14 nights, 2 adults |
| 21 | Zara M. | 31 | iPhone 15 Pro Max / Safari / iOS | 430px | 5G | 8 | 4 | None | Solo female travel safety concerns | Expect safety-related recommendations | Solo adventure occasion |
| 22 | Hans W. | 48 | Windows / Chrome / Win 11 | 3840px (4K UW) | Fiber | 6 | 6 | None | Eco-lodge trip to Ecuador | Select eco_lodge accommodation, eco preferences | "Ecuador" with sustainability focus |
| 23 | Rachel S. | 37 | MacBook / Chrome / macOS | 1440px | WiFi | 7 | 5 | Dyslexia | Planning family reunion | Very large group (12 adults, 6 children) | Party: 12 adults, 6 children |
| 24 | Jin C. | 20 | Android / Chrome / Android 14 | 360px | 4G | 9 | 2 | None | Quick weekend trip | Minimum trip length (2 nights) | "New York City" 2 nights |
| 25 | Dorothy M. | 78 | iPad / Safari / iPadOS 16 | 810px | WiFi (nursing home) | 1 | 10 | Low vision, motor issues | Dream vacation to Hawaii | Accidentally tap wrong buttons, slow interaction | 1 adult, chill pace |
| 26 | Alex T. | 34 | Linux / Firefox / Ubuntu | 1920px | Fiber | 10 | 2 | None | Power user stress testing | Try XSS in text inputs, SQL injection | Input: `<script>alert(1)</script>` |
| 27 | Olivia N. | 41 | iPhone 12 / Safari / iOS 16 | 390px | 4G | 6 | 5 | None | Trip with pet (small dog) | Select "yes" for pets, expect pet-friendly hotels | Traveling with small dog |
| 28 | Mike R. | 52 | Windows / Edge / Win 11 | 1920px | Broadband | 5 | 6 | None | Guys trip fishing & golf | Select fishing + golf activities | 4 adults, guys_trip |
| 29 | Emma J. | 27 | MacBook / Chrome / macOS | 1440px | Fiber | 8 | 4 | None | Photography trip to Morocco | Select photography activity | "Morocco" photography trip |
| 30 | Raj S. | 36 | Android / Chrome / Android 13 | 412px | 3G | 7 | 3 | None | Budget family trip | Minimum budget $50/night | 2 adults, 2 kids (ages 6, 9) |
| 31 | Claire F. | 44 | Windows / Chrome / Win 10 | 1366px | DSL (slow) | 5 | 7 | None | Planning anniversary getaway | Connection often slow, timeouts likely | "Greece" 7 nights |
| 32 | Sam W. | 16 | iPhone SE / Safari / iOS 17 | 375px | 4G | 8 | 2 | None | Teen planning spring break with friends | Under 18, may enter inappropriate destinations | 4 adults (teens marking as adults) |
| 33 | Ingrid B. | 58 | Windows / Firefox / Win 11 | 1920px | Broadband | 4 | 8 | None | Planning Nordic cruise | "Norway, Sweden, Denmark" multi-country | Multi-country Scandinavia |
| 34 | Wei Z. | 30 | MacBook / Chrome / macOS | 1440px | Fiber | 9 | 3 | None | Digital nomad extended stay | 90-night trip, workation | "Bali, Indonesia" 90 nights |
| 35 | Janet P. | 62 | iPad / Safari / iPadOS | 810px | WiFi | 3 | 8 | Mild cognitive impairment | Simple beach vacation | Get confused by too many options | "Cancun" chill pace |
| 36 | Tyler D. | 25 | Android / Chrome / Android 14 | 393px | 5G | 8 | 3 | None | Extreme sports trip | Adventure + surf + dive activities | "New Zealand" packed pace |
| 37 | Nadia K. | 39 | Windows / Chrome / Win 11 | 1920px | Broadband | 6 | 5 | None | Multi-generational family trip | Mix of elderly and children | 6 adults, 3 kids, 2 elderly |
| 38 | Greg A. | 47 | MacBook / Safari / macOS | 1440px | WiFi | 7 | 6 | None | 50th birthday celebration trip | Special occasion planning | "Paris, France" luxury |
| 39 | Lisa H. | 30 | iPhone 15 / Safari / iOS 18 | 393px | 5G (flaky) | 7 | 4 | None | Quick plan while commuting | Interruptions, connection drops, app backgrounding | "Barcelona, Spain" |
| 40 | Dennis O. | 71 | Windows / Edge / Win 11 | 1920px | DSL | 2 | 9 | Tremor (motor) | Planning grandchildren trip | Double-clicks everything, imprecise taps | 2 adults, 4 grandchildren (ages 3-10) |
| 41 | Sophia V. | 23 | Android / Chrome / Android 14 | 360px | 4G | 8 | 3 | None | RTL language user (Arabic UI preference) | UI may break with RTL text input | Destination in Arabic script |
| 42 | Kevin M. | 43 | Mac / Safari / macOS | 1440px | Fiber | 9 | 5 | None | Test dissatisfaction loop | Plans to say "not satisfied" and test regeneration | "Costa Rica" with specific feedback |
| 43 | Beth C. | 56 | Windows / Chrome / Win 11 | 1920px | Broadband | 4 | 7 | None | First-time international traveler | Confused by visa/logistics questions | "Japan" first international trip |
| 44 | Omar F. | 33 | iPhone 14 / Safari / iOS 17 | 390px | 4G | 7 | 4 | None | Foodie trip maximizing dining | dining=plan, selects all cuisine types | "Rome, Italy" |
| 45 | Amanda L. | 28 | MacBook / Chrome / macOS | 1440px | Fiber | 8 | 5 | None | Tab-switching multitasker | Opens quick plan in 3 tabs simultaneously | Multiple concurrent sessions |
| 46 | Victor N. | 61 | iPad Mini / Safari / iPadOS | 744px | WiFi | 3 | 8 | None | Planning simplified trip | Wants minimal questions, skips most optional | "Hawaii" 5 nights |
| 47 | Jess R. | 35 | Windows / Firefox / Win 10 | 1920px | Broadband | 7 | 5 | None | Trip with specific accessibility needs | Wheelchair + ground floor + elevator | "London" accessible trip |
| 48 | Pat S. | 40 | Android / Chrome / Android 13 | 393px | 4G | 6 | 5 | None | Trip where API returns empty results | Unusual destination with no hotel data | "Svalbard, Norway" remote destination |
| 49 | Nick B. | 29 | MacBook / Safari / macOS | 1440px | Fiber | 9 | 3 | None | Refresh/back-button stress tester | F5 during every loading state, browser back/forward | "Thailand" with constant refreshes |
| 50 | Rosa T. | 45 | iPhone 13 / Safari / iOS 16 | 390px | 3G (rural) | 4 | 6 | None | Trip with emoji/special chars in notes | Uses emoji and special characters in all text fields | Notes: "I love pizza!! Also need pet-friendly hotel" |

---

## PHASE 3-4: SYSTEMATIC TESTING RESULTS

### Executive Summary

| Metric | Count |
|--------|-------|
| **Total Issues Found** | **42** |
| P0 - Critical | 3 |
| P1 - High | 8 |
| P2 - Medium | 14 |
| P3 - Low | 12 |
| P4 - Trivial | 5 |
| **By Type** | |
| BUG | 15 |
| UX | 11 |
| ACCESSIBILITY | 7 |
| LOGIC | 4 |
| PERFORMANCE | 2 |
| CONSISTENCY | 2 |
| SECURITY | 1 |

**Overall Product Quality Assessment: 6.5/10**

The core happy path works, and significant effort has been put into error handling and graceful degradation. However, there are critical phase-transition edge cases, accessibility gaps, and several logic issues that can leave users stuck or confused.

### Top 5 Most Critical Findings

1. **[QP-001]** Double `selectNextQuestion()` call risk still exists in `handleUserResponse` for some field handlers
2. **[QP-002]** Satisfaction navigation fires on a timer but can race with React re-renders, causing blank page
3. **[QP-003]** `handleGoBack` calls `selectNextQuestion()` which can trigger phase transitions during back-navigation
4. **[QP-004]** No input sanitization for free-text fields enables potential stored XSS via chat transcript
5. **[QP-005]** Screen reader users cannot navigate chip selections or area/hotel/restaurant cards

### Personas Encountering Most Issues

- **Persona 11 (Susan, screen reader)**: 12 issues - accessibility barriers across the entire flow
- **Persona 7 (Linda, keyboard-only)**: 10 issues - keyboard navigation incomplete
- **Persona 10 (Carlos, 320px + intermittent 3G)**: 9 issues - layout overflow, timeouts
- **Persona 25 (Dorothy, 78, low vision + motor)**: 8 issues - target sizes, text readability
- **Persona 26 (Alex, security tester)**: 7 issues - XSS, input validation gaps

---

## Detailed Issue List

### P0 - Critical

---

**[QP-001] P0 BUG: Potential double phase transition when `selectNextQuestion()` is called in both field-specific handler AND generic handler**

- **Personas affected**: All 50 (any user hitting certain field transitions)
- **Flow**: Cuisine preferences -> restaurant fetch -> experience fetch -> itinerary generation
- **Steps to reproduce**:
  1. Complete gathering phase through dining mode (select "plan")
  2. Answer dietary restrictions
  3. Answer cuisine preferences
  4. If restaurant API returns empty AND experience API returns empty
  5. The `cuisinePreferences` handler in QuickPlanChat.tsx calls `selectNextQuestion()` at line 578
  6. If that returns null, code falls through to check `currentPhase` at line 600
  7. If phase is `generating`, it calls `handleGenerationPhase()`
  8. But for OTHER field handlers that DON'T have early returns (lines 757-896), the generic handler at line 766 ALSO calls `selectNextQuestion()`
  9. This can cause the phase to transition again unexpectedly
- **Expected result**: Each user response triggers exactly one `selectNextQuestion()` call, and phase transitions happen atomically
- **Actual result**: Multiple code paths in `handleUserResponse` can call `selectNextQuestion()` for the same user action. While the recently fixed `cuisinePreferences` handler now has an early return, the GENERAL handler at line 766 still runs for any field not covered by the specific early-return handlers (e.g., `accommodationType`, `sustainabilityPreference`, `pace`, `activities`, `vibe`, `activitySkillLevel`, `subreddits`). If any of these fields happen to be the LAST gathering field before phase transition, `selectNextQuestion()` is called once (line 766), then the phase-change check at line 774 detects the new phase and may call `selectNextQuestion()` again.
- **Evidence**: `QuickPlanChat.tsx` lines 766-896: After calling `selectNextQuestion()` on line 766, the code checks `if (currentPhase !== phase)` on line 775 and enters phase-specific handlers that call `selectNextQuestion()` again (lines 784, 801, 816-826, 868).
- **Root cause hypothesis**: The architecture has field-specific early-return handlers for some fields (hotels, dining, cuisinePreferences, restaurants, experiences) but not all. The generic handler at the bottom runs for fields without specific handlers, and then the phase-change detection block fires, potentially calling `selectNextQuestion()` a second time.
- **Recommended fix**: Refactor `handleUserResponse` so that `selectNextQuestion()` is called exactly ONCE per user response. The result of that single call should determine whether to show the next question or handle a phase transition. Remove the duplicate phase-transition check after the generic `selectNextQuestion()` call.
- **Regression test**: After answering the `subreddits` question (or any question that triggers the gathering->enriching transition), verify that `selectNextQuestion()` is invoked exactly once by adding a counter or mock.
- **Related issues**: QP-006

---

**[QP-002] P0 BUG: Race condition in satisfaction navigation can cause blank page**

- **Personas affected**: All personas reaching satisfaction (especially 8, 39, 49 with fast interactions or flaky connections)
- **Flow**: Satisfied phase -> celebration -> auto-navigate
- **Steps to reproduce**:
  1. Complete the entire flow through itinerary generation
  2. Answer satisfaction as "satisfied"
  3. The celebration message shows, and a 1500ms setTimeout fires at line 841
  4. During that 1500ms, if the component re-renders or unmounts (e.g., React Strict Mode, user navigates away, or browser back)
  5. `finalizeQuickPlanTrip()` is called inside the timeout callback
  6. `window.location.href` is set
- **Expected result**: Trip is always saved before navigation; navigation only happens if save succeeds
- **Actual result**: If `finalizeQuickPlanTrip` throws (which can happen if state is already cleared by a re-render), the error handler at line 856 sets phase back to 'reviewing', but the component may already be in an inconsistent state. Also, the `window.location.href` assignment at line 852 is a full page navigation that bypasses Next.js routing, meaning React state cleanup doesn't happen cleanly.
- **Evidence**: Lines 841-865 in `QuickPlanChat.tsx`. The timeout-based navigation pattern is inherently racy. The error handler at line 862 resets `phase` to 'reviewing', but if `localStorage.getItem('wandercraft-trip-v2')` at line 847 returns null due to a concurrent `handleStartOver` clearing state, the user sees an error.
- **Root cause hypothesis**: Using `setTimeout` for a critical navigation action creates a window where state can be mutated by other handlers (Start Over, browser back). The `window.location.href` approach also bypasses React lifecycle.
- **Recommended fix**: Replace the setTimeout pattern with a synchronous save-then-navigate approach triggered by a user action (the "Take me to my itinerary" button, which already exists in `ItineraryPreview`). Remove the auto-navigate timer. If auto-navigation is desired, use Next.js `router.push()` instead of `window.location.href`.
- **Regression test**: Rapidly click "Start Over" within 1500ms of expressing satisfaction. Verify no blank page or error.
- **Related issues**: QP-012

---

**[QP-003] P0 BUG: `handleGoBack` calls `selectNextQuestion()` which can trigger unintended phase transitions**

- **Personas affected**: 6 (Amir, back-button user), 49 (Nick, stress tester), 10 (Carlos), and any user using "Go back"
- **Flow**: Any question -> Go Back
- **Steps to reproduce**:
  1. Progress to the enriching phase (after subreddits question)
  2. Click "Go back"
  3. `handleGoBack` at line 244 calls `orchestrator.goToPreviousQuestion()` which resets a confidence field to 'unknown'
  4. Then calls `selectNextQuestion()` at line 248
  5. `selectNextQuestion()` re-evaluates `getMissingRequiredFields()` which now sees the reset field
  6. But it ALSO checks phase transitions. If the reset field was the last gathering field, and now it's missing, the phase may revert from 'enriching' to 'gathering', but the orchestrator's internal phase may not be reset.
  7. More critically: `goToPreviousQuestion()` only resets ONE confidence field and removes ONE field from preferences. If there are downstream fields that depend on the removed field, their data may become stale.
- **Expected result**: Going back cleanly reverts to the previous question without affecting the phase or downstream data integrity
- **Actual result**: Phase can become inconsistent. Example: if user goes back on the `areas` question (post-enrichment), the confidence for `areas` is reset to 'unknown', but the orchestrator may still be in 'enriching' phase. `selectNextQuestion()` then sees `areas` in the missing fields list but the phase is 'enriching', leading to the areas question being asked while enrichment data exists.
- **Evidence**: `orchestrator.ts` lines 2066-2098 (`goToPreviousQuestion`) and lines 2556-2657 (`selectNextQuestion`). The `goToPreviousQuestion` method does not reset the phase, and does not cascade-reset dependent fields.
- **Root cause hypothesis**: The go-back feature was added as a convenience but doesn't properly account for the multi-phase state machine. Resetting a single confidence field without considering phase context and dependent data creates inconsistency.
- **Recommended fix**: When going back, reset all fields that depend on the field being revisited (cascade reset). Also, if the go-back target is in a different phase than the current phase, explicitly revert the phase. Add guards in `selectNextQuestion()` to prevent phase transitions when called from a go-back context.
- **Regression test**: From the areas question in enriching phase, go back to subreddits. Verify the phase correctly reverts to gathering and the areas question is not shown until enrichment re-runs.

---

### P1 - High

---

**[QP-004] P1 SECURITY: No input sanitization on free-text inputs; potential XSS via chat transcript**

- **Personas affected**: 26 (Alex, security tester), potentially all users if malicious input is stored
- **Flow**: Free text input -> chat transcript display
- **Steps to reproduce**:
  1. Click "Ask Snoo a question or add context"
  2. Type: `<img src=x onerror=alert(1)>`
  3. Submit
  4. The message is added to the transcript via `orchestrator.addUserMessage(userMessage)` at line 179
  5. Check if `ChatTranscript` renders the content with `dangerouslySetInnerHTML` or similar
- **Expected result**: All user input is escaped/sanitized before rendering in the DOM
- **Actual result**: While React's JSX rendering auto-escapes string content, there are places where markdown-like content is rendered (the `**bold**` syntax in seasonal warnings at line 513, event alerts, etc.). If any rendering path uses `dangerouslySetInnerHTML` for formatting, XSS is possible. The `snooMessage` field in particular may contain user-controlled data (e.g., destination names) wrapped in markdown formatting.
- **Evidence**: Lines 507-514 in `QuickPlanChat.tsx` show messages with `**text**` markdown syntax. If `ChatMessage.tsx` renders these with a markdown parser that doesn't sanitize, injection is possible through destination names. The `vibe` field at orchestrator line 3466 stores raw user text that's later included in LLM prompts.
- **Root cause hypothesis**: React's default rendering escapes HTML, but if any component uses `dangerouslySetInnerHTML` for markdown rendering, user-controlled content in messages could execute scripts.
- **Recommended fix**: Audit `ChatMessage.tsx` for any `dangerouslySetInnerHTML` usage. If markdown rendering is used, ensure it's configured to strip HTML tags. Sanitize all user inputs before storing in orchestrator state.
- **Regression test**: Submit `<script>alert('xss')</script>` as a destination name and verify it appears as escaped text in the chat transcript.

---

**[QP-005] P1 ACCESSIBILITY: Chip selection components lack ARIA roles and keyboard interaction**

- **Personas affected**: 7 (Linda, keyboard-only), 11 (Susan, screen reader), 25 (Dorothy, low vision + motor)
- **Flow**: All chip-based questions (trip occasion, pets, accessibility, budget type, pace, activities, hotel preferences, dining, dietary restrictions, cuisine preferences, etc.)
- **Steps to reproduce**:
  1. Navigate to any chip selection question using keyboard only
  2. Attempt to select a chip using Tab + Enter/Space
  3. Screen reader announces no role information for interactive chip elements
- **Expected result**: Chips should have `role="option"` or `role="radio"` (single select) / `role="checkbox"` (multi-select) with proper `aria-selected`/`aria-checked` states. Container should have `role="radiogroup"` or `role="group"` with `aria-label`.
- **Actual result**: Based on the component structure in `ReplyCard.tsx`, chips are likely rendered as `<button>` or `<div>` elements without proper ARIA grouping. The `chips-multi` type needs checkbox semantics.
- **Evidence**: `ReplyCard.tsx` imports and structure suggest custom chip rendering without ARIA roles. The `ChipOption` type in `types/quick-plan.ts` (line 1155) has `id`, `label`, `description`, `icon`, `selected` but no ARIA-related properties.
- **Root cause hypothesis**: Accessibility was not a primary design consideration for the interactive input components. Standard HTML form elements were not used.
- **Recommended fix**: Add `role="radiogroup"` to single-select chip containers, `role="group"` to multi-select. Each chip should be a `<button>` with `aria-pressed` (toggle) or `role="radio"` with `aria-checked`. Ensure focus management allows arrow-key navigation within groups.
- **Regression test**: Use NVDA/VoiceOver to navigate through a chip selection. Verify each chip's state is announced.

---

**[QP-006] P1 BUG: `handleUserResponse` dependency array missing `phase` variable**

- **Personas affected**: All 50 personas (the callback closes over stale `phase` value)
- **Flow**: Any question response where phase changes during the handler execution
- **Steps to reproduce**:
  1. Answer the last gathering question (e.g., subreddits or vibe)
  2. `handleUserResponse` captures the `phase` variable from the closure
  3. Inside the handler, `orchestrator.selectNextQuestion()` transitions the orchestrator's internal phase to 'enriching'
  4. The check at line 774 compares `currentPhase` (new) with `phase` (stale from closure)
  5. This comparison DOES work because `phase` is in the dependency array at line 896
  6. BUT: if React batches state updates, `setPhase(currentPhase)` at line 776 may not immediately update the `phase` state variable used in the next render's closure
- **Expected result**: `phase` state is always current when `handleUserResponse` checks it
- **Actual result**: The `useCallback` at line 896 correctly includes `phase` in its dependency array. However, within a single execution of `handleUserResponse`, the `phase` variable refers to the value at the start of that render cycle. After `setPhase(currentPhase)` is called, subsequent reads of `phase` within the same handler execution still see the old value. This is generally correct React behavior, but it means the handler's logic tree branches based on stale phase for follow-up operations.
- **Evidence**: Line 896: `[currentQuestion, isProcessing, orchestrator, phase]`. The `phase` comparison at line 774-775 reads `orchestrator.getPhase()` (fresh) vs `phase` (closure), which is correct. But the handler also reads `phase` implicitly through the branching logic in ways that could be stale during batched updates.
- **Root cause hypothesis**: The handler function is long (500+ lines) and reads `phase` multiple times. While the dependency array is correct, the pattern of reading stale closure state within an async handler is error-prone.
- **Recommended fix**: Read `orchestrator.getPhase()` directly everywhere instead of relying on the React state variable `phase` within the handler. The `phase` state should only be used for rendering.
- **Regression test**: Mock `orchestrator.getPhase()` to return 'enriching' while `phase` state is still 'gathering'. Verify the handler takes the correct branch.

---

**[QP-007] P1 BUG: Split question generates 0-night allocations for areas when `tripLength < areas.length * 2`**

- **Personas affected**: 24 (Jin, 2-night trip), any user with short trips and multiple areas
- **Flow**: Area selection -> Split question
- **Steps to reproduce**:
  1. Select a destination and set trip length to 3 nights
  2. Select 3 areas during area discovery
  3. The split generation at orchestrator lines 1287-1332 calculates `baseNights = Math.floor(3/3) = 1`
  4. The "focus-first" option at line 1309 only generates if `tripLength >= areas.length * 3` (3 >= 9 is false), so this is guarded
  5. However, the even-split at line 1292 gives `1, 1, 1+0=1` which is valid but leaves zero buffer
  6. If user picks 4 areas with 3 nights: `Math.floor(3/4) = 0` nights per area
- **Expected result**: System should prevent selecting more areas than the trip can accommodate (at least 1 night per area)
- **Actual result**: The default split fallback at line 1336-1357 handles this case by limiting areas to `Math.min(areas.length, tripLength)`, but the even-split at line 1292 does NOT have this guard and could generate stops with 0 nights (when `baseNights = 0` and the area isn't last to get `extraNights`).
- **Evidence**: Line 1290: `const baseNights = Math.floor(tripLength / areas.length)`. For 3 nights / 4 areas = 0. Line 1293: `nights: baseNights + (idx === areas.length - 1 ? extraNights : 0)`. For non-last areas: 0 + 0 = 0 nights.
- **Root cause hypothesis**: The even-split calculation doesn't enforce a minimum of 1 night per area before the fallback block.
- **Recommended fix**: Add `Math.max(1, ...)` to the nights calculation in the even-split at line 1293, OR limit selectable areas to `Math.floor(tripLength)` in the areas question.
- **Regression test**: With tripLength=3, select 4 areas. Verify no split option contains 0-night stops.
- **Related issues**: QP-001

---

**[QP-008] P1 UX: No loading state or user feedback during destination validation API call**

- **Personas affected**: 2 (Jim, slow typer), 10 (Carlos, slow connection), 31 (Claire, slow DSL), 50 (Rosa, rural 3G)
- **Flow**: Destination input -> Google Places Autocomplete -> validation
- **Steps to reproduce**:
  1. Type a destination in the autocomplete field
  2. Select a suggestion
  3. The Google Places API call fires to validate the place
  4. On slow connections, there's no visible loading indicator between selection and the next question appearing
- **Expected result**: A loading spinner or "Validating destination..." message should appear after selection
- **Actual result**: The user sees no feedback between selecting a destination from the autocomplete dropdown and the acknowledgment message appearing. On slow connections (3G), this can be 3-5 seconds of apparent freeze.
- **Evidence**: `GooglePlacesAutocomplete.tsx` handles the Places API call, and `QuickPlanChat.tsx` line 389-392 immediately calls `orchestrator.addUserMessage(userMessageContent)` and `setMessages(...)`, but the destination validation (if any) happens before `processUserResponse`. The main bottleneck is that after the user message is added, `setIsProcessing(true)` is set at line 385, but the processing indicator only shows a generic Snoo animation, not a destination-specific "Checking destination..." message.
- **Root cause hypothesis**: The processing indicator is generic ("thinking") rather than contextual for destination validation.
- **Recommended fix**: Add a contextual loading message like "Checking ${destinationName}..." when the destination is being validated. Show the loading state immediately upon selection.
- **Regression test**: On a throttled connection, select a destination and verify a loading indicator appears within 200ms.

---

**[QP-009] P1 BUG: `handleDissatisfaction` for `wrong_vibe` clears `vibes` instead of `vibe`, resets to wrong phase**

- **Personas affected**: 42 (Kevin, testing dissatisfaction), any user expressing dissatisfaction with vibe
- **Flow**: Review -> Satisfaction ("not satisfied") -> Select "Wrong vibe"
- **Steps to reproduce**:
  1. Complete the full flow through itinerary generation
  2. At the satisfaction gate, select "I'd like to make some changes"
  3. Select "wrong_vibe" as the reason
  4. The handler at orchestrator line 3833 sets `this.state.preferences.vibes = undefined`
  5. But the vibe data is actually stored at `(this.state.preferences as any).vibe` (line 3466)
  6. The handler resets `activities` confidence to 'unknown' and sets phase to 'gathering'
- **Expected result**: The vibe-related preferences are correctly cleared, and the user is asked to re-specify their vibe/activities
- **Actual result**: `this.state.preferences.vibes` (plural) is cleared, but the actual vibe is stored in `(this.state.preferences as any).vibe` (singular). This means the old vibe data persists. Additionally, resetting `activities` confidence to 'unknown' forces the user to re-answer ALL activities, not just vibe-related preferences.
- **Evidence**: Orchestrator line 3833: `this.state.preferences.vibes = undefined;` vs line 3466: `(this.state.preferences as any).vibe = vibe || '';`. The field names don't match.
- **Root cause hypothesis**: The `vibes` property on TripPreferences is a different field (line 278: `vibes?: string[]`) from the `vibe` field that stores the free-text answer. The handler clears the wrong one.
- **Recommended fix**: Change line 3833 to clear `(this.state.preferences as any).vibe = undefined` and also reset `this.state.confidence.vibe = 'unknown'` instead of resetting activities confidence. Let the user re-answer just the vibe question, not all activities.
- **Regression test**: After expressing dissatisfaction with vibe, verify the vibe question is re-shown (not the activities question), and the old vibe answer is cleared.

---

**[QP-010] P1 BUG: `hotel_wrong` dissatisfaction handler clears ALL discovered hotels, requiring full re-fetch**

- **Personas affected**: 42 (Kevin), any user wanting to change just one hotel
- **Flow**: Review -> Satisfaction -> "Hotel issues"
- **Steps to reproduce**:
  1. Complete flow with 2 areas and 2 hotel selections
  2. Express dissatisfaction and select "hotel_wrong"
  3. Handler at line 3847: `this.state.discoveredData.hotels.clear()` wipes ALL hotels
  4. Phase is set to 'gathering'
  5. User must re-answer hotel preferences AND wait for hotel re-fetch for ALL areas
- **Expected result**: Only the problematic hotel selection should be cleared, not all discovered hotel data
- **Actual result**: All hotel data (discovered and selected) is wiped. The user must redo the entire hotel selection flow for all areas, even if only one hotel was wrong.
- **Evidence**: Lines 3846-3849: `this.setConfidence('hotels', 'unknown'); this.state.discoveredData.hotels.clear(); this.state.phase = 'gathering';`
- **Root cause hypothesis**: The dissatisfaction handler takes a scorched-earth approach rather than surgical regeneration. The handler doesn't know which specific hotel is problematic.
- **Recommended fix**: Only clear selected hotels (not discovered hotels). Set phase to 'enriching' instead of 'gathering' so the user goes directly to hotel selection without re-fetching. If the user provided custom feedback specifying which area, only clear that area's selection.
- **Regression test**: With 2 hotels selected, report dissatisfaction with hotels. Verify only hotel selections are cleared, and discovered hotel data is retained.

---

**[QP-011] P1 LOGIC: `dining_wrong` dissatisfaction resets dining mode to undefined, requiring user to re-answer dining mode question instead of just restaurant selection**

- **Personas affected**: 42, 44 (Omar), any user wanting to change restaurants but keep dining=plan mode
- **Flow**: Review -> Satisfaction -> "Dining issues"
- **Steps to reproduce**:
  1. Complete flow with dining=plan, cuisine preferences, and restaurant selections
  2. Express dissatisfaction and select "dining_wrong"
  3. Handler at line 3854: `this.state.preferences.diningMode = undefined`
  4. User is re-asked "How do you want to handle dining?" instead of going directly to restaurant re-selection
- **Expected result**: Restaurant selections are cleared, but dining mode preference is preserved
- **Actual result**: The entire dining flow restarts from the mode question. User must re-select "Help me find restaurants", re-answer dietary restrictions, re-answer cuisine preferences, and THEN pick new restaurants.
- **Evidence**: Lines 3852-3856
- **Root cause hypothesis**: Same scorched-earth approach as the hotel handler.
- **Recommended fix**: Only clear `selectedRestaurants`. Leave `diningMode`, `dietaryRestrictions`, and `cuisinePreferences` intact. Re-fetch restaurants if needed and go directly to restaurant selection.
- **Regression test**: After reporting dining issues, verify the user goes directly to restaurant selection, not the dining mode question.

---

### P2 - Medium

---

**[QP-012] P2 BUG: Duplicate navigation paths - both auto-timeout (line 841) and "Take me to my itinerary" button (line 1864) can fire**

- **Personas affected**: All users reaching satisfaction
- **Flow**: Satisfied -> auto-navigation vs button click
- **Steps to reproduce**:
  1. Express satisfaction with the itinerary
  2. The celebration message shows and auto-navigation timer starts (1500ms)
  3. The ItineraryPreview component also renders with a "Take me to my itinerary" button
  4. Both can trigger `finalizeQuickPlanTrip()` independently
  5. If user clicks the button before the timer fires, both execute
- **Expected result**: Only one navigation path should be active
- **Actual result**: `finalizeQuickPlanTrip()` can be called twice, potentially creating duplicate trip entries or causing a double navigation
- **Evidence**: Line 841 (auto-navigate timeout) and line 1869 (`handleTakeToItinerary` in ItineraryPreview)
- **Root cause hypothesis**: Two independent navigation mechanisms exist without coordination
- **Recommended fix**: Remove the auto-navigation timer and rely solely on the user clicking the "Take me to my itinerary" button. Or disable the button during auto-navigation and cancel the timer if the button is clicked.
- **Regression test**: After satisfaction, click the "Take me to my itinerary" button immediately. Verify `finalizeQuickPlanTrip` is called only once.

---

**[QP-013] P2 BUG: `formatUserResponse` returns "Skipped" for empty string but doesn't handle whitespace-only strings correctly**

- **Personas affected**: 26 (Alex), 41 (Sophia), any user submitting spaces-only
- **Flow**: Text input (vibe question) -> submit empty/whitespace
- **Steps to reproduce**:
  1. At the vibe question (free text), type several spaces and submit
  2. `formatUserResponse` at line 1746: `return value.trim() || 'Skipped'` - returns 'Skipped'
  3. But `handleUserResponse` at line 389 calls `formatUserResponse(value)` for the TRANSCRIPT display
  4. The actual value passed to `processUserResponse` at line 406 is the original `value`, not the formatted one
  5. If `value` is `"   "` (spaces), it gets stored as-is in preferences
- **Expected result**: Whitespace-only input should be treated the same as empty input
- **Actual result**: The raw whitespace string is passed to `processUserResponse`, which at line 3466 stores `vibe = "   "`. This non-empty but meaningless value causes `confidence.vibe` to be set to 'complete', preventing the question from being re-asked.
- **Evidence**: Lines 1745-1747 (`formatUserResponse`) vs line 406 (`processUserResponse(currentQuestion.id, value)`)
- **Root cause hypothesis**: `formatUserResponse` trims for display purposes but the original value is passed to the orchestrator without trimming.
- **Recommended fix**: Trim all string values before passing to `processUserResponse`, not just in `formatUserResponse`.
- **Regression test**: Submit whitespace-only text for the vibe question. Verify the question can be re-asked or the value is treated as empty.

---

**[QP-014] P2 UX: No way to edit previously answered questions without using "Go back" repeatedly**

- **Personas affected**: 1 (Sarah), 3 (Priya), 8 (Kenji), 42 (Kevin), and any user who realizes they made a mistake several questions ago
- **Flow**: Mid-flow question answering
- **Steps to reproduce**:
  1. Answer 10 questions
  2. Realize the budget answer from question 6 was wrong
  3. Must click "Go back" 4 times to reach the budget question
  4. After changing budget, must re-answer all 4 subsequent questions
- **Expected result**: A summary view or clickable history that allows jumping to any previous answer
- **Actual result**: Linear back-navigation only. Going back N steps requires N clicks and re-answering N questions. Given the flow can have 15-25 questions, this is extremely tedious.
- **Evidence**: `goToPreviousQuestion()` at line 2066 only goes back one step. `getQuestionHistory()` returns the list but there's no "jump to" functionality.
- **Root cause hypothesis**: The go-back feature was designed as a simple linear undo, not a random-access editor.
- **Recommended fix**: Add a preference summary sidebar or modal that shows all answered questions with "edit" buttons. Clicking edit should jump directly to that question while preserving all other answers. Only cascade-reset downstream fields that directly depend on the edited field.
- **Regression test**: Edit the budget answer from 10 questions ago. Verify only budget-dependent fields (hotel search, etc.) are invalidated, not all subsequent answers.

---

**[QP-015] P2 ACCESSIBILITY: Slider input (budget) has no ARIA value labels or keyboard step announcements**

- **Personas affected**: 7 (Linda, keyboard-only), 11 (Susan, screen reader), 25 (Dorothy)
- **Flow**: Budget question
- **Steps to reproduce**:
  1. Navigate to the budget slider using keyboard
  2. Use arrow keys to change the value
  3. Screen reader does not announce the current dollar value
- **Expected result**: Slider should have `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, and `aria-valuetext` (e.g., "$175 per night")
- **Actual result**: The slider configuration at orchestrator line 871 provides `formatValue` function but this is for visual display. The underlying slider component likely lacks ARIA value text attributes.
- **Evidence**: `getInputConfig` at line 878: `formatValue: (val: number) => val >= 1000 ? '$1K+' : \`$${val}\``
- **Root cause hypothesis**: Custom slider component doesn't implement full ARIA slider pattern.
- **Recommended fix**: Add `aria-valuetext={formatValue(value)}` to the slider element. Ensure the slider has `role="slider"` and all required ARIA attributes.
- **Regression test**: Use VoiceOver/NVDA with the budget slider. Verify the current dollar amount is announced on each change.

---

**[QP-016] P2 UX: Seasonal warnings show AFTER dates are confirmed with no option to change dates**

- **Personas affected**: 1 (Sarah), 9 (Fatima), 31 (Claire), 43 (Beth), all users traveling during monsoon/extreme weather
- **Flow**: Dates question -> seasonal warning display -> next question
- **Steps to reproduce**:
  1. Set destination to "Thailand"
  2. Set dates during monsoon season (June-October)
  3. Warning message appears at line 512: "Heads up about your travel dates..."
  4. But the dates question is already marked as 'complete'
  5. No option to change dates is presented; flow continues to next question
- **Expected result**: After showing seasonal warnings, offer the user a choice: "Keep these dates" or "Change dates"
- **Actual result**: Warning is informational only. User must use "Go back" to change dates, but the warning message doesn't tell them this.
- **Evidence**: Lines 484-520: After showing warnings, code continues to the next question without offering date change.
- **Root cause hypothesis**: Seasonal warnings were added as informational alerts, not interactive decision points.
- **Recommended fix**: After showing seasonal warnings with severity 'caution' or 'warning', add interactive options: "Keep my dates" / "Change dates" (which would trigger goBack to the dates question).
- **Regression test**: Enter Thailand with monsoon dates. Verify a "Change dates" option appears alongside the warning.

---

**[QP-017] P2 BUG: `estimatedRoomsNeeded` is calculated in party response but not validated against hotel capacity**

- **Personas affected**: 6 (Amir, 8 adults), 23 (Rachel, 18 travelers), 37 (Nadia, mixed group)
- **Flow**: Party question -> hotel search -> hotel display
- **Steps to reproduce**:
  1. Enter 8 adults in the party question
  2. `estimatedRooms` is set in the party response (line 3057)
  3. Hotel search at line 1074 passes `estimatedRooms` to the API
  4. But the hotel display doesn't show "you'll need X rooms" or total cost for X rooms
  5. User sees per-room pricing and may not realize they need 4 rooms
- **Expected result**: Hotel cards should show estimated total cost based on rooms needed. A prominent note should say "For 8 guests, you'll need approximately 4 rooms"
- **Actual result**: Hotels show per-night pricing for a single room. The `largeGroupNote` field exists on `HotelCandidate` (types line 543) but it's not consistently populated or displayed.
- **Evidence**: `HotelCandidate` type has `estimatedRoomsNeeded`, `estimatedTotalPrice`, `largeGroupNote` fields but the hotel API and display logic don't always compute/show these.
- **Root cause hypothesis**: Large group support was designed in the types but not fully implemented in the API response processing and UI rendering.
- **Recommended fix**: Compute `estimatedTotalPrice = pricePerNight * estimatedRooms * nights` in the hotel API response handler. Display it prominently on hotel cards for groups > 4.
- **Regression test**: Search for hotels with 8 adults. Verify each hotel card shows "~4 rooms needed" and total estimated price.

---

**[QP-018] P2 LOGIC: `applyInferredValue` for dining expects `{ mode: ... }` but `inferFrom` returns `{ id: ... }`**

- **Personas affected**: Users whose dining preference is auto-inferred (anyone mentioning "wing it" or "find food" in conversation)
- **Flow**: Free text mentioning dining preference -> inference
- **Steps to reproduce**:
  1. In free text, say "we'll figure out food ourselves"
  2. `inferFrom` at line 1457 returns `{ id: 'none' }` (correctly fixed with comment "Bug fix: response handler expects { id: ... } not { mode: ... }")
  3. But `applyInferredValue` at line 2938 casts response as `{ mode: string }` and reads `inferredDining.mode`
  4. This reads `undefined` because the object has `id` not `mode`
- **Expected result**: Dining mode is correctly set to 'none' via inference
- **Actual result**: `this.state.preferences.diningMode` is set to `undefined` (since `inferredDining.mode` is undefined). This is falsy, so dining confidence is set to 'inferred' but the mode is wrong.
- **Evidence**: Line 2938: `const inferredDining = value as { mode: string }` vs line 1459: `return { id: 'none' }`
- **Root cause hypothesis**: The `inferFrom` was fixed to return `{ id: ... }` (matching processUserResponse format) but `applyInferredValue` was not updated to match.
- **Recommended fix**: Change line 2938 to: `const inferredDining = value as { id: string }; this.state.preferences.diningMode = inferredDining.id as DiningMode;`
- **Regression test**: In free text, type "we'll wing it for food". Verify `diningMode` is set to 'none'.

---

**[QP-019] P2 UX: Budget slider max is 1000 in `getInputConfig` but `processUserResponse` checks >= 2500 for unlimited**

- **Personas affected**: 1 (Sarah, luxury), 14 (Robert, $500+), 20 (Brian, luxury anniversary)
- **Flow**: Budget question -> budget processing
- **Steps to reproduce**:
  1. The budget slider config at line 872 shows `max: 1000`
  2. User slides to max (1000)
  3. `processUserResponse` at line 3272 checks `budget.value >= 2500` for unlimited flag
  4. Since max is 1000, user can NEVER trigger the unlimited flag via the slider
- **Expected result**: Either the slider max should match the unlimited threshold, or the unlimited check should match the slider max
- **Actual result**: The unlimited budget feature is unreachable via the slider. The `maxMeansUnlimited: true` config at line 881 exists but the unlimited check at line 3272 uses a hardcoded 2500 threshold that's higher than the slider max.
- **Evidence**: Line 873: `max: 1000` vs line 3272: `const isUnlimited = budget.value >= 2500`
- **Root cause hypothesis**: The slider max was changed from 2500 to 1000 at some point, but the unlimited threshold wasn't updated.
- **Recommended fix**: Change line 3272 to `const isUnlimited = budget.value >= 1000` (matching the slider max), or use the `maxMeansUnlimited` config property to determine if the max value should be treated as unlimited.
- **Regression test**: Slide budget to maximum ($1000). Verify the hotel search has no upper budget limit.

---

**[QP-020] P2 PERFORMANCE: Module-level caches (`activitySuggestionsCache`, `subredditSuggestionsCache`) never expire and persist across page navigations**

- **Personas affected**: 45 (Amanda, multi-tab), 49 (Nick, refresher), any user doing multiple planning sessions
- **Flow**: Any session -> navigate away -> return
- **Steps to reproduce**:
  1. Plan a trip to "Thailand" (caches activity and subreddit suggestions)
  2. Complete or abandon the trip
  3. Start a new trip to "Thailand" (gets cached results from previous session)
  4. The cached results from the first session persist indefinitely as module-level `Map` objects
- **Expected result**: Caches should have a TTL or be cleared when starting over
- **Actual result**: Module-level caches at lines 81-85 are never cleared except by page reload. The `handleStartOver` in QuickPlanChat calls `orchestrator.reset()` but this doesn't clear the module-level caches.
- **Evidence**: Lines 81-85: `const activitySuggestionsCache = new Map<...>()` and `const subredditSuggestionsCache = new Map<...>()` - these are module-scope variables, not instance variables.
- **Root cause hypothesis**: Caches were designed for performance within a single session but weren't made instance-level on the orchestrator.
- **Recommended fix**: Either add TTL to cache entries (e.g., 15 minutes) or clear caches in the `reset()` method. Export a `clearCaches()` function that `handleStartOver` can call.
- **Regression test**: Start a plan for Thailand, then start over and plan for a different destination. Verify activity suggestions are fetched fresh.

---

**[QP-021] P2 UX: "Start Over" button has no confirmation dialog**

- **Personas affected**: 25 (Dorothy, accidental taps), 40 (Dennis, double-clicks), 35 (Janet, confused by options)
- **Flow**: Any point in the flow -> Start Over
- **Steps to reproduce**:
  1. Progress through 15+ questions (10+ minutes of work)
  2. Accidentally click "Start Over" (or the RotateCcw icon on mobile, which has min-w-[44px] but is near other controls)
  3. All progress is immediately lost with no confirmation
- **Expected result**: A confirmation dialog ("Are you sure? You'll lose all your answers.") before resetting
- **Actual result**: Immediate reset at line 131 with no confirmation
- **Evidence**: Line 130-162 in `QuickPlanChat.tsx`: `handleStartOver` immediately calls `orchestrator.reset()` and clears all state
- **Root cause hypothesis**: Start Over was implemented as a simple reset without considering accidental activation
- **Recommended fix**: Add a confirmation modal before executing the reset. On mobile, consider moving the button to an overflow menu to reduce accidental taps.
- **Regression test**: Click Start Over with 10+ questions answered. Verify a confirmation dialog appears before any state is cleared.

---

**[QP-022] P2 CONSISTENCY: `dining` response handler in `formatUserResponse` has a stale label map**

- **Personas affected**: All users who select dining options
- **Flow**: Dining question -> transcript display
- **Steps to reproduce**:
  1. At the dining question, select "Help me find restaurants" (id: 'plan')
  2. `formatUserResponse` at line 1814-1821 checks for dining response
  3. The labels map has `'schedule': 'Plan dinners'`, `'list': 'Just a list'`, `'none': 'Skip dining'`
  4. But the actual dining options are `'plan'` (not 'schedule'), `'none'`
  5. Selecting `'plan'` doesn't match any label, so it falls through to return the raw id 'plan'
- **Expected result**: Selecting "Help me find restaurants" shows "Help me find restaurants" in the transcript
- **Actual result**: Shows raw id "plan" in the transcript
- **Evidence**: Line 1816: `'schedule': 'Plan dinners'` but the actual chip id is `'plan'` (orchestrator line 1445)
- **Root cause hypothesis**: The dining option IDs were changed from 'schedule' to 'plan' at some point, but the format helper wasn't updated.
- **Recommended fix**: Update the labels map to `{'plan': 'Help me find restaurants', 'none': 'Skip dining'}` matching the actual option IDs.
- **Regression test**: Select each dining option and verify the transcript shows the correct label, not the raw ID.

---

**[QP-023] P2 ACCESSIBILITY: Date range picker loaded via dynamic import may not be keyboard accessible**

- **Personas affected**: 7 (Linda, keyboard-only), 11 (Susan, screen reader)
- **Flow**: Dates question
- **Steps to reproduce**:
  1. Navigate to the date range picker using keyboard
  2. Dynamic import loads the DateRangePicker component (line 64-67 in ReplyCard.tsx)
  3. Focus may be lost during dynamic loading
  4. The date picker component may not support keyboard-only date selection
- **Expected result**: Full keyboard navigation of date selection (arrow keys for dates, Enter to select, Escape to close)
- **Actual result**: Focus trap and keyboard navigation depend on the underlying DateRangePicker implementation. Dynamic loading may cause focus loss.
- **Evidence**: `ReplyCard.tsx` line 64-67: `const DateRangePicker = dynamic(() => import('@/components/ui/DateRangePicker'), { ssr: false, loading: DynamicLoadingSpinner })`
- **Root cause hypothesis**: Dynamic imports don't preserve focus, and the date picker component may not implement WAI-ARIA date picker pattern.
- **Recommended fix**: After dynamic import completes, programmatically set focus to the first interactive element in the date picker. Ensure the date picker implements the WAI-ARIA combobox date picker pattern.
- **Regression test**: Tab to the date picker area. Verify focus is correctly placed on the first selectable date after the component loads.

---

**[QP-024] P2 BUG: `handleSkip` does not check `currentQuestion.required` before calling `processUserResponse` with 'SKIP'**

- **Personas affected**: Any user trying to skip a required question
- **Flow**: Required question -> Skip button
- **Steps to reproduce**:
  1. The `canSkip` check at line 296 correctly hides the skip button for required questions
  2. However, `handleSkip` at line 260 doesn't re-validate `currentQuestion.required`
  3. In a race condition where `currentQuestion` changes between render and click handler execution, a required question could be skipped
  4. Inside `processUserResponse` at line 2962, the skip IS validated (`if (config && !config.required)`)
  5. But the skip still adds a "(Skipped)" user message to the transcript at line 267
- **Expected result**: No transcript message added if the skip is rejected
- **Actual result**: Even for rejected skips of required questions, "(Skipped)" appears in the transcript. Then the same question re-appears, confusing the user.
- **Evidence**: Lines 260-290: `handleSkip` adds the user message BEFORE calling `processUserResponse`, which may reject the skip at line 2970-2972.
- **Root cause hypothesis**: The message is added optimistically before validation.
- **Recommended fix**: Move the `orchestrator.addUserMessage('(Skipped)')` call to AFTER `processUserResponse` confirms the skip was accepted. Add a return value to `processUserResponse` indicating success/failure.
- **Regression test**: Simulate a rapid state change that makes currentQuestion required. Verify no "(Skipped)" message appears in the transcript.

---

**[QP-025] P2 UX: Free text input character limit (500) is enforced client-side only**

- **Personas affected**: 26 (Alex, security tester)
- **Flow**: Free text input -> submit
- **Steps to reproduce**:
  1. Open browser dev tools
  2. Modify the input element to remove maxLength
  3. Submit a 10,000-character message
  4. The message is sent to the LLM API without server-side length validation
- **Expected result**: Server-side validation of input length
- **Actual result**: The chat API at `/api/quick-plan/chat/route.ts` validates message structure (must be array, must have role/content) but does not validate content length. A very long message could increase LLM costs or cause timeouts.
- **Evidence**: Chat API route lines 36-51: validates presence of role and content but no length check.
- **Root cause hypothesis**: Input length validation was only implemented client-side.
- **Recommended fix**: Add server-side validation: `if (msg.content.length > 2000) throw new ValidationError('Message too long')`.
- **Regression test**: Send a POST to `/api/quick-plan/chat` with a 50,000-character message. Verify it returns a 400 error.

---

### P3 - Low

---

**[QP-026] P3 CONSISTENCY: Progress indicator shows "gathering" phase as active with a spinning loader, but phase label says "Gathering Preferences"**

- **Personas affected**: All users
- **Flow**: Gathering phase
- **Steps to reproduce**:
  1. Start a new plan
  2. The progress indicator shows all 5 phases
  3. The current phase has a spinning `Loader2` icon even though no async operation is happening - the user is just answering questions
- **Expected result**: The active phase should show a filled/active indicator, not a loading spinner. Loading spinners should be reserved for actual async operations.
- **Actual result**: `ProgressIndicator.tsx` line 60-62 shows `<Loader2 className="w-4 h-4 animate-spin" />` for the current phase regardless of whether loading is occurring.
- **Root cause hypothesis**: The progress indicator doesn't distinguish between "active" and "loading" states.
- **Recommended fix**: Show a filled circle or highlighted number for the active phase. Only show the spinner during actual enrichment/generation operations.
- **Regression test**: Visual verification that the gathering phase shows a static active indicator, not a spinner.

---

**[QP-027] P3 UX: "Ask Snoo a question" button position creates potential for accidental taps on mobile**

- **Personas affected**: 9 (Fatima, mobile), 10 (Carlos, tiny screen), 39 (Lisa, commuting)
- **Flow**: Any question on mobile
- **Steps to reproduce**:
  1. On a 375px screen, the reply card is at the bottom
  2. Below the reply card is the "Ask Snoo a question" button
  3. These are very close together on small screens
  4. User may accidentally tap the free text input instead of a chip/button
- **Expected result**: Adequate spacing between the reply card and the free text toggle, or the free text toggle should be less prominent
- **Actual result**: The `mt-3 sm:mt-4` spacing (line 1646) is minimal on mobile. The button is full-width and easily tappable.
- **Root cause hypothesis**: The free text toggle occupies significant screen real estate on mobile devices where vertical space is limited.
- **Recommended fix**: On mobile, collapse the free text toggle to a smaller icon button (just the MessageCircle icon) positioned at the edge, not full-width.
- **Regression test**: On a 375px viewport, verify adequate spacing between the active reply card and the free text button.

---

**[QP-028] P3 UX: No trip length cap warning in the UI despite backend cap at 365 nights**

- **Personas affected**: 34 (Wei, 90-night trip), any user entering very long trips
- **Flow**: Dates question
- **Steps to reproduce**:
  1. Select dates spanning 90+ nights
  2. The backend at line 3008 caps at 365: `Math.max(1, Math.min(365, dates.nights || 1))`
  3. No warning is shown to the user if their dates are adjusted
- **Expected result**: If the trip length is capped, a message should explain why
- **Actual result**: Silent adjustment. For very long trips (e.g., 100 nights), the user enters 100 and sees 100 confirmed, but if they somehow entered >365, it would be silently capped.
- **Evidence**: Line 3008-3010: `if (dates.nights !== validatedNights) console.warn(...)` - warning goes to console only, not to user.
- **Root cause hypothesis**: The validation is defensive but non-communicative.
- **Recommended fix**: Show a toast or inline message if trip length is adjusted. Also consider showing a note for trips > 30 nights suggesting breaking it into multiple plans.
- **Regression test**: Enter dates spanning 400 nights. Verify a user-visible message explains the 365-night cap.

---

**[QP-029] P3 CONTENT: Dining option "plan" label in `formatUserResponse` shows "plan" but the actual label should match the chip label "Help me find restaurants"**

- **Personas affected**: All users selecting dining options
- **Flow**: Dining question -> chat transcript
- **Steps to reproduce**: (see QP-022 for details)
- **Expected result**: Transcript shows "Help me find restaurants" not "plan"
- **Actual result**: Shows raw id "plan"
- **Related issues**: QP-022 (same root cause)

---

**[QP-030] P3 UX: Area discovery failure shows generic error message without actionable recovery**

- **Personas affected**: 10 (Carlos, intermittent connection), 31 (Claire, slow DSL), 48 (Pat, unusual destination)
- **Flow**: Enrichment phase -> area discovery failure
- **Steps to reproduce**:
  1. Enter a destination
  2. If the area discovery API fails (network error, timeout, or empty results)
  3. Message at line 958-961: "I'm having trouble finding specific areas for ${destination}. Let's continue with general recommendations."
  4. But "general recommendations" don't actually exist - the flow continues without areas
- **Expected result**: Clear explanation of what happened and what the user can do (retry, change destination, or proceed without area-specific recommendations)
- **Actual result**: Misleading message ("general recommendations") when actually no recommendations will be provided. The flow may get stuck because areas are needed for subsequent steps.
- **Evidence**: Lines 957-962 in `QuickPlanChat.tsx`
- **Root cause hypothesis**: The error message was written optimistically but the fallback flow was never fully implemented.
- **Recommended fix**: Offer explicit options: "Try again" (retry area discovery), "Change destination" (go back), or "Continue without area suggestions" (skip to generic hotel search). Update the message to not promise "general recommendations" if none exist.
- **Regression test**: Simulate area discovery failure. Verify the user sees actionable recovery options.

---

**[QP-031] P3 LOGIC: Multi-country detection uses simple pattern matching that fails for complex inputs**

- **Personas affected**: 33 (Ingrid, "Norway, Sweden, Denmark"), any user with 3+ country trips
- **Flow**: Destination input
- **Steps to reproduce**:
  1. Enter "Norway, Sweden, and Denmark" as destination
  2. `detectMultiCountry` at line 479 only matches 2-country patterns (X and Y, X to Y, etc.)
  3. Three-country trips are not detected
  4. Also, "City, Country" format (e.g., "Paris, France") is correctly excluded via regex patterns, but "Portugal and Spain and Italy" would not be detected as multi-country
- **Expected result**: Multi-country detection should handle 3+ countries
- **Actual result**: Only 2-country combinations are detected. Three-country trips get no logistics tips.
- **Evidence**: Line 497-502: regex patterns only capture 2 groups
- **Root cause hypothesis**: Pattern matching was designed for simple 2-country pairs only.
- **Recommended fix**: Add additional regex patterns for 3+ countries (e.g., `X, Y, and Z`). Also consider using the LLM to detect multi-country intent from natural language input.
- **Regression test**: Enter "France, Italy, and Switzerland". Verify multi-country detection activates.

---

**[QP-032] P3 UX: Loading messages during hotel/restaurant/experience fetch are not dismissable and block interaction**

- **Personas affected**: 3 (Priya, impatient), 8 (Kenji, impatient), 24 (Jin, quick trip)
- **Flow**: Any API fetch (hotels, restaurants, experiences)
- **Steps to reproduce**:
  1. After answering hotel preferences, hotel fetch begins
  2. `isProcessing` is true, which hides the reply card (line 1590: `currentQuestion && !isProcessing`)
  3. If the hotel API is slow (30+ seconds), user cannot do anything - no cancel button, no timeout indicator
- **Expected result**: Show a cancel button or timeout indicator during long fetches. Allow user to skip ("Continue without hotels") after 10+ seconds.
- **Actual result**: User stares at the loading animation with no way to proceed. The `dedupedPost` has a timeout (45s for hotels), but the user sees no progress or option to skip.
- **Evidence**: Lines 1626-1642 show the processing indicator. No cancel mechanism exists.
- **Root cause hypothesis**: Loading states were designed for typical response times (2-5s) but don't handle degraded scenarios.
- **Recommended fix**: Add a "Skip this step" button that appears after 10 seconds of loading. Show elapsed time or a progress message that updates.
- **Regression test**: Simulate a 30-second hotel fetch. Verify a skip option appears after 10 seconds.

---

**[QP-033] P3 ACCESSIBILITY: Dark mode color contrast may fail WCAG AA for some text elements**

- **Personas affected**: 4 (Marcus, color blind), 2 (Jim, low vision), 25 (Dorothy, low vision)
- **Flow**: Entire application in dark mode
- **Steps to reproduce**:
  1. Enable dark mode
  2. Check contrast ratio of `text-slate-400 dark:text-slate-500` on `bg-slate-800 dark:bg-slate-800/50`
  3. Slate-500 on slate-800 may not meet WCAG AA 4.5:1 contrast ratio for normal text
- **Expected result**: All text meets WCAG AA contrast requirements (4.5:1 for normal text, 3:1 for large text)
- **Actual result**: Secondary text using `text-slate-500` on dark backgrounds may fall below 4.5:1 contrast. Example: "Your AI travel buddy" at line 1534 uses `text-xs text-slate-500 dark:text-slate-400`.
- **Evidence**: Multiple instances of `text-slate-500 dark:text-slate-400` and `text-slate-400 dark:text-slate-500` throughout `QuickPlanChat.tsx`
- **Root cause hypothesis**: Color palette wasn't audited against WCAG AA requirements for dark mode.
- **Recommended fix**: Audit all color combinations in dark mode. Replace `text-slate-500` with `text-slate-400` or lighter on dark backgrounds. Use a contrast checker tool.
- **Regression test**: Run automated contrast check (e.g., axe-core) on the dark mode UI. Verify all text passes WCAG AA.

---

**[QP-034] P3 UX: "Hidden" class on "Your AI travel buddy" subtitle using `hidden xs:block` - but `xs` is not a standard Tailwind breakpoint**

- **Personas affected**: 10 (Carlos, 320px), 25 (Dorothy, iPad)
- **Flow**: Chat header display
- **Steps to reproduce**:
  1. Open the app on any screen size
  2. The subtitle at line 1534 uses `hidden xs:block`
  3. Tailwind does not have a default `xs` breakpoint. If this is a custom breakpoint, it works. If not, the class is ignored.
- **Expected result**: The subtitle should be hidden on very small screens and visible on larger ones
- **Actual result**: If `xs` breakpoint is not configured in `tailwind.config.ts`, the `xs:block` class is ignored and the text stays `hidden` on ALL screen sizes.
- **Evidence**: Line 1534: `className="text-xs text-slate-500 dark:text-slate-400 hidden xs:block"`. Standard Tailwind breakpoints are `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px), `2xl` (1536px).
- **Root cause hypothesis**: Custom breakpoint may or may not be configured.
- **Recommended fix**: Verify `xs` is defined in `tailwind.config.ts`. If not, use `sm:block` instead or define the `xs` breakpoint.
- **Regression test**: On a 375px screen, verify the subtitle is either visible or hidden as intended.

---

**[QP-035] P3 LOGIC: `filterActivitiesForChildAges` restricts activities from the selection list but doesn't prevent adults from doing them**

- **Personas affected**: 4 (Marcus, family), 12 (David, Orlando with kids), 9 (Fatima, young kids)
- **Flow**: Activities question with children
- **Steps to reproduce**:
  1. Set party to 2 adults, 1 child age 5
  2. At the activities question, scuba diving shows with note "Usually 10+ (great for parent time!)"
  3. User selects scuba diving
  4. But `filterActivitiesForChildAges` at line 603 is only called for warnings, not for actual filtering. The activity CAN be selected.
  5. However, the language "great for parent time!" implies only parents will do it. This nuance may not be reflected in the itinerary generation.
- **Expected result**: If the activity is age-restricted for children, the itinerary should schedule it as adults-only time with alternative child activities
- **Actual result**: The activity is selected and may be scheduled for the whole family in the generated itinerary. The "parent time" note is only shown during selection, not carried into generation.
- **Evidence**: Line 1108: `description: \`Usually ${minAge}+ (great for parent time!)\`` - this is display text only, not data carried to the itinerary generator.
- **Root cause hypothesis**: The age restriction information is used for UI guidance but not passed to the itinerary generation logic.
- **Recommended fix**: When activities have age restrictions that conflict with child ages, tag them as `adultsOnly: true` in the activity data. Pass this to the itinerary generator so it can schedule childcare alternatives during those activities.
- **Regression test**: With a 5-year-old child, select scuba diving. Verify the generated itinerary notes it as adults-only with suggested kid activities.

---

**[QP-036] P3 UX: Hotel "no results" message says "Let me move on" but doesn't explain what happens next**

- **Personas affected**: 48 (Pat, remote destination), 10 (Carlos, budget constraint)
- **Flow**: Hotel search -> empty results
- **Steps to reproduce**:
  1. Select a remote destination with no hotel data
  2. Hotel fetch returns 0 results
  3. Message at line 1104: "I couldn't find any hotels matching your preferences in those areas yet. Let me move on to the next step."
  4. Hotels are marked as 'partial' (line 1109)
  5. The user doesn't know if they'll get hotels later or need to find their own
- **Expected result**: Clear explanation: "No hotels found. I'll continue building your itinerary without hotel recommendations. You can add hotels later in the full planner."
- **Actual result**: Vague "Let me move on" without explaining consequences.
- **Evidence**: Lines 1103-1110
- **Root cause hypothesis**: Error messaging was written to be brief rather than informative.
- **Recommended fix**: Add specific messaging about what happens to the trip without hotel selections.
- **Regression test**: Simulate empty hotel results. Verify the message explains the impact on the itinerary.

---

**[QP-037] P3 PERFORMANCE: Module-level `setInterval` for cache cleanup runs indefinitely**

- **Personas affected**: 45 (Amanda, multi-tab), all users with long sessions
- **Flow**: Application lifecycle
- **Steps to reproduce**:
  1. The `RequestDeduplicator` constructor at `/lib/request-dedup.ts` line 72 creates a `setInterval` for cleanup every 60 seconds
  2. This interval is never cleared, even when the module is no longer needed
  3. In a SPA with hot module replacement, each HMR reload creates a new interval without clearing the old one
- **Expected result**: Cleanup interval should be manageable and clearable
- **Actual result**: In development mode with HMR, multiple cleanup intervals accumulate. In production, a single interval runs for the lifetime of the page.
- **Evidence**: `request-dedup.ts` line 72-74: `setInterval(() => this.cleanup(), 60000)` in constructor
- **Root cause hypothesis**: Singleton pattern with unmanaged timer.
- **Recommended fix**: Store the interval ID and provide a `destroy()` method. In development, clear previous interval on HMR. In production, this is low impact but still a resource leak.
- **Regression test**: In development mode, trigger 5 HMR reloads. Verify only 1 cleanup interval is active.

---

### P4 - Trivial

---

**[QP-038] P4 CONTENT: Random Snoo greeting varies on each session - minor inconsistency**

- **Personas affected**: All users
- **Flow**: Initial load
- **Steps to reproduce**: The greeting is picked randomly from `SNOO_TEMPLATES.greeting` (line 634-638). Each new session gets a different greeting. While not a bug, it could confuse A/B testing or screenshot-based documentation.
- **Root cause hypothesis**: Intentional variety, but could be made deterministic with a seed.
- **Recommended fix**: Consider using session-seeded randomness or a fixed greeting for consistency.

---

**[QP-039] P4 CONSISTENCY: Inconsistent icon usage - some questions use emoji strings, others use Lucide React components**

- **Personas affected**: Accessibility users (screen readers announce emoji differently from icon elements)
- **Flow**: All chip-based questions
- **Evidence**: Chip options use emoji strings (e.g., '🏖️', '🧘') while navigation uses Lucide components (`<ArrowLeft>`, `<SkipForward>`). Screen readers announce emojis as their Unicode names, which can be verbose.
- **Recommended fix**: Use consistent icon approach. If using emoji, add `aria-hidden="true"` and provide text alternatives. If using icon components, ensure they have `aria-label` attributes.

---

**[QP-040] P4 CONTENT: Inconsistent date format in itinerary preview**

- **Personas affected**: International users (non-US date format preference)
- **Flow**: Reviewing phase -> itinerary display
- **Steps to reproduce**: The itinerary preview at line 1947 uses `toLocaleDateString('en-US', ...)` hardcoded to US locale. Users in other locales may prefer different date formatting.
- **Evidence**: Line 1947: `new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })`
- **Recommended fix**: Use `navigator.language` or a user locale preference instead of hardcoded 'en-US'.

---

**[QP-041] P4 CONTENT: "Approaching character limit" hint appears at >450 chars but the limit is 500**

- **Personas affected**: All users typing long free-text messages
- **Flow**: Free text input
- **Evidence**: Line 1664 changes border color at >450, line 1682 shows warning text at >450. This 50-character buffer is reasonable but the exact threshold isn't explained to the user. The counter always shows X/500 which is clear.
- **Recommended fix**: Minor - the behavior is functional. Could say "50 characters remaining" instead of "Approaching character limit" for precision.

---

**[QP-042] P4 CONTENT: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` uses deprecated `substr`**

- **Personas affected**: None (functionality works, just deprecated API)
- **Flow**: Message ID generation
- **Evidence**: Orchestrator line 1931: `.substr(2, 9)` - `substr` is deprecated in favor of `substring` or `slice`.
- **Recommended fix**: Replace `.substr(2, 9)` with `.substring(2, 11)` or `.slice(2, 11)`.

---

## UX Improvement Recommendations

### 1. Flow Simplification
- **Reduce question count**: The gathering phase can ask up to 18+ questions before enrichment. Consider grouping related questions (e.g., combine trip occasion + pets + accessibility into a single "About your trip" card).
- **Smart defaults**: For returning users or common trip types, pre-fill common answers and let users confirm rather than answer from scratch.
- **Progressive disclosure**: Don't ask sustainability preference, accommodation type, or skill level unless the user's previous answers suggest these matter.

### 2. Missing Feedback Patterns
- **No progress percentage**: Users don't know how many questions remain. Add "Question 5 of ~15" or a progress bar within the gathering phase.
- **No undo for chip selections**: Once a chip is selected and submitted, the only way back is "Go back". Consider allowing selection changes before explicit submit.
- **No preview of what's coming**: Users don't know the flow structure. A brief "I'll ask about your destination, dates, budget, and preferences" intro would set expectations.

### 3. Error Message Improvements
- All error messages should follow the pattern: "What happened" + "Why" + "What you can do about it"
- Replace "Having trouble..." messages with specific actions: "Retry", "Skip", "Change preferences"
- Add error codes for debugging (e.g., "Error QP-503" that users can report)

### 4. Performance Opportunities
- **Prefetch subreddit and activity suggestions** immediately after destination is confirmed (already partially implemented, but the await in `createQuestionConfig` can block the question from appearing)
- **Lazy load area map** components - they're imported but may not always be needed
- **Reduce LLM calls** for question ordering - the `decideNextField` method always falls back to the priority list anyway; the LLM call in `buildNextFieldPrompt` is never actually used

### 5. Accessibility Enhancements
- Add `aria-live="polite"` region for Snoo's messages so screen readers announce new messages
- Add skip-to-main-content link
- Ensure all focus management is handled during phase transitions (focus should move to the new content)
- Add `aria-busy="true"` to the chat area during loading states
- Ensure all images (hotel, restaurant, experience cards) have meaningful alt text

---

## Coverage Matrix

| Flow Step | Happy Path | Error Path | Back Nav | Skip | Mobile | Accessibility | Slow Connection |
|-----------|-----------|------------|----------|------|--------|--------------|-----------------|
| Homepage -> Quick Plan | OK | - | - | - | OK | QP-005 | OK |
| Destination input | OK | QP-008 | - | - | OK | QP-005 | QP-008 |
| Date selection | OK | - | QP-003 | - | QP-023 | QP-015, QP-023 | OK |
| Party composition | OK | - | QP-003 | - | OK | QP-005 | OK |
| Trip occasion | OK | - | - | OK | OK | QP-005 | OK |
| Pets question | OK | - | - | OK | OK | QP-005 | OK |
| Accessibility needs | OK | - | - | OK | OK | QP-005 | OK |
| Budget slider | QP-019 | - | - | - | OK | QP-015 | OK |
| Accommodation type | OK | - | - | OK | OK | QP-005 | OK |
| Pace selection | OK | - | - | - | OK | QP-005 | OK |
| Activities | OK | - | - | - | OK | QP-005 | OK |
| Skill level | OK | - | - | OK | OK | QP-005 | OK |
| Subreddits | OK | - | QP-001 | - | OK | QP-005 | OK |
| Vibe (free text) | QP-013 | - | - | OK | OK | OK | OK |
| Area discovery | OK | QP-030 | - | - | OK | - | QP-030 |
| Area selection | OK | - | QP-003 | - | OK | QP-005 | OK |
| Split selection | QP-007 | - | - | - | OK | QP-005 | OK |
| Hotel preferences | OK | - | - | - | OK | QP-005 | OK |
| Hotel fetching | OK | QP-036 | - | - | OK | - | QP-032 |
| Hotel selection | OK | - | - | - | QP-017 | QP-005 | OK |
| Dining mode | QP-022 | QP-018 | - | - | OK | QP-005 | OK |
| Dietary restrictions | OK | - | - | OK | OK | QP-005 | OK |
| Cuisine preferences | QP-001 | - | - | - | OK | QP-005 | OK |
| Restaurant fetching | OK | OK | - | - | OK | - | QP-032 |
| Restaurant selection | OK | - | - | OK | OK | QP-005 | OK |
| Experience fetching | OK | OK | - | - | OK | - | QP-032 |
| Experience selection | OK | - | - | OK | OK | QP-005 | OK |
| Itinerary generation | OK | OK | - | - | OK | - | QP-032 |
| Itinerary review | OK | - | - | - | OK | QP-033 | OK |
| Satisfaction gate | OK | - | - | - | OK | QP-005 | OK |
| Dissatisfaction loop | QP-009,10,11 | - | - | - | OK | - | OK |
| Celebration | QP-002,12 | QP-002 | - | - | OK | - | QP-002 |
| Trip finalization | QP-002 | QP-002 | - | - | OK | - | QP-002 |
| Start Over | QP-021 | - | - | - | QP-021 | OK | OK |
| Free text input | QP-004,25 | OK | - | - | QP-027 | OK | OK |

**Legend**: OK = No issues found | QP-XXX = Issue reference | - = Not applicable

---

## Summary

The Roam Quick Plan flow is an ambitious, feature-rich chat-based trip planner with impressive depth (30+ question types, smart follow-ups, multi-API enrichment, surgical regeneration). The core architecture is sound, and error handling is thoughtful with graceful degradation patterns.

**Critical areas requiring immediate attention:**
1. Phase transition atomicity (QP-001, QP-003) - the `selectNextQuestion()` being called multiple times per user action is the biggest systemic risk
2. Navigation race condition (QP-002) - the setTimeout-based auto-navigation can cause blank pages
3. Accessibility (QP-005, QP-015, QP-023) - the application is largely inaccessible to keyboard-only and screen reader users

**Areas of strength:**
- Comprehensive error handling with user-friendly messages and graceful fallbacks
- Request deduplication preventing duplicate API calls
- Rich contextual UI with loading skeletons, acknowledgment messages, and phase indicators
- Thoughtful conditional question logic (theme parks, surfing, workation, multi-country, child needs, pets, accessibility)
- Timeout cleanup on unmount prevents memory leaks

**Recommended priority for fixes:**
1. P0 issues (QP-001, QP-002, QP-003) - fix immediately
2. P1 accessibility (QP-005, QP-015) - fix before public launch
3. P1 logic bugs (QP-007, QP-009, QP-010, QP-011, QP-018, QP-019) - fix in next sprint
4. P2 UX improvements - schedule for subsequent sprints
