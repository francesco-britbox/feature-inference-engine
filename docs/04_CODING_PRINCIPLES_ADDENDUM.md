# Coding Principles - SOLID, DRY & Quality Standards
## MANDATORY ENFORCEMENT FOR ALL CODE

> **CRITICAL**: This addendum to [04_CODING_PRINCIPLES.md](04_CODING_PRINCIPLES.md) defines MANDATORY quality standards. All code MUST adhere to these principles. NO EXCEPTIONS.

---

## 1. SOLID Principles (MANDATORY)

### 1.1 Single Responsibility Principle (SRP)

**Definition**: A class/function should have ONE and ONLY ONE reason to change.

**✅ GOOD Example**:
```typescript
// lib/services/ExtractionService.ts
// Single responsibility: Extract evidence from documents
export class ExtractionService {
  async extractFromDocument(document: Document): Promise<Evidence[]> {
    return this.routeToExtractor(document);
  }

  private routeToExtractor(document: Document): Promise<Evidence[]> {
    switch (document.fileType) {
      case 'image': return this.imageExtractor.extract(document);
      case 'pdf': return this.pdfExtractor.extract(document);
      default: throw new UnsupportedFileTypeError(document.fileType);
    }
  }
}

// lib/services/extractors/PdfExtractor.ts
// Single responsibility: Extract from PDFs ONLY
export class PdfExtractor {
  async extract(document: Document): Promise<Evidence[]> {
    const text = await this.extractText(document.filePath);
    const chunks = this.chunkText(text);
    return this.extractEvidenceFromChunks(chunks);
  }
}
```

**❌ BAD Example (VIOLATION)**:
```typescript
// WRONG: Doing extraction + storage + validation + emailing in one class
export class ExtractionService {
  async extractAndSaveAndValidateAndNotify(document: Document) {
    // Extract evidence
    const evidence = await this.extract(document);

    // Store in database (different responsibility!)
    await this.db.insert(evidence);

    // Validate evidence (different responsibility!)
    const valid = this.validateEvidence(evidence);

    // Send email notification (different responsibility!)
    await this.emailService.send('Evidence extracted!');

    return evidence;
  }
}
```

**Deduction**: -10 points per SRP violation

---

### 1.2 Open/Closed Principle (OCP)

**Definition**: Classes should be OPEN for extension, CLOSED for modification.

**✅ GOOD Example**:
```typescript
// lib/services/extractors/BaseExtractor.ts
// Open for extension via inheritance
export abstract class BaseExtractor {
  abstract extract(document: Document): Promise<Evidence[]>;

  protected async saveEvidence(evidence: Evidence[]): Promise<void> {
    // Common logic all extractors can use
    await this.db.insertMany(evidence);
  }
}

// lib/services/extractors/PdfExtractor.ts
// Extends without modifying base
export class PdfExtractor extends BaseExtractor {
  async extract(document: Document): Promise<Evidence[]> {
    const text = await pdfParse(document.filePath);
    return this.parseText(text);
  }
}

// lib/services/extractors/ImageExtractor.ts
// Extends without modifying base
export class ImageExtractor extends BaseExtractor {
  async extract(document: Document): Promise<Evidence[]> {
    const response = await this.openai.analyzeImage(document.filePath);
    return this.parseResponse(response);
  }
}
```

**❌ BAD Example (VIOLATION)**:
```typescript
// WRONG: Have to modify this every time we add a format
export class ExtractionService {
  async extract(document: Document): Promise<Evidence[]> {
    if (document.fileType === 'pdf') {
      // PDF logic
    } else if (document.fileType === 'image') {
      // Image logic
    } else if (document.fileType === 'csv') {  // Modified class!
      // CSV logic
    }
    // Every new format requires modifying this class
  }
}
```

**Deduction**: -10 points per OCP violation

---

### 1.3 Liskov Substitution Principle (LSP)

**Definition**: Subtypes must be substitutable for their base types.

