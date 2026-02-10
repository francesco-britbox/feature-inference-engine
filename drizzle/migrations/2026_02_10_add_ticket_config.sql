-- Add ticket_config table for project-level ticket generation settings
CREATE TABLE IF NOT EXISTS "ticket_config" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_key" text NOT NULL DEFAULT 'PROJ',
  "project_name" text NOT NULL DEFAULT 'My Project',
  "reporter" text NOT NULL DEFAULT 'System',
  "default_priority" text NOT NULL DEFAULT 'Medium',
  "target_platforms" jsonb DEFAULT '[{"platform":"Web","enabled":true},{"platform":"iOS","enabled":false},{"platform":"Android","enabled":false}]',
  "target_regions" jsonb DEFAULT '[{"name":"US","enabled":true},{"name":"EU","enabled":true}]',
  "sprint_name" text,
  "tool_name" text NOT NULL DEFAULT 'AI Feature Inference Engine',
  "author_name" text NOT NULL DEFAULT 'System',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
