// components/ui/Avatar.tsx
// Avatar component with 3 sizes (small: 48pt, default: 64pt, large: 88pt)

import React from 'react';
import { View, Image, Text, StyleSheet, ViewStyle } from 'react-native';
import { borderRadius, fontFamily } from '@/theme/designTokens';

export type AvatarSize = 'small' | 'default' | 'large';

export interface AvatarProps {
  size: AvatarSize;
  imageUri?: string;
  initials: string;
  backgroundColor?: string; // kept for API compatibility
}

export const Avatar: React.FC<AvatarProps> = ({ size, imageUri, initials }) => {
  const getDimensions = () => {
    switch (size) {
      case 'small':  return { width: 48, height: 48 };
      case 'large':  return { width: 88, height: 88 };
      default:       return { width: 64, height: 64 };
    }
  };

  const { width, height } = getDimensions();
  const br = borderRadius.avatar; // 60

  // Outer view: shadow only — no overflow:hidden so shadow renders outside bounds
  const shadowStyle: ViewStyle = {
    width,
    height,
    borderRadius: br,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  };

  // Inner view: white border + solid background + clip to circle.
  // Using backgroundColor instead of a PNG avoids antialiasing gaps at the border edge.
  const innerStyle: ViewStyle = {
    width,
    height,
    borderRadius: br,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    backgroundColor: '#F6F4F4',
    justifyContent: 'center',
    alignItems: 'center',
  };

  return (
    <View style={shadowStyle}>
      <View style={innerStyle}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={[StyleSheet.absoluteFillObject, { width, height }]}
            resizeMode="cover"
          />
        ) : (
          <Text style={styles.initial}>{initials.charAt(0).toUpperCase()}</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  initial: {
    fontFamily: fontFamily.primary,
    fontSize: 24,
    fontWeight: '700',
    color: '#273047',
    textAlign: 'center',
    lineHeight: 24, // matches fontSize — minimises implicit font padding so flex centering is accurate
    marginTop: 3,   // compensates for Satoshi Variable cap height sitting above em-square centre
  },
});
