# Oxbow - Manual Testing Checklist
## Pre-Release Testing Plan — v1.0.3

**Version:** 1.0.3 (Mirror Share v2 + Push Notifications + Bulletproof Pipeline)
**Test Date:** _____________
**Tester:** _____________
**Platform:** ☐ iOS  ☐ Android
**Device:** _____________

---

## User Type Matrix

Test these distinct user profiles — each has a different starting state and different risk areas:

| Type | Description | Key Risks |
|------|-------------|-----------|
| **Brand New** | First install, no account | Onboarding flow, phone OTP, Day 1 |
| **New (Post-Day 1)** | Day 1 complete, < 7 journals | Mirror threshold, notification pitch card |
| **Active** | 7+ journals, has mirrors | Mirror generation, mirror viewing, crash guards |
| **Social** | Has friends, shared mirrors | Realtime badge, ShareMirrorSheet, invite link fix |
| **Returning** | Closed & reopened app | Auto sign-in, session restore, last_opened_at |
| **Invite Recipient** | Tapping a friend invite link | Universal link routing, existing vs new user |

---

## ✅ Test Environment Setup

**Before You Start:**
- [ ] App installed via TestFlight (not Expo Go)
- [ ] Fresh install OR clear app data for clean state testing
- [ ] Two test devices available for Friends features
- [ ] Phone numbers ready for both test accounts (phone OTP auth)
- [ ] Stable internet connection
- [ ] Note device model and OS version

---

## 1. Authentication & Onboarding

