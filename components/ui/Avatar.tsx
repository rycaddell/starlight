// components/ui/Avatar.tsx
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { IconSymbol } from './IconSymbol';

interface AvatarProps {
  profilePictureUrl?: string | null;
  displayName?: string;
  size?: number;
}

export const Avatar: React.FC<AvatarProps> = ({
  profilePictureUrl,
  displayName,
  size = 40,
}) => {
  const getInitial = () => {
    if (!displayName) return '?';
    return displayName.charAt(0).toUpperCase();
  };

  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  const fontSize = size * 0.45; // Scale font size with avatar size

  if (profilePictureUrl) {
    return (
      <Image
        source={{ uri: profilePictureUrl }}
        style={[styles.image, containerStyle]}
      />
    );
  }

  return (
    <View style={[styles.placeholder, containerStyle]}>
      <Text style={[styles.initial, { fontSize }]}>
        {getInitial()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  image: {
    backgroundColor: '#e5e7eb',
  },
  placeholder: {
    backgroundColor: '#6366f1', // Purple color
    justifyContent: 'center',
    alignItems: 'center',
  },
  initial: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
