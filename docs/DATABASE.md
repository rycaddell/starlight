# Oxbow - Database Schema

Complete reference for the Supabase database structure, relationships, and data models.

---

## 🗄️ Database Overview

Oxbow uses **Supabase** (PostgreSQL) as its database with the following tables:

- `custom_users` - User accounts (access code-based auth)
- `journals` - Journal entries (text or voice transcriptions)
- `mirrors` - AI-generated spiritual reflections
- `mirror_reflections` - User responses to mirror prompts (deprecated)
- `friend_invites` - Friend invite links and tracking
- `friend_links` - Bi-directional friend relationships
- `mirror_shares` - Mirrors shared between friends
- `mirror_generation_requests` - Server-side mirror generation status

**Type Definitions:** See `types/database.ts` for TypeScript interfaces

---

## 📋 Table Schemas

### `custom_users`

Stores user accounts with access code-based authentication.

**⚠️ Note:** This table is separate from Supabase Auth. Users sign in with pre-created access codes, not email/password.
```typescript
{
  id: string (uuid, primary key)
  access_code: string (unique, not null)
  display_name: string
  status: string
  group_name: string (nullable)
  invited_by: string (nullable, references custom_users.id)
  created_at: timestamp
  updated_at: timestamp
}
```

**Fields Explained:**
- `id` - Unique identifier for the user
- `access_code` - The code users enter to sign in (e.g., "SPRING2024")
- `display_name` - User's chosen display name
- `status` - User account status (active, inactive, etc.)
- `group_name` - Optional group/cohort identifier
- `invited_by` - ID of user who invited them (for referral tracking)

**Indexes:**
- Primary key on `id`
- Unique index on `access_code`
- Index on `status` for filtering active users

**Example Row:**
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "access_code": "SPRING2024",
  "display_name": "Sarah M.",
  "status": "active",
  "group_name": "Beta Testers",
  "invited_by": null,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

---

### `journals`

Stores individual journal entries from users (text or transcribed voice).
```typescript
{
  id: string (uuid, primary key)
  user_id: string (uuid, foreign key → custom_users.id)
  content: string (not null)
  mirror_id: string (uuid, nullable, foreign key → mirrors.id)
  created_at: timestamp
  updated_at: timestamp
}
```

**Fields Explained:**
- `id` - Unique identifier for the journal entry
- `user_id` - The user who created this journal
- `content` - The journal text (typed or transcribed from voice)
- `mirror_id` - Links to the Mirror this journal was used to generate (null until included in a Mirror)
- `created_at` - When the journal was created
- `updated_at` - Last modification time

**Relationships:**
- `user_id` → `custom_users.id` (many journals to one user)
- `mirror_id` → `mirrors.id` (many journals to one mirror)

**Indexes:**
- Primary key on `id`
- Index on `user_id` for user-specific queries
- Index on `mirror_id` for finding journals in a mirror
- Index on `created_at` for chronological sorting

**Business Logic:**
- Each journal can only be associated with ONE Mirror
- Once `mirror_id` is set, that journal is "locked" to that Mirror
- New journals have `mirror_id: null` until included in Mirror generation

**Example Row:**
```json
{
  "id": "j1a2b3c4-d5e6-7890-abcd-ef1234567890",
  "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "content": "Today I felt grateful for the small moments of peace in my day. I noticed the sunrise and took time to reflect on what brings me joy.",
  "mirror_id": null,
  "created_at": "2024-03-10T08:15:00Z",
  "updated_at": "2024-03-10T08:15:00Z"
}
```

---

### `mirrors`

Stores AI-generated spiritual reflections based on 10 journal entries.
```typescript
{
  id: string (uuid, primary key)
  custom_user_id: string (uuid, foreign key → custom_users.id)
  screen_1_themes: JSON (not null)
  screen_2_biblical: JSON (not null)
  screen_3_observations: JSON (not null)
  screen_4_suggestions: JSON (nullable)
  journal_count: integer (default: 10)
  reflection_focus: text (nullable)
  reflection_action: text (nullable)
  reflection_completed_at: timestamp (nullable)
  has_been_viewed: boolean (default: false)
  created_at: timestamp
  updated_at: timestamp
}
```

