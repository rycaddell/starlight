# Auth Migration Plan: Phone Number OTP via Supabase Auth

**Decision date:** 2026-03-01
**Target:** App Store launch in 6–7 weeks

---

## Progress Log

| Phase | Status | Date | Notes |
|---|---|---|---|
| Phase 0: Twilio Verify + Supabase config | ✅ Complete | 2026-03-03 | Verified SMS delivery to real device |
| Phase 1: DB columns + RLS policies written | ✅ Complete | 2026-03-03 | RLS not yet enabled — awaiting migration |
| Phase 2: Client code changes | ✅ Complete | 2026-03-03 | All 8 files + 3 post-test fixes |
| Phase 2 testing | ✅ Verified | 2026-03-03 | New user sign-up, OTP, onboarding, returning user |
| Phase 3: Pre-flight complete | ✅ Ready to ship | 2026-03-03 | 37 users, all phones validated E.164, access_code NOT NULL dropped |
| Phase 3: TestFlight build pushed | ⏳ In progress | | Monitor: `SELECT COUNT(*) FROM users WHERE auth_user_id IS NULL AND group_name != 'Demo Users'` |
| Phase 4: Enable RLS | ✅ Complete | 2026-03-06 | Verified working on own account |
| Phase 5: Edge function JWT auth | ✅ Complete | 2026-03-06 | All 5 functions verified; client call sites updated |
| Phase 6: Friend invite Universal Links | ⏳ Pending | | Required before App Store submission |

---

## Decision Summary

Replacing custom access-code auth (AsyncStorage-only, no Supabase session, RLS unenforced) with **phone number OTP via Supabase Auth + Twilio Verify**.

**Why phone OTP:** Primary growth vector is friend invites. Phone OTP has meaningfully lower drop-off at the sign-up screen than email magic link — no app switching, no spam folder, no deep link callback.

