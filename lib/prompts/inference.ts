/**
 * LLM prompts for feature inference
 * Version-controlled and documented
 */

/**
 * Prompt for generating feature hypothesis from evidence cluster
 * Version: 1.0
 * Model: gpt-4o
 * Temperature: 0.3
 */
export function buildFeatureHypothesisPrompt(evidenceItems: string[]): string {
  return `
Given these evidence items from an OTT platform, identify the user-facing feature they describe.

Evidence:
${evidenceItems.map((e, i) => `${i + 1}. ${e}`).join('\n')}

Analyze the evidence and infer the feature. Return JSON:
{
  "feature_name": "Clear, concise feature name (e.g., 'User Login')",
  "description": "Brief description of what users can do",
  "confidence": 0.0-1.0,
  "reasoning": "Why these evidence items relate to this feature"
}

Guidelines:
- Feature name should be user-facing (not technical implementation)
- Confidence based on evidence strength and consistency
- Reasoning should explain the connection between evidence items
- Focus on WHAT users can do, not HOW it's implemented

Example:
{
  "feature_name": "User Login",
  "description": "Users can authenticate with email and password to access their account",
  "confidence": 0.85,
  "reasoning": "Evidence includes login endpoint, email/password inputs, and authentication requirements"
}
`.trim();
}

/**
 * Prompt for comparing features across clusters (duplicate detection)
 * Version: 1.0
 * Model: gpt-4o
 * Temperature: 0.2
 */
export function buildFeatureSimilarityPrompt(
  feature1: { name: string; description: string },
  feature2: { name: string; description: string }
): string {
  return `
Compare these two features and determine if they represent the same capability.

Feature 1:
Name: ${feature1.name}
Description: ${feature1.description}

Feature 2:
Name: ${feature2.name}
Description: ${feature2.description}

Return JSON:
{
  "is_duplicate": true/false,
  "similarity_score": 0.0-1.0,
  "reasoning": "Why they are/aren't the same feature",
  "recommended_merge": "feature1" | "feature2" | "combine"
}

Guidelines:
- is_duplicate: true if they describe the same user capability
- similarity_score: 1.0 = identical, 0.5 = related, 0.0 = unrelated
- If duplicate, recommend which name/description to keep or suggest combination
`.trim();
}

/**
 * Prompt for determining relationship type between evidence and feature
 * Version: 1.0
 * Model: gpt-4o
 * Temperature: 0.2
 */
export function buildRelationshipPrompt(
  featureName: string,
  evidenceContent: string,
  evidenceType: string
): string {
  return `
Determine the relationship between this evidence and the feature.

Feature: ${featureName}
Evidence Type: ${evidenceType}
Evidence: ${evidenceContent}

Return JSON:
{
  "relationship_type": "implements" | "supports" | "constrains" | "extends",
  "strength": 0.0-1.0,
  "reasoning": "Why this relationship exists"
}

Relationship Types:
- "implements": Evidence directly implements this feature (e.g., login button implements User Login)
- "supports": Evidence supports or enables this feature (e.g., session API supports User Login)
- "constrains": Evidence constrains how feature works (e.g., "password must be 8+ chars" constrains User Login)
- "extends": Evidence extends/enhances feature (e.g., "remember me" extends User Login)

Strength:
- 1.0 = Core/essential to feature
- 0.7 = Important to feature
- 0.5 = Moderate relevance
- 0.3 = Supporting/peripheral
`.trim();
}

/**
 * Prompt for batch-classifying relationships between a feature and ALL its evidence
 * Version: 2.0 — replaces per-pair calls with a single batched call
 * Model: gpt-4o
 * Temperature: 0.2
 */
export function buildBatchRelationshipPrompt(
  featureName: string,
  evidenceItems: Array<{ id: string; content: string; type: string }>
): string {
  const evidenceList = evidenceItems
    .map((e, i) => `  ${i + 1}. [ID: ${e.id}] (type: ${e.type}) ${e.content}`)
    .join('\n');

  return `
Classify the relationship between a feature and each piece of evidence listed below.

Feature: "${featureName}"

Evidence items:
${evidenceList}

For EACH evidence item, determine:
1. relationship_type: "implements" | "supports" | "constrains" | "extends"
2. strength: 0.0-1.0
3. reasoning: brief explanation

Relationship Types:
- "implements": Evidence directly implements this feature (e.g., login button implements User Login)
- "supports": Evidence supports or enables this feature (e.g., session API supports User Login)
- "constrains": Evidence constrains how feature works (e.g., "password must be 8+ chars" constrains User Login)
- "extends": Evidence extends/enhances feature (e.g., "remember me" extends User Login)

Strength:
- 1.0 = Core/essential to feature
- 0.7 = Important to feature
- 0.5 = Moderate relevance
- 0.3 = Supporting/peripheral

Return JSON with an array of results, one per evidence item, in the same order:
{
  "relationships": [
    {
      "evidence_id": "the ID from above",
      "relationship_type": "implements",
      "strength": 0.8,
      "reasoning": "..."
    }
  ]
}

IMPORTANT: You must return exactly ${evidenceItems.length} items in the "relationships" array, one for each evidence item above.
`.trim();
}
