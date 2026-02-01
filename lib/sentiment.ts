import type { SentimentData } from '@/types';

export function getSentimentColor(sentiment: SentimentData | undefined | null): string {
  if (!sentiment) return 'text-gray-500';

  if (sentiment.label === 'positive') {
    return 'text-green-600';
  } else if (sentiment.label === 'negative') {
    return 'text-red-600';
  }
  return 'text-gray-500';
}

export function getSentimentBgColor(sentiment: SentimentData | undefined | null): string {
  if (!sentiment) return 'bg-gray-100';

  if (sentiment.label === 'positive') {
    return 'bg-green-100';
  } else if (sentiment.label === 'negative') {
    return 'bg-red-100';
  }
  return 'bg-gray-100';
}

export function getSentimentLabel(sentiment: SentimentData | undefined | null): string {
  if (!sentiment || sentiment.mentionCount === 0) {
    return 'No reviews';
  }

  const score = sentiment.score;
  if (score >= 0.5) return 'Highly Recommended';
  if (score >= 0.2) return 'Positive';
  if (score >= -0.2) return 'Mixed Reviews';
  if (score >= -0.5) return 'Some Concerns';
  return 'Not Recommended';
}

export function getSentimentEmoji(sentiment: SentimentData | undefined | null): string {
  if (!sentiment || sentiment.mentionCount === 0) {
    return '🔍';
  }

  const score = sentiment.score;
  if (score >= 0.5) return '🌟';
  if (score >= 0.2) return '👍';
  if (score >= -0.2) return '👌';
  if (score >= -0.5) return '⚠️';
  return '👎';
}

export function formatMentionCount(count: number): string {
  if (count === 0) return 'No mentions';
  if (count === 1) return '1 mention';
  if (count < 10) return `${count} mentions`;
  if (count < 100) return `${Math.floor(count / 10) * 10}+ mentions`;
  return `${Math.floor(count / 100) * 100}+ mentions`;
}

export function truncateComment(comment: string, maxLength = 150): string {
  if (comment.length <= maxLength) return comment;
  return comment.slice(0, maxLength).trim() + '...';
}

export function getTopTip(sentiment: SentimentData | undefined | null): string | null {
  if (!sentiment || !sentiment.topComments || sentiment.topComments.length === 0) {
    return null;
  }

  const topComment = sentiment.topComments[0];
  return truncateComment(topComment.text, 200);
}

export function aggregateSentiment(sentiments: (SentimentData | null)[]): SentimentData {
  const validSentiments = sentiments.filter((s): s is SentimentData => s !== null);

  if (validSentiments.length === 0) {
    return {
      score: 0,
      label: 'neutral',
      mentionCount: 0,
      topComments: [],
      subreddits: [],
    };
  }

  const totalMentions = validSentiments.reduce((sum, s) => sum + s.mentionCount, 0);
  const weightedScore = validSentiments.reduce(
    (sum, s) => sum + s.score * s.mentionCount,
    0
  ) / totalMentions;

  const allComments = validSentiments.flatMap((s) => s.topComments);
  const allSubreddits = Array.from(new Set(validSentiments.flatMap((s) => s.subreddits)));

  return {
    score: weightedScore,
    label: weightedScore > 0.2 ? 'positive' : weightedScore < -0.2 ? 'negative' : 'neutral',
    mentionCount: totalMentions,
    topComments: allComments.sort((a, b) => b.score - a.score).slice(0, 5),
    subreddits: allSubreddits,
  };
}
