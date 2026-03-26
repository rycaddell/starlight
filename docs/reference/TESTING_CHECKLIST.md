# Oxbow - Manual Testing Checklist
## Pre-Release Testing Plan for Friends & Mirror Sharing

**Version:** Friends & Sharing MVP
**Test Date:** _____________
**Tester:** _____________
**Platform:** ☐ iOS  ☐ Android
**Device:** _____________

---

## ✅ Test Environment Setup

**Before You Start:**
- [ ] App installed via TestFlight/Internal Testing (not Expo Go)
- [ ] Fresh install OR clear app data for clean state testing
- [ ] Two test devices available for Friends features
- [ ] Access codes ready for both test accounts
- [ ] Stable internet connection
- [ ] Note device model and OS version

---

## 1. Authentication & Onboarding

### First-Time User Experience
- [ ] Enter valid access code → Successfully signs in
- [ ] Enter invalid access code → Shows error message
- [ ] Onboarding screens appear in correct order:
  - [ ] Welcome screen
  - [ ] Microphone permission request
  - [ ] Notification permission request
  - [ ] How it works explanation
- [ ] Can skip through onboarding
- [ ] Onboarding only shows once (doesn't repeat on restart)

### Sign Out & Re-Authentication
- [ ] Sign out button works
- [ ] Access code cleared from storage
- [ ] Can sign back in with same access code
- [ ] Auto sign-in works after closing and reopening app

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
- [ ] Character count shows (if implemented)
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
- [ ] Pause button works (if implemented)
- [ ] Resume button works (if implemented)
- [ ] Stop button ends recording

### Transcription Flow
- [ ] Stop recording → Shows "Transcribing..." state
- [ ] Transcription completes in reasonable time (< 30 seconds)
- [ ] Transcribed text appears correctly
- [ ] Can edit transcribed text before submitting
- [ ] Submit → Journal saves with audio content

### Voice Edge Cases
- [ ] 10 second recording → Transcribes successfully
- [ ] 2 minute recording → Transcribes successfully
- [ ] 8 minute recording (max) → Transcribes successfully
- [ ] Whisper in low voice → Transcribes (may have errors)
- [ ] Background noise → Still transcribes
- [ ] Incoming call during recording → Handles gracefully
- [ ] App backgrounded during recording → Recording stops/pauses
- [ ] Device locked during recording → Handles appropriately

### Error Handling
- [ ] No internet during transcription → Shows error message
- [ ] Transcription fails → Can retry or cancel
- [ ] Very quiet audio → Either transcribes or shows helpful error

**Notes:**
```
_________________________________________________
_________________________________________________
```

---

## 4. Mirror Generation

### Progress Tracking (Before 10 Journals)
- [ ] Mirror screen shows "0/10" initially
- [ ] Progress bar/circle updates after each journal
- [ ] Motivational message shown (e.g., "Keep going!")
- [ ] "Generate Mirror" button is disabled
- [ ] Past mirrors section is empty

### Reaching Threshold (10 Journals)
- [ ] After 10th journal submission:
  - [ ] Progress shows "10/10"
  - [ ] "Generate Mirror" button appears and is enabled
  - [ ] Button styling looks correct
  - [ ] Encouraging message shown

### Mirror Generation Flow
- [ ] Tap "Generate Mirror" → Loading state appears
- [ ] Polling animation/indicator visible
- [ ] Status updates visible (if implemented)
- [ ] Generation completes in reasonable time (3-15 seconds typical)
- [ ] Success state appears

### Mirror Viewing Experience
- [ ] Mirror modal opens full-screen
- [ ] Screen 1 (Themes) displays correctly
  - [ ] Theme bullets are readable
  - [ ] Formatting looks good
- [ ] Can swipe to Screen 2 (Biblical)
  - [ ] Biblical references appear
  - [ ] Text is readable
- [ ] Can swipe to Screen 3 (Observations)
  - [ ] Observations display correctly
  - [ ] All sections visible
- [ ] Can swipe back to previous screens
- [ ] Close button dismisses modal
- [ ] Reflection questions appear at bottom (if implemented)
- [ ] Can complete reflection (if implemented)

### Last Mirror Card (Mirror Screen)
- [ ] After viewing, "Last Mirror" card appears at top of Mirror screen
- [ ] Card shows mirror date (Month Day, Year format)
- [ ] Card shows biblical character name (if available)
- [ ] Card shows full reflection focus (no truncation)
- [ ] "Share" button appears on left side
- [ ] "View Mirror" button appears on right side (goldenrod color)
- [ ] Tap "View Mirror" → Reopens that mirror
- [ ] Tap "Share" → Opens friend picker (if friends exist) or navigates to Friends tab
- [ ] "View past Mirrors" link appears if multiple mirrors exist
- [ ] Tap "View past Mirrors" → Opens full-sheet modal

### Past Mirrors Modal
- [ ] Modal opens with pageSheet presentation style
- [ ] Header shows "Past Mirrors" title
- [ ] Close button (X) in header works
- [ ] All past mirrors appear in list
- [ ] Mirrors sorted by date (newest first)
- [ ] Each mirror card shows same info as Last Mirror card
- [ ] Tap any mirror card → Opens that mirror in viewer
- [ ] After closing mirror viewer, modal restores/reopens
- [ ] Modal closes properly when tapping X

### Last Journal Card (Mirror Screen)
- [ ] "Last journal" heading appears above card
- [ ] Card shows journal date (Month Day, Year format)
- [ ] Card shows journal content
- [ ] Content truncates to 3 lines for long entries
- [ ] "Read more" link appears ONLY when content exceeds 3 lines
- [ ] "Read more" link does NOT appear for short entries (≤3 lines)
- [ ] Tap card or "Read more" → Expands to show full content
- [ ] "Show less" link appears when expanded
- [ ] Tap "Show less" → Collapses back to 3 lines
- [ ] Delete button (grey X) appears in upper right corner
- [ ] Tap delete X → Shows confirmation dialog
- [ ] Confirm deletion → Journal removed from list
- [ ] Cancel deletion → Journal remains
- [ ] "View past Journals" link appears if multiple journals exist
- [ ] Tap "View past Journals" → Opens full-sheet modal

### Past Journals Modal
- [ ] Modal opens with pageSheet presentation style
- [ ] Header shows "Past Journals" title
- [ ] Close button (X) in header works
- [ ] All journals appear (including those associated with mirrors)
- [ ] Journals sorted by date (newest first)
- [ ] Each journal card shows date, content, delete button
- [ ] Content truncates to 3 lines for long entries
- [ ] "Read more" appears only when content exceeds 3 lines
- [ ] Tap card or "Read more" → Expands inline
- [ ] Delete button works on each card
- [ ] Deleting journal removes it from modal immediately
- [ ] Modal closes properly when tapping X

### Journal Visibility After Mirror Generation
- [ ] Create 10+ journals → Generate mirror
- [ ] After mirror generation, journals still visible in Last Journal section
- [ ] All journals (including those in mirror) visible in Past Journals modal
- [ ] Journals never disappear after being included in a mirror

### Mirror Generation Edge Cases
- [ ] Generate second mirror (20 journals) → Works correctly
- [ ] App backgrounded during generation → Completes when returned
- [ ] App force-quit during generation → Recovers on restart
- [ ] No internet during generation → Shows error, allows retry
- [ ] Generation timeout → Shows error, allows retry
- [ ] Rapidly tap "Generate Mirror" → Only creates one request

**Notes:**
```
_________________________________________________
_________________________________________________
```

---

## 5. Day 1 — Step 6 & Push Notification Setup

### SQL reset for Step 6 testing
```sql
-- Jump straight to Step 6 (skip Steps 1–5)
UPDATE users SET day_1_completed_at = NULL, notifications_enabled = false,
  notif_card_dismissed = false, spiritual_rhythm = NULL WHERE id = '[user_id]';
UPDATE day_1_progress SET completed_at = NULL WHERE user_id = '[user_id]';
-- Then complete Day 1 Steps 1–5 normally, or manually set mini_mirror_id and jump to step 5.
```

### Step 6 — Rhythm Builder Screen
- [ ] Step 6 appears after tapping Save or "Skip reflection" on Step 5
- [ ] Bell icon visible above heading
- [ ] Heading reads "Capture what God shares."
- [ ] 1:1 with God slot is enabled by default with no day selection
- [ ] Church and Small group slots are disabled by default
- [ ] "Turn on reminders" is disabled until ≥1 enabled slot has a timeWindow
- [ ] Enabling a slot and selecting a timeWindow activates the CTA
- [ ] Tapping a selected day chip deselects it AND clears timeWindow
- [ ] Tapping a selected timeWindow chip deselects it
- [ ] "Turn on reminders" → iOS push permission dialog appears
- [ ] After granting: users.notifications_enabled=true in DB
- [ ] After granting: users.spiritual_rhythm populated in DB
- [ ] After granting: modal closes, Journal tab shows no pitch card
- [ ] X dismiss: modal closes, day_1_completed_at IS set, notifications_enabled=false
- [ ] X dismiss: NotificationPitchCard IS visible on Journal tab

### NotificationPitchCard (Journal Tab)
- [ ] Card visible after Day 1 complete + notifications_enabled=false + notif_card_dismissed=false
- [ ] Card NOT visible when notifications_enabled=true
- [ ] Card NOT visible when notif_card_dismissed=true
- [ ] Card shows bell icon, correct heading + body copy
- [ ] "Set up reminders" → opens RhythmBuilderSheet
- [ ] RhythmBuilderSheet CTA reads "Turn on reminders" (first-timer mode)
- [ ] After enabling via sheet: card disappears, notifications_enabled=true
- [ ] "Not now" → card disappears immediately, notif_card_dismissed=true in DB
- [ ] Card does not reappear after dismissal (refresh app, re-open tab)

### Settings — Notification Reminders
- [ ] Settings modal has "Notification reminders" row
- [ ] Tapping opens RhythmBuilderSheet as pageSheet
- [ ] Sheet shows "Set Up Reminders" header with X button
- [ ] Copy reads "Don't lose what God shares with you." + body line
- [ ] If returning user: slots pre-populated from spiritual_rhythm
- [ ] If returning user: CTA reads "Save" and is disabled until changes made
- [ ] Dirty check: changing any slot enables Save; reverting re-disables it
- [ ] "Turn off all reminders" visible when notifications_enabled=true
- [ ] Turn off: notifications_enabled=false, rhythm data preserved in DB
- [ ] Save: DB updated, sheet closes

### Edge Function — send-encounter-nudge (manual test)
- [ ] Manually invoke function via Supabase dashboard
- [ ] User with matching slot + timeWindow receives push notification
- [ ] User with last_opened_at < 24h ago is skipped (anti-spam)
- [ ] User with notifications_enabled=false is skipped
- [ ] User with no push_token is skipped

### last_opened_at tracking
- [ ] Background app then foreground → users.last_opened_at updates in DB
- [ ] Value is a recent timestamptz (within seconds of foregrounding)

---

## 6. Friend Invites & Connections

### No Friends State (First User)
- [ ] Friends tab shows "Pursue Jesus with Friends" pitch
- [ ] Icon displays correctly (two figures)
- [ ] "Create Invite Link" button visible
- [ ] Button is styled correctly
- [ ] Expiry note shows "72 hours"

### Creating Invite Link (User A - Device 1)
- [ ] Tap "Create Invite Link" → Shows loading state
- [ ] Native share sheet opens
- [ ] Share message includes deep link (oxbow://friend-invite/[token])
- [ ] Can share via Messages, Email, etc.
- [ ] Copy link to clipboard works
- [ ] Link format: `oxbow://friend-invite/[long-token-string]`
- [ ] Can cancel share sheet → Returns to Friends tab

### Accepting Invite (User B - Device 2)
- [ ] Receive invite link (via Messages/Email)
- [ ] Tap deep link → App opens (if installed)
- [ ] If app not installed → Prompts to install (or opens browser)
- [ ] App navigates to friend-invite route
- [ ] Shows "Accepting invite..." loading state
- [ ] Success message appears
- [ ] Shows sender's name (User A's display name)
- [ ] "Go to Friends" button works
- [ ] Navigates to Friends tab

### Post-Connection Verification (Both Devices)
**Device 1 (User A):**
- [ ] Refresh/reopen Friends tab
- [ ] Friend slot now shows User B's name
- [ ] Slot count updates (e.g., "1/5 friends")

**Device 2 (User B):**
- [ ] Friends tab now shows full UI (not pitch)
- [ ] Friend slot shows User A's name
- [ ] Can create new invite for another friend

### Friend Invite Edge Cases
- [ ] Accept expired invite (> 72 hours) → Shows error
- [ ] Accept already-used invite → Shows error
- [ ] Accept invite from someone already a friend → Shows error
- [ ] User tries to friend themselves → Prevented
- [ ] Reach 5 friends → Invite button disabled/hidden
- [ ] Open deep link when not signed in → Handled gracefully

**Notes:**
```
_________________________________________________
_________________________________________________
```

---

## 7. Mirror Sharing

### Setup (Need Friends + Mirrors)
**Prerequisites:**
- [ ] User A and User B are friends
- [ ] User A has at least one completed mirror

### Sharing Flow (User A - Device 1)
- [ ] Navigate to Mirror screen
- [ ] Scroll to "Past Mirrors" section
- [ ] Tap "Share" button on a mirror card
- [ ] Friend picker modal/sheet opens
- [ ] Shows list of friends (User B visible)
- [ ] Can select User B (checkbox/radio)
- [ ] "Share" button appears/enabled
- [ ] Tap "Share" → Shows success message
- [ ] Modal closes
- [ ] Returns to Mirror screen

### Receiving Share (User B - Device 2)
- [ ] Friends tab badge appears with "1" (unread count)
- [ ] Badge is visible on tab icon
- [ ] Open Friends tab
- [ ] "Shared with you" section appears
- [ ] Shared mirror card visible
- [ ] Shows User A's name (sender)
- [ ] Shows mirror date
- [ ] "NEW" badge visible (orange/gold color)

### Viewing Shared Mirror (User B)
- [ ] Tap shared mirror card → Opens mirror viewer
- [ ] Shows 3 screens (Themes, Biblical, Observations)
- [ ] Screen 1 (Themes) displays correctly
- [ ] Screen 2 (Biblical) displays correctly
- [ ] Screen 3 (Observations) displays correctly
- [ ] Can swipe between screens
- [ ] Close button works
- [ ] Returns to Friends tab

### Post-Viewing Verification (User B)
- [ ] Friends tab badge count decreases to "0"
- [ ] Mirror card badge changes from "NEW" to "VIEW"
- [ ] Badge color changes (orange → purple)
- [ ] Can re-view mirror (tap card again)
- [ ] Badge stays "VIEW" on re-view

### Mirror Sharing Edge Cases
- [ ] Share same mirror with multiple friends → All receive
- [ ] Share multiple mirrors with same friend → All appear
- [ ] User A views their own shared mirror → Sees full mirror
- [ ] Receive share while offline → Appears when online
- [ ] Delete app and reinstall → Shared mirrors persist
- [ ] Share mirror, then unfriend → Mirror still accessible

**Notes:**
```
_________________________________________________
_________________________________________________
```

---

## 8. Tab Navigation & UI

### Tab Bar
- [ ] Three tabs visible: Journal, Mirror, Friends
- [ ] Active tab is highlighted
- [ ] Tap each tab → Navigates correctly
- [ ] Tab icons are correct
- [ ] Tab labels are readable
- [ ] Badge appears on Friends tab when shares unread
- [ ] Badge clears when shares viewed

### Screen Transitions
- [ ] Smooth transitions between tabs
- [ ] No flickering or janky animations
- [ ] Back button works where expected
- [ ] Safe area respected (notch, home indicator)

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
- [ ] Enable airplane mode before opening app
- [ ] App opens successfully (cached data)
- [ ] Can view past mirrors offline
- [ ] Can view past journals offline (if implemented)
- [ ] Creating journal offline → Shows error or queues
- [ ] Generating mirror offline → Shows error
- [ ] Viewing shared mirrors offline → Works if cached
- [ ] Enable network → Syncs queued actions

### Poor Network Conditions
- [ ] Slow 3G simulation (use dev tools if possible)
- [ ] Transcription takes longer → Eventually completes
- [ ] Mirror generation takes longer → Eventually completes
- [ ] Shows appropriate loading states
- [ ] Timeouts handled gracefully

**Notes:**
```
_________________________________________________
_________________________________________________
```

---

## 10. Background & Multitasking

### App Backgrounding
- [ ] Background app during journal entry → Text preserved
- [ ] Background during voice recording → Recording stops/pauses
- [ ] Background during transcription → Completes when returned
- [ ] Background during mirror generation → Completes when returned
- [ ] Background during friend invite → Returns to correct state

### Force Quit & Restart
- [ ] Force quit during journal entry → Data not saved (expected)
- [ ] Force quit during mirror generation → Recovers on restart
- [ ] Force quit after journal submit → Journal saved
- [ ] Restart app → Resumes normal operation

### Incoming Interruptions
- [ ] Incoming call during voice recording → Handled gracefully
- [ ] Low battery warning → App continues working
- [ ] System notification → Doesn't break app state

**Notes:**
```
_________________________________________________
_________________________________________________
```

---

## 11. Platform-Specific Tests

### iOS Only
- [ ] SF Symbols icons display correctly
- [ ] Haptic feedback works (if implemented)
- [ ] Safe area respected (notch, Dynamic Island)
- [ ] Share sheet is native iOS style
- [ ] Deep links work from Messages, Mail, Notes
- [ ] Settings → Microphone permission works
- [ ] Push notifications work (if implemented)

### Android Only
- [ ] Material icons display correctly
- [ ] Safe area respected (navigation bar)
- [ ] Share sheet is native Android style
- [ ] Deep links work from Messages, Gmail
- [ ] Settings → Microphone permission works
- [ ] Back button navigation works correctly
- [ ] Push notifications work (if implemented)

**Notes:**
```
_________________________________________________
_________________________________________________
```

---

## 12. Performance & Polish

### Performance
- [ ] App launches quickly (< 3 seconds)
- [ ] Smooth scrolling in all screens
- [ ] No dropped frames during animations
- [ ] Memory usage reasonable (check dev tools)
- [ ] No excessive battery drain
- [ ] Image/icon loading is smooth

### Visual Polish
- [ ] All text is readable (contrast, size)
- [ ] Buttons have clear tap targets
- [ ] Loading indicators are visible
- [ ] Error messages are helpful
- [ ] Success messages are encouraging
- [ ] Spacing/padding looks intentional
- [ ] Colors match design system
- [ ] Dark mode works (if implemented)

### Accessibility
- [ ] Text is readable without zooming
- [ ] Buttons are tappable (44x44 minimum)
- [ ] Color contrast is sufficient
- [ ] VoiceOver/TalkBack works (basic test)

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
- [ ] 10th journal triggers mirror generation
- [ ] 20th journal triggers second mirror
- [ ] First friend (0 → 1) works
- [ ] 5th friend (max) works
- [ ] Attempt 6th friend → Disabled/error

### Data Display
- [ ] Dates display correctly (timezone aware)
- [ ] Long names don't break UI
- [ ] Long mirror content doesn't overflow
- [ ] Empty states are helpful

**Notes:**
```
_________________________________________________
_________________________________________________
```

---

## 14. Regression Testing (Ensure Old Features Still Work)

### Core Features Not Broken
- [ ] Text journaling still works as before
- [ ] Voice journaling still works as before
- [ ] Mirror generation still works as before
- [ ] Onboarding still works for new users
- [ ] Sign out/sign in still works

### No Visual Regressions
- [ ] Journal screen looks correct
- [ ] Mirror screen looks correct
- [ ] No layout shifts or broken styling
- [ ] Fonts/colors unchanged (unless intentional)

**Notes:**
```
_________________________________________________
_________________________________________________
```

---

## 15. Critical User Journeys (End-to-End)

### Journey 1: New User → Day 1 → Notification Opt-In
- [ ] Install app → Sign in → Day 1 modal opens
- [ ] Complete Steps 1–4 (spiritual place, 2 voice journals, mini-mirror generation)
- [ ] Step 5: view mini-mirror, optionally write reflection, tap Save or Skip
- [ ] Step 6: configure at least one slot with a timeWindow
- [ ] Tap "Turn on reminders" → iOS permission dialog → grant
- [ ] Modal closes, Journal tab shows no pitch card
- [ ] DB: notifications_enabled=true, spiritual_rhythm populated, day_1_completed_at set
- [ ] Journey feels smooth and motivated by the mirror experience

### Journey 1b: New User → Day 1 → Skip Notifications → Pitch Card → Opt-In
- [ ] Complete Day 1, tap X on Step 6 (or X while on Step 5)
- [ ] Journal tab shows "Setup" section with NotificationPitchCard
- [ ] Tap "Set up reminders" → RhythmBuilderSheet opens in first-timer mode
- [ ] Configure slots, tap "Turn on reminders" → pitch card disappears
- [ ] DB: notifications_enabled=true

### Journey 2: New User → First Regular Mirror
- [ ] Install app → Complete Day 1 (already done or skip)
- [ ] Create 10 journals (mix of text and voice)
- [ ] Generate first mirror
- [ ] View mirror completely
- [ ] Journey feels smooth and intuitive

### Journey 3: Connect Friends → Share Mirror
- [ ] User A creates invite link
- [ ] User B accepts invite
- [ ] Both see each other in Friends tab
- [ ] User A generates mirror
- [ ] User A shares mirror with User B
- [ ] User B receives notification/badge
- [ ] User B views shared mirror
- [ ] Journey feels seamless

### Journey 4: Daily Use
- [ ] Open app → Already signed in
- [ ] Submit journal quickly (text or voice)
- [ ] Check Mirror screen progress
- [ ] Check Friends tab for shares
- [ ] Experience feels fast and reliable

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
- [ ] App version number updated in app.config.js
- [ ] Build number incremented
- [ ] TestFlight/Internal Testing build passes all tests
- [ ] Privacy policy updated (if needed for sharing)
- [ ] App Store screenshots updated (if needed)
- [ ] Release notes written

### App Store Compliance
- [ ] No crashes on launch
- [ ] No broken features
- [ ] Permissions properly described
- [ ] No placeholder content
- [ ] Deep links work correctly

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

1. **Test on Multiple Devices**: Different screen sizes, iOS versions, Android versions
2. **Use Two Real Devices**: Essential for Friends features
3. **Test Fresh Install**: Simulates new user experience
4. **Test Over Multiple Days**: Ensures date handling works correctly
5. **Take Screenshots**: Document any issues found
6. **Check Console Logs**: Look for errors even if UI seems fine
7. **Test with Poor Network**: Airport WiFi, 3G, etc.
8. **Don't Rush**: Take breaks between test sections

---

**Last Updated:** 2026-03-24
**Version:** Push Notification System + Day 1 Step 6
