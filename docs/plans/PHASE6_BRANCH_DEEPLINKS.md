# Phase 6: Deferred Deep Linking via LinkRunner

## Goal

When User A invites User B via the share sheet and User B does NOT have the app installed, the invite token is preserved through the App Store install. On first launch after install, User B is automatically routed to the accept-invite screen and becomes friends with the inviter.

---

## Why LinkRunner (not Branch)

Branch deep linking requires a $500/mo paid plan. LinkRunner offers:
- **Free tier:** 25,000 events, one-time, no expiry, no credit card required
- **Pay-as-you-go** after free tier — scales with actual usage
- **Native `expo-linkrunner` config plugin** — automatically handles iOS configuration without the AppDelegate incompatibility that killed the Branch integration (see Build History below)
- Explicitly designed for "indie app builders" and "deep linking infra only" use cases

---

## LinkRunner Account

- **Dashboard:** https://app.linkrunner.io
- **Project Token:** `EXPO_PUBLIC_LINKRUNNER_PROJECT_TOKEN` (in `.env`)
- **API Key:** `EXPO_PUBLIC_LINKRUNNER_API_KEY` (in `.env`)
- **Link Domain:** `get.oxbowjournal.com`
- **Fallback URL:** `https://oxbowjournal.com`

---

## How Deferred Deep Linking Works (LinkRunner)

LinkRunner uses device fingerprinting (IP, device model, timestamp) to match a link tap to a subsequent app install — the same mechanism as Branch and AppsFlyer.

**App already installed:**
1. User B taps invite link
2. iOS intercepts as Universal Link → app opens directly to invite acceptance screen

**App not installed:**
1. User B taps link → App Store opens
2. User B installs and opens app
3. App calls `await linkrunner.getAttributionData()` on launch
4. LinkRunner servers match the install to the original link tap via fingerprinting
5. Response includes `deeplink: "oxbow://friend-invite/TOKEN?inviter=ID&name=NAME"`
6. App routes to invite acceptance screen (or stores for after auth completes)

**Key difference from Branch:** LinkRunner uses a **pull-based** model — `getAttributionData()` is called once on launch rather than Branch's push-based `subscribe()` listener. Same outcome, slightly different implementation shape.

---

## Social Media Intermediary Page

LinkRunner automatically displays an intermediary page when invite links are tapped inside Instagram, Facebook, and similar in-app browsers. These platforms block direct redirects to the App Store; the intermediary page detects this environment and triggers the native App Store app correctly.

**Custom branding:** Contact support@linkrunner.io with a Figma design reference. They require SVG format only (no PNG/JPG) for performance reasons. An Oxbow-branded intermediary page would show the Oxbow icon and app name before redirecting.

---

## Custom Subdomain Setup ✅ Done

- Subdomain: `get.oxbowjournal.com` → `api.linkrunner.io` (CNAME via Netlify DNS)
- SSL verified and active in LinkRunner dashboard
- Invite links will look like `https://get.oxbowjournal.com/?c=TOKEN`

---

## Integration Plan

### 1. Packages

```bash
# Remove Branch
npm uninstall react-native-branch

# Install LinkRunner
npm install rn-linkrunner
npx expo install expo-linkrunner
```

### 2. `app.config.js` changes

Remove Branch entries, add LinkRunner plugin:

```js
// REMOVE these from ios.infoPlist:
branch_key: 'key_live_...',
branch_universal_link_domains: ['oxbow.app.link', 'oxbow-alternate.app.link'],

// REMOVE from associatedDomains:
'applinks:oxbow.app.link',
'applinks:oxbow-alternate.app.link',

// ADD to plugins array:
[
  'expo-linkrunner',
  {
    userTrackingPermission: 'This identifier helps us connect you with friends who invited you to Oxbow.',
    debug: false, // true during development
  }
],

// ADD to ios.associatedDomains (for Universal Links via custom subdomain):
'applinks:get.oxbowjournal.com',
```

### 3. `app/_layout.tsx` — Replace `BranchHandler`

```typescript
// REMOVE:
import branch from 'react-native-branch';
// and the entire BranchHandler component

// ADD — call getAttributionData() once after auth resolves:
import linkrunner from 'rn-linkrunner';

// Inside RootLayout or a new LinkRunnerHandler component:
useEffect(() => {
  async function checkDeferredLink() {
    try {
      const data = await linkrunner.getAttributionData();
      if (!data?.deeplink) return;
      // data.deeplink = "oxbow://friend-invite/TOKEN?inviter=ID&name=NAME"
      // Route or store for after auth — same logic as pendingInviteRef in BranchHandler
    } catch (e) {
      // Non-fatal — deferred link just won't fire
    }
  }
  checkDeferredLink();
}, []);
```

**Note:** `getAttributionData()` should be called once on app launch. Store the result in a ref if the user hasn't authenticated yet, then process it once `user.id` is available — mirrors the `pendingInviteRef` pattern from `BranchHandler`.

### 4. `lib/supabase/friends.js` — Replace Branch short URL generation

