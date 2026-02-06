# Testing and Validation Plan
## Comprehensive Test Strategy for Feature Hierarchy

> **MANDATORY**: Execute ALL tests. If ANY test fails, you have FAILED. Fix and re-test until 100% pass.

---

## Test Categories

1. **Unit Tests** - Service methods in isolation
2. **Integration Tests** - Full pipeline with database
3. **Database Tests** - Data integrity and constraints
4. **API Tests** - HTTP endpoints
5. **Manual Tests** - UI and user workflows

---

## Unit Tests

### File: `tests/unit/FeatureHierarchyService.test.ts` (NEW)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FeatureHierarchyService } from '@/lib/services/FeatureHierarchyService';

describe('FeatureHierarchyService', () => {
  let service: FeatureHierarchyService;
  let mockLlmClient: any;

  beforeEach(() => {
    mockLlmClient = {
      chat: vi.fn(),
    };
    service = new FeatureHierarchyService(mockLlmClient);
  });

  describe('classifyFeature', () => {
    it('should classify broad domain as epic', async () => {
      mockLlmClient.chat.mockResolvedValue({
        content: JSON.stringify({
          feature_type: 'epic',
          reasoning: 'Broad authentication domain',
          indicators: ['multiple verbs', 'domain keyword'],
        }),
      });

      const result = await service.classifyFeature({
        id: 'test-1',
        name: 'User Authentication',
        description: 'Login, logout, registration',
        confidenceScore: '0.95',
      });

      expect(result.featureType).toBe('epic');
      expect(result.indicators).toContain('domain keyword');
    });

    it('should classify specific action as story', async () => {
      mockLlmClient.chat.mockResolvedValue({
        content: JSON.stringify({
          feature_type: 'story',
          reasoning: 'Specific login action',
          indicators: ['single verb', 'specific functionality'],
        }),
      });

      const result = await service.classifyFeature({
        id: 'test-2',
        name: 'User Login',
        description: 'User can log in',
        confidenceScore: '0.85',
      });

      expect(result.featureType).toBe('story');
    });

    it('should use heuristics if LLM fails', async () => {
      mockLlmClient.chat.mockResolvedValue({ content: null });

      const result = await service.classifyFeature({
        id: 'test-3',
        name: 'Content Management',
        description: '',
        confidenceScore: '0.9',
      });

      expect(result.featureType).toBe('epic'); // Contains "management"
      expect(result.reasoning).toContain('Heuristic');
    });
  });

  describe('analyzeHierarchyRelationship', () => {
    it('should detect child relationship', async () => {
      mockLlmClient.chat.mockResolvedValue({
        content: JSON.stringify({
          is_child_of: true,
          confidence: 0.85,
          reasoning: 'Login is a specific action within Authentication',
          recommended_type: 'story',
        }),
      });

      const result = await service.analyzeHierarchyRelationship(
        'User Login',
        'User Authentication'
      );

      expect(result.is_child_of).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should NOT detect reverse relationship', async () => {
      mockLlmClient.chat.mockResolvedValue({
        content: JSON.stringify({
          is_child_of: false,
          confidence: 0.1,
          reasoning: 'Authentication is broader than Login',
          recommended_type: 'epic',
        }),
      });

      const result = await service.analyzeHierarchyRelationship(
        'User Authentication',
        'User Login'
      );

      expect(result.is_child_of).toBe(false);
    });
  });

  describe('validateNoCircularReferences', () => {
    it('should detect circular reference', async () => {
      // Mock database to have A → B → A
      // This test requires database mocking or integration test
      // Skip in unit tests, cover in integration
    });
  });
});
```

---

## Integration Tests

### File: `tests/integration/hierarchyInference.test.ts` (NEW)

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '@/lib/db/client';
import { features, evidence, featureEvidence } from '@/lib/db/schema';
import { featureHierarchyService } from '@/lib/services/FeatureHierarchyService';

describe('Feature Hierarchy Integration', () => {
  beforeAll(async () => {
    // Seed test data
    await seedTestFeatures();
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestFeatures();
  });

  it('should detect hierarchy in authentication features', async () => {
    // Run hierarchy detection
    const result = await featureHierarchyService.buildHierarchyForAllFeatures();

    expect(result.epics).toBeGreaterThan(0);
    expect(result.stories).toBeGreaterThan(0);

    // Verify "User Login" is child of "User Authentication"
    const [login] = await db
      .select({ name: features.name, parentId: features.parentId })
      .from(features)
      .where(eq(features.name, 'User Login'));

    const [auth] = await db
      .select({ id: features.id, name: features.name })
      .from(features)
      .where(eq(features.name, 'User Authentication'));

    expect(login.parentId).toBe(auth.id);
  });

  it('should generate hierarchical epic correctly', async () => {
    // Get auth epic ID
    const [authFeature] = await db
      .select({ id: features.id })
      .from(features)
      .where(eq(features.name, 'User Authentication'));

    // Generate epic
    const epic = await ticketService.generateEpic(authFeature.id);

    expect(epic.title).toBe('User Authentication');
    expect(epic.stories).toHaveLength(1); // Login story
    expect(epic.stories[0].title).toBe('User Login'); // Direct child name
    expect(epic.stories[0].subtasks).toBeDefined();
  });
});

async function seedTestFeatures() {
  // Insert User Authentication epic with endpoints
  const [authFeature] = await db.insert(features).values({
    name: 'User Authentication',
    description: 'Authentication system',
    confidenceScore: '0.98',
    status: 'confirmed',
    featureType: 'epic',
  }).returning();

  // Insert User Login story
  const [loginFeature] = await db.insert(features).values({
    name: 'User Login',
    description: 'User login functionality',
    confidenceScore: '0.90',
    status: 'candidate',
    featureType: 'epic', // Will be reclassified
  }).returning();

  // Insert evidence
  // ... add test evidence
}
```

