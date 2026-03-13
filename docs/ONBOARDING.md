# Oxbow - New Engineer Onboarding Guide

Welcome to Oxbow! This guide will help you understand the core features, workflows, and key insights to get you productive quickly.

---

## 🎯 What is Oxbow?

Oxbow is a **spiritual journaling mobile app** that:
1. Lets users capture journal entries via **text or voice**
2. Transcribes voice recordings automatically using **OpenAI Whisper** (server-side via Edge Function)
3. Generates **AI-powered spiritual reflections** ("Mirrors") after 10+ journal entries
4. Enables **friend connections** via invite links for shared spiritual growth
5. Allows users to **share mirrors** with friends for mutual encouragement
6. Provides a progression system that encourages regular journaling

**Target Platforms:** iOS (primary; App Store target), Android and Web supported by Expo

---

## 🚀 Getting Started

### First-Time Setup

1. **Clone and install:**
```bash
   git clone [repo-url]
   cd starlight
   npm install
```

2. **Set up environment:**
```bash
   cp .env.example .env
   # Add your Supabase and OpenAI credentials
```

3. **Run the app:**
```bash
   npx expo start
   # Press 'i' for iOS, 'a' for Android, 'w' for web
```

4. **Sign in:**
   - Use a test phone number (E.164 format, e.g. `+15551234567`)
   - Enter the OTP sent via SMS
   - Complete the narrative onboarding (or skip via database if needed for testing)

---

## ⚠️ TECHNICAL DEBT: Mens Group Customizations

**Context:** Several features have been customized specifically for the "Mens Group" user cohort. This is hardcoded and should be refactored.

### What's Different for Mens Group Users:

1. **Mirror Threshold: 6 journals instead of 10**
   - Location: `lib/config/constants.ts:getMirrorThreshold()`
   - Client check: `hooks/useMirrorData.ts` + `lib/supabase/mirrors.ts:checkCanGenerateMirror()`
   - Server check: `supabase/functions/generate-mirror/index.ts`
   - UI: Progress shows "X/6" instead of "X/10"

2. **Wednesday Journaling Reminders**
   - Only Mens Group users receive these notifications
   - Sent every Wednesday at 12:30 PM Mountain Time
   - Message: "What was your takeaway from Men's Group today?"
   - Function: `supabase/functions/wednesday-journal-reminder/index.ts`
   - Cron job: Runs weekly via Supabase cron

3. **Push Notifications**
   - Notification infrastructure is enabled for all users
   - Only Mens Group users get weekly reminders (see above)
   - All users get mirror share notifications

### Why This is Technical Debt:

- Hardcoded string matching on `group_name = 'Mens Group'`
- No configuration system for group-specific features
- Difficult to extend to other groups without code changes

### Recommended Refactor:

Replace hardcoded group checks with a flexible configuration system:
- Group-level settings table or JSON config
- Feature flags per group (mirror_threshold, notifications, etc.)
- Admin UI for managing group configurations

**Until then:** Search codebase for `'Mens Group'` to find all customization points.

---

## 🏗️ Core Features

### 1. Journal Entry System

**Location:** `app/(tabs)/index.tsx`

Users can create journal entries in two ways:

#### Text Journaling
- Traditional text input with submit button
- Simple, familiar UX
- Instant submission

#### Voice Journaling
- Tap microphone to start recording
- Speak naturally (up to 8 minutes)
- Audio uploaded to Supabase Storage → transcribed server-side via Whisper Edge Function
- Transcription delivered via Supabase Realtime (WebSocket) — no polling
- Auto-submit after transcription completes

**Flow:**
```
User Input → Save to Supabase → Navigate to Mirror Screen → Track Progress
```

**Key Files:**
- `app/(tabs)/index.tsx` - Main journal screen orchestration
- `components/journal/JournalTabs.tsx` - Tab switcher (text/voice)
- `components/journal/TextJournalInput.tsx` - Text input UI
- `components/voice/VoiceRecordingTab.tsx` - Voice recording UI
- `hooks/useAudioRecording.tsx` - Recording logic
- `lib/supabase/journals.ts` - Database operations

---

### 2. Voice Recording System

**Hook:** `hooks/useAudioRecording.tsx`

This is one of the most critical pieces of the app. It manages:

#### States
```typescript
isRecording: boolean    // Is recording active?
isPaused: boolean       // Is recording paused?
recordingDuration: number // Current duration in seconds
recording: Audio.Recording | null // The recording object
isProcessing: boolean   // Is transcription in progress?
```