**Fields Explained:**
- `id` - Unique identifier for the Mirror
- `custom_user_id` - The user this Mirror belongs to
- `screen_1_themes` - JSON containing identified themes from journals
- `screen_2_biblical` - JSON containing relevant biblical references
- `screen_3_observations` - JSON containing observations about spiritual journey
- `screen_4_suggestions` - JSON containing suggestions for growth
- `journal_count` - Number of journals used (default: 10)
- `reflection_focus` - User's answer to "What will you focus on?" (Screen 4)
- `reflection_action` - User's answer to "What action will you take?" (Screen 4)
- `reflection_completed_at` - When user completed the reflection journal
- `has_been_viewed` - Tracks if mirror has been viewed (prevents re-showing generation card)
- `created_at` - When the Mirror was generated
- `updated_at` - Last modification time

**Relationships:**
- `user_id` → `custom_users.id` (many mirrors to one user)
- One mirror ← many journals (via `journals.mirror_id`)

**Indexes:**
- Primary key on `id`
- Index on `user_id` for user-specific queries
- Index on `created_at` for chronological sorting

**JSON Structure Examples:**

**`screen_1_themes`:**
```json
{
  "title": "Themes in Your Journey",
  "themes": [
    {
      "name": "Gratitude",
      "description": "You frequently express thankfulness for small moments",
      "frequency": "high"
    },
    {
      "name": "Peace-seeking",
      "description": "A recurring desire for inner calm and stillness",
      "frequency": "medium"
    }
  ]
}
```

**`screen_2_biblical`:**
```json
{
  "title": "Biblical Reflections",
  "references": [
    {
      "verse": "Philippians 4:6-7",
      "text": "Do not be anxious about anything...",
      "relevance": "Relates to your journey toward peace"
    }
  ]
}
```

**`screen_3_observations`:**
```json
{
  "title": "Observations",
  "observations": [
    "You show growth in recognizing moments of grace",
    "There's a pattern of seeking solitude for reflection"
  ]
}
```

**`screen_4_suggestions`:**
```json
{
  "title": "Suggestions for Growth",
  "suggestions": [
    {
      "area": "Daily Practice",
      "suggestion": "Consider a morning gratitude ritual"
    }
  ]
}
```

**Example Row:**
```json
{
  "id": "m1a2b3c4-d5e6-7890-abcd-ef1234567890",
  "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "screen_1_themes": { /* JSON as above */ },
  "screen_2_biblical": { /* JSON as above */ },
  "screen_3_observations": { /* JSON as above */ },
  "screen_4_suggestions": { /* JSON as above */ },
  "journal_count": 15,
  "created_at": "2024-03-25T14:30:00Z",
  "updated_at": "2024-03-25T14:30:00Z"
}
```

---

### `mirror_reflections`

Stores user responses to prompts/questions within Mirrors.
```typescript
{
  id: string (uuid, primary key)
  mirror_id: string (uuid, foreign key → mirrors.id)
  user_id: string (uuid, foreign key → custom_users.id)
  screen_number: integer (1-4)
  question: string
  response: string
  created_at: timestamp
  updated_at: timestamp
}
```

**Fields Explained:**
- `id` - Unique identifier for the reflection
- `mirror_id` - Which Mirror this reflection belongs to
- `user_id` - The user who wrote this reflection
- `screen_number` - Which screen (1-4) this reflection is for
- `question` - The prompt/question being answered
- `response` - User's written response
- `created_at` - When the reflection was created
- `updated_at` - Last modification time

**Relationships:**
- `mirror_id` → `mirrors.id` (many reflections to one mirror)
- `user_id` → `custom_users.id` (many reflections to one user)

**Indexes:**
- Primary key on `id`
- Index on `mirror_id` for mirror-specific queries
- Index on `user_id` for user-specific queries
- Composite index on `(mirror_id, screen_number)` for screen queries

**Example Row:**
```json
{
  "id": "r1a2b3c4-d5e6-7890-abcd-ef1234567890",
  "mirror_id": "m1a2b3c4-d5e6-7890-abcd-ef1234567890",
  "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "screen_number": 1,
  "question": "Which theme resonates most with you?",
  "response": "Gratitude definitely stands out to me. I hadn't realized how often I was expressing thankfulness.",
  "created_at": "2024-03-25T15:00:00Z",
  "updated_at": "2024-03-25T15:00:00Z"
}
```

