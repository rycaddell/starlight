# Oxbow - Database Schema

Complete reference for the Supabase database structure, relationships, and data models.

---

## 🗄️ Database Overview

Oxbow uses **Supabase** (PostgreSQL) as its database with the following tables:

- `users` - User accounts (phone OTP auth via Supabase Auth + Twilio Verify)
- `journals` - Journal entries (text or voice transcriptions; voice entries track transcription pipeline state)
- `mirrors` - AI-generated spiritual reflections (full mirrors + Day 1 mini-mirrors)
- `day_1_progress` - Day 1 onboarding progress tracking
- `friend_invites` - Friend invite links and tracking
- `friend_links` - Bi-directional friend relationships
- `mirror_shares` - Mirrors shared between friends
- `mirror_generation_requests` - Server-side mirror generation status

**Deprecated:**
- `mirror_reflections` - User responses to mirror prompts (deprecated; data stored on `mirrors` table instead)

**Storage:**
- `audio-recordings` bucket - Temporary audio files during voice transcription (private; files deleted after transcription completes)

**Type Definitions:** See `types/database.ts` (⚠️ partially stale — AuthContext.tsx `AppUser` interface is the authoritative type for the `users` table)

---

## 📋 Table Schemas

### `users`

Stores user accounts. Auth is handled by Supabase Auth (phone OTP via Twilio Verify); this table extends `auth.users` with app-specific fields.

```typescript
{
  id: string (uuid, primary key)               // App-level user ID (used in all foreign keys)
  auth_user_id: string (uuid, nullable)         // → auth.users.id; null until user migrates
  phone: string (nullable)                      // E.164 format, e.g. "+15555551234"
  display_name: string (nullable)               // Set during onboarding Step 1
  status: string                                // 'active' | 'inactive'
  group_name: string (nullable)                 // e.g. 'Mens Group' (tech debt — hardcoded special-casing)
  invited_by: string (uuid, nullable)           // → users.id of inviter
  push_token: string (nullable)                 // Expo push notification token
  access_code: string (nullable)                // Legacy; nullable since auth migration
  first_login_at: timestamp (nullable)
  onboarding_completed_at: timestamp (nullable) // Set when narrative onboarding completes
  day_1_completed_at: timestamp (nullable)      // Set when Day 1 flow completes
  auth_migrated_at: timestamp (nullable)        // Set when user completes phone OTP migration
  profile_picture_url: string (nullable)        // URL to profile image
  created_at: timestamp
  updated_at: timestamp

  // Push notification / rhythm fields (added 2026-03-24 — run migration before deploying)
  spiritual_rhythm: jsonb (nullable)            // Array of SlotDef objects (see notifications feature)
  notifications_enabled: boolean (default: false)  // true after user opts in via Step 6 or pitch card
  timezone: text (nullable)                     // IANA timezone string, captured at profile setup
  last_opened_at: timestamptz (nullable)        // Updated on every app foreground; used for anti-spam
  notif_card_dismissed: boolean (default: false)   // true after user taps "Not now" on pitch card
}
```

**Auth architecture:**
- Users authenticate via phone OTP (Supabase Auth + Twilio Verify)
- `auth_user_id` links to `auth.users.id`; used by RLS policies via `auth.uid()`
- `access_code` is legacy from the old auth system — nullable, not used for auth
- `resolveAppUser()` in AuthContext looks up by `auth_user_id` first, then falls back to `phone` for migrating users

**`group_name = 'Mens Group'`** triggers special handling in several places (Wednesday reminders, etc.) — acknowledged tech debt.

**⚠️ Pending migration (branch: push_notif_day1):** Run this in the Supabase SQL editor before deploying the push notification feature:
```sql
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS spiritual_rhythm     jsonb       DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS notifications_enabled boolean    DEFAULT false,
  ADD COLUMN IF NOT EXISTS timezone             text        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_opened_at       timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS notif_card_dismissed  boolean    DEFAULT false;
```
No new RLS policies needed — existing `auth_user_id = auth.uid()` policies cover the new columns automatically.

**Indexes:**
- Primary key on `id`
- Index on `auth_user_id`
- Index on `phone`
- Index on `push_token` for notification lookups

---

### `journals`

Stores individual journal entries from users (text or transcribed voice).

