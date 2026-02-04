import type { Metadata, ResolvingMetadata } from 'next';
import TripPageContent from '@/components/plan/TripPageContent';

type Props = {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { tripId } = await params;

  // Format the trip ID for display (remove hyphens, capitalize)
  const formattedTripId = tripId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Get parent metadata for fallback images
  const previousImages = (await parent).openGraph?.images || [];

  return {
    title: `Trip Planner - ${formattedTripId}`,
    description: `Plan and customize your trip itinerary. Add destinations, hotels, restaurants, and experiences based on real traveler recommendations from Reddit.`,
    keywords: [
      'trip itinerary',
      'travel planning',
      'vacation planner',
      'trip builder',
      'destination planning',
      'travel schedule',
    ],
    openGraph: {
      title: `Trip Planner - ${formattedTripId} | r/oam`,
      description: `Build your perfect trip itinerary with real recommendations from Reddit travelers.`,
      url: `/plan/${tripId}`,
      images: [
        {
          url: '/og-trip-planner.png',
          width: 1200,
          height: 630,
          alt: `r/oam Trip Planner - ${formattedTripId}`,
        },
        ...previousImages,
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `Trip Planner - ${formattedTripId} | r/oam`,
      description: `Build your perfect trip itinerary with real recommendations from Reddit.`,
      images: ['/og-trip-planner.png'],
    },
    alternates: {
      canonical: `/plan/${tripId}`,
    },
    robots: {
      index: false, // Don't index individual trip pages (they're user-specific)
      follow: true,
    },
  };
}

export default function TripPage() {
  return <TripPageContent />;
}
