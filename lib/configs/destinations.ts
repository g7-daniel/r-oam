/**
 * Destination configurations for multi-city hotel searches
 * Maps destinations to their IATA city codes and search parameters
 */

export interface DestinationConfig {
  type: 'city' | 'region' | 'country';
  cityCodes: string[];          // All IATA codes to search
  centerLat: number;            // Center point for distance calc
  centerLng: number;
  searchRadiusKm: number;       // Max distance from center
}

export const DESTINATION_CONFIGS: Record<string, DestinationConfig> = {
  // ============ CARIBBEAN ============

  // Dominican Republic - search all major city codes
  'Dominican Republic': {
    type: 'country',
    cityCodes: ['SDQ', 'PUJ', 'POP', 'AZS', 'STI', 'BRX'],
    centerLat: 18.7357,
    centerLng: -70.1627,
    searchRadiusKm: 300,
  },
  'Punta Cana': {
    type: 'city',
    cityCodes: ['PUJ'],
    centerLat: 18.5601,
    centerLng: -68.3725,
    searchRadiusKm: 50,
  },
  'Santo Domingo': {
    type: 'city',
    cityCodes: ['SDQ'],
    centerLat: 18.4861,
    centerLng: -69.9312,
    searchRadiusKm: 30,
  },
  'Puerto Plata': {
    type: 'city',
    cityCodes: ['POP'],
    centerLat: 19.7579,
    centerLng: -70.7031,
    searchRadiusKm: 50,
  },
  'Samana': {
    type: 'city',
    cityCodes: ['AZS'],
    centerLat: 19.2059,
    centerLng: -69.3321,
    searchRadiusKm: 50,
  },
  'La Romana': {
    type: 'city',
    cityCodes: ['SDQ'], // Uses SDQ airport
    centerLat: 18.4270,
    centerLng: -68.9728,
    searchRadiusKm: 40,
  },

  // Jamaica
  'Jamaica': {
    type: 'country',
    cityCodes: ['MBJ', 'KIN'],
    centerLat: 18.1096,
    centerLng: -77.2975,
    searchRadiusKm: 200,
  },
  'Montego Bay': {
    type: 'city',
    cityCodes: ['MBJ'],
    centerLat: 18.4762,
    centerLng: -77.8939,
    searchRadiusKm: 40,
  },

  // Puerto Rico
  'Puerto Rico': {
    type: 'country',
    cityCodes: ['SJU'],
    centerLat: 18.4655,
    centerLng: -66.1057,
    searchRadiusKm: 150,
  },
  'San Juan': {
    type: 'city',
    cityCodes: ['SJU'],
    centerLat: 18.4655,
    centerLng: -66.1057,
    searchRadiusKm: 30,
  },

  // Other Caribbean
  'Aruba': {
    type: 'country',
    cityCodes: ['AUA'],
    centerLat: 12.5211,
    centerLng: -69.9683,
    searchRadiusKm: 50,
  },
  'Bahamas': {
    type: 'country',
    cityCodes: ['NAS'],
    centerLat: 25.0480,
    centerLng: -77.3554,
    searchRadiusKm: 100,
  },
  'Nassau': {
    type: 'city',
    cityCodes: ['NAS'],
    centerLat: 25.0480,
    centerLng: -77.3554,
    searchRadiusKm: 30,
  },
  'Barbados': {
    type: 'country',
    cityCodes: ['BGI'],
    centerLat: 13.0969,
    centerLng: -59.6145,
    searchRadiusKm: 50,
  },
  'St. Lucia': {
    type: 'country',
    cityCodes: ['UVF'],
    centerLat: 13.9094,
    centerLng: -60.9789,
    searchRadiusKm: 50,
  },
  'Turks and Caicos': {
    type: 'country',
    cityCodes: ['PLS'],
    centerLat: 21.7734,
    centerLng: -72.2653,
    searchRadiusKm: 80,
  },

  // ============ CENTRAL AMERICA ============

  'Costa Rica': {
    type: 'country',
    cityCodes: ['SJO', 'LIR'],
    centerLat: 9.7489,
    centerLng: -83.7534,
    searchRadiusKm: 200,
  },
  'San Jose': {
    type: 'city',
    cityCodes: ['SJO'],
    centerLat: 9.9281,
    centerLng: -84.0907,
    searchRadiusKm: 30,
  },
  'Tamarindo': {
    type: 'city',
    cityCodes: ['LIR'],
    centerLat: 10.2992,
    centerLng: -85.8407,
    searchRadiusKm: 40,
  },
  'La Fortuna': {
    type: 'city',
    cityCodes: ['SJO'],
    centerLat: 10.4680,
    centerLng: -84.6428,
    searchRadiusKm: 30,
  },
  'Manuel Antonio': {
    type: 'city',
    cityCodes: ['SJO'],
    centerLat: 9.3918,
    centerLng: -84.1353,
    searchRadiusKm: 30,
  },
  'Nosara': {
    type: 'city',
    cityCodes: ['LIR'],
    centerLat: 9.9762,
    centerLng: -85.6530,
    searchRadiusKm: 30,
  },

  'Panama': {
    type: 'country',
    cityCodes: ['PTY'],
    centerLat: 8.9824,
    centerLng: -79.5199,
    searchRadiusKm: 150,
  },
  'Panama City': {
    type: 'city',
    cityCodes: ['PTY'],
    centerLat: 8.9824,
    centerLng: -79.5199,
    searchRadiusKm: 30,
  },

  // ============ MEXICO ============

  'Mexico': {
    type: 'country',
    cityCodes: ['MEX', 'CUN', 'GDL', 'SJD', 'PVR'],
    centerLat: 23.6345,
    centerLng: -102.5528,
    searchRadiusKm: 500,
  },
  'Cancun': {
    type: 'city',
    cityCodes: ['CUN'],
    centerLat: 21.1619,
    centerLng: -86.8515,
    searchRadiusKm: 50,
  },
  'Tulum': {
    type: 'city',
    cityCodes: ['CUN'],
    centerLat: 20.2114,
    centerLng: -87.4654,
    searchRadiusKm: 40,
  },
  'Playa del Carmen': {
    type: 'city',
    cityCodes: ['CUN'],
    centerLat: 20.6296,
    centerLng: -87.0739,
    searchRadiusKm: 30,
  },
  'Mexico City': {
    type: 'city',
    cityCodes: ['MEX'],
    centerLat: 19.4326,
    centerLng: -99.1332,
    searchRadiusKm: 40,
  },
  'Puerto Vallarta': {
    type: 'city',
    cityCodes: ['PVR'],
    centerLat: 20.6534,
    centerLng: -105.2253,
    searchRadiusKm: 50,
  },
  'Los Cabos': {
    type: 'city',
    cityCodes: ['SJD'],
    centerLat: 22.8905,
    centerLng: -109.9167,
    searchRadiusKm: 50,
  },

  // ============ EUROPE ============

  'France': {
    type: 'country',
    cityCodes: ['PAR', 'NCE', 'LYS', 'MRS'],
    centerLat: 46.2276,
    centerLng: 2.2137,
    searchRadiusKm: 500,
  },
  'Paris': {
    type: 'city',
    cityCodes: ['PAR'],
    centerLat: 48.8566,
    centerLng: 2.3522,
    searchRadiusKm: 30,
  },
  'Nice': {
    type: 'city',
    cityCodes: ['NCE'],
    centerLat: 43.7102,
    centerLng: 7.2620,
    searchRadiusKm: 40,
  },

  'Italy': {
    type: 'country',
    cityCodes: ['ROM', 'MIL', 'VCE', 'FLR', 'NAP'],
    centerLat: 41.8719,
    centerLng: 12.5674,
    searchRadiusKm: 500,
  },
  'Rome': {
    type: 'city',
    cityCodes: ['ROM'],
    centerLat: 41.9028,
    centerLng: 12.4964,
    searchRadiusKm: 30,
  },
  'Venice': {
    type: 'city',
    cityCodes: ['VCE'],
    centerLat: 45.4408,
    centerLng: 12.3155,
    searchRadiusKm: 30,
  },
  'Florence': {
    type: 'city',
    cityCodes: ['FLR'],
    centerLat: 43.7696,
    centerLng: 11.2558,
    searchRadiusKm: 30,
  },
  'Milan': {
    type: 'city',
    cityCodes: ['MIL'],
    centerLat: 45.4642,
    centerLng: 9.1900,
    searchRadiusKm: 30,
  },

  'Spain': {
    type: 'country',
    cityCodes: ['MAD', 'BCN', 'PMI', 'AGP'],
    centerLat: 40.4168,
    centerLng: -3.7038,
    searchRadiusKm: 500,
  },
  'Barcelona': {
    type: 'city',
    cityCodes: ['BCN'],
    centerLat: 41.3851,
    centerLng: 2.1734,
    searchRadiusKm: 30,
  },
  'Madrid': {
    type: 'city',
    cityCodes: ['MAD'],
    centerLat: 40.4168,
    centerLng: -3.7038,
    searchRadiusKm: 30,
  },

  'United Kingdom': {
    type: 'country',
    cityCodes: ['LON', 'MAN', 'EDI'],
    centerLat: 51.5074,
    centerLng: -0.1278,
    searchRadiusKm: 400,
  },
  'London': {
    type: 'city',
    cityCodes: ['LON'],
    centerLat: 51.5074,
    centerLng: -0.1278,
    searchRadiusKm: 30,
  },

  'Germany': {
    type: 'country',
    cityCodes: ['BER', 'MUC', 'FRA'],
    centerLat: 51.1657,
    centerLng: 10.4515,
    searchRadiusKm: 400,
  },
  'Berlin': {
    type: 'city',
    cityCodes: ['BER'],
    centerLat: 52.5200,
    centerLng: 13.4050,
    searchRadiusKm: 30,
  },
  'Munich': {
    type: 'city',
    cityCodes: ['MUC'],
    centerLat: 48.1351,
    centerLng: 11.5820,
    searchRadiusKm: 30,
  },

  'Netherlands': {
    type: 'country',
    cityCodes: ['AMS'],
    centerLat: 52.1326,
    centerLng: 5.2913,
    searchRadiusKm: 150,
  },
  'Amsterdam': {
    type: 'city',
    cityCodes: ['AMS'],
    centerLat: 52.3676,
    centerLng: 4.9041,
    searchRadiusKm: 30,
  },

  'Portugal': {
    type: 'country',
    cityCodes: ['LIS', 'OPO'],
    centerLat: 39.3999,
    centerLng: -8.2245,
    searchRadiusKm: 300,
  },
  'Lisbon': {
    type: 'city',
    cityCodes: ['LIS'],
    centerLat: 38.7223,
    centerLng: -9.1393,
    searchRadiusKm: 30,
  },

  'Greece': {
    type: 'country',
    cityCodes: ['ATH', 'JTR', 'JMK', 'HER'],
    centerLat: 39.0742,
    centerLng: 21.8243,
    searchRadiusKm: 500,
  },
  'Athens': {
    type: 'city',
    cityCodes: ['ATH'],
    centerLat: 37.9838,
    centerLng: 23.7275,
    searchRadiusKm: 30,
  },
  'Santorini': {
    type: 'city',
    cityCodes: ['JTR'],
    centerLat: 36.3932,
    centerLng: 25.4615,
    searchRadiusKm: 30,
  },
  'Mykonos': {
    type: 'city',
    cityCodes: ['JMK'],
    centerLat: 37.4467,
    centerLng: 25.3289,
    searchRadiusKm: 20,
  },

  'Croatia': {
    type: 'country',
    cityCodes: ['DBV', 'SPU', 'ZAG'],
    centerLat: 45.1000,
    centerLng: 15.2000,
    searchRadiusKm: 300,
  },
  'Dubrovnik': {
    type: 'city',
    cityCodes: ['DBV'],
    centerLat: 42.6507,
    centerLng: 18.0944,
    searchRadiusKm: 30,
  },

  // ============ ASIA ============

  'Japan': {
    type: 'country',
    cityCodes: ['TYO', 'OSA', 'KIX', 'FUK'],
    centerLat: 36.2048,
    centerLng: 138.2529,
    searchRadiusKm: 500,
  },
  'Tokyo': {
    type: 'city',
    cityCodes: ['TYO'],
    centerLat: 35.6762,
    centerLng: 139.6503,
    searchRadiusKm: 40,
  },
  'Kyoto': {
    type: 'city',
    cityCodes: ['OSA'], // Uses Osaka airport
    centerLat: 35.0116,
    centerLng: 135.7681,
    searchRadiusKm: 30,
  },
  'Osaka': {
    type: 'city',
    cityCodes: ['OSA'],
    centerLat: 34.6937,
    centerLng: 135.5023,
    searchRadiusKm: 30,
  },

  'Thailand': {
    type: 'country',
    cityCodes: ['BKK', 'HKT', 'CNX', 'USM'],
    centerLat: 15.8700,
    centerLng: 100.9925,
    searchRadiusKm: 600,
  },
  'Bangkok': {
    type: 'city',
    cityCodes: ['BKK'],
    centerLat: 13.7563,
    centerLng: 100.5018,
    searchRadiusKm: 40,
  },
  'Phuket': {
    type: 'city',
    cityCodes: ['HKT'],
    centerLat: 7.8804,
    centerLng: 98.3923,
    searchRadiusKm: 50,
  },
  'Chiang Mai': {
    type: 'city',
    cityCodes: ['CNX'],
    centerLat: 18.7883,
    centerLng: 98.9853,
    searchRadiusKm: 30,
  },
  'Koh Samui': {
    type: 'city',
    cityCodes: ['USM'],
    centerLat: 9.5120,
    centerLng: 100.0136,
    searchRadiusKm: 30,
  },

  'Indonesia': {
    type: 'country',
    cityCodes: ['DPS', 'CGK', 'JOG'],
    centerLat: -0.7893,
    centerLng: 113.9213,
    searchRadiusKm: 1000,
  },
  'Bali': {
    type: 'city',
    cityCodes: ['DPS'],
    centerLat: -8.4095,
    centerLng: 115.1889,
    searchRadiusKm: 60,
  },
  'Ubud': {
    type: 'city',
    cityCodes: ['DPS'],
    centerLat: -8.5069,
    centerLng: 115.2625,
    searchRadiusKm: 30,
  },

  'Vietnam': {
    type: 'country',
    cityCodes: ['SGN', 'HAN', 'DAD'],
    centerLat: 14.0583,
    centerLng: 108.2772,
    searchRadiusKm: 800,
  },
  'Ho Chi Minh City': {
    type: 'city',
    cityCodes: ['SGN'],
    centerLat: 10.8231,
    centerLng: 106.6297,
    searchRadiusKm: 30,
  },
  'Hanoi': {
    type: 'city',
    cityCodes: ['HAN'],
    centerLat: 21.0285,
    centerLng: 105.8542,
    searchRadiusKm: 30,
  },

  'Singapore': {
    type: 'city',
    cityCodes: ['SIN'],
    centerLat: 1.3521,
    centerLng: 103.8198,
    searchRadiusKm: 30,
  },

  'Hong Kong': {
    type: 'city',
    cityCodes: ['HKG'],
    centerLat: 22.3193,
    centerLng: 114.1694,
    searchRadiusKm: 30,
  },

  'South Korea': {
    type: 'country',
    cityCodes: ['SEL', 'PUS'],
    centerLat: 35.9078,
    centerLng: 127.7669,
    searchRadiusKm: 300,
  },
  'Seoul': {
    type: 'city',
    cityCodes: ['SEL'],
    centerLat: 37.5665,
    centerLng: 126.9780,
    searchRadiusKm: 30,
  },

  // ============ MIDDLE EAST ============

  'UAE': {
    type: 'country',
    cityCodes: ['DXB', 'AUH'],
    centerLat: 23.4241,
    centerLng: 53.8478,
    searchRadiusKm: 200,
  },
  'Dubai': {
    type: 'city',
    cityCodes: ['DXB'],
    centerLat: 25.2048,
    centerLng: 55.2708,
    searchRadiusKm: 40,
  },
  'Abu Dhabi': {
    type: 'city',
    cityCodes: ['AUH'],
    centerLat: 24.4539,
    centerLng: 54.3773,
    searchRadiusKm: 40,
  },

  'Israel': {
    type: 'country',
    cityCodes: ['TLV'],
    centerLat: 31.0461,
    centerLng: 34.8516,
    searchRadiusKm: 150,
  },
  'Tel Aviv': {
    type: 'city',
    cityCodes: ['TLV'],
    centerLat: 32.0853,
    centerLng: 34.7818,
    searchRadiusKm: 30,
  },
  'Jerusalem': {
    type: 'city',
    cityCodes: ['TLV'],
    centerLat: 31.7683,
    centerLng: 35.2137,
    searchRadiusKm: 30,
  },

  'Turkey': {
    type: 'country',
    cityCodes: ['IST', 'AYT', 'ADB'],
    centerLat: 38.9637,
    centerLng: 35.2433,
    searchRadiusKm: 600,
  },
  'Istanbul': {
    type: 'city',
    cityCodes: ['IST'],
    centerLat: 41.0082,
    centerLng: 28.9784,
    searchRadiusKm: 40,
  },

  // ============ OCEANIA ============

  'Australia': {
    type: 'country',
    cityCodes: ['SYD', 'MEL', 'BNE', 'PER'],
    centerLat: -25.2744,
    centerLng: 133.7751,
    searchRadiusKm: 2000,
  },
  'Sydney': {
    type: 'city',
    cityCodes: ['SYD'],
    centerLat: -33.8688,
    centerLng: 151.2093,
    searchRadiusKm: 40,
  },
  'Melbourne': {
    type: 'city',
    cityCodes: ['MEL'],
    centerLat: -37.8136,
    centerLng: 144.9631,
    searchRadiusKm: 40,
  },

  'New Zealand': {
    type: 'country',
    cityCodes: ['AKL', 'WLG', 'CHC'],
    centerLat: -40.9006,
    centerLng: 174.8860,
    searchRadiusKm: 800,
  },
  'Auckland': {
    type: 'city',
    cityCodes: ['AKL'],
    centerLat: -36.8509,
    centerLng: 174.7645,
    searchRadiusKm: 40,
  },

  'Fiji': {
    type: 'country',
    cityCodes: ['NAN'],
    centerLat: -17.7134,
    centerLng: 178.0650,
    searchRadiusKm: 200,
  },

  'Maldives': {
    type: 'country',
    cityCodes: ['MLE'],
    centerLat: 3.2028,
    centerLng: 73.2207,
    searchRadiusKm: 300,
  },

  'Bora Bora': {
    type: 'city',
    cityCodes: ['BOB'],
    centerLat: -16.5004,
    centerLng: -151.7415,
    searchRadiusKm: 30,
  },

  // ============ SOUTH AMERICA ============

  'Brazil': {
    type: 'country',
    cityCodes: ['GIG', 'GRU', 'SSA'],
    centerLat: -14.2350,
    centerLng: -51.9253,
    searchRadiusKm: 2000,
  },
  'Rio de Janeiro': {
    type: 'city',
    cityCodes: ['GIG'],
    centerLat: -22.9068,
    centerLng: -43.1729,
    searchRadiusKm: 40,
  },
  'Sao Paulo': {
    type: 'city',
    cityCodes: ['GRU'],
    centerLat: -23.5505,
    centerLng: -46.6333,
    searchRadiusKm: 40,
  },

  'Argentina': {
    type: 'country',
    cityCodes: ['BUE', 'IGR'],
    centerLat: -38.4161,
    centerLng: -63.6167,
    searchRadiusKm: 1500,
  },
  'Buenos Aires': {
    type: 'city',
    cityCodes: ['BUE'],
    centerLat: -34.6037,
    centerLng: -58.3816,
    searchRadiusKm: 40,
  },

  'Peru': {
    type: 'country',
    cityCodes: ['LIM', 'CUZ'],
    centerLat: -9.1900,
    centerLng: -75.0152,
    searchRadiusKm: 800,
  },
  'Lima': {
    type: 'city',
    cityCodes: ['LIM'],
    centerLat: -12.0464,
    centerLng: -77.0428,
    searchRadiusKm: 30,
  },
  'Cusco': {
    type: 'city',
    cityCodes: ['CUZ'],
    centerLat: -13.5320,
    centerLng: -71.9675,
    searchRadiusKm: 50,
  },

  'Colombia': {
    type: 'country',
    cityCodes: ['BOG', 'CTG', 'MDE'],
    centerLat: 4.5709,
    centerLng: -74.2973,
    searchRadiusKm: 600,
  },
  'Cartagena': {
    type: 'city',
    cityCodes: ['CTG'],
    centerLat: 10.3910,
    centerLng: -75.4794,
    searchRadiusKm: 30,
  },

  // ============ USA ============

  'United States': {
    type: 'country',
    cityCodes: ['NYC', 'LAX', 'MIA', 'SFO', 'LAS', 'CHI'],
    centerLat: 37.0902,
    centerLng: -95.7129,
    searchRadiusKm: 3000,
  },
  'New York': {
    type: 'city',
    cityCodes: ['NYC'],
    centerLat: 40.7128,
    centerLng: -74.0060,
    searchRadiusKm: 40,
  },
  'Los Angeles': {
    type: 'city',
    cityCodes: ['LAX'],
    centerLat: 34.0522,
    centerLng: -118.2437,
    searchRadiusKm: 50,
  },
  'Miami': {
    type: 'city',
    cityCodes: ['MIA'],
    centerLat: 25.7617,
    centerLng: -80.1918,
    searchRadiusKm: 40,
  },
  'San Francisco': {
    type: 'city',
    cityCodes: ['SFO'],
    centerLat: 37.7749,
    centerLng: -122.4194,
    searchRadiusKm: 40,
  },
  'Las Vegas': {
    type: 'city',
    cityCodes: ['LAS'],
    centerLat: 36.1699,
    centerLng: -115.1398,
    searchRadiusKm: 40,
  },
  'Chicago': {
    type: 'city',
    cityCodes: ['CHI'],
    centerLat: 41.8781,
    centerLng: -87.6298,
    searchRadiusKm: 40,
  },
  'Hawaii': {
    type: 'region',
    cityCodes: ['HNL', 'OGG', 'KOA', 'LIH'],
    centerLat: 20.7967,
    centerLng: -156.3319,
    searchRadiusKm: 400,
  },
  'Honolulu': {
    type: 'city',
    cityCodes: ['HNL'],
    centerLat: 21.3069,
    centerLng: -157.8583,
    searchRadiusKm: 40,
  },
  'Maui': {
    type: 'city',
    cityCodes: ['OGG'],
    centerLat: 20.7984,
    centerLng: -156.3319,
    searchRadiusKm: 60,
  },

  // ============ AFRICA ============

  'South Africa': {
    type: 'country',
    cityCodes: ['CPT', 'JNB'],
    centerLat: -30.5595,
    centerLng: 22.9375,
    searchRadiusKm: 1000,
  },
  'Cape Town': {
    type: 'city',
    cityCodes: ['CPT'],
    centerLat: -33.9249,
    centerLng: 18.4241,
    searchRadiusKm: 50,
  },

  'Morocco': {
    type: 'country',
    cityCodes: ['RAK', 'CMN'],
    centerLat: 31.7917,
    centerLng: -7.0926,
    searchRadiusKm: 400,
  },
  'Marrakech': {
    type: 'city',
    cityCodes: ['RAK'],
    centerLat: 31.6295,
    centerLng: -7.9811,
    searchRadiusKm: 30,
  },

  'Egypt': {
    type: 'country',
    cityCodes: ['CAI', 'HRG', 'SSH'],
    centerLat: 26.8206,
    centerLng: 30.8025,
    searchRadiusKm: 600,
  },
  'Cairo': {
    type: 'city',
    cityCodes: ['CAI'],
    centerLat: 30.0444,
    centerLng: 31.2357,
    searchRadiusKm: 40,
  },
};

