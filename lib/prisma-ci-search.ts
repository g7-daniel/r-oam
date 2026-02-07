/**
 * Case-insensitive search helpers for Prisma with SQLite.
 *
 * Problem: Prisma's `contains` operator on SQLite uses binary string comparison,
 * which is case-sensitive. Searching for "paris" won't match "Paris".
 *
 * Solution: Use raw SQL with LOWER() for text matching. SQLite's LOWER() handles
 * ASCII characters. For full Unicode support, SQLite would need the ICU extension,
 * but ASCII coverage is sufficient for destination/city/country names.
 *
 * All query parameters use positional placeholders ($1, $2, ...) to prevent
 * SQL injection.
 */

import { prisma } from './prisma';

// ============================================================================
// Types
// ============================================================================

/** Text fields on the Hotel model that support case-insensitive search */
type HotelTextField = 'name' | 'country' | 'region' | 'city';

/** All valid Hotel column names that can be used in ORDER BY clauses */
type HotelColumnName =
  | 'id' | 'placeId' | 'name' | 'address' | 'city' | 'region' | 'country'
  | 'countryCode' | 'lat' | 'lng' | 'googleRating' | 'reviewCount'
  | 'priceLevel' | 'photoReference' | 'types' | 'indexedAt' | 'searchHub'
  | 'amadeusHotelId' | 'amadeusMatched';

/**
 * Runtime allowlist of valid Hotel column names for SQL interpolation.
 * This prevents SQL injection via orderBy field names.
 */
const VALID_HOTEL_COLUMNS = new Set<string>([
  'id', 'placeId', 'name', 'address', 'city', 'region', 'country',
  'countryCode', 'lat', 'lng', 'googleRating', 'reviewCount',
  'priceLevel', 'photoReference', 'types', 'indexedAt', 'searchHub',
  'amadeusHotelId', 'amadeusMatched',
]);

/** Runtime allowlist of valid text fields for WHERE clause interpolation */
const VALID_TEXT_FIELDS = new Set<string>(['name', 'country', 'region', 'city']);

/** A case-insensitive text contains condition */
interface CIContains {
  field: HotelTextField;
  value: string;
}

/** A lat/lng bounding box used as an OR alternative to text matching */
interface LatLngBox {
  latMin: number;
  latMax: number;
  lngMin: number;
  lngMax: number;
}

/**
 * An OR group can contain text-match conditions and optionally a lat/lng box.
 * The group evaluates as: (text1 OR text2 OR ... OR latLngBox)
 */
interface OrGroup {
  textConditions: CIContains[];
  latLngBox?: LatLngBox;
}

interface OrderByClause {
  field: HotelColumnName;
  direction: 'ASC' | 'DESC';
  nulls?: 'FIRST' | 'LAST';
}

/**
 * Options for building a hotel search query.
 *
 * The top-level structure is an AND of all provided conditions.
 * `orGroups` are each wrapped in parentheses with OR logic inside.
 * Multiple `orGroups` are ANDed together.
 */
