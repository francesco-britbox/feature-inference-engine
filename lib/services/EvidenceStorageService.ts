/**
 * EvidenceStorageService
 * Single Responsibility: Store and retrieve evidence from database
 * Follows SRP - separated from extraction logic
 */

import { db } from '@/lib/db/client';
import { evidence } from '@/lib/db/schema';
import type { Evidence } from '@/lib/types/evidence';
import { validateEvidenceRawData } from '@/lib/utils/validation';
import { logger } from '@/lib/utils/logger';
import { InvalidDataError } from '@/lib/utils/errors';
import { activityLogService } from './ActivityLogService';

/**
 * Service for storing evidence
 */
export class EvidenceStorageService {
  private readonly log = logger.child({ service: 'EvidenceStorageService' });

  /**
   * Store evidence items in database
   * @param evidenceItems Array of evidence to store
   * @returns Number of items stored
   */
  async store(evidenceItems: Evidence[]): Promise<number> {
    if (evidenceItems.length === 0) {
      this.log.info('No evidence to store');
      return 0;
    }

    this.log.info({ count: evidenceItems.length }, 'Storing evidence');

    try {
      // Validate all rawData fields before insertion
      const validatedEvidence = evidenceItems.map((item) => {
        // Validate rawData
        const validatedRawData = validateEvidenceRawData(item.rawData);

        return {
          documentId: item.documentId,
          type: item.type,
          content: item.content,
          rawData: validatedRawData as unknown as typeof evidence.$inferInsert.rawData,
        };
      });

      // Batch insert
      await db.insert(evidence).values(validatedEvidence);

      this.log.info(
        { count: evidenceItems.length },
        'Evidence stored successfully'
      );

      // Log to activity feed
      if (evidenceItems.length > 0) {
        const documentId = evidenceItems[0]?.documentId;
        activityLogService.addLog(
          'success',
          `💾 Stored ${evidenceItems.length} evidence items`,
          { documentId }
        );
      }

      return evidenceItems.length;
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          count: evidenceItems.length,
        },
        'Failed to store evidence'
      );

      if (error instanceof Error && error.message.includes('Invalid evidence rawData')) {
        throw new InvalidDataError(error.message, 'rawData');
      }

      throw error;
    }
  }

  /**
   * Store a single evidence item
   * @param item Evidence item to store
   * @returns Evidence ID
   */
  async storeOne(item: Evidence): Promise<string> {
    await this.store([item]);
    return item.id || '';
  }
}

/**
 * Singleton instance
 */
export const evidenceStorageService = new EvidenceStorageService();
