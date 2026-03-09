# Voice Journaling — Manual Test Protocol

**Last Updated:** March 2026
**Applies to:** Any release touching `useAudioRecording`, `useVoiceRecovery`, `transcription.js`, or the `transcribe-audio` edge function. Also run the Tier A tests before every release as a regression check.

---

## When to Run Which Tests

| Tier | Run When | Time Required |
|------|----------|---------------|
| **A — Core Regression** | Before every release | ~8 minutes |
| **B — Pipeline Scenarios** | Any change to voice recording or transcription code | ~20 minutes |
| **C — Recovery Scenarios** | Any change to `useVoiceRecovery` or the upload/journal creation flow | ~25 minutes |
| **D — Day 1 Voice** | Any change to Day 1 onboarding or `day1.js` | ~15 minutes |

---

## Test Environment Requirements

- **Real device required** — iOS Simulator cannot record real audio
- **Real Supabase connection** — transcription requires the live edge function
- **Good WiFi baseline** — run network-failure tests separately on cellular
- **Check Logflare/Axiom after every session** — some failures are silent on the client but visible in edge function logs
- **Check Sentry after every session** — even a clean-looking test may have logged a non-fatal error

---

## Understanding the Pipeline

Every voice recording passes through these stages in order. Each stage is a potential failure point. The manual tests below are organized around this pipeline.

```
[1] RECORD        → User taps record, audio captured by expo-av
[2] PERSIST       → Audio file copied from /Caches to permanent /Documents storage
[3] UPLOAD        → Audio binary uploaded to Supabase Storage
[4] CREATE ROW    → Pending journal row inserted (transcription_status = 'pending')
[5] TRIGGER       → Edge function fired (fire-and-forget)
[6] TRANSCRIBE    → Whisper processes audio server-side
[7] DB UPDATE     → transcription_status → 'completed' or 'failed', content written
[8] CLIENT NOTIFY → Realtime subscription fires, journal content delivered to app
[9] CLEANUP       → Local audio file deleted, AsyncStorage job dequeued
```

Force-quitting at any point between [2] and [8] should result in recovery on next launch.

---

## Tier A — Core Regression (Run Before Every Release)

**Goal:** Confirm the basic happy path works and recovery hasn't broken.

