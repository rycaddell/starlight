// app/components-test.tsx
// Core components validation screen (Tag, Avatar, Badge)

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Tag } from '@/components/ui/Tag';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { colors, typography, spacing } from '@/theme/designTokens';

export default function ComponentsTestScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.screenTitle}>Core Components Test</Text>
        <Text style={styles.instruction}>
          Validate Tag, Avatar, and Badge components against Figma
        </Text>

        {/* Tag Component */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>TAG COMPONENT</Text>
          <Text style={styles.specs}>
            • bg.tag (#F4EDDE){'\n'}
            • text.bodyLight (#505970){'\n'}
            • Medium 14pt, ls: 0.56{'\n'}
            • 4pt vertical, 10pt horizontal padding{'\n'}
            • 8pt border radius
          </Text>
          <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
            <Tag label="Mirror" />
            <Tag label="Themes" />
            <Tag label="Observations" />
            <Tag label="Reflection" />
            <Tag label="My Focus" />
          </View>
        </View>

        {/* Avatar Component */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>AVATAR COMPONENT</Text>
          <Text style={styles.specs}>
            • Small: 48pt x 48pt (18pt initials){'\n'}
            • Default: 64pt x 64pt (24pt initials){'\n'}
            • Large: 88pt x 88pt (24pt initials){'\n'}
            • 2pt white border{'\n'}
            • Shadow: 0px 1px 8px rgba(0,0,0,0.25){'\n'}
            • 60pt border radius (circle)
          </Text>
          
          <View style={{ marginTop: 16 }}>
            <Text style={[typography.body.s, { color: colors.text.secondary, marginBottom: 12 }]}>
              Small (48pt)
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <Avatar size="small" initials="GC" />
              <Avatar size="small" initials="JD" backgroundColor="#BD7209" />
              <Avatar size="small" initials="SK" backgroundColor="#0866E2" />
            </View>
          </View>

          <View style={{ marginTop: 24 }}>
            <Text style={[typography.body.s, { color: colors.text.secondary, marginBottom: 12 }]}>
              Default (64pt)
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <Avatar size="default" initials="GC" />
              <Avatar size="default" initials="JD" backgroundColor="#BD7209" />
              <Avatar size="default" initials="SK" backgroundColor="#0866E2" />
            </View>
          </View>

          <View style={{ marginTop: 24 }}>
            <Text style={[typography.body.s, { color: colors.text.secondary, marginBottom: 12 }]}>
              Large (88pt)
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <Avatar size="large" initials="GC" />
              <Avatar size="large" initials="JD" backgroundColor="#BD7209" />
            </View>
          </View>
        </View>

        {/* Badge Component */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>BADGE COMPONENT</Text>
          <Text style={styles.specs}>
            • bg.notification (#F0CF83){'\n'}
            • 50pt border radius (pill){'\n'}
            • Medium 13pt, centered
          </Text>

          <View style={{ marginTop: 16 }}>
            <Text style={[typography.body.s, { color: colors.text.secondary, marginBottom: 12 }]}>
              Notification Badge
            </Text>
            <Text style={[typography.body.s, { color: colors.text.bodyLight, marginBottom: 12 }]}>
              Min width 28pt, 4pt vertical padding
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <Badge variant="notification" count={1} />
              <Badge variant="notification" count={3} />
              <Badge variant="notification" count={12} />
              <Badge variant="notification" count={99} />
            </View>
          </View>

          <View style={{ marginTop: 24 }}>
            <Text style={[typography.body.s, { color: colors.text.secondary, marginBottom: 12 }]}>
              NEW Badge
            </Text>
            <Text style={[typography.body.s, { color: colors.text.bodyLight, marginBottom: 12 }]}>
              4pt vertical, 10pt horizontal padding, text.body color
            </Text>
            <View style={{ alignItems: 'flex-start' }}>
              <Badge variant="new" />
            </View>
          </View>
        </View>

        {/* Validation Checklist */}
        <View style={[styles.section, { backgroundColor: colors.background.primaryLight, padding: spacing.xl, borderRadius: 12 }]}>
          <Text style={[typography.heading.default, { color: colors.text.body }]}>
            ✓ Validation Checklist
          </Text>
          <Text style={[typography.body.s, { color: colors.text.body, marginTop: spacing.m, lineHeight: 20 }]}>
            {'\u2022'} Tag background is light beige (#F4EDDE){'\n'}
            {'\u2022'} Tag text is uppercase by default{'\n'}
            {'\u2022'} Avatar circles are perfectly round{'\n'}
            {'\u2022'} Avatar borders are white (2pt){'\n'}
            {'\u2022'} Avatar shadows are visible{'\n'}
            {'\u2022'} Avatar initials are centered{'\n'}
            {'\u2022'} Avatar sizes match spec (48, 64, 88pt){'\n'}
            {'\u2022'} Notification badges are yellow (#F0CF83){'\n'}
            {'\u2022'} NEW badge shows correct text color{'\n'}
            {'\u2022'} All borders and padding match design
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
  specs: {
    ...typography.body.s,
    color: colors.text.bodyLight,
    fontFamily: 'System',
    lineHeight: 18,
  },
});
