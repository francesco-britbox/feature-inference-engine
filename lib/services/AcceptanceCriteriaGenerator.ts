/**
 * Acceptance Criteria Generator
 * Single Responsibility: Generate testable acceptance criteria from evidence
 * Follows DIP: Depends on LLMClient abstraction
 */

import type { LLMClient } from '@/lib/types/llm';
import type { AcceptanceCriteria, GroupedEvidence } from '@/lib/types/output';
import { buildAcceptanceCriteriaPrompt } from '@/lib/prompts/assembly';
import { createLogger } from '@/lib/utils/logger';
import { InvalidDataError, RetryableError } from '@/lib/utils/errors';
import { OutputStorageService } from './OutputStorageService';

const logger = createLogger({ service: 'AcceptanceCriteriaGenerator' });

/**
 * Acceptance Criteria Generator
 * Formats edge cases and acceptance criteria into Given/When/Then format
 */
export class AcceptanceCriteriaGenerator {
  private readonly MODEL = 'gpt-4o';
  private readonly TEMPERATURE = 0.2;
  private readonly MAX_TOKENS = 3000;
  private readonly storageService: OutputStorageService;

  constructor(private llmClient: LLMClient) {
    this.storageService = new OutputStorageService();
  }

  /**
   * Generate acceptance criteria for a feature
   * @param featureId Feature UUID
   * @param featureName Feature name
   * @param groupedEvidence Evidence grouped by type
   * @returns Generated acceptance criteria
   */
  async generateCriteria(
    featureId: string,
    featureName: string,
    groupedEvidence: GroupedEvidence
  ): Promise<AcceptanceCriteria> {
    logger.info({ featureId, featureName }, 'Generating acceptance criteria');

    // Validate inputs
    if (!featureId || !featureName) {
      throw new InvalidDataError('Feature ID and name are required');
    }

    const { edge_case, acceptance_criteria } = groupedEvidence;

    // Check if we have any criteria evidence
    if (edge_case.length === 0 && acceptance_criteria.length === 0) {
      logger.warn({ featureId }, 'No acceptance criteria or edge case evidence found');
      return {
        scenarios: [],
        notes: ['No acceptance criteria evidence found for this feature'],
      };
    }

    try {
      // Build prompt
      const prompt = buildAcceptanceCriteriaPrompt(
        featureName,
        edge_case,
        acceptance_criteria
      );

      // Call LLM
      const response = await this.llmClient.chat({
        model: this.MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: this.TEMPERATURE,
        maxTokens: this.MAX_TOKENS,
        responseFormat: { type: 'json_object' },
      });

      if (!response.content) {
        throw new RetryableError('LLM returned empty response');
      }

      // Parse JSON response
      const criteria = JSON.parse(response.content) as AcceptanceCriteria;

      logger.info(
        {
          featureId,
          scenarioCount: criteria.scenarios?.length || 0,
          edgeCaseCount: criteria.edgeCases?.length || 0,
          tokenUsage: response.usage?.totalTokens,
        },
        'Acceptance criteria generated'
      );

      return criteria;
    } catch (error) {
      logger.error(
        {
          featureId,
          error: error instanceof Error ? error.message : String(error),
        },
        'Failed to generate acceptance criteria'
      );

      if (error instanceof SyntaxError) {
        throw new InvalidDataError('Failed to parse LLM response as JSON');
      }

      throw error;
    }
  }

  /**
   * Store acceptance criteria in database
   * @param featureId Feature UUID
   * @param criteria Acceptance criteria
   * @returns Output record ID
   */
  async storeCriteria(
    featureId: string,
    criteria: AcceptanceCriteria
  ): Promise<string> {
    return this.storageService.storeOutput(
      featureId,
      'acceptance_criteria',
      criteria as unknown as Record<string, unknown>
    );
  }

  /**
   * Generate and store acceptance criteria
   * @param featureId Feature UUID
   * @param featureName Feature name
   * @param groupedEvidence Evidence grouped by type
   * @returns Output record ID
   */
  async generateAndStore(
    featureId: string,
    featureName: string,
    groupedEvidence: GroupedEvidence
  ): Promise<string> {
    const criteria = await this.generateCriteria(
      featureId,
      featureName,
      groupedEvidence
    );
    const outputId = await this.storeCriteria(featureId, criteria);
    return outputId;
  }

  /**
   * Export acceptance criteria as JSON
   * @param criteria Acceptance criteria
   * @returns JSON string
   */
  exportAsJson(criteria: AcceptanceCriteria): string {
    return JSON.stringify(criteria, null, 2);
  }

  /**
   * Export acceptance criteria as Markdown
   * @param criteria Acceptance criteria
   * @returns Markdown string
   */
  exportAsMarkdown(criteria: AcceptanceCriteria): string {
    let markdown = '# Acceptance Criteria\n\n';

    // Scenarios
    if (criteria.scenarios && criteria.scenarios.length > 0) {
      markdown += '## Scenarios\n\n';

      for (let i = 0; i < criteria.scenarios.length; i++) {
        const scenario = criteria.scenarios[i];
        if (!scenario) continue;

        markdown += `### Scenario ${i + 1}\n\n`;
        markdown += `**Given:** ${scenario.given}\n\n`;
        markdown += `**When:** ${scenario.when}\n\n`;
        markdown += `**Then:** ${scenario.then}\n\n`;
      }
    }

    // Edge Cases
    if (criteria.edgeCases && criteria.edgeCases.length > 0) {
      markdown += '## Edge Cases\n\n';
      for (const edgeCase of criteria.edgeCases) {
        markdown += `- ${edgeCase}\n`;
      }
      markdown += '\n';
    }

    // Notes
    if (criteria.notes && criteria.notes.length > 0) {
      markdown += '## Notes\n\n';
      for (const note of criteria.notes) {
        markdown += `- ${note}\n`;
      }
      markdown += '\n';
    }

    return markdown;
  }
}
