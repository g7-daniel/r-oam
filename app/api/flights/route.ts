import { NextRequest, NextResponse } from 'next/server';
import { searchFlights, searchRoundTripFlights } from '@/lib/amadeus';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const origin = searchParams.get('origin');
  const destination = searchParams.get('destination');
  const departureDate = searchParams.get('departureDate');
  const returnDate = searchParams.get('returnDate'); // For round trips
  const adults = parseInt(searchParams.get('adults') || '1', 10);
  const children = parseInt(searchParams.get('children') || '0', 10);
  const maxPrice = searchParams.get('maxPrice')
    ? parseInt(searchParams.get('maxPrice')!, 10)
    : undefined;
  // Cabin class: ECONOMY, PREMIUM_ECONOMY, BUSINESS, FIRST
  const travelClass = searchParams.get('travelClass') || undefined;

  if (!origin || !destination || !departureDate) {
    return NextResponse.json(
      { error: 'Missing required parameters: origin, destination, departureDate' },
      { status: 400 }
    );
  }

  // Validate dates
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const departure = new Date(departureDate);

  if (departure < today) {
    return NextResponse.json(
      { error: `Departure date ${departureDate} is in the past. Please select a future date.` },
      { status: 400 }
    );
  }

  const isRoundTrip = !!returnDate;

  console.log('Flight search params:', {
    origin,
    destination,
    departureDate,
    returnDate,
    adults,
    children,
    maxPrice,
    travelClass,
    isRoundTrip,
  });

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

      console.log('Amadeus returned', roundTripFlights.length, 'round trip options');

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
          departureTime: formatTime(rt.outbound.departureTime),
          arrivalAirport: rt.outbound.arrivalAirport,
          arrivalCity: rt.outbound.arrivalCity,
          arrivalTime: formatTime(rt.outbound.arrivalTime),
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
          departureTime: formatTime(rt.return.departureTime),
          arrivalAirport: rt.return.arrivalAirport,
          arrivalCity: rt.return.arrivalCity,
          arrivalTime: formatTime(rt.return.arrivalTime),
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

    console.log('Amadeus returned', flights.length, 'one-way flights');

    // Transform to match our schema
    const transformedFlights = flights.map((flight) => ({
      id: flight.id,
      isRoundTrip: false,
      airline: flight.airline,
      airlineLogo: flight.airlineLogo,
      flightNumber: flight.flightNumber,
      departureAirport: flight.departureAirport,
      departureCity: flight.departureCity,
      departureTime: formatTime(flight.departureTime),
      arrivalAirport: flight.arrivalAirport,
      arrivalCity: flight.arrivalCity,
      arrivalTime: formatTime(flight.arrivalTime),
      durationMinutes: parseDuration(flight.duration),
      stops: flight.stops,
      priceUsd: flight.price,
      cabinClass: formatCabinClass(flight.cabinClass),
    }));

    return NextResponse.json(transformedFlights);
  } catch (error) {
    console.error('Flight search error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to search flights: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// Helper to format ISO time to HH:MM
function formatTime(isoTime: string): string {
  try {
    const date = new Date(isoTime);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
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
