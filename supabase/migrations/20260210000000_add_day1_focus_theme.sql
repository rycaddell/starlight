-- Add day_1_focus_theme to users table
-- Created: 2026-02-10
--
-- This migration adds support for storing the user's extracted focus theme
-- (1-2 word summary of their focus areas) to personalize journal prompts

-- Add day_1_focus_theme column
ALTER TABLE users ADD COLUMN IF NOT EXISTS day_1_focus_theme TEXT;

-- Index for querying users by theme (for analytics/reporting)
CREATE INDEX IF NOT EXISTS idx_users_focus_theme ON users(day_1_focus_theme)
  WHERE day_1_focus_theme IS NOT NULL;

-- Comment
COMMENT ON COLUMN users.day_1_focus_theme IS '1-2 word theme extracted from Day 1 focus areas (e.g., "Trust", "Purpose", "Healing"). Used to personalize journal prompt headings.';
