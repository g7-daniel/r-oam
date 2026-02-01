'use client';

import { useState, useEffect, useMemo } from 'react';
import { Waves, Building, Utensils, Moon, Mountain, Gem, Trees, ShoppingBag, Landmark, Heart, Clock, Plus, Check, Sparkles } from 'lucide-react';
import { useTripStore } from '@/stores/tripStore';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import SentimentBadge from '@/components/shared/SentimentBadge';
import PriceTag from '@/components/shared/PriceTag';
import { LegSelector } from '@/components/legs';
import type { Experience, ExperienceCategory } from '@/types';
import clsx from 'clsx';

const categories: {
  id: ExperienceCategory;
  label: string;
  icon: React.ReactNode;
}[] = [
  { id: 'beaches', label: 'Beaches', icon: <Waves className="w-5 h-5" /> },
  { id: 'museums', label: 'Museums', icon: <Building className="w-5 h-5" /> },
  { id: 'food_tours', label: 'Food Tours', icon: <Utensils className="w-5 h-5" /> },
  { id: 'nightlife', label: 'Nightlife', icon: <Moon className="w-5 h-5" /> },
  { id: 'day_trips', label: 'Day Trips', icon: <Mountain className="w-5 h-5" /> },
  { id: 'hidden_gems', label: 'Hidden Gems', icon: <Gem className="w-5 h-5" /> },
  { id: 'outdoor', label: 'Outdoor', icon: <Trees className="w-5 h-5" /> },
  { id: 'shopping', label: 'Shopping', icon: <ShoppingBag className="w-5 h-5" /> },
  { id: 'cultural', label: 'Cultural', icon: <Landmark className="w-5 h-5" /> },
  { id: 'wellness', label: 'Wellness', icon: <Heart className="w-5 h-5" /> },
];

