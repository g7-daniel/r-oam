/**
 * Makcorps Hotel Pricing API Client
 * Provides real-time hotel pricing from multiple OTAs
 *
 * API Docs: https://docs.makcorps.com/hotel-price-apis
 */

import { fetchWithTimeout } from './api-cache';

const MAKCORPS_API_KEY = process.env.MAKCORPS_API_KEY;
const MAKCORPS_BASE_URL = 'https://api.makcorps.com';
const MAKCORPS_TIMEOUT = 15000; // 15 second timeout

export interface MakcorpsPrice {
  vendor: string;
  price: number;
  totalPrice: number;
  tax: number;
  currency: string;
}

export interface MakcorpsHotel {
  name: string;
  hotelId: number;
  latitude: number;
  longitude: number;
  rating: number;
  reviewCount: number;
  telephone?: string;
  prices: MakcorpsPrice[];
  cheapestPrice: number;
  cheapestVendor: string;
}

export interface MakcorpsHotelMapping {
  documentId: string;
  hotelName: string;
  confidence: number;
}

/**
 * Helper to clean price strings like "US$1,960" or "$325" to numbers
 */
function cleanPrice(val: any): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    // Remove currency symbols, "US", commas, spaces
    const cleaned = val.replace(/[^0-9.-]/g, '');
    return parseFloat(cleaned) || 0;
  }
  return 0;
}

/**
 * Map a city name to Makcorps city_id
 * Required for the efficient /city endpoint
 */
export async function mapCityToMakcorps(
  cityName: string,
  country?: string
): Promise<string | null> {
  if (!MAKCORPS_API_KEY) {
    console.warn('[Makcorps] No API key configured');
    return null;
  }

  try {
    const searchQuery = country ? `${cityName}, ${country}` : cityName;
    const url = `${MAKCORPS_BASE_URL}/mapping?api_key=${MAKCORPS_API_KEY}&name=${encodeURIComponent(searchQuery)}`;

    console.log(`[Makcorps] Mapping city: "${searchQuery}"`);
    const response = await fetchWithTimeout(url, {}, MAKCORPS_TIMEOUT);
    const data = await response.json();

    if (!response.ok || data.error || (data.message && !Array.isArray(data))) {
      console.warn(`[Makcorps] City mapping failed: ${data.message || response.status}`);
      return null;
    }

    // Look for GEO type (city) result
    if (Array.isArray(data) && data.length > 0) {
      const cityMatch = data.find((item: any) =>
        item.type === 'GEO' && item.document_id
      );

      if (cityMatch) {
        console.log(`[Makcorps] Found city: ${cityMatch.name} -> ${cityMatch.document_id}`);
        return cityMatch.document_id;
      }

      // Fallback to first result with document_id
      const firstMatch = data.find((item: any) => item.document_id);
      if (firstMatch) {
        console.log(`[Makcorps] Using fallback city mapping: ${firstMatch.document_id}`);
        return firstMatch.document_id;
      }
    }

    console.log(`[Makcorps] No city mapping found for: ${searchQuery}`);
    return null;
  } catch (error) {
    console.error('[Makcorps] City mapping error:', error);
    return null;
  }
}

/**
 * Map a hotel name to Makcorps document_id
 */
