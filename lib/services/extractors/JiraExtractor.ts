/**
 * JiraExtractor
 * Extracts requirements, bugs, and acceptance criteria from Jira CSV exports
 * Single Responsibility: Jira CSV parsing only
 */

import fs from 'fs/promises';
import Papa from 'papaparse';
import type { Evidence, Extractor } from '@/lib/types/evidence';
import { logger } from '@/lib/utils/logger';

interface JiraRow {
  'Issue key'?: string;
  'Issue Type'?: string;
  Summary?: string;
  Description?: string;
  Status?: string;
  Priority?: string;
  [key: string]: string | undefined;
}

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
      const csvContent = await fs.readFile(filePath, 'utf-8');

      // Parse CSV
      const parsed = Papa.parse<JiraRow>(csvContent, {
        header: true,
        skipEmptyLines: true,
      });

      if (parsed.errors.length > 0) {
        this.log.error({ documentId, errors: parsed.errors }, 'CSV parsing errors');
      }

      const evidence: Evidence[] = [];

      for (const row of parsed.data) {
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
}

/**
 * Singleton instance
 */
export const jiraExtractor = new JiraExtractor();
