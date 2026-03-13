# Realtime Transcription Subscription — Implementation Plan

**Created:** March 2026
**Branch:** `tier3/typescript-migration` (merge to main, then create `tier3/realtime-transcription`)
**Context:** Tier 3 of the Oxbow Stability Plan. Tier 1 (crash fixes) and Tier 2 (CI gates) are complete. Tier 3 Item 1 (TypeScript migration of `lib/supabase/`) is complete and committed. This is Tier 3 Item 2.

---

## What This Replaces and Why

`hooks/useAudioRecording.tsx` contains `pollForCompletion()` (lines ~116–180), which polls the `journals` table every 3 seconds for up to 3 minutes waiting for `transcription_status` to change to `completed` or `failed`. This was Bug 2 in the original stability audit.

Problems with polling:
- Every 3 seconds, a DB query fires regardless of whether anything changed
- Network errors during polling are silently swallowed — the user sees "Still Transcribing" even when the transcription succeeded but the poll just couldn't reach the DB
- 60 polls × 3 seconds = 3 minutes before the user gets any feedback on a network failure
- Race conditions between poll timing and actual completion

The fix: subscribe to the specific journal row via **Supabase Realtime** (`postgres_changes`). The moment the edge function marks `transcription_status = 'completed'`, the app knows instantly. Keep a 3-minute timeout as a safety net.

---

## Pre-Implementation Checklist (Do These First)

### 1. Verify Realtime is enabled on the `journals` table in Supabase

In the Supabase dashboard:
- Go to **Database → Replication**
- Confirm `journals` table has the Realtime toggle enabled (or "Source" listed)
- If not, enable it — this is a dashboard toggle, not a code change

Without this, `postgres_changes` subscriptions on `journals` will never fire, and the fallback timeout will trigger every time.

### 2. Verify Realtime auth works with RLS

The `journals` table has RLS enabled. Supabase Realtime `postgres_changes` subscriptions must be authorized. The `supabase` client in `lib/supabase/client.ts` is configured with `persistSession: true` and uses `ExpoSecureStoreAdapter` for auth storage. This means the client already holds the user's JWT, and Supabase Realtime will use it automatically.

To confirm: after implementing, do a test recording and watch the Supabase Realtime dashboard (or logs) to confirm the subscription connects and receives the UPDATE event. If it doesn't, the channel may need the session token passed explicitly via `supabase.channel(name, { config: { ... } })`.

---

## Implementation

All changes are in **`hooks/useAudioRecording.tsx`**.

### Step 1: Replace ref declarations (around line 104)

**Remove:**
```ts
const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const pollingActiveRef = useRef(false);
```

**Replace with:**
```ts
const transcriptionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const realtimeChannelRef = useRef<any>(null);
const resolvedRef = useRef(false); // prevents double-completion on race conditions
```

### Step 2: Replace `stopPolling` and `pollForCompletion` (around lines 108–180)

**Remove the entire `stopPolling` function and `pollForCompletion` function.**

**Replace with:**

