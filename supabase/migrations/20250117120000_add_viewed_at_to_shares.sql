-- Migration: Add viewed_at to mirror_shares
-- Created: 2025-01-17
-- Description: Adds viewed_at column to track when recipient viewed shared mirror

-- Add viewed_at column to mirror_shares
alter table mirror_shares
  add column viewed_at timestamp with time zone;

-- Add index for querying unread shares
create index idx_mirror_shares_viewed on mirror_shares(recipient_user_id, viewed_at);

-- Comment
comment on column mirror_shares.viewed_at is 'When recipient viewed the shared mirror (null = unread)';
