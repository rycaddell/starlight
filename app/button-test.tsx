// app/button-test.tsx
// Button validation screen - compare all 7 variants with Figma

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { colors, typography, spacing } from '@/theme/designTokens';

export default function ButtonTestScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.screenTitle}>Button Component Test</Text>
        <Text style={styles.instruction}>
          Compare each button variant with Figma designs
        </Text>

        {/* Primary Filled */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PRIMARY FILLED (Blue Light)</Text>
          <Text style={styles.specs}>
            • bg.primaryLight (#A3C6F0){'\n'}
            • text.body (#273047){'\n'}
            • 15pt Bold, ls: 0.3, uppercase{'\n'}
            • 10pt vertical, 30pt horizontal padding{'\n'}
            • 12pt border radius, 40pt height
          </Text>
          <Button
            variant="primaryFilled"
            label="Start from Prompt"
            onPress={() => console.log('Primary Filled pressed')}
          />
        </View>

        {/* Accent */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ACCENT (Orange/Gold)</Text>
          <Text style={styles.specs}>
            • bg.accent (#F3A941){'\n'}
            • Same as Primary Filled otherwise
          </Text>
          <Button
            variant="accent"
            label="Add Reflection"
            onPress={() => console.log('Accent pressed')}
          />
        </View>

        {/* Blue */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>BLUE (Solid Blue)</Text>
          <Text style={styles.specs}>
            • text.primary (#0866E2) background{'\n'}
            • text.white (#FFFFFF){'\n'}
            • Same structure as Primary Filled
          </Text>
          <Button
            variant="blue"
            label="Generate Mirror"
            onPress={() => console.log('Blue pressed')}
          />
        </View>

        {/* Outline */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>OUTLINE / SECONDARY</Text>
          <Text style={styles.specs}>
            • bg.white (#FFFFFF){'\n'}
            • 1pt border, text.primary (#0866E2){'\n'}
            • Auto width, centered
          </Text>
          <Button
            variant="outline"
            label="View past Mirrors"
            onPress={() => console.log('Outline pressed')}
          />
        </View>

        {/* Link */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>LINK BUTTON</Text>
          <Text style={styles.specs}>
            • Transparent background{'\n'}
            • text.primary (#0866E2){'\n'}
            • Medium 13pt{'\n'}
            • Icon trailing, 6pt gap
          </Text>
          <Button
            variant="link"
            label="New Prompt"
            icon={<Text style={{ fontSize: 20 }}>🔄</Text>}
            onPress={() => console.log('Link pressed')}
          />
        </View>

        {/* Circle */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>CIRCLE (View Mirror)</Text>
          <Text style={styles.specs}>
            • 86pt x 86pt{'\n'}
            • text.primary (#0866E2) background{'\n'}
            • text.white (#FFFFFF){'\n'}
            • 102pt border radius (circle){'\n'}
            • Text wraps to 2 lines
          </Text>
          <View style={{ alignItems: 'center', marginTop: 16 }}>
            <Button
              variant="circle"
              label="View Mirror"
              onPress={() => console.log('Circle pressed')}
            />
          </View>
        </View>

        {/* Chip */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>CHIP (Message Button)</Text>
          <Text style={styles.specs}>
            • bg.messageButton (#EDF3FA){'\n'}
            • text.black (#000000){'\n'}
            • Medium 15pt{'\n'}
            • 4pt vertical, 14pt horizontal{'\n'}
            • Optional badge indicator
          </Text>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
            <Button
              variant="chip"
              label="Messages"
              onPress={() => console.log('Chip pressed')}
            />
            <Button
              variant="chip"
              label="Messages"
              badge={3}
              onPress={() => console.log('Chip with badge pressed')}
            />
          </View>
        </View>

        {/* Disabled States */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>DISABLED STATES</Text>
          <Text style={styles.specs}>
            • bg.disabled (#E1E4E7) for filled variants{'\n'}
            • text.bodyLight for text color
          </Text>
          <View style={{ gap: 12, marginTop: 16 }}>
            <Button
              variant="primaryFilled"
              label="Disabled Primary"
              onPress={() => {}}
              disabled
            />
            <Button
              variant="blue"
              label="Disabled Blue"
              onPress={() => {}}
              disabled
            />
            <Button
              variant="outline"
              label="Disabled Outline"
              onPress={() => {}}
              disabled
            />
          </View>
        </View>

        {/* Comparison Note */}
        <View style={[styles.section, { backgroundColor: colors.background.accent, padding: spacing.xl, borderRadius: 12 }]}>
          <Text style={[typography.heading.default, { color: colors.text.body }]}>
            ✓ Validation Checklist
          </Text>
          <Text style={[typography.body.s, { color: colors.text.body, marginTop: spacing.m }]}>
            {'\u2022'} Background colors match Figma{'\n'}
            {'\u2022'} Text colors are correct{'\n'}
            {'\u2022'} Font sizes and weights look right{'\n'}
            {'\u2022'} Padding and spacing feel accurate{'\n'}
            {'\u2022'} Border radius matches design{'\n'}
            {'\u2022'} Text transforms to uppercase correctly{'\n'}
            {'\u2022'} Letter spacing is subtle (0.3){'\n'}
            {'\u2022'} Circle button text wraps properly{'\n'}
            {'\u2022'} Badge appears on chip variant
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
    marginBottom: spacing.xl,
    fontFamily: 'System',
    lineHeight: 18,
  },
});
