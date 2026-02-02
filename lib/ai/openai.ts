/**
 * OpenAI API client with rate limiting
 * Follows Dependency Inversion Principle - can be swapped for other LLM providers
 */

import OpenAI from 'openai';
import Bottleneck from 'bottleneck';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is required');
}

/**
 * OpenAI client instance
 */
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Rate limiter for OpenAI Vision API
 * Limit: 50 requests per minute (OpenAI limit)
 * Max concurrent: 5
 */
export const visionRateLimiter = new Bottleneck({
  reservoir: 50, // Initial capacity
  reservoirRefreshAmount: 50, // Refill amount
  reservoirRefreshInterval: 60 * 1000, // Refill every 60 seconds
  maxConcurrent: 5, // Max concurrent requests
  minTime: 1200, // Min 1.2s between requests (50 per minute)
});

/**
 * Rate limiter for OpenAI chat completions
 * More generous limits for text-based API
 */
export const chatRateLimiter = new Bottleneck({
  reservoir: 100,
  reservoirRefreshAmount: 100,
  reservoirRefreshInterval: 60 * 1000,
  maxConcurrent: 10,
  minTime: 600, // Min 0.6s between requests
});

/**
 * Rate limiter for embeddings API
 * Batch embedding is more efficient
 */
export const embeddingRateLimiter = new Bottleneck({
  reservoir: 100,
  reservoirRefreshAmount: 100,
  reservoirRefreshInterval: 60 * 1000,
  maxConcurrent: 5,
  minTime: 600,
});

/**
 * Validate OpenAI API key on initialization
 */
export async function validateOpenAIKey(): Promise<boolean> {
  try {
    // Make a minimal API call to test key
    await openai.models.list();
    return true;
  } catch (error) {
    throw new Error(
      `Invalid OpenAI API key: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
