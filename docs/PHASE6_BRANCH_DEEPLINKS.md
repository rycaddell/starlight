# Phase 6: Branch.io Deferred Deep Linking

## Goal

When User A invites User B via the share sheet and User B does NOT have the app installed, the invite token is preserved through the App Store install. On first launch after install, User B is automatically routed to the accept-invite screen and becomes friends with the inviter.

---

## Branch Account

- Live Key: `key_live_hCztJHj8AChUp2BR9P5mwkketqe3spYf`
- Test Key: `key_test_etuAOGaYBzlRm0tS6T5K9epfAAb7sjWq`
- App ID (numeric, not the SDK key): Live `1559180291845673804`, Test `1559180291887616845`
- Link Domain: `oxbow.app.link`
- Bundle ID: `com.caddell.starlight`
- Apple App Prefix: `NX4S5H25Q3`
- URI Scheme: `oxbow`
- Fallback URL: `https://oxbowjournal.com`

---

## Current State of the Code

### What is implemented and in the codebase

- `react-native-branch` SDK installed (`package.json`)
- `branch_key` and `branch_universal_link_domains` set in `ios.infoPlist` in `app.config.js`
- `associatedDomains` includes `oxbow.app.link` and `oxbow-alternate.app.link` in `app.config.js`
- `BranchHandler` component in `app/_layout.tsx` — subscribes to Branch links, routes to `/friend-invite/[token]`, handles deferred case via `pendingInviteRef`
- `createInviteLink()` in `lib/supabase/friends.js` returns `token` alongside `deepLink`
- `handleCreateInvite` in `app/(tabs)/friends.tsx` attempts to create a Branch short URL, falls back to `oxbow://` if Branch fails
- `web/.well-known/apple-app-site-association` uses correct bundle ID `com.caddell.starlight`

### What is NOT in the codebase

- `@config-plugins/react-native-branch` — was installed and tried, then uninstalled (see build failures below)

---

## Build History

### Build 1 — SDK only, numeric app ID as key (wrong key format)
- **Config:** `react-native-branch` installed, numeric app ID `1559180291845673804` in infoPlist, no config plugin
- **Build result:** ✅ Succeeded
- **Runtime result:** ❌ "branch user session has not been initialized" error when generating invite link → fell back to `oxbow://`

### Build 2 — Correct SDK key, added `@config-plugins/react-native-branch`
- **Config:** `key_live_hCztJHj8AChUp2BR9P5mwkketqe3spYf` in infoPlist, plugin added to plugins array, `newArchEnabled: true`
- **Build result:** ❌ Failed — `cannot find type 'RCTBridge' in scope` in `AppDelegate.swift:58`
- **Root cause:** `@config-plugins/react-native-branch` modifies AppDelegate, inserting `override func sourceURL(for bridge: RCTBridge)` which requires `RCTBridge` — incompatible with Expo SDK 54 / RN 0.81 AppDelegate

### Build 3 — Same config, `newArchEnabled: false`
- **Config:** Same as Build 2 with `newArchEnabled: false`
- **Build result:** ❌ Failed — same `RCTBridge` error
- **Note:** Disabling New Architecture did not resolve the plugin's AppDelegate incompatibility

### Build 4 — Config plugin removed from plugins array, `newArchEnabled: true`
- **Config:** Plugin removed from `plugins` array but `@config-plugins/react-native-branch` still in `node_modules`
- **Build result:** ❌ Failed — same `RCTBridge` error
- **Note:** Package appears to auto-apply even when not listed in plugins array

### Build 5 — Custom plugin, `@config-plugins/react-native-branch` fully removed
- **Config:** `@config-plugins/react-native-branch` uninstalled from `node_modules`; custom `plugins/withBranch.js` added; `newArchEnabled: true`
- **Plugin does three things:**
  1. Adds `#import "RNBranch.h"` to iOS bridging header (NOT `<React/RCTBridge.h>`)
  2. Inserts `RNBranch.initSession(launchOptions: launchOptions, isReferrable: true)` before the `return super.application(...)` line in `application(_:didFinishLaunchingWithOptions:)`
  3. Appends `application(_:continue:restorationHandler:)` and `application(_:open:options:)` overrides for universal link + URI scheme handling
- **Root fix:** Avoids `RCTBridge` entirely; only imports `RNBranch.h` which is always available
- **Build result:** Pending

---

## What Still Needs to Be Solved

The `react-native-branch` SDK requires its session to be initialized in the iOS AppDelegate via `RNBranch.initSession(launchOptions: launchOptions)`. Without this call, the SDK fails at runtime with "branch user session has not been initialized."

The standard Expo solution (`@config-plugins/react-native-branch`) inserts AppDelegate code that is incompatible with Expo SDK 54 / RN 0.81. The incompatibility persists regardless of `newArchEnabled` setting.

### Approaches not yet tried

1. **Uninstall `@config-plugins/react-native-branch` entirely** (including from `node_modules`) and confirm Build 1 state (builds succeed, runtime session error). Then address session initialization separately.

2. **Write a minimal custom config plugin** — a small `branch.plugin.js` file that adds only `RNBranch.initSession(launchOptions: launchOptions)` to the AppDelegate without the broken `sourceURL(for bridge: RCTBridge)` pattern.

3. **Check if `ExpoAdapterBranch` handles initialization** — the `react-native-branch` package ships a native `ExpoAdapterBranch` pod that compiled successfully in Build 1. It may initialize the session automatically through Expo's module system without any AppDelegate changes. This was not confirmed.

4. **Clipboard fallback** — store invite token in clipboard at share time, read it on first app launch. No native initialization required. Free. Less reliable (user can clear clipboard before installing).

---

## Existing Invite Flow (works today)

1. User A taps "Invite Friend"
2. `createInviteLink()` creates a `friend_invites` row in Supabase, returns token
3. Branch link creation is attempted — if it fails, falls back to `oxbow://friend-invite/TOKEN?inviter=ID&name=NAME`
4. Native share sheet opens
5. User B taps link:
   - **App installed:** iOS routes via URI scheme → `app/friend-invite/[token].tsx` → accept screen ✅
   - **App not installed:** Goes to App Store → installs → opens to home screen → token is LOST ❌

---

## Files Changed for This Feature

| File | What changed |
|---|---|
| `app.config.js` | Added `associatedDomains` for Branch domains; added `branch_key` and `branch_universal_link_domains` to `infoPlist` |
| `app/_layout.tsx` | Added `BranchHandler` component with `branch.subscribe()` |
| `lib/supabase/friends.js` | `createInviteLink()` now returns `token` in addition to `deepLink` |
| `app/(tabs)/friends.tsx` | `handleCreateInvite` attempts Branch short URL, falls back to `oxbow://` |
| `web/.well-known/apple-app-site-association` | Fixed bundle ID from `com.caddell.oxbow` → `com.caddell.starlight` |
