/**
 * Text Similarity Utilities
 * Single source of truth for name/text matching logic
 * Used by FeatureInferenceService and FeatureHierarchyService
 */

/**
 * Common stopwords to exclude from meaningful word overlap calculations.
 * These words carry little semantic signal when comparing feature names.
 */
const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'of', 'for', 'in', 'on', 'to', 'with',
  'by', 'at', 'from', 'is', 'are', 'was', 'be', 'has', 'had', 'have',
  'do', 'does', 'did', 'not', 'no', 'but', 'if', 'so', 'as', 'it',
  'its', 'this', 'that', 'all', 'each', 'every', 'both', 'few', 'more',
  'most', 'other', 'some', 'such', 'than', 'too', 'very', 'can', 'will',
  'just', 'should', 'now', 'also', 'into', 'only', 'own', 'same', 'then',
  'when', 'where', 'which', 'while', 'how', 'what', 'who', 'why',
]);

/**
 * Extract meaningful words from a text string.
 * Lowercases, splits on whitespace/punctuation, filters stopwords and short words.
 */
export function extractMeaningfulWords(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .trim()
    .split(/[\s\-_/&+,.:;()]+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
  return new Set(words);
}

/**
 * Calculate meaningful word overlap ratio between two names.
 * Returns a value between 0 and 1.
 *
 * Unlike naive word overlap, this:
 * 1. Filters stopwords and domain-generic words
 * 2. Requires at least 2 meaningful common words for a match
 * 3. Uses Jaccard similarity (intersection / union) instead of min-denominator
 *
 * @returns Overlap ratio (0-1), or 0 if fewer than 2 meaningful words in common
 */
export function calculateWordOverlap(name1: string, name2: string): number {
  const words1 = extractMeaningfulWords(name1);
  const words2 = extractMeaningfulWords(name2);

  if (words1.size === 0 || words2.size === 0) {
    return 0;
  }

  let commonWords = 0;
  for (const word of words1) {
    if (words2.has(word)) {
      commonWords++;
    }
  }

  // Require at least 2 meaningful common words to consider similar,
  // UNLESS both names have only 1 meaningful word each (single-word features).
  const minMeaningfulThreshold = (words1.size === 1 && words2.size === 1) ? 1 : 2;
  if (commonWords < minMeaningfulThreshold) {
    return 0;
  }

  // Jaccard similarity: intersection / union
  const unionSize = new Set([...words1, ...words2]).size;
  return unionSize > 0 ? commonWords / unionSize : 0;
}

/**
 * Check if two feature names are similar enough to warrant LLM comparison.
 * Used as a pre-filter to avoid expensive LLM calls.
 *
 * @param name1 First feature name
 * @param name2 Second feature name
 * @param threshold Minimum overlap ratio (default 0.5)
 * @returns true if names are similar enough
 */
export function areNamesSimilar(
  name1: string,
  name2: string,
  threshold: number = 0.5,
): boolean {
  const n1 = name1.toLowerCase().trim();
  const n2 = name2.toLowerCase().trim();

  // Exact match
  if (n1 === n2) {
    return true;
  }

  // One is a substring of the other (e.g., "Login" vs "User Login")
  if (n1.includes(n2) || n2.includes(n1)) {
    return true;
  }

  return calculateWordOverlap(name1, name2) >= threshold;
}

/**
 * Find the best matching name from a map, using meaningful word overlap.
 * Returns the matched key's value or null if no match.
 *
 * @param candidateName Name to match
 * @param nameToId Map of existing names to their IDs
 * @param threshold Minimum overlap ratio (default 0.5)
 * @returns The matched ID, or null
 */
export function findBestMatch(
  candidateName: string,
  nameToId: Map<string, string>,
  threshold: number = 0.5,
): string | null {
  const candidate = candidateName.toLowerCase().trim();

  // Exact match first
  for (const [name, id] of nameToId) {
    if (name.toLowerCase().trim() === candidate) {
      return id;
    }
  }

  // Find best overlap match
  let bestId: string | null = null;
  let bestScore = 0;

  for (const [name, id] of nameToId) {
    const score = calculateWordOverlap(candidateName, name);
    if (score >= threshold && score > bestScore) {
      bestScore = score;
      bestId = id;
    }
  }

  return bestId;
}
