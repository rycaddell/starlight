# Voice Journaling — Bulletproof Pipeline PRD

**Status:** Draft
**Branch target:** `security/auth-rls` → merge to `main`
**Priority:** P0 — launch blocker
**Trigger:** Confirmed production incident 2026-03-03 where a user lost 2.5 minutes of spiritual journaling due to a transient network failure at the journal INSERT step. User believed the app was "crashing periodically" and re-recorded.

---

## Goal

A user must never lose a voice recording they completed. From the moment a user taps Stop, their audio is theirs — regardless of network conditions, app backgrounding, iOS process kills, server errors, or anything else. Every failure must either self-recover silently or give the user honest, non-alarming feedback.

---

## Success Criteria

- A completed recording that fails anywhere in the server pipeline is always recovered on next app launch, silently, with no data loss
- No user-visible error message implies their recording is gone when it is not
- Sentry receives clean, actionable exception reports with real stack traces — no raw object captures
- All voice journals created before the new transcription pipeline have correct `transcription_status = 'completed'` in the DB
- A voice journal in `pending` or `processing` status with `audio_url IS NULL` is treated as stale and is never counted or displayed as "in progress"

---

## Architecture Overview (Current)

This is how the pipeline works today. Read the full technical reference in `docs/BULLETPROOF_VOICE_PLAN.md`.

```
User taps Stop
    │
    ├─ Step 1: Stop and unload expo-av Recording object
    │
    ├─ Step 2: Copy audio from /Library/Caches/AV/ (ephemeral) to
    │          documentDirectory/pending_recordings/{jobId}.m4a (permanent)
    │          Enqueue PendingVoiceJob to AsyncStorage (oxbow_pending_voice_jobs)
    │
    ├─ Step 3: Upload m4a to Supabase Storage
    │          audio-recordings/{customUserId}/{jobId}.m4a
    │          (uses FileSystem.uploadAsync → iOS URL loading system, survives backgrounding)
    │          Update AsyncStorage job: storagePath = set
    │
    ├─ Step 4: INSERT journal row
    │          transcription_status: 'pending', audio_url: storagePath, content: ''
    │          Update AsyncStorage job: journalId = set
    │
    ├─ Step 5: Fire transcribe-audio Edge Function (fire-and-forget, no await)
    │
    └─ Step 6: Poll journals table every 3s for transcription_status = 'completed'
               On completed → call onTranscriptionComplete(), delete local file, dequeue job

Edge Function (server-side):
    ├─ Mark journal: processing
    ├─ Download audio from Storage
    ├─ Call OpenAI Whisper
    ├─ Update journal: content + status = 'completed'
    └─ Delete audio from Storage

Recovery (useVoiceRecovery — runs once per app launch after auth):
    For each job in oxbow_pending_voice_jobs:
    ├─ journalId set + DB completed → clean up, dequeue
    ├─ journalId set + DB pending/processing → re-fire edge function
    ├─ journalId set + DB failed → re-upload to new path, reset status, re-trigger
    ├─ journalId set + journal not in DB → fall through to file recovery
    ├─ storagePath set, no journalId → create pending journal, trigger
    └─ only localPath set → re-upload, create journal, trigger
    Max attempts: 3 — after that, dequeue and delete local file
```

---

## Error Scenario Catalog

Each scenario below documents: what can go wrong, what happens today, whether it is covered, and what must change.

---

### Step 1 — Stop and Unload Recording

#### 1a. `recording.stopAndUnloadAsync()` throws
**Cause:** iOS AVAudioRecorder in a bad state, interrupted by a phone call mid-stop, or the recording object was already unloaded.
**Current behavior:** Caught by the outer try/catch. Shows `Alert.alert('Error', 'Failed to stop recording properly.')` — no recovery, no local file saved. Recording is lost.
**Status:** ⚠️ Partial — error is caught but message is wrong and recording is gone
**Required change:** Before calling `stopAndUnloadAsync()`, attempt to get the URI via `recording.getURI()`. If unload fails but URI exists, proceed with the save pipeline using whatever audio was captured. Add a Sentry capture with `tags: { action: 'stop_unload_failed' }`.

