# Oxbow Design System - Implementation Guide

> **Source**: Oxbow-02162026 design assets exported February 16, 2026
> **Last Updated**: February 16, 2026

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

### Phase 1: Foundation (Priority 1)
**Goal**: Establish design system infrastructure

- [ ] Bundle Satoshi Variable font files
- [ ] Create design token constants (`/theme/designTokens.ts`)
- [ ] Build core components (Button, Tag, Avatar, Badge)
- [ ] Set up typography presets
- [ ] Test font loading and rendering

**Why First**: Foundation must be solid before building features

---

### Phase 2: Navigation (Priority 2)
**Goal**: Set up navigation structure

- [ ] Configure bottom tab navigator (3 tabs)
- [ ] Create navigation stacks (Journal, Mirror, Friends)
- [ ] Implement custom tab bar styling
- [ ] Set up safe area handling
- [ ] Create screen shells with placeholder content

**Why Second**: Enables parallel feature development

---

### Phase 3: Core Components (Priority 3)
**Goal**: Build reusable components

- [ ] Card variants (Journal, Prompt, Mirror, Friend)
- [ ] Friend Card component
- [ ] Journal Options cards
- [ ] Mirror Status component
- [ ] Mirror Illustration asset integration

**Why Third**: Maximum component reuse across screens

---

### Phase 4: Landing Screen (Priority 4)
**Goal**: Implement main entry point

- [ ] All Mirror Status states (countdown, ready, generating)
- [ ] Settings gear icon
- [ ] River illustration with entry dots
- [ ] Journal Options (Voice/Text)
- [ ] Daily Prompt card
- [ ] Navigation wiring

**Why Fourth**: Showcases design system, provides early demo

---

### Phase 5: Mirror Screens (Priority 5)
**Goal**: Core value proposition

- [ ] Mirrors Overview (with/without reflection variants)
- [ ] Mirror Detail with collapsible header
- [ ] Tab navigation (Mirror, Themes, Observations, Reflection)
- [ ] Verse components
- [ ] Footer Action bar
- [ ] Scroll animations

**Why Fifth**: Primary app feature after foundation complete

---

### Phase 6: Friends Screens (Priority 6)
**Goal**: Social features

- [ ] Friends List with recommendations
- [ ] Friend Detail bottom sheet
- [ ] Message chip with badge
- [ ] Mirror cards list
- [ ] Swipe gestures

**Why Sixth**: Depends on Mirror screens

---

### Phase 7: Journal Creation (Priority 7)
**Goal**: Content creation

- [ ] Voice recording interface
- [ ] Text input interface
- [ ] Prompt-based journal
- [ ] Journal Detail view

**Why Seventh**: Complex input flows after viewing experiences work

---

### Phase 8: Additional Features (Priority 8)
**Goal**: Supporting flows

- [ ] Past Journals List
- [ ] Past Mirrors List
- [ ] Generate Mirror modal
- [ ] Add Reflection modal
- [ ] Invite Friend flow
- [ ] Messages thread

**Why Eighth**: Polish after core features complete

---

### Phase 9: Polish (Priority 9)
**Goal**: Refinement

- [ ] Animations and transitions
- [ ] Empty states
- [ ] Error states
- [ ] Performance optimization
- [ ] Accessibility (VoiceOver, Dynamic Type)
- [ ] Testing

**Why Last**: Requires all features in place

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

## Next Steps

1. ✅ Read this implementation guide
2. ⏳ Set up design tokens in codebase
3. ⏳ Install Satoshi font
4. ⏳ Begin Phase 1: Foundation work
5. ⏳ Follow implementation priorities in order

## Reference Documents

Full detailed specs available in:
- [components.md](file:///Users/caddell/Downloads/Oxbow-02162026/generated-oxbow-design-system_02162026/components.md)
- [screens.md](file:///Users/caddell/Downloads/Oxbow-02162026/generated-oxbow-design-system_02162026/screens.md)
- [navigation.md](file:///Users/caddell/Downloads/Oxbow-02162026/generated-oxbow-design-system_02162026/navigation.md)
- [DESIGN-SYSTEM.md](file:///Users/caddell/Downloads/Oxbow-02162026/generated-oxbow-design-system_02162026/DESIGN-SYSTEM.md)

---

**Last updated**: February 16, 2026 by Claude Code