#### Control Functions
- `handleStartRecording()` - Creates recording instance, activates wake lock
- `handlePauseRecording()` - Pauses recording
- `handleResumeRecording()` - Resumes from pause
- `handleStopRecording()` - Stops, uploads to Supabase Storage, creates pending journal, triggers server-side transcription
- `handleDiscardRecording()` - Discards recording without saving
- `formatDuration()` - Utility to format seconds as MM:SS

#### Recording Flow
```
Start → Configure Audio Mode → Create Recording → Activate Wake Lock → Track Duration
  ↓
Pause (optional) → Store current duration → Deactivate wake lock
  ↓
Resume (optional) → Continue recording
  ↓
Stop → Extract URI → Copy to persistent local storage → Upload to Supabase Storage
  ↓
Create pending journal row (transcription_status: 'pending')
  ↓
Fire transcribe-audio Edge Function (async, don't await)
  ↓
Subscribe to journal row via Supabase Realtime
  ↓
Realtime delivers transcription_status: 'completed' → invoke onTranscriptionComplete callback
```

**Important Notes:**
- 8-minute maximum recording length (enforced, auto-stops with alert)
- Audio file persisted to `documentDirectory/pending_recordings/` immediately to survive app backgrounding
- Pending jobs tracked in AsyncStorage queue (`oxbow_pending_voice_jobs`) for crash recovery
- App backgrounding while recording: auto-pauses, resumes on foreground
- Fallback if Storage upload fails: legacy inline transcription (base64 audio sent to Edge Function directly)
- 3-minute safety net timeout if Realtime doesn't deliver an update

---

### 3. Voice Transcription

**Service:** `lib/supabase/transcription.ts`

Transcription is handled **server-side** via the `transcribe-audio` Supabase Edge Function:

```typescript
// Primary path: server-side via Realtime
const journal = await createPendingJournal({ customUserId, storagePath, ... });
triggerTranscription(journal.id); // non-blocking
subscribeForCompletion(journal.id, ...); // Realtime WebSocket

// Fallback path (if Storage upload failed): legacy inline transcription
const result = await transcribeAudio(audioUri); // sends base64 audio to Edge Function
```

**Primary Flow:**
1. Audio recorded → URI extracted
2. Audio copied to persistent local path
3. Audio uploaded to Supabase Storage bucket (`audio-recordings/`)
4. Pending journal row created in DB (`transcription_status: 'pending'`)
5. `transcribe-audio` Edge Function fired (async, server handles Whisper API call)
6. Client subscribes to journal row via Supabase Realtime WebSocket
7. Realtime delivers update when `transcription_status` → `'completed'`
8. `content` field populated with transcribed text
9. Journal saved; user navigated to Mirror screen

**Error Handling:**
- Upload timeout (30s): recording stays in local queue; user prompted to relaunch on better connection
- Journal creation failure: audio safely in Storage, AsyncStorage queue enables recovery on next launch
- Transcription failure: Realtime delivers `transcription_status: 'failed'`; user alerted
- 3-minute Realtime timeout: one final poll, then user told to "check back in a moment"

---

### 4. Mirror Generation System

**Location:** `app/(tabs)/mirror.tsx` + Supabase Edge Function

Mirrors are **AI-generated spiritual reflections** based on 10+ journal entries (configurable server-side).

#### The Mirror Concept
After collecting enough journals (default: 10), users can "unlock" a Mirror. The Mirror is a single scrollable experience with four navigable sections, accessed via a tab bar:
- **Mirror tab:** Biblical character parallel story + encouraging verse + invitation to growth (from `screen_2_biblical`)
- **Themes tab:** Identified patterns and recurring themes from journals (from `screen_1_themes`, max 4 shown)
- **Observations tab:** Observations about self-perception, God-perception, others, and blind spots (from `screen_3_observations`)
- **Reflection tab:** User's personal written reflection (text input, saved as `reflection_focus`; hidden for shared mirrors)

**Note:** The MirrorViewer (`components/mirror/MirrorViewer.tsx`) is a single scrollable view with scroll-linked tab navigation — not a swipeable carousel. Shared mirrors hide the Reflection tab.

#### Technical Implementation

