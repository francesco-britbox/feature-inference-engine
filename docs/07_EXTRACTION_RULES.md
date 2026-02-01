# Extraction Rules
## Format-Specific Evidence Extraction

---

## 1. Screenshots (PNG/JPG)

### 1.1 Tool
OpenAI Vision API (GPT-4 Vision)

### 1.2 Prompt Template

```typescript
// lib/prompts/extraction.ts
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
```

### 1.3 API Configuration

```typescript
const response = await openai.chat.completions.create({
  model: 'gpt-4-vision-preview',
  messages: [
    {
      role: 'user',
      content: [
        { type: 'text', text: SCREENSHOT_EXTRACTION_V1 },
        {
          type: 'image_url',
          image_url: {
            url: `data:image/jpeg;base64,${base64Image}`,
            detail: 'high'
          }
        }
      ]
    }
  ],
  temperature: 0.2,  // Low for consistent extraction
  max_tokens: 1000
});
```

### 1.4 Expected Output

```json
[
  {
    "type": "ui_element",
    "content": "Email input with placeholder 'Enter your email'",
    "metadata": {
      "position": "top-center",
      "element_type": "input"
    }
  },
  {
    "type": "ui_element",
    "content": "Password input with visibility toggle icon",
    "metadata": {
      "position": "below-email",
      "element_type": "input",
      "has_interaction": true
    }
  },
  {
    "type": "ui_element",
    "content": "Submit button labeled 'Sign In'",
    "metadata": {
      "position": "bottom-center",
      "element_type": "button",
      "style": "primary"
    }
  },
  {
    "type": "flow",
    "content": "Forgot password link leads to password reset screen"
  }
]
```

### 1.5 Post-Processing

- Validate JSON structure
- Ensure each evidence has `type` and `content`
- Store in database with `document_id` reference
- Generate embeddings for each evidence item

---

## 2. API Specs (JSON/YAML - Postman/OpenAPI)

### 2.1 Postman Collections

**Input Format**:
```json
{
  "info": { "name": "OTT API" },
  "item": [
    {
      "name": "Login",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/api/auth/login",
        "body": {
          "mode": "raw",
          "raw": "{\n  \"email\": \"user@example.com\",\n  \"password\": \"password123\"\n}"
        }
      },
      "response": []
    }
  ]
}
```

**Extraction Logic**:
```typescript
function extractFromPostman(collection: PostmanCollection): Evidence[] {
  const evidence: Evidence[] = [];

  for (const item of collection.item) {
    // Extract endpoint
    evidence.push({
      type: 'endpoint',
      content: `${item.request.method} ${item.request.url}`,
      rawData: {
        method: item.request.method,
        path: item.request.url,
        name: item.name
      }
    });

    // Extract request payload
    if (item.request.body) {
      evidence.push({
        type: 'payload',
        content: `Request payload for ${item.name}`,
        rawData: {
          direction: 'request',
          schema: JSON.parse(item.request.body.raw)
        }
      });
    }
  }

  return evidence;
}
```

### 2.2 OpenAPI Specs

**Input Format**:
```yaml
openapi: 3.0.0
paths:
  /api/auth/login:
    post:
      summary: User login
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                email:
                  type: string
                  format: email
                password:
                  type: string
                  minLength: 8
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                type: object
                properties:
                  token:
                    type: string
                  user:
                    type: object
```

**Extraction Logic**:
```typescript
function extractFromOpenAPI(spec: OpenAPISpec): Evidence[] {
  const evidence: Evidence[] = [];

  for (const [path, methods] of Object.entries(spec.paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      // Extract endpoint
      evidence.push({
        type: 'endpoint',
        content: `${method.toUpperCase()} ${path}`,
        rawData: {
          method: method.toUpperCase(),
          path,
          summary: operation.summary,
          description: operation.description
        }
      });

      // Extract request schema
      if (operation.requestBody) {
        const schema = operation.requestBody.content['application/json']?.schema;
        evidence.push({
          type: 'payload',
          content: `Request schema for ${path}`,
          rawData: {
            direction: 'request',
            schema,
            required: schema.required
          }
        });
      }

      // Extract response schemas
      for (const [status, response] of Object.entries(operation.responses)) {
        const schema = response.content?.['application/json']?.schema;
        if (schema) {
          evidence.push({
            type: 'payload',
            content: `Response schema (${status}) for ${path}`,
            rawData: {
              direction: 'response',
              status_code: status,
              schema
            }
          });
        }
      }
    }
  }

  return evidence;
}
```

