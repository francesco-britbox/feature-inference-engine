# Database Schema Changes - Feature Hierarchy
## Migration Plan for parent_id and feature_type

> **MANDATORY**: Execute these migrations EXACTLY as written. NO DEVIATIONS. Test rollback before applying forward migration.

---

## Overview

**Adds:**
- `parent_id` column (self-referencing foreign key)
- `feature_type` column (enum: epic, story, task)
- `hierarchy_level` column (computed depth)

**Preserves:**
- All existing data
- All existing columns
- All existing relationships

**Migration safety:** Transaction-based, rollback-tested

---

## Step 1: Create Migration File

**File**: `drizzle/migrations/YYYY_MM_DD_add_feature_hierarchy.sql`

```sql
-- Migration: Add feature hierarchy support
-- Author: Claude Opus 4.5
-- Date: 2026-02-06
-- Ticket: EPIC-STORY-HIERARCHY

BEGIN;

-- Add feature_type column (default to 'epic' for backward compatibility)
ALTER TABLE features
ADD COLUMN feature_type TEXT DEFAULT 'epic' NOT NULL
CHECK (feature_type IN ('epic', 'story', 'task'));

-- Add parent_id column (NULL for root features/epics)
ALTER TABLE features
ADD COLUMN parent_id UUID
REFERENCES features(id) ON DELETE CASCADE;

-- Add hierarchy_level column (0 for epics, 1 for stories, 2 for tasks)
ALTER TABLE features
ADD COLUMN hierarchy_level INTEGER DEFAULT 0 NOT NULL
CHECK (hierarchy_level >= 0 AND hierarchy_level <= 2);

-- Add index for parent lookups (performance)
CREATE INDEX idx_features_parent_id ON features(parent_id)
WHERE parent_id IS NOT NULL;

-- Add index for hierarchy queries
CREATE INDEX idx_features_hierarchy ON features(feature_type, hierarchy_level);

-- Add constraint: prevent circular references (basic check)
-- Note: Full circular reference check requires recursive query
ALTER TABLE features
ADD CONSTRAINT check_not_self_parent
CHECK (parent_id != id);

-- Add constraint: feature_type must match hierarchy_level
-- epic = level 0, story = level 1, task = level 2
ALTER TABLE features
ADD CONSTRAINT check_type_level_consistency
CHECK (
  (feature_type = 'epic' AND hierarchy_level = 0) OR
  (feature_type = 'story' AND hierarchy_level = 1) OR
  (feature_type = 'task' AND hierarchy_level = 2)
);

-- Add constraint: only epics can have NULL parent_id
ALTER TABLE features
ADD CONSTRAINT check_epic_no_parent
CHECK (
  (feature_type = 'epic' AND parent_id IS NULL) OR
  (feature_type != 'epic' AND parent_id IS NOT NULL)
);

COMMIT;
```

**Verification after migration:**
```sql
-- Check columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'features'
AND column_name IN ('parent_id', 'feature_type', 'hierarchy_level');

-- Should return 3 rows
```

---

## Step 2: Update Drizzle Schema

**File**: `lib/db/schema.ts`

**Find** (around line 110-152):
```typescript
export const features = pgTable(
  'features',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    description: text('description'),
    confidenceScore: numeric('confidence_score', { precision: 3, scale: 2 }),
    status: text('status').default('candidate').notNull(),
    inferredAt: timestamp('inferred_at', { withTimezone: true }).defaultNow().notNull(),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewedBy: text('reviewed_by'),
    metadata: jsonb('metadata'),
    enrichmentStatus: text('enrichment_status').default('pending').notNull(),
  },
```

**Add** (after `enrichmentStatus`):
```typescript
    // Feature hierarchy fields
    featureType: text('feature_type').default('epic').notNull(),
    parentId: uuid('parent_id').references(() => features.id, { onDelete: 'cascade' }),
    hierarchyLevel: integer('hierarchy_level').default(0).notNull(),
```

