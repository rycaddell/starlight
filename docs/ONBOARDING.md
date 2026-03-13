# Oxbow - New Engineer Onboarding Guide

Welcome to Oxbow! This guide will help you understand the core features, workflows, and key insights to get you productive quickly.

---

## 🎯 What is Oxbow?

Oxbow is a **spiritual journaling mobile app** that:
1. Lets users capture journal entries via **text or voice**
2. Transcribes voice recordings automatically using **OpenAI Whisper**
3. Generates **AI-powered spiritual reflections** ("Mirrors") after 10+ journal entries
4. Enables **friend connections** via invite links for shared spiritual growth
5. Allows users to **share mirrors** with friends for mutual encouragement
6. Provides a progression system that encourages regular journaling

**Target Platforms:** iOS, Android, Web

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

4. **Get an access code:**
   - Ask your team lead for a test access code
   - Access codes are pre-created in the `users` table

---

## ⚠️ TECHNICAL DEBT: Mens Group Customizations

**Context:** Several features have been customized specifically for the "Mens Group" user cohort. This is hardcoded and should be refactored.

### What's Different for Mens Group Users:

1. **Mirror Threshold: 6 journals instead of 10**
   - Location: `lib/config/constants.js:getMirrorThreshold()`
   - Client check: `hooks/useMirrorData.ts` + `lib/supabase/mirrors.js:checkCanGenerateMirror()`
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
- Automatic transcription via Whisper API
- Auto-submit after transcription

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
- `lib/supabase/journals.js` - Database operations

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
```

#### Control Functions
- `handleStartRecording()` - Creates recording instance
- `handlePauseRecording()` - Pauses recording
- `handleResumeRecording()` - Resumes from pause
- `handleStopRecording()` - Stops, saves, and initiates transcription

#### Recording Flow
```
Start → Configure Audio Mode → Create Recording → Track Duration
  ↓
Pause (optional) → Store current state
  ↓
Resume (optional) → Continue recording
  ↓
Stop → Extract URI → Send to Whisper → Save to Database
```

**Important Notes:**
- 8-minute maximum recording length (enforced)
- Automatic cleanup on errors
- Duration tracking via 1-second interval
- Permissions checked before recording

---

### 3. Voice Transcription

**Service:** `lib/whisperService.ts`

Uses OpenAI's Whisper API to convert audio to text:
```typescript
const transcription = await transcribeAudio(recordingUri);
// Returns transcribed text or throws error
```

**Flow:**
1. Recording stopped → URI extracted
2. Audio file sent to Whisper API
3. Transcription received
4. Text used to create journal entry
5. User navigated to Mirror screen

**Error Handling:**
- Network failures show user alert
- Recording preserved even if transcription fails
- User can retry or manually enter text

---

### 4. Mirror Generation System

**Location:** `app/(tabs)/mirror.tsx` + Supabase Edge Function

Mirrors are **AI-generated spiritual reflections** based on 10+ journal entries (configurable server-side).

#### The Mirror Concept
After collecting enough journals (default: 10), users can "unlock" a Mirror containing:
- **Screen 1 (Themes):** Identified patterns and recurring themes from journals
- **Screen 2 (Biblical Mirror):** Relevant biblical stories, verses, and connections
- **Screen 3 (Observations):** Observations about self-perception, God-perception, others, and blind spots

**Note:** ALL mirrors use a 3-screen format. Screen 4 (Suggestions) was deprecated - we now focus on observations rather than prescriptive advice

#### Technical Implementation

**Server-Side Generation:**
Mirrors are generated using a Supabase Edge Function (`generate-mirror`) that:
1. Fetches unassigned journals for the user
2. Calls OpenAI GPT-5-mini API (faster response: 3-8 seconds typical)
3. Implements automatic retry logic (up to 2 attempts on timeout)
4. Saves Mirror to database with generation timestamps
5. Updates `mirror_generation_requests` table with status

**Client-Side Polling:**
```typescript
// Client polls for status updates
const { data } = await supabase
  .from('mirror_generation_requests')
  .select('status, mirror_id')
  .eq('custom_user_id', userId)
  .order('requested_at', { ascending: false })
  .limit(1);

// Status progression: 'pending' → 'processing' → 'completed' or 'failed'
```

**Mirror Structure:**
```typescript
// Mirror structure in database
{
  id: string
  custom_user_id: string
  screen_1_themes: JSON
  screen_2_biblical: JSON
  screen_3_observations: JSON
  screen_4_suggestions: JSON
  reflection_focus: string
  reflection_action: string
  reflection_completed_at: string | null
  has_been_viewed: boolean
  created_at: string
  journal_count: number  // Default: 10
}
```

#### Mirror Flow (Server-Side Generation)
```
10+ Journals Collected
  ↓
