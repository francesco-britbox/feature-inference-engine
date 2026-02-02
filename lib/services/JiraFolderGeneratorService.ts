/**
 * Jira Folder Generator Service
 * Single Responsibility: Generate folder structure for Jira tickets
 *
 * Architecture:
 * - Generates server-side folder structure: platform/epic/story/subtask
 * - Creates markdown files for each level
 * - Exports evidence as JSON in references/ folders
 * - Provides progress callbacks for UI updates
 * - Handles cleanup of temporary folders
 */

import fs from 'fs/promises';
import path from 'path';
import { db } from '@/lib/db/client';
import { features, evidence, featureEvidence } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import type { Platform } from '@/lib/types/platform';
import type { JiraEpic, JiraStory, JiraSubtask } from '@/lib/types/ticket';
import { TicketService } from './TicketService';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ service: 'JiraFolderGenerator' });

/**
 * Selection request from UI
 */
export interface JiraGenerationRequest {
  platform: 'ios' | 'android' | 'mobile' | 'web';
  selectedEpics: string[];
  selectedStories: string[];
  selectedSubtasks: string[];
}

/**
 * Generation progress callback
 */
export type ProgressCallback = (progress: number, message: string) => void;

/**
 * Jira Folder Generator Service
 * Generates folder structure: platform/epic/story/subtask with markdown files
 */
export class JiraFolderGeneratorService {
  private readonly TEMP_BASE_PATH = path.join(process.cwd(), 'temp', 'jira');
  private readonly ticketService: TicketService;

  constructor() {
    this.ticketService = new TicketService();
  }

  /**
   * Generate folder structure for selected items
   * Returns path to generated folder (for zipping)
   */
  async generateFolderStructure(
    request: JiraGenerationRequest,
    onProgress?: ProgressCallback
  ): Promise<string> {
    const sessionId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const outputPath = path.join(this.TEMP_BASE_PATH, sessionId);

    logger.info({ request, sessionId }, 'Starting Jira folder generation');

    try {
      // Create base directory
      await fs.mkdir(outputPath, { recursive: true });
      onProgress?.(5, 'Created base directory...');

      // Create platform folder
      const platformFolder = request.platform;
      const platformPath = path.join(outputPath, platformFolder);
      await fs.mkdir(platformPath, { recursive: true });
      onProgress?.(10, `Created platform folder: ${platformFolder}`);

      // Process each selected epic
      const totalEpics = request.selectedEpics.length;
      let processedEpics = 0;

      for (const featureId of request.selectedEpics) {
        try {
          await this.generateEpicFolder(
            featureId,
            platformPath,
            request,
            (epicProgress, msg) => {
              const overallProgress = 10 + (processedEpics / totalEpics) * 70 + (epicProgress / totalEpics) * 0.7;
              onProgress?.(Math.round(overallProgress), msg);
            }
          );
          processedEpics++;
        } catch (error) {
          logger.error({ featureId, error }, 'Failed to generate epic folder');
        }
      }

      onProgress?.(85, 'All epics generated');

      // Create README.md at root
      await this.createRootReadme(outputPath, request);
      onProgress?.(95, 'Created README.md');

      logger.info({ sessionId, outputPath }, 'Jira folder generation complete');

      return outputPath;
    } catch (error) {
      logger.error({ request, error }, 'Folder generation failed');
      throw error;
    }
  }