```ts
const stopWaiting = () => {
  if (transcriptionTimeoutRef.current) {
    clearTimeout(transcriptionTimeoutRef.current);
    transcriptionTimeoutRef.current = null;
  }
  if (realtimeChannelRef.current && supabase) {
    supabase.removeChannel(realtimeChannelRef.current);
    realtimeChannelRef.current = null;
  }
};

const subscribeForCompletion = (journalId: string, localPath: string, jobId: string) => {
  if (!supabase) return;

  resolvedRef.current = false;

  const onResolved = (status: string, content: string, createdAt: string) => {
    // Guard against double-calls (race between SUBSCRIBED check and postgres_changes event)
    if (resolvedRef.current) return;
    resolvedRef.current = true;

    setIsProcessing(false);
    // Defer channel removal so we're not removing the channel from within its own callback
    setTimeout(() => stopWaiting(), 0);

    if (status === 'completed') {
      const timestamp = new Date(createdAt).toLocaleString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true,
      });
      // Pass journalId so callers know the journal is already saved and skip re-insert
      onTranscriptionComplete?.(content, timestamp, journalId);
      FileSystem.deleteAsync(localPath, { idempotent: true }).catch(() => {});
      dequeuePendingJob(jobId);
    } else {
      dequeuePendingJob(jobId);
      Alert.alert('Transcription Failed', 'Unable to transcribe your recording. Please try again.');
    }
  };

  const channel = supabase
    .channel(`journal-transcription-${journalId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'journals', filter: `id=eq.${journalId}` },
      (payload) => {
        const { transcription_status, content, created_at } = payload.new as {
          transcription_status: string;
          content: string;
          created_at: string;
        };
        if (transcription_status === 'completed' || transcription_status === 'failed') {
          onResolved(transcription_status, content, created_at);
        }
      }
    )
    .subscribe(async (status) => {
      if (status !== 'SUBSCRIBED' || !supabase) return;
      // Immediate check: transcription may have finished before subscription connected
      const { data: journal } = await supabase
        .from('journals')
        .select('transcription_status, content, created_at')
        .eq('id', journalId)
        .single();
      if (
        journal?.transcription_status === 'completed' ||
        journal?.transcription_status === 'failed'
      ) {
        onResolved(journal.transcription_status, journal.content, journal.created_at);
      }
    });

  realtimeChannelRef.current = channel;

  // 3-minute safety net: if Realtime doesn't deliver an update, poll once then give up
  transcriptionTimeoutRef.current = setTimeout(async () => {
    if (resolvedRef.current) return; // already resolved via Realtime
    if (!supabase) {
      setIsProcessing(false);
      return;
    }
    const { data: journal } = await supabase
      .from('journals')
      .select('transcription_status, content, created_at')
      .eq('id', journalId)
      .single();
    if (
      journal?.transcription_status === 'completed' ||
      journal?.transcription_status === 'failed'
    ) {
      onResolved(journal.transcription_status, journal.content, journal.created_at);
    } else {
      stopWaiting();
      setIsProcessing(false);
      Alert.alert(
        'Still Transcribing',
        'Your recording was saved. The transcription is still processing — check back in a moment.',
        [{ text: 'OK' }]
      );
    }
  }, 3 * 60 * 1000);
};
```

### Step 3: Update the cleanup `useEffect` (around line 664)

**Remove:**
```ts
useEffect(() => {
  return () => {
    stopPolling();
    if (wakeLockActiveRef.current) {
      deactivateKeepAwake('recording-session').catch(() => {});
    }
  };
}, []);
```

**Replace with:**
```ts
useEffect(() => {
  return () => {
    stopWaiting();
    if (wakeLockActiveRef.current) {
      deactivateKeepAwake('recording-session').catch(() => {});
    }
  };
}, []);
```

### Step 4: Update the call site (around line 452)

**Remove:**
```ts
// Poll journals table for completion (runs independently)
pollForCompletion(journal.id, persistedLocalPath, jobId);
// isProcessing stays true until polling completes
```

**Replace with:**
```ts
// Subscribe to journal row for instant completion notification
subscribeForCompletion(journal.id, persistedLocalPath, jobId);
// isProcessing stays true until subscription resolves
```

---

## After Implementing: Run Typecheck and Lint

```bash
npm run typecheck
npm run lint
```

Both must pass clean (0 errors, warnings only).

---

## Testing

This change touches the most critical user-facing feature. Test on a **physical device**, not simulator.

### Minimum test (always):
1. Record a short voice journal (~15 seconds)
2. Tap stop
3. Confirm "processing" indicator appears
4. Confirm the journal appears in the list with transcribed text within ~30 seconds
5. Confirm no duplicate journal entries appear

### Verify Realtime is actually being used (not just the fallback):
In the Supabase dashboard → **Realtime** → inspect active connections while a recording is processing. You should see a connection from the app. Alternatively, add a temporary `console.log('🔴 Realtime event received')` inside the `postgres_changes` callback, do a test recording, and confirm it logs before "Still Transcribing" would have appeared.

### Test the safety net:
Temporarily change `3 * 60 * 1000` to `5000` (5 seconds) in the timeout, record a short journal, and confirm the timeout fires, does one final poll, and resolves correctly. Restore to 3 minutes.

### Test component unmount during transcription:
Start a recording, stop it (transcription begins), immediately navigate to a different tab. Confirm the app doesn't crash. The transcription notification will be lost (known tradeoff — acceptable for now).

### Regression: Day 1 voice journals
Record both Step 2 and Step 3 in the Day 1 flow. Confirm both transcribe and the mini-mirror generates correctly. The `subscribeForCompletion` is used for Day 1 recordings too, but Day 1 has its own completion polling in `Day1Modal.tsx` via `checkBothTranscriptionsReady()` — these don't conflict since they check different things.

---

## Known Tradeoffs (Acceptable)

- If the user navigates away during transcription, the Realtime subscription is cleaned up and no completion notification is shown. The journal will still be saved correctly — it just won't surface automatically. The user will see it when they return to the Journal tab. This is acceptable.
- If the Realtime WebSocket drops mid-transcription (e.g. network switch), the 3-minute timeout is the fallback. This is worse than the 3-second polling retry, but in practice Whisper transcription takes 10–60 seconds, well within the window where the WebSocket is stable.

---

## Broader Tier 3 Context

| # | Item | Status |
|---|------|--------|
| 1 | Migrate `lib/supabase/*.js` → TypeScript | ✅ Done (commit `625c9a4`) |
| 2 | Replace transcription polling with Supabase Realtime | ⬜ This task |
| 3 | Replace mirror polling with Supabase Realtime | ⬜ After #2 is stable |
| 4 | Jest unit tests (recovery, upload timeout, error paths) | ⬜ Future |
| 5 | Maestro E2E tests | ⬜ Future |

After this task, update `docs/STABILITY_PROCESS_PLAN.md` to mark Tier 1 item 10 and Tier 3 item 2 as done.

---

## Project Context for New Agents

- **App:** Oxbow — iOS spiritual journaling app (Expo SDK ~54, React Native 0.81.4, TypeScript, Supabase)
- **Branch:** Start from `tier3/typescript-migration` (or main if that branch has been merged)
- **CI:** Pre-commit hook (Husky) runs `npm run typecheck && npm run lint`. Both must pass before commit.
- **Key file:** `hooks/useAudioRecording.tsx` — the entire voice recording pipeline lives here
- **Supabase client:** `lib/supabase/client.ts` — exports `supabase` as `SupabaseClient | null`. Always null-guard before use.
- **Auth:** Phone OTP via Supabase Auth. Session stored in `expo-secure-store`. RLS is enabled on all tables.
- **Sentry:** Active in production. Add breadcrumbs for significant state transitions.
- **CLAUDE.md:** Project instructions are in `/CLAUDE.md` — read before making UI or architectural changes.
- **Memory:** Agent memory is in `/Users/caddell/.claude/projects/-Users-caddell-dev-starlight/memory/MEMORY.md`
