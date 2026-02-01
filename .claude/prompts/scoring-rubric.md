# Code Quality Scoring Rubric
## For Code Review Agent - MANDATORY REFERENCE

> **SIZE**: Small file (manageable for session to read fully)
> **PURPOSE**: Define exact scoring criteria for code review

---

## Scoring Formula

**Start at 100 points, deduct for each violation:**

### SOLID Principles (10 points each)
- **SRP violation**: Class/function has multiple responsibilities → -10
- **OCP violation**: Must modify class to extend behavior → -10
- **LSP violation**: Subtype not substitutable for base type → -10
- **ISP violation**: Interface has unused methods → -10
- **DIP violation**: Depends on concretions, not abstractions → -10

### DRY Principle (5 points each)
- **Code duplication**: Same logic repeated in multiple places → -5

### Type Safety (3-5 points each)
- **`any` type**: Used instead of proper type → -5
- **Missing return type**: Function lacks return type annotation → -3
- **Unsafe type assertion**: `as Type` without validation → -5

### Architecture (8-15 points each)
- **Wrong layer**: DB access in frontend, UI in backend → -15
- **Framework coupling**: Tight coupling to Next.js in services → -10
- **Missing abstraction**: Direct concrete dependencies → -8

### Testing (8-10 points each)
- **No service tests**: Service has no unit tests → -10
- **No critical logic tests**: Complex logic untested → -8

### Code Quality (2-3 points each)
- **Unclear naming**: Variables like `x`, `temp`, `data` → -3
- **Magic values**: Hardcoded strings/numbers → -3
- **Commented code**: Dead code left in → -2
- **Console.log**: Left in production code → -3

### Error Handling (3-8 points each)
- **Unhandled rejection**: Promise without catch → -8
- **Silent catch**: `catch {}` with no logging → -5
- **No error context**: Error without details → -3

---

## Grade Scale

| Score | Grade | Status |
|-------|-------|--------|
| **95-100%** | **A+** | **PASS** ✅ |
| 90-94% | A | **FAIL** ❌ |
| 85-89% | B+ | **FAIL** ❌ |
| 80-84% | B | **FAIL** ❌ |
| <80% | C or lower | **FAIL** ❌ |

**ONLY 95%+ IS ACCEPTABLE - NO EXCEPTIONS**

---

## Scoring Examples

### Example 1: Score 47% (FAIL)
```typescript
export class ExtractionService {
  async extract(document: any) {  // -5: any type
    const result = await this.process(document);
    return result;  // -3: no return type
  }

  async process(document: any) {  // -5: any type
    if (document.type === 'pdf') { /* ... */ }
    else if (document.type === 'image') { /* ... */ }
    // -10: SRP (multiple responsibilities)
    // -10: OCP (must modify for new types)

    await this.db.insert(result);  // -10: SRP (extraction + storage)
    await this.sendEmail();  // -10: SRP (extraction + notification)
  }
}

// Deductions: -53 points
// Score: 47/100
// Grade: F
// Status: FAIL - Major refactoring
```

### Example 2: Score 100% (PASS)
```typescript
export class ExtractionService {
  constructor(
    private extractors: Map<string, Extractor>
  ) {}

  async extractFromDocument(
    document: Document
  ): Promise<Evidence[]> {
    const extractor = this.extractors.get(document.fileType);
    if (!extractor) {
      throw new UnsupportedFileTypeError(document.fileType);
    }
    return extractor.extract(document);
  }
}

// Deductions: 0 points
// Score: 100/100
// Grade: A+
// Status: PASS ✅
```

---

## File Size Verification

**This file**: ~60 lines
**Status**: ✅ Manageable for full reading
**Linked from**: Code reviewer agent