**Server-Side Generation:**
Mirrors are generated using a Supabase Edge Function (`generate-mirror`) that:
1. Fetches unassigned journals for the user
2. Calls OpenAI GPT-5-mini API (faster response: 3-8 seconds typical)
3. Implements automatic retry logic (up to 2 attempts on timeout)
4. Saves Mirror to database with generation timestamps
5. Updates `mirror_generation_requests` table with status

**Client-Side Realtime (not polling):**
```typescript
// Client subscribes to mirror_generation_requests table via Realtime WebSocket
const channel = supabase
  .channel(`mirror-generation-${user.id}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    table: 'mirror_generation_requests',
    filter: `custom_user_id=eq.${user.id}`,
  }, (payload) => {
    const { status, mirror_id, error_message } = payload.new;
    if (status === 'completed' || status === 'failed') {
      onResolved(status, mirror_id, error_message);
    }
  })
  .subscribe();

// 4-minute safety net: one final poll if Realtime doesn't deliver
```

**Mirror Structure (in database):**
```typescript
{
  id: string
  custom_user_id: string
  screen_1_themes: JSON      // themes array + insight
  screen_2_biblical: JSON    // parallel_story, encouraging_verse, invitation_to_growth/challenging_verse
  screen_3_observations: JSON // self_perception, god_perception, others_perception, blind_spots
  screen_4_suggestions: JSON // legacy field, not shown in current MirrorViewer UI
  reflection_focus: string   // user-written reflection (private, not shared)
  reflection_completed_at: string | null
  has_been_viewed: boolean
  created_at: string
  journal_count: number      // Default: 10
  mirror_type: 'full' | 'day_1'
  status: 'completed' | ...
}
```

#### Mirror Flow (Server-Side Generation with Realtime)
```
10+ Journals Collected
  ↓
"Generate Mirror" button appears
  ↓
User taps Generate Mirror
  ↓
Client calls useMirrorData.generateMirror()
  ↓
useMirrorData subscribes to Realtime channel for mirror_generation_requests
  ↓
Client calls lib/supabase/mirrors.requestMirrorGeneration()
  ↓
Edge Function generates mirror synchronously and returns it in HTTP response
  OR creates mirror_generation_request (status: pending) for async path
  ↓
Either: HTTP response delivers mirror directly (resolves Realtime subscription)
    OR: Realtime delivers status update when generation completes
  ↓
Mirror fetched via getMirrorById()
  ↓
Mirror marked as has_been_viewed when user opens it
  ↓
User sees scrollable experience with Mirror/Themes/Observations/Reflection tabs
  ↓
Mirror saved to history for re-viewing
```

**Key Files:**
- `supabase/functions/generate-mirror/index.ts` - Server-side Mirror generation
- `app/(tabs)/mirror.tsx` - Mirror screen orchestration
- `components/mirror/MirrorViewer.tsx` - Scrollable mirror viewer with tab navigation
- `components/mirror/MirrorScreen1.tsx` through `MirrorScreen4.tsx` - Individual screen components (used for Day 1 mini-mirror)
- `lib/supabase/mirrors.ts` - Database operations
- `hooks/useMirrorData.ts` - Data fetching, Realtime subscription, and state management

---

### 5. Friends & Mirror Sharing System

**Location:** `app/(tabs)/friends.tsx`

Users can connect with friends and share mirrors for spiritual accountability and mutual encouragement.

#### Friend Connection via Invite Links

**How It Works:**
1. User taps "Create Invite Link" on Friends screen
2. System generates unique invite token (expires in 72 hours)
3. Deep link created: `oxbow://friend-invite/[token]`
4. Native share sheet opens for user to share link
5. Recipient taps link → deep link opens app
6. Friend invite auto-accepted → bi-directional friendship created

**Flow:**
```
User A: Create Invite
  ↓
lib/supabase/friends.createInviteLink()
  ↓
Generate token + save to friend_invites table
  ↓
Create deep link (oxbow://friend-invite/[token])
  ↓
Open native share sheet
  ↓
User B: Tap link
  ↓
App opens → app/friend-invite/[token].tsx
  ↓
Validate token (not expired, not already used)
  ↓
lib/supabase/friends.acceptFriendInvite()
  ↓
Create friend_link record (user_a_id < user_b_id)
  ↓
Success → Both users see each other in Friends screen
```

**Key Files:**
- `app/(tabs)/friends.tsx` - Friends screen with slots and invites
- `app/friend-invite/[token].tsx` - Deep link route for invite acceptance
- `components/friends/FriendSlots.tsx` - Friend slot UI with invite button
- `lib/supabase/friends.ts` - Friend operations (create/accept invite, fetch friends)

