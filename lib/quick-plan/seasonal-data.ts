/**
 * Seasonal and holiday warning data for travel planning.
 * Provides alerts for monsoons, peak seasons, extreme weather, and major holidays.
 */

export type WarningType = 'peak' | 'monsoon' | 'holiday' | 'extreme_weather' | 'off_season';

export interface SeasonalWarning {
  region: string;           // Country or region name (case-insensitive match)
  months: number[];         // 1-12 (January = 1)
  type: WarningType;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'caution';  // info = FYI, warning = plan around it, caution = reconsider
  priceImpact?: 'higher' | 'lower' | 'much_higher' | 'much_lower';
}

export const SEASONAL_WARNINGS: SeasonalWarning[] = [
  // ============================================================================
  // SOUTHEAST ASIA
  // ============================================================================
  {
    region: 'Thailand',
    months: [6, 7, 8, 9, 10],
    type: 'monsoon',
    title: 'Monsoon Season',
    description: 'Heavy rainfall expected, especially on islands and southern beaches. Some ferry services may be limited. The Gulf side (Koh Samui) has opposite monsoon timing.',
    severity: 'warning',
    priceImpact: 'lower',
  },
  {
    region: 'Thailand',
    months: [12, 1, 2],
    type: 'peak',
    title: 'Peak Tourist Season',
    description: 'Best weather but highest prices and crowds. Book accommodations 2-3 months ahead for popular areas.',
    severity: 'info',
    priceImpact: 'higher',
  },
  {
    region: 'Bali',
    months: [12, 1, 2, 3],
    type: 'monsoon',
    title: 'Wet Season',
    description: 'Daily afternoon showers common. Mornings usually clear. Lower prices and fewer crowds.',
    severity: 'info',
    priceImpact: 'lower',
  },
  {
    region: 'Bali',
    months: [7, 8],
    type: 'peak',
    title: 'Peak Season',
    description: 'Dry season with perfect weather. Expect premium prices and book well in advance.',
    severity: 'info',
    priceImpact: 'much_higher',
  },
  {
    region: 'Vietnam',
    months: [7, 8, 9, 10],
    type: 'monsoon',
    title: 'Typhoon Season',
    description: 'Central Vietnam prone to typhoons. Northern and Southern regions less affected. Check forecasts before coastal activities.',
    severity: 'warning',
  },
  {
    region: 'Philippines',
    months: [6, 7, 8, 9, 10, 11],
    type: 'monsoon',
    title: 'Typhoon Season',
    description: 'Peak typhoon season. Some island ferries may be cancelled. Travel insurance strongly recommended.',
    severity: 'caution',
    priceImpact: 'lower',
  },

  // ============================================================================
  // EAST ASIA
  // ============================================================================
  {
    region: 'Japan',
    months: [3, 4],
    type: 'peak',
    title: 'Cherry Blossom Season',
    description: 'Sakura season brings stunning blooms but massive crowds and prices. Hotels in Kyoto book out months ahead.',
    severity: 'warning',
    priceImpact: 'much_higher',
  },
  {
    region: 'Japan',
    months: [6, 7],
    type: 'monsoon',
    title: 'Rainy Season (Tsuyu)',
    description: 'Humid with frequent rain, especially in June. Hokkaido is less affected. Indoor attractions recommended.',
    severity: 'info',
    priceImpact: 'lower',
  },
  {
    region: 'Japan',
    months: [8],
    type: 'extreme_weather',
    title: 'Extreme Summer Heat',
    description: 'Hot and humid, especially in cities. Stay hydrated and plan for air-conditioned breaks.',
    severity: 'warning',
  },
  {
    region: 'Japan',
    months: [11],
    type: 'peak',
    title: 'Autumn Foliage Season',
    description: 'Beautiful fall colors attract many visitors. Popular spots like Kyoto get crowded.',
    severity: 'info',
    priceImpact: 'higher',
  },
  {
    region: 'Korea',
    months: [4],
    type: 'peak',
    title: 'Cherry Blossom Season',
    description: 'Beautiful spring blooms. Popular parks and areas will be crowded.',
    severity: 'info',
    priceImpact: 'higher',
  },
  {
    region: 'Korea',
    months: [7, 8],
    type: 'monsoon',
    title: 'Monsoon Season',
    description: 'Heavy rainfall and humidity. Some outdoor activities may be affected.',
    severity: 'info',
  },

  // ============================================================================
  // SOUTH ASIA
  // ============================================================================
  {
    region: 'India',
    months: [6, 7, 8, 9],
    type: 'monsoon',
    title: 'Monsoon Season',
    description: 'Heavy rains across most of India. Some areas flood. Himalayan regions may have landslides.',
    severity: 'warning',
    priceImpact: 'lower',
  },
  {
    region: 'India',
    months: [4, 5],
    type: 'extreme_weather',
    title: 'Extreme Heat',
    description: 'Temperatures can exceed 45°C in northern plains. Hill stations offer relief.',
    severity: 'caution',
    priceImpact: 'lower',
  },
  {
    region: 'Maldives',
    months: [12, 1, 2, 3, 4],
    type: 'peak',
    title: 'Peak Season',
    description: 'Best weather with minimal rain. Highest prices of the year. Book 6+ months ahead for top resorts.',
    severity: 'info',
    priceImpact: 'much_higher',
  },
  {
    region: 'Maldives',
    months: [5, 6, 7, 8, 9, 10, 11],
    type: 'monsoon',
    title: 'Wet Season',
    description: 'More rain and wind, but still warm. Great deals available. Surfing conditions improve on some atolls.',
    severity: 'info',
    priceImpact: 'much_lower',
  },
  {
    region: 'Sri Lanka',
    months: [5, 6, 7, 8, 9],
    type: 'monsoon',
    title: 'Southwest Monsoon',
    description: 'West and south coasts rainy. East coast (Trincomalee, Arugam Bay) has best weather during this time.',
    severity: 'info',
  },

  // ============================================================================
  // EUROPE
  // ============================================================================
  {
    region: 'Italy',
    months: [7, 8],
    type: 'peak',
    title: 'Peak Summer Season',
    description: 'Hot weather, crowded tourist sites, and August holiday closures. Many locals vacation. Book restaurants ahead.',
    severity: 'warning',
    priceImpact: 'much_higher',
  },
  {
    region: 'Italy',
    months: [8],
    type: 'holiday',
    title: 'Ferragosto Holiday',
    description: 'Mid-August national holiday. Many businesses close, especially Aug 15. Cities empty as locals go to coast.',
    severity: 'warning',
  },
  {
    region: 'France',
    months: [7, 8],
    type: 'peak',
    title: 'Peak Summer Season',
    description: 'Busy tourist season. Paris empties of locals but fills with tourists. French Riviera at its most crowded.',
    severity: 'info',
    priceImpact: 'higher',
  },
  {
    region: 'Spain',
    months: [7, 8],
    type: 'extreme_weather',
    title: 'Extreme Summer Heat',
    description: 'Interior cities like Madrid and Seville can exceed 40°C. Siesta culture exists for a reason!',
    severity: 'warning',
    priceImpact: 'higher',
  },
  {
    region: 'Greece',
    months: [7, 8],
    type: 'peak',
    title: 'Peak Season',
    description: 'Best beach weather but islands extremely crowded. Ferries and hotels book up. Consider shoulder season.',
    severity: 'info',
    priceImpact: 'much_higher',
  },
  {
    region: 'Iceland',
    months: [6, 7, 8],
    type: 'peak',
    title: 'Midnight Sun Season',
    description: 'Best weather and nearly 24-hour daylight. Highest prices and most tourists. Book everything ahead.',
    severity: 'info',
    priceImpact: 'much_higher',
  },
  {
    region: 'Iceland',
    months: [12, 1, 2],
    type: 'extreme_weather',
    title: 'Winter Conditions',
    description: 'Limited daylight, icy roads, possible closures. Best for Northern Lights. 4x4 required for highlands.',
    severity: 'warning',
    priceImpact: 'lower',
  },
  {
    region: 'Norway',
    months: [12, 1, 2],
    type: 'peak',
    title: 'Northern Lights Season',
    description: 'Best time for aurora viewing in northern Norway. Very cold but magical. Book Tromso accommodations early.',
    severity: 'info',
    priceImpact: 'higher',
  },

  // ============================================================================
  // CARIBBEAN & CENTRAL AMERICA
  // ============================================================================
  {
    region: 'Caribbean',
    months: [8, 9, 10],
    type: 'extreme_weather',
    title: 'Hurricane Season Peak',
    description: 'Height of hurricane season. Travel insurance essential. Monitor forecasts and have flexible plans.',
    severity: 'caution',
    priceImpact: 'much_lower',
  },
  {
    region: 'Mexico',
    months: [8, 9, 10],
    type: 'extreme_weather',
    title: 'Hurricane Season',
    description: 'Caribbean coast (Cancun, Riviera Maya) at risk. Pacific coast also affected. Insurance recommended.',
    severity: 'warning',
    priceImpact: 'lower',
  },
  {
    region: 'Mexico',
    months: [12, 1, 2, 3],
    type: 'peak',
    title: 'Peak Tourist Season',
    description: 'Best weather, especially for beach destinations. Highest prices. Spring break crowds in March.',
    severity: 'info',
    priceImpact: 'higher',
  },
  {
    region: 'Costa Rica',
    months: [5, 6, 7, 8, 9, 10, 11],
    type: 'monsoon',
    title: 'Green Season',
    description: 'Rainy season with afternoon showers. Lush landscapes, fewer tourists, better prices. Mornings usually clear.',
    severity: 'info',
    priceImpact: 'lower',
  },

  // ============================================================================
  // MIDDLE EAST
  // ============================================================================
  {
    region: 'Dubai',
    months: [6, 7, 8],
    type: 'extreme_weather',
    title: 'Extreme Summer Heat',
    description: 'Temperatures regularly exceed 45°C. Outdoor activities limited to early morning. Great hotel deals.',
    severity: 'caution',
    priceImpact: 'much_lower',
  },
  {
    region: 'Dubai',
    months: [12, 1, 2],
    type: 'peak',
    title: 'Peak Winter Season',
    description: 'Perfect weather (20-25°C). Premium prices and busy attractions. Book popular restaurants ahead.',
    severity: 'info',
    priceImpact: 'much_higher',
  },

  // ============================================================================
  // AFRICA
  // ============================================================================
  {
    region: 'Kenya',
    months: [7, 8, 9, 10],
    type: 'peak',
    title: 'Great Migration Season',
    description: 'Best time to see the wildebeest migration in Masai Mara. Premium safari prices. Book 6+ months ahead.',
    severity: 'info',
    priceImpact: 'much_higher',
  },
  {
    region: 'Tanzania',
    months: [1, 2],
    type: 'peak',
    title: 'Calving Season',
    description: 'Wildebeest calving in Serengeti. Great predator activity. Popular time - book early.',
    severity: 'info',
    priceImpact: 'higher',
  },
  {
    region: 'South Africa',
    months: [12, 1, 2],
    type: 'peak',
    title: 'Peak Summer Season',
    description: 'South African summer. Cape Town at its best but busiest. Garden Route very popular.',
    severity: 'info',
    priceImpact: 'higher',
  },
  {
    region: 'Morocco',
    months: [7, 8],
    type: 'extreme_weather',
    title: 'Extreme Desert Heat',
    description: 'Interior and desert areas extremely hot. Coastal cities more comfortable. Desert tours best avoided.',
    severity: 'warning',
    priceImpact: 'lower',
  },

  // ============================================================================
  // OCEANIA
  // ============================================================================
  {
    region: 'Australia',
    months: [12, 1, 2],
    type: 'peak',
    title: 'Peak Summer Season',
    description: 'Australian summer. Popular beach and city destinations busy. Bushfire risk in some areas.',
    severity: 'info',
    priceImpact: 'higher',
  },
  {
    region: 'Australia',
    months: [11, 12, 1, 2, 3],
    type: 'monsoon',
    title: 'Wet Season (Top End)',
    description: 'Northern Australia (Darwin, Cairns) has wet season. Crocodile warnings. Some roads flood.',
    severity: 'warning',
  },
  {
    region: 'New Zealand',
    months: [12, 1, 2],
    type: 'peak',
    title: 'Peak Summer Season',
    description: 'Best weather for outdoor activities. Popular hiking routes require booking. Campervans book out.',
    severity: 'info',
    priceImpact: 'higher',
  },

  // ============================================================================
  // AMERICAS
  // ============================================================================
  {
    region: 'Hawaii',
    months: [12, 1, 2, 3],
    type: 'peak',
    title: 'Peak Winter Season',
    description: 'Mainlanders escaping winter. Highest prices. Best whale watching season (Dec-Apr).',
    severity: 'info',
    priceImpact: 'much_higher',
  },
  {
    region: 'Florida',
    months: [6, 7, 8, 9, 10],
    type: 'extreme_weather',
    title: 'Hurricane & Heat Season',
    description: 'Hot, humid, daily storms. Hurricane risk (peak Aug-Oct). Theme parks less crowded but very hot.',
    severity: 'warning',
    priceImpact: 'lower',
  },
  {
    region: 'Alaska',
    months: [6, 7, 8],
    type: 'peak',
    title: 'Peak Tourist Season',
    description: 'Only practical time for most visitors. Cruise ships arrive. Wildlife active. Book early.',
    severity: 'info',
    priceImpact: 'much_higher',
  },
  {
    region: 'Peru',
    months: [12, 1, 2, 3],
    type: 'monsoon',
    title: 'Wet Season',
    description: 'Rainy season in highlands and Machu Picchu. Inca Trail may close in February. Amazon also very wet.',
    severity: 'warning',
    priceImpact: 'lower',
  },
  {
    region: 'Argentina',
    months: [12, 1, 2],
    type: 'peak',
    title: 'Peak Summer Season',
    description: 'Best time for Patagonia. Buenos Aires empties in January (locals on vacation).',
    severity: 'info',
    priceImpact: 'higher',
  },
];

