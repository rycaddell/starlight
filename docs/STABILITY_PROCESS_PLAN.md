# Oxbow — Stability & QA Process Plan

**Created:** March 2026
**Context:** App instability audit conducted ahead of broader rollout. Users reporting crashes and unreliable voice journaling.

---

## What's Actually Causing Instability

Three root causes were identified in the March 2026 audit:

### 1. No safety net for component crashes
React apps crash entirely when a rendering error occurs and there's nothing to catch it. Oxbow has no Error Boundaries — the React mechanism that intercepts these crashes and shows a graceful fallback screen instead of a white screen. One bad state value reaching a component that doesn't expect it takes down the whole app.

### 2. The voice journaling pipeline has specific broken failure paths
The pipeline is a 5-step chain: Record → Save locally → Upload to Supabase → Trigger edge function → Whisper transcribes → Poll DB for result. Four specific bugs in this chain cause silent failures or user-visible errors. See the [Voice Journaling section](#voice-journaling-bugs) below.

### 3. No automated gates before code reaches users
There are no pre-commit checks, no CI pipeline, and no tests. Every change goes directly from Claude's output to a TestFlight build with no verification layer in between. Mistakes that any automated check would catch are instead found by users.

---

## Voice Journaling Bugs

These are specific, traceable bugs in the current code — not general concerns.

### Bug 1 — Lost recordings when journal creation fails
**File:** `hooks/useAudioRecording.tsx:392`

When `createPendingJournal()` fails (e.g., Supabase is unreachable at that moment), the error is caught and the user gets a generic alert. But the job in AsyncStorage was never updated with a `journalId`. The recovery system (`useVoiceRecovery`) can't link the local audio file to a journal row — so the recording is silently abandoned on next launch even though the file still exists on device.

### Bug 2 — Polling silently swallows network errors
**File:** `hooks/useAudioRecording.tsx:160-163`

```
} catch {
  pollCount++;
  // try again in 3 seconds
}
```

If Supabase is having a connectivity blip, polling just keeps incrementing and retrying for the full 3 minutes, then tells the user "Still Transcribing." The transcription may be fine — the poll just couldn't reach the DB. Users can't distinguish "transcribing" from "failed to check."

### Bug 3 — Upload has no timeout
**File:** `lib/supabase/transcription.js:34`

`FileSystem.uploadAsync()` has no timeout configured. On a bad cellular connection, this call can hang indefinitely — the user sees a spinner and nothing ever resolves. No force-quit detection, no recovery. The only way out is the user killing the app.

### Bug 4 — No user feedback when recovery rescues a recording
**File:** `hooks/useVoiceRecovery.ts`

The recovery system is well-designed and does successfully rescue interrupted recordings on next launch. But it does this silently. Users never know if a recording was lost or saved. This uncertainty is a significant driver of the "feels unstable" perception even when data is actually preserved.

---

## Action Plan

### Tier 1 — Fix Now (Prevents Current Crashes)

| Fix | What It Solves | Files Affected |
|-----|---------------|----------------|
| Add error boundaries to root layout + 3 tab screens | White-screen-of-death crashes | `app/_layout.tsx`, tab screens |
| Bug 1: Ensure AsyncStorage job always writes `journalId` even on error path | Silent lost recordings | `hooks/useAudioRecording.tsx` |
| Bug 2: Distinguish network error from transcription pending in poll | Misleading "Still Transcribing" | `hooks/useAudioRecording.tsx` |
| Bug 3: Add AbortController timeout to audio upload (30s) | Infinite upload spinner | `lib/supabase/transcription.js` |
| Bug 4: Show user notification when voice recovery succeeds | User uncertainty about lost recordings | `hooks/useVoiceRecovery.ts` |
| Replace transcription polling with Supabase Realtime subscription | Eliminates polling race conditions entirely | `hooks/useAudioRecording.tsx` |
| Fix `friends.js` unguarded DB queries in `acceptInvite()` | Silent friend invite crashes | `lib/supabase/friends.js` |
| Set Sentry user context in AuthContext (not MirrorScreen) | Incomplete error attribution in Sentry | `contexts/AuthContext.tsx` |

### Tier 2 — Process Gates (Prevents Future Regressions)

| Fix | What It Solves |
|-----|---------------|
| Add `tsc --noEmit` script to `package.json` | Catches TypeScript type errors before builds |
| Add Husky pre-commit hook (lint + type-check) | Blocks broken code from being committed |
| Add GitHub Actions CI workflow | Validates every push; blocks bad builds |
| Set up edge function log monitoring (Logflare or Axiom) | Visibility into server-side transcription failures |

### Tier 3 — Longer Term

#### Automated Testing

The goal is not to automate everything — it is to automate every class of error that doesn't require a real microphone, and to have a clear manual protocol for what remains.

**What can be automated and how:**

| Test Type | Tool | Covers |
|-----------|------|--------|
| UI flow states (recording, paused, processing, error screens) | Maestro | Screen renders, button states, navigation — no real audio needed |
| Recovery system logic | Jest | Directly seed AsyncStorage with fake jobs, call `useVoiceRecovery`, assert outcomes |
| Upload timeout fires correctly | Jest (mock) | Mock `FileSystem.uploadAsync` to hang, assert AbortController fires at 30s |
| Polling/Realtime error paths | Jest (mock) | Mock Supabase to return errors, assert correct UI state and retry behavior |
| `createPendingJournal` failure path | Jest (mock) | Mock DB insert to fail, assert `journalId` is still written to AsyncStorage queue |
| Text journaling happy path | Maestro | Full E2E: input → submit → navigation → journal count |
| Mirror screen states | Maestro | Progress counter, generate button, past mirrors list |
| Friends tab happy path | Maestro | Friends list, invite button state |

**What cannot be automated:**

| Scenario | Why | Solution |
|----------|-----|---------|
| Real microphone recording | iOS Simulator has no real microphone input | Maestro with test-mode injection (see below) |
| Whisper transcription accuracy | Non-deterministic, external API | Manual — run Tier A before every release |
| Recovery at precise pipeline stages | Requires killing app at exact milliseconds | Manual — Tier C scenarios |
| Incoming call interruption | System-level event, can't be scripted | Manual — Tier B8 |

**Test-mode injection (makes more automation possible):**

The best approach for automating the upload-through-transcription pipeline is a test mode: a `preview` EAS build profile sets an environment variable (`EXPO_PUBLIC_TEST_AUDIO=true`) that causes the recording hook to use a bundled `.m4a` fixture file instead of the real microphone. The rest of the pipeline — upload to Supabase, edge function trigger, Whisper, Realtime — runs for real. Maestro can then tap the "record" button, "stop", and assert that the journal appears.

This does not go in production builds. It only exists in the `e2e` or `preview` EAS profile.

**Realistic end state of automation coverage:**

```
Automated (Maestro + Jest):
  ✓ Text journaling end-to-end
  ✓ Recording UI states (start, pause, resume, stop, error)
  ✓ Recovery system logic (all 6 recovery paths)
  ✓ Upload timeout behavior
  ✓ Error handling in transcription.js
  ✓ Mirror screen states
  ✓ Friends tab states
  ✓ Auth flow

  With test-mode injection:
  ✓ Full upload → edge function → transcription pipeline with known audio

Manual (always required):
  ✗ Real microphone recording quality
  ✗ Long recordings (5–8 min) transcription reliability
  ✗ Recovery at precise kill-timing windows (Tier C)
  ✗ Incoming call interruption
  ✗ Physical device lock behavior
```

See `docs/VOICE_JOURNALING_TESTS.md` for the full manual test protocol.

**Other Tier 3 items:**

| Fix | What It Solves |
|-----|---------------|
| Migrate `lib/supabase/*.js` → TypeScript | Full type safety on the data layer |
| Replace mirror polling with Supabase Realtime | Eliminates polling complexity in `useMirrorData` |

---

## Recommended Outside Services

### 1. Supabase Realtime — Free, Already Available
The most impactful architectural improvement for voice journaling. Instead of polling the `journals` table every 3 seconds for 3 minutes, subscribe to the specific journal row via Realtime. The moment the edge function updates `transcription_status` to `completed`, the app knows instantly. Eliminates Bugs 2 and all polling race conditions.

**Priority: Include in Tier 1 implementation.**

### 2. Logflare (via Supabase Dashboard) or Axiom
Right now the client-side is well-instrumented via Sentry. But edge function failures — Whisper rate limits, timeouts, malformed audio — are invisible. You only see them as a stuck `pending` status in the DB.

Logflare is built into Supabase and can be enabled from the dashboard. Axiom has a free tier with better querying. Either gives you real-time logs from `transcribe-audio`, `generate-mirror`, and other edge functions.

**Without this, you find out about transcription outages from users, not from monitoring.**

**Priority: Set up alongside Tier 2 process work.**

### 3. Deepgram (Whisper Alternative/Fallback)
OpenAI Whisper via edge function is your single point of failure for voice transcription. If it's rate-limited, down, or times out on a long recording, every voice journal fails.

Deepgram is meaningfully faster (5–15 seconds vs 30+ for Whisper on longer recordings), has a higher-reliability SLA, and costs less per minute of audio. You don't have to replace Whisper immediately — a fallback that retries with Deepgram when Whisper fails would significantly reduce transcription failures.

**Priority: Evaluate once Logflare shows you how often Whisper is failing.**

---

## Development Process With These Gates In Place

This is the workflow once Tier 1 fixes and Tier 2 gates are in place.

---

### Step 1: Make a Change with Claude

You describe what you want. For any non-trivial change, Claude will:
1. **Read the relevant files first** — never write code it hasn't seen
2. **For significant changes, describe the plan** and wait for your confirmation before writing code (this is "plan mode")
3. **Make one focused change** — avoids touching unrelated code

---

### Step 2: Pre-Commit Hook Runs Automatically

When you (or Claude) runs `git commit`, Husky fires before the commit completes:

```
Running: tsc --noEmit    ← TypeScript checks all types
Running: expo lint        ← ESLint checks code rules
```

**If either check fails, the commit is blocked.** Claude sees the error output and fixes it before you can commit.

This replaces the code review step you don't have as a solo founder. The tools catch what a senior developer would catch in a PR review.

---

### Step 3: GitHub Actions Validates the Push

When the commit pushes to GitHub, a CI workflow runs:
- TypeScript check
- Lint check
- (Future) Test suite

You see a green ✓ or red ✗ on the commit in GitHub. **Don't build to TestFlight from a red commit.**

This is your second gate — catches anything that slipped past pre-commit (e.g., if the hook was skipped, or a file was committed directly).

---

### Step 4: Build a Preview to TestFlight

```
eas build --profile preview
```

Only build after CI is green. The preview profile builds an internal TestFlight distribution you can install and test on a real device.

---

### Step 5: Test the Changed Flow

Using `TESTING_CHECKLIST.md` as your guide — but you don't need to run the full checklist every time. Focus on:

1. **The specific flow you changed** (e.g., if you changed voice journaling, run Section 3 of the checklist)
2. **Adjacent flows** (anything that shares code with your change)
3. **The critical journeys at the bottom of the checklist** — especially "Daily Use"

For voice journaling specifically, always run:
- **Tier A tests** (8 min) from `docs/VOICE_JOURNALING_TESTS.md` — core happy path + force-quit recovery
- If voice code changed: **Tier B + C** (45 min total)
- If Day 1 onboarding changed: **Tier D** (15 min)

---

### Step 6: Check Sentry After Testing

After your TestFlight session:
1. Open Sentry → check Issues for anything new
2. Any error that wasn't there before your change — investigate before releasing

This is a 2-minute check that catches errors that only appear on a real device (not in the simulator).

---

### Step 7: Check Edge Function Logs (Once Logflare Is Set Up)

If your change touches voice journaling, mirror generation, or any Supabase edge function:
1. Check Logflare/Axiom for any new errors from the edge function
2. Look for timeout patterns or Whisper failures

---

### Step 8: Production Release

Once preview testing passes:
```
eas build --profile production
```

Submit to App Store / TestFlight external.

---

## Ongoing Monitoring Routine

**After every release to TestFlight:**
- Check Sentry for new errors within 24 hours

**Weekly (5 minutes):**
- Open Sentry → Issues → sort by "First Seen" this week
- Any error appearing 5+ times that week gets a dedicated fix in the next session
- Check Logflare for transcription failure rate trends

**Monthly:**
- Review whether any Tier 3 items have become urgent based on what Sentry/Logflare is showing

---

## The Mental Model

As a solo founder without a QA team or second developer:

**Automated gates replace the code reviewer you don't have.**

| Without Gates | With Gates |
|--------------|------------|
| TypeScript errors → found by users | TypeScript errors → blocked at commit |
| Bad code patterns → found by users | ESLint violations → blocked at commit |
| Regressions → found by users | CI failure → visible before TestFlight build |
| Edge function outages → found by users | Logflare → you know before users do |
| Crashes → found by users, details unknown | Sentry → you know exactly what failed and why |

The goal is to push the discovery of every class of error as early as possible in the process — ideally before it ever reaches a device.

---

## Related Documents

- `docs/VOICE_JOURNALING_TESTS.md` — Full manual test protocol for voice journaling (tiered by change scope)
- `docs/CODE-QUALITY-AUDIT.md` — 28-issue code quality audit (Feb 2026)
- `docs/TESTING_CHECKLIST.md` — Manual testing checklist for all features
- `docs/BULLETPROOF_VOICE_PLAN.md` — Prior voice journaling resilience work
- `docs/SECURITY-PLAN.md` — App Store security hardening