**Update constraints section** (after line 144):
```typescript
    checkFeatureType: check(
      'check_feature_type',
      sql`${table.featureType} IN ('epic', 'story', 'task')`
    ),
    checkHierarchyLevel: check(
      'check_hierarchy_level',
      sql`${table.hierarchyLevel} >= 0 AND ${table.hierarchyLevel} <= 2`
    ),
    checkNotSelfParent: check(
      'check_not_self_parent',
      sql`${table.parentId} != ${table.id} OR ${table.parentId} IS NULL`
    ),
    checkTypeLevelConsistency: check(
      'check_type_level_consistency',
      sql`(${table.featureType} = 'epic' AND ${table.hierarchyLevel} = 0) OR
          (${table.featureType} = 'story' AND ${table.hierarchyLevel} = 1) OR
          (${table.featureType} = 'task' AND ${table.hierarchyLevel} = 2)`
    ),
    checkEpicNoParent: check(
      'check_epic_no_parent',
      sql`(${table.featureType} = 'epic' AND ${table.parentId} IS NULL) OR
          (${table.featureType} != 'epic' AND ${table.parentId} IS NOT NULL)`
    ),
```

---

## Step 3: Rollback Migration (Test FIRST)

**File**: `drizzle/migrations/YYYY_MM_DD_rollback_feature_hierarchy.sql`

```sql
-- Rollback: Remove feature hierarchy support
-- DANGER: This will delete parent-child relationships
-- Run this ONLY if forward migration fails

BEGIN;

-- Drop indexes
DROP INDEX IF EXISTS idx_features_parent_id;
DROP INDEX IF EXISTS idx_features_hierarchy;

-- Drop constraints
ALTER TABLE features
DROP CONSTRAINT IF EXISTS check_epic_no_parent;

ALTER TABLE features
DROP CONSTRAINT IF EXISTS check_type_level_consistency;

ALTER TABLE features
DROP CONSTRAINT IF EXISTS check_not_self_parent;

-- Drop columns (data loss: parent relationships)
ALTER TABLE features
DROP COLUMN IF EXISTS hierarchy_level;

ALTER TABLE features
DROP COLUMN IF EXISTS parent_id;

ALTER TABLE features
DROP COLUMN IF EXISTS feature_type;

COMMIT;

-- Verify rollback
SELECT column_name FROM information_schema.columns
WHERE table_name = 'features'
AND column_name IN ('parent_id', 'feature_type', 'hierarchy_level');

-- Should return 0 rows
```

---

## Step 4: Execute Migration (MANDATORY STEPS)

### Pre-Migration Backup (CRITICAL)

```bash
# Backup database
docker-compose exec postgres pg_dump -U engine feature_engine > backup_before_hierarchy_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
ls -lh backup_before_hierarchy_*.sql
# Should show file with size > 0
```

**If backup fails, STOP. Do not proceed.**

### Test Rollback (MANDATORY)

```bash
# 1. Apply forward migration
docker-compose exec -T postgres psql -U engine -d feature_engine < drizzle/migrations/YYYY_MM_DD_add_feature_hierarchy.sql

# 2. Verify columns exist
docker-compose exec postgres psql -U engine -d feature_engine -c "\d features" | grep "parent_id\|feature_type\|hierarchy_level"

# 3. Test rollback
docker-compose exec -T postgres psql -U engine -d feature_engine < drizzle/migrations/YYYY_MM_DD_rollback_feature_hierarchy.sql

# 4. Verify columns removed
docker-compose exec postgres psql -U engine -d feature_engine -c "\d features" | grep "parent_id\|feature_type\|hierarchy_level"
# Should return empty

# 5. Re-apply forward migration for real
docker-compose exec -T postgres psql -U engine -d feature_engine < drizzle/migrations/YYYY_MM_DD_add_feature_hierarchy.sql
```

**If rollback fails, STOP. Fix rollback script before proceeding.**

---

## Step 5: Data Integrity Validation

**After migration, run these checks:**

### Check 1: All features have valid type
```sql
SELECT COUNT(*) as invalid_type
FROM features
WHERE feature_type NOT IN ('epic', 'story', 'task');

-- Must return: 0
```

### Check 2: Type and level consistency
```sql
SELECT COUNT(*) as inconsistent
FROM features
WHERE (feature_type = 'epic' AND hierarchy_level != 0)
   OR (feature_type = 'story' AND hierarchy_level != 1)
   OR (feature_type = 'task' AND hierarchy_level != 2);

-- Must return: 0
```

### Check 3: Epics have no parent
```sql
SELECT name, feature_type, parent_id
FROM features
WHERE feature_type = 'epic' AND parent_id IS NOT NULL;

-- Must return: 0 rows
```