```typescript
{
  id: string (uuid, primary key)
  custom_user_id: string (uuid, foreign key → users.id)  // ⚠️ Named custom_user_id for historical reasons
  content: string                          // '' until transcription completes (voice)
  journal_entry_type: string (nullable)    // 'text' | 'voice'
  prompt_text: string (nullable)           // Guided prompt if used
  mirror_id: string (uuid, nullable, foreign key → mirrors.id)
  created_at: timestamp
  updated_at: timestamp

  // Voice transcription pipeline columns (null for text journals):
  transcription_status: string (nullable)  // 'pending' | 'processing' | 'completed' | 'failed'
  audio_url: string (nullable)             // Storage path: "{customUserId}/{jobId}.m4a"
  local_audio_path: string (nullable)      // Device-side path for recovery reference
  error_message: string (nullable)         // Populated on 'failed' status
}
```

**⚠️ Column naming gotcha:** The FK to `users.id` is called `custom_user_id` for historical reasons. Do not confuse with `user_id`.

**Voice journal lifecycle:**
```
Insert (content: '', status: 'pending')
  → Edge function sets status: 'processing'
  → Edge function writes content, sets status: 'completed'
  → Edge function deletes audio from Storage
```

**Hiding in-progress voice journals:** All list queries and the mirror threshold counter exclude journals that are `pending` or `processing`. The filter used throughout:
```javascript
.or('content.neq.,transcription_status.is.null,transcription_status.not.in.(pending,processing)')
```
This keeps text journals (no `transcription_status`) and completed voice journals visible, while hiding in-flight ones.

**Business Logic:**
- Each journal can only be associated with ONE Mirror
- Once `mirror_id` is set, that journal is "locked" to that Mirror
- New journals have `mirror_id: null` until included in Mirror generation

**Indexes:**
- Primary key on `id`
- Index on `custom_user_id`
- Index on `mirror_id`
- Index on `created_at`

---

### `mirrors`

Stores AI-generated spiritual reflections. Covers both full mirrors (10+ journals) and Day 1 mini-mirrors (2 voice journals).

```typescript
{
  id: string (uuid, primary key)
  custom_user_id: string (uuid, foreign key → users.id)
  mirror_type: string                      // 'full' | 'day_1'
  screen_1_themes: JSON (not null)
  screen_2_biblical: JSON (not null)
  screen_3_observations: JSON (not null)
  screen_4_suggestions: JSON (nullable)    // Legacy; not shown in current 3-screen UI
  journal_count: integer (default: 10)
  focus_areas: text[] (nullable)           // User's selected focus areas (Day 1 flow)
  status: string (nullable)                // Generation status if tracked here
  reflection_focus: text (nullable)        // User's free-text reflection response
  reflection_action: text (nullable)       // User's action commitment
  reflection_completed_at: timestamp (nullable)
  has_been_viewed: boolean (default: false)
  created_at: timestamp
  updated_at: timestamp
}
```

**`mirror_type`:**
- `'full'` — Standard mirror generated from 10+ journals
- `'day_1'` — Mini-mirror generated from Day 1 onboarding (2 voice journals + spiritual place)

**Mirror threshold:** 10 journals for full mirrors. Day 1 mini-mirrors use 2 journals.

**`screen_2_biblical` JSON shape (Day 1 mini-mirror):**
```json
{
  "parallel_story": "...",
  "encouraging_verse": "...",
  "challenging_verse": "...",
  "one_line_summaries": ["...", "..."]
}
```

**Indexes:**
- Primary key on `id`
- Index on `custom_user_id`
- Index on `created_at`

---

### `day_1_progress`

Tracks a user's progress through the 5-step Day 1 onboarding flow. One row per user.

```typescript
{
  id: string (uuid, primary key)
  custom_user_id: string (uuid, foreign key → users.id)
  spiritual_place: string (nullable)       // Step 1: user's "spiritual place" description
  step_2_journal_id: string (uuid, nullable, → journals.id)  // Step 2 voice journal
  step_3_journal_id: string (uuid, nullable, → journals.id)  // Step 3 voice journal
  mini_mirror_id: string (uuid, nullable, → mirrors.id)      // Generated after steps 2+3
  focus_areas: text[] (nullable)           // Step 5: selected focus areas
  day_1_focus_theme: string (nullable)     // 1-2 word theme extracted from focus text
  completed_at: timestamp (nullable)       // Set when Day 1 flow completes
  created_at: timestamp
}
```

