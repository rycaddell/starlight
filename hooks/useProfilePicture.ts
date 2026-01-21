// hooks/useProfilePicture.ts
import { useState } from 'react';
import { Alert } from 'react-native';
import { pickProfilePicture, uploadProfilePicture } from '@/lib/supabase/profilePicture';

export function useProfilePicture(userId: string, onSuccess?: () => void) {
  const [uploading, setUploading] = useState(false);

  const handleAddProfilePicture = async () => {
    try {
      console.log('🖼️ Starting profile picture upload...');
      console.log('🆔 User ID:', userId);

      if (!userId) {
        Alert.alert('Error', 'User not found. Please try signing in again.');
        return;
      }

      setUploading(true);

      // Pick image
      console.log('📸 Opening image picker...');
      const pickResult = await pickProfilePicture();
      console.log('📸 Pick result:', pickResult);
      if (!pickResult.success) {
        if (pickResult.error !== 'Image selection cancelled') {
          Alert.alert('Error', pickResult.error || 'Failed to select image');
        }
        return;
      }

      // Upload image
      const uploadResult = await uploadProfilePicture(userId, pickResult.uri!);
      if (!uploadResult.success) {
        Alert.alert('Upload Failed', uploadResult.error || 'Failed to upload image');
        return;
      }

      // Success!
      onSuccess?.();
    } catch (error: any) {
      console.error('❌ Profile picture error:', error);
      console.error('❌ Error message:', error?.message);
      console.error('❌ Error stack:', error?.stack);
      Alert.alert('Error', error?.message || 'An unexpected error occurred');
    } finally {
      setUploading(false);
    }
  };

  return {
    uploading,
    handleAddProfilePicture,
  };
}