**⚠️ Note:** This table is **deprecated** in favor of storing reflection data directly on the `mirrors` table (`reflection_focus`, `reflection_action` fields).

---

### `friend_invites`

Tracks friend invite creation for analytics and validation.

```typescript
{
  id: string (uuid, primary key)
  inviter_user_id: string (uuid, foreign key → custom_users.id)
  inviter_display_name: string (not null)
  token: string (unique, not null)
  created_at: timestamp
  accepted_at: timestamp (nullable)
  accepted_by_user_id: string (uuid, foreign key → custom_users.id, nullable)
}
```

**Fields Explained:**
- `id` - Unique identifier for the invite
- `inviter_user_id` - User who created the invite
- `inviter_display_name` - Cached display name (avoids join when accepting)
- `token` - Plain UUID used in deep link (ephemeral, 72h expiry)
- `created_at` - When invite was created
- `accepted_at` - When invite was accepted (null if not yet accepted)
- `accepted_by_user_id` - Who accepted the invite

**Relationships:**
- `inviter_user_id` → `custom_users.id` (many invites to one inviter)
- `accepted_by_user_id` → `custom_users.id` (many invites to one accepter)

**Indexes:**
- Primary key on `id`
- Unique index on `token`
- Index on `inviter_user_id`

**Business Logic:**
- 72-hour expiry enforced in application (not database constraint)
- Token is plain UUID (not hashed) - sufficient for ephemeral links
- Once accepted, `accepted_at` and `accepted_by_user_id` are set

**Example Row:**
```json
{
  "id": "i1a2b3c4-d5e6-7890-abcd-ef1234567890",
  "inviter_user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "inviter_display_name": "Sarah M.",
  "token": "f8e7d6c5-b4a3-9281-7065-f4e3d2c1b0a9",
  "created_at": "2024-03-20T10:00:00Z",
  "accepted_at": "2024-03-20T11:30:00Z",
  "accepted_by_user_id": "b2c3d4e5-f6a7-8901-bcde-f1234567890a"
}
```

---

### `friend_links`

Bi-directional friend relationships with 3-friend limit.

```typescript
{
  id: string (uuid, primary key)
  user_a_id: string (uuid, foreign key → custom_users.id)
  user_b_id: string (uuid, foreign key → custom_users.id)
  status: string (default: 'active') CHECK ('active' | 'revoked')
  created_at: timestamp
  CONSTRAINT unique_friend_link UNIQUE (user_a_id, user_b_id)
  CONSTRAINT no_self_link CHECK (user_a_id != user_b_id)
  CONSTRAINT ordered_ids CHECK (user_a_id < user_b_id)
}
```

**Fields Explained:**
- `id` - Unique identifier for the friend link
- `user_a_id` - First user (always UUID < user_b_id)
- `user_b_id` - Second user (always UUID > user_a_id)
- `status` - 'active' or 'revoked' (soft delete)
- `created_at` - When friendship was created

**Key Design:**
- **Ordered IDs:** `user_a_id` always < `user_b_id` prevents duplicate rows
- **Bi-directional:** Single row represents both sides of friendship
- **Soft Delete:** `status='revoked'` instead of DELETE
- **3-Friend Limit:** Enforced in service layer (not database constraint)

**Relationships:**
- `user_a_id` → `custom_users.id`
- `user_b_id` → `custom_users.id`

**Indexes:**
- Primary key on `id`
- Unique constraint on `(user_a_id, user_b_id)`
- Partial index on `user_a_id` WHERE status = 'active'
- Partial index on `user_b_id` WHERE status = 'active'

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

**Example Row:**
```json
{
  "id": "l1a2b3c4-d5e6-7890-abcd-ef1234567890",
  "user_a_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "user_b_id": "b2c3d4e5-f6a7-8901-bcde-f1234567890a",
  "status": "active",
  "created_at": "2024-03-20T11:30:00Z"
}
```

---

### `mirror_shares`

Tracks mirrors shared between friends.

```typescript
{
  id: string (uuid, primary key)
  mirror_id: string (uuid, foreign key → mirrors.id)
  sender_user_id: string (uuid, foreign key → custom_users.id)
  recipient_user_id: string (uuid, foreign key → custom_users.id)
  created_at: timestamp
  viewed_at: timestamp (nullable)
  CONSTRAINT unique_mirror_share UNIQUE (mirror_id, recipient_user_id)
}
```