  /**
   * Generate folder for a single epic
   */
  private async generateEpicFolder(
    featureId: string,
    platformPath: string,
    request: JiraGenerationRequest,
    onProgress: ProgressCallback
  ): Promise<void> {
    // Get feature
    const [feature] = await db.select().from(features).where(eq(features.id, featureId));

    if (!feature) {
      throw new Error(`Feature ${featureId} not found`);
    }

    onProgress(0, `Generating epic: ${feature.name}...`);

    // Generate epic with stories and subtasks
    const platformForApi = request.platform === 'mobile' ? 'ios' : request.platform;
    const epic = await this.ticketService.generateEpic(featureId, platformForApi as Platform);

    // Create epic folder (sanitized name)
    const epicFolderName = this.sanitizeFolderName(feature.name);
    const epicPath = path.join(platformPath, epicFolderName);
    await fs.mkdir(epicPath, { recursive: true });

    onProgress(10, `Created epic folder: ${epicFolderName}`);

    // Create epic.md
    await this.createEpicMarkdown(epicPath, epic, request.platform);
    onProgress(20, 'Created epic.md');

    // Get evidence for this feature
    const featureEvidenceLinks = await db
      .select({
        evidenceId: featureEvidence.evidenceId,
        relationshipType: featureEvidence.relationshipType,
        strength: featureEvidence.strength,
      })
      .from(featureEvidence)
      .where(eq(featureEvidence.featureId, featureId));

    const evidenceIds = featureEvidenceLinks.map((link) => link.evidenceId);
    const evidenceItems = evidenceIds.length > 0
      ? await db.select().from(evidence).where(inArray(evidence.id, evidenceIds))
      : [];

    onProgress(30, 'Fetched evidence for epic');

    // Process stories
    const totalStories = epic.stories.length;
    let processedStories = 0;

    for (let storyIndex = 0; storyIndex < epic.stories.length; storyIndex++) {
      const story = epic.stories[storyIndex]!;
      const storyId = `${featureId}-story-${storyIndex}`;

      // Check if this story is selected
      if (!request.selectedStories.includes(storyId)) {
        processedStories++;
        continue;
      }

      try {
        await this.generateStoryFolder(
          epicPath,
          story,
          storyId,
          storyIndex,
          evidenceItems,
          request
        );

        processedStories++;
        const storyProgress = 30 + (processedStories / totalStories) * 60;
        onProgress(storyProgress, `Generated story ${processedStories}/${totalStories}`);
      } catch (error) {
        logger.error({ storyId, error }, 'Failed to generate story folder');
      }
    }

    onProgress(100, `Epic complete: ${feature.name}`);
  }

  /**
   * Generate folder for a single story
   */
  private async generateStoryFolder(
    epicPath: string,
    story: JiraStory,
    storyId: string,
    _storyIndex: number,
    evidenceItems: Array<{ id: string; type: string; content: string; rawData?: unknown; extractedAt: Date }>,
    request: JiraGenerationRequest
  ): Promise<void> {
    // Create story folder
    const storyFolderName = this.sanitizeFolderName(story.title);
    const storyPath = path.join(epicPath, storyFolderName);
    await fs.mkdir(storyPath, { recursive: true });

    // Create story.md
    await this.createStoryMarkdown(storyPath, story);

    // Create references folder for story
    const storyReferencesPath = path.join(storyPath, 'references');
    await fs.mkdir(storyReferencesPath, { recursive: true });

    // Export evidence for this story (filtered by evidenceIds)
    const storyEvidence = evidenceItems.filter((ev) =>
      story.evidenceIds?.includes(ev.id)
    );

    for (const ev of storyEvidence) {
      const evidenceFileName = `evidence-${ev.id.substring(0, 8)}.json`;
      const evidenceFilePath = path.join(storyReferencesPath, evidenceFileName);
      await fs.writeFile(
        evidenceFilePath,
        JSON.stringify(
          {
            id: ev.id,
            type: ev.type,
            content: ev.content,
            rawData: ev.rawData,
            extractedAt: ev.extractedAt,
          },
          null,
          2
        )
      );
    }

    // Process subtasks
    if (story.subtasks) {
      for (let subtaskIndex = 0; subtaskIndex < story.subtasks.length; subtaskIndex++) {
        const subtask = story.subtasks[subtaskIndex]!;
        const subtaskId = `${storyId}-subtask-${subtaskIndex}`;

        // Check if this subtask is selected
        if (!request.selectedSubtasks.includes(subtaskId)) {
          continue;
        }

        await this.generateSubtaskFolder(
          storyPath,
          subtask,
          subtaskIndex,
          evidenceItems.slice(0, 2) // Sample evidence for subtask
        );
      }
    }
  }

