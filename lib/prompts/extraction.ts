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
 * Version: 1.0
 * Model: gpt-4o
 * Temperature: 0.2
 */
export const PDF_EXTRACTION_V1 = `
Extract requirements and constraints from this OTT platform document.

Rules:
- Each requirement must be atomic and self-contained
- Include context if needed for understanding
- Distinguish functional requirements from constraints
- No summaries, only atomic facts

Return JSON array:
[
  { "type": "requirement", "content": "..." },
  { "type": "constraint", "content": "..." },
  { "type": "edge_case", "content": "..." },
  { "type": "acceptance_criteria", "content": "..." }
]

Text:
{chunk}
`.trim();

/**
 * Replace placeholder in PDF extraction prompt
 */
export function buildPdfExtractionPrompt(chunk: string): string {
  return PDF_EXTRACTION_V1.replace('{chunk}', chunk);
}
