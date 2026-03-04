# Oxbow Security & Privacy Plan — Pre-App Store

*Generated 2026-02-27. Target: App Store submission in ~6 weeks.*

---

## A) App Security Snapshot

### What's Sensitive
| Data | Sensitivity | Where It Lives |
|------|-------------|----------------|
| Journal text (spiritual/personal) | 🔴 Very high | Supabase `journals` table |
| Voice audio | 🔴 Very high | Device → Supabase Storage (deleted post-transcription) |
| Mirror content (AI reflection of journals) | 🔴 High | Supabase `mirrors` table |
| Access code | 🔴 High | Supabase `users` table + AsyncStorage (cleartext) |
| Display name | 🟡 Medium | Supabase `users` + AsyncStorage |
| Push token | 🟡 Medium | Supabase `users` |
| Friend relationships | 🟡 Medium | `friend_links` table |
| Focus areas / spiritual state | 🔴 High | `day_1_progress`, `mirrors` |

### Data Flows to Third Parties
1. **OpenAI** — Journal content sent via Edge Function for mirror generation; voice audio sent via Edge Function for Whisper transcription. User-facing disclosure: **none currently.**
2. **Sentry** — Error telemetry, breadcrumbs with user IDs, storage paths, journal IDs. No journal content confirmed.
3. **Expo Push Service** — Push tokens + notification payloads (sender name only). Acceptable.

### Trust Boundaries
```
[Device]  ──anon key──►  [Supabase REST/Realtime]  ──service key──►  [Edge Functions]
                                    │                                         │
                               (⚠️ wide open)                          (OpenAI / Whisper)
[Device]  ──────────────────────────────────────────────────────────►  [Sentry]
[Device]  ──anon key──►  [Supabase Storage]  (⚠️ wide open)
```

The anon key is in the app bundle. By design in Supabase, the anon key is public — security is supposed to come from RLS. RLS is currently not enforcing any isolation.

---

## B) Threat Model — Top 10

Rated: **L** = Likelihood (1–5), **I** = Impact (1–5), **Score** = L×I

| # | Threat | L | I | Score | Scenario |
|---|--------|---|---|-------|----------|
| 1 | **Database reads all users' data** | 5 | 5 | 25 | Attacker extracts the Supabase URL + anon key from the app bundle (2 min with Expo bundle unpack), then `curl`s the REST API. Gets every user's journal entries. |
| 2 | **Access code brute force** | 5 | 5 | 25 | Scheme is "firstname + 3 digits" — ~1,000 combinations per user. No rate limiting. Automated in seconds against a public app. |
| 3 | **Voice audio exfiltration** | 3 | 5 | 15 | Attacker enumerates open `users` table for UUIDs, constructs storage paths `{userId}/*.m4a`, downloads voice recordings during the transcription window. |
| 4 | **User impersonation / account takeover** | 4 | 5 | 20 | Brute-forced code → sign in as any user → read journals/mirrors, share their mirrors with others. |
| 5 | **Mass data write / corruption** | 3 | 4 | 12 | Anon key allows INSERT/UPDATE/DELETE on all open tables. Attacker could delete all journals or insert garbage for any user. |
| 6 | **Invite token abuse** | 2 | 3 | 6 | 72h expiry is app-enforced only. Token intercepted from a forwarded message can be replayed after expiry. Open `users` table means attacker can also forge `friend_links`. |
| 7 | **App Store rejection — missing privacy disclosure** | 4 | 4 | 16 | Apple requires disclosure of data sent to third parties (OpenAI). Missing this causes rejection or forced removal post-launch. |
| 8 | **App Store rejection — missing account deletion** | 5 | 4 | 20 | Hard Apple requirement since iOS 15.2 for apps with sign-in. No in-app "Delete Account" flow = rejection. |
| 9 | **Access code in device logs** | 2 | 4 | 8 | `auth.js` line 6 + 16 `console.log` the access code in plaintext. Would appear in Sentry if console capture is ever enabled. |
| 10 | **AsyncStorage session unencrypted** | 2 | 3 | 6 | On a jailbroken device, `starlight_access_code` and full user object are readable in plaintext. |