---

## Database Validation Tests

### File: `improvements/verify.sql`

```sql
-- Test Suite: Database Integrity After Hierarchy Implementation

-- Test 1: All features have valid type
SELECT
  'Test 1: Valid feature types' as test_name,
  COUNT(*) as failure_count
FROM features
WHERE feature_type NOT IN ('epic', 'story', 'task');
-- Expected: 0

-- Test 2: Type and level consistency
SELECT
  'Test 2: Type-level consistency' as test_name,
  COUNT(*) as failure_count
FROM features
WHERE (feature_type = 'epic' AND hierarchy_level != 0)
   OR (feature_type = 'story' AND hierarchy_level != 1)
   OR (feature_type = 'task' AND hierarchy_level != 2);
-- Expected: 0

-- Test 3: Epics have no parent
SELECT
  'Test 3: Epics are root level' as test_name,
  COUNT(*) as failure_count
FROM features
WHERE feature_type = 'epic' AND parent_id IS NOT NULL;
-- Expected: 0

-- Test 4: Stories have parent
SELECT
  'Test 4: Stories have parent' as test_name,
  name,
  feature_type,
  parent_id
FROM features
WHERE feature_type = 'story' AND parent_id IS NULL;
-- Expected: 0 rows (or acceptable orphans promoted to epic)

-- Test 5: No circular references
WITH RECURSIVE circular_check AS (
  SELECT id, parent_id, ARRAY[id] as path
  FROM features
  WHERE parent_id IS NOT NULL

  UNION ALL

  SELECT f.id, f.parent_id, c.path || f.parent_id
  FROM features f
  JOIN circular_check c ON f.parent_id = c.id
  WHERE f.parent_id = ANY(c.path)
)
SELECT
  'Test 5: No circular refs' as test_name,
  COUNT(*) as failure_count
FROM circular_check;
-- Expected: 0

-- Test 6: Parents exist for all children
SELECT
  'Test 6: Valid parent IDs' as test_name,
  COUNT(*) as failure_count
FROM features f
WHERE f.parent_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM features p WHERE p.id = f.parent_id);
-- Expected: 0

-- Test 7: Duplicate feature names (should be reduced)
SELECT
  'Test 7: Duplicate features' as test_name,
  name,
  COUNT(*) as duplicate_count
FROM features
GROUP BY name
HAVING COUNT(*) > 1;
-- Expected: 0 rows after merge + hierarchy

-- Test 8: Hierarchy depth (max 2 levels)
WITH RECURSIVE depth_check AS (
  SELECT id, parent_id, 0 as depth
  FROM features
  WHERE parent_id IS NULL

  UNION ALL

  SELECT f.id, f.parent_id, d.depth + 1
  FROM features f
  JOIN depth_check d ON f.parent_id = d.id
)
SELECT
  'Test 8: Max depth is 2' as test_name,
  MAX(depth) as max_depth,
  COUNT(*) FILTER (WHERE depth > 2) as failure_count
FROM depth_check;
-- Expected: max_depth <= 2, failure_count = 0

-- Summary report
SELECT
  COUNT(*) FILTER (WHERE feature_type = 'epic') as epics,
  COUNT(*) FILTER (WHERE feature_type = 'story') as stories,
  COUNT(*) FILTER (WHERE feature_type = 'task') as tasks,
  COUNT(*) FILTER (WHERE parent_id IS NOT NULL) as has_parent,
  COUNT(*) FILTER (WHERE parent_id IS NULL) as root_level
FROM features;
```

