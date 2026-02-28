# Bulletproof Voice Recording — Implementation Plan

## Problem

The current flow sends a 5MB base64 payload in a single HTTP request from the client to the Edge Function. If the app is backgrounded mid-request, iOS kills the connection. The audio is lost. The user must re-record.

## Goal

1. **Never lose a recording.** Audio is persisted before any transcription attempt.
2. **Transcription happens server-side.** After a short upload, the user can lock their phone and the transcription completes without them.

---

## Architecture Change

### Current
```
Client (in-memory base64) → POST 5MB → Edge Function → Whisper → return text → Client saves journal
```
If app backgrounds: everything dies.

### New
```
Client → copy audio to persistent local storage
       → upload binary m4a to Supabase Storage        [client's only job]
       → create journal row (status: 'pending')        [fire and done]
       → trigger Edge Function with journal_id

Server → downloads audio from Storage
       → calls Whisper
       → updates journal content + status: 'completed'
       → deletes audio from Storage

Client → polls journals table for transcription_status = 'completed'
       → on complete: navigates normally
```

If app backgrounds during upload: local file is safe, re-upload on next foreground.
If app backgrounds after upload: edge function finishes server-side, result is waiting on next open.

---

## Key Design Decision: Use `journals` table, not a separate jobs table

The `journals` table already has columns added directly to the DB (no migration exists):
`local_audio_path`, `audio_url`, `transcription_status`, `upload_attempts`,
`transcription_attempts`, `error_message`, `max_upload_attempts`

`transcription_status` is already actively used by the Day 1 flow
(`generate-day-1-mirror` gates on both journals being `'completed'`).

Rather than a separate `transcription_jobs` table, the journal row itself acts as the
job record. The `transcription_jobs` table created in the initial migration will be
dropped (migration 20260227020000).

---

## Implementation Steps

### ✅ Step 1 — Supabase Storage bucket
**Status: Complete**

Private `audio-recordings` bucket created. 50MB per-file limit.
Path convention: `{customUserId}/{jobId}.m4a`

---

### ~~Step 2~~ — ~~`transcription_jobs` table~~ (dropped)
**Status: Superseded — using `journals` columns instead**

Migration `20260227020000_drop_transcription_jobs.sql` removes the table.

---

### ✅ Step 3 — Persist audio to local permanent storage on stop
**Status: Complete**

On stop, audio is copied from iOS temp cache to
`{documentDirectory}/pending_recordings/{jobId}.m4a` before any network calls.
Job metadata queued in AsyncStorage under `oxbow_pending_voice_jobs`.

---

### Step 4 — Upload audio binary to Supabase Storage
**Scope:** New function in `lib/supabase/transcription.js`.

Upload the raw m4a file (not base64) using `FileSystem.uploadAsync` which uses the
iOS URL loading system — more resilient to backgrounding than `fetch`.

```javascript
export const uploadAudioToStorage = async (localPath, storagePath) => {
  const result = await FileSystem.uploadAsync(
    `${supabaseUrl}/storage/v1/object/audio-recordings/${storagePath}`,
    localPath,
    {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: {
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'audio/m4a',
      },
    }
  );
  return result.status === 200;
};
```

**Test:** Record audio, stop, confirm file appears in `audio-recordings` bucket with path
`{customUserId}/{jobId}.m4a`.

---

### Step 5 — Create journal row + trigger Edge Function
**Scope:** `lib/supabase/transcription.js` + `lib/supabase/journals.js`.

After upload succeeds:
1. Insert journal row with `transcription_status: 'pending'`, `local_audio_path`, `audio_url`
2. Call Edge Function with `{ journalId }` — fire and don't await result

```javascript
// Create pending journal
const { data: journal } = await supabase.from('journals').insert({
  custom_user_id,
  journal_entry_type: 'voice',
  prompt_text,
  transcription_status: 'pending',
  local_audio_path: localPath,
  audio_url: storagePath,
  content: '',  // filled in by edge function
}).select().single();

// Trigger edge function (fire and done — client doesn't wait)
fetch(`${supabaseUrl}/functions/v1/transcribe-audio`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${anonKey}` },
  body: JSON.stringify({ journalId: journal.id }),
}).catch(() => {});
```

**Test:** Confirm journal row inserted with `transcription_status: 'pending'` and
correct `audio_url` path.

---

### Step 6 — Rewrite Edge Function to pull from Storage
**Scope:** `supabase/functions/transcribe-audio/index.ts` only.

```typescript
// 1. Fetch journal record
const { data: journal } = await supabase
  .from('journals').select('*').eq('id', journalId).single();

