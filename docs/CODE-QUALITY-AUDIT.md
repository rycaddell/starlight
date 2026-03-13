# Oxbow App — Code Quality & Performance Audit

**Date:** February 24, 2026
**Scope:** Full codebase review — app/, components/, hooks/, contexts/, lib/, supabase/
**Total issues found:** 28

Issues are ordered by estimated impact: highest ROI fixes first.

---

## Tier 1 — Highest Impact (Do These First)

---

### 1. Two Independent `useMirrorData` Instances (Journal + Mirror Tabs)

**Files:** `app/(tabs)/index.tsx:36`, `app/(tabs)/mirror.tsx:67–87`
**Impact:** HIGH — doubles all mirror-related DB calls on every tab navigation

Both `JournalScreen` and `MirrorScreen` call `useMirrorData()` independently. This creates two separate hook instances with separate state, each making their own API calls:
- `getUserJournals(user.id)` — fetches full journals list twice
- `getUserJournalCount(user.id)` — queries journal count twice
- `checkMirrorGenerationStatus()` — polls independently from both tabs

Every tab focus triggers redundant parallel fetches. The two instances also have no shared state, which is why complex hand-off logic was needed (navigating with `openMirrorId` param, `isOpeningViaMirrorParam` ref, etc.).

**Fix:** Lift `useMirrorData` into a React context (e.g., `MirrorDataContext`) so both tabs share one instance. This eliminates the hand-off complexity and cuts DB calls by ~50%.

**Gain:** ~50% reduction in DB calls from tab navigation, elimination of `isOpeningViaMirrorParam` race condition workaround.

---

### 2. 630 `console.log/warn/error` Calls Running in Production

**Status: ✅ Fixed (March 2026) — `lib/silenceLogsInProduction.ts` shim**

**Files:** Entire codebase — app/, components/, hooks/, contexts/, lib/
**Impact:** HIGH — JS thread tax on every log call, especially on iOS where logs cross the bridge

There are **630** console statement calls across the codebase. In React Native, `console.log` on iOS routes through the JS-to-native bridge. In production builds, Metro doesn't strip these by default. They also make Hermes engine performance profiling noisy.

Notable hot spots:
- `hooks/useMirrorData.ts` — 71 console calls, many inside polling callbacks that fire every 3 seconds
- `app/(tabs)/mirror.tsx` — multiple `console.log` blocks in the **render body** (lines 526–535, 557–561, 707), running on **every render cycle**
- `lib/supabase/mirrors.js` — 31 console calls in network request paths
- Three `useEffect` hooks in `mirror.tsx` (lines 55–66) exist solely to log state changes to console

**Fix applied:** `lib/silenceLogsInProduction.ts` imported at the top of `app/_layout.tsx`. In `__DEV__` mode all console output works as before. In production builds, `console.log` and `console.warn` are no-ops. `console.error` is left untouched (used by React Native internals). The three debug-only `useEffect` hooks in `mirror.tsx` and render-body log blocks remain as candidates for future cleanup.

**Gain:** Reduced JS thread jank during recording, polling, and navigation. Cleaner Sentry breadcrumb signal.

---

### 3. `loadTodayAnsweredPrompts` Makes a Redundant Full Journal Fetch

**Status: ✅ Fixed (March 2026)**

**File:** `app/(tabs)/index.tsx`
**Impact:** HIGH — one extra full-table journals fetch on every Journal screen focus

`loadTodayAnsweredPrompts` previously called `getUserJournals(user.id)` (fetching all journals with all columns) then filtered client-side for today's entries. Replaced with a direct call to `getTodaysAnsweredPrompts(user.id)` from `lib/supabase/journals.ts`, which runs a targeted server-side query: `SELECT prompt_text WHERE custom_user_id = ? AND prompt_text IS NOT NULL AND created_at >= today`. The `getUserJournals` import was also removed from `index.tsx` as it was no longer needed there.

---

### 4. Mirror Polling Interval Too Aggressive (3 Seconds)

**Status: ✅ Superseded (March 2026) — replaced by Supabase Realtime subscription**

**File:** `hooks/useMirrorData.ts`

Polling has been removed entirely. `useMirrorData` now subscribes to `mirror_generation_requests` via `postgres_changes` WebSocket. The moment the edge function writes `status = 'completed'`, the app receives it instantly. A 4-minute safety-net timeout does one final DB query if the WebSocket event never arrives. Net result: 0 polling queries during normal operation (down from 80), and a single query only if Realtime fails.

---

### 5. `supabase.auth.getSession()` Called but Result Never Used

