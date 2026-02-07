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

  try {
    const count = await getHotelCount(country);
    return NextResponse.json({
      country,
      hotelCount: count,
    });
  } catch (error: any) {
    console.error('Hotel count error:', error);
    return NextResponse.json(
      { error: 'Failed to get hotel count' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Admin-only endpoint: require a secret token to prevent unauthorized indexing
  const authHeader = request.headers.get('authorization');
  const adminToken = process.env.ADMIN_API_TOKEN;
  if (!adminToken || authHeader !== `Bearer ${adminToken}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON in request body' },
      { status: 400 }
    );
  }
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
      { error: 'Indexing failed' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  // Admin-only endpoint: require a secret token to prevent unauthorized deletion
  const authHeader = request.headers.get('authorization');
  const adminToken = process.env.ADMIN_API_TOKEN;
  if (!adminToken || authHeader !== `Bearer ${adminToken}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const country = request.nextUrl.searchParams.get('country');

  if (!country) {
    return NextResponse.json(
      { error: 'Missing required parameter: country' },
      { status: 400 }
    );
  }

  try {
    const deleted = await clearDestinationHotels(country);
    return NextResponse.json({
      success: true,
      country,
      deletedCount: deleted,
    });
  } catch (error: any) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: 'Failed to clear hotels' },
      { status: 500 }
    );
  }
}
