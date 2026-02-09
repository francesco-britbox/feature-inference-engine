/**
 * Tests for vector math utilities
 * Verifies cosine similarity and distance calculations
 */

import { describe, it, expect } from 'vitest';
import { cosineSimilarity, cosineDistance } from '@/lib/utils/vectorMath';

describe('cosineSimilarity', () => {
  it('should return 1 for identical vectors', () => {
    const v = [1, 2, 3, 4, 5];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1.0, 5);
  });

  it('should return 0 for orthogonal vectors', () => {
    const a = [1, 0, 0];
    const b = [0, 1, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(0, 5);
  });

  it('should return ~-1 for opposite vectors', () => {
    const a = [1, 0, 0];
    const b = [-1, 0, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1, 5);
  });

  it('should be symmetric', () => {
    const a = [1, 2, 3];
    const b = [4, 5, 6];
    expect(cosineSimilarity(a, b)).toBeCloseTo(cosineSimilarity(b, a), 10);
  });

  it('should return 0 for zero vector', () => {
    const a = [1, 2, 3];
    const zero = [0, 0, 0];
    expect(cosineSimilarity(a, zero)).toBe(0);
  });

  it('should return 0 for vectors of different length', () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
  });

  it('should handle high-dimensional vectors', () => {
    const dim = 3072; // text-embedding-3-large dimension
    const a = Array.from({ length: dim }, (_, i) => Math.sin(i));
    const b = Array.from({ length: dim }, (_, i) => Math.cos(i));
    const sim = cosineSimilarity(a, b);
    expect(sim).toBeGreaterThan(-1);
    expect(sim).toBeLessThan(1);
  });

  it('should return high similarity for near-identical vectors', () => {
    const a = [1, 2, 3, 4, 5];
    const b = [1.01, 2.01, 3.01, 4.01, 5.01];
    expect(cosineSimilarity(a, b)).toBeGreaterThan(0.999);
  });
});

describe('cosineDistance', () => {
  it('should return 0 for identical vectors', () => {
    const v = [1, 2, 3];
    expect(cosineDistance(v, v)).toBeCloseTo(0, 5);
  });

  it('should return 1 for orthogonal vectors', () => {
    const a = [1, 0, 0];
    const b = [0, 1, 0];
    expect(cosineDistance(a, b)).toBeCloseTo(1, 5);
  });

  it('should return 2 for opposite vectors', () => {
    const a = [1, 0, 0];
    const b = [-1, 0, 0];
    expect(cosineDistance(a, b)).toBeCloseTo(2, 5);
  });

  it('should satisfy distance = 1 - similarity', () => {
    const a = [1, 2, 3];
    const b = [4, 5, 6];
    const sim = cosineSimilarity(a, b);
    const dist = cosineDistance(a, b);
    expect(dist).toBeCloseTo(1 - sim, 10);
  });
});
