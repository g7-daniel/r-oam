// Comprehensive destinations database with proper country codes and coordinates

export interface DestinationData {
  name: string;
  countryCode: string;
  country: string;
  lat: number;
  lng: number;
  region?: string;
  imageUrl: string;
  popular?: boolean;
}

export const DESTINATIONS: DestinationData[] = [
  // Central America & Caribbean
  { name: 'Costa Rica', countryCode: 'CR', country: 'Costa Rica', lat: 9.7489, lng: -83.7534, imageUrl: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=300&fit=crop', popular: true },
  { name: 'San Jose', countryCode: 'CR', country: 'Costa Rica', lat: 9.9281, lng: -84.0907, region: 'Costa Rica', imageUrl: 'https://images.unsplash.com/photo-1596402184320-417e7178b2cd?w=400&h=300&fit=crop' },
  { name: 'Tamarindo', countryCode: 'CR', country: 'Costa Rica', lat: 10.2995, lng: -85.8374, region: 'Costa Rica', imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=300&fit=crop' },
  { name: 'Manuel Antonio', countryCode: 'CR', country: 'Costa Rica', lat: 9.3929, lng: -84.1368, region: 'Costa Rica', imageUrl: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=300&fit=crop' },
  { name: 'La Fortuna', countryCode: 'CR', country: 'Costa Rica', lat: 10.4679, lng: -84.6434, region: 'Costa Rica', imageUrl: 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=400&h=300&fit=crop' },
  { name: 'Santa Teresa', countryCode: 'CR', country: 'Costa Rica', lat: 9.6419, lng: -85.1688, region: 'Costa Rica', imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=300&fit=crop' },
  { name: 'Monteverde', countryCode: 'CR', country: 'Costa Rica', lat: 10.3103, lng: -84.8256, region: 'Costa Rica', imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&h=300&fit=crop' },
  { name: 'Jaco', countryCode: 'CR', country: 'Costa Rica', lat: 9.6170, lng: -84.6291, region: 'Costa Rica', imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=300&fit=crop' },
  { name: 'Puerto Viejo', countryCode: 'CR', country: 'Costa Rica', lat: 9.6560, lng: -82.7550, region: 'Costa Rica', imageUrl: 'https://images.unsplash.com/photo-1548574505-5e239809ee19?w=400&h=300&fit=crop' },
  { name: 'Guanacaste', countryCode: 'CR', country: 'Costa Rica', lat: 10.4274, lng: -85.4520, region: 'Costa Rica', imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=300&fit=crop' },
  { name: 'Nosara', countryCode: 'CR', country: 'Costa Rica', lat: 9.9764, lng: -85.6530, region: 'Costa Rica', imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=300&fit=crop' },
  { name: 'Panama', countryCode: 'PA', country: 'Panama', lat: 8.5380, lng: -80.7821, imageUrl: 'https://images.unsplash.com/photo-1519865885898-a54a6f2c7eea?w=400&h=300&fit=crop', popular: true },
  { name: 'Panama City', countryCode: 'PA', country: 'Panama', lat: 9.0820, lng: -79.5199, imageUrl: 'https://images.unsplash.com/photo-1519865885898-a54a6f2c7eea?w=400&h=300&fit=crop' },
  { name: 'Bocas del Toro', countryCode: 'PA', country: 'Panama', lat: 9.3405, lng: -82.2410, region: 'Panama', imageUrl: 'https://images.unsplash.com/photo-1548574505-5e239809ee19?w=400&h=300&fit=crop' },
  { name: 'Cancun', countryCode: 'MX', country: 'Mexico', lat: 21.1619, lng: -86.8515, imageUrl: 'https://images.unsplash.com/photo-1510097467424-192d713fd8b2?w=400&h=300&fit=crop', popular: true },
  { name: 'Tulum', countryCode: 'MX', country: 'Mexico', lat: 20.2114, lng: -87.4654, region: 'Mexico', imageUrl: 'https://images.unsplash.com/photo-1518638150340-f706e86654de?w=400&h=300&fit=crop' },
  { name: 'Playa del Carmen', countryCode: 'MX', country: 'Mexico', lat: 20.6296, lng: -87.0739, region: 'Mexico', imageUrl: 'https://images.unsplash.com/photo-1512813195386-6cf811ad3542?w=400&h=300&fit=crop' },
  { name: 'Mexico City', countryCode: 'MX', country: 'Mexico', lat: 19.4326, lng: -99.1332, imageUrl: 'https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?w=400&h=300&fit=crop', popular: true },
  { name: 'Puerto Vallarta', countryCode: 'MX', country: 'Mexico', lat: 20.6534, lng: -105.2253, region: 'Mexico', imageUrl: 'https://images.unsplash.com/photo-1512813195386-6cf811ad3542?w=400&h=300&fit=crop' },
  { name: 'Cabo San Lucas', countryCode: 'MX', country: 'Mexico', lat: 22.8905, lng: -109.9167, region: 'Mexico', imageUrl: 'https://images.unsplash.com/photo-1512813195386-6cf811ad3542?w=400&h=300&fit=crop' },
  { name: 'Jamaica', countryCode: 'JM', country: 'Jamaica', lat: 18.1096, lng: -77.2975, imageUrl: 'https://images.unsplash.com/photo-1557041913-29aaa946097c?w=400&h=300&fit=crop' },
  { name: 'Montego Bay', countryCode: 'JM', country: 'Jamaica', lat: 18.4762, lng: -77.8939, imageUrl: 'https://images.unsplash.com/photo-1557041913-29aaa946097c?w=400&h=300&fit=crop' },
  { name: 'Dominican Republic', countryCode: 'DO', country: 'Dominican Republic', lat: 18.7357, lng: -70.1627, imageUrl: 'https://images.unsplash.com/photo-1580541631950-7282082b53ce?w=400&h=300&fit=crop', popular: true },
  { name: 'Punta Cana', countryCode: 'DO', country: 'Dominican Republic', lat: 18.5820, lng: -68.4055, region: 'Dominican Republic', imageUrl: 'https://images.unsplash.com/photo-1580541631950-7282082b53ce?w=400&h=300&fit=crop' },
  { name: 'Santo Domingo', countryCode: 'DO', country: 'Dominican Republic', lat: 18.4861, lng: -69.9312, region: 'Dominican Republic', imageUrl: 'https://images.unsplash.com/photo-1593261873921-4a03d28ab4ac?w=400&h=300&fit=crop' },
  { name: 'Puerto Plata', countryCode: 'DO', country: 'Dominican Republic', lat: 19.7934, lng: -70.6884, region: 'Dominican Republic', imageUrl: 'https://images.unsplash.com/photo-1580541631950-7282082b53ce?w=400&h=300&fit=crop' },
  { name: 'La Romana', countryCode: 'DO', country: 'Dominican Republic', lat: 18.4274, lng: -68.9728, region: 'Dominican Republic', imageUrl: 'https://images.unsplash.com/photo-1580541631950-7282082b53ce?w=400&h=300&fit=crop' },
  { name: 'Samana', countryCode: 'DO', country: 'Dominican Republic', lat: 19.2058, lng: -69.3324, region: 'Dominican Republic', imageUrl: 'https://images.unsplash.com/photo-1580541631950-7282082b53ce?w=400&h=300&fit=crop' },
  { name: 'Aruba', countryCode: 'AW', country: 'Aruba', lat: 12.5211, lng: -69.9683, imageUrl: 'https://images.unsplash.com/photo-1548574505-5e239809ee19?w=400&h=300&fit=crop' },
  { name: 'Bahamas', countryCode: 'BS', country: 'Bahamas', lat: 25.0343, lng: -77.3963, imageUrl: 'https://images.unsplash.com/photo-1548574505-5e239809ee19?w=400&h=300&fit=crop' },
  { name: 'Puerto Rico', countryCode: 'PR', country: 'Puerto Rico', lat: 18.2208, lng: -66.5901, imageUrl: 'https://images.unsplash.com/photo-1577086664693-894d8c895b7d?w=400&h=300&fit=crop' },

  // Europe
  { name: 'Paris', countryCode: 'FR', country: 'France', lat: 48.8566, lng: 2.3522, imageUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=300&fit=crop', popular: true },
  { name: 'Nice', countryCode: 'FR', country: 'France', lat: 43.7102, lng: 7.2620, region: 'France', imageUrl: 'https://images.unsplash.com/photo-1491166617655-0723a0999cfc?w=400&h=300&fit=crop' },
  { name: 'Lyon', countryCode: 'FR', country: 'France', lat: 45.7640, lng: 4.8357, region: 'France', imageUrl: 'https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?w=400&h=300&fit=crop' },
  { name: 'London', countryCode: 'GB', country: 'United Kingdom', lat: 51.5074, lng: -0.1278, imageUrl: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&h=300&fit=crop', popular: true },
  { name: 'Edinburgh', countryCode: 'GB', country: 'United Kingdom', lat: 55.9533, lng: -3.1883, imageUrl: 'https://images.unsplash.com/photo-1506377585622-bedcbb5f2208?w=400&h=300&fit=crop' },
  { name: 'Barcelona', countryCode: 'ES', country: 'Spain', lat: 41.3851, lng: 2.1734, imageUrl: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=400&h=300&fit=crop', popular: true },
  { name: 'Madrid', countryCode: 'ES', country: 'Spain', lat: 40.4168, lng: -3.7038, imageUrl: 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=400&h=300&fit=crop' },
  { name: 'Ibiza', countryCode: 'ES', country: 'Spain', lat: 38.9067, lng: 1.4206, region: 'Spain', imageUrl: 'https://images.unsplash.com/photo-1563784462386-044fd95e9852?w=400&h=300&fit=crop' },
  { name: 'Mallorca', countryCode: 'ES', country: 'Spain', lat: 39.6953, lng: 3.0176, region: 'Spain', imageUrl: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=400&h=300&fit=crop' },
  { name: 'Rome', countryCode: 'IT', country: 'Italy', lat: 41.9028, lng: 12.4964, imageUrl: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=400&h=300&fit=crop', popular: true },
  { name: 'Florence', countryCode: 'IT', country: 'Italy', lat: 43.7696, lng: 11.2558, region: 'Italy', imageUrl: 'https://images.unsplash.com/photo-1543429257-9fcc963b4891?w=400&h=300&fit=crop' },
  { name: 'Venice', countryCode: 'IT', country: 'Italy', lat: 45.4408, lng: 12.3155, region: 'Italy', imageUrl: 'https://images.unsplash.com/photo-1514890547357-a9ee288728e0?w=400&h=300&fit=crop' },
  { name: 'Amalfi Coast', countryCode: 'IT', country: 'Italy', lat: 40.6333, lng: 14.6029, region: 'Italy', imageUrl: 'https://images.unsplash.com/photo-1534113414509-0eec2bfb493f?w=400&h=300&fit=crop' },
  { name: 'Milan', countryCode: 'IT', country: 'Italy', lat: 45.4642, lng: 9.1900, region: 'Italy', imageUrl: 'https://images.unsplash.com/photo-1520440229-6469a149ac59?w=400&h=300&fit=crop' },
  { name: 'Amsterdam', countryCode: 'NL', country: 'Netherlands', lat: 52.3676, lng: 4.9041, imageUrl: 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=400&h=300&fit=crop', popular: true },
  { name: 'Berlin', countryCode: 'DE', country: 'Germany', lat: 52.5200, lng: 13.4050, imageUrl: 'https://images.unsplash.com/photo-1560969184-10fe8719e047?w=400&h=300&fit=crop' },
  { name: 'Munich', countryCode: 'DE', country: 'Germany', lat: 48.1351, lng: 11.5820, imageUrl: 'https://images.unsplash.com/photo-1595867818082-083862f3d630?w=400&h=300&fit=crop' },
  { name: 'Vienna', countryCode: 'AT', country: 'Austria', lat: 48.2082, lng: 16.3738, imageUrl: 'https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=400&h=300&fit=crop' },
  { name: 'Prague', countryCode: 'CZ', country: 'Czech Republic', lat: 50.0755, lng: 14.4378, imageUrl: 'https://images.unsplash.com/photo-1541849546-216549ae216d?w=400&h=300&fit=crop' },
  { name: 'Budapest', countryCode: 'HU', country: 'Hungary', lat: 47.4979, lng: 19.0402, imageUrl: 'https://images.unsplash.com/photo-1541343672885-9be56236302a?w=400&h=300&fit=crop' },
  { name: 'Lisbon', countryCode: 'PT', country: 'Portugal', lat: 38.7223, lng: -9.1393, imageUrl: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=400&h=300&fit=crop', popular: true },
  { name: 'Porto', countryCode: 'PT', country: 'Portugal', lat: 41.1579, lng: -8.6291, region: 'Portugal', imageUrl: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=400&h=300&fit=crop' },
  { name: 'Greece', countryCode: 'GR', country: 'Greece', lat: 39.0742, lng: 21.8243, imageUrl: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=400&h=300&fit=crop', popular: true },
  { name: 'Athens', countryCode: 'GR', country: 'Greece', lat: 37.9838, lng: 23.7275, imageUrl: 'https://images.unsplash.com/photo-1555993539-1732b0258235?w=400&h=300&fit=crop' },
  { name: 'Santorini', countryCode: 'GR', country: 'Greece', lat: 36.3932, lng: 25.4615, region: 'Greece', imageUrl: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=400&h=300&fit=crop' },
  { name: 'Mykonos', countryCode: 'GR', country: 'Greece', lat: 37.4467, lng: 25.3289, region: 'Greece', imageUrl: 'https://images.unsplash.com/photo-1586952502984-6dea2a6b5d67?w=400&h=300&fit=crop' },
  { name: 'Crete', countryCode: 'GR', country: 'Greece', lat: 35.2401, lng: 24.8093, region: 'Greece', imageUrl: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=400&h=300&fit=crop' },
  { name: 'Switzerland', countryCode: 'CH', country: 'Switzerland', lat: 46.8182, lng: 8.2275, imageUrl: 'https://images.unsplash.com/photo-1527668752968-14dc70a27c95?w=400&h=300&fit=crop' },
  { name: 'Zurich', countryCode: 'CH', country: 'Switzerland', lat: 47.3769, lng: 8.5417, imageUrl: 'https://images.unsplash.com/photo-1515488764276-beab7607c1e6?w=400&h=300&fit=crop' },
  { name: 'Copenhagen', countryCode: 'DK', country: 'Denmark', lat: 55.6761, lng: 12.5683, imageUrl: 'https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?w=400&h=300&fit=crop' },
  { name: 'Stockholm', countryCode: 'SE', country: 'Sweden', lat: 59.3293, lng: 18.0686, imageUrl: 'https://images.unsplash.com/photo-1509356843151-3e7d96241e11?w=400&h=300&fit=crop' },
  { name: 'Norway', countryCode: 'NO', country: 'Norway', lat: 60.4720, lng: 8.4689, imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop' },
  { name: 'Iceland', countryCode: 'IS', country: 'Iceland', lat: 64.9631, lng: -19.0208, imageUrl: 'https://images.unsplash.com/photo-1476610182048-b716b8518aae?w=400&h=300&fit=crop' },
  { name: 'Reykjavik', countryCode: 'IS', country: 'Iceland', lat: 64.1466, lng: -21.9426, imageUrl: 'https://images.unsplash.com/photo-1504829857797-ddff29c27927?w=400&h=300&fit=crop' },
  { name: 'Dublin', countryCode: 'IE', country: 'Ireland', lat: 53.3498, lng: -6.2603, imageUrl: 'https://images.unsplash.com/photo-1549918864-48ac978761a4?w=400&h=300&fit=crop' },
  { name: 'Croatia', countryCode: 'HR', country: 'Croatia', lat: 45.1000, lng: 15.2000, imageUrl: 'https://images.unsplash.com/photo-1555990793-da11153b2473?w=400&h=300&fit=crop' },
  { name: 'Dubrovnik', countryCode: 'HR', country: 'Croatia', lat: 42.6507, lng: 18.0944, imageUrl: 'https://images.unsplash.com/photo-1555990793-da11153b2473?w=400&h=300&fit=crop' },
  { name: 'Split', countryCode: 'HR', country: 'Croatia', lat: 43.5081, lng: 16.4402, region: 'Croatia', imageUrl: 'https://images.unsplash.com/photo-1555990793-da11153b2473?w=400&h=300&fit=crop' },

  // Asia
  { name: 'Tokyo', countryCode: 'JP', country: 'Japan', lat: 35.6762, lng: 139.6503, imageUrl: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=300&fit=crop', popular: true },
  { name: 'Kyoto', countryCode: 'JP', country: 'Japan', lat: 35.0116, lng: 135.7681, region: 'Japan', imageUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400&h=300&fit=crop' },
  { name: 'Osaka', countryCode: 'JP', country: 'Japan', lat: 34.6937, lng: 135.5023, region: 'Japan', imageUrl: 'https://images.unsplash.com/photo-1590559899731-a382839e5549?w=400&h=300&fit=crop' },
  { name: 'Thailand', countryCode: 'TH', country: 'Thailand', lat: 15.8700, lng: 100.9925, imageUrl: 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=400&h=300&fit=crop', popular: true },
  { name: 'Bangkok', countryCode: 'TH', country: 'Thailand', lat: 13.7563, lng: 100.5018, imageUrl: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=400&h=300&fit=crop' },
  { name: 'Phuket', countryCode: 'TH', country: 'Thailand', lat: 7.8804, lng: 98.3923, region: 'Thailand', imageUrl: 'https://images.unsplash.com/photo-1537956965359-7573183d1f57?w=400&h=300&fit=crop' },
  { name: 'Chiang Mai', countryCode: 'TH', country: 'Thailand', lat: 18.7883, lng: 98.9853, region: 'Thailand', imageUrl: 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=400&h=300&fit=crop' },
  { name: 'Koh Samui', countryCode: 'TH', country: 'Thailand', lat: 9.5120, lng: 100.0136, region: 'Thailand', imageUrl: 'https://images.unsplash.com/photo-1537956965359-7573183d1f57?w=400&h=300&fit=crop' },
  { name: 'Bali', countryCode: 'ID', country: 'Indonesia', lat: -8.4095, lng: 115.1889, imageUrl: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400&h=300&fit=crop', popular: true },
  { name: 'Ubud', countryCode: 'ID', country: 'Indonesia', lat: -8.5069, lng: 115.2625, region: 'Bali, Indonesia', imageUrl: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400&h=300&fit=crop' },
  { name: 'Vietnam', countryCode: 'VN', country: 'Vietnam', lat: 14.0583, lng: 108.2772, imageUrl: 'https://images.unsplash.com/photo-1528127269322-539801943592?w=400&h=300&fit=crop' },
  { name: 'Ho Chi Minh City', countryCode: 'VN', country: 'Vietnam', lat: 10.8231, lng: 106.6297, imageUrl: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=400&h=300&fit=crop' },
  { name: 'Hanoi', countryCode: 'VN', country: 'Vietnam', lat: 21.0278, lng: 105.8342, region: 'Vietnam', imageUrl: 'https://images.unsplash.com/photo-1528127269322-539801943592?w=400&h=300&fit=crop' },
  { name: 'Singapore', countryCode: 'SG', country: 'Singapore', lat: 1.3521, lng: 103.8198, imageUrl: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=400&h=300&fit=crop' },
  { name: 'Hong Kong', countryCode: 'HK', country: 'Hong Kong', lat: 22.3193, lng: 114.1694, imageUrl: 'https://images.unsplash.com/photo-1536599018102-9f803c979b5e?w=400&h=300&fit=crop' },
  { name: 'South Korea', countryCode: 'KR', country: 'South Korea', lat: 35.9078, lng: 127.7669, imageUrl: 'https://images.unsplash.com/photo-1517154421773-0529f29ea451?w=400&h=300&fit=crop' },
  { name: 'Seoul', countryCode: 'KR', country: 'South Korea', lat: 37.5665, lng: 126.9780, imageUrl: 'https://images.unsplash.com/photo-1517154421773-0529f29ea451?w=400&h=300&fit=crop' },
  { name: 'India', countryCode: 'IN', country: 'India', lat: 20.5937, lng: 78.9629, imageUrl: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=400&h=300&fit=crop' },
  { name: 'Maldives', countryCode: 'MV', country: 'Maldives', lat: 3.2028, lng: 73.2207, imageUrl: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=400&h=300&fit=crop' },
  { name: 'Sri Lanka', countryCode: 'LK', country: 'Sri Lanka', lat: 7.8731, lng: 80.7718, imageUrl: 'https://images.unsplash.com/photo-1586613816542-b0b8a3dd8e62?w=400&h=300&fit=crop' },
  { name: 'Philippines', countryCode: 'PH', country: 'Philippines', lat: 12.8797, lng: 121.7740, imageUrl: 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=400&h=300&fit=crop' },
  { name: 'Malaysia', countryCode: 'MY', country: 'Malaysia', lat: 4.2105, lng: 101.9758, imageUrl: 'https://images.unsplash.com/photo-1508062878650-88b52897f298?w=400&h=300&fit=crop' },

  // Middle East
  { name: 'Dubai', countryCode: 'AE', country: 'United Arab Emirates', lat: 25.2048, lng: 55.2708, imageUrl: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&h=300&fit=crop', popular: true },
  { name: 'Abu Dhabi', countryCode: 'AE', country: 'United Arab Emirates', lat: 24.4539, lng: 54.3773, imageUrl: 'https://images.unsplash.com/photo-1512632578888-169bbbc64f33?w=400&h=300&fit=crop' },
  { name: 'Israel', countryCode: 'IL', country: 'Israel', lat: 31.0461, lng: 34.8516, imageUrl: 'https://images.unsplash.com/photo-1552423314-cf29ab68ad73?w=400&h=300&fit=crop' },
  { name: 'Tel Aviv', countryCode: 'IL', country: 'Israel', lat: 32.0853, lng: 34.7818, imageUrl: 'https://images.unsplash.com/photo-1544967082-d9d25d867d66?w=400&h=300&fit=crop' },
  { name: 'Jerusalem', countryCode: 'IL', country: 'Israel', lat: 31.7683, lng: 35.2137, imageUrl: 'https://images.unsplash.com/photo-1552423314-cf29ab68ad73?w=400&h=300&fit=crop' },
  { name: 'Jordan', countryCode: 'JO', country: 'Jordan', lat: 30.5852, lng: 36.2384, imageUrl: 'https://images.unsplash.com/photo-1548786811-dd6e453ccca7?w=400&h=300&fit=crop' },
  { name: 'Egypt', countryCode: 'EG', country: 'Egypt', lat: 26.8206, lng: 30.8025, imageUrl: 'https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?w=400&h=300&fit=crop' },
  { name: 'Morocco', countryCode: 'MA', country: 'Morocco', lat: 31.7917, lng: -7.0926, imageUrl: 'https://images.unsplash.com/photo-1539020140153-e479b8c22e70?w=400&h=300&fit=crop' },
  { name: 'Marrakech', countryCode: 'MA', country: 'Morocco', lat: 31.6295, lng: -7.9811, imageUrl: 'https://images.unsplash.com/photo-1539020140153-e479b8c22e70?w=400&h=300&fit=crop' },

  // United States
  { name: 'New York', countryCode: 'US', country: 'United States', lat: 40.7128, lng: -74.0060, imageUrl: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400&h=300&fit=crop', popular: true },
  { name: 'Los Angeles', countryCode: 'US', country: 'United States', lat: 34.0522, lng: -118.2437, imageUrl: 'https://images.unsplash.com/photo-1515896769750-31548aa180ed?w=400&h=300&fit=crop' },
  { name: 'Miami', countryCode: 'US', country: 'United States', lat: 25.7617, lng: -80.1918, imageUrl: 'https://images.unsplash.com/photo-1535498730771-e735b998cd64?w=400&h=300&fit=crop', popular: true },
  { name: 'Las Vegas', countryCode: 'US', country: 'United States', lat: 36.1699, lng: -115.1398, imageUrl: 'https://images.unsplash.com/photo-1605833556294-ea5c7a74f57d?w=400&h=300&fit=crop' },
  { name: 'San Francisco', countryCode: 'US', country: 'United States', lat: 37.7749, lng: -122.4194, imageUrl: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=400&h=300&fit=crop' },
  { name: 'Hawaii', countryCode: 'US', country: 'United States', lat: 19.8968, lng: -155.5828, imageUrl: 'https://images.unsplash.com/photo-1542259009477-d625272157b7?w=400&h=300&fit=crop', popular: true },
  { name: 'Maui', countryCode: 'US', country: 'United States', lat: 20.7984, lng: -156.3319, region: 'Hawaii', imageUrl: 'https://images.unsplash.com/photo-1542259009477-d625272157b7?w=400&h=300&fit=crop' },
  { name: 'Honolulu', countryCode: 'US', country: 'United States', lat: 21.3069, lng: -157.8583, region: 'Hawaii', imageUrl: 'https://images.unsplash.com/photo-1507876466758-bc54f384809c?w=400&h=300&fit=crop' },

  // South America
  { name: 'Brazil', countryCode: 'BR', country: 'Brazil', lat: -14.2350, lng: -51.9253, imageUrl: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=400&h=300&fit=crop' },
  { name: 'Rio de Janeiro', countryCode: 'BR', country: 'Brazil', lat: -22.9068, lng: -43.1729, imageUrl: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=400&h=300&fit=crop' },
  { name: 'Argentina', countryCode: 'AR', country: 'Argentina', lat: -38.4161, lng: -63.6167, imageUrl: 'https://images.unsplash.com/photo-1612294037637-ec328d0e075e?w=400&h=300&fit=crop' },
  { name: 'Buenos Aires', countryCode: 'AR', country: 'Argentina', lat: -34.6037, lng: -58.3816, imageUrl: 'https://images.unsplash.com/photo-1612294037637-ec328d0e075e?w=400&h=300&fit=crop' },
  { name: 'Peru', countryCode: 'PE', country: 'Peru', lat: -9.1900, lng: -75.0152, imageUrl: 'https://images.unsplash.com/photo-1526392060635-9d6019884377?w=400&h=300&fit=crop' },
  { name: 'Machu Picchu', countryCode: 'PE', country: 'Peru', lat: -13.1631, lng: -72.5450, imageUrl: 'https://images.unsplash.com/photo-1526392060635-9d6019884377?w=400&h=300&fit=crop' },
  { name: 'Colombia', countryCode: 'CO', country: 'Colombia', lat: 4.5709, lng: -74.2973, imageUrl: 'https://images.unsplash.com/photo-1568632234157-ce7aecd03d0d?w=400&h=300&fit=crop' },
  { name: 'Chile', countryCode: 'CL', country: 'Chile', lat: -35.6751, lng: -71.5430, imageUrl: 'https://images.unsplash.com/photo-1478827387698-1527781a4887?w=400&h=300&fit=crop' },

  // Africa
  { name: 'South Africa', countryCode: 'ZA', country: 'South Africa', lat: -30.5595, lng: 22.9375, imageUrl: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=400&h=300&fit=crop' },
  { name: 'Cape Town', countryCode: 'ZA', country: 'South Africa', lat: -33.9249, lng: 18.4241, imageUrl: 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=400&h=300&fit=crop' },
  { name: 'Kenya', countryCode: 'KE', country: 'Kenya', lat: -0.0236, lng: 37.9062, imageUrl: 'https://images.unsplash.com/photo-1489392191049-fc10c97e64b6?w=400&h=300&fit=crop' },
  { name: 'Tanzania', countryCode: 'TZ', country: 'Tanzania', lat: -6.3690, lng: 34.8888, imageUrl: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=400&h=300&fit=crop' },
  { name: 'Zanzibar', countryCode: 'TZ', country: 'Tanzania', lat: -6.1659, lng: 39.2026, imageUrl: 'https://images.unsplash.com/photo-1547974996-050bf23b6196?w=400&h=300&fit=crop' },

  // Oceania
  { name: 'Australia', countryCode: 'AU', country: 'Australia', lat: -25.2744, lng: 133.7751, imageUrl: 'https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=400&h=300&fit=crop' },
  { name: 'Sydney', countryCode: 'AU', country: 'Australia', lat: -33.8688, lng: 151.2093, imageUrl: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=400&h=300&fit=crop' },
  { name: 'Melbourne', countryCode: 'AU', country: 'Australia', lat: -37.8136, lng: 144.9631, imageUrl: 'https://images.unsplash.com/photo-1545044846-351ba102b6d5?w=400&h=300&fit=crop' },
  { name: 'New Zealand', countryCode: 'NZ', country: 'New Zealand', lat: -40.9006, lng: 174.8860, imageUrl: 'https://images.unsplash.com/photo-1469521669194-babb45599def?w=400&h=300&fit=crop' },
  { name: 'Fiji', countryCode: 'FJ', country: 'Fiji', lat: -17.7134, lng: 178.0650, imageUrl: 'https://images.unsplash.com/photo-1548574505-5e239809ee19?w=400&h=300&fit=crop' },
  { name: 'French Polynesia', countryCode: 'PF', country: 'French Polynesia', lat: -17.6797, lng: -149.4068, imageUrl: 'https://images.unsplash.com/photo-1516815231560-8f41ec531527?w=400&h=300&fit=crop' },
  { name: 'Bora Bora', countryCode: 'PF', country: 'French Polynesia', lat: -16.5004, lng: -151.7415, imageUrl: 'https://images.unsplash.com/photo-1516815231560-8f41ec531527?w=400&h=300&fit=crop' },
];

// Search destinations
export function searchDestinations(query: string, limit: number = 15): DestinationData[] {
  if (!query || query.length < 2) return [];

  const normalizedQuery = query.toLowerCase().trim();

  const scored = DESTINATIONS.map((dest) => {
    let score = 0;

    // Exact name match
    if (dest.name.toLowerCase() === normalizedQuery) {
      score = 1000;
    }
    // Name starts with query
    else if (dest.name.toLowerCase().startsWith(normalizedQuery)) {
      score = 500;
    }
    // Name contains query
    else if (dest.name.toLowerCase().includes(normalizedQuery)) {
      score = 200;
    }
    // Country contains query
    else if (dest.country.toLowerCase().includes(normalizedQuery)) {
      score = 100;
    }
    // Country code matches
    else if (dest.countryCode.toLowerCase() === normalizedQuery) {
      score = 80;
    }
    // Region contains query
    else if (dest.region?.toLowerCase().includes(normalizedQuery)) {
      score = 50;
    }

    // Boost popular destinations
    if (dest.popular && score > 0) {
      score += 100;
    }

    return { dest, score };
  });

  return scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.dest);
}

// Get popular destinations
export function getPopularDestinations(): DestinationData[] {
  return DESTINATIONS.filter((d) => d.popular);
}

// Get destination by name
export function getDestinationByName(name: string): DestinationData | undefined {
  return DESTINATIONS.find((d) => d.name.toLowerCase() === name.toLowerCase());
}
