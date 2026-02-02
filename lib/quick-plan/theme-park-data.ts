/**
 * Theme Park Intelligence Data
 * Static data for popular theme parks with ride recommendations, booking windows, and tips
 */

export interface ThemeParkRideGuidance {
  recommended: string[];
  maybeScary: string[];
  avoid: string[];
}

export interface ThemePark {
  id: string;
  name: string;
  location: string;
  parks: string[];
  bookingWindows: {
    diningReservations: number; // days ahead
    lightningLane?: number;
    parkReservations?: number;
    hotelBooking?: number;
  };
  ridesByAge: {
    under5: ThemeParkRideGuidance;
    ages5to8: ThemeParkRideGuidance;
    ages9to12: ThemeParkRideGuidance;
    teens: ThemeParkRideGuidance;
  };
  tips: string[];
  characterDining: {
    name: string;
    characters: string[];
    bookingDifficulty: 'easy' | 'moderate' | 'hard';
  }[];
}

export const THEME_PARKS: Record<string, ThemePark> = {
  'walt-disney-world': {
    id: 'walt-disney-world',
    name: 'Walt Disney World',
    location: 'Orlando, FL',
    parks: ['Magic Kingdom', 'EPCOT', 'Hollywood Studios', 'Animal Kingdom'],
    bookingWindows: {
      diningReservations: 60,
      lightningLane: 7,
      parkReservations: 60,
      hotelBooking: 180,
    },
    ridesByAge: {
      under5: {
        recommended: [
          "It's a Small World",
          'Dumbo the Flying Elephant',
          'The Many Adventures of Winnie the Pooh',
          'Peter Pan\'s Flight',
          'Jungle Cruise',
          'Pirates of the Caribbean',
          'Buzz Lightyear\'s Space Ranger Spin',
          'Kilimanjaro Safaris',
          'Na\'vi River Journey',
        ],
        maybeScary: [
          'Haunted Mansion (dark but not scary)',
          'Big Thunder Mountain (mild coaster)',
        ],
        avoid: [
          'Space Mountain',
          'Expedition Everest',
          'Tower of Terror',
          'Rock \'n\' Roller Coaster',
          'Guardians of the Galaxy: Cosmic Rewind',
        ],
      },
      ages5to8: {
        recommended: [
          'Space Mountain',
          'Big Thunder Mountain Railroad',
          'Splash Mountain',
          'Seven Dwarfs Mine Train',
          'Millennium Falcon: Smugglers Run',
          'Slinky Dog Dash',
          'Flight of Passage',
        ],
        maybeScary: [
          'Tower of Terror',
          'Expedition Everest',
        ],
        avoid: [
          'Rock \'n\' Roller Coaster',
          'Guardians of the Galaxy: Cosmic Rewind',
        ],
      },
      ages9to12: {
        recommended: [
          'All rides appropriate',
          'Tower of Terror',
          'Expedition Everest',
          'Rock \'n\' Roller Coaster',
          'Guardians of the Galaxy: Cosmic Rewind',
          'Tron Lightcycle Run',
        ],
        maybeScary: [],
        avoid: [],
      },
      teens: {
        recommended: [
          'All thrill rides',
          'Tron Lightcycle Run',
          'Guardians of the Galaxy: Cosmic Rewind',
          'Star Wars: Rise of the Resistance',
          'Avatar Flight of Passage',
        ],
        maybeScary: [],
        avoid: [],
      },
    },
    tips: [
      'Arrive 30 minutes before park opening (rope drop) for shortest wait times',
      'Genie+ ($15-35/day) is worth it for visits of 3+ days',
      'Mobile order ALL meals to save 20-30 minutes each',
      'Schedule a rest day after every 2 park days, especially with young kids',
      'Magic Kingdom is best for young kids, Hollywood Studios for Star Wars fans',
      'Download My Disney Experience app before your trip',
      'Stay on property for early entry benefits',
    ],
    characterDining: [
      {
        name: "Chef Mickey's",
        characters: ['Mickey', 'Minnie', 'Donald', 'Goofy', 'Pluto'],
        bookingDifficulty: 'moderate',
      },
      {
        name: "Cinderella's Royal Table",
        characters: ['Cinderella', 'Princesses'],
        bookingDifficulty: 'hard',
      },
      {
        name: 'Tusker House',
        characters: ['Donald', 'Daisy', 'Mickey', 'Goofy'],
        bookingDifficulty: 'easy',
      },
      {
        name: "'Ohana",
        characters: ['Lilo', 'Stitch', 'Mickey', 'Pluto'],
        bookingDifficulty: 'moderate',
      },
    ],
  },

  'universal-orlando': {
    id: 'universal-orlando',
    name: 'Universal Orlando Resort',
    location: 'Orlando, FL',
    parks: ['Universal Studios Florida', 'Islands of Adventure', 'Volcano Bay'],
    bookingWindows: {
      diningReservations: 60,
      hotelBooking: 180,
    },
    ridesByAge: {
      under5: {
        recommended: [
          'Despicable Me Minion Mayhem',
          'E.T. Adventure',
          'The Cat in the Hat',
          'One Fish, Two Fish, Red Fish, Blue Fish',
          'Pteranodon Flyers',
          'Hogwarts Express',
        ],
        maybeScary: [
          'Harry Potter and the Forbidden Journey (intense)',
        ],
        avoid: [
          'Jurassic World VelociCoaster',
          'Hagrid\'s Magical Creatures Motorbike Adventure',
          'Incredible Hulk Coaster',
          'Hollywood Rip Ride Rockit',
        ],
      },
      ages5to8: {
        recommended: [
          'Harry Potter and the Forbidden Journey',
          'Hagrid\'s Magical Creatures Motorbike Adventure',
          'Jurassic World: The Ride',
          'Revenge of the Mummy',
        ],
        maybeScary: [
          'Incredible Hulk Coaster',
        ],
        avoid: [
          'Jurassic World VelociCoaster',
          'Hollywood Rip Ride Rockit',
        ],
      },
      ages9to12: {
        recommended: [
          'All rides including VelociCoaster',
          'Incredible Hulk Coaster',
        ],
        maybeScary: [],
        avoid: [],
      },
      teens: {
        recommended: [
          'VelociCoaster (best coaster in Florida)',
          'Hagrid\'s Motorbike Adventure',
          'Incredible Hulk Coaster',
          'Hollywood Rip Ride Rockit',
        ],
        maybeScary: [],
        avoid: [],
      },
    },
    tips: [
      'Stay at a Universal hotel for free Express Pass (Portofino, Hard Rock, Royal Pacific)',
      'Diagon Alley and Hogsmeade are must-sees for Harry Potter fans',
      'VelociCoaster often has shorter waits in the last hour before closing',
      'Universal Express Pass is expensive but significantly reduces wait times',
      'Volcano Bay requires TapuTapu wearable - arrive early for best ride times',
    ],
    characterDining: [
      {
        name: "Character Breakfast at Cafe La Bamba",
        characters: ['Minions', 'Shrek', 'Donkey'],
        bookingDifficulty: 'easy',
      },
    ],
  },

  'disneyland': {
    id: 'disneyland',
    name: 'Disneyland Resort',
    location: 'Anaheim, CA',
    parks: ['Disneyland Park', 'Disney California Adventure'],
    bookingWindows: {
      diningReservations: 60,
      lightningLane: 7,
    },
    ridesByAge: {
      under5: {
        recommended: [
          "It's a Small World",
          'Dumbo the Flying Elephant',
          'Jungle Cruise',
          'Pirates of the Caribbean',
          "Buzz Lightyear Astro Blasters",
          "Finding Nemo Submarine Voyage",
          'Monsters, Inc. Mike & Sulley to the Rescue!',
        ],
        maybeScary: [
          'Haunted Mansion',
          'Big Thunder Mountain Railroad',
        ],
        avoid: [
          'Space Mountain',
          'Matterhorn Bobsleds',
          'Incredicoaster',
          'Guardians of the Galaxy - Mission: BREAKOUT!',
        ],
      },
      ages5to8: {
        recommended: [
          'Space Mountain',
          'Big Thunder Mountain Railroad',
          'Matterhorn Bobsleds',
          'Star Wars: Rise of the Resistance',
          'Radiator Springs Racers',
        ],
        maybeScary: [
          'Guardians of the Galaxy - Mission: BREAKOUT!',
          'Incredicoaster',
        ],
        avoid: [],
      },
      ages9to12: {
        recommended: [
          'All rides appropriate',
          'Guardians of the Galaxy - Mission: BREAKOUT!',
          'Incredicoaster',
        ],
        maybeScary: [],
        avoid: [],
      },
      teens: {
        recommended: [
          'All thrill rides',
          'Star Wars: Rise of the Resistance',
          'Radiator Springs Racers',
          'Guardians of the Galaxy',
        ],
        maybeScary: [],
        avoid: [],
      },
    },
    tips: [
      'Disneyland is more compact than WDW - you can do both parks in 2-3 days',
      'Rope drop Rise of the Resistance or Radiator Springs Racers',
      'Genie+ works differently than WDW - research before buying',
      'Downtown Disney has free entry for shopping and dining',
      'Stay at a Good Neighbor hotel for proximity without Disney prices',
    ],
    characterDining: [
      {
        name: "Goofy's Kitchen",
        characters: ['Goofy', 'Various Characters'],
        bookingDifficulty: 'moderate',
      },
      {
        name: 'Storytellers Cafe',
        characters: ['Chip', 'Dale', 'Various Characters'],
        bookingDifficulty: 'easy',
      },
    ],
  },
};

