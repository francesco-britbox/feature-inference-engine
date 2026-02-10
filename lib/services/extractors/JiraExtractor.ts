/**
 * JiraExtractor
 * Extracts requirements, bugs, and acceptance criteria from Jira CSV exports
 * Single Responsibility: Jira CSV parsing only
 */

import { createReadStream } from 'fs';
import Papa from 'papaparse';
import type { Evidence, Extractor } from '@/lib/types/evidence';
import { logger } from '@/lib/utils/logger';
import { activityLogService } from '@/lib/services/ActivityLogService';

interface JiraRow {
  'Issue key'?: string;
  'Issue Type'?: string;
  Summary?: string;
  Description?: string;
  Status?: string;
  Priority?: string;
  [key: string]: string | undefined;
}

const BATCH_SIZE = 500;

export class JiraExtractor implements Extractor {
  private readonly log = logger.child({ extractor: 'JiraExtractor' });
  /**
   * Extract evidence from Jira CSV export
   * @param filePath Path to CSV file
   * @param documentId Document UUID
   * @returns Array of evidence (requirements, bugs, acceptance criteria)
   */
  async extract(filePath: string, documentId: string): Promise<Evidence[]> {
    try {
      const evidence: Evidence[] = [];
      let rowBatch: JiraRow[] = [];
      let totalRows = 0;
      let batchNumber = 0;
      let parseErrors: Papa.ParseError[] = [];

      await new Promise<void>((resolve, reject) => {
        const stream = createReadStream(filePath, { encoding: 'utf-8' });

        Papa.parse<JiraRow>(stream, {
          header: true,
          skipEmptyLines: true,
          step: (result) => {
            if (result.errors.length > 0) {
              parseErrors = parseErrors.concat(result.errors);
            }
            rowBatch.push(result.data);
            totalRows++;

            if (rowBatch.length >= BATCH_SIZE) {
              batchNumber++;
              const batchEvidence = this.processRowBatch(rowBatch, documentId);
              evidence.push(...batchEvidence);
              activityLogService.addLog(
                'info',
                `📊 CSV batch ${batchNumber}: processed ${totalRows} rows (${evidence.length} evidence items so far)`,
                { documentId }
              );
              rowBatch = [];
            }
          },
          complete: () => resolve(),
          error: (err: Error) => reject(err),
        });
      });

      // Process remaining rows
      if (rowBatch.length > 0) {
        batchNumber++;
        const batchEvidence = this.processRowBatch(rowBatch, documentId);
        evidence.push(...batchEvidence);
      }

      if (parseErrors.length > 0) {
        this.log.error({ documentId, errors: parseErrors }, 'CSV parsing errors');
      }

      activityLogService.addLog(
        'success',
        `✅ CSV complete: ${totalRows} rows → ${evidence.length} evidence items`,
        { documentId }
      );

      return evidence;
    } catch (error) {
      this.log.error(
        {
          documentId,
          filePath,
          error: error instanceof Error ? error.message : String(error),
        },
        'Jira CSV extraction failed'
      );
      return [];
    }
  }

  /**
   * Process a batch of CSV rows into evidence items
   */
  private processRowBatch(rows: JiraRow[], documentId: string): Evidence[] {
    const evidence: Evidence[] = [];

    for (const row of rows) {
      // Extract summary as requirement
      if (row.Summary) {
        evidence.push({
          documentId,
          type: 'requirement',
          content: row.Summary,
          rawData: {
            ticket: row['Issue key'],
            type: row['Issue Type'],
            priority: row.Priority,
            status: row.Status,
            source: 'summary',
          },
        });
      }

      // Extract description as detailed requirement
      if (row.Description && row.Description.trim()) {
        evidence.push({
          documentId,
          type: 'requirement',
          content: row.Description,
          rawData: {
            ticket: row['Issue key'],
            type: row['Issue Type'],
            source: 'description',
          },
        });
      }

      // Handle bugs separately
      if (row['Issue Type'] === 'Bug' && row.Summary) {
        evidence.push({
          documentId,
          type: 'bug',
          content: `Bug: ${row.Summary}${row.Description ? ' - ' + row.Description : ''}`,
          rawData: {
            ticket: row['Issue key'],
            status: row.Status,
            priority: row.Priority,
          },
        });
      }

      // Extract acceptance criteria if present
      const acceptanceCriteria = row['Acceptance Criteria'];
      if (acceptanceCriteria && acceptanceCriteria.trim()) {
        // Split by newlines or bullet points
        const criteria = acceptanceCriteria
          .split(/\n|•|-/)
          .map((c) => c.trim())
          .filter((c) => c.length > 0);

        for (const criterion of criteria) {
          evidence.push({
            documentId,
            type: 'acceptance_criteria',
            content: criterion,
            rawData: {
              ticket: row['Issue key'],
            },
          });
        }
      }
    }

    return evidence;
  }
}

/**
 * Singleton instance
 */
export const jiraExtractor = new JiraExtractor();
