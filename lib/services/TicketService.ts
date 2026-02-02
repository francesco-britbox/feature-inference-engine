/**
 * Ticket Service
 * Single Responsibility: Map features to Jira-compatible epics and stories
 * Follows SRP - only handles ticket generation logic
 */

import { db } from '@/lib/db/client';
import { features, featureOutputs, featureEvidence, evidence } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type { JiraEpic, JiraStory } from '@/lib/types/ticket';
import type { ApiContract, RequirementsDoc, AcceptanceCriteria } from '@/lib/types/output';
import type { EvidenceType } from '@/lib/types/evidence';
import type { Platform } from '@/lib/types/platform';
import { PLATFORM_NAMES, PLATFORM_TECH_STACKS } from '@/lib/types/platform';
import { SubtaskGenerator } from './SubtaskGenerator';
import { openaiClient } from '@/lib/ai/OpenAIClient';
import { createLogger } from '@/lib/utils/logger';
import { InvalidDataError, NotFoundError } from '@/lib/utils/errors';

const logger = createLogger({ service: 'TicketService' });

/**
 * Evidence item for story generation
 */
interface EvidenceItem {
  id: string;
  type: EvidenceType;
  content: string;
  relationshipType: string;
  strength: string | null;
}

/**
 * Ticket Service
 * Generates Jira-compatible epics and stories from features
 */
export class TicketService {
  private subtaskGenerator: SubtaskGenerator;

  constructor() {
    this.subtaskGenerator = new SubtaskGenerator(openaiClient);
  }
  /**
   * Generate epic from feature with optional platform targeting
   * @param featureId Feature UUID
   * @param platform Optional platform to target (web, ios, android, flutter, react-native)
   * @returns Complete Jira epic with stories
   */
  async generateEpic(featureId: string, platform?: Platform): Promise<JiraEpic> {
    logger.info({ featureId, platform }, 'Generating epic for feature');

    if (!featureId) {
      throw new InvalidDataError('Feature ID is required', 'featureId');
    }

    try {
      // Fetch feature
      const feature = await this.getFeature(featureId);

      // Fetch outputs (API contracts, requirements, acceptance criteria)
      const outputs = await this.getOutputs(featureId);

      // Fetch evidence for story generation
      const evidenceList = await this.getEvidence(featureId);

      // Generate stories from evidence (platform-aware)
      const stories = await this.generateStories(evidenceList, feature.name, platform);

      // Determine priority based on confidence score
      const priority = this.determinePriority(feature.confidenceScore);

      // Build epic description with platform notes
      const description = this.buildEpicDescription(feature, outputs, platform);

      // Build epic
      const epic: JiraEpic = {
        title: feature.name,
        description,
        acceptanceCriteria: outputs.acceptanceCriteria || { scenarios: [], notes: [] },
        apiContracts: outputs.apiContract,
        requirements: outputs.requirements,
        stories,
        labels: this.extractLabels(feature, platform),
        priority,
        platform,
      };

      logger.info(
        { featureId, platform, storiesCount: stories.length },
        'Epic generated successfully'
      );

      return epic;
    } catch (error) {
      logger.error(
        { featureId, error: error instanceof Error ? error.message : String(error) },
        'Failed to generate epic'
      );
      throw error;
    }
  }

  /**
   * Get feature from database
   * @param featureId Feature UUID
   * @returns Feature record
   */
  private async getFeature(
    featureId: string
  ): Promise<{ name: string; description: string | null; confidenceScore: string | null }> {
    const [feature] = await db
      .select({
        name: features.name,
        description: features.description,
        confidenceScore: features.confidenceScore,
      })
      .from(features)
      .where(eq(features.id, featureId));

    if (!feature) {
      throw new NotFoundError('Feature', featureId);
    }

    return feature;
  }

