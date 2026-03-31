// lib/supabase/profilePicture.ts
// Service layer for managing profile pictures

import * as ImagePicker from 'expo-image-picker';
import * as Sentry from '@sentry/react-native';
import { supabase } from './client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

/**
 * Pick an image from the device's photo library
 */
export async function pickProfilePicture(): Promise<{
  success: boolean;
  uri?: string;
  error?: string;
}> {
  try {
    console.log('📱 Requesting media library permissions...');

    Sentry.addBreadcrumb({
      category: 'profile',
      message: 'Picking profile picture',
      level: 'info',
    });

    // Check if ImagePicker is available
    if (!ImagePicker || typeof ImagePicker.requestMediaLibraryPermissionsAsync !== 'function') {
      console.error('❌ ImagePicker not available');

      Sentry.captureException(new Error('ImagePicker not available'), {
        tags: { component: 'profilePicture', action: 'pick' },
      });

      return {
        success: false,
        error: 'Image picker is not available. Please restart the app.',
      };
    }

    // Request permissions with comprehensive error handling
    let permissionResult: ImagePicker.MediaLibraryPermissionResponse | undefined;
    try {
      console.log('📱 Calling requestMediaLibraryPermissionsAsync...');
      permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('📱 Permission result:', JSON.stringify(permissionResult, null, 2));
    } catch (permError: any) {
      console.error('❌ Permission request failed:', permError);
      console.error('❌ Permission error message:', permError?.message);
      console.error('❌ Permission error code:', permError?.code);
      console.error('❌ Permission error stack:', permError?.stack);
      console.error('❌ Permission error type:', typeof permError);
      console.error('❌ Permission error keys:', permError ? Object.keys(permError) : 'none');

      Sentry.captureException(permError, {
        tags: { component: 'profilePicture', action: 'requestPermission' },
        contexts: {
          profilePic: {
            errorMessage: permError?.message,
            errorCode: permError?.code,
          },
        },
      });

      return {
        success: false,
        error: `Permission request failed: ${permError?.message || JSON.stringify(permError) || 'Unknown error'}`,
      };
    }

    if (!permissionResult) {
      console.error('❌ Permission result is null/undefined');
      return {
        success: false,
        error: 'Failed to get permission status',
      };
    }

    if (!permissionResult.granted) {
      console.log('⚠️ Permission denied by user');
      return {
        success: false,
        error: 'Permission to access photo library is required',
      };
    }

    console.log('✅ Permission granted, launching image picker...');
    // Launch image picker with square crop
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1], // Square crop
      quality: 0.8,
    });

    console.log('📸 Image picker result:', result.canceled ? 'cancelled' : 'selected');

    if (result.canceled) {
      return { success: false, error: 'Image selection cancelled' };
    }

    const asset = result.assets[0];
    console.log('📸 Selected image:', { uri: asset.uri, size: asset.fileSize });

    // Validate file size
    if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE) {
      return {
        success: false,
        error: 'Image is too large. Please select an image under 5MB.',
      };
    }

    return { success: true, uri: asset.uri };
  } catch (error: any) {
    console.error('❌ Error picking image:', error);
    console.error('❌ Error message:', error?.message);
    console.error('❌ Error stack:', error?.stack);
    return { success: false, error: error?.message || 'Unknown error occurred' };
  }
}

/**
 * Upload profile picture to Supabase Storage and update user profile
 */
