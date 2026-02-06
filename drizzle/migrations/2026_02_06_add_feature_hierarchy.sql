-- Migration: Add feature hierarchy support
-- Author: Claude Opus 4.6
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