**Day 1 flow:**
1. Spiritual place text → saved to `spiritual_place`
2. Voice journal 1 → `step_2_journal_id`
3. Voice journal 2 → `step_3_journal_id`
4. Mini-mirror generated from spiritual_place + journals 2+3 → `mini_mirror_id`
5. Focus area selection → `focus_areas`, `day_1_focus_theme`

**Edge Functions involved:** `generate-day-1-mirror`, `extract-focus-theme`

---

### `friend_invites`

Tracks friend invite creation for validation and analytics.

```typescript
{
  id: string (uuid, primary key)
  inviter_user_id: string (uuid, foreign key → users.id)
  inviter_display_name: string (not null)  // Cached; avoids join when accepting
  token: string (unique, not null)         // Plain UUID used in deep link
  created_at: timestamp
  accepted_at: timestamp (nullable)
  accepted_by_user_id: string (uuid, nullable, → users.id)
}
```

**Business Logic:**
- 72-hour expiry enforced in application layer (not a database constraint)
- Token is a plain UUID — sufficient for ephemeral links
- Once accepted, `accepted_at` and `accepted_by_user_id` are set
- Invite acceptance also creates a row in `friend_links`

---

### `friend_links`

Bi-directional friend relationships with a 3-friend limit.

```typescript
{
  id: string (uuid, primary key)
  user_a_id: string (uuid, foreign key → users.id)  // Always UUID < user_b_id
  user_b_id: string (uuid, foreign key → users.id)  // Always UUID > user_a_id
  status: string (default: 'active')       // 'active' | 'revoked'
  created_at: timestamp

  CONSTRAINT unique_friend_link UNIQUE (user_a_id, user_b_id)
  CONSTRAINT no_self_link CHECK (user_a_id != user_b_id)
  CONSTRAINT ordered_ids CHECK (user_a_id < user_b_id)
}
```

**Key Design:**
- **Ordered IDs:** `user_a_id` always < `user_b_id` prevents duplicate rows for same pair
- **Bi-directional:** Single row represents both sides of friendship
- **Soft Delete:** `status='revoked'` instead of DELETE
- **3-Friend Limit:** Enforced in service layer (`checkCanInvite`), not a database constraint

**Helper Function:**
```sql
CREATE OR REPLACE FUNCTION are_users_friends(user1_id UUID, user2_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM friend_links
    WHERE status = 'active'
      AND user_a_id = LEAST(user1_id, user2_id)
      AND user_b_id = GREATEST(user1_id, user2_id)
  );
END;
$$ LANGUAGE plpgsql;
```

**Indexes:**
- Primary key on `id`
- Unique constraint on `(user_a_id, user_b_id)`
- Partial index on `user_a_id` WHERE status = 'active'
- Partial index on `user_b_id` WHERE status = 'active'

---

### `mirror_shares`

Tracks mirrors shared between friends.

```typescript
{
  id: string (uuid, primary key)
  mirror_id: string (uuid, foreign key → mirrors.id)
  sender_user_id: string (uuid, foreign key → users.id)
  recipient_user_id: string (uuid, foreign key → users.id)
  created_at: timestamp
  viewed_at: timestamp (nullable)          // Set on first view; drives "NEW" badge

  CONSTRAINT unique_mirror_share UNIQUE (mirror_id, recipient_user_id)
}
```

**Business Logic:**
- Same mirror can be shared with multiple friends (different recipients)
- Cannot share same mirror twice with same friend (unique constraint)
- `viewed_at` is set on first view only (tracks "NEW" badge state)

**Indexes:**
- Primary key on `id`
- Unique constraint on `(mirror_id, recipient_user_id)`
- Index on `recipient_user_id`
- Index on `sender_user_id`

---

### `mirror_generation_requests`

Tracks server-side mirror generation status. Client polls this table during generation.

```typescript
{
  id: string (uuid, primary key)
  custom_user_id: string (uuid, foreign key → users.id)
  status: string (default: 'pending')      // 'pending' | 'processing' | 'completed' | 'failed'
  mirror_id: string (uuid, nullable, → mirrors.id)  // Set when status = 'completed'
  requested_at: timestamp (default: NOW())
  completed_at: timestamp (nullable)
  error_message: text (nullable)
}
```

**Status flow:**
- `pending` — Request created by client, Edge Function not yet started
- `processing` — Edge Function picked up request
- `completed` — Mirror generated; `mirror_id` is populated
- `failed` — Generation failed; see `error_message`

