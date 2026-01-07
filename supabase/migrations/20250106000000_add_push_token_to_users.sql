-- Add push_token field to users table for push notifications
-- Created: 2025-01-06

ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Add index for faster lookups when sending notifications
CREATE INDEX IF NOT EXISTS idx_users_push_token ON users(push_token) WHERE push_token IS NOT NULL;

-- Add comment
COMMENT ON COLUMN users.push_token IS 'Expo push notification token for this user device';