export async function uploadProfilePicture(
  userId: string,
  imageUri: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase not initialized' };

  try {
    console.log('📸 Uploading profile picture for user:', userId);

    Sentry.addBreadcrumb({
      category: 'profile',
      message: 'Uploading profile picture',
      data: { userId },
      level: 'info',
    });

    // Get file extension from URI
    const ext = imageUri.split('.').pop()?.toLowerCase() || 'jpg';

    // Validate file type
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      return {
        success: false,
        error: 'Invalid file type. Please use JPG, PNG, or WebP.',
      };
    }

    // Use auth.uid() for storage path — RLS policies match on auth.uid(), not public.users.id
    const { data: { session } } = await supabase.auth.getSession();
    const authUserId = session?.user?.id;
    if (!authUserId) {
      return { success: false, error: 'Not authenticated' };
    }

    const fileName = `${authUserId}/profile.${ext}`;

    // Convert URI to ArrayBuffer for upload (React Native compatible)
    const response = await fetch(imageUri);
    const arrayBuffer = await response.arrayBuffer();

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('profile-pictures')
      .upload(fileName, arrayBuffer, {
        contentType: `image/${ext}`,
        upsert: true, // Replace existing file if it exists
      });

    if (uploadError) {
      console.error('❌ Upload error:', uploadError);

      Sentry.captureException(new Error('Profile picture upload failed'), {
        tags: { component: 'profilePicture', action: 'upload' },
        contexts: {
          profilePic: {
            userId,
            fileName,
            error: uploadError.message,
          },
        },
      });

      return { success: false, error: uploadError.message };
    }

    // Get public URL with cache-busting timestamp
    const { data: urlData } = supabase.storage.from('profile-pictures').getPublicUrl(fileName);

    // Add timestamp to URL to bust image cache when profile picture changes
    const publicUrl = `${urlData.publicUrl}?updated=${Date.now()}`;

    // Update user's profile_picture_url in database
    const { data: userData, error: updateError } = await supabase
      .from('users')
      .update({ profile_picture_url: publicUrl })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Database update error:', updateError);

      Sentry.captureException(new Error('Failed to update user profile picture URL'), {
        tags: { component: 'profilePicture', action: 'updateDatabase' },
        contexts: {
          profilePic: {
            userId,
            publicUrl,
            error: updateError.message,
          },
        },
      });

      return { success: false, error: updateError.message };
    }

    // Update local storage with new user data
    await AsyncStorage.setItem('starlight_current_user', JSON.stringify(userData));

    console.log('✅ Profile picture uploaded successfully');

    Sentry.addBreadcrumb({
      category: 'profile',
      message: 'Profile picture uploaded successfully',
      level: 'info',
    });

    return { success: true, url: publicUrl };
  } catch (error: any) {
    console.error('❌ Error uploading profile picture:', error);

    Sentry.captureException(error, {
      tags: { component: 'profilePicture', action: 'upload', type: 'unexpected' },
      contexts: { profilePic: { userId } },
    });

    return { success: false, error: error.message };
  }
}

/**
 * Delete profile picture from storage and database
 */
export async function deleteProfilePicture(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase not initialized' };

  try {
    console.log('🗑️ Deleting profile picture for user:', userId);

    // Get current user to find the file
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('profile_picture_url')
      .eq('id', userId)
      .single();

    if (userError || !user.profile_picture_url) {
      return { success: false, error: 'No profile picture to delete' };
    }

    // Extract file path from URL
    // URL format: https://[project].supabase.co/storage/v1/object/public/profile-pictures/[userId]/profile.[ext]
    const urlParts = user.profile_picture_url.split('/profile-pictures/');
    if (urlParts.length < 2) {
      return { success: false, error: 'Invalid profile picture URL' };
    }
    const filePath = urlParts[1];

    // Delete from storage
    const { error: deleteError } = await supabase.storage
      .from('profile-pictures')
      .remove([filePath]);

    if (deleteError) {
      console.error('❌ Storage delete error:', deleteError);
      return { success: false, error: deleteError.message };
    }

    // Update database to remove URL
    const { data: userData, error: updateError } = await supabase
      .from('users')
      .update({ profile_picture_url: null })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Database update error:', updateError);
      return { success: false, error: updateError.message };
    }

    // Update local storage
    await AsyncStorage.setItem('starlight_current_user', JSON.stringify(userData));

    console.log('✅ Profile picture deleted successfully');
    return { success: true };
  } catch (error: any) {
    console.error('❌ Error deleting profile picture:', error);
    return { success: false, error: error.message };
  }
}