---

## API Tests

### File: `tests/integration/api.hierarchy.test.ts` (NEW)

```typescript
describe('Feature Hierarchy API', () => {
  it('GET /api/features?type=epic returns only epics', async () => {
    const response = await fetch('http://localhost:3000/api/features?type=epic');
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.every(f => f.featureType === 'epic')).toBe(true);
  });

  it('GET /api/features?parent=null returns root features', async () => {
    const response = await fetch('http://localhost:3000/api/features?parent=null');
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.every(f => f.parentId === null)).toBe(true);
  });

  it('GET /api/features/:id/hierarchy returns tree', async () => {
    const response = await fetch('http://localhost:3000/api/features/auth_id/hierarchy');
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('feature');
    expect(data).toHaveProperty('children');
    expect(data).toHaveProperty('ancestors');
  });

  it('PUT /api/features/:id/parent sets parent', async () => {
    const response = await fetch('http://localhost:3000/api/features/story_id/parent', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parentId: 'epic_id' }),
    });

    expect(response.status).toBe(200);

    // Verify in database
    const [feature] = await db.select().from(features).where(eq(features.id, 'story_id'));
    expect(feature.parentId).toBe('epic_id');
  });

  it('POST /api/features/:id/export rejects story-type', async () => {
    const response = await fetch('http://localhost:3000/api/features/story_id/export?format=json');

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Only epic-type features');
  });
});
```

---

## Manual Test Scenarios

### Scenario 1: Full Inference Pipeline with Hierarchy

**Steps:**
1. Upload BBIEng API PDF
2. Wait for extraction to complete
3. Go to `/features` page → See features in flat list
4. Click "Run Inference" button
5. Wait for inference to complete (~3 minutes)
6. Refresh `/features` page

**Expected Results:**
- ✅ Features page shows tree view
- ✅ "User Authentication" is an epic (folder icon)
- ✅ "User Login" is nested under "User Authentication" (indented)
- ✅ Can expand/collapse "User Authentication" to see children
- ✅ "Export" button only visible on "User Authentication" (not on "User Login")

### Scenario 2: Epic Export with Hierarchy

**Steps:**
1. Go to `/features` page
2. Click "Export" on "User Authentication" epic
3. Go to export page
4. Select iOS platform
5. Click "Download MD"

**Expected Results:**
- ✅ Markdown file contains epic "User Authentication"
- ✅ Story "User Login" listed (NOT "User Auth - UI Implementation")
- ✅ Story has subtasks from evidence
- ✅ Subtasks are iOS-specific (UIKit, Swift)

### Scenario 3: Jira Wizard Generation

**Steps:**
1. Go to `/jira` page
2. Select iOS platform
3. Click "Next"
4. See tree of epics

**Expected Results:**
- ✅ Only 6 root epics shown (not 17 features)
- ✅ Each epic expandable to show story children
- ✅ Stories have subtasks when expanded
- ✅ Can uncheck specific stories or subtasks
- ✅ Generate button works
- ✅ Folder structure: ios/user-authentication/user-login/subtasks

### Scenario 4: Manual Parent Assignment

**Steps:**
1. Go to feature detail for "Footer Navigation"
2. Click "Set Parent" button
3. Select "Content Discovery" as parent
4. Save

**Expected Results:**
- ✅ "Footer Navigation" now shows parent: "Content Discovery"
- ✅ Feature type changes from 'epic' to 'story'
- ✅ Hierarchy level changes from 0 to 1
- ✅ Features page shows "Footer Navigation" nested under "Content Discovery"
- ✅ "Export" button removed from "Footer Navigation"

### Scenario 5: Remove Parent (Promote to Epic)

**Steps:**
1. Go to feature detail for "User Login" (child of Authentication)
2. Click "Remove Parent" button
3. Confirm

**Expected Results:**
- ✅ "User Login" parent_id set to NULL
- ✅ Feature type changes to 'epic'
- ✅ Hierarchy level changes to 0
- ✅ Features page shows "User Login" at root level
- ✅ "Export" button now visible on "User Login"

---

## Data Validation Queries

**Run after hierarchy detection:**

