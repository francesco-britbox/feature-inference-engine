/**
 * Export Service
 * Single Responsibility: Convert epics to different export formats
 * Follows SRP - only handles format conversion, not ticket generation
 * Follows DRY - reuses formatting logic across formats
 */

import type { JiraEpic, JiraEpicFull, ExportFormat, CsvRow } from '@/lib/types/ticket';
import type { AcceptanceCriterion } from '@/lib/types/output';
import { MarkdownTemplateFormatter } from './MarkdownTemplateFormatter';
import { createLogger } from '@/lib/utils/logger';
import { InvalidDataError } from '@/lib/utils/errors';

const logger = createLogger({ service: 'ExportService' });

/**
 * Export Service
 * Converts epics to JSON, Markdown, or CSV format
 */
export class ExportService {
  private formatter = new MarkdownTemplateFormatter();

  /**
   * Export epic to specified format
   * Uses template formatter for markdown when JiraEpicFull is provided
   * @param epic Jira epic (base or full)
   * @param format Export format
   * @returns Formatted string
   */
  exportEpic(epic: JiraEpic | JiraEpicFull, format: ExportFormat): string {
    logger.info({ format, epicTitle: epic.title }, 'Exporting epic');

    if (!epic) {
      throw new InvalidDataError('Epic is required', 'epic');
    }

    switch (format) {
      case 'json':
        return this.exportToJson(epic);
      case 'md':
        // Use template formatter if epic has full template data
        if (this.isEpicFull(epic)) {
          return this.formatter.formatEpicWithStories(epic);
        }
        return this.exportToMarkdownLegacy(epic);
      case 'csv':
        return this.exportToCsv(epic);
      default:
        throw new InvalidDataError(`Unsupported format: ${format}`, 'format');
    }
  }

  /**
   * Type guard: check if epic is JiraEpicFull
   */
  private isEpicFull(epic: JiraEpic | JiraEpicFull): epic is JiraEpicFull {
    return 'epicKey' in epic && 'storiesFull' in epic;
  }

