/**
 * Tradeoff Detection Engine
 * Detects conflicts between user preferences and provides resolution options
 */

import {
  TripPreferences,
  Tradeoff,
  TradeoffOption,
  TradeoffType,
  ActivityIntent,
} from '@/types/quick-plan';

/**
 * Detect all tradeoffs in the current preferences
 */
export function detectTradeoffs(preferences: TripPreferences): Tradeoff[] {
  const tradeoffs: Tradeoff[] = [];

  // Check each tradeoff type
  const calmVsSurf = checkCalmWaterVsSurf(preferences);
  if (calmVsSurf) tradeoffs.push(calmVsSurf);

  const baseVsRegions = checkOneBaseVsManyRegions(preferences);
  if (baseVsRegions) tradeoffs.push(baseVsRegions);

  const adultsVsNightlife = checkAdultsOnlyVsNightlife(preferences);
  if (adultsVsNightlife) tradeoffs.push(adultsVsNightlife);

  const drivesVsMultiStop = checkNoDrivesVsMultiStop(preferences);
  if (drivesVsMultiStop) tradeoffs.push(drivesVsMultiStop);

  const beachVsAdventure = checkBeachVsAdventure(preferences);
  if (beachVsAdventure) tradeoffs.push(beachVsAdventure);

  const familyVsParty = checkFamilyVsParty(preferences);
  if (familyVsParty) tradeoffs.push(familyVsParty);

  return tradeoffs;
}

/**
 * Check: Calm/swimmable water vs Surf every day
 */
function checkCalmWaterVsSurf(preferences: TripPreferences): Tradeoff | null {
  if (!preferences.selectedActivities || preferences.selectedActivities.length === 0) return null;

  const surfActivity = preferences.selectedActivities.find(a => a.type === 'surf');
  const swimmingActivity = preferences.selectedActivities.find(
    a => a.type === 'swimming' || a.type === 'snorkel'
  );

  if (!surfActivity || !swimmingActivity) return null;

  const wantsCalmWater = swimmingActivity.calmWaterRequired === true;
  const wantsManySurfDays = surfActivity.targetDays && surfActivity.targetDays >= preferences.tripLength * 0.5;

  if (!wantsCalmWater || !wantsManySurfDays) return null;

  return {
    id: 'calm_water_vs_surf',
    type: 'calm_water_vs_surf',
    title: 'Calm Water vs Surfing',
    description: 'You want both calm swimming waters and many surf days. Great surf spots usually have waves, not calm water.',
    conflictingPreferences: [
      'Calm water required for swimming/snorkeling',
      `${surfActivity.targetDays} surf days requested`,
    ],
    resolutionOptions: [
      {
        id: 'prioritize_surf',
        label: 'Prioritize surfing',
        description: 'Stay near surf breaks, find calm lagoons nearby for swim days',
        impact: 'Swimming will be in specific calm spots, not everywhere',
      },
      {
        id: 'prioritize_calm',
        label: 'Prioritize calm water',
        description: 'Stay in calm-water areas, take day trips to surf spots',
        impact: 'Fewer surf days, more travel time to breaks',
      },
      {
        id: 'split_bases',
        label: 'Split between both',
        description: 'Stay half the trip at a surf spot, half at a calm beach area',
        impact: 'One transfer day, but you get the best of both',
      },
      {
        id: 'custom',
        label: 'Custom solution',
        description: 'Tell me exactly what you want',
        impact: 'I\'ll try to accommodate your specific preference',
      },
    ],
  };
}

/**
 * Check: One base vs Many distinct regions
 */
function checkOneBaseVsManyRegions(preferences: TripPreferences): Tradeoff | null {
  if (preferences.maxBases <= 1) return null;

  const destinationType = preferences.destinationContext?.type;
  if (destinationType !== 'country' && destinationType !== 'region') return null;

  const wantsMultipleBases = preferences.maxBases >= 3;
  const shortTrip = preferences.tripLength <= 7;

  if (!wantsMultipleBases || !shortTrip) return null;

  return {
    id: 'one_base_vs_many_regions',
    type: 'one_base_vs_many_regions',
    title: 'Multiple Bases on a Short Trip',
    description: `You want to visit ${preferences.maxBases} bases in ${preferences.tripLength} nights. That's a lot of moving around.`,
    conflictingPreferences: [
      `${preferences.maxBases} different bases requested`,
      `Only ${preferences.tripLength} nights total`,
    ],
    resolutionOptions: [
      {
        id: 'reduce_bases',
        label: 'Reduce to 2 bases',
        description: 'Pick 2 key areas and spend meaningful time in each',
        impact: 'More relaxed pace, less time in transit',
      },
      {
        id: 'single_base_day_trips',
        label: 'One base + day trips',
        description: 'Stay in one central location and do day trips to other areas',
        impact: 'No hotel changes, but longer daily drives',
      },
      {
        id: 'accept_packed',
        label: 'Accept packed itinerary',
        description: 'Keep all bases, accept that some days will be mostly travel',
        impact: 'You\'ll see more but experience less depth',
      },
      {
        id: 'custom',
        label: 'Custom solution',
        description: 'Tell me your priority areas',
        impact: 'I\'ll optimize around your must-see spots',
      },
    ],
  };
}

