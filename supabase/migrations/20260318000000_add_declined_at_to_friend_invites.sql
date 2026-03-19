alter table friend_invites
  add column if not exists declined_at timestamp with time zone,
  add column if not exists declined_by_user_id uuid references users(id) on delete set null;
