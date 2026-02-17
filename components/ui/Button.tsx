// components/ui/Button.tsx
// Button component with 7 variants matching Oxbow design system

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, View } from 'react-native';
import { colors, typography, borderRadius } from '@/theme/designTokens';

export type ButtonVariant = 'primaryFilled' | 'accent' | 'blue' | 'outline' | 'link' | 'circle' | 'chip';

export interface ButtonProps {
  variant: ButtonVariant;
  label: string;
  onPress: () => void;
  icon?: React.ReactNode;    // Trailing icon for link variant
  badge?: number;            // For chip variant (notification count)
  fullWidth?: boolean;       // Force full width (default: true for filled/accent/blue, false for others)
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant,
  label,
  onPress,
  icon,
  badge,
  fullWidth,
  disabled = false,
}) => {
  // Determine if button should be full width
  const shouldBeFullWidth = fullWidth !== undefined
    ? fullWidth
    : (variant === 'primaryFilled' || variant === 'accent' || variant === 'blue');

  // Build container style based on variant
  const getContainerStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44, // Apple HIG minimum touch target
    };

    switch (variant) {
      case 'primaryFilled':
        return {
          ...baseStyle,
          backgroundColor: disabled ? colors.background.disabled : colors.background.primaryLight,
          paddingVertical: 12,
          paddingHorizontal: 30,
          borderRadius: borderRadius.button,
          width: shouldBeFullWidth ? '100%' : 'auto',
        };

      case 'accent':
        return {
          ...baseStyle,
          backgroundColor: disabled ? colors.background.disabled : colors.background.accent,
          paddingVertical: 12,
          paddingHorizontal: 30,
          borderRadius: borderRadius.button,
          width: shouldBeFullWidth ? '100%' : 'auto',
        };

      case 'blue':
        return {
          ...baseStyle,
          backgroundColor: disabled ? colors.background.disabled : colors.text.primary,
          paddingVertical: 12,
          paddingHorizontal: 30,
          borderRadius: borderRadius.button,
          width: shouldBeFullWidth ? '100%' : 'auto',
        };

      case 'outline':
        return {
          ...baseStyle,
          backgroundColor: colors.background.white,
          borderWidth: 1,
          borderColor: disabled ? colors.border.divider : colors.border.outline,
          paddingVertical: 10,
          paddingHorizontal: 30,
          borderRadius: borderRadius.button,
          alignSelf: 'center',
        };

      case 'link':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 2,
          paddingLeft: 8,
          paddingRight: 4,
          borderRadius: borderRadius.pill,
          minHeight: 0, // Links don't need minimum touch target
        };

      case 'circle':
        return {
          ...baseStyle,
          backgroundColor: disabled ? colors.background.disabled : colors.text.primary,
          width: 86,
          height: 86,
          borderRadius: borderRadius.mirrorViewButton,
        };

      case 'chip':
        return {
          ...baseStyle,
          backgroundColor: disabled ? colors.background.disabled : colors.background.messageButton,
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 4,
          paddingHorizontal: 14,
          borderRadius: borderRadius.tag,
          gap: 8,
        };

      default:
        return baseStyle;
    }
  };

  // Build text style based on variant
  const getTextStyle = (): TextStyle => {
    switch (variant) {
      case 'primaryFilled':
      case 'accent':
        return {
          ...typography.heading.s,
          color: disabled ? colors.text.bodyLight : colors.text.body,
          textAlign: 'center',
        };

      case 'blue':
      case 'circle':
        return {
          ...typography.heading.s,
          color: disabled ? colors.text.bodyLight : colors.text.white,
          textAlign: 'center',
        };

      case 'outline':
        return {
          ...typography.heading.s,
          color: disabled ? colors.text.bodyLight : colors.text.primary,
          textAlign: 'center',
        };

      case 'link':
        return {
          ...typography.body.s,
          color: disabled ? colors.text.bodyLight : colors.text.primary,
        };

      case 'chip':
        return {
          fontFamily: typography.body.default.fontFamily,
          fontWeight: '500' as TextStyle['fontWeight'],
          fontSize: 15,
          color: disabled ? colors.text.bodyLight : colors.text.black,
        };

      default:
        return typography.heading.s;
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={getContainerStyle()}
      activeOpacity={0.7}
    >
      {/* Circle variant: 2-line text */}
      {variant === 'circle' ? (
        <Text style={getTextStyle()}>{label.replace(' ', '\n')}</Text>
      ) : (
        <>
          {/* Text */}
          <Text style={getTextStyle()}>{label}</Text>

          {/* Link icon (trailing) */}
          {variant === 'link' && icon && (
            <View style={{ marginLeft: 6 }}>
              {icon}
            </View>
          )}

          {/* Chip badge */}
          {variant === 'chip' && badge !== undefined && badge > 0 && (
            <View style={styles.chipBadge}>
              <Text style={styles.chipBadgeText}>{badge}</Text>
            </View>
          )}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chipBadge: {
    backgroundColor: colors.background.notification,
    borderRadius: borderRadius.pill,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipBadgeText: {
    ...typography.body.s,
    fontSize: 11,
    fontWeight: '700' as TextStyle['fontWeight'],
    color: colors.text.body,
  },
});