**Fields Explained:**
- `id` - Unique identifier for the share
- `mirror_id` - The mirror being shared
- `sender_user_id` - User who shared the mirror
- `recipient_user_id` - User receiving the share
- `created_at` - When mirror was shared
- `viewed_at` - When recipient first viewed the mirror (null if not viewed)

**Relationships:**
- `mirror_id` → `mirrors.id` (many shares to one mirror)
- `sender_user_id` → `custom_users.id` (many shares from one sender)
- `recipient_user_id` → `custom_users.id` (many shares to one recipient)

**Indexes:**
- Primary key on `id`
- Unique constraint on `(mirror_id, recipient_user_id)` prevents duplicate shares
- Index on `recipient_user_id` for inbox queries
- Index on `sender_user_id` for outbox queries
- Index on `mirror_id` for finding all shares of a mirror

**Business Logic:**
- Same mirror can be shared with multiple friends (different recipients)
- Cannot share same mirror twice with same friend (unique constraint)
- `viewed_at` tracks first view (for "NEW" badge)

**Example Row:**
```json
{
  "id": "s1a2b3c4-d5e6-7890-abcd-ef1234567890",
  "mirror_id": "m1a2b3c4-d5e6-7890-abcd-ef1234567890",
  "sender_user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "recipient_user_id": "b2c3d4e5-f6a7-8901-bcde-f1234567890a",
  "created_at": "2024-03-25T16:00:00Z",
  "viewed_at": null
}
```

---

### `mirror_generation_requests`

Tracks server-side mirror generation status (polling).

```typescript
{
  id: string (uuid, primary key)
  custom_user_id: string (uuid, foreign key → custom_users.id)
  status: string (default: 'pending') CHECK ('pending' | 'processing' | 'completed' | 'failed')
  mirror_id: string (uuid, foreign key → mirrors.id, nullable)
  requested_at: timestamp (default: NOW())
  completed_at: timestamp (nullable)
  error_message: text (nullable)
}
```

**Fields Explained:**
- `id` - Unique identifier for the generation request
- `custom_user_id` - User requesting mirror generation
- `status` - Current status of generation
  - `pending` - Request created, waiting for Edge Function
  - `processing` - Edge Function picked up request, generating
  - `completed` - Mirror generated successfully
  - `failed` - Generation failed with error
- `mirror_id` - Generated mirror (set when status = 'completed')
- `requested_at` - When request was created
- `completed_at` - When generation finished (success or fail)
- `error_message` - Error details if status = 'failed'

**Relationships:**
- `custom_user_id` → `custom_users.id` (many requests to one user)
- `mirror_id` → `mirrors.id` (one request to one mirror)

**Indexes:**
- Primary key on `id`
- Composite index on `(custom_user_id, status)` for polling queries
- Index on `requested_at` for rate limiting

**Business Logic:**
- Client polls this table every 3 seconds during generation
- Rate limit: 1 mirror per 24 hours (enforced by checking recent requests)
- Edge Function updates status as generation progresses

**Example Row:**
```json
{
  "id": "g1a2b3c4-d5e6-7890-abcd-ef1234567890",
  "custom_user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "completed",
  "mirror_id": "m1a2b3c4-d5e6-7890-abcd-ef1234567890",
  "requested_at": "2024-03-25T14:00:00Z",
  "completed_at": "2024-03-25T14:00:35Z",
  "error_message": null
}
```

---

## 🔗 Relationships Diagram
```
custom_users (1) ──────< journals (many)
     │                      │
     │                      │ mirror_id
     │                      ↓
     │                   mirrors (1)
     │                      │
     └──────────────────────┘
     
     
mirrors (1) ──────< mirror_reflections (many)
```

**Explained:**
- One user can have many journals
- One user can have many mirrors
- One mirror is associated with exactly 15 journals
- One mirror can have many reflections (user responses)

---

## 📊 Common Queries

### Get User's Available Journals (Not Yet in a Mirror)
```sql
SELECT * FROM journals
WHERE user_id = $1
  AND mirror_id IS NULL
ORDER BY created_at DESC;
```

