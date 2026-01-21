// hooks/useNewFriendTracking.ts
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NEW_FRIENDS_KEY = '@oxbow_new_friends';

interface NewFriendData {
  [friendId: string]: boolean; // true if friend is new (not yet dismissed)
}

export function useNewFriendTracking() {
  const [newFriends, setNewFriends] = useState<NewFriendData>({});
  const [loaded, setLoaded] = useState(false);

  // Load new friends from storage
  useEffect(() => {
    const loadNewFriends = async () => {
      try {
        const stored = await AsyncStorage.getItem(NEW_FRIENDS_KEY);
        if (stored) {
          setNewFriends(JSON.parse(stored));
        }
        setLoaded(true);
      } catch (error) {
        console.error('Error loading new friends:', error);
        setLoaded(true);
      }
    };

    loadNewFriends();
  }, []);

  // Save new friends to storage
  const saveNewFriends = async (data: NewFriendData) => {
    try {
      await AsyncStorage.setItem(NEW_FRIENDS_KEY, JSON.stringify(data));
      setNewFriends(data);
    } catch (error) {
      console.error('Error saving new friends:', error);
    }
  };

  // Mark a friend as new
  const markFriendAsNew = useCallback(
    async (friendId: string) => {
      const updated = { ...newFriends, [friendId]: true };
      await saveNewFriends(updated);
    },
    [newFriends]
  );

  // Dismiss a friend's "new" status
  const dismissNewFriend = useCallback(
    async (friendId: string) => {
      const updated = { ...newFriends };
      delete updated[friendId];
      await saveNewFriends(updated);
    },
    [newFriends]
  );

  // Dismiss all new friends (called when user navigates away from Friends tab)
  const dismissAllNewFriends = useCallback(async () => {
    await saveNewFriends({});
  }, []);

  // Check if a friend is new
  const isFriendNew = useCallback(
    (friendId: string): boolean => {
      return newFriends[friendId] === true;
    },
    [newFriends]
  );

  return {
    loaded,
    isFriendNew,
    markFriendAsNew,
    dismissNewFriend,
    dismissAllNewFriends,
  };
}