### Check 4: Stories/tasks have parent
```sql
SELECT name, feature_type, parent_id
FROM features
WHERE feature_type IN ('story', 'task') AND parent_id IS NULL;

-- Must return: 0 rows (after hierarchy detection runs)
```

### Check 5: No circular references (basic)
```sql
SELECT name, id, parent_id
FROM features
WHERE id = parent_id;

-- Must return: 0 rows
```

### Check 6: Parent exists for all children
```sql
SELECT f.name as child_name, f.parent_id
FROM features f
WHERE f.parent_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM features p WHERE p.id = f.parent_id
);

-- Must return: 0 rows
```

---

## Step 6: Update TypeScript Types

**File**: `lib/types/feature.ts`

**Add:**
```typescript
export type FeatureType = 'epic' | 'story' | 'task';

export interface Feature {
  id: string;
  name: string;
  description?: string | null;
  confidenceScore?: number | string;
  status: FeatureStatus | string;
  inferredAt?: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  metadata?: Record<string, unknown>;

  // NEW: Hierarchy fields
  featureType: FeatureType;
  parentId?: string | null;
  hierarchyLevel: number;
}

export interface FeatureHierarchy {
  feature: Feature;
  parent?: Feature | null;
  children: Feature[];
  depth: number;
}
```

---

## Step 7: Verification Commands (Run After Migration)

```bash
# 1. Verify Drizzle schema compiles
pnpm typecheck

# 2. Generate new migration (should detect changes)
pnpm drizzle-kit generate

# 3. Check migration SQL
cat drizzle/migrations/YYYY_MM_DD_add_feature_hierarchy.sql

# 4. Apply migration
pnpm drizzle-kit push
# OR
docker-compose exec -T postgres psql -U engine -d feature_engine < drizzle/migrations/YYYY_MM_DD_add_feature_hierarchy.sql

# 5. Verify in database
docker-compose exec postgres psql -U engine -d feature_engine -c "\d features"

# 6. Run all validation queries from Step 5

# 7. Test rollback
docker-compose exec -T postgres psql -U engine -d feature_engine < drizzle/migrations/YYYY_MM_DD_rollback_feature_hierarchy.sql

# 8. Verify rollback worked
docker-compose exec postgres psql -U engine -d feature_engine -c "\d features" | grep hierarchy

# 9. Re-apply forward migration
docker-compose exec -T postgres psql -U engine -d feature_engine < drizzle/migrations/YYYY_MM_DD_add_feature_hierarchy.sql
```

---

## Expected State After Migration

### Features Table Structure
```sql
features (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  description text,
  confidence_score numeric(3,2),
  status text,
  inferred_at timestamp,
  reviewed_at timestamp,
  reviewed_by text,
  metadata jsonb,
  enrichment_status text,

  -- NEW COLUMNS
  feature_type text DEFAULT 'epic' NOT NULL,
  parent_id uuid REFERENCES features(id) ON DELETE CASCADE,
  hierarchy_level integer DEFAULT 0 NOT NULL,

  -- CONSTRAINTS (5 new)
  CHECK (feature_type IN ('epic', 'story', 'task')),
  CHECK (hierarchy_level >= 0 AND hierarchy_level <= 2),
  CHECK (parent_id != id OR parent_id IS NULL),
  CHECK (type matches level),
  CHECK (epics have no parent)
)
```

### Data State
```sql
-- All 17 existing features
feature_type = 'epic'  (backward compatible default)
parent_id = NULL       (no hierarchy yet)
hierarchy_level = 0    (all at root level)
```

---

## Migration Safety Checklist

**Before migration:**
- [ ] Database backed up successfully
- [ ] Backup file size > 0
- [ ] Rollback script created
- [ ] Rollback script tested
- [ ] All constraints validated

**During migration:**
- [ ] Migration in transaction (BEGIN...COMMIT)
- [ ] Each ALTER TABLE succeeds
- [ ] Constraints added successfully
- [ ] Indexes created

**After migration:**
- [ ] All 6 validation queries pass (0 invalid rows)
- [ ] Application starts without errors
- [ ] Can query features table
- [ ] pnpm typecheck passes
- [ ] pnpm build passes

