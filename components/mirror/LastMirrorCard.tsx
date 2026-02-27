// components/mirror/LastMirrorCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
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
    <TouchableOpacity
      style={styles.card}
      onPress={onViewMirror}
      activeOpacity={0.9}
    >
      {/* River illustration — absolute, fills left 42% of card */}
      <Image
        source={require('@/assets/images/river-illustration.png')}
        style={styles.riverImage}
        resizeMode="cover"
      />

      {/* Journal dots — absolutely positioned over the river */}
      <View style={[styles.dot, { top: 29, left: 112 }]} />
      <View style={[styles.dot, { top: 70, left: 99 }]} />
      <View style={[styles.dot, { top: 125, left: 115 }]} />
      <View style={[styles.dot, { top: 104, left: 34 }]} />
      <View style={[styles.dot, { top: 194, left: 26 }]} />
      <View style={[styles.dot, { top: 298, left: 55 }]} />
      <View style={[styles.dot, { top: 228, left: 115 }]} />
      <View style={[styles.dot, { top: 322, left: 8 }]} />
      <View style={[styles.dot, { top: 366, left: 95 }]} />
      <View style={[styles.dot, { top: 395, left: 19 }]} />

      {/* Content panel — right of the river path */}
      <View style={styles.contentPanel}>
        {/* Name + date as a tight group */}
        <View style={styles.nameGroup}>
          <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
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
    height: 423,
  },
  riverImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '42%',
    height: '100%',
  },
  contentPanel: {
    marginLeft: '42%',
    paddingLeft: 0,
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
    lineHeight: 15,
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
  dot: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#A3C6F0',
  },
});
