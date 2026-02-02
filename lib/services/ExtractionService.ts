/**
 * ExtractionService
 * Orchestrates document extraction by routing to format-specific extractors
 * Single Responsibility: Extraction coordination ONLY
 * Open/Closed: Open for extension (add new extractors), closed for modification
 * Follows SRP: Uses separate services for database operations
 */

import { screenshotExtractor } from './extractors/ScreenshotExtractor';
import { apiSpecExtractor } from './extractors/ApiSpecExtractor';
import { jiraExtractor } from './extractors/JiraExtractor';
import { pdfExtractor } from './extractors/PdfExtractor';
import { documentStatusService } from './DocumentStatusService';
import { evidenceStorageService } from './EvidenceStorageService';
import { activityLogService } from './ActivityLogService';
import type { Extractor } from '@/lib/types/evidence';
import type { FileType } from '@/lib/types/document';
import type { IExtractionService } from '@/lib/types/services';
import { logger } from '@/lib/utils/logger';

/**
 * Map file types to extractors
 * Follows Open/Closed Principle - add new extractors without modifying this class
 */
const EXTRACTOR_MAP = new Map<FileType, Extractor>([
  ['image', screenshotExtractor],
  ['pdf', pdfExtractor],
  ['md', pdfExtractor], // Markdown uses same extractor as PDF
  ['json', apiSpecExtractor],
  ['yaml', apiSpecExtractor],
  ['csv', jiraExtractor],
]);

export class ExtractionService implements IExtractionService {
  private readonly log = logger.child({ service: 'ExtractionService' });

  /**
   * Extract evidence from a document
   * Single Responsibility: Orchestration only - delegates to specialized services
   * @param documentId Document UUID
   * @returns Number of evidence items extracted
   */
  async extractFromDocument(documentId: string): Promise<number> {
    try {
      // Fetch document (using dedicated service)
      const document = await documentStatusService.getDocument(documentId);

      if (!document) {
        throw new Error(`Document ${documentId} not found`);
      }

      // Update status to processing (using dedicated service)
      await documentStatusService.markProcessing(documentId);

      // Log activity
      activityLogService.addLog(
        'info',
        `Processing: ${document.filename}`,
        { documentId }
      );

      // Route to appropriate extractor
      const extractor = EXTRACTOR_MAP.get(document.fileType as FileType);

      if (!extractor) {
        throw new Error(`No extractor found for file type: ${document.fileType}`);
      }

      // Extract evidence
      this.log.info({ documentId, fileType: document.fileType }, 'Extracting evidence');
      const extractedEvidence = await extractor.extract(
        document.filePath,
        documentId
      );

      // Store evidence (using dedicated service)
      const count = await evidenceStorageService.store(extractedEvidence);

      // Update document status to completed (using dedicated service)
      await documentStatusService.markCompleted(documentId);

      // Log success
      activityLogService.addLog(
        'success',
        `✅ Completed: ${document.filename} (${count} items)`,
        { documentId }
      );

      this.log.info({ documentId, count }, 'Extraction completed');
      return count;
    } catch (error) {
      // Update document status to failed (using dedicated service)
      const errorMessage = error instanceof Error ? error.message : String(error);
      await documentStatusService.markFailed(documentId, errorMessage);

      // Log error
      activityLogService.addLog(
        'error',
        `❌ Failed: ${errorMessage}`,
        { documentId }
      );

      this.log.error({ documentId, error: errorMessage }, 'Extraction failed');

      // Re-throw for queue service to handle
      throw error;
    }
  }

  /**
   * Batch extract evidence from multiple documents
   * @param documentIds Array of document UUIDs
   * @returns Map of document ID to evidence count
   */
  async batchExtract(documentIds: string[]): Promise<Map<string, number>> {
    const results = new Map<string, number>();

    for (const documentId of documentIds) {
      try {
        const count = await this.extractFromDocument(documentId);
        results.set(documentId, count);
      } catch (error) {
        this.log.error(
          {
            documentId,
            error: error instanceof Error ? error.message : String(error),
          },
          'Batch extraction error'
        );
        results.set(documentId, 0);
      }
    }

    return results;
  }
}

/**
 * Singleton instance
 */
export const extractionService = new ExtractionService();