**Use Case:** Finding journals eligible for next Mirror generation

---

### Get Journals for a Specific Mirror
```sql
SELECT * FROM journals
WHERE mirror_id = $1
ORDER BY created_at ASC;
```

**Use Case:** Displaying which journals were used in a Mirror

---

### Get User's Mirror History
```sql
SELECT * FROM mirrors
WHERE user_id = $1
ORDER BY created_at DESC;
```

**Use Case:** Displaying past Mirrors on Mirror screen

---

### Check if User Can Unlock Mirror
```sql
SELECT COUNT(*) as available_journals
FROM journals
WHERE user_id = $1
  AND mirror_id IS NULL;
```

**Use Case:** Determining if "Unlock Mirror" button should appear (needs >= 15)

---

### Get Mirror with Associated Journals
```sql
SELECT 
  m.*,
  json_agg(j.*) as journals
FROM mirrors m
LEFT JOIN journals j ON j.mirror_id = m.id
WHERE m.id = $1
GROUP BY m.id;
```

**Use Case:** Loading a complete Mirror with all its source journals

---

### Get User's Reflections for a Mirror
```sql
SELECT * FROM mirror_reflections
WHERE mirror_id = $1
  AND user_id = $2
ORDER BY screen_number ASC, created_at ASC;
```

**Use Case:** Loading user's responses when viewing a past Mirror

---

## 🔐 Row Level Security (RLS)

Supabase uses Row Level Security policies to control data access.

### Recommended Policies

**`custom_users` table:**
```sql
-- Users can only read their own data
CREATE POLICY "Users can view own profile"
ON custom_users FOR SELECT
USING (auth.uid() = id);

-- Users can update their own display_name
CREATE POLICY "Users can update own profile"
ON custom_users FOR UPDATE
USING (auth.uid() = id);
```

**`journals` table:**
```sql
-- Users can only see their own journals
CREATE POLICY "Users can view own journals"
ON journals FOR SELECT
USING (auth.uid() = user_id);

-- Users can create journals for themselves
CREATE POLICY "Users can create own journals"
ON journals FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own journals (before mirror_id is set)
CREATE POLICY "Users can update own journals"
ON journals FOR UPDATE
USING (auth.uid() = user_id AND mirror_id IS NULL);
```

**`mirrors` table:**
```sql
-- Users can only see their own mirrors
CREATE POLICY "Users can view own mirrors"
ON mirrors FOR SELECT
USING (auth.uid() = user_id);

-- Only server/admin can create mirrors
-- (Mirror generation happens server-side)
```

**`mirror_reflections` table:**
```sql
-- Users can view their own reflections
CREATE POLICY "Users can view own reflections"
ON mirror_reflections FOR SELECT
USING (auth.uid() = user_id);

-- Users can create reflections for their mirrors
CREATE POLICY "Users can create own reflections"
ON mirror_reflections FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own reflections
CREATE POLICY "Users can update own reflections"
ON mirror_reflections FOR UPDATE
USING (auth.uid() = user_id);
```

---

## 🧹 Data Lifecycle

### Journal Entry Lifecycle
```
1. Created → mirror_id = null (available for Mirror)
2. Used in Mirror → mirror_id = [mirror_uuid] (locked)
3. Persists indefinitely (not deleted)
```

### Mirror Lifecycle
```
1. Generated when 15 journals available
2. Persists indefinitely
3. Can be viewed multiple times
4. Associated journals remain linked
```

### Mirror Reflection Lifecycle
```
1. Created when user responds to prompt
2. Can be edited by user
3. Persists with Mirror
```

---

## 🔄 Data Constraints

### Business Rules
- ✅ A journal can belong to **at most one** Mirror (`mirror_id` nullable, unique per journal)
- ✅ A Mirror must be associated with **exactly 15** journals (enforced at generation)
- ✅ Users cannot delete journals (only soft-delete via status field, if implemented)
- ✅ Mirrors cannot be edited once generated (immutable after creation)
- ✅ Access codes must be **unique** across all users