  /**
   * Get outputs for feature
   * @param featureId Feature UUID
   * @returns Feature outputs
   */
  private async getOutputs(featureId: string): Promise<{
    apiContract?: ApiContract;
    requirements?: RequirementsDoc;
    acceptanceCriteria?: AcceptanceCriteria;
  }> {
    const outputRecords = await db
      .select({
        outputType: featureOutputs.outputType,
        content: featureOutputs.content,
      })
      .from(featureOutputs)
      .where(eq(featureOutputs.featureId, featureId));

    const result: {
      apiContract?: ApiContract;
      requirements?: RequirementsDoc;
      acceptanceCriteria?: AcceptanceCriteria;
    } = {};

    for (const output of outputRecords) {
      if (output.outputType === 'api_contract') {
        result.apiContract = output.content as unknown as ApiContract;
      } else if (output.outputType === 'requirements') {
        result.requirements = output.content as unknown as RequirementsDoc;
      } else if (output.outputType === 'acceptance_criteria') {
        result.acceptanceCriteria = output.content as unknown as AcceptanceCriteria;
      }
    }

    return result;
  }

  /**
   * Get evidence for feature
   * @param featureId Feature UUID
   * @returns Evidence list
   */
  private async getEvidence(featureId: string): Promise<EvidenceItem[]> {
    const evidenceList = await db
      .select({
        id: evidence.id,
        type: evidence.type,
        content: evidence.content,
        relationshipType: featureEvidence.relationshipType,
        strength: featureEvidence.strength,
      })
      .from(evidence)
      .innerJoin(featureEvidence, eq(featureEvidence.evidenceId, evidence.id))
      .where(eq(featureEvidence.featureId, featureId));

    return evidenceList as EvidenceItem[];
  }

  /**
   * Build epic description with optional platform-specific notes
   * @param feature Feature data
   * @param outputs Feature outputs
   * @param platform Optional target platform
   * @returns Epic description
   */
  private buildEpicDescription(
    feature: { name: string; description: string | null },
    outputs: {
      apiContract?: ApiContract;
      requirements?: RequirementsDoc;
      acceptanceCriteria?: AcceptanceCriteria;
    },
    platform?: Platform
  ): string {
    const parts: string[] = [];

    // Platform targeting note
    if (platform) {
      parts.push(`**Target Platform**: ${PLATFORM_NAMES[platform]}`);
      parts.push('');
    }

    // Feature description
    if (feature.description) {
      parts.push(feature.description);
      parts.push('');
    }

    // Platform-specific tech stack
    if (platform) {
      const techStack = PLATFORM_TECH_STACKS[platform];
      if (techStack && techStack.length > 0) {
        parts.push('## Technology Stack');
        parts.push(techStack.join(', '));
        parts.push('');
      }
    }

    // Requirements summary
    if (outputs.requirements) {
      parts.push('## Requirements');
      parts.push(outputs.requirements.summary);
      parts.push('');
    }

    // API contracts summary
    if (outputs.apiContract && outputs.apiContract.endpoints.length > 0) {
      parts.push('## API Endpoints');
      for (const endpoint of outputs.apiContract.endpoints) {
        parts.push(`- ${endpoint.method} ${endpoint.path}: ${endpoint.description}`);
      }
      parts.push('');
    }

    return parts.join('\n');
  }