---

## C) Fix-First List — Before App Store

### 🔴 FIX-1 + FIX-2: New auth system (combined)
**Status:** 🔄 In progress — see `docs/AUTH_MIGRATION_PLAN.md` for full detail
- ✅ Phase 0: Twilio Verify + Supabase phone auth configured
- ✅ Phase 1: DB columns added (`auth_user_id`, `phone`, `auth_migrated_at`); RLS policies written but not yet enabled
- ✅ Phase 2: Client code rewritten (phone OTP auth, SecureStore session, AuthContext, new screens)
- ✅ Phase 3: 37 users pre-populated with E.164 phones; TestFlight build pushed — monitoring migration
- ⏳ Phase 4: Enable RLS — **gate: `SELECT COUNT(*) FROM users WHERE auth_user_id IS NULL` = 0**
- ⏳ Phase 5: Edge function JWT verification (`generate-mirror`, `transcribe-audio`, `delete-account`, etc.) — gate: all users on new client
- ⏳ Phase 6: Friend invite Universal Links — required before App Store submission

**Why:** The current access code auth bypasses Supabase Auth entirely — `auth.uid()` is always null, so all RLS policies are `USING (true)` (wide open). The access code scheme (`firstname + 3 digits`) is also brute-forceable. Both problems are solved together by migrating to phone OTP via Supabase Auth + Twilio Verify.

**What "good" looks like:**
- Users authenticate via phone OTP (Supabase Auth + Twilio Verify).
- The client holds a real Supabase JWT session; `auth.uid()` returns the user's ID in all RLS policies.
- RLS policies on `journals`, `mirrors`, `day_1_progress`, `friend_links`, `mirror_shares`, `users`, and `audio-recordings` storage enforce per-user isolation via `current_app_user_id()` helper.
- A user authenticated as Alice cannot read Bob's data via the Supabase client or REST API.

**Auth method chosen:** Phone OTP via Supabase Auth + Twilio Verify.

**RLS migration required once auth is chosen:**
```sql
-- journals
DROP POLICY "..." ON journals;
CREATE POLICY "Users can access own journals"
  ON journals FOR ALL
  USING (auth.uid() = custom_user_id);

-- mirrors
CREATE POLICY "Users can access own mirrors"
  ON mirrors FOR ALL
  USING (auth.uid() = custom_user_id);

-- mirror_shares (recipient OR sender)
CREATE POLICY "Users can access own shares"
  ON mirror_shares FOR ALL
  USING (auth.uid() = recipient_user_id OR auth.uid() = sender_user_id);

-- friend_links (either side of friendship)
CREATE POLICY "Users can access own friend links"
  ON friend_links FOR ALL
  USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

-- audio-recordings storage (path must start with user's own ID)
CREATE POLICY "Users can access own audio"
  ON storage.objects FOR ALL
  USING (bucket_id = 'audio-recordings' AND (storage.foldername(name))[1] = auth.uid()::text);
```

**Verify:** Sign in as User A. Then `curl 'https://[project].supabase.co/rest/v1/journals?select=*' -H 'apikey: [anon]'` → 0 rows. Sign in as User A with a valid session, query journals → only A's rows returned.

---

### 🔴 FIX-3: Remove access code from console.log
**Status:** ✅ Done
**Why:** `auth.js` lines 6 and 16 log the access code in plaintext. Would appear in Sentry if console capture is ever enabled; visible in device logs on development builds.

**What "good" looks like:** No credentials in any log output in production.

**Implementation:**
```js
// auth.js — replace lines 6 and 16:

// Before:
console.log('🧪 DEBUG: signInWithAccessCode called with:', accessCode);
console.log(`🔑 Custom auth: Signing in with code: ${accessCode}`);

// After:
if (__DEV__) console.log('🔑 Custom auth: Sign-in attempt');
```

