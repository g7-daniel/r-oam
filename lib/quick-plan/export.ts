/**
 * FIX 4.11: Quick Plan Export Utilities
 * Export itineraries to various formats
 */

export interface ExportableItinerary {
  days: Array<{
    activities: Array<{
      name: string;
      lat?: number;
      lng?: number;
      address?: string;
    }>;
  }>;
}

/**
 * Generate a Google Maps directions URL from an itinerary
 * Supports up to 10 waypoints (Google Maps limit)
 */
export function generateGoogleMapsUrl(itinerary: ExportableItinerary): string {
  const waypoints = itinerary.days
    .flatMap(day => day.activities)
    .filter(a => a.lat && a.lng)
    .map(a => `${a.lat},${a.lng}`)
    .slice(0, 10); // Google Maps limit

  if (waypoints.length < 2) return '';

  const origin = waypoints[0];
  const destination = waypoints[waypoints.length - 1];
  const middle = waypoints.slice(1, -1);

  if (middle.length > 0) {
    return `https://www.google.com/maps/dir/${origin}/${middle.join('/')}/${destination}`;
  }

  return `https://www.google.com/maps/dir/${origin}/${destination}`;
}

/**
 * Generate a shareable text summary of the itinerary
 */
export function generateTextSummary(itinerary: ExportableItinerary): string {
  let summary = 'My Trip Itinerary\n\n';

  itinerary.days.forEach((day, index) => {
    summary += `Day ${index + 1}:\n`;
    day.activities.forEach(activity => {
      summary += `  - ${activity.name}`;
      if (activity.address) {
        summary += ` (${activity.address})`;
      }
      summary += '\n';
    });
    summary += '\n';
  });

  return summary;
}

/**
 * Generate calendar-compatible events (iCal format basics)
 */
export function generateCalendarEvents(
  itinerary: ExportableItinerary,
  startDate: Date
): Array<{
  title: string;
  date: Date;
  location?: string;
}> {
  const events: Array<{ title: string; date: Date; location?: string }> = [];

  itinerary.days.forEach((day, dayIndex) => {
    const eventDate = new Date(startDate);
    eventDate.setDate(eventDate.getDate() + dayIndex);

    day.activities.forEach(activity => {
      events.push({
        title: activity.name,
        date: eventDate,
        location: activity.address,
      });
    });
  });

  return events;
}

/**
 * Copy itinerary to clipboard in a shareable format
 */
export async function copyItineraryToClipboard(itinerary: ExportableItinerary): Promise<boolean> {
  try {
    const summary = generateTextSummary(itinerary);
    await navigator.clipboard.writeText(summary);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}