  /**
   * Generate folder for a single subtask
   */
  private async generateSubtaskFolder(
    storyPath: string,
    subtask: JiraSubtask,
    _subtaskIndex: number,
    evidenceItems: Array<{ id: string; type: string; content: string; extractedAt: Date }>
  ): Promise<void> {
    // Create subtask folder
    const subtaskFolderName = this.sanitizeFolderName(subtask.title);
    const subtaskPath = path.join(storyPath, subtaskFolderName);
    await fs.mkdir(subtaskPath, { recursive: true });

    // Create subtask.md
    await this.createSubtaskMarkdown(subtaskPath, subtask);

    // Create references folder for subtask
    const subtaskReferencesPath = path.join(subtaskPath, 'references');
    await fs.mkdir(subtaskReferencesPath, { recursive: true });

    // Export relevant evidence for this subtask
    for (const ev of evidenceItems) {
      const evidenceFileName = `evidence-${ev.id.substring(0, 8)}.json`;
      const evidenceFilePath = path.join(subtaskReferencesPath, evidenceFileName);
      await fs.writeFile(
        evidenceFilePath,
        JSON.stringify(
          {
            id: ev.id,
            type: ev.type,
            content: ev.content,
            extractedAt: ev.extractedAt,
          },
          null,
          2
        )
      );
    }
  }

  /**
   * Create epic.md file
   */
  private async createEpicMarkdown(
    epicPath: string,
    epic: JiraEpic,
    platform: string
  ): Promise<void> {
    const lines: string[] = [];

    lines.push(`# Epic: ${epic.title}`);
    lines.push('');
    lines.push(`**Platform**: ${platform.toUpperCase()}`);
    lines.push(`**Priority**: ${epic.priority || 'Medium'}`);
    if (epic.labels && epic.labels.length > 0) {
      lines.push(`**Labels**: ${epic.labels.join(', ')}`);
    }
    lines.push('');
    lines.push('## Description');
    lines.push('');
    lines.push(epic.description);
    lines.push('');

    if (epic.acceptanceCriteria?.scenarios && epic.acceptanceCriteria.scenarios.length > 0) {
      lines.push('## Acceptance Criteria');
      lines.push('');
      for (const scenario of epic.acceptanceCriteria.scenarios) {
        lines.push('### Scenario');
        lines.push(`- **Given**: ${scenario.given}`);
        lines.push(`- **When**: ${scenario.when}`);
        lines.push(`- **Then**: ${scenario.then}`);
        lines.push('');
      }
    }

    lines.push('## Stories');
    lines.push('');
    lines.push(`This epic contains ${epic.stories.length} user stories.`);
    lines.push('See individual story folders for details.');
    lines.push('');

    await fs.writeFile(path.join(epicPath, 'epic.md'), lines.join('\n'));
  }

  /**
   * Create story.md file
   */
  private async createStoryMarkdown(storyPath: string, story: JiraStory): Promise<void> {
    const lines: string[] = [];

    lines.push(`# Story: ${story.title}`);
    lines.push('');
    lines.push(`**Priority**: ${story.priority || 'Medium'}`);
    lines.push(`**Story Points**: ${story.storyPoints || 'Not estimated'}`);
    if (story.labels && story.labels.length > 0) {
      lines.push(`**Labels**: ${story.labels.join(', ')}`);
    }
    lines.push('');
    lines.push('## Description');
    lines.push('');
    lines.push(story.description);
    lines.push('');

    if (story.acceptanceCriteria && story.acceptanceCriteria.length > 0) {
      lines.push('## Acceptance Criteria');
      lines.push('');
      for (const criterion of story.acceptanceCriteria) {
        lines.push(`- ${criterion}`);
      }
      lines.push('');
    }

    if (story.subtasks && story.subtasks.length > 0) {
      lines.push('## Subtasks');
      lines.push('');
      lines.push(`This story has ${story.subtasks.length} subtasks.`);
      lines.push('See individual subtask folders for details.');
      lines.push('');
    }

    lines.push('## Evidence References');
    lines.push('');
    lines.push('See `references/` folder for evidence JSON files.');
    lines.push('');

    await fs.writeFile(path.join(storyPath, 'story.md'), lines.join('\n'));
  }

