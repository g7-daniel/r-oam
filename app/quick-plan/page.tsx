import type { Metadata } from 'next';
import QuickPlanPageContent from '@/components/quick-plan/QuickPlanPageContent';

export const metadata: Metadata = {
  title: 'Quick Plan - AI-Powered Trip Planning',
  description:
    'Plan your trip in minutes with AI assistance. Get personalized travel recommendations, itineraries, and tips based on real Reddit discussions and traveler experiences.',
  keywords: [
    'AI trip planner',
    'quick travel planning',
    'instant itinerary',
    'AI travel assistant',
    'personalized travel',
    'trip recommendations',
  ],
  openGraph: {
    title: 'Quick Plan - AI-Powered Trip Planning | r/oam',
    description:
      'Plan your trip in minutes with AI. Get personalized recommendations based on real traveler experiences from Reddit.',
    url: '/quick-plan',
    images: [
      {
        url: '/og-quick-plan.png',
        width: 1200,
        height: 630,
        alt: 'r/oam Quick Plan - AI-Powered Trip Planning',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Quick Plan - AI-Powered Trip Planning | r/oam',
    description:
      'Plan your trip in minutes with AI. Get personalized recommendations from real Reddit travelers.',
    images: ['/og-quick-plan.png'],
  },
  alternates: {
    canonical: '/quick-plan',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function QuickPlanPage() {
  return <QuickPlanPageContent />;
}
