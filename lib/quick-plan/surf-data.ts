/**
 * Surf Intelligence Data
 * Data for surf-focused trips including spots, schools, and seasonal conditions
 */

import type { SurfingLevel } from '@/types/quick-plan';

export interface SurfSpot {
  name: string;
  level: SurfingLevel[];
  bestMonths: number[]; // 1-12
  crowdLevel: 'low' | 'medium' | 'high' | 'very_high';
  waveType: string;
  waveHeight: string; // typical range
  tips: string[];
  waterTemp: string;
  hazards?: string[];
}

export interface SurfSchool {
  name: string;
  level: SurfingLevel[];
  redditMentions?: number;
  hasFemaleInstructors?: boolean;
  priceRange?: string;
  website?: string;
}

export interface SurfDestination {
  id: string;
  name: string;
  country: string;
  spots: SurfSpot[];
  surfSchools: SurfSchool[];
  bestOverallMonths: number[];
  generalTips: string[];
  boardRentalAvailable: boolean;
  boardRepairAvailable: boolean;
}

export const SURF_DESTINATIONS: Record<string, SurfDestination> = {
  'bali': {
    id: 'bali',
    name: 'Bali',
    country: 'Indonesia',
    bestOverallMonths: [4, 5, 6, 7, 8, 9], // Dry season
    spots: [
      {
        name: 'Kuta Beach',
        level: ['never', 'beginner'],
        bestMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        crowdLevel: 'very_high',
        waveType: 'Beach break, gentle',
        waveHeight: '1-3ft',
        tips: ['Best for first-timers', 'Lots of surf schools', 'Very crowded'],
        waterTemp: '27-29°C year-round',
      },
      {
        name: 'Canggu (Batu Bolong)',
        level: ['beginner', 'intermediate'],
        bestMonths: [4, 5, 6, 7, 8, 9, 10],
        crowdLevel: 'high',
        waveType: 'Beach break, fun waves',
        waveHeight: '2-5ft',
        tips: ['Good progression spot', 'Trendy area with cafes', 'Can get crowded afternoons'],
        waterTemp: '27-29°C',
      },
      {
        name: 'Uluwatu',
        level: ['intermediate', 'advanced'],
        bestMonths: [4, 5, 6, 7, 8, 9],
        crowdLevel: 'high',
        waveType: 'Reef break, left',
        waveHeight: '4-10ft',
        tips: ['World-class wave', 'Arrive before 7am to beat crowds', 'Bring reef booties'],
        waterTemp: '26-28°C',
        hazards: ['Sharp reef', 'Strong currents', 'Crowded lineup'],
      },
      {
        name: 'Padang Padang',
        level: ['advanced'],
        bestMonths: [5, 6, 7, 8],
        crowdLevel: 'medium',
        waveType: 'Reef break, barreling left',
        waveHeight: '4-8ft (needs swell)',
        tips: ['Famous barrel', 'Needs solid swell to work', 'Expert only'],
        waterTemp: '26-28°C',
        hazards: ['Shallow reef', 'Heavy waves'],
      },
      {
        name: 'Medewi',
        level: ['intermediate', 'advanced'],
        bestMonths: [4, 5, 6, 7, 8, 9],
        crowdLevel: 'low',
        waveType: 'Point break, long left',
        waveHeight: '3-6ft',
        tips: ['Long mellow rides', 'Less crowded', '3 hours from Canggu'],
        waterTemp: '27-29°C',
      },
    ],
    surfSchools: [
      {
        name: 'Odysseys Surf School',
        level: ['never', 'beginner'],
        redditMentions: 15,
        hasFemaleInstructors: true,
        priceRange: '$40-60 for 2hr lesson',
      },
      {
        name: 'Rapture Surf Camp',
        level: ['beginner', 'intermediate'],
        redditMentions: 8,
        hasFemaleInstructors: true,
        priceRange: '$60-80/day coaching',
      },
      {
        name: 'Pro Surf School Bali',
        level: ['never', 'beginner', 'intermediate'],
        redditMentions: 12,
        hasFemaleInstructors: true,
        priceRange: '$35-50 for lesson',
      },
    ],
    generalTips: [
      'Dry season (April-October) has most consistent surf',
      'Wet season can still have good waves, fewer crowds',
      'Uluwatu at sunrise before crowds is magical',
      'Rent a motorbike to chase swells around the island',
      'Board bags are usually free on domestic Bali flights',
    ],
    boardRentalAvailable: true,
    boardRepairAvailable: true,
  },

  'costa-rica': {
    id: 'costa-rica',
    name: 'Costa Rica',
    country: 'Costa Rica',
    bestOverallMonths: [3, 4, 5, 6, 7, 8, 9], // Dry season + summer swells
    spots: [
      {
        name: 'Tamarindo',
        level: ['never', 'beginner', 'intermediate'],
        bestMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        crowdLevel: 'high',
        waveType: 'Beach break, forgiving',
        waveHeight: '2-5ft',
        tips: ['Great for learning', 'Lots of schools', 'Busy tourist town'],
        waterTemp: '27-29°C',
      },
      {
        name: 'Nosara (Playa Guiones)',
        level: ['beginner', 'intermediate'],
        bestMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        crowdLevel: 'medium',
        waveType: 'Beach break, consistent',
        waveHeight: '3-6ft',
        tips: ['Yoga + surf town', 'Very consistent waves', 'Great for female solo travelers'],
        waterTemp: '27-29°C',
      },
      {
        name: 'Santa Teresa',
        level: ['intermediate', 'advanced'],
        bestMonths: [3, 4, 5, 6, 7, 8, 9, 10],
        crowdLevel: 'medium',
        waveType: 'Beach/reef break mix',
        waveHeight: '3-8ft',
        tips: ['More party vibe than Nosara', 'Great for intermediate progression', 'Sunset sessions are amazing'],
        waterTemp: '27-29°C',
      },
      {
        name: 'Pavones',
        level: ['intermediate', 'advanced'],
        bestMonths: [4, 5, 6, 7, 8, 9, 10],
        crowdLevel: 'low',
        waveType: 'Point break, legendary left',
        waveHeight: '4-10ft',
        tips: ['One of longest lefts in world', 'Remote location', 'Need south swell to fire'],
        waterTemp: '27-29°C',
      },
    ],
    surfSchools: [
      {
        name: 'Safari Surf School',
        level: ['never', 'beginner', 'intermediate'],
        redditMentions: 20,
        hasFemaleInstructors: true,
        priceRange: '$65-85 for lesson',
      },
      {
        name: 'Del Mar Surf Camp',
        level: ['beginner', 'intermediate'],
        redditMentions: 12,
        hasFemaleInstructors: true,
        priceRange: "Women's surf weeks available",
      },
      {
        name: 'Witch\'s Rock Surf Camp',
        level: ['never', 'beginner', 'intermediate'],
        redditMentions: 25,
        hasFemaleInstructors: true,
        priceRange: 'All-inclusive packages',
      },
    ],
    generalTips: [
      'Nosara is safest/best for solo female surfers',
      'Santa Teresa more party scene, Nosara more chill/yoga',
      'Book surf lessons in advance during peak season',
      'Rent a 4x4 - many surf spots need dirt road access',
      'Bring reef-safe sunscreen',
    ],
    boardRentalAvailable: true,
    boardRepairAvailable: true,
  },

  'hawaii': {
    id: 'hawaii',
    name: 'Hawaii',
    country: 'USA',
    bestOverallMonths: [11, 12, 1, 2, 3], // North shore winter swells
    spots: [
      {
        name: 'Waikiki',
        level: ['never', 'beginner'],
        bestMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        crowdLevel: 'very_high',
        waveType: 'Reef break, gentle longboard waves',
        waveHeight: '1-4ft',
        tips: ['Birthplace of surfing', 'Perfect for beginners', 'Rent a soft-top longboard'],
        waterTemp: '24-27°C',
      },
      {
        name: 'North Shore - Pipeline',
        level: ['advanced'],
        bestMonths: [11, 12, 1, 2],
        crowdLevel: 'high',
        waveType: 'Reef break, heavy barrel',
        waveHeight: '6-20ft+',
        tips: ['Expert only', 'One of most dangerous waves', 'Watch from beach if not experienced'],
        waterTemp: '24-26°C',
        hazards: ['Extremely shallow reef', 'Heavy waves', 'Localism'],
      },
      {
        name: 'Honolua Bay',
        level: ['intermediate', 'advanced'],
        bestMonths: [11, 12, 1, 2, 3],
        crowdLevel: 'medium',
        waveType: 'Point break, right',
        waveHeight: '4-12ft',
        tips: ['Classic Maui wave', 'Needs north swell', 'Respect the lineup'],
        waterTemp: '24-27°C',
      },
    ],
    surfSchools: [
      {
        name: 'Hans Hedemann Surf School',
        level: ['never', 'beginner', 'intermediate'],
        redditMentions: 18,
        hasFemaleInstructors: true,
        priceRange: '$100-150 for private lesson',
      },
      {
        name: 'Ty Gurney Surf School',
        level: ['never', 'beginner'],
        redditMentions: 15,
        hasFemaleInstructors: true,
        priceRange: '$80-120 for group lesson',
      },
    ],
    generalTips: [
      'North Shore (Nov-Feb) is for experienced surfers only during big swells',
      'South Shore (Waikiki) is consistent year-round for beginners',
      'Respect locals - Hawaii has strong surf culture',
      'Board bags usually cost $75-150 extra on airlines',
      'Reef shoes recommended for many spots',
    ],
    boardRentalAvailable: true,
    boardRepairAvailable: true,
  },

  'portugal': {
    id: 'portugal',
    name: 'Portugal',
    country: 'Portugal',
    bestOverallMonths: [9, 10, 11, 3, 4, 5], // Shoulder seasons best
    spots: [
      {
        name: 'Peniche',
        level: ['beginner', 'intermediate', 'advanced'],
        bestMonths: [3, 4, 5, 9, 10, 11],
        crowdLevel: 'medium',
        waveType: 'Multiple breaks, beach and reef',
        waveHeight: '2-10ft',
        tips: ['Surf camp capital of Europe', 'Works on any swell direction', 'Supertubos is world-class'],
        waterTemp: '14-20°C',
      },
      {
        name: 'Ericeira',
        level: ['beginner', 'intermediate', 'advanced'],
        bestMonths: [3, 4, 5, 9, 10, 11],
        crowdLevel: 'medium',
        waveType: 'World Surfing Reserve, multiple breaks',
        waveHeight: '2-12ft',
        tips: ['Cute fishing village', 'Great food scene', 'Coxos is a world-class right'],
        waterTemp: '14-20°C',
      },
      {
        name: 'Nazare',
        level: ['watch_only', 'advanced'],
        bestMonths: [10, 11, 12, 1, 2],
        crowdLevel: 'low',
        waveType: 'Big wave spot',
        waveHeight: '20-80ft',
        tips: ['Famous big wave spot', 'Watch from cliff, don\'t paddle out', 'Incredible to witness'],
        waterTemp: '14-17°C',
        hazards: ['Biggest waves on earth', 'Experts with jet ski support only'],
      },
    ],
    surfSchools: [
      {
        name: 'Baleal Surf Camp',
        level: ['never', 'beginner', 'intermediate'],
        redditMentions: 30,
        hasFemaleInstructors: true,
        priceRange: '€40-60 for lesson, €400-600/week packages',
      },
      {
        name: 'Ericeira Surf & Yoga',
        level: ['beginner', 'intermediate'],
        redditMentions: 12,
        hasFemaleInstructors: true,
        priceRange: '€500-800/week all-inclusive',
      },
    ],
    generalTips: [
      'Water is COLD - bring or rent a wetsuit (4/3mm winter, 3/2mm summer)',
      'Peniche and Ericeira are both great bases',
      'Shoulder seasons have best waves and fewer crowds',
      'Rent a car to explore different breaks',
      'Nazare big wave season is incredible to watch (Nov-Feb)',
    ],
    boardRentalAvailable: true,
    boardRepairAvailable: true,
  },
};

