-- CreateTable
CREATE TABLE "Hotel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "placeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "googleRating" REAL,
    "reviewCount" INTEGER,
    "priceLevel" INTEGER,
    "photoReference" TEXT,
    "types" TEXT,
    "indexedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "searchHub" TEXT,
    "amadeusHotelId" TEXT,
    "amadeusMatched" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "PriceCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "placeId" TEXT NOT NULL,
    "checkIn" TEXT NOT NULL,
    "checkOut" TEXT NOT NULL,
    "adults" INTEGER NOT NULL,
    "amadeusHotelId" TEXT,
    "pricePerNight" REAL,
    "totalPrice" REAL,
    "currency" TEXT,
    "hasAvailability" BOOLEAN NOT NULL,
    "cachedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Hotel_placeId_key" ON "Hotel"("placeId");

-- CreateIndex
CREATE INDEX "Hotel_country_region_idx" ON "Hotel"("country", "region");

-- CreateIndex
CREATE INDEX "Hotel_lat_lng_idx" ON "Hotel"("lat", "lng");

-- CreateIndex
CREATE INDEX "Hotel_name_idx" ON "Hotel"("name");

-- CreateIndex
CREATE INDEX "PriceCache_expiresAt_idx" ON "PriceCache"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PriceCache_placeId_checkIn_checkOut_adults_key" ON "PriceCache"("placeId", "checkIn", "checkOut", "adults");
