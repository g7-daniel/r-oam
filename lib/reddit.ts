import type { SentimentData, RedditPost, RedditComment } from '@/types';

// Use Reddit's public JSON API (no authentication required)
const REDDIT_BASE_URL = 'https://www.reddit.com';

export function getSubredditsForBudget(budgetPerPerson: number): string[] {
  if (budgetPerPerson >= 5000) {
    return ['fattravel', 'luxurytravel', 'travel'];
  } else if (budgetPerPerson >= 2000) {
    return ['travel', 'solotravel', 'TravelHacks'];
  } else {
    return ['budgettravel', 'solotravel', 'shoestring', 'backpacking'];
  }
}

export async function searchReddit(
  query: string,
  subreddits: string[],
  limit = 25
): Promise<RedditPost[]> {
  try {
    const allPosts: RedditPost[] = [];

    for (const subreddit of subreddits.slice(0, 3)) {
      try {
        const response = await fetch(
          `${REDDIT_BASE_URL}/r/${subreddit}/search.json?q=${encodeURIComponent(
            query
          )}&sort=relevance&limit=${limit}&restrict_sr=true`,
          {
            headers: {
              'User-Agent': 'r-oam/1.0 (Reddit-Powered Travel Planner)',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          const posts = data.data?.children?.map((child: any) => ({
            id: child.data.id,
            title: child.data.title,
            selftext: child.data.selftext || '',
            subreddit: child.data.subreddit,
            score: child.data.score,
            numComments: child.data.num_comments,
            createdUtc: child.data.created_utc,
            permalink: child.data.permalink,
          })) || [];
          allPosts.push(...posts);
        }
      } catch (err) {
        console.warn(`Failed to fetch from r/${subreddit}:`, err);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return allPosts.sort((a, b) => b.score - a.score);
  } catch (error) {
    console.error('Reddit search error:', error);
    return [];
  }
}

export async function getPostComments(
  subreddit: string,
  postId: string,
  limit = 10
): Promise<RedditComment[]> {
  try {
    const response = await fetch(
      `${REDDIT_BASE_URL}/r/${subreddit}/comments/${postId}.json?limit=${limit}&depth=1`,
      {
        headers: {
          'User-Agent': 'r-oam/1.0 (Reddit-Powered Travel Planner)',
        },
      }
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    const comments: RedditComment[] = [];

    if (data[1]?.data?.children) {
      for (const child of data[1].data.children) {
        if (child.kind === 't1' && child.data.body) {
          comments.push({
            text: child.data.body.slice(0, 500),
            subreddit,
            score: child.data.score,
            date: new Date(child.data.created_utc * 1000).toISOString(),
          });
        }
      }
    }

    return comments.sort((a, b) => b.score - a.score);
  } catch (error) {
    console.error('Reddit comments error:', error);
    return [];
  }
}

export function analyzeSentiment(text: string): number {
  const positiveWords = [
    'amazing', 'beautiful', 'excellent', 'fantastic', 'great', 'incredible',
    'love', 'loved', 'perfect', 'recommend', 'stunning', 'wonderful', 'awesome',
    'best', 'friendly', 'clean', 'comfortable', 'delicious', 'helpful',
    'memorable', 'relaxing', 'scenic', 'worth', 'must-see', 'must-do',
  ];

  const negativeWords = [
    'awful', 'bad', 'disappointing', 'dirty', 'expensive', 'horrible',
    'overpriced', 'overcrowded', 'poor', 'rude', 'scam', 'terrible',
    'tourist trap', 'waste', 'worst', 'avoid', 'crowded', 'noisy',
    'smelly', 'unsafe', 'overrated', 'mediocre', 'skip',
  ];

  const lowerText = text.toLowerCase();
  let score = 0;
  let matches = 0;

  for (const word of positiveWords) {
    if (lowerText.includes(word)) {
      score += 1;
      matches++;
    }
  }

  for (const word of negativeWords) {
    if (lowerText.includes(word)) {
      score -= 1;
      matches++;
    }
  }

  if (matches === 0) return 0;
  return Math.max(-1, Math.min(1, score / matches));
}

export async function getDestinationSentiment(
  destination: string,
  budgetPerPerson: number
): Promise<SentimentData> {
  const subreddits = getSubredditsForBudget(budgetPerPerson);
  const posts = await searchReddit(destination, subreddits, 30);

  if (posts.length === 0) {
    return {
      score: 0,
      label: 'neutral',
      mentionCount: 0,
      topComments: [],
      subreddits,
    };
  }

  const allText = posts.map((p) => `${p.title} ${p.selftext}`).join(' ');
  const sentimentScore = analyzeSentiment(allText);

  const topPosts = posts.slice(0, 5);
  const topComments: RedditComment[] = [];

  for (const post of topPosts.slice(0, 2)) {
    const comments = await getPostComments(post.subreddit, post.id, 3);
    topComments.push(...comments);
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  topComments.sort((a, b) => b.score - a.score);

  return {
    score: sentimentScore,
    label: sentimentScore > 0.2 ? 'positive' : sentimentScore < -0.2 ? 'negative' : 'neutral',
    mentionCount: posts.length,
    topComments: topComments.slice(0, 5),
    subreddits: Array.from(new Set(posts.map((p) => p.subreddit))),
  };
}

export async function getAirlineSentiment(
  airlineName: string
): Promise<SentimentData> {
  const subreddits = ['travel', 'flights', 'aviation'];
  const posts = await searchReddit(airlineName, subreddits, 20);

  if (posts.length === 0) {
    return {
      score: 0,
      label: 'neutral',
      mentionCount: 0,
      topComments: [],
      subreddits,
    };
  }

  const allText = posts.map((p) => `${p.title} ${p.selftext}`).join(' ');
  const sentimentScore = analyzeSentiment(allText);

  const topComments: RedditComment[] = posts.slice(0, 3).map((post) => ({
    text: post.title,
    subreddit: post.subreddit,
    score: post.score,
    date: new Date(post.createdUtc * 1000).toISOString(),
  }));

  return {
    score: sentimentScore,
    label: sentimentScore > 0.2 ? 'positive' : sentimentScore < -0.2 ? 'negative' : 'neutral',
    mentionCount: posts.length,
    topComments,
    subreddits: Array.from(new Set(posts.map((p) => p.subreddit))),
  };
}

export async function getHotelSentiment(
  hotelName: string,
  city: string
): Promise<SentimentData> {
  const query = `${hotelName} ${city}`;
  const subreddits = ['travel', 'hotels', 'solotravel'];
  const posts = await searchReddit(query, subreddits, 15);

  if (posts.length === 0) {
    return {
      score: 0,
      label: 'neutral',
      mentionCount: 0,
      topComments: [],
      subreddits,
    };
  }

  const allText = posts.map((p) => `${p.title} ${p.selftext}`).join(' ');
  const sentimentScore = analyzeSentiment(allText);

  const topComments: RedditComment[] = posts.slice(0, 3).map((post) => ({
    text: post.selftext.slice(0, 200) || post.title,
    subreddit: post.subreddit,
    score: post.score,
    date: new Date(post.createdUtc * 1000).toISOString(),
  }));

  return {
    score: sentimentScore,
    label: sentimentScore > 0.2 ? 'positive' : sentimentScore < -0.2 ? 'negative' : 'neutral',
    mentionCount: posts.length,
    topComments,
    subreddits: Array.from(new Set(posts.map((p) => p.subreddit))),
  };
}

// Hotel recommendation types
export interface HotelRecommendation {
  hotelName: string;
  mentionCount: number;
  sentimentScore: number;
  quotes: string[];
  subreddits: string[];
}

/**
 * Search Reddit for hotel recommendations in a destination
 */
export async function searchHotelRecommendations(
  destination: string,
  budgetPerPerson: number
): Promise<HotelRecommendation[]> {
  const subreddits = getSubredditsForBudget(budgetPerPerson);

  // Search for hotel-related posts
  const searchQueries = [
    `${destination} hotel recommendation`,
    `${destination} where to stay`,
    `${destination} best hotel`,
  ];

  const allPosts: RedditPost[] = [];

  for (const query of searchQueries) {
    const posts = await searchReddit(query, subreddits, 15);
    allPosts.push(...posts);
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  // Extract hotel names from posts
  const hotelMentions = new Map<string, {
    count: number;
    quotes: string[];
    subreddits: Set<string>;
    totalScore: number;
  }>();

  // Common hotel chains and patterns to look for
  const hotelPatterns = [
    /(?:stay(?:ed)? at|recommend(?:ed)?|book(?:ed)?|love(?:d)?|tried)\s+(?:the\s+)?([A-Z][A-Za-z\s&']+(?:Hotel|Resort|Inn|Suites|Lodge|Hostel|B&B))/gi,
    /([A-Z][A-Za-z\s&']+(?:Marriott|Hilton|Hyatt|Four Seasons|Ritz|Westin|Sheraton|Holiday Inn|Best Western|Radisson|Courtyard|Hampton))/gi,
    /([A-Z][A-Za-z\s&']+)\s+(?:was|is)\s+(?:amazing|great|perfect|excellent|wonderful)/gi,
  ];

  for (const post of allPosts) {
    const fullText = `${post.title} ${post.selftext}`;

    for (const pattern of hotelPatterns) {
      pattern.lastIndex = 0; // Reset regex
      let match;
      while ((match = pattern.exec(fullText)) !== null) {
        const hotelName = match[1].trim();
        if (hotelName.length > 3 && hotelName.length < 50) {
          const existing = hotelMentions.get(hotelName.toLowerCase()) || {
            count: 0,
            quotes: [],
            subreddits: new Set(),
            totalScore: 0,
          };

          existing.count++;
          existing.subreddits.add(post.subreddit);
          existing.totalScore += analyzeSentiment(fullText);

          // Extract quote around the mention
          const mentionIndex = fullText.indexOf(hotelName);
          if (mentionIndex >= 0) {
            const start = Math.max(0, mentionIndex - 50);
            const end = Math.min(fullText.length, mentionIndex + hotelName.length + 100);
            const quote = fullText.slice(start, end).trim();
            if (quote.length > 20 && existing.quotes.length < 3) {
              existing.quotes.push(quote);
            }
          }

          hotelMentions.set(hotelName.toLowerCase(), existing);
        }
      }
    }
  }

  // Convert to array and sort by mention count and sentiment
  const recommendations: HotelRecommendation[] = Array.from(hotelMentions.entries())
    .map(([name, data]) => ({
      hotelName: name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      mentionCount: data.count,
      sentimentScore: data.count > 0 ? data.totalScore / data.count : 0,
      quotes: data.quotes,
      subreddits: Array.from(data.subreddits),
    }))
    .filter(rec => rec.mentionCount >= 1 && rec.sentimentScore > 0)
    .sort((a, b) => {
      // Sort by combination of mentions and sentiment
      const scoreA = a.mentionCount * (1 + a.sentimentScore);
      const scoreB = b.mentionCount * (1 + b.sentimentScore);
      return scoreB - scoreA;
    })
    .slice(0, 10);

  return recommendations;
}

/**
 * Check if a hotel is mentioned positively on Reddit
 */
export async function checkHotelRedditStatus(
  hotelName: string,
  destination: string,
  budgetPerPerson: number
): Promise<{
  isRecommended: boolean;
  mentionCount: number;
  sentimentScore: number;
  topQuote?: string;
}> {
  const sentiment = await getHotelSentiment(hotelName, destination);

  return {
    isRecommended: sentiment.mentionCount > 0 && sentiment.score > 0.2,
    mentionCount: sentiment.mentionCount,
    sentimentScore: sentiment.score,
    topQuote: sentiment.topComments[0]?.text,
  };
}