### Query 1: Count by type
```sql
SELECT
  feature_type,
  COUNT(*) as count,
  ARRAY_AGG(name ORDER BY confidence_score DESC) as feature_names
FROM features
GROUP BY feature_type
ORDER BY
  CASE feature_type
    WHEN 'epic' THEN 1
    WHEN 'story' THEN 2
    WHEN 'task' THEN 3
  END;
```

**Expected:**
```
epic   | 5-7  | {User Authentication, Content Discovery, ...}
story  | 8-10 | {User Login, Modal Window Closure, ...}
task   | 0    | {}
```

### Query 2: Hierarchy structure
```sql
SELECT
  parent.name as epic,
  child.name as story,
  child.confidence_score as story_confidence
FROM features parent
JOIN features child ON child.parent_id = parent.id
WHERE parent.feature_type = 'epic'
ORDER BY parent.name, story_confidence DESC;
```

**Expected:**
```
User Authentication | User Login          | 0.90
User Authentication | User Registration   | 0.85
Content Discovery   | Search              | 0.90
Content Discovery   | Content Navigation  | 0.95
...
```

### Query 3: Orphans (stories with no parent - should be 0)
```sql
SELECT name, feature_type, parent_id, confidence_score
FROM features
WHERE feature_type = 'story' AND parent_id IS NULL;
```

**Expected:** 0 rows (all stories have parents)

### Query 4: Feature count reduction
```sql
-- Before hierarchy
SELECT COUNT(*) as before_count FROM features;
-- Should be: 17

-- After merge (before hierarchy)
-- Should be: 11 (6 duplicates merged)

-- After hierarchy (same count, just relationships added)
-- Should be: 11 (no features deleted, just parent_id assigned)
```

---

## Performance Tests

### Test: Inference Pipeline Time

**Baseline (before hierarchy):**
```
Step 1: Embeddings: ~5 sec
Step 2: Clustering: ~1 sec
Step 3: Feature generation: ~30 sec
Step 4: Merge: ~60 sec
Step 5: Confidence: ~1 sec
Step 6: Relationships: ~50 sec
Total: ~2.5 minutes
```

**With hierarchy:**
```
Step 1: Embeddings: ~5 sec
Step 2: Clustering: ~1 sec
Step 3: Feature generation: ~30 sec
Step 4: Merge (optimized): ~20 sec
Step 4.5: Hierarchy detection: ~70 sec (NEW)
Step 5: Confidence: ~1 sec
Step 6: Relationships: ~50 sec
Total: ~3 minutes
```

**Acceptable:** +30 seconds (20% increase)

### Test: Export Generation Time

**Before:**
```
Export 1 feature: ~2 seconds
```

**After (hierarchical):**
```
Export 1 epic with 3 child stories: ~5 seconds
(3× subtask generation for stories)
```

**Acceptable:** Scales with children count

---

## Regression Tests

**Ensure existing functionality still works:**

### Test: Export feature without hierarchy (backward compat)
```typescript
// Feature with no children
const epic = await ticketService.generateEpic('standalone_id');

expect(epic.stories).toHaveLength(2); // UI + API stories (legacy mode)
expect(epic.stories[0].title).toMatch(/- UI Implementation$/);
```

### Test: Existing inference pipeline
```typescript
// Full inference run
const response = await fetch('http://localhost:3000/api/inference/run', {
  method: 'POST',
});

expect(response.status).toBe(200);
const data = await response.json();
expect(data).toHaveProperty('hierarchyDetected'); // NEW field
expect(data.hierarchyDetected.epics).toBeGreaterThan(0);
```

---

## User Acceptance Testing (UAT)

### UAT 1: Product Manager Reviews Epics
**Goal:** Verify epics make semantic sense

**Test:**
1. PM reviews features page tree
2. PM confirms epics are logical groupings
3. PM confirms stories are appropriate children
4. PM tests exporting each epic

**Acceptance:**
- [ ] All epics are broad domains (not specific actions)
- [ ] All stories are specific features under correct parent
- [ ] No obvious misclassifications
- [ ] Export format matches Jira expectations

### UAT 2: Developer Uses Jira Export
**Goal:** Verify Jira import works

**Test:**
1. Developer generates iOS epic
2. Developer downloads ZIP file
3. Developer imports to Jira
4. Developer verifies hierarchy in Jira

**Acceptance:**
- [ ] Epic imports as Jira Epic issue type
- [ ] Stories import as Jira Story issue type
- [ ] Stories linked to epic
- [ ] Subtasks linked to stories
- [ ] No orphaned issues

---

## Test Data Setup

