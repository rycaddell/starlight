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

**File:** `app/(tabs)/index.tsx:98–128`
**Impact:** HIGH — one extra full-table journals fetch on every Journal screen focus

`loadTodayAnsweredPrompts` calls `getUserJournals(user.id)` (which fetches **all** journals with all columns), then filters client-side for today's entries. This happens in addition to `loadJournals()` which already calls `getUserJournals(user.id)`.

The fix already exists: `lib/supabase/journals.js:145–174` exports `getTodaysAnsweredPrompts(userId)` which runs a server-side query with a `WHERE created_at >= today AND prompt_text IS NOT NULL`, returning only the `prompt_text` field. It is **never called anywhere in the app**.

**Fix:** Replace `loadTodayAnsweredPrompts` in `index.tsx` with a call to the existing `getTodaysAnsweredPrompts(user.id)` from journals.js.

**Gain:** Eliminates 1 redundant full journals fetch on every Journal screen focus. Server-side filtering instead of client-side.

---

### 4. Mirror Polling Interval Too Aggressive (3 Seconds)

**File:** `hooks/useMirrorData.ts:148–254`
**Impact:** HIGH — 80 network requests over 4 minutes during mirror generation; battery drain

The polling interval is hardcoded to `3000ms` (line 253) with 80 max attempts. This generates up to **80 Supabase queries** over ~4 minutes for a single mirror generation. Each poll queries `mirror_generation_requests` and, if completed, also fetches the full mirror record.

**Fix:** Start at 5 seconds, increase to 10 seconds after the first 10 attempts (exponential-ish backoff). 30 max attempts is sufficient (5 minutes total coverage).

**Gain:** 40–66% reduction in polling network requests. Meaningful battery savings during generation.

---

### 5. `supabase.auth.getSession()` Called but Result Never Used

**File:** `lib/supabase/mirrors.js:30`, `lib/supabase/mirrors.js:375`
**Impact:** MEDIUM-HIGH — unnecessary async round-trip on every mirror generation and onboarding preview request

Both `requestMirrorGeneration` and `generateOnboardingPreview` begin with:
```js
const { data: { session } } = await supabase.auth.getSession();
```
…but `session` is never referenced. Only `process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY` is used for the auth header.

**Fix:** Remove these `getSession()` calls entirely.

**Gain:** Faster cold-start for mirror generation and onboarding preview requests (eliminates one async DB round-trip).

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

**File:** `app/(tabs)/mirror.tsx:858–1029`
**Impact:** HIGH code quality — significant dead weight in a complex file

`MirrorCard` and `ReflectionDisplay` components are defined at lines 858–1029 but **never rendered**. The Mirror screen now uses `LastMirrorCard` and `LastJournalCard`. These are leftovers from a prior implementation. The inline styles for these components (lines 1067–1183) also use raw hex colors (`#ffffff`, `#1e293b`, `#e2e8f0`) instead of design tokens.

**Fix:** Delete lines 858–1029 (both component definitions and their `styles` entries).

**Gain:** ~170 lines removed from the largest, most complex screen file. Easier to maintain.

---

### 8. Dead Imports in `mirror.tsx`

**File:** `app/(tabs)/mirror.tsx:12–15`
**Impact:** MEDIUM — unused imports add to bundle size and create confusion

Two components are imported but never rendered:
- `MirrorStatusCard` (line 12) — no JSX usage found in render tree
- `MirrorTestPanel` (line 15) — no JSX usage found in render tree

**Fix:** Remove both import lines.

---

### 9. `GestureHandlerRootView` Imported but Never Used

**File:** `app/(tabs)/_layout.tsx:4`
**Impact:** LOW-MEDIUM — dead import from a large native module

```ts
import { GestureHandlerRootView } from 'react-native-gesture-handler';
```
This import exists but `GestureHandlerRootView` is never referenced in the file's JSX.

**Fix:** Remove the import line.