"Generate Mirror" button appears
  ↓
User taps Generate Mirror
  ↓
Client calls lib/supabase/mirrors.generateMirror()
  ↓
Edge Function creates mirror_generation_request (status: pending)
  ↓
Client polls status every 3 seconds (hooks/useMirrorData.ts)
  ↓
Server processes request asynchronously with OpenAI
  ↓
Mirror content generated and saved to database
  ↓
Request status updated to 'completed'
  ↓
Polling detects completion
  ↓
Mirror marked as viewed (has_been_viewed: true)
  ↓
Server: Generates 3 screens (with retry if timeout)
  ↓
Server: Saves Mirror, updates status to 'completed'
  ↓
Client: Polling detects completion (every 5 seconds)
  ↓
Client: Fetches Mirror data
  ↓
User views 3-screen swipeable experience
  ↓
Mirror marked as has_been_viewed
  ↓
Mirror saved to history for re-viewing
```

**Key Files:**
- `supabase/functions/generate-mirror/index.ts` - Server-side Mirror generation
- `app/(tabs)/mirror.tsx` - Mirror screen orchestration
- `components/mirror/MirrorModal.tsx` - Full-screen mirror viewer
- `components/mirror/ScreenOne.tsx` through `ScreenThree.tsx` - Individual screens (3-screen format)
- `lib/supabase/mirrors.js` - Database operations
- `hooks/useMirrorData.ts` - Data fetching, polling, and state management

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
- `lib/supabase/friends.js` - Friend operations (create/accept invite, fetch friends)

#### Mirror Sharing

**How It Works:**
1. User views completed mirror (from Mirror screen past mirrors)
2. Taps "Share" button
3. Friend picker modal appears showing all friends
4. User selects friend(s) to share with
5. Mirror shared (3 screens: Themes, Biblical, Observations)
6. Recipient sees "NEW" badge on Friends tab
7. Recipient taps to view shared mirror
8. Share marked as viewed → badge changes to "VIEW"

**Flow:**
```
User A: Share Mirror
  ↓
Tap "Share" on completed mirror
  ↓
FriendPickerModal appears
  ↓
Select friend(s)
  ↓
lib/supabase/mirrorShares.shareMirrorWithFriend()
  ↓
Create mirror_share record for each recipient
  ↓
User B: Unread badge appears
  ↓
UnreadSharesContext updates tab badge
  ↓
User B opens Friends tab
  ↓
Sees shared mirror with "NEW" badge
  ↓
Taps to view
  ↓
lib/supabase/mirrorShares.getSharedMirrorDetails()
  ↓
MirrorViewer opens with isSharedMirror={true}
  ↓
Shows 3 screens (themes, biblical, observations)
  ↓
Reflection privacy preserved (screen 4 excluded)
  ↓
Mark as viewed
  ↓
Badge changes from "NEW" to "VIEW"
```

**Key Files:**
- `app/(tabs)/mirror.tsx` - Share button on past mirrors
- `components/mirror/FriendPickerModal.tsx` - Friend selection UI
- `components/mirror/MirrorViewer.tsx` - Handles both own and shared mirrors
- `lib/supabase/mirrorShares.js` - Mirror sharing operations
- `contexts/UnreadSharesContext.tsx` - Tracks unread shares for tab badge

---

### 6. Authentication System

**Context:** `contexts/AuthContext.tsx`  
**Service:** `lib/supabase/auth.js`

#### How Auth Works

**⚠️ Important:** Oxbow uses **access codes**, NOT email/password.

**Why?**
- Simpler onboarding (no email verification)
- Better for group-based or invitation-based access
- Pre-created user records mapped to codes

**User Flow:**
1. User enters access code on sign-in screen
2. Code validated against `users` table
3. If valid, user data stored in AsyncStorage
4. User automatically signed in on next app launch

**User Properties:**
```typescript
{
  id: string
  access_code: string
  display_name: string
  status: string
  group_name?: string
  invited_by?: string
}
```

**Session Persistence:**
- Access code stored in AsyncStorage
- Auto sign-in on app launch if code exists
- Sign out clears AsyncStorage

---

### 7. Onboarding Flow

**Context:** `contexts/OnboardingContext.tsx`
**Components:** `components/onboarding/NarrativeOnboardingScreen.tsx`

New users experience a **10-step narrative journey** using a river metaphor to explain how Oxbow reveals God's leading across individual moments:

#### The Narrative Arc

**Act 1: Individual Moments (Steps 1-4)**
1. **Name Input** - User enters their first name (saved to `display_name`)
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
- Onboarding shown only once (tracked in AsyncStorage)
- Name saved to `users.display_name` during step 1
- All journal entries are sample data for storytelling (not saved to database)
- Permissions (microphone, notifications) requested later in-context when needed
- Can be completed in 60-90 seconds
- User taps to advance through most screens (except welcome which auto-advances)

---

## 🔑 Key Workflows

### Complete Journaling Workflow
```
1. App Launch
   ↓ (AuthContext checks AsyncStorage)
