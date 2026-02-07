import { NextRequest, NextResponse } from 'next/server';
import { searchFlights, searchRoundTripFlights } from '@/lib/amadeus';
import {
  flightsGetSchema,
  createValidationErrorResponse,
} from '@/lib/api-validation';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Build params object for validation
  const rawParams = {
    origin: searchParams.get('origin') || undefined,
    destination: searchParams.get('destination') || undefined,
    departureDate: searchParams.get('departureDate') || undefined,
    returnDate: searchParams.get('returnDate') || undefined,
    adults: searchParams.get('adults') ? parseInt(searchParams.get('adults')!, 10) : undefined,
    children: searchParams.get('children') ? parseInt(searchParams.get('children')!, 10) : undefined,
    maxPrice: searchParams.get('maxPrice') ? parseInt(searchParams.get('maxPrice')!, 10) : undefined,
    travelClass: searchParams.get('travelClass') || undefined,
  };

  // Validate with Zod schema
  const validation = flightsGetSchema.safeParse(rawParams);
  if (!validation.success) {
    return createValidationErrorResponse(validation.error);
  }

  const {
    origin,
    destination,
    departureDate,
    returnDate,
    adults,
    children,
    maxPrice,
    travelClass,
  } = validation.data;

  const isRoundTrip = !!returnDate;

  try {
    // Use round trip search if return date is provided
    if (isRoundTrip) {
      const roundTripFlights = await searchRoundTripFlights({
        origin,
        destination,
        departureDate,
        returnDate,
        adults,
        children,
        maxPrice,
        travelClass,
      });

      // Transform round trip flights
      const transformedFlights = roundTripFlights.map((rt) => ({
        id: rt.id,
        isRoundTrip: true,
        totalPrice: rt.totalPrice,
        currency: rt.currency,
        outbound: {
          id: rt.outbound.id,
          airline: rt.outbound.airline,
          airlineLogo: rt.outbound.airlineLogo,
          flightNumber: rt.outbound.flightNumber,
          departureAirport: rt.outbound.departureAirport,
          departureCity: rt.outbound.departureCity,
          departureTime: formatTimeFromISO(rt.outbound.departureTime),
          arrivalAirport: rt.outbound.arrivalAirport,
          arrivalCity: rt.outbound.arrivalCity,
          arrivalTime: formatTimeFromISO(rt.outbound.arrivalTime),
          durationMinutes: parseDuration(rt.outbound.duration),
          stops: rt.outbound.stops,
          cabinClass: formatCabinClass(rt.outbound.cabinClass),
        },
        return: {
          id: rt.return.id,
          airline: rt.return.airline,
          airlineLogo: rt.return.airlineLogo,
          flightNumber: rt.return.flightNumber,
          departureAirport: rt.return.departureAirport,
          departureCity: rt.return.departureCity,
          departureTime: formatTimeFromISO(rt.return.departureTime),
          arrivalAirport: rt.return.arrivalAirport,
          arrivalCity: rt.return.arrivalCity,
          arrivalTime: formatTimeFromISO(rt.return.arrivalTime),
          durationMinutes: parseDuration(rt.return.duration),
          stops: rt.return.stops,
          cabinClass: formatCabinClass(rt.return.cabinClass),
        },
      }));

      return NextResponse.json(transformedFlights);
    }

    // One-way search
    const flights = await searchFlights({
      origin,
      destination,
      departureDate,
      adults,
      children,
      maxPrice,
      travelClass,
    });

    // Transform to match our schema
    const transformedFlights = flights.map((flight) => ({
      id: flight.id,
      isRoundTrip: false,
      airline: flight.airline,
      airlineLogo: flight.airlineLogo,
      flightNumber: flight.flightNumber,
      departureAirport: flight.departureAirport,
      departureCity: flight.departureCity,
      departureTime: formatTimeFromISO(flight.departureTime),
      arrivalAirport: flight.arrivalAirport,
      arrivalCity: flight.arrivalCity,
      arrivalTime: formatTimeFromISO(flight.arrivalTime),
      durationMinutes: parseDuration(flight.duration),
      stops: flight.stops,
      priceUsd: flight.price,
      cabinClass: formatCabinClass(flight.cabinClass),
    }));

    return NextResponse.json(transformedFlights);
  } catch (error) {
    console.error('Flight search error:', error);
    return NextResponse.json(
      { error: 'Failed to search flights. Please try again.' },
      { status: 500 }
    );
  }
}

// Helper to format ISO time to HH:MM
function formatTimeFromISO(isoTime: string): string {
  try {
    const date = new Date(isoTime);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch {
    return isoTime;
  }
}

// Helper to parse ISO 8601 duration (PT3H30M) to minutes
function parseDuration(duration: string): number {
  if (!duration) return 0;

  // Handle if already a number
  if (typeof duration === 'number') return duration;

  // Parse PT3H30M format
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (match) {
    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    return hours * 60 + minutes;
  }

  return 0;
}

// Helper to format cabin class
function formatCabinClass(cabin: string): string {
  const mapping: Record<string, string> = {
    'ECONOMY': 'Economy',
    'PREMIUM_ECONOMY': 'Premium Economy',
    'BUSINESS': 'Business',
    'FIRST': 'First',
  };
  return mapping[cabin] || cabin;
}