/**
 * Check: Adults-only required vs Nightlife areas
 */
function checkAdultsOnlyVsNightlife(preferences: TripPreferences): Tradeoff | null {
  if (!preferences.selectedActivities || preferences.selectedActivities.length === 0) return null;

  const wantsNightlife = preferences.selectedActivities.some(a => a.type === 'nightlife');
  const hasKids = (preferences.children || 0) > 0;

  if (!wantsNightlife || !hasKids) return null;

  return {
    id: 'adults_only_vs_nightlife',
    type: 'adults_only_vs_nightlife',
    title: 'Nightlife with Children',
    description: 'You selected nightlife as an activity but are traveling with children.',
    conflictingPreferences: [
      'Nightlife activity selected',
      `${preferences.children} children in party`,
    ],
    resolutionOptions: [
      {
        id: 'skip_nightlife',
        label: 'Skip nightlife',
        description: 'Focus on family-friendly evening activities',
        impact: 'Resort dinners, beach sunsets, family entertainment',
      },
      {
        id: 'occasional_nightlife',
        label: 'Occasional adults night',
        description: 'Plan 1-2 nights where kids have resort babysitting',
        impact: 'Need to book hotels with kids club or childcare',
      },
      {
        id: 'split_evening_plans',
        label: 'Split evening plans',
        description: 'Adults alternate going out while one stays with kids',
        impact: 'Both adults get some nightlife, not together',
      },
      {
        id: 'custom',
        label: 'Custom solution',
        description: 'Explain your childcare situation',
        impact: 'I\'ll plan accordingly',
      },
    ],
  };
}

/**
 * Check: No long drives vs Multi-stop plans
 */
function checkNoDrivesVsMultiStop(preferences: TripPreferences): Tradeoff | null {
  if (!preferences.hardNos || preferences.hardNos.length === 0) return null;

  const noLongDrives = preferences.hardNos.some(
    n => n.toLowerCase().includes('long drive') ||
         n.toLowerCase().includes('driving') ||
         n.toLowerCase().includes('car')
  );

  if (!noLongDrives || preferences.maxBases <= 1) return null;

  return {
    id: 'no_long_drives_vs_multi_stop',
    type: 'no_long_drives_vs_multi_stop',
    title: 'No Long Drives vs Multiple Stops',
    description: 'You want to avoid long drives but also visit multiple areas.',
    conflictingPreferences: [
      'Long drives listed as hard no',
      `${preferences.maxBases} bases requested`,
    ],
    resolutionOptions: [
      {
        id: 'adjacent_areas_only',
        label: 'Only adjacent areas',
        description: 'Limit to areas within 1 hour of each other',
        impact: 'May reduce area options significantly',
      },
      {
        id: 'domestic_flights',
        label: 'Use domestic flights',
        description: 'Fly between distant areas instead of driving',
        impact: 'Higher cost, airport time, but no long drives',
      },
      {
        id: 'single_base',
        label: 'Single base with day trips',
        description: 'Stay in one spot, use drivers for day trips',
        impact: 'You still drive, but return home each night',
      },
      {
        id: 'custom',
        label: 'Custom solution',
        description: 'Define your drive time limit',
        impact: 'I\'ll filter areas by drive time',
      },
    ],
  };
}

/**
 * Check: Beach relaxation vs Adventure activities
 */
function checkBeachVsAdventure(preferences: TripPreferences): Tradeoff | null {
  if (!preferences.selectedActivities || preferences.selectedActivities.length === 0) return null;

  const wantsBeach = preferences.selectedActivities.some(a => a.type === 'beach');
  const wantsAdventure = preferences.selectedActivities.some(a => a.type === 'adventure' || a.type === 'hiking');

  if (!wantsBeach || !wantsAdventure) return null;

  const beachActivity = preferences.selectedActivities.find(a => a.type === 'beach');
  const adventureActivity = preferences.selectedActivities.find(a => a.type === 'adventure' || a.type === 'hiking');

  // Only flag if both are high priority
  if (beachActivity?.priority !== 'must-do' || adventureActivity?.priority !== 'must-do') return null;

  return {
    id: 'beach_vs_adventure',
    type: 'beach_vs_adventure',
    title: 'Beach Days vs Adventure Days',
    description: 'Both beach relaxation and adventure are must-dos. These often require different areas.',
    conflictingPreferences: [
      'Beach relaxation is a must-do',
      'Adventure/hiking is a must-do',
    ],
    resolutionOptions: [
      {
        id: 'alternating_days',
        label: 'Alternate days',
        description: 'Mix beach and adventure days throughout the trip',
        impact: 'Balanced itinerary, may need central location',
      },
      {
        id: 'split_trip',
        label: 'Split the trip',
        description: 'First half adventure-focused, second half beach relaxation',
        impact: 'Wind down to relaxation at the end',
      },
      {
        id: 'adventure_first',
        label: 'Front-load adventure',
        description: 'Do intense activities early, beach the rest',
        impact: 'Start active, finish relaxed',
      },
      {
        id: 'custom',
        label: 'Custom balance',
        description: 'Tell me your preferred ratio',
        impact: 'I\'ll allocate days accordingly',
      },
    ],
  };
}