---

## 3. Jira Exports (CSV)

### 3.1 Expected CSV Format

```csv
Key,Summary,Description,Type,Status,Priority,Created,Updated,Acceptance Criteria
PROJ-123,User Login,Users should be able to login with email/password,Story,Done,High,2024-01-01,2024-01-15,"- User enters email\n- User enters password\n- System validates credentials"
PROJ-124,Login Bug,Login fails with special characters,Bug,Open,Critical,2024-01-10,2024-01-12,
```

### 3.2 Column Mapping

| CSV Column | Evidence Type | Notes |
|-----------|--------------|-------|
| Summary | `requirement` | Short description |
| Description | `requirement` | Detailed description |
| Acceptance Criteria | `acceptance_criteria` | Split by newlines |
| Type=Bug | `bug` | Extract bug details |
| Type=Story | `requirement` | User story |
| Type=Task | `requirement` | Technical task |

### 3.3 Extraction Logic

```typescript
import Papa from 'papaparse';

function extractFromJiraCsv(csvContent: string): Evidence[] {
  const evidence: Evidence[] = [];

  const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true
  });

  for (const row of parsed.data) {
    // Summary → requirement
    if (row.Summary) {
      evidence.push({
        type: 'requirement',
        content: row.Summary,
        rawData: {
          ticket: row.Key,
          type: row.Type,
          priority: row.Priority
        }
      });
    }

    // Description → detailed requirement
    if (row.Description) {
      evidence.push({
        type: 'requirement',
        content: row.Description,
        rawData: {
          ticket: row.Key,
          type: row.Type,
          source: 'description'
        }
      });
    }

    // Acceptance Criteria
    if (row['Acceptance Criteria']) {
      const criteria = row['Acceptance Criteria'].split('\n');
      for (const criterion of criteria) {
        if (criterion.trim()) {
          evidence.push({
            type: 'acceptance_criteria',
            content: criterion.trim(),
            rawData: {
              ticket: row.Key
            }
          });
        }
      }
    }

    // Bugs
    if (row.Type === 'Bug') {
      evidence.push({
        type: 'bug',
        content: `Bug: ${row.Summary} - ${row.Description || ''}`,
        rawData: {
          ticket: row.Key,
          status: row.Status,
          priority: row.Priority
        }
      });
    }
  }

  return evidence;
}
```

---

## 4. PDFs/Markdown (Requirements Docs)

### 4.1 PDF Text Extraction

```typescript
import pdfParse from 'pdf-parse';

async function extractTextFromPdf(filePath: string): Promise<string> {
  const dataBuffer = fs.readFileSync(filePath);
  const pdf = await pdfParse(dataBuffer);
  return pdf.text;
}
```

### 4.2 Chunking Strategy

```typescript
function chunkText(text: string, maxTokens: number = 500): string[] {
  const chunks: string[] = [];
  const paragraphs = text.split('\n\n');

  let currentChunk = '';
  let currentTokens = 0;

  for (const paragraph of paragraphs) {
    const paragraphTokens = estimateTokens(paragraph);

    if (currentTokens + paragraphTokens > maxTokens) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = paragraph;
      currentTokens = paragraphTokens;
    } else {
      currentChunk += '\n\n' + paragraph;
      currentTokens += paragraphTokens;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}
```

### 4.3 LLM Extraction Prompt

```typescript
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
  { "type": "constraint", "content": "..." }
]

Text:
{chunk}
`.trim();
```

### 4.4 Extraction Logic

```typescript
async function extractFromPdf(filePath: string): Promise<Evidence[]> {
  const text = await extractTextFromPdf(filePath);
  const chunks = chunkText(text, 500);

  const allEvidence: Evidence[] = [];

  for (const chunk of chunks) {
    const prompt = PDF_EXTRACTION_V1.replace('{chunk}', chunk);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    });

    const evidence = JSON.parse(response.choices[0].message.content);
    allEvidence.push(...evidence);
  }

  return allEvidence;
}
```

---

## 5. Markdown Files

### 5.1 Extraction Logic

Same as PDF, but simpler text extraction:

```typescript
function extractTextFromMarkdown(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}