**Business Logic:**
- Client polls every 3 seconds during generation
- Rate limit: 1 mirror per 24 hours (checked by `checkCanGenerateMirror` in service layer)

**Indexes:**
- Primary key on `id`
- Composite index on `(custom_user_id, status)` for polling queries
- Index on `requested_at` for rate limiting

---

### `mirror_reflections` (Deprecated)

Formerly stored user responses to mirror prompts per screen. **Deprecated** — reflection data is now stored directly on the `mirrors` table (`reflection_focus`, `reflection_action` fields). This table may still exist in the DB but is not written to by any current code.

---

## 🔗 Relationships Diagram

```
users (1) ──────────────────< journals (many)
  │                                │
  │                                │ mirror_id
  │                                ↓
  │                           mirrors (1)
  │                                ▲
  │                                │ mini_mirror_id
  ├──────────< day_1_progress ─────┘
  │
  ├──────────< friend_invites
  │
  ├── user_a_id ──< friend_links >── user_b_id
  │
  ├── sender ──< mirror_shares >── recipient
  │
  └──────────< mirror_generation_requests
```

---

## 🔐 Row Level Security (RLS)

**Current status:** RLS is **enabled** on all tables. See `docs/AUTH_MIGRATION_PLAN.md` for full rollout history.

---

### Helper Function: `get_my_app_user_id()`

```sql
create or replace function get_my_app_user_id()
returns uuid
language sql
security definer
stable
as $$
  select id from users where auth_user_id = auth.uid()
$$;
```

**Why this exists:** `friend_links` stores `public.users.id` (app UUIDs), not `auth.users.id`. RLS policies on `users` that contain an inline `SELECT id FROM users WHERE auth_user_id = auth.uid()` subquery cause **infinite RLS recursion** in PostgreSQL — the subquery triggers the policy again, infinitely. This `SECURITY DEFINER` function bypasses RLS for the inner lookup, breaking the recursion. It is safe because it is still filtered by `auth.uid()` and can only ever return the caller's own app UUID.

**⚠️ Never** write `(select id from users where auth_user_id = auth.uid())` inline inside a `users` RLS policy. Always use `get_my_app_user_id()` instead.

---

### `users` Table Policies

| Policy Name | Command | Expression | Notes |
|---|---|---|---|
| Users can select own profile | SELECT | `auth_user_id = auth.uid()` | Own profile reads |
| Users can select friend profiles | SELECT | `id IN (select friend IDs via get_my_app_user_id())` | Friends list, mirror share names |
| Users can select own unmigrated profile | SELECT | `auth_user_id IS NULL AND phone = ('+' \|\| auth.jwt() ->> 'phone')` | **Temporary** — migration window |
| Users can select profiles of active inviters | SELECT | `id IN (select inviter_user_id from friend_invites where unaccepted + <72h)` | Invite acceptance screen |
| Users can create own profile | INSERT | `auth_user_id = auth.uid()` | New user registration |
| Users can update own profile | UPDATE | `auth_user_id = auth.uid()` (USING + WITH CHECK) | Normal profile updates |
| Allow migration for unlinked users | UPDATE | USING: `auth_user_id IS NULL AND phone = ('+' \|\| auth.jwt() ->> 'phone')` / WITH CHECK: `auth_user_id = auth.uid()` | **Temporary** — migration window |

**Temporary policies** (marked above) should be removed once:
```sql
SELECT COUNT(*) FROM users WHERE auth_user_id IS NULL;
-- Returns 0 → delete both migration policies
```

**Friend profile SELECT policy (full SQL):**
```sql
create policy "Users can select friend profiles"
on users for select
using (
  id in (
    select case
      when user_a_id = get_my_app_user_id() then user_b_id
      when user_b_id = get_my_app_user_id() then user_a_id
    end
    from friend_links
    where status = 'active'
    and (
      user_a_id = get_my_app_user_id()
      or user_b_id = get_my_app_user_id()
    )
  )
);
```

---

### ⚠️ Critical RLS Gotchas

**1. Phone format mismatch between `auth.users` and `public.users`**

`auth.users` stores phone numbers **without** the `+` prefix (e.g. `15551234567`). `public.users.phone` stores them **with** the `+` (e.g. `+15551234567`). When writing RLS policies that compare against the JWT phone claim, always prepend `+`:

```sql
phone = ('+' || (auth.jwt() ->> 'phone'))
```

**2. `friend_links` uses app UUIDs, not auth UUIDs**

