// app/design-test.tsx
// Typography validation screen - compare with Figma to verify design tokens

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, typography, spacing } from '@/theme/designTokens';

export default function DesignTestScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.screenTitle}>Typography Test</Text>

        {/* Navigation Buttons */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: spacing.xl, flexWrap: 'wrap' }}>
          <TouchableOpacity
            onPress={() => router.push('/button-test')}
            style={styles.navButton}
          >
            <Text style={styles.navButtonText}>→ Buttons</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/components-test')}
            style={styles.navButton}
          >
            <Text style={styles.navButtonText}>→ Tag/Avatar/Badge</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/phase3-test')}
            style={styles.navButton}
          >
            <Text style={styles.navButtonText}>→ Cards/Complex</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.instruction}>
          Compare each sample with Figma to verify font, size, weight, and spacing
        </Text>

        {/* Heading Variants */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>HEADING.XL (36pt / 700)</Text>
          <Text style={[typography.heading.xl, { color: colors.text.body }]}>
            Page Title Sample
          </Text>
          <Text style={styles.metaInfo}>Used for: Page titles, user names</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>HEADING.L (21pt / 700)</Text>
          <Text style={[typography.heading.l, { color: colors.text.body }]}>
            Section Header Sample
          </Text>
          <Text style={styles.metaInfo}>Used for: Section headers, card titles</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>HEADING.DEFAULT (17pt / 700)</Text>
          <Text style={[typography.heading.default, { color: colors.text.body }]}>
            Start a New Journal
          </Text>
          <Text style={styles.metaInfo}>Used for: Bold body text, section labels</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>HEADING.S (15pt / 700 / +2 spacing)</Text>
          <Text style={[typography.heading.s, { color: colors.text.white, backgroundColor: colors.background.primaryLight, paddingVertical: 12, paddingHorizontal: 20, alignSelf: 'flex-start', borderRadius: 12 }]}>
            BUTTON TEXT
          </Text>
          <Text style={styles.metaInfo}>Used for: Button text, small bold labels</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>HEADING.XS (13pt / 500 / +2 spacing)</Text>
          <Text style={[typography.heading.xs, { color: colors.text.accent, backgroundColor: colors.background.tag, paddingVertical: 6, paddingHorizontal: 12, alignSelf: 'flex-start', borderRadius: 8 }]}>
            CATEGORY TAG
          </Text>
          <Text style={styles.metaInfo}>Used for: Uppercase tags, category labels</Text>
        </View>

        {/* Body Variants */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>BODY.DEFAULT (17pt / 400)</Text>
          <Text style={[typography.body.default, { color: colors.text.body }]}>
            This is primary body text for journal entries and descriptions. It should feel comfortable to read at length.
          </Text>
          <Text style={styles.metaInfo}>Used for: Body text, journal entries</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>BODY.S (13pt / 500)</Text>
          <Text style={[typography.body.s, { color: colors.text.bodyLight }]}>
            Meta text • Link buttons • Tab labels
          </Text>
          <Text style={styles.metaInfo}>Used for: Meta text, tab labels</Text>
        </View>

        {/* Special Variants */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SPECIAL.MIRROR_COUNT (48pt / 900)</Text>
          <Text style={[typography.special.mirrorCount, { color: colors.text.primary }]}>
            24
          </Text>
          <Text style={styles.metaInfo}>Used for: Mirror countdown number</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SPECIAL.JOURNAL_OPTION_TITLE (17pt / 700)</Text>
          <Text style={[typography.special.journalOptionTitle, { color: colors.text.body }]}>
            Voice
          </Text>
          <Text style={styles.metaInfo}>Used for: Journal option card titles</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SPECIAL.JOURNAL_OPTION_SUBTITLE (15pt / 400 italic)</Text>
          <Text style={[typography.special.journalOptionSubtitle, { color: colors.text.bodyLight }]}>
            Unfiltered Thinking
          </Text>
          <Text style={styles.metaInfo}>Used for: Journal option subtitles</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SPECIAL.PROMPT_BODY (18pt / 500)</Text>
          <Text style={[typography.special.promptBody, { color: colors.text.body }]}>
            What is God teaching you about trust right now?
          </Text>
          <Text style={styles.metaInfo}>Used for: Daily prompt questions</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SPECIAL.DATE_LABEL (19pt / 700)</Text>
          <Text style={[typography.special.dateLabel, { color: colors.text.body }]}>
            February 16, 2026
          </Text>
          <Text style={styles.metaInfo}>Used for: Date headers on mirror cards</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SPECIAL.AVATAR_INITIAL (24pt / 700)</Text>
          <View style={styles.avatarSample}>
            <Text style={[typography.special.avatarInitial, { color: colors.text.white }]}>
              GC
            </Text>
          </View>
          <Text style={styles.metaInfo}>Used for: Large avatar initials (64pt)</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SPECIAL.AVATAR_INITIAL_SMALL (18pt / 700)</Text>
          <View style={[styles.avatarSample, { width: 48, height: 48 }]}>
            <Text style={[typography.special.avatarInitialSmall, { color: colors.text.white }]}>
              GC
            </Text>
          </View>
          <Text style={styles.metaInfo}>Used for: Small avatar initials (48pt)</Text>
        </View>

        {/* Font Loading Verification */}
        <View style={[styles.section, { backgroundColor: colors.background.accent, padding: spacing.xl, borderRadius: 12 }]}>
          <Text style={[typography.heading.default, { color: colors.text.white }]}>
            ✓ Font Loading Check
          </Text>
          <Text style={[typography.body.s, { color: colors.text.white, marginTop: spacing.m }]}>
            If you see "Satoshi Variable" text that looks distinctly different from system fonts,
            the custom font is loaded correctly. If it looks like standard iOS San Francisco,
            the font failed to load.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.default,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: 60,
  },
  screenTitle: {
    ...typography.heading.xl,
    color: colors.text.body,
    marginBottom: spacing.m,
  },
  navButton: {
    backgroundColor: colors.text.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: spacing.xl,
    alignSelf: 'flex-start',
  },
  navButtonText: {
    ...typography.heading.s,
    color: colors.text.white,
  },
  instruction: {
    ...typography.body.s,
    color: colors.text.bodyLight,
    marginBottom: spacing.xxxl,
  },
  section: {
    marginBottom: spacing.xxxl,
  },
  sectionLabel: {
    ...typography.body.s,
    color: colors.text.secondary,
    marginBottom: spacing.m,
    fontFamily: 'System',
  },
  metaInfo: {
    ...typography.body.s,
    color: colors.text.bodyLight,
    marginTop: spacing.m,
    fontFamily: 'System',
  },
  avatarSample: {
    width: 64,
    height: 64,
    borderRadius: 60,
    backgroundColor: colors.background.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border.avatar,
  },
});
