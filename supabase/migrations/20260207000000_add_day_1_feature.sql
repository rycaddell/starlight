-- Day 1 Feature Database Schema
-- Created: 2026-02-07
--
-- This migration adds support for the Day 1 onboarding flow:
-- - day_1_progress: Tracks user progress through 5-step Day 1 journey
-- - mirrors.mirror_type: Distinguishes Day 1 mini-mirrors from regular mirrors
-- - mirrors.focus_areas: Stores user's focus areas input from Step 5
-- - users.day_1_completed_at: Marks when user completed Day 1

-- =============================================================================
-- 1. Create day_1_progress table
-- =============================================================================
CREATE TABLE IF NOT EXISTS day_1_progress (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_step INTEGER DEFAULT 1 CHECK (current_step BETWEEN 1 AND 5),

  -- Step 1: Spiritual place selection
  spiritual_place TEXT CHECK (spiritual_place IN (
    'Adventuring', 'Battling', 'Hiding', 'Resting',
    'Working', 'Wandering', 'Grieving', 'Celebrating'
  )),

  -- Steps 2 & 3: Voice journal IDs
  step_2_journal_id UUID REFERENCES journals(id) ON DELETE SET NULL,
  step_3_journal_id UUID REFERENCES journals(id) ON DELETE SET NULL,

  -- Mini-mirror generation
  mini_mirror_id UUID REFERENCES mirrors(id) ON DELETE SET NULL,
  generation_status TEXT DEFAULT 'pending' CHECK (generation_status IN (
    'pending', 'generating', 'completed', 'failed'
  )),

  -- Completion tracking
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for day_1_progress
CREATE INDEX IF NOT EXISTS idx_day1_progress_status ON day_1_progress(generation_status)
  WHERE completed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_day1_progress_created ON day_1_progress(created_at);

-- Comment
COMMENT ON TABLE day_1_progress IS 'Tracks user progress through Day 1 onboarding flow (5 steps ending with mini-mirror)';

-- =============================================================================
-- 2. Update mirrors table for Day 1 mini-mirrors
-- =============================================================================

-- Add mirror_type column (regular vs day_1)
ALTER TABLE mirrors ADD COLUMN IF NOT EXISTS mirror_type TEXT DEFAULT 'regular'
  CHECK (mirror_type IN ('regular', 'day_1'));

-- Add focus_areas column (from Step 5 user input)
ALTER TABLE mirrors ADD COLUMN IF NOT EXISTS focus_areas TEXT;

-- Index for querying by mirror type
CREATE INDEX IF NOT EXISTS idx_mirrors_type ON mirrors(mirror_type);

-- Comments
COMMENT ON COLUMN mirrors.mirror_type IS 'Type of mirror: regular (10 journals) or day_1 (mini-mirror from onboarding)';
COMMENT ON COLUMN mirrors.focus_areas IS 'User-entered focus areas from Day 1 Step 5 (influences future prompts)';

-- =============================================================================
-- 3. Update users table to track Day 1 completion
-- =============================================================================

-- Add day_1_completed_at timestamp
ALTER TABLE users ADD COLUMN IF NOT EXISTS day_1_completed_at TIMESTAMP;

-- Index for finding users who haven't completed Day 1
CREATE INDEX IF NOT EXISTS idx_users_day1_incomplete ON users(day_1_completed_at)
  WHERE day_1_completed_at IS NULL;

-- Comment
COMMENT ON COLUMN users.day_1_completed_at IS 'Timestamp when user completed Day 1 onboarding flow. NULL = not completed. Used to show/hide Get Started component and Mirror tab.';

-- =============================================================================
-- 4. Trigger to auto-update updated_at on day_1_progress
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_day1_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS day1_progress_updated_at ON day_1_progress;
CREATE TRIGGER day1_progress_updated_at
  BEFORE UPDATE ON day_1_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_day1_progress_updated_at();