#### Mirror Sharing

**How It Works:**
1. User views completed mirror (from Mirror screen past mirrors)
2. Taps "Share" button
3. `ShareMirrorSheet` appears showing all friends
4. User selects friend(s) to share with
5. Mirror shared (Mirror, Themes, Observations sections; Reflection tab excluded)
6. Recipient sees "NEW" badge on Friends tab
7. Recipient taps to view shared mirror
8. Share marked as viewed → badge changes to "VIEW"

**Flow:**
```
User A: Share Mirror
  ↓
Tap "Share" on completed mirror
  ↓
ShareMirrorSheet appears
  ↓
Select friend(s)
  ↓
lib/supabase/mirrorShares.shareMirrorWithFriend()
  ↓
Create mirror_share record for each recipient
  ↓
User B: Unread badge appears
  ↓
UnreadSharesContext / FriendBadgeContext updates tab badge
  ↓
User B opens Friends tab
  ↓
Sees shared mirror from User A with "NEW" badge
  ↓
Taps to view
  ↓
lib/supabase/mirrorShares.getSharedMirrorDetails()
  ↓
MirrorViewer opens with isSharedMirror={true}
  ↓
Shows Mirror, Themes, Observations sections (Reflection tab hidden)
  ↓
Mark as viewed
  ↓
Badge changes from "NEW" to "VIEW"
  ↓
User B can re-view shared mirror anytime
```

**Key Files:**
- `app/(tabs)/mirror.tsx` - Share button on past mirrors
- `components/mirror/ShareMirrorSheet.tsx` - Friend selection UI (bottom sheet)
- `components/mirror/MirrorViewer.tsx` - Handles both own and shared mirrors
- `lib/supabase/mirrorShares.ts` - Mirror sharing operations
- `contexts/UnreadSharesContext.tsx` - Tracks unread shares for tab badge
- `contexts/FriendBadgeContext.tsx` - Friend tab badge state

---

### 6. Authentication System

**Context:** `contexts/AuthContext.tsx`
**Service:** `lib/supabase/auth.ts`

#### How Auth Works

Oxbow uses **phone number OTP** via Supabase Auth + Twilio Verify. There are no email/password or access codes.

**Why?**
- Simpler onboarding (no password to remember)
- Phone number is the natural identity for small group / invitation-based access
- Supabase handles JWT session lifecycle automatically

**User Flow:**
1. User enters phone number (E.164 format)
2. OTP SMS sent via Twilio Verify
3. User enters 6-digit OTP
4. Supabase Auth session created → stored in `expo-secure-store`
5. `AuthContext` detects session → looks up `users` row by `auth_user_id`
6. If no match by `auth_user_id`, tries legacy phone-based lookup (migration path for pre-OTP users)
7. If still no match → `isNewUser = true` → onboarding begins
8. `completeProfileSetup()` creates the `users` row at Step 1 of narrative onboarding (name input)

**AppUser Properties:**
```typescript
interface AppUser {
  id: string                        // public.users UUID
  auth_user_id: string              // auth.users UUID
  phone: string                     // E.164 (e.g. +15551234567)
  display_name: string | null
  created_at: string
  status: string
  group_name?: string | null
  invited_by?: string | null
  first_login_at?: string | null
  onboarding_completed_at?: string | null
  auth_migrated_at?: string | null
  profile_picture_url?: string | null
  day_1_completed_at?: string | null
}
```

**Session Persistence:**
- Session (JWT + refresh token) stored in `expo-secure-store` via Supabase's built-in adapter
- Supabase auto-refreshes tokens; no manual session management needed
- Sign out calls `supabase.auth.signOut()` which clears SecureStore automatically
- `onAuthStateChange` triggers `resolveAppUser()` on any session change

---

### 7. Onboarding Flow

**Context:** `contexts/OnboardingContext.tsx`
**Components:** `components/onboarding/NarrativeOnboardingScreen.tsx`

New users experience a **10-step narrative journey** using a river metaphor to explain how Oxbow reveals God's leading across individual moments:

#### The Narrative Arc

**Act 1: Individual Moments (Steps 1-4)**
1. **Name Input** - User enters their first name → `completeProfileSetup()` creates `users` row with `display_name`
2. **Welcome** - Personalized greeting: "Hey, [Name]. Welcome to Oxbow." (auto-advances after 2.5s)
3. **One Moment at a Time** - Shows first journal entry (Dec 12 - gratitude)
4. **The Question** - "But how do these moments fit together into a sensible story?"

