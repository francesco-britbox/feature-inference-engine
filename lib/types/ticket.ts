/**
 * Ticket types and interfaces
 * Defines structures for Jira-compatible epics and stories
 * Platform-agnostic format (no Jira-specific IDs)
 */

import type { ApiContract, RequirementsDoc, AcceptanceCriteria } from './output';
import type { Platform } from './platform';
import type { PlatformCheckbox, RegionEntry } from './ticketConfig';

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
 * Jira subtask format
 */
export interface JiraSubtask {
  title: string;
  description: string;
  timeEstimate: string;
  assignee?: string;
}

/**
 * Jira story format with subtasks
 */
export interface JiraStory {
  title: string;
  description: string;
  acceptanceCriteria: string[];
  subtasks?: JiraSubtask[];
  storyPoints?: number;
  labels?: string[];
  priority?: 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest';
  evidenceIds: string[];
}

/**
 * User story narrative (As a / I want / So that)
 */
export interface UserStoryNarrative {
  persona: string;
  action: string;
  benefit: string;
}

/**
 * Structured acceptance criterion with Given/When/Then
 */
export interface AcceptanceCriterionStructured {
  number: number;
  title: string;
  given: string;
  when: string;
  then: string;
}

/**
 * Legal/compliance consideration
 */
export interface LegalConsideration {
  regulation: string;
  scope: string;
  requirements: string[];
}

/**
 * Accessibility consideration
 */
export interface AccessibilityConsideration {
  standard: string;
  requirements: string[];
}

/**
 * Platform-specific implementation notes
 */
export interface PlatformNote {
  platform: string;
  notes: string[];
}

/**
 * External service dependency
 */
export interface ExternalDependency {
  service: string;
  description: string;
  criticality: 'MANDATORY' | 'CRITICAL' | 'OPTIONAL';
}

/**
 * Extended Jira story with full template sections
 */
export interface JiraStoryFull extends JiraStory {
  storyKey: string;
  epicKey: string;
  epicName: string;
  userStory: UserStoryNarrative | null;
  hlrReferences: string[];
  platforms: PlatformCheckbox[];
  regions: RegionEntry[];
  structuredAC: AcceptanceCriterionStructured[];
  legalConsiderations: LegalConsideration[];
  accessibilityConsiderations: AccessibilityConsideration[];
  testingRequirements: string[];
  apiEndpoints: Array<{ endpoint: string; method: string; purpose: string }>;
  platformNotes: PlatformNote[];
  securityStandards: string[];
  externalDependencies: ExternalDependency[];
  createdDate: string;
  status: string;
  project: string;
  reporter: string;
  storyDependencies: string | null;
}

/**
 * Extended Jira epic with full template sections
 */
export interface JiraEpicFull extends JiraEpic {
  epicKey: string;
  projectKey: string;
  projectName: string;
  createdDate: string;
  updatedDate: string;
  reporter: string;
  storiesFull: JiraStoryFull[];
  legalConsiderations: LegalConsideration[];
  accessibilityConsiderations: AccessibilityConsideration[];
  securityStandards: string[];
  platformNotes: PlatformNote[];
  externalDependencies: ExternalDependency[];
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
