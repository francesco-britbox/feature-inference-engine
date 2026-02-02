/**
 * DocumentStatusService
 * Single Responsibility: Manage document status and metadata
 * Follows SRP - separated from extraction logic
 */

import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { documents } from '@/lib/db/schema';
import { logger } from '@/lib/utils/logger';

type DocumentStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Service for managing document status
 */
export class DocumentStatusService {
  private readonly log = logger.child({ service: 'DocumentStatusService' });

  /**
   * Get document by ID
   * @param documentId Document UUID
   * @returns Document record or null if not found
   */
  async getDocument(documentId: string) {
    const [document] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId));

    return document || null;
  }

  /**
   * Update document status
   * @param documentId Document UUID
   * @param status New status
   */
  async updateStatus(documentId: string, status: DocumentStatus): Promise<void> {
    this.log.info({ documentId, status }, 'Updating document status');

    await db
      .update(documents)
      .set({ status })
      .where(eq(documents.id, documentId));
  }

  /**
   * Mark document as processing
   * @param documentId Document UUID
   */
  async markProcessing(documentId: string): Promise<void> {
    await this.updateStatus(documentId, 'processing');
  }

  /**
   * Mark document as completed
   * @param documentId Document UUID
   */
  async markCompleted(documentId: string): Promise<void> {
    this.log.info({ documentId }, 'Marking document as completed');

    await db
      .update(documents)
      .set({
        status: 'completed',
        processedAt: new Date(),
      })
      .where(eq(documents.id, documentId));
  }

  /**
   * Mark document as failed
   * @param documentId Document UUID
   * @param errorMessage Error message
   */
  async markFailed(documentId: string, errorMessage: string): Promise<void> {
    this.log.error({ documentId, errorMessage }, 'Marking document as failed');

    await db
      .update(documents)
      .set({
        status: 'failed',
        errorMessage,
      })
      .where(eq(documents.id, documentId));
  }
}

/**
 * Singleton instance
 */
export const documentStatusService = new DocumentStatusService();