**✅ GOOD Example**:
```typescript
// lib/services/extractors/BaseExtractor.ts
export abstract class BaseExtractor {
  abstract extract(document: Document): Promise<Evidence[]>;
}

// All implementations return Promise<Evidence[]>, substitutable
export class PdfExtractor extends BaseExtractor {
  async extract(document: Document): Promise<Evidence[]> {
    return this.extractFromPdf(document);
  }
}

export class ImageExtractor extends BaseExtractor {
  async extract(document: Document): Promise<Evidence[]> {
    return this.extractFromImage(document);
  }
}

// Can use any extractor interchangeably
function processDocument(extractor: BaseExtractor, document: Document) {
  return extractor.extract(document);  // Works for all subtypes
}
```

**❌ BAD Example (VIOLATION)**:
```typescript
// WRONG: Subtype changes behavior incompatibly
export class ImageExtractor extends BaseExtractor {
  async extract(document: Document): Promise<Evidence[]> {
    if (document.size > 10MB) {
      throw new Error('Image too large');  // Base doesn't throw!
    }
    return this.extractFromImage(document);
  }
}

// Breaks: can't substitute ImageExtractor for BaseExtractor
```

**Deduction**: -10 points per LSP violation

---

### 1.4 Interface Segregation Principle (ISP)

**Definition**: No client should depend on methods it doesn't use.

**✅ GOOD Example**:
```typescript
// lib/types/database.ts
// Small, focused interfaces
export interface Readable {
  read(id: string): Promise<any>;
}

export interface Writable {
  write(data: any): Promise<void>;
}

export interface Deletable {
  delete(id: string): Promise<void>;
}

// Services only depend on what they need
export class FeatureService {
  constructor(private db: Readable & Writable) {}  // Only needs read/write
}

export class AdminService {
  constructor(private db: Readable & Writable & Deletable) {}  // Needs all
}
```

**❌ BAD Example (VIOLATION)**:
```typescript
// WRONG: Huge interface, forces all methods
export interface Database {
  read(id: string): Promise<any>;
  write(data: any): Promise<void>;
  delete(id: string): Promise<void>;
  backup(): Promise<void>;
  restore(): Promise<void>;
  migrate(): Promise<void>;
  vacuum(): Promise<void>;
}

// FeatureService forced to implement methods it doesn't need
export class FeatureService implements Database {
  read(id: string) { /* ... */ }
  write(data: any) { /* ... */ }
  delete(id: string) { throw new Error('Not supported'); }  // Forced!
  backup() { throw new Error('Not supported'); }  // Forced!
  // ... etc
}
```

**Deduction**: -10 points per ISP violation

---

### 1.5 Dependency Inversion Principle (DIP)

**Definition**: Depend on abstractions, not concretions.

**✅ GOOD Example**:
```typescript
// lib/types/ai.ts
// Abstract interface
export interface LLMClient {
  generate(prompt: string): Promise<string>;
  embed(text: string): Promise<number[]>;
}

// lib/services/FeatureInferenceService.ts
// Depends on abstraction
export class FeatureInferenceService {
  constructor(private llm: LLMClient) {}  // Abstraction!

  async inferFeature(evidence: Evidence[]): Promise<Feature> {
    const prompt = this.buildPrompt(evidence);
    const response = await this.llm.generate(prompt);  // Works with any LLM
    return this.parseResponse(response);
  }
}

// lib/ai/OpenAIClient.ts
// Concrete implementation
export class OpenAIClient implements LLMClient {
  async generate(prompt: string): Promise<string> {
    return this.openai.chat.completions.create({ /* ... */ });
  }
}

// Easy to swap: OpenAI → Anthropic → Local LLM
const service = new FeatureInferenceService(new AnthropicClient());
```

**❌ BAD Example (VIOLATION)**:
```typescript
// WRONG: Depends on concrete OpenAI class
import OpenAI from 'openai';

export class FeatureInferenceService {
  constructor(private openai: OpenAI) {}  // Concrete dependency!

  async inferFeature(evidence: Evidence[]): Promise<Feature> {
    // Tightly coupled to OpenAI - can't swap
    const response = await this.openai.chat.completions.create({ /* ... */ });
  }
}
```