**Status: ✅ Not applicable — superseded by Supabase Auth migration**

**File:** `lib/supabase/mirrors.ts`

After the auth migration to Supabase Auth + Twilio Verify, `requestMirrorGeneration` now correctly uses `session.access_token` as the Bearer token for the edge function call (required for RLS). The `getSession()` call is not unused — it provides the JWT. `generateOnboardingPreview` uses only the anon key (no user auth needed for that endpoint) and has no `getSession()` call. No change required.

---

## Tier 2 — High Impact (Test/Debug Leftovers)

---

### 6. Test/Debug Infrastructure in Production Build

**Status: ✅ Fixed (March 2026)**

**Impact:** HIGH — security exposure, bundle bloat, real users could stumble on test routes

All test artifacts have been removed:
- `app/button-test.tsx`, `app/components-test.tsx`, `app/design-test.tsx`, `app/phase3-test.tsx` — deleted
- `components/mirror/MirrorTestPanel.tsx` — deleted
- `lib/supabase/testData.js` — deleted

Note: `testData` barrel export from `lib/supabase.js` and `insertTestData`/`insertTestJournalData` in `useMirrorData` should be verified and removed if still present.

---

### 7. Dead Component Code in `mirror.tsx` (~170 Lines)

**Status: ✅ Already done (prior to March 2026 audit session)**

`MirrorCard` and `ReflectionDisplay` were already removed before this audit session. `mirror.tsx` is 708 lines (down from the ~1183 the audit projected), and neither component nor their associated styles are present.

---

### 8. Dead Imports in `mirror.tsx`

**Status: ✅ Fixed (March 2026)**

`MirrorStatusCard` and `MirrorTestPanel` were already gone. The remaining dead imports — `MirrorProgress` and `JournalHistory` — were removed in this session.

---

### 9. `GestureHandlerRootView` Imported but Never Used

**Status: ✅ Already done (prior to March 2026 audit session)**

Import was already removed from `app/(tabs)/_layout.tsx`.

---

### 10. `SpaceMono` Font Loaded at Startup but Never Used

**Status: ✅ Fixed (March 2026)**

`SpaceMono` entry was already removed from `useFonts()` in `app/_layout.tsx`. The `assets/fonts/SpaceMono-Regular.ttf` file was deleted manually this session.

---

### 11. Deprecated `signInAnonymously` in Barrel Export

**Status: ✅ Already done (prior to March 2026 audit session)**

Function was already removed. `lib/supabase.js` is now a clean 5-line barrel of `export *` re-exports.

---

### 12. `getTodaysAnsweredPrompts` Function Never Called

**Status: ✅ Fixed (March 2026) — resolved by fix #3**

Now the canonical implementation, called directly from `index.tsx`. See issue #3.

---

## Tier 3 — Medium Impact (Architecture & Network Patterns)

---

### 13. Four Separate AppState Listeners Across the App

**Files:** `hooks/useMirrorData.ts:367–401`, `contexts/UnreadSharesContext.tsx:134–145`, `contexts/FriendBadgeContext.tsx:207–219`, `hooks/useAudioRecording.tsx:436–472`
**Impact:** MEDIUM — redundant native event subscriptions; makes foreground/background logic hard to trace

Four different files independently call `AppState.addEventListener('change', ...)`. Each fires on every app state change and triggers its own work (polling restart, count refresh, recording pause). These are uncoordinated and difficult to reason about as a system.

**Fix:** Create a shared `useAppState` hook that maintains one `AppState` subscription and exposes the current state via context or simple hook. All four consumers read from this.

**Gain:** Single native subscription, predictable ordering of foreground/background callbacks, easier to debug.

---

### 14. Friends Screen Realtime Subscriptions Duplicate Context Subscriptions

**Status: ✅ Fixed (March 2026)**

Removed the two `friend_links` `useEffect` subscription blocks from `FriendsScreen`. `FriendBadgeContext` already covers those channels for badge counts. Added `loadData()` to the existing `useFocusEffect` so the friends list refreshes on every tab focus. The `mirror_shares` subscription is kept — it's unique to this screen and handles live updates when a friend shares a mirror while the tab is active. Net result: 3 active WebSocket channels reduced to 1 for this screen.

---

### 15. `fetchFriends()` Called on Every Share Button Press

**Status: ✅ Fixed (March 2026)**

Added `hasFriends: boolean | null` state to `MirrorScreen`. On mount, `fetchFriends` runs alongside `loadJournals` and `loadUserMirrors` and caches the result. `handleShareLastMirror` now uses the cached value — share sheet opens instantly with no network call. The network fallback still fires only if the user presses Share before the mount fetch completes.

