# Production Validation Checklist

> Run through this before pushing to new users. Cover every journey end-to-end on a real device (not simulator) with a real Supabase connection.

---

## Setup

- [ ] Test on a **physical iPhone** (not simulator — microphone, permissions, and font rendering differ)
- [ ] Use a **fresh test account** (access code never used before) for Journey 1
- [ ] Use a **returning test account** (previously completed onboarding + Day 1) for Journeys 2–6
- [ ] Have a second device/account available for friend-linking tests
- [ ] Confirm Sentry is receiving events before you start (trigger a test breadcrumb)

---

## Journey 1: Brand New User

> Goal: A user who has never opened the app gets through to the main experience without a crash or dead end.

### Auth
- [ ] Code entry screen appears on first launch
- [ ] Entering an **invalid code** shows an error and stays on the screen
- [ ] Entering a **valid code** advances to onboarding
- [ ] Keyboard dismisses properly on the code entry screen

### Onboarding Narrative
- [ ] Name entry screen: keyboard opens automatically
- [ ] Tapping outside the input dismisses the keyboard without advancing
- [ ] Continue button is **inactive (translucent)** before any text is entered
- [ ] Continue button becomes **primary blue** after first character is typed
- [ ] Submitting an empty name does nothing
- [ ] Name is saved and used on the Welcome screen ("Hey, [Name].")
- [ ] Welcome screen auto-advances after ~2.5 seconds  UNSURE
- [ ] Tapping the Welcome screen skips the timer and advances immediately
- [ ] All subsequent narrative steps (moment-one → call-to-action) advance on tap
- [ ] Background images load on each step without a blank flash
- [ ] Journal cards (Dec 12, Dec 18, etc.) fade in correctly on their steps
- [ ] "Get started" button on the final step completes onboarding and enters the app

### Post-Onboarding
- [ ] User lands on the main tab (Journal/Landing) — not back at onboarding
- [ ] Day 1 "Get Started" card is visible on the landing screen

---

## Journey 2: Returning User (Auto Sign-In)

> Goal: A user who previously signed in opens the app and goes straight to the main experience.

- [ ] App launches and **skips** the code entry screen
- [ ] App launches and **skips** the onboarding flow
- [ ] User lands directly on the Journal tab
- [ ] Mirror Status on landing screen reflects correct state (countdown / ready / no mirror)
- [ ] Satoshi font renders correctly everywhere (not falling back to system font)

---

## Journey 3: Day 1 Flow

> Goal: A user completes the full Day 1 first-journal experience.

### Step 1 — Spiritual Place
- [ ] 8 spiritual place options are visible and tappable
- [ ] Selecting a place highlights it and enables the Continue button
- [ ] Continue advances to Step 2

### Step 2 — First Voice Journal
- [ ] Microphone permission prompt appears (first time)
- [ ] **Permission denied**: shows an alert directing user to Settings, does not crash
- [ ] **Permission granted**: recording starts correctly
- [ ] Timer counts up while recording
- [ ] Pause and Resume work correctly
- [ ] Stop ends the recording and triggers transcription ("Processing...")
- [ ] After transcription, advances to Step 3

### Step 3 — Second Voice Journal + Mirror Generation
- [ ] Spiritual place image and label display correctly
- [ ] Recording controls behave the same as Step 2
- [ ] After stopping: button transitions to **"Generating Mirror"** (disabled, grey)
- [ ] "This can take up to 2 minutes" hint text appears below the button
- [ ] Mirror generation completes and advances to Step 5 automatically
- [ ] **Generation failure**: Alert with Cancel/Retry options appears, does not crash
  - Cancel → stay on Step 3 with "Record Again" button visible
  - Retry → re-attempts generation correctly

### Step 5 — Mini Mirror
- [ ] Mini Mirror content is displayed (not blank, not a loading spinner stuck)
- [ ] User can scroll through the Mirror content
- [ ] Continue / Done button exits Day 1 and lands user on the main app

### Returning to Day 1 Mid-Flow
- [ ] Close Day 1 modal mid-flow, re-open the app → resumes at the correct step
- [ ] Step 3 re-entry: shows "Record Again" (not "Start Recording") if recording was already done  UNSURE

---

## Journey 4: Core App Loop — Journal → Mirror

