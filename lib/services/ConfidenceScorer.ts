/**
 * Confidence Scorer Service
 * Single Responsibility: Calculate feature confidence scores based on evidence
 * Uses statistical formula: confidence = 1 - Π(1-weight)
 */

import { db } from '@/lib/db/client';
import { features, featureEvidence, evidence } from '@/lib/db/schema';
import { eq, inArray, isNull } from 'drizzle-orm';
import { SIGNAL_WEIGHTS } from '@/lib/types/feature';
import type { IConfidenceScorer } from '@/lib/types/services';
import { createLogger } from '@/lib/utils/logger';
import { InvalidDataError } from '@/lib/utils/errors';

const logger = createLogger({ service: 'ConfidenceScorer' });

/**
 * Confidence thresholds for feature status
 */
const CONFIDENCE_THRESHOLDS = {
  DISCARD: 0.5, // Below this: discard
  CANDIDATE: 0.75, // 0.5-0.75: candidate
  CONFIRMED: 0.75, // Above this: confirmed
} as const;

/**
 * Evidence with type for weight lookup
 */
interface EvidenceWithType {
  id: string;
  type: string;
}

/**
 * Confidence score calculation result
 */
interface ConfidenceResult {
  featureId: string;
  confidenceScore: number;
  status: 'candidate' | 'confirmed' | 'rejected';
  evidenceCount: number;
  signalWeights: Record<string, number>;
}

/**
 * Confidence Scorer Service
 * Calculates confidence scores for features based on linked evidence
 * Updates feature status based on confidence thresholds
 */
export class ConfidenceScorer implements IConfidenceScorer {
  /**
   * Calculate confidence score for a single feature
   * Formula: confidence = 1 - Π(1-weight) where weight comes from evidence type
   *
   * @param featureId - Feature ID to score
   * @returns Confidence calculation result
   */
  async calculateConfidenceForFeature(featureId: string): Promise<ConfidenceResult> {
    if (!featureId) {
      throw new InvalidDataError('Feature ID is required');
    }

    logger.info({ featureId }, 'Calculating confidence score for feature');

    try {
      // Get all evidence linked to this feature
      const evidenceLinks = await db
        .select({
          evidenceId: featureEvidence.evidenceId,
        })
        .from(featureEvidence)
        .where(eq(featureEvidence.featureId, featureId));

      if (evidenceLinks.length === 0) {
        logger.warn({ featureId }, 'No evidence linked to feature');
        return {
          featureId,
          confidenceScore: 0,
          status: 'rejected',
          evidenceCount: 0,
          signalWeights: {},
        };
      }

      // Get evidence types
      const evidenceIds = evidenceLinks.map((link) => link.evidenceId);
      const evidenceItems = await db
        .select({
          id: evidence.id,
          type: evidence.type,
        })
        .from(evidence)
        .where(inArray(evidence.id, evidenceIds));

      // Calculate confidence score
      const result = this.computeConfidence(featureId, evidenceItems);

      // Update feature in database
      await this.updateFeatureConfidence(featureId, result.confidenceScore, result.status);

      logger.info(
        {
          featureId,
          confidence: result.confidenceScore,
          status: result.status,
          evidenceCount: result.evidenceCount,
        },
        'Confidence score calculated successfully'
      );

      return result;
    } catch (error) {
      logger.error(
        { featureId, error: error instanceof Error ? error.message : String(error) },
        'Failed to calculate confidence score'
      );
      throw error;
    }
  }

