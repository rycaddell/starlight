// app/phase3-test.tsx
// Phase 3 components validation screen

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { FriendCard } from '@/components/ui/FriendCard';
import { JournalOption } from '@/components/ui/JournalOption';
import { MirrorStatus } from '@/components/ui/MirrorStatus';
import { colors, typography, spacing } from '@/theme/designTokens';

export default function Phase3TestScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.screenTitle}>Phase 3 Components</Text>
        <Text style={styles.instruction}>
          Complex components: Cards, Friend Card, Journal Options, Mirror Status
        </Text>

        {/* Card Component - Journal Variant */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>CARD - JOURNAL VARIANT</Text>
          <Text style={styles.specs}>
            • bg.card (white){'\n'}
            • 8pt padding, 8pt border radius{'\n'}
            • Location + Day title row{'\n'}
            • Duration row with mic icon{'\n'}
            • Body text (2 lines max)
          </Text>
          <Card
            variant="journal"
            location="Milford Street"
            day="Tuesday"
            duration="2:43"
            hasAudio
            bodyText="Today somehow felt easier than I expected. When I met and talked with Sarah about the project, I felt a sense of peace about where things are heading."
            onPress={() => console.log('Journal card pressed')}
          />
        </View>

        {/* Card Component - Prompt Variant */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>CARD - PROMPT VARIANT</Text>
          <Text style={styles.specs}>
            • bg.card (white){'\n'}
            • 16pt vertical, 12pt horizontal padding{'\n'}
            • 10pt border radius{'\n'}
            • Prompt text: Medium 18pt{'\n'}
            • 24pt gap before button
          </Text>
          <Card
            variant="prompt"
            promptText="Where do you feel peace - or resistance - about the direction your life is heading?"
            onPress={() => console.log('Prompt card pressed')}
          />
        </View>

        {/* Card Component - Mirror Variant */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>CARD - MIRROR VARIANT (Friend Detail)</Text>
          <Text style={styles.specs}>
            • bg.card (white){'\n'}
            • 16pt vertical, 12pt horizontal padding{'\n'}
            • 18pt border radius{'\n'}
            • Row layout with circle button
          </Text>
          <Card
            variant="mirror"
            date="January 7, 2026"
            isNew
            title="David in the wilderness"
            onViewPress={() => console.log('View Mirror pressed')}
          />
        </View>

        {/* Friend Card */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>FRIEND CARD</Text>
          <Text style={styles.specs}>
            • bg.white{'\n'}
            • 12pt padding{'\n'}
            • 1pt border bottom{'\n'}
            • Avatar (64pt) + Name + Meta{'\n'}
            • Menu icon (⋯)
          </Text>
          <View style={{ backgroundColor: colors.background.white }}>
            <FriendCard
              name="John"
              initials="JD"
              mirrorCount={1}
              messageCount={3}
              onPress={() => console.log('Friend card pressed')}
              onMenuPress={() => console.log('Menu pressed')}
            />
            <FriendCard
              name="Sarah"
              initials="SK"
              avatarColor={colors.background.accent}
              mirrorCount={5}
              messageCount={0}
              onPress={() => console.log('Friend card pressed')}
              onMenuPress={() => console.log('Menu pressed')}
            />
          </View>
        </View>

        {/* Journal Options */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>JOURNAL OPTIONS</Text>
          <Text style={styles.specs}>
            • bg: text.primary (#0866E2){'\n'}
            • 10pt padding, 12pt border radius{'\n'}
            • 180pt width each{'\n'}
            • Icon (28pt) + Title + Subtitle{'\n'}
            • White text
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.m }}>
            <JournalOption
              mode="voice"
              onPress={() => console.log('Voice journal pressed')}
            />
            <JournalOption
              mode="text"
              onPress={() => console.log('Text journal pressed')}
            />
          </View>
        </View>

        {/* Mirror Status - Countdown */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>MIRROR STATUS - COUNTDOWN</Text>
          <Text style={styles.specs}>
            • Column, center aligned{'\n'}
            • Title: Heading L{'\n'}
            • Count: 48pt Black{'\n'}
            • Subtitle: Heading S
          </Text>
          <MirrorStatus
            state="countdown"
            journalsNeeded={10}
          />
        </View>

        {/* Mirror Status - Ready */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>MIRROR STATUS - READY</Text>
          <Text style={styles.specs}>
            • Title: Heading L{'\n'}
            • Blue button with sparkle{'\n'}
            • Subtitle: Text S
          </Text>
          <MirrorStatus
            state="ready"
            journalsReady={10}
            onGenerate={() => console.log('Generate Mirror pressed')}
          />
        </View>

        {/* Mirror Status - Generating */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>MIRROR STATUS - GENERATING</Text>
          <MirrorStatus state="generating" />
        </View>

        {/* Validation Checklist */}
        <View style={[styles.section, { backgroundColor: colors.background.accent, padding: spacing.xl, borderRadius: 12 }]}>
          <Text style={[typography.heading.default, { color: colors.text.body }]}>
            ✓ Validation Checklist
          </Text>
          <Text style={[typography.body.s, { color: colors.text.body, marginTop: spacing.m, lineHeight: 20 }]}>
            {'\u2022'} Journal card shows location, day, duration, body{'\n'}
            {'\u2022'} Prompt card has proper spacing and button{'\n'}
            {'\u2022'} Mirror card has NEW badge and circle button{'\n'}
            {'\u2022'} Friend card shows avatar, name, meta, menu{'\n'}
            {'\u2022'} Journal options have blue background{'\n'}
            {'\u2022'} Mirror status countdown shows large number{'\n'}
            {'\u2022'} Mirror status ready has blue button{'\n'}
            {'\u2022'} All padding and spacing match design
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
    marginBottom: spacing.xl,
  },
});
