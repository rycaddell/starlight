# Day 1 Onboarding Feature

Complete documentation for the Day 1 onboarding flow - a lightweight spiritual formation experience for new users.

---

## Overview

The Day 1 feature is a **6-step onboarding experience** designed to give new users their first spiritual reflection (mini-mirror) within minutes, without requiring 7+ journal entries.

### Key Characteristics:
- **Fast:** Completed in 5-10 minutes
- **Voice-first:** Two voice journal prompts instead of 7 written journals
- **Personalized:** Starts with spiritual place selection
- **AI-powered:** Generates a focused biblical mirror
- **Progressive:** Leads naturally into regular journaling flow + notification opt-in

### User Flow:
1. **Step 1:** Choose spiritual place (8 options)
2. **Step 2:** Voice journal - "What shaped your choice?"
3. **Step 3:** Voice journal - "How are you relating to God?"
4. **Step 4:** AI generates mini-mirror (30-60 seconds)
5. **Step 5:** View mini-mirror + optional focus area ("I feel invited to...")
6. **Step 6:** Set up notification reminders (rhythm builder + iOS permission request)

---

## Architecture

### Components (`components/day1/`)

#### Modal & Orchestration
- **`Day1Modal.tsx`** - Main modal that orchestrates the 5-step flow
  - Manages step state and navigation
  - Loads/saves progress to `day_1_progress` table
  - Handles back navigation and step re-recording
  - Conditionally shows "Get Started" card vs steps

#### Individual Steps
- **`GetStartedCard.tsx`** - Welcome screen with "Get started" button
- **`Step1SpiritualPlace.tsx`** - Spiritual place selection (8 options with images)
- **`Step2VoiceJournal.tsx`** - First voice prompt ("What's going on?")
- **`Step3VoiceJournal.tsx`** - Second voice prompt ("How are you relating to God?")
- **`Step4Loading.tsx`** - Loading screen during mirror generation
- **`Step5MiniMirror.tsx`** - Mini-mirror display + optional focus area ("I feel invited to..."); Save button enabled when text entered; "Skip reflection" link advances without saving
- **`Step6RhythmBuilder.tsx`** - Notification rhythm builder; bell icon + copy; slot editor (1:1 with God enabled by default, Church + Small group disabled); "Turn on reminders" CTA (enabled when ≥1 slot has a timeWindow set); X dismisses without enabling

#### Viewer
- **`Day1MirrorViewer.tsx`** - Full-screen viewer for Day 1 mirrors from Mirror tab
  - Same design as Step 5 but in modal format
  - Shows biblical parallel, encouraging verse, challenging verse
  - Focus areas are read-only after first save

### Service Layer (`lib/supabase/day1.js`)

Dedicated service layer for Day 1 operations:

```javascript
// Progress management
createDay1Progress(userId)           // Create new progress record
getDay1Progress(userId)              // Get user's progress state
updateDay1Progress(userId, updates)  // Update progress fields

// Journal linking
saveStepJournal(userId, stepNumber, journalId)  // Link journal to step

// Mirror generation
generateMiniMirror(userId)           // Trigger AI generation
getDay1Mirror(userId)                // Fetch completed mirror

// Focus areas
saveFocusAreas(userId, mirrorId, focusText)     // Save user's focus
extractFocusTheme(focusText)         // Extract 1-2 word theme (AI)
```

### Edge Functions

#### `generate-day-1-mirror`
Generates a mini-mirror from 2 voice journals + spiritual place.

**Location:** `supabase/functions/generate-day-1-mirror/index.ts`

**Input:**
```json
{
  "userId": "uuid"
}
```

**Process:**
1. Fetch `day_1_progress` record
2. Validate `spiritual_place`, `step_2_journal_id`, `step_3_journal_id` exist
3. Fetch both journals, verify `transcription_status = 'completed'`
4. Sanitize journal content (escape quotes, newlines, etc.)
5. Call OpenAI with structured prompt
6. Parse JSON response (3-attempt strategy with progressive fixes)
7. Save to `mirrors` table with `mirror_type = 'day_1'`
8. Update `day_1_progress` with `mini_mirror_id`

