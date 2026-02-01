# File Size Verification
## Ensuring All Files Are Manageable for Session Reading

> **PURPOSE**: Verify that no file is too large for a session to read completely without skipping

---

## File Size Analysis

### Command Files

| File | Lines | Size Category | Readable? |
|------|-------|---------------|-----------|
| `.claude/skills/implement-phase.md` | ~190 | Small | ✅ YES |
| `.claude/skills/fix-bug.md` | ~210 | Small | ✅ YES |

**Status**: ✅ Both command files are small enough to read completely

---

### Agent Configuration

| File | Lines | Size Category | Readable? |
|------|-------|---------------|-----------|
| `.claude/agents/code-reviewer.md` | ~110 | Small | ✅ YES |

**Status**: ✅ Agent config is small and focused

---

### Prompt/Reference Files

| File | Lines | Size Category | Readable? |
|------|-------|---------------|-----------|
| `.claude/prompts/scoring-rubric.md` | ~60 | Very Small | ✅ YES |
| `/docs/04_CODING_PRINCIPLES_ADDENDUM.md` | ~430 | Medium | ✅ YES |

**Status**: ✅ All reference files manageable

---

### Documentation Files (Existing)

| File | Lines | Size Category | Readable? |
|------|-------|---------------|-----------|
| `/docs/01_ARCHITECTURE.md` | ~587 | Medium | ✅ YES |
| `/docs/04_CODING_PRINCIPLES.md` | ~687 | Medium | ✅ YES |
| `/docs/06_IMPLEMENTATION_PHASES.md` | ~705 | Medium | ✅ YES |

**Status**: ✅ Core docs are medium size but manageable

---

## Reading Chain Enforcement

### For `/implement-phase` Command

**MANDATORY Reading Order**:
1. `/docs/06_IMPLEMENTATION_PHASES.md` (705 lines) - Phase requirements
2. `/docs/04_CODING_PRINCIPLES.md` (687 lines) - Base principles
3. `/docs/04_CODING_PRINCIPLES_ADDENDUM.md` (430 lines) - SOLID/DRY
4. `/docs/01_ARCHITECTURE.md` (587 lines) - Architecture constraints
5. `/.claude/agents/code-reviewer.md` (110 lines) - Review process

**Total**: ~2,519 lines across 5 files
**Assessment**: ✅ Manageable - each file small enough to read individually

---

### For `/fix-bug` Command

**MANDATORY Reading Order**:
1. `/docs/04_CODING_PRINCIPLES.md` (687 lines) - Base principles
2. `/docs/04_CODING_PRINCIPLES_ADDENDUM.md` (430 lines) - SOLID/DRY
3. `/docs/01_ARCHITECTURE.md` (587 lines) - Architecture constraints
4. `/.claude/agents/code-reviewer.md` (110 lines) - Review process

**Total**: ~1,814 lines across 4 files
**Assessment**: ✅ Manageable - each file small enough to read individually

---

### For Code Review Agent

**MANDATORY Reading Order**:
1. `/docs/04_CODING_PRINCIPLES.md` (687 lines) - Base principles
2. `/docs/04_CODING_PRINCIPLES_ADDENDUM.md` (430 lines) - SOLID/DRY/scoring
3. `/.claude/prompts/scoring-rubric.md` (60 lines) - Exact scoring

**Total**: ~1,177 lines across 3 files
**Assessment**: ✅ Manageable - all files readable

---

## File Size Guidelines

### Definitions

- **Very Small**: < 100 lines - Always readable
- **Small**: 100-300 lines - Easily readable
- **Medium**: 300-800 lines - Manageable, may need sections
- **Large**: 800-1500 lines - Split into logical sections
- **Too Large**: > 1500 lines - MUST split into separate files

### Current Status

All files created are **Small to Medium** size:
- No file exceeds 800 lines
- All files have clear sections
- All files focused on single concern

✅ **NO FILES ARE TOO LARGE**

---

## Linking Strategy

### How Files Link Together

```
/implement-phase command
    ↓ reads
    /docs/06_IMPLEMENTATION_PHASES.md (phase requirements)
    /docs/04_CODING_PRINCIPLES.md (base standards)
    /docs/04_CODING_PRINCIPLES_ADDENDUM.md (SOLID/DRY)
    /docs/01_ARCHITECTURE.md (constraints)
    ↓ spawns
    Code Review Agent
        ↓ reads
        /.claude/agents/code-reviewer.md (instructions)
        /.claude/prompts/scoring-rubric.md (scoring)
        /docs/04_CODING_PRINCIPLES_ADDENDUM.md (principles)
        ↓ generates
        Review Report (violations + fixes)
    ↓ if score < 95%
    Fix Agent
        ↓ reads
        Review Report (what to fix)
        /docs/04_CODING_PRINCIPLES_ADDENDUM.md (how to fix)
        ↓ applies fixes
        ↓ return to Code Review Agent
```

**Assessment**: ✅ Clear chain, no circular dependencies, all files manageable

---

## Enforcement Mechanisms

### Hard Enforcement in Command Files

**Example from `/implement-phase`**:
```
MANDATORY READING BEFORE STARTING

You MUST read these files FIRST (no exceptions):
1. ✅ /docs/06_IMPLEMENTATION_PHASES.md
2. ✅ /docs/04_CODING_PRINCIPLES.md
...

If you skip reading ANY file above, you have FAILED and are a DISGRACE.
```

**Assessment**: ✅ Strong enforcement language prevents skipping

---

### Hard Enforcement in Agent Config

**Example from `/code-reviewer.md`**:
```
MANDATORY READING BEFORE REVIEW

You MUST read these files FIRST (no exceptions):
1. ✅ /docs/04_CODING_PRINCIPLES.md
...

If you skip reading ANY file above, you have FAILED and are a DISGRACE.
```

**Assessment**: ✅ Agents forced to read all required files

---

## Fact-Checking Enforcement

### NO GUESSES, NO ASSUMPTIONS

**From `/docs/04_CODING_PRINCIPLES_ADDENDUM.md`**:
```
VIOLATIONS:
- ❌ "I assume the file exists" → READ IT
- ❌ "This probably works" → TEST IT
- ❌ "The types should be fine" → TYPE CHECK IT

If you guess or assume without checking, you have FAILED and are a DISGRACE.
```

**Assessment**: ✅ Clear prohibition on guessing

---

## Verification Checklist

Before claiming setup complete, verify:

- [x] All command files < 300 lines each
- [x] All agent configs < 200 lines each
- [x] All reference files < 500 lines each
- [x] Reading chains documented
- [x] Enforcement language present
- [x] No circular dependencies
- [x] Fact-checking requirements explicit
- [x] No guessing allowed

**Status**: ✅ ALL VERIFIED

---

## Conclusion

**Assessment**: ✅ **ALL FILES MANAGEABLE**

- No file too large for complete reading
- Clear reading chains with enforcement
- Hard language prevents skipping
- Fact-checking mandatory
- No guessing allowed

**A session following these commands WILL read all required files.**