**Act 2: Accumulating Experiences (Steps 5-7)**
5. **Second Moment** - Journal entry (Dec 18 - striving/work)
6. **Third Moment** - Journal entry (Dec 21 - connection with friends)
7. **Fourth Moment** - Journal entry (Dec 27 - doubt/pain)

**Act 3: Revelation (Steps 8-9)**
8. **Step Back** - "If we step back..." with zoom-out animation revealing aerial oxbow view
9. **Pattern Revealed** - "We can see God's leading across our moments" with product screenshot overlay

**Act 4: Invitation (Step 10)**
10. **Call to Action** - "So where is God leading you?" with "Get started" button

#### Visual Design
- **Background:** River imagery transitioning from close-up canoe view → aerial oxbow pattern
- **Overlay:** Dark transparent grey (rgba(0, 0, 0, 0.4)) for text readability
- **Journal Cards:** Sample entries displayed one at a time (not accumulated, not saved to database)
- **Key Animation:** Step 8 features a smooth zoom-out transition that reveals the oxbow pattern

#### Implementation Notes
- Onboarding completion tracked in database (`users.onboarding_completed_at`), not AsyncStorage
- Name saved to `users.display_name` at step 1 via `completeProfileSetup()` (also creates the users row)
- `onboarding_completed_at` set when user taps "Get started" on step 10
- All journal entries are sample data for storytelling (not saved to database)
- Permissions (microphone, notifications) requested later in-context when needed
- Can be completed in 60-90 seconds
- User taps to advance through most screens (except welcome which auto-advances)
- Back navigation is disabled during onboarding

---

## 🔑 Key Workflows

### Complete Journaling Workflow
```
1. App Launch
   ↓ (AuthContext calls supabase.auth.getSession())
2. Auto Sign-In (Supabase restores session from SecureStore)
   ↓
3. Land on Journal Screen (app/(tabs)/index.tsx)
   ↓
4. User chooses Text or Voice input
   ↓
5a. TEXT PATH:
    - Type journal entry
    - Tap submit
    - Save to Supabase

5b. VOICE PATH:
    - Check microphone permissions
    - Tap record button
    - Speak (up to 8 minutes)
    - Tap stop
    - Audio uploaded to Supabase Storage
    - Pending journal row created
    - transcribe-audio Edge Function triggered
    - Realtime subscription delivers transcription
    - Journal content populated automatically
   ↓
6. Navigate to Mirror Screen
   ↓
7. Show progress (X/10 journals, or X/6 for Mens Group)
   ↓
8. If threshold reached → Show "Unlock Mirror" button
```

### Complete Mirror Generation Workflow
```
1. User reaches 10+ journals (configurable threshold, 6 for Mens Group)
   ↓
2. "Generate Mirror" button appears on Mirror screen
   ↓
3. User taps Generate Mirror
   ↓
4. Client subscribes to Realtime channel for mirror_generation_requests
   ↓
5. Client calls requestMirrorGeneration() → Edge Function called
   ↓
6. Edge Function generates mirror with OpenAI GPT-5-mini (typically 3-8 seconds)
   ↓
7. Server fetches unassigned journals
   ↓
8. Associated journals marked with mirror_id
   ↓
9. Mirror saved to DB, request status updated to 'completed'
   ↓
10. Either: HTTP response returns mirror directly
    OR: Realtime delivers status update (4-minute safety net: one final poll)
   ↓
11. Mirror fetched and shown on screen
   ↓
12. Mirror marked as has_been_viewed when user opens it
   ↓
13. MirrorViewer opens as full-screen scrollable experience
    with Mirror/Themes/Observations/Reflection tabs
   ↓
14. Mirror saved to history for re-viewing
   ↓
15. User can share mirror with friends (Reflection tab excluded from shared view)
```

### Friend Connection Workflow
```
1. User A opens Friends tab
   ↓
2. Taps "Create Invite Link"
   ↓
3. System generates unique token (72-hour expiry)
   ↓
4. Deep link created: oxbow://friend-invite/[token]
   ↓
5. Native share sheet opens
   ↓
6. User A shares link via message/email/etc.
   ↓
7. User B receives link and taps it
   ↓
8. Deep link opens Oxbow app
   ↓
9. App navigates to app/friend-invite/[token].tsx
   ↓
10. Token validated (not expired, not already used)
    ↓
11. Friendship created (bi-directional friend_link record)
    ↓
12. Invite marked as accepted
    ↓
13. User B sees success message
    ↓
14. Both users now see each other in Friends screen
    ↓
15. Users can now share mirrors with each other
```

