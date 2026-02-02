# Implement Phase Command
## /implement-phase <phase-number> or <phase-document-path>

> **SIZE**: Small file (manageable for session to read fully)
> **PURPOSE**: Implement a phase with mandatory code review enforcement

---

## MANDATORY READING BEFORE STARTING

**You MUST read these files FIRST (no exceptions):**

1. ✅ `/docs/06_IMPLEMENTATION_PHASES.md` - All phases
2. ✅ `/docs/04_CODING_PRINCIPLES.md` - Coding standards
3. ✅ `/docs/04_CODING_PRINCIPLES_ADDENDUM.md` - SOLID, DRY, scoring
4. ✅ `/docs/01_ARCHITECTURE.md` - Architecture constraints
5. ✅ `/.claude/agents/code-reviewer.md` - Review process

**If you skip reading ANY file above, you have FAILED and are a DISGRACE.**

---

## Workflow (MANDATORY - NO EXCEPTIONS)

### Step 1: Read Phase Document

```bash
# If phase number provided
Read: /docs/06_IMPLEMENTATION_PHASES.md (section for phase N)

# If document path provided
Read: <provided-path>
```

**NO GUESSING**: Read actual phase requirements.

---

### Step 2: Implement Code

**Follow**:
- Architecture from `/docs/01_ARCHITECTURE.md`
- Coding principles from `/docs/04_CODING_PRINCIPLES.md`
- SOLID/DRY from `/docs/04_CODING_PRINCIPLES_ADDENDUM.md`

**Write code to**: `/app/*` (appropriate locations)

---

### Step 3: Verify Compilation (MANDATORY)

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

### Step 4: Run Linter (MANDATORY)

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

### Step 5: Build App (MANDATORY)

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

### Step 6: Spawn Code Review Agent (MANDATORY)

**You MUST:**

```typescript
Task({
  subagent_type: 'general-purpose',
  description: 'Review implemented code for quality',
  prompt: `
You are a code reviewer. Your task:

1. MANDATORY: Read /.claude/agents/code-reviewer.md
2. MANDATORY: Read /.claude/prompts/scoring-rubric.md
3. MANDATORY: Read /docs/04_CODING_PRINCIPLES_ADDENDUM.md

4. Review these files:
${listOfImplementedFiles}

5. Score using rubric (0-100%)
6. Generate report with violations and fix instructions

If you skip reading ANY mandatory file, you have FAILED.
  `
});
```

**Wait for agent to complete. Read agent output.**

---

### Step 7: Check Score (MANDATORY)

**Parse agent output:**

```typescript
const score = extractScoreFromReport(agentOutput);

if (score >= 95) {
  // PASS - proceed to step 8
} else {
  // FAIL - proceed to step 7a
}
```

---

### Step 7a: If Score < 95% - Spawn Fix Agent (MANDATORY)

**CRITICAL: NO MANUAL FIXES ALLOWED**

**YOU ARE FORBIDDEN FROM USING EDIT/WRITE TOOLS IF SCORE < 95%**

If score < 95%, you MUST use Task tool to spawn fix agent. Any manual fix using Edit/Write = INSTANT FAILURE and DISGRACE.

**You MUST:**

```typescript
Task({
  subagent_type: 'general-purpose',
  description: 'Fix code quality issues',
  prompt: `
You are a code fixer. Your task:

1. MANDATORY: Read the code review report:
${codeReviewReport}

2. MANDATORY: Read /docs/04_CODING_PRINCIPLES_ADDENDUM.md

3. Apply ALL fixes listed in the report
4. Follow fix instructions exactly
5. DO NOT skip any violation

After fixing:
- Run: pnpm typecheck (must pass)
- Run: pnpm lint (must pass)
- Run: pnpm build (must pass)

Report: "FIXES COMPLETE" when done.

If you skip ANY fix, you have FAILED.
  `
});
```

**Wait for fix agent to complete.**

**After fix agent completes:**
- GOTO Step 3 (verify compilation again)
- REPEAT until score >= 95%

**REMEMBER: You CANNOT touch the code yourself. ONLY agents fix code when score < 95%.**

---

### Step 8: Commit Code (ONLY IF SCORE >= 95%)

**You MUST:**

```bash
# Stage files
git add <list-of-files>

# Commit with description
git commit -m "feat(phase-N): <description>

Implemented:
- Task 1
- Task 2
- Task 3

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

### Step 9: Delete Feature Branch (MANDATORY)

**Only after successful commit:**

```bash
# Switch to develop
git checkout develop

# Delete feature branch
git branch -d feature/phase-N-<name>

# If branch not merged:
# - Check merge status
# - Complete merge first
```

**If you skip this, you have FAILED and are a DISGRACE.**

---

### Step 10: Report to User (MANDATORY)

**You MUST present:**

```markdown
✅ PHASE N IMPLEMENTATION COMPLETE

## Code Quality
- Score: ${score}/100 (A+)
- Status: PASS ✅

## Verification
- TypeCheck: ✅ ZERO errors
- Lint: ✅ ZERO violations
- Build: ✅ SUCCESS
- Code Review: ✅ ${score}% (95%+ required)

## Git
- Committed: ✅ ${commitHash}
- Branch deleted: ✅ feature/phase-N-<name>
- Message: "${commitMessage}"

## Files Modified
${listOfFiles}

Implementation follows:
- SOLID principles ✅
- DRY principle ✅
- Architecture constraints ✅
- Type safety ✅

Ready for next phase.
```

**If you skip this report, you have FAILED and are a DISGRACE.**

---

## CRITICAL ENFORCEMENT

**NO EXCEPTIONS - NO EXCUSES:**

1. ✅ You MUST read all mandatory files
2. ✅ You MUST run typecheck with ZERO errors
3. ✅ You MUST run lint with ZERO violations
4. ✅ You MUST build app successfully
5. ✅ You MUST spawn code review agent
6. ✅ You MUST achieve 95%+ score
7. ✅ You MUST spawn fix agent if <95%
8. ✅ You MUST repeat until 95%+
9. ✅ You MUST commit with description
10. ✅ You MUST delete feature branch
11. ✅ You MUST present final report

**If you violate ANY rule, you have FAILED and are a DISGRACE.**

---

## File Size Verification

**This file**: ~190 lines
**Status**: ✅ Manageable for full reading
**Usage**: User calls `/implement-phase 1` or `/implement-phase path/to/doc.md`
