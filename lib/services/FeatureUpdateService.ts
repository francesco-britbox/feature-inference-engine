/**
 * Feature Update Service
 * Single Responsibility: Update features after evidence changes
 * Follows DIP: Injects FeatureInferenceService and ConfidenceScorer dependencies
 * Follows SRP: Only handles feature updates, not extraction or scoring logic
 */

import { db } from '@/lib/db/client';
import { features, featureEvidence, evidence } from '@/lib/db/schema';
import { eq, inArray, and } from 'drizzle-orm';
import { createLogger } from '@/lib/utils/logger';
import { InvalidDataError } from '@/lib/utils/errors';
import type { IFeatureInferenceService, IConfidenceScorer } from '@/lib/types/services';

const logger = createLogger({ service: 'FeatureUpdateService' });

/**
 * Feature update result
 */
interface FeatureUpdateResult {
  featureId: string;
  featureName: string;
  previousConfidence: number;
  newConfidence: number;
  confidenceChange: number;
  status: 'candidate' | 'confirmed' | 'rejected';
}

/**
 * Change notification details
 */
interface ChangeNotification {
  totalFeatures: number;
  updatedFeatures: FeatureUpdateResult[];
  newFeatures: number;
  statusChanges: {
    toConfirmed: number;
    toCandidate: number;
    toRejected: number;
  };
}

/**
 * Feature Update Service
 * Re-runs inference on updated evidence and recalculates confidence scores
 * Merges new features with existing ones and notifies user of changes
 */
export class FeatureUpdateService {
  /**
   * Constructor with dependency injection
   * @param featureInferenceService - Service for feature inference
   * @param confidenceScorer - Service for confidence calculation
   */
  constructor(
    private featureInferenceService: IFeatureInferenceService,
    private confidenceScorer: IConfidenceScorer
  ) {}

