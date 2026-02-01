import type { Metadata } from 'next';
import PlanLayoutClient from '@/components/layout/PlanLayoutClient';

export const metadata: Metadata = {
  title: 'Plan Your Trip | r/oam',
  description: 'Create your personalized vacation itinerary with real Reddit traveler recommendations.',
};

export default function PlanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PlanLayoutClient>{children}</PlanLayoutClient>;
}