**If ANY check fails:**
- [ ] STOP immediately
- [ ] Run rollback migration
- [ ] Verify rollback succeeded
- [ ] Restore from backup if needed
- [ ] Fix issue before retrying

---

## Performance Impact

**New indexes:**
- `idx_features_parent_id`: Speeds up child lookups (`WHERE parent_id = ?`)
- `idx_features_hierarchy`: Speeds up type filtering (`WHERE feature_type = 'epic'`)

**Query performance (estimated):**
- Get children: < 1ms (indexed)
- Get ancestors: O(depth) - max 3 levels, negligible
- Get tree: O(n) where n = total descendants

**Storage impact:**
- 3 new columns × 17 features × ~50 bytes = ~2.5 KB
- 2 indexes × 17 features × ~100 bytes = ~3.5 KB
- **Total: ~6 KB** (negligible)

---

## Edge Cases Handled

### Case 1: Feature has itself as parent
```sql
CHECK (parent_id != id OR parent_id IS NULL)
```
**Prevented by constraint** ✅

### Case 2: Story has no parent
```sql
CHECK (
  (feature_type = 'epic' AND parent_id IS NULL) OR
  (feature_type != 'epic' AND parent_id IS NOT NULL)
)
```
**Prevented by constraint** ✅

### Case 3: Epic has a parent
```sql
CHECK (feature_type = 'epic' AND parent_id IS NULL)
```
**Prevented by constraint** ✅

### Case 4: Circular reference (A → B → A)
**NOT handled by constraint** - requires application logic
**Will be handled in FeatureHierarchyService** (Phase 3)

### Case 5: Feature type doesn't match level
```sql
CHECK (type matches level)
```
**Prevented by constraint** ✅

---

## Data Migration Strategy

### Option A: Keep All as Epics (Safe, Backward Compatible)
```sql
-- All existing features remain as epics
-- Hierarchy detection happens later
-- No data loss, fully reversible
UPDATE features SET feature_type = 'epic', hierarchy_level = 0;
```
**Recommended for initial migration** ✅

### Option B: Immediate Classification (Risky)
```sql
-- Attempt to classify based on confidence
UPDATE features SET feature_type = 'story' WHERE confidence_score < 0.75;
UPDATE features SET feature_type = 'epic' WHERE confidence_score >= 0.75;
```
**NOT recommended** - confidence doesn't indicate epic vs story ❌

### Option C: Manual Classification (Time-Consuming)
```sql
-- Human reviews each feature
UPDATE features SET feature_type = 'story', parent_id = 'auth_id' WHERE name = 'User Login';
```
**NOT scalable** ❌

**Decision: Use Option A**, then run FeatureHierarchyService to detect relationships.

---

## TypeScript Type Updates (MANDATORY)

**File**: `lib/types/feature.ts`

**Current** (lines 9-19):
```typescript
export interface Feature {
  id: string;
  name: string;
  description?: string | null;
  confidenceScore?: number | string;
  status: FeatureStatus | string;
  inferredAt?: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  metadata?: Record<string, unknown>;
}
```

**NEW** (add these fields):
```typescript
export type FeatureType = 'epic' | 'story' | 'task';

export interface Feature {
  id: string;
  name: string;
  description?: string | null;
  confidenceScore?: number | string;
  status: FeatureStatus | string;
  inferredAt?: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  metadata?: Record<string, unknown>;

  // Hierarchy fields (NEW)
  featureType: FeatureType;
  parentId?: string | null;
  hierarchyLevel: number;
}

export interface FeatureWithHierarchy extends Feature {
  parent?: Feature | null;
  children: Feature[];
  ancestors: Feature[]; // Full ancestry path [grandparent, parent]
  descendants: Feature[]; // All nested children/grandchildren
}
```

---

## API Response Updates

**All API endpoints returning features MUST include new fields:**

**File**: `app/api/features/route.ts`

**Current query:**
```typescript
const features = await db.select().from(features);
```

**After migration** (no change needed - columns auto-included):
```typescript
const features = await db.select().from(features);
// Now includes featureType, parentId, hierarchyLevel automatically
```

**BUT: Frontend expects these fields in Feature type, so update type definitions** ✅

---

## Migration Execution Checklist

