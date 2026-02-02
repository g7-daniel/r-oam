import type { Metadata } from 'next';
import '@/styles/globals.css';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastProvider } from '@/components/ui/Toast';

export const metadata: Metadata = {
  title: 'r/oam - Reddit-Powered Travel Planner',
  description:
    'Plan your dream vacation with real traveler recommendations from Reddit. No fake reviews, just honest experiences from r/travel, r/solotravel, and more.',
  keywords: ['travel', 'vacation', 'planner', 'reddit', 'flights', 'hotels', 'itinerary', 'roam'],
  openGraph: {
    title: 'r/oam - Reddit-Powered Travel Planner',
    description:
      'Plan your trip based on what REAL travelers say. Powered by Reddit.',
    type: 'website',
    siteName: 'r/oam',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'r/oam - Reddit-Powered Travel Planner',
    description: 'Plan your trip based on what REAL travelers say. Powered by Reddit.',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/apple-icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-300">
        <ThemeProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