---

### 10. `SpaceMono` Font Loaded at Startup but Never Used

**File:** `app/_layout.tsx:62–63`
**Impact:** MEDIUM — wastes startup time loading a font that goes unused

```ts
SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
```
The entire design system uses `Satoshi Variable`. `SpaceMono` appears nowhere in `theme/designTokens.ts` or any component. It was part of the Expo template default and was never removed.

**Fix:** Remove the `SpaceMono` entry from `useFonts()` and delete `assets/fonts/SpaceMono-Regular.ttf`.

**Gain:** Faster initial font load, ~50KB off the bundle.

---

### 11. Deprecated `signInAnonymously` in Barrel Export

**File:** `lib/supabase.js:8–12`
**Impact:** LOW — dead code still exported from root module

```js
export const signInAnonymously = async () => {
  console.warn('⚠️ signInAnonymously is deprecated...');
  return { success: false, error: 'Function deprecated' };
};
```
This is exported from the root barrel but does nothing useful. No callers exist in the codebase.

**Fix:** Delete the function.

---

### 12. `getTodaysAnsweredPrompts` Function Never Called

**File:** `lib/supabase/journals.js:144–174`
**Impact:** LOW — dead function

This function was written to efficiently fetch today's answered prompts server-side, but `index.tsx` instead does the equivalent manually with `getUserJournals()` + client-side filter (see issue #3). The function is never imported or called.

**Fix:** After applying fix #3, this function becomes the canonical implementation. Remove the manual version in `index.tsx`.

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

**Files:** `app/(tabs)/friends.tsx:123–237`, `contexts/FriendBadgeContext.tsx:97–205`
**Impact:** MEDIUM — redundant subscriptions, full data reload on every change

`FriendBadgeContext` already has two Supabase realtime subscriptions watching `friend_links` changes. `FriendsScreen` sets up its **own** additional subscriptions on the same table, and each change triggers `loadData()` — a full reload of all friends and shares.

**Fix:** Remove the realtime subscriptions from `FriendsScreen`. Let `FriendBadgeContext` handle the badge count (it already does). For the friends list itself, either refresh on focus (already done via `useFocusEffect`) or implement optimistic updates on the context level.

**Gain:** Fewer active WebSocket subscriptions, fewer full-reload triggers, less Supabase connection overhead.

---

### 15. `fetchFriends()` Called on Every Share Button Press

**File:** `app/(tabs)/mirror.tsx:478`, dead `MirrorCard:941`
**Impact:** MEDIUM — redundant network call; creates delay before share sheet opens

Every time the Share button is pressed, the app calls `fetchFriends(user.id)` to check if the user has friends, then opens the share sheet (or navigates to Friends tab). The Friends screen already has this data loaded. There's no caching.

**Fix:** Either pass the `hasFriends` state from Friends screen context, or cache the friends list in a context so `handleShareLastMirror` can check locally without a network call.

**Gain:** Instant share sheet open (no network round-trip), better perceived performance.

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

**File:** `lib/supabase/mirrors.js:7`, `lib/supabase/mirrors.js:364`
**Impact:** MEDIUM — must update code (not config) if URL changes; project ID exposed

```js
const EDGE_FUNCTION_URL = 'https://olqdyikgelidrytiiwfm.supabase.co/functions/v1/generate-mirror';
const ONBOARDING_PREVIEW_URL = 'https://olqdyikgelidrytiiwfm.supabase.co/functions/v1/generate-onboarding-preview';
```

**Fix:** Move to `lib/config/constants.js` or build from `process.env.EXPO_PUBLIC_SUPABASE_URL`.

---

### 18. Missing TypeScript Types in Data Layer

**Files:** `lib/supabase/*.js` (11 files), `lib/config/constants.js`
**Impact:** MEDIUM — all data layer code lacks type checking; return shapes are `any`