**AI Model:** `gpt-5-mini` (faster, better content filtering than gpt-4o-mini)

**Token Limit:** 10,000 (matches regular mirror generation)

**Timeout:** 4 minutes (240,000ms)

**Output Schema:**
```json
{
  "screen2_biblical": {
    "parallel_story": {
      "character": "Biblical character name",
      "story": "2-3 sentence story paralleling user's experience",
      "connection": "How this connects to their journey"
    },
    "encouraging_verse": {
      "reference": "Bible verse reference",
      "text": "Full verse text",
      "application": "How this speaks to their situation"
    },
    "challenging_verse": {
      "reference": "Bible verse reference",
      "text": "Full verse text",
      "invitation": "Gentle invitation for reflection"
    }
  },
  "one_line_summaries": {
    "spiritual_journey": "10-12 word summary of step 2 answer",
    "prayer_focus": "10-12 word summary of step 3 answer"
  }
}
```

**Error Handling:**
- Content filter detection: If `finish_reason === 'content_filter'`, makes a second API call to complete the truncated response
- JSON parsing: 3-attempt strategy (direct parse → basic sanitization → aggressive fixes)
- Comprehensive logging at every step

#### `extract-focus-theme`
Extracts a 1-2 word theme from focus areas text.

**Location:** `supabase/functions/extract-focus-theme/index.ts`

**Input:**
```json
{
  "focusText": "I want to focus on trusting God more in my work situation..."
}
```

**Output:**
```json
{
  "theme": "Trust"
}
```

**Fallback:** Returns "Growth" if extraction fails

---

## Database Schema

### `day_1_progress`

Tracks user progress through Day 1 onboarding flow.

**Migration:** `supabase/migrations/20260207000000_add_day_1_feature.sql`

```sql
CREATE TABLE day_1_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Step completion tracking
  current_step INTEGER DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Step 1: Spiritual place selection
  spiritual_place TEXT,

  -- Step 2 & 3: Voice journal IDs
  step_2_journal_id UUID REFERENCES journals(id) ON DELETE SET NULL,
  step_3_journal_id UUID REFERENCES journals(id) ON DELETE SET NULL,

  -- Step 4: Mirror generation
  generation_status TEXT DEFAULT 'pending',
  generation_started_at TIMESTAMP WITH TIME ZONE,
  mini_mirror_id UUID REFERENCES mirrors(id) ON DELETE SET NULL,

  -- Step 5: Focus area
  focus_areas TEXT,
  focus_theme TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one record per user
  UNIQUE(user_id)
);

-- Indexes
CREATE INDEX idx_day_1_progress_user_id ON day_1_progress(user_id);
CREATE INDEX idx_day_1_progress_generation_status ON day_1_progress(generation_status);
```

**Fields Explained:**

- `current_step` - Which step user is currently on (0-5)
- `spiritual_place` - Selected spiritual place (Adventuring, Battling, Hiding, etc.)
- `step_2_journal_id` - Journal from "What shaped your choice?" prompt
- `step_3_journal_id` - Journal from "How are you relating to God?" prompt
- `generation_status` - Status of mirror generation (pending, in_progress, completed, failed)
- `mini_mirror_id` - References the generated Day 1 mirror in `mirrors` table
- `focus_areas` - User's text response to "Where is God inviting you to focus?"
- `focus_theme` - AI-extracted 1-2 word theme from focus areas
- `completed_at` - When user finished entire Day 1 flow

**Row Level Security:**
```sql
-- Users can only see/update their own progress
CREATE POLICY "Users can view own progress"
  ON day_1_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON day_1_progress FOR UPDATE
  USING (auth.uid() = user_id);
```

### Voice Journal Columns on `journals`

Day 1 voice journals use the same voice transcription pipeline columns as regular voice journals:

- `transcription_status`: `'pending'` → `'processing'` → `'completed'` | `'failed'`
- `audio_url`: Storage path in `audio-recordings` bucket
- `local_audio_path`: Device path used for recovery

