/**
 * Makcorps Hotel Pricing API Client
 * Provides real-time hotel pricing from multiple OTAs
 *
 * API Docs: https://docs.makcorps.com/hotel-price-apis
 */

import { fetchWithTimeout } from './api-cache';
import { isConfigured, serverEnv } from './env';

// Use lazy evaluation to avoid issues during module load
const getMakcorpsApiKey = () => serverEnv.MAKCORPS_API_KEY;
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
function cleanPrice(val: unknown): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    // Remove currency symbols, "US", commas, spaces
    const cleaned = val.replace(/[^0-9.-]/g, '');
    return parseFloat(cleaned) || 0;
  }
  return 0;
}

// Type for mapping API response items
interface MappingResponseItem {
  type?: string;
  document_id?: string;
  name?: string;
}

// Type for city API hotel item - used in parseHotelItem
type CityHotelItem = {
  name?: string;
  hotelId?: number;
  geocode?: { latitude?: number; longitude?: number };
  reviews?: { rating?: number; count?: number };
  telephone?: string;
  vendor1?: string;
  price1?: string | number;
  vendor2?: string;
  price2?: string | number;
  vendor3?: string;
  price3?: string | number;
  vendor4?: string;
  price4?: string | number;
  [key: string]: unknown;
};

// Type for comparison response
interface ComparisonItem {
  [key: string]: string | number | null | undefined;
}

/**
 * Map a city name to Makcorps city_id
 * Required for the efficient /city endpoint
 */
export async function mapCityToMakcorps(
  cityName: string,
  country?: string
): Promise<string | null> {
  if (!isConfigured.makcorps()) {
    return null;
  }

  try {
    const searchQuery = country ? `${cityName}, ${country}` : cityName;
    const url = `${MAKCORPS_BASE_URL}/mapping?api_key=${getMakcorpsApiKey()}&name=${encodeURIComponent(searchQuery)}`;

    const response = await fetchWithTimeout(url, {}, MAKCORPS_TIMEOUT);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (data.error || (data.message && !Array.isArray(data))) {
      return null;
    }

    // Look for GEO type (city) result
    if (Array.isArray(data) && data.length > 0) {
      const items = data as MappingResponseItem[];
      const cityMatch = items.find((item) =>
        item.type === 'GEO' && item.document_id
      );

      if (cityMatch?.document_id) {
        return cityMatch.document_id;
      }

      // Fallback to first result with document_id
      const firstMatch = items.find((item) => item.document_id);
      if (firstMatch?.document_id) {
        return firstMatch.document_id;
      }
    }

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
  if (!isConfigured.makcorps()) {
    return null;
  }

  try {
    const searchQuery = `${hotelName}, ${city}`;
    const url = `${MAKCORPS_BASE_URL}/mapping?api_key=${getMakcorpsApiKey()}&name=${encodeURIComponent(searchQuery)}`;

    const response = await fetchWithTimeout(url, {}, MAKCORPS_TIMEOUT);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (data.error || (data.message && !Array.isArray(data))) {
      return null;
    }

    if (Array.isArray(data) && data.length > 0) {
      const items = data as MappingResponseItem[];
      const hotelMatch = items.find((item) =>
        item.type === 'HOTEL' && item.document_id
      );

      if (hotelMatch?.document_id) {
        return {
          documentId: hotelMatch.document_id,
          hotelName: hotelMatch.name || hotelName,
          confidence: 0.9,
        };
      }

      const firstMatch = items.find((item) => item.document_id);
      if (firstMatch?.document_id) {
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
  if (!isConfigured.makcorps()) {
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
      `api_key=${getMakcorpsApiKey()}`;

    const response = await fetchWithTimeout(url, {}, MAKCORPS_TIMEOUT);

    if (!response.ok) {
      return { hotels: [], totalCount: 0, totalPages: 0 };
    }

    const data = await response.json();

    if (data.error || data.message) {
      return { hotels: [], totalCount: 0, totalPages: 0 };
    }

    if (!Array.isArray(data)) {
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
  if (!isConfigured.makcorps()) return [];

  try {
    const url = `${MAKCORPS_BASE_URL}/hotel?` +
      `hotelid=${hotelId}&` +
      `checkin=${checkIn}&` +
      `checkout=${checkOut}&` +
      `adults=${adults}&` +
      `rooms=${rooms}&` +
      `cur=USD&` +
      `api_key=${getMakcorpsApiKey()}`;

    const response = await fetchWithTimeout(url, {}, MAKCORPS_TIMEOUT);

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    if (data.error || data.message) {
      return [];
    }

    const prices: MakcorpsPrice[] = [];

    // Handle response format: { comparison: [[ {vendor1, price1}, {vendor2, price2}, ... ], []] }
    if (data.comparison && Array.isArray(data.comparison)) {
      const rawComparison = data.comparison[0] || [];

      // Each vendor is in a SEPARATE object, merge them all
      const comparison: ComparisonItem = Array.isArray(rawComparison)
        ? rawComparison.reduce((acc: ComparisonItem, obj: ComparisonItem) => ({ ...acc, ...obj }), {})
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
              vendor: String(vendor),
              price,
              totalPrice: price + tax,
              tax,
              currency: 'USD'
            });
          }
        }
      }
    }

    prices.sort((a, b) => a.price - b.price);
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

  if (!isConfigured.makcorps()) {
    return results;
  }

  // Process hotels in batches of 3 to respect rate limits
  const batchSize = 3;
  for (let i = 0; i < hotelNames.length && i < 9; i += batchSize) { // Max 9 hotels to limit API calls
    const batch = hotelNames.slice(i, i + batchSize);

    await Promise.all(batch.map(async (hotelName) => {
      try {
        // Search for this specific hotel
        const mapping = await mapHotelToMakcorps(hotelName, cityName);
        if (!mapping) {
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

  if (!isConfigured.makcorps()) {
    return results;
  }

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

  return results;
}
