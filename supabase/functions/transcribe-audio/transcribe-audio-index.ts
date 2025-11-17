// supabase/functions/transcribe-audio/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const TRANSCRIPTION_TIMEOUT_MS = 60000; // 1 minute

// CORS headers for client requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Transcribe audio with OpenAI Whisper
async function transcribeAudioWithWhisper(
  audioBase64: string,
  openaiApiKey: string
): Promise<any> {
  console.log('🎤 Transcribing audio with Whisper');
  console.log(`📊 Audio data length: ${audioBase64.length} chars`);

  try {
    // Convert base64 to binary
    const audioBytes = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));
    console.log(`📊 Audio bytes length: ${audioBytes.length}`);

    // Create FormData with audio file
    const formData = new FormData();
    const audioBlob = new Blob([audioBytes], { type: 'audio/m4a' });
    formData.append('file', audioBlob, 'recording.m4a');
    formData.append('model', 'whisper-1');

    // Call OpenAI Whisper API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TRANSCRIPTION_TIMEOUT_MS);

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Whisper API error:', response.status, errorText);
      
      // Try to parse error as JSON for better error message
      try {
        const errorJson = JSON.parse(errorText);
        console.error('❌ Whisper error details:', JSON.stringify(errorJson, null, 2));
        throw new Error(`Whisper API error: ${response.status} - ${errorJson.error?.message || errorText}`);
      } catch {
        throw new Error(`Whisper API error: ${response.status} - ${errorText}`);
      }
    }

    const data = await response.json();
    console.log('✅ Whisper response received');
    console.log('📝 Transcription length:', data.text?.length || 0);

    if (!data.text || data.text.trim().length === 0) {
      console.error('❌ Empty transcription from Whisper');
      throw new Error('Whisper returned empty transcription');
    }

    return {
      success: true,
      text: data.text,
    };

  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('❌ Transcription timeout after 1 minute');
      throw new Error('Transcription timeout - audio may be too long');
    }
    
    console.error('❌ Transcription failed:', error.message);
    throw error;
  }
}

// Main request handler
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚀 Transcribe Audio Edge Function invoked');

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Get request body
    const { audioBase64 } = await req.json();
    
    if (!audioBase64 || !audioBase64.trim()) {
      throw new Error('audioBase64 is required');
    }

    console.log(`🎤 Transcribing audio (${audioBase64.length} chars of base64)`);

    // Transcribe with Whisper
    console.log('🤖 Starting transcription...');
    const transcriptionResult = await transcribeAudioWithWhisper(audioBase64, openaiApiKey);

    if (!transcriptionResult.success) {
      throw new Error('Transcription failed');
    }

    console.log('🎉 Transcription complete!');

    // Return success
    return new Response(
      JSON.stringify({
        success: true,
        text: transcriptionResult.text,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Error in transcribe-audio function:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Transcription failed',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
})