// Helper to detect if destination involves theme parks
export function detectThemeParkDestination(destination: string): string | null {
  const lower = destination.toLowerCase();

  if (lower.includes('orlando') || lower.includes('disney world') || lower.includes('universal orlando')) {
    return 'walt-disney-world'; // Return WDW as primary, but both parks are in Orlando
  }
  if (lower.includes('anaheim') || lower.includes('disneyland') || lower.includes('california adventure')) {
    return 'disneyland';
  }

  return null;
}

// Get age category from child age
function getAgeCategory(age: number): 'under5' | 'ages5to8' | 'ages9to12' | 'teens' {
  if (age < 5) return 'under5';
  if (age < 9) return 'ages5to8';
  if (age < 13) return 'ages9to12';
  return 'teens';
}

// Get theme park guidance based on children's ages
export interface ThemeParkGuidance {
  park: ThemePark;
  recommendedRides: string[];
  maybeScary: string[];
  avoid: string[];
  bookingReminders: string[];
  tips: string[];
  characterDining: ThemePark['characterDining'];
  youngestChildAge: number;
}

export function getThemeParkGuidance(
  parkId: string,
  childAges: number[]
): ThemeParkGuidance | null {
  const park = THEME_PARKS[parkId];
  if (!park) return null;

  // Use youngest child's age for most conservative recommendations
  const youngestAge = childAges.length > 0 ? Math.min(...childAges) : 13;
  const ageCategory = getAgeCategory(youngestAge);
  const ageGuidance = park.ridesByAge[ageCategory];

  return {
    park,
    recommendedRides: ageGuidance.recommended,
    maybeScary: ageGuidance.maybeScary,
    avoid: ageGuidance.avoid,
    bookingReminders: Object.entries(park.bookingWindows).map(([type, days]) => {
      const typeLabel = type.replace(/([A-Z])/g, ' $1').toLowerCase().trim();
      return `${typeLabel}: Book ${days} days before your trip`;
    }),
    tips: park.tips,
    characterDining: park.characterDining,
    youngestChildAge: youngestAge,
  };
}