interface HotelSearchOptions {
  /** Groups of OR conditions. Each group is ANDed with others. */
  orGroups?: OrGroup[];
  /** Individual AND conditions (case-insensitive contains) */
  andContains?: CIContains[];
  /** Minimum google rating */
  minRating?: number;
  /** Price level range (inclusive) */
  priceLevel?: { min: number; max: number };
  /** ORDER BY clauses */
  orderBy?: OrderByClause[];
  /** LIMIT */
  take?: number;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Count hotels with case-insensitive text matching.
 *
 * Example:
 * ```ts
 * const count = await countHotelsCI({
 *   orGroups: [{
 *     textConditions: [
 *       { field: 'region', value: 'punta cana' },
 *       { field: 'city', value: 'punta cana' },
 *     ],
 *   }],
 *   minRating: 3.5,
 * });
 * ```
 */
export async function countHotelsCI(
  options: Omit<HotelSearchOptions, 'orderBy' | 'take'>
): Promise<number> {
  const { whereSql, params } = buildWhereClause(options);
  const query = `SELECT COUNT(*) as "count" FROM "Hotel" ${whereSql}`;
  const result = await prisma.$queryRawUnsafe<[{ count: number | bigint }]>(query, ...params);
  return Number(result[0]?.count ?? 0);
}

/**
 * Find hotels with case-insensitive text matching.
 * Returns rows with the same column names as the Hotel model.
 *
 * Example:
 * ```ts
 * const hotels = await findHotelsCI({
 *   orGroups: [{
 *     textConditions: [
 *       { field: 'country', value: 'dominican republic' },
 *       { field: 'region', value: 'dominican republic' },
 *       { field: 'city', value: 'dominican republic' },
 *     ],
 *   }],
 *   andContains: [
 *     { field: 'name', value: 'marriott' },
 *   ],
 *   orderBy: [
 *     { field: 'googleRating', direction: 'DESC' },
 *     { field: 'reviewCount', direction: 'DESC' },
 *   ],
 *   take: 500,
 * });
 * ```
 */
export async function findHotelsCI(
  options: HotelSearchOptions
): Promise<any[]> {
  const { whereSql, params } = buildWhereClause(options);

  let orderBySql = '';
  if (options.orderBy && options.orderBy.length > 0) {
    const clauses = options.orderBy.map((o) => {
      // Runtime validation: reject unrecognized column names to prevent SQL injection
      if (!VALID_HOTEL_COLUMNS.has(o.field)) {
        throw new Error(`Invalid orderBy field: "${o.field}". Must be a valid Hotel column.`);
      }
      // Handle NULL ordering for SQLite (no native NULLS FIRST/LAST before 3.30)
      if (o.nulls === 'LAST') {
        return `CASE WHEN "${o.field}" IS NULL THEN 1 ELSE 0 END, "${o.field}" ${o.direction}`;
      }
      return `"${o.field}" ${o.direction}`;
    });
    orderBySql = ` ORDER BY ${clauses.join(', ')}`;
  }

  let limitSql = '';
  if (options.take && options.take > 0) {
    limitSql = ` LIMIT ${Math.floor(options.take)}`;
  }

  const query = `SELECT * FROM "Hotel" ${whereSql}${orderBySql}${limitSql}`;
  return prisma.$queryRawUnsafe(query, ...params);
}

// ============================================================================
// Internal helpers
// ============================================================================

function buildWhereClause(
  options: Omit<HotelSearchOptions, 'orderBy' | 'take'>
): { whereSql: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  // OR groups: each group is (cond1 OR cond2 OR ...), groups are ANDed
  if (options.orGroups) {
    for (const group of options.orGroups) {
      const orParts: string[] = [];

      // Text conditions within the OR group
      for (const cond of group.textConditions) {
        if (cond.value) {
          // Runtime validation: reject unrecognized field names to prevent SQL injection
          if (!VALID_TEXT_FIELDS.has(cond.field)) {
            throw new Error(`Invalid text search field: "${cond.field}". Must be one of: ${Array.from(VALID_TEXT_FIELDS).join(', ')}`);
          }
          orParts.push(`LOWER("${cond.field}") LIKE $${idx}`);
          params.push(`%${cond.value.toLowerCase()}%`);
          idx++;
        }
      }

      // Optional lat/lng box as an OR alternative
      if (group.latLngBox) {
        const box = group.latLngBox;
        orParts.push(
          `("lat" >= $${idx} AND "lat" <= $${idx + 1} AND "lng" >= $${idx + 2} AND "lng" <= $${idx + 3})`
        );
        params.push(box.latMin, box.latMax, box.lngMin, box.lngMax);
        idx += 4;
      }

      if (orParts.length > 0) {
        conditions.push(`(${orParts.join(' OR ')})`);
      }
    }
  }

  // AND contains: each condition is individually ANDed
  if (options.andContains) {
    for (const cond of options.andContains) {
      if (cond.value) {
        // Runtime validation: reject unrecognized field names to prevent SQL injection
        if (!VALID_TEXT_FIELDS.has(cond.field)) {
          throw new Error(`Invalid text search field: "${cond.field}". Must be one of: ${Array.from(VALID_TEXT_FIELDS).join(', ')}`);
        }
        conditions.push(`LOWER("${cond.field}") LIKE $${idx}`);
        params.push(`%${cond.value.toLowerCase()}%`);
        idx++;
      }
    }
  }

  // Minimum google rating
  if (options.minRating !== undefined && options.minRating !== null) {
    conditions.push(`"googleRating" >= $${idx}`);
    params.push(options.minRating);
    idx++;
  }

  // Price level range
  if (options.priceLevel) {
    conditions.push(`"priceLevel" >= $${idx}`);
    params.push(options.priceLevel.min);
    idx++;
    conditions.push(`"priceLevel" <= $${idx}`);
    params.push(options.priceLevel.max);
    idx++;
  }

  const whereSql = conditions.length > 0
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  return { whereSql, params };
}