export async function mapHotelToMakcorps(
  hotelName: string,
  city: string
): Promise<MakcorpsHotelMapping | null> {
  if (!MAKCORPS_API_KEY) {
    console.warn('[Makcorps] No API key configured');
    return null;
  }

  try {
    const searchQuery = `${hotelName}, ${city}`;
    const url = `${MAKCORPS_BASE_URL}/mapping?api_key=${MAKCORPS_API_KEY}&name=${encodeURIComponent(searchQuery)}`;

    console.log(`[Makcorps] Mapping hotel: "${searchQuery}"`);
    const response = await fetchWithTimeout(url, {}, MAKCORPS_TIMEOUT);
    const data = await response.json();

    if (!response.ok || data.error || (data.message && !Array.isArray(data))) {
      console.warn(`[Makcorps] Hotel mapping failed: ${data.message || response.status}`);
      return null;
    }

    if (Array.isArray(data) && data.length > 0) {
      const hotelMatch = data.find((item: any) =>
        item.type === 'HOTEL' && item.document_id
      );

      if (hotelMatch) {
        console.log(`[Makcorps] Found hotel: ${hotelMatch.name} -> ${hotelMatch.document_id}`);
        return {
          documentId: hotelMatch.document_id,
          hotelName: hotelMatch.name || hotelName,
          confidence: 0.9,
        };
      }

      const firstMatch = data.find((item: any) => item.document_id);
      if (firstMatch) {
        return {
          documentId: firstMatch.document_id,
          hotelName: firstMatch.name || hotelName,
          confidence: 0.7,
        };
      }
    }

    return null;
  } catch (error) {
    console.error('[Makcorps] Hotel mapping error:', error);
    return null;
  }
}

/**
 * Get ALL hotels in a city with prices - MOST EFFICIENT!
 * One API call returns ~30 hotels with their prices from top 4 vendors
 *
 * @param cityId - Makcorps city ID (from mapCityToMakcorps)
 * @param checkIn - YYYY-MM-DD
 * @param checkOut - YYYY-MM-DD
 * @param adults - Number of adults
 * @param rooms - Number of rooms (default 1)
 * @param pagination - Page number starting from 0 (default 0)
 */
export async function getHotelsByCity(
  cityId: string,
  checkIn: string,
  checkOut: string,
  adults: number,
  rooms: number = 1,
  pagination: number = 0
): Promise<{ hotels: MakcorpsHotel[]; totalCount: number; totalPages: number }> {
  if (!MAKCORPS_API_KEY) {
    console.warn('[Makcorps] No API key configured');
    return { hotels: [], totalCount: 0, totalPages: 0 };
  }

  try {
    const url = `${MAKCORPS_BASE_URL}/city?` +
      `cityid=${cityId}&` +
      `pagination=${pagination}&` +
      `cur=USD&` +
      `rooms=${rooms}&` +
      `adults=${adults}&` +
      `checkin=${checkIn}&` +
      `checkout=${checkOut}&` +
      `api_key=${MAKCORPS_API_KEY}`;

    console.log(`[Makcorps] Fetching hotels for city: ${cityId}, page ${pagination}`);
    const response = await fetchWithTimeout(url, {}, MAKCORPS_TIMEOUT);
    const data = await response.json();

    if (!response.ok || data.error || data.message) {
      console.warn(`[Makcorps] City hotels failed: ${data.message || response.status}`);
      return { hotels: [], totalCount: 0, totalPages: 0 };
    }

    if (!Array.isArray(data)) {
      console.warn('[Makcorps] Unexpected response format');
      return { hotels: [], totalCount: 0, totalPages: 0 };
    }

    const hotels: MakcorpsHotel[] = [];
    let totalCount = 0;
    let totalPages = 0;

    for (const item of data) {
      // Check if this is the metadata object (last item in array)
      if (Array.isArray(item) && item[0]?.totalHotelCount !== undefined) {
        totalCount = item[0].totalHotelCount;
        totalPages = item[0].totalpageCount;
        continue;
      }

      // Skip non-hotel objects
      if (!item.name || !item.hotelId) continue;

      // Extract all vendor prices (up to 4 for city endpoint)
      const prices: MakcorpsPrice[] = [];
      for (let i = 1; i <= 4; i++) {
        const vendor = item[`vendor${i}`];
        const priceRaw = item[`price${i}`];

        if (vendor && priceRaw) {
          const price = cleanPrice(priceRaw);
          if (price > 0) {
            prices.push({
              vendor,
              price,
              totalPrice: price, // City API doesn't include tax separately
              tax: 0,
              currency: 'USD'
            });
          }
        }
      }

      if (prices.length > 0) {
        // Sort by price ascending
        prices.sort((a, b) => a.price - b.price);

        hotels.push({
          name: item.name,
          hotelId: item.hotelId,
          latitude: item.geocode?.latitude || 0,
          longitude: item.geocode?.longitude || 0,
          rating: item.reviews?.rating || 0,
          reviewCount: item.reviews?.count || 0,
          telephone: item.telephone,
          prices,
          cheapestPrice: prices[0].price,
          cheapestVendor: prices[0].vendor,
        });
      }
    }

    console.log(`[Makcorps] Found ${hotels.length} hotels with prices (page ${pagination + 1}/${totalPages})`);
    return { hotels, totalCount, totalPages };
  } catch (error) {
    console.error('[Makcorps] City hotels error:', error);
    return { hotels: [], totalCount: 0, totalPages: 0 };
  }
}

