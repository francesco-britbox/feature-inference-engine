/**
 * Vector Math Utilities
 * Single source of truth for vector similarity calculations
 * Used by ClusteringService and FeatureInferenceService
 */

/**
 * Calculate cosine similarity between two vectors.
 * @returns Similarity in range [0, 1] where 1 = identical
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    return 0;
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    const valueA = a[i] || 0;
    const valueB = b[i] || 0;

    dotProduct += valueA * valueB;
    magnitudeA += valueA * valueA;
    magnitudeB += valueB * valueB;
  }

  const denominator = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB);

  if (denominator === 0) {
    return 0;
  }

  return dotProduct / denominator;
}

/**
 * Calculate cosine distance between two vectors.
 * distance = 1 - cosine_similarity
 * @returns Distance in range [0, 2] where 0 = identical
 */
export function cosineDistance(a: number[], b: number[]): number {
  return 1 - cosineSimilarity(a, b);
}
