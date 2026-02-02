/**
 * LLM Helper Utilities
 * Provides reusable patterns for LLM interactions
 * Follows DRY principle - single source of truth for LLM call patterns
 */

import type { LLMClient } from '@/lib/types/llm';
import { z } from 'zod';
import { logger } from '@/lib/utils/logger';

/**
 * LLM Call Options
 */
export interface LLMCallOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: { type: 'json_object' | 'text' };
}

/**
 * Call LLM and parse JSON response with validation
 * DRY helper to eliminate duplicated pattern across services
 *
 * @param llm - LLM client instance
 * @param prompt - The prompt to send
 * @param schema - Zod schema for response validation
 * @param options - Optional LLM parameters
 * @returns Parsed and validated response, or null if error
 */
export async function callLLMForJson<T>(
  llm: LLMClient,
  prompt: string,
  schema: z.ZodSchema<T>,
  options: LLMCallOptions = {}
): Promise<T | null> {
  const {
    model = 'gpt-4o',
    temperature = 0.2,
    maxTokens = 2000,
    responseFormat = { type: 'json_object' as const },
  } = options;

  try {
    const response = await llm.chat({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature,
      maxTokens,
      responseFormat,
    });

    if (!response.content) {
      logger.warn('LLM returned empty response');
      return null;
    }

    // Parse JSON
    const parsed = JSON.parse(response.content);

    // Validate with zod schema
    const validated = schema.parse(parsed);

    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error({ error: error.issues }, 'LLM response validation failed');
    } else if (error instanceof SyntaxError) {
      logger.error({ error }, 'LLM response is not valid JSON');
    } else {
      logger.error({ error }, 'LLM call failed');
    }
    return null;
  }
}
