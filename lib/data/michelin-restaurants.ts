/**
 * FIX 3.21: Michelin Restaurant Database
 * Curated list of notable Michelin-starred restaurants by city
 * Used to enhance dining recommendations for foodie and luxury travelers
 */

export interface MichelinRestaurant {
  name: string;
  stars: 1 | 2 | 3;
  city: string;
  country: string;
  cuisine: string;
  priceRange: '$$$' | '$$$$';
  reservationRequired: boolean;
  bookAheadDays: number;
  neighborhood?: string;
  description?: string;
}

export const MICHELIN_RESTAURANTS: Record<string, MichelinRestaurant[]> = {
  // Japan
  'tokyo': [
    {
      name: 'Sukiyabashi Jiro',
      stars: 3,
      city: 'Tokyo',
      country: 'Japan',
      cuisine: 'sushi',
      priceRange: '$$$$',
      reservationRequired: true,
      bookAheadDays: 90,
      neighborhood: 'Ginza',
      description: 'Legendary sushi master Jiro Ono\'s intimate counter',
    },
    {
      name: 'Narisawa',
      stars: 2,
      city: 'Tokyo',
      country: 'Japan',
      cuisine: 'innovative',
      priceRange: '$$$$',
      reservationRequired: true,
      bookAheadDays: 60,
      neighborhood: 'Minato',
      description: 'Innovative cuisine celebrating Japanese terroir',
    },
    {
      name: 'Den',
      stars: 2,
      city: 'Tokyo',
      country: 'Japan',
      cuisine: 'japanese',
      priceRange: '$$$$',
      reservationRequired: true,
      bookAheadDays: 30,
      neighborhood: 'Jingumae',
      description: 'Creative Japanese cuisine with playful presentation',
    },
    {
      name: 'Florilège',
      stars: 2,
      city: 'Tokyo',
      country: 'Japan',
      cuisine: 'french',
      priceRange: '$$$$',
      reservationRequired: true,
      bookAheadDays: 30,
      neighborhood: 'Shibuya',
      description: 'French-Japanese fusion in a modern setting',
    },
    {
      name: 'Sushi Saito',
      stars: 3,
      city: 'Tokyo',
      country: 'Japan',
      cuisine: 'sushi',
      priceRange: '$$$$',
      reservationRequired: true,
      bookAheadDays: 90,
      neighborhood: 'Minato',
      description: 'Exclusive sushi experience, extremely difficult reservation',
    },
  ],
  'kyoto': [
    {
      name: 'Kikunoi Honten',
      stars: 3,
      city: 'Kyoto',
      country: 'Japan',
      cuisine: 'kaiseki',
      priceRange: '$$$$',
      reservationRequired: true,
      bookAheadDays: 60,
      neighborhood: 'Higashiyama',
      description: 'Traditional kaiseki in a historic ryotei',
    },
    {
      name: 'Hyotei',
      stars: 3,
      city: 'Kyoto',
      country: 'Japan',
      cuisine: 'kaiseki',
      priceRange: '$$$$',
      reservationRequired: true,
      bookAheadDays: 60,
      neighborhood: 'Nanzenji',
      description: '400-year-old kaiseki restaurant near Nanzenji temple',
    },
  ],

  // France
  'paris': [
    {
      name: 'Le Cinq',
      stars: 3,
      city: 'Paris',
      country: 'France',
      cuisine: 'french',
      priceRange: '$$$$',
      reservationRequired: true,
      bookAheadDays: 30,
      neighborhood: '8th arrondissement',
      description: 'Elegant French cuisine at Four Seasons George V',
    },
    {
      name: 'L\'Ambroisie',
      stars: 3,
      city: 'Paris',
      country: 'France',
      cuisine: 'french',
      priceRange: '$$$$',
      reservationRequired: true,
      bookAheadDays: 60,
      neighborhood: 'Place des Vosges',
      description: 'Classic French haute cuisine in historic setting',
    },
    {
      name: 'Arpège',
      stars: 3,
      city: 'Paris',
      country: 'France',
      cuisine: 'french',
      priceRange: '$$$$',
      reservationRequired: true,
      bookAheadDays: 45,
      neighborhood: '7th arrondissement',
      description: 'Vegetable-forward haute cuisine by Alain Passard',
    },
    {
      name: 'Septime',
      stars: 1,
      city: 'Paris',
      country: 'France',
      cuisine: 'modern french',
      priceRange: '$$$',
      reservationRequired: true,
      bookAheadDays: 21,
      neighborhood: '11th arrondissement',
      description: 'Hip bistronomy with seasonal tasting menus',
    },
    {
      name: 'Le Comptoir du Panthéon',
      stars: 1,
      city: 'Paris',
      country: 'France',
      cuisine: 'french',
      priceRange: '$$$',
      reservationRequired: true,
      bookAheadDays: 14,
      neighborhood: 'Latin Quarter',
      description: 'Classic bistro fare in literary neighborhood',
    },
  ],

  // Spain
  'barcelona': [
    {
      name: 'El Celler de Can Roca',
      stars: 3,
      city: 'Girona',
      country: 'Spain',
      cuisine: 'catalan',
      priceRange: '$$$$',
      reservationRequired: true,
      bookAheadDays: 90,
      description: 'World-renowned Roca brothers\' creative Catalan cuisine',
    },
    {
      name: 'Disfrutar',
      stars: 3,
      city: 'Barcelona',
      country: 'Spain',
      cuisine: 'avant-garde',
      priceRange: '$$$$',
      reservationRequired: true,
      bookAheadDays: 60,
      neighborhood: 'Eixample',
      description: 'Ex-elBulli chefs\' playful molecular gastronomy',
    },
    {
      name: 'Tickets',
      stars: 1,
      city: 'Barcelona',
      country: 'Spain',
      cuisine: 'tapas',
      priceRange: '$$$',
      reservationRequired: true,
      bookAheadDays: 30,
      neighborhood: 'Poble Sec',
      description: 'Ferran Adrià family\'s fun tapas bar',
    },
  ],
  'san-sebastian': [
    {
      name: 'Arzak',
      stars: 3,
      city: 'San Sebastián',
      country: 'Spain',
      cuisine: 'basque',
      priceRange: '$$$$',
      reservationRequired: true,
      bookAheadDays: 45,
      description: 'Juan Mari Arzak\'s legendary Basque cuisine',
    },
    {
      name: 'Mugaritz',
      stars: 2,
      city: 'San Sebastián',
      country: 'Spain',
      cuisine: 'avant-garde',
      priceRange: '$$$$',
      reservationRequired: true,
      bookAheadDays: 60,
      description: 'Conceptual dining experience in countryside setting',
    },
  ],

  // Italy
  'rome': [
    {
      name: 'La Pergola',
      stars: 3,
      city: 'Rome',
      country: 'Italy',
      cuisine: 'italian',
      priceRange: '$$$$',
      reservationRequired: true,
      bookAheadDays: 30,
      neighborhood: 'Monte Mario',
      description: 'Rome\'s only 3-star with panoramic views',
    },
    {
      name: 'Il Pagliaccio',
      stars: 2,
      city: 'Rome',
      country: 'Italy',
      cuisine: 'creative italian',
      priceRange: '$$$$',
      reservationRequired: true,
      bookAheadDays: 21,
      neighborhood: 'Centro Storico',
      description: 'Creative Italian cuisine in intimate setting',
    },
  ],
  'milan': [
    {
      name: 'Enrico Bartolini al Mudec',
      stars: 3,
      city: 'Milan',
      country: 'Italy',
      cuisine: 'italian',
      priceRange: '$$$$',
      reservationRequired: true,
      bookAheadDays: 30,
      neighborhood: 'Tortona',
      description: 'Contemporary Italian in museum setting',
    },
  ],
  'modena': [
    {
      name: 'Osteria Francescana',
      stars: 3,
      city: 'Modena',
      country: 'Italy',
      cuisine: 'italian',
      priceRange: '$$$$',
      reservationRequired: true,
      bookAheadDays: 90,
      description: 'Massimo Bottura\'s world-famous creative Italian',
    },
  ],

  // UK
  'london': [
    {
      name: 'Restaurant Gordon Ramsay',
      stars: 3,
      city: 'London',
      country: 'UK',
      cuisine: 'french',
      priceRange: '$$$$',
      reservationRequired: true,
      bookAheadDays: 30,
      neighborhood: 'Chelsea',
      description: 'Gordon Ramsay\'s flagship fine dining',
    },
    {
      name: 'Core by Clare Smyth',
      stars: 3,
      city: 'London',
      country: 'UK',
      cuisine: 'british',
      priceRange: '$$$$',
      reservationRequired: true,
      bookAheadDays: 45,
      neighborhood: 'Notting Hill',
      description: 'Refined British cuisine celebrating local ingredients',
    },
    {
      name: 'The Ledbury',
      stars: 2,
      city: 'London',
      country: 'UK',
      cuisine: 'modern british',
      priceRange: '$$$$',
      reservationRequired: true,
      bookAheadDays: 30,
      neighborhood: 'Notting Hill',
      description: 'Seasonal British fine dining',
    },
    {
      name: 'Brat',
      stars: 1,
      city: 'London',
      country: 'UK',
      cuisine: 'basque',
      priceRange: '$$$',
      reservationRequired: true,
      bookAheadDays: 21,
      neighborhood: 'Shoreditch',
      description: 'Wood-fired Basque cooking in East London',
    },
  ],

  // USA
  'new-york': [
    {
      name: 'Eleven Madison Park',
      stars: 3,
      city: 'New York',
      country: 'USA',
      cuisine: 'american',
      priceRange: '$$$$',
      reservationRequired: true,
      bookAheadDays: 60,
      neighborhood: 'Flatiron',
      description: 'Plant-based tasting menu in art deco space',
    },
    {
      name: 'Le Bernardin',
      stars: 3,
      city: 'New York',
      country: 'USA',
      cuisine: 'seafood',
      priceRange: '$$$$',
      reservationRequired: true,
      bookAheadDays: 30,
      neighborhood: 'Midtown',
      description: 'Eric Ripert\'s legendary seafood temple',
    },
    {
      name: 'Per Se',
      stars: 3,
      city: 'New York',
      country: 'USA',
      cuisine: 'french',
      priceRange: '$$$$',
      reservationRequired: true,
      bookAheadDays: 30,
      neighborhood: 'Columbus Circle',
      description: 'Thomas Keller\'s NYC outpost with Central Park views',
    },
    {
      name: 'Atomix',
      stars: 2,
      city: 'New York',
      country: 'USA',
      cuisine: 'korean',
      priceRange: '$$$$',
      reservationRequired: true,
      bookAheadDays: 30,
      neighborhood: 'NoMad',
      description: 'Elevated Korean tasting menu experience',
    },
  ],
  'san-francisco': [
    {
      name: 'Benu',
      stars: 3,
      city: 'San Francisco',
      country: 'USA',
      cuisine: 'asian-american',
      priceRange: '$$$$',
      reservationRequired: true,
      bookAheadDays: 30,
      neighborhood: 'SoMa',
      description: 'Corey Lee\'s Asian-influenced American tasting menu',
    },
    {
      name: 'Quince',
      stars: 3,
      city: 'San Francisco',
      country: 'USA',
      cuisine: 'californian',
      priceRange: '$$$$',
      reservationRequired: true,
      bookAheadDays: 30,
      neighborhood: 'Jackson Square',
      description: 'Farm-to-table Californian with Italian influences',
    },
    {
      name: 'Lazy Bear',
      stars: 2,
      city: 'San Francisco',
      country: 'USA',
      cuisine: 'american',
      priceRange: '$$$$',
      reservationRequired: true,
      bookAheadDays: 30,
      neighborhood: 'Mission',
      description: 'Communal dining experience in converted warehouse',
    },
  ],
  'los-angeles': [
    {
      name: 'n/naka',
      stars: 2,
      city: 'Los Angeles',
      country: 'USA',
      cuisine: 'kaiseki',
      priceRange: '$$$$',
      reservationRequired: true,
      bookAheadDays: 30,
      neighborhood: 'Palms',
      description: 'Niki Nakayama\'s modern kaiseki',
    },
    {
      name: 'Providence',
      stars: 2,
      city: 'Los Angeles',
      country: 'USA',
      cuisine: 'seafood',
      priceRange: '$$$$',
      reservationRequired: true,
      bookAheadDays: 21,
      neighborhood: 'Hollywood',
      description: 'Sustainable seafood fine dining',
    },
  ],
  'chicago': [
    {
      name: 'Alinea',
      stars: 3,
      city: 'Chicago',
      country: 'USA',
      cuisine: 'avant-garde',
      priceRange: '$$$$',
      reservationRequired: true,
      bookAheadDays: 60,
      neighborhood: 'Lincoln Park',
      description: 'Grant Achatz\'s groundbreaking molecular gastronomy',
    },
    {
      name: 'Smyth',
      stars: 2,
      city: 'Chicago',
      country: 'USA',
      cuisine: 'american',
      priceRange: '$$$$',
      reservationRequired: true,
      bookAheadDays: 30,
      neighborhood: 'West Loop',
      description: 'Hyper-seasonal farm-driven cuisine',
    },
  ],

  // Southeast Asia
  'bangkok': [
    {
      name: 'Gaggan Anand',
      stars: 2,
      city: 'Bangkok',
      country: 'Thailand',
      cuisine: 'progressive indian',
      priceRange: '$$$$',
      reservationRequired: true,
      bookAheadDays: 45,
      description: 'Emoji-menu progressive Indian cuisine',
    },
    {
      name: 'Le Du',
      stars: 1,
      city: 'Bangkok',
      country: 'Thailand',
      cuisine: 'thai',
      priceRange: '$$$',
      reservationRequired: true,
      bookAheadDays: 14,
      neighborhood: 'Silom',
      description: 'Modern Thai with seasonal ingredients',
    },
    {
      name: 'Sorn',
      stars: 2,
      city: 'Bangkok',
      country: 'Thailand',
      cuisine: 'southern thai',
      priceRange: '$$$$',
      reservationRequired: true,
      bookAheadDays: 30,
      description: 'Southern Thai cuisine showcase',
    },
  ],
  'singapore': [
    {
      name: 'Odette',
      stars: 3,
      city: 'Singapore',
      country: 'Singapore',
      cuisine: 'french',
      priceRange: '$$$$',
      reservationRequired: true,
      bookAheadDays: 30,
      neighborhood: 'National Gallery',
      description: 'Julien Royer\'s elegant modern French',
    },
    {
      name: 'Les Amis',
      stars: 3,
      city: 'Singapore',
      country: 'Singapore',
      cuisine: 'french',
      priceRange: '$$$$',
      reservationRequired: true,
      bookAheadDays: 21,
      neighborhood: 'Orchard',
      description: 'Classic French fine dining institution',
    },
    {
      name: 'Burnt Ends',
      stars: 1,
      city: 'Singapore',
      country: 'Singapore',
      cuisine: 'modern australian',
      priceRange: '$$$',
      reservationRequired: true,
      bookAheadDays: 30,
      neighborhood: 'Chinatown',
      description: 'Wood-fired cooking counter experience',
    },
  ],
  'hong-kong': [
    {
      name: 'Lung King Heen',
      stars: 3,
      city: 'Hong Kong',
      country: 'China',
      cuisine: 'cantonese',
      priceRange: '$$$$',
      reservationRequired: true,
      bookAheadDays: 14,
      description: 'First Chinese restaurant to receive 3 stars',
    },
    {
      name: 'Amber',
      stars: 2,
      city: 'Hong Kong',
      country: 'China',
      cuisine: 'french',
      priceRange: '$$$$',
      reservationRequired: true,
      bookAheadDays: 21,
      neighborhood: 'Central',
      description: 'Innovative French at The Landmark Mandarin Oriental',
    },
  ],

  // Nordic
  'copenhagen': [
    {
      name: 'Noma',
      stars: 3,
      city: 'Copenhagen',
      country: 'Denmark',
      cuisine: 'new nordic',
      priceRange: '$$$$',
      reservationRequired: true,
      bookAheadDays: 90,
      description: 'René Redzepi\'s legendary New Nordic pioneer',
    },
    {
      name: 'Geranium',
      stars: 3,
      city: 'Copenhagen',
      country: 'Denmark',
      cuisine: 'new nordic',
      priceRange: '$$$$',
      reservationRequired: true,
      bookAheadDays: 60,
      description: 'Rasmus Kofoed\'s poetic vegetable-forward cuisine',
    },
    {
      name: 'Alchemist',
      stars: 2,
      city: 'Copenhagen',
      country: 'Denmark',
      cuisine: 'avant-garde',
      priceRange: '$$$$',
      reservationRequired: true,
      bookAheadDays: 90,
      description: '50-course theatrical dining experience',
    },
  ],

  // Australia
  'melbourne': [
    {
      name: 'Attica',
      stars: 2,
      city: 'Melbourne',
      country: 'Australia',
      cuisine: 'australian',
      priceRange: '$$$$',
      reservationRequired: true,
      bookAheadDays: 60,
      neighborhood: 'Ripponlea',
      description: 'Ben Shewry\'s native Australian ingredients showcase',
    },
  ],
  'sydney': [
    {
      name: 'Quay',
      stars: 2,
      city: 'Sydney',
      country: 'Australia',
      cuisine: 'australian',
      priceRange: '$$$$',
      reservationRequired: true,
      bookAheadDays: 30,
      neighborhood: 'The Rocks',
      description: 'Peter Gilmore\'s nature-inspired cuisine with harbor views',
    },
  ],

  // Peru
  'lima': [
    {
      name: 'Central',
      stars: 2,
      city: 'Lima',
      country: 'Peru',
      cuisine: 'peruvian',
      priceRange: '$$$$',
      reservationRequired: true,
      bookAheadDays: 60,
      neighborhood: 'Barranco',
      description: 'Virgilio Martínez\'s altitude-based Peruvian journey',
    },
    {
      name: 'Maido',
      stars: 2,
      city: 'Lima',
      country: 'Peru',
      cuisine: 'nikkei',
      priceRange: '$$$$',
      reservationRequired: true,
      bookAheadDays: 30,
      neighborhood: 'Miraflores',
      description: 'Mitsuharu Tsumura\'s Japanese-Peruvian fusion',
    },
  ],

  // Mexico
  'mexico-city': [
    {
      name: 'Pujol',
      stars: 2,
      city: 'Mexico City',
      country: 'Mexico',
      cuisine: 'mexican',
      priceRange: '$$$$',
      reservationRequired: true,
      bookAheadDays: 45,
      neighborhood: 'Polanco',
      description: 'Enrique Olvera\'s modern Mexican landmark',
    },
    {
      name: 'Quintonil',
      stars: 2,
      city: 'Mexico City',
      country: 'Mexico',
      cuisine: 'mexican',
      priceRange: '$$$$',
      reservationRequired: true,
      bookAheadDays: 30,
      neighborhood: 'Polanco',
      description: 'Jorge Vallejo\'s contemporary Mexican with local ingredients',
    },
  ],
};

