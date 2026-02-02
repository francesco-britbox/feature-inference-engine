/**
 * EmbeddingStorageService
 * Handles storage of embeddings in PostgreSQL and Chroma
 * Single Responsibility: Embedding persistence only
 */

import { eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { evidence } from '@/lib/db/schema';
import { logger } from '@/lib/utils/logger';
import type { Evidence } from '@/lib/types/evidence';

/**
 * Interface for embedding storage operations
 */
export interface IEmbeddingStorage {
  /**
   * Store a single embedding
   */
  storeEmbedding(
    evidenceId: string,
    embedding: number[],
    evidenceData: Evidence
  ): Promise<void>;

  /**
   * Store multiple embeddings in batch
   */
  storeBatch(
    items: Array<{
      id: string;
      embedding: number[];
      content: string;
      documentId: string;
      type: string;
    }>
  ): Promise<void>;

  /**
   * Retrieve evidence data by ID
   */
  getEvidenceById(evidenceId: string): Promise<Evidence | null>;

  /**
   * Retrieve multiple evidence items by IDs
   */
  getEvidenceByIds(evidenceIds: string[]): Promise<Evidence[]>;
}

/**
 * EmbeddingStorageService
 * Implements dual storage: PostgreSQL (primary) + Chroma (vector search)
 */
export class EmbeddingStorageService implements IEmbeddingStorage {
  private readonly log = logger.child({ service: 'EmbeddingStorageService' });

  /**
   * Store a single embedding in both PostgreSQL and Chroma
   */
  async storeEmbedding(
    evidenceId: string,
    embedding: number[],
    _evidenceData: Evidence
  ): Promise<void> {
    try {
      // Store in PostgreSQL
      await db
        .update(evidence)
        .set({ embedding })
        .where(eq(evidence.id, evidenceId));

      // Chroma disabled (webpack compatibility issue)

      this.log.debug({ evidenceId }, 'Embedding stored successfully');
    } catch (error) {
      this.log.error(
        {
          evidenceId,
          error: error instanceof Error ? error.message : String(error),
        },
        'Failed to store embedding'
      );
      throw error;
    }
  }

  /**
   * Store multiple embeddings in batch (PostgreSQL + Chroma)
   */
  async storeBatch(
    items: Array<{
      id: string;
      embedding: number[];
      content: string;
      documentId: string;
      type: string;
    }>
  ): Promise<void> {
    try {
      // Store in PostgreSQL (batch update)
      for (const item of items) {
        await db
          .update(evidence)
          .set({ embedding: item.embedding })
          .where(eq(evidence.id, item.id));
      }

      // Chroma disabled (webpack compatibility issue)

      this.log.debug({ count: items.length }, 'Batch embeddings stored successfully');
    } catch (error) {
      this.log.error(
        {
          count: items.length,
          error: error instanceof Error ? error.message : String(error),
        },
        'Failed to store batch embeddings'
      );
      throw error;
    }
  }

  /**
   * Retrieve evidence data by ID
   */
  async getEvidenceById(evidenceId: string): Promise<Evidence | null> {
    try {
      const [evidenceItem] = await db
        .select()
        .from(evidence)
        .where(eq(evidence.id, evidenceId));

      return (evidenceItem as Evidence) || null;
    } catch (error) {
      this.log.error(
        {
          evidenceId,
          error: error instanceof Error ? error.message : String(error),
        },
        'Failed to retrieve evidence'
      );
      throw error;
    }
  }

  /**
   * Retrieve multiple evidence items by IDs
   */
  async getEvidenceByIds(evidenceIds: string[]): Promise<Evidence[]> {
    try {
      const evidenceItems = await db
        .select()
        .from(evidence)
        .where(inArray(evidence.id, evidenceIds));

      return evidenceItems as Evidence[];
    } catch (error) {
      this.log.error(
        {
          count: evidenceIds.length,
          error: error instanceof Error ? error.message : String(error),
        },
        'Failed to retrieve evidence batch'
      );
      throw error;
    }
  }
}

/**
 * Singleton instance
 */
export const embeddingStorageService = new EmbeddingStorageService();
