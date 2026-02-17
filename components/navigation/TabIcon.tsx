// components/navigation/TabIcon.tsx
// Custom tab bar icons using design system assets

import React from 'react';
import { Image, StyleSheet } from 'react-native';

type TabName = 'journal' | 'mirror' | 'friends';

interface TabIconProps {
  name: TabName;
  focused: boolean;
}

const icons = {
  journal: {
    inactive: require('@/assets/images/tabs/Journal.png'),
    active: require('@/assets/images/tabs/Journal-Active.png'),
  },
  mirror: {
    inactive: require('@/assets/images/tabs/Mirror.png'),
    active: require('@/assets/images/tabs/Mirror-Active.png'),
  },
  friends: {
    inactive: require('@/assets/images/tabs/Friends.png'),
    active: require('@/assets/images/tabs/Friends-Active.png'),
  },
};

export const TabIcon: React.FC<TabIconProps> = ({ name, focused }) => {
  const source = focused ? icons[name].active : icons[name].inactive;

  return <Image source={source} style={styles.icon} resizeMode="contain" />;
};

const styles = StyleSheet.create({
  icon: {
    width: 25,
    height: 25,
  },
});
