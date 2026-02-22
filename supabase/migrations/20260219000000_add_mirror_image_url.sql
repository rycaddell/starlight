-- Add image_url and biblical_character columns to mirrors table
-- Migration created: 2026-02-19

-- Add image_url column for AI-generated hero image
ALTER TABLE mirrors
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add biblical_character column for hero overlay
ALTER TABLE mirrors
ADD COLUMN IF NOT EXISTS biblical_character TEXT;

-- Add comment for documentation
COMMENT ON COLUMN mirrors.image_url IS 'URL to AI-generated hero image for the mirror';
COMMENT ON COLUMN mirrors.biblical_character IS 'Biblical character name extracted from screen_2_biblical data';