/**
 * Get destination config by name with fuzzy matching
 */
export function getDestinationConfig(name: string): DestinationConfig | null {
  // Normalize input
  const normalizedName = name.trim();

  // Direct match (exact)
  if (DESTINATION_CONFIGS[normalizedName]) {
    return DESTINATION_CONFIGS[normalizedName];
  }

  // Case-insensitive exact match
  for (const [key, config] of Object.entries(DESTINATION_CONFIGS)) {
    if (key.toLowerCase() === normalizedName.toLowerCase()) {
      return config;
    }
  }

  // Partial match - check if input contains or is contained by config name
  for (const [key, config] of Object.entries(DESTINATION_CONFIGS)) {
    const keyLower = key.toLowerCase();
    const nameLower = normalizedName.toLowerCase();

    // "Punta Cana, Dominican Republic" should match "Punta Cana"
    if (nameLower.includes(keyLower) || keyLower.includes(nameLower)) {
      return config;
    }
  }

  // Try matching by removing common suffixes/prefixes
  const cleanedName = normalizedName
    .replace(/,\s*.*/g, '') // Remove everything after comma
    .replace(/\s+(city|area|region|province|state)$/i, '') // Remove common suffixes
    .trim();

  if (DESTINATION_CONFIGS[cleanedName]) {
    return DESTINATION_CONFIGS[cleanedName];
  }

  for (const [key, config] of Object.entries(DESTINATION_CONFIGS)) {
    if (key.toLowerCase() === cleanedName.toLowerCase()) {
      return config;
    }
  }

  return null;
}

/**
 * Check if a destination is a country or region (multiple cities)
 */
export function isMultiCityDestination(config: DestinationConfig): boolean {
  return config.type === 'country' || config.type === 'region' || config.cityCodes.length > 1;
}
