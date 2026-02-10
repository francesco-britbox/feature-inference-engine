-- Add 'user_story_narrative' to feature_outputs output_type constraint
-- Allows caching LLM-generated user story narratives per child feature
ALTER TABLE feature_outputs DROP CONSTRAINT IF EXISTS check_output_type;
ALTER TABLE feature_outputs ADD CONSTRAINT check_output_type CHECK (
  output_type IN (
    'epic',
    'story',
    'acceptance_criteria',
    'api_contract',
    'requirements',
    'user_story_narrative'
  )
);
