// supabase/functions/generate-day-1-mirror/index.ts
// Edge function to generate Day 1 mini-mirror from 2 voice journals + spiritual place

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { generateCorePrompt, generateEncouragingVersePrompt, generateInvitationToGrowthPrompt } from './prompts.ts'

const GENERATION_TIMEOUT_MS = 240000; // 4 minutes (match regular mirrors)

// CORS headers for client requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Journal {
  id: string;
  content: string;
  created_at: string;
}

// Make individual OpenAI API call with error handling
async function makeOpenAICall(
  prompt: string,
  callType: string,
  openaiApiKey: string
): Promise<any> {
  console.log(`🎯 Making ${callType} API call (prompt length: ${prompt.length} chars)`);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GENERATION_TIMEOUT_MS);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-5.1',
        messages: [{ role: 'user', content: prompt }],
        max_completion_tokens: 10000,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ ${callType} API error:`, response.status, errorText);
      return {
        success: false,
        contentFilterTriggered: false,
        finishReason: 'api_error',
        error: `API error: ${response.status}`,
        usage: null,
      };
    }

    const data = await response.json();
    const finishReason = data.choices[0].finish_reason;
    const rawContent = data.choices[0].message.content;

    console.log(`🏁 ${callType} finish reason:`, finishReason);
    console.log(`💰 ${callType} tokens:`, data.usage?.total_tokens || 'unknown');

    // Check for content filter
    if (finishReason === 'content_filter') {
      console.warn(`⚠️ ${callType} triggered content filter`);
      console.error(`🚨 ${callType} CONTENT FILTER DETAILS:`, JSON.stringify(data, null, 2));
      return {
        success: false,
        contentFilterTriggered: true,
        finishReason,
        content: null,
        usage: data.usage,
      };
    }

    // Parse JSON response
    let cleanedContent = rawContent
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    let parsedContent;
    let parseAttempts = 0;
    const maxParseAttempts = 3;

    while (parseAttempts < maxParseAttempts) {
      try {
        if (parseAttempts === 0) {
          parsedContent = JSON.parse(cleanedContent);
          console.log(`✅ ${callType} JSON parsed successfully`);
          break;
        } else if (parseAttempts === 1) {
          console.log(`🔧 ${callType} attempting basic JSON fixes...`);
          const fixedContent = cleanedContent
            .replace(/\\n/g, '\\\\n')
            .replace(/\n/g, ' ')
            .replace(/\r/g, '')
            .replace(/\t/g, ' ');
          parsedContent = JSON.parse(fixedContent);
          console.log(`✅ ${callType} JSON parsed after basic fixes`);
          break;
        } else {
          console.log(`🔧 ${callType} attempting aggressive JSON fixes...`);
          const aggressivelyFixed = cleanedContent
            .replace(/\\n/g, '\\\\n')
            .replace(/\n/g, ' ')
            .replace(/\r/g, '')
            .replace(/\t/g, ' ');
          parsedContent = JSON.parse(aggressivelyFixed);
          console.log(`✅ ${callType} JSON parsed after aggressive fixes`);
          break;
        }
      } catch (parseError) {
        parseAttempts++;
        if (parseAttempts >= maxParseAttempts) {
          console.error(`❌ ${callType} JSON parse failed:`, parseError.message);
          return {
            success: false,
            contentFilterTriggered: false,
            finishReason: 'parse_error',
            error: parseError.message,
            usage: data.usage,
          };
        }
      }
    }

    return {
      success: true,
      contentFilterTriggered: false,
      finishReason,
      content: parsedContent,
      usage: data.usage,
    };

  } catch (error) {
    if (error.name === 'AbortError') {
      console.error(`❌ ${callType} timeout after 4 minutes`);
      return {
        success: false,
        contentFilterTriggered: false,
        finishReason: 'timeout',
        error: 'Request timeout',
        usage: null,
      };
    }

    console.error(`❌ ${callType} call failed:`, error.message);
    return {
      success: false,
      contentFilterTriggered: false,
      finishReason: 'exception',
      error: error.message,
      usage: null,
    };
  }
}

// Extract 1-2 word theme from focus areas
async function extractFocusTheme(focusText: string, openaiApiKey: string): Promise<string> {
  try {
    console.log('🎯 Extracting focus theme from:', focusText.substring(0, 50));

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: `Extract a 1-2 word theme from this spiritual focus: "${focusText}".
Return ONLY the theme word(s), nothing else. Examples: "Trust", "Purpose", "Healing", "Community", "Growth", "Peace"`
        }],
        max_tokens: 10,
      }),
    });

    if (!response.ok) {
      console.error('❌ Theme extraction failed:', response.status);
      return 'Growth';
    }

    const data = await response.json();
    const theme = data.choices[0].message.content.trim();
    console.log('✅ Extracted theme:', theme);

    return theme;
  } catch (error) {
    console.error('❌ Error extracting theme:', error);
    return 'Growth';
  }
}

// Generate mini-mirror with 3 parallel OpenAI calls
async function generateMiniMirrorWithAI(
  spiritualPlace: string,
  journal2: Journal,
  journal3: Journal,
  openaiApiKey: string
): Promise<any> {
  console.log(`🎯 Generating Day 1 mini-mirror with 3 parallel calls`);
  console.log(`  Spiritual place: ${spiritualPlace}`);
  console.log(`  Journal 2 length: ${journal2.content.length} chars`);
  console.log(`  Journal 3 length: ${journal3.content.length} chars`);

  // Generate all 3 prompts
  const corePrompt = generateCorePrompt(spiritualPlace, journal2, journal3);
  const encouragingPrompt = generateEncouragingVersePrompt(spiritualPlace, journal2, journal3);
  const invitationPrompt = generateInvitationToGrowthPrompt(spiritualPlace, journal2, journal3);

  // Make all 3 API calls in parallel
  console.log('🚀 Starting 3 parallel API calls...');
  const [coreResult, encouragingResult, invitationResult] = await Promise.all([
    makeOpenAICall(corePrompt, 'core', openaiApiKey),
    makeOpenAICall(encouragingPrompt, 'encouraging_verse', openaiApiKey),
    makeOpenAICall(invitationPrompt, 'invitation_to_growth', openaiApiKey),
  ]);

  // Log results
  console.log('📊 Call Results:');
  console.log(`  Core: ${coreResult.success ? '✅' : '❌'} (${coreResult.finishReason})`);
  console.log(`  Encouraging: ${encouragingResult.success ? '✅' : '❌'} (${encouragingResult.finishReason})`);
  console.log(`  Invitation: ${invitationResult.success ? '✅' : '❌'} (${invitationResult.finishReason})`);

  // Core is REQUIRED - fail if it didn't succeed
  if (!coreResult.success) {
    console.error('❌ Core generation failed - cannot create Day 1 mirror');
    const errorMsg = coreResult.contentFilterTriggered
      ? 'Content filter triggered during core generation. The journal content may contain sensitive material that violates OpenAI content policy.'
      : `Core generation failed: ${coreResult.error || coreResult.finishReason}`;
    throw new Error(errorMsg);
  }

  // Build screen_2_biblical with potential nulls for verses
  const screen2Biblical = {
    title: "Biblical Mirror",
    subtitle: "Your story reflected in Scripture",
    parallel_story: coreResult.content?.screen2_biblical?.parallel_story || null,
    encouraging_verse: encouragingResult.success ? encouragingResult.content?.encouraging_verse : null,
    invitation_to_growth: invitationResult.success ? invitationResult.content?.invitation_to_growth : null,
  };

  // Log partial success warnings
  if (!encouragingResult.success) {
    console.warn('⚠️ Encouraging verse generation failed - will be omitted from Day 1 mirror');
  }
  if (!invitationResult.success) {
    console.warn('⚠️ Invitation to growth generation failed - will be omitted from Day 1 mirror');
  }

  // Calculate total token usage
  const totalTokens =
    (coreResult.usage?.total_tokens || 0) +
    (encouragingResult.usage?.total_tokens || 0) +
    (invitationResult.usage?.total_tokens || 0);

  console.log(`💰 Total tokens used: ${totalTokens}`);

  return {
    success: true,
    content: {
      screen2_biblical: screen2Biblical,
      one_line_summaries: coreResult.content?.one_line_summaries,
    },
    usage: { total_tokens: totalTokens },
  };
}

// Main request handler
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚀 Generate Day 1 Mini-Mirror Edge Function invoked');

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request body
    const { userId } = await req.json();

    if (!userId) {
      throw new Error('userId is required');
    }

    console.log(`👤 Generating mini-mirror for user: ${userId}`);

    // Step 1: Get day_1_progress
    console.log('🔍 Fetching Day 1 progress...');
    const { data: progress, error: progressError } = await supabase
      .from('day_1_progress')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (progressError || !progress) {
      console.error('❌ Failed to fetch progress:', progressError);
      throw new Error('Day 1 progress not found');
    }

    if (!progress.spiritual_place || !progress.step_2_journal_id || !progress.step_3_journal_id) {
      console.error('❌ Incomplete Day 1 data:', progress);
      throw new Error('Day 1 flow not complete - missing data');
    }

    console.log('✅ Progress loaded:', {
      spiritualPlace: progress.spiritual_place,
      step2: progress.step_2_journal_id,
      step3: progress.step_3_journal_id,
    });

    // Step 2: Fetch both journals
    console.log('📚 Fetching journals...');
    const { data: journals, error: journalsError } = await supabase
      .from('journals')
      .select('id, content, created_at, transcription_status')
      .in('id', [progress.step_2_journal_id, progress.step_3_journal_id]);

    if (journalsError || !journals || journals.length !== 2) {
      console.error('❌ Failed to fetch journals:', journalsError);
      throw new Error('Failed to fetch journals');
    }

    const journal2 = journals.find(j => j.id === progress.step_2_journal_id);
    const journal3 = journals.find(j => j.id === progress.step_3_journal_id);

    if (!journal2 || !journal3) {
      throw new Error('Journals not found');
    }

    // Verify transcriptions are complete
    if (journal2.transcription_status !== 'completed' || journal3.transcription_status !== 'completed') {
      console.error('❌ Transcriptions not complete:', {
        step2: journal2.transcription_status,
        step3: journal3.transcription_status,
      });
      throw new Error('Transcriptions not yet complete');
    }

    console.log('✅ Both journals loaded and transcribed');

    // Step 3: Generate mini-mirror with AI
    console.log('🤖 Starting AI generation...');
    const aiResult = await generateMiniMirrorWithAI(
      progress.spiritual_place,
      journal2,
      journal3,
      openaiApiKey
    );

    if (!aiResult.success) {
      throw new Error('AI generation failed');
    }

    // Step 4: Save mini-mirror to database
    console.log('💾 Saving mini-mirror to database...');

    // Sanitize content to remove null bytes (PostgreSQL can't store \u0000)
    const sanitizeContent = (obj: any): any => {
      if (typeof obj === 'string') {
        return obj.replace(/\u0000/g, '');
      }
      if (Array.isArray(obj)) {
        return obj.map(sanitizeContent);
      }
      if (obj && typeof obj === 'object') {
        const sanitized: any = {};
        for (const key in obj) {
          sanitized[key] = sanitizeContent(obj[key]);
        }
        return sanitized;
      }
      return obj;
    };

    const sanitizedBiblical = sanitizeContent(aiResult.content.screen2_biblical);
    const sanitizedSummaries = sanitizeContent(aiResult.content.one_line_summaries);

    const { data: mirrorData, error: mirrorError } = await supabase
      .from('mirrors')
      .insert({
        custom_user_id: userId,
        mirror_type: 'day_1',
        screen_1_themes: null,
        screen_2_biblical: sanitizedBiblical,
        screen_3_observations: null,
        screen_4_suggestions: null,
        journal_count: 2,
        status: 'completed',
        generation_started_at: new Date().toISOString(),
        generation_completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (mirrorError) {
      console.error('❌ Failed to save mirror:', mirrorError);
      throw new Error('Failed to save mini-mirror');
    }

    console.log(`✅ Mini-mirror saved: ${mirrorData.id}`);

    // Step 5: Update day_1_progress
    console.log('📝 Updating Day 1 progress...');
    const { error: updateError } = await supabase
      .from('day_1_progress')
      .update({
        mini_mirror_id: mirrorData.id,
        generation_status: 'completed',
        current_step: 5,
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('⚠️ Failed to update progress:', updateError);
      // Non-critical - mirror is saved
    }

    console.log('🎉 Day 1 mini-mirror generation complete!');

    // Return success
    return new Response(
      JSON.stringify({
        success: true,
        mirror: mirrorData,
        summaries: sanitizedSummaries,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Error in generate-day-1-mirror function:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Mini-mirror generation failed',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
})