#### 1b. `recording.getURI()` returns null after successful stop
**Cause:** Rare — expo-av internal state issue.
**Current behavior:** The `if (uri && onTranscriptionComplete)` guard is false; the function returns silently with no alert, no save. Recording is lost.
**Status:** ❌ Not handled
**Required change:** Add an explicit check: if URI is null after a successful stop, capture to Sentry and show: "Recording could not be saved. Please try again." Do not show a generic error.

---

### Step 2 — Persist to Local Storage + Enqueue Job

#### 2a. `FileSystem.copyAsync()` throws (disk full, permission error)
**Cause:** Device storage full, or an iOS file protection edge case.
**Current behavior:** Caught by the inner try/catch; treated as non-fatal. `persistedLocalPath` stays as the ephemeral temp URI. `enqueuePendingJob` is never called (it's inside the same try block). No recovery queue entry is created.
**Status:** ❌ Gap — if the upload subsequently succeeds but the INSERT fails, no recovery path exists. Recording is permanently lost.
**Required change:** Split the try/catch. Attempt the copy first. Whether it succeeds or not, always call `enqueuePendingJob` with whatever path is available (temp URI or permanent path). A job with a temp URI `localPath` may not survive a force-quit but at least covers the network-failure-only case. Log the copy failure to Sentry as a warning.

#### 2b. `enqueuePendingJob()` / `AsyncStorage.setItem()` throws
**Cause:** AsyncStorage is very rarely unavailable but can fail if the device is in a low-memory state.
**Current behavior:** Caught by the inner try/catch; treated as non-fatal. Same gap as 2a — no queue entry.
**Status:** ❌ Same gap as 2a
**Required change:** Same as 2a. Sentry capture on enqueue failure.

---

### Step 3 — Upload to Supabase Storage

#### 3a. Upload fails (no network, server error, bucket error)
**Cause:** No connectivity, Supabase Storage outage, or RLS rejection.
**Current behavior:** `uploadAudioToStorage` returns `{ success: false }`. `storagePath` is set to null. Falls through to the legacy `transcribeAudio()` inline path which base64-encodes the audio and sends it directly to the edge function in one request.
**Status:** ✅ Handled — fallback exists
**Note:** The inline fallback is less reliable (large payload, more susceptible to backgrounding, no recovery queue). It is acceptable as a last resort. The existing behavior is correct.

#### 3b. Upload succeeds but response parsing throws (malformed JSON in error body)
**Cause:** Rare Supabase Storage edge case returning non-JSON body.
**Current behavior:** `JSON.parse(result.body)` in `uploadAudioToStorage` can throw if `result.body` is not valid JSON. This bubbles up to the outer `catch` in `uploadAudioToStorage` and returns `{ success: false }`.
**Status:** ✅ Handled — the try/catch in `uploadAudioToStorage` covers this

#### 3c. Upload of 8-minute recording (~15MB) times out
**Cause:** `FileSystem.uploadAsync` does not have an explicit timeout set. On a very slow connection, a large file could stall indefinitely.
**Status:** ✅ Fixed (March 2026)
**Implementation:** `uploadAudioToStorage` in `lib/supabase/transcription.js` wraps `FileSystem.uploadAsync` in a `Promise.race` against a 30-second timeout. On timeout, returns `{ success: false, error: 'UPLOAD_TIMEOUT' }`. `handleStopRecording` detects this and shows: "Upload timed out. Your recording is saved on your device. Relaunch the app when you're on a better connection or WiFi." The job stays in AsyncStorage for recovery on relaunch.

---

### Step 4 — Journal INSERT

#### 4a. Network failure during INSERT (transient — the production incident)
**Cause:** Cellular signal drop, network handoff, or iOS kills the in-flight request when app transitions state. Results in `status_code: 0`, `TypeError: Network request failed`.
**Status:** ✅ Partially fixed (March 2026) — UX message corrected; Sentry throw quality outstanding
**Implementation:** `createPendingJournal()` is now wrapped in its own try/catch inside `handleStopRecording`. On failure, user sees: "Recording Saved — Your recording is saved on your device. We'll finish processing it when you reopen the app." The function returns early; the AsyncStorage job retains `storagePath` and `journalId: null`. Recovery creates the journal row on next launch.
**Still outstanding:** `transcription.js:88` still does `throw error` (raw Supabase object). Sentry reports it as "Object captured as exception with keys: code, details, hint, message." Fix: replace with `throw new Error(error.message || 'Journal INSERT failed', { cause: error })`.

#### 4b. INSERT fails with auth/RLS error (401, 403)
**Cause:** Supabase JWT expired during a long recording session, or RLS policy rejects the insert.
**Current behavior:** Same as 4a — raw error thrown, caught, generic alert shown. Recovery would attempt to create the journal on next launch. If the token is refreshed by then, recovery works. If RLS is the issue, recovery will keep failing until the 3-attempt limit dequeues the job.
**Status:** ⚠️ Partial
**Required change:** In the outer catch, detect 401/403 error codes specifically. For auth expiry, attempt to refresh the Supabase session and retry the INSERT once before giving up. Log to Sentry with the specific code.

#### 4c. INSERT succeeds but response never reaches client (status_code 0 on ACK)
**Cause:** Same as 4a but from a different angle — the INSERT committed on the server but the TCP ACK was lost. Client gets a network error even though the DB row exists.
**Current behavior:** The throw path in `createPendingJournal` catches this the same as a real failure. Recovery will attempt to create a second journal row. Two journals for one recording.
**Status:** ⚠️ Accepted risk — no reliable way to detect this at the client level. Mitigation: consider adding a `audio_url` unique constraint on the `journals` table so a duplicate INSERT for the same `storagePath` is rejected with a unique violation, which recovery can then handle gracefully by fetching the existing row ID.

---

### Step 5 — Trigger Edge Function

#### 5a. `triggerTranscription()` network error (fire-and-forget)
**Cause:** Transient network failure between the INSERT completing and the edge function being fired.
**Current behavior:** The fetch `.catch()` logs a warning: "Failed to trigger transcription edge function". Polling begins and will run for 3 minutes seeing `pending` status. After 3 minutes it shows "Still Transcribing, your recording was saved." On next launch, recovery sees `pending` status and re-fires the edge function.
**Status:** ✅ Handled — acceptable behavior. Recovery covers it.

#### 5b. Edge function invoked but `journalId` in body is wrong/missing
**Cause:** Code bug.
**Current behavior:** Edge function throws `'journalId is required'`, returns 500. Journal is not marked failed because `journalId` is null in the error handler. Journal stays `pending` indefinitely.
**Status:** ❌ Not handled at edge function level — journal is stuck in `pending` forever (never marked `failed`)
**Required change:** The edge function's error handler already checks `if (journalId)` before marking failed. This is correct. The gap is the client: `triggerTranscription` is fire-and-forget, so a 500 response is silently dropped. Recovery handles it on next launch.

---

### Step 6 — Client Polling

#### 6a. App is backgrounded while polling
**Cause:** User switches apps, receives a phone call, or locks the screen while the transcription spinner is showing.
**Current behavior:** `setTimeout` is suspended when the app backgrounds. Polling pauses. If the component unmounts (user navigated away), `stopPolling()` is called via the `useEffect` cleanup. The AsyncStorage job remains. Recovery handles it on next launch.
**Status:** ✅ Handled

#### 6b. Poll query returns a network error
**Cause:** Transient connectivity during the 3-minute polling window.
**Current behavior:** Caught in the `tick()` try/catch. `pollCount` increments and polling retries after 3 seconds. A `hadNetworkErrors` flag is set to `true`. If MAX_POLLS is reached and `hadNetworkErrors` is true, the timeout alert says "Connection Issue — We lost connection while checking. Your recording was saved — check back shortly." rather than the generic "Still Transcribing" message.
**Status:** ✅ Handled (March 2026 — network errors now distinguished from slow transcription)

#### 6c. Polling times out (3-minute limit)
**Cause:** Whisper is slow, edge function is processing a long recording, or Supabase Edge Functions are degraded.
**Current behavior:** After 60 polls × 3 seconds, shows: "Still Transcribing — Your recording was saved. The transcription is still processing — check back in a moment." `setIsProcessing(false)` is called. The job stays in the queue.
**Status:** ✅ Handled — messaging is good

#### 6d. Component unmounts mid-poll (user navigates away)
**Cause:** User taps the back button while the transcription spinner is showing.
**Current behavior:** `useEffect` cleanup calls `stopPolling()`. `setIsProcessing(false)` is not called on an unmounted component (polling stops before the state update). The job stays in the queue. Journal will complete server-side and appear on next load.
**Status:** ✅ Handled — no state update on unmounted component

---

### Edge Function Failures

#### EF-1. Whisper returns empty transcription
**Cause:** User recorded silence, very quiet audio, or non-speech audio.
**Current behavior:** Edge function throws `'Whisper returned empty transcription'`. Journal is marked `failed` with that as `error_message`. Client polling detects `failed`, shows: "Transcription Failed — Unable to transcribe your recording. Please try again." Job is dequeued.
**Status:** ⚠️ Partial — dequeuing means no automatic retry, but the recording IS gone (local file not cleaned up by the error path, but dequeue removes it from recovery)
**Required change:** When `transcription_status = 'failed'` and `error_message` indicates empty transcription (not a system error), the user message should be different: "We couldn't hear your recording. Please try again in a quiet environment." Do not retry this automatically — it would keep failing.

#### EF-2. Whisper API timeout (60s)
**Cause:** An 8-minute recording at a slow Whisper processing rate.
**Current behavior:** The `AbortController` fires after 60s, throws `'Transcription timeout — audio may be too long'`. Journal marked `failed`. Client polling detects `failed`. Recovery in `retryFailedJob` re-uploads to a new path and re-triggers. If the recording is genuinely too long for Whisper, this will keep failing up to 3 times then the job is dequeued.
**Status:** ⚠️ Partial — the 60s Whisper timeout may be too aggressive for an 8-minute recording. Supabase Edge Functions have a 150-second wall clock limit.
**Required change:** Increase `TRANSCRIPTION_TIMEOUT_MS` to 120000 (2 minutes). An 8-minute m4a typically transcribes in under 90 seconds. Add more specific `error_message` values so client polling can surface a meaningful message for timeout vs. other failures.

#### EF-3. Storage download fails (audio file missing)
**Cause:** Audio was deleted already (double-trigger), or RLS on the bucket rejected the download.
**Current behavior:** Throws `'Storage download failed: ...'`. Journal marked `failed`. Client polling shows generic failure alert. Recovery retries via `retryFailedJob` which needs `job.localPath` — if local file still exists, re-uploads. If not, dequeues.
**Status:** ✅ Handled for the case where local file survives. The edge function already deletes audio on success, so a second trigger seeing a missing file is expected and handled by the `if (journal.transcription_status === 'completed') return` guard.

#### EF-4. Journal update fails after transcription succeeds
**Cause:** Database write error after Whisper returned successfully.
**Current behavior:** Throws `'Failed to update journal: ...'`. The error handler marks journal as `failed` and tries to delete the audio file. If the content was transcribed but not saved, the transcription text is lost.
**Status:** ⚠️ Partial — Whisper work is lost but recovery will re-transcribe on next attempt. Acceptable.

#### EF-5. Edge function invoked twice for same journal (double-trigger)
**Cause:** Client fires `triggerTranscription`, recovery also fires it, or the user launches app during an in-flight transcription.
**Current behavior:** The edge function checks `if (journal.transcription_status === 'completed') return` early. It does NOT check for `processing` — a second invocation while the first is running will proceed, downloading from Storage (which may succeed or fail depending on whether the first run deleted the file already), and potentially running a second Whisper call.
**Status:** ⚠️ Not fully idempotent
**Required change:** Add an early return in the edge function: `if (journal.transcription_status === 'processing') return { success: true, skipped: true }`. This makes concurrent invocations safe.

---

### Recovery Failures

#### R-1. `createPendingJournal` throws during `recoverFromFile`
**Cause:** Network error during recovery's journal INSERT.
**Current behavior:** The throw propagates up to the `try/catch` in `recoverJob` (line 89–153), which logs the error to Sentry and exits. The job's `recoveryAttempts` was already incremented. Job stays in queue and will retry on next launch.
**Status:** ✅ Handled — the Sentry capture in `recoverJob` wraps this

#### R-2. `createPendingJournal` throws a raw Supabase error during recovery
**Cause:** Same as Fix #1 above — raw object thrown.
**Current behavior:** Sentry receives a plain object from the `recoverJob` catch. Same noise issue as the main flow.
**Status:** ❌ Same as issue in Step 4a
**Required change:** Part of the same fix — wrapping the throw in `createPendingJournal` fixes both the main flow and the recovery flow.

#### R-3. Job exceeds 3 recovery attempts
**Cause:** Persistent failure (always-failing network, always-failing edge function, corrupted audio file).
**Current behavior:** Job is dequeued and local file is deleted. Recording is permanently lost. No user notification.
**Status:** ⚠️ Silent data loss
**Required change:** When a job is dequeued due to max attempts, capture to Sentry with the job details and last known error. Optionally show a one-time notification: "One of your recordings could not be saved after multiple attempts." Do not show this every launch.

#### R-4. Recovery runs but user is not authenticated
**Cause:** Recovery hook is mounted before auth resolves.
**Current behavior:** `useVoiceRecovery(userId)` — the `if (!userId)` guard returns early if userId is null. Recovery simply doesn't run.
**Status:** ✅ Handled — recovery re-runs when userId becomes non-null due to the `[userId]` dependency.

---

### Pre-existing Data Issues

#### D-1. Legacy `pending` journals with `audio_url = NULL` and real content
**Cause:** Journals created by the old inline transcription path (before the server-side pipeline was built) were never updated to `transcription_status = 'completed'`. These rows have real content, are already linked to mirrors, but their `transcription_status` is permanently `pending`.
**Risk:** Any query filtering `WHERE transcription_status = 'completed'` silently excludes these journals from counts, mirror eligibility checks, and list views.
**Status:** ❌ Active data issue — confirmed present in production
**Required change:** One-time SQL migration (run manually via Supabase SQL editor before next release):

```sql
UPDATE journals
SET transcription_status = 'completed'
WHERE transcription_status = 'pending'
  AND audio_url IS NULL
  AND content IS NOT NULL
  AND content != '';
```

Verify row count before running. Confirm affected users see correct journal counts after migration.

---

### UX Requirements

Every user-visible message from the voice pipeline must follow these rules:

| Situation | Message | Alert type |
|-----------|---------|------------|
| INSERT fails but recording is queued for recovery | "Recording Saved — Your recording is saved on your device. We'll finish processing it when you reopen the app." | ✅ Implemented |
| Polling timeout after 3 minutes (transcription slow) | "Still Transcribing — Your recording was saved. The transcription is still processing — check back in a moment." | ✅ Implemented |
| Polling timeout after 3 minutes (network errors) | "Connection Issue — We lost connection while checking. Your recording was saved — check back shortly." | ✅ Implemented |
| Transcription failed (system error) | "There was a problem transcribing your recording. We'll try again automatically." | Non-alarming — recovery will handle it |
| Transcription failed (empty/silence) | "We couldn't hear your recording clearly. Please try again." | Actionable — no retry, user should re-record |
| Upload failed entirely — no fallback | "Unable to save your recording right now. Please check your connection and try again." | Actionable |
| Max recovery attempts exceeded (silent data loss) | No alert to user — Sentry only | N/A |
| Recording could not be stopped/unloaded | "There was a problem stopping your recording. Please try again." | Generic but correct |

**Never use:**
- "Failed to stop recording properly" — implies the recording is gone
- "Error" as an alert title — too alarming for a faith-based journaling context
- Any message that could be interpreted as "your words were lost" when they weren't

---

### Sentry Error Quality

All throws from the voice pipeline must be proper `Error` instances so Sentry can display stack traces and meaningful titles.

**Files to audit for `throw error` on raw Supabase results:**
- `lib/supabase/transcription.js:88` — confirmed raw throw
- `hooks/useVoiceRecovery.ts` — `createPendingJournal()` called but not try/caught in `recoverFromFile` (propagates to `recoverJob` catch which logs a plain object if the throw is raw)
- Search the entire codebase: `grep -n "throw error" lib/supabase/ hooks/`

**Pattern to apply everywhere:**
```js
// Before
if (error) throw error;

// After
if (error) throw new Error(error.message ?? 'Database error', { cause: error });
```

---

## Implementation Priority

Work in this order:

1. **DB migration** (D-1) — run manually before any release. Zero code change, fixes silent data exclusion affecting existing users.

2. **Fix Sentry error quality** (4a, R-2) — one-line change in `transcription.js:88`. High signal-to-effort ratio.

3. **Fix UX message on INSERT failure** (4a) — add `storagePath` variable check in the outer catch of `handleStopRecording`. User-facing improvement for the exact production incident.

4. **Fix local persistence gap** (2a, 2b) — split the persist/enqueue try/catch so `enqueuePendingJob` is always called even if `copyAsync` fails. Closes the only scenario where a completed recording has no recovery path.

5. **Make edge function idempotent on `processing` status** (EF-5) — single early-return check in the edge function. Prevents double-transcription on concurrent recovery triggers.

6. **Increase Whisper timeout** (EF-2) — change `TRANSCRIPTION_TIMEOUT_MS` from 60000 to 120000 in the edge function. Prevents false failures on long recordings.

7. **Upload timeout** (3c) — add a timeout to `FileSystem.uploadAsync` for large recordings. Lower priority as uploads use the iOS URL loading system which is resilient.

---

## Files to Read Before Implementing

| File | Why |
|------|-----|
| `hooks/useAudioRecording.tsx` | Main pipeline orchestration, outer catch, all step sequencing |
| `lib/supabase/transcription.js` | `createPendingJournal`, `uploadAudioToStorage`, `triggerTranscription` |
| `hooks/useVoiceRecovery.ts` | Full recovery logic including `recoverJob`, `recoverFromFile`, `retryFailedJob` |
| `supabase/functions/transcribe-audio/index.ts` | Edge function — all server-side handling |
| `docs/BULLETPROOF_VOICE_PLAN.md` | Architecture reference, `PendingVoiceJob` schema, storage bucket details |
| `components/journal/GuidedPromptSingle.tsx` | How the voice modal is launched (context only) |
| `app/(tabs)/index.tsx` | How `onTranscriptionComplete` is handled after the pipeline returns (verify it handles the `journalId` parameter correctly to skip re-inserting) |

---

## Out of Scope

- Duplicate journal when user re-records after a failure — acceptable UX tradeoff; the re-recorded entry is the authoritative one and the recovered original will appear as a bonus entry, not a broken state
- Day 1 voice journaling — uses the same pipeline and the same fixes apply; no additional changes needed beyond the ones above
- Android — this app is iOS-only; no Android-specific changes needed