The entire data access layer (`auth.js`, `mirrors.js`, `journals.js`, `friends.js`, etc.) is plain JavaScript. The database types exist in `types/database.ts` but aren't used. This means type errors in the most critical path of the app are caught only at runtime.

**Fix:** Rename all `.js` files to `.ts`, add return type annotations, leverage `types/database.ts`.

**Gain:** Catch data shape bugs at compile time instead of runtime.

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

**Files:** `assets/images/react-logo.png`, `react-logo@2x.png`, `react-logo@3x.png`, `assets/images/partial-react-logo.png`
**Impact:** LOW — dead assets from Expo template never cleaned up

**Fix:** Delete all four files.

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

**File:** `hooks/useAudioRecording.tsx:379–426`
**Impact:** LOW — status callback fires on every audio frame, not just per-second

`setOnRecordingStatusUpdate` fires very frequently (sub-second) during recording, and each callback calls `setRecordingDuration`, triggering re-renders of all components that consume `recordingDuration`.

**Fix:** Throttle duration updates to once per second using a `lastUpdateTime` ref check inside the callback.

---

### 25. Inline Colors in Dead `MirrorCard` Component Don't Use Design Tokens

**File:** `app/(tabs)/mirror.tsx:1067–1183`
**Impact:** LOW — applies only to dead code (see issue #7)

Once `MirrorCard` and `ReflectionDisplay` are deleted (issue #7), this becomes moot. Noted here for awareness — if any of these styles are ever reused, they should reference `colors` from `designTokens`.

---

### 26. `getLastJournalType` Function — Verify Usage

**File:** `lib/supabase/journals.js:247–275`
**Impact:** LOW — potentially unused function

This function exists to return the last journal entry type for default tab selection, but no import of it was found in the app codebase.

**Fix:** Search for callers; delete if unused.

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
| 3 | Redundant journals fetch (`loadTodayAnsweredPrompts`) | Performance | 🔴 High |
| 4 | 3-second polling interval too aggressive | Performance | 🔴 High |
| 5 | `getSession()` called but result unused | Performance | 🟠 Med-High |
| 6 | Test infrastructure in production | Code quality | ✅ Fixed |
| 7 | Dead `MirrorCard`/`ReflectionDisplay` components | Code quality | 🟠 Med-High |
| 8 | Dead imports (`MirrorStatusCard`, `MirrorTestPanel`) | Code quality | 🟡 Medium |
| 9 | `GestureHandlerRootView` imported but unused | Code quality | 🟡 Medium |
| 10 | `SpaceMono` font loaded but unused | Performance | 🟡 Medium |
| 11 | Deprecated `signInAnonymously` in barrel | Code quality | 🟡 Medium |
| 12 | `getTodaysAnsweredPrompts` never called | Code quality | 🟡 Medium |
| 13 | Four separate AppState listeners | Architecture | 🟡 Medium |
| 14 | Realtime subscriptions duplicated | Architecture | 🟡 Medium |
| 15 | `fetchFriends()` on every Share press | Performance | 🟡 Medium |
| 16 | Mirror state machine fragility | Architecture | 🟡 Medium |
| 17 | Hardcoded Edge Function URLs | Maintainability | 🟡 Medium |
| 18 | Data layer not TypeScript | Type safety | 🟡 Medium |
| 19 | Inconsistent error handling | Architecture | 🟡 Medium |
| 20 | No error boundaries | Reliability | ✅ Fixed |
| 21 | React logo assets (Expo template) | Bundle size | 🟢 Low |
| 22 | `Dimensions.get` at module level | Correctness | 🟢 Low |
| 23 | Stale closure in `useFocusEffect` | Correctness | 🟢 Low |
| 24 | Audio status updates excess re-renders | Performance | 🟢 Low |
| 25 | Inline colors in dead component | Code quality | 🟢 Low |
| 26 | `getLastJournalType` unused function | Code quality | 🟢 Low |
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
