# Oxbow Design System - Implementation Guide

> **Source**: Oxbow-02162026 design assets exported February 16, 2026
> **Last Updated**: February 24, 2026

This document serves as the primary reference for implementing the new Oxbow design system. All specifications are based on the official Figma designs and design tokens.

## Quick Links

- [Design Tokens (Code)](/theme/designTokens.ts)
- [Full Component Specs](#component-library)
- [Implementation Priorities](#implementation-plan)

## Design Philosophy

Oxbow follows Apple Human Interface Guidelines with emphasis on:
- **Clarity**: Clean typography, generous whitespace
- **Deference**: Subtle backgrounds that defer to content
- **Depth**: Layered cards with shadows and rounded corners
- **Direct Manipulation**: Large tap targets, intuitive gestures

## Key Design Decisions

1. **Typography**: Satoshi Variable font throughout (must bundle with app)
2. **Color Story**: Calming blues (#0866E2) with warm accents (#F3A941, #BD7209)
3. **Visual Motif**: Flowing river illustration representing spiritual journey
4. **Navigation**: 3-tab bottom navigation (Journal, Mirror, Friends)
5. **Spacing**: 8pt base grid system
6. **Corners**: Generous border radius (8-12pt for cards/buttons)

## Component Library Overview

### Core Components (Build First)
1. **Button** - 7 variants (primaryFilled, accent, blue, outline, link, circle, chip)
2. **Tag** - Category labels with light background
3. **Avatar** - 3 sizes (48pt, 64pt, 88pt) with shadow and border
4. **Badge** - Notification count and NEW indicator
5. **Card** - Journal, Prompt, Mirror, Friend variants

### Complex Components (Build Second)
6. **Friend Card** - List item with avatar, name, meta, menu
7. **Journal Options** - Side-by-side Voice/Text cards
8. **Mirror Status** - Multi-state progress indicator
9. **Mirror Illustration** - SVG river with entry dots
10. **Verse Component** - Scripture block
11. **Footer Action** - Sticky bottom action bar

## Screen Inventory

1. **Landing** - Primary entry with Mirror status, journal options, daily prompt
2. **Mirrors Overview** - Most recent Mirror with reflection
3. **Mirror Detail** - Full Mirror with collapsible header and tabs
4. **Friends List** - Connected friends + recommendations
5. **Friend Detail** - Bottom sheet with shared Mirrors
6. **Past Journals** - List of journal entries
7. **Past Mirrors** - List of generated Mirrors

## Implementation Plan

### Phase 1: Foundation (Priority 1) ✅ Complete
**Goal**: Establish design system infrastructure

- [x] Bundle Satoshi Variable font files
- [x] Create design token constants (`/theme/designTokens.ts`)
- [x] Build core components (Button, Tag, Avatar, Badge)
- [x] Set up typography presets
- [x] Test font loading and rendering

**Why First**: Foundation must be solid before building features

---

### Phase 2: Navigation (Priority 2) ✅ Complete
**Goal**: Set up navigation structure

- [x] Configure bottom tab navigator (3 tabs)
- [x] Create navigation stacks (Journal, Mirror, Friends)
- [x] Implement custom tab bar styling
- [x] Set up safe area handling
- [x] Create screen shells with placeholder content

**Why Second**: Enables parallel feature development

---

### Phase 3: Core Components (Priority 3) ✅ Complete
**Goal**: Build reusable components

- [x] Card variants (Journal, Prompt, Mirror, Friend)
- [x] Friend Card component
- [x] Journal Options cards
- [x] Mirror Status component
- [x] Mirror Illustration asset integration

**Why Third**: Maximum component reuse across screens

---

### Phase 4: Landing Screen (Priority 4) ✅ Complete
**Goal**: Implement main entry point

- [x] All Mirror Status states (countdown, ready, generating)
- [x] Settings gear icon
- [x] River illustration with entry dots
- [x] Journal Options (Voice/Text)
- [x] Daily Prompt card
- [x] Navigation wiring

**Why Fourth**: Showcases design system, provides early demo

---

### Phase 5: Mirror Screens (Priority 5) ✅ Complete
**Goal**: Core value proposition

- [x] Mirrors Overview (with/without reflection variants)
- [x] Mirror Detail with collapsible header
- [x] Tab navigation (Mirror, Themes, Observations, Reflection)
- [x] Verse components
- [x] Footer Action bar
- [x] Scroll animations

**Why Fifth**: Primary app feature after foundation complete

---

### Phase 6: Friends Screens (Priority 6) ✅ Complete
**Goal**: Social features

- [x] Friends List with recommendations
- [x] Friend Detail bottom sheet
- [x] Message chip with badge
- [x] Mirror cards list
- [ ] Swipe gestures (deferred)

**Why Sixth**: Depends on Mirror screens

---

### Phase 7: Journal Creation (Priority 7) ✅ Complete
**Goal**: Content creation

- [x] Voice recording interface
- [x] Text input interface
- [x] Prompt-based journal
- [ ] Journal Detail view (deferred)

**Why Seventh**: Complex input flows after viewing experiences work

---

### Phase 8: Additional Features (Priority 8) — Partial
**Goal**: Supporting flows

- [ ] Past Journals List
- [ ] Past Mirrors List
- [x] Share Mirror modal (ShareMirrorSheet)
- [x] Add Reflection modal
- [ ] Invite Friend flow
- [ ] Messages thread

**Why Eighth**: Polish after core features complete

---

### Phase 9: Polish (Priority 9) — In Progress
**Goal**: Refinement

- [ ] Animations and transitions
- [ ] Empty states
- [ ] Error states
- [x] Sentry error monitoring (all critical workflows)
- [ ] Performance optimization
- [ ] Accessibility (VoiceOver, Dynamic Type)
- [ ] Testing

**Why Last**: Requires all features in place

---

### Additional: Auth, Settings & Onboarding (Applied February 2026)
**Goal**: Apply design system to remaining flows outside original scope

- [x] Settings & Feedback Modal (`SettingsFeedbackModal.tsx`)
- [x] Auth code entry screen (`CodeEntryScreen.tsx`)
- [x] Narrative onboarding flow (`NarrativeOnboardingScreen.tsx`)
- [x] Day 1 flow screens (voice journal, mirror generation states)
- [x] Deleted 5 legacy unused onboarding screens

## Design Token Reference

All design tokens are available in `/theme/designTokens.ts`. Import and use them consistently:

```typescript
import { colors, typography, spacing, borderRadius } from '@/theme/designTokens';

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.default,
    padding: spacing.xl,
  },
  title: {
    ...typography.heading.xl,
    color: colors.text.body,
  },
  card: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.card,
  },
});
```

## Font Installation

Satoshi Variable font files are located at:
```
/Users/caddell/Downloads/Oxbow-02162026/Typeface/Satoshi_Complete/
```

Required files:
- Satoshi-Variable.ttf (or .otf)
- Satoshi-VariableItalic.ttf (for italic text)

Configure in `app.json`:
```json
{
  "expo": {
    "plugins": [
      [
        "expo-font",
        {
          "fonts": [
            "./assets/fonts/Satoshi-Variable.ttf",
            "./assets/fonts/Satoshi-VariableItalic.ttf"
          ]
        }
      ]
    ]
  }
}
```

## Asset Locations

- **Icons**: `/Users/caddell/Downloads/Oxbow-02162026/Assets/Icon/`
- **Design Docs**: `/Users/caddell/Downloads/Oxbow-02162026/generated-oxbow-design-system_02162026/`
- **Typography**: `/Users/caddell/Downloads/Oxbow-02162026/Typeface/`

## Key Measurements

- Screen width: 402pt (iOS standard)
- Horizontal padding: 16pt
- Tab bar height: ~58pt + safe area
- Avatar sizes: 48pt, 64pt, 88pt
- Button min height: 44pt (Apple HIG touch target)
- Card corner radius: 8pt
- Button corner radius: 12pt

## Color Palette Quick Reference

| Purpose | Token | Hex |
|---------|-------|-----|
| Primary text | `colors.text.body` | #273047 |
| Links/Primary actions | `colors.text.primary` | #0866E2 |
| Active tab | `colors.text.accent` | #BD7209 |
| Screen background | `colors.background.default` | #F6F4F4 |
| Cards | `colors.background.card` | #FFFFFF |
| Primary button | `colors.background.primaryLight` | #A3C6F0 |
| Accent button | `colors.background.accent` | #F3A941 |

## Typography Quick Reference

| Use Case | Token | Size | Weight |
|----------|-------|------|--------|
| Page titles | `typography.heading.xl` | 36pt | 700 |
| Section headers | `typography.heading.l` | 21pt | 700 |
| Button labels | `typography.heading.s` | 15pt | 700 |
| Body text | `typography.body.default` | 17pt | 400 |
| Meta text | `typography.body.s` | 13pt | 500 |
| Mirror countdown | `typography.special.mirrorCount` | 48pt | 900 |

## Current Status

Phases 1–7 and the core Mirror/Friends screens are complete. The design system is applied across the main app, auth, settings, onboarding, and Day 1 flow.

**Remaining work:**
- Past Journals and Past Mirrors list screens
- Invite Friend flow
- Messages thread
- Swipe gestures (Friends)
- Journal Detail view
- Animations, empty states, accessibility, and testing (Phase 9)

## Reference Documents

Full detailed specs available in:
- [components.md](file:///Users/caddell/Downloads/Oxbow-02162026/generated-oxbow-design-system_02162026/components.md)
- [screens.md](file:///Users/caddell/Downloads/Oxbow-02162026/generated-oxbow-design-system_02162026/screens.md)
- [navigation.md](file:///Users/caddell/Downloads/Oxbow-02162026/generated-oxbow-design-system_02162026/navigation.md)
- [DESIGN-SYSTEM.md](file:///Users/caddell/Downloads/Oxbow-02162026/generated-oxbow-design-system_02162026/DESIGN-SYSTEM.md)

---

**Last updated**: February 24, 2026 by Claude Code
