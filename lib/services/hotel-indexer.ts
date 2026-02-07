import { prisma } from '@/lib/prisma';
import { searchHotelsWithPagination, searchHotelsByGeocode, GooglePlaceResult } from '@/lib/google-maps';
import { HUB_CONFIGS, SearchHub } from '@/lib/configs/hotel-hubs';

export interface IndexingResult {
  indexed: number;
  skipped: number;
  errors: number;
}

/**
 * Index hotels for a destination using hub-based searches
 * This populates the database with hotels from Google Places
 */
export async function indexDestination(
  country: string,
  countryCode: string = 'XX'
): Promise<IndexingResult> {
  const hubs = HUB_CONFIGS[country];
  if (!hubs) {
    throw new Error(`No hub configuration for: ${country}`);
  }

  let indexed = 0;
  let skipped = 0;
  let errors = 0;
  const seenPlaceIds = new Set<string>();

  for (const hub of hubs) {

    try {
      // 1. Geocode search
      const geocodeResults = await searchHotelsByGeocode(
        hub.lat,
        hub.lng,
        hub.radiusKm * 1000,
        60
      );

      // 2. Text searches
      const textResults: GooglePlaceResult[] = [];
      for (const query of hub.textQueries) {
        try {
          const results = await searchHotelsWithPagination(query, 60);
          textResults.push(...results);
        } catch (error) {
          console.error(`  - Text search error for "${query}":`, error);
          errors++;
        }
      }

      // 3. Merge and dedupe BY PLACE_ID ONLY
      const allResults = [...geocodeResults, ...textResults];
      const uniqueResults: GooglePlaceResult[] = [];

      for (const place of allResults) {
        if (!place.place_id) {
          skipped++;
          continue;
        }

        if (seenPlaceIds.has(place.place_id)) {
          skipped++;
          continue;
        }

        if (!place.geometry?.location || typeof place.geometry.location.lat !== 'number' || typeof place.geometry.location.lng !== 'number') {
          skipped++;
          continue;
        }

        seenPlaceIds.add(place.place_id);
        uniqueResults.push(place);
      }

      // Batch upsert in transactions to reduce N+1 query overhead
      const UPSERT_BATCH_SIZE = 50;
      for (let batchStart = 0; batchStart < uniqueResults.length; batchStart += UPSERT_BATCH_SIZE) {
        const batch = uniqueResults.slice(batchStart, batchStart + UPSERT_BATCH_SIZE);
        try {
          await prisma.$transaction(
            batch.map(place => prisma.hotel.upsert({
              where: { placeId: place.place_id! },
              create: {
                placeId: place.place_id!,
                name: place.name,
                address: place.formatted_address || place.vicinity || null,
                city: hub.name,
                region: hub.name,
                country: country,
                countryCode: countryCode,
                lat: place.geometry.location.lat,
                lng: place.geometry.location.lng,
                googleRating: place.rating || null,
                reviewCount: place.user_ratings_total || null,
                priceLevel: place.price_level || null,
                photoReference: place.photos?.[0]?.photo_reference || null,
                types: place.types ? JSON.stringify(place.types) : null,
                searchHub: hub.name,
              },
              update: {
                name: place.name,
                googleRating: place.rating || null,
                reviewCount: place.user_ratings_total || null,
                indexedAt: new Date(),
              },
            }))
          );
          indexed += batch.length;
        } catch (error) {
          // Fallback to individual upserts if batch transaction fails
          for (const place of batch) {
            try {
              await prisma.hotel.upsert({
                where: { placeId: place.place_id! },
                create: {
                  placeId: place.place_id!,
                  name: place.name,
                  address: place.formatted_address || place.vicinity || null,
                  city: hub.name,
                  region: hub.name,
                  country: country,
                  countryCode: countryCode,
                  lat: place.geometry.location.lat,
                  lng: place.geometry.location.lng,
                  googleRating: place.rating || null,
                  reviewCount: place.user_ratings_total || null,
                  priceLevel: place.price_level || null,
                  photoReference: place.photos?.[0]?.photo_reference || null,
                  types: place.types ? JSON.stringify(place.types) : null,
                  searchHub: hub.name,
                },
                update: {
                  name: place.name,
                  googleRating: place.rating || null,
                  reviewCount: place.user_ratings_total || null,
                  indexedAt: new Date(),
                },
              });
              indexed++;
            } catch (innerError) {
              console.error(`  - Failed to upsert hotel "${place.name}":`, innerError);
              errors++;
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error indexing hub ${hub.name}:`, error);
      errors++;
    }
  }

  return { indexed, skipped, errors };
}

/**
 * Index a single hub (useful for targeted indexing)
 */
export async function indexHub(
  hub: SearchHub,
  country: string,
  countryCode: string = 'XX'
): Promise<IndexingResult> {
  let indexed = 0;
  let skipped = 0;
  let errors = 0;
  const seenPlaceIds = new Set<string>();

  // 1. Geocode search
  let geocodeResults: GooglePlaceResult[] = [];
  try {
    geocodeResults = await searchHotelsByGeocode(
      hub.lat,
      hub.lng,
      hub.radiusKm * 1000,
      60
    );
  } catch (error) {
    console.error(`  - Geocode search error for hub ${hub.name}:`, error);
    errors++;
  }

  // 2. Text searches
  const textResults: GooglePlaceResult[] = [];
  for (const query of hub.textQueries) {
    try {
      const results = await searchHotelsWithPagination(query, 60);
      textResults.push(...results);
    } catch (error) {
      console.error(`  - Text search error for "${query}":`, error);
      errors++;
    }
  }

  // 3. Merge and dedupe BY PLACE_ID ONLY
  const allResults = [...geocodeResults, ...textResults];
  const uniqueResults: GooglePlaceResult[] = [];

  for (const place of allResults) {
    if (!place.place_id || seenPlaceIds.has(place.place_id)) {
      skipped++;
      continue;
    }

    if (!place.geometry?.location || typeof place.geometry.location.lat !== 'number' || typeof place.geometry.location.lng !== 'number') {
      skipped++;
      continue;
    }

    seenPlaceIds.add(place.place_id);
    uniqueResults.push(place);
  }

  // Batch upsert in transactions to reduce N+1 query overhead
  const UPSERT_BATCH_SIZE = 50;
  for (let batchStart = 0; batchStart < uniqueResults.length; batchStart += UPSERT_BATCH_SIZE) {
    const batch = uniqueResults.slice(batchStart, batchStart + UPSERT_BATCH_SIZE);
    try {
      await prisma.$transaction(
        batch.map(place => prisma.hotel.upsert({
          where: { placeId: place.place_id! },
          create: {
            placeId: place.place_id!,
            name: place.name,
            address: place.formatted_address || place.vicinity || null,
            city: hub.name,
            region: hub.name,
            country: country,
            countryCode: countryCode,
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng,
            googleRating: place.rating || null,
            reviewCount: place.user_ratings_total || null,
            priceLevel: place.price_level || null,
            photoReference: place.photos?.[0]?.photo_reference || null,
            types: place.types ? JSON.stringify(place.types) : null,
            searchHub: hub.name,
          },
          update: {
            name: place.name,
            googleRating: place.rating || null,
            reviewCount: place.user_ratings_total || null,
            indexedAt: new Date(),
          },
        }))
      );
      indexed += batch.length;
    } catch (error) {
      // Fallback to individual upserts if batch transaction fails
      for (const place of batch) {
        try {
          await prisma.hotel.upsert({
            where: { placeId: place.place_id! },
            create: {
              placeId: place.place_id!,
              name: place.name,
              address: place.formatted_address || place.vicinity || null,
              city: hub.name,
              region: hub.name,
              country: country,
              countryCode: countryCode,
              lat: place.geometry.location.lat,
              lng: place.geometry.location.lng,
              googleRating: place.rating || null,
              reviewCount: place.user_ratings_total || null,
              priceLevel: place.price_level || null,
              photoReference: place.photos?.[0]?.photo_reference || null,
              types: place.types ? JSON.stringify(place.types) : null,
              searchHub: hub.name,
            },
            update: {
              name: place.name,
              googleRating: place.rating || null,
              reviewCount: place.user_ratings_total || null,
              indexedAt: new Date(),
            },
          });
          indexed++;
        } catch (innerError) {
          console.error(`  - Failed to upsert hotel "${place.name}" in hub ${hub.name}:`, innerError);
          errors++;
        }
      }
    }
  }

  return { indexed, skipped, errors };
}

/**
 * Get hotel count by country/region
 */
export async function getHotelCount(country?: string, region?: string): Promise<number> {
  const where: { country?: string; region?: string } = {};
  if (country) where.country = country;
  if (region) where.region = region;

  return prisma.hotel.count({ where });
}

/**
 * Clear all hotels for a destination (for re-indexing)
 */
export async function clearDestinationHotels(country: string): Promise<number> {
  const result = await prisma.hotel.deleteMany({
    where: { country },
  });
  return result.count;
}
