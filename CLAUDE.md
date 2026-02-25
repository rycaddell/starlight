# Claude Code Instructions

## Project Overview

This is a TypeScript React Native mobile app. All components are TypeScript/TSX.

## UI Implementation

- Before writing any code from a design mockup or screenshot, describe the layout hierarchy you see: element positioning, spacing relationships, and nesting. Wait for confirmation before coding.
- Make ONE visual change at a time and confirm it looks correct before proceeding. Avoid changing multiple style properties simultaneously.
- If the first approach doesn't match the target design after 3 attempts, stop patching and either rebuild from scratch or ask for clarification.

## Debugging

- This is a React Native project. When debugging layout or rendering issues, check React Native's flexbox model (which differs from web CSS) and platform-specific behavior before trying generic CSS approaches.
- When stuck on a layout bug, explain what you think the root cause is before attempting a fix. If 3 attempts at the same approach fail, propose a fundamentally different strategy rather than continuing to patch.

## Button Conventions

- **Primary actions** (Next, Continue, Get Started, Sign Out): `colors.text.primary` (#0866E2) background, `colors.text.white` text, `borderRadius.button`
- **Completion actions** (Finish, Save Focus): `colors.background.accent` (#F3A941) background, `colors.text.black` text, height 66, `borderRadius.button`
- **Disabled / Processing state**: `colors.background.disabled` (#E1E4E7) background, `colors.text.bodyLight` (#505970) text
- **On dark overlay screens** (auth, onboarding): translucent white `rgba(255,255,255,0.15)` when disabled/inactive, `colors.text.primary` when active

## Known Technical Gotchas

- **expo-symbols inside Modals**: `SymbolView` (used by `IconSymbol.ios.tsx`) is a native UIKit view that does not render inside React Native `<Modal>` components due to the isolated UIWindow context. Use PNG assets from `assets/images/icons/` with `tintColor` (for Close, Back, etc.) or `MaterialIcons` from `@expo/vector-icons` as a Modal-safe alternative.
- **getMirrorById() return shape**: Returns both `result.mirror` (full DB record — has `created_at`, `focus_areas`, etc.) and `result.content` (parsed JSON content only — no timestamps). Always read dates from `result.mirror.created_at`, not from `result.content`.
- **Hero image overlap with bottom sheets**: `borderRadius.sheet = 30`. Set `marginTop: -30` on the bottom-half sheet container so the rounded corners overlap the hero image seamlessly. This is the established pattern across Step 1–3 and the Day 1 flow.
