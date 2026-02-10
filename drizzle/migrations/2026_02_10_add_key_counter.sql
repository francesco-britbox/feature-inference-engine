-- Add key_counter column to ticket_config table
-- Tracks the next available ticket key number to prevent duplicate keys across exports
ALTER TABLE ticket_config ADD COLUMN key_counter integer NOT NULL DEFAULT 1;
