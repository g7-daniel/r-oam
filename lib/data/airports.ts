// Comprehensive airport database with IATA codes, cities, and countries
// Includes major airports worldwide, with specific focus on popular travel destinations

export interface AirportData {
  iata: string;
  icao: string;
  name: string;
  city: string;
  country: string;
  countryCode: string;
  lat: number;
  lng: number;
  isPrimary?: boolean; // Primary airport for the city
}

// Major world airports - comprehensive list
export const AIRPORTS: AirportData[] = [
  // United States - Major Hubs
  { iata: 'ATL', icao: 'KATL', name: 'Hartsfield-Jackson Atlanta International', city: 'Atlanta', country: 'United States', countryCode: 'US', lat: 33.6407, lng: -84.4277, isPrimary: true },
  { iata: 'LAX', icao: 'KLAX', name: 'Los Angeles International', city: 'Los Angeles', country: 'United States', countryCode: 'US', lat: 33.9425, lng: -118.4081, isPrimary: true },
  { iata: 'ORD', icao: 'KORD', name: "O'Hare International", city: 'Chicago', country: 'United States', countryCode: 'US', lat: 41.9742, lng: -87.9073, isPrimary: true },
  { iata: 'MDW', icao: 'KMDW', name: 'Chicago Midway International', city: 'Chicago', country: 'United States', countryCode: 'US', lat: 41.7868, lng: -87.7522 },
  { iata: 'DFW', icao: 'KDFW', name: 'Dallas/Fort Worth International', city: 'Dallas', country: 'United States', countryCode: 'US', lat: 32.8998, lng: -97.0403, isPrimary: true },
  { iata: 'DAL', icao: 'KDAL', name: 'Dallas Love Field', city: 'Dallas', country: 'United States', countryCode: 'US', lat: 32.8471, lng: -96.8518 },
  { iata: 'JFK', icao: 'KJFK', name: 'John F. Kennedy International', city: 'New York', country: 'United States', countryCode: 'US', lat: 40.6413, lng: -73.7781, isPrimary: true },
  { iata: 'LGA', icao: 'KLGA', name: 'LaGuardia', city: 'New York', country: 'United States', countryCode: 'US', lat: 40.7769, lng: -73.8740 },
  { iata: 'EWR', icao: 'KEWR', name: 'Newark Liberty International', city: 'Newark', country: 'United States', countryCode: 'US', lat: 40.6895, lng: -74.1745, isPrimary: true },
  { iata: 'DEN', icao: 'KDEN', name: 'Denver International', city: 'Denver', country: 'United States', countryCode: 'US', lat: 39.8561, lng: -104.6737, isPrimary: true },
  { iata: 'SFO', icao: 'KSFO', name: 'San Francisco International', city: 'San Francisco', country: 'United States', countryCode: 'US', lat: 37.6213, lng: -122.3790, isPrimary: true },
  { iata: 'OAK', icao: 'KOAK', name: 'Oakland International', city: 'Oakland', country: 'United States', countryCode: 'US', lat: 37.7213, lng: -122.2208, isPrimary: true },
  { iata: 'SJC', icao: 'KSJC', name: 'San Jose International', city: 'San Jose', country: 'United States', countryCode: 'US', lat: 37.3639, lng: -121.9289, isPrimary: true },
  { iata: 'SEA', icao: 'KSEA', name: 'Seattle-Tacoma International', city: 'Seattle', country: 'United States', countryCode: 'US', lat: 47.4502, lng: -122.3088, isPrimary: true },
  { iata: 'LAS', icao: 'KLAS', name: 'Harry Reid International', city: 'Las Vegas', country: 'United States', countryCode: 'US', lat: 36.0840, lng: -115.1537, isPrimary: true },
  { iata: 'MCO', icao: 'KMCO', name: 'Orlando International', city: 'Orlando', country: 'United States', countryCode: 'US', lat: 28.4312, lng: -81.3081, isPrimary: true },
  { iata: 'MIA', icao: 'KMIA', name: 'Miami International', city: 'Miami', country: 'United States', countryCode: 'US', lat: 25.7959, lng: -80.2870, isPrimary: true },
  { iata: 'FLL', icao: 'KFLL', name: 'Fort Lauderdale-Hollywood International', city: 'Fort Lauderdale', country: 'United States', countryCode: 'US', lat: 26.0742, lng: -80.1506, isPrimary: true },
  { iata: 'PBI', icao: 'KPBI', name: 'Palm Beach International', city: 'West Palm Beach', country: 'United States', countryCode: 'US', lat: 26.6832, lng: -80.0956, isPrimary: true },
  { iata: 'BOS', icao: 'KBOS', name: 'Boston Logan International', city: 'Boston', country: 'United States', countryCode: 'US', lat: 42.3656, lng: -71.0096, isPrimary: true },
  { iata: 'PHX', icao: 'KPHX', name: 'Phoenix Sky Harbor International', city: 'Phoenix', country: 'United States', countryCode: 'US', lat: 33.4373, lng: -112.0078, isPrimary: true },
  { iata: 'IAH', icao: 'KIAH', name: 'George Bush Intercontinental', city: 'Houston', country: 'United States', countryCode: 'US', lat: 29.9902, lng: -95.3368, isPrimary: true },
  { iata: 'HOU', icao: 'KHOU', name: 'William P. Hobby', city: 'Houston', country: 'United States', countryCode: 'US', lat: 29.6454, lng: -95.2789 },
  { iata: 'MSP', icao: 'KMSP', name: 'Minneapolis-Saint Paul International', city: 'Minneapolis', country: 'United States', countryCode: 'US', lat: 44.8848, lng: -93.2223, isPrimary: true },
  { iata: 'DTW', icao: 'KDTW', name: 'Detroit Metropolitan Wayne County', city: 'Detroit', country: 'United States', countryCode: 'US', lat: 42.2162, lng: -83.3554, isPrimary: true },
  { iata: 'PHL', icao: 'KPHL', name: 'Philadelphia International', city: 'Philadelphia', country: 'United States', countryCode: 'US', lat: 39.8729, lng: -75.2437, isPrimary: true },
  { iata: 'CLT', icao: 'KCLT', name: 'Charlotte Douglas International', city: 'Charlotte', country: 'United States', countryCode: 'US', lat: 35.2140, lng: -80.9431, isPrimary: true },
  { iata: 'SAN', icao: 'KSAN', name: 'San Diego International', city: 'San Diego', country: 'United States', countryCode: 'US', lat: 32.7336, lng: -117.1897, isPrimary: true },
  { iata: 'TPA', icao: 'KTPA', name: 'Tampa International', city: 'Tampa', country: 'United States', countryCode: 'US', lat: 27.9755, lng: -82.5332, isPrimary: true },
  { iata: 'BWI', icao: 'KBWI', name: 'Baltimore/Washington International', city: 'Baltimore', country: 'United States', countryCode: 'US', lat: 39.1754, lng: -76.6683, isPrimary: true },
  { iata: 'IAD', icao: 'KIAD', name: 'Washington Dulles International', city: 'Washington', country: 'United States', countryCode: 'US', lat: 38.9531, lng: -77.4565, isPrimary: true },
  { iata: 'DCA', icao: 'KDCA', name: 'Ronald Reagan Washington National', city: 'Washington', country: 'United States', countryCode: 'US', lat: 38.8512, lng: -77.0402 },
  { iata: 'SLC', icao: 'KSLC', name: 'Salt Lake City International', city: 'Salt Lake City', country: 'United States', countryCode: 'US', lat: 40.7899, lng: -111.9791, isPrimary: true },
  { iata: 'PDX', icao: 'KPDX', name: 'Portland International', city: 'Portland', country: 'United States', countryCode: 'US', lat: 45.5898, lng: -122.5951, isPrimary: true },
  { iata: 'HNL', icao: 'PHNL', name: 'Daniel K. Inouye International', city: 'Honolulu', country: 'United States', countryCode: 'US', lat: 21.3187, lng: -157.9225, isPrimary: true },
  { iata: 'AUS', icao: 'KAUS', name: 'Austin-Bergstrom International', city: 'Austin', country: 'United States', countryCode: 'US', lat: 30.1975, lng: -97.6664, isPrimary: true },
  { iata: 'SAT', icao: 'KSAT', name: 'San Antonio International', city: 'San Antonio', country: 'United States', countryCode: 'US', lat: 29.5337, lng: -98.4698, isPrimary: true },
  { iata: 'RDU', icao: 'KRDU', name: 'Raleigh-Durham International', city: 'Raleigh', country: 'United States', countryCode: 'US', lat: 35.8776, lng: -78.7875, isPrimary: true },
  { iata: 'MCI', icao: 'KMCI', name: 'Kansas City International', city: 'Kansas City', country: 'United States', countryCode: 'US', lat: 39.2976, lng: -94.7139, isPrimary: true },
  { iata: 'SMF', icao: 'KSMF', name: 'Sacramento International', city: 'Sacramento', country: 'United States', countryCode: 'US', lat: 38.6954, lng: -121.5908, isPrimary: true },
  { iata: 'STL', icao: 'KSTL', name: 'St. Louis Lambert International', city: 'St. Louis', country: 'United States', countryCode: 'US', lat: 38.7487, lng: -90.3700, isPrimary: true },
  { iata: 'IND', icao: 'KIND', name: 'Indianapolis International', city: 'Indianapolis', country: 'United States', countryCode: 'US', lat: 39.7173, lng: -86.2944, isPrimary: true },
  { iata: 'CMH', icao: 'KCMH', name: 'John Glenn Columbus International', city: 'Columbus', country: 'United States', countryCode: 'US', lat: 39.9980, lng: -82.8919, isPrimary: true },
  { iata: 'CVG', icao: 'KCVG', name: 'Cincinnati/Northern Kentucky International', city: 'Cincinnati', country: 'United States', countryCode: 'US', lat: 39.0489, lng: -84.6678, isPrimary: true },
  { iata: 'PIT', icao: 'KPIT', name: 'Pittsburgh International', city: 'Pittsburgh', country: 'United States', countryCode: 'US', lat: 40.4915, lng: -80.2329, isPrimary: true },
  { iata: 'CLE', icao: 'KCLE', name: 'Cleveland Hopkins International', city: 'Cleveland', country: 'United States', countryCode: 'US', lat: 41.4117, lng: -81.8498, isPrimary: true },
  { iata: 'MSY', icao: 'KMSY', name: 'Louis Armstrong New Orleans International', city: 'New Orleans', country: 'United States', countryCode: 'US', lat: 29.9934, lng: -90.2580, isPrimary: true },
  { iata: 'OGG', icao: 'PHOG', name: 'Kahului', city: 'Maui', country: 'United States', countryCode: 'US', lat: 20.8986, lng: -156.4305, isPrimary: true },
  { iata: 'ANC', icao: 'PANC', name: 'Ted Stevens Anchorage International', city: 'Anchorage', country: 'United States', countryCode: 'US', lat: 61.1743, lng: -149.9962, isPrimary: true },

  // Canada
  { iata: 'YYZ', icao: 'CYYZ', name: 'Toronto Pearson International', city: 'Toronto', country: 'Canada', countryCode: 'CA', lat: 43.6777, lng: -79.6248, isPrimary: true },
  { iata: 'YUL', icao: 'CYUL', name: 'Montréal-Pierre Elliott Trudeau International', city: 'Montreal', country: 'Canada', countryCode: 'CA', lat: 45.4706, lng: -73.7408, isPrimary: true },
  { iata: 'YVR', icao: 'CYVR', name: 'Vancouver International', city: 'Vancouver', country: 'Canada', countryCode: 'CA', lat: 49.1947, lng: -123.1792, isPrimary: true },
  { iata: 'YYC', icao: 'CYYC', name: 'Calgary International', city: 'Calgary', country: 'Canada', countryCode: 'CA', lat: 51.1215, lng: -114.0076, isPrimary: true },
  { iata: 'YOW', icao: 'CYOW', name: 'Ottawa Macdonald-Cartier International', city: 'Ottawa', country: 'Canada', countryCode: 'CA', lat: 45.3225, lng: -75.6692, isPrimary: true },
  { iata: 'YEG', icao: 'CYEG', name: 'Edmonton International', city: 'Edmonton', country: 'Canada', countryCode: 'CA', lat: 53.3097, lng: -113.5800, isPrimary: true },

  // Mexico
  { iata: 'MEX', icao: 'MMMX', name: 'Mexico City International', city: 'Mexico City', country: 'Mexico', countryCode: 'MX', lat: 19.4363, lng: -99.0721, isPrimary: true },
  { iata: 'CUN', icao: 'MMUN', name: 'Cancún International', city: 'Cancún', country: 'Mexico', countryCode: 'MX', lat: 21.0365, lng: -86.8771, isPrimary: true },
  { iata: 'GDL', icao: 'MMGL', name: 'Guadalajara International', city: 'Guadalajara', country: 'Mexico', countryCode: 'MX', lat: 20.5218, lng: -103.3111, isPrimary: true },
  { iata: 'SJD', icao: 'MMSD', name: 'Los Cabos International', city: 'San José del Cabo', country: 'Mexico', countryCode: 'MX', lat: 23.1518, lng: -109.7215, isPrimary: true },
  { iata: 'PVR', icao: 'MMPR', name: 'Puerto Vallarta International', city: 'Puerto Vallarta', country: 'Mexico', countryCode: 'MX', lat: 20.6801, lng: -105.2541, isPrimary: true },

  // Central America & Caribbean
  { iata: 'SJO', icao: 'MROC', name: 'Juan Santamaría International', city: 'San José', country: 'Costa Rica', countryCode: 'CR', lat: 9.9939, lng: -84.2088, isPrimary: true },
  { iata: 'LIR', icao: 'MRLB', name: 'Daniel Oduber Quirós International', city: 'Liberia', country: 'Costa Rica', countryCode: 'CR', lat: 10.5933, lng: -85.5444, isPrimary: true },
  { iata: 'PTY', icao: 'MPTO', name: 'Tocumen International', city: 'Panama City', country: 'Panama', countryCode: 'PA', lat: 9.0714, lng: -79.3835, isPrimary: true },
  { iata: 'MBJ', icao: 'MKJS', name: 'Sangster International', city: 'Montego Bay', country: 'Jamaica', countryCode: 'JM', lat: 18.5037, lng: -77.9134, isPrimary: true },
  { iata: 'KIN', icao: 'MKJP', name: 'Norman Manley International', city: 'Kingston', country: 'Jamaica', countryCode: 'JM', lat: 17.9357, lng: -76.7875, isPrimary: true },
  { iata: 'NAS', icao: 'MYNN', name: 'Lynden Pindling International', city: 'Nassau', country: 'Bahamas', countryCode: 'BS', lat: 25.0390, lng: -77.4662, isPrimary: true },
  { iata: 'PUJ', icao: 'MDPC', name: 'Punta Cana International', city: 'Punta Cana', country: 'Dominican Republic', countryCode: 'DO', lat: 18.5674, lng: -68.3634, isPrimary: true },
  { iata: 'SDQ', icao: 'MDSD', name: 'Las Américas International', city: 'Santo Domingo', country: 'Dominican Republic', countryCode: 'DO', lat: 18.4297, lng: -69.6689, isPrimary: true },
  { iata: 'SJU', icao: 'TJSJ', name: 'Luis Muñoz Marín International', city: 'San Juan', country: 'Puerto Rico', countryCode: 'PR', lat: 18.4394, lng: -66.0018, isPrimary: true },
  { iata: 'AUA', icao: 'TNCA', name: 'Queen Beatrix International', city: 'Oranjestad', country: 'Aruba', countryCode: 'AW', lat: 12.5014, lng: -70.0152, isPrimary: true },
  { iata: 'CUR', icao: 'TNCC', name: 'Curaçao International', city: 'Willemstad', country: 'Curaçao', countryCode: 'CW', lat: 12.1889, lng: -68.9598, isPrimary: true },

  // South America
  { iata: 'GRU', icao: 'SBGR', name: 'São Paulo/Guarulhos International', city: 'São Paulo', country: 'Brazil', countryCode: 'BR', lat: -23.4356, lng: -46.4731, isPrimary: true },
  { iata: 'GIG', icao: 'SBGL', name: 'Rio de Janeiro/Galeão International', city: 'Rio de Janeiro', country: 'Brazil', countryCode: 'BR', lat: -22.8099, lng: -43.2505, isPrimary: true },
  { iata: 'EZE', icao: 'SAEZ', name: 'Ministro Pistarini International', city: 'Buenos Aires', country: 'Argentina', countryCode: 'AR', lat: -34.8222, lng: -58.5358, isPrimary: true },
  { iata: 'SCL', icao: 'SCEL', name: 'Arturo Merino Benítez International', city: 'Santiago', country: 'Chile', countryCode: 'CL', lat: -33.3930, lng: -70.7858, isPrimary: true },
  { iata: 'BOG', icao: 'SKBO', name: 'El Dorado International', city: 'Bogotá', country: 'Colombia', countryCode: 'CO', lat: 4.7016, lng: -74.1469, isPrimary: true },
  { iata: 'LIM', icao: 'SPJC', name: 'Jorge Chávez International', city: 'Lima', country: 'Peru', countryCode: 'PE', lat: -12.0219, lng: -77.1143, isPrimary: true },
  { iata: 'CUZ', icao: 'SPZO', name: 'Alejandro Velasco Astete International', city: 'Cusco', country: 'Peru', countryCode: 'PE', lat: -13.5357, lng: -71.9388, isPrimary: true },

  // Europe - UK & Ireland
  { iata: 'LHR', icao: 'EGLL', name: 'London Heathrow', city: 'London', country: 'United Kingdom', countryCode: 'GB', lat: 51.4700, lng: -0.4543, isPrimary: true },
  { iata: 'LGW', icao: 'EGKK', name: 'London Gatwick', city: 'London', country: 'United Kingdom', countryCode: 'GB', lat: 51.1537, lng: -0.1821 },
  { iata: 'STN', icao: 'EGSS', name: 'London Stansted', city: 'London', country: 'United Kingdom', countryCode: 'GB', lat: 51.8860, lng: 0.2389 },
  { iata: 'LTN', icao: 'EGGW', name: 'London Luton', city: 'London', country: 'United Kingdom', countryCode: 'GB', lat: 51.8747, lng: -0.3683 },
  { iata: 'MAN', icao: 'EGCC', name: 'Manchester', city: 'Manchester', country: 'United Kingdom', countryCode: 'GB', lat: 53.3537, lng: -2.2750, isPrimary: true },
  { iata: 'EDI', icao: 'EGPH', name: 'Edinburgh', city: 'Edinburgh', country: 'United Kingdom', countryCode: 'GB', lat: 55.9500, lng: -3.3725, isPrimary: true },
  { iata: 'BHX', icao: 'EGBB', name: 'Birmingham', city: 'Birmingham', country: 'United Kingdom', countryCode: 'GB', lat: 52.4539, lng: -1.7480, isPrimary: true },
  { iata: 'GLA', icao: 'EGPF', name: 'Glasgow', city: 'Glasgow', country: 'United Kingdom', countryCode: 'GB', lat: 55.8719, lng: -4.4331, isPrimary: true },
  { iata: 'DUB', icao: 'EIDW', name: 'Dublin', city: 'Dublin', country: 'Ireland', countryCode: 'IE', lat: 53.4264, lng: -6.2499, isPrimary: true },

  // Europe - France
  { iata: 'CDG', icao: 'LFPG', name: 'Charles de Gaulle', city: 'Paris', country: 'France', countryCode: 'FR', lat: 49.0097, lng: 2.5479, isPrimary: true },
  { iata: 'ORY', icao: 'LFPO', name: 'Paris Orly', city: 'Paris', country: 'France', countryCode: 'FR', lat: 48.7233, lng: 2.3795 },
  { iata: 'NCE', icao: 'LFMN', name: 'Nice Côte d\'Azur', city: 'Nice', country: 'France', countryCode: 'FR', lat: 43.6584, lng: 7.2159, isPrimary: true },
  { iata: 'LYS', icao: 'LFLL', name: 'Lyon-Saint Exupéry', city: 'Lyon', country: 'France', countryCode: 'FR', lat: 45.7256, lng: 5.0811, isPrimary: true },
  { iata: 'MRS', icao: 'LFML', name: 'Marseille Provence', city: 'Marseille', country: 'France', countryCode: 'FR', lat: 43.4393, lng: 5.2214, isPrimary: true },

  // Europe - Germany
  { iata: 'FRA', icao: 'EDDF', name: 'Frankfurt', city: 'Frankfurt', country: 'Germany', countryCode: 'DE', lat: 50.0379, lng: 8.5622, isPrimary: true },
  { iata: 'MUC', icao: 'EDDM', name: 'Munich', city: 'Munich', country: 'Germany', countryCode: 'DE', lat: 48.3537, lng: 11.7750, isPrimary: true },
  { iata: 'BER', icao: 'EDDB', name: 'Berlin Brandenburg', city: 'Berlin', country: 'Germany', countryCode: 'DE', lat: 52.3667, lng: 13.5033, isPrimary: true },
  { iata: 'DUS', icao: 'EDDL', name: 'Düsseldorf', city: 'Düsseldorf', country: 'Germany', countryCode: 'DE', lat: 51.2895, lng: 6.7668, isPrimary: true },
  { iata: 'HAM', icao: 'EDDH', name: 'Hamburg', city: 'Hamburg', country: 'Germany', countryCode: 'DE', lat: 53.6304, lng: 10.0065, isPrimary: true },

  // Europe - Spain
  { iata: 'MAD', icao: 'LEMD', name: 'Adolfo Suárez Madrid-Barajas', city: 'Madrid', country: 'Spain', countryCode: 'ES', lat: 40.4983, lng: -3.5676, isPrimary: true },
  { iata: 'BCN', icao: 'LEBL', name: 'Barcelona-El Prat', city: 'Barcelona', country: 'Spain', countryCode: 'ES', lat: 41.2974, lng: 2.0833, isPrimary: true },
  { iata: 'PMI', icao: 'LEPA', name: 'Palma de Mallorca', city: 'Palma', country: 'Spain', countryCode: 'ES', lat: 39.5517, lng: 2.7388, isPrimary: true },
  { iata: 'AGP', icao: 'LEMG', name: 'Málaga-Costa del Sol', city: 'Málaga', country: 'Spain', countryCode: 'ES', lat: 36.6749, lng: -4.4991, isPrimary: true },
  { iata: 'IBZ', icao: 'LEIB', name: 'Ibiza', city: 'Ibiza', country: 'Spain', countryCode: 'ES', lat: 38.8729, lng: 1.3731, isPrimary: true },

  // Europe - Italy
  { iata: 'FCO', icao: 'LIRF', name: 'Leonardo da Vinci–Fiumicino', city: 'Rome', country: 'Italy', countryCode: 'IT', lat: 41.8003, lng: 12.2389, isPrimary: true },
  { iata: 'MXP', icao: 'LIMC', name: 'Milan Malpensa', city: 'Milan', country: 'Italy', countryCode: 'IT', lat: 45.6306, lng: 8.7281, isPrimary: true },
  { iata: 'VCE', icao: 'LIPZ', name: 'Venice Marco Polo', city: 'Venice', country: 'Italy', countryCode: 'IT', lat: 45.5053, lng: 12.3519, isPrimary: true },
  { iata: 'NAP', icao: 'LIRN', name: 'Naples International', city: 'Naples', country: 'Italy', countryCode: 'IT', lat: 40.8860, lng: 14.2908, isPrimary: true },
  { iata: 'FLR', icao: 'LIRQ', name: 'Florence Peretola', city: 'Florence', country: 'Italy', countryCode: 'IT', lat: 43.8100, lng: 11.2051, isPrimary: true },

  // Europe - Netherlands
  { iata: 'AMS', icao: 'EHAM', name: 'Amsterdam Schiphol', city: 'Amsterdam', country: 'Netherlands', countryCode: 'NL', lat: 52.3105, lng: 4.7683, isPrimary: true },

  // Europe - Switzerland
  { iata: 'ZRH', icao: 'LSZH', name: 'Zürich', city: 'Zürich', country: 'Switzerland', countryCode: 'CH', lat: 47.4647, lng: 8.5492, isPrimary: true },
  { iata: 'GVA', icao: 'LSGG', name: 'Geneva', city: 'Geneva', country: 'Switzerland', countryCode: 'CH', lat: 46.2370, lng: 6.1092, isPrimary: true },

  // Europe - Austria
  { iata: 'VIE', icao: 'LOWW', name: 'Vienna International', city: 'Vienna', country: 'Austria', countryCode: 'AT', lat: 48.1103, lng: 16.5697, isPrimary: true },

  // Europe - Portugal
  { iata: 'LIS', icao: 'LPPT', name: 'Humberto Delgado', city: 'Lisbon', country: 'Portugal', countryCode: 'PT', lat: 38.7813, lng: -9.1359, isPrimary: true },
  { iata: 'OPO', icao: 'LPPR', name: 'Francisco Sá Carneiro', city: 'Porto', country: 'Portugal', countryCode: 'PT', lat: 41.2481, lng: -8.6814, isPrimary: true },

  // Europe - Greece
  { iata: 'ATH', icao: 'LGAV', name: 'Athens International', city: 'Athens', country: 'Greece', countryCode: 'GR', lat: 37.9364, lng: 23.9445, isPrimary: true },
  { iata: 'SKG', icao: 'LGTS', name: 'Thessaloniki Macedonia', city: 'Thessaloniki', country: 'Greece', countryCode: 'GR', lat: 40.5197, lng: 22.9709, isPrimary: true },
  { iata: 'HER', icao: 'LGIR', name: 'Heraklion International', city: 'Heraklion', country: 'Greece', countryCode: 'GR', lat: 35.3397, lng: 25.1803, isPrimary: true },
  { iata: 'JTR', icao: 'LGSR', name: 'Santorini (Thira)', city: 'Santorini', country: 'Greece', countryCode: 'GR', lat: 36.3992, lng: 25.4793, isPrimary: true },
  { iata: 'MJT', icao: 'LGMT', name: 'Mytilene International', city: 'Mykonos', country: 'Greece', countryCode: 'GR', lat: 37.4351, lng: 25.3481, isPrimary: true },

  // Europe - Scandinavia
  { iata: 'CPH', icao: 'EKCH', name: 'Copenhagen', city: 'Copenhagen', country: 'Denmark', countryCode: 'DK', lat: 55.6180, lng: 12.6560, isPrimary: true },
  { iata: 'OSL', icao: 'ENGM', name: 'Oslo Gardermoen', city: 'Oslo', country: 'Norway', countryCode: 'NO', lat: 60.1939, lng: 11.1004, isPrimary: true },
  { iata: 'ARN', icao: 'ESSA', name: 'Stockholm Arlanda', city: 'Stockholm', country: 'Sweden', countryCode: 'SE', lat: 59.6519, lng: 17.9186, isPrimary: true },
  { iata: 'HEL', icao: 'EFHK', name: 'Helsinki-Vantaa', city: 'Helsinki', country: 'Finland', countryCode: 'FI', lat: 60.3172, lng: 24.9633, isPrimary: true },
  { iata: 'KEF', icao: 'BIKF', name: 'Keflavík International', city: 'Reykjavik', country: 'Iceland', countryCode: 'IS', lat: 63.9850, lng: -22.6056, isPrimary: true },

  // Europe - Eastern Europe
  { iata: 'PRG', icao: 'LKPR', name: 'Václav Havel Prague', city: 'Prague', country: 'Czech Republic', countryCode: 'CZ', lat: 50.1008, lng: 14.2600, isPrimary: true },
  { iata: 'WAW', icao: 'EPWA', name: 'Warsaw Chopin', city: 'Warsaw', country: 'Poland', countryCode: 'PL', lat: 52.1657, lng: 20.9671, isPrimary: true },
  { iata: 'BUD', icao: 'LHBP', name: 'Budapest Ferenc Liszt', city: 'Budapest', country: 'Hungary', countryCode: 'HU', lat: 47.4298, lng: 19.2611, isPrimary: true },

  // Europe - Turkey
  { iata: 'IST', icao: 'LTFM', name: 'Istanbul', city: 'Istanbul', country: 'Turkey', countryCode: 'TR', lat: 41.2753, lng: 28.7519, isPrimary: true },
  { iata: 'SAW', icao: 'LTFJ', name: 'Sabiha Gökçen International', city: 'Istanbul', country: 'Turkey', countryCode: 'TR', lat: 40.8986, lng: 29.3092 },

  // Middle East
  { iata: 'DXB', icao: 'OMDB', name: 'Dubai International', city: 'Dubai', country: 'United Arab Emirates', countryCode: 'AE', lat: 25.2532, lng: 55.3657, isPrimary: true },
  { iata: 'AUH', icao: 'OMAA', name: 'Abu Dhabi International', city: 'Abu Dhabi', country: 'United Arab Emirates', countryCode: 'AE', lat: 24.4330, lng: 54.6511, isPrimary: true },
  { iata: 'DOH', icao: 'OTHH', name: 'Hamad International', city: 'Doha', country: 'Qatar', countryCode: 'QA', lat: 25.2609, lng: 51.6138, isPrimary: true },
  { iata: 'TLV', icao: 'LLBG', name: 'Ben Gurion', city: 'Tel Aviv', country: 'Israel', countryCode: 'IL', lat: 32.0055, lng: 34.8854, isPrimary: true },
  { iata: 'AMM', icao: 'OJAI', name: 'Queen Alia International', city: 'Amman', country: 'Jordan', countryCode: 'JO', lat: 31.7226, lng: 35.9932, isPrimary: true },
  { iata: 'CAI', icao: 'HECA', name: 'Cairo International', city: 'Cairo', country: 'Egypt', countryCode: 'EG', lat: 30.1219, lng: 31.4056, isPrimary: true },
  { iata: 'SSH', icao: 'HESH', name: 'Sharm El Sheikh International', city: 'Sharm El Sheikh', country: 'Egypt', countryCode: 'EG', lat: 27.9773, lng: 34.3950, isPrimary: true },

  // Asia - Japan
  { iata: 'NRT', icao: 'RJAA', name: 'Narita International', city: 'Tokyo', country: 'Japan', countryCode: 'JP', lat: 35.7647, lng: 140.3864, isPrimary: true },
  { iata: 'HND', icao: 'RJTT', name: 'Tokyo Haneda', city: 'Tokyo', country: 'Japan', countryCode: 'JP', lat: 35.5494, lng: 139.7798 },
  { iata: 'KIX', icao: 'RJBB', name: 'Kansai International', city: 'Osaka', country: 'Japan', countryCode: 'JP', lat: 34.4347, lng: 135.2441, isPrimary: true },

  // Asia - China
  { iata: 'PEK', icao: 'ZBAA', name: 'Beijing Capital International', city: 'Beijing', country: 'China', countryCode: 'CN', lat: 40.0799, lng: 116.6031, isPrimary: true },
  { iata: 'PKX', icao: 'ZBAD', name: 'Beijing Daxing International', city: 'Beijing', country: 'China', countryCode: 'CN', lat: 39.5098, lng: 116.4105 },
  { iata: 'PVG', icao: 'ZSPD', name: 'Shanghai Pudong International', city: 'Shanghai', country: 'China', countryCode: 'CN', lat: 31.1434, lng: 121.8052, isPrimary: true },
  { iata: 'HKG', icao: 'VHHH', name: 'Hong Kong International', city: 'Hong Kong', country: 'Hong Kong', countryCode: 'HK', lat: 22.3080, lng: 113.9185, isPrimary: true },

  // Asia - Southeast Asia
  { iata: 'SIN', icao: 'WSSS', name: 'Singapore Changi', city: 'Singapore', country: 'Singapore', countryCode: 'SG', lat: 1.3644, lng: 103.9915, isPrimary: true },
  { iata: 'BKK', icao: 'VTBS', name: 'Suvarnabhumi', city: 'Bangkok', country: 'Thailand', countryCode: 'TH', lat: 13.6900, lng: 100.7501, isPrimary: true },
  { iata: 'HKT', icao: 'VTSP', name: 'Phuket International', city: 'Phuket', country: 'Thailand', countryCode: 'TH', lat: 8.1132, lng: 98.3169, isPrimary: true },
  { iata: 'KUL', icao: 'WMKK', name: 'Kuala Lumpur International', city: 'Kuala Lumpur', country: 'Malaysia', countryCode: 'MY', lat: 2.7456, lng: 101.7099, isPrimary: true },
  { iata: 'CGK', icao: 'WIII', name: 'Soekarno-Hatta International', city: 'Jakarta', country: 'Indonesia', countryCode: 'ID', lat: -6.1256, lng: 106.6559, isPrimary: true },
  { iata: 'DPS', icao: 'WADD', name: 'Ngurah Rai International', city: 'Bali', country: 'Indonesia', countryCode: 'ID', lat: -8.7482, lng: 115.1672, isPrimary: true },
  { iata: 'MNL', icao: 'RPLL', name: 'Ninoy Aquino International', city: 'Manila', country: 'Philippines', countryCode: 'PH', lat: 14.5086, lng: 121.0198, isPrimary: true },
  { iata: 'SGN', icao: 'VVTS', name: 'Tan Son Nhat International', city: 'Ho Chi Minh City', country: 'Vietnam', countryCode: 'VN', lat: 10.8188, lng: 106.6520, isPrimary: true },
  { iata: 'HAN', icao: 'VVNB', name: 'Noi Bai International', city: 'Hanoi', country: 'Vietnam', countryCode: 'VN', lat: 21.2212, lng: 105.8072, isPrimary: true },

  // Asia - India
  { iata: 'DEL', icao: 'VIDP', name: 'Indira Gandhi International', city: 'Delhi', country: 'India', countryCode: 'IN', lat: 28.5562, lng: 77.1000, isPrimary: true },
  { iata: 'BOM', icao: 'VABB', name: 'Chhatrapati Shivaji Maharaj International', city: 'Mumbai', country: 'India', countryCode: 'IN', lat: 19.0896, lng: 72.8656, isPrimary: true },
  { iata: 'BLR', icao: 'VOBL', name: 'Kempegowda International', city: 'Bangalore', country: 'India', countryCode: 'IN', lat: 13.1986, lng: 77.7066, isPrimary: true },

  // Asia - South Korea
  { iata: 'ICN', icao: 'RKSI', name: 'Incheon International', city: 'Seoul', country: 'South Korea', countryCode: 'KR', lat: 37.4691, lng: 126.4505, isPrimary: true },

  // Oceania
  { iata: 'SYD', icao: 'YSSY', name: 'Sydney Kingsford Smith', city: 'Sydney', country: 'Australia', countryCode: 'AU', lat: -33.9461, lng: 151.1772, isPrimary: true },
  { iata: 'MEL', icao: 'YMML', name: 'Melbourne', city: 'Melbourne', country: 'Australia', countryCode: 'AU', lat: -37.6690, lng: 144.8410, isPrimary: true },
  { iata: 'BNE', icao: 'YBBN', name: 'Brisbane', city: 'Brisbane', country: 'Australia', countryCode: 'AU', lat: -27.3942, lng: 153.1218, isPrimary: true },
  { iata: 'AKL', icao: 'NZAA', name: 'Auckland', city: 'Auckland', country: 'New Zealand', countryCode: 'NZ', lat: -37.0082, lng: 174.7850, isPrimary: true },

  // Africa
  { iata: 'JNB', icao: 'FAOR', name: 'O. R. Tambo International', city: 'Johannesburg', country: 'South Africa', countryCode: 'ZA', lat: -26.1392, lng: 28.2460, isPrimary: true },
  { iata: 'CPT', icao: 'FACT', name: 'Cape Town International', city: 'Cape Town', country: 'South Africa', countryCode: 'ZA', lat: -33.9649, lng: 18.6017, isPrimary: true },
  { iata: 'NBO', icao: 'HKJK', name: 'Jomo Kenyatta International', city: 'Nairobi', country: 'Kenya', countryCode: 'KE', lat: -1.3192, lng: 36.9278, isPrimary: true },
  { iata: 'CMN', icao: 'GMMN', name: 'Mohammed V International', city: 'Casablanca', country: 'Morocco', countryCode: 'MA', lat: 33.3675, lng: -7.5900, isPrimary: true },
  { iata: 'RAK', icao: 'GMMX', name: 'Marrakech Menara', city: 'Marrakech', country: 'Morocco', countryCode: 'MA', lat: 31.6069, lng: -8.0363, isPrimary: true },
];

