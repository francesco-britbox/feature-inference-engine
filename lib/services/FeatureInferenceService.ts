/**
 * Feature Inference Service
 * Single Responsibility: Generate feature hypotheses from evidence clusters
 * Follows DIP: Depends on LLMClient abstraction, not concrete OpenAI
 */

import type { LLMClient } from '@/lib/types/llm';
import type { FeatureHypothesis } from '@/lib/types/feature';
import type { IFeatureInferenceService } from '@/lib/types/services';
import { buildFeatureHypothesisPrompt, buildFeatureSimilarityPrompt } from '@/lib/prompts/inference';
import { db } from '@/lib/db/client';
import { features, featureEvidence } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { createLogger } from '@/lib/utils/logger';
import { InvalidDataError, RetryableError } from '@/lib/utils/errors';
import { chatRateLimiter } from '@/lib/ai/openai';

const logger = createLogger({ service: 'FeatureInferenceService' });

/**
 * Evidence item with ID and content
 */
interface EvidenceItem {
  id: string;
  content: string;
  type: string;
}

/**
 * Feature comparison result
 */
interface FeatureComparison {
  isDuplicate: boolean;
  similarityScore: number;
  reasoning: string;
  recommendedMerge: 'feature1' | 'feature2' | 'combine';
}

/**
 * Feature Inference Service
 * Generates feature hypotheses from evidence clusters and validates across clusters
 */
export class FeatureInferenceService implements IFeatureInferenceService {
  private readonly MODEL = 'gpt-4o';
  private readonly TEMPERATURE = 0.3;
  private readonly SIMILARITY_THRESHOLD = 0.75;

  constructor(private llmClient: LLMClient) {}

