# Fix Bug Command
## /fix-bug <bug-description> or <issue-number>

> **SIZE**: Small file (manageable for session to read fully)
> **PURPOSE**: Fix bugs with mandatory code review enforcement

---

## MANDATORY READING BEFORE STARTING

**You MUST read these files FIRST (no exceptions):**

1. ✅ `/docs/04_CODING_PRINCIPLES.md` - Coding standards
2. ✅ `/docs/04_CODING_PRINCIPLES_ADDENDUM.md` - SOLID, DRY, scoring
3. ✅ `/docs/01_ARCHITECTURE.md` - Architecture constraints
4. ✅ `/.claude/agents/code-reviewer.md` - Review process

**If you skip reading ANY file above, you have FAILED and are a DISGRACE.**

---

## Workflow (MANDATORY - NO EXCEPTIONS)

### Step 1: Understand Bug

**Read bug description or issue:**

```bash
# If issue number provided
Read: .github/issues/<issue-number> or issue tracker

# If description provided
Parse: <bug-description>
```

**NO GUESSING**: Understand actual bug, don't assume.

---

### Step 2: Locate Bug in Code

**You MUST:**

1. Find files related to bug
2. Read actual code (don't guess)
3. Identify root cause
4. Plan fix approach

**Use tools:**
```bash
# Search for relevant code
Grep: <keyword-from-bug>

# Read suspected files
Read: <file-path>
```

---

### Step 3: Implement Fix

**Follow**:
- Architecture from `/docs/01_ARCHITECTURE.md`
- Coding principles from `/docs/04_CODING_PRINCIPLES.md`
- SOLID/DRY from `/docs/04_CODING_PRINCIPLES_ADDENDUM.md`

**Write fix to**: Identified files

**IMPORTANT**: Fix root cause, not symptoms

---

### Step 4: Verify Compilation (MANDATORY)

**You MUST run:**

```bash
# Type check
pnpm typecheck

# If errors found:
# - Fix immediately
# - Re-run typecheck
# - Repeat until ZERO errors
```

**If you skip this, you have FAILED and are a DISGRACE.**

---

### Step 5: Run Linter (MANDATORY)

**You MUST run:**

```bash
# Lint
pnpm lint

# If violations found:
# - Fix immediately
# - Re-run lint
# - Repeat until ZERO violations
```

**If you skip this, you have FAILED and are a DISGRACE.**

---

### Step 6: Build App (MANDATORY)

**You MUST verify:**

```bash
# Build
pnpm build

# If build fails:
# - Fix immediately
# - Re-run build
# - Repeat until SUCCESS
```

**If you skip this, you have FAILED and are a DISGRACE.**

---

### Step 7: Test Fix (MANDATORY)

**You MUST verify:**

```bash
# Run tests
pnpm test

# If tests fail:
# - Fix code or tests
# - Re-run tests
# - Repeat until ALL PASS

# If no tests exist for this code:
# - Write test that reproduces bug
# - Verify test fails before fix
# - Verify test passes after fix
```

**If you skip this, you have FAILED and are a DISGRACE.**

---

### Step 8: Spawn Code Review Agent (MANDATORY)

**You MUST:**

```typescript
Task({
  subagent_type: 'general-purpose',
  description: 'Review bug fix for quality',
  prompt: `
You are a code reviewer. Your task:

1. MANDATORY: Read /.claude/agents/code-reviewer.md
2. MANDATORY: Read /.claude/prompts/scoring-rubric.md
3. MANDATORY: Read /docs/04_CODING_PRINCIPLES_ADDENDUM.md

4. Review these fixed files:
${listOfFixedFiles}

5. Score using rubric (0-100%)
6. Generate report with violations and fix instructions

Focus on:
- Is root cause fixed?
- Does fix introduce new issues?
- Is fix minimal and focused?
- Does fix follow SOLID/DRY?

If you skip reading ANY mandatory file, you have FAILED.
  `
});
```

**Wait for agent to complete. Read agent output.**

---

### Step 9: Check Score (MANDATORY)

**Parse agent output:**

```typescript
const score = extractScoreFromReport(agentOutput);

if (score >= 95) {
  // PASS - proceed to step 10
} else {
  // FAIL - proceed to step 9a
}
```

---

### Step 9a: If Score < 95% - Spawn Fix Agent (MANDATORY)

**You MUST:**

```typescript
Task({
  subagent_type: 'general-purpose',
  description: 'Fix code quality issues in bug fix',
  prompt: `
You are a code fixer. Your task:

1. MANDATORY: Read the code review report:
${codeReviewReport}

2. MANDATORY: Read /docs/04_CODING_PRINCIPLES_ADDENDUM.md

3. Apply ALL fixes listed in the report
4. Follow fix instructions exactly
5. DO NOT skip any violation
6. DO NOT break the bug fix

After fixing:
- Run: pnpm typecheck (must pass)
- Run: pnpm lint (must pass)
- Run: pnpm build (must pass)
- Run: pnpm test (must pass)

Report: "FIXES COMPLETE" when done.

If you skip ANY fix, you have FAILED.
  `
});
```

**Wait for fix agent to complete.**

**After fix agent completes:**
- GOTO Step 4 (verify compilation again)
- REPEAT until score >= 95%

---

### Step 10: Commit Fix (ONLY IF SCORE >= 95%)

**You MUST:**

```bash
# Stage files
git add <list-of-files>

# Commit with bug fix message
git commit -m "fix(<scope>): <bug-description>

Fixes: #<issue-number> (if applicable)

Root cause: <explanation>
Solution: <explanation>

Code quality: ${score}/100 (A+)
Tests: passing
Lint: passing
TypeCheck: passing

Co-Authored-By: Claude Code <noreply@anthropic.com>"

# If commit fails:
# - Check git status
# - Fix issues
# - Retry commit
```

**If you skip this, you have FAILED and are a DISGRACE.**

---

### Step 11: Delete Feature Branch (MANDATORY)

**Only after successful commit:**

```bash
# Switch to develop
git checkout develop

# Delete bugfix branch
git branch -d bugfix/<bug-name>

# If branch not merged:
# - Check merge status
# - Complete merge first
```

**If you skip this, you have FAILED and are a DISGRACE.**

---

### Step 12: Report to User (MANDATORY)

**You MUST present:**

```markdown
✅ BUG FIX COMPLETE

## Bug
- Issue: #${issueNumber} or ${bugDescription}
- Root cause: ${rootCause}
- Solution: ${solution}

## Code Quality
- Score: ${score}/100 (A+)
- Status: PASS ✅

## Verification
- TypeCheck: ✅ ZERO errors
- Lint: ✅ ZERO violations
- Build: ✅ SUCCESS
- Tests: ✅ ALL PASSING
- Code Review: ✅ ${score}% (95%+ required)

## Git
- Committed: ✅ ${commitHash}
- Branch deleted: ✅ bugfix/<bug-name>
- Message: "${commitMessage}"

## Files Modified
${listOfFiles}

Fix follows:
- SOLID principles ✅
- DRY principle ✅
- Architecture constraints ✅
- Type safety ✅
- Root cause addressed ✅

Bug is resolved.
```

**If you skip this report, you have FAILED and are a DISGRACE.**

---

## CRITICAL ENFORCEMENT

**NO EXCEPTIONS - NO EXCUSES:**

1. ✅ You MUST read all mandatory files
2. ✅ You MUST understand actual bug (no guessing)
3. ✅ You MUST fix root cause (not symptoms)
4. ✅ You MUST run typecheck with ZERO errors
5. ✅ You MUST run lint with ZERO violations
6. ✅ You MUST build app successfully
7. ✅ You MUST run tests and verify ALL PASS
8. ✅ You MUST spawn code review agent
9. ✅ You MUST achieve 95%+ score
10. ✅ You MUST spawn fix agent if <95%
11. ✅ You MUST repeat until 95%+
12. ✅ You MUST commit with description
13. ✅ You MUST delete bugfix branch
14. ✅ You MUST present final report

**If you violate ANY rule, you have FAILED and are a DISGRACE.**

---

## File Size Verification

**This file**: ~210 lines
**Status**: ✅ Manageable for full reading
**Usage**: User calls `/fix-bug "description"` or `/fix-bug #123`
