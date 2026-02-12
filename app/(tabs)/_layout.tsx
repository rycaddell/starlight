import { Tabs } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useUnreadShares } from '@/contexts/UnreadSharesContext';
import { useFriendBadge } from '@/contexts/FriendBadgeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { unreadCount } = useUnreadShares();
  const { newFriendsCount } = useFriendBadge();
  const { user } = useAuth();
  const [hasMirrors, setHasMirrors] = useState(false);

  // Combined badge count: unread shares + new friends
  const totalBadgeCount = unreadCount + newFriendsCount;

  // Check if user has any mirrors
  useEffect(() => {
    const checkForMirrors = async () => {
      if (!user) {
        setHasMirrors(false);
        return;
      }

      try {
        const { count, error } = await supabase
          .from('mirrors')
          .select('*', { count: 'exact', head: true })
          .eq('custom_user_id', user.id);

        if (!error && count && count > 0) {
          setHasMirrors(true);
        } else {
          setHasMirrors(false);
        }
      } catch (error) {
        console.error('Error checking for mirrors:', error);
        setHasMirrors(false);
      }
    };

    checkForMirrors();
  }, [user]);

  // Show Mirror tab if user has completed Day 1 OR has any existing mirrors
  const showMirrorTab = user?.day_1_completed_at != null || hasMirrors;

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
            href: showMirrorTab ? '/mirror' : null,
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