**Verify:** Build a production bundle, check device logs — no access code should appear.

---

### 🟠 FIX-4: Add in-app account deletion flow
**Status:** ✅ Done
**Why:** Apple has required in-app account deletion for all apps with sign-in since iOS 15.2. Without it, the app will be rejected.

**What "good" looks like:** A "Delete Account" option in Settings that, when confirmed, deletes all of the user's journals, mirrors, `day_1_progress`, friend relationships, and the user record — then signs them out.

**Implementation:**
1. Add "Delete Account" button to `SettingsFeedbackModal.tsx` with a confirmation dialog.
2. Create a `deleteAccount(userId)` Edge Function that uses the service role key to cascade-delete: journals → mirrors → `day_1_progress` → `mirror_shares` → `friend_links` → `friend_invites` → `users` row.
3. On success, call `clearStoredAccessCode()` and navigate to auth screen.

**Verify:** Delete account → sign out → attempt sign-in with old code → should fail (user no longer exists).

---

### 🟠 FIX-5: Write and host a Privacy Policy
**Status:** 🔄 In progress — policy written (`docs/privacy_policy.md`), in-app link wired. Pending: host at public URL, update `PRIVACY_POLICY_URL` constant in `SettingsFeedbackModal.tsx`, add URL to App Store Connect.
**Why:** Apple requires a privacy policy URL for all apps. Users need to know their spiritual journal content is processed by OpenAI.

**What "good" looks like:** A URL (GitHub Pages or similar) linked from App Store Connect and from the in-app Settings screen. Must cover: what data is collected, that voice/text is sent to OpenAI, retention policy (journals stored indefinitely, audio deleted post-transcription), and contact info for data requests.

**Key sections to include:**
- Data collected (journal text, voice audio, display name, push token)
- Third parties: OpenAI ("We send voice recordings and journal text to OpenAI for transcription and AI reflection generation. OpenAI's privacy policy: [link]")
- Data retention: journals/mirrors stored until account deletion; audio deleted immediately after transcription
- User rights: how to request data deletion (link to in-app Delete Account)
- Contact email

**Verify:** Privacy policy URL resolves; Settings screen links to it.

---

### 🟠 FIX-6: Complete App Store Privacy Nutrition Label
**Status:** ⬜ Not started
**Why:** Apple will reject or require post-launch update if inaccurate. Reviewers now check for undisclosed third-party data sharing.

**Declarations required:**
- **Identifiers → User ID** — Used for app functionality, linked to identity
- **Audio Data** — Voice journals, used for app functionality, linked to identity; shared with OpenAI (third party)
- **Other Data** — Journal text / mirror content, used for app functionality, linked to identity; shared with OpenAI (third party)
- **Contact Info → Name** — Display name, used for app functionality

**Verify:** Review in App Store Connect → Privacy before submission; compare against Apple's [privacy details guide](https://developer.apple.com/app-store/app-privacy-details/).

---

### 🟡 FIX-7: Harden microphone permission string
**Status:** ✅ Done
**Why:** Apple reviews permission strings for specificity. Generic strings get flagged during review.

**What "good" looks like:** The string explains the specific user benefit and mentions deletion.

**Implementation** (`app.config.js`):
```js
"NSMicrophoneUsageDescription": "Oxbow uses your microphone to record voice journal entries. Recordings are transcribed on our servers and then deleted."
```

**Verify:** Fresh install on device — iOS permission dialog shows this exact string.

---

### 🟡 FIX-8: Confirm audio deletion in Edge Function + add safety net
**Status:** ✅ Done
**Why:** Migration comments say audio is "deleted after transcription" but this must be verified in the actual Edge Function code. Voice recordings of spiritual content should not persist.

**What "good" looks like:** `audio-recordings/{userId}/{jobId}.m4a` is deleted from Supabase Storage immediately after successful transcription, with logging on deletion. A cleanup job removes any orphaned files older than 24 hours.