### Mirror Sharing Workflow
```
1. User A has completed mirror
   ↓
2. User A navigates to Mirror screen
   ↓
3. Scrolls to past mirrors section
   ↓
4. Taps "Share" button on specific mirror
   ↓
5. ShareMirrorSheet (bottom sheet) appears
   ↓
6. User A selects friend(s) to share with
   ↓
7. Mirror shared (mirror_share records created)
   ↓
8. Push notification sent to User B (if they have notifications enabled)
   ↓
9. User B's Friends tab badge updates ("1" unread)
   ↓
10. User B opens Friends tab
    ↓
11. Sees shared mirror from User A with "NEW" badge
    ↓
12. User B taps to view
    ↓
13. MirrorViewer opens with isSharedMirror={true}
    ↓
14. User B sees: Mirror, Themes, Observations tabs
    (Reflection tab hidden — personal reflections not shared)
    ↓
15. Share marked as viewed (viewed_at timestamp)
    ↓
16. Badge changes from "NEW" to "VIEW"
    ↓
17. User B can re-view shared mirror anytime
```

### Push Notification Workflow
```
1. User opens app for first time
   ↓
2. Navigates to Friends tab
   ↓
3. Sees "Don't miss out" notification pitch card (if notifications not enabled)
   ↓
4. User taps "Enable notifications"
   ↓
5. System permission dialog appears
   ↓
6. User grants permission
   ↓
7. Expo push token generated
   ↓
8. Token saved to users.push_token
   ↓
9. Notification pitch card disappears
   ↓
10. User now receives:
    - Mirror share notifications (all users)
    - Wednesday journaling reminders (Mens Group only at 12:30 PM MT)
```

**Implementation:**
- Hook: `hooks/usePushNotifications.ts`
- Component: `components/friends/NotificationPitchCard.tsx`
- Edge Function: `supabase/functions/send-push-notification/index.ts`
- Cron Function: `supabase/functions/wednesday-journal-reminder/index.ts`

---

## 💡 Key Insights for New Engineers

### 1. Phone OTP Auth — Not Email, Not Access Codes
Oxbow uses **phone number + OTP** for authentication (Supabase Auth + Twilio Verify). There are no access codes, no email/password. The session is stored in `expo-secure-store` via Supabase's built-in adapter and auto-refreshes.

**Don't try to add email/password or access code auth without discussing with the team first.**

---

### 2. Voice is First-Class, Not Secondary
Voice journaling isn't a "nice-to-have" feature added later. The entire UX is designed around making voice input as seamless as text input.

**When working on journal features, always consider both input modes equally.**

---

### 3. The Journal Threshold is Group-Configurable
The "X journals = 1 Mirror" mechanic is a **core product decision**:
- Creates progression system and anticipation
- Ensures sufficient content for meaningful AI reflection
- Natural chunking of the journaling journey
- **Default: 10 journals** (for most users)
- **Mens Group: 6 journals** (see Technical Debt section above)

**Location:** `lib/config/constants.ts:getMirrorThreshold()`

**Don't change thresholds without product team approval.**

---

### 4. Server-Side Mirror Generation is Critical
Mirror generation happens entirely server-side via Supabase Edge Functions, **not** in the client:
- Keeps OpenAI API key secure (never exposed to client)
- Enables automatic retry logic for reliability
- Uses GPT-5-mini for optimal speed/quality balance
- Client uses Supabase Realtime (WebSocket) to detect completion — not polling
- Timeouts and failures are handled gracefully with request status tracking

**Never move Mirror generation back to client-side without security review.**

---

### 5. Mirrors are Scrollable Experiences, Not Swipeable Screens
`MirrorViewer` renders a single long scrollable view with a **scroll-linked tab bar** (Mirror / Themes / Observations / Reflection). Tapping a tab scrolls to that section; scrolling past a section auto-updates the active tab. This is not a swipeable carousel.

Shared mirrors (`isSharedMirror={true}`) hide the Reflection tab and section entirely — personal reflections stay private.

**Respect the scrollable pattern and the isSharedMirror prop.**

---