The `generate-day-1-mirror` Edge Function validates `transcription_status = 'completed'` on both journals before generating the mirror. If either is still pending, it returns an error and the client retries.

See [BULLETPROOF_VOICE_PLAN.md](./BULLETPROOF_VOICE_PLAN.md) for the full voice pipeline reference.

---

### Updates to `mirrors` Table

Day 1 mini-mirrors are stored in the existing `mirrors` table with `mirror_type = 'day_1'`.

**Key Differences:**
- `mirror_type` = `'day_1'` (vs `'full'` for regular mirrors)
- `journal_count` = `2` (only 2 voice journals)
- `screen_1_themes` = `null` (Day 1 doesn't have themes screen)
- `screen_2_biblical` = JSON with biblical mirror content
- `screen_3_observations` = `null` (Day 1 doesn't have observations)
- `screen_4_suggestions` = `null` (Day 1 doesn't have suggestions)

**Example Day 1 Mirror Row:**
```json
{
  "id": "abc123...",
  "custom_user_id": "user-uuid",
  "mirror_type": "day_1",
  "journal_count": 2,
  "screen_1_themes": null,
  "screen_2_biblical": {
    "parallel_story": { ... },
    "encouraging_verse": { ... },
    "challenging_verse": { ... }
  },
  "screen_3_observations": null,
  "screen_4_suggestions": null,
  "status": "completed",
  "created_at": "2024-02-10T15:30:00Z"
}
```

---

## Integration Points

### Mirror Tab Integration

Day 1 mirrors appear in the main Mirror tab alongside regular mirrors.

**Location:** `app/(tabs)/mirror.tsx`

**Key Changes:**
1. Query for Day 1 mirror: `getDay1Mirror(user.id)`
2. Compare timestamps between Day 1 and last regular mirror
3. Display most recent (Day 1 or regular)
4. Extract biblical character from `screen_2_biblical.parallel_story.character`
5. Show "Biblical Mirror: [Character]" in card subtitle

**Modal Launch:**
- Clicking Day 1 mirror card opens `Day1MirrorViewer` modal
- Clicking "View past Mirrors" includes Day 1 in `PastMirrorsModal`

### Day 1 Recovery Flow

If the user closes the app during Step 2 or Step 3 voice recording, the Day 1 flow needs to recover gracefully without losing the recording or requiring the user to re-record.

**How it works:**

1. `useAudioRecording` is called with `day1Step={2 | 3}` — this tag is persisted in the AsyncStorage job record.
2. On next app launch, `useVoiceRecovery` runs and processes any pending jobs.
3. After re-triggering transcription, recovery calls `saveStepJournal(uid, job.day1Step, journalId)` to link the journal back to `day_1_progress`.
4. `Day1Modal` detects `isRecovering=true` and shows a "Finishing your last recording..." spinner.
5. `Day1Modal` polls `day_1_progress` every 3 seconds until the step journal ID appears.
6. Once linked, the modal auto-routes to Step 4 (loading screen → mirror generation).

**Code locations:**
- `app/(tabs)/_layout.tsx` — mounts `useVoiceRecovery`, passes `isRecovering` to `Day1Modal`
- `components/day1/Day1Modal.tsx` — spinner display + `day_1_progress` polling
- `hooks/useVoiceRecovery.ts` — recovery logic including `saveStepJournal` call

---

### Voice Recording Permission Flow

**IMPORTANT:** Day 1 fixed a critical first-time permission bug.

**Problem (Before):**
1. User taps voice button → app alert appears
2. User taps "Enable" → iOS permission dialog appears
3. User grants permission → iOS backgrounds app
4. App tries to start recording while backgrounded → **CRASH**

**Solution (After):**
1. Removed unnecessary app alert (confusing UX)
2. Request iOS permission directly
3. **Wait for AppState to become 'active'** before starting recording
4. 50ms delay after active state for stability

**Implementation:**
```typescript
// Request permission
const permission = await Audio.requestPermissionsAsync();

if (permission.granted) {
  // Wait for app to become active after permission dialog
  const subscription = AppState.addEventListener('change', async (nextAppState) => {
    if (nextAppState === 'active') {
      subscription.remove();

      // Small delay to ensure fully active
      setTimeout(async () => {
        await handleStartRecording(true);
      }, 50);
    }
  });

  // Fallback timeout
  setTimeout(() => subscription.remove(), 3000);
}
```

**Applied To:**
- `app/(tabs)/index.tsx` - Main journal screen
- `components/day1/Step2VoiceJournal.tsx` - Day 1 Step 2
- `components/day1/Step3VoiceJournal.tsx` - Day 1 Step 3

### Spiritual Place Images

**Location:** `assets/images/spiritual-places/`

**Files:**
- `adventuring.jpg` (~50KB)
- `battling.jpg` (~50KB)
- `celebrating.jpg` (~50KB)
- `grieving.jpg` (~50KB)
- `hiding.jpg` (~50KB)
- `resting.jpg` (~50KB)
- `wandering.jpg` (~50KB)
- `working.jpg` (~50KB)
- `default.jpg` (fallback)

**Optimization:**
- Converted from WebP → JPG for better iOS compatibility
- Compressed from 150KB → 50KB each (67% reduction)
- Total: 400KB for all 8 images

**Usage:**
```typescript
const SPIRITUAL_PLACE_IMAGES = {
  'Adventuring': require('@/assets/images/spiritual-places/adventuring.jpg'),
  // ...
};

<Image source={SPIRITUAL_PLACE_IMAGES[spiritualPlace]} />
```

---

## User Experience Flow

### First-Time User Journey

```
1. User creates account with phone OTP
   ↓
2. OnboardingContext detects user hasn't completed Day 1
   ↓
3. Day1Modal opens automatically (full-screen modal)
   ↓
4. GetStartedCard: "Your faith is between resting and adventuring..."
   ↓
5. User taps "Get started"
   ↓
6. Step 1: Select spiritual place
   ↓
7. Step 2: Voice journal (auto-progresses after recording)
   ↓
8. Step 3: Voice journal (auto-progresses after recording)
   ↓
9. Step 4: "Mirror In Progress" (30-60 sec AI generation)
   ↓
10. Step 5: View mini-mirror + optional "I feel invited to..." reflection
    User can Save (enabled when text entered) or tap "Skip reflection"
    Either advances to Step 6.
    If user taps X here, Day 1 is marked complete → pitch card becomes visible.
    ↓
11. Step 6: Rhythm builder — configure when to receive reminders
    - Slot options: 1:1 with God (default on), Church, Small group
    - Each enabled slot needs a timeWindow (Morning / Afternoon / Evening)
    - "Turn on reminders" → iOS permission dialog → push token saved →
      notifications_enabled=true, spiritual_rhythm saved → completeDay1()
    - X dismiss → completeDay1() without enabling notifications
    ↓
12. Modal closes, user sees Journal tab
    ↓
13. Mirror appears in Mirror tab as "Biblical Mirror: [Character]"
    ↓
14. If notifications NOT enabled: NotificationPitchCard visible on Journal tab
    (shown until user opts in or dismisses)
```

### Returning to Day 1 (Back Navigation)

If user taps back arrow from Step 3 to Step 2:
- Recording button shows (not auto-progressed)
- "Record again" and "Next" buttons appear
- User can re-record or proceed

**Implementation:**
```typescript
const existingJournalId = progress?.step_2_journal_id;
const hasRecorded = !!existingJournalId;

// If first time recording, auto-progress
if (!existingJournalId) {
  onComplete(); // No buttons shown
} else {
  // Returning user, show buttons
  setHasRecorded(true);
}
```

---

## AI Prompt Engineering

### Day 1 Prompt Structure

```
You are a wise, compassionate spiritual director. A user just completed Day 1 onboarding.

CRITICAL: You MUST respond with valid JSON.

SPIRITUAL PLACE: [Adventuring]
(User chose "Adventuring" from options: Adventuring, Battling, Hiding, Resting, Working, Wandering, Grieving, Celebrating)

QUESTION 2: "What in your life and experience shaped your choice of place?"
ANSWER 2: [sanitized journal content]

QUESTION 3: "When you pray, what do you talk to God about most often?"
ANSWER 3: [sanitized journal content]

Generate a biblical mirror AND one-line summaries in JSON format:
[JSON structure...]

IMPORTANT REQUIREMENTS:
- Reference their spiritual place throughout the response
- Be specific to their actual answers, not generic
- Keep summaries to 10-12 words maximum each
- Tone: Warm, encouraging, personal, accessible

Generate only the JSON response with no additional text.
```

### Content Sanitization

**Critical for Reliable Generation:**

```javascript
function sanitizeContent(text) {
  return text
    .replace(/\\/g, '\\\\')  // Escape backslashes first
    .replace(/"/g, '\\"')    // Escape quotes
    .replace(/\n/g, ' ')     // Replace newlines with spaces
    .replace(/\r/g, '')      // Remove carriage returns
    .replace(/\t/g, ' ')     // Replace tabs with spaces
    .trim();
}
```

**Why This Matters:**
- Voice transcriptions can contain unexpected characters
- Unescaped quotes break the prompt structure
- Malformed prompts cause AI to generate invalid JSON

---

## Testing Checklist

### Day 1 Flow Testing

- [ ] Fresh install triggers Day 1 modal automatically
- [ ] Can select each spiritual place option
- [ ] Voice permission request works (iOS permission only, no app alert)
- [ ] Step 2 voice recording transcribes correctly
- [ ] Step 3 voice recording transcribes correctly
- [ ] Auto-progression after first recording (no buttons)
- [ ] Back navigation shows buttons on re-visit
- [ ] Mirror generation completes within 60 seconds
- [ ] Generated mirror shows biblical character
- [ ] Step 5: Save button enabled when reflection text entered
- [ ] Step 5: "Skip reflection" link advances without saving text
- [ ] Step 5: Tapping X marks Day 1 complete → pitch card visible on Journal tab
- [ ] Day 1 mirror appears in Mirror tab
- [ ] Can view Day 1 mirror from Past Mirrors sheet

### Step 6 — Rhythm Builder

- [ ] Step 6 screen appears after Step 5 Save or Skip
- [ ] Bell icon and correct copy visible ("Capture what God shares.")
- [ ] 1:1 with God slot is enabled by default
- [ ] Church and Small group slots are disabled by default
- [ ] "Turn on reminders" is disabled until ≥1 slot has a timeWindow selected
- [ ] Tapping a day chip deselects it; deselecting a day also clears timeWindow
- [ ] Tapping a selected timeWindow chip deselects it
- [ ] "Turn on reminders" → iOS permission dialog appears
- [ ] After granting: notifications_enabled=true in DB, spiritual_rhythm saved
- [ ] After granting: modal closes, user lands on Journal tab, no pitch card
- [ ] X dismiss → modal closes, pitch card IS visible on Journal tab
- [ ] Day 1 marked complete (day_1_completed_at set) on both paths

### Notification Pitch Card (Journal Tab)

- [ ] Visible when: day_1_completed_at set + notifications_enabled=false + notif_card_dismissed=false
- [ ] Not visible when notifications_enabled=true
- [ ] Not visible when notif_card_dismissed=true
- [ ] "Set up reminders" → opens RhythmBuilderSheet
- [ ] RhythmBuilderSheet in first-timer mode: CTA reads "Turn on reminders"
- [ ] After enabling via sheet: notifications_enabled=true, pitch card disappears
- [ ] "Not now" → notif_card_dismissed=true, card disappears immediately

### Settings — Notification Reminders

- [ ] Settings modal has "Notification reminders" row
- [ ] Tapping opens RhythmBuilderSheet
- [ ] Sheet pre-populated with existing spiritual_rhythm data
- [ ] CTA reads "Save" (disabled until changes made)
- [ ] "Turn off all reminders" visible when notifications_enabled=true
- [ ] Turning off: notifications_enabled=false, rhythm data preserved
- [ ] Saving changes: updated slots stored in DB

### Permission Testing

- [ ] Fresh install: Only iOS permission dialog shows (no app alert)
- [ ] Permission granted: Recording starts smoothly
- [ ] Permission denied: Shows helpful error message
- [ ] Repeat recording: Permission not re-requested

### Edge Cases

- [ ] User closes app during Step 2 voice recording → Recovery spinner shows on next launch; recording completes; auto-routes to Step 4
- [ ] User closes app during Step 3 voice recording → Same as Step 2
- [ ] User closes app during generation (Step 4) → Step 4 resumes on reopen and polls for completion
- [ ] Mirror generation fails → Shows retry dialog
- [ ] User goes back from Step 3 to Step 2 → Can re-record
- [ ] User tries to start new recording while paused → Old recording discarded

### Recovery Scenarios

- [ ] Force-quit app immediately after tapping Stop (before upload) → Recovery re-uploads from local file on next launch
- [ ] Force-quit after upload, before journal insert → Recovery creates journal and triggers transcription
- [ ] Force-quit after journal insert → Recovery re-fires edge function
- [ ] Recovery spinner appears → Eventually clears and modal auto-advances to Step 4
- [ ] Job fails 3+ times → Auto-dequeued; user can re-record manually

---

## Performance Metrics

### Day 1 Completion Time
- **Minimum:** 3 minutes (quick voice journals)
- **Average:** 5-7 minutes (thoughtful responses)
- **Maximum:** 10 minutes (long recordings + slow AI)

### AI Generation Speed
- **Model:** gpt-5-mini
- **Average:** 30-45 seconds
- **99th percentile:** 60 seconds
- **Timeout:** 4 minutes (same as regular mirrors)

### Asset Size
- **Spiritual place images:** 400KB total
- **Day 1 components:** ~15KB (gzipped)
- **Impact on app bundle:** Minimal

---

## Future Improvements

### Planned Enhancements
1. **Day 2, Day 3, etc.** - Progressive onboarding sequence
2. **Focus theme integration** - Use extracted theme in app navigation
3. **Revisit prompt** - "Review your Day 1 focus" after 30 days
4. **Analytics** - Track completion rates and drop-off points

### Technical Debt
1. **Hardcoded spiritual places** - Should be configurable
2. **No A/B testing** - Can't experiment with prompts
3. **Voice recovery is best-effort** - If the local audio file is purged by iOS before upload (e.g. a full 8-min recording that never uploaded), the recording is permanently lost

---

## Troubleshooting

### "This experience is currently in the background"
**Cause:** App tried to start recording while in background state
**Fix:** Ensure AppState listener waits for 'active' before starting recording

### "Unterminated string in JSON"
**Cause:** AI response contains unescaped quotes or newlines
**Fix:** Input sanitization + multi-attempt JSON parsing in edge function

### "Transcriptions not yet complete"
**Cause:** Mirror generation triggered before voice transcription finished
**Fix:** Edge function validates `transcription_status = 'completed'`. Client-side retry logic in `handleGenerateMirror` silently retries every 5 seconds up to 12 times (1 minute total) before surfacing an error to the user. This is not logged to Sentry — it's a normal transient state.

### Mirror doesn't appear in Mirror tab
**Cause:** `mini_mirror_id` not linked in `day_1_progress`
**Fix:** Verify edge function updates progress after mirror creation

### Recovery spinner loops indefinitely
**Cause:** `saveStepJournal` failed silently, so `day_1_progress.step_2_journal_id` or `step_3_journal_id` is never set
**Fix:** Check `day_1_progress` row directly. If the journal exists and is completed but the step column is null, manually update it and the modal will advance on next poll.

### "Finishing your last recording..." never resolves
**Cause:** The voice job may be stuck or the transcription failed
**Fix:** Check `oxbow_pending_voice_jobs` in AsyncStorage and the journal row's `transcription_status`. If `'failed'`, the recovery hook will retry on next launch (up to 3 attempts).

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Overall app architecture
- [DATABASE.md](./DATABASE.md) - Full database schema
- [ONBOARDING.md](./ONBOARDING.md) - New engineer onboarding
- [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md) - QA procedures
