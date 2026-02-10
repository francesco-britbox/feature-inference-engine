/**
 * Ticket Service
 * Single Responsibility: Map features to Jira-compatible epics and stories
 * Follows SRP - only handles ticket generation logic
 */

import { db } from '@/lib/db/client';
import { features, featureOutputs, featureEvidence, evidence, enrichmentSources, ticketConfig } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import type {
  JiraEpic,
  JiraEpicFull,
  JiraStory,
  JiraStoryFull,
  JiraSubtask,
  UserStoryNarrative,
  AcceptanceCriterionStructured,
  LegalConsideration,
  AccessibilityConsideration,
  PlatformNote,
  ExternalDependency,
} from '@/lib/types/ticket';
import type { ApiContract, RequirementsDoc, AcceptanceCriteria } from '@/lib/types/output';
import type { EvidenceType } from '@/lib/types/evidence';
import type { Platform } from '@/lib/types/platform';
import type { LLMClient } from '@/lib/types/llm';
import type { TicketConfig, PlatformCheckbox, RegionEntry } from '@/lib/types/ticketConfig';
import { DEFAULT_TICKET_CONFIG } from '@/lib/types/ticketConfig';
import { PLATFORM_NAMES, PLATFORM_TECH_STACKS } from '@/lib/types/platform';
import { SubtaskGenerator } from './SubtaskGenerator';
import { openaiClient } from '@/lib/ai/OpenAIClient';
import { buildUserStoryPrompt } from '@/lib/prompts/userStory';
import { buildAcceptanceCriteriaPrompt } from '@/lib/prompts/acceptanceCriteria';
import { KeyGenerator } from '@/lib/utils/keyGenerator';
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
  private llmClient: LLMClient;

  constructor(llmClient?: LLMClient) {
    this.llmClient = llmClient || openaiClient;
    this.subtaskGenerator = new SubtaskGenerator(this.llmClient);
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
      // Fetch feature WITH hierarchy fields
      const feature = await this.getFeatureWithType(featureId);

      // CRITICAL: Only epic-type features can be exported as epics
      if (feature.featureType !== 'epic') {
        throw new InvalidDataError(
          `Feature "${feature.name}" is type "${feature.featureType}", not "epic". Only epic-type features can be exported as Jira epics. Did you mean to export the parent feature?`,
          'featureType'
        );
      }

      // Get child features (stories under this epic)
      const childFeatures = await this.getChildFeatures(featureId);

      // Fetch outputs (API contracts, requirements, acceptance criteria)
      const outputs = await this.getOutputs(featureId);

      // Generate stories based on hierarchy
      let stories: JiraStory[];

      if (childFeatures.length > 0) {
        // NEW PATH: Generate stories from child features
        logger.info(
          { featureId, childCount: childFeatures.length },
          'Generating stories from child features'
        );
        stories = await this.generateStoriesFromChildren(childFeatures, platform);
      } else {
        // BACKWARD COMPATIBILITY: No children → use evidence types
        logger.info(
          { featureId },
          'No child features found, generating stories from evidence types (legacy mode)'
        );
        const evidenceList = await this.getEvidence(featureId);
        stories = await this.generateStories(evidenceList, feature.name, platform);
      }

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
        {
          featureId,
          platform,
          storiesCount: stories.length,
          mode: childFeatures.length > 0 ? 'hierarchical' : 'legacy',
        },
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
   * Get feature WITH hierarchy fields
   * @param featureId Feature UUID
   * @returns Feature record with hierarchy fields
   */
  private async getFeatureWithType(
    featureId: string
  ): Promise<{
    name: string;
    description: string | null;
    confidenceScore: string | null;
    featureType: string;
    parentId: string | null;
  }> {
    const [feature] = await db
      .select({
        name: features.name,
        description: features.description,
        confidenceScore: features.confidenceScore,
        featureType: features.featureType,
        parentId: features.parentId,
      })
      .from(features)
      .where(eq(features.id, featureId));

    if (!feature) {
      throw new NotFoundError('Feature', featureId);
    }

    return feature;
  }

  /**
   * Get child features (stories under an epic)
   * @param parentId Parent feature ID
   * @returns Array of child features
   */
  private async getChildFeatures(
    parentId: string
  ): Promise<
    Array<{
      id: string;
      name: string;
      description: string | null;
      confidenceScore: string | null;
      featureType: string;
    }>
  > {
    const children = await db
      .select({
        id: features.id,
        name: features.name,
        description: features.description,
        confidenceScore: features.confidenceScore,
        featureType: features.featureType,
      })
      .from(features)
      .where(eq(features.parentId, parentId));

    logger.debug({ parentId, childCount: children.length }, 'Fetched child features');

    return children;
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
   * Get evidence items by their IDs
   */
  private async getEvidenceByIds(ids: string[]): Promise<Array<{ type: string; content: string }>> {
    if (ids.length === 0) return [];

    const rows = await db
      .select({ type: evidence.type, content: evidence.content })
      .from(evidence)
      .where(inArray(evidence.id, ids));

    return rows;
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
   * Generate Jira stories from child features (hierarchical mode)
   * Each child feature becomes a story with evidence-based subtasks
   * @param childFeatures Child features (stories)
   * @param platform Optional target platform
   * @returns Generated stories with subtasks
   */
  private async generateStoriesFromChildren(
    childFeatures: Array<{
      id: string;
      name: string;
      description: string | null;
      confidenceScore: string | null;
    }>,
    platform?: Platform
  ): Promise<JiraStory[]> {
    const stories: JiraStory[] = [];

    for (const child of childFeatures) {
      // Get evidence for this child feature
      const childEvidence = await this.getEvidence(child.id);

      // Group evidence by type
      const grouped = this.groupEvidenceByType(childEvidence);

      // Build story description from evidence
      const description = this.buildStoryDescriptionFromEvidence(child, grouped, platform);

      // Build acceptance criteria from evidence
      const acceptanceCriteria = this.buildAcceptanceCriteriaFromEvidence(grouped);

      // Estimate story points
      const storyPoints = this.estimateStoryPoints(childEvidence);

      // Generate subtasks from evidence (evidence becomes subtasks, not stories)
      let subtasks: JiraSubtask[] = [];
      if (platform) {
        try {
          // Create story object for subtask generation
          const storyForSubtasks: JiraStory = {
            title: child.name,
            description,
            acceptanceCriteria,
            storyPoints,
            labels: [],
            priority: 'Medium',
            evidenceIds: childEvidence.map((e) => e.id),
          };

          subtasks = await this.subtaskGenerator.generateSubtasks(storyForSubtasks, platform);
        } catch (error) {
          logger.warn(
            {
              childFeature: child.name,
              error: error instanceof Error ? error.message : String(error),
            },
            'Failed to generate subtasks, continuing without them'
          );
        }
      }

      // Create story
      stories.push({
        title: child.name, // Use child feature name directly (e.g., "User Login")
        description,
        acceptanceCriteria,
        subtasks,
        storyPoints,
        labels: platform ? [platform, 'feature-story'] : ['feature-story'],
        priority: this.determinePriority(child.confidenceScore),
        evidenceIds: childEvidence.map((e) => e.id),
      });
    }

    return stories;
  }

  /**
   * Build story description from evidence items
   * @param child Child feature
   * @param grouped Grouped evidence
   * @param platform Optional target platform
   * @returns Story description
   */
  private buildStoryDescriptionFromEvidence(
    child: { name: string; description: string | null },
    grouped: Record<EvidenceType, EvidenceItem[]>,
    platform?: Platform
  ): string {
    const parts: string[] = [];

    // Story introduction
    parts.push(child.description || `Implement ${child.name} functionality.`);
    parts.push('');

    // Platform-specific note
    if (platform) {
      parts.push(`**Platform**: ${PLATFORM_NAMES[platform]}`);
      parts.push(`**Tech Stack**: ${PLATFORM_TECH_STACKS[platform].join(', ')}`);
      parts.push('');
    }

    // Evidence sections
    if (grouped.endpoint.length > 0) {
      parts.push('## API Endpoints');
      grouped.endpoint.forEach((e) => parts.push(`- ${e.content}`));
      parts.push('');
    }

    if (grouped.ui_element.length > 0) {
      parts.push('## UI Elements');
      grouped.ui_element.forEach((e) => parts.push(`- ${e.content}`));
      parts.push('');
    }

    if (grouped.requirement.length > 0) {
      parts.push('## Requirements');
      grouped.requirement.forEach((e) => parts.push(`- ${e.content}`));
      parts.push('');
    }

    return parts.join('\n');
  }

  /**
   * Build acceptance criteria from all evidence types
   * @param grouped Grouped evidence
   * @returns Array of acceptance criteria strings
   */
  private buildAcceptanceCriteriaFromEvidence(
    grouped: Record<EvidenceType, EvidenceItem[]>
  ): string[] {
    const criteria: string[] = [];

    // From explicit acceptance criteria
    grouped.acceptance_criteria.forEach((e) => {
      criteria.push(e.content);
    });

    // From endpoints
    grouped.endpoint.forEach((e) => {
      criteria.push(`API endpoint implemented: ${e.content}`);
    });

    // From UI elements
    grouped.ui_element.forEach((e) => {
      criteria.push(`UI element present: ${e.content}`);
    });

    // From edge cases
    grouped.edge_case.forEach((e) => {
      criteria.push(`Edge case handled: ${e.content}`);
    });

    return criteria;
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

  // ===== Full Template Generation Methods =====

  /**
   * Generate a full-template epic (JiraEpicFull) with enrichment data
   * This is the primary method for template-based export
   */
  async generateEpicFull(featureId: string, platform?: Platform): Promise<JiraEpicFull> {
    logger.info({ featureId, platform }, 'Generating full-template epic');

    // Generate the base epic first (reuse existing logic)
    const epic = await this.generateEpic(featureId, platform);

    // Load ticket config
    const config = await this.getTicketConfig();

    // Load enrichment data for this feature
    const enrichment = await this.getEnrichmentData(featureId);

    // Map enrichment to template sections
    const enrichmentSections = this.mapEnrichmentToTemplateSections(enrichment);

    // Generate keys with persistent counter
    const totalKeysNeeded = 1 + epic.stories.length; // 1 epic + N stories
    const startCounter = config.keyCounter;
    await this.incrementKeyCounter(config.id, startCounter + totalKeysNeeded);

    const epicKeyGen = new KeyGenerator(config.projectKey, startCounter);
    const epicKey = epicKeyGen.nextKey();
    const storyKeyGen = new KeyGenerator(config.projectKey, startCounter + 1);

    // Load outputs for this feature (API contracts, requirements, etc.)
    const outputs = await this.getOutputs(featureId);

    // Build story.title → childFeature.id map for enrichment lookups
    const childFeatures = await this.getChildFeatures(featureId);
    const storyToChildFeatureId = new Map<string, string>();
    for (const child of childFeatures) {
      storyToChildFeatureId.set(child.name, child.id);
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });

    // Generate full stories
    const storiesFull: JiraStoryFull[] = [];
    for (const story of epic.stories) {
      const storyKey = storyKeyGen.nextKey();
      const childFeatureId = storyToChildFeatureId.get(story.title);

      // Fetch actual evidence content for LLM context
      const storyEvidence = await this.getEvidenceByIds(story.evidenceIds);
      const evidenceSummary = storyEvidence.length > 0
        ? storyEvidence.slice(0, 10).map(e => `- [${e.type}] ${e.content}`).join('\n')
        : story.description;

      // Generate user story narrative via LLM (with retry + cache)
      const userStory = await this.generateUserStoryNarrative(
        story.title,
        story.description,
        evidenceSummary,
        childFeatureId
      );

      // Structure acceptance criteria via LLM (with regex fallback)
      const structuredAC = await this.structureAcceptanceCriteriaViaLLM(
        story.title,
        story.acceptanceCriteria,
        evidenceSummary
      );

      // Build HLR references from requirements evidence (DB + regex fallback)
      const hlrReferences = await this.extractHlrReferences(story, childFeatureId);

      // Build API endpoints table (contract primary, regex fallback)
      const contractEndpoints = this.extractApiEndpointsFromContract(outputs.apiContract);
      const apiEndpoints = contractEndpoints.length > 0
        ? contractEndpoints
        : this.extractApiEndpoints(story);

      // Use child-feature-specific enrichment if available, otherwise epic-level
      let storyEnrichment = enrichmentSections;
      if (childFeatureId) {
        const childEnrichmentData = await this.getEnrichmentData(childFeatureId);
        if (childEnrichmentData.length > 0) {
          storyEnrichment = this.mapEnrichmentToTemplateSections(childEnrichmentData);
        }
      }

      // Infer story dependencies from flow evidence
      const storyDependencies = await this.inferStoryDependencies(childFeatureId);

      const storyFull: JiraStoryFull = {
        // Base JiraStory fields
        ...story,
        // Template-specific fields
        storyKey,
        epicKey,
        epicName: epic.title,
        userStory,
        hlrReferences,
        platforms: config.targetPlatforms as PlatformCheckbox[],
        regions: config.targetRegions as RegionEntry[],
        structuredAC,
        legalConsiderations: storyEnrichment.legal,
        accessibilityConsiderations: storyEnrichment.accessibility,
        testingRequirements: storyEnrichment.testing,
        apiEndpoints,
        platformNotes: storyEnrichment.platform,
        securityStandards: storyEnrichment.security,
        externalDependencies: storyEnrichment.dependencies,
        createdDate: dateStr,
        status: 'To Do',
        project: config.projectName,
        reporter: config.reporter,
        storyDependencies,
      };

      storiesFull.push(storyFull);
    }

    const epicFull: JiraEpicFull = {
      // Base JiraEpic fields
      ...epic,
      // Template-specific fields
      epicKey,
      projectKey: config.projectKey,
      projectName: config.projectName,
      createdDate: dateStr,
      updatedDate: dateStr,
      reporter: config.reporter,
      storiesFull,
      legalConsiderations: enrichmentSections.legal,
      accessibilityConsiderations: enrichmentSections.accessibility,
      securityStandards: enrichmentSections.security,
      platformNotes: enrichmentSections.platform,
      externalDependencies: enrichmentSections.dependencies,
    };

    logger.info(
      { featureId, epicKey, storiesCount: storiesFull.length },
      'Full-template epic generated'
    );

    return epicFull;
  }

  /**
   * Load ticket configuration from DB, or return defaults
   */
  async getTicketConfig(): Promise<TicketConfig> {
    const [config] = await db.select().from(ticketConfig).limit(1);

    if (!config) {
      return {
        id: 'default',
        ...DEFAULT_TICKET_CONFIG,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    return {
      id: config.id,
      projectKey: config.projectKey,
      projectName: config.projectName,
      reporter: config.reporter,
      defaultPriority: config.defaultPriority as TicketConfig['defaultPriority'],
      targetPlatforms: (config.targetPlatforms || DEFAULT_TICKET_CONFIG.targetPlatforms) as PlatformCheckbox[],
      targetRegions: (config.targetRegions || DEFAULT_TICKET_CONFIG.targetRegions) as RegionEntry[],
      sprintName: config.sprintName,
      toolName: config.toolName,
      authorName: config.authorName,
      keyCounter: config.keyCounter,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }

  /**
   * Atomically increment the key counter in the ticket config
   */
  private async incrementKeyCounter(configId: string, newCounter: number): Promise<void> {
    if (configId === 'default') {
      // No config row yet — insert one with the new counter
      await db.insert(ticketConfig).values({
        ...DEFAULT_TICKET_CONFIG,
        keyCounter: newCounter,
      });
    } else {
      await db
        .update(ticketConfig)
        .set({ keyCounter: newCounter, updatedAt: new Date() })
        .where(eq(ticketConfig.id, configId));
    }
  }

  /**
   * Fetch enrichment data for a feature from enrichment_sources table
   */
  private async getEnrichmentData(
    featureId: string
  ): Promise<Array<{ sourceType: string; sourceName: string; content: string; mandatory: boolean }>> {
    const sources = await db
      .select({
        sourceType: enrichmentSources.sourceType,
        sourceName: enrichmentSources.sourceName,
        content: enrichmentSources.content,
        mandatory: enrichmentSources.mandatory,
      })
      .from(enrichmentSources)
      .where(eq(enrichmentSources.featureId, featureId));

    return sources;
  }

  /**
   * Generate user story narrative (As a / I want / So that) via LLM
   * With cache lookup, retry (2 attempts), and shape validation
   */
  private async generateUserStoryNarrative(
    featureName: string,
    description: string,
    evidenceSummary: string,
    childFeatureId?: string
  ): Promise<UserStoryNarrative | null> {
    // Check cache first
    if (childFeatureId) {
      const cached = await this.getCachedUserStoryNarrative(childFeatureId);
      if (cached) {
        logger.debug({ featureName, childFeatureId }, 'Using cached user story narrative');
        return cached;
      }
    }

    const maxAttempts = 2;
    const retryDelayMs = 2000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const prompt = buildUserStoryPrompt(featureName, description, evidenceSummary);

        const response = await this.llmClient.chat({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          responseFormat: { type: 'json_object' },
        });

        if (!response.content) {
          if (attempt < maxAttempts) {
            logger.debug({ featureName, attempt }, 'Empty LLM response, retrying');
            await this.delay(retryDelayMs);
            continue;
          }
          return null;
        }

        const parsed = JSON.parse(response.content) as Record<string, unknown>;

        // Validate shape
        if (
          typeof parsed.persona !== 'string' || !parsed.persona ||
          typeof parsed.action !== 'string' || !parsed.action ||
          typeof parsed.benefit !== 'string' || !parsed.benefit
        ) {
          if (attempt < maxAttempts) {
            logger.debug({ featureName, attempt, parsed }, 'Invalid narrative shape, retrying');
            await this.delay(retryDelayMs);
            continue;
          }
          logger.warn({ featureName, parsed }, 'Invalid narrative shape after all attempts');
          return null;
        }

        const narrative: UserStoryNarrative = {
          persona: parsed.persona as string,
          action: parsed.action as string,
          benefit: parsed.benefit as string,
        };

        // Cache the result
        if (childFeatureId) {
          await this.cacheUserStoryNarrative(childFeatureId, narrative);
        }

        return narrative;
      } catch (error) {
        if (attempt < maxAttempts) {
          logger.debug(
            { featureName, attempt, error: error instanceof Error ? error.message : String(error) },
            'LLM call failed, retrying'
          );
          await this.delay(retryDelayMs);
          continue;
        }
        logger.warn(
          { featureName, error: error instanceof Error ? error.message : String(error) },
          'Failed to generate user story narrative after all attempts'
        );
        return null;
      }
    }

    return null;
  }

  /**
   * Look up a cached user story narrative from featureOutputs
   */
  private async getCachedUserStoryNarrative(childFeatureId: string): Promise<UserStoryNarrative | null> {
    const [cached] = await db
      .select({ content: featureOutputs.content })
      .from(featureOutputs)
      .where(
        and(
          eq(featureOutputs.featureId, childFeatureId),
          eq(featureOutputs.outputType, 'user_story_narrative')
        )
      )
      .limit(1);

    if (!cached) return null;

    const data = cached.content as unknown as UserStoryNarrative;
    if (data && typeof data.persona === 'string' && typeof data.action === 'string' && typeof data.benefit === 'string') {
      return data;
    }
    return null;
  }

  /**
   * Cache a user story narrative in featureOutputs
   */
  private async cacheUserStoryNarrative(childFeatureId: string, narrative: UserStoryNarrative): Promise<void> {
    try {
      await db.insert(featureOutputs).values({
        featureId: childFeatureId,
        outputType: 'user_story_narrative',
        content: narrative as unknown as Record<string, unknown>,
      });
    } catch (error) {
      logger.debug(
        { childFeatureId, error: error instanceof Error ? error.message : String(error) },
        'Failed to cache user story narrative (non-critical)'
      );
    }
  }

  /**
   * Promise-based delay for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Convert plain acceptance criteria strings into structured Given/When/Then format
   */
  private structureAcceptanceCriteria(
    plainCriteria: string[]
  ): AcceptanceCriterionStructured[] {
    return plainCriteria.map((criterion, index) => {
      // Try to parse if already in Given/When/Then format
      const givenMatch = criterion.match(/Given\s+(.+?)(?:\s+When\s+|\s*$)/i);
      const whenMatch = criterion.match(/When\s+(.+?)(?:\s+Then\s+|\s*$)/i);
      const thenMatch = criterion.match(/Then\s+(.+)/i);

      if (givenMatch && whenMatch && thenMatch) {
        return {
          number: index + 1,
          title: this.generateAcTitle(criterion),
          given: givenMatch[1]!.trim(),
          when: whenMatch[1]!.trim(),
          then: thenMatch[1]!.trim(),
        };
      }

      // For non-GWT criteria, wrap in a generic structure
      return {
        number: index + 1,
        title: this.generateAcTitle(criterion),
        given: 'the feature is implemented',
        when: 'the user interacts with the system',
        then: criterion,
      };
    });
  }

  /**
   * Structure acceptance criteria via LLM, with regex fallback
   */
  private async structureAcceptanceCriteriaViaLLM(
    storyTitle: string,
    criteria: string[],
    evidenceSummary: string
  ): Promise<AcceptanceCriterionStructured[]> {
    if (criteria.length === 0) return [];

    try {
      const prompt = buildAcceptanceCriteriaPrompt(storyTitle, criteria, evidenceSummary);

      const response = await this.llmClient.chat({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        responseFormat: { type: 'json_object' },
      });

      if (!response.content) {
        return this.structureAcceptanceCriteria(criteria);
      }

      const parsed = JSON.parse(response.content) as unknown;

      // Handle both { scenarios: [...] } wrapper and raw array
      const scenarios = Array.isArray(parsed)
        ? parsed
        : (parsed as { scenarios?: unknown[] }).scenarios;

      if (!Array.isArray(scenarios) || scenarios.length === 0) {
        return this.structureAcceptanceCriteria(criteria);
      }

      return scenarios.map((s: { title?: string; given?: string; when?: string; then?: string }, i: number) => ({
        number: i + 1,
        title: s.title || this.generateAcTitle(criteria[i] || storyTitle),
        given: s.given || 'the feature is implemented',
        when: s.when || 'the user interacts with the system',
        then: s.then || criteria[i] || 'the expected behavior occurs',
      }));
    } catch (error) {
      logger.warn(
        { storyTitle, error: error instanceof Error ? error.message : String(error) },
        'Failed to structure AC via LLM, falling back to regex'
      );
      return this.structureAcceptanceCriteria(criteria);
    }
  }

  /**
   * Generate a short title for an acceptance criterion
   */
  private generateAcTitle(criterion: string): string {
    // Take first 50 chars or first sentence
    const firstSentence = criterion.split(/[.!?]/)[0] || criterion;
    const title = firstSentence.substring(0, 50).trim();
    return title.endsWith('.') ? title.slice(0, -1) : title;
  }

  /**
   * Map enrichment sources to template section types
   */
  private mapEnrichmentToTemplateSections(
    sources: Array<{ sourceType: string; sourceName: string; content: string; mandatory: boolean }>
  ): {
    legal: LegalConsideration[];
    accessibility: AccessibilityConsideration[];
    security: string[];
    platform: PlatformNote[];
    testing: string[];
    dependencies: ExternalDependency[];
  } {
    const legal: LegalConsideration[] = [];
    const accessibility: AccessibilityConsideration[] = [];
    const security: string[] = [];
    const platformMap = new Map<string, string[]>();
    const testing: string[] = [];
    const dependencies: ExternalDependency[] = [];

    for (const source of sources) {
      const contentLines = source.content.split('\n').filter((line) => line.trim());

      switch (source.sourceType) {
        case 'gdpr':
        case 'ccpa':
        case 'legal':
          legal.push({
            regulation: source.sourceName,
            scope: source.sourceType === 'gdpr' ? 'EU/UK users' :
                   source.sourceType === 'ccpa' ? 'California users' : 'All users',
            requirements: contentLines,
          });
          break;

        case 'wcag':
          accessibility.push({
            standard: source.sourceName,
            requirements: contentLines,
          });
          break;

        case 'owasp':
          security.push(...contentLines);
          break;

        case 'ios_hig':
        case 'android_material':
        case 'apple_store':
        case 'google_play': {
          const platformName = source.sourceType === 'ios_hig' || source.sourceType === 'apple_store'
            ? 'iOS' : 'Android';
          const existing = platformMap.get(platformName) || [];
          existing.push(...contentLines);
          platformMap.set(platformName, existing);
          break;
        }

        case 'edge_case':
          testing.push(...contentLines);
          break;

        default:
          // Other source types go to testing requirements
          if (contentLines.length > 0) {
            testing.push(...contentLines);
          }
          break;
      }

      // Extract external dependencies from mandatory sources
      if (source.mandatory) {
        dependencies.push({
          service: source.sourceName,
          description: contentLines[0] || source.content,
          criticality: 'MANDATORY',
        });
      } else if (source.sourceType === 'other') {
        dependencies.push({
          service: source.sourceName,
          description: contentLines[0] || source.content,
          criticality: 'OPTIONAL',
        });
      }
    }

    // Convert platform map to PlatformNote[]
    const platform: PlatformNote[] = [];
    for (const [name, notes] of platformMap) {
      platform.push({ platform: name, notes });
    }

    return { legal, accessibility, security, platform, testing, dependencies };
  }

  /**
   * Infer story dependencies from flow-type evidence linked to the child feature
   */
  private async inferStoryDependencies(childFeatureId?: string): Promise<string | null> {
    if (!childFeatureId) return null;

    const flowEvidence = await db
      .select({ content: evidence.content })
      .from(evidence)
      .innerJoin(featureEvidence, eq(featureEvidence.evidenceId, evidence.id))
      .where(
        and(
          eq(featureEvidence.featureId, childFeatureId),
          eq(evidence.type, 'flow')
        )
      );

    if (flowEvidence.length === 0) return null;

    return flowEvidence.map((row) => row.content).join('; ');
  }

  /**
   * Extract HLR references from requirement-type evidence linked to the child feature,
   * with regex fallback on description text
   */
  private async extractHlrReferences(story: JiraStory, childFeatureId?: string): Promise<string[]> {
    const refs: string[] = [];

    // Primary source: requirement evidence from DB
    if (childFeatureId) {
      const requirementEvidence = await db
        .select({ content: evidence.content })
        .from(evidence)
        .innerJoin(featureEvidence, eq(featureEvidence.evidenceId, evidence.id))
        .where(
          and(
            eq(featureEvidence.featureId, childFeatureId),
            eq(evidence.type, 'requirement')
          )
        );

      for (const row of requirementEvidence) {
        refs.push(row.content);
      }
    }

    // Fallback: regex scan of description for HLR patterns
    const lines = story.description.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (/^\d+\.\d+\.[a-z]\./.test(trimmed) || /^HLR-\d+/.test(trimmed)) {
        if (!refs.includes(trimmed)) {
          refs.push(trimmed);
        }
      }
    }

    return refs;
  }

  /**
   * Extract API endpoint table entries from story description (regex fallback)
   */
  private extractApiEndpoints(
    story: JiraStory
  ): Array<{ endpoint: string; method: string; purpose: string }> {
    const endpoints: Array<{ endpoint: string; method: string; purpose: string }> = [];
    const lines = story.description.split('\n');
    for (const line of lines) {
      // Match patterns like "POST /auth/v1/login" or "GET /api/users"
      const match = line.match(/(GET|POST|PUT|PATCH|DELETE)\s+(\/[^\s:]+)(?:\s*[:-]\s*(.+))?/);
      if (match) {
        endpoints.push({
          method: match[1]!,
          endpoint: match[2]!,
          purpose: match[3]?.trim() || story.title,
        });
      }
    }
    return endpoints;
  }

  /**
   * Extract API endpoints from structured ApiContract data
   */
  private extractApiEndpointsFromContract(
    apiContract?: ApiContract
  ): Array<{ endpoint: string; method: string; purpose: string }> {
    if (!apiContract || !apiContract.endpoints || apiContract.endpoints.length === 0) {
      return [];
    }

    return apiContract.endpoints.map((ep) => ({
      endpoint: ep.path,
      method: ep.method,
      purpose: ep.description,
    }));
  }
}
