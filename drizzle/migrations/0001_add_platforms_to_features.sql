-- Migration: Add platforms column to features table
-- Phase 7.5.1: Platform Targeting
-- Date: 2026-02-02

-- Add platforms column with default value for all platforms
ALTER TABLE features
ADD COLUMN platforms JSONB DEFAULT '["web", "ios", "android", "flutter", "react-native"]';

-- Update existing features to have default platforms
UPDATE features
SET platforms = '["web", "ios", "android", "flutter", "react-native"]'
WHERE platforms IS NULL;