2. Auto Sign-In (if access code exists)
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
    - Send to Whisper API
    - Receive transcription
    - Save to Supabase
   ↓
6. Navigate to Mirror Screen
   ↓
7. Show progress (X/15 journals)
   ↓
8. If 15th journal → Show "Unlock Mirror" button
```

### Complete Mirror Generation Workflow
```
1. User reaches 10+ journals (configurable threshold)
   ↓
2. "Generate Mirror" button appears on Mirror screen
   ↓
3. User taps Generate Mirror
   ↓
4. Client calls generateMirror() → creates mirror_generation_request
   ↓
5. Polling starts (every 3 seconds)
   ↓
6. Server processes request asynchronously with OpenAI
   ↓
7. Server fetches unassigned journals
   ↓
8. Server calls OpenAI GPT-5-mini (typically 3-8 seconds)
   ↓
9. Associated journals marked with mirror_id
   ↓
10. Request status updated to 'completed'
    ↓
11. Polling detects completion
    ↓
12. Mirror marked as viewed (has_been_viewed: true)
    ↓
13. Modal opens with swipeable 4-screen experience
    ↓
14. User can swipe through all 4 screens
    ↓
15. Mirror saved to history
    ↓
16. User can re-view past mirrors anytime
    ↓
17. User can share mirror with friends (3 screens shared)
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
5. Friend picker modal appears
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
13. MirrorViewer opens with 3 screens
    ↓
14. User B sees: themes, biblical references, observations
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

### 1. No Traditional Auth = By Design
This app doesn't use email/password authentication. Access codes map to pre-created user records. This is **intentional** for the product's use case (likely group-based or invitation-based access model).

**Don't try to add email/password auth without discussing with the team first.**

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

**Location:** `lib/config/constants.js:getMirrorThreshold()`

**Don't change thresholds without product team approval.**

---

### 4. Server-Side Mirror Generation is Critical
Mirror generation happens entirely server-side via Supabase Edge Functions, **not** in the client:
- Keeps OpenAI API key secure (never exposed to client)
- Enables automatic retry logic for reliability
- Uses GPT-5-mini for optimal speed/quality balance
- Client polls `mirror_generation_requests` table for status updates
- Timeouts and failures are handled gracefully with request status tracking

**Never move Mirror generation back to client-side without security review.**

---

### 5. Mirrors are Immersive Experiences
Mirrors render as full-screen modals with swipeable screens, not as part of the main navigation flow. This is intentional to create a focused, contemplative moment separate from the daily journaling routine.

**Respect the modal pattern - don't try to inline Mirror content.**

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
All Supabase operations are abstracted into `lib/supabase/`. **Always use these service functions** rather than calling Supabase directly from components.
```typescript
// ❌ Don't do this in components
const { data } = await supabase.from('journals').select('*');

// ✅ Do this instead
import { fetchJournals } from '@/lib/supabase/journals';
const journals = await fetchJournals(userId);
```

---

### 7. Friends & Sharing Enable Social Growth
The Friends & Mirror Sharing features enable spiritual accountability:
- Friend connections via deep-linked invite tokens (72-hour expiry)
- Bi-directional friendships stored with ordered user IDs
- Mirror sharing shows all 3 screens (Themes, Biblical, Observations)
- Unread shares tracked with context and tab badges

**Maintain the seamless sharing experience and deep link functionality.**

---

### 8. Narrative Onboarding is Experience-Driven
The onboarding uses a **river journey metaphor** to communicate Oxbow's value proposition:
- Individual moments (close-up river views) → pattern revealed (aerial oxbow view)
- Sample journal entries tell an emotional story (gratitude → striving → connection → doubt)
- No permissions requested, no real data collected - pure storytelling
- Key moment: zoom-out animation revealing the oxbow pattern
- Goal: Users leave thinking *"I wonder what my Mirror will be"*

**Don't skip or rush the onboarding experience - it sets user expectations.**

