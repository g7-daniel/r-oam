export interface SearchHub {
  name: string;
  lat: number;
  lng: number;
  radiusKm: number;
  textQueries: string[];
}

export const DOMINICAN_REPUBLIC_HUBS: SearchHub[] = [
  {
    name: 'Punta Cana',
    lat: 18.5601,
    lng: -68.3725,
    radiusKm: 30,
    textQueries: [
      'luxury hotels Punta Cana',
      'resorts Cap Cana',
      'hotels Bavaro Beach',
      'Eden Roc Cap Cana',
      'St Regis Cap Cana',
      'Sanctuary Cap Cana',
      'Tortuga Bay Puntacana',
      'Hyatt Zilara Cap Cana',
      'Excellence Punta Cana',
      'Secrets Cap Cana',
    ],
  },
  {
    name: 'La Romana',
    lat: 18.4273,
    lng: -68.9728,
    radiusKm: 25,
    textQueries: [
      'hotels La Romana Dominican Republic',
      'Casa de Campo resort',
      'Secrets La Romana Resort',
      'Catalonia Royal La Romana',
      'Hilton La Romana',
      'Dreams Dominicus La Romana',
    ],
  },
  {
    name: 'Santo Domingo',
    lat: 18.4861,
    lng: -69.9312,
    radiusKm: 20,
    textQueries: [
      'hotels Santo Domingo',
      'luxury hotels Santo Domingo',
    ],
  },
  {
    name: 'Puerto Plata',
    lat: 19.7579,
    lng: -70.7031,
    radiusKm: 30,
    textQueries: [
      'hotels Puerto Plata',
      'resorts Playa Dorada',
      'Casa Colonial Beach & Spa',
    ],
  },
  {
    name: 'Samana',
    lat: 19.2059,
    lng: -69.3323,
    radiusKm: 40,
    textQueries: [
      'hotels Samana Dominican Republic',
      'resorts Las Terrenas',
      'Sublime Samana hotel',
      'Cayo Levantado Resort',
      'Bahia Principe Samana',
    ],
  },
  {
    name: 'Cabrera / Rio San Juan',
    lat: 19.6333,
    lng: -69.9000,
    radiusKm: 30,
    textQueries: [
      'Amanera resort Dominican Republic',
      'hotels Rio San Juan',
    ],
  },
  {
    name: 'Cabarete',
    lat: 19.7583,
    lng: -70.4167,
    radiusKm: 25,
    textQueries: [
      'hotels Cabarete Dominican Republic',
      'Ocean Club Costa Norte',
      'Millennium Resort Cabarete',
      'Velero Beach Resort',
    ],
  },
  {
    name: 'Jarabacoa',
    lat: 19.1167,
    lng: -70.6333,
    radiusKm: 20,
    textQueries: ['hotels Jarabacoa mountains'],
  },
  {
    name: 'Barahona',
    lat: 18.2000,
    lng: -71.1000,
    radiusKm: 30,
    textQueries: ['hotels Barahona Dominican Republic'],
  },
];

export const HUB_CONFIGS: Record<string, SearchHub[]> = {
  'Dominican Republic': DOMINICAN_REPUBLIC_HUBS,
  'DO': DOMINICAN_REPUBLIC_HUBS,
};
