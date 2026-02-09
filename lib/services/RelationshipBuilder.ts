/**
 * Relationship Builder Service
 * Single Responsibility: Determine and assign relationship types between evidence and features
 * Follows DIP: Depends on LLMClient abstraction, not concrete OpenAI
 */

import type { LLMClient } from '@/lib/types/llm';
import type { RelationshipType } from '@/lib/types/feature';
import { buildRelationshipPrompt, buildBatchRelationshipPrompt } from '@/lib/prompts/inference';
import { db } from '@/lib/db/client';
import { features, featureEvidence, evidence } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { createLogger } from '@/lib/utils/logger';
import { InvalidDataError, RetryableError } from '@/lib/utils/errors';
import { chatRateLimiter } from '@/lib/ai/openai';
import { openaiClient } from '@/lib/ai/OpenAIClient';

const logger = createLogger({ service: 'RelationshipBuilder' });

/**
 * Relationship determination result from LLM
 */
interface RelationshipResult {
  relationshipType: RelationshipType;
  strength: number;
  reasoning: string;
}

/**
 * Feature-evidence pair to process
 */
interface FeatureEvidencePair {
  featureId: string;
  featureName: string;
  evidenceId: string;
  evidenceContent: string;
  evidenceType: string;
}

/**
 * Relationship processing result
 */
interface RelationshipProcessingResult {
  featureId: string;
  evidenceId: string;
  relationshipType: RelationshipType;
  strength: number;
  reasoning: string;
}

/**
 * Relationship Builder Service
 * Uses LLM to determine relationship types and strength scores
 * Updates feature_evidence table with relationship metadata
 */
export class RelationshipBuilder {
  private readonly MODEL = 'gpt-4o';
  private readonly TEMPERATURE = 0.2; // Lower temperature for consistent relationship classification

  constructor(private llmClient: LLMClient) {}

  /**
   * Determine relationship type and strength for a single feature-evidence pair
   * Uses LLM to analyze the relationship and assign type + strength
   *
   * @param featureId - Feature ID
   * @param evidenceId - Evidence ID
   * @returns Relationship determination result
   */
  async determineRelationship(
    featureId: string,
    evidenceId: string
  ): Promise<RelationshipProcessingResult> {
    if (!featureId || !evidenceId) {
      throw new InvalidDataError('Feature ID and Evidence ID are required');
    }

    logger.info({ featureId, evidenceId }, 'Determining relationship');

    try {
      // Get feature and evidence data
      const pair = await this.getFeatureEvidencePair(featureId, evidenceId);

      // Call LLM to determine relationship
      const result = await this.analyzeRelationship(
        pair.featureName,
        pair.evidenceContent,
        pair.evidenceType
      );

      // Update feature_evidence table
      await this.updateRelationship(featureId, evidenceId, result);

      logger.info(
        {
          featureId,
          evidenceId,
          relationshipType: result.relationshipType,
          strength: result.strength,
        },
        'Relationship determined successfully'
      );

      return {
        featureId,
        evidenceId,
        ...result,
      };
    } catch (error) {
      logger.error(
        {
          featureId,
          evidenceId,
          error: error instanceof Error ? error.message : String(error),
        },
        'Failed to determine relationship'
      );
      throw error;
    }
  }

  /**
   * Process all relationships for a feature using a single batched LLM call.
   * Sends all evidence items in one prompt instead of 1 call per pair.
   *
   * @param featureId - Feature ID to process
   * @returns Array of relationship processing results
   */
  async buildRelationshipsForFeature(
    featureId: string
  ): Promise<RelationshipProcessingResult[]> {
    if (!featureId) {
      throw new InvalidDataError('Feature ID is required');
    }

    logger.info({ featureId }, 'Building relationships for feature (batched)');

    try {
      // Get feature name
      const [feature] = await db
        .select({ id: features.id, name: features.name })
        .from(features)
        .where(eq(features.id, featureId));

      if (!feature) {
        throw new InvalidDataError(`Feature not found: ${featureId}`);
      }

      // Get all evidence linked to this feature
      const evidenceLinks = await db
        .select({ evidenceId: featureEvidence.evidenceId })
        .from(featureEvidence)
        .where(eq(featureEvidence.featureId, featureId));

      if (evidenceLinks.length === 0) {
        logger.warn({ featureId }, 'No evidence linked to feature');
        return [];
      }

      // Fetch full evidence data in one query
      const evidenceIds = evidenceLinks.map((link) => link.evidenceId);
      const evidenceItems = await db
        .select({ id: evidence.id, content: evidence.content, type: evidence.type })
        .from(evidence)
        .where(inArray(evidence.id, evidenceIds));

      if (evidenceItems.length === 0) {
        logger.warn({ featureId }, 'No evidence data found');
        return [];
      }

      logger.info(
        { featureId, evidenceCount: evidenceItems.length },
        'Classifying relationships in single LLM call'
      );

      // Single batched LLM call
      const prompt = buildBatchRelationshipPrompt(feature.name, evidenceItems);
      const response = await chatRateLimiter.schedule(() =>
        this.llmClient.chat({
          model: this.MODEL,
          messages: [{ role: 'user', content: prompt }],
          temperature: this.TEMPERATURE,
          responseFormat: { type: 'json_object' },
        })
      );

      if (!response.content) {
        throw new RetryableError('LLM returned empty response for batch relationship analysis');
      }

      // Parse batch response
      const results = this.parseBatchRelationshipResult(
        response.content,
        featureId,
        evidenceItems
      );

      // Update all relationships in database
      for (const result of results) {
        await this.updateRelationship(result.featureId, result.evidenceId, {
          relationshipType: result.relationshipType,
          strength: result.strength,
          reasoning: result.reasoning,
        });
      }

      // Log summary
      const typeDistribution = this.getTypeDistribution(results);
      logger.info(
        { featureId, total: results.length, distribution: typeDistribution },
        'Relationships built successfully (batched)'
      );

      return results;
    } catch (error) {
      logger.error(
        {
          featureId,
          error: error instanceof Error ? error.message : String(error),
        },
        'Failed to build relationships for feature'
      );
      throw error;
    }
  }

