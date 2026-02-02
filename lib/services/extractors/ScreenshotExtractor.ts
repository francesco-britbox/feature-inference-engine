/**
 * ScreenshotExtractor
 * Extracts UI elements and flows from screenshots using LLM Vision
 * Single Responsibility: Screenshot analysis only
 * Follows DIP: Depends on LLMClient abstraction, not concrete implementation
 */

import fs from 'fs/promises';
import { visionRateLimiter } from '@/lib/ai/openai';
import { OpenAIClient } from '@/lib/ai/OpenAIClient';
import { SCREENSHOT_EXTRACTION_V1 } from '@/lib/prompts/extraction';
import type { Evidence, Extractor, ExtractedEvidence } from '@/lib/types/evidence';
import type { LLMClient } from '@/lib/types/llm';
import { logger } from '@/lib/utils/logger';
import { RateLimitError, TimeoutError } from '@/lib/utils/errors';

export class ScreenshotExtractor implements Extractor {
  private readonly log = logger.child({ extractor: 'ScreenshotExtractor' });
  private readonly llmClient: LLMClient;

  constructor(llmClient?: LLMClient) {
    // Dependency Injection: Accept abstraction, default to OpenAI
    this.llmClient = llmClient || new OpenAIClient();
  }

  /**
   * Extract evidence from screenshot using LLM Vision
   * @param filePath Path to image file
   * @param documentId Document UUID
   * @returns Array of evidence (UI elements, flows)
   */
  async extract(filePath: string, documentId: string): Promise<Evidence[]> {
    try {
      // Read image file
      const imageBuffer = await fs.readFile(filePath);
      const base64Image = imageBuffer.toString('base64');

      // Determine image type from file extension
      const extension = filePath.split('.').pop()?.toLowerCase() || 'jpg';
      const mimeType = extension === 'png' ? 'image/png' : 'image/jpeg';

      // Call LLM Vision with rate limiting (uses abstraction, not concrete OpenAI)
      const response = await visionRateLimiter.schedule(() =>
        this.llmClient.vision({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: SCREENSHOT_EXTRACTION_V1 },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType};base64,${base64Image}`,
                    detail: 'high',
                  },
                },
              ],
            },
          ],
          temperature: 0.2,
          maxTokens: 1000,
        })
      );

      // Parse response
      const content = response.content;
      if (!content) {
        this.log.error({ documentId }, 'Empty response from LLM Vision');
        return [];
      }

      // Parse JSON response
      const extracted = this.parseExtractionResponse(content);

      // Convert to Evidence format
      return extracted.map((item) => ({
        documentId,
        type: item.type,
        content: item.content,
        rawData: item.metadata || {},
      }));
    } catch (error) {
      // Handle rate limit errors (typed errors from LLMClient)
      if (error instanceof RateLimitError) {
        this.log.error({ documentId }, 'Rate limit hit for Vision API');
        throw error; // Re-throw typed error
      }

      // Handle timeout errors (typed errors from LLMClient)
      if (error instanceof TimeoutError) {
        this.log.error({ documentId }, 'Vision API timeout');
        throw error; // Re-throw typed error
      }

      // Log and re-throw
      this.log.error(
        {
          documentId,
          error: error instanceof Error ? error.message : String(error),
        },
        'Screenshot extraction failed'
      );

      return []; // Return empty array on error (don't crash pipeline)
    }
  }

  /**
   * Parse JSON response from LLM Vision
   */
  private parseExtractionResponse(content: string): ExtractedEvidence[] {
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
      const jsonString = jsonMatch && jsonMatch[1] ? jsonMatch[1] : content;

      const parsed = JSON.parse(jsonString);

      if (!Array.isArray(parsed)) {
        this.log.error({ content }, 'Response is not an array');
        return [];
      }

      // Validate structure
      return parsed.filter(
        (item) =>
          item &&
          typeof item === 'object' &&
          'type' in item &&
          'content' in item
      );
    } catch (error) {
      this.log.error(
        {
          content,
          error: error instanceof Error ? error.message : String(error),
        },
        'Failed to parse extraction response'
      );
      return [];
    }
  }
}

/**
 * Singleton instance
 */
export const screenshotExtractor = new ScreenshotExtractor();
