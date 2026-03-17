# Voice Recording Pipeline

Technical reference for the server-side voice transcription pipeline — how audio goes from a tap of "Stop" to a completed journal entry.

---

## Why It Was Built

The original approach sent a 5MB base64 payload in a single HTTP request from the client to the Edge Function. If iOS backgrounded the app mid-request (notification, phone call, lock screen), the connection was killed and the audio was lost permanently.

The new pipeline separates concerns so that no single interruption can destroy a recording.

---

## Architecture

```
Client                           Server (Supabase)
──────                           ─────────────────
Stop recording
  │
  ├─ 1. Copy audio file to        (documentDirectory/pending_recordings/)
  │      permanent local storage
  │
  ├─ 2. Enqueue job to            (AsyncStorage: oxbow_pending_voice_jobs)
  │      AsyncStorage
  │
  ├─ 3. Upload binary m4a ──────→ Storage bucket: audio-recordings
  │      (FileSystem.uploadAsync)   path: {customUserId}/{jobId}.m4a
  │
  ├─ 4. Insert journal row ──────→ journals table
  │      (transcription_status:      content: ''
  │       'pending')                 audio_url: storagePath
  │
  └─ 5. Fire edge function ──────→ transcribe-audio edge function
         (don't await)                │
                                      ├─ Mark journal: processing
                                      ├─ Download audio from Storage
                                      ├─ Call OpenAI Whisper
                                      ├─ Update journal (content + status: 'completed')
                                      └─ Delete audio from Storage

Client polls journals table every 3s (pollForCompletion in useAudioRecording.tsx)
  └─ On 'completed': call onTranscriptionComplete(), clean up local file, dequeue job
```

**Why `FileSystem.uploadAsync` instead of `fetch`?**
It uses the iOS URL loading system under the hood, which is more resilient to app backgrounding than a JavaScript `fetch` call.

---

## Key Files

| File | Role |
|------|------|
| `hooks/useAudioRecording.tsx` | Orchestrates steps 1–5 after stop; runs polling loop |
| `hooks/useVoiceRecovery.ts` | Startup recovery for interrupted jobs |
| `lib/supabase/transcription.ts` | `uploadAudioToStorage`, `createPendingJournal`, `triggerTranscription` |
| `supabase/functions/transcribe-audio/index.ts` | Edge function: pulls from Storage, calls Whisper, updates journal |

---

## Pending Job Queue (AsyncStorage)

The queue key is `oxbow_pending_voice_jobs`. Each entry is a `PendingVoiceJob`:

```typescript
interface PendingVoiceJob {
  jobId: string;           // UUID — used as the filename in Storage and local dir
  localPath: string;       // documentDirectory/pending_recordings/{jobId}.m4a
  storagePath: string | null;  // set after upload: "{customUserId}/{jobId}.m4a"
  journalId: string | null;    // set after journal row inserted
  promptText: string | null;
  entryType: string;           // 'voice'
  createdAt: string;
  recoveryAttempts?: number;   // incremented on each startup recovery run
  day1Step?: 2 | 3;           // set for Day 1 Step 2 / Step 3 recordings
}
```

The job progresses through states as each step completes. Recovery uses these fields to determine where to resume.

---

## Supabase Storage Bucket

**Bucket:** `audio-recordings` (private)

**Path convention:** `{customUserId}/{jobId}.m4a`

**Lifecycle:** Audio is uploaded by the client, read by the Edge Function, then deleted by the Edge Function after successful transcription. Files are short-lived — not user-visible, not permanent.

**Size limit:** 50MB (a full 8-minute recording is ~15MB)

**Auth note:** Uses permissive RLS policy (`for all using (bucket_id = 'audio-recordings')`). Access scoping is enforced in the service layer via path conventions and the Edge Function uses the service role key.

---

## journals Table: Voice-Specific Columns

Voice journals use additional columns not present on text journal rows:

| Column | Type | Description |
|--------|------|-------------|
| `transcription_status` | text | `'pending'` → `'processing'` → `'completed'` \| `'failed'` |
| `audio_url` | text | Storage path: `{customUserId}/{jobId}.m4a` |
| `local_audio_path` | text | Device local path for recovery reference |
| `error_message` | text | Populated on `'failed'` status |
| `journal_entry_type` | text | `'voice'` or `'text'` |

A pending voice journal has `content: ''` and `transcription_status: 'pending'`. The Edge Function fills in `content` and updates status to `'completed'`.

**Important for queries:** Pending/processing journals are hidden from all list views and excluded from the mirror threshold count. The filter is:

```javascript
.or('content.neq.,transcription_status.is.null,transcription_status.not.in.(pending,processing)')
```

This means text journals (no `transcription_status`) and completed voice journals both appear; in-flight voice journals do not.

**DB migration note (run 2026-03-16):** Legacy journals created before the server-side pipeline existed had `transcription_status = 'pending'` and `audio_url = NULL` despite having real transcribed content. A one-time UPDATE was run in production to set these to `'completed'` so they are correctly included in all queries.

---

## Client Polling

After firing the edge function, `useAudioRecording` polls the `journals` table every 3 seconds via `pollForCompletion()`:

- **Timeout:** 60 polls × 3 seconds = 3 minutes
- **On `completed`:** calls `onTranscriptionComplete(content, timestamp, journalId)`, deletes local file, dequeues job
- **On `failed`:** shows error alert, dequeues job
- **On timeout:** shows "Still Transcribing" alert; recording is safe and can be recovered on next launch

The third argument (`journalId`) passed to `onTranscriptionComplete` signals to callers that the journal row already exists in the DB. Callers must skip re-inserting.

---

## Fallback: Inline Transcription