`friend_links.user_a_id` and `user_b_id` reference `public.users.id`, not `auth.users.id`. `auth.uid()` returns the auth UUID. Always translate via `get_my_app_user_id()`.

**3. Migration catch-22**

The UPDATE policy `auth_user_id = auth.uid()` blocks the migration UPDATE because unmigrated rows have `auth_user_id = null`. `null = auth.uid()` is always false. The "Allow migration for unlinked users" policy exists to allow this specific write. Without it, users with `auth_user_id IS NULL` can never be migrated via the client — their session exists but the UPDATE silently returns HTTP 406. See `docs/AUTH_MIGRATION_PLAN.md` for the full incident history.

---

### Other Table Policies

```sql
-- journals: users can only access their own
CREATE POLICY "Users can access own journals"
  ON journals FOR ALL
  USING (custom_user_id = current_app_user_id());

-- mirrors: users can only access their own
CREATE POLICY "Users can access own mirrors"
  ON mirrors FOR ALL
  USING (custom_user_id = current_app_user_id());

-- mirror_shares: sender or recipient
CREATE POLICY "Users can view shares they sent or received"
  ON mirror_shares FOR SELECT
  USING (
    sender_user_id = current_app_user_id()
    OR recipient_user_id = current_app_user_id()
  );

-- friend_links: either side of friendship
CREATE POLICY "Users can view own friend links"
  ON friend_links FOR SELECT
  USING (
    user_a_id = current_app_user_id()
    OR user_b_id = current_app_user_id()
  );

-- friend_invites: own invites
CREATE POLICY "Users can view own invites"
  ON friend_invites FOR SELECT
  USING (inviter_user_id = current_app_user_id());

-- mirror_generation_requests: own requests
CREATE POLICY "Users can manage own generation requests"
  ON mirror_generation_requests FOR ALL
  USING (custom_user_id = current_app_user_id())
  WITH CHECK (custom_user_id = current_app_user_id());

-- audio-recordings storage: path must start with user's own ID
CREATE POLICY "Users can access own audio"
  ON storage.objects FOR ALL
  USING (bucket_id = 'audio-recordings' AND (storage.foldername(name))[1] = auth.uid()::text);
```

**See:** `docs/AUTH_MIGRATION_PLAN.md` for full rollout history and incident log.

---

## 🗂️ Supabase Storage

### `audio-recordings` Bucket

**Type:** Private (not publicly accessible)

**Path convention:** `{customUserId}/{jobId}.m4a`

**Lifecycle:** Created by client upload → read by Edge Function → deleted by Edge Function after successful transcription. Files should never persist longer than a few minutes in the happy path.

**Size limit:** 50MB per file (max recording is 8 min ≈ 15MB)

**RLS:** Permissive policy scoped to the bucket. Access scoping is enforced via path convention in the service layer. The `transcribe-audio` Edge Function uses the service role key.

---

## 🧹 Data Lifecycle

### Journal Entry Lifecycle (Text)
```
1. Created → content: text, transcription_status: null, mirror_id: null
2. Used in Mirror → mirror_id = [mirror_uuid] (locked)
3. Persists indefinitely
```

### Journal Entry Lifecycle (Voice)
```
1. Audio recorded → copied to local permanent storage
2. Audio uploaded → audio-recordings Storage bucket
3. Pending journal inserted → content: '', transcription_status: 'pending'
4. Edge function runs → transcription_status: 'processing'
5. Transcription complete → content: [text], transcription_status: 'completed'
                           → audio deleted from Storage
6. Journal is now visible in lists and counts toward mirror threshold
7. Used in Mirror → mirror_id = [mirror_uuid] (locked)
8. Persists indefinitely
```

### Mirror Lifecycle
```
1. Generated when 10 journals available (full) or after Day 1 steps 2+3 (day_1)
2. Persists indefinitely
3. Can be viewed multiple times
4. Associated journals remain linked
```

---

## 🔄 Data Constraints

### Business Rules
- A journal can belong to **at most one** Mirror (`mirror_id` nullable, set once)
- A full Mirror is generated from **10** journals
- Mirrors cannot be edited once generated (immutable after creation)
- Users cannot delete individual journals (account deletion removes all)
- Friend limit is **3 active friends** per user (enforced in service layer)

---

## 🔴 Supabase Realtime Configuration

Oxbow uses **Supabase Realtime** (WebSocket-based) for instant updates on the Friends tab.

