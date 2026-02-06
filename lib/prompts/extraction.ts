/**
 * LLM prompts for evidence extraction
 * Version-controlled and documented
 */

/**
 * Prompt for extracting UI elements from screenshots
 * Version: 1.0
 * Model: gpt-4-vision-preview
 * Temperature: 0.2
 */
export const SCREENSHOT_EXTRACTION_V1 = `
Analyze this OTT platform screenshot. Extract:
- UI elements (buttons, inputs, text, icons)
- User flows visible (navigation, transitions)
- Text content (labels, placeholders, error messages)
- Visual hierarchy (primary/secondary actions)

Return JSON array of evidence objects:
[
  { "type": "ui_element", "content": "..." },
  { "type": "flow", "content": "..." }
]

IMPORTANT: Each evidence item must be understandable in isolation.
Do not create summaries. Create atomic facts.

Example:
[
  { "type": "ui_element", "content": "Email input field with placeholder 'Enter your email'" },
  { "type": "ui_element", "content": "Password input field with eye icon for visibility toggle" },
  { "type": "ui_element", "content": "Submit button labeled 'Sign In' with blue background" },
  { "type": "flow", "content": "Forgot password link below submit button leads to password reset" }
]
`.trim();

/**
 * Prompt for extracting requirements from PDF/Markdown chunks
 * Version: 3.0
 * Model: gpt-4o
 * Temperature: 0.2
 * Updated: 2026-02-06 - Added inference guidelines and fixed JSON format for json_object mode
 */
export const PDF_EXTRACTION_V1 = `
You are analyzing an OTT (Over-The-Top) platform document to extract atomic evidence.

INFERENCE GUIDELINES - How to identify each evidence type:

1. "endpoint" - API endpoints:
   - Lines showing HTTP methods: GET, POST, PUT, DELETE, PATCH
   - URL paths like /api/auth/login, /v1/users/{id}
   - API route definitions or endpoint documentation
   - Example indicators: "GET /api/", "POST /v1/", "endpoint:", "route:"

2. "payload" - Request/response data structures:
   - JSON schemas showing request/response format
   - Parameter lists (query params, headers, body fields)
   - Data type definitions (User, Video, Subscription)
   - Example indicators: "Request:", "Response:", "Parameters:", "{", "schema"

3. "requirement" - Functional requirements:
   - Statements about user capabilities: "User must be able to..."
   - Business rules: "The system shall..."
   - Feature descriptions: "Users can search for content"
   - Example indicators: "must", "shall", "should", "can", "allows"

4. "constraint" - Technical constraints:
   - Limitations: "Maximum 100 items", "Not supported on iOS 12"
   - Dependencies: "Requires authentication", "Only for premium users"
   - Technical restrictions or boundaries
   - Example indicators: "maximum", "minimum", "requires", "only", "not supported"

5. "edge_case" - Error scenarios and edge conditions:
   - Error handling: "If token expires...", "When network fails..."
   - Boundary conditions: "Empty list", "Invalid input", "Timeout"
   - Failure modes and fallback behavior
   - Example indicators: "if", "when", "error", "fail", "invalid", "timeout"

6. "acceptance_criteria" - Testable success criteria:
   - Given/When/Then scenarios
   - Testable conditions: "Login succeeds when..."
   - Success/failure conditions
   - Example indicators: "given", "when", "then", "succeeds", "fails"

EXTRACTION RULES:
- Extract ONLY if you can confidently identify the type using guidelines above
- Each item must be atomic and self-contained (understandable in isolation)
- For APIs: Extract each endpoint separately, then extract its request/response as separate payload items
- If a sentence doesn't clearly match any type, skip it (don't guess or force-fit)
- Return empty evidence array if no clear matches found in text

OUTPUT FORMAT (MANDATORY - must match this structure exactly):
{
  "evidence": [
    { "type": "endpoint", "content": "GET /api/videos - Retrieve paginated list of available videos" },
    { "type": "payload", "content": "Query parameters: page (number), limit (number, max 100)" },
    { "type": "payload", "content": "Response: { videos: Video[], totalCount: number, hasMore: boolean }" }
  ]
}

If no evidence found in text, return:
{
  "evidence": []
}

IMPORTANT: Do not wrap the entire document in a single evidence item. Extract multiple atomic items.

Text to analyze:
{chunk}
`.trim();

/**
 * Replace placeholder in PDF extraction prompt
 */
export function buildPdfExtractionPrompt(chunk: string): string {
  return PDF_EXTRACTION_V1.replace('{chunk}', chunk);
}