> Goal: A returning user creates a journal and generates or views a Mirror.

### Voice Journal (from Landing)
- [ ] Tapping "Voice" Journal Option opens recording UI
- [ ] Recording, pause, resume, and stop all work
- [ ] Transcription completes without crash
- [ ] Journal is saved and visible in journal history

### Text Journal (from Landing)
- [ ] Tapping "Text" Journal Option opens text input
- [ ] Text can be entered and submitted
- [ ] Journal is saved

### Mirror Status — Landing Screen
- [ ] **Countdown state**: shows days/hours remaining correctly
- [ ] **Ready state**: "Generate Mirror" CTA is tappable
- [ ] **Generating state**: correct UI shown, no interaction possible
- [ ] Mirror generation completes and Mirror Status updates to reflect new mirror

### MirrorViewer
- [ ] Tapping "View Mirror" navigates to Mirror detail
- [ ] Hero image/header displays correctly
- [ ] Header collapses as you scroll down
- [ ] All 4 tabs work: Mirror, Themes, Observations, Reflection
- [ ] Verse/scripture blocks render correctly
- [ ] Reflection tab: "No reflection yet" empty state shows when applicable
- [ ] **Add Reflection**: opens modal, text can be entered and saved, appears in Reflection tab
- [ ] **Share Mirror**: opens share sheet, friend list loads, multi-select works, send succeeds

---

## Journey 5: Friends & Social

> Goal: Friends features work end-to-end between two accounts.

### Friends List
- [ ] Friends tab loads without crash
- [ ] Connected friends list renders with avatars and names
- [ ] Recommendations section visible if applicable
- [ ] Badge on tab icon appears/clears correctly for pending shares

### Friend Detail
- [ ] Tapping a friend opens the detail bottom sheet
- [ ] Shared Mirrors from that friend are listed
- [ ] Tapping a shared Mirror opens MirrorViewer in read-only mode

### Friend Invite Link
- [ ] Tapping the invite link on another device opens the app (or App Store if not installed)
- [ ] The invite flow links the two accounts correctly
- [ ] Both users can see each other in Friends after linking

---

## Journey 6: Settings & Sign Out

- [ ] Settings gear icon opens the Settings/Feedback modal
- [ ] Feedback type buttons are tappable and selection state is visible
- [ ] Text input accepts and retains feedback text
- [ ] Submit button is disabled when no feedback type + text entered
- [ ] Submit sends feedback and closes modal (or shows confirmation)
- [ ] **Sign Out**: tapping Sign Out logs the user out and returns to code entry screen
- [ ] After signing out, re-entering a valid code signs back in correctly

---

## Edge Cases & Failure Scenarios

### Network
- [ ] **Airplane mode during journal save**: error alert shown, user not stuck
- [ ] **Airplane mode during mirror generation**: alert shown, retry available
- [ ] **Slow connection**: loading states appear, nothing times out silently

### Permissions
- [ ] **Microphone denied then re-granted in Settings**: recording works after returning to app
- [ ] App does not crash if microphone access is toggled mid-session

### Content Limits
- [ ] Voice recording approaching 8-minute limit: timer reaches 8:00 and stops automatically
- [ ] Very long display name (50+ chars): renders without overflow on Welcome or landing

### Empty States
- [ ] Landing screen with **no journals yet**: handles gracefully (no crash)
- [ ] Mirror tab with **no Mirrors yet**: shows appropriate empty state
- [ ] Friends tab with **no friends yet**: shows invite/empty state

### Re-Launch Scenarios
- [ ] Force-quit during onboarding → resumes at the right step
- [ ] Force-quit during mirror generation → correct state shown on re-launch
- [ ] App backgrounded during voice recording → recording behavior on return (stops or continues gracefully)

---

## Devices / OS

- [ ] iPhone with small screen (SE / 14 mini) — check for overflow or clipped text
- [ ] iPhone with large screen (Pro Max) — check for excessive whitespace or stretched layouts
- [ ] iOS 16 (minimum supported if applicable)
- [ ] iOS 18 (latest)

---

## Before You Ship

- [ ] Sentry dashboard shows no unexpected error spikes from your test session
- [ ] No `console.error` logs that indicate silent failures
- [ ] All test accounts cleaned up or flagged so they don't pollute analytics