**Implementation:**
1. Read `supabase/functions/transcribe-audio/index.ts` — confirm the storage delete call exists after successful transcription.
2. If missing, add: `await supabase.storage.from('audio-recordings').remove([storagePath])` and log the deletion.
3. Add a scheduled cleanup Edge Function (`cleanup-orphaned-audio`) that deletes any `audio-recordings` files older than 24 hours.

**Verify:** Record a voice journal → wait for transcription → check Supabase Storage dashboard — file should be gone.

---

### 🟡 FIX-9: Invite expiry enforcement
**Status:** ✅ Done (client layer — full server enforcement depends on FIX-1+2)
**Notes:** Expiry check existed in `acceptInvite`. Added matching check to `getInviterInfo`, which previously returned inviter info for expired tokens. Both client-side paths now reject expired tokens. True server-side enforcement requires FIX-1+2 (once auth is in place, invite acceptance can be moved to an Edge Function with the service role key).

---

## D) Later List (Post-Launch)

Not blocking for launch given the current small, known user base:

- **Encrypt AsyncStorage session** — Use `expo-secure-store` for the access code instead of AsyncStorage. Matters primarily on jailbroken devices.
- **Session revocation** — Add an `is_revoked` flag to sessions so you can lock out a compromised account without deleting it.
- **Sentry PII scrubbing** — Configure `beforeSend` to strip breadcrumb data containing user IDs and storage paths before transmission.
- **OpenAI DPA** — If GDPR/CCPA apply to your user base, consider whether you need a Data Processing Agreement with OpenAI given you're processing personal spiritual content.
- **Supabase Storage lifecycle rules** — Automate audio file deletion via a scheduled function as a belt-and-suspenders backup to Edge Function deletion.
- **Friend invite token hashing** — Store `sha256(token)` in DB instead of plaintext UUID so a DB breach doesn't expose usable tokens.
- **Rate limit mirror generation server-side** — 24h rate limit is currently client-side logic only. Move to Edge Function.

---

## E) App Store Readiness Checklist

| Check | Status | Action |
|-------|--------|--------|
| Privacy Policy URL | ❌ Missing | FIX-5 |
| Privacy Nutrition Label | ❌ Missing | FIX-6 |
| `NSMicrophoneUsageDescription` | ⚠️ Generic | FIX-7 |
| OpenAI data sharing disclosed | ❌ Missing | FIX-5, FIX-6 |
| In-app account deletion | ❌ Missing | FIX-4 |
| Database isolation | ⚠️ RLS written, not yet enabled | FIX-1+2 Phase 4 |
| Guessable access codes | ⚠️ Phone OTP shipped to TestFlight | FIX-1+2 Phase 3 |
| Access code in logs | ❌ Present | FIX-3 |
| Audio deleted post-transcription | ⚠️ Unverified | FIX-8 |
| Invite expiry server-enforced | ⚠️ Client-only | FIX-9 |
| Deep link scheme `oxbow://` | ✅ Fine | — |
| Sentry — no journal content | ✅ Confirmed | — |
| Push notification payload | ✅ Fine (sender name only) | — |
| OpenAI key not in client bundle | ✅ Confirmed | — |
| Audio permission timing (AppState wait) | ✅ Fixed | — |

---

## Execution Timeline

| Week | Work |
|------|------|
| **Now** | FIX-3 — remove access code from logs (30 min) |
| **Week 1–3** | FIX-1+2 — new auth system + RLS lockdown (largest lift; database isolation follows automatically once auth is in place) |
| **Week 2** | FIX-8 — verify + harden audio deletion |
| **Week 2** | FIX-9 — invite expiry in Edge Function |
| **Week 3** | FIX-4 — account deletion flow |
| **Week 3** | FIX-5 — write and host privacy policy |
| **Week 4** | FIX-6 — App Store privacy nutrition label |
| **Week 4** | FIX-7 — permission strings |
| **Week 5** | End-to-end security verification; fix any gaps |
| **Week 6** | Submit |
