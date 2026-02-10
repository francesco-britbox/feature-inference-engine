/**
 * Acceptance Criteria Generation Prompts
 * LLM prompt for structuring raw acceptance criteria into Given/When/Then scenarios
 */

/**
 * Build prompt for structuring acceptance criteria via LLM
 * @param storyTitle - Title of the story
 * @param rawCriteria - Raw acceptance criteria strings
 * @param evidenceSummary - Summary of supporting evidence
 * @returns Prompt string for LLM
 */
export function buildAcceptanceCriteriaPrompt(
  storyTitle: string,
  rawCriteria: string[],
  evidenceSummary: string
): string {
  const criteriaList = rawCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n');

  return `You are a QA engineer structuring acceptance criteria for a Jira story.

**Story Title:** ${storyTitle}

**Raw Acceptance Criteria:**
${criteriaList}

**Supporting Evidence:**
${evidenceSummary}

Convert these raw criteria into structured Given/When/Then scenarios. Group related criteria into a single scenario where appropriate. Each scenario needs a short descriptive title.

Respond with ONLY valid JSON in this exact format:
[
  {
    "title": "Short descriptive title for the scenario",
    "given": "the precondition or initial state",
    "when": "the action or trigger",
    "then": "the expected outcome"
  }
]

Rules:
- Group related criteria into one scenario when they share context
- Titles should be specific and descriptive (e.g., "Valid email login" not "Test 1")
- "given" describes the precondition (e.g., "the user is on the login page")
- "when" describes the user action (e.g., "the user enters valid credentials and clicks submit")
- "then" describes the expected result (e.g., "the user is redirected to the dashboard")
- Keep each field to one clear sentence
- Do not include "Given", "When", or "Then" prefixes in the values
- Return at least one scenario per distinct criterion`;
}