### 6. Expo Router Conventions Matter
Understanding Expo Router patterns is critical:
```
(tabs)/           # Parentheses = layout group (not in URL)
_layout.tsx       # Underscore = layout file
+not-found.tsx    # Plus = catch-all route
index.tsx         # Default route for a directory
```

**Don't rename these files without understanding routing implications.**

---

### 7. Service Layer is Your Friend
All Supabase operations are abstracted into `lib/supabase/`. **Always use these service functions** rather than calling Supabase directly from components. All service files are TypeScript (`.ts`).
```typescript
// ❌ Don't do this in components
const { data } = await supabase.from('journals').select('*');

// ✅ Do this instead
import { fetchJournals } from '@/lib/supabase/journals';
const journals = await fetchJournals(userId);
```

---

### 8. Friends & Sharing Enable Social Growth
The Friends & Mirror Sharing features enable spiritual accountability:
- Friend connections via deep-linked invite tokens (72-hour expiry)
- Bi-directional friendships stored with ordered user IDs
- Mirror sharing shows Mirror, Themes, Observations sections (Reflection excluded)
- Unread shares tracked with context and tab badges

**Maintain the seamless sharing experience and deep link functionality.**

---

### 9. Narrative Onboarding is Experience-Driven
The onboarding uses a **river journey metaphor** to communicate Oxbow's value proposition:
- Individual moments (close-up river views) → pattern revealed (aerial oxbow view)
- Sample journal entries tell an emotional story (gratitude → striving → connection → doubt)
- No permissions requested, no real data collected - pure storytelling (except display_name)
- Key moment: zoom-out animation revealing the oxbow pattern
- Goal: Users leave thinking *"I wonder what my Mirror will be"*
- Completion tracked in `users.onboarding_completed_at` (database, not AsyncStorage)

**Don't skip or rush the onboarding experience - it sets user expectations.**

---

### 10. Context + Hooks Pattern
State management follows a consistent pattern:
- **Contexts** provide global state (AuthContext, UnreadSharesContext, FriendBadgeContext)
- **Custom hooks** encapsulate logic (useMirrorData, useAudioRecording)
- **Components** consume via hooks

**Follow this pattern for new features.**

---

## 🧪 Testing Your Changes

### Testing Journaling
1. Sign in with a test phone number + OTP
2. Try creating a text journal entry
3. Try creating a voice journal entry (requires microphone)
4. Verify both appear on Mirror screen with correct progress

### Testing Voice Recording
1. Grant microphone permissions when prompted
2. Start recording, speak for 10 seconds, stop
3. Verify transcription appears (delivered via Realtime, typically within seconds)
4. Test pause/resume functionality
5. Test 8-minute limit enforcement (auto-stops with alert)

### Testing Mirrors
1. Create 9 journal entries (or use existing test account)
2. Create 10th journal
3. Verify "Unlock Mirror" button appears
4. Tap unlock and verify loading state
5. Verify Realtime subscription activates (check logs)
6. Verify MirrorViewer opens with scrollable Mirror/Themes/Observations/Reflection tabs
7. Verify Mirror appears in history
8. Test sharing mirror with friend (if friends exist)
9. Verify shared mirror shows only Mirror/Themes/Observations (no Reflection tab)

### Testing Friends & Sharing
1. **Friend Invite:**
   - Tap "Create Invite Link" on Friends tab
   - Verify native share sheet opens with deep link
   - Copy link and open in another device/account
   - Verify deep link navigates to friend-invite route
   - Verify friendship created and both users see each other

2. **Mirror Sharing:**
   - Generate a mirror (10+ journals)
   - Ensure you have at least one friend
   - Navigate to past mirrors section
   - Tap "Share" on a completed mirror
   - Select friend(s) in ShareMirrorSheet
   - Verify share created
   - On friend's device, verify Friends tab badge shows unread
   - Open Friends tab and verify shared mirror with "NEW" badge
   - Tap to view and verify Mirror/Themes/Observations only (no Reflection tab)
   - Verify badge changes from "NEW" to "VIEW"

### Testing Narrative Onboarding
1. Clear app data or use a fresh phone number account
2. Complete all 10 steps in sequence
3. Verify name input creates users row with display_name in database
4. Verify personalized welcome message displays name correctly
5. Verify each journal card appears individually (not accumulated)
6. Verify zoom-out animation on step 8 is smooth
7. Verify product screenshot displays on step 9
8. Verify "Get started" completes onboarding (sets `onboarding_completed_at`) and navigates to journal
9. Test edge cases:
   - Very long names (>50 characters)
   - Empty name submission (should be blocked)
   - Rapid tapping during animations
   - Backgrounding app during onboarding

