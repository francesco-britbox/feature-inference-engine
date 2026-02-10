/**
 * Markdown Template Formatter
 * Single Responsibility: Format JiraEpicFull/JiraStoryFull into the 17-section Jira template
 * Produces markdown matching the W2C-22 export format
 */

import type {
  JiraEpicFull,
  JiraStoryFull,
  JiraSubtask,
  AcceptanceCriterionStructured,
  LegalConsideration,
  AccessibilityConsideration,
  PlatformNote,
  ExternalDependency,
} from '@/lib/types/ticket';
import type { PlatformCheckbox, RegionEntry } from '@/lib/types/ticketConfig';

/**
 * Formats epic/story data into the Jira-style markdown template
 */
export class MarkdownTemplateFormatter {
  /**
   * Format a full story with all 17 sections of the template
   */
  formatStory(story: JiraStoryFull): string {
    const lines: string[] = [];

    // Section 1: Epic header + Story title
    lines.push(`# ${story.epicName} (${story.epicKey})`);
    lines.push('');
    lines.push(`## [${story.storyKey}] ${story.title}`);
    lines.push('');

    // Section 2: Dates
    lines.push(`**Created:** ${story.createdDate}  `);
    lines.push(`**Updated:** ${story.createdDate}  `);
    lines.push('');
    lines.push('---');
    lines.push('');

    // Section 3: Metadata
    this.appendMetadata(lines, story);

    // Section 4: Sub-tasks
    this.appendSubtasks(lines, story);

    // Section 5: Description header
    lines.push('## Description');
    lines.push('');

    // Section 6: User Story
    this.appendUserStory(lines, story);

    // Section 7: HLR References
    this.appendHlrReferences(lines, story);

    // Section 8: Platforms
    this.appendPlatforms(lines, story.platforms);

    // Section 9: Regions
    this.appendRegions(lines, story.regions);

    // Section 10: User Story Dependencies
    this.appendDependencies(lines, story);

    // Section 11: Acceptance Criteria
    this.appendAcceptanceCriteria(lines, story.structuredAC);

    // Section 12: Legal/Compliance
    this.appendLegalConsiderations(lines, story.legalConsiderations);

    // Section 13: Accessibility
    this.appendAccessibilityConsiderations(lines, story.accessibilityConsiderations);

    // Section 14: Testing Requirements
    this.appendTestingRequirements(lines, story.testingRequirements);

    // Section 15: Technical Implementation / API
    this.appendApiEndpoints(lines, story.apiEndpoints);

    // Section 16: Platform-Specific Notes
    this.appendPlatformNotes(lines, story.platformNotes);

    // Section 17: Security Standards
    this.appendSecurityStandards(lines, story.securityStandards);

    // Section 18: Dependencies / External Services
    this.appendExternalDependencies(lines, story.externalDependencies);

    // Footer
    this.appendFooter(lines, story.reporter);

    return lines.join('\n');
  }

