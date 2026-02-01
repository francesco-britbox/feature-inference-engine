# Coding Principles & Conventions
## Development Standards

---

## 1. General Principles

### 1.1 Core Values

- **TypeScript strict mode**: Always typed, no `any`
- **Functional where possible**: Pure functions, immutability preferred
- **Single Responsibility**: One service per concern, one function per task
- **Test coverage**: Unit tests for services, integration for APIs
- **Error boundaries**: All API calls wrapped in try-catch with structured errors
- **Explicit over implicit**: Clear naming, no magic values
- **Comments for why, not what**: Code should be self-documenting

### 1.2 Code Quality

```typescript
// ✅ GOOD
function calculateConfidence(signals: Signal[]): number {
  return 1 - signals.reduce((acc, s) => acc * (1 - s.weight), 1);
}

// ❌ BAD
function calc(s: any): number {
  return 1 - s.reduce((a: any, x: any) => a * (1 - x.w), 1);
}
```

---

## 2. TypeScript Standards

### 2.1 Strict Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitThis": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### 2.2 Type Definitions

```typescript
// lib/types/evidence.ts
export type EvidenceType =
  | 'ui_element'
  | 'flow'
  | 'endpoint'
  | 'payload'
  | 'requirement'
  | 'edge_case'
  | 'acceptance_criteria'
  | 'bug'
  | 'constraint';

export interface Evidence {
  id: string;
  documentId: string;
  type: EvidenceType;
  content: string;
  rawData?: Record<string, unknown>;
  embedding?: number[];
  extractedAt: Date;
}

// Use branded types for IDs
export type DocumentId = string & { readonly __brand: 'DocumentId' };
export type FeatureId = string & { readonly __brand: 'FeatureId' };
```

### 2.3 Avoid `any`

```typescript
// ✅ GOOD
function parseJson<T>(json: string): T | null {
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

// ❌ BAD
function parseJson(json: string): any {
  return JSON.parse(json);
}
```

---

## 3. File Structure

### 3.1 Project Layout

```
/app                         # Next.js App Router
  /api
    /upload
      route.ts              # POST multipart/form-data
    /extract
      route.ts              # POST trigger extraction
    /features
      route.ts              # GET, POST
      /[id]
        route.ts            # GET, PATCH, DELETE
  /upload
    page.tsx                # Upload UI
  /features
    page.tsx                # Feature list
    /[id]
      page.tsx              # Feature detail
  layout.tsx
  page.tsx                  # Home/dashboard

/lib                         # Business logic (no UI)
  /db
    schema.ts               # Drizzle schema
    client.ts               # DB client
  /services
    ExtractionService.ts
    FeatureInferenceService.ts
    CorrelationService.ts
    AssemblyService.ts
    EmbeddingService.ts
  /ai
    openai.ts               # OpenAI client wrapper
    embeddings.ts           # Embedding utilities
    prompts.ts              # LLM prompt templates
  /utils
    fileHash.ts
    validators.ts
    errors.ts
  /types
    evidence.ts
    feature.ts
    api.ts

/components                  # React components
  /ui                       # shadcn/ui components
    button.tsx
    table.tsx
  /features
    FeatureCard.tsx
    EvidenceTable.tsx
    ConfidenceIndicator.tsx

/docs                        # Project documentation (this folder)

/drizzle                     # Database migrations
  /migrations
    0000_initial.sql

/tests                       # Test files
  /unit
    ExtractionService.test.ts
  /integration
    api.test.ts
  /fixtures
    test-documents/

/.github                     # GitHub workflows (future)
/docker                      # Docker configs
```

---

## 4. Naming Conventions

### 4.1 Files & Folders

| Type | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `FeatureCard.tsx` |
| Services | PascalCase + Service suffix | `ExtractionService.ts` |
| Utilities | camelCase | `fileHash.ts` |
| API routes | kebab-case | `/api/feature-evidence` |
| Types | camelCase | `evidence.ts` |
| Tests | Same as file + `.test` | `ExtractionService.test.ts` |

### 4.2 Variables & Functions

```typescript
// Variables: camelCase
const confidenceScore = 0.85;
const featureList = [];

// Functions: camelCase, verb-noun
function calculateConfidence(signals: Signal[]): number { }
function extractEvidence(document: Document): Evidence[] { }

// Classes/Types: PascalCase
class ExtractionService { }
type FeatureStatus = 'candidate' | 'confirmed' | 'rejected';

// Constants: UPPER_SNAKE_CASE
const MAX_FILE_SIZE_MB = 50;
const SIGNAL_WEIGHTS = { endpoint: 0.4, ui_element: 0.3 };
```

### 4.3 Database Names

```typescript
// Tables: snake_case
documents
evidence
feature_evidence

// Columns: snake_case
confidence_score
extracted_at
file_path

// Drizzle schema: camelCase (TypeScript convention)
const features = pgTable('features', {
  confidenceScore: numeric('confidence_score'),
  extractedAt: timestamp('extracted_at'),
});
```

