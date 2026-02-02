/**
 * Change Detection Service
 * Single Responsibility: Detect document changes for incremental processing
 * Follows SRP: Only handles change detection logic
 */

import { db } from '@/lib/db/client';
import { documents } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createLogger } from '@/lib/utils/logger';
import { InvalidDataError } from '@/lib/utils/errors';

const logger = createLogger({ service: 'ChangeDetectionService' });

/**
 * Change detection result
 */
interface ChangeDetectionResult {
  documentId: string;
  isNew: boolean;
  isModified: boolean;
  previousVersion: number;
  currentVersion: number;
  previousHash?: string;
  currentHash: string;
}

/**
 * Change Detection Service
 * Detects new and modified documents by comparing file hashes
 * Tracks document versions for incremental processing
 */
export class ChangeDetectionService {
  /**
   * Detect if a document is new or has been modified
   * Compares file hash with existing document
   *
   * @param fileHash - Hash of the current file content
   * @param filename - Original filename for lookup
   * @returns Change detection result
   */
  async detectChange(fileHash: string, filename: string): Promise<ChangeDetectionResult> {
    if (!fileHash) {
      throw new InvalidDataError('File hash is required');
    }

    if (!filename) {
      throw new InvalidDataError('Filename is required');
    }

    logger.info({ filename, fileHash }, 'Detecting document changes');

    try {
      // Check if document with this hash exists
      const existingByHash = await db
        .select({
          id: documents.id,
          version: documents.version,
          fileHash: documents.fileHash,
        })
        .from(documents)
        .where(eq(documents.fileHash, fileHash))
        .limit(1);

      // If hash exists, document is unchanged
      if (existingByHash.length > 0) {
        const doc = existingByHash[0];

        if (!doc) {
          throw new Error('Document query returned undefined');
        }

        logger.info({ documentId: doc.id, version: doc.version }, 'Document unchanged');

        return {
          documentId: doc.id,
          isNew: false,
          isModified: false,
          previousVersion: doc.version,
          currentVersion: doc.version,
          previousHash: doc.fileHash,
          currentHash: fileHash,
        };
      }

      // Check if document with same filename exists (potential modification)
      const existingByFilename = await db
        .select({
          id: documents.id,
          version: documents.version,
          fileHash: documents.fileHash,
        })
        .from(documents)
        .where(eq(documents.filename, filename))
        .limit(1);

      // If filename exists with different hash, it's modified
      if (existingByFilename.length > 0) {
        const doc = existingByFilename[0];

        if (!doc) {
          throw new Error('Document query returned undefined');
        }

        logger.info({ documentId: doc.id, previousVersion: doc.version }, 'Document modified');

        return {
          documentId: doc.id,
          isNew: false,
          isModified: true,
          previousVersion: doc.version,
          currentVersion: doc.version + 1,
          previousHash: doc.fileHash,
          currentHash: fileHash,
        };
      }

      // Document is completely new
      logger.info({ filename }, 'New document detected');

      return {
        documentId: '', // Will be set after insertion
        isNew: true,
        isModified: false,
        previousVersion: 0,
        currentVersion: 1,
        currentHash: fileHash,
      };
    } catch (error) {
      logger.error(
        { filename, error: error instanceof Error ? error.message : String(error) },
        'Failed to detect document changes'
      );
      throw error;
    }
  }

  /**
   * Increment document version after reprocessing
   * Updates version number in database
   *
   * @param documentId - Document UUID
   * @returns New version number
   */
  async incrementVersion(documentId: string): Promise<number> {
    if (!documentId) {
      throw new InvalidDataError('Document ID is required');
    }

    logger.info({ documentId }, 'Incrementing document version');

    try {
      // Get current version
      const [current] = await db
        .select({ version: documents.version })
        .from(documents)
        .where(eq(documents.id, documentId))
        .limit(1);

      if (!current) {
        throw new InvalidDataError(`Document ${documentId} not found`);
      }

      const newVersion = current.version + 1;

      // Update version
      await db
        .update(documents)
        .set({ version: newVersion })
        .where(eq(documents.id, documentId));

      logger.info({ documentId, newVersion }, 'Document version incremented');

      return newVersion;
    } catch (error) {
      logger.error(
        { documentId, error: error instanceof Error ? error.message : String(error) },
        'Failed to increment document version'
      );
      throw error;
    }
  }

  /**
   * Get documents that need reprocessing
   * Returns documents with status='uploaded' (new uploads)
   *
   * @returns Array of document IDs needing reprocessing
   */
  async getDocumentsNeedingReprocessing(): Promise<string[]> {
    logger.info('Fetching documents needing reprocessing');

    try {
      const docs = await db
        .select({ id: documents.id })
        .from(documents)
        .where(eq(documents.status, 'uploaded'));

      const documentIds = docs.map((doc) => doc.id);

      logger.info({ count: documentIds.length }, 'Documents needing reprocessing');

      return documentIds;
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error) },
        'Failed to get documents needing reprocessing'
      );
      throw error;
    }
  }

  /**
   * Check if document needs reprocessing
   * Returns true if document status is 'uploaded' or 'failed'
   *
   * @param documentId - Document UUID
   * @returns True if needs reprocessing
   */
  async needsReprocessing(documentId: string): Promise<boolean> {
    if (!documentId) {
      throw new InvalidDataError('Document ID is required');
    }

    try {
      const [doc] = await db
        .select({ status: documents.status })
        .from(documents)
        .where(eq(documents.id, documentId))
        .limit(1);

      if (!doc) {
        throw new InvalidDataError(`Document ${documentId} not found`);
      }

      const needsReprocessing = doc.status === 'uploaded' || doc.status === 'failed';

      logger.info({ documentId, status: doc.status, needsReprocessing }, 'Checked reprocessing need');

      return needsReprocessing;
    } catch (error) {
      logger.error(
        { documentId, error: error instanceof Error ? error.message : String(error) },
        'Failed to check if document needs reprocessing'
      );
      throw error;
    }
  }
}

/**
 * Singleton instance
 */
export const changeDetectionService = new ChangeDetectionService();
