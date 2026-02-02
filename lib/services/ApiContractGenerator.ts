/**
 * API Contract Generator
 * Single Responsibility: Generate platform-agnostic API contracts from evidence
 * Follows DIP: Depends on LLMClient abstraction
 */

import type { LLMClient } from '@/lib/types/llm';
import type { ApiContract, GroupedEvidence } from '@/lib/types/output';
import { buildApiContractPrompt } from '@/lib/prompts/assembly';
import { createLogger } from '@/lib/utils/logger';
import { InvalidDataError, RetryableError } from '@/lib/utils/errors';
import { OutputStorageService } from './OutputStorageService';

const logger = createLogger({ service: 'ApiContractGenerator' });

/**
 * API Contract Generator
 * Synthesizes endpoint and payload evidence into platform-agnostic API contracts
 */
export class ApiContractGenerator {
  private readonly MODEL = 'gpt-4o';
  private readonly TEMPERATURE = 0.2;
  private readonly MAX_TOKENS = 3000;
  private readonly storageService: OutputStorageService;

  constructor(private llmClient: LLMClient) {
    this.storageService = new OutputStorageService();
  }

  /**
   * Generate API contract for a feature
   * @param featureId Feature UUID
   * @param featureName Feature name
   * @param groupedEvidence Evidence grouped by type
   * @returns Generated API contract
   */
  async generateContract(
    featureId: string,
    featureName: string,
    groupedEvidence: GroupedEvidence
  ): Promise<ApiContract> {
    logger.info({ featureId, featureName }, 'Generating API contract');

    // Validate inputs
    if (!featureId || !featureName) {
      throw new InvalidDataError('Feature ID and name are required');
    }

    const { endpoint, payload } = groupedEvidence;

    // Check if we have endpoint or payload evidence
    if (endpoint.length === 0 && payload.length === 0) {
      logger.warn({ featureId }, 'No endpoint or payload evidence found');
      return {
        endpoints: [],
        notes: ['No API evidence found for this feature'],
      };
    }

    try {
      // Build prompt
      const prompt = buildApiContractPrompt(featureName, endpoint, payload);

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
      const contract = JSON.parse(response.content) as ApiContract;

      logger.info(
        {
          featureId,
          endpointCount: contract.endpoints?.length || 0,
          tokenUsage: response.usage?.totalTokens,
        },
        'API contract generated'
      );

      return contract;
    } catch (error) {
      logger.error(
        {
          featureId,
          error: error instanceof Error ? error.message : String(error),
        },
        'Failed to generate API contract'
      );

      if (error instanceof SyntaxError) {
        throw new InvalidDataError('Failed to parse LLM response as JSON');
      }

      throw error;
    }
  }

  /**
   * Store API contract in database
   * @param featureId Feature UUID
   * @param contract API contract
   * @returns Output record ID
   */
  async storeContract(featureId: string, contract: ApiContract): Promise<string> {
    return this.storageService.storeOutput(
      featureId,
      'api_contract',
      contract as unknown as Record<string, unknown>
    );
  }

  /**
   * Generate and store API contract
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
    const contract = await this.generateContract(
      featureId,
      featureName,
      groupedEvidence
    );
    const outputId = await this.storeContract(featureId, contract);
    return outputId;
  }

  /**
   * Export API contract as JSON
   * @param contract API contract
   * @returns JSON string
   */
  exportAsJson(contract: ApiContract): string {
    return JSON.stringify(contract, null, 2);
  }

  /**
   * Export API contract as Markdown
   * @param contract API contract
   * @returns Markdown string
   */
  exportAsMarkdown(contract: ApiContract): string {
    let markdown = '# API Contract\n\n';

    // Authentication
    if (contract.authentication) {
      markdown += '## Authentication\n\n';
      markdown += `**Type:** ${contract.authentication.type}\n\n`;
      markdown += `${contract.authentication.description}\n\n`;
    }

    // Endpoints
    if (contract.endpoints && contract.endpoints.length > 0) {
      markdown += '## Endpoints\n\n';

      for (const endpoint of contract.endpoints) {
        markdown += `### ${endpoint.method} ${endpoint.path}\n\n`;
        markdown += `${endpoint.description}\n\n`;
        markdown += `**Authentication:** ${endpoint.auth}\n\n`;

        // Request
        if (endpoint.request) {
          markdown += '**Request:**\n\n';
          if (endpoint.request.body) {
            markdown += '- **Body:**\n';
            markdown += '```json\n';
            markdown += JSON.stringify(endpoint.request.body, null, 2);
            markdown += '\n```\n\n';
          }
          if (endpoint.request.query) {
            markdown += '- **Query Parameters:**\n';
            markdown += '```json\n';
            markdown += JSON.stringify(endpoint.request.query, null, 2);
            markdown += '\n```\n\n';
          }
        }

        // Response
        markdown += '**Response:**\n\n';
        for (const [status, schema] of Object.entries(endpoint.response)) {
          markdown += `- **${status}:**\n`;
          markdown += '```json\n';
          markdown += JSON.stringify(schema, null, 2);
          markdown += '\n```\n\n';
        }

        // Errors
        if (endpoint.errors && endpoint.errors.length > 0) {
          markdown += '**Errors:**\n\n';
          for (const error of endpoint.errors) {
            markdown += `- ${error}\n`;
          }
          markdown += '\n';
        }
      }
    }

    // Error Handling
    if (contract.errorHandling && contract.errorHandling.length > 0) {
      markdown += '## Error Handling\n\n';
      for (const rule of contract.errorHandling) {
        markdown += `- ${rule}\n`;
      }
      markdown += '\n';
    }

    // Notes
    if (contract.notes && contract.notes.length > 0) {
      markdown += '## Notes\n\n';
      for (const note of contract.notes) {
        markdown += `- ${note}\n`;
      }
      markdown += '\n';
    }

    return markdown;
  }
}
