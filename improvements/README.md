# Feature Hierarchy Implementation Plan
## Complete Guide for New Session

**Status**: 📝 READY FOR IMPLEMENTATION
**Estimated Time**: 24-28 hours (3-4 days)
**Complexity**: HIGH
**Risk Level**: MEDIUM (mitigated with rollback plan)

---

## Quick Start

**For a new Claude Code session implementing this plan:**

```bash
# 1. Navigate to project
cd /Users/francesco/Desktop/requirement\ app

# 2. Read the index file
cat improvements/INDEX.md

# 3. Follow the mandatory reading order (6 files)
cat improvements/01_CURRENT_STATE_ANALYSIS.md
cat improvements/02_DATABASE_SCHEMA_CHANGES.md
cat improvements/03_HIERARCHY_SERVICE_IMPLEMENTATION.md
cat improvements/04_TICKET_SERVICE_REWRITE.md
cat improvements/05_UI_HIERARCHY_SUPPORT.md
cat improvements/06_TESTING_AND_VALIDATION.md

# 4. Execute each phase sequentially
# (Follow instructions in each file)
```

---

## Problem Statement

**Current:** Every feature becomes a separate Jira epic
- "User Authentication" → Epic
- "User Login" → Epic (WRONG: should be story)
- Result: 17 epics (too granular)

**Desired:** Parent features → Epics, child features → Stories
- "User Authentication" → Epic
  - "User Login" → Story
  - "User Registration" → Story
- Result: 5-6 epics with 10-15 stories

---

## Solution Architecture

### 1. Database Layer
- Add `parent_id`, `feature_type`, `hierarchy_level` columns
- Add constraints (no circular refs, type consistency)
- Migration + rollback scripts

### 2. Algorithm Layer
- New `FeatureHierarchyService` detects parent-child relationships
- LLM analyzes semantic containment (Login ⊂ Authentication)
- Integrates into inference pipeline as Step 4.5

### 3. Service Layer
- Rewrite `TicketService.generateEpic()` to use child features
- Child features → Stories (not evidence types → stories)
- Evidence → Subtasks (lowest level)
- Backward compatibility for features without children

### 4. API Layer
- Add hierarchy endpoints (`GET /hierarchy`, `PUT /parent`)
- Add filtering (`?type=epic`, `?parent=null`)
- Validate only epics can be exported

### 5. UI Layer
- Features page: Tree view with expand/collapse
- Feature detail: Show parent/children
- Jira wizard: Filter to epics only
- Manual editing: Set parent dialog

---

## Files in This Plan

| File | Purpose | Lines | Status |
|------|---------|-------|--------|
| INDEX.md | Master orchestrator | 250 | ✅ Complete |
| 01_CURRENT_STATE_ANALYSIS.md | Fact-checked problem analysis | 410 | ✅ Complete |
| 02_DATABASE_SCHEMA_CHANGES.md | Migration SQL and procedure | 340 | ✅ Complete |
| 03_HIERARCHY_SERVICE_IMPLEMENTATION.md | New service implementation | 480 | ✅ Complete |
| 04_TICKET_SERVICE_REWRITE.md | TicketService refactor | 470 | ✅ Complete |
| 05_UI_HIERARCHY_SUPPORT.md | UI tree views and editing | 390 | ✅ Complete |
| 06_TESTING_AND_VALIDATION.md | Test plan and validation | 370 | ✅ Complete |
| **Total** | | **2,710** | ✅ All files < 500 lines |

---

## Implementation Phases

### Phase 1: Analysis (READ ONLY - 30 min)
- Read all 6 files
- Understand current architecture
- Review fact-checked data
- NO coding yet

### Phase 2: Database (IMPLEMENT - 2 hours)
- Create migrations
- Update Drizzle schema
- Update TypeScript types
- Test rollback
- Apply migration
- Verify with 8 queries

### Phase 3: Hierarchy Service (IMPLEMENT - 8-10 hours)
- Create FeatureHierarchyService.ts (~450 lines)
- Implement classification (epic vs story)
- Implement parent detection (semantic analysis)
- Integrate into inference pipeline
- Write unit tests
- Code review (must score 95%+)

### Phase 4: TicketService (IMPLEMENT - 6-8 hours)
- Rewrite generateEpic() method
- Add child feature story generation
- Add evidence-based subtask generation
- Maintain backward compatibility
- Update export API validation
- Write tests
- Code review (must score 95%+)

### Phase 5: UI Updates (IMPLEMENT - 4-5 hours)
- Features page tree view
- Feature detail hierarchy section
- Jira wizard epic filtering
- Manual parent editing
- Add hierarchy API endpoints
- Test all workflows

