/**
 * EmbeddingService
 * Generates embeddings for evidence
 * Single Responsibility: Embedding generation only (storage delegated)
 */

import { OpenAIClient } from '@/lib/ai/OpenAIClient';
import { embeddingRateLimiter } from '@/lib/ai/openai';
import { getEvidenceCollection } from '@/lib/ai/chroma';
import { logger } from '@/lib/utils/logger';
import type { LLMClient } from '@/lib/types/llm';
import type { IEmbeddingStorage } from './EmbeddingStorageService';
import { embeddingStorageService } from './EmbeddingStorageService';

/**
 * Batch size for embedding API (100 items per request).
 * OpenAI's text-embedding-3-large model allows up to 100 inputs per batch request,
 * optimizing for API efficiency while staying within rate limits.
 * @see https://platform.openai.com/docs/api-reference/embeddings
 */
const EMBEDDING_BATCH_SIZE = 100;

/**
 * K value for nearest neighbors search
 */
const DEFAULT_K_NEIGHBORS = 20;

export class EmbeddingService {
  private readonly log = logger.child({ service: 'EmbeddingService' });
  private readonly llmClient: LLMClient;
  private readonly storage: IEmbeddingStorage;

  constructor(llmClient?: LLMClient, storage?: IEmbeddingStorage) {
    this.llmClient = llmClient || new OpenAIClient();
    this.storage = storage || embeddingStorageService;
  }

  /**
   * Generate and store embedding for a single evidence item
   * @param evidenceId Evidence UUID
   * @returns Embedding vector
   */
  async embedEvidence(evidenceId: string): Promise<number[]> {
    try {
      // Fetch evidence via storage
      const evidenceItem = await this.storage.getEvidenceById(evidenceId);

      if (!evidenceItem) {
        throw new Error(`Evidence ${evidenceId} not found`);
      }

      // Generate embedding
      const embedding = await this.generateEmbedding(evidenceItem.content);

      // Store via storage service
      await this.storage.storeEmbedding(evidenceId, embedding, evidenceItem);

      this.log.info({ evidenceId }, 'Embedding generated and stored');

      return embedding;
    } catch (error) {
      this.log.error(
        {
          evidenceId,
          error: error instanceof Error ? error.message : String(error),
        },
        'Failed to embed evidence'
      );
      throw error;
    }
  }

  /**
   * Generate and store embeddings for multiple evidence items (batch)
   * @param evidenceIds Array of evidence UUIDs
   * @returns Number of embeddings generated
   */
  async embedBatch(evidenceIds: string[]): Promise<number> {
    let successCount = 0;

    // Process in batches of EMBEDDING_BATCH_SIZE
    for (let i = 0; i < evidenceIds.length; i += EMBEDDING_BATCH_SIZE) {
      const batchIds = evidenceIds.slice(i, i + EMBEDDING_BATCH_SIZE);

      try {
        // Fetch evidence for batch via storage
        const evidenceItems = await this.storage.getEvidenceByIds(batchIds);

        if (evidenceItems.length === 0) {
          continue;
        }

        // Generate embeddings for batch
        const texts = evidenceItems.map((e) => e.content);
        const embeddings = await this.generateEmbeddings(texts);

        // Prepare batch storage data
        const storageItems = evidenceItems
          .map((item, index) => {
            const embedding = embeddings[index];
            if (!embedding || embedding.length === 0 || !item.id) {
              return null;
            }
            return {
              id: item.id,
              embedding,
              content: item.content,
              documentId: item.documentId,
              type: item.type,
            };
          })
          .filter((item): item is NonNullable<typeof item> => item !== null);

        // Store via storage service
        await this.storage.storeBatch(storageItems);

        successCount += storageItems.length;

        this.log.info(
          { count: storageItems.length, total: successCount },
          'Batch embeddings generated and stored'
        );
      } catch (error) {
        this.log.error(
          {
            batchStart: i,
            batchSize: batchIds.length,
            error: error instanceof Error ? error.message : String(error),
          },
          'Failed to embed batch'
        );
      }
    }

    return successCount;
  }

  /**
   * Find similar evidence using vector search
   * @param query Query text to search for
   * @param k Number of results (default 20)
   * @returns Array of evidence IDs with similarity scores
   */
  async findSimilar(
    query: string,
    k: number = DEFAULT_K_NEIGHBORS
  ): Promise<Array<{ id: string; similarity: number }>> {
    try {
      // Generate embedding for query
      const queryEmbedding = await this.generateEmbedding(query);

      // Search in Chroma
      const collection = await getEvidenceCollection();
      const results = await collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: k,
      });

      // Extract results
      const ids = results.ids[0] || [];
      const distances = results.distances?.[0] || [];

      // Convert cosine distance to similarity (1 - distance)
      return ids.map((id, index) => ({
        id,
        similarity: 1 - (distances[index] || 0),
      }));
    } catch (error) {
      this.log.error(
        {
          query,
          k,
          error: error instanceof Error ? error.message : String(error),
        },
        'Failed to find similar evidence'
      );
      return [];
    }
  }

  /**
   * Find similar evidence by evidence ID
   * @param evidenceId Evidence UUID
   * @param k Number of results (default 20)
   * @returns Array of similar evidence IDs with similarity scores
   */
  async findSimilarByEvidenceId(
    evidenceId: string,
    k: number = DEFAULT_K_NEIGHBORS
  ): Promise<Array<{ id: string; similarity: number }>> {
    try {
      // Fetch evidence content via storage
      const evidenceItem = await this.storage.getEvidenceById(evidenceId);

      if (!evidenceItem) {
        throw new Error(`Evidence ${evidenceId} not found`);
      }

      // Search using content
      return this.findSimilar(evidenceItem.content, k);
    } catch (error) {
      this.log.error(
        {
          evidenceId,
          error: error instanceof Error ? error.message : String(error),
        },
        'Failed to find similar by evidence ID'
      );
      return [];
    }
  }

  /**
   * Generate embedding for single text using LLM
   * @param text Text to embed
   * @returns Embedding vector (3072 dimensions)
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    const response = await embeddingRateLimiter.schedule(() =>
      this.llmClient.embed({
        model: 'text-embedding-3-large',
        input: text,
      })
    );

    return response.embeddings[0] || [];
  }

  /**
   * Generate embeddings for multiple texts (batch)
   * @param texts Array of texts to embed
   * @returns Array of embedding vectors
   */
  private async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    const response = await embeddingRateLimiter.schedule(() =>
      this.llmClient.embed({
        model: 'text-embedding-3-large',
        input: texts,
      })
    );

    return response.embeddings;
  }
}

/**
 * Singleton instance
 */
export const embeddingService = new EmbeddingService();