  /**
   * Create subtask.md file
   */
  private async createSubtaskMarkdown(
    subtaskPath: string,
    subtask: JiraSubtask
  ): Promise<void> {
    const lines: string[] = [];

    lines.push(`# Subtask: ${subtask.title}`);
    lines.push('');
    lines.push(`**Time Estimate**: ${subtask.timeEstimate}`);
    if (subtask.assignee) {
      lines.push(`**Assignee**: ${subtask.assignee}`);
    }
    lines.push('');
    lines.push('## Description');
    lines.push('');
    lines.push(subtask.description);
    lines.push('');
    lines.push('## Evidence References');
    lines.push('');
    lines.push('See `references/` folder for evidence JSON files.');
    lines.push('');

    await fs.writeFile(path.join(subtaskPath, 'subtask.md'), lines.join('\n'));
  }

  /**
   * Create root README.md
   */
  private async createRootReadme(
    outputPath: string,
    request: JiraGenerationRequest
  ): Promise<void> {
    const lines: string[] = [];

    lines.push('# Jira Tickets Export');
    lines.push('');
    lines.push(`**Platform**: ${request.platform.toUpperCase()}`);
    lines.push(`**Generated**: ${new Date().toISOString()}`);
    lines.push(`**Epics**: ${request.selectedEpics.length}`);
    lines.push(`**Stories**: ${request.selectedStories.length}`);
    lines.push(`**Subtasks**: ${request.selectedSubtasks.length}`);
    lines.push('');
    lines.push('## Structure');
    lines.push('');
    lines.push('```');
    lines.push(`${request.platform}/`);
    lines.push('  epic-name/');
    lines.push('    epic.md');
    lines.push('    story-name/');
    lines.push('      story.md');
    lines.push('      references/');
    lines.push('        evidence-xxx.json');
    lines.push('      subtask-name/');
    lines.push('        subtask.md');
    lines.push('        references/');
    lines.push('          evidence-yyy.json');
    lines.push('```');
    lines.push('');
    lines.push('## Import to Jira');
    lines.push('');
    lines.push('1. Review epic.md files');
    lines.push('2. Create epics in Jira manually or via CSV import');
    lines.push('3. Create stories under epics');
    lines.push('4. Create subtasks under stories');
    lines.push('5. Attach evidence files as needed');
    lines.push('');

    await fs.writeFile(path.join(outputPath, 'README.md'), lines.join('\n'));
  }

  /**
   * Sanitize folder name (remove special characters)
   */
  private sanitizeFolderName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
  }

  /**
   * Clear all generated folders
   */
  async clearAllFolders(): Promise<number> {
    try {
      await fs.rm(this.TEMP_BASE_PATH, { recursive: true, force: true });
      await fs.mkdir(this.TEMP_BASE_PATH, { recursive: true });
      logger.info('All Jira temp folders cleared');
      return 1;
    } catch (error) {
      logger.error({ error }, 'Failed to clear Jira folders');
      throw error;
    }
  }

  /**
   * Clear specific folder by session ID
   */
  async clearFolder(sessionId: string): Promise<void> {
    const folderPath = path.join(this.TEMP_BASE_PATH, sessionId);
    await fs.rm(folderPath, { recursive: true, force: true });
    logger.info({ sessionId }, 'Jira folder cleared');
  }
}

/**
 * Singleton instance
 */
export const jiraFolderGeneratorService = new JiraFolderGeneratorService();
