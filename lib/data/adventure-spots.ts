/**
 * FIX 3.22-3.30: Adventure Activity Data Enrichments
 * Surf spots with skill levels, dive sites with certification requirements
 * Used to match activities to traveler skill levels
 */

// ============================================================================
// SURF SPOTS
// ============================================================================

export type SurfSkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type BreakType = 'beach' | 'point' | 'reef' | 'river';
export type WaveType = 'mellow' | 'hollow' | 'powerful' | 'long';

export interface SurfSpot {
  id: string;
  name: string;
  location: string;
  country: string;
  region?: string;
  skillLevel: SurfSkillLevel;
  minSkillLevel: SurfSkillLevel;
  breakType: BreakType;
  waveType: WaveType;
  bestSeason: string[];
  hazards: string[];
  hasSurfSchool: boolean;
  boardRental: boolean;
  crowdLevel: 'empty' | 'uncrowded' | 'moderate' | 'crowded' | 'very_crowded';
  description: string;
  lat: number;
  lng: number;
}

export const SURF_SPOTS: Record<string, SurfSpot[]> = {
  'bali': [
    {
      id: 'kuta-beach',
      name: 'Kuta Beach',
      location: 'Kuta',
      country: 'Indonesia',
      region: 'Bali',
      skillLevel: 'beginner',
      minSkillLevel: 'beginner',
      breakType: 'beach',
      waveType: 'mellow',
      bestSeason: ['apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct'],
      hazards: ['crowds', 'rip_currents'],
      hasSurfSchool: true,
      boardRental: true,
      crowdLevel: 'very_crowded',
      description: 'Perfect for beginners with gentle waves and plenty of surf schools',
      lat: -8.7185,
      lng: 115.1686,
    },
    {
      id: 'uluwatu',
      name: 'Uluwatu',
      location: 'Uluwatu',
      country: 'Indonesia',
      region: 'Bali',
      skillLevel: 'advanced',
      minSkillLevel: 'advanced',
      breakType: 'reef',
      waveType: 'powerful',
      bestSeason: ['apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct'],
      hazards: ['sharp_reef', 'strong_currents', 'cave_entry'],
      hasSurfSchool: false,
      boardRental: true,
      crowdLevel: 'crowded',
      description: 'World-class left-hander, for experienced surfers only',
      lat: -8.8291,
      lng: 115.0849,
    },
    {
      id: 'padang-padang',
      name: 'Padang Padang',
      location: 'Uluwatu',
      country: 'Indonesia',
      region: 'Bali',
      skillLevel: 'expert',
      minSkillLevel: 'advanced',
      breakType: 'reef',
      waveType: 'hollow',
      bestSeason: ['jun', 'jul', 'aug'],
      hazards: ['shallow_reef', 'heavy_waves', 'crowds'],
      hasSurfSchool: false,
      boardRental: true,
      crowdLevel: 'crowded',
      description: 'Barreling left, hosts Rip Curl Cup, experts only when big',
      lat: -8.8145,
      lng: 115.0983,
    },
    {
      id: 'canggu',
      name: 'Batu Bolong (Canggu)',
      location: 'Canggu',
      country: 'Indonesia',
      region: 'Bali',
      skillLevel: 'intermediate',
      minSkillLevel: 'beginner',
      breakType: 'beach',
      waveType: 'mellow',
      bestSeason: ['apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct'],
      hazards: ['crowds', 'rip_currents'],
      hasSurfSchool: true,
      boardRental: true,
      crowdLevel: 'very_crowded',
      description: 'Popular beach break with waves for all levels',
      lat: -8.6560,
      lng: 115.1318,
    },
  ],
  'hawaii': [
    {
      id: 'waikiki',
      name: 'Waikiki',
      location: 'Honolulu',
      country: 'USA',
      region: 'Oahu',
      skillLevel: 'beginner',
      minSkillLevel: 'beginner',
      breakType: 'reef',
      waveType: 'mellow',
      bestSeason: ['may', 'jun', 'jul', 'aug', 'sep'],
      hazards: ['crowds', 'reef'],
      hasSurfSchool: true,
      boardRental: true,
      crowdLevel: 'very_crowded',
      description: 'Birthplace of modern surfing, perfect for learning',
      lat: 21.2760,
      lng: -157.8270,
    },
    {
      id: 'pipeline',
      name: 'Banzai Pipeline',
      location: 'North Shore',
      country: 'USA',
      region: 'Oahu',
      skillLevel: 'expert',
      minSkillLevel: 'expert',
      breakType: 'reef',
      waveType: 'hollow',
      bestSeason: ['nov', 'dec', 'jan', 'feb'],
      hazards: ['shallow_reef', 'extremely_powerful', 'crowds', 'localism'],
      hasSurfSchool: false,
      boardRental: false,
      crowdLevel: 'very_crowded',
      description: 'Most famous and dangerous wave in the world',
      lat: 21.6650,
      lng: -158.0530,
    },
    {
      id: 'sunset-beach',
      name: 'Sunset Beach',
      location: 'North Shore',
      country: 'USA',
      region: 'Oahu',
      skillLevel: 'expert',
      minSkillLevel: 'advanced',
      breakType: 'reef',
      waveType: 'powerful',
      bestSeason: ['nov', 'dec', 'jan', 'feb'],
      hazards: ['large_waves', 'strong_currents', 'shifting_peaks'],
      hasSurfSchool: false,
      boardRental: false,
      crowdLevel: 'crowded',
      description: 'Classic big wave spot, part of Triple Crown',
      lat: 21.6780,
      lng: -158.0420,
    },
  ],
  'portugal': [
    {
      id: 'nazare',
      name: 'Nazaré',
      location: 'Nazaré',
      country: 'Portugal',
      skillLevel: 'expert',
      minSkillLevel: 'expert',
      breakType: 'beach',
      waveType: 'powerful',
      bestSeason: ['oct', 'nov', 'dec', 'jan', 'feb', 'mar'],
      hazards: ['giant_waves', 'extreme_currents', 'life_threatening'],
      hasSurfSchool: false,
      boardRental: false,
      crowdLevel: 'uncrowded',
      description: 'Biggest waves in the world, tow-in only, spectator spot',
      lat: 39.6010,
      lng: -9.0710,
    },
    {
      id: 'peniche',
      name: 'Supertubos (Peniche)',
      location: 'Peniche',
      country: 'Portugal',
      skillLevel: 'advanced',
      minSkillLevel: 'intermediate',
      breakType: 'beach',
      waveType: 'hollow',
      bestSeason: ['sep', 'oct', 'nov'],
      hazards: ['powerful_shorebreak', 'currents'],
      hasSurfSchool: true,
      boardRental: true,
      crowdLevel: 'crowded',
      description: 'European Pipeline, hosts WSL events',
      lat: 39.3430,
      lng: -9.3670,
    },
    {
      id: 'ericeira',
      name: 'Ribeira d\'Ilhas',
      location: 'Ericeira',
      country: 'Portugal',
      skillLevel: 'intermediate',
      minSkillLevel: 'intermediate',
      breakType: 'point',
      waveType: 'long',
      bestSeason: ['sep', 'oct', 'nov', 'mar', 'apr', 'may'],
      hazards: ['rocks', 'currents'],
      hasSurfSchool: true,
      boardRental: true,
      crowdLevel: 'moderate',
      description: 'World Surfing Reserve, classic right point break',
      lat: 38.9640,
      lng: -9.4190,
    },
  ],
  'costa-rica': [
    {
      id: 'tamarindo',
      name: 'Tamarindo',
      location: 'Guanacaste',
      country: 'Costa Rica',
      skillLevel: 'beginner',
      minSkillLevel: 'beginner',
      breakType: 'beach',
      waveType: 'mellow',
      bestSeason: ['dec', 'jan', 'feb', 'mar', 'apr'],
      hazards: ['crocodiles_nearby', 'crowds'],
      hasSurfSchool: true,
      boardRental: true,
      crowdLevel: 'crowded',
      description: 'Great for beginners, warm water year-round',
      lat: 10.2992,
      lng: -85.8372,
    },
    {
      id: 'santa-teresa',
      name: 'Santa Teresa',
      location: 'Nicoya Peninsula',
      country: 'Costa Rica',
      skillLevel: 'intermediate',
      minSkillLevel: 'beginner',
      breakType: 'beach',
      waveType: 'mellow',
      bestSeason: ['dec', 'jan', 'feb', 'mar', 'apr', 'may'],
      hazards: ['rocks', 'currents'],
      hasSurfSchool: true,
      boardRental: true,
      crowdLevel: 'moderate',
      description: 'Consistent beach breaks, bohemian surf town vibe',
      lat: 9.6431,
      lng: -85.1688,
    },
  ],
  'australia': [
    {
      id: 'bondi',
      name: 'Bondi Beach',
      location: 'Sydney',
      country: 'Australia',
      region: 'NSW',
      skillLevel: 'intermediate',
      minSkillLevel: 'beginner',
      breakType: 'beach',
      waveType: 'mellow',
      bestSeason: ['mar', 'apr', 'may', 'sep', 'oct', 'nov'],
      hazards: ['crowds', 'rips', 'sharks'],
      hasSurfSchool: true,
      boardRental: true,
      crowdLevel: 'very_crowded',
      description: 'Iconic Sydney beach with waves for all levels',
      lat: -33.8908,
      lng: 151.2743,
    },
    {
      id: 'snapper-rocks',
      name: 'Snapper Rocks',
      location: 'Gold Coast',
      country: 'Australia',
      region: 'Queensland',
      skillLevel: 'advanced',
      minSkillLevel: 'intermediate',
      breakType: 'point',
      waveType: 'long',
      bestSeason: ['feb', 'mar', 'apr', 'may'],
      hazards: ['crowds', 'localism', 'rocks'],
      hasSurfSchool: false,
      boardRental: true,
      crowdLevel: 'very_crowded',
      description: 'Start of the Superbank, world-class right point',
      lat: -28.1667,
      lng: 153.5500,
    },
    {
      id: 'bells-beach',
      name: 'Bells Beach',
      location: 'Torquay',
      country: 'Australia',
      region: 'Victoria',
      skillLevel: 'advanced',
      minSkillLevel: 'intermediate',
      breakType: 'reef',
      waveType: 'powerful',
      bestSeason: ['mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep'],
      hazards: ['cold_water', 'sharks', 'reef'],
      hasSurfSchool: false,
      boardRental: true,
      crowdLevel: 'moderate',
      description: 'Home of the Rip Curl Pro, iconic Australian break',
      lat: -38.3667,
      lng: 144.2833,
    },
  ],
  'sri-lanka': [
    {
      id: 'arugam-bay',
      name: 'Arugam Bay',
      location: 'Eastern Province',
      country: 'Sri Lanka',
      skillLevel: 'intermediate',
      minSkillLevel: 'beginner',
      breakType: 'point',
      waveType: 'long',
      bestSeason: ['apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct'],
      hazards: ['rocks', 'sea_urchins'],
      hasSurfSchool: true,
      boardRental: true,
      crowdLevel: 'moderate',
      description: 'Mellow right point break, great for progression',
      lat: 6.8408,
      lng: 81.8342,
    },
    {
      id: 'hikkaduwa',
      name: 'Hikkaduwa',
      location: 'Southern Province',
      country: 'Sri Lanka',
      skillLevel: 'beginner',
      minSkillLevel: 'beginner',
      breakType: 'reef',
      waveType: 'mellow',
      bestSeason: ['nov', 'dec', 'jan', 'feb', 'mar', 'apr'],
      hazards: ['reef', 'currents'],
      hasSurfSchool: true,
      boardRental: true,
      crowdLevel: 'moderate',
      description: 'South coast surf town with beginner-friendly waves',
      lat: 6.1400,
      lng: 80.1000,
    },
  ],
};