  /**
   * Calculate confidence scores for all features that haven't been manually reviewed.
   * Scores candidates AND confirmed features (from hierarchy step) to ensure
   * all features have up-to-date confidence after pipeline changes.
   * Skips features with a reviewedAt timestamp (human-reviewed).
   *
   * @returns Array of confidence calculation results
   */
  async calculateConfidenceForAllFeatures(): Promise<ConfidenceResult[]> {
    logger.info('Calculating confidence scores for all unreviewed features');

    try {
      // Get all features that haven't been manually reviewed
      const unreviewedFeatures = await db
        .select({ id: features.id })
        .from(features)
        .where(isNull(features.reviewedAt));

      logger.info({ count: unreviewedFeatures.length }, 'Processing features');

      // Calculate confidence for each feature
      const results: ConfidenceResult[] = [];
      for (const feature of unreviewedFeatures) {
        const result = await this.calculateConfidenceForFeature(feature.id);
        results.push(result);
      }

      // Log summary
      const confirmed = results.filter((r) => r.status === 'confirmed').length;
      const candidate = results.filter((r) => r.status === 'candidate').length;
      const rejected = results.filter((r) => r.status === 'rejected').length;

      logger.info(
        { total: results.length, confirmed, candidate, rejected },
        'Batch confidence calculation completed'
      );

      return results;
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error) },
        'Failed to calculate confidence for all features'
      );
      throw error;
    }
  }

  /**
   * Maximum evidence items per type that contribute to the score.
   * Beyond this count, additional items of the same type add no signal.
   * Prevents 10 "ui_element" items from inflating confidence to ~1.0.
   */
  private readonly MAX_ITEMS_PER_TYPE = 3;

  /**
   * Compute confidence score using the formula: confidence = 1 - Π(1 - effective_weight)
   *
   * To prevent same-type inflation, each evidence type contributes at most
   * MAX_ITEMS_PER_TYPE signals, with diminishing weight per additional item:
   *   1st item: full weight
   *   2nd item: weight * 0.5
   *   3rd item: weight * 0.25
   *
   * This means diversity of evidence types is rewarded over quantity of a single type.
   * A feature with 1 endpoint + 1 UI element + 1 requirement scores higher than
   * one with 3 UI elements.
   */
  private computeConfidence(
    featureId: string,
    evidenceItems: EvidenceWithType[]
  ): ConfidenceResult {
    // Group evidence by type
    const typeGroups = new Map<string, number>();
    for (const item of evidenceItems) {
      typeGroups.set(item.type, (typeGroups.get(item.type) || 0) + 1);
    }

    // Track signal weights for reporting
    const signalWeights: Record<string, number> = {};

    // Calculate product of (1 - effective_weight) with diminishing returns per type
    let product = 1.0;

    for (const [type, count] of typeGroups) {
      const baseWeight = SIGNAL_WEIGHTS[type] || 0.1;
      signalWeights[type] = baseWeight;

      const effectiveCount = Math.min(count, this.MAX_ITEMS_PER_TYPE);
      for (let i = 0; i < effectiveCount; i++) {
        // Diminishing factor: 1.0, 0.5, 0.25, ...
        const diminishingFactor = 1 / Math.pow(2, i);
        const effectiveWeight = baseWeight * diminishingFactor;
        product *= 1 - effectiveWeight;
      }
    }

    // Final confidence: 1 - product
    const confidenceScore = 1 - product;

    // Determine status based on thresholds
    const status = this.determineStatus(confidenceScore);

    return {
      featureId,
      confidenceScore: parseFloat(confidenceScore.toFixed(2)),
      status,
      evidenceCount: evidenceItems.length,
      signalWeights,
    };
  }

  /**
   * Determine feature status based on confidence score
   */
  private determineStatus(
    confidenceScore: number
  ): 'candidate' | 'confirmed' | 'rejected' {
    if (confidenceScore < CONFIDENCE_THRESHOLDS.DISCARD) {
      return 'rejected';
    } else if (confidenceScore >= CONFIDENCE_THRESHOLDS.CONFIRMED) {
      return 'confirmed';
    } else {
      return 'candidate';
    }
  }

  /**
   * Update feature confidence score and status in database
   */
  private async updateFeatureConfidence(
    featureId: string,
    confidenceScore: number,
    status: 'candidate' | 'confirmed' | 'rejected'
  ): Promise<void> {
    await db
      .update(features)
      .set({
        confidenceScore: confidenceScore.toFixed(2),
        status,
      })
      .where(eq(features.id, featureId));
  }

  /**
   * Recalculate confidence for a feature when evidence is added or removed
   * Convenience method for incremental updates
   *
   * @param featureId - Feature ID to recalculate
   * @returns Updated confidence result
   */
  async recalculateConfidence(featureId: string): Promise<ConfidenceResult> {
    logger.info({ featureId }, 'Recalculating confidence after evidence change');
    return this.calculateConfidenceForFeature(featureId);
  }

  /**
   * Get current confidence breakdown for a feature
   * Returns detailed information about how confidence was calculated
   *
   * @param featureId - Feature ID to analyze
   * @returns Confidence breakdown with evidence details
   */
  async getConfidenceBreakdown(featureId: string): Promise<{
    confidenceScore: number;
    status: string;
    evidenceBreakdown: Array<{
      type: string;
      count: number;
      weight: number;
      contribution: number;
    }>;
  }> {
    // Get evidence linked to feature
    const evidenceLinks = await db
      .select({
        evidenceId: featureEvidence.evidenceId,
      })
      .from(featureEvidence)
      .where(eq(featureEvidence.featureId, featureId));

    const evidenceIds = evidenceLinks.map((link) => link.evidenceId);
    const evidenceItems = await db
      .select({
        id: evidence.id,
        type: evidence.type,
      })
      .from(evidence)
      .where(inArray(evidence.id, evidenceIds));

    // Group by type
    const typeGroups = new Map<string, number>();
    for (const item of evidenceItems) {
      typeGroups.set(item.type, (typeGroups.get(item.type) || 0) + 1);
    }

    // Calculate result
    const result = this.computeConfidence(featureId, evidenceItems);

    // Build breakdown with diminishing returns matching computeConfidence
    const evidenceBreakdown = Array.from(typeGroups.entries()).map(([type, count]) => {
      const weight = SIGNAL_WEIGHTS[type] || 0.1;
      const effectiveCount = Math.min(count, this.MAX_ITEMS_PER_TYPE);
      let typeProduct = 1.0;
      for (let i = 0; i < effectiveCount; i++) {
        const diminishingFactor = 1 / Math.pow(2, i);
        typeProduct *= 1 - weight * diminishingFactor;
      }
      const contribution = 1 - typeProduct;

      return {
        type,
        count,
        weight,
        contribution: parseFloat(contribution.toFixed(2)),
      };
    });

    return {
      confidenceScore: result.confidenceScore,
      status: result.status,
      evidenceBreakdown,
    };
  }
}

/**
 * Singleton instance
 */
export const confidenceScorer = new ConfidenceScorer();