  /**
   * Generate stories from evidence with optional platform targeting and subtasks
   * @param evidenceList Evidence items
   * @param featureName Feature name for context
   * @param platform Optional target platform
   * @returns Generated stories with subtasks
   */
  private async generateStories(
    evidenceList: EvidenceItem[],
    featureName: string,
    platform?: Platform
  ): Promise<JiraStory[]> {
    // Group evidence by type
    const grouped = this.groupEvidenceByType(evidenceList);

    const stories: JiraStory[] = [];

    // Generate UI story if we have UI elements
    if (grouped.ui_element.length > 0) {
      const uiTitle = platform
        ? `${featureName} - ${PLATFORM_NAMES[platform]} UI Implementation`
        : `${featureName} - User Interface`;

      stories.push({
        title: uiTitle,
        description: this.buildUiStoryDescription(grouped.ui_element, platform),
        acceptanceCriteria: this.buildUiAcceptanceCriteria(grouped.ui_element),
        storyPoints: this.estimateStoryPoints(grouped.ui_element),
        labels: platform ? ['ui', 'frontend', platform] : ['ui', 'frontend'],
        priority: 'High',
        evidenceIds: grouped.ui_element.map((e) => e.id),
      });
    }

    // Generate API story if we have endpoints/payloads
    if (grouped.endpoint.length > 0 || grouped.payload.length > 0) {
      const apiEvidence = [...grouped.endpoint, ...grouped.payload];
      stories.push({
        title: `${featureName} - API Implementation`,
        description: this.buildApiStoryDescription(apiEvidence),
        acceptanceCriteria: this.buildApiAcceptanceCriteria(apiEvidence),
        storyPoints: this.estimateStoryPoints(apiEvidence),
        labels: ['api', 'backend'],
        priority: 'High',
        evidenceIds: apiEvidence.map((e) => e.id),
      });
    }

    // Generate testing story if we have edge cases or acceptance criteria
    if (grouped.edge_case.length > 0 || grouped.acceptance_criteria.length > 0) {
      const testEvidence = [...grouped.edge_case, ...grouped.acceptance_criteria];
      stories.push({
        title: `${featureName} - Testing & Validation`,
        description: this.buildTestStoryDescription(testEvidence),
        acceptanceCriteria: this.buildTestAcceptanceCriteria(testEvidence),
        storyPoints: this.estimateStoryPoints(testEvidence),
        labels: ['testing', 'qa'],
        priority: 'Medium',
        evidenceIds: testEvidence.map((e) => e.id),
      });
    }

    // Generate flow story if we have user flows
    if (grouped.flow.length > 0) {
      stories.push({
        title: `${featureName} - User Flow`,
        description: this.buildFlowStoryDescription(grouped.flow),
        acceptanceCriteria: this.buildFlowAcceptanceCriteria(grouped.flow),
        storyPoints: this.estimateStoryPoints(grouped.flow),
        labels: ['flow', 'ux'],
        priority: 'Medium',
        evidenceIds: grouped.flow.map((e) => e.id),
      });
    }

    // Generate subtasks for each story if platform is specified
    if (platform) {
      for (const story of stories) {
        try {
          const subtasks = await this.subtaskGenerator.generateSubtasks(story, platform);
          story.subtasks = subtasks;
        } catch (error) {
          logger.warn(
            {
              storyTitle: story.title,
              platform,
              error: error instanceof Error ? error.message : String(error),
            },
            'Failed to generate subtasks for story, continuing without subtasks'
          );
          // Continue without subtasks (not critical for epic generation)
        }
      }
    }

    logger.debug({ storiesCount: stories.length }, 'Stories generated');

    return stories;
  }

  /**
   * Group evidence by type
   * @param evidenceList Evidence items
   * @returns Grouped evidence
   */
  private groupEvidenceByType(
    evidenceList: EvidenceItem[]
  ): Record<EvidenceType, EvidenceItem[]> {
    const grouped: Record<string, EvidenceItem[]> = {
      endpoint: [],
      payload: [],
      requirement: [],
      edge_case: [],
      acceptance_criteria: [],
      ui_element: [],
      flow: [],
      bug: [],
      constraint: [],
    };

    for (const item of evidenceList) {
      if (item.type in grouped) {
        grouped[item.type]!.push(item);
      }
    }

    return grouped as Record<EvidenceType, EvidenceItem[]>;
  }

