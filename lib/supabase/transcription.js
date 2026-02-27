// lib/supabase/transcription.js
import { supabase } from './client';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sentry from '@sentry/react-native';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Edge Function URL for audio transcription
const TRANSCRIBE_URL = `${SUPABASE_URL}/functions/v1/transcribe-audio`;

/**
 * Upload a local audio file to Supabase Storage.
 * Uses FileSystem.uploadAsync (iOS URL loading system) instead of fetch,
 * which is more resilient to app backgrounding mid-upload.
 *
 * @param {string} localPath - Persistent local file path
 * @param {string} storagePath - Destination path in bucket: "{customUserId}/{jobId}.m4a"
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const uploadAudioToStorage = async (localPath, storagePath) => {
  console.log('☁️ Uploading audio to Storage:', storagePath);

  Sentry.addBreadcrumb({
    category: 'transcription',
    message: 'Starting audio upload to Storage',
    data: { storagePath },
    level: 'info',
  });

  try {
    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/audio-recordings/${storagePath}`;

    const result = await FileSystem.uploadAsync(uploadUrl, localPath, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: {
        Authorization: `Bearer ${ANON_KEY}`,
        apikey: ANON_KEY,
        'Content-Type': 'audio/m4a',
      },
    });

    if (result.status !== 200) {
      const body = result.body ? JSON.parse(result.body) : {};
      throw new Error(body.message || `Upload failed with status ${result.status}`);
    }

    console.log('✅ Audio uploaded to Storage successfully');
    Sentry.addBreadcrumb({
      category: 'transcription',
      message: 'Audio uploaded to Storage',
      data: { storagePath },
      level: 'info',
    });

    return { success: true };
  } catch (error) {
    console.error('❌ Audio upload failed:', error.message);
    Sentry.captureException(error, {
      tags: { component: 'transcription', action: 'upload' },
      contexts: { upload: { storagePath, localPath } },
    });
    return { success: false, error: error.message };
  }
};

/**
 * Transcribe audio using Edge Function (server-side Whisper)
 * @param {string} audioUri - Local file URI of the audio recording
 * @returns {Promise<{success: boolean, text?: string, error?: string}>}
 */
export const transcribeAudio = async (audioUri) => {
  console.log('🎤 Transcribing audio via Edge Function...');
  console.log('📁 Audio URI:', audioUri);

  // Add Sentry breadcrumb
  Sentry.addBreadcrumb({
    category: 'transcription',
    message: 'Starting audio transcription',
    data: { audioUri },
    level: 'info',
  });

  try {
    // Read the audio file and convert to base64
    const response = await fetch(audioUri);
    const blob = await response.blob();

    // Convert blob to base64
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result.split(',')[1]; // Remove data:audio/m4a;base64, prefix
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    console.log(`📊 Audio converted to base64: ${base64.length} chars`);

    // Add breadcrumb for conversion success
    Sentry.addBreadcrumb({
      category: 'transcription',
      message: 'Audio converted to base64',
      data: { base64Length: base64.length },
      level: 'info',
    });

    // Get the anon key for authentication
    const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    // Call Edge Function
    const edgeResponse = await fetch(TRANSCRIBE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
        'apikey': anonKey,
      },
      body: JSON.stringify({ audioBase64: base64 }),
    });

    const data = await edgeResponse.json();
    console.log('Edge function response status:', edgeResponse.status);

    // Add breadcrumb for API response
    Sentry.addBreadcrumb({
      category: 'transcription',
      message: 'Received Edge Function response',
      data: {
        status: edgeResponse.status,
        success: data.success,
      },
      level: edgeResponse.ok ? 'info' : 'error',
    });

    if (!edgeResponse.ok || !data.success) {
      console.error('❌ Transcription failed:', data.error);

      // Capture transcription failure in Sentry
      Sentry.captureException(new Error('Transcription failed'), {
        tags: { component: 'transcription', action: 'transcribe' },
        contexts: {
          transcription: {
            status: edgeResponse.status,
            error: data.error,
            audioUriPresent: !!audioUri,
          },
        },
      });

      return {
        success: false,
        error: data.error || 'Transcription failed'
      };
    }

    console.log('✅ Transcription successful');
    console.log(`📝 Transcribed text length: ${data.text?.length || 0}`);

    // Add success breadcrumb
    Sentry.addBreadcrumb({
      category: 'transcription',
      message: 'Transcription successful',
      data: { textLength: data.text?.length || 0 },
      level: 'info',
    });

    return {
      success: true,
      text: data.text,
    };

  } catch (error) {
    console.error('❌ Error transcribing audio:', error);

    // Capture unexpected error
    Sentry.captureException(error, {
      tags: { component: 'transcription', action: 'transcribe', type: 'unexpected' },
      contexts: {
        transcription: {
          audioUriPresent: !!audioUri,
        },
      },
    });

    return {
      success: false,
      error: error.message || 'Failed to transcribe audio'
    };
  }
};