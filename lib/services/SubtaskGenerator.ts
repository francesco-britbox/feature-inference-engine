/**
 * Subtask Generator Service
 * Single Responsibility: Generate granular subtasks from user stories using LLM
 * Follows DIP: Depends on LLMClient abstraction, not concrete OpenAI
 */

import type { LLMClient } from '@/lib/types/llm';
import type { JiraStory, JiraSubtask } from '@/lib/types/ticket';
import type { Platform } from '@/lib/types/platform';
import { buildSubtaskPrompt } from '@/lib/prompts/subtask';
import { createLogger } from '@/lib/utils/logger';
import { InvalidDataError, RetryableError } from '@/lib/utils/errors';
import { chatRateLimiter } from '@/lib/ai/openai';

const logger = createLogger({ service: 'SubtaskGenerator' });

/**
 * Subtask Generator Service
 * Uses LLM to break user stories into 5-10 granular, platform-specific subtasks
 */
export class SubtaskGenerator {
  private readonly MODEL = 'gpt-4o';
  private readonly TEMPERATURE = 0.3; // Low temperature for consistent, practical subtasks

  constructor(private llmClient: LLMClient) {}

  /**
   * Generate subtasks for a user story
   * Calls LLM to break story into 5-10 platform-specific subtasks with time estimates
   *
   * @param story - User story to break down
   * @param platform - Target platform for implementation
   * @returns Array of generated subtasks
   */
  async generateSubtasks(story: JiraStory, platform: Platform): Promise<JiraSubtask[]> {
    if (!story) {
      throw new InvalidDataError('Story is required', 'story');
    }

    if (!platform) {
      throw new InvalidDataError('Platform is required for subtask generation', 'platform');
    }

    logger.info(
      { storyTitle: story.title, platform },
      'Generating subtasks for story'
    );

    try {
      // Build prompt
      const prompt = buildSubtaskPrompt(story, platform);

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
        throw new RetryableError('LLM returned empty response for subtask generation');
      }

      // Parse response
      const subtasks = this.parseSubtasks(response.content);

      // Validate subtasks
      this.validateSubtasks(subtasks);

      logger.info(
        { storyTitle: story.title, platform, subtaskCount: subtasks.length },
        'Subtasks generated successfully'
      );

      return subtasks;
    } catch (error) {
      logger.error(
        {
          storyTitle: story.title,
          platform,
          error: error instanceof Error ? error.message : String(error),
        },
        'Failed to generate subtasks'
      );

      // Return empty array on failure (subtasks are optional)
      // This allows epic generation to continue even if subtask generation fails
      return [];
    }
  }

  /**
   * Parse LLM response into JiraSubtask array
   */
  private parseSubtasks(content: string): JiraSubtask[] {
    try {
      const parsed = JSON.parse(content) as {
        subtasks: Array<{
          title: string;
          description: string;
          timeEstimate: string;
          assignee?: string;
        }>;
      };

      if (!parsed.subtasks || !Array.isArray(parsed.subtasks)) {
        throw new InvalidDataError('Invalid subtasks format: expected { subtasks: [] }');
      }

      return parsed.subtasks.map((st) => ({
        title: st.title,
        description: st.description,
        timeEstimate: st.timeEstimate,
        assignee: st.assignee,
      }));
    } catch (error) {
      logger.error({ content, error }, 'Failed to parse subtasks');
      throw new InvalidDataError('Invalid JSON response from LLM for subtasks');
    }
  }

  /**
   * Validate subtasks structure
   */
  private validateSubtasks(subtasks: JiraSubtask[]): void {
    if (subtasks.length === 0) {
      throw new InvalidDataError('LLM generated zero subtasks');
    }

    if (subtasks.length > 15) {
      // Trim to reasonable number
      logger.warn(
        { count: subtasks.length },
        'LLM generated too many subtasks, trimming to 10'
      );
      subtasks.splice(10);
    }

    for (const subtask of subtasks) {
      if (!subtask.title || subtask.title.trim().length === 0) {
        throw new InvalidDataError('Subtask title cannot be empty');
      }

      if (!subtask.description || subtask.description.trim().length === 0) {
        throw new InvalidDataError('Subtask description cannot be empty');
      }

      if (!subtask.timeEstimate || subtask.timeEstimate.trim().length === 0) {
        throw new InvalidDataError('Subtask time estimate cannot be empty');
      }

      // Validate time estimate format (Xh or Xd)
      if (!/^\d+[hd]$/i.test(subtask.timeEstimate)) {
        logger.warn(
          { timeEstimate: subtask.timeEstimate },
          'Invalid time estimate format, expected "2h" or "1d"'
        );
      }
    }
  }
}