---

## 5. Service Layer Patterns

### 5.1 Service Structure

```typescript
// lib/services/ExtractionService.ts
import { Evidence, EvidenceType } from '@/lib/types/evidence';
import { Document } from '@/lib/types/document';

export class ExtractionService {
  /**
   * Extract evidence from a document based on its type
   */
  async extractFromDocument(document: Document): Promise<Evidence[]> {
    switch (document.fileType) {
      case 'image':
        return this.extractFromImage(document);
      case 'pdf':
        return this.extractFromPdf(document);
      case 'json':
        return this.extractFromJson(document);
      default:
        throw new UnsupportedFileTypeError(document.fileType);
    }
  }

  private async extractFromImage(document: Document): Promise<Evidence[]> {
    // Implementation
  }

  private async extractFromPdf(document: Document): Promise<Evidence[]> {
    // Implementation
  }

  private async extractFromJson(document: Document): Promise<Evidence[]> {
    // Implementation
  }
}

// Singleton instance
export const extractionService = new ExtractionService();
```

### 5.2 Pure Functions

```typescript
// ✅ GOOD: Pure function
export function calculateConfidence(signals: Signal[]): number {
  return 1 - signals.reduce((acc, s) => acc * (1 - s.weight), 1);
}

// ❌ BAD: Side effects
let globalScore = 0;
export function calculateConfidence(signals: Signal[]): number {
  globalScore = 1 - signals.reduce((acc, s) => acc * (1 - s.weight), 1);
  return globalScore;
}
```

---

## 6. Error Handling

### 6.1 Custom Error Classes

```typescript
// lib/utils/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class UnsupportedFileTypeError extends AppError {
  constructor(fileType: string) {
    super(`Unsupported file type: ${fileType}`, 'UNSUPPORTED_FILE_TYPE', 400);
  }
}

export class ExtractionError extends AppError {
  constructor(message: string, public documentId: string) {
    super(message, 'EXTRACTION_ERROR', 500);
  }
}
```

### 6.2 API Error Responses

```typescript
// app/api/upload/route.ts
import { NextResponse } from 'next/server';
import { AppError } from '@/lib/utils/errors';

export async function POST(request: Request) {
  try {
    // ... implementation
    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
```

### 6.3 Service Error Handling

```typescript
// lib/services/ExtractionService.ts
async extractFromDocument(document: Document): Promise<Evidence[]> {
  try {
    const result = await this.performExtraction(document);
    return result;
  } catch (error) {
    // Log with context
    console.error('Extraction failed', {
      documentId: document.id,
      fileType: document.fileType,
      error: error instanceof Error ? error.message : String(error),
    });

    // Re-throw as domain error
    throw new ExtractionError(
      `Failed to extract evidence from document`,
      document.id
    );
  }
}
```

---

## 7. LLM Prompts

### 7.1 Prompt Storage

```typescript
// lib/prompts/extraction.ts

/**
 * Prompt for extracting UI elements from screenshots
 * Version: 1.0
 * Updated: 2024-01-15
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
`.trim();

/**
 * Prompt for feature hypothesis generation
 * Version: 1.0
 * Temperature: 0.3 (low for consistency)
 */
export const FEATURE_INFERENCE_V1 = (evidenceItems: string[]) => `
Given these evidence items from an OTT platform, identify the user-facing feature they describe.

Evidence:
${evidenceItems.map((e, i) => `${i + 1}. ${e}`).join('\n')}

Return JSON:
{
  "feature_name": "...",
  "confidence": 0.0-1.0,
  "reasoning": "why these evidence items relate to this feature"
}
`.trim();
```

### 7.2 Prompt Usage

```typescript
// lib/services/ExtractionService.ts
import { SCREENSHOT_EXTRACTION_V1 } from '@/lib/prompts/extraction';
import { openai } from '@/lib/ai/openai';

async extractFromImage(document: Document): Promise<Evidence[]> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4-vision-preview',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: SCREENSHOT_EXTRACTION_V1 },
          { type: 'image_url', image_url: { url: document.filePath } },
        ],
      },
    ],
    temperature: 0.2,  // Low for consistent extraction
  });

  return this.parseEvidenceResponse(response);
}
```

---

## 8. Testing Standards

### 8.1 Unit Tests

```typescript
// tests/unit/ExtractionService.test.ts
import { describe, it, expect, vi } from 'vitest';
import { ExtractionService } from '@/lib/services/ExtractionService';

