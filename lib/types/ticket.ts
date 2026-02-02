/**
 * Ticket types and interfaces
 * Defines structures for Jira-compatible epics and stories
 * Platform-agnostic format (no Jira-specific IDs)
 */

import type { ApiContract, RequirementsDoc, AcceptanceCriteria } from './output';
import type { Platform } from './platform';

/**
 * Jira epic format with optional platform targeting
 */
export interface JiraEpic {
  title: string;
  description: string;
  acceptanceCriteria: AcceptanceCriteria;
  apiContracts?: ApiContract;
  requirements?: RequirementsDoc;
  stories: JiraStory[];
  labels?: string[];
  priority?: 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest';
  platform?: Platform;
}

/**
 * Jira story format (platform-agnostic)
 */
export interface JiraStory {
  title: string;
  description: string;
  acceptanceCriteria: string[];
  storyPoints?: number;
  labels?: string[];
  priority?: 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest';
  evidenceIds: string[];
}

/**
 * Export format type
 */
export type ExportFormat = 'json' | 'md' | 'csv';

/**
 * Ticket export structure
 */
export interface TicketExport {
  epic: JiraEpic;
  format: ExportFormat;
  generatedAt: Date;
  featureId: string;
}

/**
 * CSV row structure for bulk import
 */
export interface CsvRow {
  type: 'Epic' | 'Story';
  title: string;
  description: string;
  acceptanceCriteria: string;
  priority: string;
  labels: string;
  storyPoints?: string;
}
