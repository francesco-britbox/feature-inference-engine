/**
 * Requirements Synthesizer
 * Single Responsibility: Consolidate requirement evidence into coherent requirements document
 * Follows DIP: Depends on LLMClient abstraction
 */

import type { LLMClient } from '@/lib/types/llm';
import type { RequirementsDoc, GroupedEvidence } from '@/lib/types/output';
import { buildRequirementsPrompt } from '@/lib/prompts/assembly';
import { createLogger } from '@/lib/utils/logger';
import { InvalidDataError, RetryableError } from '@/lib/utils/errors';
import { OutputStorageService } from './OutputStorageService';

const logger = createLogger({ service: 'RequirementsSynthesizer' });

/**
 * Requirements Synthesizer
 * Consolidates requirement and constraint evidence into requirements document
 */
export class RequirementsSynthesizer {
  private readonly MODEL = 'gpt-4o';
  private readonly TEMPERATURE = 0.2;
  private readonly MAX_TOKENS = 3000;
  private readonly storageService: OutputStorageService;

  constructor(private llmClient: LLMClient) {
    this.storageService = new OutputStorageService();
  }

  /**
   * Synthesize requirements document for a feature
   * @param featureId Feature UUID
   * @param featureName Feature name
   * @param groupedEvidence Evidence grouped by type
   * @returns Generated requirements document
   */
  async synthesizeRequirements(
    featureId: string,
    featureName: string,
    groupedEvidence: GroupedEvidence
  ): Promise<RequirementsDoc> {
    logger.info({ featureId, featureName }, 'Synthesizing requirements');

    // Validate inputs
    if (!featureId || !featureName) {
      throw new InvalidDataError('Feature ID and name are required');
    }

    const { requirement, constraint } = groupedEvidence;

    // Check if we have requirement evidence
    if (requirement.length === 0) {
      logger.warn({ featureId }, 'No requirement evidence found');
      return {
        title: featureName,
        summary: 'No requirements evidence found for this feature',
        functionalRequirements: [],
      };
    }

    try {
      // Build prompt
      const prompt = buildRequirementsPrompt(featureName, requirement, constraint);

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
      const requirementsDoc = JSON.parse(response.content) as RequirementsDoc;

      logger.info(
        {
          featureId,
          functionalCount: requirementsDoc.functionalRequirements?.length || 0,
          nonFunctionalCount: requirementsDoc.nonFunctionalRequirements?.length || 0,
          tokenUsage: response.usage?.totalTokens,
        },
        'Requirements synthesized'
      );

      return requirementsDoc;
    } catch (error) {
      logger.error(
        {
          featureId,
          error: error instanceof Error ? error.message : String(error),
        },
        'Failed to synthesize requirements'
      );

      if (error instanceof SyntaxError) {
        throw new InvalidDataError('Failed to parse LLM response as JSON');
      }

      throw error;
    }
  }

  /**
   * Store requirements document in database
   * @param featureId Feature UUID
   * @param requirementsDoc Requirements document
   * @returns Output record ID
   */
  async storeRequirements(
    featureId: string,
    requirementsDoc: RequirementsDoc
  ): Promise<string> {
    return this.storageService.storeOutput(
      featureId,
      'requirements',
      requirementsDoc as unknown as Record<string, unknown>
    );
  }

  /**
   * Synthesize and store requirements document
   * @param featureId Feature UUID
   * @param featureName Feature name
   * @param groupedEvidence Evidence grouped by type
   * @returns Output record ID
   */
  async synthesizeAndStore(
    featureId: string,
    featureName: string,
    groupedEvidence: GroupedEvidence
  ): Promise<string> {
    const requirementsDoc = await this.synthesizeRequirements(
      featureId,
      featureName,
      groupedEvidence
    );
    const outputId = await this.storeRequirements(featureId, requirementsDoc);
    return outputId;
  }

  /**
   * Export requirements document as JSON
   * @param requirementsDoc Requirements document
   * @returns JSON string
   */
  exportAsJson(requirementsDoc: RequirementsDoc): string {
    return JSON.stringify(requirementsDoc, null, 2);
  }

  /**
   * Export requirements document as Markdown
   * @param requirementsDoc Requirements document
   * @returns Markdown string
   */
  exportAsMarkdown(requirementsDoc: RequirementsDoc): string {
    let markdown = `# ${requirementsDoc.title}\n\n`;

    // Summary
    markdown += '## Summary\n\n';
    markdown += `${requirementsDoc.summary}\n\n`;

    // Functional Requirements
    if (
      requirementsDoc.functionalRequirements &&
      requirementsDoc.functionalRequirements.length > 0
    ) {
      markdown += '## Functional Requirements\n\n';
      for (const req of requirementsDoc.functionalRequirements) {
        markdown += `- ${req}\n`;
      }
      markdown += '\n';
    }

    // Non-Functional Requirements
    if (
      requirementsDoc.nonFunctionalRequirements &&
      requirementsDoc.nonFunctionalRequirements.length > 0
    ) {
      markdown += '## Non-Functional Requirements\n\n';
      for (const req of requirementsDoc.nonFunctionalRequirements) {
        markdown += `- ${req}\n`;
      }
      markdown += '\n';
    }

    // Constraints
    if (requirementsDoc.constraints && requirementsDoc.constraints.length > 0) {
      markdown += '## Constraints\n\n';
      for (const constraint of requirementsDoc.constraints) {
        markdown += `- ${constraint}\n`;
      }
      markdown += '\n';
    }

    // Assumptions
    if (requirementsDoc.assumptions && requirementsDoc.assumptions.length > 0) {
      markdown += '## Assumptions\n\n';
      for (const assumption of requirementsDoc.assumptions) {
        markdown += `- ${assumption}\n`;
      }
      markdown += '\n';
    }

    // Dependencies
    if (requirementsDoc.dependencies && requirementsDoc.dependencies.length > 0) {
      markdown += '## Dependencies\n\n';
      for (const dependency of requirementsDoc.dependencies) {
        markdown += `- ${dependency}\n`;
      }
      markdown += '\n';
    }

    return markdown;
  }
}