### A1 — Short recording, happy path
1. Open the Journal tab
2. Switch to Voice
3. Record ~30 seconds of natural speech (say something you'd actually journal)
4. Tap Stop
5. **Wait** — do not navigate away

**Pass:**
- Processing indicator appears immediately after stop
- Within 30 seconds, journal content appears (via Realtime) or you're prompted to review
- Transcribed text is readable and corresponds to what you said
- Journal count increments on the Mirror tab

**Fail signals:**
- Spinner runs for more than 90 seconds with no result
- "Still Transcribing" alert appears (means Realtime/polling didn't complete)
- App navigates somewhere unexpected
- Any crash or white screen

---

### A2 — Force-quit recovery
1. Record ~20 seconds of speech
2. Tap Stop
3. **Immediately** after the processing spinner appears — force-quit the app (swipe up from app switcher)
4. Wait 5 seconds
5. Reopen the app

**Pass:**
- App reopens normally (no crash on launch)
- A notification or alert appears indicating a recording was recovered (once Bug 4 is fixed)
- Within 60 seconds of reopening, the journal appears in the list
- Check AsyncStorage: the pending job should be cleared after recovery succeeds

**Fail signals:**
- App crashes on relaunch
- No notification and no journal appears after 2 minutes
- Journal appears with empty content
- Same journal appears twice

---

## Tier B — Pipeline Scenarios (Voice Code Changes)

### B1 — Medium recording (2 minutes)
Same flow as A1, but record 2 full minutes. Transcription takes longer — Whisper processes roughly 1 second of audio per second for longer clips.

**Pass:** Transcription completes within 3 minutes. Content is accurate.

**Watch for:** Upload timeout (Bug 3) — 2-minute audio is ~2MB, upload should complete well within 30 seconds on WiFi.

---

### B2 — Long recording (5–7 minutes)
Record 5–7 minutes of spoken content. This approaches the 8-minute limit and exercises the full upload/transcription cycle with a larger file.

**Pass:** Auto-stop does NOT trigger (that's the 8-minute limit). Transcription completes within 10 minutes.

**Watch for:** Upload taking longer than 30 seconds, or the spinner disappearing without a result (indicates the Realtime subscription may have timed out).

---

### B3 — 8-minute auto-stop
1. Start recording
2. Let it run — do not tap Stop
3. At 8 minutes, the app should auto-stop

**Pass:**
- At exactly 8:00, recording stops automatically
- Alert appears: "Your 8-minute recording has been saved and is now being transcribed"
- Processing state begins
- Transcription completes (may take 10+ minutes — wait, or force-quit and test recovery)

**Fail signals:**
- No auto-stop at 8 minutes (recording continues past limit)
- Auto-stop triggers too early
- Alert doesn't appear
- App crashes when auto-stop fires

---

### B4 — Pause and resume
1. Start recording
2. After 30 seconds, tap Pause
3. Note the timer value — it should freeze
4. Wait 10 seconds
5. Tap Resume
6. Record another 30 seconds
7. Stop

**Pass:**
- Timer freezes at the correct value when paused
- Timer resumes from the frozen value (not from zero, not from elapsed real time)
- Final transcription contains content from both segments

---

### B5 — Multiple pause/resume cycles
1. Record 20 seconds
2. Pause → wait 5 seconds → Resume → record 20 seconds
3. Pause → wait 5 seconds → Resume → record 20 seconds
4. Stop

**Pass:** Timer shows ~60 seconds total (not 70+). Transcription contains all three segments.

**Watch for:** Duration drift — if each resume adds the wait time to the total, the timer is incorrect.

---

### B6 — App backgrounded during recording
1. Start recording
2. After 20 seconds, press the Home button (app goes to background)
3. Wait 10 seconds
4. Return to the app

**Pass:**
- Recording auto-paused when backgrounded (timer froze)
- Duration displayed correctly when returning
- Pause/Resume button shows correct state
- Can resume from where it paused

**Fail signals:**
- App crashed while backgrounded
- Timer shows wrong value on return (e.g., added 10 seconds for the background time)
- Recording continued running in background (would drain battery, likely cause issues)

---

### B7 — Device lock during recording
1. Start recording
2. After 20 seconds, press the side button to lock the device
3. Wait 10 seconds
4. Unlock

**Pass:** Same as B6 — recording paused, duration preserved, can resume.

---

### B8 — Incoming call during recording
1. Have a second device call the test device while recording
2. Decline the call

**Pass:** Recording paused gracefully. No crash. Can resume after.

**Note:** Accept the call if you want to test the full interruption scenario. Recording should pause and the user should be able to resume after the call ends.

---

### B9 — Very short recording (under 5 seconds)
Record 2–3 seconds of speech.

**Pass:** Transcription either succeeds with a short result, or fails gracefully with a clear error message. No crash.

**Watch for:** Whisper may return an empty transcription or an error for very short audio. The app should not crash or show a blank journal.

---

### B10 — Microphone permission denied
1. Go to iOS Settings → Oxbow → Microphone → Toggle OFF
2. Return to the app
3. Attempt to start recording

**Pass:**
- Alert appears explaining microphone access is required
- No crash
- Recording does not start

4. Tap the settings link in the alert (or navigate manually), re-enable microphone
5. Return to the app, attempt recording again

**Pass:** Recording starts normally.

---

### B11 — No network when stopping recording
1. Record ~30 seconds
2. **Before tapping Stop**, turn on Airplane Mode
3. Tap Stop

**Pass (after Bug 3 fix):**
- Upload times out after ~30 seconds (not indefinitely)
- User sees an appropriate message (not an infinite spinner)
- Job is saved to AsyncStorage for recovery
- Turning Airplane Mode off and relaunching → recovery completes

**Fail (current behavior before fix):**
- Infinite spinner with no timeout

---

### B12 — Network drops mid-upload
1. Start recording ~30 seconds
2. Stop recording
3. Immediately after spinner appears — turn on Airplane Mode for 5 seconds, then turn it off
4. Wait for transcription to complete

**Pass:** Upload either succeeds after network returns, or the upload timeout fires and recovery queues the job. No crash. No infinite spinner.

---

## Tier C — Recovery Scenarios (Recovery Code Changes)

These tests require deliberately interrupting the app at specific pipeline stages. They are the most time-consuming but the most important for data integrity.

**How to force-quit precisely:** After the trigger action, use the iOS app switcher (swipe up, hold briefly) to kill the app. Practice the timing — you have roughly 1–2 seconds to kill after each trigger point.

---

### C1 — Force-quit immediately after tapping Stop (Stage 2: before upload)
1. Record 30 seconds
2. Tap Stop
3. **Kill the app within 1 second** — before the upload can begin

**Pass:**
- On relaunch: recovery notification appears
- Journal appears within 60 seconds of relaunch
- Check Logflare: transcription was triggered after recovery

---

### C2 — Force-quit during upload (Stage 3: mid-upload)
1. Record 3–4 minutes (larger file makes upload take longer, giving you time to kill)
2. Tap Stop
3. Kill the app within 5 seconds of the spinner appearing

**Pass:**
- On relaunch: recovery detects that storagePath was null (upload didn't complete)
- Recovery re-uploads the local file
- Journal appears after recovery completes

---

### C3 — Force-quit after upload, before journal row created (Stage 4)
This is the hardest timing to hit. The upload and journal creation are sequential but fast.

1. Record 30 seconds
2. Tap Stop
3. Kill the app approximately 8–10 seconds after the spinner appears (after upload likely completed, before the DB insert)

**Pass:**
- On relaunch: recovery finds storagePath in the job but no journalId
- Recovery creates the journal row and triggers transcription
- Journal appears

**Note:** This timing window is very small. It may take a few attempts to hit it. The Sentry breadcrumb trail will show you which stage recovery started from.

---

### C4 — Force-quit during transcription (Stage 6–7: most common real-world scenario)
1. Record 2 minutes
2. Tap Stop, wait for spinner to appear
3. Kill the app 20–30 seconds into transcription (after the DB row exists, while Whisper is processing)

**Pass:**
- On relaunch: recovery finds journalId in the job, status is 'pending' or 'processing'
- Recovery re-triggers the edge function (idempotent — won't double-transcribe)
- Journal appears after transcription completes

---

### C5 — Multiple launches without completing recovery
1. Follow C4 to get a pending job in AsyncStorage
2. Kill the app again immediately after relaunch (before recovery finishes)
3. Repeat once more (3 launches total, 3 recovery attempts)
4. On the 4th launch: recovery should see `recoveryAttempts >= 3` and abandon the job

**Pass:**
- After 3 failed attempts, the job is dequeued and local file cleaned up
- No notification of a recovered recording (job was abandoned, not recovered)
- Check Sentry: a warning breadcrumb should appear noting the job was abandoned after max attempts

**Note:** This is an edge case for catastrophic repeated failures. The behavior is correct (abandon rather than loop forever) but the UX is that the user loses the recording. This is the known trade-off.

---

### C6 — Already-completed job in queue (duplicate prevention)
1. Follow the happy path (A1)
2. Before the app deletes the local file and dequeues the job — force-quit
3. Relaunch

**Pass:**
- Recovery detects `transcription_status = 'completed'` in the DB
- Recovery cleans up local file and dequeues without creating a second journal
- Journal is NOT duplicated in the list

---

### C7 — Day 1 Step 2 recovery
1. Enter the Day 1 flow, reach Step 2 (first voice journal)
2. Record 30 seconds, tap Stop
3. Kill the app during the processing spinner

**Pass:**
- On relaunch, recovery re-triggers transcription
- Crucially: `saveStepJournal(uid, 2, journalId)` is called during recovery — the `day_1_progress` row is linked to the recovered journal
- Day 1 flow resumes at the correct step when re-entering onboarding

---

### C8 — Day 1 Step 3 recovery
Same as C7 but for Step 3. After recovery, the `day_1_progress.step_3_journal_id` should be populated.

---

## Tier D — Day 1 Voice (Day 1 or Onboarding Changes)

### D1 — Complete Day 1 flow without interruption
Go through all 5 Day 1 steps in order, recording voice at Steps 2 and 3.

**Pass:** Each step advances correctly. The mini-mirror generates at Step 5. The focus area screen appears. Onboarding completes and the main app loads.

---

### D2 — Day 1 with app backgrounded between steps
At each voice step, background the app for 10 seconds after tapping Stop (during transcription). Return and verify the step advances correctly.

---

### D3 — Day 1 recovery mid-flow
Follow C7 (force-quit during Step 2 transcription), then relaunch and continue the Day 1 flow. Verify you can complete Step 3, and that the mini-mirror generates correctly with both journals.

---

## After Every Test Session

### Check Sentry (2 minutes)
1. Open Sentry → Issues
2. Filter by "Last 30 minutes"
3. Look for any new errors not present before the session
4. Pay attention to `component: useAudioRecording` and `component: transcription` tags

### Check Logflare/Axiom (2 minutes)
1. Filter logs for `transcribe-audio` function, last 30 minutes
2. Look for:
   - Any `500` status responses
   - Whisper API errors (`rate_limit_exceeded`, `timeout`, etc.)
   - Logs that started but never completed (no `completed` entry after a `started` entry)

---

## Pass/Fail Reference

| Symptom | Likely Stage | Where to Look |
|---------|-------------|---------------|
| Infinite spinner after stop | Stage 3 (upload hung) | Sentry `upload` action |
| "Still Transcribing" alert after 3 min | Stage 7–8 (Whisper slow or failed) | Logflare edge function logs |
| Journal appears with empty content | Stage 7 (Whisper returned empty) | Logflare |
| Journal never appears, no error shown | Stage 4 or 8 (journal creation or Realtime failed) | Sentry |
| Same journal appears twice | Stage 4 + recovery duplication (Bug 6) | Sentry |
| App crashes after tapping Stop | Stage 2–4 (unhandled error in hook) | Sentry — check for `useAudioRecording stop` tag |
| Recovery never fires on relaunch | Stage 2 (file never persisted, nothing to recover) | Check AsyncStorage directly in dev build |
| Recovery fires but journal doesn't appear | Stage 3–4 (re-upload or re-insert failed) | Sentry `useVoiceRecovery recoverJob` |
