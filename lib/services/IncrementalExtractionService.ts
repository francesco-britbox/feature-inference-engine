/**
 * Incremental Extraction Service
 * Single Responsibility: Orchestrate incremental extraction for changed documents
 * Follows DIP: Injects ExtractionService dependency
 * Follows SRP: Only handles incremental extraction orchestration
 */

import { db } from '@/lib/db/client';
import { evidence, featureEvidence } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { createLogger } from '@/lib/utils/logger';
import { InvalidDataError } from '@/lib/utils/errors';
import type { IExtractionService } from '@/lib/types/services';

const logger = createLogger({ service: 'IncrementalExtractionService' });

/**
 * Incremental extraction result
 */
interface IncrementalExtractionResult {
  documentId: string;
  obsoleteEvidenceCount: number;
  newEvidenceCount: number;
  affectedFeatures: string[];
}

/**
 * Incremental Extraction Service
 * Processes only changed documents, marks old evidence as obsolete
 * Extracts new evidence and tracks affected features
 */
export class IncrementalExtractionService {
  /**
   * Constructor with dependency injection
   * @param extractionService - Service for document extraction
   */
  constructor(private extractionService: IExtractionService) {}

  /**
   * Process a changed document incrementally
   * 1. Mark old evidence as obsolete (soft delete)
   * 2. Extract new evidence
   * 3. Track affected features
   *
   * @param documentId - Document UUID
   * @returns Incremental extraction result
   */
  async processChangedDocument(documentId: string): Promise<IncrementalExtractionResult> {
    if (!documentId) {
      throw new InvalidDataError('Document ID is required');
    }

    logger.info({ documentId }, 'Starting incremental extraction');

    try {
      // Step 1: Get affected features BEFORE marking evidence obsolete
      const affectedFeatures = await this.getAffectedFeatures(documentId);

      logger.info(
        { documentId, affectedFeaturesCount: affectedFeatures.length },
        'Identified affected features'
      );

      // Step 2: Mark old evidence as obsolete (soft delete)
      const obsoleteCount = await this.markEvidenceAsObsolete(documentId);

      logger.info({ documentId, obsoleteCount }, 'Marked old evidence as obsolete');

      // Step 3: Extract new evidence using injected service
      const newEvidenceCount = await this.extractionService.extractFromDocument(documentId);

      logger.info({ documentId, newEvidenceCount }, 'Extracted new evidence');

      // Step 4: Return result
      const result: IncrementalExtractionResult = {
        documentId,
        obsoleteEvidenceCount: obsoleteCount,
        newEvidenceCount,
        affectedFeatures,
      };

      logger.info(
        {
          documentId,
          obsoleteCount,
          newEvidenceCount,
          affectedFeaturesCount: affectedFeatures.length,
        },
        'Incremental extraction completed'
      );

      return result;
    } catch (error) {
      logger.error(
        { documentId, error: error instanceof Error ? error.message : String(error) },
        'Failed to process changed document'
      );
      throw error;
    }
  }

  /**
   * Batch process multiple changed documents
   * @param documentIds - Array of document UUIDs
   * @returns Array of incremental extraction results
   */
  async batchProcessChangedDocuments(
    documentIds: string[]
  ): Promise<IncrementalExtractionResult[]> {
    logger.info({ count: documentIds.length }, 'Starting batch incremental extraction');

    const results: IncrementalExtractionResult[] = [];

    for (const documentId of documentIds) {
      try {
        const result = await this.processChangedDocument(documentId);
        results.push(result);
      } catch (error) {
        logger.error(
          { documentId, error: error instanceof Error ? error.message : String(error) },
          'Batch incremental extraction error'
        );

        // Continue with other documents even if one fails
        results.push({
          documentId,
          obsoleteEvidenceCount: 0,
          newEvidenceCount: 0,
          affectedFeatures: [],
        });
      }
    }

    logger.info({ totalResults: results.length }, 'Batch incremental extraction completed');

    return results;
  }