  /**
   * Generate feature hypothesis from evidence cluster
   * Creates feature in database with status='candidate'
   * Links evidence to feature via feature_evidence table
   *
   * @param evidenceItems - Evidence items in the cluster
   * @returns Generated feature ID
   */
  async generateFeatureFromCluster(evidenceItems: EvidenceItem[]): Promise<string> {
    if (!evidenceItems || evidenceItems.length === 0) {
      throw new InvalidDataError('Evidence cluster cannot be empty');
    }

    logger.info(
      { evidenceCount: evidenceItems.length },
      'Generating feature hypothesis from cluster'
    );

    try {
      // Build prompt with evidence content
      const evidenceContent = evidenceItems.map((e) => e.content);
      const prompt = buildFeatureHypothesisPrompt(evidenceContent);

      // Call LLM with rate limiting
      const response = await chatRateLimiter.schedule(() =>
        this.llmClient.chat({
          model: this.MODEL,
          messages: [{ role: 'user', content: prompt }],
          temperature: this.TEMPERATURE,
          responseFormat: { type: 'json_object' },
        })
      );

      if (!response.content) {
        throw new RetryableError('LLM returned empty response');
      }

      // Parse LLM response
      const hypothesis = this.parseFeatureHypothesis(response.content);

      // Validate hypothesis
      this.validateHypothesis(hypothesis);

      // Store feature in database
      const featureId = await this.storeFeature(hypothesis);

      // Link evidence to feature
      await this.linkEvidenceToFeature(featureId, evidenceItems.map((e) => e.id));

      logger.info(
        { featureId, featureName: hypothesis.name, confidence: hypothesis.confidence },
        'Feature hypothesis generated successfully'
      );

      return featureId;
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error) },
        'Failed to generate feature hypothesis'
      );
      throw error;
    }
  }

  /**
   * Cross-cluster validation: compare features and merge duplicates
   * Compares all candidate features and merges those that are similar
   *
   * @returns Number of features merged
   */
  async validateAndMergeDuplicates(): Promise<number> {
    logger.info('Starting cross-cluster validation');

    try {
      // Get all candidate features
      const candidateFeatures = await db
        .select({
          id: features.id,
          name: features.name,
          description: features.description,
        })
        .from(features)
        .where(eq(features.status, 'candidate'));

      if (candidateFeatures.length < 2) {
        logger.info('Less than 2 candidate features, skipping validation');
        return 0;
      }

      let mergeCount = 0;

      // Compare each pair of features
      for (let i = 0; i < candidateFeatures.length; i++) {
        for (let j = i + 1; j < candidateFeatures.length; j++) {
          const feature1 = candidateFeatures[i];
          const feature2 = candidateFeatures[j];

          // Skip if either feature is null or doesn't have description
          if (!feature1 || !feature2 || !feature1.description || !feature2.description) {
            continue;
          }

          // Compare features
          const comparison = await this.compareFeatures(
            { name: feature1.name, description: feature1.description },
            { name: feature2.name, description: feature2.description }
          );

          // Merge if duplicate
          if (comparison.isDuplicate && comparison.similarityScore >= this.SIMILARITY_THRESHOLD) {
            await this.mergeFeatures(feature1.id, feature2.id, comparison);
            mergeCount++;

            logger.info(
              {
                feature1: feature1.name,
                feature2: feature2.name,
                similarityScore: comparison.similarityScore,
              },
              'Merged duplicate features'
            );
          }
        }
      }

      logger.info({ mergeCount }, 'Cross-cluster validation completed');
      return mergeCount;
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error) },
        'Failed to validate and merge duplicates'
      );
      throw error;
    }
  }

  /**
   * Parse LLM response into FeatureHypothesis
   */
  private parseFeatureHypothesis(content: string): FeatureHypothesis {
    try {
      const parsed = JSON.parse(content) as {
        feature_name: string;
        description: string;
        confidence: number;
        reasoning: string;
      };

      return {
        name: parsed.feature_name,
        description: parsed.description,
        confidence: parsed.confidence,
        reasoning: parsed.reasoning,
        evidenceIds: [], // Will be populated separately
      };
    } catch (error) {
      logger.error({ content, error }, 'Failed to parse feature hypothesis');
      throw new InvalidDataError('Invalid JSON response from LLM');
    }
  }

  /**
   * Validate feature hypothesis structure and values
   */
  private validateHypothesis(hypothesis: FeatureHypothesis): void {
    if (!hypothesis.name || hypothesis.name.trim().length === 0) {
      throw new InvalidDataError('Feature name cannot be empty');
    }

    if (!hypothesis.description || hypothesis.description.trim().length === 0) {
      throw new InvalidDataError('Feature description cannot be empty');
    }

    if (hypothesis.confidence < 0 || hypothesis.confidence > 1) {
      throw new InvalidDataError('Confidence must be between 0 and 1');
    }

    if (!hypothesis.reasoning || hypothesis.reasoning.trim().length === 0) {
      throw new InvalidDataError('Reasoning cannot be empty');
    }
  }

  /**
   * Store feature in database
   */
  private async storeFeature(hypothesis: FeatureHypothesis): Promise<string> {
    const [feature] = await db
      .insert(features)
      .values({
        name: hypothesis.name,
        description: hypothesis.description,
        confidenceScore: hypothesis.confidence.toFixed(2),
        status: 'candidate',
        metadata: { reasoning: hypothesis.reasoning },
      })
      .returning({ id: features.id });

    if (!feature) {
      throw new Error('Failed to insert feature into database');
    }

    return feature.id;
  }

  /**
   * Link evidence items to feature
   */
  private async linkEvidenceToFeature(featureId: string, evidenceIds: string[]): Promise<void> {
    await db.insert(featureEvidence).values(
      evidenceIds.map((evidenceId) => ({
        featureId,
        evidenceId,
        relationshipType: 'implements', // Default, will be refined by RelationshipBuilder
        strength: '0.5', // Default, will be refined by RelationshipBuilder
      }))
    );
  }

  /**
   * Compare two features for similarity
   */
  private async compareFeatures(
    feature1: { name: string; description: string },
    feature2: { name: string; description: string }
  ): Promise<FeatureComparison> {
    const prompt = buildFeatureSimilarityPrompt(feature1, feature2);

    const response = await chatRateLimiter.schedule(() =>
      this.llmClient.chat({
        model: this.MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2, // Lower temperature for comparison
        responseFormat: { type: 'json_object' },
      })
    );

    if (!response.content) {
      throw new RetryableError('LLM returned empty response for feature comparison');
    }

    return this.parseFeatureComparison(response.content);
  }

  /**
   * Parse feature comparison response
   */
  private parseFeatureComparison(content: string): FeatureComparison {
    try {
      const parsed = JSON.parse(content) as {
        is_duplicate: boolean;
        similarity_score: number;
        reasoning: string;
        recommended_merge: 'feature1' | 'feature2' | 'combine';
      };

      return {
        isDuplicate: parsed.is_duplicate,
        similarityScore: parsed.similarity_score,
        reasoning: parsed.reasoning,
        recommendedMerge: parsed.recommended_merge,
      };
    } catch (error) {
      logger.error({ content, error }, 'Failed to parse feature comparison');
      throw new InvalidDataError('Invalid JSON response from LLM for feature comparison');
    }
  }

  /**
   * Merge two features
   * Keeps feature1, moves all evidence from feature2 to feature1, deletes feature2
   */
  private async mergeFeatures(
    keepFeatureId: string,
    removeFeatureId: string,
    comparison: FeatureComparison
  ): Promise<void> {
    // Start transaction to ensure atomicity
    await db.transaction(async (tx) => {
      // Move all evidence links from removeFeature to keepFeature
      const evidenceLinks = await tx
        .select({ evidenceId: featureEvidence.evidenceId })
        .from(featureEvidence)
        .where(eq(featureEvidence.featureId, removeFeatureId));

      // Update evidence links (avoid duplicates)
      for (const link of evidenceLinks) {
        // Check if link already exists
        const existing = await tx
          .select()
          .from(featureEvidence)
          .where(
            and(
              eq(featureEvidence.featureId, keepFeatureId),
              eq(featureEvidence.evidenceId, link.evidenceId)
            )
          );

        if (existing.length === 0) {
          // Insert new link
          await tx.insert(featureEvidence).values({
            featureId: keepFeatureId,
            evidenceId: link.evidenceId,
            relationshipType: 'implements',
            strength: '0.5',
          });
        }
      }

      // Delete old evidence links
      await tx.delete(featureEvidence).where(eq(featureEvidence.featureId, removeFeatureId));

      // Delete the duplicate feature
      await tx.delete(features).where(eq(features.id, removeFeatureId));

      // Update metadata of kept feature to include merge info
      await tx
        .update(features)
        .set({
          metadata: sql`${features.metadata}::jsonb || jsonb_build_object('merged_from', ${removeFeatureId}, 'merge_reasoning', ${comparison.reasoning})`,
        })
        .where(eq(features.id, keepFeatureId));
    });
  }
}