/**
 * Check: Family-friendly vs Party atmosphere
 */
function checkFamilyVsParty(preferences: TripPreferences): Tradeoff | null {
  const hasYoungKids = preferences.children > 0 &&
    preferences.childAges?.some(age => age < 12);

  if (!preferences.hotelVibePreferences || preferences.hotelVibePreferences.length === 0) return null;

  const wantsPartyVibe = preferences.hotelVibePreferences.some(
    v => v.toLowerCase().includes('party') ||
         v.toLowerCase().includes('nightlife') ||
         v.toLowerCase().includes('lively')
  );

  if (!hasYoungKids || !wantsPartyVibe) return null;

  return {
    id: 'family_friendly_vs_party',
    type: 'family_friendly_vs_party',
    title: 'Young Kids vs Party Atmosphere',
    description: 'You have young children but prefer lively/party hotel vibes.',
    conflictingPreferences: [
      `Children ages ${(preferences.childAges || []).join(', ')}`,
      'Preference for lively/party atmosphere',
    ],
    resolutionOptions: [
      {
        id: 'family_resort',
        label: 'Family-focused resort',
        description: 'Choose a family resort with adult amenities',
        impact: 'Kids club for downtime, pool bar for adults',
      },
      {
        id: 'quiet_hotel',
        label: 'Quiet hotel, lively dining out',
        description: 'Stay somewhere calm, go out to lively restaurants',
        impact: 'Peaceful sleep for kids, nightlife outside hotel',
      },
      {
        id: 'adjacent_properties',
        label: 'Adjacent adult/family properties',
        description: 'Some resort groups have both, sharing amenities',
        impact: 'Adults can visit party area, kids stay in family zone',
      },
      {
        id: 'custom',
        label: 'Custom solution',
        description: 'Describe your ideal setup',
        impact: 'I\'ll search for matching options',
      },
    ],
  };
}

/**
 * Apply a tradeoff resolution to preferences
 */
export function applyResolution(
  preferences: TripPreferences,
  tradeoffId: string,
  optionId: string,
  customInput?: string
): TripPreferences {
  const updated = { ...preferences };

  // Add to resolved tradeoffs
  updated.resolvedTradeoffs = [
    ...updated.resolvedTradeoffs,
    {
      tradeoffId,
      selectedOptionId: optionId,
      customInput,
      resolvedAt: new Date(),
    },
  ];

  // Apply specific resolution effects
  switch (tradeoffId) {
    case 'calm_water_vs_surf':
      if (optionId === 'prioritize_surf') {
        // Mark swimming as nice-to-have
        updated.selectedActivities = updated.selectedActivities.map(a =>
          a.type === 'swimming' ? { ...a, priority: 'nice-to-have' as const } : a
        );
      } else if (optionId === 'prioritize_calm') {
        // Reduce surf days
        updated.selectedActivities = updated.selectedActivities.map(a =>
          a.type === 'surf' ? { ...a, targetDays: Math.min(a.targetDays || 3, 3) } : a
        );
      } else if (optionId === 'split_bases') {
        // Ensure we allow multiple bases
        updated.maxBases = Math.max(updated.maxBases, 2);
      }
      break;

    case 'one_base_vs_many_regions':
      if (optionId === 'reduce_bases') {
        updated.maxBases = 2;
      } else if (optionId === 'single_base_day_trips') {
        updated.maxBases = 1;
      }
      break;

    case 'adults_only_vs_nightlife':
      if (optionId === 'skip_nightlife') {
        updated.selectedActivities = updated.selectedActivities.filter(
          a => a.type !== 'nightlife'
        );
      }
      break;

    case 'no_long_drives_vs_multi_stop':
      if (optionId === 'single_base') {
        updated.maxBases = 1;
      }
      break;
  }

  return updated;
}

/**
 * Check if all detected tradeoffs have been resolved
 */
export function allTradeoffsResolved(preferences: TripPreferences): boolean {
  const resolvedIds = new Set(preferences.resolvedTradeoffs.map(r => r.tradeoffId));
  return preferences.detectedTradeoffs.every(t => resolvedIds.has(t.id));
}

/**
 * Get unresolved tradeoffs
 */
export function getUnresolvedTradeoffs(preferences: TripPreferences): Tradeoff[] {
  const resolvedIds = new Set(preferences.resolvedTradeoffs.map(r => r.tradeoffId));
  return preferences.detectedTradeoffs.filter(t => !resolvedIds.has(t.id));
}