  /**
   * Mark all evidence from a document as obsolete (soft delete)
   * Sets obsolete flag to 1 instead of deleting records
   *
   * @param documentId - Document UUID
   * @returns Number of evidence items marked obsolete
   */
  private async markEvidenceAsObsolete(documentId: string): Promise<number> {
    try {
      // Get count of evidence that will be marked obsolete
      const currentEvidence = await db
        .select({ id: evidence.id })
        .from(evidence)
        .where(and(eq(evidence.documentId, documentId), eq(evidence.obsolete, false)));

      const count = currentEvidence.length;

      if (count === 0) {
        logger.info({ documentId }, 'No active evidence to mark obsolete');
        return 0;
      }

      // Mark evidence as obsolete (soft delete)
      await db
        .update(evidence)
        .set({ obsolete: true })
        .where(and(eq(evidence.documentId, documentId), eq(evidence.obsolete, false)));

      logger.info({ documentId, count }, 'Marked evidence as obsolete');

      return count;
    } catch (error) {
      logger.error(
        { documentId, error: error instanceof Error ? error.message : String(error) },
        'Failed to mark evidence as obsolete'
      );
      throw error;
    }
  }

  /**
   * Get features affected by a document's evidence
   * Returns feature IDs linked to evidence from this document
   *
   * @param documentId - Document UUID
   * @returns Array of affected feature IDs
   */
  private async getAffectedFeatures(documentId: string): Promise<string[]> {
    try {
      // Get evidence IDs from this document
      const evidenceIds = await db
        .select({ id: evidence.id })
        .from(evidence)
        .where(and(eq(evidence.documentId, documentId), eq(evidence.obsolete, false)));

      if (evidenceIds.length === 0) {
        logger.info({ documentId }, 'No active evidence, no affected features');
        return [];
      }

      // Get features linked to this evidence
      const evidenceIdList = evidenceIds.map((e) => e.id);

      // Use separate queries to avoid complex IN clause with many IDs
      const affectedFeatureIds = new Set<string>();

      for (const evidenceId of evidenceIdList) {
        const links = await db
          .select({ featureId: featureEvidence.featureId })
          .from(featureEvidence)
          .where(eq(featureEvidence.evidenceId, evidenceId));

        for (const link of links) {
          affectedFeatureIds.add(link.featureId);
        }
      }

      const result = Array.from(affectedFeatureIds);

      logger.info(
        { documentId, evidenceCount: evidenceIds.length, affectedFeaturesCount: result.length },
        'Retrieved affected features'
      );

      return result;
    } catch (error) {
      logger.error(
        { documentId, error: error instanceof Error ? error.message : String(error) },
        'Failed to get affected features'
      );
      throw error;
    }
  }

  /**
   * Get statistics about obsolete evidence
   * Returns count of obsolete vs active evidence per document
   *
   * @param documentId - Document UUID
   * @returns Statistics object
   */
  async getObsoleteEvidenceStats(documentId: string): Promise<{
    documentId: string;
    activeCount: number;
    obsoleteCount: number;
    totalCount: number;
  }> {
    if (!documentId) {
      throw new InvalidDataError('Document ID is required');
    }

    try {
      // Get active evidence count
      const activeEvidence = await db
        .select({ id: evidence.id })
        .from(evidence)
        .where(and(eq(evidence.documentId, documentId), eq(evidence.obsolete, false)));

      // Get obsolete evidence count
      const obsoleteEvidence = await db
        .select({ id: evidence.id })
        .from(evidence)
        .where(and(eq(evidence.documentId, documentId), eq(evidence.obsolete, true)));

      const activeCount = activeEvidence.length;
      const obsoleteCount = obsoleteEvidence.length;

      return {
        documentId,
        activeCount,
        obsoleteCount,
        totalCount: activeCount + obsoleteCount,
      };
    } catch (error) {
      logger.error(
        { documentId, error: error instanceof Error ? error.message : String(error) },
        'Failed to get obsolete evidence stats'
      );
      throw error;
    }
  }
}