// Get surf recommendations based on skill level and travel month
export interface SurfRecommendation {
  destination: SurfDestination;
  suitableSpots: SurfSpot[];
  recommendedSchools: SurfSchool[];
  seasonAdvice: string;
  overallScore: number; // 0-100
}

export function getSurfRecommendations(
  destinationId: string,
  level: SurfingLevel,
  travelMonth: number
): SurfRecommendation | null {
  const dest = SURF_DESTINATIONS[destinationId.toLowerCase()];
  if (!dest) return null;

  // Filter spots by skill level and season
  const suitableSpots = dest.spots.filter(spot => {
    const levelMatch = spot.level.includes(level) ||
      (level === 'beginner' && spot.level.includes('never'));
    const seasonMatch = spot.bestMonths.includes(travelMonth);
    return levelMatch && seasonMatch;
  });

  // Filter schools by level
  const recommendedSchools = dest.surfSchools.filter(school =>
    school.level.includes(level) || (level === 'beginner' && school.level.includes('never'))
  );

  // Calculate season score
  const isIdealSeason = dest.bestOverallMonths.includes(travelMonth);
  const seasonAdvice = isIdealSeason
    ? `${getMonthName(travelMonth)} is a great time for surfing in ${dest.name}!`
    : `${getMonthName(travelMonth)} is not peak season, but you can still find waves. Expect ${getSeasonNote(dest.id, travelMonth)}.`;

  // Calculate overall score
  let score = 50;
  if (isIdealSeason) score += 30;
  if (suitableSpots.length >= 3) score += 10;
  if (suitableSpots.length >= 1) score += 10;
  if (recommendedSchools.length >= 2) score += 10;
  if (level === 'beginner' && recommendedSchools.length > 0) score += 10;

  return {
    destination: dest,
    suitableSpots,
    recommendedSchools,
    seasonAdvice,
    overallScore: Math.min(100, score),
  };
}

function getMonthName(month: number): string {
  const months = ['', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  return months[month] || '';
}

function getSeasonNote(destId: string, month: number): string {
  if (destId === 'bali' && [11, 12, 1, 2, 3].includes(month)) {
    return 'wet season with smaller, inconsistent swells but fewer crowds';
  }
  if (destId === 'hawaii' && [6, 7, 8].includes(month)) {
    return 'flat on the North Shore, but South Shore has waves';
  }
  if (destId === 'portugal' && [6, 7, 8].includes(month)) {
    return 'smaller waves but warmer water and good for beginners';
  }
  return 'variable conditions';
}

// Detect if destination is a known surf destination
export function detectSurfDestination(destination: string): string | null {
  const lower = destination.toLowerCase();

  if (lower.includes('bali') || lower.includes('indonesia')) return 'bali';
  if (lower.includes('costa rica')) return 'costa-rica';
  if (lower.includes('hawaii') || lower.includes('oahu') || lower.includes('maui')) return 'hawaii';
  if (lower.includes('portugal') || lower.includes('peniche') || lower.includes('ericeira')) return 'portugal';

  return null;
}