// Generate theme park itinerary suggestions
export function generateThemeParkItinerary(
  parkId: string,
  nights: number,
  childAges: number[]
): string[] {
  const park = THEME_PARKS[parkId];
  if (!park) return [];

  const suggestions: string[] = [];
  const parkCount = park.parks.length;
  const hasYoungKids = childAges.some(age => age < 6);

  if (parkId === 'walt-disney-world') {
    if (nights <= 3) {
      suggestions.push('Focus on Magic Kingdom + one other park');
      suggestions.push('Skip park hopping to maximize time');
    } else if (nights <= 5) {
      suggestions.push('Day 1: Magic Kingdom (arrive early for character meets)');
      suggestions.push('Day 2: Animal Kingdom (Safari in morning)');
      suggestions.push('Day 3: Rest day - pool, Disney Springs');
      suggestions.push('Day 4: Hollywood Studios (Star Wars focus)');
      suggestions.push('Day 5: EPCOT (World Showcase in evening)');
    } else {
      suggestions.push('With 6+ nights, you can do each park twice');
      suggestions.push('Schedule rest days after every 2 park days');
      suggestions.push('Consider a water park day (Typhoon Lagoon or Blizzard Beach)');
    }

    if (hasYoungKids) {
      suggestions.push('Plan for midday nap breaks - return to hotel 1-4pm');
      suggestions.push('Book character dining for guaranteed character meets');
    }
  } else if (parkId === 'universal-orlando') {
    if (nights <= 2) {
      suggestions.push('Day 1: Islands of Adventure (focus on Harry Potter)');
      suggestions.push('Day 2: Universal Studios (Diagon Alley + rides)');
    } else {
      suggestions.push('Add Volcano Bay water park on day 3');
      suggestions.push('Stay on-site for unlimited Express Pass');
    }
  }

  return suggestions;
}
