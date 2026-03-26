-- Add optional mirror_id to friend_invites so sharing a mirror off-platform
-- can be deferred until the invitee accepts the friend request.
ALTER TABLE friend_invites
  ADD COLUMN mirror_id UUID REFERENCES mirrors(id) ON DELETE SET NULL;