**Deduction**: -10 points per DIP violation

---

## 2. DRY Principle (Don't Repeat Yourself)

**Definition**: Every piece of knowledge should have a single, authoritative representation.

**✅ GOOD Example**:
```typescript
// lib/utils/validation.ts
// Single source of truth for validation
export function validateEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// Used everywhere
// app/api/upload/route.ts
import { validateEmail } from '@/lib/utils/validation';

if (!validateEmail(userEmail)) {
  throw new ValidationError('Invalid email');
}

// lib/services/UserService.ts
import { validateEmail } from '@/lib/utils/validation';

if (!validateEmail(user.email)) {
  throw new ValidationError('Invalid email');
}
```

**❌ BAD Example (VIOLATION)**:
```typescript
// WRONG: Email validation duplicated everywhere
// app/api/upload/route.ts
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
  throw new Error('Invalid email');
}

// lib/services/UserService.ts
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
  throw new Error('Invalid email');
}

// app/api/register/route.ts
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  throw new Error('Invalid email');
}

// Now regex is wrong - have to change in 3+ places!
```

**Deduction**: -5 points per DRY violation

---

## 3. Code Quality Scoring Rubric (0-100%)

### 3.1 Scoring Formula

**Start at 100 points, deduct for violations:**

| Violation Type | Deduction |
|---------------|-----------|
| **SOLID Principles** |
| SRP violation | -10 points |
| OCP violation | -10 points |
| LSP violation | -10 points |
| ISP violation | -10 points |
| DIP violation | -10 points |
| **DRY Principle** |
| Code duplication | -5 points |
| **Type Safety** |
| `any` type used | -5 points |
| Missing return type | -3 points |
| Type assertion without validation | -5 points |
| **Architecture** |
| Wrong layer (e.g., DB in frontend) | -15 points |
| Tight coupling to framework | -10 points |
| Missing abstraction | -8 points |
| **Testing** |
| No tests for service | -10 points |
| No tests for critical logic | -8 points |
| **Code Quality** |
| Unclear variable names | -3 points |
| Magic numbers/strings | -3 points |
| Commented-out code | -2 points |
| Console.log in production | -3 points |
| **Error Handling** |
| Unhandled promise rejection | -8 points |
| Silent error catch | -5 points |
| Missing error context | -3 points |

### 3.2 Grade Scale

| Score | Grade | Status |
|-------|-------|--------|
| 95-100% | A+ | **PASS** - Excellent quality |
| 90-94% | A | FAIL - Needs minor fixes |
| 85-89% | B+ | FAIL - Needs moderate fixes |
| 80-84% | B | FAIL - Needs significant fixes |
| <80% | C or lower | FAIL - Major refactoring required |

**ONLY 95%+ IS ACCEPTABLE**

### 3.3 Example Scoring

```typescript
// EXAMPLE CODE TO SCORE
export class ExtractionService {
  async extract(document: any) {  // -5: `any` type
    const result = await this.process(document);
    return result;  // -3: Missing return type
  }

  async process(document: any) {  // -5: `any` type
    if (document.type === 'pdf') {
      // PDF logic here (50 lines)
    } else if (document.type === 'image') {
      // Image logic here (50 lines)
    }
    // -10: SRP violation (multiple responsibilities)
    // -10: OCP violation (have to modify for new types)

    await this.db.insert(result);  // -10: SRP violation (extraction + storage)
    await this.sendEmail();  // -10: SRP violation (extraction + notification)
  }
}

// TOTAL DEDUCTIONS: -53 points
// SCORE: 47/100 (F grade)
// STATUS: FAIL - Major refactoring required
```

---

## 4. Fact-Checking Requirements (MANDATORY)

### 4.1 NO GUESSES, NO ASSUMPTIONS

