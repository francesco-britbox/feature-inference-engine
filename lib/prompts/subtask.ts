/**
 * Subtask Generation Prompts
 * LLM prompts for breaking user stories into granular subtasks
 */

import type { JiraStory } from '@/lib/types/ticket';
import type { Platform } from '@/lib/types/platform';
import { PLATFORM_TECH_STACKS, PLATFORM_NAMES } from '@/lib/types/platform';

/**
 * Build prompt for generating subtasks from a user story
 * Instructs LLM to break story into 5-10 granular, platform-specific subtasks
 *
 * @param story - User story to break down
 * @param platform - Target platform for implementation
 * @returns Prompt string for LLM
 */
export function buildSubtaskPrompt(story: JiraStory, platform: Platform): string {
  const techStack = PLATFORM_TECH_STACKS[platform].join(', ');
  const platformName = PLATFORM_NAMES[platform];

  return `
You are a technical project manager breaking down a user story into granular subtasks for ${platformName} development.

**User Story:**
${story.title}

**Description:**
${story.description}

**Acceptance Criteria:**
${story.acceptanceCriteria.join('\n')}

**Target Platform:** ${platformName}
**Technology Stack:** ${techStack}

**Task:**
Break this user story into 5-10 specific, actionable subtasks that a developer can implement.

**Requirements:**
1. Each subtask should be granular and concrete (e.g., "Create login form component", not "Build UI")
2. Use platform-specific terminology (UIKit for iOS, Jetpack Compose for Android, React components for web)
3. Include realistic time estimates in format "Xh" (hours) or "Xd" (days)
4. Order subtasks logically (setup → implementation → testing)
5. Each subtask should take 1-8 hours (not entire days)
6. Focus on implementation details, not planning

**Output Format (JSON):**
{
  "subtasks": [
    {
      "title": "Create UIKit login view controller",
      "description": "Set up UIViewController subclass with outlets for email/password fields and login button",
      "timeEstimate": "2h"
    },
    {
      "title": "Implement email text field validation",
      "description": "Add real-time email format validation with UITextFieldDelegate",
      "timeEstimate": "1h"
    }
  ]
}

Generate 5-10 subtasks in JSON format. Be specific and technical.
`.trim();
}