---

### 16. Mirror State Machine Is Fragile String-Union State

**File:** `hooks/useMirrorData.ts`
**Impact:** MEDIUM — complex conditional logic spread across multiple functions, difficult to test or extend

The mirror state `'progress' | 'ready' | 'generating' | 'completed' | 'viewing'` drives many conditional branches:
- State drift detection and correction (line 223–226)
- Safety checks for already-viewed mirrors (line 172–174)
- Different reset paths depending on state (lines 282–314)
- `skipStateUpdate` parameter to prevent `loadJournals` from overwriting state (lines 69, 107)

This has already produced bugs (hence the `mirrorStateRef` workaround to read state inside closures).

**Fix:** Implement this as an explicit state machine using [xstate](https://xstate.js.org/) or a simple enum + reducer pattern. Each transition is explicit and guarded.

**Gain:** Eliminates the `mirrorStateRef` hack, makes state transitions auditable, prevents new bugs as features are added.

---

### 17. Hardcoded Supabase Edge Function URLs

**Status: ✅ Fixed (March 2026)**

**File:** `lib/supabase/mirrors.ts`

Both URLs now derived from `process.env.EXPO_PUBLIC_SUPABASE_URL`:
```ts
const EDGE_FUNCTION_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/generate-mirror`;
const ONBOARDING_PREVIEW_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/generate-onboarding-preview`;
```

---

### 18. Missing TypeScript Types in Data Layer

**Status: ✅ Fixed (March 2026) — Tier 3 TypeScript migration**

All 10 files in `lib/supabase/` and `lib/config/constants.js` have been migrated to TypeScript (`.ts`). The data layer is now covered by the CI type gate.

---

### 19. Inconsistent Error Handling Pattern

**Files:** Multiple lib/supabase files
**Impact:** MEDIUM — callers must guess whether a function throws or returns `{success, error}`

Some functions return `{ success: false, error: string }`, others throw, others `console.error` and return undefined. This forces defensive coding at every call site.

**Fix:** Standardize on a single `Result<T>` pattern: `{ success: true, data: T } | { success: false, error: string }`. Never throw from data layer functions.

---

### 20. No Error Boundaries

**Status: ✅ Fixed (March 2026)**

**Files:** Entire component tree
**Impact:** MEDIUM — any unhandled render error crashes the entire app

`ErrorBoundary` component added at `components/ui/ErrorBoundary.tsx`. Wrappers applied to:
- Root layout (`app/_layout.tsx`) — last-resort catch
- All three tab screens (`index.tsx`, `mirror.tsx`, `friends.tsx`) — each wrapped so a crash in one tab doesn't kill the tab bar

Each tab exports a wrapped default that renders the tab inside an `ErrorBoundary` with a fallback UI.

---

## Tier 4 — Lower Impact (Cleanup & Polish)

---

### 21. Unused React Logo Assets (Default Expo Template)

**Status: ✅ Already done (prior to March 2026 audit session)**

All four react logo image files were already deleted.

---

### 22. `Dimensions.get('window').width` at Module Level

**File:** `app/(tabs)/index.tsx:24`
**Impact:** LOW — static value won't update if device orientation changes

```ts
const screenWidth = Dimensions.get('window').width;
```
This is evaluated once at module load. On orientation change, `screenWidth` stays stale.

**Fix:** Move into component using `useWindowDimensions()` hook, or keep static if landscape is not supported.

---

### 23. `useCallback` Dependency Array Stale Closure in Mirror Screen

**File:** `app/(tabs)/mirror.tsx:186`
**Impact:** LOW-MEDIUM — `useFocusEffect` may use stale `loadMirrorData`

`useFocusEffect` lists `loadMirrorData` as a dependency (line 186), but `loadMirrorData` is defined as a `useCallback` that depends on `journals`. Since `journals` changes frequently, `loadMirrorData` is recreated often, causing the focus effect to re-register. The callback itself isn't memoized at the point of usage.

**Fix:** Confirm `loadMirrorData`'s `useCallback` dependencies are correct and minimal.

---

### 24. Audio Recording Status Updates May Cause Excess Re-renders

**Status: ✅ Fixed (March 2026)**

`setOnRecordingStatusUpdate` was calling `setRecordingDuration` on every audio frame (~10x/sec) even when the integer-second value hadn't changed. Fixed by saving `latestDurationRef.current` before updating it and only calling `setRecordingDuration` when `durationInSeconds !== prevDuration`. Reduces state updates from ~10/sec to 1/sec during recording with no new refs.

---

### 25. Inline Colors in Dead `MirrorCard` Component Don't Use Design Tokens

**Status: ✅ Moot — resolved by issue #7**

`MirrorCard` and `ReflectionDisplay` are gone. The associated raw-hex styles were removed with them.

---

### 26. `getLastJournalType` Function — Verify Usage

**Status: ✅ Fixed (March 2026)**

Confirmed no callers anywhere in the codebase. Deleted from `lib/supabase/journals.ts`.

---

### 27. `react-native-worklets` in Package Dependencies

**File:** `package.json:51`
**Impact:** LOW — large native module; no usage found in app code

`react-native-worklets@^0.6.1` is listed as a direct dependency but no `import` of it appears in app source files. It may be a transitive requirement of `react-native-reanimated` but listing it as a direct dep is misleading.

**Fix:** Remove from `package.json` direct dependencies. Let reanimated pull it transitively if needed.

---

### 28. Context Provider Nesting (5 Levels Deep)

**File:** `app/_layout.tsx:72–96`
**Impact:** LOW — verbose nesting, minor render overhead at root

```tsx
<AuthProvider>
  <UnreadSharesProvider>
    <FriendBadgeProvider>
      <OnboardingProvider>
        <GlobalSettingsProvider>
```

`UnreadSharesProvider` and `FriendBadgeProvider` are both badge-count contexts that serve the same tab bar display. They could be merged into a single `BadgeCountProvider` that manages both counts.

**Fix (optional):** Combine `UnreadSharesContext` and `FriendBadgeContext` into `BadgeContext`. Reduces nesting by one level and one realtime subscription surface.

---

## Summary Table

| # | Issue | Area | Impact |
|---|-------|------|--------|
| 1 | Duplicate `useMirrorData` instances | Architecture | 🔴 High |
| 2 | 630 console.log calls in production | Performance | ✅ Fixed |
| 3 | Redundant journals fetch (`loadTodayAnsweredPrompts`) | Performance | ✅ Fixed |
| 4 | 3-second polling interval too aggressive | Performance | ✅ Superseded |
| 5 | `getSession()` called but result unused | Performance | ✅ N/A |
| 6 | Test infrastructure in production | Code quality | ✅ Fixed |
| 7 | Dead `MirrorCard`/`ReflectionDisplay` components | Code quality | ✅ Fixed |
| 8 | Dead imports (`MirrorStatusCard`, `MirrorTestPanel`) | Code quality | ✅ Fixed |
| 9 | `GestureHandlerRootView` imported but unused | Code quality | ✅ Fixed |
| 10 | `SpaceMono` font loaded but unused | Performance | ✅ Fixed |
| 11 | Deprecated `signInAnonymously` in barrel | Code quality | ✅ Fixed |
| 12 | `getTodaysAnsweredPrompts` never called | Code quality | ✅ Fixed |
| 13 | Four separate AppState listeners | Architecture | 🟡 Medium |
| 14 | Realtime subscriptions duplicated | Architecture | ✅ Fixed |
| 15 | `fetchFriends()` on every Share press | Performance | ✅ Fixed |
| 16 | Mirror state machine fragility | Architecture | 🟡 Medium |
| 17 | Hardcoded Edge Function URLs | Maintainability | ✅ Fixed |
| 18 | Data layer not TypeScript | Type safety | ✅ Fixed |
| 19 | Inconsistent error handling | Architecture | 🟡 Medium |
| 20 | No error boundaries | Reliability | ✅ Fixed |
| 21 | React logo assets (Expo template) | Bundle size | ✅ Fixed |
| 22 | `Dimensions.get` at module level | Correctness | 🟢 Low |
| 23 | Stale closure in `useFocusEffect` | Correctness | 🟢 Low |
| 24 | Audio status updates excess re-renders | Performance | ✅ Fixed |
| 25 | Inline colors in dead component | Code quality | ✅ Fixed |
| 26 | `getLastJournalType` unused function | Code quality | ✅ Fixed |
| 27 | `react-native-worklets` direct dep | Bundle | 🟢 Low |
| 28 | 5-level context provider nesting | Architecture | 🟢 Low |

---

## Suggested Fix Order

**Sprint 1 — Quick wins, high ROI:**
- Issues #2, #6, #7, #8, #9, #10, #11, #21 → All deletions/removals, no risk of regression

**Sprint 2 — Performance fixes:**
- Issues #3, #4, #5 → Reduce DB calls and polling load

**Sprint 3 — Architecture:**
- Issues #1 (lift useMirrorData to context), #13, #14, #15

**Sprint 4 — Long-term quality:**
- Issues #16, #18, #19, #20
