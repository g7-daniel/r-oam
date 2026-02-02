/**
 * Phase 5 Fix 5.2: Events and Festival Integration
 * Provides awareness of local events during travel dates
 */

export interface LocalEvent {
  name: string;
  date: string;
  endDate?: string;
  type: 'festival' | 'holiday' | 'sports' | 'cultural' | 'conference' | 'music' | 'food';
  impact: 'low' | 'medium' | 'high';
  description?: string;
  bookingAdvice?: string;
}

export interface EventsResponse {
  events: LocalEvent[];
  warnings: string[];
  tips: string[];
}

// Known major events by destination and approximate dates
// This is a curated list - in production, integrate with Eventbrite/Ticketmaster APIs
const KNOWN_EVENTS: Record<string, LocalEvent[]> = {
  // Caribbean
  'dominican republic': [
    { name: 'Carnival', date: '02-27', type: 'festival', impact: 'high', description: 'Largest annual celebration with parades and music', bookingAdvice: 'Book hotels 2-3 months ahead' },
    { name: 'Merengue Festival', date: '07-26', endDate: '08-02', type: 'music', impact: 'high', description: 'Week-long celebration of Dominican music' },
    { name: 'Independence Day', date: '02-27', type: 'holiday', impact: 'medium', description: 'National holiday with celebrations' },
  ],
  'mexico': [
    { name: 'Día de los Muertos', date: '11-01', endDate: '11-02', type: 'cultural', impact: 'high', description: 'Day of the Dead celebrations', bookingAdvice: 'Oaxaca books out months in advance' },
    { name: 'Cinco de Mayo', date: '05-05', type: 'holiday', impact: 'medium', description: 'National celebration' },
    { name: 'Guelaguetza Festival', date: '07-20', endDate: '07-27', type: 'cultural', impact: 'high', description: 'Indigenous cultural festival in Oaxaca' },
  ],
  'spain': [
    { name: 'La Tomatina', date: '08-28', type: 'festival', impact: 'high', description: 'Tomato-throwing festival in Buñol', bookingAdvice: 'Valencia area hotels fill quickly' },
    { name: 'Running of the Bulls', date: '07-06', endDate: '07-14', type: 'festival', impact: 'high', description: 'San Fermín festival in Pamplona' },
    { name: 'Las Fallas', date: '03-15', endDate: '03-19', type: 'festival', impact: 'high', description: 'Valencia fire festival' },
  ],
  'italy': [
    { name: 'Venice Carnival', date: '02-01', endDate: '02-21', type: 'festival', impact: 'high', description: 'Famous masked carnival', bookingAdvice: 'Book Venice 3+ months ahead' },
    { name: 'Palio di Siena', date: '07-02', type: 'cultural', impact: 'high', description: 'Historic horse race' },
    { name: 'Ferragosto', date: '08-15', type: 'holiday', impact: 'high', description: 'Peak Italian holiday - many businesses close' },
  ],
  'thailand': [
    { name: 'Songkran', date: '04-13', endDate: '04-15', type: 'festival', impact: 'high', description: 'Thai New Year water festival', bookingAdvice: 'Extremely busy - book well in advance' },
    { name: 'Loi Krathong', date: '11-15', type: 'festival', impact: 'medium', description: 'Festival of lights on waterways' },
    { name: 'Full Moon Party', date: 'monthly', type: 'music', impact: 'medium', description: 'Koh Phangan beach party' },
  ],
  'japan': [
    { name: 'Cherry Blossom Season', date: '03-25', endDate: '04-15', type: 'cultural', impact: 'high', description: 'Sakura viewing season', bookingAdvice: 'Hotels in Kyoto/Tokyo book 6+ months ahead' },
    { name: 'Golden Week', date: '04-29', endDate: '05-05', type: 'holiday', impact: 'high', description: 'National holiday week - domestic travel peak' },
    { name: 'Gion Matsuri', date: '07-01', endDate: '07-31', type: 'festival', impact: 'high', description: 'Kyoto\'s famous festival' },
  ],
  'portugal': [
    { name: 'São João Festival', date: '06-23', endDate: '06-24', type: 'festival', impact: 'high', description: 'Porto\'s biggest celebration' },
    { name: 'Lisbon Sardine Festival', date: '06-01', endDate: '06-30', type: 'food', impact: 'medium', description: 'Month-long celebrations in Lisbon' },
  ],
  'brazil': [
    { name: 'Carnival', date: '02-10', endDate: '02-17', type: 'festival', impact: 'high', description: 'World-famous celebration', bookingAdvice: 'Rio prices triple - book 6+ months ahead' },
    { name: 'Festa Junina', date: '06-01', endDate: '06-30', type: 'festival', impact: 'medium', description: 'June harvest festivals' },
  ],
  'france': [
    { name: 'Bastille Day', date: '07-14', type: 'holiday', impact: 'high', description: 'National holiday with fireworks' },
    { name: 'Tour de France', date: '07-01', endDate: '07-23', type: 'sports', impact: 'medium', description: 'Famous cycling race' },
    { name: 'Cannes Film Festival', date: '05-14', endDate: '05-25', type: 'cultural', impact: 'high', description: 'Film industry event', bookingAdvice: 'Cannes prices surge' },
  ],
  'germany': [
    { name: 'Oktoberfest', date: '09-16', endDate: '10-03', type: 'festival', impact: 'high', description: 'World\'s largest beer festival', bookingAdvice: 'Munich hotels book out months ahead' },
    { name: 'Christmas Markets', date: '11-25', endDate: '12-23', type: 'cultural', impact: 'medium', description: 'Traditional holiday markets' },
  ],
  'greece': [
    { name: 'Easter Week', date: '04-15', endDate: '04-22', type: 'holiday', impact: 'high', description: 'Greek Orthodox Easter - major celebration' },
    { name: 'Athens Epidaurus Festival', date: '06-01', endDate: '08-31', type: 'cultural', impact: 'medium', description: 'Arts and theater festival' },
  ],
  'bali': [
    { name: 'Nyepi (Day of Silence)', date: '03-11', type: 'holiday', impact: 'high', description: 'Silent day - airport closes, no activities', bookingAdvice: 'Plan activities around this day' },
    { name: 'Galungan', date: 'varies', type: 'cultural', impact: 'medium', description: 'Balinese Hindu celebration' },
  ],
};