### Enabled Tables
- `friend_links` — New friend connections
- `mirror_shares` — Shared mirrors

**Enable via SQL:**
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE friend_links;
ALTER PUBLICATION supabase_realtime ADD TABLE mirror_shares;

-- Verify
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
```

### Subscription Patterns

**Mirror shares (UnreadSharesContext):**
```javascript
supabase
  .channel(`mirror_shares:${user.id}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'mirror_shares',
    filter: `recipient_user_id=eq.${user.id}`
  }, () => refreshUnreadCount())
  .subscribe();
```

**Friend links (FriendBadgeContext):** Supabase Realtime doesn't support OR filters, so two subscriptions are used — one for `user_a_id`, one for `user_b_id`.

```javascript
supabase
  .channel(`friend_links_a:${user.id}`)
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'friend_links',
      filter: `user_a_id=eq.${user.id}` }, () => refreshNewFriendsCount())
  .subscribe();

supabase
  .channel(`friend_links_b:${user.id}`)
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'friend_links',
      filter: `user_b_id=eq.${user.id}` }, () => refreshNewFriendsCount())
  .subscribe();
```

---

## 📚 Service Layer Reference

All database operations go through `lib/supabase/`:

**`lib/supabase/auth.js`**
- `sendPhoneOTP(phone)` — Send OTP via Twilio Verify
- `verifyPhoneOTP(phone, token)` — Verify OTP, create Supabase Auth session
- `completeProfileSetup(authUserId, phone, displayName)` — Create `users` row on first sign-in
- `completeUserOnboarding(userId)` — Set `onboarding_completed_at`
- `signOut()` — Sign out of Supabase Auth + clear SecureStore
- `deleteAccount(userId)` — Calls `delete-account` Edge Function

**`lib/supabase/journals.js`**
- `saveJournalEntry(customUserId, content, type, promptText)` — Create text or voice journal
- `getUserJournals(customUserId, limit)` — Fetch user's journals (excludes in-progress voice)
- `getUserJournalCount(customUserId)` — Count completed journals
- `getTodaysAnsweredPrompts(customUserId)` — Prompts answered today
- `getLastJournalType(customUserId)` — Most recent journal type

**`lib/supabase/mirrors.js`**
- `requestMirrorGeneration(customUserId)` — Trigger full mirror generation
- `checkMirrorGenerationStatus(customUserId)` — Poll generation status
- `checkCanGenerateMirror(customUserId, user)` — Check 24h rate limit + journal count
- `getMirrorById(mirrorId)` — Returns `{ mirror, content }` — read dates from `mirror.created_at`
- `getUserMirrors(userId)` — Fetch mirror list
- `markMirrorAsViewed(mirrorId)` — Set `has_been_viewed = true`
- `saveReflectionFocus(mirrorId, text)` — Save reflection response

**`lib/supabase/friends.js`**
- `createInviteLink(inviterUserId, inviterName)` — Create invite token
- `acceptInvite(token, inviteeUserId)` — Accept and create friend link
- `fetchFriends(userId)` — Get active friends
- `unlinkFriend(linkId)` — Revoke friendship
- `checkCanInvite(userId)` — Enforce 3-friend limit
- `getInviterInfo(token)` — Look up invite details (validates expiry)

**`lib/supabase/day1.js`**
- Full Day 1 flow: spiritual place, journal linking, mini-mirror generation, focus area saving

**`lib/supabase/notifications.ts`**
- `saveRhythm(userId, slots, enabled)` — saves spiritual_rhythm + sets notifications_enabled
- `dismissNotifCard(userId)` — sets notif_card_dismissed=true
- `updateLastOpenedAt(userId)` — fire-and-forget on every app foreground (AppFocusTracker)

---

## 🔍 Common Debugging Queries

### Check available journals for mirror generation
```sql
SELECT COUNT(*) FROM journals
WHERE custom_user_id = '[user_uuid]'
  AND mirror_id IS NULL
  AND transcription_status NOT IN ('pending', 'processing');
```

### Check if all users have migrated to phone auth
```sql
SELECT COUNT(*) FROM users WHERE auth_user_id IS NULL;
-- Must be 0 before enabling RLS (Phase 4 gate)
```

### Reset journal mirror links (dev/testing only)
```sql
-- WARNING: dev only
UPDATE journals SET mirror_id = NULL WHERE custom_user_id = '[user_uuid]';
```

### Check Realtime publication
```sql
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
```