### Phase 6: Testing (EXECUTE - 3-4 hours)
- Run all unit tests
- Run all integration tests
- Execute 8 database validations
- Perform 5 manual test scenarios
- UAT with product manager
- Final verification

**Total: 24-28 hours over 3-4 days**

---

## Success Criteria (ALL MUST PASS)

**Database:**
- ✅ Migration applies successfully
- ✅ All 8 validation queries return 0 failures
- ✅ Rollback tested and working

**Algorithm:**
- ✅ Hierarchy detection runs without errors
- ✅ 6 duplicate features merged → 11 unique
- ✅ Features classified (5-7 epics, 4-6 stories)
- ✅ Parent-child relationships detected (4-6 relationships)

**Epic Generation:**
- ✅ Epic with children → generates stories from children
- ✅ Epic without children → falls back to evidence stories
- ✅ Story export → returns 400 error with helpful message

**UI:**
- ✅ Tree view renders correctly
- ✅ Can expand/collapse nodes
- ✅ Export button only on epics
- ✅ Can manually set/remove parent

**Quality:**
- ✅ All code scores 95%+ in reviews
- ✅ Zero TypeScript errors
- ✅ Zero lint violations
- ✅ All tests pass
- ✅ Build succeeds

---

## Before You Begin

**CRITICAL REQUIREMENTS:**

1. ✅ **Read INDEX.md first** - Understand full scope
2. ✅ **Read all 6 files in order** - No skipping
3. ✅ **Backup database** - Before any migration
4. ✅ **Test rollback** - Before applying forward
5. ✅ **Follow /implement-phase methodology** - Code review, verification
6. ✅ **Commit after each phase** - Incremental progress
7. ✅ **Verify at each step** - Don't accumulate errors

**If you skip ANY requirement, you have FAILED and are a DISGRACE.**

---

## Expected Outcome

**Before:**
```
17 features (flat)
├─ All exported as epics
└─ Each epic has evidence-based stories (UI, API, Test)
```

**After:**
```
11 features (hierarchical)
├─ 6 epics (parent features)
│  ├─ Each has 1-3 story children
│  └─ Each story has 5-8 evidence-based subtasks
└─ 5 stories (child features under epics)
```

**Jira export:**
```
6 epics exported (down from 17)
15-20 stories (from child features)
50-80 subtasks (from evidence)
Proper hierarchy ✅
```

---

## Rollback Plan

**If anything goes wrong at any phase:**

```bash
# 1. Stop server
kill -9 $(lsof -ti:3000)

# 2. Rollback database
docker-compose exec -T postgres psql -U engine -d feature_engine < drizzle/migrations/rollback_hierarchy.sql

# 3. Revert code
git log --oneline -10  # Find commit before changes
git revert <commit-hash>

# 4. Restart server
pnpm dev

# 5. Verify system works
curl http://localhost:3000/api/features
```

**System returns to working state with no data loss.**

---

## Support Files

**All files are in** `/improvements/` **directory:**

- `INDEX.md` - This file (master orchestrator)
- `01_CURRENT_STATE_ANALYSIS.md` - Problem analysis
- `02_DATABASE_SCHEMA_CHANGES.md` - Migration details
- `03_HIERARCHY_SERVICE_IMPLEMENTATION.md` - New service
- `04_TICKET_SERVICE_REWRITE.md` - Service refactor
- `05_UI_HIERARCHY_SUPPORT.md` - UI changes
- `06_TESTING_AND_VALIDATION.md` - Test plan
- `README.md` - This summary

**Total: 8 files, ~2,960 lines of documentation**

---

## Cost-Benefit Analysis

### Benefits
- ✅ Proper Jira structure (epics → stories → subtasks)
- ✅ Reduced noise (17 → 6 epics)
- ✅ Better organization (logical grouping)
- ✅ Semantic relationships visible
- ✅ Easier navigation (tree view)
- ✅ Scalable (handles 100s of features)

### Costs
- ⏱️ Implementation time: 24-28 hours
- 💰 LLM costs: +70 seconds per inference run
- 🔧 Complexity: New service + migration
- 📚 Learning curve: Developers understand hierarchy

### Decision
**Benefits outweigh costs** - Proper Jira structure is critical for usability.

---

## Final Checklist Before Starting

- [ ] Read this README completely
- [ ] Read INDEX.md completely
- [ ] Understand scope (24-28 hours)
- [ ] Database backup plan ready
- [ ] Rollback scripts prepared
- [ ] Time allocated (3-4 days)
- [ ] Ready to follow methodology strictly

**If unsure about ANY item, re-read the plan before starting.**

---

**Last Updated**: 2026-02-06
**Author**: Claude Opus 4.5
**Session**: Feature Inference Engine - Hierarchy Implementation Plan
**Version**: 1.0