// Universal holidays that affect most destinations
const UNIVERSAL_HOLIDAYS: LocalEvent[] = [
  { name: 'Christmas', date: '12-25', type: 'holiday', impact: 'high', description: 'Many businesses closed, peak travel period' },
  { name: 'New Year\'s Eve', date: '12-31', type: 'holiday', impact: 'high', description: 'Peak celebration night', bookingAdvice: 'Book restaurants and events well ahead' },
  { name: 'New Year\'s Day', date: '01-01', type: 'holiday', impact: 'medium', description: 'Many businesses closed' },
];

/**
 * Get events happening during a trip's dates
 */
export function getEventsForDates(
  destination: string,
  startDate: Date,
  endDate: Date
): EventsResponse {
  const events: LocalEvent[] = [];
  const warnings: string[] = [];
  const tips: string[] = [];

  // Normalize destination for lookup
  const destLower = destination.toLowerCase();
  const destKey = Object.keys(KNOWN_EVENTS).find(key =>
    destLower.includes(key) || key.includes(destLower.split(',')[0].trim())
  );

  // Get destination-specific events
  const destEvents = destKey ? KNOWN_EVENTS[destKey] : [];

  // Combine with universal holidays
  const allEvents = [...destEvents, ...UNIVERSAL_HOLIDAYS];

  // Check which events overlap with trip dates
  const tripYear = startDate.getFullYear();

  for (const event of allEvents) {
    if (event.date === 'monthly' || event.date === 'varies') {
      // Special handling for recurring events
      events.push({ ...event, date: `During your trip (${event.date})` });
      continue;
    }

    // Parse event date (MM-DD format)
    const [month, day] = event.date.split('-').map(Number);
    const eventStart = new Date(tripYear, month - 1, day);

    let eventEnd = eventStart;
    if (event.endDate) {
      const [endMonth, endDay] = event.endDate.split('-').map(Number);
      eventEnd = new Date(tripYear, endMonth - 1, endDay);
    }

    // Check if event overlaps with trip
    if (eventStart <= endDate && eventEnd >= startDate) {
      events.push({
        ...event,
        date: formatEventDate(eventStart, eventEnd),
      });

      // Add warnings for high-impact events
      if (event.impact === 'high') {
        warnings.push(`${event.name} occurs during your trip - expect crowds and higher prices`);
        if (event.bookingAdvice) {
          tips.push(event.bookingAdvice);
        }
      }
    }
  }

  // Add general tips based on travel period
  const month = startDate.getMonth();
  if (month === 11 || month === 0) { // December or January
    tips.push('Winter holiday season - book flights and hotels early');
  }
  if (month >= 5 && month <= 7) { // June-August
    tips.push('Summer high season in Northern Hemisphere - expect peak prices');
  }

  return { events, warnings, tips };
}

/**
 * Check if dates overlap with any major events
 * Quick check for use in trip planning flow
 */
export function hasSignificantEvents(
  destination: string,
  startDate: Date,
  endDate: Date
): { hasEvents: boolean; highImpactCount: number; eventNames: string[] } {
  const { events } = getEventsForDates(destination, startDate, endDate);
  const highImpact = events.filter(e => e.impact === 'high');

  return {
    hasEvents: events.length > 0,
    highImpactCount: highImpact.length,
    eventNames: events.map(e => e.name),
  };
}

/**
 * Format event date range for display
 */
function formatEventDate(start: Date, end: Date): string {
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const startStr = start.toLocaleDateString('en-US', options);

  if (start.getTime() === end.getTime()) {
    return startStr;
  }

  const endStr = end.toLocaleDateString('en-US', options);
  return `${startStr} - ${endStr}`;
}

/**
 * Get event-based recommendations for itinerary
 */
export function getEventRecommendations(
  destination: string,
  startDate: Date,
  endDate: Date
): string[] {
  const { events, tips } = getEventsForDates(destination, startDate, endDate);
  const recommendations: string[] = [...tips];

  for (const event of events) {
    if (event.type === 'festival' || event.type === 'cultural') {
      recommendations.push(`Consider attending ${event.name} - ${event.description}`);
    }
    if (event.type === 'holiday' && event.impact === 'high') {
      recommendations.push(`Note: ${event.name} may affect business hours and availability`);
    }
  }

  return recommendations;
}