/**
 * Get pricing for a specific hotel by ID (up to 19 vendors)
 * Use this when you need detailed pricing for ONE hotel
 */
export async function getHotelPricing(
  hotelId: string,
  checkIn: string,
  checkOut: string,
  adults: number,
  rooms: number = 1
): Promise<MakcorpsPrice[]> {
  if (!MAKCORPS_API_KEY) return [];

  try {
    const url = `${MAKCORPS_BASE_URL}/hotel?` +
      `hotelid=${hotelId}&` +
      `checkin=${checkIn}&` +
      `checkout=${checkOut}&` +
      `adults=${adults}&` +
      `rooms=${rooms}&` +
      `cur=USD&` +
      `api_key=${MAKCORPS_API_KEY}`;

    console.log(`[Makcorps] Fetching /hotel prices for: ${hotelId}`);
    const response = await fetchWithTimeout(url, {}, MAKCORPS_TIMEOUT);
    const data = await response.json();

    if (!response.ok || data.error || data.message) {
      console.warn(`[Makcorps] Hotel pricing failed: ${data.message || response.status}`);
      return [];
    }

    const prices: MakcorpsPrice[] = [];

    // Handle response format: { comparison: [[ {vendor1, price1}, {vendor2, price2}, ... ], []] }
    if (data.comparison && Array.isArray(data.comparison)) {
      const rawComparison = data.comparison[0] || [];

      // Each vendor is in a SEPARATE object, merge them all
      const comparison = Array.isArray(rawComparison)
        ? rawComparison.reduce((acc: any, obj: any) => ({ ...acc, ...obj }), {})
        : rawComparison;

      // API returns up to 19 vendors!
      for (let i = 1; i <= 20; i++) {
        const vendor = comparison[`vendor${i}`];
        const priceRaw = comparison[`price${i}`];
        const taxRaw = comparison[`tax${i}`];

        if (vendor && priceRaw) {
          const price = cleanPrice(priceRaw);
          const tax = cleanPrice(taxRaw);

          // Skip null prices (some vendors return null)
          if (price > 0) {
            prices.push({
              vendor,
              price,
              totalPrice: price + tax,
              tax,
              currency: 'USD'
            });
            console.log(`[Makcorps] Price: ${vendor} = $${price} (+$${tax} tax)`);
          }
        }
      }
    }

    prices.sort((a, b) => a.price - b.price);
    console.log(`[Makcorps] Total prices found: ${prices.length}`);
    return prices;
  } catch (error) {
    console.error('[Makcorps] Hotel pricing error:', error);
    return [];
  }
}

/**
 * Get cheapest price with source for display
 */
export async function getCheapestPrice(
  hotelName: string,
  city: string,
  checkIn: string,
  checkOut: string,
  adults: number
): Promise<{
  price: number;
  vendor: string;
  allPrices: MakcorpsPrice[];
  confidence: 'real';
} | null> {
  const mapping = await mapHotelToMakcorps(hotelName, city);
  if (!mapping) return null;

  const prices = await getHotelPricing(
    mapping.documentId,
    checkIn,
    checkOut,
    adults
  );

  if (prices.length === 0) return null;

  return {
    price: prices[0].price,
    vendor: prices[0].vendor,
    allPrices: prices,
    confidence: 'real'
  };
}

