# File Size Monitoring
## Prevent Files Growing Too Large

> **PURPOSE**: Ensure no file grows so large that sessions skip reading it

---

## Current File Sizes (Lines)

### ⚠️ APPROACHING LIMIT (800-1000 lines)

| File | Lines | Status | Action |
|------|-------|--------|--------|
| `docs/01_ARCHITECTURE.md` | 872 | ⚠️ Monitor | Consider splitting if grows >1000 |
| `docs/08_UI_UX_PRINCIPLES.md` | 812 | ⚠️ Monitor | Consider splitting if grows >1000 |

### ✅ MANAGEABLE (< 800 lines)

| File | Lines | Status |
|------|-------|--------|
| `docs/04_CODING_PRINCIPLES.md` | 687 | ✅ OK |
| `docs/06_IMPLEMENTATION_PHASES.md` | 668 | ✅ OK |
| `docs/07_EXTRACTION_RULES.md` | 630 | ✅ OK |
| `docs/04_CODING_PRINCIPLES_ADDENDUM.md` | 581 | ✅ OK |
| `docs/05_GIT_STRATEGY.md` | 580 | ✅ OK |
| `docs/03_DATABASE_SCHEMA.md` | 542 | ✅ OK |
| `docs/02_TECH_STACK.md` | 418 | ✅ OK |
| `docs/09_AUTHENTICATION_DECISION.md` | 118 | ✅ OK |

### ✅ COMMAND FILES (All Good)

| File | Lines | Status |
|------|-------|--------|
| `.claude/skills/fix-bug.md` | 369 | ✅ OK |
| `.claude/skills/implement-phase.md` | 305 | ✅ OK |
| `.claude/agents/code-reviewer.md` | 200 | ✅ OK |
| `.claude/prompts/scoring-rubric.md` | 121 | ✅ OK |

---

## Size Guidelines

| Size | Lines | Readability | Action |
|------|-------|-------------|--------|
| **Small** | < 300 | ✅ Excellent | Keep as is |
| **Medium** | 300-600 | ✅ Good | Monitor growth |
| **Large** | 600-800 | ⚠️ Acceptable | Monitor closely |
| **Very Large** | 800-1000 | ⚠️ Borderline | Consider splitting |
| **Too Large** | > 1000 | ❌ Split required | Must split into multiple files |

---

## Files to Monitor

### 1. docs/01_ARCHITECTURE.md (872 lines)

**Sections**:
1. High-Level Design (50 lines)
2. Component Overview (80 lines)
3. Data Flow (60 lines)
4. Docker Architecture (40 lines)
5. Core Algorithm (30 lines)
6. Key Design Decisions (40 lines)
7. Scalability (30 lines)
8. Security (30 lines)
9. Error Handling (30 lines)
10. Monitoring (30 lines)
11. Communication Patterns (150 lines) ← Large section
12. Migration Path (300 lines) ← Very large section

**If grows >1000**: Split Section 12 (Migration Path) into separate file: `docs/10_MIGRATION_GUIDE.md`

---

### 2. docs/08_UI_UX_PRINCIPLES.md (812 lines)

**Sections**:
1. Design System (80 lines)
2. UI Principles (80 lines)
3. Page-Specific Specs (200 lines) ← Large
4. Testing & Debug UI (100 lines)
5. Simple & Guided (60 lines)
6. Responsive Design (40 lines)
7. Accessibility (40 lines)
8. Animation Guidelines (40 lines)
9. Error States (60 lines)
10. Color System (40 lines)
11. Component Selection (40 lines)
12. Implementation Mandate (20 lines)
13. Example Code (100 lines)

**If grows >1000**: Split page specs into separate files per page type

---

## Current Assessment

**Total documentation**: ~5,900 lines across 18 files

**Largest file**: 872 lines (Architecture)

**Average file size**: ~328 lines

**Status**: ✅ **ALL FILES MANAGEABLE**

**No file exceeds 1000 lines** ← Critical threshold

---

## Enforcement in Commands

### Commands Already Check File Sizes

**From `.claude/skills/implement-phase.md`**:
```
MANDATORY READING BEFORE STARTING

You MUST read these files FIRST (no exceptions):
1. ✅ /docs/06_IMPLEMENTATION_PHASES.md (668 lines - manageable)
2. ✅ /docs/04_CODING_PRINCIPLES.md (687 lines - manageable)
...
```

**All mandatory files are under 900 lines** ← Sessions will read completely

---

## If Files Grow Too Large

### Splitting Strategy

**Architecture doc** (if >1000 lines):
```
docs/01_ARCHITECTURE.md (keep core architecture)
docs/10_MIGRATION_GUIDE.md (extract Section 12)
```

**UI principles doc** (if >1000 lines):
```
docs/08_UI_UX_PRINCIPLES.md (keep principles)
docs/11_UI_PAGE_SPECS.md (extract page layouts)
```

**Update commands** to reference new split files

---

## Monitoring Process

**Check file sizes after major updates**:
```bash
cd /Users/francesco/Desktop/requirement\ app
wc -l docs/*.md | sort -n
```

**If any file >1000**: Split immediately using strategy above

---

## Current Verdict

✅ **NO FILES TOO LARGE**

**Largest**: 872 lines (Architecture) - still manageable
**Commands**: All reference <900 line files
**Sessions**: Will read all files completely

**Action required**: ✅ NONE (monitor only)

**Files are sized appropriately for sessions to read without skipping.**