  /**
   * Build UI story description with optional platform-specific notes
   */
  private buildUiStoryDescription(items: EvidenceItem[], platform?: Platform): string {
    const parts = [
      'Implement user interface components for this feature.',
      '',
    ];

    // Add platform-specific tech stack
    if (platform) {
      const techStack = PLATFORM_TECH_STACKS[platform];
      parts.push(`**Platform**: ${PLATFORM_NAMES[platform]}`);
      parts.push(`**Tech Stack**: ${techStack.join(', ')}`);
      parts.push('');
    }

    parts.push('## UI Elements');

    for (const item of items) {
      parts.push(`- ${item.content}`);
    }

    return parts.join('\n');
  }

  /**
   * Build UI acceptance criteria
   */
  private buildUiAcceptanceCriteria(items: EvidenceItem[]): string[] {
    return items.map((item) => `UI element present: ${item.content}`);
  }

  /**
   * Build API story description
   */
  private buildApiStoryDescription(items: EvidenceItem[]): string {
    const parts = [
      'Implement API endpoints and data models for this feature.',
      '',
      '## Endpoints & Payloads',
    ];

    for (const item of items) {
      parts.push(`- ${item.content}`);
    }

    return parts.join('\n');
  }

  /**
   * Build API acceptance criteria
   */
  private buildApiAcceptanceCriteria(items: EvidenceItem[]): string[] {
    return items.map((item) => `API implemented: ${item.content}`);
  }

  /**
   * Build test story description
   */
  private buildTestStoryDescription(items: EvidenceItem[]): string {
    const parts = [
      'Implement tests and validation for this feature.',
      '',
      '## Test Cases',
    ];

    for (const item of items) {
      parts.push(`- ${item.content}`);
    }

    return parts.join('\n');
  }

  /**
   * Build test acceptance criteria
   */
  private buildTestAcceptanceCriteria(items: EvidenceItem[]): string[] {
    return items.map((item) => `Test case passes: ${item.content}`);
  }

  /**
   * Build flow story description
   */
  private buildFlowStoryDescription(items: EvidenceItem[]): string {
    const parts = [
      'Implement user flows for this feature.',
      '',
      '## User Flows',
    ];

    for (const item of items) {
      parts.push(`- ${item.content}`);
    }

    return parts.join('\n');
  }

  /**
   * Build flow acceptance criteria
   */
  private buildFlowAcceptanceCriteria(items: EvidenceItem[]): string[] {
    return items.map((item) => `User flow works: ${item.content}`);
  }

  /**
   * Estimate story points based on evidence count
   * @param items Evidence items
   * @returns Story points (1, 2, 3, 5, 8)
   */
  private estimateStoryPoints(items: EvidenceItem[]): number {
    const count = items.length;
    if (count <= 2) return 1;
    if (count <= 4) return 2;
    if (count <= 6) return 3;
    if (count <= 10) return 5;
    return 8;
  }

  /**
   * Determine priority based on confidence score
   * @param confidenceScore Confidence score
   * @returns Priority level
   */
  private determinePriority(
    confidenceScore: string | null
  ): 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest' {
    const score = parseFloat(confidenceScore || '0');
    if (score >= 0.9) return 'Highest';
    if (score >= 0.75) return 'High';
    if (score >= 0.6) return 'Medium';
    if (score >= 0.4) return 'Low';
    return 'Lowest';
  }

  /**
   * Extract labels from feature metadata with optional platform label
   * @param feature Feature data
   * @param platform Optional target platform
   * @returns Labels array
   */
  private extractLabels(feature: { name: string }, platform?: Platform): string[] {
    const labels: string[] = [];

    // Add platform label
    if (platform) {
      labels.push(platform);
    }

    // Add labels based on feature name
    const name = feature.name.toLowerCase();
    if (name.includes('login') || name.includes('auth')) labels.push('authentication');
    if (name.includes('payment')) labels.push('payment');
    if (name.includes('user')) labels.push('user-management');
    if (name.includes('search')) labels.push('search');
    if (name.includes('notification')) labels.push('notifications');

    return labels;
  }
}
