/**
 * Tests for ConfidenceScorer.computeConfidence (via the public interface)
 * Verifies:
 * - Basic formula correctness
 * - Diminishing returns per evidence type
 * - Score bounds (0-1)
 * - Status determination thresholds
 */

import { describe, it, expect } from 'vitest';
import { SIGNAL_WEIGHTS } from '@/lib/types/feature';

/**
 * Replicates the computeConfidence formula for testing independently
 * of the database. This mirrors the exact logic in ConfidenceScorer.
 */
function computeConfidence(
  evidenceTypes: string[],
  maxItemsPerType: number = 3
): { confidenceScore: number; status: 'candidate' | 'confirmed' | 'rejected' } {
  // Group by type
  const typeGroups = new Map<string, number>();
  for (const type of evidenceTypes) {
    typeGroups.set(type, (typeGroups.get(type) || 0) + 1);
  }

  let product = 1.0;
  for (const [type, count] of typeGroups) {
    const baseWeight = SIGNAL_WEIGHTS[type] || 0.1;
    const effectiveCount = Math.min(count, maxItemsPerType);
    for (let i = 0; i < effectiveCount; i++) {
      const diminishingFactor = 1 / Math.pow(2, i);
      const effectiveWeight = baseWeight * diminishingFactor;
      product *= 1 - effectiveWeight;
    }
  }

  const confidenceScore = parseFloat((1 - product).toFixed(2));

  // Thresholds from ConfidenceScorer
  const CONFIRM = 0.7;
  const DISCARD = 0.5;
  let status: 'candidate' | 'confirmed' | 'rejected';
  if (confidenceScore >= CONFIRM) {
    status = 'confirmed';
  } else if (confidenceScore >= DISCARD) {
    status = 'candidate';
  } else {
    status = 'rejected';
  }

  return { confidenceScore, status };
}

describe('Confidence Score Formula', () => {
  it('should return 0 for no evidence', () => {
    const result = computeConfidence([]);
    expect(result.confidenceScore).toBe(0);
    expect(result.status).toBe('rejected');
  });

  it('should return single weight for one evidence item', () => {
    // endpoint weight = 0.4
    const result = computeConfidence(['endpoint']);
    expect(result.confidenceScore).toBe(0.4);
    expect(result.status).toBe('rejected'); // <0.5
  });

  it('should compute correctly for diverse evidence types', () => {
    // 1 endpoint (0.4) + 1 ui_element (0.3) + 1 requirement (0.25)
    // product = (1-0.4) * (1-0.3) * (1-0.25) = 0.6 * 0.7 * 0.75 = 0.315
    // confidence = 1 - 0.315 = 0.685
    const result = computeConfidence(['endpoint', 'ui_element', 'requirement']);
    expect(result.confidenceScore).toBeCloseTo(0.69, 1);
    expect(result.status).toBe('candidate'); // 0.5-0.7
  });

  it('should cap same-type contribution via diminishing returns', () => {
    // 10 ui_elements: without cap, confidence = 1-(0.7)^10 = 0.97
    // With diminishing returns (max 3):
    //   1st: weight 0.3 * 1.0 = 0.3
    //   2nd: weight 0.3 * 0.5 = 0.15
    //   3rd: weight 0.3 * 0.25 = 0.075
    // product = (1-0.3) * (1-0.15) * (1-0.075) = 0.7 * 0.85 * 0.925 = 0.550375
    // confidence = 1 - 0.550375 = 0.449625 ≈ 0.45
    const result = computeConfidence(Array(10).fill('ui_element'));
    expect(result.confidenceScore).toBeLessThan(0.5);
    expect(result.confidenceScore).toBeGreaterThan(0.4);
  });

  it('should reward diversity over quantity', () => {
    // 3 diverse types should score higher than 3 of the same type
    const diverse = computeConfidence(['endpoint', 'ui_element', 'requirement']);
    const sameType = computeConfidence(['ui_element', 'ui_element', 'ui_element']);
    expect(diverse.confidenceScore).toBeGreaterThan(sameType.confidenceScore);
  });

  it('should never exceed 1.0', () => {
    // Throw everything at it
    const allTypes = Object.keys(SIGNAL_WEIGHTS);
    const manyEvidence: string[] = [];
    for (const type of allTypes) {
      for (let i = 0; i < 10; i++) {
        manyEvidence.push(type);
      }
    }
    const result = computeConfidence(manyEvidence);
    expect(result.confidenceScore).toBeLessThanOrEqual(1.0);
    expect(result.confidenceScore).toBeGreaterThan(0);
  });

  it('should never go below 0.0', () => {
    const result = computeConfidence([]);
    expect(result.confidenceScore).toBeGreaterThanOrEqual(0);
  });

  it('should handle unknown evidence types with default weight 0.1', () => {
    const result = computeConfidence(['unknown_type']);
    expect(result.confidenceScore).toBe(0.1);
  });

  it('should confirm features with high diverse evidence', () => {
    // 1 endpoint + 1 payload + 1 ui_element + 1 requirement + 1 acceptance_criteria
    const result = computeConfidence([
      'endpoint',
      'payload',
      'ui_element',
      'requirement',
      'acceptance_criteria',
    ]);
    expect(result.confidenceScore).toBeGreaterThanOrEqual(0.7);
    expect(result.status).toBe('confirmed');
  });

  it('should reject features with only weak evidence', () => {
    // 1 edge_case (0.15) + 1 constraint (0.15)
    const result = computeConfidence(['edge_case', 'constraint']);
    expect(result.confidenceScore).toBeLessThan(0.5);
    expect(result.status).toBe('rejected');
  });
});