  /**
   * Update features affected by document changes
   * 1. Recalculate confidence for affected features
   * 2. Remove obsolete evidence links
   * 3. Generate change notification
   *
   * @param affectedFeatureIds - Array of feature IDs to update
   * @returns Feature update results
   */
  async updateAffectedFeatures(affectedFeatureIds: string[]): Promise<ChangeNotification> {
    if (!affectedFeatureIds || affectedFeatureIds.length === 0) {
      logger.info('No affected features to update');

      return {
        totalFeatures: 0,
        updatedFeatures: [],
        newFeatures: 0,
        statusChanges: {
          toConfirmed: 0,
          toCandidate: 0,
          toRejected: 0,
        },
      };
    }

    logger.info(
      { affectedFeaturesCount: affectedFeatureIds.length },
      'Starting feature updates'
    );

    try {
      // Step 1: Remove links to obsolete evidence
      await this.removeObsoleteEvidenceLinks(affectedFeatureIds);

      // Step 2: Get previous confidence scores
      const previousScores = await this.getPreviousConfidenceScores(affectedFeatureIds);

      // Step 3: Recalculate confidence for all affected features
      const updatedFeatures: FeatureUpdateResult[] = [];

      for (const featureId of affectedFeatureIds) {
        try {
          const result = await this.updateFeatureConfidence(
            featureId,
            previousScores.get(featureId) || 0
          );
          updatedFeatures.push(result);
        } catch (error) {
          logger.error(
            { featureId, error: error instanceof Error ? error.message : String(error) },
            'Failed to update feature confidence'
          );
          // Continue with other features
        }
      }

      // Step 4: Calculate status changes
      const statusChanges = this.calculateStatusChanges(updatedFeatures);

      // Step 5: Build notification
      const notification: ChangeNotification = {
        totalFeatures: affectedFeatureIds.length,
        updatedFeatures,
        newFeatures: 0, // Set by caller if new features were created
        statusChanges,
      };

      logger.info(
        {
          totalFeatures: notification.totalFeatures,
          updatedCount: updatedFeatures.length,
          statusChanges,
        },
        'Feature updates completed'
      );

      return notification;
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error) },
        'Failed to update affected features'
      );
      throw error;
    }
  }

  /**
   * Re-run inference on new evidence from a document
   * Creates new feature hypotheses if new patterns detected
   *
   * @param documentId - Document UUID with new evidence
   * @returns Array of new feature IDs created
   */
  async inferFeaturesFromNewEvidence(documentId: string): Promise<string[]> {
    if (!documentId) {
      throw new InvalidDataError('Document ID is required');
    }

    logger.info({ documentId }, 'Inferring features from new evidence');

    try {
      // Get new (non-obsolete) evidence from document
      const newEvidence = await db
        .select({
          id: evidence.id,
          content: evidence.content,
          type: evidence.type,
        })
        .from(evidence)
        .where(and(eq(evidence.documentId, documentId), eq(evidence.obsolete, false)));

      if (newEvidence.length === 0) {
        logger.info({ documentId }, 'No new evidence to process');
        return [];
      }

      logger.info(
        { documentId, evidenceCount: newEvidence.length },
        'Processing new evidence for feature inference'
      );

      // Generate feature hypothesis from new evidence
      // Note: In a full implementation, this would use clustering + inference
      // For now, we'll treat all new evidence as one cluster
      const featureId = await this.featureInferenceService.generateFeatureFromCluster(
        newEvidence
      );

      logger.info({ documentId, featureId }, 'New feature inferred from evidence');

      return [featureId];
    } catch (error) {
      logger.error(
        { documentId, error: error instanceof Error ? error.message : String(error) },
        'Failed to infer features from new evidence'
      );
      throw error;
    }
  }

  /**
   * Merge new features with existing features
   * Uses feature inference service to detect and merge duplicates
   *
   * @returns Number of features merged
   */
  async mergeNewWithExistingFeatures(): Promise<number> {
    logger.info('Merging new features with existing features');

    try {
      // Use injected service for cross-cluster validation
      const mergeCount = await this.featureInferenceService.validateAndMergeDuplicates();

      logger.info({ mergeCount }, 'Feature merge completed');

      return mergeCount;
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error) },
        'Failed to merge new features with existing'
      );
      throw error;
    }
  }

  /**
   * Update confidence score for a single feature
   * @param featureId - Feature UUID
   * @param previousConfidence - Previous confidence score
   * @returns Feature update result
   */
  private async updateFeatureConfidence(
    featureId: string,
    previousConfidence: number
  ): Promise<FeatureUpdateResult> {
    // Recalculate confidence using injected scorer
    const result = await this.confidenceScorer.calculateConfidenceForFeature(featureId);

    // Get feature name
    const [feature] = await db
      .select({ name: features.name })
      .from(features)
      .where(eq(features.id, featureId))
      .limit(1);

    if (!feature) {
      throw new InvalidDataError(`Feature ${featureId} not found`);
    }

    return {
      featureId,
      featureName: feature.name,
      previousConfidence,
      newConfidence: result.confidenceScore,
      confidenceChange: result.confidenceScore - previousConfidence,
      status: result.status,
    };
  }

  /**
   * Remove feature-evidence links for obsolete evidence
   * @param featureIds - Array of feature IDs
   */
  private async removeObsoleteEvidenceLinks(featureIds: string[]): Promise<void> {
    logger.info({ featureCount: featureIds.length }, 'Removing obsolete evidence links');

    try {
      // Get all evidence IDs linked to these features
      const evidenceLinks = await db
        .select({ evidenceId: featureEvidence.evidenceId })
        .from(featureEvidence)
        .where(inArray(featureEvidence.featureId, featureIds));

      if (evidenceLinks.length === 0) {
        logger.info('No evidence links to check');
        return;
      }

      const evidenceIds = evidenceLinks.map((link) => link.evidenceId);

      // Get obsolete evidence IDs
      const obsoleteEvidence = await db
        .select({ id: evidence.id })
        .from(evidence)
        .where(and(inArray(evidence.id, evidenceIds), eq(evidence.obsolete, true)));

      const obsoleteIds = obsoleteEvidence.map((e) => e.id);

      if (obsoleteIds.length === 0) {
        logger.info('No obsolete evidence links to remove');
        return;
      }

      // Delete feature-evidence links for obsolete evidence
      await db
        .delete(featureEvidence)
        .where(inArray(featureEvidence.evidenceId, obsoleteIds));

      logger.info({ removedLinksCount: obsoleteIds.length }, 'Removed obsolete evidence links');
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error) },
        'Failed to remove obsolete evidence links'
      );
      throw error;
    }
  }

  /**
   * Get previous confidence scores for features
   * @param featureIds - Array of feature IDs
   * @returns Map of feature ID to confidence score
   */
  private async getPreviousConfidenceScores(
    featureIds: string[]
  ): Promise<Map<string, number>> {
    const scores = new Map<string, number>();

    const results = await db
      .select({
        id: features.id,
        confidenceScore: features.confidenceScore,
      })
      .from(features)
      .where(inArray(features.id, featureIds));

    for (const result of results) {
      scores.set(result.id, parseFloat(result.confidenceScore || '0'));
    }

    return scores;
  }

  /**
   * Calculate status changes from update results
   * @param results - Array of feature update results
   * @returns Status change counts
   */
  private calculateStatusChanges(results: FeatureUpdateResult[]): {
    toConfirmed: number;
    toCandidate: number;
    toRejected: number;
  } {
    let toConfirmed = 0;
    let toCandidate = 0;
    let toRejected = 0;

    for (const result of results) {
      if (result.status === 'confirmed' && result.previousConfidence < 0.75) {
        toConfirmed++;
      } else if (result.status === 'candidate') {
        toCandidate++;
      } else if (result.status === 'rejected' && result.previousConfidence >= 0.5) {
        toRejected++;
      }
    }

    return { toConfirmed, toCandidate, toRejected };
  }

  /**
   * Log change notification for user
   * Formats and logs feature update details
   *
   * @param notification - Change notification to log
   */
  logChangeNotification(notification: ChangeNotification): void {
    logger.info(
      {
        totalFeatures: notification.totalFeatures,
        updatedFeatures: notification.updatedFeatures.length,
        newFeatures: notification.newFeatures,
        statusChanges: notification.statusChanges,
      },
      'Feature update notification'
    );

    // Log significant confidence changes
    const significantChanges = notification.updatedFeatures.filter(
      (f) => Math.abs(f.confidenceChange) > 0.1
    );

    if (significantChanges.length > 0) {
      logger.info(
        { significantChanges: significantChanges.length },
        'Features with significant confidence changes'
      );

      for (const change of significantChanges) {
        logger.info(
          {
            featureName: change.featureName,
            previousConfidence: change.previousConfidence,
            newConfidence: change.newConfidence,
            change: change.confidenceChange,
            status: change.status,
          },
          'Feature confidence change'
        );
      }
    }
  }
}