### Pre-Execution (MANDATORY)
- [ ] Read this entire file
- [ ] Database backup created and verified
- [ ] Rollback script created
- [ ] Rollback script tested successfully
- [ ] All validation queries prepared

### Execution (MANDATORY ORDER)
1. [ ] Stop application server (`pnpm dev` or production)
2. [ ] Create backup: `pg_dump > backup.sql`
3. [ ] Apply forward migration
4. [ ] Run 6 validation queries (all must return 0 invalid rows)
5. [ ] Update Drizzle schema file
6. [ ] Run `pnpm typecheck` (must pass)
7. [ ] Update TypeScript types
8. [ ] Run `pnpm typecheck` again (must pass)
9. [ ] Run `pnpm build` (must succeed)
10. [ ] Start application server
11. [ ] Test `/api/features` endpoint (should return features with new fields)
12. [ ] Commit changes: migration + schema + types

### Post-Execution Validation (MANDATORY)
- [ ] All validation queries pass
- [ ] Application starts without errors
- [ ] Features page loads
- [ ] No console errors in browser
- [ ] Can query features by feature_type
- [ ] Can query features by parent_id

---

## Rollback Procedure (If Needed)

**Trigger rollback if:**
- ANY validation query returns > 0 invalid rows
- Application fails to start after migration
- pnpm typecheck fails
- pnpm build fails
- Data corruption detected

**Steps:**
```bash
# 1. Stop application
kill -9 $(lsof -ti:3000)

# 2. Run rollback migration
docker-compose exec -T postgres psql -U engine -d feature_engine < drizzle/migrations/YYYY_MM_DD_rollback_feature_hierarchy.sql

# 3. Verify rollback
docker-compose exec postgres psql -U engine -d feature_engine -c "\d features" | grep hierarchy
# Should return empty

# 4. Revert code changes
git revert HEAD

# 5. Restart application
pnpm dev

# 6. Verify application works
curl http://localhost:3000/api/features
```

---

## Common Migration Errors & Fixes

### Error 1: "column already exists"
```
ERROR:  column "parent_id" of relation "features" already exists
```
**Fix:** Migration already applied, check current schema state
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'features' AND column_name = 'parent_id';
```

### Error 2: "constraint violated"
```
ERROR:  check constraint "check_epic_no_parent" is violated
```
**Fix:** Existing data violates constraint, update data first
```sql
UPDATE features SET parent_id = NULL WHERE feature_type = 'epic';
```

### Error 3: "foreign key constraint"
```
ERROR:  foreign key constraint "features_parent_id_fkey" is violated
```
**Fix:** parent_id points to non-existent feature
```sql
SELECT id, parent_id FROM features
WHERE parent_id IS NOT NULL
AND parent_id NOT IN (SELECT id FROM features);

-- Set invalid parent_ids to NULL
UPDATE features SET parent_id = NULL
WHERE parent_id NOT IN (SELECT id FROM features);
```

---

## Testing Migration Locally

**Before applying to production:**

```bash
# 1. Create test database
docker-compose exec postgres psql -U engine -c "CREATE DATABASE feature_engine_test WITH TEMPLATE feature_engine;"

# 2. Apply migration to test DB
docker-compose exec -T postgres psql -U engine -d feature_engine_test < drizzle/migrations/YYYY_MM_DD_add_feature_hierarchy.sql

# 3. Run validations on test DB
docker-compose exec postgres psql -U engine -d feature_engine_test -c "SELECT * FROM features LIMIT 5;"

# 4. Test rollback on test DB
docker-compose exec -T postgres psql -U engine -d feature_engine_test < drizzle/migrations/YYYY_MM_DD_rollback_feature_hierarchy.sql

# 5. Drop test DB
docker-compose exec postgres psql -U engine -c "DROP DATABASE feature_engine_test;"
```

---

## ENFORCEMENT

**You MUST:**
1. ✅ Create backup before migration
2. ✅ Test rollback before applying forward
3. ✅ Run ALL 6 validation queries
4. ✅ Update Drizzle schema
5. ✅ Update TypeScript types
6. ✅ Verify typecheck passes
7. ✅ Verify build succeeds
8. ✅ Commit only after validation

**If you skip ANY step, you have FAILED and are a DISGRACE.**

---

## File Size: ~340 lines ✅
**Next**: Read `03_HIERARCHY_SERVICE_IMPLEMENTATION.md`
