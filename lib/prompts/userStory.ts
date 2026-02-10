/**
 * User Story Generation Prompts
 * LLM prompt for generating "As a / I want / So that" narratives
 */

/**
 * Build prompt for generating a user story narrative
 * @param featureName - Name of the feature/story
 * @param description - Feature description
 * @param evidenceSummary - Summary of supporting evidence
 * @returns Prompt string for LLM
 */
export function buildUserStoryPrompt(
  featureName: string,
  description: string,
  evidenceSummary: string
): string {
  return `You are a product manager writing a user story for a Jira ticket.

**Feature Name:** ${featureName}

**Description:** ${description}

**Supporting Evidence:**
${evidenceSummary}

Generate a user story in the standard format. The persona should be a realistic end-user type (e.g., "a BritBox user", "a subscriber", "an admin"). The action should describe what they want to do. The benefit should explain why.

Respond with ONLY valid JSON in this exact format:
{
  "persona": "a <user type>",
  "action": "<what the user wants to do>",
  "benefit": "<why they want to do it>"
}

Rules:
- persona starts with a lowercase article (e.g., "a registered user", "an admin")
- action starts with a verb (e.g., "login with my email and password")
- benefit starts with a clause (e.g., "I can access my account and stream content")
- Keep each field to one concise sentence
- Do not include "As a", "I want to", or "So that" prefixes in the values`;
}