```javascript
// REMOVE:
const buo = await branch.createBranchUniversalObject(...);
const { url } = await buo.generateShortUrl(...);

// REPLACE with LinkRunner Campaign API:
const response = await fetch('https://api.linkrunner.io/api/v1/create-campaign', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'linkrunner-key': process.env.EXPO_PUBLIC_LINKRUNNER_API_KEY,
  },
  body: JSON.stringify({
    name: `friend-invite-${token}`,
    deeplink: `oxbow://friend-invite/${token}?inviter=${inviterUserId}&name=${encodeURIComponent(inviterName)}`,
    ios_web_redirect: 'https://oxbowjournal.com',
    is_shortlink: true,
    domain: 'get.oxbowjournal.com',
  }),
});
const { link } = await response.json();
shareUrl = link; // e.g. https://get.oxbowjournal.com/?c=abc123
```

### 5. SDK initialization — `app/_layout.tsx`

```typescript
// Call once at app startup, before getAttributionData():
await linkrunner.init(
  process.env.EXPO_PUBLIC_LINKRUNNER_PROJECT_TOKEN,
  undefined, // secret key — optional, add if LinkRunner requires it
  undefined, // key ID — optional
  false,     // disable IDFA collection (we don't need ad attribution)
  __DEV__    // debug mode in development only
);
```

### 6. User lifecycle hooks

LinkRunner tracks install attribution. Wire these up:

```javascript
// After onboarding completes (Step 1 — name entered, users row created):
await linkrunner.signup({ userId: user.id, name: user.display_name, phone: user.phone });

// On each app session when user is logged in (in AuthContext or _layout.tsx):
await linkrunner.setUserData({ userId: user.id, name: user.display_name });
```

### 7. Files to delete

- `plugins/withBranch.js` — entire file, no longer needed

### 8. Environment variables to add

```
EXPO_PUBLIC_LINKRUNNER_PROJECT_TOKEN=...
EXPO_PUBLIC_LINKRUNNER_API_KEY=...
```

---

## Files Changed

| File | What changes |
|---|---|
| `app.config.js` | Remove Branch config; add `expo-linkrunner` plugin + `associatedDomains` for custom subdomain |
| `app/_layout.tsx` | Remove `BranchHandler` + `branch.subscribe()`; add `linkrunner.init()` + `getAttributionData()` on launch |
| `lib/supabase/friends.js` | Replace `buo.generateShortUrl()` with LinkRunner Campaign API call |
| `package.json` | Remove `react-native-branch`; add `rn-linkrunner` + `expo-linkrunner` |
| `plugins/withBranch.js` | **Delete** |

**Unchanged:**
- `app/friend-invite/[token].tsx` — invite acceptance screen, no changes
- `lib/supabase/friends.js` — `acceptInvite()`, `createFriendLink()`, all DB logic untouched
- `app/(tabs)/friends.tsx` — invite button UI, no changes
- All `friend_invites` / `friend_links` DB schema and RLS policies

---

## Existing Invite Flow (post-LinkRunner)

1. User A taps "Invite Friend"
2. `createInviteLink()` creates a `friend_invites` row in Supabase, returns token
3. LinkRunner Campaign API creates a short URL with the `oxbow://` deeplink embedded
4. Native share sheet opens with `https://get.oxbowjournal.com/?c=...`
5. User B taps link:
   - **App installed:** iOS Universal Link → `app/friend-invite/[token].tsx` → accept screen ✅
   - **App not installed:** App Store → install → `getAttributionData()` fires → accept screen ✅

---

## Open Questions

1. **Does `getAttributionData()` need to be called before or after `linkrunner.init()`?** — Almost certainly after. Confirm from docs or test.
2. **Custom subdomain Universal Links** — LinkRunner likely hosts an `apple-app-site-association` file at `get.oxbowjournal.com/.well-known/aasa` automatically. Confirm this before removing the existing `web/.well-known/apple-app-site-association` file or verify it still needs to be served.
3. **OG metadata / link preview** — Not documented in their public docs. Check dashboard after account setup for og:image / og:title fields on the campaign or subdomain level.
4. **`is_shortlink` response shape** — Confirm the response JSON key is `link` (per docs) in testing.
5. **`signup()` timing** — Should fire once, after the `users` row is created. The right place is in `completeProfileSetup()` in `AuthContext.tsx`. Don't call it on every login.

---

## Build History (Branch — context for why we switched)

### Build 1 — SDK only, numeric app ID as key
- **Result:** Built ✅ / Runtime ❌ — "branch user session has not been initialized"

### Build 2 — Correct SDK key + `@config-plugins/react-native-branch`
- **Result:** ❌ — `cannot find type 'RCTBridge' in scope` in `AppDelegate.swift`
- **Root cause:** Plugin inserts `override func sourceURL(for bridge: RCTBridge)` — incompatible with Expo SDK 54 / RN 0.81

### Builds 3–4 — Variations (newArchEnabled: false, plugin removed from array)
- **Result:** ❌ — same `RCTBridge` error persisted

### Build 5 — Custom `plugins/withBranch.js`
- **Config:** Uninstalled `@config-plugins/react-native-branch`; custom plugin injects `RNBranch.initSession` directly without `RCTBridge`
- **Result:** Pending at time of Branch plan abandonment
- **Note:** Custom plugin approach was valid; abandoned because Branch pricing ($500/mo) is not viable
