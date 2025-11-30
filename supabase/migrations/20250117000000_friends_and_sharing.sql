-- Migration: Friends & Mirror Sharing MVP
-- Created: 2025-01-17
-- Description: Adds friend linking and mirror sharing capabilities

-- ============================================================================
-- Table 1: friend_invites
-- Tracks invite creation and acceptance for analytics
-- ============================================================================

create table friend_invites (
  id uuid primary key default gen_random_uuid(),
  inviter_user_id uuid not null references users(id) on delete cascade,
  token text not null unique,
  created_at timestamp with time zone default now(),
  accepted_at timestamp with time zone,
  accepted_by_user_id uuid references users(id) on delete set null
);

-- Indexes for friend_invites
create index idx_friend_invites_inviter on friend_invites(inviter_user_id);
create index idx_friend_invites_created_at on friend_invites(created_at);
create index idx_friend_invites_token on friend_invites(token);

-- Comments
comment on table friend_invites is 'Tracks friend invite creation and acceptance for analytics';
comment on column friend_invites.token is 'Plain UUID token (not hashed) - included in deep link';
comment on column friend_invites.accepted_at is 'When invite was accepted (null = pending)';

-- ============================================================================
-- Table 2: friend_links
-- Active friendships between users (bi-directional)
-- ============================================================================

create table friend_links (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid not null references users(id) on delete cascade,
  user_b_id uuid not null references users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'revoked')),
  created_at timestamp with time zone default now(),

  -- Ensure users don't link with themselves
  constraint no_self_linking check (user_a_id != user_b_id)
);

-- Unique index to prevent duplicate friend pairs (using expression)
-- This ensures (A,B) and (B,A) are treated as the same pair
create unique index idx_friend_links_unique_pair
  on friend_links (least(user_a_id, user_b_id), greatest(user_a_id, user_b_id));

-- Other indexes for friend_links
create index idx_friend_links_user_a_active on friend_links(user_a_id) where status = 'active';
create index idx_friend_links_user_b_active on friend_links(user_b_id) where status = 'active';
create index idx_friend_links_status on friend_links(status);

-- Comments
comment on table friend_links is 'Bi-directional friendships between users';
comment on column friend_links.user_a_id is 'First user in the friendship';
comment on column friend_links.user_b_id is 'Second user in the friendship';
comment on column friend_links.status is 'active = linked, revoked = unlinked';
comment on index idx_friend_links_unique_pair is 'Prevents duplicate friend pairs regardless of order (A,B) = (B,A)';

-- ============================================================================
-- Table 3: mirror_shares
-- Tracks mirrors shared between friends
-- ============================================================================

create table mirror_shares (
  id uuid primary key default gen_random_uuid(),
  mirror_id uuid not null references mirrors(id) on delete cascade,
  sender_user_id uuid not null references users(id) on delete cascade,
  recipient_user_id uuid not null references users(id) on delete cascade,
  created_at timestamp with time zone default now(),

  -- Prevent duplicate shares of same mirror to same recipient
  constraint unique_mirror_recipient unique (mirror_id, recipient_user_id),

  -- Ensure users don't share with themselves
  constraint no_self_sharing check (sender_user_id != recipient_user_id)
);

-- Indexes for mirror_shares
create index idx_mirror_shares_recipient on mirror_shares(recipient_user_id, created_at desc);
create index idx_mirror_shares_sender on mirror_shares(sender_user_id, created_at desc);
create index idx_mirror_shares_mirror on mirror_shares(mirror_id);

-- Comments
comment on table mirror_shares is 'Tracks mirrors shared between friends';
comment on constraint unique_mirror_recipient on mirror_shares is 'Each mirror can only be shared once to each recipient';

-- ============================================================================
-- Row Level Security (RLS)
-- Note: App uses custom access code auth, not Supabase Auth
-- RLS enabled for defense-in-depth, but enforcement is primarily server-side
-- ============================================================================

-- Enable RLS on all tables
alter table friend_invites enable row level security;
alter table friend_links enable row level security;
alter table mirror_shares enable row level security;

-- Permissive policies (actual security enforced in service layer)
-- These allow the anon key to access data; app logic enforces user-specific access

create policy "Allow all operations on friend_invites"
  on friend_invites for all
  using (true)
  with check (true);

create policy "Allow all operations on friend_links"
  on friend_links for all
  using (true)
  with check (true);

create policy "Allow all operations on mirror_shares"
  on mirror_shares for all
  using (true)
  with check (true);

-- ============================================================================
-- Helper function for future use (optional)
-- ============================================================================

-- Function to check if two users are active friends
create or replace function are_users_friends(user_id_1 uuid, user_id_2 uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from friend_links
    where status = 'active'
      and (
        (user_a_id = user_id_1 and user_b_id = user_id_2)
        or (user_a_id = user_id_2 and user_b_id = user_id_1)
      )
  );
$$;

comment on function are_users_friends is 'Check if two users have an active friend link';

-- ============================================================================
-- Migration complete
-- ============================================================================
