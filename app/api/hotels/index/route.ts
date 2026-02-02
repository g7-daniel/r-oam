import { NextRequest, NextResponse } from 'next/server';
import { indexDestination, getHotelCount, clearDestinationHotels } from '@/lib/services/hotel-indexer';
import { HUB_CONFIGS } from '@/lib/configs/hotel-hubs';

/**
 * API endpoint for managing hotel index
 *
 * GET /api/hotels/index?country=Dominican Republic
 *   - Returns count of indexed hotels for the country
 *
 * POST /api/hotels/index
 *   - Body: { country: "Dominican Republic", countryCode: "DO" }
 *   - Indexes all hotels for the specified country
 *
 * DELETE /api/hotels/index?country=Dominican Republic
 *   - Clears all hotels for the country (for re-indexing)
 */

export async function GET(request: NextRequest) {
  const country = request.nextUrl.searchParams.get('country');

  if (!country) {
    // Return list of available countries
    return NextResponse.json({
      availableCountries: Object.keys(HUB_CONFIGS),
      message: 'Provide ?country= parameter to get count',
    });
  }

  const count = await getHotelCount(country);
  return NextResponse.json({
    country,
    hotelCount: count,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { country, countryCode = 'XX' } = body;

  if (!country) {
    return NextResponse.json(
      { error: 'Missing required field: country' },
      { status: 400 }
    );
  }

  if (!HUB_CONFIGS[country]) {
    return NextResponse.json(
      { error: `No hub configuration for: ${country}. Available: ${Object.keys(HUB_CONFIGS).join(', ')}` },
      { status: 400 }
    );
  }

  console.log(`Starting indexing for ${country}...`);

  try {
    const result = await indexDestination(country, countryCode);
    return NextResponse.json({
      success: true,
      country,
      ...result,
    });
  } catch (error: any) {
    console.error('Indexing error:', error);
    return NextResponse.json(
      { error: error.message || 'Indexing failed' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const country = request.nextUrl.searchParams.get('country');

  if (!country) {
    return NextResponse.json(
      { error: 'Missing required parameter: country' },
      { status: 400 }
    );
  }

  const deleted = await clearDestinationHotels(country);
  return NextResponse.json({
    success: true,
    country,
    deletedCount: deleted,
  });
}