async function extractFromMarkdown(filePath: string): Promise<Evidence[]> {
  const text = extractTextFromMarkdown(filePath);
  const chunks = chunkText(text, 500);

  // Same LLM extraction as PDF
  return extractWithLLM(chunks);
}
```

---

## 6. Evidence Quality Rules

### 6.1 Atomic Evidence

✅ **Good**:
- "Email input field with placeholder 'Enter email'"
- "POST /api/auth/login endpoint accepts {email, password}"
- "Password must be at least 8 characters"

❌ **Bad**:
- "Login screen has inputs and a button" (too vague)
- "Authentication system" (too broad)
- "User can login" (no details)

### 6.2 Self-Contained

Each evidence item must be understandable without referring to the document:

✅ **Good**:
- "Submit button labeled 'Sign In' with blue background"

❌ **Bad**:
- "Blue button at the bottom" (which screen? which button?)

### 6.3 Evidence Types

| Type | When to Use | Example |
|------|------------|---------|
| `ui_element` | Visual UI components | "Password input with visibility toggle" |
| `flow` | User navigation/transitions | "Submit button leads to home screen" |
| `endpoint` | API endpoints | "POST /api/auth/login" |
| `payload` | Request/response schemas | "Login request requires email and password fields" |
| `requirement` | Functional requirements | "Users must be able to reset password" |
| `edge_case` | Error scenarios | "Login fails if email format is invalid" |
| `acceptance_criteria` | Testable statements | "Given valid credentials, user sees home screen" |
| `bug` | Bug reports | "Login fails with special characters in password" |
| `constraint` | Technical/business limits | "Password must be 8-20 characters" |

---

## 7. Error Handling

### 7.1 Partial Extraction

If extraction partially fails:
- Store successful evidence items
- Log error with document ID
- Flag document for manual review
- Continue processing other documents

### 7.2 Invalid Responses

If LLM returns invalid JSON:
- Retry with clearer prompt
- If retry fails, log and skip
- Don't crash entire pipeline

### 7.3 Rate Limits

If OpenAI API rate limit hit:
- Exponential backoff: 1s, 2s, 4s, 8s
- Queue document for later retry
- Continue with other documents

---

## 8. Testing Evidence Extraction

### 8.1 Test Fixtures

```
tests/fixtures/
  screenshots/
    login.png
    home.png
  api-specs/
    postman-collection.json
    openapi.yaml
  jira/
    tickets.csv
  docs/
    requirements.pdf
    architecture.md
```

### 8.2 Test Cases

```typescript
describe('ScreenshotExtractor', () => {
  it('should extract UI elements from login screenshot', async () => {
    const evidence = await extractor.extract('tests/fixtures/screenshots/login.png');

    expect(evidence).toContainEqual({
      type: 'ui_element',
      content: expect.stringContaining('email input')
    });

    expect(evidence).toContainEqual({
      type: 'ui_element',
      content: expect.stringContaining('password input')
    });
  });
});
```

---

## 9. Performance Optimization

### 9.1 Batch API Calls

```typescript
// Instead of individual calls
for (const document of documents) {
  await extractEvidence(document);  // Sequential, slow
}

// Batch with concurrency limit
const concurrency = 5;
const batches = chunk(documents, concurrency);

for (const batch of batches) {
  await Promise.all(batch.map(doc => extractEvidence(doc)));
}
```

### 9.2 Caching

```typescript
// Cache embeddings for identical content
const embeddingCache = new Map<string, number[]>();

async function getEmbedding(text: string): Promise<number[]> {
  const hash = createHash(text);

  if (embeddingCache.has(hash)) {
    return embeddingCache.get(hash)!;
  }

  const embedding = await openai.embeddings.create({ input: text });
  embeddingCache.set(hash, embedding);

  return embedding;
}
```