  /**
   * Format a full epic with all stories inlined (for ExportService markdown export)
   */
  formatEpicWithStories(epic: JiraEpicFull): string {
    const lines: string[] = [];

    // Epic header
    lines.push(`# Epic: ${epic.title} (${epic.epicKey})`);
    lines.push('');
    lines.push(`**Project:** ${epic.projectName}  `);
    lines.push(`**Priority:** ${epic.priority || 'Medium'}  `);
    lines.push(`**Created:** ${epic.createdDate}  `);
    if (epic.labels && epic.labels.length > 0) {
      lines.push(`**Labels:** ${epic.labels.join(', ')}  `);
    }
    lines.push('');
    lines.push('---');
    lines.push('');

    // Description
    lines.push('## Description');
    lines.push('');
    lines.push(epic.description);
    lines.push('');
    lines.push('---');
    lines.push('');

    // Stories summary
    lines.push(`## User Stories (${epic.storiesFull.length})`);
    lines.push('');

    // Each story rendered in full
    for (const story of epic.storiesFull) {
      lines.push(this.formatStory(story));
      lines.push('');
      lines.push('---');
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Format an epic summary (for folder generator epic.md - no inline stories)
   */
  formatEpicSummary(epic: JiraEpicFull, platform: string): string {
    const lines: string[] = [];

    lines.push(`# Epic: ${epic.title} (${epic.epicKey})`);
    lines.push('');
    lines.push(`**Platform:** ${platform.toUpperCase()}  `);
    lines.push(`**Project:** ${epic.projectName}  `);
    lines.push(`**Priority:** ${epic.priority || 'Medium'}  `);
    lines.push(`**Created:** ${epic.createdDate}  `);
    if (epic.labels && epic.labels.length > 0) {
      lines.push(`**Labels:** ${epic.labels.join(', ')}  `);
    }
    lines.push('');
    lines.push('---');
    lines.push('');

    // Description
    lines.push('## Description');
    lines.push('');
    lines.push(epic.description);
    lines.push('');

    // Acceptance Criteria (epic-level)
    if (epic.acceptanceCriteria?.scenarios && epic.acceptanceCriteria.scenarios.length > 0) {
      lines.push('## Acceptance Criteria');
      lines.push('');
      for (const scenario of epic.acceptanceCriteria.scenarios) {
        lines.push('### Scenario');
        lines.push(`Given ${scenario.given}  `);
        lines.push(`When ${scenario.when}  `);
        lines.push(`Then ${scenario.then}  `);
        lines.push('');
      }
    }

    // Epic-level enrichment sections
    if (epic.legalConsiderations.length > 0) {
      this.appendLegalConsiderations(lines, epic.legalConsiderations);
    }
    if (epic.accessibilityConsiderations.length > 0) {
      this.appendAccessibilityConsiderations(lines, epic.accessibilityConsiderations);
    }
    if (epic.securityStandards.length > 0) {
      this.appendSecurityStandards(lines, epic.securityStandards);
    }

    // Stories list
    lines.push('## Stories');
    lines.push('');
    lines.push(`This epic contains ${epic.storiesFull.length} user stories.`);
    lines.push('See individual story folders for details.');
    lines.push('');

    for (const story of epic.storiesFull) {
      lines.push(`- **[${story.storyKey}]** ${story.title}`);
    }
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Format a subtask markdown file
   */
  formatSubtask(subtask: JiraSubtask, parentKey: string): string {
    const lines: string[] = [];

    lines.push(`# Subtask: ${subtask.title}`);
    lines.push('');
    lines.push(`**Parent:** ${parentKey}  `);
    lines.push(`**Time Estimate:** ${subtask.timeEstimate}  `);
    if (subtask.assignee) {
      lines.push(`**Assignee:** ${subtask.assignee}  `);
    }
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## Description');
    lines.push('');
    lines.push(subtask.description);
    lines.push('');
    lines.push('## Evidence References');
    lines.push('');
    lines.push('See `references/` folder for evidence JSON files.');
    lines.push('');

    return lines.join('\n');
  }

  // --- Private section formatters ---

  private appendMetadata(lines: string[], story: JiraStoryFull): void {
    lines.push(`**Status:** ${story.status}  `);
    lines.push(`**Project:** ${story.project}  `);
    lines.push('**Components:** None  ');
    lines.push('**Affects versions:** None  ');
    lines.push('**Fix versions:** None  ');
    lines.push(`**Parent:** ${story.epicName}  `);
    lines.push('');
    lines.push('**Type:** Story  ');
    lines.push(`**Priority:** ${story.priority || 'Medium'}  `);
    lines.push('');
    lines.push(`**Reporter:** ${story.reporter}  `);
    lines.push('**Assignee:** Unassigned  ');
    lines.push('**Resolution:** Unresolved  ');
    lines.push('**Votes:** 0  ');
    lines.push(`**Labels:** ${story.labels && story.labels.length > 0 ? story.labels.join(', ') : 'None'}  `);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  private appendSubtasks(lines: string[], story: JiraStoryFull): void {
    if (story.subtasks && story.subtasks.length > 0) {
      lines.push('## Sub-tasks');
      lines.push('');
      for (const subtask of story.subtasks) {
        lines.push(`- ${subtask.title} -- Subtask -- To Do  `);
      }
      lines.push('');
      lines.push('---');
      lines.push('');
    }
  }

  private appendUserStory(lines: string[], story: JiraStoryFull): void {
    if (story.userStory) {
      lines.push('### User Story');
      lines.push('');
      lines.push(`As ${story.userStory.persona}  `);
      lines.push(`I want to ${story.userStory.action}  `);
      lines.push(`So that ${story.userStory.benefit}  `);
      lines.push('');
      lines.push('---');
      lines.push('');
    } else {
      lines.push(story.description);
      lines.push('');
      lines.push('---');
      lines.push('');
    }
  }

  private appendHlrReferences(lines: string[], story: JiraStoryFull): void {
    if (story.hlrReferences.length > 0) {
      lines.push('### HLR Reference');
      lines.push('');
      for (const ref of story.hlrReferences) {
        lines.push(`- ${ref}  `);
      }
      lines.push('');
      lines.push('---');
      lines.push('');
    }
  }

  private appendPlatforms(lines: string[], platforms: PlatformCheckbox[]): void {
    lines.push('### Platforms');
    lines.push('');
    for (const p of platforms) {
      const checkbox = p.enabled ? '[x]' : '[ ]';
      lines.push(`- ${checkbox} ${p.platform}  `);
    }
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  private appendRegions(lines: string[], regions: RegionEntry[]): void {
    const enabledRegions = regions.filter((r) => r.enabled);
    if (enabledRegions.length > 0) {
      lines.push('### Regions Countries');
      lines.push('');
      for (const r of regions) {
        const checkbox = r.enabled ? '[x]' : '[ ]';
        lines.push(`- ${checkbox} ${r.name}  `);
      }
      lines.push('');
      lines.push('---');
      lines.push('');
    }
  }

  private appendDependencies(lines: string[], story: JiraStoryFull): void {
    if (story.storyDependencies) {
      lines.push('### User Story Dependencies');
      lines.push('');
      lines.push(`${story.storyDependencies}  `);
      lines.push('');
      lines.push('---');
      lines.push('');
    }
  }

  private appendAcceptanceCriteria(
    lines: string[],
    criteria: AcceptanceCriterionStructured[]
  ): void {
    if (criteria.length > 0) {
      lines.push('## Acceptance Criteria');
      lines.push('');
      for (const ac of criteria) {
        lines.push(`### AC${ac.number}: ${ac.title}`);
        lines.push(`Given ${ac.given}  `);
        lines.push(`When ${ac.when}  `);
        lines.push(`Then ${ac.then}  `);
        lines.push('');
      }
      lines.push('---');
      lines.push('');
    }
  }

  private appendLegalConsiderations(
    lines: string[],
    legal: LegalConsideration[]
  ): void {
    if (legal.length > 0) {
      lines.push('## Legal/Compliance Considerations');
      lines.push('');
      for (const item of legal) {
        lines.push(`### ${item.regulation} (${item.scope})`);
        lines.push('');
        for (const req of item.requirements) {
          lines.push(`- ${req}  `);
        }
        lines.push('');
      }
      lines.push('---');
      lines.push('');
    }
  }

  private appendAccessibilityConsiderations(
    lines: string[],
    accessibility: AccessibilityConsideration[]
  ): void {
    if (accessibility.length > 0) {
      lines.push('## Accessibility Considerations');
      lines.push('');
      for (const item of accessibility) {
        lines.push(`### ${item.standard}`);
        lines.push('');
        for (const req of item.requirements) {
          lines.push(`- ${req}  `);
        }
        lines.push('');
      }
      lines.push('---');
      lines.push('');
    }
  }

  private appendTestingRequirements(lines: string[], requirements: string[]): void {
    if (requirements.length > 0) {
      lines.push('## Testing Requirements');
      lines.push('');
      for (const req of requirements) {
        lines.push(`- ${req}  `);
      }
      lines.push('');
      lines.push('---');
      lines.push('');
    }
  }

  private appendApiEndpoints(
    lines: string[],
    endpoints: Array<{ endpoint: string; method: string; purpose: string }>
  ): void {
    if (endpoints.length > 0) {
      lines.push('## Technical Implementation Details');
      lines.push('');
      lines.push('### API/Service Manager Details');
      lines.push('');
      lines.push('| Endpoint | Method | Purpose |');
      lines.push('|--------|--------|--------|');
      for (const ep of endpoints) {
        lines.push(`| ${ep.endpoint} | ${ep.method} | ${ep.purpose} |`);
      }
      lines.push('');
      lines.push('---');
      lines.push('');
    }
  }

  private appendPlatformNotes(lines: string[], notes: PlatformNote[]): void {
    if (notes.length > 0) {
      lines.push('## Platform-Specific Notes');
      lines.push('');
      for (const note of notes) {
        lines.push(`### ${note.platform}`);
        lines.push('');
        for (const n of note.notes) {
          lines.push(`- ${n}  `);
        }
        lines.push('');
      }
      lines.push('---');
      lines.push('');
    }
  }

  private appendSecurityStandards(lines: string[], standards: string[]): void {
    if (standards.length > 0) {
      lines.push('## Security Standards');
      lines.push('');
      for (const std of standards) {
        lines.push(`- ${std}  `);
      }
      lines.push('');
      lines.push('---');
      lines.push('');
    }
  }

  private appendExternalDependencies(
    lines: string[],
    deps: ExternalDependency[]
  ): void {
    if (deps.length > 0) {
      lines.push('## Dependencies');
      lines.push('');
      lines.push('### External Services');
      lines.push('');
      for (const dep of deps) {
        lines.push(`- ${dep.service}: ${dep.description} (${dep.criticality})  `);
      }
      lines.push('');
      lines.push('---');
      lines.push('');
    }
  }

  private appendFooter(lines: string[], reporter: string): void {
    const now = new Date().toUTCString();
    lines.push(`Generated at ${now} by ${reporter} using AI Feature Inference Engine.`);
    lines.push('');
  }
}