If the Storage upload fails (no connectivity, bucket error), the hook falls back to the original inline transcription path (`transcribeAudio()`) — base64 payload sent directly to the Edge Function. This path is less reliable but ensures the user still gets a result in the common case.

---

## Startup Recovery (`useVoiceRecovery`)

**Location:** `hooks/useVoiceRecovery.ts`

**When it runs:** Once per app launch, after the user is authenticated. Mounted in `app/(tabs)/_layout.tsx`.

**What it does:** Reads `oxbow_pending_voice_jobs` from AsyncStorage and handles each job based on its current state:

| Job state | Action |
|-----------|--------|
| `journalId` set, DB status = `'completed'` | Clean up local file, dequeue |
| `journalId` set, DB status = `'pending'` or `'processing'` | Re-fire edge function (idempotent) |
| `journalId` set, DB status = `'failed'` | Re-upload to new storage path, reset journal status, re-trigger |
| `journalId` set, journal not found in DB | Fall through to file-based recovery |
| `storagePath` set, no `journalId` | Create pending journal row, trigger |
| Only `localPath` set | Re-upload from local file, create journal, trigger |

**Max attempts:** 3. After 3 startup recovery attempts on the same job, it is dequeued and the local file deleted to prevent a stuck zombie job.

**`isRecovering`:** The hook returns `{ isRecovering }`. When `true`, a recovery banner is shown in `app/(tabs)/_layout.tsx` and Day1Modal shows a "Finishing your last recording..." spinner.

---

## Day 1 Integration

Steps 2 and 3 of Day 1 onboarding use the same voice pipeline. They pass `day1Step` (2 or 3) when calling `useAudioRecording`:

```typescript
const { ... } = useAudioRecording(onTranscriptionComplete, 2); // Step 2
```

This tag is stored in the AsyncStorage job record. During recovery, after re-triggering transcription, `saveStepJournal(uid, job.day1Step, journalId)` is called to link the journal back to `day_1_progress`. This ensures the Day 1 flow can resume even if the app was killed between journal creation and the `saveStepJournal` call.

---

## Error Handling Summary

| Failure point | What happens |
|---------------|--------------|
| App killed before local copy | Audio lost (iOS temp cache purged) — no recovery possible |
| App killed after local copy, before upload | Recovery re-uploads from `localPath` on next launch |
| App killed after upload, before journal insert | Recovery creates journal row on next launch |
| App killed after journal insert | Recovery re-fires edge function on next launch |
| Edge function error | Journal marked `failed`; recovery re-uploads + retries |
| Client polling timeout (3 min) | Alert shown; journal will complete in background and appear on next load |
| >3 recovery attempts | Job dequeued, local file deleted (zombie protection) |

---

## Outstanding Work (Not Yet Addressed)

These items were identified in the original PRD but not implemented. Listed in rough priority order.

### Step 1 — Stop and Unload

**1a. `stopAndUnloadAsync()` throws**
Before calling `stopAndUnloadAsync()`, attempt to get the URI via `recording.getURI()`. If unload fails but URI exists, proceed with the save pipeline using whatever audio was captured. Add a Sentry capture with `tags: { action: 'stop_unload_failed' }`. Replace the current outer catch alert ("Failed to stop recording properly") with something non-alarming.

**1b. `getURI()` returns null after successful stop**
Currently the function returns silently with no alert and no save. Add an explicit check: capture to Sentry and show "Recording could not be saved. Please try again."

### Step 4 — Journal INSERT

**4b. INSERT fails with 401/403 (auth/RLS error)**
Detect 401/403 error codes specifically in the insert error handler. For auth expiry, attempt to refresh the Supabase session and retry the INSERT once before giving up. Log to Sentry with the specific code.

### Edge Function

**EF-1. Empty transcription UX message**
When `transcription_status = 'failed'` and `error_message` indicates empty transcription (Whisper returned empty string), show a different user message: "We couldn't hear your recording clearly. Please try again." vs. the generic system error message. Do not retry automatically.

### Recovery

**R-3. Max recovery attempts — silent data loss**
When a job is dequeued due to exceeding 3 attempts, capture to Sentry with the job details and last known error. Optionally show a one-time notification: "One of your recordings could not be saved after multiple attempts." Currently this is silent.

### Accepted Risks / Won't Fix

- **4c. INSERT ACK lost** — INSERT commits server-side but client gets network error; recovery creates a duplicate journal row. No reliable client-side mitigation. Mitigation would require a unique constraint on `audio_url` in the DB.
- **Duplicate journal on re-record** — If a user re-records after a failure, recovery delivers the original recording as a bonus entry. Accepted UX tradeoff.
- **Edge function crash mid-processing** — If the function is killed at Supabase's 150s wall clock limit with status stuck at `processing`, recovery re-triggers but the `processing` idempotency guard now skips it. Journal stays stuck until max recovery attempts are hit. Known tradeoff introduced by the EF-5 fix.

---

## Troubleshooting

**Journal appears with empty content**
The edge function may still be processing. Check `transcription_status` in the `journals` table. If `'processing'`, the edge function is running. If `'failed'`, check `error_message`.

**Audio stuck in Storage bucket**
The edge function failed before cleanup. Manually delete the file from `audio-recordings/{customUserId}/`. The client-side recovery will re-upload and retry on next launch.

**Recovery spinner loops indefinitely in Day 1**
`day_1_progress.step_2_journal_id` or `step_3_journal_id` is not being set. Check that `saveStepJournal` is completing — it may be failing silently. Verify the `day_1_progress` row exists for the user.

**Zombie job on every launch**
A job exceeding 3 recovery attempts will be auto-dequeued. If you see one repeatedly before the counter hits 3, check `error_message` on the journal row.
