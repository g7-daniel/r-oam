# r/oam - Reddit-Powered Travel Planner

A travel planning webapp built with Next.js 14. Plan your dream trip based on **real traveler recommendations from Reddit** - no fake reviews, no sponsored content.

## Why r/oam?

The name is a play on "r/" (Reddit's subreddit prefix) and "roam" (to travel). Every recommendation comes from real discussions on r/travel, r/solotravel, r/fattravel, r/chubbytravel, and destination-specific subreddits.

## Features

- **Reddit-First Recommendations**: Every place is backed by real upvotes and traveler quotes
- **Subreddit Selection**: Choose which communities to source recommendations from (r/fattravel for luxury, r/shoestring for budget, etc.)
- **Ask Snoo**: AI assistant that searches Reddit for personalized recommendations
- **Smart Itinerary Builder**: Drag-and-drop day planner with travel time calculations
- **Restaurant Reservations**: Book tables directly from your itinerary
- **Real-time Flight Search**: Powered by Amadeus API with airline sentiment
- **Hotel Discovery**: Find accommodations with reviews and map view

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **AI**: Groq (Llama) + Google Gemini fallback
- **APIs**: Reddit, Google Maps/Places, Amadeus (flights/hotels)
- **Icons**: Lucide React
- **Dates**: date-fns

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Get API Keys

You'll need API keys from these services:

#### Groq (AI - Free tier)
1. Sign up at [console.groq.com](https://console.groq.com)
2. Create an API key

#### Google Gemini (AI Fallback - Free tier)
1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Create an API key

#### Reddit (Optional - works without auth for public data)
1. Go to [reddit.com/prefs/apps](https://www.reddit.com/prefs/apps)
2. Click "create another app"
3. Select "script" type

#### Google Maps Platform
1. Go to [Google Cloud Console](https://console.cloud.google.com/google/maps-apis)
2. Enable: Places API, Directions API, Maps JavaScript API
3. Create an API key
4. Free tier: $200/month credit

#### Amadeus (Flights & Hotels)
1. Sign up at [developers.amadeus.com/register](https://developers.amadeus.com/register)
2. Create a new app
3. Free tier: 2000 calls/month

### 3. Configure Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
GROQ_API_KEY=your_groq_api_key
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
AMADEUS_CLIENT_ID=your_amadeus_client_id
AMADEUS_CLIENT_SECRET=your_amadeus_client_secret
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
roam-app/
├── app/                      # Next.js App Router
│   ├── page.tsx             # Landing page
│   ├── plan/                # Trip planning
│   │   ├── [tripId]/        # Builder view
│   │   └── start/           # New trip wizard
│   └── api/                 # API routes
│       ├── ai/              # AI discovery endpoint
│       ├── recommendations/ # Reddit-based recommendations
│       ├── places/          # Google Places
│       ├── flights/         # Amadeus flights
│       └── hotels/          # Amadeus hotels
├── components/
│   ├── builder/             # Itinerary builder components
│   ├── journey/             # Trip setup wizard
│   └── ui/                  # Reusable UI components
├── lib/
│   ├── reddit.ts            # Reddit API client
│   ├── google-maps.ts       # Google Maps/Places
│   ├── data/                # Subreddit mappings, etc.
│   └── utils/               # Helpers
├── stores/
│   └── tripStoreV2.ts       # Zustand state management
└── styles/
    └── globals.css          # Global styles + Tailwind
```

## Subreddit Sources

Destinations are mapped to relevant subreddits:

- **Santa Teresa, Costa Rica**: r/costarica, r/surfing, r/digitalnomad
- **Tokyo, Japan**: r/JapanTravel, r/japanlife, r/foodie
- **Paris, France**: r/paris, r/france, r/travel
- etc.

Global subreddits always included:
- **r/fattravel** (luxury travel - gold badge)
- **r/chubbytravel** (upper-mid travel - green badge)

## Deployment

```bash
npm run build
vercel deploy
```

Add environment variables in Vercel dashboard.

## License

MIT
