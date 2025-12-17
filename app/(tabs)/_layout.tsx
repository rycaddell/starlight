import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useUnreadShares } from '@/contexts/UnreadSharesContext';
import { useFriendBadge } from '@/contexts/FriendBadgeContext';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { unreadCount } = useUnreadShares();
  const { newFriendsCount } = useFriendBadge();

  // Combined badge count: unread shares + new friends
  const totalBadgeCount = unreadCount + newFriendsCount;

  return (
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarBackground: TabBarBackground,
          tabBarStyle: Platform.select({
            ios: {
              position: 'absolute',
            },
            default: {},
          }),
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Journal',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="pencil" color={color} />,
          }}
        />
        <Tabs.Screen
          name="mirror"
          options={{
            title: 'Mirror',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="sparkles" color={color} />,
          }}
        />
        <Tabs.Screen
          name="friends"
          options={{
            title: 'Friends',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.2" color={color} />,
            tabBarBadge: totalBadgeCount > 0 ? totalBadgeCount : undefined,
          }}
        />
      </Tabs>
  );
}
