import { Tabs } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Platform, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/HapticTab';
import { TabIcon } from '@/components/navigation/TabIcon';
import { colors, typography } from '@/theme/designTokens';
import { useUnreadShares } from '@/contexts/UnreadSharesContext';
import { useFriendBadge } from '@/contexts/FriendBadgeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { useVoiceRecovery } from '@/hooks/useVoiceRecovery';

export default function TabLayout() {
  const { unreadCount } = useUnreadShares();
  const { newFriendsCount } = useFriendBadge();
  const { user } = useAuth();
  const [hasMirrors, setHasMirrors] = useState(false);
  const insets = useSafeAreaInsets();
  const { isRecovering, recoveryMessage } = useVoiceRecovery(user?.id ?? null);

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

    // Set up real-time subscription for new mirrors
    if (user) {
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
          () => {
            setHasMirrors(true);
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  // Show Mirror tab if user has completed Day 1 OR has any existing mirrors
  const showMirrorTab = user?.day_1_completed_at != null || hasMirrors;

  return (
    <View style={{ flex: 1 }}>
      {(isRecovering || recoveryMessage) && (
        <View style={[styles.recoveryBanner, { top: insets.top }]}>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={styles.recoveryText}>
            {recoveryMessage ?? 'Finishing a recent recording...'}
          </Text>
        </View>
      )}
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
    </View>
  );
}

const styles = StyleSheet.create({
  recoveryBanner: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: colors.text.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 1000,
  },
  recoveryText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: typography.body.s.fontFamily,
  },
});
