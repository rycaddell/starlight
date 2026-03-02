// supabase/functions/transcribe-audio/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TRANSCRIPTION_TIMEOUT_MS = 60000; // 1 minute

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Call OpenAI Whisper with an audio Blob downloaded from Storage.
 * Accepts a Blob directly — no base64 conversion needed.
 */
async function transcribeWithWhisper(audioBlob: Blob, openaiApiKey: string): Promise<string> {
  console.log(`🎤 Sending ${audioBlob.size} bytes to Whisper`);

  const formData = new FormData();
  formData.append('file', audioBlob, 'recording.m4a');
  formData.append('model', 'whisper-1');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TRANSCRIPTION_TIMEOUT_MS);

  try {
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openaiApiKey}` },
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Whisper API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (!data.text || data.text.trim().length === 0) {
      throw new Error('Whisper returned empty transcription');
    }

    console.log(`✅ Whisper transcribed ${data.text.length} chars`);
    return data.text;

  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Transcription timeout — audio may be too long');
    }
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let journalId: string | null = null;

  try {
    console.log('🚀 transcribe-audio invoked');

    if (!openaiApiKey) throw new Error('OPENAI_API_KEY not configured');

    const body = await req.json();
    journalId = body.journalId;

    if (!journalId) throw new Error('journalId is required');

    console.log('📖 Fetching journal:', journalId);

    // 1. Fetch journal record
    const { data: journal, error: fetchError } = await supabase
      .from('journals')
      .select('id, custom_user_id, audio_url, transcription_status, prompt_text, journal_entry_type')
      .eq('id', journalId)
      .single();

    if (fetchError || !journal) throw new Error(`Journal not found: ${fetchError?.message}`);
    if (!journal.audio_url) throw new Error('Journal has no audio_url — upload may have failed');
    if (journal.transcription_status === 'completed') {
      console.log('⚠️ Journal already transcribed, skipping');
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 2. Mark as processing
    await supabase
      .from('journals')
      .update({ transcription_status: 'processing' })
      .eq('id', journalId);

    // 3. Download audio from Storage
    console.log('⬇️ Downloading audio from Storage:', journal.audio_url);
    const { data: audioBlob, error: downloadError } = await supabase.storage
      .from('audio-recordings')
      .download(journal.audio_url);

    if (downloadError || !audioBlob) {
      throw new Error(`Storage download failed: ${downloadError?.message}`);
    }

    // 4. Transcribe with Whisper
    const text = await transcribeWithWhisper(audioBlob, openaiApiKey);

    // 5. Update journal with content + mark completed
    const { error: updateError } = await supabase
      .from('journals')
      .update({
        content: text,
        transcription_status: 'completed',
      })
      .eq('id', journalId);

    if (updateError) throw new Error(`Failed to update journal: ${updateError.message}`);

    console.log('✅ Journal updated with transcription');

    // 6. Clean up audio from Storage
    const { error: deleteError } = await supabase.storage
      .from('audio-recordings')
      .remove([journal.audio_url]);

    if (deleteError) {
      // Non-fatal — log but don't fail the request
      console.warn('⚠️ Failed to delete audio from Storage:', deleteError.message);
    } else {
      console.log('🗑️ Audio deleted from Storage');
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('❌ transcribe-audio failed:', error.message);

    // Mark journal as failed so client polling can surface the error
    if (journalId) {
      const { data: journal } = await supabase
        .from('journals')
        .select('audio_url')
        .eq('id', journalId)
        .single()
        .catch(() => ({ data: null }));

      await supabase
        .from('journals')
        .update({
          transcription_status: 'failed',
          error_message: error.message,
        })
        .eq('id', journalId)
        .catch((e) => console.error('Failed to mark journal as failed:', e.message));

      // Clean up audio even on failure — don't leave voice recordings orphaned
      if (journal?.audio_url) {
        await supabase.storage
          .from('audio-recordings')
          .remove([journal.audio_url])
          .catch((e) => console.warn('⚠️ Failed to delete orphaned audio on error:', e.message));
        console.log('🗑️ Orphaned audio deleted after transcription failure');
      }
    }

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
