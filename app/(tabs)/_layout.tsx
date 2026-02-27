import { Tabs } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Platform, AppState } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { TabIcon } from '@/components/navigation/TabIcon';
import { colors, typography } from '@/theme/designTokens';
import { useUnreadShares } from '@/contexts/UnreadSharesContext';
import { useFriendBadge } from '@/contexts/FriendBadgeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';

export default function TabLayout() {
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
          console.log('✅ [TAB LAYOUT] User has mirrors, showing Mirror tab');
          setHasMirrors(true);
        } else {
          console.log('ℹ️ [TAB LAYOUT] User has no mirrors, hiding Mirror tab');
          setHasMirrors(false);
        }
      } catch (error) {
        console.error('Error checking for mirrors:', error);
        setHasMirrors(false);
      }
    };

    checkForMirrors();

    // Set up real-time subscription for new mirrors
    if (user) {
      console.log('👂 [TAB LAYOUT] Setting up real-time subscription for mirrors');
      const subscription = supabase
        .channel('mirrors_changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'mirrors',
            filter: `custom_user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('🔔 [TAB LAYOUT] New mirror created, showing Mirror tab');
            setHasMirrors(true);
          }
        )
        .subscribe();

      return () => {
        console.log('🔕 [TAB LAYOUT] Unsubscribing from mirrors changes');
        subscription.unsubscribe();
      };
    }
  }, [user]);

  // Show Mirror tab if user has completed Day 1 OR has any existing mirrors
  const showMirrorTab = user?.day_1_completed_at != null || hasMirrors;

  return (
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.text.accent,
          tabBarInactiveTintColor: colors.text.body,
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarStyle: {
            backgroundColor: colors.background.white,
            borderTopWidth: 0,
            elevation: 0,
            ...Platform.select({
              ios: {
                position: 'absolute',
              },
            }),
          },
          tabBarLabelStyle: {
            fontFamily: typography.body.s.fontFamily,
            fontWeight: '500',
            fontSize: 13,
            letterSpacing: 0.26,
          },
          tabBarIconStyle: {
            marginTop: 8,
            marginBottom: 0,
          },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Journal',
            tabBarIcon: ({ focused }) => <TabIcon name="journal" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="mirror"
          options={{
            title: 'Mirror',
            tabBarIcon: ({ focused }) => <TabIcon name="mirror" focused={focused} />,
            href: showMirrorTab ? '/mirror' : null,
          }}
        />
        <Tabs.Screen
          name="friends"
          options={{
            title: 'Friends',
            tabBarIcon: ({ focused }) => <TabIcon name="friends" focused={focused} />,
            tabBarBadge: totalBadgeCount > 0 ? totalBadgeCount : undefined,
          }}
        />
      </Tabs>
  );
}
