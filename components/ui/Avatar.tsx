// components/ui/Avatar.tsx
// Avatar component with 3 sizes (small: 48pt, default: 64pt, large: 88pt)

import React from 'react';
import { View, Text, Image, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, typography, borderRadius, shadows } from '@/theme/designTokens';

export type AvatarSize = 'small' | 'default' | 'large';

export interface AvatarProps {
  size: AvatarSize;
  imageUri?: string;
  initials: string;
  backgroundColor?: string; // Optional custom background color for initials
}

export const Avatar: React.FC<AvatarProps> = ({
  size,
  imageUri,
  initials,
  backgroundColor = colors.background.primaryLight,
}) => {
  // Get dimensions based on size
  const getDimensions = () => {
    switch (size) {
      case 'small':
        return { width: 48, height: 48 };
      case 'large':
        return { width: 88, height: 88 };
      case 'default':
      default:
        return { width: 64, height: 64 };
    }
  };

  // Get initial font style based on size
  const getInitialStyle = (): TextStyle => {
    switch (size) {
      case 'small':
        return {
          ...typography.special.avatarInitialSmall,
          lineHeight: 22, // Increased from 18 for proper vertical centering
        };
      case 'default':
      case 'large':
      default:
        return {
          ...typography.special.avatarInitial,
          lineHeight: 29, // Increased from 24 for proper vertical centering
        };
    }
  };

  const dimensions = getDimensions();

  const containerStyle: ViewStyle = {
    width: dimensions.width,
    height: dimensions.height,
    borderRadius: borderRadius.avatar,
    borderWidth: 2,
    borderColor: colors.border.avatar,
    ...shadows.avatar,
    backgroundColor: imageUri ? 'transparent' : backgroundColor,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  };

  return (
    <View style={containerStyle}>
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={{
            width: dimensions.width,
            height: dimensions.height,
          }}
          resizeMode="cover"
        />
      ) : (
        <Text style={[getInitialStyle(), { color: colors.text.white }]}>
          {initials}
        </Text>
      )}
    </View>
  );
};