### Database Constraints
```sql
-- Ensure journal_count is always 15 for mirrors
ALTER TABLE mirrors
ADD CONSTRAINT check_journal_count
CHECK (journal_count = 15);

-- Ensure screen_number is 1-4 for reflections
ALTER TABLE mirror_reflections
ADD CONSTRAINT check_screen_number
CHECK (screen_number >= 1 AND screen_number <= 4);

-- Ensure access codes are unique and not empty
ALTER TABLE custom_users
ADD CONSTRAINT unique_access_code UNIQUE (access_code);
ALTER TABLE custom_users
ADD CONSTRAINT check_access_code_not_empty
CHECK (access_code <> '');
```

---

## 📈 Indexing Strategy

### Performance-Critical Indexes
```sql
-- User lookups by access code (sign-in)
CREATE INDEX idx_users_access_code ON custom_users(access_code);

-- User's journals (frequent query)
CREATE INDEX idx_journals_user_id ON journals(user_id);

-- Available journals for Mirror generation
CREATE INDEX idx_journals_user_mirror_null 
ON journals(user_id) WHERE mirror_id IS NULL;

-- Mirror history (frequent query)
CREATE INDEX idx_mirrors_user_created 
ON mirrors(user_id, created_at DESC);

-- Reflections by mirror and screen
CREATE INDEX idx_reflections_mirror_screen 
ON mirror_reflections(mirror_id, screen_number);
```

---

## 🚨 Common Data Issues

### Issue 1: User Can't Unlock Mirror Despite 15 Journals
**Cause:** Journals already used in previous Mirror (mirror_id not null)  
**Solution:** Query with `WHERE mirror_id IS NULL`

### Issue 2: Mirror Shows Wrong Journal Count
**Cause:** `journal_count` field not updated during generation  
**Solution:** Use COUNT query on journals table as source of truth

### Issue 3: Duplicate Access Codes
**Cause:** Unique constraint not enforced  
**Solution:** Add unique constraint and index on `access_code`

### Issue 4: Orphaned Journals
**Cause:** Mirror deleted but journals still reference it  
**Solution:** Use CASCADE on foreign key or set `mirror_id` to NULL

---

## 🛠️ Migrations

### Adding a New Field to Journals
```sql
-- Add a new field for journal type (text vs voice)
ALTER TABLE journals
ADD COLUMN input_type VARCHAR(10) DEFAULT 'text'
CHECK (input_type IN ('text', 'voice'));

-- Backfill existing data
UPDATE journals SET input_type = 'text' WHERE input_type IS NULL;
```

### Creating Indexes for New Queries
```sql
-- If adding search functionality
CREATE INDEX idx_journals_content_search 
ON journals USING gin(to_tsvector('english', content));
```

---

## 📚 Service Layer Reference

All database operations should go through the service layer in `lib/supabase/`:

**`lib/supabase/auth.js`**
- `signInWithAccessCode(code)`
- `signOut()`
- `getCurrentUser()`

**`lib/supabase/journals.js`**
- `createJournal(userId, content)`
- `fetchJournals(userId)`
- `fetchAvailableJournals(userId)`
- `updateJournal(journalId, updates)`

**`lib/supabase/mirrors.js`**
- `generateMirror(userId)`
- `fetchMirrors(userId)`
- `fetchMirrorById(mirrorId)`

**`lib/supabase/feedback.js`**
- `createReflection(mirrorId, userId, screenNumber, question, response)`
- `fetchReflections(mirrorId, userId)`
- `updateReflection(reflectionId, response)`

---

## 🔍 Debugging Tips

### Check Journal Availability
```javascript
// In browser console or React component
import { supabase } from '@/lib/supabase/client';

const { data, error } = await supabase
  .from('journals')
  .select('*')
  .eq('user_id', userId)
  .is('mirror_id', null);

console.log(`Available journals: ${data?.length}`);
```

### Verify Mirror Generation
```javascript
// Check that 15 journals were linked
const { data: mirror } = await supabase
  .from('mirrors')
  .select('*, journals(*)')
  .eq('id', mirrorId)
  .single();

console.log(`Journals in mirror: ${mirror.journals.length}`);
```

### Reset User's Mirror Progress (Testing)
```sql
-- WARNING: Only for dev/testing!
UPDATE journals
SET mirror_id = NULL
WHERE user_id = '[user_uuid]';
```

---

## 📖 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL JSON Functions](https://www.postgresql.org/docs/current/functions-json.html)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)

---

Need to modify the schema? Discuss with the team and create a migration plan!