// ============================================================================
// DIVE SITES
// ============================================================================

export type DiveCertLevel = 'discover' | 'open_water' | 'advanced' | 'rescue' | 'divemaster' | 'technical';
export type DiveType = 'reef' | 'wreck' | 'wall' | 'drift' | 'cave' | 'muck' | 'pelagic';

export interface DiveSite {
  id: string;
  name: string;
  location: string;
  country: string;
  region?: string;
  minCertification: DiveCertLevel;
  recommendedCert: DiveCertLevel;
  diveTypes: DiveType[];
  maxDepth: number; // meters
  visibility: { min: number; max: number; unit: 'm' };
  waterTemp: { min: number; max: number; unit: 'C' };
  bestSeason: string[];
  highlights: string[];
  hazards: string[];
  currentStrength: 'none' | 'mild' | 'moderate' | 'strong' | 'extreme';
  description: string;
  lat: number;
  lng: number;
}

export const DIVE_SITES: Record<string, DiveSite[]> = {
  'thailand': [
    {
      id: 'similan-islands',
      name: 'Similan Islands',
      location: 'Phang Nga',
      country: 'Thailand',
      minCertification: 'open_water',
      recommendedCert: 'advanced',
      diveTypes: ['reef', 'wall', 'pelagic'],
      maxDepth: 40,
      visibility: { min: 20, max: 40, unit: 'm' },
      waterTemp: { min: 27, max: 30, unit: 'C' },
      bestSeason: ['nov', 'dec', 'jan', 'feb', 'mar', 'apr'],
      highlights: ['manta_rays', 'whale_sharks', 'coral_gardens', 'boulders'],
      hazards: ['currents', 'depth'],
      currentStrength: 'moderate',
      description: 'World-class diving with diverse marine life and stunning visibility',
      lat: 8.6500,
      lng: 97.6500,
    },
    {
      id: 'koh-tao-sail-rock',
      name: 'Sail Rock',
      location: 'Koh Tao',
      country: 'Thailand',
      minCertification: 'open_water',
      recommendedCert: 'advanced',
      diveTypes: ['reef', 'pelagic'],
      maxDepth: 35,
      visibility: { min: 10, max: 25, unit: 'm' },
      waterTemp: { min: 28, max: 30, unit: 'C' },
      bestSeason: ['mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct'],
      highlights: ['whale_sharks', 'barracuda', 'chimney_swim_through'],
      hazards: ['currents', 'boat_traffic'],
      currentStrength: 'moderate',
      description: 'Famous pinnacle with chimney swim-through and whale shark sightings',
      lat: 9.8000,
      lng: 99.9500,
    },
    {
      id: 'koh-tao-chumphon',
      name: 'Chumphon Pinnacle',
      location: 'Koh Tao',
      country: 'Thailand',
      minCertification: 'advanced',
      recommendedCert: 'advanced',
      diveTypes: ['reef', 'pelagic'],
      maxDepth: 36,
      visibility: { min: 10, max: 30, unit: 'm' },
      waterTemp: { min: 28, max: 30, unit: 'C' },
      bestSeason: ['mar', 'apr', 'may', 'sep', 'oct'],
      highlights: ['whale_sharks', 'giant_grouper', 'barracuda_schools'],
      hazards: ['currents', 'depth', 'boat_traffic'],
      currentStrength: 'strong',
      description: 'Deep pinnacle famous for whale shark encounters',
      lat: 10.1000,
      lng: 99.8000,
    },
  ],
  'indonesia': [
    {
      id: 'raja-ampat',
      name: 'Raja Ampat',
      location: 'West Papua',
      country: 'Indonesia',
      minCertification: 'open_water',
      recommendedCert: 'advanced',
      diveTypes: ['reef', 'wall', 'drift', 'muck', 'pelagic'],
      maxDepth: 40,
      visibility: { min: 15, max: 30, unit: 'm' },
      waterTemp: { min: 27, max: 30, unit: 'C' },
      bestSeason: ['oct', 'nov', 'dec', 'jan', 'feb', 'mar', 'apr'],
      highlights: ['highest_marine_biodiversity', 'manta_rays', 'pygmy_seahorse', 'wobbegong_sharks'],
      hazards: ['currents', 'remote_location'],
      currentStrength: 'moderate',
      description: 'Most biodiverse marine area on Earth, bucket-list destination',
      lat: -0.5000,
      lng: 130.5000,
    },
    {
      id: 'komodo',
      name: 'Komodo National Park',
      location: 'East Nusa Tenggara',
      country: 'Indonesia',
      minCertification: 'advanced',
      recommendedCert: 'advanced',
      diveTypes: ['reef', 'wall', 'drift', 'pelagic'],
      maxDepth: 40,
      visibility: { min: 10, max: 30, unit: 'm' },
      waterTemp: { min: 22, max: 29, unit: 'C' },
      bestSeason: ['apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov'],
      highlights: ['manta_rays', 'sharks', 'strong_currents', 'pristine_reefs'],
      hazards: ['strong_currents', 'cold_thermoclines', 'remote'],
      currentStrength: 'extreme',
      description: 'World-class drift diving with mantas and challenging conditions',
      lat: -8.5500,
      lng: 119.4500,
    },
    {
      id: 'nusa-penida-manta',
      name: 'Manta Point (Nusa Penida)',
      location: 'Bali',
      country: 'Indonesia',
      minCertification: 'open_water',
      recommendedCert: 'advanced',
      diveTypes: ['reef', 'pelagic'],
      maxDepth: 20,
      visibility: { min: 5, max: 25, unit: 'm' },
      waterTemp: { min: 20, max: 28, unit: 'C' },
      bestSeason: ['jul', 'aug', 'sep', 'oct', 'nov'],
      highlights: ['manta_rays', 'mola_mola'],
      hazards: ['cold_upwellings', 'currents', 'surge'],
      currentStrength: 'moderate',
      description: 'Cleaning station with reliable manta ray encounters',
      lat: -8.7400,
      lng: 115.5300,
    },
    {
      id: 'tulamben-usat',
      name: 'USAT Liberty Wreck',
      location: 'Tulamben, Bali',
      country: 'Indonesia',
      minCertification: 'discover',
      recommendedCert: 'open_water',
      diveTypes: ['wreck', 'reef'],
      maxDepth: 30,
      visibility: { min: 10, max: 25, unit: 'm' },
      waterTemp: { min: 27, max: 30, unit: 'C' },
      bestSeason: ['apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov'],
      highlights: ['wwii_wreck', 'coral_covered', 'easy_access', 'night_diving'],
      hazards: ['surge', 'sharp_metal'],
      currentStrength: 'mild',
      description: 'Famous shore-accessible WWII wreck, great for all levels',
      lat: -8.2756,
      lng: 115.5933,
    },
  ],
  'egypt': [
    {
      id: 'ras-mohammed',
      name: 'Ras Mohammed National Park',
      location: 'Sharm El Sheikh',
      country: 'Egypt',
      minCertification: 'open_water',
      recommendedCert: 'advanced',
      diveTypes: ['reef', 'wall', 'drift'],
      maxDepth: 40,
      visibility: { min: 20, max: 40, unit: 'm' },
      waterTemp: { min: 22, max: 28, unit: 'C' },
      bestSeason: ['mar', 'apr', 'may', 'sep', 'oct', 'nov'],
      highlights: ['shark_reef', 'yolanda_reef', 'dramatic_walls'],
      hazards: ['currents', 'depth'],
      currentStrength: 'moderate',
      description: 'Red Sea\'s most famous dive site with stunning walls and reef sharks',
      lat: 27.7300,
      lng: 34.2500,
    },
    {
      id: 'ss-thistlegorm',
      name: 'SS Thistlegorm',
      location: 'Ras Mohammed',
      country: 'Egypt',
      minCertification: 'advanced',
      recommendedCert: 'advanced',
      diveTypes: ['wreck'],
      maxDepth: 32,
      visibility: { min: 15, max: 30, unit: 'm' },
      waterTemp: { min: 22, max: 28, unit: 'C' },
      bestSeason: ['mar', 'apr', 'may', 'sep', 'oct', 'nov'],
      highlights: ['wwii_wreck', 'cargo_intact', 'motorcycles', 'trucks', 'locomotives'],
      hazards: ['depth', 'penetration', 'currents'],
      currentStrength: 'moderate',
      description: 'World\'s most famous wreck dive with WWII cargo intact',
      lat: 27.8133,
      lng: 33.9217,
    },
  ],
  'maldives': [
    {
      id: 'maldives-mantas',
      name: 'Hanifaru Bay',
      location: 'Baa Atoll',
      country: 'Maldives',
      minCertification: 'open_water',
      recommendedCert: 'open_water',
      diveTypes: ['pelagic'],
      maxDepth: 15,
      visibility: { min: 5, max: 20, unit: 'm' },
      waterTemp: { min: 27, max: 30, unit: 'C' },
      bestSeason: ['jun', 'jul', 'aug', 'sep', 'oct', 'nov'],
      highlights: ['manta_feeding_frenzy', 'whale_sharks', 'snorkeling_only_now'],
      hazards: ['crowding', 'currents'],
      currentStrength: 'mild',
      description: 'UNESCO site with largest manta ray aggregations (snorkel only)',
      lat: 5.2500,
      lng: 73.1833,
    },
    {
      id: 'south-ari-whale-sharks',
      name: 'South Ari Atoll',
      location: 'South Ari',
      country: 'Maldives',
      minCertification: 'open_water',
      recommendedCert: 'open_water',
      diveTypes: ['reef', 'pelagic'],
      maxDepth: 30,
      visibility: { min: 15, max: 30, unit: 'm' },
      waterTemp: { min: 27, max: 30, unit: 'C' },
      bestSeason: ['jan', 'feb', 'mar', 'apr', 'may', 'nov', 'dec'],
      highlights: ['whale_sharks_year_round', 'reef_sharks', 'mantas'],
      hazards: ['currents'],
      currentStrength: 'moderate',
      description: 'Best place for year-round whale shark encounters',
      lat: 3.4000,
      lng: 72.8500,
    },
  ],
  'australia': [
    {
      id: 'great-barrier-reef',
      name: 'Great Barrier Reef',
      location: 'Queensland',
      country: 'Australia',
      minCertification: 'discover',
      recommendedCert: 'open_water',
      diveTypes: ['reef', 'wall'],
      maxDepth: 40,
      visibility: { min: 10, max: 30, unit: 'm' },
      waterTemp: { min: 22, max: 29, unit: 'C' },
      bestSeason: ['jun', 'jul', 'aug', 'sep', 'oct', 'nov'],
      highlights: ['coral_diversity', 'sea_turtles', 'reef_sharks', 'clownfish'],
      hazards: ['stingers_seasonal', 'currents'],
      currentStrength: 'mild',
      description: 'World\'s largest coral reef system, bucket-list destination',
      lat: -18.2861,
      lng: 147.7000,
    },
    {
      id: 'ss-yongala',
      name: 'SS Yongala',
      location: 'Townsville',
      country: 'Australia',
      minCertification: 'advanced',
      recommendedCert: 'advanced',
      diveTypes: ['wreck', 'pelagic'],
      maxDepth: 30,
      visibility: { min: 10, max: 25, unit: 'm' },
      waterTemp: { min: 22, max: 28, unit: 'C' },
      bestSeason: ['apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov'],
      highlights: ['australia_best_wreck', 'sea_snakes', 'bull_sharks', 'giant_trevally'],
      hazards: ['currents', 'depth', 'sea_snakes'],
      currentStrength: 'moderate',
      description: 'Australia\'s best wreck dive with incredible marine life',
      lat: -19.3050,
      lng: 147.6217,
    },
  ],
  'mexico': [
    {
      id: 'cenotes',
      name: 'Cenotes (Dos Ojos)',
      location: 'Tulum',
      country: 'Mexico',
      region: 'Quintana Roo',
      minCertification: 'open_water',
      recommendedCert: 'advanced',
      diveTypes: ['cave'],
      maxDepth: 10,
      visibility: { min: 30, max: 100, unit: 'm' },
      waterTemp: { min: 24, max: 25, unit: 'C' },
      bestSeason: ['jan', 'feb', 'mar', 'apr', 'may', 'nov', 'dec'],
      highlights: ['crystal_clear_water', 'stalactites', 'light_effects', 'halocline'],
      hazards: ['overhead_environment', 'disorientation'],
      currentStrength: 'none',
      description: 'Freshwater cave diving with incredible visibility and formations',
      lat: 20.3267,
      lng: -87.3917,
    },
    {
      id: 'socorro-mantas',
      name: 'Socorro Islands',
      location: 'Pacific Ocean',
      country: 'Mexico',
      minCertification: 'advanced',
      recommendedCert: 'advanced',
      diveTypes: ['pelagic', 'wall'],
      maxDepth: 40,
      visibility: { min: 20, max: 40, unit: 'm' },
      waterTemp: { min: 22, max: 28, unit: 'C' },
      bestSeason: ['nov', 'dec', 'jan', 'feb', 'mar', 'apr', 'may'],
      highlights: ['giant_mantas', 'dolphins', 'hammerheads', 'whale_sharks', 'humpbacks'],
      hazards: ['remote', 'currents', 'depth'],
      currentStrength: 'strong',
      description: 'Mexico\'s Galápagos - big animal encounters via liveaboard only',
      lat: 18.7833,
      lng: -110.9500,
    },
  ],
  'philippines': [
    {
      id: 'tubbataha',
      name: 'Tubbataha Reef',
      location: 'Sulu Sea',
      country: 'Philippines',
      minCertification: 'advanced',
      recommendedCert: 'advanced',
      diveTypes: ['reef', 'wall', 'drift', 'pelagic'],
      maxDepth: 40,
      visibility: { min: 20, max: 45, unit: 'm' },
      waterTemp: { min: 27, max: 30, unit: 'C' },
      bestSeason: ['mar', 'apr', 'may', 'jun'],
      highlights: ['pristine_reefs', 'sharks', 'mantas', 'turtles', 'unesco_site'],
      hazards: ['remote', 'currents'],
      currentStrength: 'moderate',
      description: 'UNESCO World Heritage site, Philippines\' best diving',
      lat: 8.9167,
      lng: 119.8333,
    },
    {
      id: 'malapascua-threshers',
      name: 'Malapascua (Monad Shoal)',
      location: 'Cebu',
      country: 'Philippines',
      minCertification: 'advanced',
      recommendedCert: 'advanced',
      diveTypes: ['reef', 'pelagic'],
      maxDepth: 25,
      visibility: { min: 10, max: 25, unit: 'm' },
      waterTemp: { min: 26, max: 30, unit: 'C' },
      bestSeason: ['mar', 'apr', 'may', 'jun', 'nov', 'dec'],
      highlights: ['thresher_sharks', 'cleaning_station', 'dawn_dives'],
      hazards: ['early_morning', 'depth', 'currents'],
      currentStrength: 'mild',
      description: 'Only place in the world for reliable thresher shark sightings',
      lat: 11.3333,
      lng: 124.1167,
    },
  ],
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get surf spots for a destination that match the user's skill level
 */
export function getSurfSpotsForSkillLevel(
  destination: string,
  userSkillLevel: SurfSkillLevel
): SurfSpot[] {
  const skillOrder: SurfSkillLevel[] = ['beginner', 'intermediate', 'advanced', 'expert'];
  const userSkillIndex = skillOrder.indexOf(userSkillLevel);

  const spots = SURF_SPOTS[destination.toLowerCase().replace(/\s+/g, '-')] || [];

  return spots.filter(spot => {
    const spotMinIndex = skillOrder.indexOf(spot.minSkillLevel);
    return spotMinIndex <= userSkillIndex;
  });
}

/**
 * Get dive sites for a destination that match the user's certification level
 */
export function getDiveSitesForCertLevel(
  destination: string,
  userCertLevel: DiveCertLevel
): DiveSite[] {
  const certOrder: DiveCertLevel[] = ['discover', 'open_water', 'advanced', 'rescue', 'divemaster', 'technical'];
  const userCertIndex = certOrder.indexOf(userCertLevel);

  const sites = DIVE_SITES[destination.toLowerCase().replace(/\s+/g, '-')] || [];

  return sites.filter(site => {
    const siteMinIndex = certOrder.indexOf(site.minCertification);
    return siteMinIndex <= userCertIndex;
  });
}

/**
 * Check if a destination has surf data
 */
export function hasSurfData(destination: string): boolean {
  const normalizedDest = destination.toLowerCase().replace(/\s+/g, '-');
  return normalizedDest in SURF_SPOTS;
}

/**
 * Check if a destination has dive data
 */
export function hasDiveData(destination: string): boolean {
  const normalizedDest = destination.toLowerCase().replace(/\s+/g, '-');
  return normalizedDest in DIVE_SITES;
}

/**
 * Get beginner-friendly surf spots
 */
export function getBeginnerSurfSpots(destination: string): SurfSpot[] {
  const spots = SURF_SPOTS[destination.toLowerCase().replace(/\s+/g, '-')] || [];
  return spots.filter(spot => spot.hasSurfSchool && spot.minSkillLevel === 'beginner');
}

/**
 * Get dive sites where specific marine life can be seen
 */
export function getDiveSitesByHighlight(highlight: string): DiveSite[] {
  const results: DiveSite[] = [];
  for (const sites of Object.values(DIVE_SITES)) {
    for (const site of sites) {
      if (site.highlights.some(h => h.toLowerCase().includes(highlight.toLowerCase()))) {
        results.push(site);
      }
    }
  }
  return results;
}
