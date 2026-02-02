/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;

  if (len1 === 0) return len2;
  if (len2 === 0) return len1;

  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculate similarity between two strings (0 to 1, where 1 is identical)
 */
export function calculateLevenshteinSimilarity(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;

  if (len1 === 0 && len2 === 0) return 1;
  if (len1 === 0 || len2 === 0) return 0;

  const distance = levenshteinDistance(str1, str2);
  return 1 - distance / Math.max(len1, len2);
}

/**
 * Normalize hotel name for matching
 * Removes common words and punctuation to improve matching
 */
export function normalizeHotelName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\b(hotel|resort|inn|suites?|the|a|an|by|at)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