describe('ExtractionService', () => {
  it('should extract evidence from screenshot', async () => {
    const service = new ExtractionService();
    const document = {
      id: 'test-id',
      fileType: 'image',
      filePath: '/test.png',
    };

    const evidence = await service.extractFromDocument(document);

    expect(evidence).toHaveLength(3);
    expect(evidence[0]).toHaveProperty('type', 'ui_element');
    expect(evidence[0]).toHaveProperty('content');
  });

  it('should throw error for unsupported file type', async () => {
    const service = new ExtractionService();
    const document = {
      id: 'test-id',
      fileType: 'unsupported',
      filePath: '/test.xyz',
    };

    await expect(service.extractFromDocument(document))
      .rejects
      .toThrow(UnsupportedFileTypeError);
  });
});
```

### 8.2 Integration Tests

```typescript
// tests/integration/api.test.ts
import { describe, it, expect } from 'vitest';

describe('POST /api/upload', () => {
  it('should upload and extract evidence from PDF', async () => {
    const formData = new FormData();
    formData.append('file', new File(['test'], 'test.pdf'));

    const response = await fetch('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData,
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('documentId');
    expect(data).toHaveProperty('evidenceCount');
  });
});
```

---

## 9. Code Review Checklist

### 9.1 Before Committing

- [ ] No `any` types (check with `tsc --noEmit`)
- [ ] All functions have return types
- [ ] Error handling in place
- [ ] Tests written and passing
- [ ] No console.logs (use proper logging)
- [ ] No commented-out code
- [ ] No TODO comments (create issues instead)
- [ ] Imports organized (lib, components, utils)

### 9.2 PR Requirements

- [ ] TypeScript compiles without errors
- [ ] All tests pass
- [ ] No linter warnings
- [ ] Clear PR description (what, why, how)
- [ ] Screenshots for UI changes
- [ ] Database migrations included if schema changed

---

## 10. Performance Guidelines

### 10.1 Database Queries

```typescript
// ✅ GOOD: Single query with join
const featuresWithEvidence = await db
  .select()
  .from(features)
  .leftJoin(featureEvidence, eq(features.id, featureEvidence.featureId))
  .leftJoin(evidence, eq(evidence.id, featureEvidence.evidenceId))
  .where(eq(features.status, 'candidate'));

// ❌ BAD: N+1 queries
const features = await db.select().from(features);
for (const feature of features) {
  const evidence = await db
    .select()
    .from(evidence)
    .where(eq(evidence.featureId, feature.id));  // N queries!
}
```

### 10.2 API Responses

```typescript
// ✅ GOOD: Paginated
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  const features = await db
    .select()
    .from(features)
    .limit(limit)
    .offset((page - 1) * limit);

  return NextResponse.json({ data: features, page, limit });
}

// ❌ BAD: Return all records
export async function GET() {
  const features = await db.select().from(features);  // Could be 1000s!
  return NextResponse.json(features);
}
```

---

## 11. Security Best Practices

### 11.1 Input Validation

```typescript
// lib/utils/validators.ts
import { z } from 'zod';

export const uploadSchema = z.object({
  filename: z.string().min(1).max(255),
  fileType: z.enum(['pdf', 'image', 'json', 'csv', 'yaml', 'md']),
  size: z.number().max(50 * 1024 * 1024),  // 50MB
});

// Usage in API route
const validated = uploadSchema.parse(data);
```

### 11.2 Never Trust User Input

```typescript
// ✅ GOOD: Sanitize and validate
const filename = path.basename(userInput);  // Remove directory traversal
const fileType = getMimeType(file);
if (!ALLOWED_TYPES.includes(fileType)) {
  throw new Error('Invalid file type');
}

// ❌ BAD: Use user input directly
const filePath = `/uploads/${userInput}`;  // Vulnerable to path traversal!
```

---

## 12. Documentation Standards

### 12.1 JSDoc Comments

```typescript
/**
 * Calculate confidence score for a feature based on evidence signals
 *
 * Uses probabilistic combination: 1 - Π(1 - weight)
 *
 * @param signals - Array of evidence signals with type and weight
 * @returns Confidence score between 0 and 1
 * @throws {Error} If signals array is empty
 *
 * @example
 * const confidence = calculateConfidence([
 *   { type: 'endpoint', weight: 0.4 },
 *   { type: 'ui_element', weight: 0.3 }
 * ]);
 * // Returns: 0.58
 */
export function calculateConfidence(signals: Signal[]): number {
  if (signals.length === 0) {
    throw new Error('Signals array cannot be empty');
  }
  return 1 - signals.reduce((acc, s) => acc * (1 - s.weight), 1);
}
```

### 12.2 README per Service

```markdown
# ExtractionService

Handles extraction of evidence from uploaded documents.

## Supported Formats

- PDF: Text extraction + LLM analysis
- Images: OpenAI Vision API
- JSON/YAML: Structural parsing
- CSV: Jira ticket parsing
- Markdown: Text + LLM

## Usage

```typescript
import { extractionService } from '@/lib/services/ExtractionService';

const evidence = await extractionService.extractFromDocument(document);
```

## Error Handling

Throws `ExtractionError` if extraction fails.
```