  /**
   * Process relationships for all candidate features
   * Batch processing across all features
   *
   * @returns Total number of relationships processed
   */
  async buildRelationshipsForAllFeatures(): Promise<number> {
    logger.info('Building relationships for all candidate features');

    try {
      // Get all candidate features
      const candidateFeatures = await db
        .select({ id: features.id })
        .from(features)
        .where(eq(features.status, 'candidate'));

      logger.info({ count: candidateFeatures.length }, 'Processing features');

      let totalProcessed = 0;

      // Process each feature
      for (const feature of candidateFeatures) {
        const results = await this.buildRelationshipsForFeature(feature.id);
        totalProcessed += results.length;
      }

      logger.info({ totalProcessed }, 'All relationships built successfully');
      return totalProcessed;
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error) },
        'Failed to build relationships for all features'
      );
      throw error;
    }
  }

  /**
   * Get feature and evidence data for analysis
   */
  private async getFeatureEvidencePair(
    featureId: string,
    evidenceId: string
  ): Promise<FeatureEvidencePair> {
    // Get feature
    const [feature] = await db
      .select({
        id: features.id,
        name: features.name,
      })
      .from(features)
      .where(eq(features.id, featureId));

    if (!feature) {
      throw new InvalidDataError(`Feature not found: ${featureId}`);
    }

    // Get evidence
    const [evidenceItem] = await db
      .select({
        id: evidence.id,
        content: evidence.content,
        type: evidence.type,
      })
      .from(evidence)
      .where(eq(evidence.id, evidenceId));

    if (!evidenceItem) {
      throw new InvalidDataError(`Evidence not found: ${evidenceId}`);
    }

    return {
      featureId,
      featureName: feature.name,
      evidenceId,
      evidenceContent: evidenceItem.content,
      evidenceType: evidenceItem.type,
    };
  }

  /**
   * Use LLM to analyze relationship between feature and evidence
   */
  private async analyzeRelationship(
    featureName: string,
    evidenceContent: string,
    evidenceType: string
  ): Promise<RelationshipResult> {
    // Build prompt
    const prompt = buildRelationshipPrompt(featureName, evidenceContent, evidenceType);

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
      throw new RetryableError('LLM returned empty response for relationship analysis');
    }

    // Parse response
    return this.parseRelationshipResult(response.content);
  }

  /**
   * Parse LLM response into RelationshipResult
   */
  private parseRelationshipResult(content: string): RelationshipResult {
    try {
      const parsed = JSON.parse(content) as {
        relationship_type: string;
        strength: number;
        reasoning: string;
      };

      // Validate relationship type
      const validTypes: RelationshipType[] = ['implements', 'supports', 'constrains', 'extends'];
      if (!validTypes.includes(parsed.relationship_type as RelationshipType)) {
        throw new InvalidDataError(
          `Invalid relationship type: ${parsed.relationship_type}`
        );
      }

      // Validate strength
      if (parsed.strength < 0 || parsed.strength > 1) {
        throw new InvalidDataError('Strength must be between 0 and 1');
      }

      return {
        relationshipType: parsed.relationship_type as RelationshipType,
        strength: parsed.strength,
        reasoning: parsed.reasoning,
      };
    } catch (error) {
      logger.error({ content, error }, 'Failed to parse relationship result');
      throw new InvalidDataError('Invalid JSON response from LLM for relationship analysis');
    }
  }

  /**
   * Parse batch LLM response into array of RelationshipProcessingResult.
   * Falls back to default values for evidence items not covered by the LLM response.
   */
  private parseBatchRelationshipResult(
    content: string,
    featureId: string,
    evidenceItems: Array<{ id: string; content: string; type: string }>
  ): RelationshipProcessingResult[] {
    const validTypes: RelationshipType[] = ['implements', 'supports', 'constrains', 'extends'];

    try {
      const parsed = JSON.parse(content) as {
        relationships: Array<{
          evidence_id: string;
          relationship_type: string;
          strength: number;
          reasoning: string;
        }>;
      };

      const responseMap = new Map<string, {
        relationship_type: string;
        strength: number;
        reasoning: string;
      }>();

      for (const rel of parsed.relationships ?? []) {
        if (rel.evidence_id) {
          responseMap.set(rel.evidence_id, rel);
        }
      }

      // Map results back to all evidence items, with fallbacks for missing entries
      return evidenceItems.map((item) => {
        const llmResult = responseMap.get(item.id);

        if (llmResult && validTypes.includes(llmResult.relationship_type as RelationshipType)) {
          return {
            featureId,
            evidenceId: item.id,
            relationshipType: llmResult.relationship_type as RelationshipType,
            strength: Math.max(0, Math.min(1, llmResult.strength)),
            reasoning: llmResult.reasoning || '',
          };
        }

        // Fallback: assign 'supports' with moderate strength if LLM missed this item
        logger.warn(
          { featureId, evidenceId: item.id },
          'LLM did not return result for evidence item, using fallback'
        );
        return {
          featureId,
          evidenceId: item.id,
          relationshipType: 'supports' as RelationshipType,
          strength: 0.5,
          reasoning: 'Relationship inferred by default (LLM did not classify this item)',
        };
      });
    } catch (error) {
      logger.error({ content, error }, 'Failed to parse batch relationship result');
      // If parsing completely fails, return defaults for all items
      return evidenceItems.map((item) => ({
        featureId,
        evidenceId: item.id,
        relationshipType: 'supports' as RelationshipType,
        strength: 0.5,
        reasoning: 'Relationship inferred by default (batch parse failure)',
      }));
    }
  }

  /**
   * Update feature_evidence table with relationship data
   */
  private async updateRelationship(
    featureId: string,
    evidenceId: string,
    result: RelationshipResult
  ): Promise<void> {
    await db
      .update(featureEvidence)
      .set({
        relationshipType: result.relationshipType,
        strength: result.strength.toFixed(2),
        reasoning: result.reasoning,
      })
      .where(
        and(
          eq(featureEvidence.featureId, featureId),
          eq(featureEvidence.evidenceId, evidenceId)
        )
      );
  }

  /**
   * Get distribution of relationship types for reporting
   */
  private getTypeDistribution(
    results: RelationshipProcessingResult[]
  ): Record<string, number> {
    const distribution: Record<RelationshipType, number> = {
      implements: 0,
      supports: 0,
      constrains: 0,
      extends: 0,
    };

    for (const result of results) {
      const count = distribution[result.relationshipType];
      if (count !== undefined) {
        distribution[result.relationshipType] = count + 1;
      }
    }

    return distribution;
  }

  /**
   * Get relationship statistics for a feature
   * Returns detailed breakdown of relationships
   *
   * @param featureId - Feature ID to analyze
   * @returns Relationship statistics
   */
  async getRelationshipStatistics(featureId: string): Promise<{
    total: number;
    byType: Record<RelationshipType, number>;
    averageStrength: number;
    strongestRelationships: Array<{
      evidenceId: string;
      relationshipType: RelationshipType;
      strength: number;
    }>;
  }> {
    // Get all relationships for feature
    const relationships = await db
      .select({
        evidenceId: featureEvidence.evidenceId,
        relationshipType: featureEvidence.relationshipType,
        strength: featureEvidence.strength,
      })
      .from(featureEvidence)
      .where(eq(featureEvidence.featureId, featureId));

    // Count by type
    const byType: Record<RelationshipType, number> = {
      implements: 0,
      supports: 0,
      constrains: 0,
      extends: 0,
    };

    let totalStrength = 0;

    for (const rel of relationships) {
      byType[rel.relationshipType as RelationshipType]++;
      totalStrength += parseFloat(rel.strength || '0');
    }

    // Get strongest relationships (top 5)
    const sorted = [...relationships].sort(
      (a, b) => parseFloat(b.strength || '0') - parseFloat(a.strength || '0')
    );

    const strongestRelationships = sorted.slice(0, 5).map((rel) => {
      const relType = rel.relationshipType;
      if (
        relType !== 'implements' &&
        relType !== 'supports' &&
        relType !== 'constrains' &&
        relType !== 'extends'
      ) {
        throw new InvalidDataError(`Invalid relationship type in database: ${relType}`);
      }

      return {
        evidenceId: rel.evidenceId,
        relationshipType: relType as RelationshipType,
        strength: parseFloat(rel.strength || '0'),
      };
    });

    return {
      total: relationships.length,
      byType,
      averageStrength:
        relationships.length > 0
          ? parseFloat((totalStrength / relationships.length).toFixed(2))
          : 0,
      strongestRelationships,
    };
  }
}

/**
 * Singleton instance
 */
export const relationshipBuilder = new RelationshipBuilder(openaiClient);