// 2. Download audio from Storage
const { data: audioBlob } = await supabase.storage
  .from('audio-recordings').download(journal.audio_url);

// 3. Call Whisper (same logic as current)
const text = await transcribeWithWhisper(audioBlob);

// 4. Update journal: content + completed status
await supabase.from('journals').update({
  content: text,
  transcription_status: 'completed',
}).eq('id', journalId);

// 5. Clean up audio from Storage
await supabase.storage.from('audio-recordings').remove([journal.audio_url]);
```

On error: update `transcription_status: 'failed'` + `error_message`.

**Test:** Manually set a journal to `pending` with a valid `audio_url`, invoke function
directly, confirm `content` is populated and `status` is `'completed'`.

---

### Step 7 — Client polls journals table for completion
**Scope:** `hooks/useAudioRecording.tsx`.

After triggering the edge function, poll `journals` every 3 seconds:

```javascript
const pollForCompletion = async (journalId, localPath, jobId) => {
  const { data: journal } = await supabase
    .from('journals')
    .select('transcription_status, content, created_at')
    .eq('id', journalId)
    .single();

  if (journal.transcription_status === 'completed') {
    onTranscriptionComplete(journal.content, journal.created_at);
    await FileSystem.deleteAsync(localPath, { idempotent: true });
    await dequeuePendingJob(jobId);
  } else if (journal.transcription_status === 'failed') {
    // Show retry UI
  }
  // else: still pending/processing — poll again in 3s
};
```

Poll timeout: 3 minutes. Show error + retry option if timed out.

**Test:** Record, stop, background the app while "Transcribing...", foreground it,
confirm journal appears and navigation proceeds normally.

---

### Step 8 — Recovery on app startup
**Scope:** `app/_layout.tsx` — runs once on launch.

Check AsyncStorage `oxbow_pending_voice_jobs` for incomplete jobs:

```javascript
const recoverPendingJobs = async () => {
  const jobs = await getPendingJobs(); // reads AsyncStorage
  for (const job of jobs) {
    const { data: journal } = await supabase
      .from('journals')
      .select('transcription_status')
      .eq('id', job.journalId)
      .maybeSingle();

    if (journal?.transcription_status === 'completed') {
      // Finished while app was closed — clean up
      await FileSystem.deleteAsync(job.localPath, { idempotent: true });
      await dequeuePendingJob(job.jobId);
    } else if (!journal) {
      // Never made it to DB — re-upload from local file and retry
      await retryFromLocalFile(job);
    }
    // pending/processing: resume polling
  }
};
```

Show banner: "Finishing a recent recording..." while recovery runs.

**Test:** Record audio, force-quit the app before upload completes, reopen — confirm
recovery runs and journal eventually saves.

---

## Reliability & Complexity Evaluation

| Step | What it protects against | Complexity |
|------|--------------------------|------------|
| 1 — Storage bucket | n/a (infra) | None |
| 3 — Persist locally | App killed before upload | Low ✅ Done |
| 4 — Upload to Storage | Upload interrupted by backgrounding | Medium |
| 5 — Create journal + trigger | Client disconnect after upload | Low |
| 6 — Edge Function rewrite | Transcription server-side | Medium |
| 7 — Client polling | User waits for result in-session | Medium |
| 8 — Startup recovery | App killed mid-upload | Medium |

**Recommended ship order:**
1. Steps 4–6 as a unit — core reliability ("audio never lost")
2. Step 7 — in-session polling UX
3. Step 8 — startup recovery edge case

---

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/transcribe-audio/index.ts` | Rewritten: journalId-based, pulls from Storage |
| `lib/supabase/transcription.js` | Rewritten: upload to Storage + create pending journal |
| `hooks/useAudioRecording.tsx` | Add polling, pass customUserId, cleanup on success |
| `app/_layout.tsx` | Add startup recovery call |
| DB migration 20260227020000 | Drop unused `transcription_jobs` table |
| Supabase Storage | `audio-recordings` bucket ✅ already created |
