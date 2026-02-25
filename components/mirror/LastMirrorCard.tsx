// components/mirror/LastMirrorCard.tsx
import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';
import { colors, typography, spacing, borderRadius } from '@/theme/designTokens';

interface LastMirrorCardProps {
  mirrorId: string;
  mirrorDate: Date;
  biblicalCharacter?: string;
  reflectionFocus?: string;
  onViewMirror: () => void;
  onSharePress?: () => void;
  isCheckingFriends?: boolean;
  hideShareButton?: boolean;
  hideYourFocus?: boolean;
}

export const LastMirrorCard: React.FC<LastMirrorCardProps> = ({
  mirrorDate,
  biblicalCharacter,
  reflectionFocus,
  onViewMirror,
  hideYourFocus = false,
}) => {
  const formattedDate = mirrorDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <TouchableOpacity style={styles.card} onPress={onViewMirror} activeOpacity={0.9}>
      {/* River illustration — absolute, fills full card */}
      <Image
        source={require('@/assets/images/river-illustration.png')}
        style={styles.illustration}
        resizeMode="stretch"
      />

      {/* Content panel — right of the river path */}
      <View style={styles.contentPanel}>
        {/* Name + date as a tight group */}
        <View style={styles.nameGroup}>
          <Text style={styles.name} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.6}>
            {biblicalCharacter || 'Mirror'}
          </Text>
          <Text style={styles.date}>{formattedDate}</Text>
        </View>

        {/* State: with focus */}
        {!hideYourFocus && reflectionFocus ? (
          <View style={styles.focusSection}>
            <Tag label="My Focus" variant="default" />
            <Text style={styles.focusText} numberOfLines={4}>
              {reflectionFocus}
            </Text>
          </View>
        ) : (
          /* State: without focus — tapping outside this button also opens mirror */
          !hideYourFocus && (
            <View style={styles.addReflectionWrapper}>
              <Button
                variant="accent"
                label="Add Reflection"
                onPress={onViewMirror}
              />
            </View>
          )
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.s,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.divider,
    minHeight: 308,
  },
  illustration: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: '100%',
  },
  contentPanel: {
    marginLeft: '42%',
    padding: spacing.l,
    paddingTop: 17,
    paddingRight: spacing.xxl,
    paddingBottom: spacing.xxl,
    gap: spacing.m,
  },
  nameGroup: {
    gap: 2,
  },
  name: {
    ...typography.heading.xl,
    color: colors.text.body,
  },
  date: {
    fontFamily: typography.body.default.fontFamily,
    fontSize: 15,
    fontWeight: '400',
    color: colors.text.bodyLight,
    lineHeight: 20,
  },
  focusSection: {
    marginTop: spacing.m,
    gap: spacing.m,
  },
  focusText: {
    fontFamily: typography.body.default.fontFamily,
    fontSize: 15,
    fontWeight: '400',
    color: colors.text.body,
    lineHeight: 22,
  },
  addReflectionWrapper: {
    marginTop: spacing.m,
  },
});
