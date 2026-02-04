/**
 * Prompt sanitization utilities to prevent LLM prompt injection attacks.
 *
 * These functions sanitize user input before interpolating into AI system prompts,
 * removing or escaping sequences that could manipulate the LLM's behavior.
 */

/**
 * Patterns that could indicate prompt injection attempts
 */
const INJECTION_PATTERNS = [
  // System/instruction override attempts
  /\b(system|instruction|prompt|role):\s*/gi,
  /\[INST\]/gi,
  /\[\/INST\]/gi,
  /<<SYS>>/gi,
  /<</gi,
  />>/gi,

  // Role-playing manipulation
  /\b(you are now|act as|pretend to be|ignore previous|ignore above|disregard|forget)\b/gi,
  /\b(new instructions?|override|bypass|jailbreak)\b/gi,

  // Output format manipulation
  /\b(respond with|always say|never say|must respond|output only)\b/gi,

  // Code execution attempts
  /```[\s\S]*?```/g,
  /\${[^}]*}/g,  // Template literals

  // Special characters that might break prompt structure
  /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g,  // Control characters
];

/**
 * Maximum length for sanitized destination/location names
 */
const MAX_DESTINATION_LENGTH = 100;

/**
 * Maximum length for general user input
 */
const MAX_INPUT_LENGTH = 1000;

/**
 * Sanitizes a destination name for safe interpolation into prompts
 *
 * @param destination - The raw destination input
 * @returns Sanitized destination string safe for prompt interpolation
 */
export function sanitizeDestination(destination: string): string {
  if (!destination || typeof destination !== 'string') {
    return '';
  }

  let sanitized = destination;

  // Remove injection patterns
  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, '');
  }

  // Remove excessive whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  // Truncate to max length
  if (sanitized.length > MAX_DESTINATION_LENGTH) {
    sanitized = sanitized.slice(0, MAX_DESTINATION_LENGTH);
  }

  // Only allow alphanumeric, spaces, common punctuation, and common accented chars
  // This allows international destination names while blocking special characters
  // Note: We allow common Latin extended chars (à-ÿ) for international names
  sanitized = sanitized.replace(/[^a-zA-Z0-9\s.,'\-()À-ÿ]/g, '');

  return sanitized.trim();
}

/**
 * Sanitizes general user input for safe interpolation into prompts
 *
 * @param input - The raw user input
 * @returns Sanitized string safe for prompt interpolation
 */
export function sanitizeUserInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  let sanitized = input;

  // Remove injection patterns
  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, '');
  }

  // Remove excessive whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  // Truncate to max length
  if (sanitized.length > MAX_INPUT_LENGTH) {
    sanitized = sanitized.slice(0, MAX_INPUT_LENGTH);
  }

  // Remove control characters but allow more punctuation than destination
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  return sanitized.trim();
}

/**
 * Sanitizes a numeric value, ensuring it's within expected bounds
 *
 * @param value - The value to sanitize
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @param defaultValue - Default if value is invalid
 * @returns Sanitized number
 */
export function sanitizeNumber(
  value: unknown,
  min: number,
  max: number,
  defaultValue: number
): number {
  if (typeof value !== 'number' || isNaN(value)) {
    return defaultValue;
  }
  return Math.max(min, Math.min(max, value));
}

/**
 * Sanitizes an array of strings (like subreddit names)
 *
 * @param items - Array of strings to sanitize
 * @param maxItems - Maximum number of items to allow
 * @returns Sanitized array
 */
export function sanitizeStringArray(items: unknown, maxItems: number = 10): string[] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .slice(0, maxItems)
    .filter((item): item is string => typeof item === 'string')
    .map(item => item.replace(/[^\w\-]/g, '').slice(0, 50));
}

/**
 * Validates and sanitizes a subreddit name
 *
 * @param subreddit - The subreddit name
 * @returns Sanitized subreddit name or empty string if invalid
 */
export function sanitizeSubreddit(subreddit: string): string {
  if (!subreddit || typeof subreddit !== 'string') {
    return '';
  }

  // Remove r/ prefix if present
  let name = subreddit.replace(/^r\//i, '');

  // Subreddits can only contain alphanumeric and underscores, 3-21 chars
  name = name.replace(/[^\w]/g, '');

  if (name.length < 3 || name.length > 21) {
    return '';
  }

  return name;
}
