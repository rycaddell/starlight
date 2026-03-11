# RLS Cleanup Plan — Pre-App Store

**Created:** 2026-03-09
**Priority:** Must complete before App Store launch
**Context:** Several tables have leftover `USING (true)` ALL policies from the old access-code auth era. Because Postgres OR's PERMISSIVE policies, these override all scoped policies — making the scoped ones decorative. Each table needs proper specific policies added, then the wide-open ones deleted.

**Reference:** Full RLS architecture documented in `docs/DATABASE.md`.

---

## How to Work Through Each Table

For each table:
1. Audit what operations the client actually performs (read the service layer file in `lib/supabase/`)
2. Confirm edge functions cover server-side operations via service role (bypasses RLS — no policy needed)
3. Add specific scoped policies for any gaps
4. Delete the `USING (true)` ALL policy
5. Test the affected flows in the app

---

## Tables to Clean Up

### 🔴 1. `journals` — HIGHEST PRIORITY (most sensitive data)

**Policies to delete:**
- "Allow journal operations with anon key" (`USING (true)`, ALL)
- "Allow authenticated users to manage journals" (`USING (true)`, ALL)

**Policies already in place:**
- SELECT: `custom_user_id = current_app_user_id()` ✓
- INSERT: `custom_user_id = current_app_user_id()` ✓
- DELETE: `custom_user_id = current_app_user_id()` ✓

**Gap to investigate before deleting:**
- UPDATE: Does the client ever UPDATE a journal row directly? Check `lib/supabase/journals.js`. Voice transcription updates (content, transcription_status) are done by the `transcribe-audio` edge function via service role — no client policy needed for those. But confirm there are no client-side UPDATE calls.

**Service layer file:** `lib/supabase/journals.js`

---

### 🔴 2. `friend_links`

**Policies to delete:**
- "Allow all operations on friend_links" (`USING (true)`, ALL)

**Policies already in place:**
- SELECT: `user_a_id = current_app_user_id() OR user_b_id = current_app_user_id()` ✓
- INSERT: `user_a_id = current_app_user_id() OR user_b_id = current_app_user_id()` ✓

**Gap to fill before deleting:**
- UPDATE: `unlinkFriend()` sets `status = 'revoked'`. Need:
```sql
create policy "Users can update own friend links"
on friend_links for update
using (
  user_a_id = current_app_user_id()
  or user_b_id = current_app_user_id()
)
with check (
  user_a_id = current_app_user_id()
  or user_b_id = current_app_user_id()
);
```

**Service layer file:** `lib/supabase/friends.js`

---

### 🔴 3. `friend_invites`

**Policies to delete:**
- "Allow all operations on friend_invites" (`USING (true)`, ALL)

**Policies already in place:**
- SELECT (inviter): `inviter_user_id = current_app_user_id()` ✓
- INSERT: `inviter_user_id = current_app_user_id()` ✓

**Gaps to fill before deleting:**
- SELECT (invitee): `getInviterInfo(token)` and `acceptInvite(token)` query invites by token where the inviter is someone else. Need a policy allowing SELECT on unaccepted, unexpired invites by token — but token isn't in the session, so this must be `USING (true)` scoped to unaccepted+unexpired rows, or restructured as a server-side call.

  Options:
  - **Option A:** Allow SELECT on any unaccepted, unexpired invite (minimal exposure):
    ```sql
    create policy "Anyone can view unaccepted active invites"
    on friend_invites for select
    using (
      accepted_at is null
      and created_at > now() - interval '72 hours'
    );
    ```
  - **Option B:** Move invite acceptance to an edge function (cleaner, more work)

- UPDATE (invitee): `acceptInvite()` sets `accepted_at` and `accepted_by_user_id`. Need UPDATE policy. Since the invitee doesn't own the row (inviter_user_id isn't them), this is similar to the migration catch-22. Option A above plus:
  ```sql
  create policy "Users can accept unaccepted active invites"
  on friend_invites for update
  using (
    accepted_at is null
    and created_at > now() - interval '72 hours'
  )
  with check (
    accepted_by_user_id = current_app_user_id()
  );
  ```

**Service layer file:** `lib/supabase/friends.js`

---

### 🟠 4. `mirrors`

**Policies to delete:**
- "Allow mirror operations with anon key" (`USING (true)`, ALL)

**Policies already in place:**
- SELECT: `custom_user_id = current_app_user_id()` ✓

**Gaps to fill before deleting:**
- UPDATE: Client updates mirrors for reflections (`saveReflectionFocus`, `saveReflectionAction`) and viewed state (`markMirrorAsViewed`). Need:
  ```sql
  create policy "Users can update own mirrors"
  on mirrors for update
  using (custom_user_id = current_app_user_id())
  with check (custom_user_id = current_app_user_id());
  ```