### Testing Auth
1. Sign out completely
2. Close and reopen app
3. Enter phone number → receive OTP → verify code
4. Verify auto sign-in on subsequent launches (session restored from SecureStore)

---

## 🐛 Common Gotchas

### 1. Permissions Requested During Onboarding
**Problem:** Users confused about when to grant microphone/notification permissions
**Solution:** These are NO LONGER requested during onboarding - they're requested in-context when first needed (e.g., when user tries to record)

### 2. Voice Recording Permissions Not Granted
**Problem:** Voice recording fails silently
**Solution:** Check `useAudioPermissions.tsx` - permissions must be granted before recording

### 3. Stale Closures in Hooks
**Problem:** State updates don't reflect in callbacks
**Solution:** Use refs for values accessed in async callbacks or event listeners

### 4. Auth Session Not Clearing After Sign Out
**Problem:** Auth persists after sign out in dev
**Solution:** Call `supabase.auth.signOut()` — this clears SecureStore automatically. If still stuck, manually clear app data (Settings → General → iPhone Storage → Oxbow → Offload). Do NOT delete AsyncStorage manually for auth — the session is in SecureStore.

### 5. Transcription Stuck "Processing"
**Problem:** Recording submitted but transcription never completes
**Solution:** Check Realtime subscription is connected (look for Supabase WS connection in logs). If upload failed, recording is in local `pending_recordings/` queue and will retry on next launch. The 3-minute safety net will alert the user if Realtime fails to deliver.

### 6. Mirror Not Unlocking at Threshold
**Problem:** User has 10+ journals but no unlock button
**Solution:** Check that journals have `mirror_id: null` (not already used in a previous mirror)

### 7. Onboarding Animation Performance Issues
**Problem:** Step 8 zoom-out animation is choppy or laggy
**Solution:** Ensure images are optimized (<300KB each) and using React Native Reanimated for smooth performance

### 8. Deep Link Not Opening App
**Problem:** Friend invite link opens browser instead of app
**Solution:** Verify `scheme: "oxbow"` is configured in app.config.js and app is installed

### 9. Shared Mirror Shows Reflection Tab
**Problem:** Shared mirrors showing personal reflection input
**Solution:** Check `isSharedMirror={true}` prop is passed to MirrorViewer — this hides the Reflection section entirely

### 10. Friends Tab Badge Not Updating
**Problem:** Unread shares not showing badge
**Solution:** Verify UnreadSharesContext is properly initialized and refreshUnreadCount() is called after viewing shares

### 11. Mirror Generation Card Disappearing
**Problem:** Generation card disappears when backgrounding app
**Solution:** Realtime subscription is torn down on background and re-established on foreground via `AppState` listener in `useMirrorData`. `checkGenerationStatusOnFocus()` re-syncs state on return.

### 12. RLS Blocking DB Operations (HTTP 406)
**Problem:** Supabase returning 406 on table operations — Sentry shows RLS errors
**Solution:** Check RLS policies for the affected table. The `users` table has special RLS: `auth.users.phone` lacks the `+` prefix, so policies use `'+' || (auth.jwt() ->> 'phone')`. See `docs/DATABASE.md` for full RLS architecture.

---

## 📚 Where to Go Next

### Learn More About:
- **Architecture:** See [ARCHITECTURE.md](ARCHITECTURE.md) for technical deep-dive
- **Database:** See [DATABASE.md](DATABASE.md) for schema details and RLS architecture
- **Auth Migration:** See [AUTH_MIGRATION_PLAN.md](AUTH_MIGRATION_PLAN.md) for the phone OTP migration history

### Explore the Codebase:
Start with these files in order:
1. `app/_layout.tsx` - App entry point and providers
2. `contexts/AuthContext.tsx` - How auth works (Phone OTP + Supabase)
3. `app/(tabs)/index.tsx` - Main journal screen
4. `hooks/useAudioRecording.tsx` - Voice recording logic
5. `lib/supabase/journals.ts` - Database operations

---

## 🤝 Need Help?

- **Questions about features?** Ask the product team
- **Technical questions?** Check the documentation or ask senior engineers
- **Found a bug?** Create an issue in the tracker
- **Want to contribute?** See CONTRIBUTING.md

---

Welcome to the team! Happy coding!
