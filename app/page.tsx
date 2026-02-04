import type { Metadata } from 'next';
import HomeContent from '@/components/home/HomeContent';

export const metadata: Metadata = {
  title: 'r/oam - Reddit-Powered Travel Planner | Plan Your Dream Vacation',
  description:
    'Plan your dream vacation with real traveler recommendations from Reddit. No fake reviews, no sponsored content - just honest experiences from r/travel, r/solotravel, and travel communities worldwide.',
  keywords: [
    'travel planner',
    'reddit travel',
    'vacation planning',
    'trip planner',
    'travel recommendations',
    'solo travel',
    'budget travel',
    'travel itinerary',
  ],
  openGraph: {
    title: 'r/oam - Reddit-Powered Travel Planner',
    description:
      'Plan your trip based on what REAL travelers say. No fake reviews, just honest Reddit recommendations from travel communities worldwide.',
    url: '/',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'r/oam - Plan your trip with real Reddit recommendations',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'r/oam - Reddit-Powered Travel Planner',
    description:
      'Plan your trip based on what REAL travelers say. Powered by Reddit.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: '/',
  },
};

export default function HomePage() {
  return <HomeContent />;
}
