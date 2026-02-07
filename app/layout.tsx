import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastProvider } from '@/components/ui/Toast';
import { clientEnv } from '@/lib/env';

const siteUrl = clientEnv.SITE_URL;

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover', // Required for safe-area-inset-* env() values to work on iOS notched devices
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'r/oam - Reddit-Powered Travel Planner',
    template: '%s | r/oam',
  },
  description:
    'Plan your dream vacation with real traveler recommendations from Reddit. No fake reviews, just honest experiences from r/travel, r/solotravel, and more.',
  keywords: [
    'travel planner',
    'vacation planning',
    'reddit travel',
    'trip itinerary',
    'flights',
    'hotels',
    'roam',
    'travel recommendations',
    'solo travel',
    'travel tips',
  ],
  authors: [{ name: 'r/oam Team' }],
  creator: 'r/oam',
  publisher: 'r/oam',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'r/oam',
    title: 'r/oam - Reddit-Powered Travel Planner',
    description:
      'Plan your trip based on what REAL travelers say. No fake reviews, no sponsored content - just honest recommendations powered by Reddit.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'r/oam - Reddit-Powered Travel Planner',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'r/oam - Reddit-Powered Travel Planner',
    description:
      'Plan your trip based on what REAL travelers say. No fake reviews, just honest Reddit recommendations.',
    images: ['/og-image.png'],
    creator: '@roamtravel',
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.svg' },
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/manifest.json',
  alternates: {
    canonical: siteUrl,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Satisfy&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var pref = localStorage.getItem('roam-theme');
                  var isDark = pref === 'dark' || (pref !== 'light' && pref !== 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches) || (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                  }
                  // Set color-scheme for native browser controls (scrollbars, etc.)
                  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <ThemeProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
