/**
 * OpenAI implementation of LLMClient interface
 * Follows Dependency Inversion Principle
 */

import OpenAI from 'openai';
import type {
  LLMClient,
  LLMChatOptions,
  LLMChatResponse,
  LLMEmbeddingOptions,
  LLMEmbeddingResponse,
  LLMMessage,
} from '@/lib/types/llm';
import { ConfigurationError, RateLimitError, TimeoutError } from '@/lib/utils/errors';
import { logger } from '@/lib/utils/logger';
import { activityLogService } from '@/lib/services/ActivityLogService';

/**
 * OpenAI Client implementation
 * Wraps OpenAI SDK and adapts to LLMClient interface
 */
export class OpenAIClient implements LLMClient {
  private client: OpenAI;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.OPENAI_API_KEY;

    if (!key) {
      throw new ConfigurationError('OpenAI API key is required', 'OPENAI_API_KEY');
    }

    this.client = new OpenAI({ apiKey: key });
  }

  /**
   * Generate chat completion
   */
  async chat(options: LLMChatOptions): Promise<LLMChatResponse> {
    try {
      const response = await this.client.chat.completions.create({
        model: options.model,
        messages: this.adaptMessages(options.messages),
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        response_format: options.responseFormat,
      });

      return {
        content: response.choices[0]?.message?.content || null,
        finishReason: response.choices[0]?.finish_reason || null,
        usage: response.usage
          ? {
              promptTokens: response.usage.prompt_tokens,
              completionTokens: response.usage.completion_tokens,
              totalTokens: response.usage.total_tokens,
            }
          : undefined,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Generate embeddings
   */
  async embed(options: LLMEmbeddingOptions): Promise<LLMEmbeddingResponse> {
    try {
      const response = await this.client.embeddings.create({
        model: options.model,
        input: options.input,
      });

      return {
        embeddings: response.data.map((item) => item.embedding),
        usage: response.usage
          ? {
              promptTokens: response.usage.prompt_tokens,
              totalTokens: response.usage.total_tokens,
            }
          : undefined,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Generate chat completion with vision
   */
  async vision(options: LLMChatOptions): Promise<LLMChatResponse> {
    // Vision uses the same endpoint as chat in OpenAI
    return this.chat(options);
  }

  /**
   * Adapt LLMMessage to OpenAI message format
   */
  private adaptMessages(
    messages: LLMMessage[]
  ): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    return messages.map((msg) => {
      if (typeof msg.content === 'string') {
        return {
          role: msg.role,
          content: msg.content,
        } as OpenAI.Chat.Completions.ChatCompletionMessageParam;
      } else {
        // Multimodal content
        return {
          role: msg.role,
          content: msg.content.map((item) => {
            if (item.type === 'text') {
              return { type: 'text' as const, text: item.text };
            } else {
              return {
                type: 'image_url' as const,
                image_url: {
                  url: item.image_url.url,
                  detail: item.image_url.detail,
                },
              };
            }
          }),
        } as OpenAI.Chat.Completions.ChatCompletionMessageParam;
      }
    });
  }

  /**
   * Handle OpenAI errors and convert to app errors
   */
  private handleError(error: unknown): Error {
    if (error instanceof Error) {
      // Rate limit error
      if ('status' in error && (error as { status: number }).status === 429) {
        logger.warn({ error: error.message }, 'OpenAI rate limit hit');
        activityLogService.addLog('warning', '⏸️ Rate limited by OpenAI, waiting to resume...');
        return new RateLimitError();
      }

      // Timeout error
      if (
        error.message.includes('timeout') ||
        error.message.includes('ETIMEDOUT')
      ) {
        logger.warn({ error: error.message }, 'OpenAI request timeout');
        return new TimeoutError('OpenAI API request');
      }

      // Log and re-throw
      logger.error({ error: error.message }, 'OpenAI API error');
      return error;
    }

    return new Error('Unknown OpenAI error');
  }
}

/**
 * Singleton instance of OpenAI client
 */
export const openaiClient = new OpenAIClient();