export default function Step8Experiences() {
  const {
    legs,
    activeLegId,
    budget,
    tripType,
    getChatSession,
    addLegExperience,
    removeLegExperience,
    getActiveLeg,
  } = useTripStore();

  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<ExperienceCategory | null>(null);

  const activeLeg = getActiveLeg();
  const destination = activeLeg?.destination;

  // Get AI suggestions from chat session
  const experienceChatSession = activeLeg ? getChatSession(activeLeg.id, 'experiences') : undefined;
  const aiSuggestions = experienceChatSession?.selectedSuggestions || [];

  const experiencesBudget = Math.round((budget.allocation.experiences / 100) * budget.total);
  const spentOnExperiences = activeLeg?.experiences.reduce((sum, exp) => sum + exp.price, 0) || 0;
  const remainingExperiencesBudget = experiencesBudget - spentOnExperiences;

  useEffect(() => {
    const fetchExperiences = async () => {
      if (!destination) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const params = new URLSearchParams({
          destination: destination.name,
          tripType,
          budget: experiencesBudget.toString(),
        });

        if (selectedCategory) {
          params.append('category', selectedCategory);
        }

        const response = await fetch(`/api/places?${params}`);

        if (!response.ok) {
          throw new Error('Failed to fetch experiences');
        }

        const data = await response.json();
        setExperiences(data);
      } catch (err) {
        console.error('Experience fetch error:', err);
        setExperiences(getMockExperiences());
      } finally {
        setLoading(false);
      }
    };

    fetchExperiences();
  }, [destination, tripType, experiencesBudget, selectedCategory, activeLegId]);

  const getMockExperiences = (): Experience[] => {
    const destinationName = destination?.name || 'Paris';
    const baseExperiences: Experience[] = [
      {
        id: '1',
        name: `${destinationName} Walking Tour`,
        category: 'cultural',
        description: `Explore the best of ${destinationName} with a knowledgeable local guide.`,
        imageUrl: 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=800',
        price: 45,
        currency: 'USD',
        duration: '3 hours',
        rating: 4.8,
        reviewCount: 2456,
        address: `City Center, ${destinationName}`,
        latitude: 48.8584,
        longitude: 2.2945,
        sentiment: {
          score: 0.9,
          label: 'positive',
          mentionCount: 1234,
          topComments: [
            { text: 'The guide was amazing and knew all the hidden spots!', subreddit: 'travel', score: 567, date: '2024-01-15' },
          ],
          subreddits: ['travel'],
        },
        tips: ['Wear comfortable shoes', 'Bring water'],
      },
      {
        id: '2',
        name: 'Local Food & Wine Tour',
        category: 'food_tours',
        description: `Taste the authentic flavors of ${destinationName} with tastings at local spots.`,
        imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800',
        price: 85,
        currency: 'USD',
        duration: '4 hours',
        rating: 4.9,
        reviewCount: 892,
        address: `Food District, ${destinationName}`,
        latitude: 48.8867,
        longitude: 2.3431,
        sentiment: {
          score: 0.85,
          label: 'positive',
          mentionCount: 456,
          topComments: [
            { text: 'Come hungry! The portions are generous.', subreddit: 'foodtravel', score: 234, date: '2024-01-20' },
          ],
          subreddits: ['travel', 'foodtravel'],
        },
        tips: ['Come hungry!', 'Ask about dietary restrictions'],
      },
      {
        id: '3',
        name: 'Museum & Art Tour',
        category: 'museums',
        description: `Discover world-class art and history at ${destinationName}'s top museums.`,
        imageUrl: 'https://images.unsplash.com/photo-1499426600726-ac36dc1c812e?w=800',
        price: 55,
        currency: 'USD',
        duration: '3 hours',
        rating: 4.7,
        reviewCount: 3210,
        address: `Museum District, ${destinationName}`,
        latitude: 48.8606,
        longitude: 2.3376,
        sentiment: {
          score: 0.75,
          label: 'positive',
          mentionCount: 2100,
          topComments: [
            { text: 'A guide makes all the difference here', subreddit: 'travel', score: 890, date: '2024-01-25' },
          ],
          subreddits: ['travel', 'museums'],
        },
        tips: ['Book early morning to avoid crowds'],
      },
      {
        id: '4',
        name: 'Sunset Dinner Experience',
        category: 'nightlife',
        description: `Romantic evening with gourmet dinner and stunning views.`,
        imageUrl: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=800',
        price: 120,
        currency: 'USD',
        duration: '3 hours',
        rating: 4.6,
        reviewCount: 1567,
        address: `Scenic Point, ${destinationName}`,
        latitude: 48.8590,
        longitude: 2.2922,
        sentiment: {
          score: 0.7,
          label: 'positive',
          mentionCount: 678,
          topComments: [
            { text: 'Perfect for a special occasion!', subreddit: 'travel', score: 345, date: '2024-02-01' },
          ],
          subreddits: ['travel'],
        },
        tips: ['Request a window seat', 'Dress smart casual'],
      },
      {
        id: '5',
        name: 'Day Trip Adventure',
        category: 'day_trips',
        description: `Full-day excursion to nearby attractions and scenic spots.`,
        imageUrl: 'https://images.unsplash.com/photo-1551410224-699683e15636?w=800',
        price: 95,
        currency: 'USD',
        duration: '8 hours',
        rating: 4.8,
        reviewCount: 4521,
        address: `Pickup from hotel`,
        latitude: 48.8048,
        longitude: 2.1203,
        sentiment: {
          score: 0.88,
          label: 'positive',
          mentionCount: 3456,
          topComments: [
            { text: 'Worth every minute! Pack snacks.', subreddit: 'travel', score: 1234, date: '2024-01-10' },
          ],
          subreddits: ['travel'],
        },
        tips: ['Bring comfortable shoes', 'Pack snacks'],
      },
      {
        id: '6',
        name: 'Local Hidden Gems Tour',
        category: 'hidden_gems',
        description: `Discover secret spots locals love but tourists miss.`,
        imageUrl: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800',
        price: 65,
        currency: 'USD',
        duration: '3 hours',
        rating: 4.9,
        reviewCount: 234,
        address: `Meeting point TBA`,
        latitude: 48.8566,
        longitude: 2.3612,
        sentiment: {
          score: 0.92,
          label: 'positive',
          mentionCount: 123,
          topComments: [
            { text: 'Best tour we took! So authentic.', subreddit: 'travel', score: 89, date: '2024-02-05' },
          ],
          subreddits: ['travel'],
        },
        tips: ['Be ready for walking', 'Locations kept secret until tour'],
      },
    ];

    if (selectedCategory) {
      return baseExperiences.filter((exp) => exp.category === selectedCategory);
    }
    return baseExperiences;
  };

  const isSelected = (experienceId: string) =>
    activeLeg?.experiences.some((e) => e.id === experienceId) || false;

  const handleToggleExperience = (experience: Experience) => {
    if (!activeLegId) return;

    if (isSelected(experience.id)) {
      removeLegExperience(activeLegId, experience.id);
    } else if (experience.price <= remainingExperiencesBudget) {
      addLegExperience(activeLegId, experience);
    }
  };

  const getCategoryIcon = (category: ExperienceCategory) => {
    const cat = categories.find((c) => c.id === category);
    return cat?.icon || <Landmark className="w-4 h-4" />;
  };

  // Sort: AI suggested first
  const sortedExperiences = useMemo(() => {
    const aiSuggestedNames = new Set(aiSuggestions.map((s) => s.name.toLowerCase()));
    return [...experiences].sort((a, b) => {
      const aIsSuggested = aiSuggestedNames.has(a.name.toLowerCase());
      const bIsSuggested = aiSuggestedNames.has(b.name.toLowerCase());
      if (aIsSuggested && !bIsSuggested) return -1;
      if (!aIsSuggested && bIsSuggested) return 1;
      return 0;
    });
  }, [experiences, aiSuggestions]);

  if (legs.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Please add destinations first</p>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="section-title mb-2">Add Experiences</h1>
        <p className="section-subtitle">
          Curated activities for your {tripType} trip to {destination?.name}
        </p>
      </div>

      {/* Leg Selector */}
      {legs.length > 1 && (
        <div className="flex justify-center mb-6">
          <LegSelector showProgress progressType="experiences" />
        </div>
      )}

      {/* Budget tracker */}
      <Card className="mb-6 bg-primary-50">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-gray-600">Experience Budget</span>
            <p className="font-bold text-lg">${experiencesBudget.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <span className="text-sm text-gray-600">Spent</span>
            <p className="font-bold text-lg text-secondary-600">
              ${spentOnExperiences.toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <span className="text-sm text-gray-600">Remaining</span>
            <p className="font-bold text-lg text-primary-600">
              ${remainingExperiencesBudget.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="mt-3 h-2 bg-white rounded-full overflow-hidden">
          <div
            className="h-full bg-secondary-500 transition-all duration-300"
            style={{
              width: `${Math.min(100, (spentOnExperiences / experiencesBudget) * 100)}%`,
            }}
          />
        </div>
      </Card>

      {/* AI Suggestions Banner */}
      {aiSuggestions.length > 0 && (
        <Card className="mb-6 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-700">AI Suggested for You</h3>
              <p className="text-sm text-slate-500 mb-2">
                Based on your preferences from our chat
              </p>
              <div className="flex flex-wrap gap-2">
                {aiSuggestions.map((suggestion) => (
                  <span
                    key={suggestion.id}
                    className="px-3 py-1 bg-white border border-orange-200 rounded-full text-sm text-orange-700"
                  >
                    {suggestion.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Selected experiences for this leg */}
      {activeLeg && activeLeg.experiences.length > 0 && (
        <Card className="mb-6">
          <h3 className="font-semibold mb-3">
            Selected for {activeLeg.destination.name} ({activeLeg.experiences.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {activeLeg.experiences.map((exp) => (
              <div
                key={exp.id}
                className="flex items-center gap-2 px-3 py-2 bg-primary-100 rounded-lg"
              >
                <span className="text-sm font-medium">{exp.name}</span>
                <span className="text-sm text-primary-600">${exp.price}</span>
                <button
                  onClick={() => removeLegExperience(activeLegId!, exp.id)}
                  className="text-gray-400 hover:text-red-500"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Category filters */}
      <div className="mb-6 overflow-x-auto pb-2">
        <div className="flex gap-2 min-w-max">
          <button
            onClick={() => setSelectedCategory(null)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors',
              selectedCategory === null
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap',
                selectedCategory === cat.id
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {cat.icon}
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <Gem className="w-12 h-12 text-primary-500 animate-bounce mb-4" />
          <p className="text-gray-600">Finding amazing experiences...</p>
        </div>
      )}

      {/* Experiences grid */}
      {!loading && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedExperiences.map((experience) => {
            const selected = isSelected(experience.id);
            const canAfford = experience.price <= remainingExperiencesBudget || selected;
            const isAISuggested = aiSuggestions.some(
              (s) => s.name.toLowerCase() === experience.name.toLowerCase()
            );

            return (
              <Card
                key={experience.id}
                variant={selected ? 'selected' : 'default'}
                padding="none"
                className={clsx(
                  'overflow-hidden transition-all',
                  !canAfford && !selected && 'opacity-50',
                  isAISuggested && !selected && 'ring-2 ring-orange-300'
                )}
              >
                {/* Image */}
                <div className="relative aspect-video">
                  <img
                    src={experience.imageUrl}
                    alt={experience.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 flex gap-2">
                    <div className="flex items-center gap-1 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium">
                      {getCategoryIcon(experience.category)}
                      <span className="capitalize">
                        {experience.category.replace('_', ' ')}
                      </span>
                    </div>
                    {isAISuggested && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-orange-500 text-white rounded-full text-xs font-medium">
                        <Sparkles className="w-3 h-3" />
                        AI Pick
                      </div>
                    )}
                  </div>
                  <div className="absolute top-3 right-3">
                    <PriceTag price={experience.price} size="sm" className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1" />
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-2">{experience.name}</h3>

                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {experience.duration}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-500">&#9733;</span>
                      {experience.rating} ({experience.reviewCount})
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {experience.description}
                  </p>

                  {/* Sentiment */}
                  {experience.sentiment && (
                    <SentimentBadge sentiment={experience.sentiment} size="sm" className="mb-3" />
                  )}

                  {/* Tips */}
                  {experience.tips && experience.tips.length > 0 && (
                    <div className="p-3 bg-amber-50 rounded-lg mb-3">
                      <div className="text-xs font-medium text-amber-700 mb-1">
                        Reddit Tips:
                      </div>
                      <p className="text-xs text-amber-600">{experience.tips[0]}</p>
                    </div>
                  )}

                  {/* Add button */}
                  <Button
                    variant={selected ? 'secondary' : 'primary'}
                    size="sm"
                    className="w-full"
                    onClick={() => handleToggleExperience(experience)}
                    disabled={!canAfford && !selected}
                  >
                    {selected ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Added
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        {canAfford ? 'Add to Trip' : 'Over Budget'}
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            );
          })}

          {sortedExperiences.length === 0 && !loading && (
            <div className="col-span-full text-center py-16 text-gray-500">
              <Gem className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No experiences found for this category</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