/**
 * Get prices for multiple hotels by searching each hotel name directly
 * The /mapping API works better with specific hotel names than city names
 */
export async function getBatchPricingByCity(
  cityName: string,
  country: string,
  hotelNames: string[],
  checkIn: string,
  checkOut: string,
  adults: number
): Promise<Map<string, { price: number; vendor: string; allPrices: MakcorpsPrice[] }>> {
  const results = new Map<string, { price: number; vendor: string; allPrices: MakcorpsPrice[] }>();

  if (!MAKCORPS_API_KEY) {
    console.warn('[Makcorps] No API key, skipping batch pricing');
    return results;
  }

  console.log(`[Makcorps] Getting prices for ${hotelNames.length} hotels in ${cityName}`);

  // Process hotels in batches of 3 to respect rate limits
  const batchSize = 3;
  for (let i = 0; i < hotelNames.length && i < 9; i += batchSize) { // Max 9 hotels to limit API calls
    const batch = hotelNames.slice(i, i + batchSize);

    await Promise.all(batch.map(async (hotelName) => {
      try {
        // Search for this specific hotel
        const mapping = await mapHotelToMakcorps(hotelName, cityName);
        if (!mapping) {
          console.log(`[Makcorps] No mapping for: ${hotelName}`);
          return;
        }

        // Get pricing for this hotel
        const prices = await getHotelPricing(
          mapping.documentId,
          checkIn,
          checkOut,
          adults
        );

        if (prices.length > 0) {
          const key = hotelName.toLowerCase();
          results.set(key, {
            price: prices[0].price,
            vendor: prices[0].vendor,
            allPrices: prices,
          });
          console.log(`[Makcorps] ${hotelName}: $${prices[0].price} via ${prices[0].vendor}`);
        }
      } catch (e) {
        console.error(`[Makcorps] Failed for ${hotelName}:`, e);
      }
    }));

    // Rate limit between batches
    if (i + batchSize < hotelNames.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log(`[Makcorps] Got prices for ${results.size}/${hotelNames.length} hotels`);
  return results;
}

/**
 * Fallback: Get prices using individual hotel lookups
 * Use this if city-based matching fails
 */
export async function getBatchPricing(
  hotels: Array<{ name: string; city: string }>,
  checkIn: string,
  checkOut: string,
  adults: number
): Promise<Map<string, { price: number; vendor: string; allPrices: MakcorpsPrice[] }>> {
  const results = new Map<string, { price: number; vendor: string; allPrices: MakcorpsPrice[] }>();

  if (!MAKCORPS_API_KEY) {
    console.warn('[Makcorps] No API key, skipping batch pricing');
    return results;
  }

  console.log(`[Makcorps] Batch pricing for ${hotels.length} hotels (individual lookups)...`);

  // Process in small batches to respect rate limits
  const batchSize = 2;
  for (let i = 0; i < hotels.length; i += batchSize) {
    const batch = hotels.slice(i, i + batchSize);

    await Promise.all(batch.map(async (hotel) => {
      const key = `${hotel.name}|${hotel.city}`.toLowerCase();
      try {
        // Map hotel name to document_id
        const mapping = await mapHotelToMakcorps(hotel.name, hotel.city);
        if (!mapping) {
          return;
        }

        // Get prices
        const prices = await getHotelPricing(
          mapping.documentId,
          checkIn,
          checkOut,
          adults
        );

        if (prices.length > 0) {
          results.set(key, {
            price: prices[0].price,
            vendor: prices[0].vendor,
            allPrices: prices,
          });
          console.log(`[Makcorps] ${hotel.name}: $${prices[0].price} via ${prices[0].vendor}`);
        }
      } catch (e) {
        console.error(`[Makcorps] Failed for ${hotel.name}:`, e);
      }
    }));

    // Rate limit: 1 second between batches
    if (i + batchSize < hotels.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`[Makcorps] Batch complete: ${results.size}/${hotels.length} hotels priced`);
  return results;
}