**Why Twilio Verify over raw Twilio SMS:**
- No 10DLC carrier registration required (Twilio's compliance burden, not yours)
- Works on day one — no 2–4 week approval window
- Better deliverability via verified sender identity
- Branded sender name ("Your Oxbow verification code is...")
- Portable: switching to raw SMS later is a Supabase dashboard config change, zero user impact

**Why not SIWA:** No existing social logins → Apple doesn't require it. SIWA hides user emails, complicating future communications.

---

## Architecture Overview

```
NEW USER
  Enter phone number
    → Supabase sends OTP via Twilio Verify ("Your Oxbow code is 482910")
    → User enters 6-digit code in-app (iOS autofills from SMS)
    → Supabase session established (JWT + refresh token in SecureStore)
    → Narrative onboarding Step 1 asks "What's your name?"
      → completeProfileSetup() called here — creates users row
    → Day 1 → journal screen

RETURNING USER
  Enter phone number → OTP → code → session restored (all data intact)

INVITED FRIEND (no app installed)
  Tap https://oxbowjournal.com/invite/[token]
    → Browser landing page: "Download Oxbow" + App Store link
    → After install: enter phone → OTP → onboarding → friend linked
  (Universal Link deferred deep link = Phase 4)

SESSION
  JWT + refresh token stored in SecureStore (expo-secure-store)
  Survives app restart. Reinstall = 30-second re-auth. All data intact.
```

### No separate NameCaptureScreen needed

The narrative onboarding already captures the user's name at Step 1. `completeProfileSetup()` (which creates the `users` row) should be called there — not in a separate screen. This eliminates one screen and one routing state.

Routing simplifies to:
```
if (!isAuthenticated)    → PhoneAuthScreen
if (!onboardingComplete) → NarrativeOnboardingScreen
else                     → TabNavigator
```

`isNewUser` in `AuthContext` remains useful as a flag to know whether Step 1 needs to call `completeProfileSetup()` or just update `display_name` on an existing row.

### Acquisition source tracking

`group_name` on the `users` row captures how the user found the app. Set at account creation and never changed.

| Value | When set |
|---|---|
| `'Organic'` | Downloaded from App Store with no referral |
| `'Friend Invite'` | Arrived via a friend invite link (`/invite/[token]`) |
| `'Mirror Share'` | Arrived via a shared mirror link |

`completeProfileSetup()` accepts an optional `acquisitionSource` param (defaults to `'Organic'`). The deferred deep link handler (Phase 6) reads the stored invite/share token from SecureStore before calling `completeProfileSetup` and passes the appropriate source.

```typescript
// lib/supabase/auth.js — completeProfileSetup signature
export const completeProfileSetup = async (
  authUserId,
  phone,
  displayName,
  acquisitionSource = 'Organic'  // 'Organic' | 'Friend Invite' | 'Mirror Share'
) => {
  await supabase.from('users').insert({
    auth_user_id: authUserId,
    phone,
    display_name: displayName,
    status: 'active',
    group_name: acquisitionSource,
    first_login_at: new Date().toISOString(),
  });
};
```

This requires no new DB column — `group_name` is already on the table. Organic users are easy to segment: `WHERE group_name = 'Organic'`. Referral-driven users retain the link to their referral via `invited_by` (already on the users table).

---

## Critical Sequencing Rules

Violating any of these breaks existing users. Treat them as hard gates.

**Rule 1 — Phone numbers before build ships**
Pre-populate and validate all 30 phone numbers before pushing the migration build to TestFlight. The migration match is an exact E.164 string comparison. A mismatch means that user gets treated as brand new and loses apparent access to their data. See Phase 1.2 for validation steps.

**Rule 2 — RLS enabled only after migration confirmed**
Do not run `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` until `SELECT COUNT(*) FROM users WHERE auth_user_id IS NULL` returns 0. Enabling RLS while old sessions are still active makes all data invisible — `auth.uid()` is null in the old client, so every query returns empty. Data isn't gone, but it looks gone.

Gate: zero unmigrated users → then and only then enable RLS.

**Rule 3 — Edge functions updated only after all users are on new client**
Updated edge functions require a JWT `Authorization` header. Old builds don't send one. If you deploy edge function updates while any user is still on the old build, their mirror generation and transcription calls fail with 401. From their perspective the spinner just never resolves.

Gate: all users on new client, edge function updates deployed as a separate step after.

---

## Phase 0: Prerequisites (Day 1)

### 0.1 Twilio Verify setup

1. Sign up at twilio.com
2. Console → Verify → Services → Create Service
   - Friendly name: `Oxbow` (appears in SMS: "Your Oxbow verification code is...")
   - Enable SMS channel
   - Code length: 6
   - Code expiry: 10 minutes
3. Note your **Service SID** (starts with `VA...`)
4. Note your **Account SID** and **Auth Token** from Console home

No 10DLC registration required. Verify uses Twilio's own verified sender infrastructure.

**Future migration note:** When you're ready to switch to raw SMS (cost optimization at scale), complete 10DLC registration first, then swap the Supabase provider config. Zero user impact.

### 0.2 Supabase: Enable Phone Auth with Twilio Verify

Dashboard → Authentication → Providers → Phone:

```
Enable phone provider: ON
SMS provider: Twilio Verify
  Account SID: [from Twilio console]
  Auth Token: [from Twilio console]
  Verify Service SID: [VA... from Verify Service]

OTP expiry: 600 (10 minutes)
OTP length: 6
```

### 0.3 Supabase test phone numbers

Dashboard → Authentication → Phone → Test phone numbers:

```
+15550000001  →  123456
+15550000002  →  123456
+15550000003  →  123456
(add as many as needed for testing)
```

These never call Twilio. Full auth flow, real sessions. Disabled automatically in production.

### 0.4 Apple App Site Association (friend invite Universal Links)

Auth doesn't need a deep link callback. This file is only needed for friend invite Universal Links.

Host at `https://oxbowjournal.com/.well-known/apple-app-site-association` (no `.json` extension):

```json
{
  "applinks": {
    "details": [
      {
        "appIDs": ["[YOUR_TEAM_ID].com.caddell.oxbow"],
        "components": [
          { "/": "/invite/*" }
        ]
      }
    ]
  }
}
```

---

## Phase 1: Database — Additive Changes Only (Day 1–2)

These changes are safe to run immediately. They add columns; nothing existing breaks.

### 1.1 Add columns to `users` table

```sql
ALTER TABLE users
  ADD COLUMN phone TEXT UNIQUE,
  ADD COLUMN auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN auth_migrated_at TIMESTAMPTZ;

CREATE INDEX idx_users_auth_user_id ON users(auth_user_id);
```

`users.phone` mirrors `auth.users.phone` for migration matching. Both must be E.164 format (e.g. `+15551234567`).

### 1.2 Pre-populate and validate phone numbers for existing 30 users

**Do this before shipping the migration build.**

All phones must be stored in strict E.164 format: `+` followed by country code and number, no spaces, no dashes, no parentheses. US example: `+15551234567`.

```sql
UPDATE users SET phone = '+15551234567' WHERE id = 'uuid-here';
-- repeat for each user
```

**Validation — all three queries must return zero rows before proceeding:**

```sql
-- 1. Any users without a phone number
SELECT id, display_name
FROM users
WHERE phone IS NULL;

-- 2. Any phones not in E.164 format (must start with +)
SELECT id, display_name, phone
FROM users
WHERE phone NOT LIKE '+%';

-- 3. Any phones with formatting characters (spaces, dashes, parens)
SELECT id, display_name, phone
FROM users
WHERE phone ~ '[\s\-\(\)]';
```

**Pre-flight review process:**
Before running SQL, prepare your phone list in a spreadsheet or text file with two columns: display_name and raw number as you have it. Review for:
- Any numbers missing country code (e.g. `5551234567` → should be `+15551234567`)
- Any numbers with formatting (e.g. `(555) 123-4567` → `+15551234567`)
- Any international numbers (non-US) — confirm country code is correct

If you share the list here (names optionally redacted), the format can be verified before any SQL runs.

### 1.3 Write RLS policies (do NOT enable yet)

Write and review all policies now. Enable them only after Phase 3 migration is confirmed complete.

```sql
-- ============================================
-- Helper function: resolves auth session → app user ID
-- STABLE = Postgres caches result per query (performance)
-- SECURITY DEFINER = runs as owner, bypasses RLS on users table
-- ============================================
CREATE OR REPLACE FUNCTION current_app_user_id()
RETURNS UUID AS $$
  SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ============================================
-- users table
-- ============================================
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can create own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

-- ============================================
-- journals table
-- ============================================
CREATE POLICY "Users can view own journals"
  ON journals FOR SELECT
  USING (custom_user_id = current_app_user_id());

CREATE POLICY "Users can create own journals"
  ON journals FOR INSERT
  WITH CHECK (custom_user_id = current_app_user_id());

CREATE POLICY "Users can delete own journals"
  ON journals FOR DELETE
  USING (custom_user_id = current_app_user_id());

-- ============================================
-- mirrors table
-- ============================================
CREATE POLICY "Users can view own mirrors"
  ON mirrors FOR SELECT
  USING (custom_user_id = current_app_user_id());

-- ============================================
-- day_1_progress table
-- ============================================
CREATE POLICY "Users can view own day1 progress"
  ON day_1_progress FOR SELECT
  USING (user_id = current_app_user_id());

CREATE POLICY "Users can update own day1 progress"
  ON day_1_progress FOR UPDATE
  USING (user_id = current_app_user_id());

-- ============================================
-- mirror_generation_requests table
-- ============================================
CREATE POLICY "Users can manage own generation requests"
  ON mirror_generation_requests FOR ALL
  USING (custom_user_id = current_app_user_id())
  WITH CHECK (custom_user_id = current_app_user_id());

-- ============================================
-- mirror_shares table
-- ============================================
CREATE POLICY "Users can view shares they sent or received"
  ON mirror_shares FOR SELECT
  USING (
    sender_user_id = current_app_user_id()
    OR recipient_user_id = current_app_user_id()
  );

-- ============================================
-- friend_links table
-- ============================================
CREATE POLICY "Users can view own friend links"
  ON friend_links FOR SELECT
  USING (
    user_a_id = current_app_user_id()
    OR user_b_id = current_app_user_id()
  );

-- ============================================
-- friend_invites table
-- ============================================
CREATE POLICY "Users can view own invites"
  ON friend_invites FOR SELECT
  USING (inviter_user_id = current_app_user_id());
```

---

## Phase 2: Client Changes (Day 2–5)

### 2.1 Install expo-secure-store

```bash
npx expo install expo-secure-store
```

### 2.2 Update Supabase client

`lib/supabase/client.js`:

```javascript
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';

const ExpoSecureStoreAdapter = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
```

### 2.3 Rewrite `lib/supabase/auth.js`

```javascript
import { supabase } from './client';

export const sendPhoneOTP = async (phone) => {
  const { error } = await supabase.auth.signInWithOtp({ phone });
  return error
    ? { success: false, error: error.message }
    : { success: true };
};

export const verifyPhoneOTP = async (phone, token) => {
  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: 'sms',
  });
  return error
    ? { success: false, error: error.message }
    : { success: true, session: data.session };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return error ? { success: false, error: error.message } : { success: true };
};
```

### 2.4 Rewrite `contexts/AuthContext.tsx`

Key architectural decisions:
- `onAuthStateChange` sets session state only (synchronous) — no async Supabase calls inside the callback, which can cause deadlocks
- A separate `useEffect` watching `session` handles async user resolution
- `resolveAppUser` handles both returning users (fast path) and migration (phone match)
- `isNewUser` state gates routing to name capture screen

```typescript
interface AuthContextType {
  user: CustomUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isNewUser: boolean;
  sendOTP: (phone: string) => Promise<{ success: boolean; error?: string }>;
  verifyOTP: (phone: string, token: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  completeProfileSetup: (displayName: string) => Promise<{ success: boolean; error?: string }>;
}

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState<CustomUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);

  // Step 1: Listen for auth state — synchronous only, no Supabase calls here
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        if (!session) {
          setUser(null);
          setIsNewUser(false);
          setIsLoading(false);
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  // Step 2: Resolve app user when session changes — async, safe here
  useEffect(() => {
    if (session?.user) {
      resolveAppUser(session.user);
    }
  }, [session]);

  const resolveAppUser = async (authUser) => {
    // Fast path: already linked (returning user post-migration)
    let { data } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', authUser.id)
      .maybeSingle();

    // Migration path: existing user signing in for the first time with phone auth
    if (!data && authUser.phone) {
      const { data: byPhone } = await supabase
        .from('users')
        .select('*')
        .eq('phone', authUser.phone)
        .is('auth_user_id', null)
        .maybeSingle();

      if (byPhone) {
        await supabase
          .from('users')
          .update({
            auth_user_id: authUser.id,
            auth_migrated_at: new Date().toISOString(),
          })
          .eq('id', byPhone.id);

        data = { ...byPhone, auth_user_id: authUser.id };
      }
    }

    if (data) {
      setUser(data);
      setIsNewUser(false);
      await syncPushToken(data);
    } else {
      // Genuinely new user — no existing row found
      setIsNewUser(true);
    }

    setIsLoading(false);
  };

  // Called from NarrativeOnboardingScreen Step 1 (name input)
  // Only called when isNewUser = true (no existing users row)
  const completeProfileSetup = async (displayName: string) => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return { success: false, error: 'No auth session' };

    const { data, error } = await supabase
      .from('users')
      .insert({
        auth_user_id: authUser.id,
        phone: authUser.phone,
        display_name: displayName.trim(),
        status: 'active',
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    setUser(data);
    setIsNewUser(false);
    return { success: true };
  };

  // ⚠️ Stuck loop risk: if completeProfileSetup fails (network drop, DB error),
  // the user has a valid auth session but no users row. Every app open lands
  // them back at Step 1 of onboarding. They fill in their name, it fails again.
  //
  // Required handling in NarrativeOnboardingScreen Step 1:
  // - Show a clear error state: "Something went wrong. Tap to try again."
  // - Do not silently swallow the error or advance the step on failure
  // - The retry is just re-calling completeProfileSetup — no special logic needed
  // - If error persists across retries, show: "Having trouble? Contact support."
  // - This is the only point in the app where a user can get genuinely stuck

  const syncPushToken = async (appUser: CustomUser) => {
    try {
      const token = await Notifications.getExpoPushTokenAsync();
      if (token.data && token.data !== appUser.push_token) {
        await supabase
          .from('users')
          .update({ push_token: token.data })
          .eq('id', appUser.id);
      }
    } catch {
      // Best-effort, never block auth on push token
    }
  };

  // ... sendOTP, verifyOTP, signOut implementations
};
```

### 2.5 New auth screens

**`components/auth/PhoneAuthScreen.tsx`**
```
- App logo
- "Enter your phone number"
- Country code picker (default: +1) + number input
- Format display as user types: (555) 123-4567
- Submit in E.164: +15551234567
- "Continue" button — disabled until valid number entered
- Fine print: "We'll text you a one-time code"

States: idle → loading ("Sending code...") → error (inline)
```

**`components/auth/OTPVerifyScreen.tsx`**
```
- "We texted a code to [number]"
- 6-digit input, large, centered, auto-focus
- textContentType="oneTimeCode" — iOS autofills from SMS
- Auto-submit on 6th digit — no extra tap
- "Resend code" — disabled 30s after send, then enabled
- "Use a different number" → back to PhoneAuthScreen

States: idle → loading ("Verifying...") → error ("Incorrect code. Try again.")
Supabase allows 3 attempts before the OTP is invalidated.
```

No `app/auth/callback.tsx` needed — OTP is verified in-app.

No separate `NameCaptureScreen` needed — name is captured in `NarrativeOnboardingScreen` Step 1.

**Change required in `NarrativeOnboardingScreen.tsx` Step 1:**
- When `isNewUser = true`: on name submission, call `completeProfileSetup(name)` before advancing
- When `isNewUser = false` (returning user somehow in onboarding): just update `display_name` on the existing row
- Handle error state explicitly — see stuck loop note in AuthContext above

### 2.6 Update routing in `app/_layout.tsx`

```typescript
if (isLoading)               → <SplashScreen />
if (!isAuthenticated)        → <PhoneAuthScreen />
if (!onboardingComplete)     → <NarrativeOnboardingScreen />
else                         → <TabNavigator />
```

`isNewUser` is consumed inside `NarrativeOnboardingScreen` (to know whether Step 1 should call `completeProfileSetup`) — it does not need its own route.

### 2.7 Update `app.config.js` for Universal Links

```javascript
ios: {
  associatedDomains: ['applinks:oxbowjournal.com']
}
```

### 2.8 Update account deletion flow

**Status:** Partially implemented. `supabase/functions/delete-account/index.ts` exists and handles all app data deletion. Two additions are deferred to Phase 5 (per Rule 3 — old clients don't send a JWT):

**What's already built (`supabase/functions/delete-account/index.ts`):**
Deletion order: audio Storage → profile pictures → `mirror_shares` → `mirror_generation_requests` → `transcription_jobs` → `day_1_progress` → `journals` → `mirrors` → `friend_links` → `friend_invites` → `users` row.

**What Phase 5 must add:**
```typescript
// 1. Verify JWT — only the authenticated user can call this
const authHeader = req.headers.get('Authorization');
const { data: { user }, error } = await supabaseClient.auth.getUser(
  authHeader?.replace('Bearer ', '')
);
if (!user) return new Response('Unauthorized', { status: 401 });

// ... (existing app data deletion) ...

// 4. Delete auth.users record (requires supabaseAdmin with service role key):
await supabaseAdmin.auth.admin.deleteUser(user.id);
```

See Phase 5 below — `delete-account` is included in the JWT migration batch.

---

## Phase 2 Post-Implementation Fixes (Found in Testing)

Three bugs were caught during the first test run of the new auth flow. All fixed.

### Fix 1 — `access_code` NOT NULL constraint

**Error:** `null value in column "access_code" of relation "users" violates not-null constraint`

**Cause:** `completeProfileSetup()` INSERTs a new `users` row without an `access_code`. The column still had a `NOT NULL` constraint from the old auth system.

**Fix — SQL (already run):**
```sql
ALTER TABLE users ALTER COLUMN access_code DROP NOT NULL;
```

Safe: no data touched, existing rows retain their access codes.

---

### Fix 2 — `OnboardingNavigator` null check treated new users as "complete"

**Symptom:** After OTP verification, white screen instead of narrative onboarding.

**Cause:** `OnboardingNavigator` checked `user?.onboarding_completed_at !== null` to decide whether to render. For new users (`user = null`), `null?.onboarding_completed_at` evaluates to `undefined`, and `undefined !== null` is `true` — so it returned `null` and showed nothing.

**Fix** (`components/onboarding/OnboardingNavigator.tsx`):
```typescript
// Before (broken for null user):
const isOnboardingComplete = user?.onboarding_completed_at !== null;

// After (handles null user correctly):
const isOnboardingComplete = !!user?.onboarding_completed_at;
```

---

### Fix 3 — Name entry screen flash for returning users

**Symptom:** Returning user logs back in; narrative onboarding name-entry screen flashes briefly before the main app appears.

**Cause:** `isLoading` was only set to `true` on the very first app load. When a session change (OTP verification or app restart with stored session) triggered a second `resolveAppUser()` call, `isLoading` was already `false`. For a few frames: `isAuthenticated = true`, `user = null` (DB call in flight), `isOnboardingComplete = false` → name-entry screen visible.

**Fix** (`contexts/AuthContext.tsx`):
```typescript
const resolveAppUser = async () => {
  setIsLoading(true); // ← added: show spinner on every resolve, not just first load
  ...
```

---

## Phase 3: Ship to TestFlight + Migrate (Week 2)

### Before pushing the build
- [x] All 37 users have E.164 phone numbers in `users.phone`
- [x] Validation queries return zero rows
- [x] Twilio Verify service is live and tested with your own number
- [x] Test phone numbers configured in Supabase for simulator testing

### When users update the app
They see the phone number screen. They enter their number, receive the OTP, enter it, and land in the main app with all their data. `resolveAppUser` finds their row by phone, links `auth_user_id`, sets `auth_migrated_at`.

### Monitor migration progress
```sql
-- Run this daily until it returns 0
SELECT COUNT(*) FROM users WHERE auth_user_id IS NULL;
```

Anyone still at zero after 2 weeks: contact them directly.

### Migration window
Keep a "trouble signing in? contact us" note visible for 3 weeks. After confirmed migration of all 30 users, remove the access code code path in the next release.

---

## Phase 4: Enable RLS (After Migration Confirmed)

Only run this after `SELECT COUNT(*) FROM users WHERE auth_user_id IS NULL` returns 0 and you've confirmed all 30 users are on the new client.

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE mirrors ENABLE ROW LEVEL SECURITY;
ALTER TABLE day_1_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE mirror_generation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE mirror_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_invites ENABLE ROW LEVEL SECURITY;
```

**Test immediately after enabling:**
```sql
-- In Supabase SQL editor — should return only that user's rows
SET request.jwt.claim.sub = 'a-real-auth-user-id';
SELECT * FROM journals LIMIT 5;
```

Also test Realtime subscriptions (friend_links, mirror_shares) — RLS applies to Realtime events. Verify badge updates still fire correctly.

---

## Phase 5: Update Edge Functions (After RLS Confirmed Working)

Update all edge functions to verify JWT instead of trusting caller-supplied userId. Deploy only after all users are on the new client.

Pattern to apply to `generate-mirror`, `generate-day-1-mirror`, `transcribe-audio`, `extract-focus-theme`, `delete-account`:

```typescript
// BEFORE (untrusted — remove this)
const { userId } = await req.json();

// AFTER (JWT-verified)
const authHeader = req.headers.get('Authorization');
const { data: { user }, error } = await supabaseClient.auth.getUser(
  authHeader?.replace('Bearer ', '')
);
if (!user) return new Response('Unauthorized', { status: 401 });

const { data: appUser } = await supabaseAdmin
  .from('users')
  .select('id')
  .eq('auth_user_id', user.id)
  .single();

const userId = appUser.id;
```

Also update the client to pass the session token when calling edge functions:

```typescript
const session = await supabase.auth.getSession();
await supabase.functions.invoke('generate-mirror', {
  headers: {
    Authorization: `Bearer ${session.data.session?.access_token}`,
  },
});
```

---

## Phase 6: Friend Invite — New User Onboarding (Week 2–3)

### Current behavior (broken for new users)
`oxbow://friend-invite/[token]` — custom scheme, only works if app installed.

### Target behavior
- `https://oxbowjournal.com/invite/[token]` — Universal Link
- App installed: opens directly to invite handler
- App not installed: browser landing page → App Store → install → friend linked after auth

### Landing page
Simple static HTML (Vercel or Netlify):
```html
<h1>[Inviter] invited you to Oxbow</h1>
<p>A space to reflect on where God is leading you.</p>
<a href="https://apps.apple.com/app/id[APP_ID]">Download on the App Store</a>
<p>After installing, your friendship will connect automatically.</p>
```

### Deferred deep link (no third-party SDK)
- Landing page generates a short readable code (`OX-7K2M`) mapped to the invite token server-side
- Name capture screen shows: "Were you invited by a friend? Enter their invite code."
- Simple, reliable, no Branch.io or Firebase Dynamic Links required

### `app/invite/[token].tsx`
```typescript
// If authenticated → process invite → navigate to friends tab
// If not authenticated → save token + source to SecureStore → proceed through auth
//   → after resolveAppUser completes, check SecureStore for pending token → process it
```

### Acquisition source handoff

When a new user arrives via invite or mirror share, save the source to SecureStore before they enter the auth flow. `completeProfileSetup` reads it at account creation time.

```typescript
// In invite/share handler (before auth):
await SecureStore.setItemAsync('pending_acquisition_source', 'Friend Invite');
await SecureStore.setItemAsync('pending_invite_token', token);

// In completeProfileSetup (NarrativeOnboardingScreen Step 1):
const source = await SecureStore.getItemAsync('pending_acquisition_source') ?? 'Organic';
await completeProfileSetup(displayName, source);
await SecureStore.deleteItemAsync('pending_acquisition_source');
await SecureStore.deleteItemAsync('pending_invite_token');
```

Mirror share referrals follow the same pattern with `'Mirror Share'` as the source value.

---

## Testing Checklist

### Auth — happy path
- [ ] New user: enter phone → SMS from "Oxbow" received < 10 seconds
- [ ] iOS SMS autofill appears and works
- [ ] Auto-submit on 6th digit (no extra tap)
- [ ] Name capture screen appears for new user
- [ ] Lands in narrative onboarding after name entry
- [ ] Session persists across app restarts

### Auth — error states
- [ ] Wrong OTP: "Incorrect code. Try again." (up to 3 attempts)
- [ ] Expired OTP (>10 min): clear error + resend path
- [ ] Resend: disabled 30s, then enabled
- [ ] Network offline during OTP send: clear error, not silent failure
- [ ] Reinstall: re-auth takes <30s, all data intact

### Migration
- [ ] All 30 users have E.164 phone pre-populated before build ships
- [ ] Existing user signs in → all journals and mirrors visible immediately
- [ ] `auth_user_id` set on row, `auth_migrated_at` timestamp present
- [ ] Second sign-in resolves by `auth_user_id` (fast path)

### RLS (run after Phase 4)
- [ ] User A cannot read User B's journals (Supabase SQL editor test)
- [ ] Mirrors only visible to owner
- [ ] Mirror shares visible to sender and recipient only
- [ ] Realtime badge subscriptions (friend_links, mirror_shares) still fire

### Edge functions (run after Phase 5)
- [ ] `generate-mirror` returns 401 with no Authorization header
- [ ] `transcribe-audio` returns 401 with no Authorization header
- [ ] Mirror generation works end-to-end with new auth

### Friend invite
- [ ] Existing user taps Universal Link → app opens, invite processed
- [ ] New user: landing page visible, App Store link works
- [ ] Short code → invite token mapping works

### Account deletion
- [ ] All app data deleted
- [ ] `auth.users` record deleted
- [ ] Signing in again with same phone creates a fresh account with no data

### Push tokens
- [ ] New device sign-in updates `users.push_token`
- [ ] Notifications arrive after re-auth

---

## Rollout Timeline

| Week | Phase | Action |
|---|---|---|
| 1 | 0–2 | Twilio Verify setup, DB columns, write RLS policies, build auth screens |
| 2 | 3 | Push to TestFlight, notify 30 users, monitor migration |
| 2–3 | 4 | Confirm all migrated → enable RLS → verify Realtime |
| 3 | 5 | Deploy updated edge functions |
| 3–4 | 6 | Friend invite Universal Links |
| 5 | — | Full end-to-end test, all flows |
| 6 | — | App Store submission |

### Rollback plan
New columns are additive — existing data is never touched. If migration breaks for any user, revert to the previous TestFlight build. Access code auth still works against the unchanged data. Fix and re-ship.

---

## Files to Create / Modify

### New
```
components/auth/PhoneAuthScreen.tsx
components/auth/OTPVerifyScreen.tsx
app/invite/[token].tsx
supabase/functions/delete-account/index.ts  ← ✅ Created (app data deletion only; JWT + auth.users deletion deferred to Phase 5)
```

### Modified
```
lib/supabase/client.js                         ← SecureStore adapter
lib/supabase/auth.js                           ← sendPhoneOTP, verifyPhoneOTP, signOut
contexts/AuthContext.tsx                       ← Full rewrite
app/_layout.tsx                                ← Simplified routing (remove isNewUser route)
app.config.js                                  ← associatedDomains
components/onboarding/NarrativeOnboardingScreen.tsx
  ← Step 1: call completeProfileSetup() on name submit when isNewUser=true
  ← Step 1: add explicit error state for profile creation failure (stuck loop prevention)
supabase/functions/generate-mirror/index.ts    ← JWT auth (Phase 5)
supabase/functions/generate-day-1-mirror/index.ts ← JWT auth (Phase 5)
supabase/functions/transcribe-audio/index.ts   ← JWT auth (Phase 5)
supabase/functions/extract-focus-theme/index.ts ← JWT auth (Phase 5)
```

### Removed (after migration window)
```
signInWithAccessCode()
createAccessCode()
autoSignInWithStoredCode()
AsyncStorage keys: starlight_current_user, starlight_access_code
```
