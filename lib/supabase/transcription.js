// lib/supabase/transcription.js
import { supabase } from './client';

// Edge Function URL for audio transcription
const TRANSCRIBE_URL = 'https://olqdyikgelidrytiiwfm.supabase.co/functions/v1/transcribe-audio';

/**
 * Transcribe audio using Edge Function (server-side Whisper)
 * @param {string} audioUri - Local file URI of the audio recording
 * @returns {Promise<{success: boolean, text?: string, error?: string}>}
 */
export const transcribeAudio = async (audioUri) => {
  console.log('🎤 Transcribing audio via Edge Function...');
  console.log('📁 Audio URI:', audioUri);
  
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

    if (!edgeResponse.ok || !data.success) {
      console.error('❌ Transcription failed:', data.error);
      return { 
        success: false, 
        error: data.error || 'Transcription failed' 
      };
    }

    console.log('✅ Transcription successful');
    console.log(`📝 Transcribed text length: ${data.text?.length || 0}`);
    
    return {
      success: true,
      text: data.text,
    };

  } catch (error) {
    console.error('❌ Error transcribing audio:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to transcribe audio' 
    };
  }
};