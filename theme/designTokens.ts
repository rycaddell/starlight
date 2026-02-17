// theme/designTokens.ts
// Design tokens for Oxbow UI - extracted from Figma design system
// Source: Oxbow-02162026 design assets (February 16, 2026)
// All values use React Native units (dp/pt)

import { TextStyle } from 'react-native';

// ============================================================================
// COLORS
// ============================================================================

export const colors = {
  text: {
    body: '#273047',
    bodyLight: '#505970',
    primary: '#0866E2',
    accent: '#BD7209',
    white: '#FFFFFF',
    secondary: '#545454',
    black: '#000000',
  },
  background: {
    default: '#F6F4F4',
    defaultLight: '#ECEFF3',
    primaryLight: '#A3C6F0',
    primaryLighter: '#CADFF4',
    accent: '#F3A941',
    notification: '#F0CF83',
    disabled: '#E1E4E7',
    white: '#FFFFFF',
    card: '#FFFFFF',
    tag: '#F4EDDE',
    messageButton: '#EDF3FA',
    screen: '#F7F5F5',
  },
  border: {
    friendCard: '#B5B5B5',
    outline: '#0866E2',
    avatar: '#FFFFFF',
    divider: '#B5B5B5',
  },
} as const;

// ============================================================================
// TYPOGRAPHY
// ============================================================================

export const fontFamily = {
  primary: 'Satoshi Variable',
  fallback: 'System',
} as const;

// Typography presets - ready to spread into StyleSheet
export const typography = {
  heading: {
    xl: {
      fontFamily: fontFamily.primary,
      fontWeight: '700' as TextStyle['fontWeight'],
      fontSize: 36,
      lineHeight: 36,
      letterSpacing: 0,
      // Page titles (e.g., 'Friends', user name 'Gideon')
    },
    l: {
      fontFamily: fontFamily.primary,
      fontWeight: '700' as TextStyle['fontWeight'],
      fontSize: 21,
      lineHeight: 24,
      letterSpacing: 0,
      // Section headers, card titles, friend names
    },
    default: {
      fontFamily: fontFamily.primary,
      fontWeight: '700' as TextStyle['fontWeight'],
      fontSize: 17,
      lineHeight: 17,
      letterSpacing: 0,
      // Bold body text, section labels (e.g., 'Start a New Journal', 'Daily Prompt')
    },
    s: {
      fontFamily: fontFamily.primary,
      fontWeight: '700' as TextStyle['fontWeight'],
      fontSize: 15,
      lineHeight: 15,
      letterSpacing: 0.3, // 2% of 15pt
      // Button text, small bold labels
    },
    xs: {
      fontFamily: fontFamily.primary,
      fontWeight: '500' as TextStyle['fontWeight'],
      fontSize: 13,
      lineHeight: 13,
      letterSpacing: 0.26, // 2% of 13pt
      // Uppercase tags, small category labels
    },
  },
  body: {
    default: {
      fontFamily: fontFamily.primary,
      fontWeight: '400' as TextStyle['fontWeight'],
      fontSize: 17,
      lineHeight: 17,
      letterSpacing: 0,
      // Primary body text, journal entries, descriptions
    },
    s: {
      fontFamily: fontFamily.primary,
      fontWeight: '500' as TextStyle['fontWeight'],
      fontSize: 13,
      lineHeight: 13,
      letterSpacing: 0,
      // Meta text, link buttons, tab labels
    },
  },
  special: {
    mirrorCount: {
      fontFamily: fontFamily.primary,
      fontWeight: '900' as TextStyle['fontWeight'],
      fontSize: 48,
      lineHeight: 48,
      letterSpacing: 0.96,
      // Large countdown number on Mirror Status
    },
    journalOptionTitle: {
      fontFamily: fontFamily.primary,
      fontWeight: '700' as TextStyle['fontWeight'],
      fontSize: 17,
      lineHeight: 17,
      letterSpacing: 0.17,
      // Journal option card title (Voice / Text)
    },
    journalOptionSubtitle: {
      fontFamily: fontFamily.primary,
      fontWeight: '400' as TextStyle['fontWeight'],
      fontSize: 15,
      lineHeight: 15,
      letterSpacing: 0.15,
      fontStyle: 'italic' as TextStyle['fontStyle'],
      // Journal option subtitle (Unfiltered Thinking / Quick Capture)
    },
    promptBody: {
      fontFamily: fontFamily.primary,
      fontWeight: '500' as TextStyle['fontWeight'],
      fontSize: 18,
      lineHeight: 18,
      letterSpacing: 0,
      // Daily prompt question text
    },
    dateLabel: {
      fontFamily: fontFamily.primary,
      fontWeight: '700' as TextStyle['fontWeight'],
      fontSize: 19,
      lineHeight: 19,
      letterSpacing: 0,
      // Date headers on friend detail mirror cards
    },
    avatarInitial: {
      fontFamily: fontFamily.primary,
      fontWeight: '700' as TextStyle['fontWeight'],
      fontSize: 24,
      lineHeight: 24,
      letterSpacing: 0,
      // Large avatar initials (64pt avatar)
    },
    avatarInitialSmall: {
      fontFamily: fontFamily.primary,
      fontWeight: '700' as TextStyle['fontWeight'],
      fontSize: 18,
      lineHeight: 18,
      letterSpacing: 0,
      // Small avatar initials (48pt avatar)
    },
  },
} as const;

// ============================================================================
// SPACING
// ============================================================================

export const spacing = {
  xs: 2,
  s: 4,
  sm: 6,
  m: 8,
  ml: 10,
  l: 12,
  xl: 16,
  xxl: 20,
  xxxl: 24,
  xxxxl: 30,
  screen: {
    horizontalPadding: 16,
    topInset: 64,
  },
} as const;

// ============================================================================
// BORDER RADIUS
// ============================================================================

export const borderRadius = {
  s: 7,
  m: 8,
  l: 10,
  xl: 12,
  xxl: 16,
  pill: 50,
  circle: 60,
  sheet: 30,
  card: 8,
  button: 12,
  tag: 8,
  avatar: 60,
  journalOption: 12,
  mirrorViewButton: 102,
  tabHighlight: 3,
} as const;

// ============================================================================
// SHADOWS
// ============================================================================

export const shadows = {
  avatar: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4, // Android elevation
  },
} as const;

// ============================================================================
// ICON SIZES
// ============================================================================

export const iconSize = {
  s: 17,
  m: 20,
  l: 25,
  xl: 28,
  xxl: 32,
  xxxl: 36,
  tabBar: 25,
} as const;

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/*
import { colors, typography, spacing, borderRadius, shadows } from '@/theme/designTokens';

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
    ...shadows.avatar,
  },
  button: {
    backgroundColor: colors.background.primaryLight,
    borderRadius: borderRadius.button,
    paddingVertical: spacing.l,
    paddingHorizontal: spacing.xl,
  },
  buttonText: {
    ...typography.heading.s,
    color: colors.text.white,
    textTransform: 'uppercase',
  },
});
*/