  /**
   * Export to JSON (Jira-importable format)
   * @param epic Jira epic
   * @returns JSON string
   */
  private exportToJson(epic: JiraEpic): string {
    logger.debug('Exporting to JSON');

    const exportData = {
      projects: [
        {
          name: 'Imported Epic',
          key: 'IMP',
          issues: [
            // Epic
            {
              issueType: 'Epic',
              summary: epic.title,
              description: epic.description,
              priority: epic.priority || 'Medium',
              labels: epic.labels || [],
              customFields: {
                acceptanceCriteria: this.formatAcceptanceCriteria(epic.acceptanceCriteria),
                apiContracts: epic.apiContracts
                  ? this.formatApiContracts(epic.apiContracts)
                  : null,
              },
            },
            // Stories
            ...epic.stories.map((story) => ({
              issueType: 'Story',
              summary: story.title,
              description: story.description,
              priority: story.priority || 'Medium',
              labels: story.labels || [],
              storyPoints: story.storyPoints,
              acceptanceCriteria: story.acceptanceCriteria.join('\n'),
              epicLink: epic.title,
              subtasks: story.subtasks || [],
            })),
          ],
        },
      ],
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Legacy markdown export (flat format, used when JiraEpicFull is not available)
   * @param epic Jira epic
   * @returns Markdown string
   */
  private exportToMarkdownLegacy(epic: JiraEpic): string {
    logger.debug('Exporting to Markdown');

    const lines: string[] = [];

    // Epic header
    lines.push(`# Epic: ${epic.title}`);
    lines.push('');
    lines.push(`**Priority**: ${epic.priority || 'Medium'}`);
    if (epic.labels && epic.labels.length > 0) {
      lines.push(`**Labels**: ${epic.labels.join(', ')}`);
    }
    lines.push('');

    // Description
    lines.push('## Description');
    lines.push('');
    lines.push(epic.description);
    lines.push('');

    // Acceptance Criteria
    if (epic.acceptanceCriteria.scenarios.length > 0) {
      lines.push('## Acceptance Criteria');
      lines.push('');
      for (const scenario of epic.acceptanceCriteria.scenarios) {
        lines.push(`### Scenario`);
        lines.push(`- **Given**: ${scenario.given}`);
        lines.push(`- **When**: ${scenario.when}`);
        lines.push(`- **Then**: ${scenario.then}`);
        lines.push('');
      }
    }

    // API Contracts
    if (epic.apiContracts && epic.apiContracts.endpoints.length > 0) {
      lines.push('## API Contracts');
      lines.push('');
      for (const endpoint of epic.apiContracts.endpoints) {
        lines.push(`### ${endpoint.method} ${endpoint.path}`);
        lines.push('');
        lines.push(endpoint.description);
        lines.push('');
        lines.push(`**Authentication**: ${endpoint.auth}`);
        lines.push('');
      }
    }

    // Requirements
    if (epic.requirements) {
      lines.push('## Requirements');
      lines.push('');
      lines.push(epic.requirements.summary);
      lines.push('');

      if (epic.requirements.functionalRequirements.length > 0) {
        lines.push('### Functional Requirements');
        lines.push('');
        for (const req of epic.requirements.functionalRequirements) {
          lines.push(`- ${req}`);
        }
        lines.push('');
      }
    }

    // Stories
    lines.push('## User Stories');
    lines.push('');
    for (let i = 0; i < epic.stories.length; i++) {
      const story = epic.stories[i]!;
      lines.push(`### Story ${i + 1}: ${story.title}`);
      lines.push('');
      lines.push(`**Priority**: ${story.priority || 'Medium'}`);
      if (story.storyPoints) {
        lines.push(`**Story Points**: ${story.storyPoints}`);
      }
      if (story.labels && story.labels.length > 0) {
        lines.push(`**Labels**: ${story.labels.join(', ')}`);
      }
      lines.push('');
      lines.push(story.description);
      lines.push('');

      if (story.acceptanceCriteria.length > 0) {
        lines.push('**Acceptance Criteria**:');
        for (const criterion of story.acceptanceCriteria) {
          lines.push(`- ${criterion}`);
        }
        lines.push('');
      }

      // Add subtasks if present
      if (story.subtasks && story.subtasks.length > 0) {
        lines.push('**Subtasks**:');
        for (const subtask of story.subtasks) {
          lines.push(`- [ ] ${subtask.title} (${subtask.timeEstimate})`);
          if (subtask.description) {
            lines.push(`  - ${subtask.description}`);
          }
        }
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
   * Export to CSV (bulk import format)
   * @param epic Jira epic
   * @returns CSV string
   */
  private exportToCsv(epic: JiraEpic): string {
    logger.debug('Exporting to CSV');

    const rows: CsvRow[] = [];

    // Epic row
    rows.push({
      type: 'Epic',
      title: epic.title,
      description: this.escapeCsv(epic.description),
      acceptanceCriteria: this.escapeCsv(
        this.formatAcceptanceCriteria(epic.acceptanceCriteria)
      ),
      priority: epic.priority || 'Medium',
      labels: (epic.labels || []).join(';'),
    });

    // Story rows
    for (const story of epic.stories) {
      rows.push({
        type: 'Story',
        title: story.title,
        description: this.escapeCsv(story.description),
        acceptanceCriteria: this.escapeCsv(story.acceptanceCriteria.join('\n')),
        priority: story.priority || 'Medium',
        labels: (story.labels || []).join(';'),
        storyPoints: story.storyPoints ? String(story.storyPoints) : '',
      });
    }

    // Convert to CSV string
    const header = 'Type,Title,Description,Acceptance Criteria,Priority,Labels,Story Points';
    const csvLines = [header];

    for (const row of rows) {
      csvLines.push(
        [
          row.type,
          this.quoteCsv(row.title),
          this.quoteCsv(row.description),
          this.quoteCsv(row.acceptanceCriteria),
          row.priority,
          this.quoteCsv(row.labels),
          row.storyPoints || '',
        ].join(',')
      );
    }

    return csvLines.join('\n');
  }

  /**
   * Format acceptance criteria as string
   * @param criteria Acceptance criteria
   * @returns Formatted string
   */
  private formatAcceptanceCriteria(criteria: {
    scenarios: AcceptanceCriterion[];
    edgeCases?: string[];
    notes?: string[];
  }): string {
    const lines: string[] = [];

    for (const scenario of criteria.scenarios) {
      lines.push(`Given ${scenario.given}`);
      lines.push(`When ${scenario.when}`);
      lines.push(`Then ${scenario.then}`);
      lines.push('');
    }

    if (criteria.edgeCases && criteria.edgeCases.length > 0) {
      lines.push('Edge Cases:');
      for (const edgeCase of criteria.edgeCases) {
        lines.push(`- ${edgeCase}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Format API contracts as string
   * @param contracts API contracts
   * @returns Formatted string
   */
  private formatApiContracts(contracts: { endpoints: Array<{ method: string; path: string; description: string }> }): string {
    const lines: string[] = [];

    for (const endpoint of contracts.endpoints) {
      lines.push(`${endpoint.method} ${endpoint.path}: ${endpoint.description}`);
    }

    return lines.join('\n');
  }

  /**
   * Escape CSV special characters
   * @param value String value
   * @returns Escaped string
   */
  private escapeCsv(value: string): string {
    // Replace line breaks with spaces
    return value.replace(/\n/g, ' ').replace(/\r/g, '');
  }

  /**
   * Quote CSV value if needed
   * @param value String value
   * @returns Quoted string
   */
  private quoteCsv(value: string): string {
    // Quote if contains comma, quote, or newline
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
