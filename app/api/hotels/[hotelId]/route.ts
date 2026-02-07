import { NextRequest, NextResponse } from 'next/server';
import { getHotelSentiment } from '@/lib/reddit';
import type { HotelDetail, RoomType, RedditComment } from '@/types';

// Mock room types for hotels
const MOCK_ROOM_TYPES: RoomType[] = [
  {
    id: 'standard',
    name: 'Standard Room',
    description: 'Comfortable room with essential amenities',
    bedType: '1 Queen Bed',
    maxOccupancy: 2,
    pricePerNight: 0, // Will be set dynamically
    totalPrice: 0,
    currency: 'USD',
    amenities: ['Free WiFi', 'Air Conditioning', 'Flat Screen TV'],
    available: true,
  },
  {
    id: 'deluxe',
    name: 'Deluxe Room',
    description: 'Spacious room with city views and upgraded amenities',
    bedType: '1 King Bed',
    maxOccupancy: 2,
    pricePerNight: 0,
    totalPrice: 0,
    currency: 'USD',
    amenities: ['Free WiFi', 'Air Conditioning', 'Flat Screen TV', 'Mini Bar', 'Room Service'],
    available: true,
  },
  {
    id: 'suite',
    name: 'Junior Suite',
    description: 'Luxurious suite with separate living area',
    bedType: '1 King Bed + Sofa Bed',
    maxOccupancy: 4,
    pricePerNight: 0,
    totalPrice: 0,
    currency: 'USD',
    amenities: ['Free WiFi', 'Air Conditioning', 'Flat Screen TV', 'Mini Bar', 'Room Service', 'Jacuzzi'],
    available: true,
  },
];

// Generate mock gallery images
const GALLERY_IMAGES = [
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
  'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800',
  'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800',
  'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800',
  'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800',
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hotelId: string }> }
) {
  try {
    const { hotelId } = await params;

    // Validate hotelId - should be alphanumeric/underscore/dash only
    if (!hotelId || hotelId.length > 200 || !/^[a-zA-Z0-9_-]+$/.test(hotelId)) {
      return NextResponse.json(
        { error: 'Invalid hotel ID format' },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;

    const hotelName = searchParams.get('name') || 'Hotel';
    const city = searchParams.get('city') || '';
    const basePrice = parseFloat(searchParams.get('basePrice') || '150');
    const nights = parseInt(searchParams.get('nights') || '3', 10);
    const stars = parseInt(searchParams.get('stars') || '4', 10);

    // Validate numeric params
    if (isNaN(basePrice) || basePrice < 0 || basePrice > 100000) {
      return NextResponse.json({ error: 'Invalid basePrice parameter' }, { status: 400 });
    }
    if (isNaN(nights) || nights < 1 || nights > 365) {
      return NextResponse.json({ error: 'Invalid nights parameter' }, { status: 400 });
    }
    if (isNaN(stars) || stars < 1 || stars > 5) {
      return NextResponse.json({ error: 'Invalid stars parameter' }, { status: 400 });
    }
    const amenities = searchParams.get('amenities')?.split(',') || [];

    // Fetch Reddit sentiment for this hotel
    let redditComments: RedditComment[] = [];
    let isRedditRecommended = false;
    let redditMentionCount = 0;

    try {
      const sentiment = await getHotelSentiment(hotelName, city);
      redditComments = sentiment.topComments;
      isRedditRecommended = sentiment.score > 0.2 && sentiment.mentionCount > 0;
      redditMentionCount = sentiment.mentionCount;
    } catch (error) {
    }

    // Generate room types with pricing
    const roomTypes = MOCK_ROOM_TYPES.map((room, index) => {
      const multiplier = 1 + (index * 0.4); // Standard: 1x, Deluxe: 1.4x, Suite: 1.8x
      const pricePerNight = Math.round(basePrice * multiplier);
      return {
        ...room,
        pricePerNight,
        totalPrice: pricePerNight * nights,
        available: Math.random() > 0.2, // 80% availability
      };
    });

    const hotelDetail: HotelDetail = {
      id: hotelId,
      name: hotelName,
      address: searchParams.get('address') || '123 Main Street',
      city,
      stars,
      pricePerNight: basePrice,
      totalPrice: basePrice * nights,
      currency: 'USD',
      imageUrl: GALLERY_IMAGES[0],
      amenities,
      distanceToCenter: parseFloat(searchParams.get('distance') || '1.5'),
      latitude: parseFloat(searchParams.get('lat') || '0'),
      longitude: parseFloat(searchParams.get('lng') || '0'),
      roomTypes,
      gallery: GALLERY_IMAGES,
      redditComments,
      isRedditRecommended,
      redditMentionCount,
      fullDescription: `Experience exceptional comfort at ${hotelName}. Our ${stars}-star property offers modern amenities, prime location, and outstanding service. Perfect for both business and leisure travelers.`,
      policies: {
        checkIn: '3:00 PM',
        checkOut: '11:00 AM',
        cancellation: 'Free cancellation up to 24 hours before check-in',
      },
    };

    return NextResponse.json(hotelDetail);
  } catch (error) {
    console.error('Hotel detail API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hotel details' },
      { status: 500 }
    );
  }
}
