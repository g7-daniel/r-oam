/**
 * Exchange Rate Service
 *
 * Provides currency conversion rates to USD.
 *
 * IMPORTANT: For production, replace getExchangeRates() with an API call to:
 * - https://api.exchangerate-api.com/v4/latest/USD (free, no key required)
 * - https://openexchangerates.org/api/latest.json (requires free API key)
 * - https://api.currencyapi.com/v3/latest (requires free API key)
 */

// Cache for exchange rates
let cachedRates: Record<string, number> | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour cache

// Fallback rates (updated 2026-02-01)
// These are used if API fetch fails
const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  EUR: 1.09,
  GBP: 1.27,
  JPY: 0.0066,
  CNY: 0.14,
  KRW: 0.00072,
  THB: 0.029,
  AUD: 0.64,
  CAD: 0.72,
  SGD: 0.75,
  HKD: 0.13,
  MXN: 0.058,
  CHF: 1.11,
  NZD: 0.59,
  INR: 0.012,
  AED: 0.27,
  BRL: 0.17,
  ZAR: 0.054,
  SEK: 0.095,
  NOK: 0.091,
  DKK: 0.15,
  PLN: 0.25,
  CZK: 0.043,
  HUF: 0.0027,
  ILS: 0.28,
  PHP: 0.018,
  IDR: 0.000063,
  MYR: 0.22,
  VND: 0.00004,
};

/**
 * Fetch exchange rates from API
 * Returns rates as multipliers to convert TO USD (e.g., EUR 1.09 means 1 EUR = 1.09 USD)
 */
async function fetchExchangeRates(): Promise<Record<string, number> | null> {
  try {
    // Using exchangerate-api.com (free, no key required)
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      console.warn(`Exchange rate API returned ${response.status}`);
      return null;
    }

    const data = await response.json();

    // API returns rates FROM USD, we need TO USD (inverse)
    // e.g., if API says 1 USD = 0.92 EUR, we want 1 EUR = 1.09 USD
    const rates: Record<string, number> = { USD: 1 };

    for (const [currency, rate] of Object.entries(data.rates)) {
      if (typeof rate === 'number' && rate > 0) {
        rates[currency] = 1 / rate;
      }
    }

    console.log('Exchange rates fetched successfully');
    return rates;
  } catch (error) {
    console.warn('Failed to fetch exchange rates:', error);
    return null;
  }
}

/**
 * Get current exchange rates (with caching)
 */
export async function getExchangeRates(): Promise<Record<string, number>> {
  const now = Date.now();

  // Return cached rates if still valid
  if (cachedRates && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return cachedRates;
  }

  // Try to fetch fresh rates
  const freshRates = await fetchExchangeRates();

  if (freshRates) {
    cachedRates = freshRates;
    cacheTimestamp = now;
    return freshRates;
  }

  // If fetch failed but we have cached rates (even if stale), use them
  if (cachedRates) {
    console.warn('Using stale cached exchange rates');
    return cachedRates;
  }

  // Last resort: use fallback rates
  console.warn('Using fallback exchange rates');
  return FALLBACK_RATES;
}

/**
 * Synchronous version using fallback rates (for cases where async isn't possible)
 * Prefer getExchangeRates() when possible
 */
export function getExchangeRatesSync(): Record<string, number> {
  return cachedRates || FALLBACK_RATES;
}

/**
 * Convert an amount from one currency to USD
 */
export async function convertToUSD(amount: number, fromCurrency: string): Promise<number> {
  if (fromCurrency === 'USD') return amount;

  const rates = await getExchangeRates();
  const rate = rates[fromCurrency];

  if (!rate) {
    console.warn(`Unknown currency "${fromCurrency}" - returning amount without conversion`);
    return amount;
  }

  return amount * rate;
}

/**
 * Convert an amount from one currency to USD (synchronous)
 */
export function convertToUSDSync(amount: number, fromCurrency: string): number {
  if (fromCurrency === 'USD') return amount;

  const rates = getExchangeRatesSync();
  const rate = rates[fromCurrency];

  if (!rate) {
    console.warn(`Unknown currency "${fromCurrency}" - returning amount without conversion`);
    return amount;
  }

  return amount * rate;
}
