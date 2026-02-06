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
