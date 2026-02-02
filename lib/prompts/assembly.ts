/**
 * Assembly prompts for generating feature outputs
 * Used by ApiContractGenerator, RequirementsSynthesizer, AcceptanceCriteriaGenerator
 */

/**
 * Build prompt for API contract synthesis
 * Consolidates endpoint and payload evidence into platform-agnostic API contract
 */
export function buildApiContractPrompt(
  featureName: string,
  endpointEvidence: Array<{ content: string; rawData?: Record<string, unknown> }>,
  payloadEvidence: Array<{ content: string; rawData?: Record<string, unknown> }>
): string {
  const endpointsList = endpointEvidence
    .map((e, i) => `${i + 1}. ${e.content}`)
    .join('\n');

  const payloadsList = payloadEvidence
    .map((e, i) => `${i + 1}. ${e.content}`)
    .join('\n');

  return `You are an API architect designing platform-agnostic API contracts.

Feature: ${featureName}

Endpoint Evidence:
${endpointsList || 'None'}

Payload Evidence:
${payloadsList || 'None'}

Task: Synthesize a complete, platform-agnostic API contract for this feature.

Requirements:
1. Define all endpoints (method, path, description)
2. Specify request schemas (body, query, headers, path params)
3. Specify response schemas (all status codes)
4. Include authentication requirements
5. Document error scenarios
6. Use JSON Schema-like format for schemas
7. Make it platform-agnostic (no React/Vue/Flutter specifics)
8. Be explicit about data types, validation rules, and constraints

Output JSON format:
{
  "endpoints": [
    {
      "method": "POST",
      "path": "/api/resource",
      "description": "...",
      "auth": "bearer",
      "request": {
        "body": {
          "field1": { "type": "string", "required": true, "minLength": 3 },
          "field2": { "type": "number", "minimum": 0 }
        },
        "query": { ... },
        "headers": { ... }
      },
      "response": {
        "200": { "id": { "type": "string" }, "name": { "type": "string" } },
        "400": { "error": { "type": "string" } },
        "401": { "error": { "type": "string" } }
      },
      "errors": ["Invalid input", "Unauthorized"]
    }
  ],
  "authentication": {
    "type": "bearer",
    "description": "JWT token required in Authorization header"
  },
  "errorHandling": ["All errors return JSON with 'error' field", "401 for auth failures"],
  "notes": ["Additional context or assumptions"]
}

Return ONLY valid JSON. No markdown, no code blocks.`;
}

/**
 * Build prompt for requirements consolidation
 * Removes duplicates and consolidates requirement evidence
 */
export function buildRequirementsPrompt(
  featureName: string,
  requirementEvidence: Array<{ content: string }>,
  constraintEvidence?: Array<{ content: string }>
): string {
  const requirementsList = requirementEvidence
    .map((e, i) => `${i + 1}. ${e.content}`)
    .join('\n');

  const constraintsList = constraintEvidence
    ? constraintEvidence.map((e, i) => `${i + 1}. ${e.content}`).join('\n')
    : 'None';

  return `You are a requirements analyst consolidating product requirements.

Feature: ${featureName}

Requirement Evidence:
${requirementsList || 'None'}

Constraint Evidence:
${constraintsList}

Task: Consolidate these into a coherent requirements document.

Requirements:
1. Remove duplicate or redundant requirements
2. Group related requirements together
3. Distinguish between functional and non-functional requirements
4. Extract constraints, assumptions, and dependencies
5. Use clear, testable language
6. Make it platform-agnostic (no implementation details)
7. Be specific and measurable where possible

Output JSON format:
{
  "title": "${featureName}",
  "summary": "One-paragraph summary of what this feature does",
  "functionalRequirements": [
    "The system must allow users to...",
    "The system must validate..."
  ],
  "nonFunctionalRequirements": [
    "Response time must be < 200ms",
    "Must support 1000 concurrent users"
  ],
  "constraints": [
    "Must comply with GDPR",
    "Cannot store passwords in plain text"
  ],
  "assumptions": [
    "Users have valid email addresses",
    "Network connectivity is available"
  ],
  "dependencies": [
    "Requires authentication system",
    "Depends on email service"
  ]
}

Return ONLY valid JSON. No markdown, no code blocks.`;
}

/**
 * Build prompt for acceptance criteria formatting
 * Converts edge cases and criteria into Given/When/Then format
 */
export function buildAcceptanceCriteriaPrompt(
  featureName: string,
  edgeCaseEvidence: Array<{ content: string }>,
  criteriaEvidence: Array<{ content: string }>
): string {
  const edgeCasesList = edgeCaseEvidence
    .map((e, i) => `${i + 1}. ${e.content}`)
    .join('\n');

  const criteriaList = criteriaEvidence
    .map((e, i) => `${i + 1}. ${e.content}`)
    .join('\n');

  return `You are a QA engineer writing testable acceptance criteria.

Feature: ${featureName}

Edge Case Evidence:
${edgeCasesList || 'None'}

Acceptance Criteria Evidence:
${criteriaList || 'None'}

Task: Format these as testable acceptance criteria in Given/When/Then format.

Requirements:
1. Use Given/When/Then format for all scenarios
2. Each scenario should be independently testable
3. Cover happy path and edge cases
4. Be specific and measurable
5. Include both positive and negative test cases
6. Make it platform-agnostic (no UI/framework specifics)

Output JSON format:
{
  "scenarios": [
    {
      "given": "User is on the login page with valid credentials",
      "when": "User submits the login form",
      "then": "User is authenticated and redirected to dashboard"
    },
    {
      "given": "User enters invalid email format",
      "when": "User attempts to submit login form",
      "then": "System displays email validation error"
    }
  ],
  "edgeCases": [
    "Empty email field",
    "SQL injection in password field",
    "Session timeout during login"
  ],
  "notes": [
    "All scenarios assume stable network connection",
    "Error messages must be user-friendly"
  ]
}

Return ONLY valid JSON. No markdown, no code blocks.`;
}