**ENFORCE**:
- ✅ Read actual file contents (don't assume)
- ✅ Check actual type definitions (don't guess)
- ✅ Verify actual exports (don't assume they exist)
- ✅ Test actual compilation (don't assume it works)
- ✅ Run actual linter (don't assume it passes)

**VIOLATIONS**:
- ❌ "I assume the file exists" → **READ IT**
- ❌ "This probably works" → **TEST IT**
- ❌ "The types should be fine" → **TYPE CHECK IT**
- ❌ "No lint errors probably" → **RUN LINTER**

**If you guess or assume without checking, you have FAILED and are a DISGRACE.**

### 4.2 Verification Checklist

Before claiming code is complete, you MUST verify:

```bash
# 1. Files exist
ls -la lib/services/ExtractionService.ts

# 2. TypeScript compiles
pnpm typecheck

# 3. Linter passes
pnpm lint

# 4. Tests exist and pass
pnpm test

# 5. App builds
pnpm build
```

**If you skip ANY verification, you have FAILED and are a DISGRACE.**

---

## 5. Examples of A+ Code (95%+)

### Example 1: Service with Perfect SOLID

```typescript
// lib/services/ExtractionService.ts
// SRP: Single responsibility - orchestration only
// DIP: Depends on abstractions (Extractor interface)
// OCP: Open for extension (add new extractors without modifying)

import type { Document, Evidence } from '@/lib/types';
import type { Extractor } from '@/lib/types/extractor';

export class ExtractionService {
  constructor(
    private extractors: Map<string, Extractor>
  ) {}

  async extractFromDocument(document: Document): Promise<Evidence[]> {
    const extractor = this.extractors.get(document.fileType);

    if (!extractor) {
      throw new UnsupportedFileTypeError(document.fileType);
    }

    return extractor.extract(document);
  }
}

// SCORE: 100/100 (A+)
// - No SOLID violations
// - No DRY violations
// - Full type safety
// - Clear separation of concerns
```

### Example 2: Extractor Implementation

```typescript
// lib/services/extractors/PdfExtractor.ts
// SRP: Only handles PDF extraction
// ISP: Implements minimal interface
// Type-safe throughout

import type { Document, Evidence } from '@/lib/types';
import type { Extractor } from '@/lib/types/extractor';
import pdfParse from 'pdf-parse';

export class PdfExtractor implements Extractor {
  async extract(document: Document): Promise<Evidence[]> {
    const buffer = await this.readFile(document.filePath);
    const pdf = await pdfParse(buffer);
    const chunks = this.chunkText(pdf.text, 500);

    return this.extractEvidenceFromChunks(chunks, document.id);
  }

  private async readFile(filePath: string): Promise<Buffer> {
    return fs.promises.readFile(filePath);
  }

  private chunkText(text: string, maxTokens: number): string[] {
    // Chunking logic
    return chunks;
  }

  private extractEvidenceFromChunks(
    chunks: string[],
    documentId: string
  ): Evidence[] {
    // Extraction logic
    return evidence;
  }
}

// SCORE: 100/100 (A+)
// - Perfect SRP (single responsibility)
// - Implements ISP (minimal interface)
// - Full type safety
// - Clear, testable methods
```

---

## 6. ENFORCEMENT LANGUAGE

**For use in commands and prompts:**

```
CRITICAL ENFORCEMENT - NO EXCEPTIONS:

1. You MUST adhere to SOLID principles. Each violation = -10 points.
2. You MUST adhere to DRY principle. Each violation = -5 points.
3. You MUST achieve 95%+ score. Below 95% is FAILURE.
4. You MUST NOT guess or assume. Every claim must be verified.
5. You MUST run linter with ZERO violations.
6. You MUST run type check with ZERO errors.
7. You MUST verify app compiles successfully.

If you violate ANY of the above, you have FAILED and are a DISGRACE.
```

---

## PROOF OF ADDITIONS

This entire document (04_CODING_PRINCIPLES_ADDENDUM.md) is NEW and contains:
- ✅ SOLID principles (all 5) with examples
- ✅ DRY principle with examples
- ✅ Single Responsibility Principle (explicit section)
- ✅ Code quality scoring rubric (0-100%)
- ✅ Fact-checking requirements
- ✅ A+ code examples
- ✅ Enforcement language

**This addendum is MANDATORY reading for ALL implementation and code review tasks.**