// Search function for autocomplete
export function searchAirports(query: string, limit: number = 10): AirportData[] {
  if (!query || query.length < 2) return [];

  const normalizedQuery = query.toLowerCase().trim();

  // Score airports based on match quality
  const scored = AIRPORTS.map((airport) => {
    let score = 0;

    // Exact IATA match (highest priority)
    if (airport.iata.toLowerCase() === normalizedQuery) {
      score = 1000;
    }
    // IATA starts with query
    else if (airport.iata.toLowerCase().startsWith(normalizedQuery)) {
      score = 500;
    }
    // ICAO match
    else if (airport.icao.toLowerCase() === normalizedQuery) {
      score = 400;
    }
    // City exact match
    else if (airport.city.toLowerCase() === normalizedQuery) {
      score = 300;
    }
    // City starts with query
    else if (airport.city.toLowerCase().startsWith(normalizedQuery)) {
      score = 200;
    }
    // City contains query
    else if (airport.city.toLowerCase().includes(normalizedQuery)) {
      score = 100;
    }
    // Airport name contains query
    else if (airport.name.toLowerCase().includes(normalizedQuery)) {
      score = 50;
    }
    // Country contains query
    else if (airport.country.toLowerCase().includes(normalizedQuery)) {
      score = 25;
    }

    // Boost primary airports
    if (airport.isPrimary && score > 0) {
      score += 50;
    }

    return { airport, score };
  });

  // Filter and sort
  return scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.airport);
}

// Group airports by city for display
export function groupAirportsByCity(airports: AirportData[]): Map<string, AirportData[]> {
  const grouped = new Map<string, AirportData[]>();

  for (const airport of airports) {
    const key = `${airport.city}, ${airport.country}`;
    const existing = grouped.get(key) || [];

    // Sort within city: primary first
    if (airport.isPrimary) {
      existing.unshift(airport);
    } else {
      existing.push(airport);
    }

    grouped.set(key, existing);
  }

  return grouped;
}

// Pre-built Map for O(1) IATA code lookups (initialized once at module load)
const AIRPORTS_BY_IATA = new Map<string, AirportData>(
  AIRPORTS.map(airport => [airport.iata.toUpperCase(), airport])
);

// Get airport by IATA code - O(1) lookup
export function getAirportByIata(iata: string): AirportData | undefined {
  return AIRPORTS_BY_IATA.get(iata.toUpperCase());
}