/**
 * Get Michelin restaurants for a city
 */
export function getMichelinRestaurants(city: string): MichelinRestaurant[] {
  const normalizedCity = city.toLowerCase().replace(/\s+/g, '-');
  return MICHELIN_RESTAURANTS[normalizedCity] || [];
}

/**
 * Get all Michelin restaurants for a country
 */
export function getMichelinRestaurantsByCountry(country: string): MichelinRestaurant[] {
  const results: MichelinRestaurant[] = [];
  for (const restaurants of Object.values(MICHELIN_RESTAURANTS)) {
    for (const restaurant of restaurants) {
      if (restaurant.country.toLowerCase() === country.toLowerCase()) {
        results.push(restaurant);
      }
    }
  }
  return results;
}

/**
 * Get 3-star restaurants only (for ultra-luxury travelers)
 */
export function getThreeStarRestaurants(city?: string): MichelinRestaurant[] {
  if (city) {
    return getMichelinRestaurants(city).filter(r => r.stars === 3);
  }
  const results: MichelinRestaurant[] = [];
  for (const restaurants of Object.values(MICHELIN_RESTAURANTS)) {
    results.push(...restaurants.filter(r => r.stars === 3));
  }
  return results;
}

/**
 * Check if a city has Michelin restaurants in our database
 */
export function hasMichelinData(city: string): boolean {
  const normalizedCity = city.toLowerCase().replace(/\s+/g, '-');
  return normalizedCity in MICHELIN_RESTAURANTS;
}