---

### 9. Context + Hooks Pattern
State management follows a consistent pattern:
- **Contexts** provide global state (AuthContext, UnreadSharesContext)
- **Custom hooks** encapsulate logic (useMirrorData, useAudioRecording)
- **Components** consume via hooks

**Follow this pattern for new features.**

---

## 🧪 Testing Your Changes

### Testing Journaling
1. Sign in with a test access code
2. Try creating a text journal entry
3. Try creating a voice journal entry (requires microphone)
4. Verify both appear on Mirror screen with correct progress

### Testing Voice Recording
1. Grant microphone permissions when prompted
2. Start recording, speak for 10 seconds, stop
3. Verify transcription appears
4. Test pause/resume functionality
5. Test 8-minute limit enforcement

### Testing Mirrors
1. Create 9 journal entries (or use existing test account)
2. Create 10th journal
3. Verify "Unlock Mirror" button appears
4. Tap unlock and verify loading state
5. Verify polling starts (check logs for 3-second intervals)
6. Verify Mirror modal opens with 4 swipeable screens
7. Verify Mirror appears in history
8. Test sharing mirror with friend (if friends exist)

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
   - Select friend(s) in picker modal
   - Verify share created
   - On friend's device, verify Friends tab badge shows unread
   - Open Friends tab and verify shared mirror with "NEW" badge
   - Tap to view and verify 3 screens only (not 4)
   - Verify badge changes from "NEW" to "VIEW"

### Testing Narrative Onboarding
1. Clear app data or use a fresh access code
2. Complete all 10 steps in sequence
3. Verify name input saves to database
4. Verify personalized welcome message displays name correctly
5. Verify each journal card appears individually (not accumulated)
6. Verify zoom-out animation on step 8 is smooth
7. Verify product screenshot displays on step 9
8. Verify "Get started" completes onboarding and navigates to journal
9. Test edge cases:
   - Very long names (>50 characters)
   - Empty name submission (should be blocked)
   - Rapid tapping during animations
   - Backgrounding app during onboarding

### Testing Auth
1. Sign out completely
2. Close and reopen app
3. Enter valid access code
4. Verify auto sign-in on subsequent launches

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

### 4. AsyncStorage Not Clearing
**Problem:** Auth persists after sign out in dev
**Solution:** Manually clear AsyncStorage or reinstall app

### 5. Whisper API Timeout
**Problem:** Long recordings time out during transcription
**Solution:** This is expected for 8-minute recordings - add retry logic

### 6. Mirror Not Unlocking at Threshold
**Problem:** User has 10+ journals but no unlock button
**Solution:** Check that journals have `mirror_id: null` (not already used)

### 7. Onboarding Animation Performance Issues
**Problem:** Step 8 zoom-out animation is choppy or laggy
**Solution:** Ensure images are optimized (<300KB each) and using React Native Reanimated for smooth performance

### 8. Deep Link Not Opening App
**Problem:** Friend invite link opens browser instead of app
**Solution:** Verify `scheme: "oxbow"` is configured in app.config.js and app is installed

### 9. Shared Mirror Shows 4 Screens Instead of 3
**Problem:** Shared mirrors showing reflection questions/actions
**Solution:** Check `isSharedMirror={true}` prop is passed to MirrorViewer

### 10. Friends Tab Badge Not Updating
**Problem:** Unread shares not showing badge
**Solution:** Verify UnreadSharesContext is properly initialized and refreshUnreadCount() is called after viewing shares

### 11. Mirror Generation Card Disappearing
**Problem:** Generation card disappears when backgrounding app
**Solution:** Polling logic checks mirrorState before restarting - should only poll if state is 'generating'

---

## 📚 Where to Go Next

### Learn More About:
- **Architecture:** See [ARCHITECTURE.md](ARCHITECTURE.md) for technical deep-dive
- **Database:** See [DATABASE.md](DATABASE.md) for schema details

### Explore the Codebase:
Start with these files in order:
1. `app/_layout.tsx` - App entry point and providers
2. `contexts/AuthContext.tsx` - How auth works
3. `app/(tabs)/index.tsx` - Main journal screen
4. `hooks/useAudioRecording.tsx` - Voice recording logic
5. `lib/supabase/journals.js` - Database operations

---

## 🤝 Need Help?

- **Questions about features?** Ask the product team
- **Technical questions?** Check the documentation or ask senior engineers
- **Found a bug?** Create an issue in the tracker
- **Want to contribute?** See CONTRIBUTING.md

---

Welcome to the team! Happy coding! 🎉