**Create test fixtures:**

**File**: `tests/fixtures/hierarchy/test-features.sql`

```sql
-- Test data for hierarchy detection

INSERT INTO features (name, description, confidence_score, status, feature_type) VALUES
-- Epics
('User Authentication', 'Complete authentication system', '0.98', 'confirmed', 'epic'),
('Content Management', 'Content discovery and organization', '0.92', 'candidate', 'epic'),
('Payment Processing', 'Subscription and payment handling', '0.88', 'candidate', 'epic'),

-- Stories (will be detected as children)
('User Login', 'User login functionality', '0.90', 'candidate', 'epic'),
('User Registration', 'New user registration', '0.85', 'candidate', 'epic'),
('Content Search', 'Search for content', '0.78', 'candidate', 'epic'),
('Content Filtering', 'Filter content by category', '0.75', 'candidate', 'epic'),
('Payment Checkout', 'Complete payment flow', '0.80', 'candidate', 'epic');

-- Evidence for each feature
-- (insert evidence items linked to features)
```

---

## Test Execution Order

### Phase 1: Unit Tests (30 minutes)
```bash
pnpm test tests/unit/FeatureHierarchyService.test.ts
pnpm test tests/unit/TicketService.test.ts
```

### Phase 2: Database Tests (15 minutes)
```bash
docker-compose exec -T postgres psql -U engine -d feature_engine < improvements/verify.sql
```

### Phase 3: Integration Tests (45 minutes)
```bash
pnpm test tests/integration/hierarchyInference.test.ts
pnpm test tests/integration/api.hierarchy.test.ts
```

### Phase 4: Manual Tests (60 minutes)
- Execute all 5 manual scenarios
- Document results
- Take screenshots

### Phase 5: UAT (60 minutes)
- Product manager reviews
- Developer tests Jira import
- Sign-off on implementation

**Total test time: ~3.5 hours**

---

## Rollback Testing (CRITICAL)

**Test rollback BEFORE applying to production:**

```bash
# 1. Apply migration
docker-compose exec -T postgres psql -U engine -d feature_engine < drizzle/migrations/add_hierarchy.sql

# 2. Run hierarchy detection
curl -X POST http://localhost:3000/api/inference/run

# 3. Verify hierarchy created
docker-compose exec postgres psql -U engine -d feature_engine -c "SELECT COUNT(*) FROM features WHERE parent_id IS NOT NULL;"

# 4. Test export
curl http://localhost:3000/api/features/auth_id/export?format=json > test_export.json

# 5. ROLLBACK
docker-compose exec -T postgres psql -U engine -d feature_engine < drizzle/migrations/rollback_hierarchy.sql

# 6. Verify rollback
docker-compose exec postgres psql -U engine -d feature_engine -c "\d features" | grep parent_id
# Should return empty

# 7. Verify app still works
curl http://localhost:3000/api/features
# Should return features without hierarchy fields

# 8. Re-apply migration
docker-compose exec -T postgres psql -U engine -d feature_engine < drizzle/migrations/add_hierarchy.sql
```

**If rollback fails, DO NOT PROCEED to production.**

---

## Test Coverage Requirements

**Minimum coverage:**
- Unit tests: 80% coverage for FeatureHierarchyService
- Integration tests: 100% of new API endpoints
- Database tests: All 8 validation queries
- Manual tests: All 5 scenarios
- Regression tests: All existing features

**Measurement:**
```bash
pnpm test -- --coverage
```

**If coverage < 80%, you have FAILED.**

---

## MANDATORY TEST EXECUTION CHECKLIST

**Before committing Phase 3 (Hierarchy Service):**
- [ ] All unit tests pass
- [ ] FeatureHierarchyService has 80%+ coverage
- [ ] Integration test with test data passes

**Before committing Phase 4 (TicketService):**
- [ ] All unit tests pass (existing + new)
- [ ] Backward compatibility test passes
- [ ] Hierarchical export test passes
- [ ] API rejection test passes (story export)

**Before committing Phase 5 (UI):**
- [ ] Tree view renders correctly
- [ ] Expand/collapse works
- [ ] Manual parent setting works
- [ ] All API endpoints functional

**Before final deployment:**
- [ ] All 8 database validation queries pass
- [ ] All 5 manual scenarios pass
- [ ] UAT sign-off received
- [ ] Rollback tested successfully

**If ANY test fails, you have FAILED. Fix before proceeding.**

---

## File Size: ~370 lines ✅
**All files created. Return to INDEX.md for execution plan.**