/**
 * Get seasonal warnings for a destination and date.
 */
export function getSeasonalWarnings(
  destination: string,
  startDate: Date | string
): SeasonalWarning[] {
  const date = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const month = date.getMonth() + 1; // Convert 0-11 to 1-12

  const destLower = destination.toLowerCase();

  return SEASONAL_WARNINGS.filter(warning => {
    // Check if destination contains the region (or region contains destination)
    const regionLower = warning.region.toLowerCase();
    const matches = destLower.includes(regionLower) || regionLower.includes(destLower);

    // Check if month is in the warning period
    const inSeason = warning.months.includes(month);

    return matches && inSeason;
  });
}

/**
 * Format warnings as a user-friendly message.
 */
export function formatSeasonalWarnings(warnings: SeasonalWarning[]): string {
  if (warnings.length === 0) return '';

  const severityIcon = (severity: SeasonalWarning['severity']) => {
    switch (severity) {
      case 'caution': return '🚨';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
    }
  };

  const priceNote = (impact?: SeasonalWarning['priceImpact']) => {
    switch (impact) {
      case 'much_higher': return ' (prices significantly higher)';
      case 'higher': return ' (prices higher than usual)';
      case 'lower': return ' (good deals available)';
      case 'much_lower': return ' (great deals available)';
      default: return '';
    }
  };

  return warnings
    .map(w => `${severityIcon(w.severity)} **${w.title}**${priceNote(w.priceImpact)}: ${w.description}`)
    .join('\n\n');
}

/**
 * Check if any warnings are severe enough to prompt user confirmation.
 */
export function hasSignificantWarnings(warnings: SeasonalWarning[]): boolean {
  return warnings.some(w => w.severity === 'caution' || w.severity === 'warning');
}