### First-Time User Experience (Brand New user type)
- [ ] Open app → Phone number entry screen appears
- [ ] Enter valid phone → Receives SMS OTP
- [ ] Enter correct OTP → Successfully signs in
- [ ] Enter incorrect OTP → Shows error message
- [ ] Narrative onboarding screens appear (river metaphor story)
- [ ] Onboarding screenshot shows Mirror screen mockup (not old product screenshot)
- [ ] Onboarding only shows once (doesn't repeat on restart)
- [ ] Day 1 modal opens after onboarding completes

### Sign Out & Re-Authentication (Returning user type)
- [ ] Sign out button works in Settings
- [ ] Returns to phone number entry screen
- [ ] Can sign back in with same phone number
- [ ] Auto sign-in works after closing and reopening app (session in SecureStore)
- [ ] `last_opened_at` updates in DB when app is foregrounded

### No ATT Prompt
- [ ] First launch does NOT show App Tracking Transparency dialog

**Notes:**
```
_________________________________________________
_________________________________________________
```

---

## 2. Text Journaling

### Basic Functionality
- [ ] Journal tab is default landing screen
- [ ] Guided prompt appears (if user hasn't answered today)
- [ ] Can switch between Guided and Free-form tabs
- [ ] Text input field accepts text
- [ ] Submit button is disabled when empty
- [ ] Submit button is enabled when text entered

### Journal Submission
- [ ] Tap Submit → Journal saves successfully
- [ ] Success confirmation appears
- [ ] Navigates to Mirror screen after submit
- [ ] Journal count increases on Mirror screen
- [ ] Can navigate back to Journal tab and submit another

### Edge Cases
- [ ] Very long text (1000+ characters) → Saves successfully
- [ ] Special characters (emojis, punctuation) → Saves correctly
- [ ] Rapid tapping Submit → Only creates one journal
- [ ] Submit while offline → Shows error or queues for later

### No Spurious Alert Bug (Returning user type)
- [ ] Background app while on Mirror screen, then foreground → No "Error loading journals" alert appears when journals are already visible

**Notes:**
```
_________________________________________________
_________________________________________________
```

---

## 3. Voice Journaling

### Microphone Permissions
- [ ] First voice tab access → Requests microphone permission
- [ ] Grant permission → Recording becomes available
- [ ] Deny permission → Shows permission explanation
- [ ] Can enable permission via Settings link (if denied)

### Recording Controls
- [ ] Tap microphone icon → Recording starts
- [ ] Recording indicator appears (visual feedback)
- [ ] Duration timer counts up
- [ ] Stop button ends recording

### Liquid-Fill Wave Indicator (NEW)
- [ ] After stopping recording → Wave progress indicator appears inside the button
- [ ] Indicator shows "Processing..." then transitions to "Transcribing..." label
- [ ] Wave fill animates smoothly (not jerky)
- [ ] Wave respects Reduce Motion accessibility setting (no animation if enabled)

### Transcription Flow
- [ ] Stop recording → Shows transcribing state with wave indicator
- [ ] Transcription completes in reasonable time (< 30 seconds)
- [ ] Transcribed text appears correctly
- [ ] Can edit transcribed text before submitting
- [ ] Submit → Journal saves with audio content

### Voice Edge Cases
- [ ] 10 second recording → Transcribes successfully
- [ ] 2 minute recording → Transcribes successfully
- [ ] Incoming call during recording → Handles gracefully
- [ ] App backgrounded during recording → Recording stops/pauses

### Error Handling
- [ ] No internet during transcription → Shows error message
- [ ] Transcription fails → Can retry or cancel

**Notes:**
```
_________________________________________________
_________________________________________________
```

---

## 4. Mirror Generation

### Progress Tracking (Before 7 Journals)
- [ ] Mirror screen shows "0/7" initially
- [ ] Progress bar/circle updates after each journal
- [ ] Motivational message shown (e.g., "Keep going!")
- [ ] "Generate Mirror" button is disabled
- [ ] Past mirrors section is empty

### Reaching Threshold (7 Journals)
- [ ] After 7th journal submission:
  - [ ] Progress shows "7/7"
  - [ ] "Generate Mirror" button appears and is enabled
  - [ ] Button styling looks correct
  - [ ] Encouraging message shown

### Mirror Generation Flow
- [ ] Tap "Generate Mirror" → Liquid-fill wave progress indicator appears inside button
- [ ] Wave fill starts at ~15% immediately (floor), grows toward 95% over ~2 min
- [ ] Wave animation is smooth (60fps target)
- [ ] Generation completes in reasonable time (3–15 seconds typical)
- [ ] Success state appears when complete

### Mirror Viewer — Redesign (NEW)
- [ ] Mirror viewer opens full-screen with hero image and overlay
- [ ] Sticky tab bar at top scrolls correctly
- [ ] Safe area insets respected (no overlap with notch/Dynamic Island)
- [ ] Screen 1 (Themes) displays correctly
  - [ ] Theme bullets are readable
  - [ ] No crash if GPT returned themes as an array (Array.isArray guard)
- [ ] Screen 2 (Biblical) displays correctly
  - [ ] Parallel story text visible
  - [ ] Encouraging verse and challenging verse rendered as plain text (not arrays)
  - [ ] `application` and `invitation` fields are plain strings (no crash)
- [ ] Screen 3 (Observations) displays correctly
- [ ] Can navigate between screens (tab bar or swipe)
- [ ] Close button dismisses viewer

### Last Mirror Card (Mirror Screen)
- [ ] After viewing, "Last Mirror" card appears at top of Mirror screen
- [ ] Card shows mirror date (Month Day, Year format)
- [ ] Card shows biblical character name (if available)
- [ ] "Share" button appears on left side
- [ ] "View Mirror" button appears on right side (goldenrod color)
- [ ] Tap "View Mirror" → Reopens that mirror
- [ ] Tap "Share" → Opens ShareMirrorSheet (see Section 7)
- [ ] "View past Mirrors" link appears if multiple mirrors exist

### Past Mirrors Modal
- [ ] Modal opens correctly
- [ ] All past mirrors in list, sorted newest first
- [ ] Tap any mirror card → Opens MirrorViewer
- [ ] Modal closes properly

### Last Journal Card (Mirror Screen)
- [ ] "Last journal" heading appears above card
- [ ] Card shows journal date and content
- [ ] Content truncates to 3 lines for long entries
- [ ] "Read more" link appears ONLY when content exceeds 3 lines
- [ ] Tap "Read more" → Expands to full content
- [ ] Delete button (grey X) → Shows confirmation dialog → Deletes

### Mirror Generation — Bulletproof Pipeline (Active user type)
- [ ] App backgrounded during generation → Completes when returned
- [ ] App force-quit during generation → Recovers to correct state on restart (stale processing loop cleared)
- [ ] Rapidly tap "Generate Mirror" → Only creates one request (no duplicate mirrors)
- [ ] No internet during generation → Shows error, allows retry
- [ ] **Day 1 duplicate prevention**: completing Day 1 again does NOT generate a second Day 1 mirror

### Mirror Generation — Second+ Mirror
- [ ] After 14th journal (7 + 7), second mirror can be generated
- [ ] Second mirror generates and displays correctly

**Notes:**
```
_________________________________________________
_________________________________________________
```

---

## 5. Day 1 Onboarding Flow

### SQL reset for Step 6 testing
```sql
UPDATE users SET day_1_completed_at = NULL, notifications_enabled = false,
  notif_card_dismissed = false, spiritual_rhythm = NULL WHERE id = '[user_id]';
UPDATE day_1_progress SET completed_at = NULL WHERE user_id = '[user_id]';
```

### Day 1 Steps 1–5
- [ ] Spiritual place entry (Step 1) saves correctly
- [ ] Two voice journals (Steps 2–3) transcribe and save
- [ ] Mini-mirror generation shows wave progress indicator during generation
- [ ] Step 5 (mini-mirror viewer): Day1MirrorViewer renders without crash
  - [ ] Biblical section renders as plain text (not arrays)
  - [ ] All sections visible and readable
- [ ] Optional reflection field works; Save and Skip both advance to Step 6

### Day 1 Mini-Mirror Sharing (NEW — mirror share v2)
- [ ] After Step 5, Day 1 mirror card shows a Share button
- [ ] Tapping Share opens ShareMirrorSheet with Day 1 mirror ID
- [ ] Can share Day 1 mirror with a linked friend
- [ ] Off-platform share works from Day 1 mirror (see Section 7 for invite flow)

### Step 6 — Rhythm Builder Screen
- [ ] Step 6 appears after Step 5 completes
- [ ] Bell icon and correct heading visible
- [ ] 1:1 with God slot enabled by default; Church and Small group disabled
- [ ] "Turn on reminders" disabled until ≥1 slot has a timeWindow
- [ ] Enabling slot + selecting timeWindow activates CTA
- [ ] Tap "Turn on reminders" → iOS push permission dialog
- [ ] After granting: `notifications_enabled=true`, `spiritual_rhythm` populated in DB
- [ ] X dismiss: modal closes, `day_1_completed_at` IS set, pitch card visible on Journal tab

### NotificationPitchCard (Journal Tab)
- [ ] Card visible: Day 1 complete + `notifications_enabled=false` + `notif_card_dismissed=false`
- [ ] Card NOT visible when `notifications_enabled=true`
- [ ] Card NOT visible when `notif_card_dismissed=true`
- [ ] "Set up reminders" → opens RhythmBuilderSheet
- [ ] "Not now" → card disappears, `notif_card_dismissed=true` in DB
- [ ] Card does not reappear after dismissal

### Settings — Notification Reminders
- [ ] "Notification reminders" row in Settings
- [ ] Opens RhythmBuilderSheet (pageSheet style)
- [ ] Returning user: slots pre-populated from `spiritual_rhythm`
- [ ] Dirty check: CTA enabled only when changes made
- [ ] "Turn off all reminders" visible when enabled
- [ ] Save: DB updated, sheet closes

### Push Notification Copy — Personalized (NEW)
- [ ] Manually invoke `send-encounter-nudge` via Supabase dashboard
- [ ] Notification body uses user's first name (personalized copy)
- [ ] Notification varies by day of week (if applicable)
- [ ] User with `notifications_enabled=false` is skipped
- [ ] User with no `push_token` is skipped
- [ ] User with `last_opened_at` < 24h ago is skipped (anti-spam)

---

## 6. Friend Invites & Connections

### No Friends State
- [ ] Friends tab shows "Pursue Jesus with Friends" pitch
- [ ] "Create Invite Link" button visible
- [ ] Expiry note shows "72 hours"

### Creating Invite Link (User A)
- [ ] Tap "Create Invite Link" → Shows loading state
- [ ] Native share sheet opens
- [ ] Link format: `https://get.oxbowjournal.com/friend-invite/[token]` (universal link)
- [ ] NOT a `?c=` LinkRunner short link

### Accepting Invite — Existing User (FIXED — critical test)
- [ ] User B already has the app installed
- [ ] Tap the `https://get.oxbowjournal.com/friend-invite/[token]` link
- [ ] iOS routes directly to app (universal link via `get.oxbowjournal.com` associated domain)
- [ ] App navigates to friend-invite route — does NOT open browser first
- [ ] Shows "Accepting invite..." loading state → success

### Accepting Invite — New User
- [ ] User C does NOT have app installed
- [ ] Tap link → Opens browser/App Store prompt via LinkRunner
- [ ] After install and sign-in → deferred deep link resolves correctly
- [ ] Navigates to friend-invite route and accepts

### Post-Connection Verification (Both Devices)
**Device 1 (User A):**
- [ ] Refresh/reopen Friends tab
- [ ] Friend slot now shows User B's name
- [ ] Slot count updates (e.g., "1/3 friends")

**Device 2 (User B):**
- [ ] Friends tab shows User A's name
- [ ] Can create new invite for another friend

### Realtime Badge Updates (Consolidated channel — regression test)
- [ ] User A shares a mirror with User B
- [ ] Friends tab badge on User B's device increments WITHOUT app restart (Realtime)
- [ ] Unread count badge clears when User B views the shared mirror
- [ ] No excessive WebSocket reconnections (was 4 channels; now 1)

### Friend Invite Edge Cases
- [ ] Accept expired invite (> 72 hours) → Shows error
- [ ] Accept already-used invite → Shows error
- [ ] User tries to friend themselves → Prevented
- [ ] Reach 3 friends (max) → Invite button disabled/hidden
- [ ] Open deep link when not signed in → Handled gracefully

**Notes:**
```
_________________________________________________
_________________________________________________
```

---

## 7. Mirror Sharing (v2)

### Setup
**Prerequisites:**
- [ ] User A and User B are friends
- [ ] User A has at least one completed mirror (full or Day 1)

### Share Sheet — Friend List States
- [ ] 0 friends → "No linked friends yet" empty state with "Invite a Friend" button
- [ ] 1 friend → Friend auto-selected on open (no manual selection needed)
- [ ] 2–3 friends → "All Linked Friends" option appears at top
- [ ] Any count → "New friend" row at bottom of list (off-platform invite)

### Sharing with a Linked Friend (User A)
- [ ] Tap "Share" on a mirror card → ShareMirrorSheet opens
- [ ] Select a friend → checkbox fills
- [ ] "Share Mirror" button becomes enabled
- [ ] Tap "Share Mirror" → Shows success alert with friend's name
- [ ] Modal closes
- [ ] User B receives Realtime badge update on Friends tab

### Sharing with All Friends
- [ ] Select "All Linked Friends" option
- [ ] Individual selections clear
- [ ] Tap "Share Mirror" → All friends receive the mirror
- [ ] Success message lists all recipients

### Off-Platform Invite Flow (NEW — mirror share v2)
- [ ] Select "New friend" row in the share sheet
- [ ] Tap "Share Mirror" → Native iOS share sheet opens with invite link
- [ ] Link is a universal link (`https://get.oxbowjournal.com/friend-invite/[token]`)
- [ ] `mirror_id` is attached to the invite (DB: `friend_invites.mirror_id` populated)
- [ ] Can combine: select a linked friend + "New friend" → shares with friend AND opens invite sheet
- [ ] Cancel share sheet → No error shown

### Day 1 Mirror Sharing (NEW)
- [ ] User A can share their Day 1 mini-mirror (not just full mirrors)
- [ ] Day 1 mirror appears in ShareMirrorSheet correctly
- [ ] Recipient (User B) can view the Day 1 mirror in their Friends tab

### Receiving Share (User B)
- [ ] Friends tab badge shows unread count (via Realtime, no restart needed)
- [ ] "Shared with you" section shows mirror card
- [ ] Card shows User A's name and mirror date
- [ ] "NEW" badge visible (orange/gold)
- [ ] Tap card → Opens MirrorViewer (all 3 screens work)

### Post-Viewing (User B)
- [ ] Badge count decreases
- [ ] Mirror card badge changes from "NEW" to "VIEW"
- [ ] Can re-view mirror; stays "VIEW"

### Mirror Sharing Edge Cases
- [ ] Share same mirror with multiple friends → All receive
- [ ] Delete app and reinstall → Shared mirrors persist
- [ ] Share while offline → Shows error, no partial state

**Notes:**
```
_________________________________________________
_________________________________________________
```

---

## 8. Tab Navigation & UI

### Tab Bar
- [ ] Three tabs visible: Journal, Mirror, Friends
- [ ] Active tab is highlighted (correct active tab color: #BD7209)
- [ ] Tap each tab → Navigates correctly
- [ ] Tab icons correct
- [ ] Badge appears on Friends tab when shares unread
- [ ] Badge clears when shares viewed

### Screen Transitions
- [ ] Smooth transitions between tabs
- [ ] No flickering or janky animations
- [ ] Safe area respected (notch, Dynamic Island, home indicator)

### Keyboard Behavior
- [ ] Keyboard opens for text input
- [ ] Keyboard doesn't cover input field
- [ ] Keyboard dismisses on submit
- [ ] Keyboard dismiss gesture works (swipe down)

**Notes:**
```
_________________________________________________
_________________________________________________
```

---

## 9. Offline & Network Behavior

### Airplane Mode Tests
- [ ] App opens successfully (cached data)
- [ ] Can view past mirrors offline
- [ ] Creating journal offline → Shows error
- [ ] Generating mirror offline → Shows error
- [ ] Enable network → App resumes normally

### Poor Network Conditions
- [ ] Transcription takes longer → Eventually completes
- [ ] Mirror generation takes longer → Wave indicator persists → Eventually completes
- [ ] Shows appropriate loading states throughout

**Notes:**
```
_________________________________________________
_________________________________________________
```

---

## 10. Background & Multitasking

### App Backgrounding
- [ ] Background app during journal entry → Text preserved on return
- [ ] Background during voice recording → Recording stops
- [ ] Background during transcription → Completes when returned
- [ ] Background during mirror generation → Wave indicator still present, completes
- [ ] Background during friend invite → Returns to correct state

### Force Quit & Restart
- [ ] Force quit during mirror generation → Recovers to correct state on restart (not stuck in "generating")
- [ ] Force quit after journal submit → Journal saved
- [ ] Restart app → Resumes normal operation, auto-signed-in

### Incoming Interruptions
- [ ] Incoming call during voice recording → Handled gracefully
- [ ] System notification → Doesn't break app state

**Notes:**
```
_________________________________________________
_________________________________________________
```

---

## 11. Platform-Specific Tests

### iOS Only
- [ ] SF Symbols icons display correctly (outside Modals — known limitation)
- [ ] MaterialIcons used correctly inside Modals (no SymbolView crash)
- [ ] Haptic feedback works
- [ ] Safe area respected (notch, Dynamic Island)
- [ ] Share sheet is native iOS style
- [ ] Universal links route to app from Messages, Mail, Notes
- [ ] Settings → Microphone permission works
- [ ] Push notifications delivered and tappable
- [ ] No ATT (App Tracking Transparency) prompt on first launch

**Notes:**
```
_________________________________________________
_________________________________________________
```

---

## 12. Performance & Polish

### Performance
- [ ] App launches quickly (< 3 seconds cold start)
- [ ] Smooth scrolling in all screens
- [ ] Wave animation doesn't drop frames during mirror generation
- [ ] No excessive battery drain
- [ ] Image/icon loading is smooth (WebP assets load correctly — product-screenshot.webp)

### Visual Polish
- [ ] All text is readable (contrast, size)
- [ ] Buttons have clear tap targets
- [ ] Loading indicators visible in all async states
- [ ] Error messages are helpful
- [ ] Spacing/padding looks intentional throughout
- [ ] Colors match design system tokens

### Accessibility
- [ ] Text readable without zooming
- [ ] Buttons are tappable (44×44 minimum)
- [ ] Wave animation respects Reduce Motion setting

**Notes:**
```
_________________________________________________
_________________________________________________
```

---

## 13. Data Integrity & Edge Cases

### Data Persistence
- [ ] Journals persist after app restart
- [ ] Mirrors persist after app restart
- [ ] Friends persist after app restart
- [ ] Shared mirrors persist after app restart
- [ ] Progress counts are accurate

### Boundary Testing
- [ ] First journal (0 → 1) works
- [ ] 7th journal triggers mirror unlock (threshold = 7, not 10)
- [ ] 14th journal triggers second mirror (7 + 7)
- [ ] First friend (0 → 1) works
- [ ] 3rd friend (max) works
- [ ] Attempt 4th friend → Disabled/error

### Data Display
- [ ] Dates display correctly (timezone aware)
- [ ] Long names don't break UI
- [ ] Long mirror content doesn't overflow in viewer
- [ ] Empty states are helpful and not broken

**Notes:**
```
_________________________________________________
_________________________________________________
```

---

## 14. Regression Testing

### Core Features Not Broken
- [ ] Text journaling still works as before
- [ ] Voice journaling still works as before
- [ ] Mirror generation still works (7-journal threshold enforced client AND server)
- [ ] Day 1 flow completes for a brand-new user
- [ ] Sign out/sign in still works
- [ ] Push notification settings persist across app restarts

### Realtime Regression (single channel refactor)
- [ ] Friends badge updates in real-time (no restart needed)
- [ ] Unread mirror shares badge updates in real-time
- [ ] Mirror data refreshes via Realtime after share accepted

### No Visual Regressions
- [ ] Journal screen looks correct
- [ ] Mirror screen looks correct (new MirrorViewer redesign is intentional)
- [ ] Friends screen looks correct
- [ ] No layout shifts or broken styling after refactor

**Notes:**
```
_________________________________________________
_________________________________________________
```

---

## 15. Critical User Journeys (End-to-End)

### Journey 1: Brand New User — Full Onboarding to First Mirror
- [ ] Install → Phone OTP sign-in → Narrative onboarding
- [ ] Day 1: spiritual place → 2 voice journals → mini-mirror (wave indicator during generation)
- [ ] Day 1 Step 5: view mini-mirror (no crash on all content types)
- [ ] Day 1 Step 6: configure reminder slot → grant push permission → Journal tab clean
- [ ] Submit 7 journals total (Day 1 journals count) → Generate first full mirror
- [ ] View mirror (redesigned viewer, all 3 screens readable)
- [ ] Journey feels smooth and spiritually motivated

### Journey 1b: New User — Skip Notifications → Pitch Card → Opt-In
- [ ] Complete Day 1, tap X on Step 6
- [ ] Journal tab shows NotificationPitchCard
- [ ] Tap "Set up reminders" → RhythmBuilderSheet first-timer mode
- [ ] Configure slots, enable → pitch card disappears
- [ ] DB: `notifications_enabled=true`

### Journey 2: Returning Active User — Daily Use
- [ ] Open app → Already signed in (auto sign-in)
- [ ] Submit journal quickly (text or voice with wave indicator)
- [ ] Check Mirror screen progress (correct count, correct threshold 7)
- [ ] Check Friends tab for shares (badge via Realtime)
- [ ] Experience feels fast and reliable

### Journey 3: Social — Connect Friends + Share Mirror
- [ ] User A creates invite link (universal link format)
- [ ] User B (existing user) taps link → opens directly in app → accepts
- [ ] Both see each other in Friends tab
- [ ] User A shares mirror via ShareMirrorSheet → selects User B
- [ ] User B receives Realtime badge → views mirror (redesigned viewer)
- [ ] Journey seamless, no browser redirect for existing user

### Journey 4: Social — Share Mirror + Invite New Friend
- [ ] User A has mirror + < 3 friends
- [ ] Open ShareMirrorSheet → select existing friend + "New friend"
- [ ] Tap "Share Mirror" → mirror shared with friend, THEN invite sheet opens
- [ ] Invite sent off-platform with `mirror_id` attached
- [ ] User C installs app from invite → friend connection formed
- [ ] Journey works end-to-end

### Journey 5: Invite Recipient (Existing User, No Friends Yet)
- [ ] User A (no friends) receives `https://get.oxbowjournal.com/friend-invite/[token]` via Messages
- [ ] Taps link → iOS opens Oxbow directly (NOT browser, NOT App Store)
- [ ] Sees "Accepting invite..." → success
- [ ] Friends tab now shows User B

**Notes:**
```
_________________________________________________
_________________________________________________
```

---

## 16. Known Issues & Acceptable Limitations

**Document any known issues that are acceptable for release:**
```
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________
```

---

## 17. Final Checks Before Submission

### Pre-Release Checklist
- [ ] All critical bugs fixed
- [ ] No console errors/warnings in production build
- [ ] App version is 1.0.3 in app.config.js
- [ ] Build number incremented via EAS (`appVersionSource: "remote"`)
- [ ] TestFlight build passes all tests above
- [ ] Privacy policy updated (if needed)
- [ ] App Store screenshots updated (if needed)
- [ ] Release notes written

### App Store Compliance
- [ ] No crashes on launch
- [ ] No broken features
- [ ] Permissions properly described (microphone, push notifications)
- [ ] No placeholder content
- [ ] Universal links work correctly from Messages, Mail, Notes
- [ ] No ATT prompt (IDFA disabled in linkrunner config)

---

## Sign-Off

**Testing Completed By:** _____________
**Date:** _____________
**Recommendation:** ☐ Approved for Release  ☐ Needs Fixes

**Critical Issues Found:**
```
_________________________________________________
_________________________________________________
_________________________________________________
```

**Non-Critical Issues (Can Fix Later):**
```
_________________________________________________
_________________________________________________
_________________________________________________
```

---

## Testing Tips

1. **Cover all 6 user types** from the matrix at the top — each exercises different code paths
2. **Two real devices** are essential for Friends and Realtime badge tests
3. **Test fresh install** for Brand New user journey (phone OTP, onboarding, Day 1)
4. **Test existing-user invite link** specifically — this was recently fixed and is easy to regress
5. **Confirm 7-journal threshold** (not 10) — both button unlock and edge function
6. **Check wave indicator** on both voice processing AND mirror generation
7. **Test force-quit during mirror generation** — verifies bulletproof pipeline recovery
8. **Test off-platform share flow** — share mirror + invite new friend in one action
9. **Poor network**: Airport WiFi, 3G — transcription and mirror generation timeouts
10. **Check console logs**: Sentry errors even if UI looks fine

---

**Last Updated:** 2026-03-29
**Version:** v1.0.3 — Mirror Share v2 + Bulletproof Pipeline + Wave Indicator + Invite Link Fix
