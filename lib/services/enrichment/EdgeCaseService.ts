/**
 * Edge Case Service
 * Generates edge cases using LLM knowledge (GitHub/SO mining optional)
 * Follows Single Responsibility Principle - edge case generation only
 */

import type { LLMClient } from '@/lib/types/llm';
import type { EnrichmentSource, EdgeCase, EdgeCasePriority } from '@/lib/types/enrichment';
import type { Feature } from './EnrichmentOrchestrator';
import { logger } from '@/lib/utils/logger';
import { randomUUID } from 'crypto';
import { callLLMForJson } from '@/lib/utils/llm-helpers';
import { EdgeCasePrompts } from '@/lib/prompts/enrichment/EdgeCasePrompts';
import { EdgeCasesResponseSchema } from './schemas';

/**
 * Edge Case Generation Options
 */
export interface EdgeCaseOptions {
  limit?: number;
}

/**
 * Edge Case Service
 * Generates edge cases using LLM knowledge base
 * (GitHub/SO mining disabled to avoid external dependencies)
 */
export class EdgeCaseService {
  constructor(private llm: LLMClient) {}

  /**
   * Generate edge cases for a feature
   * Uses LLM knowledge base for comprehensive coverage
   */
  async generateEdgeCases(
    feature: Feature,
    options: EdgeCaseOptions = {}
  ): Promise<EnrichmentSource[]> {
    const limit = options.limit || 15;

    logger.info({ featureId: feature.id, limit }, 'Generating edge cases');

    // Generate edge cases using LLM
    const edgeCases = await this.generateFromLLM(feature, limit);

    // Convert to enrichment sources
    return this.convertToEnrichmentSources(feature.id, edgeCases);
  }

  /**
   * Generate edge cases from LLM knowledge
   */
  private async generateFromLLM(feature: Feature, limit: number): Promise<EdgeCase[]> {
    const prompt = EdgeCasePrompts.generateEdgeCases(feature, limit);
    const result = await callLLMForJson(
      this.llm,
      prompt,
      EdgeCasesResponseSchema,
      { temperature: 0.4, maxTokens: 4000 }
    );

    if (!result) {
      logger.error('Failed to generate edge cases from LLM');
      return [];
    }

    return result.edge_cases || [];
  }

  /**
   * Convert edge cases to enrichment sources
   */
  private convertToEnrichmentSources(
    featureId: string,
    edgeCases: EdgeCase[]
  ): EnrichmentSource[] {
    return edgeCases.map((ec, index) => {
      const priorityScore = this.getPriorityScore(ec.priority);

      return {
        id: randomUUID(),
        featureId,
        sourceType: 'edge_case' as const,
        sourceName: `Edge Case ${index + 1} (${ec.priority})`,
        content: `${ec.scenario}\n\nExpected: ${ec.expected_behavior}\n\nTest: ${ec.test_case}`,
        relevanceScore: priorityScore,
        mandatory: ec.priority === 'high',
        fetchedAt: new Date(),
        metadata: {
          category: ec.category,
          priority: ec.priority,
        },
      };
    });
  }

  /**
   * Get relevance score based on priority
   */
  private getPriorityScore(priority: EdgeCasePriority): number {
    switch (priority) {
      case 'high':
        return 0.9;
      case 'medium':
        return 0.7;
      case 'low':
        return 0.5;
      default:
        return 0.6;
    }
  }
}