- INSERT/DELETE: Done by edge functions via service role — no client policy needed.

**Service layer file:** `lib/supabase/mirrors.js`

---

### 🟠 5. `mirror_shares`

**Policies to delete:**
- "Allow all operations on mirror_shares" (`USING (true)`, ALL)

**Policies already in place:**
- SELECT: `sender_user_id = current_app_user_id() OR recipient_user_id = current_app_user_id()` ✓
- INSERT: `sender_user_id = current_app_user_id()` ✓

**Gap to fill before deleting:**
- UPDATE: `markShareAsViewed()` sets `viewed_at`. Only the recipient should be able to do this. Need:
  ```sql
  create policy "Recipients can mark shares as viewed"
  on mirror_shares for update
  using (recipient_user_id = current_app_user_id())
  with check (recipient_user_id = current_app_user_id());
  ```

**Service layer file:** `lib/supabase/mirrorShares.js`

---

### 🟡 6. `mirror_generation_requests`

**Policies to delete:**
- "Allow generation request operations with anon key" (`USING (true)`, ALL)

**Policies already in place:**
- ALL (scoped): `custom_user_id = current_app_user_id()` ✓ — this covers SELECT, INSERT, UPDATE, DELETE for own rows

**Gap to investigate:**
- The scoped ALL policy should cover everything. Confirm no edge function writes to this table from the client side that needs a different identity. The `generate-mirror` edge function uses service role → bypasses RLS.
- If the scoped ALL policy covers all client operations, the `USING (true)` policy can be deleted immediately with no additions needed.

**Service layer file:** `lib/supabase/mirrors.js` (requestMirrorGeneration, checkMirrorGenerationStatus)

---

### 🟡 7. `feedback`

**Policies to delete:**
- "Users can view their own feedback" (`USING (true)`, SELECT) — misleadingly named; actually wide open
- "Users can insert their own feedback" (`WITH CHECK (true)`, INSERT) — no user binding

**Replace with:**
```sql
-- Only if the app displays feedback back to the user who submitted it;
-- if feedback is write-only from user perspective, drop the SELECT entirely
create policy "Users can view own feedback"
on feedback for select
using (user_id = current_app_user_id()); -- confirm column name

create policy "Users can insert own feedback"
on feedback for insert
with check (user_id = current_app_user_id()); -- confirm column name
```

**Gap to investigate:** What columns does `feedback` have? Does it have a `user_id` column? Check schema before writing policies. If feedback is anonymous by design, SELECT can be dropped entirely.

---

### 🧹 8. `users` — Duplicate Policy Cleanup

**No security risk — minor cleanup only.**

Delete one of these (they're identical):
- "Users can select own profile" — `auth_user_id = auth.uid()`
- "Users can view own profile" — `auth.uid() = auth_user_id`

Keep whichever name is clearer. Recommend keeping "Users can select own profile" for naming consistency with the other SELECT policies added on 2026-03-09.

---

## Completion Checklist

- [x] `journals` — deleted 2 wide-open policies; no UPDATE needed (all updates are server-side via service role)
- [x] `friend_links` — added UPDATE policy; deleted wide-open policy; note: unlink UI not built yet, test UPDATE when UI is added
- [x] `friend_invites` — added SELECT + UPDATE policies for invitee; wide-open policy NOT yet deleted — gate: re-enable invite feature and test full create → accept flow first
- [x] `mirrors` — added UPDATE policy; deleted wide-open policy
- [x] `mirror_shares` — added UPDATE policy; deleted wide-open policy
- [x] `mirror_generation_requests` — confirmed scoped ALL covers everything; deleted wide-open policy
- [x] `feedback` — added scoped INSERT + SELECT (own rows only); deleted wide-open policies; note: SELECT policy exists only to support `.select()` return value on insert — feedback remains write-only from UX perspective
- [x] `users` — deleted duplicate SELECT policy ("Users can view own profile")

## Test Flows After Each Table

After each table's cleanup, test:
- `journals`: journal list loads, new entry saves, voice transcription completes
- `friend_links`: friends tab loads, unlink friend works
- `friend_invites`: create invite link, accept invite via link
- `mirrors`: mirror loads, reflection saves, viewed state updates
- `mirror_shares`: share a mirror, recipient sees it, viewed badge clears
- `mirror_generation_requests`: trigger mirror generation, polling resolves
- `feedback`: submit feedback from settings

---

## Migration Policies to Remove Later

Once `SELECT COUNT(*) FROM users WHERE auth_user_id IS NULL` = 0:
- Delete: "Allow migration for unlinked users" (UPDATE on users)
- Delete: "Users can select own unmigrated profile" (SELECT on users)
